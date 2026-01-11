# Phase 2: Core Matching — Task Breakdown

**Feature:** Email-to-Transaction Linking System
**Phase:** 2 of 4 — Core Matching
**Status:** `draft`
**Created:** 2025-01-02
**Target Duration:** 2 weeks
**Prerequisites:** Phase 1 complete

---

## Steering & Inputs

| Input | Path | Intent |
|-------|------|--------|
| Main Spec | `design-docs/email-transaction-linking-system.md` | Complete feature specification |
| Wireframes | `design-docs/email-transaction-wireframes.md` | UI layouts and interactions |
| Roadmap | `design-docs/email-transaction-implementation-roadmap.md` | 8-week implementation plan |
| Phase 1 Tasks | `design-docs/tasks/phase-1-foundation-tasks.md` | Foundation work |

**Key Constraints:**
- Statement upload to Supabase Storage (files kept forever)
- ±2% exchange rate tolerance using `exchange_rates` table
- Always require user confirmation (no auto-approve)
- Block duplicate statement uploads with warning

---

## How to Use This Task List

1. Tasks are numbered `P2-001`, `P2-002`, etc. (P2 = Phase 2)
2. Execute tasks individually or in dependency order
3. Each task contains Acceptance Criteria and Verification steps
4. Parallelizable tasks are marked with `parallel: true`
5. While in `draft`, tasks may be refined. After `approved`, IDs are immutable

---

## Task Index

| Status | ID | Title | Group | Depends | Blocks |
|--------|-----|-------|-------|---------|--------|
| [ ] | P2-001 | Create `StatementUploadZone` component | Upload | — | P2-002 |
| [ ] | P2-002 | Implement file validation (type, size) | Upload | P2-001 | P2-003 |
| [ ] | P2-003 | Create Supabase Storage bucket for statements | Upload | P2-002 | P2-004 |
| [ ] | P2-004 | Implement file upload to Supabase Storage | Upload | P2-003 | P2-005 |
| [ ] | P2-005 | Create API route: POST /api/statements/upload | Upload | P2-004 | P2-006 |
| [ ] | P2-006 | Implement duplicate statement detection | Upload | P2-005 | P2-007 |
| [ ] | P2-007 | Create statement upload page UI | Upload | P2-006 | P2-008 |
| [ ] | P2-008 | Build Chase Sapphire statement parser | Parsing | — | P2-012 |
| [ ] | P2-009 | Build American Express statement parser | Parsing | — | P2-012 |
| [ ] | P2-010 | Build Bangkok Bank statement parser | Parsing | — | P2-012 |
| [ ] | P2-011 | Build Kasikorn Bank statement parser | Parsing | — | P2-012 |
| [ ] | P2-012 | Create PDF text extraction service | Parsing | P2-008–P2-011 | P2-013 |
| [ ] | P2-013 | Implement OCR fallback for images | Parsing | P2-012 | P2-014 |
| [ ] | P2-014 | Create statement processing job | Parsing | P2-013 | P2-015 |
| [ ] | P2-015 | Build amount matching algorithm | Matching | P2-014 | P2-018 |
| [ ] | P2-016 | Build date matching algorithm (±3 days) | Matching | P2-014 | P2-018 |
| [ ] | P2-017 | Build vendor fuzzy matching (Levenshtein) | Matching | P2-014 | P2-018 |
| [ ] | P2-018 | Build cross-currency converter | Matching | P2-015, P2-016, P2-017 | P2-019 |
| [ ] | P2-019 | Create match scoring algorithm | Matching | P2-018 | P2-020 |
| [ ] | P2-020 | Implement match suggestion ranker | Matching | P2-019 | P2-021 |
| [ ] | P2-021 | Create API route: POST /api/statements/[id]/process | API | P2-020 | P2-022 |
| [ ] | P2-022 | Create API route: GET /api/statements/[id]/matches | API | P2-021 | P2-023 |
| [ ] | P2-023 | Build `MatchCard` component (3 variants) | Review | P2-022 | P2-024 |
| [ ] | P2-024 | Build review queue filter bar | Review | P2-023 | P2-025 |
| [ ] | P2-025 | Implement infinite scroll for review queue | Review | P2-024 | P2-026 |
| [ ] | P2-026 | Create API route: POST /api/imports/approve | Review | P2-025 | P2-027 |
| [ ] | P2-027 | Create API route: POST /api/imports/reject | Review | P2-026 | P2-028 |
| [ ] | P2-028 | Implement approve/reject flow with optimistic updates | Review | P2-027 | P2-029 |
| [ ] | P2-029 | Add batch approve functionality | Review | P2-028 | P2-030 |
| [ ] | P2-030 | Create Review Queue page | Review | P2-029 | — |
| [ ] | P2-031 | Build `ConfidenceIndicator` component | UI | — | P2-023 |
| [ ] | P2-032 | Create processing results summary page | UI | P2-022 | P2-030 |
| [ ] | P2-033 | Write unit tests for matching algorithms | Testing | P2-019 | — |
| [ ] | P2-034 | Write integration tests for upload flow | Testing | P2-007 | — |
| [ ] | P2-035 | Write integration tests for review flow | Testing | P2-030 | — |

