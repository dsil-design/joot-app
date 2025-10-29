# Quick Reference: Zero-Cost MVP

**One-page cheat sheet for the document management system**

---

## Tech Stack (All Free)

```
Frontend:     Next.js 14 + Vercel
Database:     Supabase PostgreSQL (500MB)
Storage:      Supabase Storage (1GB)
Auth:         Supabase Auth
Queue:        pg-boss (PostgreSQL)
OCR:          Tesseract.js (unlimited)
LLM:          Google Gemini 1.5 Flash (1,500/day)
Logos:        DuckDuckGo + Google (unlimited)
```

---

## Free Tier Limits

| Service | Limit | What Happens When Exceeded |
|---------|-------|---------------------------|
| Database | 500 MB | Must upgrade to Pro ($25/mo) |
| Storage | 1 GB | Must upgrade or enable cleanup |
| LLM | 1,500/day | Queue jobs for next day |
| Bandwidth | 100 GB/mo | Must upgrade Vercel Pro ($20/mo) |

---

## Cost by Scale

```
0-50 users:      $0/month
50-200 users:    $35/month (Supabase Pro + Gemini)
200-1,000 users: $150/month (+ Vercel Pro, R2, etc.)
1,000+ users:    $500+/month (enterprise grade)
```

---

## Key Files to Create

```
/lib/
  supabase.ts            - Supabase client
  ocr-service.ts         - Tesseract.js wrapper
  llm-service.ts         - Gemini API client
  job-queue.ts           - pg-boss wrapper
  logo-fetcher.ts        - Logo API waterfall
  image-compressor.ts    - Sharp.js utilities
  rate-limiter.ts        - Usage tracking

/app/api/
  documents/upload/route.ts      - File upload
  documents/process/route.ts     - OCR + LLM
  cron/process-documents/route.ts - Background worker
  cron/cleanup/route.ts           - 90-day cleanup
  vendors/[id]/logo/route.ts      - Logo fetch
  reconcile/suggest/route.ts      - Auto-matching

/components/
  DocumentUploader.tsx           - Upload UI
  ProcessingStatus.tsx           - Real-time progress
  ReconciliationView.tsx         - Matching interface
  VendorLogo.tsx                 - Lazy-loaded logos

/database/migrations/
  add_documents_table.sql        - New tables
  add_vendor_logos_table.sql
  add_rate_limits_table.sql
```

---

## Database Schema (New Tables)

```sql
-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  file_name TEXT,
  storage_path TEXT,
  thumbnail_path TEXT,
  processing_status TEXT, -- pending, processing, completed, failed
  ocr_text TEXT,
  parsed_vendor TEXT,
  parsed_amount DECIMAL,
  parsed_currency TEXT,
  parsed_date DATE,
  matched_transaction_id UUID
);

-- Vendor Logos (cache)
CREATE TABLE vendor_logos (
  id UUID PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id),
  logo_url TEXT,
  logo_source TEXT, -- duckduckgo, google, clearbit
  domain TEXT
);

-- Rate Limits
CREATE TABLE processing_rate_limits (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  date DATE,
  ocr_count INTEGER DEFAULT 0,
  llm_count INTEGER DEFAULT 0
);
```

---

## Processing Pipeline (Step by Step)

```
1. USER UPLOADS
   → POST /api/documents/upload
   → Compress with Sharp.js
   → Upload to Supabase Storage
   → Create pg-boss job

2. BACKGROUND WORKER (Vercel Cron)
   → Runs every minute
   → Polls pg-boss for pending jobs
   → Processes 1 document at a time

3. OCR EXTRACTION
   → Download from Storage
   → Run Tesseract.js
   → If confidence < 70%, use Google Vision (fallback)
   → Save ocr_text to DB

4. LLM PARSING
   → Check rate limits (1,500/day, 15/min)
   → Call Gemini API with prompt
   → Parse JSON response
   → Save parsed_vendor, amount, date to DB

5. AUTO-MATCHING
   → Find transactions with similar amount/date/vendor
   → Calculate confidence score
   → If >= 95%, auto-match
   → Otherwise, show in reconciliation UI

6. CLEANUP (after 90 days)
   → Delete original file
   → Keep thumbnail + OCR text + parsed data
   → Save 90% storage space
```

