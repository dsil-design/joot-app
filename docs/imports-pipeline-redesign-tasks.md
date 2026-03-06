# Imports Pipeline Redesign — Implementation Tasks

**Spec:** `docs/imports-pipeline-redesign-spec.md`
**Created:** 2026-03-06

## Task Dependency Graph

```
Task 1 (navigation) ────────────────────────────────────────────────────────┐
Task 2 (migration) ──┬──→ Task 5 (statements type filter) ──→ Task 7 (review page redesign)
                      ├──→ Task 6 (statement detail callout)               │
                      └──→ Task 8 (queue API refactor) ──→ Task 7          │
Task 3 (useCreateAndLink) ──→ Task 7                                       │
Task 4 (statement bank support) ── (depends on Task 2)                     │
Task 9 (batch approve enhancement) ── (depends on Task 7, Task 8)          │
Task 10 (review filter bar) ── (depends on Task 7)                         │
```

Independent starting points: Tasks 1, 2, and 3 can all begin in parallel.

---

## Task 1: Navigation restructure

**Status:** Not started
**Blocked by:** Nothing
**Effort:** Small

**What:**
- Rename "Coverage" to "Overview" in the navigation items array
- Reorder nav items: Overview, Emails, Statements, Review, AI Journal
- Add a pending-count badge to the Review nav item, fetched from `/api/imports/status-counts`

**Implementation details:**
- Update the `navigationItems` array in `imports-layout.tsx`
- For the badge: fetch pending review count client-side (lightweight `useSWR` or `useEffect`) and render a small numeric badge on the Review nav item when count > 0
- The status-counts API may already return this — check and expose `pendingReviewCount` if not already present

**Files:**
- `src/components/page-specific/imports-layout.tsx` — nav items array, badge rendering
- `src/app/api/imports/status-counts/route.ts` — verify/add `pendingReviewCount` field

**Acceptance criteria:**
- [ ] Nav reads: Overview | Emails | Statements | Review | AI Journal
- [ ] Review nav item shows a numeric badge when pending items > 0
- [ ] Active state highlighting still works correctly for all routes
- [ ] Mobile horizontal tab nav also reflects the new order

---

## Task 2: Add `type` column to `payment_methods`

**Status:** Not started
**Blocked by:** Nothing
**Effort:** Small

**What:**
- Create a new migration adding `type TEXT NOT NULL DEFAULT 'credit_card'` with a CHECK constraint to `payment_methods`
- Allowed values: `credit_card`, `bank_account`, `debit_card`, `other`
- Update `database/schema.sql` to reflect final state
- Regenerate TypeScript types

**Implementation details:**
```sql
ALTER TABLE public.payment_methods
  ADD COLUMN type TEXT NOT NULL DEFAULT 'credit_card'
  CHECK (type IN ('credit_card', 'bank_account', 'debit_card', 'other'));
```

All existing payment methods default to `credit_card`. The user can update specific payment methods to `bank_account` via settings or a one-time data fix.

**Files:**
- `database/migrations/XXXXXX_add_payment_method_type.sql` (create via `./database/new-migration.sh add_payment_method_type`)
- `database/schema.sql` — update to reflect column
- `src/lib/supabase/types.ts` — regenerate

**Acceptance criteria:**
- [ ] Migration runs cleanly on existing data
- [ ] All existing payment methods have `type = 'credit_card'`
- [ ] TypeScript types include the new `type` field
- [ ] schema.sql is up to date

---

## Task 3: Extract `useCreateAndLink` shared hook

**Status:** Not started
**Blocked by:** Nothing
**Effort:** Small

**What:**
- Extract the duplicated `handleCreateConfirm` pattern into a shared hook
- Replace the 4 duplicate implementations with calls to the shared hook

**Implementation details:**

Create `src/hooks/use-create-and-link.ts`:

```typescript
import { useTransactions } from '@/hooks'
import { toast } from 'sonner'

interface CreateTransactionInput {
  description: string
  amount: number
  currency: string
  date: string
  vendorId?: string
  paymentMethodId?: string
  tagIds?: string[]
  transactionType: string
}

export function useCreateAndLink(
  linkFn: (compositeId: string, transactionId: string) => Promise<void>
) {
  const { createTransaction } = useTransactions()

  const createAndLink = async (
    compositeId: string,
    data: CreateTransactionInput
  ) => {
    const result = await createTransaction({
      description: data.description,
      amount: data.amount,
      originalCurrency: data.currency as 'USD' | 'THB',
      transactionDate: data.date,
      transactionType: data.transactionType as 'expense' | 'income',
      vendorId: data.vendorId,
      paymentMethodId: data.paymentMethodId,
      tagIds: data.tagIds,
    })

    if (!result) throw new Error('Failed to create transaction')
    await linkFn(compositeId, result.id)
    toast.success('Transaction created and linked')
    return result
  }

  return { createAndLink }
}
```