---

## Tasks (Detailed Sections)

<!--P2-001-->
### P2-001 — Create `StatementUploadZone` component

**Status:** open
**Group:** Upload
**Depends on:** —  |  **Blocks:** P2-002  |  **parallel:** true

**Description:**
Build the drag-and-drop file upload zone component with visual feedback states.

**Acceptance Criteria (EARS):**
- The component SHALL support drag-and-drop file upload
- WHEN file is dragged over THEN zone shows active state (blue border, blue background)
- WHEN upload succeeds THEN zone shows success state (green border, checkmark)
- WHEN upload fails THEN zone shows error state (red border, error message)
- The zone SHALL also support click-to-browse
- The zone SHALL display accepted file types and size limit

**Deliverables:**
- `src/components/page-specific/statement-upload-zone.tsx`

**Verification:**
- Visual: All states match wireframe
- Functional: Drag-and-drop works
- A11y: Keyboard accessible, screen reader friendly

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-002-->
### P2-002 — Implement file validation (type, size)

**Status:** open
**Group:** Upload
**Depends on:** P2-001  |  **Blocks:** P2-003  |  **parallel:** false

**Description:**
Add client-side validation for uploaded files.

**Acceptance Criteria (EARS):**
- The validator SHALL accept: PDF, PNG, JPG, JPEG, HEIC
- The validator SHALL reject files > 10MB
- WHEN file is invalid THEN show specific error message
- Validation SHALL happen before upload starts

**Deliverables:**
- File validation logic in upload zone component
- `src/lib/utils/file-validation.ts` if reusable

**Verification:**
- Unit: Validation correctly accepts/rejects file types
- Unit: Size limit enforced correctly

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-003-->
### P2-003 — Create Supabase Storage bucket for statements

**Status:** open
**Group:** Upload
**Depends on:** P2-002  |  **Blocks:** P2-004  |  **parallel:** false

**Description:**
Create and configure the Supabase Storage bucket for statement files.

**Acceptance Criteria (EARS):**
- The bucket SHALL be named `statement-uploads`
- The bucket SHALL have RLS policies matching user ID
- Files SHALL be stored at path: `{user_id}/{upload_id}.{ext}`
- The bucket SHALL NOT have automatic expiration (files kept forever)

**Deliverables:**
- Storage bucket configuration
- RLS policies for bucket
- Migration or setup script

**Verification:**
- Functional: Can upload/download files
- Security: User A cannot access User B's files

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-004-->
### P2-004 — Implement file upload to Supabase Storage

**Status:** open
**Group:** Upload
**Depends on:** P2-003  |  **Blocks:** P2-005  |  **parallel:** false

**Description:**
Implement the client-side file upload to Supabase Storage with progress tracking.

**Acceptance Criteria (EARS):**
- The upload SHALL show progress percentage
- WHEN upload succeeds THEN return file path and metadata
- WHEN upload fails THEN show retry option
- Large files SHALL be uploaded with resumable upload if available

**Deliverables:**
- Upload function in `src/lib/supabase/storage.ts`
- Progress tracking hook

**Verification:**
- Functional: Files upload successfully
- Progress: Progress bar updates during upload

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-005-->
### P2-005 — Create API route: POST /api/statements/upload

**Status:** open
**Group:** Upload
**Depends on:** P2-004  |  **Blocks:** P2-006  |  **parallel:** false

**Description:**
Create the API endpoint that receives statement upload metadata and creates the database record.

**Acceptance Criteria (EARS):**
- The endpoint SHALL accept: file_path, payment_method_id, statement_period_start, statement_period_end
- WHEN called THEN create `statement_uploads` record with status='pending'
- The response SHALL include the upload ID for tracking
- The endpoint SHALL validate payment_method_id exists

