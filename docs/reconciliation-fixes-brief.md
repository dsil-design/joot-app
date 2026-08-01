# Reconciliation Engine — Fix Brief

**For:** a fresh Claude Code session on the `joot-app` repo
**Scope:** fix the systems that produce bad review-queue proposals and matches
**Explicitly out of scope:** actually reconciling a month. Do not approve, reject, link, or
create any transaction. Every finding below was reproduced read-only and every fix must be
verifiable the same way.

---

## Context you need

Joot ingests four kinds of evidence about the same payments — bank/credit-card statement
rows, receipt emails, Thai bank payment slip images, and AI journal notes — groups them into
cards on the Review queue (`/review`), and proposes a Joot transaction for each card.

The grouping layer works well. **The proposal layer is not trustworthy**, and two matching
rules are too narrow. An audit of May 2026 found 133 unresolved cards and 58 pending
proposals containing errors ranging from cosmetic to a ฿605,000 swing.

Read `.claude/skills/month-close/SKILL.md` first — it documents the evidence model, the two
invariants the system is supposed to uphold, and the source/queue vocabulary used below.

### Tools for reproducing

```bash
npx tsx scripts/reconcile/month-audit.ts 2026-05          # coverage, triage tiers, invariants, anomalies
npx tsx scripts/reconcile/inspect-proposals.ts 2026-05    # every proposal vs the source it came from
```

Both are read-only and hit the live Supabase via `.env.local`. Use them before and after
each fix. `--json` on the audit if you want structured output.

### Ground rules

1. **Reproduce before fixing.** Each item below names the exact record that demonstrates it.
   Confirm it still reproduces before changing code — some may have moved.
2. **Do not weaken a guard to make a symptom disappear.** Several of these bugs exist
   *because* a guard was written against the wrong thing.
3. Tests live in `__tests__/lib`. Add cases there; run with `npm test`.
4. `npm run typecheck` and `npm run lint` must pass.

---

## Tier 1 — Wrong money. Fix these first.

### 1.1 The LLM can overwrite arithmetic ground truth

**Symptom.** Proposal `stmt:a860f193-1a4e-4a60-be96-7bedb91ffe96:60`: statement row is
`-302,647 THB "From: DIGICO CO.,LT"` (negative = money in, KBANK). The proposal says
`transaction_type: expense`, tagged `Business Expense`, `overall_confidence: 82`. That is
Dennis's client revenue booked as a cost — a ฿605k error in the wrong direction, on the
largest number of the month.

**Root cause.** Two defects compounding:

- `src/lib/proposals/rule-engine.ts:221-225` correctly derives `income` from the negative
  sign at score **90**.
- `src/lib/proposals/llm-engine.ts:107-111` accepts the LLM's *self-reported*
  `confidence.transaction_type`. Here the LLM returned score **95** with the reasoning
  `"Negative amount (-302647 THB) clearly indicates an expense/outgoing payment."` — the
  convention inverted.
- `src/lib/proposals/hybrid-engine.ts:88-109` (`mergeResults`) overrides any rule field
  whenever `llmConf.score > ruleConf.score`. 95 > 90, so the LLM's inversion won.

**Fix.** Sign, amount, currency and date are arithmetic, not opinion.

- In `mergeResults`, define a set of **authoritative fields** that the LLM may never
  override when the rule engine derived them from source arithmetic: `amount`, `currency`,
  `date`, and `transaction_type` *when* it came from the sign or from
  `item.detectedDirection` (rule-engine.ts:174-182, 214-225). The LLM should still be able
  to *propose* a type when the rule engine had no arithmetic basis (score-80 default path at
  rule-engine.ts:243-245).
- Encode the provenance so this is checkable rather than string-matched on `reasoning` —
  e.g. add `source: 'arithmetic' | 'inferred' | 'default'` to the field-confidence entries.
- Separately, `src/lib/proposals/llm-engine.ts:318` tells the model only
  `Classify as "expense" or "income".` It never states the sign convention. Add it
  explicitly, per account type, and stop treating the model's self-scored confidence as
  comparable to a rule-derived one.

**Verify.** Regenerate the proposal for that composite id with `force: true` and assert
`income`. Add a unit test: negative statement amount + LLM returning `expense` at 99 ⇒ merged
result is still `income`.

