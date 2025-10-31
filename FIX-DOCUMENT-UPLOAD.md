# Fix: Document Upload RLS Policy Error

## Problem
When uploading documents, you get the error: **"Upload failed: new row violates row-level security policy"**

## Root Cause
The `documents` table exists in the database, but the Row-Level Security (RLS) policies were never applied. This means users cannot insert rows into the table even though they're authenticated.

## Solution

You need to apply the RLS policies to the `documents` table. Here are two methods:

### Method 1: Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `uwjmgjqongcrsamprvjr`
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Paste the following SQL and click **Run**:

```sql
-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any exist)
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;

-- Create policies for SELECT (viewing documents)
CREATE POLICY "Users can view own documents"
  ON public.documents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for INSERT (uploading documents)
CREATE POLICY "Users can insert own documents"
  ON public.documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for UPDATE (updating documents)
CREATE POLICY "Users can update own documents"
  ON public.documents
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy for DELETE (deleting documents)
CREATE POLICY "Users can delete own documents"
  ON public.documents
  FOR DELETE
  USING (auth.uid() = user_id);
```

6. You should see "Success. No rows returned" - this is expected
7. Try uploading a document again - it should work now!

### Method 2: Using Supabase CLI (Alternative)

If you have Supabase CLI installed and linked to your project:

```bash
# Make sure the migration is in the correct folder
cp database/migrations/20251029000000_add_document_management_tables.sql database/supabase/migrations/

# Push the migration to your remote database
npx supabase db push
```

## Verification

After applying the fix, you can verify the policies were created:

1. Go to **Database** > **Policies** in your Supabase Dashboard
2. Find the `documents` table
3. You should see 4 policies:
   - Users can view own documents
   - Users can insert own documents
   - Users can update own documents
   - Users can delete own documents

## Testing

Try uploading a document again:
1. Go to Documents > Upload Document
2. Select a file (PDF, JPG, PNG, or EML)
3. Click "Upload Document"
4. It should now upload successfully without the RLS error

## Additional Tables

Note: You may need to apply similar RLS policies for other document-related tables:
- `document_extractions`
- `transaction_document_matches`
- `reconciliation_queue`
- `vendor_profiles`
- `vendor_enrichment_jobs`
- `reconciliation_audit_log`
- `processing_jobs`

These are all defined in the same migration file: `database/migrations/20251029000000_add_document_management_tables.sql`

If you encounter similar RLS errors with these tables, run the entire migration file in the SQL Editor.