**Deliverables:**
- `src/app/api/statements/upload/route.ts`

**Verification:**
- Functional: Record created in database
- Validation: Invalid payment method rejected

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-006-->
### P2-006 — Implement duplicate statement detection

**Status:** open
**Group:** Upload
**Depends on:** P2-005  |  **Blocks:** P2-007  |  **parallel:** false

**Description:**
Detect if a statement has already been uploaded (same file hash or same period+payment method).

**Acceptance Criteria (EARS):**
- WHEN same file hash is uploaded THEN block with "This file has already been uploaded" warning
- WHEN same payment_method + period combo exists THEN warn "You already uploaded a statement for this period"
- User SHALL be shown link to previous upload results
- User SHALL be able to proceed anyway if they choose

**Deliverables:**
- Duplicate detection logic in upload API
- File hash calculation (MD5 or SHA256)
- Warning UI component

**Verification:**
- Duplicate file detected correctly
- Duplicate period detected correctly
- Warning shows previous results link

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-007-->
### P2-007 — Create statement upload page UI

**Status:** open
**Group:** Upload
**Depends on:** P2-006  |  **Blocks:** P2-008  |  **parallel:** false

**Description:**
Build the complete statement upload page with payment method selector, upload zone, and recent uploads list.

**Acceptance Criteria (EARS):**
- The page SHALL show payment method radio buttons (Chase, Amex, Bangkok Bank, Kasikorn)
- The page SHALL show the upload zone component
- The page SHALL show "Recent Uploads" section with last 5 uploads
- WHEN upload starts THEN show processing state with progress
- WHEN upload completes THEN navigate to results page

**Deliverables:**
- `src/app/imports/statements/page.tsx`

**Verification:**
- Visual: Matches wireframe layout
- Flow: Full upload flow works end-to-end

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-008-->
### P2-008 — Build Chase Sapphire statement parser

**Status:** open
**Group:** Parsing
**Depends on:** —  |  **Blocks:** P2-012  |  **parallel:** true

**Description:**
Create parser for Chase Sapphire Reserve PDF statements.

**Acceptance Criteria (EARS):**
- The parser SHALL extract: transaction date, posting date, description, amount, currency
- The parser SHALL handle both charges and credits
- The parser SHALL identify statement period from header
- Extraction SHALL handle multi-page statements

**Deliverables:**
- `src/lib/statements/parsers/chase.ts`
- Test fixtures with sample Chase statement data

**Verification:**
- Unit: Parser extracts all transactions from sample statement
- Edge: Multi-page, credits, foreign transactions handled

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-009-->
### P2-009 — Build American Express statement parser

**Status:** open
**Group:** Parsing
**Depends on:** —  |  **Blocks:** P2-012  |  **parallel:** true

**Description:**
Create parser for American Express PDF statements.

**Acceptance Criteria (EARS):**
- The parser SHALL extract: transaction date, description, amount, currency
- The parser SHALL handle Amex-specific formatting
- The parser SHALL identify statement period

**Deliverables:**
- `src/lib/statements/parsers/amex.ts`
- Test fixtures

**Verification:**
- Unit: Parser extracts all transactions correctly

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-010-->
### P2-010 — Build Bangkok Bank statement parser

**Status:** open
**Group:** Parsing
**Depends on:** —  |  **Blocks:** P2-012  |  **parallel:** true

**Description:**
Create parser for Bangkok Bank (Bualuang) statements.

**Acceptance Criteria (EARS):**
- The parser SHALL extract: transaction date, description, amount, currency (THB)
- The parser SHALL handle Thai language content
- The parser SHALL identify statement period

**Deliverables:**
- `src/lib/statements/parsers/bangkok-bank.ts`
- Test fixtures

**Verification:**
- Unit: Parser handles Thai text correctly

**Notes & Open Questions:**
- May need to handle different statement formats (PDF vs screenshot)

**Completion Log:** _(empty initially)_

---

<!--P2-011-->
### P2-011 — Build Kasikorn Bank statement parser

**Status:** open
**Group:** Parsing
**Depends on:** —  |  **Blocks:** P2-012  |  **parallel:** true

**Description:**
Create parser for Kasikorn Bank (K PLUS) statements.

**Acceptance Criteria (EARS):**
- The parser SHALL extract: transaction date, description, amount, currency (THB)
- The parser SHALL handle K PLUS app export formats
- The parser SHALL identify account and period

