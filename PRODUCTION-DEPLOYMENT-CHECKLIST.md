# Production Deployment Checklist

**Status**: Ready for Deployment
**Date**: October 30, 2025
**Branch**: `feature/document-management` → `main`

---

## 🚀 Pre-Deployment Checklist

### 1. Database Setup ✅ (Already Complete?)

The system uses these Supabase tables that need to exist:

**Check if these tables exist in your production Supabase**:
- ✅ `users` (Supabase Auth - auto-created)
- ✅ `transactions` (existing from Joot app)
- ⚠️ `documents` (NEW - needs creation)
- ⚠️ `document_extractions` (NEW - needs creation)
- ⚠️ `transaction_document_matches` (NEW - needs creation)
- ⚠️ `vendor_profiles` (NEW - needs creation)
- ⚠️ `reconciliation_queue` (NEW - needs creation)
- ⚠️ `reconciliation_audit_log` (NEW - needs creation)

**If these tables don't exist, you need to create them.** See the "Database Migration" section below.

---

### 2. Supabase Storage Buckets

**Create these storage buckets in your production Supabase**:

1. **`documents` bucket**:
   - Purpose: Store uploaded receipts/invoices
   - Public: No (user-specific access)
   - File size limit: 10MB
   - Allowed file types: image/*, application/pdf

2. **`vendor-logos` bucket**:
   - Purpose: Store vendor logo images
   - Public: Yes (read-only)
   - File size limit: 1MB
   - Allowed file types: image/*

**How to create**:
1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Set name and policies

**Storage Policies Needed**:

For `documents` bucket:
```sql
-- Users can upload their own documents
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can read their own documents
CREATE POLICY "Users can read their documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own documents
CREATE POLICY "Users can delete their documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

For `vendor-logos` bucket:
```sql
-- Anyone can read vendor logos
CREATE POLICY "Public can read vendor logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vendor-logos');

-- Authenticated users can upload vendor logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vendor-logos');
```

---

### 3. Environment Variables

**Verify these are set in Vercel**:

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

**Required**:
```bash
# Supabase (should already be set)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini AI (NEW - REQUIRED)
GEMINI_API_KEY=your-gemini-api-key

# Site URL (for worker API calls)
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

**How to get Gemini API key**:
1. Go to https://ai.google.dev/
2. Click "Get API key"
3. Create new key (free tier)
4. Copy and add to Vercel

---

### 4. Database Migration

**Option A: Run Migration Script** (Recommended)

Create a migration file that creates all new tables:

```bash
# In your local terminal
npx supabase migration new document_management
```

This will create a file in `supabase/migrations/`. Add this SQL:

```sql
-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document extractions table
CREATE TABLE IF NOT EXISTS document_extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  raw_text TEXT,
  ocr_confidence FLOAT,
  vendor_name TEXT,
  amount FLOAT,
  currency TEXT,
  transaction_date DATE,
  extraction_confidence FLOAT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id)
);

-- Transaction document matches table
CREATE TABLE IF NOT EXISTS transaction_document_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  confidence_score FLOAT NOT NULL,
  match_type TEXT NOT NULL,
  matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  matched_by TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor profiles table
CREATE TABLE IF NOT EXISTS vendor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  domain TEXT,
  logo_url TEXT,
  transaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, normalized_name)
);

-- Reconciliation queue table
CREATE TABLE IF NOT EXISTS reconciliation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending_review',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id)
);

-- Reconciliation audit log table
CREATE TABLE IF NOT EXISTS reconciliation_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_item_id UUID NOT NULL REFERENCES reconciliation_queue(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_document_extractions_document_id ON document_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_matches_document_id ON transaction_document_matches(document_id);
CREATE INDEX IF NOT EXISTS idx_matches_transaction_id ON transaction_document_matches(transaction_id);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_user_id ON vendor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_queue_status ON reconciliation_queue(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_queue_document_id ON reconciliation_queue(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_document_id ON reconciliation_audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON reconciliation_audit_log(performed_by);

-- Row Level Security (RLS) Policies

-- Documents: Users can only access their own documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
ON documents FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
ON documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON documents FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON documents FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Document extractions: Follow document ownership
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view extractions for their documents"
ON document_extractions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_extractions.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert extractions for their documents"
ON document_extractions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_extractions.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update extractions for their documents"
ON document_extractions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_extractions.document_id
    AND documents.user_id = auth.uid()
  )
);

-- Transaction document matches: Follow document ownership
ALTER TABLE transaction_document_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view matches for their documents"
ON transaction_document_matches FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = transaction_document_matches.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert matches for their documents"
ON transaction_document_matches FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = transaction_document_matches.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update matches for their documents"
ON transaction_document_matches FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = transaction_document_matches.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete matches for their documents"
ON transaction_document_matches FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = transaction_document_matches.document_id
    AND documents.user_id = auth.uid()
  )
);

-- Vendor profiles: Users can only access their own vendor profiles
ALTER TABLE vendor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vendor profiles"
ON vendor_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vendor profiles"
ON vendor_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vendor profiles"
ON vendor_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Reconciliation queue: Follow document ownership
ALTER TABLE reconciliation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view queue items for their documents"
ON reconciliation_queue FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = reconciliation_queue.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert queue items for their documents"
ON reconciliation_queue FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = reconciliation_queue.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update queue items for their documents"
ON reconciliation_queue FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = reconciliation_queue.document_id
    AND documents.user_id = auth.uid()
  )
);

-- Reconciliation audit log: Follow document ownership
ALTER TABLE reconciliation_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit log for their documents"
ON reconciliation_audit_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = reconciliation_audit_log.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert audit log for their documents"
ON reconciliation_audit_log FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = reconciliation_audit_log.document_id
    AND documents.user_id = auth.uid()
  )
);
```

Then push to production:
```bash
npx supabase db push
```

**Option B: Manual SQL Execution**

1. Go to Supabase Dashboard → SQL Editor
2. Copy/paste the SQL above
3. Click "Run"

---

### 5. Background Workers

**IMPORTANT**: Background workers need to run separately!

The system uses pg-boss for background job processing (OCR, AI extraction, matching). These workers need to run continuously.

**Options**:

**Option A: Deploy as Separate Vercel Function** (Recommended for Vercel)

Since Vercel doesn't support long-running processes, use Vercel Cron Jobs:

1. Create `vercel.json` in your project root:
```json
{
  "crons": [
    {
      "path": "/api/cron/process-jobs",
      "schedule": "* * * * *"
    }
  ]
}
```

2. Create `/src/app/api/cron/process-jobs/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initializeOCRWorker } from '@/lib/workers/ocr-worker'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds

export async function GET() {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Initialize and run workers
    await initializeOCRWorker()

    return NextResponse.json({ success: true, message: 'Jobs processed' })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Job processing failed' }, { status: 500 })
  }
}
```

3. Add `CRON_SECRET` to Vercel environment variables

**Option B: Deploy to Railway/Render** (Better for long-running processes)

Deploy the worker as a separate service:

1. Create `worker.js` in project root:
```javascript
require('dotenv').config()
const { startOCRWorker } = require('./src/lib/workers/ocr-worker')

startOCRWorker().catch((error) => {
  console.error('Worker failed to start:', error)
  process.exit(1)
})
```

2. Create `Procfile`:
```
worker: node worker.js
```

3. Deploy to Railway or Render
4. Set same environment variables

**Option C: Local Worker (Development Only)**

For testing, run worker locally:
```bash
npm run worker:ocr
```

---

### 6. Git & Deployment Flow

**Step 1: Merge to main**
```bash
# Make sure you're on feature/document-management branch
git checkout feature/document-management

# Push to remote (if not already)
git push origin feature/document-management

# Switch to main
git checkout main

# Merge feature branch
git merge feature/document-management

# Push to main (triggers Vercel deployment)
git push origin main
```

**Step 2: Wait for Vercel deployment**
- Vercel will automatically deploy when you push to main
- Check deployment status in Vercel dashboard
- Review deployment logs for any errors

**Step 3: Verify deployment**
- Visit your production URL
- Check that app loads
- Try logging in
- Test upload flow (if possible)

---

## 🧪 Post-Deployment Testing

### Critical Path Testing

1. **Upload Document**
   - Go to `/documents/upload`
   - Upload a receipt (PDF or image)
   - Verify upload succeeds
   - Check Supabase Storage → documents bucket

2. **Check Processing**
   - Wait 5-10 seconds
   - Refresh page or check document status
   - Verify OCR ran (check `document_extractions` table)
   - Verify AI extraction ran (vendor, amount should be populated)

3. **Check Matching**
   - If you have existing transactions, matching should run
   - Check `transaction_document_matches` table
   - If confidence < 90%, should appear in reconciliation queue

4. **Reconciliation Queue**
   - Go to `/reconciliation`
   - Should see pending items (if any matches < 90%)
   - Click on item to review
   - Try approving or rejecting

5. **Audit Log**
   - Go to `/reconciliation/audit`
   - Should see your approval/rejection action

### Troubleshooting Common Issues

**Issue: "Failed to upload document"**
- Check Supabase storage bucket exists
- Check storage policies are set correctly
- Check file size < 10MB

**Issue: "OCR processing failed"**
- Check worker is running (Vercel cron or separate service)
- Check `GEMINI_API_KEY` is set
- Check Supabase connection

**Issue: "No matches found"**
- Make sure you have transactions in the database
- Check transaction dates are within ±30 days of receipt date
- Check vendor names and amounts roughly match

**Issue: "Cannot read properties of undefined"**
- Check all environment variables are set in Vercel
- Check database tables exist
- Check RLS policies are correct

---

## 📊 Monitoring & Maintenance

### What to Monitor

1. **Error Rate**
   - Set up Sentry or similar
   - Monitor API errors
   - Monitor worker failures

2. **Processing Times**
   - OCR duration
   - AI extraction duration
   - Matching duration

3. **Storage Usage**
   - Supabase storage (free tier: 1GB)
   - Database size (free tier: 500MB)

4. **API Usage**
   - Gemini API calls (free tier: 15 RPM)
   - Supabase API calls

### Regular Maintenance

- [ ] Weekly: Check error logs
- [ ] Monthly: Review storage usage
- [ ] Monthly: Review API usage (Gemini)
- [ ] Quarterly: Optimize database (vacuum, reindex)

---

## ✅ Final Checklist

Before marking as "deployed":

- [ ] Database tables created in production Supabase
- [ ] Storage buckets created (documents, vendor-logos)
- [ ] Storage policies configured
- [ ] Environment variables set in Vercel (including GEMINI_API_KEY)
- [ ] Worker strategy chosen and implemented
- [ ] Code merged to main branch
- [ ] Vercel deployment successful
- [ ] Upload flow tested in production
- [ ] OCR processing works
- [ ] AI extraction works
- [ ] Transaction matching works
- [ ] Reconciliation queue works
- [ ] Monitoring/logging set up (Sentry, etc.)

---

## 🚨 Rollback Plan

If something breaks in production:

1. **Immediate Rollback**:
   ```bash
   # In Vercel Dashboard
   # Go to Deployments → Find previous working deployment → Click "Promote to Production"
   ```

2. **Database Rollback**:
   - Don't delete tables (just leave them empty)
   - New tables won't affect existing functionality

3. **Debug Locally**:
   - Pull production logs from Vercel
   - Reproduce issue locally
   - Fix and redeploy

---

## 📞 Need Help?

If you encounter issues during deployment:

1. Check Vercel deployment logs
2. Check Supabase logs (Dashboard → Logs)
3. Check browser console for errors
4. Review this checklist again

**Common environment variable issues**:
- Make sure `GEMINI_API_KEY` is set (most common issue)
- Make sure `NEXT_PUBLIC_SITE_URL` points to your production domain
- Make sure Supabase keys are production keys (not local)

---

## 🎉 Success!

Once all checks pass, your document management system is live! 🚀

Users can now:
1. Upload receipts/invoices
2. Automatically extract data with AI
3. Match to existing transactions
4. Review and approve matches
5. Track all actions in audit log

**Total deployment time**: ~30-60 minutes (mostly database setup)

Good luck! 🍀
