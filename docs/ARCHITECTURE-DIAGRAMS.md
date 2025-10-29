# Architecture Diagrams: Zero-Cost MVP

Visual representations of the system architecture, data flow, and processing pipeline.

---

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER (Browser/Mobile)                        │
│                                                                       │
│  Features:                                                           │
│  • Upload documents (drag & drop)                                   │
│  • View processing status (real-time)                               │
│  • Review parsed transactions                                       │
│  • Match with bank transactions                                     │
│  • Manage vendors and tags                                          │
└───────────────────────────┬─────────────────────────────────────────┘
                             │ HTTPS
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      VERCEL (Serverless Platform)                    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Next.js 14 Application                      │   │
│  │                                                               │   │
│  │  CLIENT COMPONENTS (React):                                  │   │
│  │  • DocumentUploader.tsx                                      │   │
│  │  • ProcessingStatus.tsx (real-time)                          │   │
│  │  • ReconciliationView.tsx                                    │   │
│  │  • TransactionList.tsx                                       │   │
│  │                                                               │   │
│  │  SERVER COMPONENTS:                                          │   │
│  │  • Dashboard page (server-rendered)                          │   │
│  │  • Transaction page (server-rendered)                        │   │
│  │                                                               │   │
│  │  API ROUTES (Serverless Functions):                          │   │
│  │  • POST /api/documents/upload                                │   │
│  │  • POST /api/documents/process                               │   │
│  │  • GET  /api/reconcile/suggest                               │   │
│  │  • GET  /api/vendors/[id]/logo                               │   │
│  │  • GET  /api/cron/process-documents (background)             │   │
│  │  • GET  /api/cron/cleanup (cleanup job)                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  Free Tier Limits:                                                   │
│  • 100 GB bandwidth/month                                            │
│  • 100 serverless function hours/month                               │
│  • Unlimited deployments                                             │
└───────────────────────────┬─────────────────────────────────────────┘
                             │ PostgreSQL Protocol + HTTP
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      SUPABASE (Database Platform)                    │
│                                                                       │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐│
│  │   PostgreSQL (500 MB)        │  │   Storage (1 GB)             ││
│  │                              │  │                              ││
│  │  TABLES:                     │  │  BUCKETS:                    ││
│  │  • users                     │  │  • documents/                ││
│  │  • transactions              │  │    - original PDFs/images    ││
│  │  • documents ←──┐           │  │    - path: {user_id}/{id}    ││
│  │  • vendors       │           │  │                              ││
│  │  • payment_methods│          │  │  • thumbnails/               ││
│  │  • tags          │           │  │    - compressed JPGs         ││
│  │  • transaction_tags│         │  │    - 200x200, 60% quality    ││
│  │  • vendor_logos  │           │  │                              ││
│  │  • processing_rate_limits│   │  │  Policies:                   ││
│  │                  │           │  │  • User-scoped access (RLS)  ││
│  │  pg-boss TABLES: │           │  │  • Auto-compression on upload││
│  │  • job ──────────┘           │  │  • 90-day auto-cleanup       ││
│  │  • schedule                  │  │                              ││
│  │  • archive                   │  │                              ││
│  │                              │  │                              ││
│  │  ROW LEVEL SECURITY (RLS):   │  │                              ││
│  │  • Users see only own data   │  │                              ││
│  │  • Auth via Supabase Auth    │  │                              ││
│  │                              │  │                              ││
│  │  REAL-TIME:                  │  │                              ││
│  │  • Broadcast document status │  │                              ││
│  │  • Live processing updates   │  │                              ││
│  └──────────────────────────────┘  └──────────────────────────────┘│
│                                                                       │
│  Free Tier Limits:                                                   │
│  • 500 MB database storage                                           │
│  • 1 GB file storage                                                 │
│  • 2 GB bandwidth/month                                              │
│  • 50k monthly active users                                          │
└───────────────────────────┬─────────────────────────────────────────┘
                             │ HTTPS APIs
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL FREE SERVICES                          │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Google Gemini 1.5 Flash API (LLM)                           │  │
│  │  • Parse receipt text → structured data                      │  │
│  │  • Extract: vendor, amount, currency, date                   │  │
│  │  • Confidence scoring                                        │  │
│  │                                                               │  │
│  │  Rate Limits (Free):                                         │  │
│  │  • 1,500 requests/day (45,000/month)                         │  │
│  │  • 15 requests/minute                                        │  │
│  │  • 1M tokens/minute                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Tesseract.js (OCR) - Self-Hosted                           │  │
│  │  • Runs in serverless function                              │  │
│  │  • Unlimited usage (open source)                            │  │
│  │  • Accuracy: 80-90%                                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Google Cloud Vision API (OCR Fallback)                     │  │
│  │  • Used only if Tesseract confidence < 70%                  │  │
│  │  • 1,000 pages/month free                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Logo APIs (Vendor Enrichment)                              │  │
│  │  1. DuckDuckGo Icons (unlimited, no auth)                   │  │
│  │  2. Google Favicon (unlimited, fallback)                    │  │
│  │  3. Clearbit Logo (rate limited, fallback)                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Document Processing Pipeline (Detailed)

