# Implementation Roadmap: Document Management System

**Project:** Joot Personal Finance Application
**Date:** October 29, 2025
**Estimated Timeline:** 12-16 weeks for full implementation

---

## Overview

This roadmap breaks down the document management system into 4 phases with clear milestones, dependencies, and success criteria.

---

## Phase 1: Core Upload & Storage (Weeks 1-4)

### Goal
Enable users to upload documents and store them securely with basic metadata.

### Features
- File upload interface (drag-and-drop + button)
- File validation (type, size)
- Cloud storage integration (AWS S3 or similar)
- Document database schema
- Basic document library view
- Document detail view

### Technical Tasks

#### Backend
- [ ] Design document database schema
  - `documents` table: id, user_id, filename, file_path, file_type, file_size, uploaded_at, metadata (JSON)
  - Indexes on user_id, uploaded_at
- [ ] Create file upload API endpoint
  - POST /api/documents/upload
  - Accepts multipart/form-data
  - Returns document ID and metadata
- [ ] Implement S3 integration
  - Configure bucket, IAM policies
  - Generate secure URLs for downloads
  - Implement file encryption at rest
- [ ] Create document retrieval APIs
  - GET /api/documents (list with pagination)
  - GET /api/documents/:id (single document)
  - GET /api/documents/:id/download (signed URL)
  - DELETE /api/documents/:id

#### Frontend
- [ ] Build upload interface component
  - Drag-and-drop zone (react-dropzone)
  - File picker button
  - File validation client-side
- [ ] Create file upload card component
  - Show filename, size, type
  - Progress bar during upload
  - Error handling UI
- [ ] Build document library page
  - Table/grid view toggle
  - Basic filtering (date range)
  - Pagination
- [ ] Create document detail modal
  - Preview for images/PDFs
  - Metadata display
  - Download/delete actions

#### Design
- [ ] Finalize upload interface mockups
- [ ] Document library table/grid designs
- [ ] Document detail modal layout

### Success Criteria
- Users can upload PDF, JPG, PNG files up to 10MB
- Files stored securely in cloud storage
- Users can view all uploaded documents in library
- Users can download/delete documents
- Upload success rate >99%
- Average upload time <5 seconds for typical file

### Dependencies
- Cloud storage account (AWS S3)
- File upload library (react-dropzone)
- PDF viewer library (react-pdf)

### Testing
- Unit tests for API endpoints
- Integration tests for upload flow
- Manual testing with various file types and sizes
- Performance testing with batch uploads

---

## Phase 2: Document Processing & Extraction (Weeks 5-8)

### Goal
Extract data from uploaded documents using OCR and structured parsing.

### Features
- OCR for images and PDFs
- Vendor-specific parsers (Grab, Lazada, Amazon, etc.)
- Data extraction (amount, date, vendor, order ID)
- Confidence scoring for extracted data
- Manual correction interface

### Technical Tasks

#### Backend
- [ ] Integrate OCR service
  - Evaluate: AWS Textract, Google Vision API, or Tesseract
  - Create OCR processing queue (background jobs)
  - Store OCR results in database
- [ ] Build extraction pipeline
  - Text preprocessing and cleaning
  - Amount extraction (regex patterns for currencies)
  - Date extraction (multiple format support)
  - Vendor name extraction
- [ ] Create vendor-specific parsers
  - Email receipt parsers (Grab, Bolt, Lazada, Amazon)
  - Bank statement parsers (Bangkok Bank, etc.)
  - Parser registry and selection logic
- [ ] Implement confidence scoring
  - Rule-based scoring for structured data
  - Fallback for unstructured documents
- [ ] Enhance document database schema
  - Add extracted_data (JSON) column
  - Add processing_status column (pending, processing, complete, failed)
  - Add ocr_text column (full text for search)
- [ ] Create extraction API endpoints
  - POST /api/documents/:id/process (trigger processing)
  - GET /api/documents/:id/extraction (get extracted data)
  - PATCH /api/documents/:id/extraction (update/correct data)

#### Frontend
- [ ] Processing status indicators
  - Upload → Processing → Complete workflow
  - Real-time updates (WebSocket or polling)
- [ ] Extracted data display component
  - Show key fields with confidence indicators
  - Highlight low-confidence fields
- [ ] Manual correction interface
  - Editable form for extracted data
  - Side-by-side with document preview
  - Save corrections

#### Design
- [ ] Processing status UI states
- [ ] Extracted data display layouts
- [ ] Manual correction interface mockups

### Success Criteria
- OCR accuracy >90% for clear documents
- Extraction accuracy for key fields (amount, date, vendor):
  - Email receipts: >85% accuracy
  - Bank statements: >80% accuracy
