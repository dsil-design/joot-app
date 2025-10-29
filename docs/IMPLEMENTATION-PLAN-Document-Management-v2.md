# Document Management System: Prioritized Implementation Plan v2.0

**Project:** Joot Personal Finance Application
**Feature:** Document Management & Transaction Reconciliation
**Date:** October 29, 2025
**Timeline:** 8-12 weeks (phased delivery)
**Status:** Ready for Implementation

---

## Executive Summary

This implementation plan synthesizes UX/UI design, backend architecture, and AI/ML specifications into a cohesive, prioritized roadmap optimized for **desktop-first power users** with **basic vendor enrichment** and **manual document upload**.

### Key User Preferences Applied

1. **Desktop-First Platform Priority**
   - Large drag-drop zones for bulk uploads
   - Side-by-side comparison views for review
   - Keyboard shortcuts for power users
   - Mobile limited to camera capture (Phase 4)

2. **Silent Auto-Approval Strategy (95%+ confidence)**
   - High-confidence matches auto-approved in background
   - Clear "auto-matched" badge on transactions
   - Easy undo/correction mechanism within document library
   - User can review all auto-matches retroactively

3. **Manual Email Upload (Phase 1)**
   - Drag-drop .eml files from email client
   - Architecture designed for future email forwarding
   - No email integration required for MVP

4. **Basic Vendor Enrichment Only**
   - Extract name and logo using Brandfetch free tier
   - Skip contact details (phone/email/address)
   - Focus on visual appeal, not comprehensive data

### Expected Business Impact

- **Time Savings:** 30+ minutes per month per user
- **Error Reduction:** 50%+ fewer manual entry mistakes
- **User Retention:** +15% increase in engaged users
- **Competitive Differentiation:** Feature parity with Expensify (for personal finance)
- **ROI:** Break-even at 18 months, 97% gross margin at scale

---

## 1. Technical Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface (Next.js)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Upload       │  │ Review       │  │ Document     │      │
│  │ Interface    │  │ Queue        │  │ Library      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────┬────────────────────────────────┬───────────────┘
             │                                 │
┌────────────▼────────────────────────────────▼───────────────┐
│              API Layer (Next.js API Routes)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Upload API   │  │ Match API    │  │ Documents    │      │
│  │              │  │              │  │ API          │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────┬────────────────────────────────┬───────────────┘
             │                                 │
┌────────────▼────────────────────────────────▼───────────────┐
│                    Background Processing                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ OCR          │  │ Extraction   │  │ Matching     │      │
│  │ (Tesseract/  │  │ (Claude      │  │ (Fuse.js +   │      │
│  │  Vision)     │  │  Haiku)      │  │  Confidence) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────┬────────────────────────────────┬───────────────┘
             │                                 │
┌────────────▼────────────────────────────────▼───────────────┐
│                    Data Layer (Supabase)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │ Storage      │  │ RLS          │      │
│  │ (documents,  │  │ (S3-compat)  │  │ Policies     │      │
│  │  matches)    │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

### New Database Tables (8 total)

