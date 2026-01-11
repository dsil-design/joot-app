# Email-to-Transaction Linking System - Design Documentation

**Project:** Joot Transaction Tracker
**Feature:** Email Receipt Import & Statement Matching
**Status:** Design Complete - Ready for Implementation
**Date:** 2025-12-31

---

## Overview

This design package contains complete specifications for implementing an in-app workflow to automatically import transactions from receipt emails and credit card/bank statements, with intelligent cross-currency matching and user review capabilities.

### The Problem

Currently, ~200 emails/month are processed manually via CLI:
- Receipt emails (Grab, Bolt, Lazada) in THB
- Credit card statements (Chase, Amex) in USD
- Bank statements (Bangkok Bank, Kasikorn) in THB
- Cross-currency matching is manual and error-prone

### The Solution

An integrated system that:
1. Auto-syncs receipt emails from iCloud
2. Extracts transaction data using pattern recognition
3. Intelligently matches THB receipts to USD credit card charges
4. Presents high-confidence matches for bulk approval
5. Allows manual review and correction for edge cases
6. Maintains complete audit trail

---

## Documentation Structure

### 1. Main Specification
**File:** `email-transaction-linking-system.md`

Complete feature specification including:
- User flow diagrams
- Information architecture
- Page specifications (5 pages)
- Component library (new + existing)
- Mobile adaptations
- Interaction patterns
- Database schema extensions
- Implementation notes
- Open questions

**Key Sections:**
- Executive Summary
- User Flow Diagram
- Page Specifications (Dashboard, Review Queue, Upload, Email Detail, History)
- Component Library (5 new components + existing)
- Mobile Adaptations
- Database Schema (3 new tables)
- Match Scoring Algorithm

### 2. Detailed Wireframes
**File:** `email-transaction-wireframes.md`

ASCII wireframes with exact layouts:
- Desktop wireframes (1440px) for all pages
- Mobile wireframes (375px) with touch interactions
- Component visual specifications
- Interaction flows (approve, reject, link, batch)
- State variations (loading, error, success)
- Swipe gesture examples

**Key Sections:**
- Desktop layouts (5 pages)
- Mobile layouts (4 pages + modals)
- Component details (confidence indicator, activity feed)
- Interaction specifications (batch approve, manual link, errors)

### 3. Implementation Roadmap
**File:** `email-transaction-implementation-roadmap.md`

8-week development plan:
- Architecture overview
- Technology stack
- 4 implementation phases
- File structure
- API endpoint specifications
- Testing strategy
- Deployment plan
- Risk mitigation

**Key Sections:**
- Phase breakdown (Foundation, Core Matching, UX, Advanced)
- Complete file structure
- API endpoint docs (10 endpoints)
- Testing checklist
- Success metrics
- Future enhancements

---

## Quick Start for Developers

### Prerequisites
Read these documents in order:
1. `email-transaction-linking-system.md` - Understand the feature
2. `email-transaction-wireframes.md` - See the UI
3. `email-transaction-implementation-roadmap.md` - Plan the work

### Implementation Phases

**Phase 1 (Week 1-2): Foundation**
- Database migrations
- Email integration enhancement
- Basic navigation and routing

**Phase 2 (Week 3-4): Core Matching**
- Statement upload and processing
- Match scoring algorithm
- Review queue with approve/reject

**Phase 3 (Week 5-6): User Experience**
- Mobile optimization
- Dashboard implementation
- Error handling and polish

**Phase 4 (Week 7-8): Advanced Features**
- Manual linking
- Import history
- Background jobs
- Final testing

### Key Files to Create

**Database:**
```
database/migrations/
├── 20250101000001_create_email_transactions.sql
├── 20250101000002_create_statement_uploads.sql
└── 20250101000003_create_import_activities.sql
```

**Pages:**
```
src/app/imports/
├── page.tsx                 # Dashboard
├── review/page.tsx          # Review Queue
├── statements/page.tsx      # Upload
└── history/page.tsx         # History
```

