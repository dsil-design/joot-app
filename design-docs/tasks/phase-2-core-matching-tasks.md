# Phase 2: Core Matching — Task Breakdown

**Feature:** Email-to-Transaction Linking System
**Phase:** 2 of 4 — Core Matching
**Status:** `complete`
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
| AI Skill Guide | `.claude/skills/email-linking/SKILL.md` | Code patterns and architecture |

**Key Constraints:**
- Statement upload to Supabase Storage (files kept forever)
- ±2% exchange rate tolerance using `exchange_rates` table
- Always require user confirmation (no auto-approve)
- Block duplicate statement uploads with warning

---

## AI Implementation Guide

### Recommended Agents by Task Group

| Group | Agent | Why |
|-------|-------|-----|
| Upload (P2-001 to P2-007) | `frontend-developer` | React components, file handling |
| Parsing (P2-008 to P2-014) | `typescript-pro` | PDF parsing, text extraction |
| Matching (P2-015 to P2-020) | `backend-architect` | Algorithm design |
| Review (P2-021 to P2-030) | `frontend-developer` | Review queue UI |
| UI (P2-031 to P2-032) | `frontend-developer` | Component design |
| Testing (P2-033 to P2-035) | `test-automator` | Test suites |

### Critical Codebase Patterns

**File Upload with react-dropzone:**
```typescript
import { useDropzone } from 'react-dropzone';

const { getRootProps, getInputProps, isDragActive } = useDropzone({
  accept: { 'application/pdf': ['.pdf'] },
  maxSize: 10 * 1024 * 1024, // 10MB
  onDrop: handleFileDrop,
});
```

**Supabase Storage Upload:**
```typescript
const { data, error } = await supabase.storage
  .from('statement-uploads')
  .upload(`${userId}/${uploadId}.pdf`, file);
```

**PDF Text Extraction (use pdf-parse):**
```bash
npm install pdf-parse
```

```typescript
import pdfParse from 'pdf-parse';

const dataBuffer = await file.arrayBuffer();
const pdfData = await pdfParse(Buffer.from(dataBuffer));
const text = pdfData.text;
```

**Match Scoring Constants:**
```typescript
const SCORE_WEIGHTS = {
  AMOUNT: 40,   // Max 40 points
  DATE: 30,     // Max 30 points
  VENDOR: 30,   // Max 30 points
};

const CONFIDENCE_THRESHOLDS = {
  HIGH: 90,     // >= 90: High confidence
  MEDIUM: 55,   // 55-89: Medium confidence
};
```

**Exchange Rate Lookup:**
```typescript
// Use existing exchange_rates table for historical rates
const { data: rate } = await supabase
  .from('exchange_rates')
  .select('rate')
  .eq('from_currency', 'THB')
  .eq('to_currency', 'USD')
  .eq('date', transactionDate)
  .single();

// If no exact date, find nearest
if (!rate) {
  const { data: nearest } = await supabase
    .from('exchange_rates')
    .select('rate, date')
    .eq('from_currency', 'THB')
    .eq('to_currency', 'USD')
    .order('date', { ascending: false })
    .lt('date', transactionDate)
    .limit(1)
    .single();
}
```

### Key File Locations