```sql
-- 1. Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processing_status TEXT DEFAULT 'pending', -- pending, processing, complete, failed
  extracted_data JSONB, -- {amount, date, vendor, line_items[]}
  ocr_text TEXT, -- full text for search
  is_statement BOOLEAN DEFAULT false,
  parent_statement_id UUID REFERENCES documents(id), -- for virtual receipts
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Document matches (tracking suggestions and decisions)
CREATE TABLE document_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  match_status TEXT DEFAULT 'pending', -- pending, approved, rejected, auto_approved
  confidence_score DECIMAL(5,2) NOT NULL, -- 0.00 to 100.00
  matching_factors JSONB, -- {amount_match: true, date_diff: 0, vendor_similarity: 0.95}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT, -- 'user' or 'auto'
  UNIQUE(document_id, transaction_id)
);

-- 3. Add document_ids to transactions (JSONB array)
ALTER TABLE transactions
  ADD COLUMN document_ids JSONB DEFAULT '[]',
  ADD COLUMN is_verified BOOLEAN DEFAULT false,
  ADD COLUMN auto_matched_at TIMESTAMPTZ;

-- 4. Processing jobs (track background tasks)
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL, -- 'ocr', 'extraction', 'matching'
  status TEXT DEFAULT 'queued', -- queued, processing, complete, failed
  progress INTEGER DEFAULT 0, -- 0-100
  error_message TEXT,
  result JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Vendor enrichments (cache for logo/category)
CREATE TABLE vendor_enrichments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  logo_url TEXT,
  category TEXT,
  enrichment_source TEXT, -- 'brandfetch', 'manual'
  enriched_at TIMESTAMPTZ DEFAULT NOW(),
  cache_expires_at TIMESTAMPTZ,
  UNIQUE(vendor_id)
);

-- 6. User document preferences
CREATE TABLE user_document_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  auto_approve_threshold DECIMAL(5,2) DEFAULT 95.00,
  date_tolerance_days INTEGER DEFAULT 3,
  amount_tolerance_percent DECIMAL(5,2) DEFAULT 1.00,
  enable_auto_approval BOOLEAN DEFAULT true,
  notify_on_auto_match BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Audit log for document operations
CREATE TABLE document_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'upload', 'match', 'unmatch', 'delete', 'auto_approve'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Email parsing cache (for .eml file processing)
CREATE TABLE email_metadata_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE UNIQUE,
  sender_email TEXT,
  sender_name TEXT,
  subject TEXT,
  received_date TIMESTAMPTZ,
  attachment_count INTEGER DEFAULT 0,
  extracted_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Technology Stack

**Frontend:**
- Next.js 13+ with App Router (existing)
- React 18 with TypeScript
- Tailwind CSS (existing design system)
- react-dropzone (drag-drop uploads)
- react-pdf (document preview)
- shadcn/ui components (existing)

**Backend:**
- Next.js API Routes
- Supabase PostgreSQL (existing)
- Supabase Storage (S3-compatible)
- Bull/BullMQ with Redis (background jobs)
- WebSocket (real-time status updates)

**AI/ML:**
- Tesseract.js (local OCR - free)
- Google Cloud Vision API (fallback OCR - $1.50/1k)
- Claude 3.5 Haiku (extraction - $0.25/1M tokens)
- Fuse.js (fuzzy matching - local)
- Brandfetch API (vendor logos - free tier)

**Cost:** ~$0.03 per document processed

---

## 2. Implementation Phases

### Phase 1: Core Upload & Storage (Weeks 1-3)
**Goal:** Users can upload documents and see them in a library
**Effort:** Medium (M)
**Risk:** Low

#### Backend Tasks (Week 1-2)

**1.1 Database Schema Setup** [Size: M]
- [ ] Create all 8 new tables with RLS policies
- [ ] Add indexes for performance
- [ ] Write migration script
- [ ] Test rollback procedure
- [ ] Update TypeScript types

**Files to Create:**
```
/database/migrations/20251029000000_add_document_management.sql
/src/types/documents.ts
```

**1.2 Storage Integration** [Size: M]
- [ ] Configure Supabase Storage bucket: `user-documents`
- [ ] Set up folder structure: `{user_id}/{year}/{month}/{filename}`
- [ ] Implement file encryption at rest (AES-256)
- [ ] Create signed URL generation for downloads
- [ ] Set file size limits (10MB per file, 50MB per upload batch)

**Files to Create:**
```
/src/lib/storage/document-storage.ts
/src/lib/storage/document-encryption.ts
```

**1.3 Upload API** [Size: M]
- [ ] POST `/api/documents/upload` - Accept multipart/form-data
- [ ] File validation (type, size, virus scan)
- [ ] Store in Supabase Storage
- [ ] Create database record with metadata
- [ ] Return document ID and processing status
- [ ] Handle batch uploads (up to 10 files)

**Files to Create:**
```
/src/app/api/documents/upload/route.ts
/src/lib/validation/file-validation.ts
```

**1.4 Retrieval APIs** [Size: S]
- [ ] GET `/api/documents` - List with pagination, filtering, sorting
- [ ] GET `/api/documents/[id]` - Single document with metadata
- [ ] GET `/api/documents/[id]/download` - Generate signed URL
- [ ] DELETE `/api/documents/[id]` - Soft delete with audit log

**Files to Create:**
```
/src/app/api/documents/route.ts
/src/app/api/documents/[id]/route.ts
/src/app/api/documents/[id]/download/route.ts
```

#### Frontend Tasks (Week 2-3)

**1.5 Upload Interface Component** [Size: L]
- [ ] Drag-drop zone with `react-dropzone`
- [ ] Multi-file selection
- [ ] Client-side validation
- [ ] Upload progress bars (per file)
- [ ] Error handling and retry
- [ ] Success notification with redirect to library

**Files to Create:**
```
/src/components/documents/upload-zone.tsx
/src/components/documents/file-upload-card.tsx
/src/hooks/use-document-upload.ts
```

**1.6 Document Library Page** [Size: L]
- [ ] Table view with sortable columns
- [ ] Grid view toggle
- [ ] Filters: date range, file type, status
- [ ] Pagination (20 items per page)
- [ ] Search by filename
- [ ] Bulk select and delete

**Files to Create:**
```
/src/app/(authenticated)/documents/page.tsx
/src/components/documents/document-list.tsx
/src/components/documents/document-filters.tsx
```

**1.7 Document Preview Modal** [Size: M]
- [ ] PDF preview with `react-pdf`
- [ ] Image preview with zoom
- [ ] Metadata display (size, type, uploaded date)
- [ ] Download button
- [ ] Delete button with confirmation

**Files to Create:**
```
/src/components/documents/document-preview-modal.tsx
/src/components/documents/pdf-viewer.tsx
```

#### Testing Requirements

- [ ] Unit tests for API endpoints
- [ ] Integration tests for upload flow
- [ ] File type validation tests
- [ ] Security tests (file injection, XSS)
- [ ] Performance tests with 10+ files
- [ ] Real device testing (Chrome, Firefox, Safari)

#### Success Criteria

- ✅ Users can upload PDF, JPG, PNG, EML files up to 10MB
- ✅ Upload success rate >99%
- ✅ Files appear in library within 2 seconds
- ✅ Download works on all browsers
- ✅ Bulk upload handles 10 files simultaneously
- ✅ RLS prevents cross-user access

---

### Phase 2: Processing & Extraction (Weeks 4-6)
**Goal:** Extract transaction data from documents automatically
**Effort:** Large (L)
**Risk:** Medium

#### Backend Tasks (Week 4-5)

**2.1 Background Job Queue Setup** [Size: M]
- [ ] Install and configure Bull/BullMQ with Redis
- [ ] Create job types: `ocr`, `extraction`, `matching`
- [ ] Set up job retry logic (3 attempts)
- [ ] Implement job progress tracking
- [ ] Create webhook for status updates

**Files to Create:**
```
/src/lib/jobs/queue.ts
/src/lib/jobs/processors/ocr-processor.ts
/src/lib/jobs/processors/extraction-processor.ts
```

**2.2 OCR Integration** [Size: L]
- [ ] Integrate Tesseract.js for local OCR (primary)
- [ ] Integrate Google Cloud Vision API (fallback)
- [ ] Document type detection (receipt vs statement vs email)
- [ ] Image preprocessing (deskew, contrast, denoise)
- [ ] Extract full text and store in `documents.ocr_text`
- [ ] Calculate OCR confidence score

**Files to Create:**
```
/src/lib/ocr/tesseract-ocr.ts
/src/lib/ocr/google-vision-ocr.ts
/src/lib/ocr/ocr-router.ts (decides which OCR to use)
/src/lib/ocr/image-preprocessing.ts
```

**2.3 AI Extraction Pipeline** [Size: XL]
- [ ] Integrate Claude 3.5 Haiku API
- [ ] Create structured extraction prompt
- [ ] Extract: amount, currency, date, vendor name, order ID
- [ ] Handle multiple date formats
- [ ] Handle multiple currency formats (THB, USD, ฿, $)
- [ ] Calculate extraction confidence per field
- [ ] Store in `documents.extracted_data` (JSONB)

**Files to Create:**
```
/src/lib/ai/claude-extractor.ts
/src/lib/ai/extraction-prompts.ts
/src/lib/ai/extraction-schema.ts (Zod schemas)
/src/lib/ai/confidence-calculator.ts
```

**2.4 Email Parser (for .eml files)** [Size: M]
- [ ] Parse .eml file headers (sender, subject, date)
- [ ] Extract embedded HTML receipts
- [ ] Detect common vendors (Grab, Lazada, Shopee, Amazon)
- [ ] Vendor-specific extraction rules
- [ ] Store metadata in `email_metadata_cache`

**Files to Create:**
```
/src/lib/parsers/eml-parser.ts
/src/lib/parsers/vendor-parsers/grab-parser.ts
/src/lib/parsers/vendor-parsers/lazada-parser.ts
/src/lib/parsers/vendor-parsers/amazon-parser.ts
```

**2.5 Statement Line Item Extraction** [Size: L]
- [ ] Detect multi-transaction documents (bank statements)
- [ ] Extract all line items with amounts, dates
- [ ] Create virtual receipts (separate document records)
- [ ] Link virtual receipts to parent statement
- [ ] Set `documents.is_statement = true` for parent

**Files to Create:**
```
/src/lib/parsers/statement-parser.ts
/src/lib/parsers/statement-detector.ts
```

#### Frontend Tasks (Week 5-6)

**2.6 Processing Status UI** [Size: M]
- [ ] Real-time processing indicators
- [ ] WebSocket connection for status updates
- [ ] Progress bar per document
- [ ] Status badges (uploading, processing, complete, failed)
- [ ] Expandable error details

**Files to Create:**
```
/src/components/documents/processing-status.tsx
/src/hooks/use-document-processing.ts (WebSocket hook)
```

**2.7 Extracted Data Display** [Size: M]
- [ ] Show extracted fields with confidence badges
- [ ] Highlight low-confidence fields (<80%)
- [ ] Side-by-side view: document preview + extracted data
- [ ] Manual correction form
- [ ] "Re-extract" button for failed extractions

**Files to Create:**
```
/src/components/documents/extracted-data-panel.tsx
/src/components/documents/confidence-badge.tsx
/src/components/documents/manual-correction-form.tsx
```

**2.8 Settings Page** [Size: S]
- [ ] User preferences form
- [ ] Auto-approve threshold slider (90-99%)
- [ ] Date tolerance setting (0-7 days)
- [ ] Amount tolerance setting (0-5%)
- [ ] Enable/disable auto-approval toggle
- [ ] Notification preferences

**Files to Create:**
```
/src/app/(authenticated)/settings/documents/page.tsx
/src/components/settings/document-preferences-form.tsx
```

#### Testing Requirements

- [ ] OCR accuracy tests with 20+ sample receipts
- [ ] Extraction accuracy tests per field type
- [ ] Email parser tests for common vendors
- [ ] Statement detection tests
- [ ] Job queue failure/retry tests
- [ ] WebSocket connection stability tests

#### Success Criteria

- ✅ OCR accuracy >90% for clear images
- ✅ Extraction accuracy >85% for structured documents (emails)
- ✅ Extraction accuracy >75% for photos
- ✅ Processing time <30 seconds per document
- ✅ Job failure rate <2%
- ✅ Users can manually correct extracted data

---

### Phase 3: Matching & Reconciliation (Weeks 7-9)
**Goal:** Automatically match documents to transactions with user review
**Effort:** Extra Large (XL)
**Risk:** Medium-High

#### Backend Tasks (Week 7-8)

**3.1 Matching Algorithm** [Size: XL]
- [ ] Amount matching (exact + tolerance)
- [ ] Date matching (exact + ±N days)
- [ ] Vendor fuzzy matching (Fuse.js, Levenshtein distance)
- [ ] Combined confidence scoring
- [ ] Handle multiple possible matches (rank by confidence)
- [ ] Store match suggestions in `document_matches`

**Matching Logic:**
```typescript
function calculateMatchConfidence(doc, txn, preferences): number {
  let score = 0;

  // Amount match (40% weight)
  const amountDiff = Math.abs(doc.amount - txn.amount) / txn.amount;
  if (amountDiff <= preferences.amount_tolerance_percent / 100) {
    score += 40 * (1 - amountDiff / (preferences.amount_tolerance_percent / 100));
  }

  // Date match (30% weight)
  const daysDiff = Math.abs(dateDiff(doc.date, txn.date));
  if (daysDiff <= preferences.date_tolerance_days) {
    score += 30 * (1 - daysDiff / preferences.date_tolerance_days);
  }

  // Vendor match (30% weight)
  const vendorSimilarity = fuzzyMatch(doc.vendor, txn.vendor);
  score += 30 * vendorSimilarity;

  return Math.round(score * 100) / 100;
}
```

**Files to Create:**
```
/src/lib/matching/match-algorithm.ts
/src/lib/matching/fuzzy-matching.ts
/src/lib/matching/confidence-calculator.ts
```

**3.2 Auto-Approval Logic** [Size: M]
- [ ] Check user preferences `auto_approve_threshold`
- [ ] Auto-approve matches ≥ threshold (default 95%)
- [ ] Create audit log entry
- [ ] Update transaction: add document_id, set `auto_matched_at`
- [ ] Send notification if enabled
- [ ] Allow undo within 24 hours

**Files to Create:**
```
/src/lib/matching/auto-approver.ts
/src/lib/notifications/match-notifications.ts
```

**3.3 Matching APIs** [Size: L]
- [ ] POST `/api/documents/[id]/match` - Find matches for document
- [ ] GET `/api/matches/review-queue` - Get pending matches (paginated)
- [ ] POST `/api/matches/[id]/approve` - User approves match
- [ ] POST `/api/matches/[id]/reject` - User rejects match
- [ ] POST `/api/matches/bulk-approve` - Approve multiple matches
- [ ] POST `/api/transactions/create-from-document/[id]` - Create new transaction

**Files to Create:**
```
/src/app/api/documents/[id]/match/route.ts
/src/app/api/matches/review-queue/route.ts
/src/app/api/matches/[id]/approve/route.ts
/src/app/api/matches/[id]/reject/route.ts
/src/app/api/matches/bulk-approve/route.ts
/src/app/api/transactions/create-from-document/[id]/route.ts
```

**3.4 Transaction Verification** [Size: S]
- [ ] Add "auto-matched" badge to transactions
- [ ] Show document thumbnail in transaction list
- [ ] Allow "unmatch" action (undo)
- [ ] Mark transaction as `is_verified = true`
- [ ] Track who verified (user or auto)

**Files to Modify:**
```
/src/components/transactions/transaction-card.tsx (add badge)
/src/app/api/transactions/[id]/route.ts (add unmatch endpoint)
```

#### Frontend Tasks (Week 8-9)

**3.5 Review Queue Interface** [Size: XL]
- [ ] Split view layout: Unmatched (left) | Matched (right)
- [ ] Confidence badge on each match card
- [ ] Filter by confidence level
- [ ] Sort by date, confidence, amount
- [ ] Bulk select checkboxes
- [ ] "Approve All High Confidence" button (≥95%)
- [ ] Real-time updates when matches are processed

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Review Queue          [Filters▼]  [Sort: Confidence▼]       │
├──────────────────────────┬──────────────────────────────────┤
│ Unmatched (12)           │ Matched (45)                     │
│                          │                                   │
│ ┌────────────────────┐  │ ┌─────────────────────────────┐  │
│ │ 📄 Receipt.pdf     │  │ │ ✅ 98% │ Grab Receipt      │  │
│ │ ฿234.50            │  │ │ ฿234.50 → Transaction     │  │
│ │ Oct 15, 2025       │  │ │ [View] [Approve]          │  │
│ └────────────────────┘  │ └─────────────────────────────┘  │
│ ...                      │ ...                              │
└──────────────────────────┴──────────────────────────────────┘
```