Then replace the duplicate `handleCreateConfirm` in each file with:

```typescript
const { createAndLink } = useCreateAndLink(linkToExisting) // or linkToTransaction
const handleCreateConfirm = createAndLink
```

**Files:**
- `src/hooks/use-create-and-link.ts` — new shared hook
- `src/app/imports/review/page.tsx` — replace duplicate
- `src/app/imports/emails/page.tsx` — replace duplicate
- `src/app/imports/emails/[id]/page.tsx` — replace duplicate
- `src/app/imports/statements/[id]/page.tsx` — replace duplicate

**Acceptance criteria:**
- [ ] All 4 pages use the shared hook
- [ ] Create-and-link functionality works identically in all contexts
- [ ] No duplicated `createTransaction` + `linkToExisting/linkToTransaction` pattern remains

---

## Task 4: Statement transaction list — bank statement support

**Status:** Not started
**Blocked by:** Task 2
**Effort:** Medium

**What:**
- Add `transaction_type` rendering to `StatementTransactionList` for bank statements
- Show debit/credit/transfer direction indicators when `transaction_type` is present in suggestion data
- Add a type-specific icon to `StatementRow` (credit card icon vs bank building icon)
- Transfers should be visually distinct (e.g., muted styling, transfer icon)

**Implementation details:**
- In `StatementTransactionList`, check if the statement's payment method type is `bank_account`
- If so, render a direction indicator column: arrow-down-left for credits/transfer_in, arrow-up-right for debits/transfer_out
- Transfers get a muted/dashed styling to indicate they may not be actionable expenses
- In `StatementRow`, add a small icon before the payment method name based on type

**Files:**
- `src/components/page-specific/statement-transaction-list.tsx` — direction indicators
- `src/components/page-specific/statement-row.tsx` — type icon badge
- `src/components/page-specific/statement-detail-header.tsx` — optional type label

**Acceptance criteria:**
- [ ] Bank statement transactions show debit/credit direction indicators
- [ ] Transfers are visually distinct from regular debits/credits
- [ ] Credit card statements render unchanged (no direction column)
- [ ] Statement row shows appropriate icon per payment method type

---

## Task 5: Statements list page — type filter tabs

**Status:** Not started
**Blocked by:** Task 2
**Effort:** Medium

**What:**
- Add a tab strip to the top of the Statements list page: **All | Credit Cards | Bank Accounts**
- Filter the grouped list by `payment_methods.type`
- Add a "Go to Review" link in the stats bar when there are pending items

**Implementation details:**
- Add a `type` filter parameter to the `useStatements` hook (or filter client-side from the already-loaded data)
- Render tab buttons above the statement groups
- The tab state can be local (no URL param needed, but `?type=bank_account` is nice to have)
- Add a link in `StatementsStatsBar`: "N items awaiting review →" that links to `/imports/review?source=statement`
- Update `StatementsStatsBar` to show breakdown by type when both types exist

**Files:**
- `src/app/imports/statements/page.tsx` — tab strip, filter logic
- `src/hooks/use-statements.ts` — accept `type` filter parameter
- `src/components/page-specific/statements-stats-bar.tsx` — type breakdown, review link

**Acceptance criteria:**
- [ ] Tab strip shows All / Credit Cards / Bank Accounts
- [ ] Filtering works correctly, only showing matching statements
- [ ] Stats bar shows "N items awaiting review →" link when applicable
- [ ] When only one type exists, tabs still render but the empty type shows 0 count

---

## Task 6: Statement detail page — "Review in Queue" callout

**Status:** Not started
**Blocked by:** Task 2
**Effort:** Small

**What:**
- After statement processing completes and items are in the queue, show a callout at the top of the completed state
- The callout has two paths: "Review N items in queue →" and "Stay here to inspect individually"

**Implementation details:**
- In the completed state of `StatementDetailPage`, add a callout card above the tabs
- "Review in queue" links to `/imports/review?statementUploadId=<id>`
- "Stay here" dismisses the callout (local state)
- The count comes from `summary.total_extracted` (or more precisely, the count of pending suggestions)