- Processing time <30 seconds per document
- Support for 5+ vendor-specific formats
- Users can manually correct extracted data

### Dependencies
- OCR service account (AWS Textract recommended)
- Background job queue (Bull, BullMQ, or similar)
- WebSocket library for real-time updates

### Testing
- Unit tests for extraction logic
- Integration tests with sample documents
- Accuracy testing with real user documents
- Performance testing with large PDFs

---

## Phase 3: Automatic Matching & Reconciliation (Weeks 9-12)

### Goal
Automatically match documents to existing transactions and provide reconciliation interface.

### Features
- Matching algorithm (fuzzy matching on amount, date, vendor)
- Confidence scoring for matches
- Review queue (matched vs unmatched)
- Side-by-side comparison interface
- Bulk approval for high-confidence matches
- Create transaction from unmatched document
- Link document to transaction manually

### Technical Tasks

#### Backend
- [ ] Enhance transaction schema
  - Add document_ids (JSON array) column
  - Add is_verified (boolean) column
- [ ] Create matching algorithm
  - Amount matching (exact + tolerance)
  - Date matching (exact + ±N days tolerance)
  - Vendor fuzzy matching (Levenshtein distance)
  - Combined confidence scoring
- [ ] Build matching service
  - Match single document to transactions
  - Match statement (multiple line items) to transactions
  - Handle multiple possible matches
- [ ] Create matching API endpoints
  - POST /api/documents/:id/match (find matches)
  - GET /api/matches/review-queue (get pending reviews)
  - POST /api/matches/:id/approve (link document to transaction)
  - POST /api/matches/:id/reject (reject match)
  - POST /api/transactions/create-from-document/:id (create new)
- [ ] Implement user matching preferences
  - Store in user settings: confidence threshold, date tolerance, amount tolerance
  - Auto-approve logic based on preferences

#### Frontend
- [ ] Build review queue interface
  - Split view: Unmatched | Matched columns
  - Confidence badges
  - Filtering and sorting
- [ ] Create comparison modal
  - Side-by-side: document data vs transaction data
  - Matching factors explanation
  - Approve/reject actions
- [ ] Bulk approval interface
  - Select multiple matches
  - "Approve all high confidence" button
  - Confirmation dialog
- [ ] Create transaction from document flow
  - Pre-filled form with extracted data
  - Create + attach in one action
- [ ] Manual linking interface
  - Search existing transactions
  - Select and link

#### Design
- [ ] Review queue layouts (split view)
- [ ] Comparison modal design
- [ ] Bulk action UI patterns
- [ ] Create transaction flow

### Success Criteria
- Matching accuracy:
  - True positive rate >85% for high-confidence matches
  - False positive rate <5%
- Average time to reconcile document <2 minutes
- 70%+ of documents auto-matched with high confidence
- Users can review 20+ matches in <5 minutes
- Zero data loss in matching process

### Dependencies
- String similarity library (fuzzball, fastest-levenshtein)
- Existing transaction data for testing

### Testing
- Unit tests for matching algorithm
- Integration tests for full matching flow
- Accuracy testing with historical data
- User acceptance testing with beta users
- Performance testing with large transaction sets

---

## Phase 4: Advanced Features & Polish (Weeks 13-16)

### Goal
Add advanced features, optimize performance, and polish the user experience.

### Features
- Bank statement multi-transaction handling
- Vendor profile enrichment
- Mobile camera capture
- Advanced search and filtering
- Settings for auto-match preferences
- Email receipt parsing improvements
- Conflict resolution workflows
- Performance optimizations
- Accessibility audit and fixes

### Technical Tasks

#### Backend
- [ ] Statement multi-transaction processing
  - Detect statement type (heuristics)
  - Extract all line items
  - Create "virtual receipts" per line item
  - Link all to original statement PDF
- [ ] Vendor enrichment service
  - Extract vendor data from documents (logo, contact, URL)
  - Suggest enrichments to user
  - Update vendor profiles
- [ ] Advanced search
  - Full-text search on OCR text
  - Elasticsearch or PostgreSQL full-text search
  - Filter by multiple criteria
- [ ] Settings API
  - GET /api/users/settings/document-matching
  - PATCH /api/users/settings/document-matching
- [ ] Performance optimizations
  - Database query optimization (indexes, N+1 prevention)
  - API response caching
  - Image thumbnail generation
  - Lazy loading for document library

#### Frontend
- [ ] Statement matching interface
  - Special UI for multi-transaction documents
  - Line-by-line matching
  - Bulk approve statement matches
