# Zero-Cost MVP Architecture
## Document Management & Reconciliation System

**Goal**: Build a production-viable MVP with zero developer and user costs

**Last Updated**: 2025-10-29

---

## Table of Contents
1. [Tech Stack with Free Tier Limits](#tech-stack)
2. [Architecture Overview](#architecture)
3. [Database Schema](#database-schema)
4. [Processing Pipeline](#processing-pipeline)
5. [Cost Analysis & Limitations](#limitations)
6. [Migration Path to Paid](#migration-path)

---

## 1. Tech Stack with Free Tier Limits {#tech-stack}

### Core Infrastructure (All Free)

| Component | Service | Free Tier Limits | Monthly Cost |
|-----------|---------|------------------|--------------|
| Frontend | Next.js 14 + Vercel | 100GB bandwidth, 100 serverless invocations | $0 |
| Database | Supabase PostgreSQL | 500MB storage, 2GB bandwidth, 50k auth users | $0 |
| File Storage | Supabase Storage | 1GB files, 2GB bandwidth | $0 |
| Authentication | Supabase Auth | 50k monthly active users | $0 |
| Job Queue | pg-boss (PostgreSQL) | Uses DB storage, unlimited jobs | $0 |
| Hosting | Vercel Hobby | 100GB bandwidth, unlimited deployments | $0 |

**Total Infrastructure Cost**: $0/month

### Document Processing (All Free)

| Component | Service | Free Tier Limits | Notes |
|-----------|---------|------------------|-------|
| OCR | Tesseract.js | Unlimited | Self-hosted, open source |
| OCR Fallback | Google Cloud Vision | 1,000 pages/month | For low-quality scans |
| LLM Parsing | Google Gemini 1.5 Flash | 1,500 requests/day, 15 RPM | Best free tier available |
| Image Compression | Sharp.js | Unlimited | Self-hosted, open source |
| PDF Parsing | pdf-parse + pdf-lib | Unlimited | Self-hosted, open source |

**Total Processing Cost**: $0/month

### Vendor Enrichment (All Free)

| Component | Service | Free Tier Limits | Strategy |
|-----------|---------|------------------|----------|
| Logo API Primary | DuckDuckGo Icons | Unlimited, no auth | `https://icons.duckduckgo.com/ip3/{domain}.ico` |
| Logo API Fallback 1 | Google Favicon | Unlimited | `https://www.google.com/s2/favicons?sz=128&domain={domain}` |
| Logo API Fallback 2 | Clearbit | Rate limited | `https://logo.clearbit.com/{domain}` |
| Company Data | Manual user input | N/A | Primary method for MVP |

**Total Enrichment Cost**: $0/month

### Free Tier Budget Summary

```
Maximum MVP Capacity (Free Tier):
- Database: 500MB (~50,000 transactions with documents)
- Storage: 1GB (~2,000 PDF/image documents)
- Bandwidth: 100GB Vercel + 4GB Supabase = 104GB/month
- OCR: Unlimited (Tesseract) + 1,000/month (Vision fallback)
- LLM: 1,500 requests/day = 45,000/month
- Users: 50,000 monthly active users
- Logo lookups: Unlimited (DuckDuckGo/Google)
```

**Estimated User Capacity**: 50-100 active users before hitting limits

---

## 2. Architecture Overview {#architecture}

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Next.js 14 App Router                                     │  │
│  │  - File upload UI (drag & drop)                            │  │
│  │  - Real-time job status (Supabase subscriptions)           │  │
│  │  - Reconciliation interface                                │  │
│  │  - Transaction management                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│              VERCEL (Serverless Functions)                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  API Routes (Next.js Server)                              │  │
│  │                                                             │  │
│  │  POST /api/documents/upload                               │  │
│  │  → Validate file (PDF/image, max 10MB)                    │  │
│  │  → Compress image (Sharp.js, 80% quality)                 │  │
│  │  → Upload to Supabase Storage                             │  │
│  │  → Create pg-boss job                                     │  │
│  │  → Return job_id to client                                │  │
│  │                                                             │  │
│  │  POST /api/documents/process                              │  │
│  │  → Poll pg-boss for pending jobs                          │  │
│  │  → Download document from Storage                         │  │
│  │  → Extract text (Tesseract.js)                            │  │
│  │  → Parse with LLM (Gemini API)                            │  │
│  │  → Enrich vendor (logo APIs)                              │  │
│  │  → Save to transactions table                             │  │
│  │  → Mark job complete                                      │  │
│  │                                                             │  │
│  │  GET /api/reconcile                                       │  │
│  │  → Find unmatched documents & bank transactions           │  │
│  │  → Return matching suggestions                            │  │
│  │                                                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Vercel Cron Job (every 1 minute)                         │  │
│  │  GET /api/cron/process-documents                          │  │
│  │  → Triggers background processor                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               ↓ PostgreSQL Protocol
┌─────────────────────────────────────────────────────────────────┐
│                   SUPABASE (PostgreSQL + Storage)                │
│  ┌────────────────────────┐  ┌──────────────────────────────┐  │
│  │  PostgreSQL (500MB)    │  │  Storage (1GB)               │  │
│  │                        │  │                              │  │
│  │  Core Tables:          │  │  Buckets:                    │  │
│  │  - users               │  │  - documents (PDFs/images)   │  │
│  │  - transactions        │  │  - thumbnails (compressed)   │  │
│  │  - documents           │  │                              │  │
│  │  - vendors             │  │  Storage Policy:             │  │
│  │  - payment_methods     │  │  - Original: keep 90 days    │  │
│  │  - tags                │  │  - Thumbnail: keep forever   │  │
│  │                        │  │  - Auto-compress on upload   │  │
│  │  New Tables:           │  │                              │  │
│  │  - processing_jobs     │  │                              │  │
│  │  - document_cache      │  │                              │  │
│  │  - vendor_logos        │  │                              │  │
│  │                        │  │                              │  │
│  │  pg-boss Tables:       │  │                              │  │
│  │  - job                 │  │                              │  │
│  │  - schedule            │  │                              │  │
│  │  - archive             │  │                              │  │
│  └────────────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               ↓ HTTPS API
┌─────────────────────────────────────────────────────────────────┐
│              EXTERNAL FREE SERVICES                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Google Gemini 1.5 Flash API                              │  │
│  │  - Extract vendor, amount, date from OCR text             │  │
│  │  - Rate limit: 15 requests/minute, 1,500/day              │  │
│  │  - Token limit: 1M tokens/minute                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  DuckDuckGo / Google Favicon APIs                         │  │
│  │  - Fetch vendor logos (unlimited, no auth)                │  │
│  │  - Cache in vendor_logos table forever                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

**1. No separate backend server**
- Everything runs on Vercel serverless functions
- API routes handle all server-side logic
- Reduces complexity, no server management

**2. pg-boss for job queue (not Redis)**
- Uses existing PostgreSQL database
- No additional service needed
- Supports retries, scheduling, rate limiting
- Slightly slower than Redis but free

**3. Server-side OCR (not browser-based)**
- Tesseract.js runs in API routes
- Better for accuracy (no client resource constraints)
- Can fallback to Google Vision API if needed
- Client just uploads, server processes

**4. Aggressive caching strategy**
- Store OCR text permanently (never reprocess)
- Cache LLM results forever
- Cache vendor logos forever
- Regenerate thumbnails only if lost

**5. Lazy enrichment**
- Fetch logos only when user views vendor
- Don't enrich all vendors upfront
- Cache logo URL in database

**6. Vercel Cron for background processing**
- Free cron jobs on Vercel (every minute min)
- Triggers API route to poll pg-boss
- Processes 1 job per invocation (stay under limits)

---

## 3. Database Schema Additions {#database-schema}

### New Tables for Document Management

```sql
-- Documents table (references uploaded files)
CREATE TABLE public.documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- File metadata
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'image/jpeg', 'image/png'
  file_size INTEGER NOT NULL, -- bytes
  storage_path TEXT NOT NULL, -- Supabase Storage path
  thumbnail_path TEXT, -- Compressed thumbnail path

  -- Processing status
  processing_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  processing_error TEXT, -- Error message if failed

  -- OCR results (cached permanently)
  ocr_text TEXT, -- Raw OCR output
  ocr_confidence DECIMAL(5, 2), -- 0-100
  ocr_provider TEXT, -- 'tesseract', 'google-vision'

  -- LLM parsing results (cached permanently)
  parsed_vendor TEXT,
  parsed_amount DECIMAL(12, 2),
  parsed_currency TEXT,
  parsed_date DATE,
  parsed_confidence DECIMAL(5, 2), -- 0-100

  -- Reconciliation
  matched_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  matched_at TIMESTAMP WITH TIME ZONE,

  -- Auto-cleanup
  original_deleted_at TIMESTAMP WITH TIME ZONE, -- When original file was deleted (after 90 days)

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_status ON public.documents(processing_status);
CREATE INDEX idx_documents_matched ON public.documents(matched_transaction_id);
CREATE INDEX idx_documents_date ON public.documents(parsed_date DESC);

-- RLS Policies
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);
```

```sql
-- Vendor logos cache (free tier logo URLs)
CREATE TABLE public.vendor_logos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Logo URLs from free APIs
  logo_url TEXT, -- Best available logo URL
  logo_source TEXT, -- 'duckduckgo', 'google', 'clearbit', 'manual'

  -- Domain for logo lookup
  domain TEXT, -- Extracted from vendor name or manual

  -- Cache metadata
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fetch_failed BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vendor_logos_vendor_id ON public.vendor_logos(vendor_id);
CREATE INDEX idx_vendor_logos_domain ON public.vendor_logos(domain);

-- RLS Policies
ALTER TABLE public.vendor_logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendor logos for their vendors" ON public.vendor_logos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vendors
      WHERE vendors.id = vendor_logos.vendor_id
      AND vendors.user_id = auth.uid()
    )
  );
```

```sql
-- Processing rate limits (track API usage)
CREATE TABLE public.processing_rate_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Daily quotas
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  ocr_count INTEGER DEFAULT 0,
  llm_count INTEGER DEFAULT 0,
  logo_fetch_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, date)
);

CREATE INDEX idx_rate_limits_user_date ON public.processing_rate_limits(user_id, date);

-- RLS Policies
ALTER TABLE public.processing_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits" ON public.processing_rate_limits
  FOR SELECT USING (auth.uid() = user_id);
```

### Modified Existing Tables

```sql
-- Add document reference to transactions
ALTER TABLE public.transactions
ADD COLUMN source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_source_document ON public.transactions(source_document_id);

-- Add domain field to vendors (for logo lookup)
ALTER TABLE public.vendors
ADD COLUMN domain TEXT,
ADD COLUMN logo_url TEXT; -- Cached logo URL

CREATE INDEX idx_vendors_domain ON public.vendors(domain);
```

---

## 4. Processing Pipeline {#processing-pipeline}

### Detailed Processing Flow

```
USER UPLOADS DOCUMENT
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 1: Upload & Validation (Client → Server)               │
│                                                              │
│ Client:                                                      │
│ - User drags PDF/image to upload area                       │
│ - Client validates file type (PDF, JPG, PNG)                │
│ - Client checks file size (max 10MB)                        │
│ - Shows preview thumbnail                                   │
│                                                              │
│ POST /api/documents/upload                                  │
│ {                                                            │
│   file: File,                                               │
│   user_id: uuid                                             │
│ }                                                            │
│                                                              │
│ Server:                                                      │
│ - Validate file type again (security)                       │
│ - Check user's daily quota (100 docs/day)                   │
│ - If image: compress with Sharp.js (80% quality, max 1MB)   │
│ - Generate thumbnail (200x200, 60% quality)                 │
│ - Upload to Supabase Storage:                               │
│   * Original: /documents/{user_id}/{uuid}.{ext}             │
│   * Thumbnail: /thumbnails/{user_id}/{uuid}.jpg             │
│ - Insert into documents table (status: 'pending')           │
│ - Create pg-boss job:                                       │
│   {                                                          │
│     name: 'process-document',                               │
│     data: { document_id: uuid },                            │
│     retryLimit: 3,                                          │
│     retryDelay: 60 (seconds)                                │
│   }                                                          │
│                                                              │
│ Response:                                                    │
│ {                                                            │
│   document_id: uuid,                                        │
│   status: 'pending',                                        │
│   thumbnail_url: string                                     │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 2: Background Processing (Vercel Cron → pg-boss)       │
│                                                              │
│ Trigger: Vercel Cron (every 1 minute)                       │
│ GET /api/cron/process-documents                             │
│                                                              │
│ Server:                                                      │
│ - Initialize pg-boss                                        │
│ - Fetch 1 pending job (to stay under rate limits)           │
│ - Update document status: 'processing'                      │
│ - Notify client via Supabase real-time                      │
└──────────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 3: OCR Extraction                                       │
│                                                              │
│ Primary: Tesseract.js (free, unlimited)                     │
│ - Download document from Supabase Storage                   │
│ - If PDF: convert to images (pdf-lib)                       │
│ - Run Tesseract OCR:                                        │
│   const { data: { text, confidence } } =                    │
│     await Tesseract.recognize(image, 'eng+tha');            │
│ - Store results:                                            │
│   * ocr_text: full text                                     │
│   * ocr_confidence: 0-100                                   │
│   * ocr_provider: 'tesseract'                               │
│                                                              │
│ Fallback: Google Cloud Vision (if confidence < 70%)         │
│ - Check daily quota (1,000/day shared across all users)     │
│ - Call Vision API                                           │
│ - Store improved results                                    │
│                                                              │
│ Error Handling:                                              │
│ - If Tesseract fails: try Vision API                        │
│ - If both fail: mark status 'failed', store error           │
│ - Notify user of failure                                    │
└──────────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 4: LLM Parsing (Google Gemini 1.5 Flash)               │
│                                                              │
│ Rate Limiting:                                               │
│ - Check daily quota (1,500 requests/day)                    │
│ - Check per-minute quota (15 requests/minute)               │
│ - If exceeded: retry job after 1 hour                       │
│                                                              │
│ Prompt Engineering:                                          │
│ const prompt = `                                             │
│ Extract transaction details from this receipt OCR text:     │
│                                                              │
│ ${ocr_text}                                                  │
│                                                              │
│ Return JSON only:                                            │
│ {                                                            │
│   "vendor": string (business name),                         │
│   "amount": number (total paid),                            │
│   "currency": "USD" | "THB",                                │
│   "date": "YYYY-MM-DD",                                     │
│   "confidence": number (0-100, your confidence)             │
│ }                                                            │
│                                                              │
│ If you cannot extract a field, use null.                    │
│ `;                                                           │
│                                                              │
│ API Call:                                                    │
│ - Model: gemini-1.5-flash (fastest, free)                  │
│ - Temperature: 0.1 (consistent parsing)                     │
│ - Max tokens: 200 (JSON output is small)                   │
│                                                              │
│ Response Parsing:                                            │
│ - Validate JSON structure                                   │
│ - Store in documents table:                                 │
│   * parsed_vendor                                           │
│   * parsed_amount                                           │
│   * parsed_currency                                         │
│   * parsed_date                                             │
│   * parsed_confidence                                       │
│                                                              │
│ Error Handling:                                              │
│ - If rate limited: retry after delay                        │
│ - If invalid JSON: try one more time with stricter prompt   │
│ - If fails: mark status 'failed', allow manual entry        │
└──────────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 5: Vendor Enrichment (Lazy Loading)                    │
│                                                              │
│ Note: Only happens when user views vendor detail page       │
│                                                              │
│ GET /api/vendors/{id}/logo                                  │
│                                                              │
│ Check cache:                                                 │
│ - Query vendor_logos table                                  │
│ - If exists and fetched < 30 days ago: return cached URL    │
│                                                              │
│ Extract domain:                                              │
│ - If vendor has domain field: use it                        │
│ - Otherwise: guess from name                                │
│   * "Amazon" → "amazon.com"                                 │
│   * "Starbucks Coffee" → "starbucks.com"                    │
│   * "7-Eleven" → "7-eleven.com"                             │
│                                                              │
│ Fetch logo (waterfall strategy):                            │
│ 1. DuckDuckGo Icons API (unlimited, best quality)           │
│    https://icons.duckduckgo.com/ip3/{domain}.ico            │
│                                                              │
│ 2. Google Favicon API (unlimited, good fallback)            │
│    https://www.google.com/s2/favicons?sz=128&domain={domain}│
│                                                              │
│ 3. Clearbit Logo API (rate limited, high quality)           │
│    https://logo.clearbit.com/{domain}                       │
│                                                              │
│ 4. Default placeholder icon                                 │
│                                                              │
│ Cache result:                                                │
│ - Insert/update vendor_logos table                          │
│ - Set logo_url, logo_source, fetched_at                     │
│ - Cache forever (or until user manually updates)            │
│                                                              │
│ Response:                                                    │
│ {                                                            │
│   logo_url: string,                                         │
│   source: 'duckduckgo' | 'google' | 'clearbit' | 'default' │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 6: Auto-Matching (Optional)                            │
│                                                              │
│ Find potential matches:                                      │
│ - Query transactions without source_document_id             │
│ - Filter by date range (parsed_date ± 3 days)               │
│ - Filter by amount range (parsed_amount ± 5%)               │
│ - Filter by vendor (fuzzy match on name)                    │
│                                                              │
│ Confidence scoring:                                          │
│ - Exact amount + date + vendor: 100% → auto-match           │
│ - Close amount + date + vendor: 80% → suggest               │
│ - Anything else: < 50% → manual review                      │
│                                                              │
│ Auto-match if confidence >= 95%:                            │
│ - Update transaction.source_document_id                     │
│ - Update document.matched_transaction_id                    │
│ - Update document.matched_at                                │
│ - Update document.status: 'completed'                       │
│                                                              │
│ Otherwise:                                                   │
│ - Update document.status: 'completed'                       │
│ - Show in reconciliation UI for manual review               │
└──────────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 7: Completion & Cleanup                                │
│                                                              │
│ Mark job complete:                                           │
│ - pg-boss.complete(job_id)                                  │
│ - Delete job from queue                                     │
│                                                              │
│ Notify client:                                               │
│ - Supabase real-time notification                           │
│ - Client refreshes document list                            │
│                                                              │
│ Schedule cleanup (after 90 days):                           │
│ - Keep thumbnail forever                                    │
│ - Keep OCR text & parsed data forever                       │
│ - Delete original file from Storage                         │
│ - Update document.original_deleted_at                       │
│                                                              │
│ Final status:                                                │
│ - document.status: 'completed' or 'failed'                  │
│ - User can view results in UI                               │
│ - User can manually edit parsed data                        │
│ - User can manually match to transactions                   │
└──────────────────────────────────────────────────────────────┘
```

### API Rate Limiting Strategy

```javascript
// /lib/rate-limiter.js
export class RateLimiter {
  // Per-user limits (prevent abuse)
  USER_DAILY_UPLOAD_LIMIT = 100; // 100 documents/day per user

  // Global limits (shared across all users)
  GEMINI_DAILY_LIMIT = 1500; // requests/day
  GEMINI_MINUTE_LIMIT = 15; // requests/minute
  VISION_DAILY_LIMIT = 1000; // requests/day

  async checkUserLimit(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('processing_rate_limits')
      .select('ocr_count')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    return !data || data.ocr_count < this.USER_DAILY_UPLOAD_LIMIT;
  }

  async checkGeminiLimit(): Promise<boolean> {
    // Check global counter in Redis-like cache
    // For MVP: use PostgreSQL with row locking
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('global_rate_limits')
      .select('count')
      .eq('service', 'gemini')
      .eq('date', today)
      .single();

    return !data || data.count < this.GEMINI_DAILY_LIMIT;
  }

  async incrementGeminiCount(): Promise<void> {
    // Atomic increment
    const today = new Date().toISOString().split('T')[0];

    await supabase.rpc('increment_rate_limit', {
      p_service: 'gemini',
      p_date: today
    });
  }
}
```

### Retry Strategy

```javascript
// pg-boss job configuration
await boss.send('process-document',
  { document_id: '...' },
  {
    retryLimit: 3,
    retryDelay: 60, // seconds
    retryBackoff: true, // exponential backoff
    expireInSeconds: 3600, // 1 hour max

    // Custom retry logic
    onFailure: async (error) => {
      if (error.code === 'RATE_LIMIT') {
        // Retry after 1 hour
        return { retryDelay: 3600 };
      } else if (error.code === 'OCR_FAILED') {
        // Don't retry, mark as failed
        return { retryLimit: 0 };
      }
      // Default retry
      return {};
    }
  }
);
```

---

## 5. Cost Analysis & Limitations {#limitations}

### Free Tier Capacity Analysis

```
SCENARIO 1: Light Usage (10 active users)
-------------------------------------------
Monthly Activity:
- 10 users × 20 documents/month = 200 documents
- Average document size: 500KB
- Total storage needed: 100MB (20% of limit)
- OCR requests: 200/month (13% of daily limit)
- LLM requests: 200/month (0.4% of daily limit)
- Bandwidth: ~5GB/month (5% of limit)

Verdict: WELL WITHIN FREE TIER ✓


SCENARIO 2: Medium Usage (50 active users)
--------------------------------------------
Monthly Activity:
- 50 users × 15 documents/month = 750 documents
- Average document size: 500KB
- Total storage needed: 375MB (75% of limit)
- OCR requests: 750/month (50% of daily limit)
- LLM requests: 750/month (1.6% of daily limit)
- Bandwidth: ~20GB/month (20% of limit)

Verdict: STILL FREE, approaching storage limit ⚠️


SCENARIO 3: Heavy Usage (100 active users)
--------------------------------------------
Monthly Activity:
- 100 users × 10 documents/month = 1,000 documents
- Average document size: 500KB
- Total storage needed: 500MB (100% of DB limit) ⚠️
- File storage: 1GB (100% of Storage limit) ⚠️
- OCR requests: 1,000/month (67% of daily limit)
- LLM requests: 1,000/month (2.2% of daily limit)
- Bandwidth: ~40GB/month (40% of limit)

Verdict: HITTING LIMITS, need cleanup strategy ⚠️
```

### Hard Limitations at Zero Cost

| Limitation | Impact | Mitigation Strategy |
|------------|--------|---------------------|
| **500MB DB storage** | Can store ~50k transactions + metadata | Auto-archive old transactions after 2 years |
| **1GB file storage** | Can store ~2,000 documents | Delete originals after 90 days, keep thumbnails |
| **2GB DB bandwidth/month** | ~10k page views/month | Aggressive client-side caching, CDN |
| **100GB Vercel bandwidth** | ~500k API calls/month | Compress responses, use pagination |
| **1,500 LLM requests/day** | ~50 documents/day | Queue overflow to next day, fair queuing |
| **15 LLM requests/minute** | Slow processing | Process 1 doc/minute, show progress bar |
| **No Redis** | Slower job queue | Use pg-boss, acceptable for MVP |
| **10 min function timeout** | Large PDFs may timeout | Split into smaller jobs, resume on failure |

### Breaking Points (When You Must Upgrade)

```
BREAKING POINT 1: Database Storage (500MB)
-------------------------------------------
Symptoms:
- "Database storage full" errors
- Cannot insert new transactions
- Slow queries due to table scans

Solutions:
- Upgrade to Supabase Pro: $25/month (8GB DB, 100GB bandwidth)
- OR: Self-host PostgreSQL on DigitalOcean ($6/month)
- OR: Implement aggressive archiving (compress old data)


BREAKING POINT 2: File Storage (1GB)
--------------------------------------
Symptoms:
- "Storage quota exceeded" errors
- Cannot upload new documents

Solutions:
- Upgrade to Supabase Pro: $25/month (100GB storage)
- OR: Store files in Cloudflare R2 (10GB free, then $0.015/GB)
- OR: Delete originals after 30 days instead of 90


BREAKING POINT 3: LLM Rate Limits (1,500/day)
-----------------------------------------------
Symptoms:
- Documents stuck in queue for 24+ hours
- Users complaining about slow processing

Solutions:
- Upgrade to Gemini Pay-as-you-go: ~$0.00035/request
  * 10,000 requests/month = $3.50/month
- OR: Use smaller batch processing (5 docs/day per user)
- OR: Charge users $5/month for unlimited processing


BREAKING POINT 4: Bandwidth (100GB Vercel)
--------------------------------------------
Symptoms:
- "Bandwidth exceeded" warnings from Vercel
- Site becomes slow or unavailable

Solutions:
- Upgrade to Vercel Pro: $20/month (1TB bandwidth)
- OR: Move to Cloudflare Pages (free unlimited bandwidth)
- OR: Optimize images, use aggressive caching
```

### Zero-Cost Optimization Strategies

```
STRATEGY 1: Aggressive Compression
------------------------------------
- Compress images to 80% quality on upload (Sharp.js)
- Generate 200x200 thumbnails (60% quality)
- Store thumbnails instead of originals after 90 days
- Result: 10x storage reduction

Implementation:
// /lib/image-compressor.js
export async function compressImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

export async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(200, 200, { fit: 'cover' })
    .jpeg({ quality: 60, mozjpeg: true })
    .toBuffer();
}


STRATEGY 2: Lazy Loading Everything
-------------------------------------
- Don't fetch vendor logos until user views vendor
- Don't run OCR until user confirms upload
- Don't fetch exchange rates until needed
- Result: 50% reduction in API calls

Implementation:
// /components/VendorLogo.tsx
export function VendorLogo({ vendorId }: { vendorId: string }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Only fetch when in viewport
  useEffect(() => {
    if (isVisible && !logoUrl) {
      fetchVendorLogo(vendorId).then(setLogoUrl);
    }
  }, [isVisible, vendorId]);

  return (
    <InView onChange={setIsVisible}>
      {logoUrl ? <img src={logoUrl} /> : <Placeholder />}
    </InView>
  );
}


STRATEGY 3: Client-Side Caching
---------------------------------
- Cache API responses in localStorage (vendor list, etc.)
- Use SWR with long stale times (5 minutes)
- Prefetch likely next pages
- Result: 80% reduction in API calls

Implementation:
// /lib/api-client.ts
export function useTransactions() {
  return useSWR('/api/transactions', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 300000, // 5 minutes
    fallbackData: getCachedData('transactions'),
    onSuccess: (data) => setCachedData('transactions', data)
  });
}


STRATEGY 4: Smart Cleanup Jobs
--------------------------------
- Auto-delete original documents after 90 days
- Keep thumbnails + OCR text + parsed data forever
- Archive transactions older than 2 years
- Result: Stay within free tier indefinitely

Implementation:
// /api/cron/cleanup
export async function runCleanup() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Find documents to clean up
  const { data: oldDocs } = await supabase
    .from('documents')
    .select('id, storage_path')
    .lt('created_at', ninetyDaysAgo.toISOString())
    .is('original_deleted_at', null);

  for (const doc of oldDocs || []) {
    // Delete original file from Storage
    await supabase.storage
      .from('documents')
      .remove([doc.storage_path]);

    // Mark as deleted (keep thumbnail + metadata)
    await supabase
      .from('documents')
      .update({ original_deleted_at: new Date().toISOString() })
      .eq('id', doc.id);
  }
}


STRATEGY 5: Fair Queuing
--------------------------
- Limit each user to 10 pending jobs at a time
- Process oldest jobs first (FIFO)
- Show estimated wait time in UI
- Result: Fair distribution of free tier quota

Implementation:
// /lib/job-queue.ts
export async function queueDocument(userId: string, documentId: string) {
  // Check user's pending job count
  const pendingCount = await supabase
    .from('documents')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('processing_status', 'pending');

  if (pendingCount.count >= 10) {
    throw new Error('You have 10 documents pending. Please wait for processing to complete.');
  }

  // Calculate estimated wait time
  const queuePosition = await getQueuePosition(documentId);
  const estimatedMinutes = queuePosition * 1; // 1 doc/minute

  return {
    queued: true,
    position: queuePosition,
    estimatedWait: estimatedMinutes
  };
}
```

---

## 6. Migration Path to Paid Services {#migration-path}

### Upgrade Triggers & Recommendations

```
TIER 1: Free Forever (0-50 users)
===================================
Monthly Cost: $0
Limitations:
- 500MB database
- 1GB file storage
- 1,500 LLM requests/day
- Manual cleanup required

Good for: MVP, beta testing, personal use


TIER 2: Bootstrap Startup (50-200 users)
==========================================
Monthly Cost: ~$50

Upgrades:
1. Supabase Pro: $25/month
   - 8GB database (16x more)
   - 50GB file storage (50x more)
   - 250GB bandwidth (62x more)
   - Automated daily backups

2. Gemini Pay-as-you-go: ~$10-20/month
   - No rate limits
   - ~$0.00035 per request
   - 30,000 requests/month = $10.50

3. Keep Vercel Free: $0
   - Still plenty of bandwidth

Total: $35-45/month

Good for: Small startups, 100-200 active users


TIER 3: Growing Business (200-1,000 users)
============================================
Monthly Cost: ~$150

Upgrades:
1. Supabase Pro: $25/month (same)

2. Vercel Pro: $20/month
   - 1TB bandwidth
   - 1M serverless executions
   - Faster edge network

3. Gemini API: ~$50/month
   - 150,000 requests/month
   - ~$0.00035 per request

4. Cloudflare R2: ~$15/month
   - Move old documents to cheaper storage
   - $0.015/GB storage (vs $0.021 Supabase)
   - Free egress bandwidth

5. Better Transactional Email: ~$10/month
   - SendGrid or Postmark
   - Professional notifications

Total: $120-150/month

Good for: Growing startups, 500-1,000 active users


TIER 4: Scale (1,000+ users)
==============================
Monthly Cost: ~$500+

Upgrades:
1. Supabase Team: $599/month
   - 100GB database
   - Point-in-time recovery
   - Read replicas
   - Dedicated support

   OR: Self-hosted PostgreSQL
   - DigitalOcean: $240/month (8CPU, 16GB RAM)
   - AWS RDS: $300-500/month

2. Vercel Pro/Enterprise: $20-500/month
   - Depends on traffic

3. LLM: Switch to batch processing
   - OpenAI Batch API: 50% cheaper
   - Or self-host open models (Llama 3.2)

4. CDN: Cloudflare Pro $20/month
   - Better caching
   - DDoS protection
   - Image optimization

5. Monitoring: Sentry $26/month
   - Error tracking
   - Performance monitoring

Total: $500-1,500/month

Good for: Established companies, 1,000+ users
```

### Migration Checklist

```
PHASE 1: Upgrade Database (when hitting 400MB)
------------------------------------------------
[ ] Sign up for Supabase Pro ($25/month)
[ ] No code changes needed (same API)
[ ] Update connection string in .env
[ ] Enable daily backups
[ ] Set up monitoring alerts (80% storage warning)

Effort: 30 minutes
Downtime: None


PHASE 2: Upgrade LLM (when hitting 1,000 requests/day)
--------------------------------------------------------
[ ] Sign up for Google Cloud account
[ ] Enable Gemini API billing
[ ] Update API key in .env
[ ] Add usage monitoring dashboard
[ ] Set budget alerts ($50/month)
[ ] Optional: Implement request batching

Effort: 1 hour
Downtime: None


PHASE 3: Upgrade Hosting (when hitting 80GB bandwidth)
--------------------------------------------------------
[ ] Sign up for Vercel Pro ($20/month)
[ ] No code changes needed
[ ] Enable analytics
[ ] Set up custom domain with better caching

Effort: 20 minutes
Downtime: None


PHASE 4: Add CDN for Files (when hitting storage costs)
---------------------------------------------------------
[ ] Create Cloudflare R2 account
[ ] Set up R2 bucket
[ ] Update storage service to use R2 for old files:
    * Keep recent files (< 30 days) in Supabase Storage
    * Move old files to R2 (90% cheaper)
[ ] Implement migration script
[ ] Update document URLs to R2

Effort: 4 hours
Downtime: None (gradual migration)


PHASE 5: Self-host OCR (if processing speed is issue)
-------------------------------------------------------
[ ] Deploy Tesseract server on DigitalOcean ($12/month)
[ ] Use GPU instance for faster processing ($50/month)
[ ] Update OCR service to use dedicated server
[ ] Keep Google Vision as fallback

Effort: 8 hours
Downtime: None (add as alternative processor)
```

### Cost Comparison by Scale

```
MONTHLY COST BREAKDOWN
======================

Users | Documents/mo | Free Tier | Bootstrap | Growing | Scale
------|--------------|-----------|-----------|---------|-------
10    | 200          | $0 ✓      | -         | -       | -
50    | 750          | $0 ✓      | -         | -       | -
100   | 1,500        | $0 ⚠️      | $45       | -       | -
200   | 3,000        | Not viable | $45       | -       | -
500   | 7,500        | Not viable | Not viable| $150    | -
1,000 | 15,000       | Not viable | Not viable| $150 ⚠️  | $500
2,000 | 30,000       | Not viable | Not viable| Not viable | $800
5,000+| 75,000+      | Not viable | Not viable| Not viable | $1,500+

✓ = Comfortable
⚠️ = Approaching limits
```

### Alternative Approaches (Still Free/Cheap)

```
APPROACH 1: Community Edition (Always Free)
---------------------------------------------
Idea: Self-host everything on a $5 DigitalOcean droplet
- PostgreSQL (database)
- MinIO (S3-compatible storage)
- Tesseract (OCR)
- Ollama + Llama 3.2 (local LLM)
- Node.js server

Pros:
- Truly free tier: ~$5-10/month
- No rate limits
- Full control

Cons:
- Requires DevOps knowledge
- Manual scaling
- No managed backups
- Slower performance


APPROACH 2: Hybrid (Best of Both Worlds)
------------------------------------------
Idea: Use free tiers for core, paid for heavy tasks
- Supabase (database + auth): Free tier
- Vercel (hosting): Free tier
- R2 (file storage): Free 10GB, then $0.015/GB
- Gemini (LLM): Pay-as-you-go (~$10/month)
- Self-hosted Tesseract: $6/month DigitalOcean

Total: ~$15-20/month
Good for: Bootstrapped startups


APPROACH 3: Revenue-Sharing (Free for Developer)
--------------------------------------------------
Idea: Charge users, use revenue to pay for services
- Free tier: 10 documents/month
- Pro tier: $5/month for 100 documents
- Business tier: $20/month for unlimited

Revenue model:
- 100 free users = $0 cost (stay in free tier)
- 50 paying users ($5) = $250/month revenue
- Costs: ~$50/month for infrastructure
- Profit: $200/month

This is the recommended approach!
```

---

## Summary & Recommendations

### Best Zero-Cost Architecture

```
FOR MVP (0-50 users):
- Supabase Free (database + storage + auth)
- Vercel Free (hosting)
- Tesseract.js (OCR)
- Google Gemini Free (LLM)
- DuckDuckGo + Google (logos)
- pg-boss (job queue)

Total Cost: $0/month
Time to Deploy: 1 week
User Capacity: 50 active users
```

### First Paid Upgrade

```
WHEN YOU HIT LIMITS (50-200 users):
Upgrade Supabase to Pro: $25/month
- 16x more database storage
- 50x more file storage
- Automated backups
- Priority support

This single upgrade extends your runway by 10x.
Total Cost: $25/month
```

### Recommended Monetization

```
PRICING TIERS:
1. Free: 10 documents/month
   - Perfect for trying the product
   - Stays within free tier costs

2. Starter: $5/month for 100 documents
   - Most hobbyists and freelancers
   - Covers infrastructure costs

3. Pro: $15/month for unlimited documents
   - Small businesses
   - Generates profit margin

4. Business: $50/month for team features
   - Multiple users, API access
   - High profit margin

With just 20 paying users ($5 tier), you cover Supabase Pro.
With 50 paying users, you're profitable.
```

---

## Implementation Priority

```
WEEK 1: Core Infrastructure
- Set up Supabase (free tier)
- Deploy to Vercel (free tier)
- Basic auth + transactions UI
- File upload to Supabase Storage

WEEK 2: Document Processing
- Implement Tesseract.js OCR
- Integrate Google Gemini API
- Build pg-boss job queue
- Add processing status UI

WEEK 3: Reconciliation
- Auto-matching algorithm
- Manual matching UI
- Vendor enrichment (logos)
- Transaction linking

WEEK 4: Polish & Optimize
- Compression & thumbnails
- Cleanup jobs (90-day deletion)
- Rate limiting
- Error handling

WEEK 5: Beta Testing
- Invite 10-20 users
- Monitor free tier usage
- Fix bugs
- Gather feedback

WEEK 6: Launch MVP
- Public launch
- Documentation
- Pricing page (even if free)
- Analytics
```

---

## Files to Create

```
/lib/ocr-service.ts          - Tesseract.js wrapper
/lib/llm-service.ts          - Gemini API client
/lib/job-queue.ts            - pg-boss wrapper
/lib/logo-fetcher.ts         - Logo API waterfall
/lib/image-compressor.ts     - Sharp.js utilities
/lib/rate-limiter.ts         - Usage tracking
/lib/auto-matcher.ts         - Reconciliation logic

/api/documents/upload.ts     - File upload endpoint
/api/documents/process.ts    - OCR + LLM pipeline
/api/cron/process-queue.ts   - Background worker
/api/cron/cleanup.ts         - 90-day deletion
/api/vendors/[id]/logo.ts    - Logo fetch endpoint
/api/reconcile/suggest.ts    - Auto-matching API

/components/DocumentUpload.tsx     - Upload UI
/components/ProcessingStatus.tsx   - Progress indicator
/components/ReconciliationView.tsx - Matching interface
/components/VendorLogo.tsx         - Lazy-loaded logos

/database/migrations/add-documents-table.sql
/database/migrations/add-vendor-logos-table.sql
/database/migrations/add-rate-limits-table.sql
```

---

## Next Steps

1. Review this architecture document
2. Decide on implementation timeline
3. Create GitHub issues for each component
4. Set up Supabase project (free tier)
5. Start with Week 1 tasks
6. Deploy MVP in 4-6 weeks

**Questions? Need clarification on any section?**
