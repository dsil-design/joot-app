# Smart Transaction Proposals — Implementation Plan

**Feature:** Smart Transaction Proposals
**Status:** Plan — not yet started
**Date:** 2026-03-07

---

## Overview

Five phases, each independently deployable and testable. Phases 1-3 are the core feature. Phase 4 adds automation. Phase 5 is polish.

```
Phase 1: Database + Rule Engine       (foundation, no UI changes)
Phase 2: LLM Enhancement Layer        (adds AI to ambiguous cases)
Phase 3: UI Integration               (surfaces proposals in review queue)
Phase 4: Background Triggers + Learn  (automation + feedback loop)
Phase 5: Polish + Monitoring          (optimization + observability)
```

---

## Phase 1: Database + Rule-Based Proposal Engine

**Goal:** Create storage, build the deterministic engine, wire up basic generation API. No UI changes yet — testable via API.

### Task 1.1: Database Migration

**Create:** `database/migrations/YYYYMMDD_create_transaction_proposals.sql`
**Modify:** `database/schema.sql`

Create `transaction_proposals` table with RLS policies as specified in FEATURE_SPEC.md Section 5.

Also includes prerequisite migrations to existing tables:
- `ai_feedback`: Add `'proposal_correction'` to `feedback_type` CHECK constraint; alter `email_transaction_id` to be nullable
- `ai_journal`: Add `'transaction_proposal'` to `invocation_type` values

**Dependencies:** None
**Complexity:** S

---

### Task 1.2: Regenerate Supabase Types

**Modify:** `src/lib/supabase/types.ts`

Run `npx supabase gen types typescript --linked > src/lib/supabase/types.ts`.

**Dependencies:** 1.1
**Complexity:** S

---

### Task 1.3: Proposal Types & Interfaces

**Create:** `src/lib/proposals/types.ts`

Define TypeScript types:
- `TransactionProposal` — DB row type
- `ProposedFields` — the proposed values
- `FieldConfidenceMap` — `Record<string, { score: number; reasoning: string }>` (key name `reasoning` aligns with `ProposedField.reasoning` in DESIGN_SPEC.md)
- `ProposalEngineResult` — engine output (fields + confidence + metadata)
- `ProposalGenerateRequest` — API request type
- `ProposalGenerateResponse` — API response type

**Dependencies:** 1.2
**Complexity:** S

---

### Task 1.4: Refactor PARSER_PAYMENT_METHOD_MAP to Shared Module

**Create:** `src/lib/proposals/payment-method-mapper.ts`
**Modify:** `src/components/page-specific/create-from-import-dialog.tsx` (import from new location)

Extract `PARSER_PAYMENT_METHOD_MAP` from the dialog to a shared utility so both client dialog and server-side rule engine can use it.

**Dependencies:** None (can be done early / in parallel)
**Complexity:** S

---

### Task 1.5: Vendor Fuzzy Matching Utility (Server-Side)

**Create:** `src/lib/proposals/vendor-matcher.ts`

Server-side vendor matching for description strings. Strategies:
1. Exact name match against `vendors` table
2. Token overlap scoring (e.g., "GRAB*CAR BKK" matches vendor "Grab")
3. Historical description lookup — find transactions with similar descriptions, return their vendor
4. Levenshtein distance as tiebreaker

Returns: `{ vendorId: string; vendorName: string; confidence: number; reason: string } | null`

Distinct from client-side `useVendorSearch` (which uses `ilike` only).

**Dependencies:** 1.3
**Complexity:** M

---

### Task 1.6: Rule-Based Proposal Engine

**Create:** `src/lib/proposals/rule-engine.ts`

Core engine implementing Layer 1 logic for all 8 fields (see FEATURE_SPEC.md Section 7).

Key design decisions:
- Accepts pre-fetched reference data (vendors, payment methods, tags, recent transactions) to enable batch optimization
- Pure function: `generateRuleProposal(item: QueueItem, context: RuleEngineContext) -> ProposalEngineResult`
- Context includes: `vendors`, `paymentMethods`, `tags`, `recentTransactions`, `vendorTagFrequency`

**Dependencies:** 1.3, 1.4, 1.5
**Complexity:** L

---

### Task 1.7: Proposal Persistence Service

**Create:** `src/lib/proposals/proposal-service.ts`