```
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: UPLOAD                                                      │
└─────────────────────────────────────────────────────────────────────┘

User Browser                    Vercel API Route
     │                               │
     │  POST /api/documents/upload   │
     │───────────────────────────────>│
     │  FormData(file)               │
     │                               │
     │                               │  Validate
     │                               │  • Type: PDF/JPG/PNG
     │                               │  • Size: < 10MB
     │                               │  • User auth
     │                               │
     │                               │  Compress (Sharp.js)
     │                               │  • Resize: max 1200px
     │                               │  • Quality: 80%
     │                               │  • Generate thumbnail: 200x200
     │                               │
     │                               │
     │                               ↓
     │                          Supabase Storage
     │                               │
     │                               │  Upload files:
     │                               │  • Original: documents/{user_id}/{id}.pdf
     │                               │  • Thumb: thumbnails/{user_id}/{id}.jpg
     │                               │
     │                               ↓
     │                          Supabase DB
     │                               │
     │                               │  INSERT INTO documents:
     │                               │  • id, user_id, file_name
     │                               │  • storage_path, thumbnail_path
     │                               │  • processing_status: 'pending'
     │                               │
     │                               │  Create pg-boss job:
     │                               │  • name: 'process-document'
     │                               │  • data: { document_id }
     │                               │  • retryLimit: 3
     │                               │
     │<──────────────────────────────│
     │  { document_id, status }      │
     │                               │
     │  Subscribe to real-time       │
     │  updates on document_id       │
     │                               │

┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: BACKGROUND PROCESSING (Vercel Cron → pg-boss)              │
└─────────────────────────────────────────────────────────────────────┘

Vercel Cron (every minute)
     │
     │  GET /api/cron/process-documents
     ↓
pg-boss (PostgreSQL)
     │
     │  Fetch 1 pending job
     │  (FIFO queue)
     ↓
Process document job
     │
     │  UPDATE documents
     │  SET processing_status = 'processing'
     ↓
Notify client (Supabase real-time)

┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: OCR EXTRACTION                                              │
└─────────────────────────────────────────────────────────────────────┘

Vercel Serverless Function
     │
     │  Download file from Supabase Storage
     ↓
Check file type
     │
     ├─── PDF ───> Extract text with pdf-parse
     │             │
     │             ├─ Has text? ──> Use extracted text
     │             │
     │             └─ No text? ───> Convert to images
     │                             Run Tesseract OCR
     │
     └─── Image ─> Run Tesseract OCR directly
                   │
                   ↓
              Tesseract.js
                   │
                   │  recognize(image, 'eng+tha')
                   │
                   ↓
              { text, confidence }
                   │
                   │
                   ├─ confidence >= 70%? ──> Use result
                   │
                   └─ confidence < 70%? ───> Fallback to Google Vision
                                             (if quota available)
                   ↓
              Save to DB:
              • ocr_text
              • ocr_confidence
              • ocr_provider

┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: LLM PARSING                                                 │
└─────────────────────────────────────────────────────────────────────┘

Vercel Serverless Function
     │
     │  Check rate limits:
     │  • Daily: 1,500 requests
     │  • Per minute: 15 requests
     ↓
Rate limit OK?
     │
     ├─ NO ──> Retry job after 1 hour
     │
     └─ YES ─> Continue
                │
                ↓
           Google Gemini API
                │
                │  POST https://generativelanguage.googleapis.com
                │
                │  Prompt:
                │  "Extract transaction details from this receipt:
                │   {ocr_text}
                │   Return JSON only:
                │   { vendor, amount, currency, date, confidence }"
                │
                ↓
           Parse JSON response
                │
                ├─ Valid JSON? ──> Save result
                │
                └─ Invalid? ─────> Retry once with stricter prompt
                                   │
                                   └─ Still fails? ──> Mark as failed
                │
                ↓
           Save to DB:
           • parsed_vendor
           • parsed_amount
           • parsed_currency
           • parsed_date
           • parsed_confidence

┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: AUTO-MATCHING (Optional)                                   │
└─────────────────────────────────────────────────────────────────────┘

Vercel Serverless Function
     │
     │  Query transactions:
     │  • Same user
     │  • Date: parsed_date ± 3 days
     │  • Amount: parsed_amount ± 5%
     │  • Vendor: fuzzy match
     ↓
Calculate confidence scores:
     │
     ├─ Exact match (100%):
     │  • Same date
     │  • Same amount
     │  • Same vendor
     │  └──> Auto-match transaction
     │
     ├─ High confidence (80-99%):
     │  • Close date (± 1 day)
     │  • Close amount (± 2%)
     │  • Similar vendor
     │  └──> Suggest match (user confirms)
     │
     └─ Low confidence (< 80%):
        └──> Manual review required

┌─────────────────────────────────────────────────────────────────────┐
│  STEP 6: VENDOR ENRICHMENT (Lazy)                                   │
└─────────────────────────────────────────────────────────────────────┘

User views vendor page
     │
     │  GET /api/vendors/{id}/logo
     ↓
Check cache (vendor_logos table)
     │
     ├─ Cached? ──> Return cached URL
     │
     └─ Not cached ─> Fetch logo
                      │
                      ├─ Try DuckDuckGo
                      │  https://icons.duckduckgo.com/ip3/{domain}.ico
                      │  │
                      │  └─ Success? ──> Cache & return
                      │
                      ├─ Try Google Favicon
                      │  https://www.google.com/s2/favicons?domain={domain}
                      │  │
                      │  └─ Success? ──> Cache & return
                      │
                      └─ Use placeholder icon
                         Cache as "not found"

┌─────────────────────────────────────────────────────────────────────┐
│  STEP 7: CLEANUP (Scheduled)                                        │
└─────────────────────────────────────────────────────────────────────┘

Vercel Cron (daily)
     │
     │  GET /api/cron/cleanup
     ↓
Find old documents:
     │  WHERE created_at < NOW() - INTERVAL '90 days'
     │  AND original_deleted_at IS NULL
     ↓
For each old document:
     │
     ├─ Delete original from Storage
     │  (keep thumbnail)
     │
     ├─ UPDATE documents
     │  SET original_deleted_at = NOW()
     │
     └─ Keep metadata in database:
        • ocr_text
        • parsed data
        • thumbnail_path
```

