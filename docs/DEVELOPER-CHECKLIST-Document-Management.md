# Developer Implementation Checklist: Document Management System

**Project:** Joot Document Management
**Timeline:** 12 weeks (4 phases)
**Last Updated:** October 29, 2025

---

## Quick Links

- **Full Plan:** `/docs/IMPLEMENTATION-PLAN-Document-Management-v2.md`
- **Executive Summary:** `/docs/EXECUTIVE-SUMMARY-Implementation-Plan-v2.md`
- **UX Design:** `/docs/UX-DESIGN-Document-Management-System.md`
- **AI/ML Specs:** `/docs/AI-ML-ARCHITECTURE.md`

---

## Pre-Development Setup

### Infrastructure (Week 0)

**Supabase:**
- [ ] Create Storage bucket: `user-documents`
- [ ] Set bucket to private (RLS required)
- [ ] Enable file versioning
- [ ] Set CORS policy for uploads
- [ ] Test signed URL generation

**Redis:**
- [ ] Provision Redis instance (Upstash or self-hosted)
- [ ] Note connection string
- [ ] Test connection from local
- [ ] Set max memory policy: `allkeys-lru`

**API Keys:**
- [ ] Anthropic API key (Claude 3.5 Haiku)
- [ ] Google Cloud Vision API key + project
- [ ] Brandfetch API key (free tier)
- [ ] Add to `.env.local`:
  ```
  ANTHROPIC_API_KEY=sk-ant-...
  GOOGLE_CLOUD_VISION_KEY=AIza...
  BRANDFETCH_API_KEY=...
  REDIS_URL=redis://...
  ```

**Monitoring:**
- [ ] Create Sentry project
- [ ] Create PostHog project
- [ ] Add DSNs to env vars

**Development Environment:**
- [ ] Install dependencies: `npm install bull tesseract.js react-dropzone react-pdf fuse.js date-fns currency.js zod`
- [ ] Create staging database
- [ ] Run existing migrations
- [ ] Test local Supabase connection

---

## Phase 1: Core Upload & Storage (Weeks 1-3)

### Week 1: Backend Foundation

**Database Schema** [Monday-Tuesday]
- [ ] Create migration: `20251029000000_add_document_management.sql`
- [ ] Add 8 new tables (documents, document_matches, processing_jobs, etc.)
- [ ] Add `document_ids` JSONB column to transactions
- [ ] Create indexes for performance
- [ ] Write RLS policies for all tables
- [ ] Test migration: `npm run migrate:up` and `migrate:down`

**Storage Setup** [Wednesday]
- [ ] Create `/src/lib/storage/document-storage.ts`
- [ ] Implement: `uploadFile()`, `getSignedUrl()`, `deleteFile()`
- [ ] Test file upload to bucket
- [ ] Test signed URL generation
- [ ] Test file deletion (cascade check)

**File Validation** [Thursday]
- [ ] Create `/src/lib/validation/file-validation.ts`
- [ ] Validate file types: PDF, JPG, PNG, EML, MSG
- [ ] Validate file size: max 10MB per file
- [ ] Check MIME type matches extension
- [ ] Add virus scanning (optional: ClamAV)

**Upload API** [Friday]
- [ ] Create `/src/app/api/documents/upload/route.ts`
- [ ] POST handler: Accept multipart/form-data
- [ ] Validate files, upload to storage
- [ ] Create database records
- [ ] Return document IDs
- [ ] Test with Postman/curl

### Week 2: Core APIs

**Document Retrieval APIs** [Monday-Tuesday]
- [ ] Create `/src/app/api/documents/route.ts`
  - [ ] GET: List documents (pagination, filters, sort)
  - [ ] Support query params: `?limit=20&offset=0&status=complete`
- [ ] Create `/src/app/api/documents/[id]/route.ts`
  - [ ] GET: Single document with metadata
  - [ ] DELETE: Soft delete (mark as deleted)
- [ ] Create `/src/app/api/documents/[id]/download/route.ts`
  - [ ] GET: Generate signed URL (expires in 1 hour)

**TypeScript Types** [Wednesday]
- [ ] Create `/src/types/documents.ts`
  ```typescript
  export interface Document {
    id: string;
    user_id: string;
    filename: string;
    file_path: string;
    file_type: string;
    file_size: number;
    uploaded_at: string;
    processing_status: 'pending' | 'processing' | 'complete' | 'failed';
    extracted_data?: ExtractedData;
    ocr_text?: string;
    is_statement: boolean;
    parent_statement_id?: string;
  }

  export interface ExtractedData {
    amount?: number;
    currency?: string;
    date?: string;
    vendor?: string;
    order_id?: string;
    confidence?: number;
    line_items?: LineItem[];
  }
  ```