CRUD + orchestration:
- `generateAndStoreProposals(supabase, userId, items, options?)` — runs engine + stores results
- `getProposalsForItems(supabase, userId, compositeIds)` — bulk fetch by composite IDs
- `updateProposalStatus(supabase, proposalId, status, modifications?)` — status transitions
- `markStaleProposals(supabase, userId, compositeIds?)` — mark as stale
- `upsertProposal(supabase, proposal)` — insert or update (keyed on composite_id + user_id)
- `prefetchRuleEngineContext(supabase, userId, dateRange)` — batch fetch reference data

**Dependencies:** 1.6
**Complexity:** M

---

### Task 1.8: Proposal Generation API

**Create:** `src/app/api/imports/proposals/generate/route.ts`

`POST /api/imports/proposals/generate` — as specified in FEATURE_SPEC.md Section 6.

Flow:
1. Auth check
2. Fetch pending QueueItems (using existing queue builder functions)
3. Filter by request params
4. Call `generateAndStoreProposals`
5. Return stats

**Dependencies:** 1.7
**Complexity:** M

---

### Task 1.9: Proposal Fetch API

**Create:** `src/app/api/imports/proposals/route.ts`

`GET /api/imports/proposals?compositeIds=...` — bulk fetch proposals for queue items.

**Dependencies:** 1.7
**Complexity:** S

---

## Phase 2: LLM Enhancement Layer

**Goal:** Add Claude Haiku as second pass when rule confidence is low. Independently testable — proposals marked as `hybrid` when LLM was used.

### Task 2.1: LLM Proposal Engine

**Create:** `src/lib/proposals/llm-engine.ts`

Claude Haiku call for field enhancement:
- System prompt: Transaction categorization assistant
- Context building: import item data + similar transactions + available entities
- Structured JSON output schema
- Response parsing with error handling
- Uses existing AI client patterns (see `src/lib/email/ai-client.ts`)

Returns: `ProposalEngineResult` (same shape as rule engine output)

**Dependencies:** 1.3, existing `src/lib/email/ai-client.ts` and `src/app/api/chat/route.ts` (for Anthropic SDK patterns)
**Complexity:** L

---

### Task 2.2: Few-Shot Feedback Retriever for Proposals

**Create:** `src/lib/proposals/feedback-retriever.ts`

Extends the existing feedback query pattern used in `src/app/api/emails/transactions/[id]/feedback/route.ts` and related routes:
- Queries `ai_feedback` where `feedback_type = 'proposal_correction'` (**requires** `ai_feedback` schema migration — see FEATURE_SPEC.md Section 5)
- Also queries `transaction_proposals` where `status = 'modified'` for direct correction examples
- Returns up to 5 most recent relevant examples
- In-memory cache with 60s TTL (matches existing pattern)

**Dependencies:** 2.1
**Complexity:** M

---

### Task 2.3: Hybrid Engine Orchestrator

**Create:** `src/lib/proposals/hybrid-engine.ts`
**Modify:** `src/lib/proposals/proposal-service.ts` (use hybrid engine instead of rule-only)

Orchestration logic:
1. Run rule engine
2. Calculate average confidence of key fields (vendor, description, tags)
3. If avg < 70%: call LLM engine
4. Merge results: LLM can upgrade low-confidence fields, rule-based high-confidence fields preserved
5. Set engine to `hybrid` when LLM was used

Graceful degradation: if LLM fails (timeout, rate limit), fall back to rule-based only.

**Dependencies:** 1.6, 2.1, 2.2
**Complexity:** M

---

### Task 2.4: AI Journal Logging for Proposals

**Modify:** `src/lib/proposals/llm-engine.ts`

Log each LLM call to `ai_journal` with `invocation_type = 'transaction_proposal'`:
- Import context metadata
- Token usage
- Duration
- Proposal outcome

**Dependencies:** 2.1
**Complexity:** S

---

## Phase 3: UI Integration

**Goal:** Surface proposals in the review queue. Users see proposal summaries on cards and get pre-filled dialogs.

### Task 3.1: Extend Queue Types with Proposal Data

**Modify:** `src/lib/imports/queue-types.ts`
**Modify:** `src/components/page-specific/match-card/types.ts`

