# Apply RLS Policies for Document Upload

## Quick Fix (5 minutes)

The document upload error occurs because Row-Level Security (RLS) policies are missing on the `documents` table. Here's how to fix it:

### Step-by-Step Instructions

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/uwjmgjqongcrsamprvjr/sql/new
   - Or navigate to your project → **SQL Editor** → **New Query**

2. **Copy and paste this SQL** (also available in `rls-policies.sql`):

```sql
-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any exist)
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;

-- Create policies
CREATE POLICY "Users can view own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON public.documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id);
```

3. **Click the "Run" button** (or press `Cmd/Ctrl + Enter`)

4. **Verify success**
   - You should see: **"Success. No rows returned"**
   - This is the expected message for DDL commands

5. **Test the upload**
   - Go back to your app: Documents → Upload Document
   - Try uploading a file again
   - It should now work! 🎉

## Why This Happened

The `documents` table was created, but the RLS policies from the migration file (`database/migrations/20251029000000_add_document_management_tables.sql`) were never applied to your Supabase database.

Without these policies, Supabase blocks all INSERT operations on the table for security reasons, even for authenticated users.

## What These Policies Do

Each policy allows authenticated users to perform specific operations on **their own documents only**:

- **SELECT**: View their uploaded documents
- **INSERT**: Upload new documents
- **UPDATE**: Modify their documents (e.g., change processing status)
- **DELETE**: Remove their documents

The `auth.uid() = user_id` condition ensures users can only access documents they own.

## Alternative: Command Line (for advanced users)

If you prefer using the command line and have `psql` installed, you can run:

```bash
psql [your-database-connection-string] -f rls-policies.sql
```

However, this requires the correct database connection string with proper credentials, which may not be available depending on your Supabase plan.

## Still Having Issues?

If you still see the RLS error after applying these policies:

1. **Check that policies were created**:
   - Go to Dashboard → Database → Policies
   - Look for the `documents` table
   - You should see 4 policies listed

2. **Verify you're logged in**:
   - The app requires authentication
   - Make sure you're signed in with a valid user account

3. **Check browser console**:
   - Open DevTools → Console
   - Look for any authentication errors
   - The upload should show your user ID in the logs

4. **Try a different approach**:
   - If policies still don't work, there might be an issue with the `auth.uid()` function
   - Contact me for further debugging

## Next Steps

After fixing this, you might want to:

1. Apply similar RLS policies for related tables:
   - `document_extractions`
   - `transaction_document_matches`
   - `reconciliation_queue`
   - etc.

2. Run the full migration file if you need all document management features:
   - File: `database/supabase/migrations/20251029000000_add_document_management_tables.sql`
   - This creates all tables + policies in one go

---

**Need help?** Let me know if you encounter any issues after applying these policies.