**Testing** [Thursday-Friday]
- [ ] Unit tests for file validation
- [ ] Integration tests for upload API
- [ ] Test file size limits
- [ ] Test invalid file types
- [ ] Test RLS policies (cross-user access blocked)
- [ ] Test pagination and filters

### Week 3: Frontend UI

**Upload Interface** [Monday-Wednesday]
- [ ] Create `/src/app/(authenticated)/documents/upload/page.tsx`
- [ ] Create `/src/components/documents/upload-zone.tsx`
  - [ ] Use `react-dropzone` for drag-drop
  - [ ] Support multiple files
  - [ ] Client-side validation
- [ ] Create `/src/components/documents/file-upload-card.tsx`
  - [ ] Show filename, size, type
  - [ ] Progress bar during upload
  - [ ] Error state with retry
- [ ] Create `/src/hooks/use-document-upload.ts`
  - [ ] Handle upload logic
  - [ ] Track progress per file
  - [ ] Handle errors

**Document Library** [Wednesday-Friday]
- [ ] Create `/src/app/(authenticated)/documents/page.tsx`
- [ ] Create `/src/components/documents/document-list.tsx`
  - [ ] Table view with columns: thumbnail, name, date, status
  - [ ] Sortable columns
  - [ ] Pagination (20 per page)
- [ ] Create `/src/components/documents/document-filters.tsx`
  - [ ] Date range picker
  - [ ] File type filter (PDF, Image, Email)
  - [ ] Status filter (Complete, Processing, Failed)
- [ ] Create `/src/components/documents/document-preview-modal.tsx`
  - [ ] PDF preview with `react-pdf`
  - [ ] Image preview with zoom
  - [ ] Metadata display
  - [ ] Download and delete buttons

**Testing**
- [ ] E2E test: Upload 5 files
- [ ] E2E test: View document library
- [ ] E2E test: Filter and sort
- [ ] E2E test: Delete document
- [ ] Cross-browser test (Chrome, Firefox, Safari)

**Phase 1 Demo** [Friday]
- [ ] Prepare demo: Upload → Library → Preview → Delete
- [ ] Present to stakeholders
- [ ] Collect feedback
- [ ] Log any bugs

---

## Phase 2: Processing & Extraction (Weeks 4-6)

### Week 4: Background Jobs & OCR

**Job Queue Setup** [Monday]
- [ ] Install Bull: `npm install bull @types/bull`
- [ ] Create `/src/lib/jobs/queue.ts`
  - [ ] Initialize Bull queue with Redis
  - [ ] Create job types: `ocr`, `extraction`, `matching`
  - [ ] Set retry logic (3 attempts)
  - [ ] Set timeout (5 minutes)
- [ ] Create `/src/lib/jobs/processors/ocr-processor.ts`

**Tesseract.js Integration** [Tuesday-Wednesday]
- [ ] Install: `npm install tesseract.js`
- [ ] Create `/src/lib/ocr/tesseract-ocr.ts`
  - [ ] Initialize worker
  - [ ] `extractText(imagePath): Promise<{text, confidence}>`
  - [ ] Handle errors (timeout, invalid image)
- [ ] Create `/src/lib/ocr/image-preprocessing.ts`
  - [ ] Deskew image
  - [ ] Adjust contrast
  - [ ] Denoise
  - [ ] Convert to grayscale

**Google Cloud Vision Fallback** [Thursday]
- [ ] Install: `npm install @google-cloud/vision`
- [ ] Create `/src/lib/ocr/google-vision-ocr.ts`
  - [ ] `detectText(imagePath): Promise<{text, confidence}>`
  - [ ] Handle API errors
- [ ] Create `/src/lib/ocr/ocr-router.ts`
  - [ ] Try Tesseract first
  - [ ] If confidence <80%, use Google Vision
  - [ ] Log which OCR used (for cost tracking)

**Testing** [Friday]
- [ ] Test Tesseract with 10 clear receipts
- [ ] Test Google Vision with 5 low-quality images
- [ ] Measure OCR accuracy manually
- [ ] Test preprocessing improves accuracy