### 1.2 Credit-card payments are booked as income

**Symptom.** Proposal `stmt:42279c85-c638-49ab-b813-cf54bd288d65:88`: Chase row
`-4,895.28 USD "AUTOMATIC PAYMENT - THANK YOU"` proposes `income` from vendor
**"Thank You Cafe"**. Its other leg — `2026-05-18 +4,895.28 "Direct Payment - Autopay Chase
Credit Crd"` on PNC Personal (`stmt:99879cd4-9cf3-48be-9d71-d1dd32ea4de1:2`) — is a separate
unresolved card. Approving both invents $4,895 of income *and* $4,895 of expense.

**Root cause.** `src/lib/proposals/rule-engine.ts:214-225` applies one sign rule to every
account type. Its own comment says `// Credit card: positive = expense, negative = refund`,
but the branch also runs for bank accounts, and on a credit card a negative row is usually a
**payment** (a transfer), not a refund.

**Fix.** Make transaction-type derivation payment-method-type aware. `payment_methods.type`
is already populated (`credit_card` / `bank_account` / `debit_card` / `other`).

- `bank_account`, negative ⇒ `income`; positive ⇒ `expense`.
- `credit_card`, positive ⇒ `expense`; negative ⇒ `refund` **or** `transfer` — disambiguate
  on the description (`AUTOMATIC PAYMENT`, `PAYMENT - THANK YOU`, `AUTOPAY`,
  `DIRECT PAYMENT` ⇒ `transfer`).
- A card-payment row must never be proposed as `income`.

### 1.3 Self-transfer detection misses the common case

**Symptom.** The $4,895.28 pair above is never merged. The detector *did* catch a same-day
$1,000 PNC→PNC pair, so the mechanism works — the window is just too tight.

**Root cause.** `src/lib/matching/self-transfer-detector.ts:84-89` requires the two legs to
be within **±1 day**. A credit-card autopay debits the bank account days after the card posts
the payment. Separately, the matcher requires equal `Math.abs` amounts
(`self-transfer-detector.ts:79-82`) but **never requires opposite signs** — two same-direction
rows of equal size can pair.

**Fix.**

- Require opposite signs.
- Widen the window when the two payment methods are `credit_card` ↔ `bank_account`
  (suggest ±5 days); keep ±1 for same-type pairs to avoid false positives.
- Add a description-driven rule so card-payment/autopay text pairs even at the edge of the
  window, and surface `daysDiff` in the card's `reasons` (it already does).

**Verify.** After the fix, `month-audit.ts 2026-05` must show the two $4,895.28 cards
collapsed into one `self-transfer:` card, and the May duplicate-risk cluster count must drop.

### 1.4 Slip vision extraction hallucinated an amount at confidence 100

**Symptom.** Slip `IMG_0615.JPG` (2026-05-03, KBank→KBank, from Nidnoi to Dennis, memo
"Kids menu at Raising Chicken"). **The image plainly reads `จำนวน: 237.00 บาท`.** The stored
extraction is:

```
amount: 23700, amount_raw: "23700.00", amount_characters: "2,3,7,0,0,.,0,0",
extraction_confidence: 100
```

The KBANK May statement has a `-237` row that day and no ฿23,700 row. This is the one true
invariant break in May, and it is an extraction fault, not a missing document. Note the model
transcribed the 20-character reference number `016123091735DTF05113` perfectly on the same
pass.

**Root cause.** The two existing guards are structurally incapable of catching this:

- `src/lib/payment-slips/vision-extractor.ts:141-155` reconstructs the amount from
  `amount_characters` and compares it to `amount`.
- `src/lib/payment-slips/extraction-validator.ts:40-49` parses `amount_raw` and compares it
  to `amount`.

All three fields come from **one model response**. They detect transcription inconsistency
*within* a reply; they cannot detect a confidently-wrong reading. And nothing lowers
`extraction_confidence` for a single unverified pass.

**Fix — the cross-check has to come from outside the model.**

- Cross-check the slip against the statement: a slip whose amount has no counterpart row in
  the matching account within ±2 days, *especially* when a row with the same counterparty and
  date exists at a different amount, should be flagged `needs_verification` rather than
  accepted at 100.
