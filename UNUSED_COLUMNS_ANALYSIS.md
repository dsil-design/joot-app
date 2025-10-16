# Database Cleanup: Unused Columns Analysis

**Date:** October 16, 2025
**Analysis:** Database columns that can be safely removed

---

## Executive Summary

After analyzing the database schema and codebase, **3 columns were identified as unused** and can be safely removed:

1. ✅ `transactions.exchange_rate` - Deprecated, not used in code
2. ✅ `transactions.title` - Completely unused (0 records have data)
3. ✅ `users.preferred_currency` - Has data but not used in application logic

---

## Detailed Analysis

### 1. transactions.exchange_rate

**Status:** ✅ Can be removed

| Attribute | Value |
|-----------|-------|
| Exists in schema.sql | ✅ Yes (line 37, marked DEPRECATED) |
| Exists in types.ts | ✅ Yes |
| Records with data | ⚠️ 63 out of 66 transactions |
| Used in codebase | ❌ NO |
| Safe to remove | ✅ YES |

**Details:**
- This column was part of the old implementation where exchange rates were stored per transaction
- Now marked as `DEPRECATED: Exchange rate is now fetched from exchange_rates table`
- The application currently fetches exchange rates dynamically using the `get_exchange_rate_with_fallback` function
- No code references `transaction.exchange_rate` anywhere in the src/ directory
- Even though data exists, it's not being used

**Migration Impact:** None - column is already deprecated and unused

---

### 2. transactions.title

**Status:** ✅ Can be removed

| Attribute | Value |
|-----------|-------|
| Exists in schema.sql | ❌ No (added manually at some point) |
| Exists in types.ts | ✅ Yes |
| Records with data | ❌ 0 out of 66 transactions |
| Used in codebase | ❌ NO (only unrelated notification/docs code uses `.title`) |
| Safe to remove | ✅ YES |

**Details:**
- Not in the main schema.sql file - was likely added manually to database at some point
- Complete ghost column: 0 records have any value
- Searched for `transaction.title` - no references found in transaction-related code
- The only `.title` references are in notification service and docs components (unrelated)

**Migration Impact:** None - column is completely unused

---

### 3. users.preferred_currency

**Status:** ✅ Can be removed

| Attribute | Value |
|-----------|-------|
| Exists in schema.sql | ✅ Yes (line 24) |
| Exists in types.ts | ✅ Yes |
| Records with data | ⚠️ All 3 users have values |
| Used in codebase | ❌ NO |
| Safe to remove | ✅ YES |

**Details:**
- Defined in schema with default value of 'USD'
- All 3 users in the database have values
- BUT: No application logic uses this column
- Only exists in type definitions, never accessed in code
- Searched for `preferred_currency` - only found in types.ts and schema.sql

**Migration Impact:** Low - data exists but is not used, so removal won't affect functionality

---

## Migration Steps

### 1. Review the Migration SQL

```bash
cat database/migration-remove-unused-columns.sql
```

### 2. Run in Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Paste the contents of `database/migration-remove-unused-columns.sql`
3. Execute the migration

### 3. Update TypeScript Types

After running the migration, update the types:

```bash
# The types.ts file will need to be updated to remove:
# - transactions.exchange_rate
# - transactions.title
# - users.preferred_currency
```

This can be done by regenerating types from Supabase:
```bash
npx supabase gen types typescript --project-id uwjmgjqongcrsamprvjr > src/lib/supabase/types.ts
```

### 4. Verify Changes

Run the verification script:
```bash
npx tsx scripts/verify-column-removal.ts
```

### 5. Run Tests

```bash
npm run test:unit
npm run build
```

---

## Cleanup Benefits

- **Simplified schema** - Removes deprecated and unused columns
- **Better type safety** - Types will match actual database structure
- **Reduced confusion** - Developers won't see unused columns in types
- **Data consistency** - No more ghost columns in the database

---

## Files to Update After Migration

1. ✅ `src/lib/supabase/types.ts` - Regenerate from Supabase
2. ✅ `database/schema.sql` - Remove the columns from schema definition
3. ✅ Test files - Ensure mocks don't reference removed columns

---

## Migration File

📄 **File:** `database/migration-remove-unused-columns.sql`

This migration will:
- Drop `transactions.exchange_rate` column
- Drop `transactions.title` column
- Drop `users.preferred_currency` column

All operations use `IF EXISTS` to be idempotent and safe to run multiple times.
