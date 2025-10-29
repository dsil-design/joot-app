# Storage Policy Setup Guide

## Quick Summary

Storage bucket policies in Supabase **cannot** be created via SQL. They must be configured through the Supabase Dashboard UI. This guide walks you through setting up the 12 required policies.

---

## Step 1: Apply Helper Functions (SQL) ✓

First, apply the helper functions via SQL Editor:

1. Go to: https://supabase.com/dashboard
2. Select project: **uwjmgjqongcrsamprvjr**
3. Navigate to: **SQL Editor** → **New Query**
4. Copy/paste: `database/migrations/20251029000001_add_storage_helpers.sql`
5. Click **Run**
6. You should see: "Success. No rows returned" plus 3 NOTICE messages showing example paths

---

## Step 2: Configure Storage Policies (Dashboard UI)

### Access Storage Policies

1. In Supabase Dashboard, go to: **Storage** (left sidebar)
2. Click on the bucket name (e.g., "documents")
3. Click the **Policies** tab
4. Click **New Policy**

---

## Bucket 1: `documents` (Private)

Create **4 policies** for the `documents` bucket:

### Policy 1: Upload (INSERT)
- **Name:** `Users can upload own documents`
- **Allowed operation:** `INSERT`
- **Policy definition:**
  ```sql
  ((storage.foldername(name))[1] = (auth.uid())::text)
  ```
- **Target roles:** `authenticated`

### Policy 2: View (SELECT)
- **Name:** `Users can view own documents`
- **Allowed operation:** `SELECT`
- **Policy definition:**
  ```sql
  ((storage.foldername(name))[1] = (auth.uid())::text)
  ```
- **Target roles:** `authenticated`

### Policy 3: Update (UPDATE)
- **Name:** `Users can update own documents`
- **Allowed operation:** `UPDATE`
- **Policy definition:**
  ```sql
  ((storage.foldername(name))[1] = (auth.uid())::text)
  ```
- **Target roles:** `authenticated`

### Policy 4: Delete (DELETE)
- **Name:** `Users can delete own documents`
- **Allowed operation:** `DELETE`
- **Policy definition:**
  ```sql
  ((storage.foldername(name))[1] = (auth.uid())::text)
  ```
- **Target roles:** `authenticated`

---

## Bucket 2: `thumbnails` (Public Read)

Create **4 policies** for the `thumbnails` bucket:

### Policy 1: View (SELECT)
- **Name:** `Anyone can view thumbnails`
- **Allowed operation:** `SELECT`
- **Policy definition:**
  ```sql
  true
  ```
- **Target roles:** `public` (select both `public` and `authenticated`)

### Policy 2: Upload (INSERT)
- **Name:** `Users can upload own thumbnails`
- **Allowed operation:** `INSERT`
- **Policy definition:**
  ```sql
  ((storage.foldername(name))[1] = (auth.uid())::text)
  ```
- **Target roles:** `authenticated`

### Policy 3: Update (UPDATE)
- **Name:** `Users can update own thumbnails`
- **Allowed operation:** `UPDATE`
- **Policy definition:**
  ```sql
  ((storage.foldername(name))[1] = (auth.uid())::text)
  ```
- **Target roles:** `authenticated`

### Policy 4: Delete (DELETE)
- **Name:** `Users can delete own thumbnails`
- **Allowed operation:** `DELETE`
- **Policy definition:**
  ```sql
  ((storage.foldername(name))[1] = (auth.uid())::text)
  ```
- **Target roles:** `authenticated`

---

## Bucket 3: `vendor-logos` (Public Read/Write)

Create **3 policies** for the `vendor-logos` bucket:

### Policy 1: View (SELECT)
- **Name:** `Anyone can view vendor logos`
- **Allowed operation:** `SELECT`
- **Policy definition:**
  ```sql
  true
  ```
- **Target roles:** `public` (select both `public` and `authenticated`)

### Policy 2: Upload (INSERT)
- **Name:** `Users can upload vendor logos`
- **Allowed operation:** `INSERT`
- **Policy definition:**
  ```sql
  true
  ```
- **Target roles:** `authenticated`

### Policy 3: Update (UPDATE)
- **Name:** `Users can update vendor logos`
- **Allowed operation:** `UPDATE`
- **Policy definition:**
  ```sql
  true
  ```
- **Target roles:** `authenticated`

---

## Policy Definition Explanation

### User-specific paths: `(storage.foldername(name))[1] = (auth.uid())::text`
- This ensures files are organized as: `{user_id}/{filename}`
- Users can only access files in their own folder
- Example: User `abc-123` can only access `abc-123/document.pdf`

### Public access: `true`
- Allows anyone (authenticated or not) to access
- Used for thumbnails and vendor logos which are meant to be public

---

## Verification

After creating all policies, verify by running this query in SQL Editor:

```sql
-- Check storage policies
SELECT
  bucket_id,
  name,
  definition,
  allowed_operation
FROM storage.policies
WHERE bucket_id IN ('documents', 'thumbnails', 'vendor-logos')
ORDER BY bucket_id, allowed_operation, name;
```

You should see **11 policies total**:
- **documents:** 4 policies (INSERT, SELECT, UPDATE, DELETE)
- **thumbnails:** 4 policies (INSERT, SELECT, UPDATE, DELETE)
- **vendor-logos:** 3 policies (INSERT, SELECT, UPDATE)

---

## Quick Setup Checklist

- [ ] Apply helper functions SQL (Step 1)
- [ ] Create 4 policies for `documents` bucket
- [ ] Create 4 policies for `thumbnails` bucket
- [ ] Create 3 policies for `vendor-logos` bucket
- [ ] Verify 11 policies exist in database
- [ ] Test upload/download (optional, can do in Week 1 Day 3)

**Estimated time:** 15-20 minutes

---

## Alternative: Use Supabase CLI (Advanced)

If you have Supabase CLI configured, you can also create policies via the CLI:

```bash
# This requires local Supabase setup with supabase/config.toml
supabase storage update --bucket documents --policy '...'
```

However, **Dashboard UI is recommended** as it's more straightforward for one-time setup.

---

## What Happens If Policies Aren't Set?

- Storage buckets will **reject all operations** by default
- Uploads will fail with "Permission denied" errors
- Downloads will return 403 Forbidden
- The app will be unable to store documents

**Policies must be set before Week 1 Day 3 (Upload UI).**

---

## Need Help?

If you encounter any issues:
1. Check that buckets exist: Storage → Buckets (should see all 3)
2. Check that RLS is enabled on buckets
3. Verify policy definitions match exactly (especially quotes and parentheses)
4. Test with a simple upload via Supabase Dashboard file uploader

---

**Once policies are set, you're ready to proceed with Week 1 Days 3-4: Upload UI!** 🚀