**Callout UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  14 transactions extracted.                                 │
│  [Review 14 items in queue →]   [Inspect individually]      │
└─────────────────────────────────────────────────────────────┘
```

**Files:**
- `src/app/imports/statements/[id]/page.tsx` — callout component in completed state

**Acceptance criteria:**
- [ ] Callout appears after processing completes
- [ ] "Review in queue" navigates to review page filtered by this statement
- [ ] "Inspect individually" dismisses the callout
- [ ] Callout doesn't appear when there are 0 pending items

---

## Task 7: Review page redesign — layout and stats

**Status:** Not started
**Blocked by:** Tasks 3, 8 (partially — can start layout work before API refactor completes)
**Effort:** Large

**What:**
- Replace the stat cards with user-facing labels
- Split the match card list into two sections: Proposed Matches and New Transactions
- Add source provenance pills to MatchCard headers
- Wire up the `useCreateAndLink` hook

**Implementation details:**

### 7a. Stats bar replacement

Replace 4 stat cards:
| Old | New |
|-----|-----|
| Total | Pending Review (status = pending) |
| Pending | Ready to Approve (pending + confidence >= 90) |
| High Confidence | This Week (transaction date in last 7 days) |
| Needs Review | Resolved (approved + rejected) |

Make each stat card clickable → sets corresponding filter. Mirror the `EmailHubStatsBar` interaction pattern.

### 7b. Two-section layout

Split `items` into two arrays based on `isNew`:
- `matchItems = items.filter(i => !i.isNew)` — Proposed Matches
- `newItems = items.filter(i => i.isNew)` — New Transactions

Render both sections with headers showing counts. The "Approve All High Confidence" button only appears in the matches section. A new "Import All Ready" button appears in the new transactions section for fully-extracted, unambiguous items.

### 7c. Source provenance pills

Add a pill component to `MatchCard` (or `MatchCardHeader`):
- `source: 'email'` → violet pill, Mail icon, "Email Receipt"
- `source: 'statement'` → slate pill, FileText icon, payment method name
- `source: 'merged'` → blue pill, GitMerge icon, "Cross-Source"

### 7d. Use shared hook

Replace `handleCreateConfirm` with `useCreateAndLink(linkToExisting)`.

**Files:**
- `src/app/imports/review/page.tsx` — layout restructure, stats, shared hook
- `src/components/page-specific/match-card.tsx` — source provenance pill

**Acceptance criteria:**
- [ ] Stats bar shows user-facing labels with clickable filtering
- [ ] Match list is split into "Proposed Matches" and "New Transactions" sections
- [ ] Each MatchCard shows a source provenance pill
- [ ] Both sections respect the same filter bar
- [ ] "Approve All High Confidence" only operates on the matches section
- [ ] Shared `useCreateAndLink` hook is used

---

## Task 8: Queue API refactor — modular builders

**Status:** Not started
**Blocked by:** Task 2
**Effort:** Large

**What:**
- Extract the 662-line `/api/imports/queue/route.ts` into modular builder functions
- Add `paymentMethodType` to the queue item response
- Add a `thisWeekCount` stat to the response for the new stats bar

**Implementation details:**

Create three modules:

```
src/lib/imports/statement-queue-builder.ts
  - fetchStatementQueueItems(userId, filters) → QueueItem[]
  - Extracts the statement-fetching logic from the queue API

src/lib/imports/email-queue-builder.ts
  - fetchEmailQueueItems(userId, filters) → QueueItem[]
  - Extracts the email-fetching logic from the queue API

src/lib/imports/queue-aggregator.ts
  - aggregateQueueItems(statementItems, emailItems, filters) → { items, stats, hasMore, total }
  - Handles cross-source pairing, filtering, sorting, pagination