Add optional `proposal` field to `QueueItem` and `MatchCardData`. The UI layer uses the `TransactionProposal` / `ProposedField<T>` types defined in DESIGN_SPEC.md Section 3 (per-field value + confidence + reasoning). The queue API transforms the flat DB row + `field_confidence` JSONB into this shape before returning it to the client.

```typescript
// API wire format (queue API response) — matches DESIGN_SPEC.md Section 3.2
proposal?: TransactionProposal  // see DESIGN_SPEC.md for full type definition

```

**Dependencies:** Phase 1 complete
**Complexity:** S

---

### Task 3.2: Enrich Queue API Response with Proposals

**Modify:** `src/app/api/imports/queue/route.ts`

After building queue items, bulk-fetch proposals for all pending items and attach to response. Enrich with resolved names (vendor name, payment method name, tag names).

**Dependencies:** 3.1, 1.9
**Complexity:** M

---

### Task 3.3: Proposal Summary Panel on MatchCard

**Modify:** `src/components/page-specific/match-card/match-card-panels.tsx`

For `new-transaction` variant cards, replace the "No matching transaction found" right panel with a proposal summary showing:
- Proposed vendor name (with confidence indicator)
- Proposed amount + currency
- Proposed date
- Proposed payment method
- Proposed tags (as small badges)
- Transaction type indicator
- Overall confidence bar

See DESIGN_SPEC.md Section 5 for full visual specification.

**Dependencies:** 3.1
**Complexity:** M

---

### Task 3.4: Updated Action Buttons for Proposal Cards

**Modify:** `src/components/page-specific/match-card/match-card-actions.tsx`

Action button logic based on proposal confidence (see DESIGN_SPEC.md Section 9):
- >= 85%: Primary "Quick Create" + secondary "Review & Edit"
- 50-84%: Primary "Create as New" (opens dialog)
- < 50%: Primary "Review & Create" (opens dialog, highlights uncertain fields)
- No proposal: Existing behavior unchanged

**Dependencies:** 3.3
**Complexity:** M

---

### Task 3.5: Enhanced CreateFromImportDialog with Proposal Pre-fill

**Modify:** `src/components/page-specific/create-from-import-dialog.tsx`
**Modify:** `src/app/imports/review/page.tsx`

Extend `CreateFromImportData` to accept full proposal data. When proposal exists:
- Pre-fill ALL fields from proposal (vendor, payment method, tags, description, type)
- Extend `aiPrefilled` set to track all proposal-filled fields
- Add transaction type toggle (expense/income) pre-selected from proposal
- Vendor suggestion chips when vendor confidence < 60 (see DESIGN_SPEC.md Section 8.3)
- Tag suggestion chips below tag field (see DESIGN_SPEC.md Section 8.4)
- Modification tracking: `modifiedProposalFields` set alongside `aiPrefilled` (see DESIGN_SPEC.md Section 8.7)
- Review page passes proposal data when opening dialog

**Dependencies:** 3.1
**Complexity:** M

---

### Task 3.6: Field Reasoning Tooltips

**Create:** `src/components/ui/confidence-tooltip.tsx`
**Modify:** `src/components/page-specific/create-from-import-dialog.tsx`

On hover/tap of the Zap icon, show tooltip with reasoning text from `field_confidence`. Uses shadcn `Tooltip` component.

Per-field confidence visual indicators:
- High (>= 80): normal text
- Medium (50-79): amber indicator
- Low (< 50): orange indicator with "?" icon

**Dependencies:** 3.5
**Complexity:** S

---

### Task 3.7: Proposal Accept Hook

**Create:** `src/hooks/use-proposal-accept.ts`
**Modify:** `src/hooks/use-create-and-link.ts`

New hook wrapping `useCreateAndLink`:
1. Compare final form values against proposal values
2. Compute `user_modifications` diff
3. After transaction creation, call `PATCH /api/imports/proposals/[id]`
4. Set status to `accepted` (no changes) or `modified` (with diff)
5. Store `created_transaction_id`

**Dependencies:** 3.5
**Complexity:** M

---

### Task 3.8: Proposal Status API

**Create:** `src/app/api/imports/proposals/[id]/route.ts`

`PATCH /api/imports/proposals/[id]` — update status, store modifications, link to created transaction. Validates status transitions.

**Dependencies:** 1.7
**Complexity:** S

---

### Task 3.9: Quick Create Action

**Modify:** `src/app/imports/review/page.tsx`
**Modify:** `src/hooks/use-match-actions.ts`

