# Email Receipt Processing System - Migration Guide

**Migration File:** `20251106000000_add_email_receipt_system.sql`
**Created:** 2025-11-06
**Status:** Ready for Deployment

---

## Overview

This migration adds comprehensive support for email receipt processing in Joot, including:
- **4 new tables** for IMAP email integration, receipt detection, AI extraction, and transaction matching
- **26 indexes** for optimal query performance
- **13 RLS policies** for user data isolation
- **2 helper functions** for statistics and reconciliation queues
- **3 triggers** for automatic timestamp updates
- **Encrypted credential storage** using AES-256-GCM

---

## What This Migration Creates

### Tables

1. **email_accounts** - Stores connected email accounts with encrypted IMAP credentials
   - UUID primary key
   - Encrypted password storage (AES-256-GCM)
   - Connection status tracking
   - Sync statistics
   - 3 indexes

2. **email_messages** - Stores indexed emails with processing status and extracted data
   - UUID primary key
   - Email deduplication via SHA-256 hash
   - AI extraction fields (vendor, amount, date)
   - Transaction matching fields
   - Full-text search support
   - 14 indexes (including GIN indexes for full-text search)

3. **email_sync_jobs** - Tracks background sync jobs with granular progress
   - UUID primary key
   - Progress tracking (current/total/percentage)
   - Job statistics (indexed, skipped, detected)
   - Error handling with retry support
   - 5 indexes

4. **email_actions_log** - Audit trail for user actions (append-only)
   - UUID primary key
   - Action type tracking
   - JSONB action data
   - IP address and user agent logging
   - 4 indexes

### Indexes (26 total)

**Performance optimizations:**
- User-scoped indexes for RLS efficiency
- Partial indexes for common WHERE clauses
- GIN indexes for full-text search
- Composite indexes for query patterns
- DESC indexes for time-based ordering

### RLS Policies (13 total)

**Security guarantees:**
- Users can only access their own data
- All tables have SELECT, INSERT policies
- Most tables have UPDATE, DELETE policies
- `email_actions_log` is append-only (no UPDATE/DELETE)
- All policies use `auth.uid() = user_id` pattern

### Helper Functions (2)

1. **get_email_receipt_stats(user_id UUID)**
   - Returns comprehensive statistics for dashboard
   - Includes counts, averages, and last sync date
   - Uses SECURITY DEFINER for consistent behavior

2. **get_email_reconciliation_queue(user_id UUID, limit INT)**
   - Returns emails needing reconciliation review
   - Ordered by match confidence (highest first)
   - Only returns completed, matched receipts
   - Uses SECURITY DEFINER for consistent behavior

### Triggers (3)

- `update_email_accounts_updated_at`
- `update_email_messages_updated_at`
- `update_email_sync_jobs_updated_at`

All use the existing `update_updated_at_column()` function.

---

## How to Apply This Migration

### Option 1: Local Development (Docker)

```bash
# Make sure Docker Desktop is running
npx supabase db reset

# Verify migration applied
npx supabase db diff
```

### Option 2: Remote Supabase Project

```bash
# Apply to remote database
npx supabase db push

# Or use the Supabase Dashboard:
# 1. Go to Database > Migrations
# 2. Upload 20251106000000_add_email_receipt_system.sql
# 3. Run migration
```

### Option 3: Direct SQL Execution

```bash
# Connect to your database
psql "postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres"

# Run the migration
\i database/migrations/20251106000000_add_email_receipt_system.sql
```

---

## Testing the Migration

### 1. Validate SQL Syntax

```bash
./scripts/validate-email-migration.sh
```

This checks for:
- All 4 tables
- All 26 indexes
- All 13 RLS policies
- All 2 helper functions
- All 3 triggers
- Encryption fields
- Constraints (UNIQUE, CHECK, FK)

### 2. Test RLS Policies

```bash
# After applying migration, run RLS tests
psql "postgresql://..." -f scripts/test-email-rls-policies.sql
```

This verifies:
- User A cannot see User B's data
- All CRUD operations respect RLS
- Append-only constraint on email_actions_log
- Unique constraints work correctly
- CHECK constraints work correctly

### 3. Test Helper Functions

```bash
# After applying migration, run helper function tests
psql "postgresql://..." -f scripts/test-email-helper-functions.sql
```

This verifies:
- `get_email_receipt_stats` returns correct statistics
- `get_email_reconciliation_queue` returns correct items
- Functions use SECURITY DEFINER
- Edge cases handled correctly

---

## Verification Checklist

After applying the migration, verify:

- [ ] All 4 tables exist
  ```sql
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename LIKE 'email_%';
  ```

- [ ] RLS is enabled on all tables
  ```sql
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename LIKE 'email_%';
  ```

- [ ] All indexes created
  ```sql
  SELECT tablename, indexname
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename LIKE 'email_%'
  ORDER BY tablename, indexname;
  ```