- Stop emitting `extraction_confidence: 100` from a single pass. Cap unverified single-pass
  reads well below the auto-approve threshold; award high confidence only on external
  corroboration.
- Consider a second independent read for high-value slips. Note `AI_MODEL` in
  `src/lib/email/ai-client.ts:10` is `claude-haiku-4-5-20251001` and is shared by email
  classification *and* slip vision (`vision-extractor.ts:104`). Decoupling those, so vision
  extraction can use a stronger model, is likely the highest-leverage single change here —
  amount extraction from images is the one place in this system where a misread silently
  becomes money.

**Verify.** Re-extract `IMG_0615.JPG` and assert `amount === 237`. Then
`month-audit.ts 2026-05` should report zero "slips with no KBANK row" and the outgoing-orphan
count should resolve.

---

## Tier 2 — Systematically wrong enrichment

### 2.1 `overall_confidence` cannot separate right from wrong

This is the reason the whole queue is untrustworthy, and it should shape how you fix
everything else.

**Evidence.** DigiCo sign inversion scored **82**. Foxtail→Nidnoi scored **74**. A correct
Walmart proposal scored **91**. There is no threshold that admits the good and rejects the
bad — yet this is the number the UI shows when asking for a bulk approve.

**Root cause.** `src/lib/proposals/hybrid-engine.ts:111-124` (and the mirror at
`rule-engine.ts:774`) weight `amount`, `currency` and `date` into the composite. Those score
95–100 by construction — `"Statement date (authoritative)"`, `"Direct from import source"` —
so the composite is dominated by three facts that were never in doubt, diluting the only
three fields actually being guessed (vendor, description, tags).

**Fix.** Split the number in two and never merge them again:

- **Match confidence** — do independent sources agree on date and amount? This already exists
  on the queue item and is trustworthy. It is the *only* thing bulk approval may gate on.
- **Enrichment confidence** — vendor, description, tags only. Compute from those fields
  alone. Surface it on the proposal card as a separate, clearly-labelled signal.

Requires a column on `transaction_proposals`, a migration, regenerated types
(`npx supabase gen types typescript --linked > src/lib/supabase/types.ts`), and a UI change in
`src/components/page-specific/create-from-import-dialog.tsx` and the review page. Follow the
migration workflow in `CLAUDE.md`.

### 2.2 Learned descriptions are applied without a magnitude check

**Symptom.**

| Source row | Proposed description |
|---|---|
| `KOOLPUNT PROPERTY` **฿45** | "Property Rent" |
| `To: MS. Thanida Chaiwa` **฿400** | "Monthly Rent" |
| `From: MS. SUPAPORN KIDK` **−฿130** | "Dinner: Hai Dee Lao" |
| `From: MS. SUPAPORN KIDK` **−฿545** | "B Sam Cook" |
| `To: MR LEIGH JOHN MCMI` **฿2,000** | "Cocktails, gin and shit" |

฿45 rent and ฿400 rent are impossible. These are confidently specific and false, which is
worse than a blank field — a reviewer skimming a queue will accept them.

**Root cause.** The description strategies in `src/lib/proposals/rule-engine.ts` (from ~:540)
and the `vendorDescriptionPatterns` block in `src/lib/proposals/llm-engine.ts:230-243`
(`"Match these patterns when possible"`) reuse the counterparty's historical description with
no reference to the amount.

**Fix.** Gate description reuse on amount plausibility. When a learned pattern is considered,
compare the new amount against the distribution of amounts that pattern was historically used
for; if it falls outside a sane band (same order of magnitude is a reasonable first cut),
don't reuse it — emit a neutral cleaned description and drop the description confidence. Pass
the historical amount range into the LLM prompt alongside each pattern so it can apply the
same judgement.

### 2.3 Vendor matching produces confident false positives

**Symptom.**

| Statement text | Proposed vendor |
|---|---|
| `TST* FOXTAIL COFFEE - 108 VENICE FL` | **Nidnoi** (a person) |
| `& PARAMOUNT+ 888-274-5343 CA` | **Netflix** (description says "Paramount+") |
| `AWN(1201 CENTRAL CHIANGMA CHIANGMAI` | **Chiangmai** (a city; AWN is AIS) |
| `AUTOMATIC PAYMENT - THANK YOU` | **Thank You Cafe** |
| `To: X1413 KITTITACH K` | **Chef Fuji** |
| `TRF. PROMPTPAY` | **Murray** |