**API Routes:**
```
src/app/api/
├── emails/sync/route.ts
├── statements/upload/route.ts
└── imports/approve/route.ts
```

**Components:**
```
src/components/page-specific/
├── match-card.tsx
├── statement-upload-zone.tsx
├── import-status-card.tsx
└── email-detail-modal.tsx
```

---

## Design Decisions

### Match Confidence Scoring

**Algorithm weights:**
- Amount match: 40%
- Date match: 30%
- Vendor match: 20%
- Currency alignment: 10%

**Thresholds:**
- High confidence (>90%): Auto-approve eligible
- Medium confidence (55-90%): Manual review required
- Low confidence (<55%): Show as "no match"

**Rationale:** Amount is most reliable signal, especially after cross-currency conversion. Date has tolerance for posting delays. Vendor names are often abbreviated on statements.

### Email Transaction States

```
pending_review → User needs to approve/reject match
matched → Linked to existing transaction (validated)
waiting_for_statement → THB receipt expecting USD charge
ready_to_import → Can create new transaction directly
imported → Transaction created in database
skipped → Marked as non-transaction
```

**Rationale:** Clear state machine prevents emails from being lost or double-processed. "Waiting for statement" state handles async CC posting.

### Cross-Currency Matching

**Tolerance:** ±2% variance on exchange rate
**Date window:** ±1 day (posting delay)

**Rationale:** Credit cards post 0-2 days after transaction. Exchange rates vary slightly. 2% covers daily fluctuation + rounding.

### Mobile-First Interactions

**Swipe gestures:**
- Right swipe = Approve
- Left swipe = Reject
- Undo available for 5 seconds

**Rationale:** Faster than tapping buttons. Familiar pattern from email apps. Undo prevents accidents.

---

## Technical Architecture

### Data Flow

```
iCloud Email (IMAP)
    ↓
Email Sync Job (daily at 18:00 UTC via existing cron)
    ↓
Parse & Extract (Grab, Bolt, Lazada, Banks)
    ↓
email_transactions table (status: pending_review)
    ↓
User uploads statement
    ↓
Extract transactions → Match with emails (using exchange_rates table)
    ↓
Update email_transactions (matched_transaction_id, confidence)
    ↓
Review Queue (user approves - always required, no auto-approve)
    ↓
Create transactions table records
    ↓
Update email_transactions (status: imported)
```

### Database Schema (New Tables)

**`email_transactions`**
- Stores parsed email data
- Links to matched transactions
- Tracks confidence and status

**`statement_uploads`**
- Metadata for uploaded files
- Processing status and results
- Links to payment method

**`import_activities`**
- Audit trail of all import actions
- Summary statistics
- User activity log

### Key Technologies

- **Next.js 15** - App Router for pages, API routes
- **Supabase** - PostgreSQL + Storage + Auth (existing)
- **shadcn/ui** - Component library (existing)
- **TanStack Query** - Data fetching and caching
- **react-dropzone** - File upload
- **Inngest** - Background jobs (or Vercel Cron)

---

## User Journey Example

### Happy Path: Grab Receipt → Chase Charge

1. **Dec 15, 7:45 PM** - User orders GrabFood (฿340 THB)
2. **Dec 15, 7:50 PM** - Receipt email arrives in iCloud "Transactions" folder
3. **Dec 15, 10:00 PM** - Scheduled sync job runs
   - Email parsed → ฿340 extracted
   - Vendor: GrabFood
   - Status: `waiting_for_statement` (THB receipt expecting USD charge)
4. **Dec 30, 11:00 AM** - User uploads Chase December statement
   - Extract: Grab* Bangkok TH, $10.00, Dec 15
   - Cross-reference emails: Find GrabFood receipt
   - Convert: ฿340 ÷ 34 = $10.00 ✓
   - Match confidence: 87% (HIGH)
   - Status → `pending_review`