---

## Rate Limiting Strategy

```javascript
// Per-user limits (prevent abuse)
USER_DAILY_UPLOAD_LIMIT = 100; // 100 docs/day per user

// Global limits (shared across all users)
GEMINI_DAILY_LIMIT = 1500; // requests/day
GEMINI_MINUTE_LIMIT = 15; // requests/minute

// When hit:
if (limit_exceeded) {
  // Queue job for later
  return { status: 'queued', estimated_wait: '1 hour' };
}
```

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
DATABASE_URL=postgresql://postgres:password@xxx.pooler.supabase.com/postgres
GOOGLE_GEMINI_API_KEY=AIzaSy...
CRON_SECRET=random-secret-for-cron-jobs
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## Deployment Steps

```bash
# 1. Create accounts (all free)
- Supabase: https://supabase.com
- Vercel: https://vercel.com
- Google AI Studio: https://aistudio.google.com

# 2. Initialize project
npx create-next-app@latest joot-documents --typescript --tailwind --app

# 3. Install dependencies
npm install @supabase/supabase-js pg-boss sharp tesseract.js @google/generative-ai

# 4. Set up database
npx supabase init
npx supabase migration new add_documents
# (paste SQL schema)
npx supabase db push

# 5. Deploy to Vercel
npx vercel --prod
# Set environment variables in Vercel dashboard

# 6. Set up cron job
# Add to vercel.json:
{
  "crons": [{
    "path": "/api/cron/process-documents",
    "schedule": "* * * * *"
  }]
}
```

---

## Common Commands

```bash
# Development
npm run dev                    # Start dev server
npx supabase db reset         # Reset local DB
npx supabase db push          # Push migrations to remote

# Deployment
npx vercel                     # Deploy to staging
npx vercel --prod             # Deploy to production

# Database
npx supabase db dump -f schema.sql  # Export schema
npx supabase db diff          # Show pending migrations

# Debugging
npx supabase status           # Check services
npx supabase logs             # View logs
```

---

## API Endpoints Reference

```
POST   /api/documents/upload
  Body: FormData(file)
  Returns: { document_id, status }

POST   /api/documents/process
  Body: { document_id }
  Returns: { success, parsed }

GET    /api/reconcile/suggest
  Query: ?date_from=2025-01-01&date_to=2025-12-31
  Returns: { unmatched_documents, unmatched_transactions, suggestions }

GET    /api/vendors/:id/logo
  Returns: { logo_url, source }

GET    /api/cron/process-documents
  Headers: Authorization: Bearer {CRON_SECRET}
  Returns: { message, document_id }

GET    /api/cron/cleanup
  Headers: Authorization: Bearer {CRON_SECRET}
  Returns: { deleted_count }
```

---

## Testing Checklist

```
[ ] Upload PDF document
[ ] Upload JPG/PNG image
[ ] View processing status (real-time updates)
[ ] Check OCR text extracted correctly
[ ] Verify parsed data (vendor, amount, date)
[ ] Test auto-matching with existing transaction
[ ] Manual reconciliation (drag & drop)
[ ] View vendor logo (lazy loaded)
[ ] Check thumbnail generation
[ ] Test on mobile (responsive)
[ ] Verify 90-day cleanup job
[ ] Test rate limiting (upload 100+ docs)
[ ] Check error handling (invalid file, OCR fail, LLM fail)
```

---

## Upgrade Triggers

```
⚠️ UPGRADE TO SUPABASE PRO ($25/mo) WHEN:
- Database > 400 MB (80% full)
- Storage > 800 MB (80% full)
- Need daily backups
- Want point-in-time recovery

⚠️ UPGRADE TO GEMINI PAY-AS-YOU-GO (~$10/mo) WHEN:
- Processing > 1,200 docs/day
- Users complaining about queue times
- Need faster processing

⚠️ UPGRADE TO VERCEL PRO ($20/mo) WHEN:
- Bandwidth > 80 GB/month
- Need better analytics
- Want custom domain with DDoS protection
```