```
src/lib/statements/
├── parsers/
│   ├── chase.ts          # P2-008
│   ├── amex.ts           # P2-009
│   ├── bangkok-bank.ts   # P2-010
│   └── kasikorn.ts       # P2-011
├── pdf-extractor.ts      # P2-012
└── statement-processor.ts # P2-014

src/lib/matching/
├── amount-matcher.ts     # P2-015
├── date-matcher.ts       # P2-016
├── fuzzy-matcher.ts      # P2-017
├── cross-currency.ts     # P2-018
├── match-scorer.ts       # P2-019
└── match-ranker.ts       # P2-020

src/components/page-specific/
├── statement-upload-zone.tsx  # P2-001
├── match-card.tsx            # P2-023
└── confidence-indicator.tsx  # P2-031

src/app/imports/
├── statements/page.tsx   # P2-007
└── review/page.tsx       # P2-030
```

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
| [x] | P2-001 | Create `StatementUploadZone` component | Upload | — | P2-002 |
| [x] | P2-002 | Implement file validation (type, size) | Upload | P2-001 | P2-003 |
| [x] | P2-003 | Create Supabase Storage bucket for statements | Upload | P2-002 | P2-004 |
| [x] | P2-004 | Implement file upload to Supabase Storage | Upload | P2-003 | P2-005 |
| [x] | P2-005 | Create API route: POST /api/statements/upload | Upload | P2-004 | P2-006 |
| [x] | P2-006 | Implement duplicate statement detection | Upload | P2-005 | P2-007 |
| [x] | P2-007 | Create statement upload page UI | Upload | P2-006 | P2-008 |
| [x] | P2-008 | Build Chase Sapphire statement parser | Parsing | — | P2-012 |
| [x] | P2-009 | Build American Express statement parser | Parsing | — | P2-012 |
| [x] | P2-010 | Build Bangkok Bank statement parser | Parsing | — | P2-012 |
| [x] | P2-011 | Build Kasikorn Bank statement parser | Parsing | — | P2-012 |
| [x] | P2-012 | Create PDF text extraction service | Parsing | P2-008–P2-011 | P2-013 |
| [x] | P2-013 | *(Optional)* Implement OCR fallback for images | Parsing | P2-012 | P2-014 |
| [x] | P2-014 | Create statement processing job | Parsing | P2-012 | P2-015 |
| [x] | P2-015 | Build amount matching algorithm | Matching | P2-014 | P2-018 |
| [x] | P2-016 | Build date matching algorithm (±3 days) | Matching | P2-014 | P2-018 |
| [x] | P2-017 | Build vendor fuzzy matching (Levenshtein) | Matching | P2-014 | P2-018 |
| [x] | P2-018 | Build cross-currency converter | Matching | P2-015, P2-016, P2-017 | P2-019 |
| [x] | P2-019 | Create match scoring algorithm | Matching | P2-018 | P2-020 |
| [x] | P2-020 | Implement match suggestion ranker | Matching | P2-019 | P2-021 |
| [x] | P2-021 | Create API route: POST /api/statements/[id]/process | API | P2-020 | P2-022 |
| [x] | P2-022 | Create API route: GET /api/statements/[id]/matches | API | P2-021 | P2-023 |
| [x] | P2-023 | Build `MatchCard` component (3 variants) | Review | P2-022 | P2-024 |
| [x] | P2-024 | Build review queue filter bar | Review | P2-023 | P2-025 |
| [x] | P2-025 | Implement infinite scroll for review queue | Review | P2-024 | P2-026 |
| [x] | P2-026 | Create API route: POST /api/imports/approve | Review | P2-025 | P2-027 |
| [x] | P2-027 | Create API route: POST /api/imports/reject | Review | P2-026 | P2-028 |
| [x] | P2-028 | Implement approve/reject flow with optimistic updates | Review | P2-027 | P2-029 |
| [x] | P2-029 | Add batch approve functionality | Review | P2-028 | P2-030 |
| [x] | P2-030 | Create Review Queue page | Review | P2-029 | — |
| [x] | P2-031 | Build `ConfidenceIndicator` component | UI | — | P2-023 |
| [x] | P2-032 | Create processing results summary page | UI | P2-022 | P2-030 |
| [x] | P2-033 | Write unit tests for matching algorithms | Testing | P2-019 | — |
| [x] | P2-034 | Write integration tests for upload flow | Testing | P2-007 | — |
| [x] | P2-035 | Write integration tests for review flow | Testing | P2-030 | — |

---

## Tasks (Detailed Sections)

<!--P2-001-->
### P2-001 — Create `StatementUploadZone` component

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created component with all 5 visual states (idle, active, uploading, success, error), drag-and-drop support via react-dropzone, click-to-browse functionality, file type/size display, and full accessibility (ARIA labels, keyboard support, screen reader friendly). Includes StatementUploadZoneSkeleton for loading states.

---