**Deliverables:**
- `src/lib/statements/parsers/kasikorn.ts`
- Test fixtures

**Verification:**
- Unit: Parser extracts transactions correctly

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-012-->
### P2-012 — Create PDF text extraction service

**Status:** open
**Group:** Parsing
**Depends on:** P2-008, P2-009, P2-010, P2-011  |  **Blocks:** P2-013  |  **parallel:** false

**Description:**
Create service that extracts text from PDF files and routes to appropriate parser.

**Acceptance Criteria (EARS):**
- The service SHALL extract text from PDF using pdf-parse or similar
- WHEN PDF detected as Chase THEN use Chase parser
- WHEN PDF detected as Amex THEN use Amex parser
- WHEN PDF type unknown THEN return error with suggestion
- The service SHALL preserve page structure for multi-page documents

**Deliverables:**
- `src/lib/statements/pdf-extractor.ts`
- Parser router logic

**Verification:**
- Integration: Correct parser selected for each statement type

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-013-->
### P2-013 — Implement OCR fallback for images

**Status:** open
**Group:** Parsing
**Depends on:** P2-012  |  **Blocks:** P2-014  |  **parallel:** false

**Description:**
Add OCR capability for image uploads (PNG, JPG, HEIC) when PDF extraction fails or isn't applicable.

**Acceptance Criteria (EARS):**
- WHEN file is image THEN run OCR before parsing
- WHEN PDF text extraction fails THEN fall back to OCR
- The OCR SHALL use Tesseract.js or Google Cloud Vision
- Extracted text SHALL be passed to appropriate parser

**Deliverables:**
- `src/lib/statements/ocr-service.ts`
- OCR configuration

**Verification:**
- Integration: OCR extracts readable text from statement images

**Notes & Open Questions:**
- Consider accuracy vs. cost tradeoffs between Tesseract.js and Cloud Vision

**Completion Log:** _(empty initially)_

---

<!--P2-014-->
### P2-014 — Create statement processing job

**Status:** open
**Group:** Parsing
**Depends on:** P2-013  |  **Blocks:** P2-015  |  **parallel:** false

**Description:**
Create the background job that processes uploaded statements end-to-end.

**Acceptance Criteria (EARS):**
- WHEN triggered THEN: extract text → parse transactions → run matching → save results
- The job SHALL update `statement_uploads.status` at each stage
- WHEN error occurs THEN log error and set status='failed'
- The job SHALL be resumable if interrupted
- Progress SHALL be trackable via API

**Deliverables:**
- `src/jobs/statement-processor.ts`
- Job status tracking

**Verification:**
- Integration: Full processing flow works
- Error: Failures logged and status updated correctly

**Notes & Open Questions:**
- Consider using Inngest for job management, or inline processing for MVP

**Completion Log:** _(empty initially)_

---

<!--P2-015-->
### P2-015 — Build amount matching algorithm

**Status:** open
**Group:** Matching
**Depends on:** P2-014  |  **Blocks:** P2-018  |  **parallel:** true

**Description:**
Create algorithm that compares transaction amounts with ±2% tolerance.

**Acceptance Criteria (EARS):**
- WHEN amounts are within ±2% THEN consider a match (score contribution)
- WHEN amounts are exact THEN give higher score
- WHEN amounts differ by >10% THEN cap max confidence at 60
- The algorithm SHALL handle same-currency and cross-currency comparisons

**Deliverables:**
- `src/lib/matching/amount-matcher.ts`

**Verification:**
- Unit: Tolerance calculations are correct
- Unit: Cross-currency comparison works with exchange rates

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-016-->
### P2-016 — Build date matching algorithm (±3 days)

**Status:** open
**Group:** Matching
**Depends on:** P2-014  |  **Blocks:** P2-018  |  **parallel:** true

**Description:**
Create algorithm that matches transaction dates with tolerance for posting delays.

**Acceptance Criteria (EARS):**
- WHEN dates are same day THEN highest score contribution
- WHEN dates within ±1 day THEN high score
- WHEN dates within ±3 days THEN medium score
- WHEN dates >3 days apart THEN cap max confidence at 70
- The algorithm SHALL consider posting delays (email date vs statement date)

**Deliverables:**
- `src/lib/matching/date-matcher.ts`

**Verification:**
- Unit: Date tolerance scoring is correct
- Unit: Handles timezone edge cases

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-017-->
### P2-017 — Build vendor fuzzy matching (Levenshtein)