- [ ] Vendor enrichment UI
  - Pending enrichment notifications
  - Review extracted vendor data
  - Approve/ignore suggestions
- [ ] Mobile camera capture
  - Camera access (WebRTC or native)
  - Photo capture interface
  - Auto-crop and enhancement
  - Upload to queue
- [ ] Settings page
  - Auto-match preferences
  - Confidence threshold slider
  - Notification preferences
- [ ] Advanced search interface
  - Full-text search input
  - Multi-select filters
  - Saved searches
- [ ] Performance optimizations
  - Virtual scrolling for long lists
  - Image lazy loading
  - Code splitting
  - Bundle size optimization

#### Design
- [ ] Statement matching UI
- [ ] Vendor enrichment flows
- [ ] Mobile camera interface
- [ ] Settings page layouts
- [ ] Accessibility review and fixes

### Success Criteria
- Bank statements fully supported (extract 100% of line items)
- Vendor profiles auto-enriched from 50%+ of documents
- Mobile camera capture working on iOS and Android
- Search returns results in <500ms
- Document library with 1000+ items scrolls smoothly (60fps)
- WCAG 2.1 AA compliance
- Page load time <3 seconds

### Dependencies
- Mobile device testing (iOS Safari, Android Chrome)
- Accessibility testing tools (aXe, Lighthouse)

### Testing
- End-to-end testing of all features
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile device testing
- Accessibility audit with screen readers
- Performance testing (Lighthouse)
- Load testing with concurrent users
- User acceptance testing with full feature set

---

## Post-Launch (Weeks 17+)

### Monitoring & Iteration
- [ ] Set up monitoring dashboards
  - Upload success/failure rates
  - Processing times
  - Matching accuracy metrics
  - User engagement metrics
- [ ] Collect user feedback
  - In-app feedback widget
  - User interviews
  - Support ticket analysis
- [ ] Iterate on accuracy
  - Analyze failed matches
  - Add new vendor-specific parsers
  - Improve matching algorithm
- [ ] Optimize costs
  - Review OCR usage and costs
  - Optimize storage (archive old documents)
  - Caching strategies

### Future Enhancements (Backlog)
- Email integration (Gmail/Outlook auto-scan)
- Line-item extraction from itemized receipts
- Tax/tip separation
- Handwritten receipt OCR
- Collaborative features (shared households)
- Accounting software integrations (QuickBooks, Xero)
- Bank API connections (auto-download statements)
- AI-powered categorization learning
- Anomaly detection (unusual transactions)
- Export for tax preparation

---

## Resource Requirements

### Team Composition
- **1 Full-Stack Developer** (Weeks 1-16)
  - Primary responsibility: Backend APIs, database, integrations
- **1 Frontend Developer** (Weeks 1-16)
  - Primary responsibility: React components, UI implementation
- **1 Designer** (Weeks 1-4, then part-time)
  - Mockups, design system updates, user testing
- **1 QA Engineer** (Weeks 5-16)
  - Testing, accessibility audit, bug reporting

### External Services Budget
- **AWS S3**: ~$50/month for 100GB storage
- **AWS Textract**: ~$1.50 per 1000 pages (estimate $200/month for 10,000 documents)
- **Domain/SSL**: Existing
- **Monitoring**: ~$50/month (Sentry, LogRocket)

**Total External Costs:** ~$300/month ongoing

---

## Risk Mitigation

### Technical Risks

**Risk:** OCR accuracy insufficient for real-world documents
- **Mitigation:** Start with vendor-specific parsers for structured documents (higher accuracy)
- **Fallback:** Manual entry always available; focus on reducing, not eliminating manual work

**Risk:** Matching algorithm produces too many false positives
- **Mitigation:** Conservative initial thresholds; require user review; collect feedback to tune
- **Fallback:** Users can always reject matches and link manually

**Risk:** Cloud storage costs exceed budget
- **Mitigation:** Implement file size limits; compress images; archive old documents
- **Fallback:** Allow users to download and delete documents to manage storage

### Product Risks

**Risk:** Users don't trust automatic matching
- **Mitigation:** Transparent confidence scores; show matching factors; easy undo
- **Fallback:** Default to manual review mode; let users opt-in to automation

**Risk:** Feature complexity overwhelms users
- **Mitigation:** Progressive disclosure; onboarding tutorial; simple defaults
- **Fallback:** Simplify UI; hide advanced features behind "Advanced" toggle

**Risk:** Mobile camera capture adoption low
- **Mitigation:** Make it optional; focus on desktop upload first
- **Fallback:** Users can email receipts to themselves and upload from desktop