### Week 5: AI Extraction

**Claude Integration** [Monday-Tuesday]
- [ ] Install: `npm install @anthropic-ai/sdk`
- [ ] Create `/src/lib/ai/claude-extractor.ts`
  - [ ] Initialize client
  - [ ] `extractTransactionData(text): Promise<ExtractedData>`
  - [ ] Use structured output (JSON mode)
- [ ] Create `/src/lib/ai/extraction-prompts.ts`
  ```typescript
  export const EXTRACTION_PROMPT = `
  Extract transaction data from this receipt/statement:

  ${ocrText}

  Return JSON with:
  - amount (number, no currency symbol)
  - currency (3-letter code like USD, THB)
  - date (YYYY-MM-DD format)
  - vendor (merchant name)
  - order_id (if present)

  Be precise. If unsure, omit field.
  `;
  ```

**Extraction Schema** [Wednesday]
- [ ] Create `/src/lib/ai/extraction-schema.ts`
  - [ ] Use Zod for validation
  ```typescript
  export const extractedDataSchema = z.object({
    amount: z.number().positive().optional(),
    currency: z.enum(['USD', 'THB', 'EUR', 'GBP']).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    vendor: z.string().optional(),
    order_id: z.string().optional(),
  });
  ```

**Confidence Calculation** [Thursday]
- [ ] Create `/src/lib/ai/confidence-calculator.ts`
  - [ ] Per-field confidence (did AI extract?)
  - [ ] Overall document confidence (avg of fields)
  - [ ] Boost confidence if structured vendor (Grab, Lazada)

**Email Parser** [Friday]
- [ ] Install: `npm install mailparser`
- [ ] Create `/src/lib/parsers/eml-parser.ts`
  - [ ] Parse .eml file headers
  - [ ] Extract HTML body
  - [ ] Detect vendor from sender email
- [ ] Create `/src/lib/parsers/vendor-parsers/grab-parser.ts`
  - [ ] Extract from Grab email HTML structure
  - [ ] Specific selectors for amount, date
  - [ ] Return extracted data

**Testing**
- [ ] Test extraction with 20 diverse receipts
- [ ] Measure accuracy per field (amount, date, vendor)
- [ ] Test Grab email parser
- [ ] Ensure JSON validation works

### Week 6: Extraction Pipeline & UI

**Processing Pipeline** [Monday-Tuesday]
- [ ] Create `/src/lib/jobs/processors/extraction-processor.ts`
  - [ ] Get document from DB
  - [ ] Route to correct extractor (email vs image)
  - [ ] Run OCR (if needed)
  - [ ] Run AI extraction
  - [ ] Calculate confidence
  - [ ] Save to `documents.extracted_data`
  - [ ] Update `processing_status = 'complete'`
- [ ] Hook up upload API to trigger job
- [ ] Add WebSocket for real-time updates

**Processing Status UI** [Wednesday-Thursday]
- [ ] Create `/src/components/documents/processing-status.tsx`
  - [ ] Status badges: Uploading, Processing, Complete, Failed
  - [ ] Progress bar
  - [ ] Real-time updates via WebSocket
- [ ] Create `/src/hooks/use-document-processing.ts`
  - [ ] Subscribe to WebSocket events
  - [ ] Update UI when job completes

**Extracted Data Display** [Friday]
- [ ] Create `/src/components/documents/extracted-data-panel.tsx`
  - [ ] Show: Amount, Date, Vendor
  - [ ] Confidence badge per field
  - [ ] Highlight low-confidence (<80%) in yellow
- [ ] Create `/src/components/documents/confidence-badge.tsx`
  - [ ] High (≥95%): Green
  - [ ] Medium (80-95%): Yellow
  - [ ] Low (<80%): Red

**Phase 2 Demo** [Friday]
- [ ] Demo: Upload → Processing → Extraction → Review data
- [ ] Show confidence scores
- [ ] Show email parsing

**Testing**
- [ ] E2E: Upload → Wait for processing → Check extracted data
- [ ] Test WebSocket reconnection
- [ ] Load test: Upload 20 files simultaneously
- [ ] Measure processing time (target <30s)

---

## Phase 3: Matching & Reconciliation (Weeks 7-9)

### Week 7: Matching Algorithm