**Status:** open
**Group:** Matching
**Depends on:** P2-014  |  **Blocks:** P2-018  |  **parallel:** true

**Description:**
Create algorithm that fuzzy-matches vendor names between email and statement.

**Acceptance Criteria (EARS):**
- The algorithm SHALL use Levenshtein distance or similar
- WHEN vendor names are exact match THEN highest score
- WHEN similarity > 80% THEN consider a match
- The algorithm SHALL handle common transformations (e.g., "GrabFood" → "Grab* Bangkok TH")
- Known vendor aliases SHALL be checked first

**Deliverables:**
- `src/lib/matching/fuzzy-matcher.ts`

**Verification:**
- Unit: Known transformations match correctly
- Unit: Similar names scored appropriately

**Notes & Open Questions:**
- Consider maintaining a vendor alias table for Phase 5 learning

**Completion Log:** _(empty initially)_

---

<!--P2-018-->
### P2-018 — Build cross-currency converter

**Status:** open
**Group:** Matching
**Depends on:** P2-015, P2-016, P2-017  |  **Blocks:** P2-019  |  **parallel:** false

**Description:**
Create service that converts amounts between currencies using stored historical exchange rates.

**Acceptance Criteria (EARS):**
- The converter SHALL use `exchange_rates` table for historical rates
- WHEN converting THB to USD THEN use rate for transaction date
- WHEN rate not found for exact date THEN use nearest available rate
- The converter SHALL log when rate approximation is used
- ±2% variance from expected conversion SHALL be acceptable for matching

**Deliverables:**
- `src/lib/matching/cross-currency.ts`

**Verification:**
- Unit: Conversions use correct historical rates
- Unit: Missing rate fallback works correctly

**Notes & Open Questions:**
- This uses the existing `exchange_rates` table populated by daily sync

**Completion Log:** _(empty initially)_

---

<!--P2-019-->
### P2-019 — Create match scoring algorithm

**Status:** open
**Group:** Matching
**Depends on:** P2-018  |  **Blocks:** P2-020  |  **parallel:** false

**Description:**
Create the composite scoring algorithm that combines all matching factors.

**Acceptance Criteria (EARS):**
- The score SHALL be 0-100 based on:
  - Amount match: up to 40 points
  - Date match: up to 30 points
  - Vendor match: up to 30 points
- WHEN score >= 90 THEN HIGH confidence
- WHEN score 55-89 THEN MEDIUM confidence
- WHEN score < 55 THEN LOW confidence
- The algorithm SHALL explain why each score was given (match reasons)

**Deliverables:**
- `src/lib/matching/match-scorer.ts`

**Verification:**
- Unit: Scoring is deterministic
- Unit: Reasons are generated correctly

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-020-->
### P2-020 — Implement match suggestion ranker

**Status:** open
**Group:** Matching
**Depends on:** P2-019  |  **Blocks:** P2-021  |  **parallel:** false

**Description:**
Create service that ranks multiple potential matches and suggests the best one.

**Acceptance Criteria (EARS):**
- WHEN multiple matches found THEN rank by confidence score
- The ranker SHALL return top 3 suggestions for review
- WHEN no matches found THEN mark email as 'no_match'
- WHEN single high-confidence match THEN mark as 'matched'

**Deliverables:**
- `src/lib/matching/match-ranker.ts`

**Verification:**
- Unit: Ranking is correct
- Integration: Suggestions stored correctly

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-021-->
### P2-021 — Create API route: POST /api/statements/[id]/process

**Status:** open
**Group:** API
**Depends on:** P2-020  |  **Blocks:** P2-022  |  **parallel:** false

**Description:**
Create API endpoint to trigger statement processing.

**Acceptance Criteria (EARS):**
- WHEN called THEN queue/start statement processing job
- The response SHALL include job ID and estimated time
- WHEN processing already running THEN return 409 Conflict
- The endpoint SHALL be authenticated and authorized (user owns statement)

**Deliverables:**
- `src/app/api/statements/[id]/process/route.ts`

**Verification:**
- Functional: Processing triggered
- Auth: Only owner can trigger processing

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-022-->
### P2-022 — Create API route: GET /api/statements/[id]/matches

**Status:** open
**Group:** API
**Depends on:** P2-021  |  **Blocks:** P2-023  |  **parallel:** false

**Description:**
Create API endpoint to retrieve processing results and match suggestions.