```

The API route becomes a thin orchestrator:

```typescript
export async function GET(request: Request) {
  const filters = parseFilters(request)
  const statementItems = await fetchStatementQueueItems(userId, filters)
  const emailItems = await fetchEmailQueueItems(userId, filters)
  const result = aggregateQueueItems(statementItems, emailItems, filters)
  return NextResponse.json(result)
}
```

Add `paymentMethodType` to each queue item by joining `payment_methods.type` in the statement builder.

Add `thisWeekCount` to the stats response: count of items with transaction date in the last 7 days.

Add `resolvedCount` to stats: count of approved + rejected items.

**Files:**
- `src/lib/imports/statement-queue-builder.ts` — new
- `src/lib/imports/email-queue-builder.ts` — new
- `src/lib/imports/queue-aggregator.ts` — new
- `src/app/api/imports/queue/route.ts` — simplified orchestrator

**Acceptance criteria:**
- [ ] Queue API returns identical data to the current implementation
- [ ] `paymentMethodType` is included in each queue item
- [ ] `thisWeekCount` and `resolvedCount` are included in stats
- [ ] The API route file is under 100 lines
- [ ] Each builder module is independently testable

---

## Task 9: Batch approve enhancement

**Status:** Not started
**Blocked by:** Tasks 7, 8
**Effort:** Medium

**What:**
- Extend batch approve to show source breakdown in the dialog
- Support scope-based batch approval (all high-confidence pending, not just loaded page)

**Implementation details:**

### 9a. Source breakdown in dialog

Update `BatchApproveDialog` to accept and display source breakdown:
```typescript
interface BatchApproveProps {
  // existing...
  sourceBreakdown?: { email: number; statement: number; merged: number }
}
```

Render: "8 from statements, 3 from emails, 1 cross-source"

### 9b. Scope-based API

Extend `POST /api/imports/approve` to accept:
```typescript
// Existing
{ ids: string[] }

// New option
{ scope: 'high-confidence-pending', minConfidence?: number }
```

When `scope` is provided, the API finds all qualifying items server-side and approves them, returning the count and list of approved IDs.

### 9c. Wire up in Review page

The "Approve All High Confidence" button should:
1. Fetch the count of qualifying items (may exceed loaded page)
2. Show the `BatchApproveDialog` with source breakdown
3. On confirm, call the scope-based API
4. Refresh the list

**Files:**
- `src/components/page-specific/batch-approve-dialog.tsx` — source breakdown display
- `src/app/api/imports/approve/route.ts` — scope-based approval
- `src/app/imports/review/page.tsx` — wire up scope-based flow

**Acceptance criteria:**
- [ ] Batch approve dialog shows source breakdown
- [ ] Scope-based approval works for all qualifying items across all pages
- [ ] The count shown in the button matches the actual count of qualifying items
- [ ] After batch approve, the list refreshes correctly

---

## Task 10: Review filter bar reorganization

**Status:** Not started
**Blocked by:** Task 7
**Effort:** Medium

**What:**
- Reorganize the filter bar into primary (always visible) and secondary (collapsible) rows
- Promote source filter to a button group
- Add payment method type filter

**Implementation details:**

### Primary row (always visible):
- Search input (flex-1, takes remaining space)
- Source button group: All | Email | Statement | Cross-Source (pill buttons, not a select dropdown)
- Date range picker

### Secondary row (collapsed by default):
- "More Filters" toggle button
- Status dropdown
- Currency dropdown
- Confidence dropdown
- Statement picker dropdown
- Payment method type dropdown (All / Credit Card / Bank Account)

The "More Filters" toggle shows/hides the secondary row. If any secondary filter is active, show a dot indicator on the toggle button.

**Files:**
- `src/components/page-specific/review-queue-filter-bar.tsx` — layout restructure
- `src/app/imports/review/page.tsx` — update filter state to include payment method type

**Acceptance criteria:**
- [ ] Primary filters (search, source, date range) are always visible
- [ ] Secondary filters are behind a collapsible "More Filters" toggle
- [ ] Source filter is a button group, not a select
- [ ] Active secondary filters show a dot indicator on the toggle
- [ ] Payment method type filter works correctly
- [ ] All filters are preserved in URL parameters for shareable links

---

## Implementation Order (Recommended)

### Phase 1: Foundation (can be done in parallel)
- **Task 1** — Navigation restructure
- **Task 2** — Payment method type migration
- **Task 3** — Extract `useCreateAndLink` hook

### Phase 2: Statements enhancements (after Phase 1)
- **Task 4** — Bank statement transaction rendering
- **Task 5** — Statements type filter tabs
- **Task 6** — Statement detail "Review in Queue" callout

### Phase 3: Review page (after Phases 1-2)
- **Task 8** — Queue API refactor into modular builders
- **Task 7** — Review page layout and stats redesign
- **Task 10** — Review filter bar reorganization

### Phase 4: Polish (after Phase 3)
- **Task 9** — Batch approve enhancement
