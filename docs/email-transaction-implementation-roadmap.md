# Email-to-Transaction Linking - Implementation Roadmap

**Project:** Joot Transaction Tracker
**Feature:** Email Receipt Import & Statement Matching
**Date:** 2025-12-31
**Estimated Duration:** 8 weeks
**Status:** Completed — Historical Reference (see [STATUS.md](./STATUS.md) for current state)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Phase Breakdown](#phase-breakdown)
4. [File Structure](#file-structure)
5. [API Endpoints](#api-endpoints)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Plan](#deployment-plan)
8. [Risk Mitigation](#risk-mitigation)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                   │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │   Dashboard   │  │  Review Queue │  │ Statement      │  │
│  │   /imports    │  │  /imports/    │  │ Upload         │  │
│  │               │  │  review       │  │ /imports/      │  │
│  └───────┬───────┘  └───────┬───────┘  │ statements     │  │
│          │                  │          └────────┬───────┘  │
│          └──────────────────┴───────────────────┘          │
│                             │                               │
└─────────────────────────────┼───────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   API Routes      │
                    │   /api/           │
                    │  - emails/        │
                    │  - statements/    │
                    │  - imports/       │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
     ┌────────▼────────┐ ┌───▼────┐ ┌────────▼────────┐
     │   Supabase DB   │ │ Supabase│ │  Background     │
     │  - transactions │ │ Storage │ │  Jobs           │
     │  - email_trans  │ │ (PDFs)  │ │  - Email sync   │
     │  - statements   │ └─────────┘ │  - Extraction   │
     │  - activities   │             │  - Matching     │
     └─────────────────┘             └─────────────────┘
              │
     ┌────────▼────────┐
     │  External APIs  │
     │  - iCloud IMAP  │
     │  - OCR Service  │
     │  - Exchange     │
     │    Rates        │
     └─────────────────┘
```

### Data Flow: Email Sync

```
1. Daily Cron Job (18:00 UTC) - piggybacks on existing /api/cron/sync-all-rates
   │
   ├─► emailSyncService.executeSync() already integrated
   │
   ├─► Connect to iCloud IMAP
   │
   ├─► Fetch new emails from "Transactions" folder (incremental via UID)
   │
   ├─► For each email:
   │   ├─► Parse headers (from, subject, date) - ALREADY WORKING
   │   ├─► Extract body (HTML/text) - TO BE ADDED
   │   ├─► Detect transaction type (Grab, Bolt, Bank, etc.)
   │   ├─► Extract transaction data:
   │   │   ├─► Vendor name
   │   │   ├─► Amount & currency
   │   │   ├─► Transaction date
   │   │   ├─► Order ID / reference
   │   │   └─► Description
   │   ├─► Calculate extraction confidence
   │   ├─► Determine status (pending_review, waiting_for_statement, etc.)
   │   └─► Insert into email_transactions table
   │
   └─► Return sync summary

   Note: Manual "Sync Now" button also triggers this flow on-demand
```

### Data Flow: Statement Upload

```
1. User uploads file via /imports/statements
   │
   ├─► Upload to Supabase Storage (kept forever, no auto-delete)
   │
   ├─► Check for duplicate (block with warning if already uploaded)
   │
   ├─► Create statement_uploads record (status: pending)
   │
   ├─► Trigger background job: processStatement(uploadId)
   │   │
   │   ├─► Extract text from PDF/image (OCR if needed)
   │   │
   │   ├─► Parse transactions using payment method patterns
   │   │
   │   ├─► For each extracted transaction:
   │   │   │
   │   │   ├─► Search email_transactions for matches:
   │   │   │   ├─► Date ±3 days
   │   │   │   ├─► Amount within ±2% (using exchange_rates table)
   │   │   │   ├─► Vendor fuzzy match
   │   │   │   └─► Cross-currency conversion via stored historical rates
   │   │   │
   │   │   ├─► Calculate match confidence (0-100)
   │   │   │
   │   │   └─► If match found:
   │   │       ├─► Update email_transactions:
   │   │       │   ├─► matched_transaction_id
   │   │       │   ├─► match_confidence
   │   │       │   └─► status = 'pending_review' (always requires confirmation)
   │   │       └─► Create activity log
   │   │
   │   ├─► Update statement_uploads (status: completed)
   │   │
   │   └─► Return processing results
   │
   └─► Navigate to Review Queue (user must approve all matches)
```

---

## Technology Stack

### Frontend
- **Framework:** Next.js 15 (App Router, Turbopack)
- **UI Components:** shadcn/ui + Radix UI
- **Styling:** Tailwind CSS
- **Forms:** React Hook Form + Zod
- **State Management:** TanStack Query (React Query)
- **File Upload:** react-dropzone
- **Gestures (Mobile):** react-swipeable or framer-motion

### Backend
- **API:** Next.js API Routes
- **Database:** PostgreSQL (Supabase)
- **Storage:** Supabase Storage
- **Authentication:** Supabase Auth
- **Background Jobs:** Inngest or Vercel Cron Jobs
- **Email Parsing:** node-imap + mailparser
- **PDF Extraction:** pdf-parse
- **OCR:** Tesseract.js or Google Cloud Vision API

### External Services
- **Email:** iCloud IMAP (existing)
- **Exchange Rates:** European Central Bank API (existing)
- **File Storage:** Supabase Storage
- **Monitoring:** Vercel Analytics + Sentry (optional)

---

## Phase Breakdown

### Phase 1: Foundation (Week 1-2)

**Goal:** Database setup, email integration enhancement, basic UI

#### Tasks

**Database (3 days):**
- [ ] Create migration for `email_transactions` table
- [ ] Create migration for `statement_uploads` table
- [ ] Create migration for `import_activities` table
- [ ] Add indexes and RLS policies
- [ ] Generate TypeScript types
- [ ] Test migrations on staging

**Email Integration (4 days):**
- [ ] Enhance existing email sync to populate `email_transactions`
- [ ] Build email parsing logic for each sender type:
  - [ ] Grab (Food, Taxi, Mart, Express)
  - [ ] Bolt
  - [ ] Lazada
  - [ ] Bangkok Bank (Payment, Transfer, PromptPay)
  - [ ] Kasikorn Bank
- [ ] Add extraction confidence scoring
- [ ] Implement status classification logic
- [ ] Test with sample emails

**Navigation (1 day):**
- [ ] Add "Imports" to `SidebarNavigation`
- [ ] Add "Imports" to `MainNavigation`
- [ ] Create route structure:
  - [ ] `/app/imports/page.tsx`
  - [ ] `/app/imports/review/page.tsx`
  - [ ] `/app/imports/statements/page.tsx`
  - [ ] `/app/imports/history/page.tsx`

**Basic UI (2 days):**
- [ ] Create Import Dashboard skeleton
- [ ] Create page layouts using existing patterns
- [ ] Add placeholder components
- [ ] Test navigation flow

**Deliverable:** Working email sync that populates DB, basic navigation

---

### Phase 2: Core Matching (Week 3-4)

**Goal:** Statement processing, matching algorithm, review queue

#### Tasks

**Statement Upload (5 days):**
- [ ] Build file upload component (`StatementUploadZone`)
- [ ] Create API endpoint: `POST /api/statements/upload`
- [ ] Implement file storage (Supabase Storage)
- [ ] Build PDF text extraction:
  - [ ] Chase Sapphire Reserve pattern
  - [ ] American Express pattern
  - [ ] Bangkok Bank pattern
  - [ ] Kasikorn Bank pattern
- [ ] Create transaction parser for each payment method
- [ ] Add processing status updates
- [ ] Test with real statements

**Matching Algorithm (4 days):**
- [ ] Implement match scoring algorithm:
  - [ ] Amount comparison (with cross-currency)
  - [ ] Date matching (±3 day tolerance)
  - [ ] Vendor fuzzy matching (Levenshtein distance)
  - [ ] Currency alignment scoring
- [ ] Build cross-currency converter (using exchange_rates)
- [ ] Create match suggestion ranker
- [ ] Add duplicate detection
- [ ] Unit test all matching logic
- [ ] Optimize for performance (batch processing)

**Review Queue (5 days):**
- [ ] Create `MatchCard` component (3 variants)
- [ ] Build filter bar with search
- [ ] Implement infinite scroll
- [ ] Create approve/reject API endpoints:
  - [ ] `POST /api/imports/approve`
  - [ ] `POST /api/imports/reject`
  - [ ] `POST /api/imports/link`
- [ ] Add batch approve functionality
- [ ] Implement optimistic updates (React Query)
- [ ] Add loading and error states

**Deliverable:** Full upload-to-review flow working

---

### Phase 3: User Experience (Week 5-6)

**Goal:** Mobile optimization, error handling, polish

#### Tasks

**Mobile Optimization (4 days):**
- [ ] Implement responsive layouts for all pages
- [ ] Create bottom sheet component (filters)
- [ ] Add swipe gestures for review queue:
  - [ ] Swipe right: Approve
  - [ ] Swipe left: Reject
  - [ ] Undo toast after swipe
- [ ] Create full-screen modals for mobile
- [ ] Test on real devices (iOS Safari, Android Chrome)
- [ ] Add haptic feedback (if supported)

**Dashboard Implementation (3 days):**
- [ ] Build status cards component
- [ ] Create email sync card with status
- [ ] Build quick actions grid
- [ ] Implement recent activity feed
- [ ] Add real-time data fetching
- [ ] Create loading skeletons

**Error Handling (3 days):**
- [ ] Create error boundary components
- [ ] Build retry logic for failed operations
- [ ] Add user-friendly error messages
- [ ] Implement validation for all forms
- [ ] Create error state UI components
- [ ] Add toast notifications (sonner)

**Components Library (4 days):**
- [ ] Build `ImportStatusCard`
- [ ] Build `ConfidenceIndicator`
- [ ] Build `ActivityFeedItem`
- [ ] Build `EmailDetailModal`
- [ ] Create component documentation
- [ ] Add Storybook stories (optional)

**Deliverable:** Polished, mobile-ready experience

---

### Phase 4: Advanced Features (Week 7-8)

**Goal:** Manual linking, history, settings, automation

#### Tasks

**Manual Linking (3 days):**
- [ ] Create transaction search modal
- [ ] Build search API with filters:
  - [ ] Date range
  - [ ] Vendor
  - [ ] Amount range
  - [ ] Payment method
- [ ] Implement link confirmation flow
- [ ] Add unlink capability
- [ ] Test edge cases

**Import History (2 days):**
- [ ] Build history page UI
- [ ] Create activity logging system
- [ ] Implement filter and search
- [ ] Add export functionality (CSV)
- [ ] Create detail expansion view

**Settings Integration (2 days):**
- [ ] Enhance `/settings/emails` page
- [ ] Add auto-sync preferences
- [ ] Add confidence threshold setting
- [ ] Add notification preferences
- [ ] Create import rules configuration

**Background Jobs (3 days):**
- [ ] Extend existing cron job (`/api/cron/sync-all-rates`) - already runs at 18:00 UTC daily
- [ ] Email sync is already integrated - enhance to populate `email_transactions` table
- [ ] Create statement processing job (async via Inngest or inline)
- [ ] Add retry logic for failed jobs
- [ ] Implement job monitoring/logging

**Email Detail View (2 days):**
- [ ] Build full email viewer component
- [ ] Add edit mode for extracted data
- [ ] Implement save changes flow
- [ ] Add email body rendering (sanitized HTML)
- [ ] Create suggested matches UI

**Final Polish (2 days):**
- [ ] Code review and refactoring
- [ ] Performance optimization
- [ ] Accessibility audit (ARIA labels, keyboard nav)
- [ ] Cross-browser testing
- [ ] Documentation updates

**Deliverable:** Feature-complete system ready for production

---

## File Structure

```
joot-app/
├── src/
│   ├── app/
│   │   ├── imports/
│   │   │   ├── page.tsx                    # Dashboard
│   │   │   ├── review/
│   │   │   │   └── page.tsx                # Review Queue
│   │   │   ├── statements/
│   │   │   │   └── page.tsx                # Statement Upload
│   │   │   └── history/
│   │   │       └── page.tsx                # Import History
│   │   └── api/
│   │       ├── emails/
│   │       │   ├── sync/
│   │       │   │   └── route.ts            # POST: Sync emails
│   │       │   ├── transactions/
│   │       │   │   ├── route.ts            # GET: List email transactions
│   │       │   │   └── [id]/
│   │       │   │       └── route.ts        # GET/PUT/DELETE: Single email
│   │       ├── statements/
│   │       │   ├── upload/
│   │       │   │   └── route.ts            # POST: Upload statement
│   │       │   ├── [id]/
│   │       │   │   ├── route.ts            # GET: Statement details
│   │       │   │   ├── process/
│   │       │   │   │   └── route.ts        # POST: Process statement
│   │       │   │   └── matches/
│   │       │   │       └── route.ts        # GET: Match results
│   │       └── imports/
│   │           ├── approve/
│   │           │   └── route.ts            # POST: Approve match(es)
│   │           ├── reject/
│   │           │   └── route.ts            # POST: Reject match
│   │           ├── link/
│   │           │   └── route.ts            # POST: Manual link
│   │           └── history/
│   │               └── route.ts            # GET: Activity history
│   │
│   ├── components/
│   │   ├── page-specific/
│   │   │   ├── match-card.tsx              # Match display card
│   │   │   ├── statement-upload-zone.tsx   # File upload component
│   │   │   ├── import-status-card.tsx      # Dashboard status card
│   │   │   ├── activity-feed-item.tsx      # Activity timeline item
│   │   │   ├── email-detail-modal.tsx      # Full email viewer
│   │   │   ├── transaction-search-modal.tsx # Manual link search
│   │   │   └── filter-bottom-sheet.tsx     # Mobile filter sheet
│   │   │
│   │   └── ui/
│   │       ├── confidence-indicator.tsx     # Match confidence bar
│   │       └── ... (existing shadcn components)
│   │
│   ├── hooks/
│   │   ├── use-email-transactions.ts        # React Query hooks
│   │   ├── use-statement-upload.ts
│   │   ├── use-import-actions.ts
│   │   └── use-match-scoring.ts
│   │
│   ├── lib/
│   │   ├── email/
│   │   │   ├── imap-client.ts              # IMAP connection
│   │   │   ├── email-parser.ts             # Email parsing
│   │   │   ├── extractors/
│   │   │   │   ├── grab.ts                 # Grab email extraction
│   │   │   │   ├── bolt.ts                 # Bolt email extraction
│   │   │   │   ├── lazada.ts               # Lazada email extraction
│   │   │   │   ├── bangkok-bank.ts         # Bangkok Bank extraction
│   │   │   │   └── kasikorn.ts             # Kasikorn extraction
│   │   │   └── classifier.ts               # Email classification
│   │   │
│   │   ├── statements/
│   │   │   ├── pdf-extractor.ts            # PDF text extraction
│   │   │   ├── ocr-service.ts              # OCR for images
│   │   │   ├── parsers/
│   │   │   │   ├── chase.ts                # Chase statement parser
│   │   │   │   ├── amex.ts                 # Amex statement parser
│   │   │   │   ├── bangkok-bank.ts         # Bangkok Bank parser
│   │   │   │   └── kasikorn.ts             # Kasikorn parser
│   │   │   └── transaction-normalizer.ts   # Normalize extracted data
│   │   │
│   │   ├── matching/
│   │   │   ├── match-scorer.ts             # Match confidence algorithm
│   │   │   ├── fuzzy-matcher.ts            # Vendor name matching
│   │   │   ├── amount-matcher.ts           # Amount comparison
│   │   │   ├── date-matcher.ts             # Date tolerance matching
│   │   │   └── cross-currency.ts           # Currency conversion
│   │   │
│   │   ├── import/
│   │   │   ├── bulk-approve.ts             # Batch approval logic
│   │   │   ├── transaction-creator.ts      # Create transaction from email
│   │   │   └── activity-logger.ts          # Log import activities
│   │   │
│   │   └── supabase/
│   │       ├── types.ts                    # Updated with new tables
│   │       └── queries/
│   │           ├── email-transactions.ts   # DB queries
│   │           ├── statements.ts
│   │           └── import-activities.ts
│   │
│   └── jobs/                                # Background jobs
│       ├── email-sync.ts                   # Scheduled sync job
│       ├── statement-processor.ts          # Async processing job
│       └── match-recalculator.ts           # Nightly re-matching
│
├── database/
│   ├── migrations/
│   │   ├── 20250101000001_create_email_transactions.sql
│   │   ├── 20250101000002_create_statement_uploads.sql
│   │   └── 20250101000003_create_import_activities.sql
│   └── schema.sql                           # Updated schema
│
└── docs/
    ├── email-transaction-linking-system.md  # Main spec
    ├── email-transaction-wireframes.md      # Wireframes
    └── email-transaction-implementation-roadmap.md  # This doc
```

---

## API Endpoints

### Email Transactions

#### `POST /api/emails/sync`
Trigger manual email sync from iCloud

**Request:**
```json
{
  "folder": "Transactions",  // Optional, defaults to env var
  "since": "2025-12-01"      // Optional, only sync after this date
}
```

**Response:**
```json
{
  "success": true,
  "synced": 24,
  "newEmails": 18,
  "updated": 6,
  "errors": []
}
```

---

#### `GET /api/emails/transactions`
List email transactions with filtering

**Query Parameters:**
- `status`: Filter by status (pending_review, matched, waiting_for_statement, etc.)
- `currency`: Filter by currency (USD, THB)
- `dateFrom`, `dateTo`: Date range
- `search`: Full-text search
- `limit`, `offset`: Pagination

**Response:**
```json
{
  "emails": [
    {
      "id": "uuid",
      "subject": "Your Grab E-Receipt",
      "from_address": "no-reply@grab.com",
      "email_date": "2025-12-15T19:45:00Z",
      "amount": 340.00,
      "currency": "THB",
      "vendor_id": "uuid",
      "vendor_name_raw": "GrabFood",
      "status": "pending_review",
      "matched_transaction_id": "uuid",
      "match_confidence": 87,
      "extraction_confidence": 95
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

#### `PUT /api/emails/transactions/[id]`
Update email transaction (edit extracted data)

**Request:**
```json
{
  "vendor_id": "uuid",
  "amount": 340.00,
  "currency": "THB",
  "transaction_date": "2025-12-15",
  "description": "Dinner - KFC Sukhumvit"
}
```

**Response:**
```json
{
  "success": true,
  "email": { /* updated email object */ }
}
```

---

### Statements

#### `POST /api/statements/upload`
Upload statement file

**Request:** `multipart/form-data`
- `file`: PDF/PNG/JPG/HEIC file
- `payment_method_id`: UUID
- `statement_period_start`: Date (optional)
- `statement_period_end`: Date (optional)

**Response:**
```json
{
  "success": true,
  "upload": {
    "id": "uuid",
    "filename": "chase-dec-2025.pdf",
    "file_size": 2457600,
    "status": "pending",
    "payment_method_id": "uuid"
  }
}
```

---

#### `POST /api/statements/[id]/process`
Trigger statement processing (async job)

**Response:**
```json
{
  "success": true,
  "jobId": "job-uuid",
  "status": "processing",
  "estimatedTime": 30  // seconds
}
```

---

#### `GET /api/statements/[id]/matches`
Get processing results and matches

**Response:**
```json
{
  "statement": {
    "id": "uuid",
    "status": "completed",
    "transactions_extracted": 45,
    "transactions_matched": 38,
    "transactions_new": 7
  },
  "matches": [
    {
      "emailId": "uuid",
      "transactionData": {
        "date": "2025-12-15",
        "description": "Grab* Bangkok TH",
        "amount": 10.00,
        "currency": "USD"
      },
      "confidence": 87,
      "reasons": [
        "Amount match (exact after conversion)",
        "Date match (same day)",
        "Vendor match (Grab → Grab*)"
      ]
    }
  ],
  "summary": {
    "highConfidence": 38,
    "mediumConfidence": 0,
    "lowConfidence": 0,
    "noMatch": 7
  }
}
```

---

### Imports

#### `POST /api/imports/approve`
Approve match(es) and create transaction(s)

**Request:**
```json
{
  "emailIds": ["uuid1", "uuid2", "..."],
  "createTransactions": true  // If false, just update status
}
```

**Response:**
```json
{
  "success": true,
  "imported": 38,
  "failed": 0,
  "errors": [],
  "totalAmount": 1247.89,
  "currency": "USD"
}
```

---

#### `POST /api/imports/reject`
Reject match and mark email as skipped

**Request:**
```json
{
  "emailId": "uuid",
  "reason": "Not a transaction"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "email": { /* updated email with status: 'skipped' */ }
}
```

---

#### `POST /api/imports/link`
Manually link email to different transaction

**Request:**
```json
{
  "emailId": "uuid",
  "transactionId": "uuid",
  "confidence": 75  // Optional override
}
```

**Response:**
```json
{
  "success": true,
  "email": { /* updated email */ },
  "transaction": { /* linked transaction */ }
}
```

---

#### `GET /api/imports/history`
Get import activity history

**Query Parameters:**
- `dateFrom`, `dateTo`: Date range
- `activityType`: Filter by type
- `limit`, `offset`: Pagination

**Response:**
```json
{
  "activities": [
    {
      "id": "uuid",
      "activity_type": "statement_upload",
      "description": "Processed Chase December statement",
      "transactions_affected": 45,
      "total_amount": 1247.89,
      "currency": "USD",
      "created_at": "2025-12-30T16:20:00Z",
      "metadata": {
        "matched": 38,
        "new": 7
      }
    }
  ],
  "total": 156
}
```

---

## Testing Strategy

### Unit Tests
- [ ] Email parsing for each sender type
- [ ] Match scoring algorithm
- [ ] Statement transaction extraction
- [ ] Cross-currency conversion
- [ ] Fuzzy vendor matching

**Tool:** Vitest + Testing Library

### Integration Tests
- [ ] Email sync end-to-end
- [ ] Statement upload and processing
- [ ] Approve/reject flows
- [ ] API endpoint responses

**Tool:** Playwright or Cypress

### Manual Testing Checklist
- [ ] Upload each statement type (Chase, Amex, Bangkok Bank, Kasikorn)
- [ ] Test with real emails (Grab, Bolt, Lazada, banks)
- [ ] Cross-currency matching accuracy
- [ ] Mobile swipe gestures
- [ ] Error handling (invalid files, network failures)
- [ ] Bulk operations (approve 50+ items)
- [ ] Pagination and infinite scroll
- [ ] Browser compatibility (Chrome, Safari, Firefox)
- [ ] Device testing (iOS, Android)

### Performance Testing
- [ ] Large file upload (10MB PDF)
- [ ] Processing 100+ transactions
- [ ] Review queue with 500+ items
- [ ] Database query performance
- [ ] Concurrent user stress test

**Tool:** k6 or Artillery

---

## Deployment Plan

### Pre-Production

1. **Staging Environment:**
   - Deploy to Vercel preview branch
   - Use separate Supabase project
   - Test with production-like data
   - Run all integration tests

2. **Beta Testing:**
   - Enable for single user (you)
   - Process real November-December statements
   - Collect feedback and fix bugs
   - Iterate on UX issues

### Production Rollout

**Week 9: Soft Launch**
- [ ] Deploy database migrations
- [ ] Deploy app to production
- [ ] Enable feature flag for single user
- [ ] Monitor error rates (Sentry)
- [ ] Track performance metrics

**Week 10: Full Launch**
- [ ] Enable for all users (if multi-user in future)
- [ ] Announce feature
- [ ] Provide user documentation
- [ ] Monitor usage analytics

### Rollback Plan
- Keep feature behind environment variable flag
- Can disable import routes without redeployment
- Database migrations are additive (won't break existing features)
- Separate storage bucket for uploaded files (can be cleaned up)

---

## Sync Reliability & Monitoring

### Sync Events Table

Track all sync operations for debugging and health monitoring:

```sql
CREATE TABLE sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  sync_type TEXT NOT NULL,              -- 'email_sync', 'statement_process', 'match_run'
  status TEXT NOT NULL,                 -- 'started', 'completed', 'failed', 'partial'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Sync details
  items_processed INTEGER DEFAULT 0,
  items_succeeded INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,

  -- For email sync
  last_uid_processed TEXT,              -- Resume point for partial syncs
  folder_synced TEXT,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Metadata
  trigger_source TEXT,                  -- 'cron', 'manual', 'api'
  duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_events_user ON sync_events(user_id, sync_type, started_at DESC);
CREATE INDEX idx_sync_events_status ON sync_events(status) WHERE status = 'failed';
```

### Dashboard Sync Health Indicator

```
┌────────────────────────────────────────────────────────────┐
│  📧 Email Sync Status                                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Last sync: Today, 6:00 PM UTC                    ✅       │
│  Emails synced: 12 new, 0 errors                          │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ 7-day success rate: 100%                             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  [Sync Now]  [View History]                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Status Indicators:**
- ✅ **Healthy** - Last sync succeeded, no errors in 24h
- ⚠️ **Warning** - Partial sync or minor errors
- ❌ **Error** - Last sync failed, needs attention

### Partial Sync Recovery

When sync is interrupted (timeout, network error):

1. **Resume Capability:**
   - Store `last_uid_processed` in `sync_events`
   - Next sync starts from last successful UID + 1
   - Prevents duplicate processing

2. **Automatic Retry:**
   - Failed syncs retry on next cron run
   - 3 consecutive failures → send notification (if enabled)
   - Manual intervention required after 5 failures

3. **Recovery Flow:**
   ```
   Cron triggers → Check last sync status

   IF last_sync.status = 'partial':
     Resume from last_sync.last_uid_processed
   ELSE IF last_sync.status = 'failed':
     Full retry with same parameters
   ELSE:
     Normal incremental sync
   ```

### Error Handling Strategy

| Error Type | Action | User Impact |
|------------|--------|-------------|
| **IMAP Connection Failed** | Retry 3x with backoff, then mark failed | Warning shown on dashboard |
| **Single Email Parse Error** | Log error, continue with next email | Item shows "Parse Error" status |
| **Storage Write Failed** | Retry 2x, then fail sync | Sync marked as partial |
| **Database Error** | Rollback batch, retry | Sync marked as failed |
| **Rate Limited** | Exponential backoff, resume | Sync continues on next run |

### Monitoring Queries

**Check recent sync health:**
```sql
SELECT
  DATE(started_at) as date,
  COUNT(*) as total_syncs,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(duration_ms) as avg_duration_ms
FROM sync_events
WHERE user_id = $1
  AND started_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(started_at)
ORDER BY date DESC;
```

**Find failed syncs needing attention:**
```sql
SELECT * FROM sync_events
WHERE status = 'failed'
  AND started_at > NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC;
```

---

## Performance Considerations

### Database Indexes

Ensure these indexes exist for query performance:

```sql
-- Email transactions lookups
CREATE INDEX idx_email_trans_status ON email_transactions(user_id, status);
CREATE INDEX idx_email_trans_date ON email_transactions(user_id, email_date);
CREATE INDEX idx_email_trans_match ON email_transactions(user_id, match_confidence)
  WHERE status = 'pending_review';

-- Statement processing
CREATE INDEX idx_statement_uploads_user ON statement_uploads(user_id, created_at DESC);

-- Matching algorithm queries
CREATE INDEX idx_email_trans_matching ON email_transactions(
  user_id,
  currency,
  amount,
  email_date
) WHERE status IN ('pending_review', 'waiting_for_statement');

-- Activity feed
CREATE INDEX idx_import_activities_feed ON import_activities(user_id, created_at DESC);
```

### Batch Processing Limits

| Operation | Batch Size | Rationale |
|-----------|------------|-----------|
| Email sync | 50 emails | IMAP connection limits |
| Statement parsing | 100 transactions | Memory usage |
| Matching algorithm | 50 candidates | Query performance |
| Bulk approve | 100 items | Transaction timeout |
| Activity logging | 25 items | Insert batch size |

### Pagination Strategy

Use cursor-based pagination for large datasets:

```typescript
// Example: Review queue pagination
interface PaginationCursor {
  lastId: string;
  lastDate: string;
}

async function getReviewQueue(
  userId: string,
  cursor?: PaginationCursor,
  limit: number = 20
) {
  let query = supabase
    .from('email_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending_review')
    .order('email_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1); // Fetch one extra to know if more exist

  if (cursor) {
    query = query.or(
      `email_date.lt.${cursor.lastDate},` +
      `and(email_date.eq.${cursor.lastDate},id.lt.${cursor.lastId})`
    );
  }

  const { data, error } = await query;

  const hasMore = data && data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore ? {
    lastId: items[items.length - 1].id,
    lastDate: items[items.length - 1].email_date
  } : null;

  return { items, nextCursor, hasMore };
}
```

### Caching Strategy

For frequently accessed data:

```typescript
// Cache vendor aliases (changes rarely)
const VENDOR_ALIAS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Cache exchange rates (fetched daily)
const EXCHANGE_RATE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// No cache for review queue (real-time updates needed)
```

### Query Optimization Tips

1. **Review Queue:** Always filter by `status` first (indexed)
2. **Matching:** Query by `(user_id, currency, date_range)` - indexed columns
3. **Activity Feed:** Use `LIMIT` with cursor, never `OFFSET`
4. **Aggregations:** Use database-level `COUNT` with `GROUP BY`, not app-level

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **OCR accuracy low** | High | Medium | Use known patterns first, OCR as fallback. Allow manual correction. |
| **Email sync breaks** | High | Low | Maintain existing CLI workflow as backup. Add comprehensive error handling. |
| **Performance degradation** | Medium | Medium | Implement pagination, infinite scroll, background jobs. Monitor query performance. |
| **File storage costs** | Low | Low | Files kept forever per user preference. Compress files if needed. |
| **Cross-currency mismatch** | Medium | Medium | Allow confidence threshold adjustment. Provide manual link option. |
| **Statement format changes** | Medium | High | Build flexible parsers. Add pattern learning. Allow custom rules. |

### User Experience Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Too many false matches** | High | Set high confidence threshold (90%). Allow easy rejection. |
| **Manual review tedious** | Medium | Implement batch approve. Add keyboard shortcuts. |
| **Mobile UX clunky** | Medium | Test extensively on real devices. Add swipe gestures. |
| **Overwhelming for first use** | Medium | Provide onboarding tour. Show empty states with help text. |

### Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **User doesn't trust automation** | High | Show full transparency (confidence, reasons). Allow manual override. |
| **Feature scope creep** | Medium | Stick to MVP. Create backlog for future enhancements. |
| **Time overrun** | Medium | Break into phases. Deliver incrementally. |

---

## Success Metrics

### Key Performance Indicators (KPIs)

1. **Match Accuracy:**
   - Target: >90% of high-confidence matches are correct
   - Measure: User reject rate on high-confidence items

2. **Processing Speed:**
   - Target: Statement processing <30 seconds for 50 transactions
   - Measure: Average processing time

3. **User Efficiency:**
   - Target: 50% reduction in manual entry time
   - Measure: Time from upload to import (vs. manual CLI)

4. **Adoption:**
   - Target: 80% of monthly imports via app (vs. CLI)
   - Measure: Number of statements uploaded per month

5. **Error Rate:**
   - Target: <5% of uploads fail
   - Measure: Failed uploads / total uploads

### Monitoring

**Application Monitoring:**
- Use Vercel Analytics for performance
- Use Sentry for error tracking
- Custom event tracking:
  - Statements uploaded
  - Matches approved/rejected
  - Manual links created
  - Time to review

**Database Monitoring:**
- Supabase dashboard for query performance
- Track table sizes (email_transactions growth)
- Monitor storage usage

---

## Future Enhancements (Post-MVP)

### Phase 5: Learning Mode System

**Goal:** Learn from user confirmations to improve matching accuracy over time

#### Database Schema

```sql
-- Vendor name aliases learned from user corrections
CREATE TABLE vendor_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  statement_name TEXT NOT NULL,         -- "Grab* Bangkok TH"
  canonical_vendor_id UUID REFERENCES vendors(id),  -- Links to GrabFood vendor
  confidence DECIMAL(5,2) DEFAULT 100,  -- How certain are we about this alias
  source TEXT NOT NULL,                 -- 'user_correction', 'auto_learned', 'manual'
  usage_count INTEGER DEFAULT 1,        -- How many times this alias has matched
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, statement_name)
);

-- Posting delay patterns per payment method
CREATE TABLE posting_delay_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  payment_method_id UUID REFERENCES payment_methods(id) NOT NULL,
  vendor_category TEXT,                 -- Optional: 'restaurants', 'rideshare', etc.
  avg_delay_days DECIMAL(3,1) NOT NULL, -- Average posting delay
  min_delay_days INTEGER DEFAULT 0,
  max_delay_days INTEGER DEFAULT 5,
  sample_count INTEGER DEFAULT 1,       -- How many data points
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, payment_method_id, vendor_category)
);

-- Indexes
CREATE INDEX idx_vendor_aliases_lookup ON vendor_aliases(user_id, statement_name);
CREATE INDEX idx_posting_delays_lookup ON posting_delay_patterns(user_id, payment_method_id);
```

#### Learning Mode UI

**Correction Flow (when user selects different vendor):**
```
┌─────────────────────────────────────────────────────────────┐
│  🎓 Learning Mode                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  You changed the vendor from "Grab* Bangkok TH" to          │
│  "GrabFood".                                                │
│                                                             │
│  Should we remember this for future matches?                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑ Always map "Grab* Bangkok TH" → GrabFood          │   │
│  │ ☐ Just this once                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                            [Cancel]  [Save & Learn]         │
└─────────────────────────────────────────────────────────────┘
```

**Posting Delay Detection:**
```
After enough data points (≥5), system automatically calculates:
- Chase Sapphire: Average 1.2 days posting delay (transactions → 1 day earlier in email)
- Bangkok Bank: Average 0.1 days (same-day posting)

This adjusts date matching algorithm automatically.
```

#### Integration Points

1. **Match Scoring Algorithm** - Query `vendor_aliases` before fuzzy matching
2. **Date Matcher** - Use `posting_delay_patterns` to adjust expected date range
3. **Approval Flow** - Capture corrections and update learning tables
4. **Dashboard** - Show "Learning Progress" indicator (e.g., "87 patterns learned")

#### Tasks

- [ ] **P5-001:** Create `vendor_aliases` migration
- [ ] **P5-002:** Create `posting_delay_patterns` migration
- [ ] **P5-003:** Build Learning Mode correction dialog
- [ ] **P5-004:** Integrate alias lookup into fuzzy matcher
- [ ] **P5-005:** Calculate posting delays from approval history
- [ ] **P5-006:** Add "Learned Patterns" section to settings
- [ ] **P5-007:** Implement alias confidence decay (reduce confidence if alias is corrected)

---

### Phase 6: Additional Features

- [ ] Machine learning for vendor name normalization
- [ ] Auto-categorization using tags
- [ ] Receipt image OCR (extract from attachments)
- [ ] Duplicate transaction detection across months
- [ ] Scheduled statement fetching (auto-download from bank websites)
- [ ] Multi-user support (shared household imports)
- [ ] Webhooks for real-time email processing
- [ ] Mobile app (React Native)
- [ ] Export to accounting software (QuickBooks, Xero)
- [ ] Smart suggestions for missing vendors/payment methods
- [ ] Notifications (when matches are ready, sync complete, etc.)

---

## Conclusion

This roadmap provides a structured, 8-week plan to implement the email-to-transaction linking system. The phased approach allows for:

1. **Early validation** - Test core concepts in Phase 1-2
2. **Iterative refinement** - Improve UX in Phase 3
3. **Feature completeness** - Add advanced features in Phase 4
4. **Controlled rollout** - Beta test before full launch

**Next Steps:**
1. Review and approve this roadmap
2. Set up project tracking (GitHub Projects, Linear, etc.)
3. Create database migrations
4. Begin Phase 1 implementation

All design artifacts are ready:
- `/docs/email-transaction-linking-system.md` - Full specification
- `/docs/email-transaction-wireframes.md` - Detailed wireframes
- `/docs/email-transaction-implementation-roadmap.md` - This document

Ready to start building!