**Acceptance Criteria (EARS):**
- The response SHALL include: statement info, matches array, summary stats
- Matches SHALL include: email data, suggested transaction, confidence, reasons
- The response SHALL indicate processing status (pending, processing, completed, failed)

**Deliverables:**
- `src/app/api/statements/[id]/matches/route.ts`

**Verification:**
- Functional: Returns correct match data
- Status: Reflects current processing state

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-023-->
### P2-023 — Build `MatchCard` component (3 variants)

**Status:** open
**Group:** Review
**Depends on:** P2-022, P2-031  |  **Blocks:** P2-024  |  **parallel:** false

**Description:**
Build the match card component with variants for different match states.

**Acceptance Criteria (EARS):**
- Variant 1: HIGH CONFIDENCE MATCH - green border, approve/reject buttons
- Variant 2: WAITING FOR STATEMENT - blue border, "link manually" option
- Variant 3: READY TO IMPORT - purple border, "approve & import" button
- All variants SHALL show: email info, match info, confidence indicator, action buttons
- Cards SHALL be collapsible for additional details

**Deliverables:**
- `src/components/page-specific/match-card.tsx`

**Verification:**
- Visual: All variants match wireframe
- Functional: Actions trigger correct API calls

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-024-->
### P2-024 — Build review queue filter bar

**Status:** open
**Group:** Review
**Depends on:** P2-023  |  **Blocks:** P2-025  |  **parallel:** false

**Description:**
Build the filter bar component for the review queue.

**Acceptance Criteria (EARS):**
- Filters SHALL include: Status (all, pending, matched, waiting), Currency (all, USD, THB), Date range
- Search box SHALL filter by vendor, amount, description
- Filter state SHALL be reflected in URL params
- Clear All button SHALL reset all filters

**Deliverables:**
- Filter bar component in review queue page
- URL param sync for filters

**Verification:**
- Functional: Filters work correctly
- URL: Filter state persists in URL

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-025-->
### P2-025 — Implement infinite scroll for review queue

**Status:** open
**Group:** Review
**Depends on:** P2-024  |  **Blocks:** P2-026  |  **parallel:** false

**Description:**
Implement infinite scroll pagination for the review queue list.

**Acceptance Criteria (EARS):**
- WHEN user scrolls near bottom THEN load next page
- Loading indicator SHALL appear while fetching
- WHEN no more items THEN show "end of list" indicator
- The queue SHALL preserve scroll position on navigation back

**Deliverables:**
- Infinite scroll implementation using React Query or similar
- Scroll position preservation

**Verification:**
- Functional: More items load on scroll
- Performance: No jank during loading

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-026-->
### P2-026 — Create API route: POST /api/imports/approve

**Status:** open
**Group:** Review
**Depends on:** P2-025  |  **Blocks:** P2-027  |  **parallel:** false

**Description:**
Create API endpoint to approve matches and optionally create transactions.

**Acceptance Criteria (EARS):**
- The endpoint SHALL accept: emailIds array, createTransactions boolean
- WHEN approved THEN update email_transactions status to 'imported'
- WHEN createTransactions=true THEN create transaction records
- The response SHALL include: success count, failed count, total amount

**Deliverables:**
- `src/app/api/imports/approve/route.ts`

**Verification:**
- Functional: Status updates correctly
- Transactions: Created when requested

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-027-->
### P2-027 — Create API route: POST /api/imports/reject

**Status:** open
**Group:** Review
**Depends on:** P2-026  |  **Blocks:** P2-028  |  **parallel:** false

**Description:**
Create API endpoint to reject matches.

**Acceptance Criteria (EARS):**
- The endpoint SHALL accept: emailId, reason (optional)
- WHEN rejected THEN update email_transactions status to 'skipped'
- The rejection reason SHALL be stored in metadata

**Deliverables:**
- `src/app/api/imports/reject/route.ts`

**Verification:**
- Functional: Status updates correctly
- Reason: Stored if provided

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-028-->
### P2-028 — Implement approve/reject flow with optimistic updates

**Status:** open
**Group:** Review
**Depends on:** P2-027  |  **Blocks:** P2-029  |  **parallel:** false

**Description:**
Implement the frontend approve/reject flow with optimistic updates for better UX.

**Acceptance Criteria (EARS):**
- WHEN user clicks Approve THEN card immediately shows approved state
- WHEN user clicks Reject THEN card immediately shows rejected state
- WHEN API call fails THEN revert state and show error toast
- Undo option SHALL appear for 5 seconds after action