---

## 3. Database Schema (Entity Relationship Diagram)

```
┌──────────────────┐
│      users       │
├──────────────────┤
│ id (PK)          │◄──────────────────────────┐
│ email            │                           │
│ first_name       │                           │
│ last_name        │                           │
│ created_at       │                           │
└──────────────────┘                           │
        ▲                                      │
        │                                      │
        │ user_id                              │ user_id
        │                                      │
┌──────────────────┐                  ┌──────────────────┐
│   transactions   │                  │    documents     │
├──────────────────┤                  ├──────────────────┤
│ id (PK)          │◄─────────────────┤ id (PK)          │
│ user_id (FK)     │  matched_txn_id  │ user_id (FK)     │
│ vendor_id (FK)   │                  │ file_name        │
│ payment_meth (FK)│                  │ file_type        │
│ description      │                  │ storage_path     │
│ amount           │                  │ thumbnail_path   │
│ original_currency│                  │ processing_status│
│ transaction_type │                  │ ocr_text         │
│ transaction_date │                  │ ocr_confidence   │
│ source_doc_id(FK)│                  │ parsed_vendor    │
└──────────────────┘                  │ parsed_amount    │
        │                              │ parsed_date      │
        │ vendor_id                    │ matched_txn_id(FK│
        │                              │ created_at       │
        ▼                              └──────────────────┘
┌──────────────────┐
│     vendors      │
├──────────────────┤
│ id (PK)          │
│ user_id (FK)     │
│ name             │
│ domain           │
│ logo_url         │
│ created_at       │
└──────────────────┘
        │
        │ vendor_id
        │
        ▼
┌──────────────────┐
│  vendor_logos    │
├──────────────────┤
│ id (PK)          │
│ vendor_id (FK)   │
│ logo_url         │
│ logo_source      │
│ domain           │
│ fetched_at       │
└──────────────────┘

┌──────────────────┐
│ payment_methods  │
├──────────────────┤
│ id (PK)          │
│ user_id (FK)     │◄───────────────┐
│ name             │                │
│ created_at       │                │
└──────────────────┘                │
                                    │ payment_method_id
                                    │
                                    │
┌──────────────────┐                │
│      tags        │                │
├──────────────────┤                │
│ id (PK)          │                │
│ user_id (FK)     │◄───────┐       │
│ name             │        │       │
│ color            │        │       │
└──────────────────┘        │       │
        │                   │       │
        │ tag_id            │       │
        │                   │       │
        ▼                   │       │
┌──────────────────┐        │       │
│ transaction_tags │        │       │
├──────────────────┤        │       │
│ id (PK)          │        │       │
│ transaction_id(FK│────────┘       │
│ tag_id (FK)      │                │
└──────────────────┘                │
                                    │
┌──────────────────┐                │
│ exchange_rates   │                │
├──────────────────┤                │
│ id (PK)          │                │
│ from_currency    │                │
│ to_currency      │                │
│ rate             │                │
│ date             │                │
└──────────────────┘                │
                                    │
                                    │
┌──────────────────┐                │
│ rate_limits      │                │
├──────────────────┤                │
│ id (PK)          │                │
│ user_id (FK)     │────────────────┘
│ date             │
│ ocr_count        │
│ llm_count        │
│ logo_fetch_count │
└──────────────────┘

LEGEND:
──────> One-to-Many relationship
PK = Primary Key
FK = Foreign Key
```