**Files to Create:**
```
/src/app/(authenticated)/documents/review/page.tsx
/src/components/documents/review-queue.tsx
/src/components/documents/match-card.tsx
/src/components/documents/split-view-layout.tsx
```

**3.6 Comparison Modal** [Size: L]
- [ ] Side-by-side: document preview + transaction detail
- [ ] Highlight matching fields (green) and conflicts (yellow)
- [ ] Show matching factors explanation
- [ ] Confidence score breakdown
- [ ] Edit transaction button
- [ ] Approve/Reject buttons
- [ ] Keyboard shortcuts (A = approve, R = reject)

**Files to Create:**
```
/src/components/documents/comparison-modal.tsx
/src/components/documents/match-factors-panel.tsx
```

**3.7 Create Transaction from Document** [Size: M]
- [ ] Pre-filled transaction form with extracted data
- [ ] Auto-suggest vendor (fuzzy match existing vendors)
- [ ] Auto-suggest payment method
- [ ] Auto-attach document on creation
- [ ] Mark document as processed

**Files to Create:**
```
/src/components/documents/create-transaction-from-doc.tsx
```

**3.8 Auto-Match Notifications** [Size: S]
- [ ] Toast notification: "5 documents auto-matched"
- [ ] Click to view matched transactions
- [ ] In-app notification center
- [ ] "Undo" button in notification (24-hour window)