**Deliverables:**
- Approve/reject handlers with optimistic updates
- Undo toast component

**Verification:**
- UX: Instant visual feedback
- Error: Reverts correctly on failure

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-029-->
### P2-029 — Add batch approve functionality

**Status:** open
**Group:** Review
**Depends on:** P2-028  |  **Blocks:** P2-030  |  **parallel:** false

**Description:**
Add ability to approve multiple high-confidence matches at once.

**Acceptance Criteria (EARS):**
- "Approve All High-Confidence" button SHALL appear when items exist
- Clicking SHALL show confirmation dialog with preview
- The dialog SHALL show: count, total amount, first 5 transactions
- WHEN confirmed THEN batch approve all matching items
- Progress indicator SHALL show during batch operation

**Deliverables:**
- Batch approve button and confirmation dialog
- Batch approve logic

**Verification:**
- Functional: All items approved correctly
- UX: Progress shown during operation

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-030-->
### P2-030 — Create Review Queue page

**Status:** open
**Group:** Review
**Depends on:** P2-029  |  **Blocks:** —  |  **parallel:** false

**Description:**
Assemble all review queue components into the complete page.

**Acceptance Criteria (EARS):**
- The page SHALL include: filter bar, summary counts, match cards list, batch actions
- The page SHALL be responsive (desktop/tablet/mobile)
- The page SHALL show empty state when no items
- The page SHALL handle loading and error states

**Deliverables:**
- `src/app/imports/review/page.tsx`

**Verification:**
- Visual: Matches wireframe at all breakpoints
- Functional: Full review flow works

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-031-->
### P2-031 — Build `ConfidenceIndicator` component

**Status:** open
**Group:** UI
**Depends on:** —  |  **Blocks:** P2-023  |  **parallel:** true

**Description:**
Create the confidence score indicator component with progress bar and label.

**Acceptance Criteria (EARS):**
- The component SHALL show: percentage, progress bar, label (HIGH/MEDIUM/LOW)
- High (>90%): green bar, "HIGH" badge
- Medium (55-90%): amber bar, "MEDIUM" badge
- Low (<55%): red bar, "LOW" badge
- The component SHALL be reusable across match cards

**Deliverables:**
- `src/components/ui/confidence-indicator.tsx`

**Verification:**
- Visual: Colors and labels match spec
- Reusable: Works in different contexts

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-032-->
### P2-032 — Create processing results summary page

**Status:** open
**Group:** UI
**Depends on:** P2-022  |  **Blocks:** P2-030  |  **parallel:** false

**Description:**
Build the page shown after statement processing completes with summary stats.

**Acceptance Criteria (EARS):**
- The page SHALL show: statement info, transaction counts, match quality distribution
- Summary SHALL include: total extracted, matched, new, amounts
- Match quality chart SHALL show high/medium/low/no-match breakdown
- CTA buttons SHALL link to review queue and history

**Deliverables:**
- Results summary component/page
- Match quality distribution chart

**Verification:**
- Visual: Matches wireframe
- Data: Stats are accurate

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-033-->
### P2-033 — Write unit tests for matching algorithms

**Status:** open
**Group:** Testing
**Depends on:** P2-019  |  **Blocks:** —  |  **parallel:** true

**Description:**
Create comprehensive unit tests for all matching algorithm components.

**Acceptance Criteria (EARS):**
- Amount matcher SHALL have tests for: exact match, tolerance, cross-currency
- Date matcher SHALL have tests for: same day, tolerance, timezone edge cases
- Fuzzy matcher SHALL have tests for: exact, similar, different names
- Score calculator SHALL have tests for: all score combinations

**Deliverables:**
- `__tests__/lib/matching/amount-matcher.test.ts`
- `__tests__/lib/matching/date-matcher.test.ts`
- `__tests__/lib/matching/fuzzy-matcher.test.ts`
- `__tests__/lib/matching/match-scorer.test.ts`

**Verification:**
- All tests pass
- Coverage > 90% for matching modules

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-034-->
### P2-034 — Write integration tests for upload flow

**Status:** open
**Group:** Testing
**Depends on:** P2-007  |  **Blocks:** —  |  **parallel:** true

**Description:**
Create integration tests for the statement upload flow.

**Acceptance Criteria (EARS):**
- Tests SHALL verify: file upload, duplicate detection, processing trigger
- Tests SHALL mock Supabase Storage
- Tests SHALL verify database records created correctly

