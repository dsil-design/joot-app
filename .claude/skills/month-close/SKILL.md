---
name: month-close
description: Reconcile a full month of transactions across every source (bank/credit-card statements, receipt emails, Thai payment slips) into Joot. Use when Dennis says "close May", "reconcile June", "here are the sources for <month>", or asks what's left to review for a month. Produces a triaged plan, drives the Review queue, and reports what could not be reconciled and why.
---

# Month Close

Reconcile one calendar month end-to-end. The goal is not "import transactions" — it is
to arrive at a defensible statement: *every real payment in this month exists exactly
once in Joot, and every source document is accounted for.*

## The mental model

Sources are **evidence**, not transactions. Several documents can describe the same
payment; one document can describe several payments; some documents describe no payment
at all. Reconciliation is the act of grouping evidence into payments, then creating one
Joot transaction per payment.

The four evidence classes and what each proves:

| Source | Proves | Coverage |
|---|---|---|
| **Statement row** (Chase, KBANK, PNC, Amex, Bangkok Bank) | The money moved, and the settled amount | Complete for that account and period — this is the ledger of record |
| **Payment slip** (Thai bank transfer image) | Who was paid, in THB, with a reference number | Complete for KBANK outgoing — Dennis supplies a slip for **every** outgoing KBANK transfer |
| **Receipt email** (Grab, Lazada, Amazon, K PLUS, utilities) | What was bought, and the merchant's own currency | Partial — many charges have no email |
| **AI journal / manual note** | Context nothing else has (cash, splits, intent) | Sparse |

Two invariants make the month checkable rather than merely reviewable:

1. **Every outgoing KBANK statement row has a payment slip.** A violation means either a
   slip was never uploaded, or the slip failed extraction. Both are actionable.
2. **Every payment slip maps to a statement row.** A violation means the slip belongs to a
   different account (Bangkok Bank, Wise), a different month, or extracted a wrong
   date/amount.

Incoming rows are *not* covered by either invariant — Dennis doesn't initiate them, so
no slip exists. Do not report them as failures.

## Step 1 — Audit before touching anything

```bash
npx tsx scripts/reconcile/month-audit.ts 2026-05
```

Read-only. It prints source coverage, the Review-queue contents bucketed into triage
tiers, both invariants, and anomaly clusters. `--json` emits the same data structured, for
when you need to drive decisions off it.

Run this first, every time. Never start approving before you know what the month contains.

## Step 2 — Close the source gaps

Reconciliation is only as complete as its evidence. From the audit's coverage section:

- **Import source with no statement covering the window** → ask Dennis for that statement.
  Name the account and the exact period needed.
- **Period gap** between consecutive statements → a mid-cycle statement was never
  uploaded. Statement periods must be contiguous per account.
- **`⚠ EXTRACTED 0 ROWS`** → the file uploaded but the parser found nothing. Either the
  statement is genuinely empty or the parser doesn't handle that layout. Check before
  assuming the account was quiet.
- **Failed slip extractions** → re-run them. A `429 rate_limit_error` means the batch
  outran the Anthropic API; those slips are recoverable by reprocessing, and until they
  are, their payments are invisible to the invariant check.

**Calendar months are not statement months.** Chase runs the 19th to the 18th; KBANK is
calendar. Closing May therefore touches *two* Chase statements. Say this out loud in the
plan rather than silently reconciling half a card. A month is only closeable when every
account's periods fully span it.

Stop here and ask if anything material is missing. Reconciling a month with a missing
statement produces a confident, wrong answer — the worst outcome available.

## Step 3 — Triage, don't grind

The audit sorts unresolved cards into four tiers. Work them in this order:

**BLOCKED** — no usable amount. Almost always non-transaction email (statement-available
notices, marketing, promotional credits). Skip them so they stop occupying the queue.
Anything that *is* a real payment with a failed extraction goes back to its source page
for re-extraction.

**AUTO** — multi-source agreement at confidence ≥95: a slip, an email, and a statement row
that independently agree on date and amount. Two or more records agreeing is a stronger
signal than any scoring heuristic. Bulk-approve these.

**CONFIRM** — one strong source at ≥90. Spot-check a sample (5–10), then approve the rest
if the sample is clean. If two or more in the sample are wrong, drop the whole tier to
DECIDE and find out why.

**DECIDE** — a lone statement line with no corroborating source. This is the bulk of a
US-spending month and it is genuine work: each needs a vendor and a category. Generate
proposals in one pass rather than deciding cold:

```
POST /api/imports/proposals/generate  { "from": "2026-05-01", "to": "2026-05-31", "source": "statement" }
```

Then review the proposals. The rule engine handles recurring merchants; the LLM engine
handles the rest.

## Step 4 — Resolve anomalies before approving

The audit's duplicate-risk clusters are the highest-value output. A cluster is *N* cards
carrying the same date and amount. Approving them blind double-counts money.

For each cluster, count the **real payments** — go to the underlying reference numbers
(slip `transaction_reference`, statement row index, email order id), not the card count.
Then either merge the extra cards onto one payment (`POST /api/imports/queue/attach-source`)
or reject the duplicates.

The recurring cause is that a vendor's own receipt email and the bank's transfer
confirmation email both describe one payment, and the aggregator treats them as two.
When you see a merged card with no statement row sitting alongside a card that has one,
suspect this first.

## Step 5 — Approve

Bulk approve by scope rather than assembling ID lists:

```
POST /api/imports/approve  { "scope": "high-confidence-pending", "minConfidence": 95, "createTransactions": true }
```

Other endpoints, all taking composite ids (`stmt:<uuid>:<idx>`, `email:<uuid>`, `slip:<uuid>`,
or the `merged:…` forms):

| Endpoint | Use |
|---|---|
| `POST /api/imports/approve` | `{ emailIds: [...], createTransactions: true }` |
| `POST /api/imports/reject` | `{ emailIds: [...], reason }` — records a rejection so it is not re-proposed |
| `POST /api/imports/link` | `{ compositeId, transactionId }` — attach a source to an existing transaction |
| `POST /api/imports/queue/attach-source` | manually pair two sources the matcher missed |
| `POST /api/imports/ignore` | `{ ids: [...] }` — non-transaction noise |
| `POST /api/imports/rematch` | re-run matching after new sources arrive |

**Approving writes real financial records.** Confirm the plan with Dennis — counts per tier
and the anomaly resolutions — before the first mutating call. After that confirmation,
work the tiers without stopping for each one.

## Step 6 — Verify and report

Re-run the audit. A closed month means: zero unresolved cards, zero invariant violations,
zero unexplained clusters. Report:

- transactions created, by source class
- what was skipped and why
- invariant violations still open (slip owed, slip with no statement row)
- source gaps still outstanding
- anything you decided that Dennis might have decided differently

Never report a month as closed while a statement is missing. Report it as *closed except
for X*, and name X.

## Notes that save time

- The Review queue lives at `/review`. `?from=&to=` scopes it to the month.
- Slips and statement rows can differ by the transfer fee. The invariant check tries both
  `amount` and `amount + fee` — carry that tolerance into any manual matching.
- KBANK rows are signed: positive is outgoing, negative is incoming. Bank statement
  descriptions read `To: <name>` and `From: <name>` respectively.
- Recipient `MR. DENNIS RODGER SILLER` on a slip is Dennis paying himself — a transfer
  between his own accounts, not an expense. It often has no KBANK row because the other
  leg is Bangkok Bank or Wise.
- `docs/classification-rules.md` is the live reference for email classification.
- Statement text → vendor mappings live in
  `.claude/skills/import-transactions/TRANSACTION-IMPORT-REFERENCE.md`.