**Files to Create:**
```
/src/components/notifications/auto-match-notification.tsx
/src/hooks/use-match-notifications.ts
```

#### Testing Requirements

- [ ] Matching accuracy tests with historical data
- [ ] False positive rate measurement
- [ ] Auto-approval logic tests
- [ ] Undo functionality tests
- [ ] Bulk operations tests
- [ ] User acceptance testing with beta users

#### Success Criteria

- ✅ Matching accuracy >85% (true positive rate)
- ✅ False positive rate <5%
- ✅ Average time to review document <2 minutes
- ✅ 70%+ of documents auto-matched with ≥95% confidence
- ✅ Users can review 20+ matches in <5 minutes
- ✅ Undo works correctly within 24 hours

---

### Phase 4: Polish & Advanced Features (Weeks 10-12)
**Goal:** Add vendor enrichment, mobile capture, polish UX
**Effort:** Large (L)
**Risk:** Low

#### Backend Tasks (Week 10)

**4.1 Vendor Enrichment Service** [Size: M]
- [ ] Integrate Brandfetch API (free tier)
- [ ] Extract vendor logo from documents
- [ ] Detect vendor category
- [ ] Store in `vendor_enrichments` table
- [ ] Cache results (permanent)
- [ ] Suggest enrichments to user

**Files to Create:**
```
/src/lib/enrichment/brandfetch-client.ts
/src/lib/enrichment/vendor-enricher.ts
/src/app/api/vendors/[id]/enrich/route.ts
```

**4.2 Advanced Search** [Size: M]
- [ ] Full-text search on `documents.ocr_text`
- [ ] PostgreSQL `tsvector` indexing
- [ ] Filter by: date range, amount range, vendor, status
- [ ] Saved searches
- [ ] Search within matched/unmatched

**Files to Create:**
```
/src/app/api/documents/search/route.ts
/src/lib/search/document-search.ts
```

**4.3 Performance Optimizations** [Size: M]
- [ ] Database query optimization (N+1 prevention)
- [ ] Add composite indexes for common queries
- [ ] API response caching (Redis)
- [ ] Image thumbnail generation (150x150px)
- [ ] Lazy loading for document library

**Files to Modify:**
```
/database/migrations/20251115000000_add_performance_indexes.sql
/src/lib/cache/redis-cache.ts
/src/lib/storage/thumbnail-generator.ts
```

#### Frontend Tasks (Week 11)

**4.4 Vendor Enrichment UI** [Size: S]
- [ ] "Pending enrichments" section in vendors page
- [ ] Preview extracted logo
- [ ] Approve/ignore suggestion
- [ ] Bulk approve enrichments

**Files to Create:**
```
/src/app/(authenticated)/vendors/enrichments/page.tsx
/src/components/vendors/enrichment-card.tsx
```

**4.5 Mobile Camera Capture** [Size: M]
- [ ] Camera access (WebRTC or device API)
- [ ] Photo capture interface
- [ ] Auto-crop and enhance
- [ ] Upload to processing queue
- [ ] Success confirmation

**Files to Create:**
```
/src/app/(authenticated)/documents/camera/page.tsx
/src/components/documents/camera-capture.tsx
/src/lib/image/auto-crop.ts
```

**4.6 Advanced Search Interface** [Size: M]
- [ ] Search input with autocomplete
- [ ] Multi-select filters
- [ ] Saved searches dropdown
- [ ] Search results highlighting

**Files to Create:**
```
/src/components/documents/search-bar.tsx
/src/components/documents/advanced-filters.tsx
```

**4.7 Keyboard Shortcuts** [Size: S]
- [ ] `U` - Upload documents
- [ ] `R` - Go to review queue
- [ ] `A` - Approve selected match
- [ ] `J` - Reject selected match
- [ ] `/` - Focus search
- [ ] `?` - Show keyboard shortcuts modal

**Files to Create:**
```
/src/hooks/use-keyboard-shortcuts.ts
/src/components/documents/keyboard-shortcuts-modal.tsx
```

#### Polish Tasks (Week 12)

**4.8 Accessibility Audit** [Size: M]
- [ ] Run Lighthouse accessibility tests
- [ ] Ensure WCAG 2.1 AA compliance
- [ ] Add ARIA labels
- [ ] Keyboard navigation testing
- [ ] Screen reader testing
- [ ] Focus indicators
- [ ] High contrast mode support

**4.9 Performance Audit** [Size: M]
- [ ] Run Lighthouse performance tests
- [ ] Target: >90 score on desktop
- [ ] Bundle size optimization
- [ ] Code splitting
- [ ] Image optimization
- [ ] Lazy loading components

**4.10 User Onboarding** [Size: M]
- [ ] First-time user tutorial (Joyride or Intro.js)
- [ ] Highlight key features
- [ ] Sample document upload walkthrough
- [ ] Help tooltips
- [ ] "What's New" modal for feature announcement

