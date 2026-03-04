# Transaction Source References — Feature & UX Specification

**Project:** Joot Transaction Tracker
**Feature:** Source References section on transaction detail page
**Date:** 2026-03-04
**Version:** 1.0
**Status:** Specification — not yet implemented

---

## Table of Contents

1. [Overview](#1-overview)
2. [Design Context and Constraints](#2-design-context-and-constraints)
3. [States](#3-states)
4. [Component Specification](#4-component-specification)
5. [Data Requirements](#5-data-requirements)
6. [Schema Changes](#6-schema-changes)
7. [API Changes](#7-api-changes)
8. [Implementation Notes](#8-implementation-notes)

---

## 1. Overview

The transaction detail page (`/transactions/[id]`) currently shows what a transaction is — its amount, date, vendor, type, and tags. It does not show where the transaction came from. Transactions in Joot can originate from three sources: manual entry, an email receipt parsed from an iCloud email, or a line item extracted from an uploaded credit card statement PDF. A transaction can also be linked to both an email and a statement simultaneously, forming a cross-source match.

The Sources section adds a dedicated area at the bottom of the transaction detail page that surfaces this provenance data. When an email receipt or statement entry is linked to a transaction, the user can see the original source document — the email subject, sender, and extraction confidence for email sources, or the statement filename, period, and card for statement sources. This gives users a way to audit how the app identified and categorized their transactions and provides a direct path back to the source in the email hub.

---

## 2. Design Context and Constraints

### Page layout

The existing page (`src/app/transactions/[id]/page.tsx`) uses a white background with `pt-20 px-10` padding and `gap-6` between field rows. Fields are rendered using the inline `FieldValuePair` and `FieldTags` components defined in the same file. The Sources section follows this same compositional pattern — a new inline component, `TransactionSources`, added immediately after `FieldTags`.

The Sources section is the last content block on the page, placed below a thin horizontal divider that separates it from the fields above.

### Typography

- Section heading label: `font-medium text-[14px] text-zinc-950` — matches all other field labels
- Muted text (e.g., "Manually entered"): `font-normal text-[14px] text-zinc-500`
- Card primary text: `font-normal text-[14px] text-zinc-950`
- Card secondary text: `font-normal text-[14px] text-zinc-500` (same as `#71717b` used elsewhere)

### Status badge colors

These match the conventions established in the email hub:

| Match method | Badge variant | Colors |
|---|---|---|
| Auto-matched | Custom | `bg-green-100 text-green-700` |
| Manually linked | Custom | `bg-gray-100 text-gray-500` |
| Created from email | Custom | `bg-blue-100 text-blue-700` |

### Component library

- `Badge` from `@/components/ui/badge` (shadcn/ui) for match method labels
- `Mail`, `FileText` from `lucide-react` for source type icons
- No new third-party dependencies

### Mobile

Cards stack vertically and are full-width within the page's content area. No special breakpoint handling is needed beyond what the existing page already provides.

---

## 3. States

The Sources section always renders. What it renders depends on how many source links the transaction has.

### State 1: No sources (manual entry)

Displayed when both `source_email_transaction_id` and `source_statement_upload_id` are null.

```
Sources
Manually entered
```

- The label "Sources" renders as a standard field label.
- Below it, a single line of muted text: "Manually entered".
- No cards, no badges, no icons.
- This is the most common state for older transactions.

### State 2: Email source only

Displayed when `source_email_transaction_id` is set and `source_statement_upload_id` is null.

```
Sources
┌─────────────────────────────────────────────┐
│  [Mail icon]  Your Grab receipt             │
│               from@grabreceipts.com         │
│               Feb 14, 2026                  │
│               94% extraction confidence     │
│               [Auto-matched]                │
└─────────────────────────────────────────────┘
```

- One email source card.
- The card is tappable/clickable and navigates to `/imports/emails?id={email_transaction_id}`.

### State 3: Statement source only

Displayed when `source_statement_upload_id` is set and `source_email_transaction_id` is null.

```
Sources
┌─────────────────────────────────────────────┐
│  [FileText]   Chase_Jan2026.pdf             │
│               Jan 1 – Jan 31, 2026          │
│               Chase Sapphire                │
│               87% match confidence          │
│               [Auto-matched]                │
└─────────────────────────────────────────────┘
```

- One statement source card.
- The card is not clickable in this release (statement detail view is a future feature). The card is static but visually consistent with the email card.

### State 4: Both email and statement (cross-source match)

Displayed when both `source_email_transaction_id` and `source_statement_upload_id` are set.

```
Sources
┌─────────────────────────────────────────────┐
│  [Mail icon]  Your Grab receipt             │
│               from@grabreceipts.com         │
│               Feb 14, 2026                  │
│               94% extraction confidence     │
│               [Auto-matched]                │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  [FileText]   Chase_Jan2026.pdf             │
│               Jan 1 – Jan 31, 2026          │
│               Chase Sapphire                │
│               87% match confidence          │
│               [Auto-matched]                │
└─────────────────────────────────────────────┘
```

- Two cards stacked with `gap-3` between them.
- The email card renders first, the statement card second.
- A user seeing this state knows the transaction was cross-validated across two independent sources.

### Loading state

While source data is being fetched (alongside the main transaction fetch), the Sources section renders a skeleton placeholder to prevent layout shift:

```
Sources
[skeleton line ~60% width]
[skeleton line ~40% width]
```

Use `animate-pulse bg-zinc-100 rounded` skeleton blocks matching the approximate height of the "Manually entered" text line.

---

## 4. Component Specification

### `TransactionSources` component

Defined inline in `src/app/transactions/[id]/page.tsx`, following the existing pattern of `FieldValuePair` and `FieldTags`.

#### Props interface

```typescript
interface TransactionSourcesProps {
  emailSource: EmailSourceData | null
  statementSource: StatementSourceData | null
}

interface EmailSourceData {
  id: string
  subject: string | null
  from_address: string | null
  from_name: string | null
  email_date: string | null           // ISO timestamp
  extraction_confidence: number | null // 0–100
  match_confidence: number | null      // 0–100
  match_method: string | null          // 'auto' | 'manual'
  status: string                       // email_transactions.status value
}

interface StatementSourceData {
  id: string
  filename: string
  statement_period_start: string | null  // ISO date
  statement_period_end: string | null    // ISO date
  payment_method_name: string | null
  match_confidence: number | null        // 0–100, from extraction_log suggestion
  match_method: string | null            // 'auto' | 'manual'
}
```

#### Component structure

```tsx
function TransactionSources({ emailSource, statementSource }: TransactionSourcesProps) {
  const hasNoSources = !emailSource && !statementSource

  return (
    <div className="content-stretch flex flex-col gap-2 items-start justify-start relative shrink-0 w-full">
      {/* Section divider */}
      <div className="w-full border-t border-zinc-200 mb-2" />

      {/* Section heading */}
      <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-zinc-950">
        <p className="leading-[20px] whitespace-pre">Sources</p>
      </div>

      {/* Content */}
      {hasNoSources ? (
        <div className="flex flex-col font-normal justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-zinc-500">
          <p className="leading-[20px] whitespace-pre">Manually entered</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          {emailSource && <EmailSourceCard source={emailSource} />}
          {statementSource && <StatementSourceCard source={statementSource} />}
        </div>
      )}
    </div>
  )
}
```

### `EmailSourceCard` sub-component

```tsx
function EmailSourceCard({ source }: { source: EmailSourceData }) {
  const handleClick = () => {
    window.location.href = `/imports/emails?id=${source.id}`
  }

  return (
    <button
      onClick={handleClick}
      className="bg-zinc-50 rounded-lg border border-zinc-200 p-4 w-full text-left hover:bg-zinc-100 transition-colors"
    >
      <div className="flex items-start gap-3">
        <Mail className="size-4 text-zinc-400 mt-0.5 shrink-0" strokeWidth={1.5} />
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-[14px] font-normal text-zinc-950 truncate">
            {source.subject || "No subject"}
          </p>
          {source.from_address && (
            <p className="text-[14px] font-normal text-zinc-500 truncate">
              {source.from_name ? `${source.from_name} <${source.from_address}>` : source.from_address}
            </p>
          )}
          {source.email_date && (
            <p className="text-[14px] font-normal text-zinc-500">
              {format(parseISO(source.email_date), "MMM d, yyyy")}
            </p>
          )}
          {source.extraction_confidence !== null && (
            <p className="text-[14px] font-normal text-zinc-500">
              {source.extraction_confidence}% extraction confidence
            </p>
          )}
          <div className="mt-1">
            <MatchMethodBadge method={source.match_method} status={source.status} />
          </div>
        </div>
      </div>
    </button>
  )
}
```

### `StatementSourceCard` sub-component

```tsx
function StatementSourceCard({ source }: { source: StatementSourceData }) {
  const periodLabel = formatStatementPeriod(
    source.statement_period_start,
    source.statement_period_end
  )

  return (
    <div className="bg-zinc-50 rounded-lg border border-zinc-200 p-4 w-full">
      <div className="flex items-start gap-3">
        <FileText className="size-4 text-zinc-400 mt-0.5 shrink-0" strokeWidth={1.5} />
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-[14px] font-normal text-zinc-950 truncate">
            {source.filename}
          </p>
          {periodLabel && (
            <p className="text-[14px] font-normal text-zinc-500">{periodLabel}</p>
          )}
          {source.payment_method_name && (
            <p className="text-[14px] font-normal text-zinc-500">
              {source.payment_method_name}
            </p>
          )}
          {source.match_confidence !== null && (
            <p className="text-[14px] font-normal text-zinc-500">
              {source.match_confidence}% match confidence
            </p>
          )}
          <div className="mt-1">
            <MatchMethodBadge method={source.match_method} status={null} />
          </div>
        </div>
      </div>
    </div>
  )
}
```

### `MatchMethodBadge` sub-component

Derives the display label from `match_method` and, for email sources, `status`.

```tsx
function MatchMethodBadge({
  method,
  status
}: {
  method: string | null
  status: string | null
}) {
  if (status === "imported") {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-0 text-[12px] font-normal">
        Created from email
      </Badge>
    )
  }
  if (method === "auto") {
    return (
      <Badge className="bg-green-100 text-green-700 border-0 text-[12px] font-normal">
        Auto-matched
      </Badge>
    )
  }
  if (method === "manual") {
    return (
      <Badge className="bg-gray-100 text-gray-500 border-0 text-[12px] font-normal">
        Manually linked
      </Badge>
    )
  }
  return null
}
```

**Badge label derivation rules:**

1. If `status === 'imported'` → "Created from email" (blue). This means the transaction was created directly from the email, not matched to an existing one.
2. If `match_method === 'auto'` → "Auto-matched" (green).
3. If `match_method === 'manual'` → "Manually linked" (gray).
4. If neither → render nothing.

### `formatStatementPeriod` helper

```typescript
function formatStatementPeriod(start: string | null, end: string | null): string | null {
  if (!start && !end) return null
  if (start && end) {
    const s = format(parseISO(start), "MMM d")
    const e = format(parseISO(end), "MMM d, yyyy")
    return `${s} – ${e}`
  }
  if (start) return `From ${format(parseISO(start), "MMM d, yyyy")}`
  if (end) return `Through ${format(parseISO(end), "MMM d, yyyy")}`
  return null
}
```

---

## 5. Data Requirements

### Fields required from `email_transactions`

| Field | Used for |
|---|---|
| `id` | Navigation link URL |
| `subject` | Card primary line |
| `from_address` | Card secondary line |
| `from_name` | Card secondary line (combined with from_address) |
| `email_date` | Card date line |
| `extraction_confidence` | "X% extraction confidence" line |
| `match_confidence` | Available but not currently displayed in card (reserve for future detail view) |
| `match_method` | Badge label derivation |
| `status` | Badge label derivation ("imported" case) |

### Fields required from `statement_uploads`

| Field | Used for |
|---|---|
| `id` | Future navigation link |
| `filename` | Card primary line |
| `statement_period_start` | Period label |
| `statement_period_end` | Period label |
| `payment_method_id` (joined to `payment_methods.name`) | Card secondary line |

### Statement suggestion confidence

The `match_confidence` for a statement source is stored inside `statement_uploads.extraction_log` as a JSONB field. The specific suggestion is identified by `transactions.source_statement_suggestion_index` (the index into `extraction_log.suggestions[]`).

The expected JSONB structure is:

```json
{
  "suggestions": [
    {
      "matched_transaction_id": "uuid",
      "confidence": 87,
      "amount": 45.50,
      "date": "2026-01-14",
      "description": "GRAB *TRIP"
    }
  ]
}
```

Server-side extraction: `extraction_log->'suggestions'->source_statement_suggestion_index->>'confidence'`

**Design decision:** To avoid a second client-side fetch to read JSONB, denormalize the confidence value at link/approve time by storing it in a new column `transactions.source_statement_match_confidence INTEGER`. This is set once when the statement suggestion is approved and never needs to change. See Schema Changes below.

---

## 6. Schema Changes

### New columns on `transactions`

#### `source_statement_upload_id`

Links the transaction to the statement upload it was sourced from.

```sql
ALTER TABLE public.transactions
  ADD COLUMN source_statement_upload_id UUID
  REFERENCES public.statement_uploads(id)
  ON DELETE SET NULL;
```

#### `source_statement_suggestion_index`

The zero-based index into `statement_uploads.extraction_log->'suggestions'` identifying which suggestion was approved. Used if raw access to the suggestion JSON is ever needed server-side.

```sql
ALTER TABLE public.transactions
  ADD COLUMN source_statement_suggestion_index INTEGER;
```

#### `source_statement_match_confidence`

Denormalized copy of the suggestion's confidence score, populated at link time. Avoids JSONB traversal on every detail page load.

```sql
ALTER TABLE public.transactions
  ADD COLUMN source_statement_match_confidence INTEGER
  CHECK (
    source_statement_match_confidence IS NULL
    OR (source_statement_match_confidence >= 0 AND source_statement_match_confidence <= 100)
  );
```

### New index

```sql
CREATE INDEX idx_transactions_source_statement
  ON public.transactions(source_statement_upload_id)
  WHERE source_statement_upload_id IS NOT NULL;
```

### `source_email_transaction_id` — population requirement

The column `transactions.source_email_transaction_id` already exists in the schema with its FK and index (`idx_transactions_source_email`). It is never populated in the current codebase. The approve/import flows in the email hub must be updated to set this column when a transaction is created from or matched to an email.

Locations to update (code changes outside this spec's scope but required for this feature to work):

- Email "Import as new transaction" flow — set `source_email_transaction_id` on the newly created transaction.
- Email "Match to existing transaction" flow — set `source_email_transaction_id` on the matched transaction.

### Migration file

Create with: `./database/new-migration.sh add_statement_source_columns_to_transactions`

```sql
-- Migration: add_statement_source_columns_to_transactions

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source_statement_upload_id UUID
    REFERENCES public.statement_uploads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_statement_suggestion_index INTEGER,
  ADD COLUMN IF NOT EXISTS source_statement_match_confidence INTEGER
    CHECK (
      source_statement_match_confidence IS NULL
      OR (source_statement_match_confidence >= 0 AND source_statement_match_confidence <= 100)
    );

CREATE INDEX IF NOT EXISTS idx_transactions_source_statement
  ON public.transactions(source_statement_upload_id)
  WHERE source_statement_upload_id IS NOT NULL;
```

### `schema.sql` update

After running the migration, add the three new columns to the `transactions` table definition in `database/schema.sql` and add the new index alongside `idx_transactions_source_email`.

Regenerate types after applying:

```bash
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

---

## 7. API Changes

### Approach: expand `getTransactionById` in `use-transactions.ts`

The transaction detail page already fetches via `getTransactionById` in the `useTransactions` hook. The simplest and most consistent approach is to extend this query to join the two source tables in a single Supabase call, keeping all data loading in one place and avoiding a second network round-trip.

### Updated Supabase select string

In `src/hooks/use-transactions.ts`, update `getTransactionById` to include the following additional join paths:

```typescript
const { data, error: fetchError } = await supabase
  .from("transactions")
  .select(`
    *,
    vendors!transactions_vendor_id_fkey (
      id,
      name
    ),
    payment_methods!transactions_payment_method_id_fkey (
      id,
      name
    ),
    transaction_tags!transaction_tags_transaction_id_fkey (
      tag_id,
      tags!transaction_tags_tag_id_fkey (
        id,
        name,
        color
      )
    ),
    email_transactions!transactions_source_email_transaction_id_fkey (
      id,
      subject,
      from_address,
      from_name,
      email_date,
      extraction_confidence,
      match_confidence,
      match_method,
      status
    ),
    statement_uploads!transactions_source_statement_upload_id_fkey (
      id,
      filename,
      statement_period_start,
      statement_period_end,
      payment_methods!statement_uploads_payment_method_id_fkey (
        name
      )
    )
  `)
  .eq("user_id", user.id)
  .eq("id", id)
  .single()
```

### Updated transform in `getTransactionById`

Extend the transformation block to extract source references:

```typescript
const transformed = {
  ...data,
  vendor: (data as any).vendors,
  payment_method: (data as any).payment_methods,
  tags: (data as any).transaction_tags?.map((tt: any) => tt.tags).filter(Boolean) || [],
  emailSource: (data as any).email_transactions ?? null,
  statementSource: (() => {
    const su = (data as any).statement_uploads
    if (!su) return null
    return {
      ...su,
      payment_method_name: su.payment_methods?.name ?? null,
      match_confidence: (data as any).source_statement_match_confidence ?? null,
      match_method: (data as any).source_statement_match_method ?? null,
    }
  })()
}
```

Note: `source_statement_match_method` is not a separate column in the schema above. The statement match method can be inferred from context (all statement matches are currently auto). Add `source_statement_match_method TEXT CHECK (source_statement_match_method IN ('auto', 'manual'))` to the migration if explicit tracking is needed. Default to `'auto'` for the initial implementation.

### Type additions

Add to `src/lib/supabase/types.ts` (or a co-located types file once regenerated):

```typescript
export interface EmailSourceData {
  id: string
  subject: string | null
  from_address: string | null
  from_name: string | null
  email_date: string | null
  extraction_confidence: number | null
  match_confidence: number | null
  match_method: string | null
  status: string
}

export interface StatementSourceData {
  id: string
  filename: string
  statement_period_start: string | null
  statement_period_end: string | null
  payment_method_name: string | null
  match_confidence: number | null
  match_method: string | null
}
```

Extend `TransactionWithVendorAndPayment` to include:

```typescript
emailSource?: EmailSourceData | null
statementSource?: StatementSourceData | null
```

### RLS consideration

The joined `email_transactions` table has its own RLS policy (`Users can view own email transactions`). Supabase respects RLS on joined tables when using the anon/user client. Since the user owns both the transaction and any linked email transaction (same `user_id`), the join will return data without issue.

The same applies to `statement_uploads`.

---

## 8. Implementation Notes

### File changes summary

| File | Change |
|---|---|
| `src/app/transactions/[id]/page.tsx` | Add `TransactionSources`, `EmailSourceCard`, `StatementSourceCard`, `MatchMethodBadge`, `formatStatementPeriod` inline components; render after `FieldTags`; pass `emailSource` and `statementSource` from transaction data |
| `src/hooks/use-transactions.ts` | Extend `getTransactionById` select query and transform to include source joins |
| `src/lib/supabase/types.ts` | Add `EmailSourceData`, `StatementSourceData` interfaces; extend `TransactionWithVendorAndPayment` |
| `database/schema.sql` | Add three new columns and new index to transactions table |
| `database/migrations/{timestamp}_add_statement_source_columns_to_transactions.sql` | Migration file for new columns and index |

### Populating `source_email_transaction_id` (existing column, never set)

This is a pre-condition for the email source card to appear. Without it, no email source will ever display even after the UI is built. The following flows need updates as a separate task:

- `POST /api/emails/transactions/[id]/approve` (or equivalent import action) — when creating a new transaction from an email, set `source_email_transaction_id = email_transaction.id` on the new transaction row.
- Email match confirmation flow — when the user confirms an auto-match or manually links an email to a transaction, update `transactions.source_email_transaction_id`.

### Statement source confidence storage

When a statement suggestion is approved (matched to a transaction), the approving code should write `source_statement_match_confidence` from `extraction_log.suggestions[index].confidence` at that moment. This avoids needing to re-parse JSONB on every detail page load.

### The divider

The horizontal rule between Tags and Sources uses `border-t border-zinc-200`. It is rendered inside the `TransactionSources` component, not as a standalone element in the page, so the component is self-contained.

### Existing page structure — where to insert

In `src/app/transactions/[id]/page.tsx`, the current render order inside the inner `flex flex-col gap-6` container is:

1. Type
2. Date
3. Description
4. Vendor
5. Payment method
6. Amount + Exchange rate (side by side)
7. Tags (`FieldTags`)
8. — insert `TransactionSources` here —

The spacer `<div className="h-10 shrink-0 w-full" />` at the end of the outer container should remain as the final element for bottom padding.

### No-op for old transactions

Transactions created before this feature ships will have all three source columns null. They will correctly display "Manually entered" without any code branching needed — the state logic already handles the null case.

### Future: statement detail navigation

The statement source card is currently non-interactive (no `onClick`) because there is no statement detail page. When a statement detail view is built, the card becomes a button navigating to `/imports/statements/{source_statement_upload_id}`. The card component is already structured to support this change — only the wrapper element needs to change from `div` to `button` and an `onClick` handler added.