**Fuzzy Matching** [Monday]
- [ ] Install: `npm install fuse.js fastest-levenshtein`
- [ ] Create `/src/lib/matching/fuzzy-matching.ts`
  - [ ] `fuzzyMatch(str1, str2): number` (0-1 similarity)
  - [ ] Use Levenshtein distance
  - [ ] Normalize strings (lowercase, trim, remove punctuation)

**Matching Algorithm** [Tuesday-Wednesday]
- [ ] Create `/src/lib/matching/match-algorithm.ts`
  - [ ] `findMatches(documentId): Promise<Match[]>`
  - [ ] Get document extracted data
  - [ ] Query transactions in date range (±7 days)
  - [ ] Calculate confidence per transaction:
    - Amount match (40% weight)
    - Date match (30% weight)
    - Vendor match (30% weight)
  - [ ] Return top 5 matches, sorted by confidence
- [ ] Create `/src/lib/matching/confidence-calculator.ts`
  - [ ] `calculateMatchConfidence(doc, txn, prefs): number`
  - [ ] Detailed scoring logic
  - [ ] Store matching_factors (why it matched)

**Auto-Approval Logic** [Thursday]
- [ ] Create `/src/lib/matching/auto-approver.ts`
  - [ ] Get user preferences (threshold)
  - [ ] Auto-approve if confidence ≥ threshold
  - [ ] Update transaction: add document_id, set auto_matched_at
  - [ ] Create audit log entry
  - [ ] Send notification if enabled

**Matching APIs** [Friday]
- [ ] Create `/src/app/api/documents/[id]/match/route.ts`
  - [ ] POST: Find matches for document
  - [ ] Save to `document_matches` table
  - [ ] Trigger auto-approval if applicable
  - [ ] Return matches
- [ ] Create `/src/app/api/matches/review-queue/route.ts`
  - [ ] GET: Pending matches (paginated)
  - [ ] Filter by confidence level
  - [ ] Sort options

**Testing**
- [ ] Unit tests for matching algorithm
- [ ] Test with sample data (create fixtures)
- [ ] Measure accuracy: true positives, false positives
- [ ] Test auto-approval logic

### Week 8: Review Queue UI

**Split View Layout** [Monday-Tuesday]
- [ ] Create `/src/app/(authenticated)/documents/review/page.tsx`
- [ ] Create `/src/components/documents/split-view-layout.tsx`
  - [ ] Two columns: Unmatched | Matched
  - [ ] Resizable divider
  - [ ] Independent scrolling
- [ ] Create `/src/components/documents/match-card.tsx`
  - [ ] Show document + transaction side-by-side
  - [ ] Confidence badge
  - [ ] Matching factors summary
  - [ ] Approve/Reject buttons

**Comparison Modal** [Wednesday-Thursday]
- [ ] Create `/src/components/documents/comparison-modal.tsx`
  - [ ] Side-by-side: Document preview (left) | Transaction detail (right)
  - [ ] Highlight matching fields (green)
  - [ ] Highlight conflicts (yellow)
  - [ ] Show matching factors breakdown
  - [ ] Edit transaction button
  - [ ] Approve/Reject buttons with keyboard shortcuts (A, R)
- [ ] Create `/src/components/documents/match-factors-panel.tsx`
  - [ ] Amount: Match ✓ or Diff: $1.23
  - [ ] Date: Exact ✓ or Diff: 2 days
  - [ ] Vendor: Similarity 95%

**Bulk Operations** [Friday]
- [ ] Add bulk select to match cards (checkboxes)
- [ ] "Approve All High Confidence" button
- [ ] Confirmation dialog before bulk approve
- [ ] Progress indicator during bulk operation
- [ ] Success/error toasts

**Testing**
- [ ] E2E: Upload → Match → Review queue
- [ ] Test bulk approve with 10 matches
- [ ] Test keyboard shortcuts
- [ ] Test filtering and sorting

### Week 9: Create Transaction & Undo

**Create Transaction from Document** [Monday-Tuesday]
- [ ] Create `/src/components/documents/create-transaction-from-doc.tsx`
  - [ ] Pre-filled form with extracted data
  - [ ] Auto-suggest vendor (fuzzy match existing)
  - [ ] Auto-suggest payment method
  - [ ] Save creates transaction + attaches document
- [ ] Create `/src/app/api/transactions/create-from-document/[id]/route.ts`
  - [ ] POST: Create transaction
  - [ ] Attach document ID
  - [ ] Mark document as processed