---

## 4. User Flow Diagrams

### Upload Document Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │
     │ 1. Drags PDF/image to upload area
     ↓
┌─────────────────┐
│ DocumentUploader│
│   Component     │
└────┬────────────┘
     │
     │ 2. Validates file (type, size)
     ↓
┌─────────────────┐
│ Show preview    │
│ "Uploading..."  │
└────┬────────────┘
     │
     │ 3. POST /api/documents/upload
     ↓
┌─────────────────┐
│ Server compresses│
│ & uploads to    │
│ Supabase Storage│
└────┬────────────┘
     │
     │ 4. Returns document_id
     ↓
┌─────────────────┐
│ Show processing │
│ status component│
└────┬────────────┘
     │
     │ 5. Subscribe to real-time updates
     ↓
┌─────────────────┐
│ "Queued..." ●   │ ← pending
│ "Processing..." │ ← processing
│ "Completed ✓"   │ ← completed
└────┬────────────┘
     │
     │ 6. Show parsed results
     ↓
┌─────────────────┐
│ Vendor: Amazon  │
│ Amount: $49.99  │
│ Date: 2025-10-28│
│                 │
│ [Match to Txn] │ ← User can link to transaction
└─────────────────┘
```

### Reconciliation Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │
     │ 1. Navigates to /reconcile
     ↓
┌─────────────────────────────────────────┐
│          Reconciliation Page             │
├─────────────────────────────────────────┤
│                                          │
│  UNMATCHED DOCUMENTS        UNMATCHED   │
│                            TRANSACTIONS  │
│  ┌──────────────┐         ┌──────────┐ │
│  │ Receipt      │         │ Bank     │ │
│  │ Amazon       │◄────────┤ AMAZON   │ │
│  │ $49.99       │ Match?  │ $49.99   │ │
│  │ Oct 28       │         │ Oct 28   │ │
│  └──────────────┘         └──────────┘ │
│                                          │
│  Confidence: 95% ⚠️ (high confidence)   │
│                                          │
│  [Accept Match] [Reject]                │
└─────────────────────────────────────────┘
     │
     │ 2. User clicks "Accept Match"
     ↓
┌─────────────────────────────────────────┐
│  Update database:                        │
│  • transaction.source_document_id = doc  │
│  • document.matched_transaction_id = txn │
│  • document.matched_at = NOW()          │
└─────────────────────────────────────────┘
     │
     │ 3. Remove from unmatched lists
     ↓
┌─────────────────────────────────────────┐
│  Show success message                    │
│  "Transaction matched successfully"      │
└─────────────────────────────────────────┘
```