**Deliverables:**
- `__tests__/integration/statement-upload.test.ts`

**Verification:**
- Tests pass with mocked storage

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P2-035-->
### P2-035 — Write integration tests for review flow

**Status:** open
**Group:** Testing
**Depends on:** P2-030  |  **Blocks:** —  |  **parallel:** true

**Description:**
Create integration tests for the review queue approve/reject flow.

**Acceptance Criteria (EARS):**
- Tests SHALL verify: approve updates status, reject updates status, batch approve works
- Tests SHALL verify transactions created when appropriate
- Tests SHALL verify optimistic updates and rollback

**Deliverables:**
- `__tests__/integration/review-flow.test.ts`

**Verification:**
- Tests pass

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

## Dependency Map

```
Upload Path:
P2-001 ──► P2-002 ──► P2-003 ──► P2-004 ──► P2-005 ──► P2-006 ──► P2-007

Parsing Path (parallel parsers):
P2-008 ─┐
P2-009 ─┼──► P2-012 ──► P2-013 ──► P2-014
P2-010 ─┤
P2-011 ─┘

Matching Path (parallel matchers):
P2-015 ─┐
P2-016 ─┼──► P2-018 ──► P2-019 ──► P2-020 ──► P2-021 ──► P2-022
P2-017 ─┘

Review Path:
P2-031 ──► P2-023 ──► P2-024 ──► P2-025 ──► P2-026 ──► P2-027 ──► P2-028 ──► P2-029 ──► P2-030

Safe Parallel Lanes:
- P2-008, P2-009, P2-010, P2-011 (statement parsers)
- P2-015, P2-016, P2-017 (matching algorithms)
- P2-031 can run parallel with upload/parsing paths
- Testing tasks can run parallel with other work
```

---

## Traceability

| Spec Requirement | Plan Section | Task IDs |
|-----------------|--------------|----------|
| Statement upload | Phase 2: Statement Upload | P2-001–P2-007 |
| PDF text extraction | Phase 2: Statement Upload | P2-012 |
| OCR for images | Phase 2: Statement Upload | P2-013 |
| Statement parsers | Phase 2: Statement Upload | P2-008–P2-011 |
| Matching algorithm | Phase 2: Matching Algorithm | P2-015–P2-020 |
| Cross-currency matching | Phase 2: Matching Algorithm | P2-018 |
| Review queue UI | Phase 2: Review Queue | P2-023–P2-030 |
| Approve/reject flow | Phase 2: Review Queue | P2-026–P2-028 |
| Batch approve | Phase 2: Review Queue | P2-029 |

---

## Estimates & Sequencing Notes

| Task ID | Estimate | Notes |
|---------|----------|-------|
| P2-001–P2-007 | M (2-3 hrs each) | Upload flow is well-defined |
| P2-008–P2-011 | M-L (3-4 hrs each) | Parsers need pattern testing |
| P2-012–P2-014 | M (2-3 hrs each) | PDF/OCR integration |
| P2-015–P2-020 | M (2-3 hrs each) | Matching algorithms |
| P2-021–P2-022 | S (1-2 hrs each) | API routes |
| P2-023–P2-030 | M (2-4 hrs each) | Review queue UI |
| P2-031–P2-032 | S (1-2 hrs each) | Support components |
| P2-033–P2-035 | M (3-5 hrs total) | Testing |

**Total Estimated Time:** ~60-75 hours (2 weeks with buffer)

---

## Update Protocol

When implementing tasks:

1. **Mark task in progress:** Add note to Completion Log with start timestamp
2. **Update status when done:**
   - Flip checkbox in Task Index: `[ ]` → `[x]`
   - Change `**Status:** open` → `**Status:** done`
   - Add Completion Log entry: `- done: <ISO-8601> · by: <agent|user> · notes: <optional>`
3. **If blocked:** Add note to Notes & Open Questions, do not mark done
4. **If scope changes:** Append new tasks with next available ID (P2-036, etc.)
5. **Never renumber** existing task IDs after document is approved

---

## Approval Gate

Task breakdown complete (initial state: all tasks open).

**Phase 2 Summary:**
- 35 tasks total
- 7 Upload, 7 Parsing, 6 Matching, 8 Review, 4 UI, 3 Testing
- Critical path: Upload → Parsing → Matching → Review
- Multiple parallel work opportunities

Would you like to approve or modify the tasks?
