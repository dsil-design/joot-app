# Phase 1: Foundation — Task Breakdown

**Feature:** Email-to-Transaction Linking System
**Phase:** 1 of 4 — Foundation
**Status:** `draft`
**Created:** 2025-01-02
**Target Duration:** 2 weeks

---

## Steering & Inputs

| Input | Path | Intent |
|-------|------|--------|
| Main Spec | `design-docs/email-transaction-linking-system.md` | Complete feature specification |
| Wireframes | `design-docs/email-transaction-wireframes.md` | UI layouts and interactions |
| Roadmap | `design-docs/email-transaction-implementation-roadmap.md` | 8-week implementation plan |
| Project Standards | `CLAUDE.md` | Codebase conventions and patterns |
| AI Skill Guide | `.claude/skills/email-linking/SKILL.md` | Code patterns and architecture |

**Key Constraints:**
- Next.js 15 (App Router, Turbopack)
- Supabase (PostgreSQL + RLS + Storage)
- shadcn/ui + Tailwind CSS
- TypeScript strict mode
- Existing cron job at 18:00 UTC for email sync integration

**Design Decisions Applied:**
- Top-level "Imports" navigation
- Never auto-approve (always require confirmation)
- Files kept forever (no auto-delete)
- ±2% exchange rate tolerance using `exchange_rates` table

---

## AI Implementation Guide

### Recommended Agents by Task Group

| Group | Agent | Why |
|-------|-------|-----|
| Database (P1-001 to P1-005) | `database-admin` | Schema design, RLS policies |
| Navigation (P1-006 to P1-008) | `frontend-developer` | React components, routing |
| Email (P1-010 to P1-018) | `typescript-pro` | Service architecture, parsing |
| UI (P1-009, P1-019 to P1-023) | `frontend-developer` | React components |
| API (P1-024 to P1-025) | `backend-architect` | API design |
| Testing (P1-026 to P1-027) | `test-automator` | Test suites |

### Critical Codebase Patterns

**Migration File Naming:**
```
database/migrations/YYYYMMDDHHMMSS_description.sql
Example: 20250111120000_create_email_transactions.sql
```

**UUID Generation:**
```sql
-- Use gen_random_uuid() NOT uuid_generate_v4()
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

**RLS Policy Pattern:**
```sql
-- Use (select auth.uid()) for performance
CREATE POLICY "policy_name" ON table_name
  FOR SELECT USING ((select auth.uid()) = user_id);
```

**Service File Location:**
```
src/lib/services/     -- For backend services
src/lib/email/        -- NEW: For email extraction
src/lib/email/extractors/  -- NEW: Individual parsers
```

**Existing Email Sync Service:**
```
src/lib/services/email-sync-service.ts  -- Extend this, don't replace
src/lib/services/email-types.ts         -- Existing type definitions
```

---

## How to Use This Task List

1. Tasks are numbered `P1-001`, `P1-002`, etc. (P1 = Phase 1)
2. Execute tasks individually or in dependency order
3. Each task contains Acceptance Criteria and Verification steps
4. Parallelizable tasks are marked with `parallel: true`
5. While in `draft`, tasks may be refined. After `approved`, IDs are immutable
6. AI will update status as work progresses

---

## Task Index

| Status | ID | Title | Group | Depends | Blocks |
|--------|-----|-------|-------|---------|--------|
| [x] | P1-001 | Create `email_transactions` table migration | Database | — | P1-004, P1-005 |
| [x] | P1-002 | Create `statement_uploads` table migration | Database | — | P1-004 |
| [x] | P1-003 | Create `import_activities` table migration | Database | — | P1-004 |
| [x] | P1-004 | Add RLS policies for new tables | Database | P1-001, P1-002, P1-003 | P1-005 |
| [x] | P1-005 | Generate TypeScript types for new tables | Database | P1-004 | P1-010 |
| [x] | P1-006 | Add "Imports" to sidebar navigation | Navigation | — | P1-007 |
| [x] | P1-007 | Add "Imports" to mobile navigation | Navigation | P1-006 | P1-008 |
| [x] | P1-008 | Create `/imports` route structure | Navigation | P1-007 | P1-009 |
| [x] | P1-009 | Create Import Dashboard page skeleton | UI | P1-008 | P1-015 |
| [x] | P1-010 | Create email transaction extraction service | Email | P1-005 | P1-011 |
| [x] | P1-011 | Build Grab email parser | Email | P1-010 | P1-016 |
| [x] | P1-012 | Build Bolt email parser | Email | P1-010 | P1-016 |
| [x] | P1-013 | Build Bangkok Bank email parser | Email | P1-010 | P1-016 |
| [x] | P1-014 | Build Kasikorn Bank email parser | Email | P1-010 | P1-016 |
| [x] | P1-015 | Build Lazada email parser | Email | P1-010 | P1-016 |
| [x] | P1-016 | Integrate parsers into email sync service | Email | P1-011–P1-015 | P1-017 |
| [x] | P1-017 | Add extraction confidence scoring | Email | P1-016 | P1-018 |
| [ ] | P1-018 | Implement email classification logic | Email | P1-017 | — |
| [ ] | P1-019 | Create `ImportStatusCard` component | UI | P1-009 | P1-020 |
| [ ] | P1-020 | Create Dashboard status cards section | UI | P1-019 | P1-021 |
| [ ] | P1-021 | Create Email Sync card component | UI | P1-020 | P1-022 |
| [ ] | P1-022 | Create Quick Actions grid | UI | P1-021 | P1-023 |
| [ ] | P1-023 | Create Recent Activity feed component | UI | P1-022 | — |
| [ ] | P1-024 | Create API route: POST /api/emails/sync | API | P1-018 | P1-021 |
| [ ] | P1-025 | Create API route: GET /api/emails/transactions | API | P1-018 | P1-023 |
| [ ] | P1-026 | Write unit tests for email parsers | Testing | P1-011–P1-015 | — |
| [ ] | P1-027 | Write integration tests for email sync | Testing | P1-024 | — |

---

## Tasks (Detailed Sections)

<!--P1-001-->
### P1-001 — Create `email_transactions` table migration

**Status:** done
**Group:** Database
**Depends on:** —  |  **Blocks:** P1-004, P1-005  |  **parallel:** true

**Description:**
Create the database migration for the `email_transactions` table that stores parsed email data, links to matched transactions, and tracks confidence/status.

**Acceptance Criteria (EARS):**
- The migration SHALL create a table with all columns from spec (id, user_id, message_id, uid, folder, subject, from_address, from_name, email_date, seen, has_attachments, vendor_id, vendor_name_raw, amount, currency, transaction_date, description, order_id, matched_transaction_id, match_confidence, match_method, status, classification, extraction_confidence, extraction_notes, synced_at, processed_at, matched_at, created_at, updated_at)
- WHEN the migration runs THEN all indexes are created (user_id, status, matched_transaction_id, date, folder, synced_at, full-text search)
- The table SHALL have foreign key constraints to users, vendors, and transactions tables
- The table SHALL have CHECK constraints for valid status and classification values

**Deliverables:**
- `database/migrations/YYYYMMDDHHMMSS_create_email_transactions.sql`
- Updated `database/schema.sql` with table definition

**Verification:**
- Unit: Migration runs without errors on clean database
- Integration: Table accepts valid inserts, rejects invalid status/classification
- Rollback: Migration can be reversed cleanly

**AI Context — Implementation Template:**

```sql
-- File: database/migrations/20250111000001_create_email_transactions.sql