---

## 5. Rate Limiting Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    RATE LIMITING STRATEGY                     │
└──────────────────────────────────────────────────────────────┘

Document Upload
     │
     ↓
Check user's daily quota
     │
     ├─ < 100 uploads today? ──> Continue
     │
     └─ >= 100 uploads? ──────> Reject
                                 "Daily limit reached"
     │
     ↓
Create processing job
     │
     ↓
Background worker polls queue
     │
     ↓
Check global LLM rate limit
     │
     ├─ < 1,500 requests today? ──> Process now
     │
     └─ >= 1,500 requests? ───────> Delay until next day
                                     Update job: retry_after = tomorrow
     │
     ↓
Check per-minute LLM rate limit
     │
     ├─ < 15 requests this minute? ──> Process now
     │
     └─ >= 15 requests? ──────────────> Wait 60 seconds
                                        Retry job
     │
     ↓
Process document
     │
     ↓
Increment rate limit counters:
     │
     ├─ processing_rate_limits.llm_count += 1
     └─ global_rate_limits.count += 1
```

---

## 6. Storage Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                    FILE LIFECYCLE (0-365 days)                │
└──────────────────────────────────────────────────────────────┘

Day 0: Upload
     │
     ├─ Original file: documents/{user_id}/{id}.pdf (500 KB)
     └─ Thumbnail: thumbnails/{user_id}/{id}.jpg (50 KB)
     │
     ↓ Processing
     │
Day 1-90: Active storage
     │
     │ Both files available:
     │ • User can view original
     │ • Thumbnail shown in lists
     │ • OCR text in database
     │ • Parsed data in database
     │
     ↓ 90 days pass
     │
Day 90: Cleanup job runs
     │
     │ DELETE original file
     │ • documents/{user_id}/{id}.pdf ✗ DELETED
     │
     │ KEEP thumbnail + metadata
     │ • thumbnails/{user_id}/{id}.jpg ✓ KEPT
     │ • ocr_text in database ✓ KEPT
     │ • parsed data in database ✓ KEPT
     │
     │ UPDATE documents
     │ SET original_deleted_at = NOW()
     │
     ↓
Day 91-365: Archived state
     │
     │ Files available:
     │ • Thumbnail (50 KB)
     │ • OCR text (searchable)
     │ • Parsed transaction data
     │
     │ User experience:
     │ • Can see thumbnail
     │ • Can search text
     │ • Cannot download original
     │ • See notice: "Original deleted after 90 days"
     │
     ↓
Day 365+: Optional hard delete
     │
     │ Admin decision:
     │ • Keep thumbnails forever? (recommended)
     │ • Delete everything? (for privacy)
     │

STORAGE SAVINGS:
───────────────
Original:        500 KB (100%)
After 90 days:    50 KB (10% of original) → 90% savings
After 1 year:     10 KB (2% of original) → 98% savings (if aggressive)
```

---

## 7. Scaling Timeline