**Undo Functionality** [Wednesday]
- [ ] Add "Unmatch" button to transaction detail page
- [ ] Update `/src/app/api/transactions/[id]/route.ts`
  - [ ] PATCH `/api/transactions/[id]/unmatch`
  - [ ] Remove document_id
  - [ ] Clear auto_matched_at
  - [ ] Create audit log entry
- [ ] Show "Undo" in notification (24hr window)

**Auto-Match Notifications** [Thursday]
- [ ] Create `/src/components/notifications/auto-match-notification.tsx`
  - [ ] Toast: "5 documents auto-matched"
  - [ ] Click to view transactions
  - [ ] "Undo All" button
- [ ] Create `/src/hooks/use-match-notifications.ts`
  - [ ] Subscribe to match events
  - [ ] Show toast when auto-match completes

**Transaction Badge** [Friday]
- [ ] Modify `/src/components/transactions/transaction-card.tsx`
  - [ ] Add "auto-matched" badge if `auto_matched_at` exists
  - [ ] Show document icon if `document_ids` not empty
  - [ ] Click to view document

**Phase 3 Demo** [Friday]
- [ ] Demo full flow: Upload → Auto-match → Review queue → Approve
- [ ] Show auto-matched badge on transaction
- [ ] Show undo functionality

**Testing**
- [ ] E2E: Full reconciliation flow
- [ ] Test auto-approval with 95%+ confidence
- [ ] Test manual approval with 80% confidence
- [ ] Test reject flow
- [ ] Test undo within 24 hours
- [ ] User acceptance testing with beta users (n=5)

---

## Phase 4: Polish & Advanced Features (Weeks 10-12)

### Week 10: Vendor Enrichment

**Brandfetch Integration** [Monday-Tuesday]
- [ ] Install: `npm install axios`
- [ ] Create `/src/lib/enrichment/brandfetch-client.ts`
  - [ ] `searchBrand(name): Promise<{logo, category}>`
  - [ ] Handle rate limits
  - [ ] Cache results in DB
- [ ] Create `/src/lib/enrichment/vendor-enricher.ts`
  - [ ] Extract vendor name from document
  - [ ] Search Brandfetch
  - [ ] Save to `vendor_enrichments` table
  - [ ] Suggest to user for approval

**Enrichment API** [Wednesday]
- [ ] Create `/src/app/api/vendors/[id]/enrich/route.ts`
  - [ ] POST: Trigger enrichment
  - [ ] GET: Get pending enrichments for user
  - [ ] PATCH: Approve/ignore enrichment

**Enrichment UI** [Thursday-Friday]
- [ ] Create `/src/app/(authenticated)/vendors/enrichments/page.tsx`
  - [ ] List pending enrichments
  - [ ] Preview logo
  - [ ] Approve/ignore buttons
- [ ] Create `/src/components/vendors/enrichment-card.tsx`
  - [ ] Show current vendor (no logo) → Suggested (with logo)
  - [ ] Confidence score
  - [ ] Approve/Ignore actions

**Testing**
- [ ] Test Brandfetch API with 10 common vendors
- [ ] Test caching works
- [ ] Test enrichment approval flow

### Week 11: Mobile & Advanced Features

**Mobile Camera Capture** [Monday-Tuesday]
- [ ] Create `/src/app/(authenticated)/documents/camera/page.tsx`
- [ ] Create `/src/components/documents/camera-capture.tsx`
  - [ ] Request camera permission
  - [ ] Photo capture interface
  - [ ] Preview captured photo
  - [ ] Upload to processing queue
- [ ] Test on iOS Safari and Android Chrome

**Advanced Search** [Wednesday]
- [ ] Create `/src/app/api/documents/search/route.ts`
  - [ ] Full-text search on `ocr_text` using PostgreSQL `tsvector`
  - [ ] Filter by: date range, amount range, vendor, status
  - [ ] Return ranked results
- [ ] Create `/src/components/documents/search-bar.tsx`
  - [ ] Search input with autocomplete
  - [ ] Advanced filters panel
- [ ] Create `/src/components/documents/advanced-filters.tsx`
  - [ ] Multi-select filters
  - [ ] Saved searches

**Keyboard Shortcuts** [Thursday]
- [ ] Create `/src/hooks/use-keyboard-shortcuts.ts`
  - [ ] `U` - Upload documents
  - [ ] `R` - Review queue
  - [ ] `A` - Approve selected
  - [ ] `J` - Reject selected
  - [ ] `/` - Focus search
  - [ ] `?` - Show shortcuts