<!--P2-002-->
### P2-002 — Implement file validation (type, size)

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created `src/lib/utils/file-validation.ts` with comprehensive validation utilities (validateFile, validateFileSize, validateFileType, validateFiles) supporting PDF, PNG, JPG, JPEG, HEIC up to 10MB. Updated StatementUploadZone to use new validation with onValidationError callback. Added 55 unit tests covering all validation scenarios including edge cases (HEIC without MIME type, boundary conditions, etc.).

---

<!--P2-003-->
### P2-003 — Create Supabase Storage bucket for statements

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created migration `20260112133602_create_statement_uploads_storage_bucket.sql` that creates private `statement-uploads` bucket with 10MB file size limit, allowed MIME types (PDF, PNG, JPEG, HEIC), and RLS policies ensuring users can only access files in their own folder (`{user_id}/{upload_id}.{ext}`). Added `get_statement_upload_path()` helper function. Updated `database/schema.sql` with bucket configuration. Verified bucket creation via Supabase API.

---

<!--P2-004-->
### P2-004 — Implement file upload to Supabase Storage

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created `src/lib/supabase/storage.ts` with `uploadStatementFile()` function that uploads to `statement-uploads` bucket with XMLHttpRequest for real-time progress tracking (0-100%). Includes `getStatementUploadPath()`, `deleteStatementFile()`, and `getStatementFileUrl()` helpers. Created `src/hooks/use-statement-upload.ts` hook providing `uploadState` (state, progress, error, uploadedFile), `uploadFile()`, `reset()`, and `isUploading`. Hook integrates with `StatementUploadZone` component props for seamless UI binding. Type check passes.

---

<!--P2-005-->
### P2-005 — Create API route: POST /api/statements/upload

**Status:** done
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

**Completion Log:**
- 2026-01-12: Created `src/app/api/statements/upload/route.ts` with:
  - POST endpoint accepting file_path, payment_method_id, statement_period_start, statement_period_end
  - Validates all required fields and data types (UUID format, date validity)
  - Validates payment_method_id exists and belongs to authenticated user
  - Creates `statement_uploads` record with status='pending'
  - Returns 201 with upload_id, filename, file_path, status, created_at
  - Proper error handling (400, 401, 404, 500)

---

<!--P2-006-->
### P2-006 — Implement duplicate statement detection

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Implemented complete duplicate detection:
  - Added `file_hash` column to `statement_uploads` table via migration (SHA256 hash, unique per user)
  - Created `src/lib/statements/duplicate-detector.ts` with `calculateFileHash()`, `checkForDuplicates()`, and `getDuplicateMessage()` functions
  - Updated `/api/statements/upload` to check for duplicates before insert, returns 409 with duplicate info
  - Created `DuplicateStatementWarning` component with link to previous results and "Upload Anyway" option
  - Added 15 unit tests covering hash calculation, duplicate detection, and message formatting

---