-- Email transactions table - stores parsed email data with match info
CREATE TABLE public.email_transactions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User ownership (for RLS)
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Email metadata (from IMAP sync)
  message_id TEXT NOT NULL,
  uid INTEGER NOT NULL,
  folder TEXT NOT NULL DEFAULT 'Transactions',
  subject TEXT,
  from_address TEXT,
  from_name TEXT,
  email_date TIMESTAMPTZ,
  seen BOOLEAN DEFAULT FALSE,
  has_attachments BOOLEAN DEFAULT FALSE,

  -- Extracted transaction data
  vendor_id UUID REFERENCES public.vendors(id),
  vendor_name_raw TEXT,  -- Original vendor text from email
  amount DECIMAL(12, 2),
  currency TEXT,  -- 'USD', 'THB', etc.
  transaction_date DATE,
  description TEXT,
  order_id TEXT,  -- Order/transaction ID from email

  -- Match information
  matched_transaction_id UUID REFERENCES public.transactions(id),
  match_confidence INTEGER CHECK (match_confidence >= 0 AND match_confidence <= 100),
  match_method TEXT CHECK (match_method IN ('auto', 'manual', NULL)),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review',      -- Needs user review
    'matched',             -- Linked to existing transaction
    'waiting_for_statement', -- THB receipt waiting for USD charge
    'ready_to_import',     -- Can create new transaction
    'imported',            -- Transaction created
    'skipped'              -- User marked as non-transaction
  )),

  -- Classification
  classification TEXT CHECK (classification IN (
    'receipt',             -- Payment confirmation
    'order_confirmation',  -- Order placed, payment pending
    'bank_transfer',       -- Direct bank transfer
    'bill_payment',        -- Bill payment notification
    'unknown'              -- Could not classify
  )),

  -- Extraction metadata
  extraction_confidence INTEGER CHECK (extraction_confidence >= 0 AND extraction_confidence <= 100),
  extraction_notes TEXT,

  -- Timestamps
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for deduplication
  UNIQUE(user_id, message_id)
);

-- Indexes for common queries
CREATE INDEX idx_email_trans_user_status ON public.email_transactions(user_id, status);
CREATE INDEX idx_email_trans_user_date ON public.email_transactions(user_id, email_date DESC);
CREATE INDEX idx_email_trans_matched ON public.email_transactions(matched_transaction_id) WHERE matched_transaction_id IS NOT NULL;
CREATE INDEX idx_email_trans_folder ON public.email_transactions(user_id, folder);
CREATE INDEX idx_email_trans_synced ON public.email_transactions(synced_at DESC);
CREATE INDEX idx_email_trans_pending ON public.email_transactions(user_id, match_confidence DESC) WHERE status = 'pending_review';

-- Full-text search on subject and description
CREATE INDEX idx_email_trans_search ON public.email_transactions
  USING gin(to_tsvector('english', COALESCE(subject, '') || ' ' || COALESCE(description, '')));

