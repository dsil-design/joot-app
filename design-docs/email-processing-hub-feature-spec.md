# Email Processing Hub — Feature Specification

**Project:** Joot Transaction Tracker
**Feature:** Email Processing Hub (`/imports/emails`)
**Date:** 2026-03-02
**Version:** 1.0
**Status:** Draft — Awaiting Review

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Information Architecture](#information-architecture)
4. [UX Specification](#ux-specification)
5. [Frontend Technical Specification](#frontend-technical-specification)
6. [Backend Specification](#backend-specification)
7. [Database Changes](#database-changes)
8. [Implementation Plan](#implementation-plan)
9. [File Manifest](#file-manifest)

---

## 1. Executive Summary

The Email Processing Hub adds a third tab to the existing `/imports` section, providing an **email-centric view** of the transaction pipeline. While the Coverage Dashboard is statement-centric and the Review Queue is action-centric, this hub answers: "What happened with my emails?"

It surfaces extraction results, match suggestions, confidence scores, and status progression — giving the user full visibility into how receipt emails flow through the system and connect to statements and transactions.

### What Already Exists (Backend)

- iCloud IMAP sync with incremental fetching and cron integration
- 5 email parsers (Grab, Bolt, Lazada, Bangkok Bank, Kasikorn) with confidence scoring
- `email_transactions` table with full status state machine
- Matching algorithm: amount (40pts), date (30pts), vendor (30pts) = 0-100 composite score
- Cross-currency converter (THB<>USD) using historical exchange rates
- Cross-source pairer for merging THB email receipts with USD statement charges
- API routes for sync, listing emails, and listing email transactions
- Review queue that aggregates both statement and email items

### What's Missing (The Gap)

- No email-centric dashboard view
- No way to see extraction results and confidence at a glance
- No side-by-side email vs. transaction/statement comparison
- No "waiting for statement" tracking
- No email-specific actions outside the unified review queue
- No stats or funnel visualization for the email pipeline

---

## 2. Problem Statement

Users receive transaction receipts via email (Grab rides, Lazada orders, bank transfers). The app syncs and parses these emails, but there's no dedicated view to:

1. **Audit the pipeline** — How many emails were synced? How many were successfully extracted? What's the confidence distribution?
2. **Triage from the email's perspective** — "I got 47 emails this month. What happened with each one?"
3. **Understand waiting states** — Which emails are waiting for a statement charge to appear?
4. **Compare and match** — See extracted email data side-by-side with potential transaction matches
5. **Take targeted action** — Link an email to a statement charge, create a new transaction, or skip

---

## 3. Information Architecture

### Navigation

```
/imports
├── Coverage    (/imports)         — existing, statement-centric
├── Review      (/imports/review)  — existing, action-centric, mixed sources
└── Emails      (/imports/emails)  — NEW, email-centric pipeline view
```

### Page Relationships

| Surface | Purpose | Primary Data Source |
|---|---|---|
| Coverage Dashboard | Statement upload status per payment method per month | `statement_uploads` |
| Review Queue | Decision-making on pending items from all sources | `email_transactions` + `statement_uploads.extraction_log` |
| **Email Hub** | **Email pipeline visibility, triage, and match exploration** | **`email_transactions`** |

The Email Hub filtered to `status=pending_review` overlaps with the Review Queue filtered to `source=email`. They serve different mental models: the Email Hub is for understanding the pipeline; the Review Queue is for making decisions across all sources.

### Cross-Linking

- Coverage stats bar `emailsPendingReview` count links to `/imports/emails?status=pending_review`
- Email Hub "Review" action on a card navigates to `/imports/review` with the email pre-selected
- `/settings/emails` remains the raw sync configuration page (not merged)

---

## 4. UX Specification

> Full detailed UX spec with wireframes: [`design-docs/email-processing-hub-ux-spec.md`](./email-processing-hub-ux-spec.md)

### Design Decisions

1. **Third tab within /imports** — `ImportsLayout` already provides auth, responsive structure, sidebar nav, and mobile tab pills. Adding a nav item is one object in `navigationItems`.

2. **Compact data table with expandable detail** — The Email Hub serves a scanning mode (150+ emails). A dense list fits that mode. Users who want the card-based decision experience go to Review Queue.

3. **Batch operations are secondary** — The Review Queue already handles batch approval. The Email Hub's primary purpose is visibility and triage. Batch select surfaces as a sticky toolbar when items are checked.

4. **"Waiting for Statement" surfaces as a callout + filter preset** — Not a separate sub-page. A dismissible blue alert shows when waiting items exist, with a one-click filter.

### Page Layout (Desktop)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  IMPORTS                                                           [Joot nav]│
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌────────────────────────────────────────────────────────┐│
│  │ Coverage      │  │  HEADER: "Email Receipts"  [Last sync: 3m ago] [Sync]││
│  │ Review        │  │                                                       ││
│  │ Emails (act.) │  │  STATS ROW                                            ││
│  └──────────────┘  │  [12 Pending] [3 Waiting] [47 Matched] [8 Imported]   ││
│                     │                                                       ││
│                     │  FUNNEL BAR                                            ││
│                     │  Synced 156 → Parsed 148 → Extracted 127 →            ││
│                     │  Matched 47 → Imported 8                              ││
│                     │                                                       ││
│                     │  [! 3 waiting for Bangkok Bank · ฿2,540]  [View →][×] ││
│                     │                                                       ││
│                     │  FILTER BAR                                            ││
│                     │  [Status▾] [Type▾] [Confidence▾] [Date▾] [🔍 Search] ││
│                     │                                                       ││
│                     │  TABLE                                                 ││
│                     │  ┌──┬──────────────┬──────┬──────┬────────┬─────┐     ││
│                     │  │☐ │ Vendor/Subj  │ Amt  │ Date │ Parser │ St  │     ││
│                     │  ├──┼──────────────┼──────┼──────┼────────┼─────┤     ││
│                     │  │☐ │ GrabFood     │ ฿340 │Feb15 │[grab]  │[⚠ ] │     ││
│                     │  │☐ │ Lazada       │ ฿299 │Feb14 │[lazada]│[✓ ] │     ││
│                     │  ├──┴──────────────┴──────┴──────┴────────┴─────┤     ││
│                     │  │  EXPANDED ROW                                │     ││
│                     │  │  ┌─ Email Data ──────┐ ┌─ Match ──────────┐ │     ││
│                     │  │  │ Vendor: Lazada     │ │ Score: 87/100    │ │     ││
│                     │  │  │ Amount: ฿299       │ │ [MEDIUM]         │ │     ││
│                     │  │  │ Date: Feb 14       │ │ Amt: exact match │ │     ││
│                     │  │  │ Order: #LZ-123456  │ │ Date: same day   │ │     ││
│                     │  │  └────────────────────┘ │ Vendor: 94% sim  │ │     ││
│                     │  │                         │ [Link] [New] [Skip]│     ││
│                     │  │                         └────────────────────┘     ││
│                     │  └──────────────────────────────────────────────┘     ││
│                     └────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

### Status Color System

| Status | Color | Badge |
|---|---|---|
| `pending_review` | Amber | `bg-amber-100 text-amber-700` |
| `waiting_for_statement` | Blue | `bg-blue-100 text-blue-700` |
| `matched` | Green | `bg-green-100 text-green-700` |
| `ready_to_import` | Purple | `bg-purple-100 text-purple-700` |
| `imported` | Green (muted) | `bg-green-50 text-green-600` |
| `skipped` | Gray | `bg-gray-100 text-gray-500` |

Parser tags: Grab=orange, Bolt=green, Lazada=blue, Bangkok Bank=teal, Kasikorn=purple, Unknown=red.

### Key User Flows

**Flow 1: Daily Processing Review**
User checks what arrived overnight. Clicks pending count from Coverage stats bar, lands on Email Hub filtered to `pending_review`, scans the table, expands rows to see match details, approves or skips individually.

**Flow 2: Waiting for Statement Resolution**
User uploads a new Bangkok Bank statement. Returns to Email Hub, sees the "Waiting for Statement" callout updated with remaining count. Newly matched items moved to `matched` status automatically.

**Flow 3: Extraction Audit**
User filters to `confidence=low`, sees all "unknown" items are from an unrecognized sender. Bulk-skips the unknowns.

**Flow 4: Create Transaction from Email**
User finds a high-confidence email with no matching transaction. Expands the row, clicks "Create as new transaction", opens `CreateFromImportDialog` pre-filled with extracted data.

### Mobile Adaptations

- Stats row wraps to 2x2 grid
- Funnel bar hidden, replaced by stats grid
- Filter bar shows two selects + "More" bottom sheet
- Table renders as two-line summary cards
- Detail panel stacks vertically (email data above match data)
- Batch toolbar fixed to bottom with safe-area padding

---

## 5. Frontend Technical Specification

### Route Structure

```
src/app/imports/emails/
├── page.tsx            # EmailHubPage ("use client")
└── [id]/page.tsx       # Mobile full-page detail (wraps EmailDetailSheet)
```

### URL State Schema

```
/imports/emails
  ?status=pending_review|matched|waiting_for_statement|ready_to_import|imported|skipped|all
  &classification=receipt|order_confirmation|bank_transfer|bill_payment|unknown|all
  &currency=USD|THB|all
  &confidence=high|medium|low|all
  &search=<string>
  &from=<ISO date>
  &to=<ISO date>
```

### Component Tree

```
EmailHubPage
├── EmailHubHeader
│   ├── <h2> "Email Receipts"
│   ├── SyncStatusPill (compact last-sync + count)
│   └── SyncNowButton (wraps useEmailSync)
│
├── EmailHubStatsBar (4 stat cards in grid)
│
├── EmailHubFunnelBar (CSS flex pipeline: Synced→Parsed→Extracted→Matched→Imported)
│
├── WaitingForStatementCallout (dismissible blue alert, conditional)
│
├── EmailHubFilterBar (status, classification, currency, confidence, date, search)
│
├── EmailTransactionList (wraps useInfiniteScroll)
│   ├── EmailTransactionCard[] (compact card with expandable detail)
│   │   ├── ClassificationBadge + StatusBadge
│   │   ├── Vendor, amount, date summary
│   │   ├── ConfidenceBadge
│   │   └── Action buttons (Review, Skip, Link)
│   └── LoadMoreTrigger (reuse existing)
│
└── EmailDetailSheet (shadcn Sheet, opens on card click)
    ├── EmailDetailHeader
    ├── EmailDetailAmounts
    ├── EmailDetailMatchPanel (confidence breakdown)
    ├── EmailDetailRawEmail (collapsible)
    └── EmailDetailActions
```

### Data Fetching Strategy

Follow the existing pattern: plain `fetch` inside custom hooks wrapping `useInfiniteScroll`. No SWR or React Query.

```typescript
// src/hooks/use-email-transactions.ts
export function useEmailTransactions(filters: EmailHubFilters) {
  return useInfiniteScroll<EmailTransactionItem>({
    fetchFn: async (page, limit) => {
      const params = buildEmailParams(filters, page, limit)
      const res = await fetch(`/api/emails/transactions?${params}`)
      const data = await res.json()
      return { items: data.emails, hasMore: data.hasMore, total: data.total }
    },
    limit: 25,
    deps: [filters.status, filters.classification, filters.currency,
           filters.confidence, filters.search,
           filters.dateRange?.from?.getTime(), filters.dateRange?.to?.getTime()],
    keyExtractor: (item) => item.id,
  })
}
```

Stats are a separate lightweight fetch — simple `useEffect` + `useState`, refreshed after sync or action.

### Reuse vs New

| Component | Status | Notes |
|---|---|---|
| `LoadMoreTrigger` | Reuse | From `use-infinite-scroll.tsx` |
| `DateRangePicker` | Reuse | From `ui/date-range-picker.tsx` |
| `Badge` | Reuse | From `ui/badge.tsx` |
| `ConfidenceBadge` / `ConfidenceIndicator` | Reuse | From existing ui components |
| `useEmailSync` | Reuse | No changes needed |
| `useInfiniteScroll` | Reuse | No changes needed |
| `useMatchActions` | Extend | Add `emailSkip` action |
| `Sheet`, `Accordion`, `Skeleton` | Reuse | shadcn ui |
| `StatCard` | Extract | Currently inline in `review/page.tsx`, extract to `ui/stat-card.tsx` |
| `formatLastSynced` | Extract | From `email-sync-card.tsx` to `lib/utils/format-sync-time.ts` |

### New Hooks

| Hook | File | Purpose |
|---|---|---|
| `useEmailTransactions` | `src/hooks/use-email-transactions.ts` | Paginated list fetch |
| `useEmailHubFilters` | `src/hooks/use-email-hub-filters.ts` | URL-synced filter state |
| `useEmailHubStats` | `src/hooks/use-email-hub-stats.ts` | Stats fetch + refresh |
| `useEmailHubActions` | `src/hooks/use-email-hub-actions.ts` | Skip/approve with optimistic updates |

### Performance

- Page size: 25 items, infinite scroll
- Detail sheet content lazy-loaded on open (`dynamic(() => import(...), { ssr: false })`)
- Stats poll every 60s when tab is visible (optional)
- Raw email body truncated server-side at 5000 chars
- Skeleton: 5 placeholder cards on initial load, `min-h-[120px]` to prevent layout shift

---

## 6. Backend Specification

### New API Endpoints

#### `GET /api/emails/stats`

Aggregated counts for the dashboard. One query replaces the five-query `Promise.all` pattern.

**Query params:** `period` (7d|30d|90d|ytd), `currency` (optional filter)

**Response:**
```json
{
  "status_counts": {
    "pending_review": 12,
    "waiting_for_statement": 5,
    "ready_to_import": 3,
    "matched": 48,
    "imported": 201,
    "skipped": 7
  },
  "classification_counts": {
    "receipt": 94,
    "order_confirmation": 61,
    "bank_transfer": 28,
    "bill_payment": 14,
    "unknown": 79
  },
  "confidence_buckets": {
    "high": 38, "medium": 22, "low": 14, "unscored": 202
  },
  "monthly_trend": [
    { "month": "2026-01", "received": 89, "extracted": 74, "matched": 31, "imported": 28 }
  ],
  "sync": {
    "last_synced_at": "2026-03-02T08:14:00Z",
    "total_synced_emails": 847
  }
}
```

#### `GET /api/emails/transactions/:id/matches`

On-demand match suggestions for a single email transaction. Called when the detail sheet opens.

**Query params:** `limit` (max 10), `includeStatements` (bool), `dateWindowDays` (default 7)

**Response:**
```json
{
  "email_transaction": { "id": "...", "amount": 350, "currency": "THB", "vendor_name_raw": "Grab" },
  "suggestions": [
    {
      "source": "transaction",
      "transaction_id": "uuid",
      "score": 87,
      "confidence": "MEDIUM",
      "amount": 350, "currency": "THB",
      "vendor_name": "Grab",
      "score_breakdown": {
        "amount": { "score": 40, "reason": "Exact match" },
        "date": { "score": 30, "reason": "Same day" },
        "vendor": { "score": 17, "reason": "Fuzzy match 57%" }
      }
    }
  ],
  "stats": { "candidates_evaluated": 22, "matching_candidates": 2 }
}
```

#### `GET /api/emails/transactions/:id`

Single email transaction with full detail including raw email body and matched transaction info.

#### `POST /api/emails/transactions/:id/skip`

Mark a single email transaction as skipped. Returns `{ success: true, id, status: "skipped" }`.

#### `POST /api/emails/transactions/bulk`

Batch operations: `skip`, `mark_pending`, `re_extract`. Max 50 IDs per request.

#### `POST /api/emails/transactions/:id/re-extract`

Re-run extraction pipeline on a previously parsed email. Fetches raw body from IMAP, re-classifies, re-scores.

#### Extended: `GET /api/emails/transactions`

Add `classification` and `confidence` (high|medium|low) filter params. Add `sort` param (email_date_desc, amount_desc, confidence_desc). Add `includeMatches=true` option to embed top match per row.

### Waiting-for-Statement Auto-Resolution

Not a user-facing endpoint. A function called from `statement-processor.ts` after a statement completes processing:

```typescript
// src/lib/email/waiting-resolver.ts
export async function resolveWaitingEmailTransactions(
  userId: string,
  statementPeriodStart: string,
  statementPeriodEnd: string,
  supabase: SupabaseClient
): Promise<{ resolved: number; stillWaiting: number }>
```

**Algorithm:**
1. Fetch `email_transactions` in `waiting_for_statement` status within the statement period
2. Run cross-source pairing against the new statement's suggestions
3. Auto-match pairs found (set `status=matched`, `match_method=auto`)
4. Log to `import_activities` with `activity_type: 'auto_resolved_waiting'`

### Auto-Matching on Sync

In `extraction-service.ts`, after extraction with `extraction_confidence >= 80`, immediately run candidate fetch + `rankMatches`. If `canAutoApprove` returns true (score >= 90, single clear winner), set `status=matched`, `match_method=auto`.

### Status Transition Model

```
email synced → extraction
                  │
     ┌────────────┼──────────────────┐
     ▼            ▼                  ▼
  pending     waiting_for       (extraction
  _review     _statement         failed → pending_review)
     │            │
     │    ┌───────┴──── statement uploaded
     │    │             & auto-resolved
     │    ▼
     │  matched ←── user links manually
     │    │
     │    ▼
     │  imported ←── user creates/approves transaction
     │
     ├──→ matched ──→ imported
     ├──→ ready_to_import ──→ imported
     └──→ skipped

skipped/matched ──→ pending_review (user reopens)
imported = terminal (immutable)
```

---

## 7. Database Changes

### New Indexes

```sql
-- Composite index for match candidate queries
CREATE INDEX idx_transactions_user_date_composite
  ON public.transactions(user_id, transaction_date DESC);

-- Partial index for waiting email resolution
CREATE INDEX idx_email_transactions_waiting
  ON public.email_transactions(user_id, transaction_date)
  WHERE status = 'waiting_for_statement';

-- Index for dashboard stats aggregation
CREATE INDEX idx_email_transactions_stats
  ON public.email_transactions(user_id, status, classification, email_date DESC);

-- Index supporting the monthly trend query
CREATE INDEX idx_email_transactions_email_date
  ON public.email_transactions(user_id, email_date DESC);
```

### New Column: Reverse FK on Transactions

```sql
ALTER TABLE public.transactions
  ADD COLUMN source_email_transaction_id UUID
  REFERENCES public.email_transactions(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_source_email
  ON public.transactions(source_email_transaction_id)
  WHERE source_email_transaction_id IS NOT NULL;
```

This enables the candidate query to exclude already-matched transactions and is populated when a transaction is created via the approve flow.

### Optional: Stats View

```sql
CREATE OR REPLACE VIEW email_transaction_stats AS
SELECT
  user_id, status, classification,
  TO_CHAR(email_date, 'YYYY-MM') AS month,
  CASE
    WHEN extraction_confidence >= 90 THEN 'high'
    WHEN extraction_confidence >= 55 THEN 'medium'
    WHEN extraction_confidence > 0   THEN 'low'
    ELSE 'unscored'
  END AS confidence_bucket,
  currency, COUNT(*) AS cnt
FROM public.email_transactions
GROUP BY user_id, status, classification, month, confidence_bucket, currency;
```

---

## 8. Implementation Plan

### Phase 1: Foundation (Email Hub Page + Stats)

1. Add "Emails" nav item to `imports-layout.tsx`
2. Create `/imports/emails/page.tsx` with basic structure
3. Build `GET /api/emails/stats` endpoint
4. Build `EmailHubStatsBar` and `EmailHubHeader` components
5. Extract `StatCard` from review page to `ui/stat-card.tsx`
6. Build `EmailHubFilterBar` with URL-synced state
7. Build `useEmailTransactions` hook
8. Build `EmailTransactionCard` component (compact list view)
9. Wire up infinite scroll list

### Phase 2: Detail & Matching

10. Build `GET /api/emails/transactions/:id` endpoint
11. Build `GET /api/emails/transactions/:id/matches` endpoint
12. Build `EmailDetailSheet` with match comparison panel
13. Add `classification` and `confidence` filters to existing transactions endpoint
14. Build score breakdown visualization in detail panel
15. Wire up cross-currency conversion display

### Phase 3: Actions & Resolution

16. Build `POST /api/emails/transactions/:id/skip` endpoint
17. Build `POST /api/emails/transactions/bulk` endpoint
18. Build `useEmailHubActions` hook with optimistic updates
19. Implement `WaitingForStatementCallout` component
20. Build `resolveWaitingEmailTransactions` function
21. Wire auto-resolution into statement processing pipeline
22. Add activity logging for all new actions

### Phase 4: Polish

23. Build `EmailHubFunnelBar` (CSS pipeline visualization)
24. Add mobile detail page (`/imports/emails/[id]/page.tsx`)
25. Mobile-optimize all components
26. Batch select + sticky toolbar
27. Empty states and error handling
28. Optional: 60s stats polling when tab is visible
29. Run database migration for new indexes and column

---

## 9. File Manifest

### New Files

```
# Pages
src/app/imports/emails/page.tsx                          # Email Hub main page
src/app/imports/emails/[id]/page.tsx                     # Mobile detail page

# Components
src/components/page-specific/email-transaction-card.tsx   # List item card
src/components/page-specific/email-hub-filter-bar.tsx     # Filter controls
src/components/page-specific/email-hub-stats-bar.tsx      # Stats row
src/components/page-specific/email-hub-funnel-bar.tsx     # Pipeline visualization
src/components/page-specific/email-detail-sheet.tsx       # Detail drawer
src/components/page-specific/sync-status-pill.tsx         # Compact sync indicator
src/components/page-specific/waiting-callout.tsx          # Waiting alert
src/components/ui/stat-card.tsx                           # Extracted from review page

# Hooks
src/hooks/use-email-transactions.ts                       # Paginated list fetch
src/hooks/use-email-hub-filters.ts                        # URL-synced filters
src/hooks/use-email-hub-stats.ts                          # Stats fetch
src/hooks/use-email-hub-actions.ts                        # Actions + optimistic updates

# Utils
src/lib/utils/format-sync-time.ts                         # Extracted from email-sync-card

# API Routes
src/app/api/emails/stats/route.ts                         # Dashboard stats
src/app/api/emails/transactions/[id]/route.ts             # Single detail
src/app/api/emails/transactions/[id]/matches/route.ts     # Match suggestions
src/app/api/emails/transactions/[id]/skip/route.ts        # Skip action
src/app/api/emails/transactions/[id]/re-extract/route.ts  # Re-extraction
src/app/api/emails/transactions/bulk/route.ts             # Batch operations

# Backend Logic
src/lib/email/waiting-resolver.ts                         # Auto-resolution logic

# Database
database/supabase/migrations/<timestamp>_email_hub_indexes.sql
database/supabase/migrations/<timestamp>_add_source_email_transaction_id.sql
```

### Modified Files

```
src/components/page-specific/imports-layout.tsx            # Add "Emails" nav item
src/app/api/emails/transactions/route.ts                   # Add classification, confidence, sort params
src/app/api/statements/[id]/process/route.ts               # Add waiting-resolution hook
src/app/imports/review/page.tsx                             # Extract inline StatCard
src/components/page-specific/email-sync-card.tsx            # Extract formatLastSynced
src/components/page-specific/coverage-stats-bar.tsx         # Email pending count becomes link
```

---

## Related Documents

- [Email Processing Hub UX Spec](./email-processing-hub-ux-spec.md) — Detailed wireframes, component specs, interaction patterns, accessibility, edge cases
- [Email Transaction Linking System](./email-transaction-linking-system.md) — Original system design
- [Email Transaction Implementation Roadmap](./email-transaction-implementation-roadmap.md) — Original phased plan
- [Email Transaction Wireframes](./email-transaction-wireframes.md) — Original wireframes for the broader email-linking feature