- [ ] Create `/src/components/documents/keyboard-shortcuts-modal.tsx`
  - [ ] List all shortcuts
  - [ ] Open with `?` key

**Performance Optimizations** [Friday]
- [ ] Add database indexes:
  ```sql
  CREATE INDEX idx_documents_ocr_text_search ON documents USING GIN(to_tsvector('english', ocr_text));
  CREATE INDEX idx_documents_user_status ON documents(user_id, processing_status);
  ```
- [ ] Implement thumbnail generation for images
- [ ] Add Redis caching for API responses
- [ ] Lazy load images in document library
- [ ] Code splitting for heavy components

**Testing**
- [ ] Test mobile camera on real devices
- [ ] Test search with 100+ documents
- [ ] Performance test: library with 1000 documents
- [ ] Lighthouse audit (target >90)

### Week 12: Polish & Launch

**Accessibility Audit** [Monday]
- [ ] Run Lighthouse accessibility audit
- [ ] Fix violations (target: WCAG 2.1 AA)
- [ ] Add ARIA labels to all interactive elements
- [ ] Test keyboard navigation (tab order)
- [ ] Test with screen reader (NVDA or VoiceOver)
- [ ] Add focus indicators
- [ ] High contrast mode support

**User Onboarding** [Tuesday]
- [ ] Install: `npm install react-joyride`
- [ ] Create `/src/components/onboarding/document-tutorial.tsx`
  - [ ] Step 1: Upload zone
  - [ ] Step 2: Processing status
  - [ ] Step 3: Review queue
  - [ ] Step 4: Approve matches
- [ ] Create `/src/components/onboarding/feature-announcement.tsx`
  - [ ] Modal on first visit
  - [ ] Highlights key features
  - [ ] "Take Tour" button

**Final Testing** [Wednesday-Thursday]
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device testing (iOS, Android)
- [ ] E2E tests for all flows
- [ ] Load testing (100 concurrent users)
- [ ] Security review (file upload, XSS, RLS)
- [ ] Beta testing with 20-30 users

**Documentation** [Friday Morning]
- [ ] User guide: How to upload documents
- [ ] User guide: How to review matches
- [ ] User guide: How to undo auto-matches
- [ ] FAQs: Common questions
- [ ] Help center articles

**Launch Preparation** [Friday Afternoon]
- [ ] Deploy to production with feature flag OFF
- [ ] Verify migrations on production DB
- [ ] Verify storage bucket access
- [ ] Verify API keys in production env
- [ ] Set up monitoring dashboards
- [ ] Prepare rollback script
- [ ] Enable for internal team (dogfooding)

**Phase 4 Demo** [Friday]
- [ ] Final demo to stakeholders
- [ ] Show complete feature
- [ ] Show accessibility features
- [ ] Show mobile camera capture
- [ ] Get launch approval

---

## Post-Launch (Week 13+)

### Launch Day

**Canary Rollout:**
- [ ] Day 1: Enable for 10% of users
- [ ] Day 1-2: Monitor metrics (upload rate, errors, complaints)
- [ ] Day 3: If stable, enable for 50% of users
- [ ] Day 3-4: Monitor metrics
- [ ] Day 5: If stable, enable for 100% of users

**Communication:**
- [ ] Send email to all users
- [ ] Publish blog post
- [ ] Post on social media
- [ ] In-app announcement banner
- [ ] Update help center

### Week 13: Monitoring & Hot-Fixes

**Daily Monitoring:**
- [ ] Check error logs (Sentry)
- [ ] Check metrics dashboard (PostHog)
  - Upload success rate (target >99%)
  - Processing time (target <30s)
  - Matching accuracy (track approvals vs rejections)
  - User adoption (% who uploaded ≥1 doc)
- [ ] Review support tickets
- [ ] Collect user feedback

**Hot-Fix Protocol:**
- [ ] Critical bugs: Fix within 4 hours
- [ ] High-priority: Fix within 24 hours
- [ ] Medium: Fix within 1 week
- [ ] Feature requests: Log for v2.0

### Week 14-16: Iteration

**Improve Accuracy:**
- [ ] Analyze failed extractions
- [ ] Improve extraction prompts
- [ ] Add vendor-specific parsers (top 10 vendors)
- [ ] Target: +5% extraction accuracy

**Improve Matching:**
- [ ] Analyze rejected matches
- [ ] Tune matching algorithm
- [ ] Adjust confidence thresholds if needed
- [ ] Target: +5% matching accuracy