-- Enable RLS (policies added in P1-004)
ALTER TABLE public.email_transactions ENABLE ROW LEVEL SECURITY;
```

**Reference Files:**
- `database/schema.sql` lines 1-200 for existing patterns
- `src/lib/services/email-sync-service.ts` for existing email metadata structure

**Notes & Open Questions:**
- Use `gen_random_uuid()` instead of `uuid_generate_v4()` per Supabase best practices
- After creating migration, also update `database/schema.sql` to match

**Completion Log:**
- started: 2026-01-11T12:00:00Z · by: claude
- done: 2026-01-11T12:15:00Z · by: claude · notes: Created migration with all columns, indexes (user_status, user_date, matched, folder, synced, pending, full-text search), RLS policies (CRUD), and updated_at trigger. Also updated database/schema.sql.

---

<!--P1-002-->
### P1-002 — Create `statement_uploads` table migration

**Status:** done
**Group:** Database
**Depends on:** —  |  **Blocks:** P1-004  |  **parallel:** true

**Description:**
Create the database migration for the `statement_uploads` table that stores metadata for uploaded statement files and processing results.

**Acceptance Criteria (EARS):**
- The migration SHALL create a table with columns: id, user_id, filename, file_path, file_size, file_type, payment_method_id, statement_period_start, statement_period_end, status, transactions_extracted, transactions_matched, transactions_new, extraction_started_at, extraction_completed_at, extraction_error, extraction_log, uploaded_at, created_at, updated_at
- WHEN the migration runs THEN indexes are created (user_id, payment_method_id, uploaded_at, status)
- The table SHALL have CHECK constraint for valid status values (pending, processing, completed, failed)

**Deliverables:**
- `database/migrations/YYYYMMDDHHMMSS_create_statement_uploads.sql`
- Updated `database/schema.sql`

**Verification:**
- Unit: Migration runs without errors
- Integration: Table accepts valid inserts with file metadata

**Notes & Open Questions:** _(empty)_

**Completion Log:**
- started: 2026-01-11T12:30:00Z · by: claude
- done: 2026-01-11T12:35:00Z · by: claude · notes: Created migration with all columns (file metadata, statement metadata, processing status/results, timestamps), indexes (user_id, payment_method_id, uploaded_at, status, compound user_status_date), RLS policies (CRUD), and updated_at trigger. Also updated database/schema.sql.

---

<!--P1-003-->
### P1-003 — Create `import_activities` table migration

**Status:** done
**Group:** Database
**Depends on:** —  |  **Blocks:** P1-004  |  **parallel:** true

**Description:**
Create the database migration for the `import_activities` table that provides an audit trail of all import actions.

**Acceptance Criteria (EARS):**
- The migration SHALL create a table with columns: id, user_id, activity_type, statement_upload_id, description, transactions_affected, total_amount, currency, metadata, created_at
- WHEN the migration runs THEN indexes are created (user_id, activity_type, created_at)
- The table SHALL have CHECK constraint for valid activity_type values

**Deliverables:**
- `database/migrations/YYYYMMDDHHMMSS_create_import_activities.sql`
- Updated `database/schema.sql`

**Verification:**
- Unit: Migration runs without errors
- Integration: Activity records can be inserted and queried

**Notes & Open Questions:** _(empty)_

**Completion Log:**
- started: 2026-01-11T13:00:00Z · by: claude
- done: 2026-01-11T13:10:00Z · by: claude · notes: Created migration with all columns (activity_type with 10 valid types, statement_upload_id, email_transaction_id, description, transactions_affected, total_amount, currency, metadata JSONB), indexes (user_id, type, created_at, user_created compound, errors partial), RLS policies (SELECT, INSERT, DELETE - no UPDATE since activities are immutable). Also updated database/schema.sql.

---

<!--P1-004-->
### P1-004 — Add RLS policies for new tables

**Status:** done
**Group:** Database
**Depends on:** P1-001, P1-002, P1-003  |  **Blocks:** P1-005  |  **parallel:** false

**Description:**
Enable Row Level Security and create policies for all three new tables, ensuring users can only access their own data.

**Acceptance Criteria (EARS):**
- WHEN RLS is enabled THEN users can only SELECT/INSERT/UPDATE/DELETE their own records
- The policies SHALL match the pattern used for existing tables (transactions, vendors, etc.)
- Service role SHALL have full access for API routes

**Deliverables:**
- RLS policies added to migration files or separate policy migration
- Documentation of policy rules

**Verification:**
- Integration: Test that user A cannot see user B's data
- Integration: Test that service role can access all data

**Notes & Open Questions:** _(empty)_

**Completion Log:**
- started: 2026-01-11T16:00:00Z · by: claude
- done: 2026-01-11T16:15:00Z · by: claude · notes: RLS policies were already included in P1-001, P1-002, P1-003 migrations. All three tables have: RLS enabled via `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`; SELECT/INSERT/UPDATE/DELETE policies using `(select auth.uid()) = user_id` pattern (except import_activities which is immutable - no UPDATE). Verified policies match existing project patterns in schema.sql. Service role has implicit full access per Supabase defaults.

---

<!--P1-005-->
### P1-005 — Generate TypeScript types for new tables

**Status:** done
**Group:** Database
**Depends on:** P1-004  |  **Blocks:** P1-010  |  **parallel:** false

**Description:**
Regenerate Supabase TypeScript types to include the new tables and update any type definitions.

**Acceptance Criteria (EARS):**
- WHEN types are generated THEN `src/lib/supabase/types.ts` includes EmailTransaction, StatementUpload, ImportActivity types
- The types SHALL be properly exported and usable throughout the codebase

**Deliverables:**
- Updated `src/lib/supabase/types.ts`
- Optional: Create convenience type aliases in `src/lib/types/` if needed

**Verification:**
- TypeScript compilation passes with no errors
- Types are correctly inferred in IDE

**Notes & Open Questions:**
- Run: `npx supabase gen types typescript --linked > src/lib/supabase/types.ts`

**Completion Log:**
- started: 2026-01-11T18:00:00Z · by: claude
- done: 2026-01-11T18:15:00Z · by: claude · notes: Regenerated Supabase types including email_transactions, statement_uploads, import_activities. Added convenience type aliases (EmailTransaction, StatementUpload, ImportActivity with Insert/Update variants) to types.ts. Also created src/lib/types/email-imports.ts with status/classification enums matching database CHECK constraints. TypeScript compilation passes.

---

<!--P1-006-->
### P1-006 — Add "Imports" to sidebar navigation

**Status:** done
**Group:** Navigation
**Depends on:** —  |  **Blocks:** P1-007  |  **parallel:** true

**Description:**
Add the "Imports" navigation item to the desktop sidebar, positioned between "All Transactions" and "Settings".

**Acceptance Criteria (EARS):**
- The sidebar SHALL display "Imports" with a 📥 icon (or appropriate Lucide icon)
- WHEN on any `/imports/*` route THEN the Imports nav item is highlighted as active
- The link SHALL navigate to `/imports`

**Deliverables:**
- Updated sidebar navigation component

**Verification:**
- Visual: Nav item appears in correct position
- Functional: Clicking navigates to /imports
- Active state displays correctly

**Notes & Open Questions:**
- Check existing sidebar component location

**Completion Log:**
- started: 2026-01-11T14:00:00Z · by: claude
- done: 2026-01-11T14:10:00Z · by: claude · notes: Added "Imports" navigation item to `src/components/page-specific/sidebar-navigation.tsx` using the Lucide `Import` icon. Positioned after "All Transactions" in navigationItems array. Active state highlighting works via existing `isActive()` function that checks `pathname?.startsWith(href)`. ESLint and build pass.

---

<!--P1-007-->
### P1-007 — Add "Imports" to mobile navigation

**Status:** done
**Group:** Navigation
**Depends on:** P1-006  |  **Blocks:** P1-008  |  **parallel:** false

**Description:**
Add the "Imports" tab to the mobile/tablet top navigation bar.

**Acceptance Criteria (EARS):**
- The mobile nav SHALL display "Imports" tab between "Transactions" and "Settings"
- WHEN on any `/imports/*` route THEN the tab is highlighted
- Touch target SHALL be at least 44x44px

**Deliverables:**
- Updated mobile navigation component

**Verification:**
- Visual: Tab appears on mobile viewport
- Functional: Tap navigates correctly
- A11y: Touch target size is adequate

**Notes & Open Questions:** _(empty)_

**Completion Log:**
- started: 2026-01-11T19:00:00Z · by: claude
- done: 2026-01-11T19:15:00Z · by: claude · notes: Added "Imports" navigation item to `src/components/page-specific/main-navigation.tsx` using the Lucide `Import` icon. Positioned between "Transactions" and "Settings" in navigationItems array. Added `pathname?.startsWith('/imports')` check for active state highlighting on subroutes. Updated touch target sizing with `min-h-[44px] min-w-[44px]`, increased vertical padding to py-3, and added `justify-center sm:justify-start` for proper icon centering on mobile. Build passes.

---

<!--P1-008-->
### P1-008 — Create `/imports` route structure

**Status:** done
**Group:** Navigation
**Depends on:** P1-007  |  **Blocks:** P1-009  |  **parallel:** false

**Description:**
Create the Next.js App Router folder structure for all import-related pages.

**Acceptance Criteria (EARS):**
- The route structure SHALL include:
  - `/imports` (dashboard)
  - `/imports/review` (review queue)
  - `/imports/statements` (upload)
  - `/imports/history` (activity log)
- Each route SHALL have a basic page.tsx with placeholder content
- Routes SHALL be protected by authentication

**Deliverables:**
- `src/app/imports/page.tsx`
- `src/app/imports/review/page.tsx`
- `src/app/imports/statements/page.tsx`
- `src/app/imports/history/page.tsx`
- `src/app/imports/layout.tsx` (if needed for shared layout)

**Verification:**
- Navigation: All routes accessible and render
- Auth: Unauthenticated users redirected to login

**Notes & Open Questions:** _(empty)_

**Completion Log:**
- started: 2026-01-11T20:00:00Z · by: claude
- done: 2026-01-11T20:30:00Z · by: claude · notes: Created all route files with placeholder content using skeleton components. Created `src/app/imports/layout.tsx` for auth protection (redirects to /login if not authenticated) and shared layout. Created `src/components/page-specific/imports-layout.tsx` with side navigation (Dashboard, Review Queue, Statements, History). All four routes render correctly, build passes.

---

<!--P1-009-->
### P1-009 — Create Import Dashboard page skeleton

**Status:** done
**Group:** UI
**Depends on:** P1-008  |  **Blocks:** P1-015  |  **parallel:** false

**Description:**
Build the basic layout structure for the Import Dashboard page following the wireframe.

**Acceptance Criteria (EARS):**
- The page SHALL have the correct layout matching wireframe (status cards, email sync card, quick actions, activity feed)
- The page SHALL be responsive (desktop/tablet/mobile breakpoints)
- Initial state SHALL show loading skeletons for dynamic content

**Deliverables:**
- `src/app/imports/page.tsx` with full layout structure
- Placeholder/skeleton components for each section

**Verification:**
- Visual: Layout matches wireframe at all breakpoints
- Loading: Skeleton states display correctly

**Notes & Open Questions:** _(empty)_

**Completion Log:**
- started: 2026-01-11T21:00:00Z · by: claude
- done: 2026-01-11T21:30:00Z · by: claude · notes: Created full Import Dashboard page with all sections: (1) Status Cards grid (Pending Review, Waiting for Statement, Matched) with color-coded variants, click navigation, and skeleton loading; (2) Email Sync Card with sync status indicator, last sync time formatting, and Sync Now button; (3) Quick Actions 2x2 grid (Upload Statement as primary, Review Queue, View History, Import Settings); (4) Recent Activity feed with timeline-style items, color-coded icons by type, and skeleton loading. All sections are responsive (mobile single column, desktop multi-column). Build and ESLint pass.

---

<!--P1-010-->
### P1-010 — Create email transaction extraction service

**Status:** done
**Group:** Email
**Depends on:** P1-005  |  **Blocks:** P1-011  |  **parallel:** false

**Description:**
Create the core service that orchestrates email parsing, extraction, and storage into `email_transactions` table.

**Acceptance Criteria (EARS):**
- The service SHALL accept raw email content and return extracted transaction data
- WHEN extraction succeeds THEN data is inserted into `email_transactions`
- WHEN extraction fails THEN error is logged and email is marked for manual review
- The service SHALL calculate extraction confidence scores

**Deliverables:**
- `src/lib/email/extraction-service.ts`
- `src/lib/email/types.ts` (extraction types)

**Verification:**
- Unit: Service correctly orchestrates parser calls
- Integration: Extracted data saves to database

**Notes & Open Questions:**
- This builds on existing `emailSyncService` - extends rather than replaces

**Completion Log:**
- started: 2026-01-11T22:00:00Z · by: claude
- done: 2026-01-11T22:30:00Z · by: claude · notes: Created `src/lib/email/` directory with types.ts (extraction types including ExtractedTransaction, ExtractionResult, ClassificationResult, RawEmailData, EmailParser interface, BatchProcessingResult), extraction-service.ts (EmailExtractionService class with ParserRegistry, classification logic, confidence scoring 0-100, processNewEmails batch processing, reprocessEmailTransaction for retries, activity logging), and index.ts for exports. Service extends existing emailSyncService, calculates extraction confidence using weighted scoring (required fields +40, amount +20, date +20, vendor +10, order ID +10), classifies emails for routing (grab/bolt → waiting_for_statement, bank transfers → ready_to_import), and logs activities to import_activities table. Build passes.

---

<!--P1-011-->
### P1-011 — Build Grab email parser

**Status:** done
**Group:** Email
**Depends on:** P1-010  |  **Blocks:** P1-016  |  **parallel:** true

**Description:**
Create parser for Grab receipt emails (GrabFood, GrabCar, GrabMart, GrabExpress).

**Acceptance Criteria (EARS):**
- The parser SHALL extract: vendor name, amount, currency (THB), transaction date, order ID, description
- WHEN email is from `no-reply@grab.com` or contains Grab receipt patterns THEN parser is triggered
- The parser SHALL handle all Grab service types (Food, Car, Mart, Express)
- Extraction confidence SHALL be calculated based on field match quality

**Deliverables:**
- `src/lib/email/extractors/grab.ts`
- Test fixtures with sample Grab emails

**Verification:**
- Unit: Parser extracts correct data from sample emails
- Edge cases: Handles variations in email format

**AI Context — Implementation Template:**

```typescript
// File: src/lib/email/extractors/grab.ts

import type { ExtractedTransaction, ExtractionResult } from '../types';

// Grab email patterns
const GRAB_SENDER = 'no-reply@grab.com';
const GRAB_SUBJECTS = [
  'Your Grab E-Receipt',
  'Your GrabExpress Receipt',
  'Your GrabMart Receipt',
];

// Amount extraction patterns
const THB_AMOUNT_PATTERN = /฿\s*([\d,]+(?:\.\d{2})?)/g;
const ORDER_ID_PATTERN = /(?:Order|GF|GM|GE)-[\w-]+/gi;

interface GrabServiceInfo {
  type: 'food' | 'car' | 'mart' | 'express';
  vendorName: string;
}

/**
 * Detect Grab service type from email content
 */