"Quick Create" for high-confidence proposals (>= 85%):
- Creates transaction directly from proposal data without opening dialog
- Shows undo toast (5-second window, matching existing pattern)
- Uses `useProposalAccept` hook with status `accepted`

**Dependencies:** 3.7
**Complexity:** M

---

### Task 3.10: Batch Quick Create

**Modify:** `src/app/imports/review/page.tsx`

"Quick Create All (N)" button in New Transactions section header when multiple proposals have >= 85% confidence. Shows confirmation dialog with summary. Uses batch version of quick create.

**Dependencies:** 3.9
**Complexity:** M

---

## Phase 4: Background Triggers + Learning Loop

**Goal:** Automate proposal generation and close the feedback loop.

### Task 4.1: Statement Processing Trigger

**Modify:** Statement processing completion handler (where `status` -> `ready_for_review`)

After extraction completes, fire-and-forget call to `POST /api/imports/proposals/generate` with `statementUploadId`.

**Dependencies:** Phase 1
**Complexity:** S

---

### Task 4.2: Email Extraction Trigger

**Modify:** Email processing pipeline (where email_transactions are created/updated)

After extraction, generate proposal for the new email transaction.

**Dependencies:** Phase 1
**Complexity:** S

---

### Task 4.3: Rematch Trigger

**Modify:** `src/app/api/imports/rematch/route.ts`

After rematch:
1. Mark affected proposals as `stale`
2. Trigger regeneration for items whose match status changed

**Dependencies:** 1.7
**Complexity:** M

---

### Task 4.4: Learning Loop — AI Feedback from Modifications

**Modify:** `src/hooks/use-proposal-accept.ts`
**Modify:** `src/lib/proposals/feedback-retriever.ts`

When proposal is accepted with modifications:
1. Create `ai_feedback` entry with `feedback_type = 'proposal_correction'`
2. Include: original values, corrected values, import context
3. Future proposals incorporate via few-shot injection (Task 2.2)

**Dependencies:** 3.7, 2.2
**Complexity:** M

---

### Task 4.5: Manual Refresh from UI

**Modify:** `src/app/imports/review/page.tsx`

Add "Regenerate Proposals" action (could be integrated into existing refresh/rematch button). Calls `POST /api/imports/proposals/generate` for visible pending items.

**Dependencies:** 1.8, Phase 3
**Complexity:** S

---

### Task 4.6: Stale Proposal Indicator

**Modify:** `src/components/page-specific/match-card/match-card-panels.tsx`

Show "Refresh available" chip on cards with stale proposals. Click triggers regeneration for that item.

**Dependencies:** 3.3
**Complexity:** S

---

### Task 4.7: Daily Cron Proposal Pass

**Modify:** `src/app/api/cron/sync-all-rates/route.ts` (add step to existing cron)

Add proposal generation step to the daily cron:
1. Find pending queue items without proposals (or with stale proposals)
2. Generate in batches (max 50 per run)
3. Log results

**Dependencies:** 1.8
**Complexity:** S

---

## Phase 5: Polish + Monitoring

### Task 5.1: Batch Engine Optimization

**Modify:** `src/lib/proposals/proposal-service.ts`, `src/lib/proposals/rule-engine.ts`

- Pre-fetch all reference data once per batch
- Cache vendor fuzzy match results within a batch
- Pre-fetch historical transactions for the full date range

**Dependencies:** Phase 1
**Complexity:** M

---

### Task 5.2: Error Handling & Graceful Degradation

**Modify:** `src/lib/proposals/hybrid-engine.ts`, `src/lib/proposals/llm-engine.ts`

- LLM failure -> fall back to rule-based only
- Partial rule engine failure -> produce proposal with available fields
- Never block the import flow
- Log errors, store error info in `field_confidence`

**Dependencies:** Phase 2
**Complexity:** S

---

### Task 5.3: Proposal Accuracy Metrics

**Create:** `src/app/api/imports/proposals/stats/route.ts`

API endpoint returning:
- Total proposals by engine type
- Acceptance rate, modification rate
- Most-modified fields
- LLM token usage + cost estimates
- Average confidence scores

Could surface in AI Journal or settings page.

**Dependencies:** Phase 4
**Complexity:** M

---

### Task 5.4: AI Journal Analysis Extension

