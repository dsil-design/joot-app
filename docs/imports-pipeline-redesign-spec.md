# Imports Pipeline Redesign — Technical Implementation Plan

**Project:** Joot Transaction Tracker
**Feature:** Imports Pipeline Redesign (Statements, Bank Statements, Review Queue)
**Date:** 2026-03-06
**Version:** 1.0
**Status:** Planning

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Design Principles](#3-design-principles)
4. [Navigation Restructure](#4-navigation-restructure)
5. [Schema Changes](#5-schema-changes)
6. [Statements Section Enhancements](#6-statements-section-enhancements)
7. [Review Page Redesign](#7-review-page-redesign)
8. [Pipeline Flow & State Management](#8-pipeline-flow--state-management)
9. [Shared Component Refactors](#9-shared-component-refactors)
10. [API Changes](#10-api-changes)
11. [File Manifest](#11-file-manifest)

---

## 1. Executive Summary

The Imports section currently handles three transaction sources: email receipts, credit card statements, and (conceptually) bank statements. The Email Receipts hub is mature and well-built. The Statements section and Review Queue need enhancement to support the full import pipeline vision:

1. **Source-specific processing** — Each source type has its own area for individual-level control
2. **Unified review** — All processed items flow into a single Review page for efficient bulk decision-making

This plan covers: navigation restructuring, adding payment method type differentiation (credit card vs bank account), enhancing the Statements section, redesigning the Review page as a true cross-source aggregation point, and extracting shared code to reduce duplication.

### What Already Exists

- **Emails hub** (`/imports/emails`) — Complete. Sync, process, filter, batch operations, detail panels, individual email pages. **No changes needed.**
- **Statements** (`/imports/statements`) — List grouped by payment method, upload dialog, stats bar
- **Statement detail** (`/imports/statements/[id]`) — Processing states, two-tab layout (statement transactions / joot transactions), link and create dialogs
- **Review queue** (`/imports/review`) — Cross-source aggregation (statements + emails + merged), match cards, filter bar, batch approve, confidence-based filtering
- **Queue API** (`/api/imports/queue`) — Already aggregates from statement suggestions, email transactions, and cross-source pairs

### Key Decisions

- **Do NOT create a separate `/imports/bank-statements` route** — Bank statements share 80%+ of the credit card pipeline. Differentiation happens via payment method type, not route separation.
- **Do NOT add `source: 'bank_statement'` as a new import source type** — Bank statements flow through `statement_uploads` with the same `extraction_log.suggestions` structure. The discriminator is the payment method's `type`, not the source.
- **Keep the import-id system unchanged** — `stmt:<uuid>:<index>` works for both credit card and bank statements.

---

## 2. Problem Statement

### Navigation doesn't match the user's mental model

The current order (Coverage → Statements → Review → Emails → AI Journal) mixes ingestion stages and puts Review in the middle. Users think in terms of: bring stuff in → process it → approve it.

### No bank statement differentiation

The `payment_methods` table has no `type` column. All statements are treated identically regardless of whether they come from a credit card or a bank account. Bank statements have different characteristics (transfers, deposits, debits) that need visual differentiation.

### Review page doesn't feel cross-source

While the API already aggregates from multiple sources, the UX doesn't clearly communicate source provenance, and it doesn't separate the two fundamentally different decisions users make: approving matches vs. importing new transactions.

### Duplicated transaction creation logic

The `handleCreateConfirm` function is duplicated verbatim across 4 files (review page, emails page, email detail page, statement detail page).

---

## 3. Design Principles

1. **Source pages are for individual attention and exceptions.** Users go to Emails or Statements to process individual items, inspect extraction quality, or handle edge cases.
2. **Review is for efficient bulk processing.** Once items are extracted and in `pending` status, they flow to Review for fast decision-making.
3. **Bank statements are a variant, not a separate feature.** They use the same upload → process → review pipeline. Type differentiation is cosmetic and informational, not structural.
4. **Don't remove existing functionality.** The statement detail page keeps its Link and Create dialogs for power-user individual processing. Review is the preferred path for bulk work.

---

## 4. Navigation Restructure

### Current

```
Coverage | Statements | Review | Emails | AI Journal
```

### Proposed

```
Overview | Emails | Statements | Review | AI Journal
```

**Changes:**
- Rename "Coverage" to "Overview" — communicates its dashboard role
- Move Emails before Statements — higher frequency interaction, most mature section
- Review comes after all source sections — it's the downstream aggregation step
- Add a pending-count badge on the Review nav item

**File:** `src/components/page-specific/imports-layout.tsx`

```typescript
const navigationItems = [
  { name: 'Overview',    href: '/imports',             icon: LayoutDashboard },
  { name: 'Emails',      href: '/imports/emails',      icon: Mail },
  { name: 'Statements',  href: '/imports/statements',  icon: FileText },
  { name: 'Review',      href: '/imports/review',      icon: ClipboardCheck },
  { name: 'AI Journal',  href: '/imports/ai-journal',  icon: Brain },
]
```

The Review nav item should show a badge with the count of pending items, fetched from `/api/imports/status-counts`.

---

## 5. Schema Changes

### 5a. Add `type` Column to `payment_methods`

```sql
ALTER TABLE public.payment_methods
  ADD COLUMN type TEXT NOT NULL DEFAULT 'credit_card'
  CHECK (type IN ('credit_card', 'bank_account', 'debit_card', 'other'));
```

Backward-compatible — existing rows default to `credit_card`. The `type` column flows through to every downstream query that joins `payment_methods`.

### 5b. Add `transaction_type` to Suggestion Shape

No migration needed — this is an additive field in the JSONB `extraction_log.suggestions`:

```typescript
interface Suggestion {
  // existing fields...
  transaction_type?: 'debit' | 'credit' | 'transfer_in' | 'transfer_out'
}
```

The parser writes this field for bank statements. The UI reads it to display direction indicators. Credit card statement parsers can omit it (defaults to charge/debit behavior).

### 5c. Regenerate Types

After migration, run:
```bash
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

---

## 6. Statements Section Enhancements

### 6a. Statements List Page — Type Filter Tabs

Add a tab strip at the top of the statements list: **All | Credit Cards | Bank Accounts**

This filters the existing grouped list by `payment_methods.type`. No new routes needed — filtering happens via query parameters or local state.

When both types exist, a "Go to Review" link in the stats bar shows a count: "14 items awaiting review →"

**File:** `src/app/imports/statements/page.tsx`

### 6b. Statement Row — Type Badge

Each group header shows a small type badge ("Credit Card" or "Bank Account") alongside the payment method name. Add a type-specific icon (credit card icon vs bank icon).

**File:** `src/components/page-specific/statement-row.tsx`

### 6c. Statement Detail Page — "Review in Queue" Callout

After processing completes and items are in the queue, show a callout:

```
14 transactions extracted.
[Review 14 items in queue →]  [Stay here to inspect individually]
```

The "Review in queue" button navigates to `/imports/review?statementUploadId=<id>`. The existing `ContextBreadcrumb` component handles reverse navigation.

**File:** `src/app/imports/statements/[id]/page.tsx`

### 6d. Statement Transaction List — Bank Statement Support

For bank statements, render debit/credit direction indicators and a `transaction_type` badge. Conditional rendering based on payment method type.

Transfers (`transfer_in`/`transfer_out`) should be visually distinct and may be auto-skipped by the parser since they are not expenses/income.

**File:** `src/components/page-specific/statement-transaction-list.tsx`

---

## 7. Review Page Redesign

### 7a. Stats Bar — User-Facing Labels

Replace the current 4 stat cards:

| Current | Proposed |
|---------|----------|
| Total | Pending Review |
| Pending | Ready to Approve (confidence >= 90) |
| High Confidence | This Week (transaction date in last 7 days) |
| Needs Review | Resolved (approved + rejected) |

Each stat card is clickable and sets the corresponding filter, mirroring the Email Hub stats bar pattern.

**File:** `src/app/imports/review/page.tsx`

### 7b. Source Provenance Pills

Add a compact source pill to every `MatchCard` header:

- `[Mail icon] Email Receipt` — for `source: email`
- `[FileText icon] Chase Sapphire` — for `source: statement`, showing payment method name
- `[GitMerge icon] Cross-Source` — for `source: merged`

Use consistent low-contrast colors: slate for statement, violet for email, blue for merged. These should not compete with confidence border colors.

**File:** `src/components/page-specific/match-card.tsx` (or `match-card-header.tsx` if split)

### 7c. Two-Section Layout (Proposed Matches / New Transactions)

Split the flat list into two visible sections (not tabs, so both are visible):

```
--- PROPOSED MATCHES (11 items, 8 high confidence) ---
[Approve All High Confidence button]
[MatchCard] [MatchCard] [MatchCard] ...

--- NEW TRANSACTIONS (13 items) ---
[Import All Ready button]
[MatchCard] [MatchCard] [MatchCard] ...
```

Both sections share the same filter bar. The filter bar controls both sections simultaneously. "Approve All High Confidence" only operates on the matches section.

Items are split using the existing `isNew` field on `MatchCardData`.

**File:** `src/app/imports/review/page.tsx`

### 7d. Filter Bar Reorganization

**Primary row (always visible):**
- Search (full width, flex-1)
- Source pill buttons: All / Email / Statement / Cross-Source (button group, not a select)
- Date range picker

**Secondary row (collapsed, "More Filters" toggle reveals):**
- Status
- Currency
- Confidence
- Statement picker
- Payment method type (credit card / bank account / all)

**File:** `src/components/page-specific/review-queue-filter-bar.tsx`

### 7e. Batch Operations Enhancement

The "Approve All High Confidence" button should:
1. Open the existing `BatchApproveDialog`
2. Show a breakdown by source: "8 from statements, 3 from emails"
3. Operate on all pending high-confidence items across all sources, not just the loaded page

Consider extending the approve API to accept `{ scope: 'high-confidence-pending' }` rather than requiring a list of IDs.

**File:** `src/components/page-specific/batch-approve-dialog.tsx`, `src/app/api/imports/approve/route.ts`

---

## 8. Pipeline Flow & State Management

### Stage Model

```
STAGE 1 — INGESTION (source-specific pages)
  Emails:     Synced → Processed (AI extraction) → Pending Review
  Statements: Uploaded → Processed (parser extraction) → Pending Review

STAGE 2 — REVIEW (Review page)
  Pending → Approved / Rejected / Linked

STAGE 3 — DONE (transactions exist in Joot, items are resolved)
```

### Entry Criteria for Review Queue

| Item status | In source page | In Review | User action |
|---|---|---|---|
| Unprocessed email | Yes, in Emails | No | Process with AI first |
| Extracted email (pending_review) | Yes, in Emails | Yes | Link / Create / Skip |
| Pending statement suggestion | Yes, in Statement detail | Yes | Approve / Reject / Link |
| Approved/rejected | Yes (dimmed) | Yes (dimmed, filterable) | None / Undo |

**Key rule:** Unprocessed items (un-extracted emails, un-parsed statements) do NOT appear in Review. Review is for items with actionable extracted data.

### Division of Labor

- **Source pages** = inspect, process exceptions, handle individual items with full context
- **Review page** = efficient bulk processing of the extracted/matched backlog

---

## 9. Shared Component Refactors

### 9a. Extract `useCreateAndLink` Hook

The `handleCreateConfirm` pattern is duplicated across 4 files:
- `src/app/imports/review/page.tsx`
- `src/app/imports/emails/page.tsx`
- `src/app/imports/emails/[id]/page.tsx`
- `src/app/imports/statements/[id]/page.tsx`

Extract into a shared hook:

```typescript
// src/hooks/use-create-and-link.ts
export function useCreateAndLink(linkFn: (compositeId: string, txId: string) => Promise<void>) {
  const { createTransaction } = useTransactions()

  const createAndLink = async (
    compositeId: string,
    transactionData: CreateTransactionData
  ) => {
    const result = await createTransaction({ ... })
    if (!result) throw new Error('Failed to create transaction')
    await linkFn(compositeId, result.id)
    toast.success('Transaction created and linked')
    return result
  }

  return { createAndLink }
}
```

### 9b. Reusable Components (Already Source-Agnostic)

These components require no changes:
- `LinkToExistingDialog` — accepts generic `LinkSourceItem`
- `CreateFromImportDialog` — accepts generic `CreateFromImportData`
- `BatchApproveDialog` — accepts generic `BatchApproveItem[]`
- `UploadStatementDialog` — accepts `paymentMethodId`

### 9c. Components Requiring Modification

| Component | Change |
|-----------|--------|
| `StatementTransactionList` | Add `transaction_type` column/badge for bank statements |
| `StatementRow` | Show payment method type icon |
| `StatementsStatsBar` | Add breakdown by type when both exist |
| `MatchCard` | Add source provenance pill |

---

## 10. API Changes

### 10a. Queue API — Add `paymentMethodType` to Response

Add `paymentMethodType` field to each `QueueItem` response, derived from the joined `payment_methods.type`. This enables the Review page to display "Bank Statement" vs "Credit Card" labels without a new source type.

**File:** `src/app/api/imports/queue/route.ts`

### 10b. Queue API — Modular Refactor

Extract the 662-line queue API into modular builders:

```
src/lib/imports/
  statement-queue-builder.ts   — builds QueueItem[] from statement_uploads
  email-queue-builder.ts       — builds QueueItem[] from email_transactions
  queue-aggregator.ts          — merge, pair, filter, sort, paginate
```

The API route becomes a thin orchestrator calling these modules.

### 10c. Statements API — Accept Type Filter

The statements list API (or the `useStatements` hook) should accept an optional `type` filter parameter to support the type filter tabs on the Statements page.

### 10d. Batch Approve API — Scope-Based Approval

Extend `POST /api/imports/approve` to accept either:
- `{ ids: string[] }` (existing behavior)
- `{ scope: 'high-confidence-pending' }` (new: approve all pending items with confidence >= 90)

This supports the batch approve button operating on all qualifying items, not just the currently loaded page.

### 10e. Status Counts API — Support Review Badge

Ensure `/api/imports/status-counts` returns a `pendingReviewCount` that the nav badge can display. This may already exist — verify and expose if needed.

---

## 11. File Manifest

### New Files

| File | Purpose |
|------|---------|
| `database/migrations/XXXXXX_add_payment_method_type.sql` | Add `type` column to `payment_methods` |
| `src/hooks/use-create-and-link.ts` | Shared hook for create-transaction-and-link pattern |
| `src/lib/imports/statement-queue-builder.ts` | Extract statement queue building from monolith API |
| `src/lib/imports/email-queue-builder.ts` | Extract email queue building from monolith API |
| `src/lib/imports/queue-aggregator.ts` | Merge, pair, filter, sort, paginate queue items |

### Modified Files

| File | Change |
|------|--------|
| `src/components/page-specific/imports-layout.tsx` | Nav reorder, rename, add Review badge |
| `src/app/imports/statements/page.tsx` | Add type filter tabs, "Go to Review" link |
| `src/app/imports/statements/[id]/page.tsx` | Add "Review in Queue" callout after processing |
| `src/app/imports/review/page.tsx` | Two-section layout, new stats bar, source pills |
| `src/components/page-specific/review-queue-filter-bar.tsx` | Primary/secondary filter layout |
| `src/components/page-specific/match-card.tsx` | Source provenance pill |
| `src/components/page-specific/statement-row.tsx` | Type badge/icon |
| `src/components/page-specific/statements-stats-bar.tsx` | Type breakdown |
| `src/components/page-specific/statement-transaction-list.tsx` | Bank statement debit/credit indicators |
| `src/components/page-specific/batch-approve-dialog.tsx` | Source breakdown display |
| `src/app/api/imports/queue/route.ts` | Add `paymentMethodType`, refactor to use builders |
| `src/app/api/imports/approve/route.ts` | Support scope-based batch approval |
| `src/hooks/use-statements.ts` | Accept type filter parameter |
| `database/schema.sql` | Reflect final schema state |
| `src/lib/supabase/types.ts` | Regenerated types |
| `src/app/imports/review/page.tsx` | Use `useCreateAndLink` hook |
| `src/app/imports/emails/page.tsx` | Use `useCreateAndLink` hook |
| `src/app/imports/emails/[id]/page.tsx` | Use `useCreateAndLink` hook |
| `src/app/imports/statements/[id]/page.tsx` | Use `useCreateAndLink` hook |

### Unchanged Files

| File | Reason |
|------|--------|
| `src/app/imports/emails/page.tsx` | Email hub is complete, no changes |
| `src/app/imports/emails/[id]/page.tsx` | Email detail is complete (except shared hook extraction) |
| `src/app/imports/ai-journal/page.tsx` | No changes needed |