**Files to Create:**
```
/src/components/onboarding/document-tutorial.tsx
/src/components/onboarding/feature-announcement.tsx
```

#### Testing Requirements

- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device testing (iOS Safari, Android Chrome)
- [ ] Accessibility audit with screen readers
- [ ] Performance testing with 1000+ documents
- [ ] Load testing with concurrent users
- [ ] End-to-end testing of all flows

#### Success Criteria

- ✅ Vendor logos enriched for 50%+ of documents
- ✅ Mobile camera capture works on iOS and Android
- ✅ Search returns results in <500ms
- ✅ Document library scrolls smoothly (60fps)
- ✅ WCAG 2.1 AA compliance
- ✅ Lighthouse score >90 (desktop)
- ✅ Page load time <3 seconds

---

## 3. File Structure

New files to be created (estimated 80+ files):

```
joot-app/
├── database/
│   └── migrations/
│       ├── 20251029000000_add_document_management.sql
│       ├── 20251105000000_add_document_indexes.sql
│       └── 20251115000000_add_performance_indexes.sql
├── src/
│   ├── app/
│   │   ├── (authenticated)/
│   │   │   ├── documents/
│   │   │   │   ├── page.tsx                   # Document library
│   │   │   │   ├── upload/
│   │   │   │   │   └── page.tsx               # Upload interface
│   │   │   │   ├── review/
│   │   │   │   │   └── page.tsx               # Review queue
│   │   │   │   ├── camera/
│   │   │   │   │   └── page.tsx               # Mobile camera
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx               # Document detail
│   │   │   ├── settings/
│   │   │   │   └── documents/
│   │   │   │       └── page.tsx               # Preferences
│   │   │   └── vendors/
│   │   │       └── enrichments/
│   │   │           └── page.tsx               # Vendor enrichments
│   │   └── api/
│   │       ├── documents/
│   │       │   ├── upload/
│   │       │   │   └── route.ts
│   │       │   ├── search/
│   │       │   │   └── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── download/
│   │       │       │   └── route.ts
│   │       │       └── match/
│   │       │           └── route.ts
│   │       ├── matches/
│   │       │   ├── review-queue/
│   │       │   │   └── route.ts
│   │       │   ├── bulk-approve/
│   │       │   │   └── route.ts
│   │       │   └── [id]/
│   │       │       ├── approve/
│   │       │       │   └── route.ts
│   │       │       └── reject/
│   │       │           └── route.ts
│   │       ├── transactions/
│   │       │   └── create-from-document/
│   │       │       └── [id]/
│   │       │           └── route.ts
│   │       └── vendors/
│   │           └── [id]/
│   │               └── enrich/
│   │                   └── route.ts
│   ├── components/
│   │   ├── documents/
│   │   │   ├── upload-zone.tsx
│   │   │   ├── file-upload-card.tsx
│   │   │   ├── document-list.tsx
│   │   │   ├── document-filters.tsx
│   │   │   ├── document-preview-modal.tsx
│   │   │   ├── pdf-viewer.tsx
│   │   │   ├── processing-status.tsx
│   │   │   ├── extracted-data-panel.tsx
│   │   │   ├── confidence-badge.tsx
│   │   │   ├── manual-correction-form.tsx
│   │   │   ├── review-queue.tsx
│   │   │   ├── match-card.tsx
│   │   │   ├── split-view-layout.tsx
│   │   │   ├── comparison-modal.tsx
│   │   │   ├── match-factors-panel.tsx
│   │   │   ├── create-transaction-from-doc.tsx
│   │   │   ├── camera-capture.tsx
│   │   │   ├── search-bar.tsx
│   │   │   ├── advanced-filters.tsx
│   │   │   └── keyboard-shortcuts-modal.tsx
│   │   ├── vendors/
│   │   │   └── enrichment-card.tsx
│   │   ├── settings/
│   │   │   └── document-preferences-form.tsx
│   │   ├── notifications/
│   │   │   └── auto-match-notification.tsx
│   │   └── onboarding/
│   │       ├── document-tutorial.tsx
│   │       └── feature-announcement.tsx
│   ├── hooks/
│   │   ├── use-document-upload.ts
│   │   ├── use-document-processing.ts
│   │   ├── use-match-notifications.ts
│   │   └── use-keyboard-shortcuts.ts
│   ├── lib/
│   │   ├── storage/
│   │   │   ├── document-storage.ts
│   │   │   ├── document-encryption.ts
│   │   │   └── thumbnail-generator.ts
│   │   ├── validation/
│   │   │   └── file-validation.ts
│   │   ├── jobs/
│   │   │   ├── queue.ts
│   │   │   └── processors/
│   │   │       ├── ocr-processor.ts
│   │   │       ├── extraction-processor.ts
│   │   │       └── matching-processor.ts
│   │   ├── ocr/
│   │   │   ├── tesseract-ocr.ts
│   │   │   ├── google-vision-ocr.ts
│   │   │   ├── ocr-router.ts
│   │   │   └── image-preprocessing.ts
│   │   ├── ai/
│   │   │   ├── claude-extractor.ts
│   │   │   ├── extraction-prompts.ts
│   │   │   ├── extraction-schema.ts
│   │   │   └── confidence-calculator.ts
│   │   ├── parsers/
│   │   │   ├── eml-parser.ts
│   │   │   ├── statement-parser.ts
│   │   │   ├── statement-detector.ts
│   │   │   └── vendor-parsers/
│   │   │       ├── grab-parser.ts
│   │   │       ├── lazada-parser.ts
│   │   │       ├── shopee-parser.ts
│   │   │       └── amazon-parser.ts
│   │   ├── matching/
│   │   │   ├── match-algorithm.ts
│   │   │   ├── fuzzy-matching.ts
│   │   │   ├── confidence-calculator.ts
│   │   │   └── auto-approver.ts
│   │   ├── enrichment/
│   │   │   ├── brandfetch-client.ts
│   │   │   └── vendor-enricher.ts
│   │   ├── notifications/
│   │   │   └── match-notifications.ts
│   │   ├── search/
│   │   │   └── document-search.ts
│   │   ├── cache/
│   │   │   └── redis-cache.ts
│   │   └── image/
│   │       └── auto-crop.ts
│   └── types/
│       ├── documents.ts
│       ├── matches.ts
│       └── extraction.ts
└── docs/
    └── IMPLEMENTATION-PLAN-Document-Management-v2.md (this file)
```

**Total new files:** ~85 files
**Modified existing files:** ~10 files

---