**Root cause.** `src/lib/proposals/vendor-matcher.ts:150` admits candidates at
`score > 0.3`, and `:182` treats `>= 0.9` as a confident match, on a blend that includes raw
Levenshtein similarity (`:87`, `:123`). Levenshtein on short merchant strings matches
coincidental character overlap. Nothing prevents a generic phrase ("thank you", "payment") or
a place name from becoming a vendor.

**Fix.**

- Require meaningful token overlap, not just edit distance — a match should share a
  distinctive token, and generic tokens (`payment`, `thank`, `you`, `trf`, `pos`, bank names,
  known city/province names) must be stopworded out before scoring.
- Raise the admission floor well above 0.3.
- Person-type vendors should not match merchant descriptors. If there's no explicit
  person/merchant distinction on `vendors`, this is worth adding.
- When nothing clears the bar, propose a cleaned new vendor name rather than the nearest
  weak match. A blank is recoverable; a wrong vendor silently corrupts the history that later
  proposals learn from — note that DigiCo's vendor match already reads
  `"Learned from statement: ... (2× confirmed)"`, so errors compound.

### 2.4 Vendor fragmentation

`WM SUPERCENTER #769 VENICE FL` correctly maps to the existing **Walmart**, while
`WAL-MART #0769 VENICE FL` the next day proposes a **new** vendor `"Wal-Mart 0769 Venice"`.
Same store, two vendors. Likewise `YYZ BOCCONE BY MASSIMO MISSISSAUGA ON` proposes a vendor
name carrying an airport code and a province.

**Fix.** Normalize before matching *and* before suggesting: strip store numbers (`#769`,
`0769`), city/state/province suffixes, airport codes, and payment-processor prefixes
(`TST*`, `WWW.`, `HTTPS://`, `& `). There is existing normalization in
`src/lib/matching/vendor-matcher.ts` and `src/lib/proposals/vendor-matcher.ts` — reconcile
the two rather than adding a third.

### 2.5 Proposals with no vendor at all