5. **Dec 30, 11:05 AM** - User opens Review Queue
   - Sees 38 high-confidence matches
   - Clicks "Approve All High-Confidence"
6. **Dec 30, 11:05 AM** - System creates 38 transactions
   - Vendor: GrabFood
   - Amount: $10.00 USD
   - Payment Method: Chase Sapphire Reserve
   - Description: "Dinner - KFC Sukhumvit" (from email)
   - Email status → `imported`

**Result:** 38 transactions imported in ~5 minutes (vs. ~2 hours manual entry)

---

## Success Criteria

### Must Have (MVP)
- ✅ Email sync from iCloud
- ✅ Extract data from Grab, Bolt, Lazada, Bangkok Bank, Kasikorn emails
- ✅ Upload Chase, Amex, Bangkok Bank, Kasikorn statements
- ✅ Cross-currency matching (THB ↔ USD)
- ✅ Review queue with confidence scoring
- ✅ Approve/reject individual matches
- ✅ Batch approve high-confidence matches
- ✅ Mobile-responsive UI

### Should Have (Phase 4)
- ✅ Manual link to different transaction
- ✅ Import history with audit trail
- ✅ Export match report (CSV)
- ✅ Email detail viewer
- ✅ Edit extracted data

### Nice to Have (Future)
- ⏳ Machine learning for vendor normalization
- ⏳ Auto-categorization (tags)
- ⏳ Receipt image OCR
- ⏳ Scheduled statement fetching
- ⏳ Multi-user support

### Performance Targets
- Statement processing: <30 seconds for 50 transactions
- Match accuracy: >90% for high-confidence
- User time savings: 50% reduction vs. manual entry
- Error rate: <5% failed uploads

---

## Design Decisions (Finalized)

The following decisions have been confirmed:

1. **Navigation:** ✅ Top-level "Imports" nav item (primary workflow)

2. **Auto-approve threshold:** ✅ Never auto-approve, always require user confirmation
   - Future enhancement (Phase 5): System will learn from confirmations to improve pattern recognition

3. **Email sync frequency:** ✅ Piggybacks on existing daily cron job (18:00 UTC)
   - Already integrated into `/api/cron/sync-all-rates` route
   - Manual "Sync Now" button also available

4. **Statement retention:** ✅ Keep uploaded files forever (no auto-delete)

5. **Duplicate handling:** ✅ Block with warning, show previous results

6. **Exchange rate variance:** ✅ ±2% tolerance, using stored `exchange_rates` table
   - Matches use historical rates from the database, not calculated on-the-fly

7. **Notifications:** ✅ Skip for now, add later as enhancement

---

## Next Steps

1. **Review all documents** (30 min)
2. **Approve design** or request changes
3. **Set up project tracking** (GitHub Projects, Linear, etc.)
4. **Create feature branch** (`feature/email-transaction-linking`)
5. **Start Phase 1** (database migrations)

### Estimated Timeline
- **Design review:** Week 1 (this week)
- **Phase 1-2:** Weeks 2-5 (Foundation + Core)
- **Phase 3-4:** Weeks 6-9 (UX + Advanced)
- **Testing & Launch:** Week 10

**Total: 10 weeks from approval to production**

---

## Questions?

For questions or clarifications during implementation:
1. Refer to detailed specs in the 3 documents
2. Check wireframes for visual guidance
3. Review implementation roadmap for technical details
4. Create issues for ambiguities or edge cases

---

## File Manifest

```
design-docs/
├── README.md                                       # This file
├── email-transaction-linking-system.md             # Main specification (8,000 words)
├── email-transaction-wireframes.md                 # Detailed wireframes (4,000 words)
└── email-transaction-implementation-roadmap.md     # 8-week plan (5,000 words)
```

**Total documentation:** ~17,000 words, 50+ pages

All documents are in Markdown format for easy reading and version control.

---

**Status:** ✅ Design Complete - Ready for Implementation

Let's build this! 🚀