## 4. Risk Assessment & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **OCR accuracy insufficient** | Medium | High | Start with vendor-specific parsers for structured documents; manual entry always available; improve prompts iteratively |
| **Matching false positives** | Medium | High | Conservative thresholds (95%+); require user review queue; easy undo; audit log all actions |
| **Cloud costs exceed budget** | Low | Medium | File size limits (10MB); aggressive caching; Tesseract-first strategy; budget alerts at 80% |
| **Background job queue failures** | Low | High | Retry logic (3 attempts); dead letter queue; monitoring alerts; manual reprocessing UI |
| **API rate limits (Claude/Vision)** | Low | Medium | Request queuing; fallback to slower processing; user notification of delays |
| **Storage costs escalate** | Low | Medium | Archival policy (compress old docs); user storage quotas; premium tiers for heavy users |

### Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Users don't trust auto-approval** | Medium | High | Transparent confidence scores; show matching factors; allow opt-out; audit log visible; 24hr undo window |
| **Feature complexity overwhelms users** | Medium | Medium | Onboarding tutorial; progressive disclosure; simple defaults; help tooltips; keyboard shortcuts optional |
| **Low adoption rate** | Low | High | Solve real pain point (proven by research); beta testing first; feature announcement; in-app prompts |
| **Desktop-first alienates mobile users** | Low | Medium | Camera capture for quick receipts; mobile view optimized; desktop redirect for review; expectation setting |

### Security Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Document data breach** | Very Low | Critical | Encryption at rest (AES-256); TLS 1.3 in transit; RLS policies; SOC 2 compliance path; regular audits |
| **File upload vulnerabilities** | Low | High | File type validation; virus scanning; size limits; content-type checking; sandboxed processing |
| **Privacy concerns (GDPR)** | Low | High | User owns data; easy deletion (cascade); no third-party training; opt-out of cloud OCR; data export |
| **Cross-user access** | Very Low | Critical | RLS policies on all tables; user_id validation in APIs; signed URLs with expiration; audit logging |

---

## 5. Success Metrics & KPIs

### Adoption Metrics (Track Weekly)

| Metric | Target (Month 1) | Target (Month 3) | Measurement Method |
|--------|------------------|------------------|--------------------|
| % of active users who upload ≥1 document | 20% | 50% | `COUNT(DISTINCT user_id) FROM documents` |
| Average documents uploaded per user | 3 | 10+ | `AVG(doc_count) FROM user_stats` |
| % of transactions with attached documents | 10% | 40% | `COUNT(WHERE document_ids IS NOT NULL)` |

### Efficiency Metrics (Track Daily)

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Average time to reconcile document | <2 min | Track from document upload to match approval |
| % of documents requiring manual review | <30% | `COUNT(WHERE confidence < 95) / COUNT(*)` |
| Clicks to approve high-confidence match | <3 | Frontend analytics (PostHog) |
| Upload success rate | >99% | `COUNT(status = 'complete') / COUNT(*)` |

### Accuracy Metrics (Track Weekly, Improve Monthly)

| Metric | Target (Launch) | Target (Month 3) | Measurement Method |
|--------|-----------------|------------------|--------------------|
| OCR accuracy (clear images) | >85% | >90% | Manual review of 100 sample docs |
| Extraction accuracy (amount/date/vendor) | >80% | >85% | User corrections tracked |
| Matching accuracy (true positives) | >85% | >90% | User approvals vs rejections ratio |
| False positive rate | <5% | <3% | User-reported mismatches |

### User Satisfaction (Survey Monthly)

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Feature satisfaction rating | 4.5/5 | In-app survey (NPS-style) |
| Would recommend to friend | 80%+ | Post-interaction survey |
| Support tickets per 100 users | <5 | Support ticket tagging |
| Feature usage retention (30-day) | >60% | Users who upload in Week 1 and Week 4 |

### Technical Performance (Monitor Real-Time)

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Upload API p95 response time | <2s | >5s |
| Processing time per document | <30s | >60s |
| Document library load time | <2s | >4s |
| API uptime | >99.9% | <99% |
| Background job failure rate | <2% | >5% |

---

## 6. Resource Requirements

### Team Composition (12 weeks)

**Development Team:**
- **1 Full-Stack Engineer** (12 weeks full-time)
  - Backend APIs, database, integrations
  - Estimated cost: $30,000 (at $100/hr)

- **1 Frontend Engineer** (12 weeks full-time)
  - React components, UI implementation
  - Estimated cost: $30,000 (at $100/hr)

- **1 QA Engineer** (8 weeks, Weeks 5-12)
  - Testing, accessibility audit, bug reporting
  - Estimated cost: $16,000 (at $80/hr)

**Part-Time Contributors:**
- **1 UX Designer** (3 weeks full-time equivalent, spread over 12 weeks)
  - Design system updates, user testing
  - Estimated cost: $9,000 (at $120/hr for 75 hours)

- **1 DevOps Engineer** (1 week equivalent, spread over 12 weeks)
  - Redis setup, job queue config, monitoring
  - Estimated cost: $4,000 (at $100/hr for 40 hours)

**Total Team Cost:** ~$89,000

### External Services (Annual Costs)

| Service | Purpose | Cost |
|---------|---------|------|
| **Supabase Storage** | Document storage (100GB) | $600/year ($50/month) |
| **Google Cloud Vision** | Fallback OCR (30% of docs) | $1,800/year ($150/month) |
| **Claude API (Haiku)** | Data extraction | $1,200/year ($100/month) |
| **Redis/Upstash** | Job queue, caching | $480/year ($40/month) |
| **Brandfetch API** | Vendor logos (free tier) | $0/year |
| **Sentry** | Error monitoring | $300/year ($25/month) |
| **PostHog** | Product analytics | $240/year ($20/month) |

**Total Annual Operating Cost:** ~$4,620
**Monthly:** ~$385

### Scaling Costs (per 1,000 users)

| Users | Docs/Month | Storage | OCR | Extraction | Total/Month |
|-------|------------|---------|-----|------------|-------------|
| 100 | 500 | $5 | $8 | $10 | $23 |
| 1,000 | 5,000 | $50 | $75 | $100 | $225 |
| 10,000 | 50,000 | $500 | $750 | $1,000 | $2,250 |

**Gross Margin:** 70-80% (assuming Pro tier at $10/month)

### User Research Budget

| Activity | Cost | Timeline |
|----------|------|----------|
| **Concept testing** (n=8 users) | $800 | Week 0 (pre-dev) |
| **Beta testing incentives** (n=30 users) | $1,500 | Week 10-12 |
| **User interviews** (n=10 users) | $500 | Month 3 post-launch |
| **Testing tools** (UserTesting, Lookback) | $600 | 3 months |