function detectServiceType(body: string, subject: string): GrabServiceInfo {
  const lowerBody = body.toLowerCase();
  const lowerSubject = subject.toLowerCase();

  if (lowerBody.includes('grabfood') || lowerBody.includes('your order from')) {
    return { type: 'food', vendorName: 'GrabFood' };
  }
  if (lowerBody.includes('hope you enjoyed your ride') || lowerBody.includes('grabtaxi')) {
    return { type: 'car', vendorName: 'Grab Taxi' };
  }
  if (lowerBody.includes('grabmart') || lowerSubject.includes('grabmart')) {
    return { type: 'mart', vendorName: 'GrabMart' };
  }
  if (lowerBody.includes('grabexpress') || lowerSubject.includes('grabexpress')) {
    return { type: 'express', vendorName: 'GrabExpress' };
  }

  return { type: 'food', vendorName: 'Grab' }; // Default
}

/**
 * Extract description based on service type
 */
function extractDescription(body: string, serviceInfo: GrabServiceInfo): string {
  switch (serviceInfo.type) {
    case 'food': {
      // Extract restaurant name: "Your order from {Restaurant}"
      const restaurantMatch = body.match(/your order from\s+([^\n]+)/i);
      if (restaurantMatch) {
        return restaurantMatch[1].trim();
      }
      return 'GrabFood order';
    }
    case 'car': {
      // Extract destination from dropoff
      const dropoffMatch = body.match(/drop-off[:\s]+([^\n]+)/i);
      if (dropoffMatch) {
        return `Taxi to ${dropoffMatch[1].trim()}`;
      }
      return 'Grab ride';
    }
    case 'mart': {
      return 'GrabMart order';
    }
    case 'express': {
      return 'GrabExpress delivery';
    }
  }
}