- [ ] Helper functions exist
  ```sql
  SELECT proname, pronargs
  FROM pg_proc
  WHERE proname LIKE 'get_email_%';
  ```

- [ ] Triggers exist
  ```sql
  SELECT tgname, tgrelid::regclass
  FROM pg_trigger
  WHERE tgname LIKE '%email%'
    AND tgisinternal = false;
  ```

---

## Rollback Plan

If you need to rollback this migration:

```sql
-- Drop in reverse order (respecting foreign keys)

-- Drop triggers
DROP TRIGGER IF EXISTS update_email_accounts_updated_at ON email_accounts;
DROP TRIGGER IF EXISTS update_email_messages_updated_at ON email_messages;
DROP TRIGGER IF EXISTS update_email_sync_jobs_updated_at ON email_sync_jobs;

-- Drop functions
DROP FUNCTION IF EXISTS get_email_receipt_stats(UUID);
DROP FUNCTION IF EXISTS get_email_reconciliation_queue(UUID, INT);

-- Drop tables (CASCADE will drop all dependent objects)
DROP TABLE IF EXISTS email_actions_log CASCADE;
DROP TABLE IF EXISTS email_sync_jobs CASCADE;
DROP TABLE IF EXISTS email_messages CASCADE;
DROP TABLE IF EXISTS email_accounts CASCADE;
```

---

## Schema Details

### Foreign Key Relationships

```
users (existing)
  ↓ 1:N
email_accounts
  ↓ 1:N
email_messages
  ↓ 1:1 (optional)
transactions (existing)

email_accounts
  ↓ 1:N
email_sync_jobs

email_messages
  ↓ 1:N
email_actions_log
```

### Cascade Behavior

- **ON DELETE CASCADE:** Deleting user/account deletes all dependent records
- **ON DELETE SET NULL:** Deleting transaction unlinks email (doesn't delete it)

### Unique Constraints

- `email_accounts(user_id, email_address)` - One account per email per user
- `email_messages(email_account_id, message_uid)` - UID unique per account
- `email_messages(email_hash)` - Prevent duplicate emails globally

### Check Constraints

- `detection_score` ∈ [0, 100]
- `extraction_confidence` ∈ [0, 100]
- `match_confidence` ∈ [0, 100]

---

## Performance Considerations

### Expected Query Performance

- **List user's emails:** <50ms for 10,000 emails
- **Get email detail:** <5ms
- **Search emails by subject:** <100ms for 10,000 emails
- **Reconciliation queue:** <50ms

### Index Strategy

- Partial indexes reduce index size
- GIN indexes enable full-text search
- Composite indexes optimize multi-column queries
- User-scoped indexes optimize RLS queries

### Scalability

**Projected growth for 1,000 users over 1 year:**
- email_accounts: ~100KB
- email_messages: ~6GB (with indexes)
- email_sync_jobs: ~1MB
- email_actions_log: ~30MB
- **Total:** ~7GB/year

---

## Security Features

### Credential Encryption

- Passwords encrypted with AES-256-GCM
- Random IV per encryption
- Encryption key stored in environment (never in DB)
- IV stored with ciphertext (safe to store)

### Data Isolation

- RLS policies on all tables
- User can only see their own data
- Denormalized `user_id` for efficient RLS
- Append-only audit log

### Audit Trail

- All user actions logged
- IP address and user agent tracked
- No updates or deletes allowed
- Can trace all changes to email status

---

## Next Steps

After applying this migration:

1. **Create Supabase Storage buckets:**
   - `email-receipts` (private)
   - `email-attachments` (private)

2. **Set up storage policies:**
   - Users can only access their own files
   - See `/docs/EMAIL-RECEIPT-SYSTEM-DATABASE.md` Section 8

3. **Configure environment variables:**
   - `EMAIL_ENCRYPTION_KEY` (32-byte hex string for AES-256)
   - IMAP connection pooling settings

4. **Implement application code:**
   - IMAP sync service
   - Receipt detection algorithm
   - AI extraction service
   - Transaction matching service

See `/docs/EMAIL-RECEIPT-SYSTEM-DAILY-GUIDE.md` for detailed implementation guide.

---

## Questions?

- **Schema design:** See `/docs/EMAIL-RECEIPT-SYSTEM-DATABASE.md`
- **Implementation guide:** See `/docs/EMAIL-RECEIPT-SYSTEM-DAILY-GUIDE.md`
- **Test scripts:** See `/scripts/test-email-*.sql` and `/scripts/validate-email-migration.sh`

---

## Migration Metadata

```sql
-- Tables: 4
-- Indexes: 26
-- RLS Policies: 13
-- Functions: 2
-- Triggers: 3
-- Foreign Keys: 8
-- Unique Constraints: 3
-- Check Constraints: 7
-- GIN Indexes: 2
-- Partial Indexes: 8
-- Lines of SQL: 437
```

**Last Updated:** 2025-11-06
**Status:** ✅ Ready for Production