**Modify:** `src/app/api/ai-journal/analyze/route.ts`

Add proposal-specific analysis:
- Proposal accuracy trends
- Correction patterns (repeated vendor/tag corrections)
- Suggestions for new rules or parser templates
- Cost optimization opportunities

**Dependencies:** Phase 4
**Complexity:** M

---

### Task 5.5: End-to-End Testing

**Create:** Test plan document

Manual test scenarios:
1. Upload statement -> proposals auto-generated
2. Email sync -> proposals auto-generated
3. Review queue shows proposal summaries
4. "Create as New" opens pre-filled dialog
5. User modifies vendor and saves -> proposal marked `modified`, feedback created
6. Rematch -> stale proposals regenerated
7. LLM fallback: ambiguous description triggers enhancement
8. Quick Create for high-confidence proposals
9. Batch Quick Create
10. Proposal accuracy stats

**Dependencies:** All phases
**Complexity:** M

---

## Dependency Graph

```
Phase 1 (foundation)
  1.1 -> 1.2 -> 1.3 -> 1.6
  1.4 (parallel) --------^
  1.5 -------------------^
  1.6 -> 1.7 -> 1.8, 1.9

Phase 2 (LLM) -- requires Phase 1
  2.1 -> 2.3
  2.2 -> 2.3
  2.1 -> 2.4

Phase 3 (UI) -- requires Phase 1; Phase 2 recommended
  3.1 -> 3.2, 3.3, 3.5
  3.3 -> 3.4
  3.5 -> 3.6, 3.7
  3.8 (depends on 1.7 only — can run in parallel with other Phase 3 tasks)
  3.7 -> 3.9
  3.9 -> 3.10

Phase 4 (automation) -- requires Phase 1; Phase 3 for some
  4.1, 4.2, 4.7 (parallel, Phase 1 only)
  4.3 (Phase 1)
  4.4 (3.7 + 2.2)
  4.5, 4.6 (Phase 3)

Phase 5 (polish) -- requires prior phases
  5.1-5.5 (mostly parallel)
```

---

## Task Summary

| Phase | Tasks | Complexity Breakdown |
|-------|-------|---------------------|
| Phase 1: Database + Rules | 9 tasks | 5S, 3M, 1L |
| Phase 2: LLM Enhancement | 4 tasks | 1S, 2M, 1L |
| Phase 3: UI Integration | 10 tasks | 3S, 7M |
| Phase 4: Triggers + Learning | 7 tasks | 5S, 2M |
| Phase 5: Polish | 5 tasks | 1S, 4M |
| **Total** | **35 tasks** | **15S, 18M, 2L** |

---

## Risk Considerations

1. **LLM Cost:** Haiku is cheap (~$0.0003/call) but the 70% threshold controls volume. Start conservative, tune based on accuracy metrics.

2. **Latency:** Rule engine <100ms, LLM 1-3s. Background generation means users never wait for LLM. Queue enrichment is a single indexed DB query.

3. **Stale Proposals:** Mitigated by staleness tracking + regeneration triggers. UI shows stale indicator.

4. **Cold Start:** Initially no feedback data exists. Rule engine provides reasonable baseline. LLM quality improves as corrections accumulate.

5. **Vendor Fuzzy Matching Quality:** Server-side matching needs tuning. Start with token overlap + Levenshtein, iterate based on proposal accuracy data.

---

## Critical Files

| File | Role |
|------|------|
| `database/schema.sql` | Add transaction_proposals table; alter ai_feedback and ai_journal |
| `src/lib/proposals/` | New directory for all proposal engine code |
| `src/lib/imports/queue-types.ts` | Extend QueueItem with proposal |
| `src/components/page-specific/match-card/match-card-panels.tsx` | Proposal summary panel |
| `src/components/page-specific/match-card/match-card-actions.tsx` | Updated action buttons |
| `src/components/page-specific/create-from-import-dialog.tsx` | Enhanced pre-fill from proposal |
| `src/app/api/imports/queue/route.ts` | Enrich queue with proposals |
| `src/app/api/imports/proposals/` | New API endpoints |
| `src/hooks/use-proposal-accept.ts` | New hook for accept + feedback |

---

## Related Documents

- [Feature Specification](./FEATURE_SPEC.md) — Detailed feature requirements
- [Design Specification](./DESIGN_SPEC.md) — UX/UI design documentation