**Total Research Budget:** ~$3,400

### Total Investment Summary

| Category | Cost |
|----------|------|
| **Development Team** | $89,000 |
| **External Services (Year 1)** | $4,620 |
| **User Research** | $3,400 |
| **Contingency (10%)** | $9,700 |
| **TOTAL** | **$106,720** |

**Expected ROI:**
- Incremental revenue: $42,000/year (from retention + upsells)
- Break-even: ~30 months
- 5-year NPV: $120,000+ (assuming 70% margins)

---

## 7. Dependencies & Prerequisites

### Before Phase 1

**Infrastructure:**
- [ ] Supabase Storage bucket created and configured
- [ ] Redis instance provisioned (Upstash or self-hosted)
- [ ] API keys obtained: Claude (Anthropic), Google Cloud Vision
- [ ] Brandfetch API key (free tier)
- [ ] Sentry project created
- [ ] PostHog project created

**Design:**
- [ ] Design system updated with new components
- [ ] Figma mockups finalized
- [ ] User testing prototype ready

**Development:**
- [ ] Staging environment set up
- [ ] CI/CD pipeline updated for new routes
- [ ] Feature flag system configured

### Before Phase 2

- [ ] Phase 1 deployed and validated
- [ ] Bull/BullMQ queue configured
- [ ] Redis connection tested
- [ ] WebSocket infrastructure ready
- [ ] OCR accuracy baseline measured

### Before Phase 3

- [ ] Phase 2 deployed and validated
- [ ] Extraction accuracy >80%
- [ ] 100+ documents processed successfully
- [ ] User feedback collected

### Before Phase 4

- [ ] Phase 3 deployed and validated
- [ ] Matching accuracy >85%
- [ ] Beta testing with 20-30 users
- [ ] No critical bugs

---

## 8. Launch Checklist

### Pre-Launch (Week 11)

**Technical:**
- [ ] All Phase 1-3 features complete and tested
- [ ] Phase 4 features 80% complete (polish ongoing)
- [ ] Database migrations tested on staging
- [ ] RLS policies verified
- [ ] API rate limits configured
- [ ] Error monitoring active (Sentry)
- [ ] Analytics tracking implemented (PostHog)

**Security:**
- [ ] Security audit passed (file upload, XSS, RLS)
- [ ] Penetration testing complete
- [ ] Data encryption verified
- [ ] Privacy policy updated

**Performance:**
- [ ] Lighthouse score >90 (desktop)
- [ ] Lighthouse score >80 (mobile)
- [ ] Load testing passed (100 concurrent users)
- [ ] Database query optimization complete

**Quality:**
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Cross-browser testing complete
- [ ] Mobile device testing complete
- [ ] User acceptance testing with beta users (n=20)

**Documentation:**
- [ ] User guide written
- [ ] Help center articles created
- [ ] FAQs documented
- [ ] API documentation complete (for future integrations)
- [ ] Rollback procedure documented

### Launch Day (Week 12)

**Deployment:**
- [ ] Deploy to production with feature flag OFF
- [ ] Verify database migrations
- [ ] Verify storage bucket access
- [ ] Enable for internal team (dogfooding, 24 hours)
- [ ] Monitor logs for errors

**Canary Rollout:**
- [ ] Enable for 10% of users (randomly selected)
- [ ] Monitor metrics for 48 hours:
  - Upload success rate >99%
  - Processing time <30s
  - No critical errors
  - User engagement positive
- [ ] If stable, enable for 50% of users
- [ ] Monitor for 48 hours
- [ ] If stable, enable for 100% of users

**Communication:**
- [ ] In-app announcement banner
- [ ] Email to all users
- [ ] Blog post published
- [ ] Social media posts
- [ ] Help center updated

### Post-Launch (Week 13+)

**Monitoring (Daily for 2 weeks):**
- [ ] Support tickets reviewed and triaged
- [ ] Error rates monitored
- [ ] User feedback collected
- [ ] Metrics dashboard reviewed:
  - Adoption rate
  - Upload success rate
  - Matching accuracy
  - User satisfaction

**Hot-Fix Protocol:**
- [ ] Critical bugs fixed within 4 hours
- [ ] High-priority bugs fixed within 24 hours
- [ ] Medium bugs fixed within 1 week
- [ ] Feature requests logged for v2.0

**Iteration (Week 14-16):**
- [ ] Analyze user feedback
- [ ] Improve extraction prompts (target +5% accuracy)
- [ ] Improve matching algorithm (target +5% accuracy)
- [ ] Add most-requested features (quick wins)
- [ ] Plan v2.0 roadmap

---

## 9. Future Enhancements (Post-MVP Backlog)

### Short-Term (Month 4-6)

1. **Email Integration** [Size: L, 3 weeks]
   - Forward-to-email address (receipts@joot.app)
   - Gmail/Outlook OAuth integration
   - Auto-import receipts from inbox
   - Unsubscribe management

2. **Batch Processing Optimizations** [Size: M, 2 weeks]
   - Upload 50+ files at once
   - Parallel processing
   - Batch matching across all documents
   - Progress dashboard

3. **Advanced Vendor Enrichment** [Size: M, 2 weeks]
   - Contact information (phone, email, website)
   - Business hours
   - Location/address
   - Social media links

4. **Line-Item Extraction** [Size: L, 3 weeks]
   - Extract all items from itemized receipts
   - Tax/tip separation
   - Per-item categorization
   - Split transactions

### Medium-Term (Month 7-12)

5. **Machine Learning Improvements** [Size: XL, 6 weeks]
   - Fine-tune extraction model on user corrections
   - Personalized matching algorithm
   - Anomaly detection (unusual transactions)
   - Predictive categorization

6. **Collaborative Features** [Size: L, 4 weeks]
   - Shared household accounts
   - Multi-user document upload
   - Approval workflows
   - Expense splitting

7. **Accounting Integrations** [Size: XL, 8 weeks]
   - QuickBooks export
   - Xero export
   - FreshBooks export
   - Wave export

8. **Bank API Connections** [Size: XL, 8 weeks]
   - Plaid integration
   - Auto-download statements
   - Real-time transaction sync
   - Balance tracking

### Long-Term (Year 2+)

9. **Tax Preparation Features** [Size: L, 4 weeks]
   - Tax category mapping
   - Quarterly tax estimates
   - Year-end tax export
   - Mileage tracking (for business expenses)

10. **AI-Powered Insights** [Size: XL, 8 weeks]
    - Spending pattern analysis
    - Budget recommendations
    - Duplicate payment detection
    - Subscription tracking