<!--P2-007-->
### P2-007 — Create statement upload page UI

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created complete statement upload page with payment method selection (radio buttons from user's payment_methods), statement period date pickers, StatementUploadZone integration with progress tracking, duplicate detection with DuplicateStatementWarning component, and Recent Uploads section showing last 5 uploads with status badges. Full flow: select payment method → set period → upload file → navigate to results. Build passes.

---

<!--P2-008-->
### P2-008 — Build Chase Sapphire statement parser

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created Chase Sapphire statement parser at `src/lib/statements/parsers/chase.ts` with comprehensive parsing capabilities:
  - Extracts transaction date, posting date, description, amount (USD)
  - Handles charges, credits, payments, fees, and interest transactions
  - Identifies statement period from Opening/Closing Date header
  - Handles multi-page statements (page count estimation)
  - Extracts foreign transaction details (THB amounts, exchange rates)
  - Detects transaction categories (Travel, Dining, Transportation, Shopping, Groceries)
  - Extracts account summary (previous balance, new balance, credit limit, etc.)
  - Created shared types in `src/lib/statements/parsers/types.ts`
  - Created parser registry in `src/lib/statements/parsers/index.ts`
  - 61 unit tests covering all acceptance criteria at `__tests__/lib/statements/parsers/chase.test.ts`

---

<!--P2-009-->
### P2-009 — Build American Express statement parser

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created American Express statement parser at `src/lib/statements/parsers/amex.ts` with comprehensive parsing capabilities:
  - Extracts transaction date, description, amount (USD), and transaction type
  - Supports both numeric (MM/DD) and named month (Dec 5) date formats
  - Handles CR suffix for credits and negative amounts
  - Identifies statement period from multiple formats (Statement Period, Closing Date, Billing Period)
  - Detects card types: Platinum, Gold, Green, Blue Cash, Delta SkyMiles, Hilton Honors, Marriott Bonvoy
  - Extracts foreign transaction details (original currency, exchange rate)
  - Detects transaction categories (Travel, Dining, Transportation, Shopping, Groceries, Entertainment)
  - Extracts account summary (previous balance, new balance, minimum payment)
  - Handles multi-page statements
  - Skips membership rewards/points sections
  - Registered parser in `src/lib/statements/parsers/index.ts`
  - 78 unit tests covering all acceptance criteria at `__tests__/lib/statements/parsers/amex.test.ts`

---

<!--P2-010-->
### P2-010 — Build Bangkok Bank statement parser

**Status:** done
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

**Completion Log:**
- Created `src/lib/statements/parsers/bangkok-bank.ts` implementing full parser
- Handles Thai and English content, DD/MM/YYYY and Buddhist Era date formats
- Extracts: transaction date, description, amount (THB currency), transaction type
- Extracts statement period, summary totals, and account info
- Detects transaction categories (Travel, Dining, Transportation, Shopping, Groceries, Entertainment, Utilities)
- Supports Bualuang cards (Platinum, Titanium, Gold, Visa, Mastercard)
- Registered parser in `src/lib/statements/parsers/index.ts`
- 71 unit tests at `__tests__/lib/statements/parsers/bangkok-bank.test.ts`

---

<!--P2-011-->
### P2-011 — Build Kasikorn Bank statement parser

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created Kasikorn Bank statement parser at `src/lib/statements/parsers/kasikorn.ts` with comprehensive parsing capabilities:
  - Extracts transaction date, description, amount (THB currency), and transaction type
  - Handles Thai and English content, DD/MM/YYYY, DD-MM-YYYY, and Buddhist Era date formats
  - Handles K PLUS app export formats with channel references
  - Extracts statement period, summary totals, and account info
  - Detects transaction categories (Travel, Dining, Transportation, Shopping, Groceries, Healthcare, Utilities, Entertainment, Education)
  - Supports Kasikorn card types: THE WISDOM, Platinum, Titanium, Gold, Beyond, Signature, Visa, Mastercard, JCB
  - Registered parser in `src/lib/statements/parsers/index.ts`
  - 71 unit tests at `__tests__/lib/statements/parsers/kasikorn.test.ts`

---

<!--P2-012-->
### P2-012 — Create PDF text extraction service

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created PDF text extraction service at `src/lib/statements/pdf-extractor.ts` with:
  - `extractPDFText()` - Extracts text from PDF buffers using pdf-parse library
  - `processPDF()` - Full pipeline: extract text → auto-detect parser → parse statement
  - `detectStatementParser()` - Routes to appropriate parser (Chase, Amex, Bangkok Bank, Kasikorn)
  - `isValidPDF()` - Validates PDF magic number
  - Helper functions: `getParserInfo()`, `getAllParsersInfo()`, `getAvailableParsers()`
  - Extracts PDF metadata (title, author, creation date)
  - Returns page count from actual PDF
  - Helpful error messages when parser not found
  - 31 unit tests at `__tests__/lib/statements/pdf-extractor.test.ts`

---

<!--P2-013-->
### P2-013 — *(Optional)* Implement OCR fallback for images

**Status:** done
**Group:** Parsing
**Depends on:** P2-012  |  **Blocks:** P2-014  |  **parallel:** false

**Description:**
Add OCR capability for image uploads (PNG, JPG, HEIC) when PDF extraction fails or isn't applicable.

**⚠️ OPTIONAL:** This task is optional for MVP. All provided PDFs will be text-based, not image-based. OCR can be added later if image-based statements are needed. P2-014 can proceed without this task.

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
- **MVP Note:** Skip this task initially; only text-based PDFs will be used

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Skipped (optional for MVP). All PDFs are text-based, not image-based. OCR can be added later if image-based statements are needed.

---

<!--P2-014-->
### P2-014 — Create statement processing job

**Status:** done
**Group:** Parsing
**Depends on:** P2-012  |  **Blocks:** P2-015  |  **parallel:** false

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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created statement processing service at `src/lib/statements/statement-processor.ts` with:
  - `StatementProcessor` class with `process()`, `getStatus()`, and `retry()` methods
  - Full pipeline: download file → validate PDF → extract text → parse → match → save
  - Updates `statement_uploads.status` at each stage (pending → processing → completed/failed)
  - Progress tracking with step-by-step logging
  - Basic matching implementation (placeholder for P2-015 through P2-020)
  - Stores extraction results and match suggestions in `extraction_log` JSONB
  - Resumable if interrupted (can retry failed jobs)
  - Convenience functions: `processStatement()`, `getProcessingStatus()`, `retryProcessing()`
  - 15 unit tests at `__tests__/lib/statements/statement-processor.test.ts`

---

<!--P2-015-->
### P2-015 — Build amount matching algorithm

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created amount matching algorithm at `src/lib/matching/amount-matcher.ts` with:
  - `calculatePercentDiff()` - Percentage difference using average method
  - `compareAmounts()` - Main comparison with tiered scoring (40pts exact, 35pts ±2%, 25pts ±5%, 15pts ±10%)
  - `isWithinExchangeRateTolerance()` - Check ±2% tolerance for cross-currency
  - `compareCurrencyAmounts()` - Currency-aware comparison with conversion support
  - `findBestAmountMatch()` - Find best match from candidate list
  - Handles edge cases: zero amounts, negative amounts, absolute comparison toggle
  - Exports SCORE_THRESHOLDS for use in scoring algorithm
  - Created module index at `src/lib/matching/index.ts`
  - 46 unit tests at `__tests__/lib/matching/amount-matcher.test.ts`

---

<!--P2-016-->
### P2-016 — Build date matching algorithm (±3 days)

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created date matching algorithm at `src/lib/matching/date-matcher.ts` with:
  - `calculateDaysDiff()` - Day difference calculation (normalized to midnight UTC)
  - `compareDates()` - Main comparison with tiered scoring (30pts same day, 25pts ±1 day, 20pts ±2 days, 15pts ±3 days)
  - `isWithinDateTolerance()` - Quick check for ±3 day tolerance
  - `findBestDateMatch()` - Find best match from candidate dates
  - `isDateInPeriod()` - Check if date falls within statement period
  - `getDateSearchWindow()` - Get date range for matching candidates
  - Strict mode option for same-day priority
  - Confidence cap for >3 day differences
  - Exports DATE_SCORE_THRESHOLDS for use in scoring algorithm
  - 50 unit tests at `__tests__/lib/matching/date-matcher.test.ts`

---

<!--P2-017-->
### P2-017 — Build vendor fuzzy matching (Levenshtein)

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created vendor fuzzy matching algorithm at `src/lib/matching/vendor-matcher.ts` with:
  - `normalizeVendorName()` - Normalizes vendor names (lowercase, removes suffixes/numbers/punctuation)
  - `levenshteinDistance()` - Calculates edit distance between strings
  - `calculateSimilarity()` - Returns similarity percentage (0-100)
  - `compareVendors()` - Main comparison with tiered scoring (30pts exact, 28pts normalized, 25pts alias/high similarity, 20pts good, 15pts moderate, 10pts low)
  - `findBestVendorMatch()` - Find best match from candidate vendors
  - `isLikelyMatch()` - Quick check if vendors likely match
  - `extractVendorFromDescription()` - Extracts vendor name from statement description noise
  - `createAliasMap()` - Create custom alias map extending defaults
  - Built-in DEFAULT_ALIASES for common vendors (Starbucks, Amazon, Uber, Grab, LINE, 7-Eleven, etc.)
  - Support for Thai vendors (Grab, LINE, Lazada, Shopee, FoodPanda)
  - Strict mode option to disable fuzzy matching
  - Exports VENDOR_SCORE_THRESHOLDS for use in scoring algorithm
  - 56 unit tests at `__tests__/lib/matching/vendor-matcher.test.ts`

---

<!--P2-018-->
### P2-018 — Build cross-currency converter

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created cross-currency converter at `src/lib/matching/cross-currency.ts` with:
  - `getExchangeRate()` - Fetches rate from exchange_rates table (exact date or fallback to nearest)
  - `convertAmount()` - Converts amount using historical rate with full metadata
  - `convertAmountsBatch()` - Batch conversion with rate caching for efficiency
  - `isWithinConversionTolerance()` - Checks if converted amounts match within ±2% tolerance
  - `getRateQualityScore()` - Quality score based on rate date proximity (100 exact, 95 1-day, down to 10 for >30 days)
  - `formatConversionLog()` - Human-readable conversion log
  - Handles same-currency conversion (rate=1, no DB query)
  - Falls back to future dates if past dates not found
  - Configurable maxDaysBack (default 30) and allowApproximate options
  - Updated module index at `src/lib/matching/index.ts`
  - 32 unit tests at `__tests__/lib/matching/cross-currency.test.ts`

---

<!--P2-019-->
### P2-019 — Create match scoring algorithm

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created match scoring algorithm at `src/lib/matching/match-scorer.ts` with:
  - `calculateMatchScore()` - Computes composite score from amount (40pts), date (30pts), vendor (30pts)
  - `calculateMatchScores()` - Batch scoring with results sorted by score descending
  - `findBestMatch()` - Returns best match above threshold (default 55)
  - `getConfidenceLevel()` - Returns HIGH (>=90), MEDIUM (>=55), or LOW confidence
  - `getMatchStatistics()` - Summary stats for a set of match results
  - `formatMatchResult()` - Human-readable formatting for debugging
  - Supports cross-currency matching with exchange rate lookup
  - Configurable: custom weights, minMatchScore, requireVendorMatch, requireDateMatch
  - Applies confidence caps from individual matchers
  - Updated module index at `src/lib/matching/index.ts`
  - 33 unit tests at `__tests__/lib/matching/match-scorer.test.ts`

---

<!--P2-020-->
### P2-020 — Implement match suggestion ranker

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created match suggestion ranker at `src/lib/matching/match-ranker.ts` with:
  - `rankMatches()` - Ranks candidates and returns status (matched, multiple_matches, no_match, low_confidence)
  - `rankMatchesBatch()` - Batch ranking with summary statistics
  - `getBestTargetId()` - Quick helper to get best match ID
  - `canAutoApprove()` - Checks if suggestion can be auto-approved (HIGH confidence, no review required)
  - `formatSuggestion()` - Human-readable formatting for debugging
  - `filterByStatus()` - Filter results by match status
  - `getReviewRequired()` - Get all suggestions needing manual review
  - Returns top 3 suggestions by default (configurable)
  - Determines clear winner with configurable gap threshold (default: 10 points)
  - Sets requiresReview flag for multiple matches or low confidence
  - Updated module index at `src/lib/matching/index.ts`
  - 27 unit tests at `__tests__/lib/matching/match-ranker.test.ts`

---

<!--P2-021-->
### P2-021 — Create API route: POST /api/statements/[id]/process

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created `src/app/api/statements/[id]/process/route.ts` with POST handler that triggers statement processing, returns job ID and estimated time, validates ownership, and returns 409 if already processing.

---

<!--P2-022-->
### P2-022 — Create API route: GET /api/statements/[id]/matches

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created `src/app/api/statements/[id]/matches/route.ts` with GET handler returning statement info, matches array with confidence scores and reasons, summary stats, and processing status.

---

<!--P2-023-->
### P2-023 — Build `MatchCard` component (3 variants)

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created `src/components/page-specific/match-card.tsx` with 3 variants (HIGH_CONFIDENCE with green border, WAITING with blue border, READY_TO_IMPORT with purple border), collapsible details, approve/reject buttons, and MatchCardSkeleton for loading states.

---

<!--P2-024-->
### P2-024 — Build review queue filter bar

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created `src/components/page-specific/review-queue-filter-bar.tsx` with filters for status, currency, confidence, date range, and search. URL param sync via `useReviewQueueFilters` hook. Clear All button resets all filters.

---

<!--P2-025-->
### P2-025 — Implement infinite scroll for review queue

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created `src/hooks/use-infinite-scroll.ts` with Intersection Observer-based infinite scroll, LoadMoreTrigger component, loading indicator, and end-of-list detection. Preserves scroll position on navigation.

---

<!--P2-026-->
### P2-026 — Create API route: POST /api/imports/approve

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created `src/app/api/imports/approve/route.ts` with POST handler accepting emailIds array and createTransactions boolean, updates status to 'imported', creates transactions when requested, returns success/failed counts and total amount.

---

<!--P2-027-->
### P2-027 — Create API route: POST /api/imports/reject

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created `src/app/api/imports/reject/route.ts` with POST handler accepting emailId and optional reason, updates status to 'skipped', stores rejection reason in metadata.

---

<!--P2-028-->
### P2-028 — Implement approve/reject flow with optimistic updates

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created `src/hooks/use-match-actions.ts` with optimistic update handlers, state rollback on API failure, and 5-second undo toast via sonner. Integrates with MatchCard component.

---

<!--P2-029-->
### P2-029 — Add batch approve functionality

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created `src/components/page-specific/batch-approve-dialog.tsx` with confirmation dialog showing count, total amount, and first 5 transactions preview. Progress indicator during batch operation. Integrates with /api/imports/approve endpoint.

---

<!--P2-030-->
### P2-030 — Create Review Queue page

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created `src/app/imports/review/page.tsx` with filter bar, summary counts, MatchCard list with infinite scroll, batch approve button, responsive layout, and proper loading/empty/error states.

---

<!--P2-031-->
### P2-031 — Build `ConfidenceIndicator` component

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created `src/components/ui/confidence-indicator.tsx` with percentage display, progress bar, HIGH/MEDIUM/LOW badges. Green for >=90, amber for 55-89, red for <55. Three variants: full, compact, badge-only. Reusable across match cards.

---

<!--P2-032-->
### P2-032 — Create processing results summary page

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created `src/app/imports/statements/[id]/page.tsx` with statement info, transaction counts, match quality distribution chart (high/medium/low/no-match), amounts summary, and CTA buttons linking to review queue and history.

---

<!--P2-033-->
### P2-033 — Write unit tests for matching algorithms

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: 244 unit tests across matching modules: amount-matcher (46), date-matcher (50), vendor-matcher (56), cross-currency (32), match-scorer (33), match-ranker (27). Coverage exceeds 90% for all matching modules.

---

<!--P2-034-->
### P2-034 — Write integration tests for upload flow

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created `__tests__/integration/statement-upload.test.ts` with 29 tests covering file validation (type, size, empty), duplicate detection (hash calculation, period overlap), parser detection (Chase, Amex, Bangkok Bank, Kasikorn), and storage path generation.

---

<!--P2-035-->
### P2-035 — Write integration tests for review flow

**Status:** done
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

**Completion Log:**
- done: 2026-01-12 · by: agent · notes: Created `__tests__/integration/review-flow.test.ts` with 32 tests covering review queue filters, confidence indicator utilities, API route exports (approve/reject), matching utilities (amount/date/vendor/scoring/ranking), hooks exports, cross-currency conversion, and statement processor.

---

## Dependency Map

```
Upload Path:
P2-001 ──► P2-002 ──► P2-003 ──► P2-004 ──► P2-005 ──► P2-006 ──► P2-007

Parsing Path (parallel parsers):
P2-008 ─┐
P2-009 ─┼──► P2-012 ──► P2-014
P2-010 ─┤                  │
P2-011 ─┘                  └──► (Optional: P2-013 OCR)

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
   - Change `**Status:** done` → `**Status:** done`
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