---

## Success Metrics (KPIs)

### Adoption Metrics
- % of active users who upload at least 1 document: **Target: 50%** by Month 3
- Average documents uploaded per user per month: **Target: 10+**
- % of transactions with attached documents: **Target: 40%** by Month 6

### Efficiency Metrics
- Average time to reconcile a document: **Target: <2 minutes**
- % of documents requiring manual review: **Target: <30%**
- Clicks to approve a high-confidence match: **Target: <3**

### Accuracy Metrics
- Extraction accuracy (amount, date, vendor): **Target: >85%**
- Matching accuracy (true positives): **Target: >85%**
- False positive rate: **Target: <5%**

### User Satisfaction
- Feature satisfaction rating: **Target: 4.5/5**
- Would recommend to friend: **Target: 80%+**
- Support tickets per 100 users: **Target: <5**

### Technical Performance
- Upload success rate: **Target: >99%**
- Average processing time: **Target: <30 seconds**
- Document library load time: **Target: <2 seconds**
- API p95 response time: **Target: <500ms**

---

## Launch Checklist

### Pre-Launch (Week 12)
- [ ] All Phase 1-3 features complete and tested
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Security audit passed (file upload vulnerabilities, XSS, etc.)
- [ ] Performance testing passed (Lighthouse score >90)
- [ ] User acceptance testing complete (5+ beta users)
- [ ] Documentation written (user guide, API docs)
- [ ] Support materials prepared (FAQs, troubleshooting)
- [ ] Monitoring dashboards set up
- [ ] Rollback plan documented

### Launch Day (Week 13)
- [ ] Deploy to production with feature flag (disabled)
- [ ] Enable for internal team first (dogfooding)
- [ ] Monitor logs and metrics for issues
- [ ] Enable for 10% of users (canary rollout)
- [ ] Monitor for 24 hours
- [ ] If stable, enable for 50% of users
- [ ] Monitor for 48 hours
- [ ] If stable, enable for 100% of users

### Post-Launch (Week 14+)
- [ ] Send announcement email to users
- [ ] Publish blog post explaining feature
- [ ] Monitor support tickets and user feedback
- [ ] Hot-fix any critical bugs within 24 hours
- [ ] Weekly review of metrics and user feedback
- [ ] Plan iteration based on learnings

---

## Dependencies & Blockers

### Technical Dependencies
- AWS account with S3 and Textract access
- Background job queue infrastructure
- WebSocket infrastructure for real-time updates
- PDF parsing library compatible with Next.js

### Design Dependencies
- Design system documentation (colors, typography, spacing)
- Existing component library to extend
- Brand guidelines for consistency

### Stakeholder Approvals
- Budget approval for external services (~$300/month)
- Security review for file upload implementation
- Privacy review for document storage (GDPR compliance if applicable)

---

## Communication Plan

### Weekly Standups (During Development)
- Team: Developers, Designer, QA
- Agenda: Progress updates, blockers, upcoming work
- Duration: 30 minutes

### Bi-Weekly Demos (Weeks 2, 4, 6, 8, 10, 12)
- Audience: Stakeholders, product team
- Format: Live demo of completed features
- Duration: 45 minutes
- Outcome: Feedback and approval to continue

### Monthly User Testing (Weeks 4, 8, 12)
- Audience: 3-5 beta users
- Format: Moderated usability testing
- Duration: 60 minutes per session
- Outcome: Insights for iteration

### Launch Communication
- Announcement: Email blast to all users
- Support: Updated help center articles
- Social: Twitter/blog post announcing feature

---

## Conclusion

This 16-week roadmap provides a structured approach to building a comprehensive document management and reconciliation system for Joot. The phased approach allows for iterative development, user feedback, and risk mitigation.

**Key Success Factors:**
1. Start with core upload/storage (get documents into system first)
2. Prioritize extraction accuracy (garbage in, garbage out)
3. User control over automation (trust through transparency)
4. Mobile capture as enhancement, not requirement
5. Continuous monitoring and iteration post-launch

**Expected Outcome:**
By the end of Phase 3 (Week 12), users will be able to upload financial documents, have them automatically matched to transactions, and reconcile their finances with significantly less manual work. Phase 4 polishes the experience and adds power-user features.

---

## Version Control

**Version:** 1.0
**Last Updated:** October 29, 2025
**Next Review:** Week 4 (end of Phase 1)

**Related Documents:**
- UX-DESIGN-Document-Management-System.md
- VISUAL-DESIGN-Document-Management-System.md
- Technical Architecture Spec (to be created)
- API Documentation (to be created)