**Quick Wins:**
- [ ] Add most-requested features (from feedback)
- [ ] Improve error messages
- [ ] Add more keyboard shortcuts
- [ ] Polish UI based on user feedback

**Plan v2.0:**
- [ ] Prioritize backlog items
- [ ] Email integration (top request?)
- [ ] Advanced vendor enrichment
- [ ] Line-item extraction
- [ ] Schedule next phase (Month 4-6)

---

## Success Criteria Summary

### Phase 1 Complete
- ✅ Users can upload PDF, JPG, PNG, EML files
- ✅ Upload success rate >99%
- ✅ Files appear in library within 2 seconds
- ✅ RLS prevents cross-user access

### Phase 2 Complete
- ✅ OCR accuracy >90% for clear images
- ✅ Extraction accuracy >85% for structured docs
- ✅ Processing time <30 seconds per doc
- ✅ Users can manually correct extracted data

### Phase 3 Complete
- ✅ Matching accuracy >85% (true positives)
- ✅ False positive rate <5%
- ✅ Auto-approval works for ≥95% confidence
- ✅ Users can review 20+ matches in <5 minutes
- ✅ Undo works within 24 hours

### Phase 4 Complete
- ✅ Vendor logos enriched for 50%+ of docs
- ✅ Mobile camera works on iOS and Android
- ✅ WCAG 2.1 AA compliance
- ✅ Lighthouse score >90 (desktop)
- ✅ Page load time <3 seconds

### Post-Launch (Month 3)
- ✅ 50% of active users upload ≥1 document
- ✅ 10+ documents per user per month
- ✅ 40% of transactions have attached documents
- ✅ 4.5/5 feature satisfaction rating
- ✅ <5 support tickets per 100 users

---

## Common Issues & Troubleshooting

### File Upload Fails
- Check CORS policy on Supabase Storage
- Check file size limit (10MB)
- Check RLS policy allows user to insert
- Check network tab for error details

### OCR Returns Gibberish
- Check image quality (min 300 DPI)
- Check image preprocessing is working
- Try Google Vision fallback manually
- Check OCR language setting (English)

### Extraction Returns Empty Fields
- Check OCR text quality first
- Check Claude API key is valid
- Check extraction prompt is correct
- Log raw API response for debugging

### Matching Returns No Matches
- Check date range (±7 days)
- Check transactions exist for that user
- Check amount and vendor are extracted
- Lower confidence threshold temporarily

### WebSocket Not Updating UI
- Check Redis connection
- Check WebSocket middleware configured
- Check browser console for errors
- Test with polling as fallback

### RLS Blocking Valid Queries
- Check user_id is in auth context
- Check RLS policy syntax
- Test query in Supabase SQL editor
- Disable RLS temporarily to isolate issue

---

## Quick Commands

**Run migrations:**
```bash
npm run migrate:up
npm run migrate:down
npm run migrate:status
```

**Test locally:**
```bash
npm run dev
npm test
npm run test:e2e
```

**Build and deploy:**
```bash
npm run build
npm run deploy:staging
npm run deploy:production
```

**Database tasks:**
```bash
npm run db:reset  # Reset local DB
npm run db:seed   # Seed with test data
npm run db:backup # Backup production
```

**Monitor logs:**
```bash
npm run logs:errors    # Sentry errors
npm run logs:jobs      # Background jobs
npm run logs:api       # API requests
```

---

## Need Help?

**Documentation:**
- Full Implementation Plan: `/docs/IMPLEMENTATION-PLAN-Document-Management-v2.md`
- UX Design: `/docs/UX-DESIGN-Document-Management-System.md`
- AI/ML Architecture: `/docs/AI-ML-ARCHITECTURE.md`
- API Examples: `/docs/ai-ml-implementation-examples.ts`

**Resources:**
- Anthropic Docs: https://docs.anthropic.com/claude/reference/messages
- Tesseract.js: https://tesseract.projectnaptha.com/
- Bull Queue: https://docs.bullmq.io/
- React Dropzone: https://react-dropzone.js.org/
- Supabase Storage: https://supabase.com/docs/guides/storage

**Team Contacts:**
- Backend Lead: [Name]
- Frontend Lead: [Name]
- QA Lead: [Name]
- Product Owner: [Name]

---

**Good luck! You've got this! 🚀**

**Last Updated:** October 29, 2025