11. **Receipt Sharing** [Size: M, 2 weeks]
    - Share receipt links (public URLs)
    - Warranty tracking
    - Return reminders
    - Gift receipt management

---

## 10. Communication Plan

### Internal (Weekly Standups)

**Attendees:** Dev team, PM, Designer
**Format:** 30-minute sync
**Agenda:**
- Progress updates (what got done)
- Blockers (what's stuck)
- Upcoming work (next 3 days)
- Design review (if needed)

### Stakeholder Demos (Bi-Weekly)

**Week 2:** Phase 1 demo (upload working)
**Week 4:** Phase 1 complete (library functional)
**Week 6:** Phase 2 demo (extraction working)
**Week 8:** Phase 2 complete (OCR + extraction)
**Week 10:** Phase 3 demo (matching working)
**Week 12:** Phase 3 complete (full MVP)

**Format:** 45-minute live demo + Q&A

### User Testing

**Week 0:** Concept testing (n=8, validate design)
**Week 4:** Alpha testing (internal team, 1 week)
**Week 10:** Beta testing (external users, n=30, 2 weeks)
**Month 3:** User interviews (n=10, post-launch feedback)

### Launch Communication

**Week 12 (Launch Day):**
- In-app banner: "New Feature: Document Management"
- Email to all users: "Introducing Document Uploads"
- Blog post: "How Document Management Saves You Time"
- Social media: Twitter, LinkedIn posts

**Week 13 (Post-Launch):**
- Tutorial video: "Getting Started with Document Uploads"
- Help center: Updated FAQs
- Support team: Training on new feature

---

## 11. Architectural Decision Records

### ADR-1: Desktop-First vs Mobile-First

**Decision:** Desktop-first approach with mobile camera capture only
**Rationale:**
- Reconciliation requires side-by-side comparison (large screens)
- Bulk uploads easier on desktop (drag-drop)
- Power users prefer desktop for financial tasks
- Mobile limited to quick receipt capture

**Trade-offs:**
- Mobile users can't review matches on phone
- Smaller user base for mobile-only users
- May need mobile review UI in v2.0

**Alternatives Considered:**
- Mobile-first: Rejected due to reconciliation complexity
- Equal priority: Rejected due to resource constraints

---

### ADR-2: Silent Auto-Approval vs Manual Review Required

**Decision:** Silent auto-approval for ≥95% confidence with 24hr undo
**Rationale:**
- Reduces friction for high-confidence matches
- User can opt-out in settings
- 24-hour undo window provides safety net
- Audit log maintains transparency

**Trade-offs:**
- Risk of incorrect matches if algorithm fails
- Users may not review auto-matches
- Trust issues for new users

**Mitigation:**
- Conservative threshold (95%+)
- Clear "auto-matched" badge on transactions
- Easy undo mechanism
- Audit log visible to user

**Alternatives Considered:**
- Always require review: Rejected due to poor UX
- Lower threshold (90%): Rejected due to false positive risk

---

### ADR-3: Tesseract.js vs Cloud OCR Only

**Decision:** Hybrid approach (Tesseract first, Cloud fallback)
**Rationale:**
- 70% of receipts work fine with local OCR
- Cost savings: $0.001 vs $0.003 per doc
- Privacy: Local processing for sensitive docs
- Cloud provides higher accuracy when needed

**Trade-offs:**
- More complex routing logic
- Inconsistent accuracy (varies by doc quality)
- Longer processing time for fallback

**Alternatives Considered:**
- Cloud-only: Rejected due to 3x cost
- Local-only: Rejected due to insufficient accuracy

---

### ADR-4: Claude Haiku vs GPT-4o Mini

**Decision:** Claude 3.5 Haiku as primary, GPT-4o Mini as fallback
**Rationale:**
- Similar pricing and accuracy
- Claude has better vision capabilities
- No training on API data by default (privacy)
- Multi-provider prevents vendor lock-in

**Trade-offs:**
- Need to maintain two integrations
- Prompt engineering for both models

**Alternatives Considered:**
- Claude only: Rejected due to single point of failure
- GPT only: Rejected due to privacy concerns
- Custom model: Rejected due to time/cost to train

---

### ADR-5: Email Forwarding (Deferred to v2.0)

**Decision:** Manual .eml upload for MVP, email forwarding post-launch
**Rationale:**
- Email integration adds 3-4 weeks to timeline
- User can manually drag .eml files now
- Architecture designed for future email forwarding
- Validate product-market fit first

**Trade-offs:**
- Less convenient for users
- May lose users who want auto-import
- Need to build email integration later

**Plan for v2.0:**
- Implement forward-to-email (receipts@joot.app)
- Add Gmail/Outlook OAuth integration
- Auto-scan inbox for receipts

---

## 12. Conclusion

This implementation plan provides a comprehensive, actionable roadmap to build Joot's document management and transaction reconciliation system in **8-12 weeks**. The plan is optimized for the user's preferences:

✅ **Desktop-first** with power-user features
✅ **Silent auto-approval** (95%+ confidence) with undo
✅ **Manual email upload** (architecture ready for future integration)
✅ **Basic vendor enrichment** (logo + category only)

### Key Milestones

- **Week 3:** Users can upload and view documents
- **Week 6:** Documents are OCR'd and data extracted
- **Week 9:** Auto-matching works with high accuracy
- **Week 12:** Full MVP launched with polish

### Expected Impact

- **70%+ reduction** in time spent on financial tracking
- **50%+ reduction** in manual entry errors
- **15% increase** in user retention
- **40% of transactions** with attached documents by Month 6

### Next Steps

1. **Stakeholder approval** on plan and budget
2. **Assemble development team** (2 engineers, 1 QA, 1 designer)
3. **Set up infrastructure** (Supabase Storage, Redis, API keys)
4. **Begin Phase 1 development** (Week 1: Database schema)
5. **Conduct concept testing** (validate UX design before build)

---

**Document Version:** 2.0
**Last Updated:** October 29, 2025
**Status:** Ready for Implementation
**Next Review:** Weekly during development

**Related Documents:**
- `/docs/UX-DESIGN-Document-Management-System.md`
- `/docs/VISUAL-DESIGN-Document-Management-System.md`
- `/docs/AI-ML-ARCHITECTURE.md`
- `/docs/AI-ML-SUMMARY.md`
- `/docs/USER-RESEARCH-Document-Management.md`

---

**Questions or Feedback?** Review this plan with your development team, update as needed, and proceed to Phase 1 when ready. Good luck! 🚀