Two pending proposals (Levi's Outlet, Koolpunt Property) have neither
`proposed_vendor_id` nor `proposed_vendor_name_suggestion` — the card shows `(new) —` and
accepting it would create a nameless vendor.

**Fix.** Validate in `upsertProposal` (`src/lib/proposals/proposal-service.ts`): never persist
a proposal without a vendor id *or* a non-empty name suggestion; fall back to the cleaned
description.

---

## Tier 3 — Coverage and lifecycle

### 3.1 Proposals only cover a third of the queue

42 of 133 unresolved May cards have a proposal. Every Grab and Lazada line on the Chase
statement — the highest-volume, most mechanical work — has none.

`generateAndStoreProposals` (`src/lib/proposals/proposal-service.ts:411-432`) correctly skips
items that already have a proposal, so this is not a bug in the generator; nothing ever
generates for a whole window in one pass. `POST /api/imports/proposals/generate` already
accepts `{ from, to, source }`.

**Fix.** Make whole-window generation a first-class action — trigger it when a statement
finishes processing, and expose it on the Review page for the active filter window. It must
stay idempotent and must not silently skip on partial failure (it currently counts errors but
the caller has no way to retry just the failures).

### 3.2 Orphaned proposals can never surface

Five pending May proposals point at a `composite_id` that no longer matches any card, so they
render nowhere and block regeneration (they're in the skip set from 3.1).

**Root cause.** `src/app/api/imports/queue/route.ts:262-275` marks a proposal stale only when
its source is found under a *different* composite id. When the source isn't in the current
item set at all, `owner` is `undefined` and the proposal is left pending forever.

**Fix.** Treat "source absent from the current items" as stale too — but only when the query
window actually covered that source's date, otherwise every filtered query would mark
everything stale. The date-window guard is the whole difficulty here; get it right.

### 3.3 Two emails for one payment become two cards

**Symptom.** 2026-05-06, Bliss Clean + Care: **two** real payments of ฿2,782 (two slips with
distinct references `3AOR04848` / `5BOR04659`, two KBANK rows) produce **three** cards. The
extra card pairs a slip with the vendor's own invoice email while a separate card pairs the
K PLUS transfer-confirmation email with the statement row. Approving all three creates a
phantom ฿2,782.

**Root cause.** The aggregator has no email↔email dedup. A vendor's receipt/invoice email and
the bank's transfer-confirmation email describe one payment; nothing recognises that.

**Fix.** In the payment-slip / cross-source pairing phases of
`src/lib/imports/queue-aggregator.ts`, collapse emails that describe the same payment before
pairing — same amount, same currency, ±1 day, and one classified
`bank_transfer_confirmation` while the other is a vendor receipt/invoice. Prefer keeping both
as evidence on one card over dropping either.

### 3.4 Non-transaction emails occupy the queue

Five May cards have no amount at all: "Your credit card statement is available", "Important
Notice: Your May 2026 Statement", "Your bill—your savings. Check it out.", "Here's your
promotional credit…", "May 2026 Invoice – Bliss Clean + Care Co."

These are already classifiable (`ai_classification` covers `account_notification`,
`marketing_promotional`, `invoice_available`). They should be auto-skipped, not queued.
See `docs/classification-rules.md` — the rules exist; the queue isn't honouring them.

---

## Tier 4 — Operational resilience

### 4.1 Rate limits silently destroy slip batches

46 payment slips are in `failed` status; **45** carry
`429 {"type":"error","error":{"type":"rate_limit_error", ...}}`. All 46 came from a single
bulk upload on 2026-04-13. Their payments are invisible to the invariant check, and February
still has 55 pending slips as a result.

**Root cause.** `src/lib/email/ai-client.ts:38-60` races the API call against a hard 15s
timeout (`REQUEST_TIMEOUT_MS`). The Anthropic SDK retries 429s with backoff by default, but
the race rejects the whole promise before any meaningful backoff can complete — so a
rate-limited call can never succeed. `src/lib/payment-slips/vision-extractor.ts:100` sets a
per-client timeout instead, so check whether that path has the same defect.

**Fix.** Explicit retry with exponential backoff honouring `retry-after`; make the timeout
**per attempt**, not per overall operation; bound upload concurrency so a bulk drop doesn't
outrun the rate limit; and mark exhausted-retry failures as retryable so they can be
reprocessed in bulk rather than one at a time.

### 4.2 Statements that extract zero rows pass silently

`2026-05_Business_Checking_x7832.pdf` (PNC Business, 2026-05-01..05-29) sits in
`ready_for_review` with `transactions_extracted = 0`. An empty statement and a parser that
failed to read the layout are indistinguishable from the UI, and the month audit will happily
call the account covered.

**Fix.** Distinguish "parsed, genuinely empty" from "parsed nothing" — flag zero-row
extractions for confirmation rather than letting them count as coverage.

---

## Suggested order

1. **1.1, 1.2, 1.3** — sign/type correctness and self-transfer pairing. Small, high value,
   directly prevents wrong money.
2. **1.4 + 4.1** — slip extraction trustworthiness and retry. Same subsystem; do together.
3. **2.1** — split the confidence score. It is the precondition for ever trusting bulk
   approve, and it changes how 2.2–2.5 should report themselves.
4. **2.2–2.5** — enrichment quality.
5. **3.x, 4.2** — coverage and lifecycle.

## Definition of done

- `npx tsx scripts/reconcile/month-audit.ts 2026-05` shows the two $4,895.28 legs merged, the
  ฿23,700 slip orphan resolved, and a lower duplicate-cluster count.
- `npx tsx scripts/reconcile/inspect-proposals.ts 2026-05` shows the DigiCo row as `income`,
  no proposal with an empty vendor, no rent description on a two-digit amount, and no orphaned
  proposals.
- Unit tests cover: LLM cannot override an arithmetic sign; card payment ⇒ transfer not
  income; description reuse rejected on magnitude mismatch; vendor matcher rejects generic-token
  matches.
- `npm test`, `npm run typecheck`, `npm run lint` all pass.
- **No transaction was created, approved, or rejected during any of this.**
