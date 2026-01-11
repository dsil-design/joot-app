# Email-to-Transaction Linking - Implementation Roadmap

**Project:** Joot Transaction Tracker
**Feature:** Email Receipt Import & Statement Matching
**Date:** 2025-12-31
**Estimated Duration:** 8 weeks
**Status:** Planning Phase

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
└── design-docs/
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

**Phase 5+:**
- [ ] **Learn from confirmations** - Pattern recognition knowledge base:
  - Track approved/rejected matches to improve future confidence scoring
  - Store vendor name aliases (e.g., "Grab* Bangkok TH" → GrabFood)
  - Learn posting delays per payment method (e.g., Chase typically posts 1 day later)
  - Gradually reduce items needing manual review as patterns are learned
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
- `/design-docs/email-transaction-linking-system.md` - Full specification
- `/design-docs/email-transaction-wireframes.md` - Detailed wireframes
- `/design-docs/email-transaction-implementation-roadmap.md` - This document

Ready to start building!