/**
 * Check if email is from Grab
 */
export function isGrabEmail(fromAddress: string, subject: string): boolean {
  if (fromAddress.toLowerCase() === GRAB_SENDER) return true;
  return GRAB_SUBJECTS.some(s => subject.includes(s));
}

/**
 * Extract transaction data from Grab receipt email
 */
export function extractGrabTransaction(
  emailBody: string,
  emailSubject: string,
  emailDate: Date
): ExtractionResult {
  const errors: string[] = [];
  let confidence = 0;

  // Detect service type
  const serviceInfo = detectServiceType(emailBody, emailSubject);
  confidence += 20; // Found service type

  // Extract amount (THB)
  const amounts = [...emailBody.matchAll(THB_AMOUNT_PATTERN)];
  if (amounts.length === 0) {
    return {
      success: false,
      confidence: 0,
      errors: ['No THB amount found in email'],
    };
  }

  // Usually the total is the last/largest amount
  const amountValues = amounts.map(m => parseFloat(m[1].replace(',', '')));
  const totalAmount = Math.max(...amountValues);
  confidence += 40; // Found amount

  // Extract order ID
  const orderIdMatch = emailBody.match(ORDER_ID_PATTERN);
  const orderId = orderIdMatch?.[0] || null;
  if (orderId) confidence += 20;

  // Extract description
  const description = extractDescription(emailBody, serviceInfo);
  if (description !== serviceInfo.vendorName) confidence += 10;

  return {
    success: true,
    confidence: Math.min(confidence, 100),
    data: {
      vendor_name_raw: serviceInfo.vendorName,
      amount: totalAmount,
      currency: 'THB',
      transaction_date: emailDate,
      order_id: orderId,
      description,
    },
    errors: errors.length > 0 ? errors : undefined,
  };
}
```

**Reference Files:**
- `.claude/skills/import-transactions/TRANSACTION-IMPORT-REFERENCE.md` for Grab patterns
- `src/lib/services/email-types.ts` for existing type definitions

**Test Fixture Location:**
```
__tests__/fixtures/emails/grab/
├── grabfood-receipt.eml
├── grabtaxi-receipt.eml
├── grabmart-receipt.eml
└── grabexpress-receipt.eml
```

**Notes & Open Questions:**
- Reference existing import skill patterns for Grab parsing
- GrabFood emails contain restaurant name in "Your order from {Restaurant}" pattern
- Amount is always in THB (฿ symbol)

**Completion Log:**
- started: 2026-01-11T09:15:00Z · by: claude
- done: 2026-01-11T09:31:00Z · by: claude · notes: Created `src/lib/email/extractors/grab.ts` with comprehensive parser for all Grab services (GrabFood, GrabTaxi, GrabMart, GrabExpress). Implements EmailParser interface with canParse() and extract() methods. Features: (1) Service type detection from email body/subject patterns, (2) THB amount extraction with ฿ symbol support, (3) Order ID extraction for multiple formats (A-XXX, GM-XXX, GE-XXX), (4) Restaurant/destination extraction for descriptions, (5) GrabPay Wallet detection (no CC charge expected), (6) Time-based food type classification. Also created test fixtures in `__tests__/fixtures/emails/grab/` and unit tests in `__tests__/lib/email/extractors/grab.test.ts`. Parser registered in extraction-service.ts singleton. Build passes.

---

<!--P1-012-->
### P1-012 — Build Bolt email parser

**Status:** done
**Group:** Email
**Depends on:** P1-010  |  **Blocks:** P1-016  |  **parallel:** true

**Description:**
Create parser for Bolt ride receipt emails.

**Acceptance Criteria (EARS):**
- The parser SHALL extract: vendor name (Bolt), amount, currency (THB), transaction date, trip ID, description
- WHEN email is from `bangkok@bolt.eu` or contains Bolt receipt patterns THEN parser is triggered
- Extraction confidence SHALL be calculated

**Deliverables:**
- `src/lib/email/extractors/bolt.ts`
- Test fixtures with sample Bolt emails

**Verification:**
- Unit: Parser extracts correct data
- Edge cases: Handles format variations

**Notes & Open Questions:** _(empty)_

**Completion Log:**
- started: 2026-01-11T09:40:00Z · by: claude
- done: 2026-01-11T09:55:00Z · by: claude · notes: Created `src/lib/email/extractors/bolt.ts` implementing EmailParser interface with canParse() and extract() methods. Features: (1) Sender detection for bangkok@bolt.eu, bolt@bolt.eu, noreply@bolt.eu patterns, (2) Subject detection for "Your Bolt ride on [Day]" pattern, (3) THB amount extraction with ฿ symbol and HTML entity support, (4) Trip ID extraction for multiple formats (BOLT-XXX, BK-XXX, etc.), (5) Destination extraction with simplification (Airport, Mall, Hotel, etc.), (6) Day of week extraction from subject for description building, (7) HTML body parsing with tag stripping fallback. Created test fixtures in `__tests__/fixtures/emails/bolt/` (4 sample emails). Created unit tests in `__tests__/lib/email/extractors/bolt.test.ts`. Parser registered in extraction-service.ts and exported from extractors/index.ts. Vendor ID: dcfd535e-46dc-42d5-9590-d9688d32e3cf. Build and lint pass.

---

<!--P1-013-->
### P1-013 — Build Bangkok Bank email parser

**Status:** done
**Group:** Email
**Depends on:** P1-010  |  **Blocks:** P1-016  |  **parallel:** true

**Description:**
Create parser for Bangkok Bank (Bualuang) notification emails (payments, transfers, PromptPay).

**Acceptance Criteria (EARS):**
- The parser SHALL extract: vendor/recipient name, amount, currency (THB), transaction date, reference number
- WHEN email is from `BualuangmBanking@bangkokbank.com` THEN parser is triggered
- The parser SHALL distinguish between payment types (bill pay, transfer, PromptPay)

**Deliverables:**
- `src/lib/email/extractors/bangkok-bank.ts`
- Test fixtures

**Verification:**
- Unit: Parser handles all Bangkok Bank email types
- Edge cases: Different payment types parsed correctly

**Notes & Open Questions:** _(empty)_

**Completion Log:**
- started: 2026-01-11T09:55:00Z · by: claude
- done: 2026-01-11T10:30:00Z · by: claude · notes: Created `src/lib/email/extractors/bangkok-bank.ts` implementing EmailParser interface with canParse() and extract() methods. Features: (1) Transfer type detection (payment, promptpay_mobile, promptpay_citizen, funds_transfer, promptpay_topup) from bilingual Thai/English subjects, (2) Base64 content decoding for Bangkok Bank HTML emails, (3) THB amount extraction with Baht/บาท suffix support, (4) Recipient extraction for all transfer types (Company, Beneficiary Name, To Account Name, To Wallet), (5) Reference number extraction, (6) Transaction date extraction from DD/MM/YYYY format, (7) Vendor lookup from TRANSACTION-IMPORT-REFERENCE.md mappings (Highlands, Nidnoi, Bliss Clean Care, All Time Pickleball, etc.), (8) Self-transfer detection for TrueMoney/LINE Pay TopUps, (9) Proper classification for bank_transfer status (ready_to_import). Created 5 test fixtures in `__tests__/fixtures/emails/bangkok-bank/` (payment-confirmation.txt, promptpay-mobile.txt, funds-transfer.txt, promptpay-topup.txt, unknown-recipient.txt). Created comprehensive unit tests in `__tests__/lib/email/extractors/bangkok-bank.test.ts`. Parser registered in extractors/index.ts and extraction-service.ts. ESLint passes with no errors.

---

<!--P1-014-->
### P1-014 — Build Kasikorn Bank email parser

**Status:** done
**Group:** Email
**Depends on:** P1-010  |  **Blocks:** P1-016  |  **parallel:** true

**Description:**
Create parser for Kasikorn Bank (K PLUS) notification emails.

**Acceptance Criteria (EARS):**
- The parser SHALL extract: vendor/recipient name, amount, currency (THB), transaction date, reference
- WHEN email matches Kasikorn patterns THEN parser is triggered
- The parser SHALL handle different notification types

**Deliverables:**
- `src/lib/email/extractors/kasikorn.ts`
- Test fixtures

**Verification:**
- Unit: Parser extracts correct data
- Edge cases: Format variations handled

**Notes & Open Questions:** _(empty)_

**Completion Log:**
- 2026-01-11: Created `src/lib/email/extractors/kasikorn.ts` with full parser implementation
- 2026-01-11: Added test fixtures in `__tests__/fixtures/emails/kasikorn/`
- 2026-01-11: Created unit tests in `__tests__/lib/email/extractors/kasikorn.test.ts`
- 2026-01-11: Registered parser in extraction service and index.ts
- 2026-01-11: Verified build passes

---

<!--P1-015-->
### P1-015 — Build Lazada email parser

**Status:** done
**Group:** Email
**Depends on:** P1-010  |  **Blocks:** P1-016  |  **parallel:** true

**Description:**
Create parser for Lazada order confirmation and receipt emails.

**Acceptance Criteria (EARS):**
- The parser SHALL extract: vendor (Lazada), estimated amount, currency (THB), order date, order ID
- WHEN email is from `order@lazada.co.th` THEN parser is triggered
- The parser SHALL note that Lazada amounts may be estimates (pending actual charge)

**Deliverables:**
- `src/lib/email/extractors/lazada.ts`
- Test fixtures

**Verification:**
- Unit: Parser extracts order data
- Edge cases: Multi-item orders, partial orders

**Notes & Open Questions:**
- Lazada emails often show estimated totals; actual charge may differ

**Completion Log:**
- 2026-01-11: Created `src/lib/email/extractors/lazada.ts` with:
  - Sender pattern matching for order@lazada.co.th and related addresses
  - Email type detection (order_confirmation, shipped, delivered, payment)
  - THB amount extraction with order total patterns
  - Order ID extraction
  - Item count detection for description building
  - Notes that amounts are estimates (may differ from actual charges)
- 2026-01-11: Registered parser in extraction service and index.ts
- 2026-01-11: Verified build passes

---

<!--P1-016-->
### P1-016 — Integrate parsers into email sync service

**Status:** done
**Group:** Email
**Depends on:** P1-011, P1-012, P1-013, P1-014, P1-015  |  **Blocks:** P1-017  |  **parallel:** false

**Description:**
Integrate all email parsers into the existing `emailSyncService` so that parsed data flows into `email_transactions` table during sync.

**Acceptance Criteria (EARS):**
- WHEN email sync runs THEN each email is processed through appropriate parser
- WHEN parser matches THEN extracted data is saved to `email_transactions`
- WHEN no parser matches THEN email is stored with `classification: 'unknown'`
- The sync SHALL continue even if individual emails fail parsing

**Deliverables:**
- Updated `src/lib/services/email-sync-service.ts`
- `src/lib/email/classifier.ts` (detects which parser to use)

**Verification:**
- Integration: Full sync populates `email_transactions`
- Error handling: Failed parses don't break sync

**Notes & Open Questions:** _(empty)_

**Completion Log:**
- 2026-01-11: Created `src/lib/email/classifier.ts` with `classifyEmail()` function that routes emails to appropriate parsers based on sender/subject patterns
- 2026-01-11: Added `executeSyncWithExtraction()` method to `EmailSyncService` that runs extraction after sync
- 2026-01-11: Updated `/api/emails/sync` route to use the integrated sync+extraction flow
- 2026-01-11: Exported classifier functions from `src/lib/email/index.ts`
- 2026-01-11: Build verified successful

---

<!--P1-017-->
### P1-017 — Add extraction confidence scoring

**Status:** done
**Group:** Email
**Depends on:** P1-016  |  **Blocks:** P1-018  |  **parallel:** false

**Description:**
Implement confidence scoring for extracted email data based on field completeness and pattern match quality.

**Acceptance Criteria (EARS):**
- The score SHALL be 0-100 based on:
  - All required fields present: +40 points
  - Amount parsed correctly: +20 points
  - Date parsed correctly: +20 points
  - Vendor identified: +10 points
  - Order ID found: +10 points
- WHEN score < 55 THEN status = 'needs_manual_review'
- WHEN score >= 90 THEN status = 'pending_review' (high confidence)

**Deliverables:**
- Confidence calculation logic in extraction service
- Score stored in `extraction_confidence` column

**Verification:**
- Unit: Score calculation is deterministic and correct
- Integration: Scores stored with email records

**Notes & Open Questions:** _(empty)_

**Completion Log:**
- 2026-01-11: Created dedicated confidence scoring module `src/lib/email/confidence-scoring.ts` with:
  - `calculateConfidenceScore()` - returns detailed breakdown with individual component scores
  - `determineStatusFromConfidence()` - determines status based on thresholds (< 55 = pending_review)
  - `getConfidenceLevel()` - returns 'low', 'medium', or 'high' based on score
  - `formatScoreAsNotes()` - formats breakdown for extraction_notes column
  - `getConfidenceSummary()` - returns color-coded summary for UI display
  - `SCORE_WEIGHTS` and `CONFIDENCE_THRESHOLDS` constants per spec
- 2026-01-11: Updated `src/lib/email/extraction-service.ts` to use new scoring module:
  - Added `calculateConfidenceWithBreakdown()` method for detailed scoring
  - Updated `processNewEmails()` to use centralized status determination
  - Updated `reprocessEmailTransaction()` to use new scoring
  - Added `buildExtractionNotes()` helper to combine parser notes with score breakdown
- 2026-01-11: Exported all scoring functions and types from `src/lib/email/index.ts`
- 2026-01-11: Created comprehensive unit tests in `__tests__/lib/email/confidence-scoring.test.ts`
- 2026-01-11: Verified build passes successfully

---

<!--P1-018-->
### P1-018 — Implement email classification logic

**Status:** open
**Group:** Email
**Depends on:** P1-017  |  **Blocks:** —  |  **parallel:** false

**Description:**
Implement logic to classify emails and determine initial status (pending_review, waiting_for_statement, ready_to_import, etc.).

**Acceptance Criteria (EARS):**
- WHEN THB email from Grab/Bolt (typically paid via USD CC) THEN status = 'waiting_for_statement'
- WHEN THB email from Bangkok Bank/Kasikorn (direct debit) THEN status = 'ready_to_import'
- WHEN classification uncertain THEN status = 'pending_review'
- Classification logic SHALL be configurable per payment method

**Deliverables:**
- Classification logic in `src/lib/email/classifier.ts`
- Classification rules documentation

**Verification:**
- Unit: Classification returns correct status for each email type
- Integration: Status correctly set in database

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P1-019-->
### P1-019 — Create `ImportStatusCard` component

**Status:** open
**Group:** UI
**Depends on:** P1-009  |  **Blocks:** P1-020  |  **parallel:** false

**Description:**
Build the reusable status card component used on the Import Dashboard (Pending Review, Waiting for Statement, Matched counts).

**Acceptance Criteria (EARS):**
- The component SHALL accept: title, value, icon, variant (pending/waiting/success/info)
- The component SHALL be clickable and navigate to filtered view
- Colors SHALL match spec (amber for pending, blue for waiting, green for matched)
- The component SHALL show loading skeleton state

**Deliverables:**
- `src/components/page-specific/import-status-card.tsx`

**Verification:**
- Visual: Matches wireframe design
- Interaction: Click navigates correctly
- A11y: Proper focus states and aria labels

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P1-020-->
### P1-020 — Create Dashboard status cards section

**Status:** open
**Group:** UI
**Depends on:** P1-019  |  **Blocks:** P1-021  |  **parallel:** false

**Description:**
Implement the top section of the dashboard showing the three status cards in a responsive grid.

**Acceptance Criteria (EARS):**
- The grid SHALL be 3 columns on desktop, 1 column on mobile
- The cards SHALL fetch real data from API
- WHEN data is loading THEN skeleton cards are shown

**Deliverables:**
- Status cards section in dashboard page
- Data fetching hook for counts

**Verification:**
- Visual: Responsive grid works correctly
- Data: Counts reflect actual database values

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P1-021-->
### P1-021 — Create Email Sync card component

**Status:** open
**Group:** UI
**Depends on:** P1-020  |  **Blocks:** P1-022  |  **parallel:** false

**Description:**
Build the Email Sync status card showing connection status, last sync time, and "Sync Now" button.

**Acceptance Criteria (EARS):**
- The card SHALL show: last sync timestamp, folder name, total synced count
- WHEN synced < 1 hour ago THEN show green indicator
- WHEN synced 1-6 hours ago THEN show yellow indicator
- WHEN synced > 6 hours ago THEN show gray indicator
- WHEN "Sync Now" clicked THEN trigger manual sync with loading state

**Deliverables:**
- Email sync card in dashboard
- Manual sync trigger integration

**Verification:**
- Visual: Indicators change based on time
- Functional: Sync Now triggers API call

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P1-022-->
### P1-022 — Create Quick Actions grid

**Status:** open
**Group:** UI
**Depends on:** P1-021  |  **Blocks:** P1-023  |  **parallel:** false

**Description:**
Build the 2x2 quick actions grid with buttons for Upload Statement, Review Queue, View History, and Import Settings.

**Acceptance Criteria (EARS):**
- The grid SHALL be 2x2 on desktop, 1x4 (stacked) on mobile
- Each button SHALL have icon + label
- "Upload Statement" SHALL be primary button style
- Others SHALL be secondary/outline style

**Deliverables:**
- Quick actions section in dashboard

**Verification:**
- Visual: Grid layout correct at all breakpoints
- Navigation: All buttons navigate to correct pages

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P1-023-->
### P1-023 — Create Recent Activity feed component

**Status:** open
**Group:** UI
**Depends on:** P1-022  |  **Blocks:** —  |  **parallel:** false

**Description:**
Build the activity feed showing recent import actions (matches, imports, uploads, errors).

**Acceptance Criteria (EARS):**
- The feed SHALL show 5 most recent activities
- Each item SHALL have: timestamp, icon (color-coded by type), description, metadata
- "View All History" link SHALL navigate to `/imports/history`
- WHEN no activities THEN show empty state

**Deliverables:**
- `src/components/page-specific/activity-feed-item.tsx`
- Activity feed section in dashboard

**Verification:**
- Visual: Timeline style matches wireframe
- Data: Activities fetched from `import_activities` table

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P1-024-->
### P1-024 — Create API route: POST /api/emails/sync

**Status:** open
**Group:** API
**Depends on:** P1-018  |  **Blocks:** P1-021  |  **parallel:** false

**Description:**
Create the API endpoint for manually triggering email sync.

**Acceptance Criteria (EARS):**
- WHEN POST request received THEN trigger email sync for authenticated user
- The response SHALL include: success, synced count, errors, lastUid
- WHEN sync is already running THEN return 409 Conflict
- The endpoint SHALL require authentication

**Deliverables:**
- `src/app/api/emails/sync/route.ts`

**Verification:**
- Functional: Endpoint triggers sync
- Auth: Unauthenticated requests rejected
- Concurrency: Prevents duplicate runs

**AI Context — Implementation Template:**

```typescript
// File: src/app/api/emails/sync/route.ts

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { emailSyncService } from '@/lib/services/email-sync-service';
import { extractionService } from '@/lib/email/extraction-service';