---

## Troubleshooting

```
ISSUE: "Database storage full"
FIX: Run cleanup job, archive old data, or upgrade

ISSUE: "Rate limit exceeded" (Gemini)
FIX: Queue jobs for next day, or upgrade to paid

ISSUE: "OCR confidence too low"
FIX: Fallback to Google Vision API (1,000/month free)

ISSUE: "Vercel function timeout" (10 min limit)
FIX: Split large PDFs into smaller jobs

ISSUE: "Upload fails on mobile"
FIX: Reduce max file size from 10MB to 5MB

ISSUE: "Real-time updates not working"
FIX: Check Supabase Realtime enabled, verify subscription
```

---

## Performance Optimization Tips

```
1. AGGRESSIVE CACHING
   - Store API responses in localStorage
   - Use SWR with 5-minute stale time
   - Cache vendor logos forever

2. LAZY LOADING
   - Fetch logos only when viewed
   - Load documents on-demand (pagination)
   - Defer non-critical API calls

3. IMAGE COMPRESSION
   - Compress uploads to 80% quality
   - Generate thumbnails (200x200, 60% quality)
   - Use WebP format when possible

4. DATABASE INDEXING
   - Index user_id, processing_status, date columns
   - Use composite indexes for queries

5. BACKGROUND PROCESSING
   - Don't block user on upload
   - Process in background (pg-boss)
   - Show progress with real-time updates
```

---

## Monitoring & Alerts

```
SET UP ALERTS FOR:

Database:
- Storage > 80%
- Bandwidth > 80%
- Queries > 1,000/min

Processing:
- LLM rate limit > 1,200/day
- OCR failures > 10%
- Queue length > 50 jobs

User Experience:
- Upload failures > 5%
- Processing time > 5 minutes
- Error rate > 2%
```

---

## Revenue Model (Suggested)

```
FREE TIER:
- 10 documents/month
- All features
→ Stays within free infrastructure

STARTER ($5/mo):
- 100 documents/month
- Email support
→ Break-even: 7 users

PRO ($15/mo):
- Unlimited documents
- Priority processing
→ High profit margin

BUSINESS ($50/mo):
- Team features
- API access
- Dedicated support
→ Very high profit margin

BREAK-EVEN: 20 paying users (Starter tier)
PROFITABLE: 50 paying users = $575/mo profit
```

---

## Resources

```
Documentation:
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Gemini API: https://ai.google.dev/docs

Tutorials:
- Tesseract.js: https://github.com/naptha/tesseract.js
- pg-boss: https://github.com/timgit/pg-boss
- Sharp: https://sharp.pixelplumbing.com/

Community:
- Supabase Discord: https://discord.supabase.com
- Next.js Discord: https://nextjs.org/discord
```

---

## Next Steps

```
WEEK 1: Foundation
- Set up project structure
- Configure Supabase
- Implement auth
- Build basic dashboard

WEEK 2: Document Processing
- File upload UI
- OCR integration
- LLM parsing
- Real-time status

WEEK 3: Background Jobs
- pg-boss setup
- Vercel cron
- Processing pipeline
- Error handling

WEEK 4: Polish & Launch
- Reconciliation UI
- Cleanup jobs
- Testing
- Deploy to production
```

---

## Key Takeaways

```
✓ Start with free tier (0-50 users)
✓ Ship fast (4-6 weeks)
✓ Focus on product, not infrastructure
✓ Upgrade incrementally when needed
✓ Monetize early (break-even at 20 users)
✓ Don't over-engineer for scale you don't have
✓ Use aggressive cleanup (90-day deletion)
✓ Set realistic expectations (processing takes time)
```

---

**Print this page for quick reference during development!**