```
┌──────────────────────────────────────────────────────────────┐
│              SCALING PATH: 0 → 10,000 USERS                  │
└──────────────────────────────────────────────────────────────┘

Month 1-3: MVP Phase (0-20 users)
───────────────────────────────────
Architecture:  Serverless (free tier)
Cost:          $0/month
DB Size:       < 50 MB
Storage:       < 200 MB
Processing:    < 500 docs/month

Focus: Build & validate product


Month 4-6: Growth Phase (20-100 users)
────────────────────────────────────────
Architecture:  Serverless (paid tier)
Cost:          $35/month
  ↳ Supabase Pro: $25
  ↳ Gemini API: $10

DB Size:       100-300 MB
Storage:       500 MB - 1 GB
Processing:    2,000-5,000 docs/month

Upgrade trigger: DB > 400 MB
Focus: Acquire users, improve UX


Month 7-9: Scale Phase (100-500 users)
────────────────────────────────────────
Architecture:  Hybrid (DB + self-hosted processing)
Cost:          $64/month
  ↳ Supabase Pro: $25
  ↳ DigitalOcean: $24
  ↳ Cloudflare R2: $15

DB Size:       500 MB - 2 GB
Storage:       2-10 GB
Processing:    10,000-30,000 docs/month

Migration: Move storage to R2, processing to DO
Focus: Optimize costs, improve margins


Month 10-12: Optimization (500-1,000 users)
─────────────────────────────────────────────
Architecture:  Hybrid (optimized)
Cost:          $150/month
  ↳ Supabase Pro: $25
  ↳ Vercel Pro: $20
  ↳ DigitalOcean: $48
  ↳ Cloudflare R2: $30
  ↳ Gemini API: $20
  ↳ SendGrid: $20

Revenue:       $2,500-5,000/month
Profit:        $2,350-4,850/month

Focus: Profitability, retention


Year 2: Enterprise (1,000-10,000 users)
─────────────────────────────────────────
Architecture:  Multi-region, dedicated
Cost:          $700-2,000/month
Revenue:       $20,000-100,000/month
Profit:        $18,000-98,000/month

Focus: Scale, compliance, features
```

---

## 8. Technology Stack Comparison

```
┌─────────────────────────────────────────────────────────────┐
│          OPTION 1: SERVERLESS (Recommended)                 │
└─────────────────────────────────────────────────────────────┘

    ┌───────────┐
    │  Browser  │
    └─────┬─────┘
          │
          ↓
    ┌───────────┐
    │  Vercel   │ (Next.js + API Routes)
    └─────┬─────┘
          │
          ↓
    ┌───────────┐
    │ Supabase  │ (PostgreSQL + Storage + Auth)
    └─────┬─────┘
          │
          ↓
    ┌───────────┐
    │  Gemini   │ (LLM API)
    └───────────┘

Cost: $0 → $35 → $150/month
Time to ship: 4-6 weeks
DevOps: None required


┌─────────────────────────────────────────────────────────────┐
│          OPTION 2: SELF-HOSTED (For learning)               │
└─────────────────────────────────────────────────────────────┘

    ┌───────────┐
    │  Browser  │
    └─────┬─────┘
          │
          ↓
    ┌───────────┐
    │   Caddy   │ (Reverse proxy + HTTPS)
    └─────┬─────┘
          │
          ↓
    ┌───────────┐
    │  Node.js  │ (Express + APIs)
    └─────┬─────┘
          │
          ├──────────> PostgreSQL (Database)
          ├──────────> MinIO (S3 storage)
          └──────────> Ollama (Local LLM)

All running on single DigitalOcean droplet

Cost: $6 → $12 → $48/month (predictable)
Time to ship: 6-8 weeks
DevOps: High (you manage everything)
```

---

## Summary

These diagrams show:

1. **High-level architecture** - How all services connect
2. **Processing pipeline** - Step-by-step document flow
3. **Database schema** - Entity relationships
4. **User flows** - How users interact with the system
5. **Rate limiting** - How we stay within free tier
6. **Storage lifecycle** - File management over time
7. **Scaling timeline** - Growth path from 0 to 10k users
8. **Tech stack comparison** - Serverless vs self-hosted

All designed to maximize free tier usage while providing a production-quality experience.

**Key takeaway**: Start simple (serverless), optimize later (hybrid).