// Track active syncs to prevent duplicates
const activeSyncs = new Set<string>();

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const supabase = createServiceRoleClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if sync already running for this user
    if (activeSyncs.has(user.id)) {
      return NextResponse.json(
        { error: 'Sync already in progress' },
        { status: 409 }
      );
    }

    // Mark sync as active
    activeSyncs.add(user.id);

    try {
      // Execute email sync
      const syncResult = await emailSyncService.executeSync(user.id);

      if (!syncResult.success) {
        return NextResponse.json(
          {
            success: false,
            message: syncResult.message,
            synced: 0,
            errors: 1,
          },
          { status: 500 }
        );
      }

      // Process synced emails through extractors
      // (This integrates with the new extraction service from P1-010)
      const extractionResult = await extractionService.processNewEmails(user.id);

      return NextResponse.json({
        success: true,
        synced: syncResult.synced,
        extracted: extractionResult.processed,
        errors: syncResult.errors,
        lastUid: syncResult.lastUid,
        message: syncResult.message,
      });
    } finally {
      // Always remove from active syncs
      activeSyncs.delete(user.id);
    }
  } catch (error) {
    console.error('Email sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync emails' },
      { status: 500 }
    );
  }
}

// GET to check sync status
export async function GET(request: Request) {
  try {
    const supabase = createServiceRoleClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await emailSyncService.getSyncStats(user.id);
    const isRunning = activeSyncs.has(user.id);

    return NextResponse.json({
      isRunning,
      ...stats,
    });
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
```

**Reference Files:**
- `src/lib/services/email-sync-service.ts` - Existing sync service to use
- `src/app/api/cron/sync-all-rates/route.ts` - Example of existing API route pattern

**Notes & Open Questions:**
- Uses existing `emailSyncService` from the codebase
- Adds extraction processing after sync completes
- Simple in-memory tracking for active syncs (sufficient for single-user app)

**Completion Log:** _(empty initially)_

---

<!--P1-025-->
### P1-025 — Create API route: GET /api/emails/transactions

**Status:** open
**Group:** API
**Depends on:** P1-018  |  **Blocks:** P1-023  |  **parallel:** true

**Description:**
Create the API endpoint for listing email transactions with filtering and pagination.

**Acceptance Criteria (EARS):**
- The endpoint SHALL accept query params: status, currency, dateFrom, dateTo, search, limit, offset
- The response SHALL include: emails array, total count, pagination info
- Results SHALL be filtered by authenticated user's ID (RLS)

**Deliverables:**
- `src/app/api/emails/transactions/route.ts`

**Verification:**
- Functional: Filtering works correctly
- Pagination: Limit/offset work as expected
- Security: Only user's own data returned

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P1-026-->
### P1-026 — Write unit tests for email parsers

**Status:** open
**Group:** Testing
**Depends on:** P1-011, P1-012, P1-013, P1-014, P1-015  |  **Blocks:** —  |  **parallel:** true

**Description:**
Create comprehensive unit tests for all email parser modules.

**Acceptance Criteria (EARS):**
- Each parser SHALL have tests for: valid extraction, missing fields, format variations
- Test coverage SHALL be >80% for parser modules
- Tests SHALL use realistic email fixtures

**Deliverables:**
- `__tests__/lib/email/extractors/grab.test.ts`
- `__tests__/lib/email/extractors/bolt.test.ts`
- `__tests__/lib/email/extractors/bangkok-bank.test.ts`
- `__tests__/lib/email/extractors/kasikorn.test.ts`
- `__tests__/lib/email/extractors/lazada.test.ts`
- Test fixtures in `__tests__/fixtures/emails/`

**Verification:**
- All tests pass
- Coverage meets threshold

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P1-027-->
### P1-027 — Write integration tests for email sync

**Status:** open
**Group:** Testing
**Depends on:** P1-024  |  **Blocks:** —  |  **parallel:** true

**Description:**
Create integration tests for the email sync flow end-to-end.

**Acceptance Criteria (EARS):**
- Tests SHALL verify: API triggers sync, data saved to database, correct status returned
- Tests SHALL mock IMAP connection
- Tests SHALL verify error handling

**Deliverables:**
- `__tests__/integration/email-sync.test.ts`

**Verification:**
- Tests pass with mocked IMAP

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

## Dependency Map

```
Critical Path:
P1-001 ──┐
P1-002 ──┼──► P1-004 ──► P1-005 ──► P1-010 ──► P1-011─P1-015 ──► P1-016 ──► P1-017 ──► P1-018
P1-003 ──┘                                      (parallel)

UI Path (can run parallel after P1-008):
P1-006 ──► P1-007 ──► P1-008 ──► P1-009 ──► P1-019 ──► P1-020 ──► P1-021 ──► P1-022 ──► P1-023

Safe Parallel Lanes:
- Database tasks P1-001, P1-002, P1-003 can run in parallel
- Parser tasks P1-011, P1-012, P1-013, P1-014, P1-015 can run in parallel
- Testing tasks P1-026, P1-027 can run in parallel with other work
```

---

## Traceability

| Spec Requirement | Plan Section | Task IDs |
|-----------------|--------------|----------|
| Database: email_transactions table | Phase 1: Database | P1-001 |
| Database: statement_uploads table | Phase 1: Database | P1-002 |
| Database: import_activities table | Phase 1: Database | P1-003 |
| Database: RLS policies | Phase 1: Database | P1-004 |
| Navigation: Imports menu item | Phase 1: Navigation | P1-006, P1-007, P1-008 |
| Email parsing: Grab | Phase 1: Email Integration | P1-011 |
| Email parsing: Bolt | Phase 1: Email Integration | P1-012 |
| Email parsing: Bangkok Bank | Phase 1: Email Integration | P1-013 |
| Email parsing: Kasikorn | Phase 1: Email Integration | P1-014 |
| Email parsing: Lazada | Phase 1: Email Integration | P1-015 |
| Dashboard UI | Phase 1: Basic UI | P1-009, P1-019–P1-023 |

---

## Estimates & Sequencing Notes

| Task ID | Estimate | Notes |
|---------|----------|-------|
| P1-001–P1-004 | S (1-2 hrs each) | Database migrations are straightforward |
| P1-005 | S (30 min) | Type generation is automated |
| P1-006–P1-008 | S (1 hr each) | Navigation changes are simple |
| P1-009 | M (2-3 hrs) | Layout skeleton with responsive design |
| P1-010 | M (3-4 hrs) | Core extraction service architecture |
| P1-011–P1-015 | M (2-3 hrs each) | Email parsers need pattern testing |
| P1-016–P1-018 | M (2-3 hrs each) | Integration and classification logic |
| P1-019–P1-023 | S-M (1-3 hrs each) | UI components |
| P1-024–P1-025 | S (1-2 hrs each) | API routes |
| P1-026–P1-027 | M (3-4 hrs total) | Testing |

**Total Estimated Time:** ~40-50 hours (2 weeks with buffer)

---

## Update Protocol

When implementing tasks:

1. **Mark task in progress:** Add note to Completion Log with start timestamp
2. **Update status when done:**
   - Flip checkbox in Task Index: `[ ]` → `[x]`
   - Change `**Status:** open` → `**Status:** done`
   - Add Completion Log entry: `- done: <ISO-8601> · by: <agent|user> · notes: <optional>`
3. **If blocked:** Add note to Notes & Open Questions, do not mark done
4. **If scope changes:** Append new tasks with next available ID (P1-028, etc.)
5. **Never renumber** existing task IDs after document is approved

---

## Approval Gate

Task breakdown complete (initial state: all tasks open).

**Phase 1 Summary:**
- 27 tasks total
- 4 Database, 4 Navigation, 9 Email, 7 UI, 2 API, 2 Testing
- Critical path: Database → Types → Parsers → Integration
- Parallel work possible for parsers and UI

Would you like to approve or modify the tasks?
