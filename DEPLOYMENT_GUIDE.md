# Vendors & Payment Methods FK Migration - Deployment Guide

This guide covers the deployment of the vendors and payment methods foreign key relationship migration for the Joot application.

## Overview

This migration transforms the application from using TEXT-based vendor and payment method fields to proper foreign key relationships with dedicated `vendors` and `payment_methods` tables. This ensures data integrity, user isolation, and better performance.

## Migration Phases

### Phase 1: Database Schema Update (CRITICAL - Apply First)

**🔴 REQUIRED BEFORE CODE DEPLOYMENT**

Apply the migration `supabase/migrations/20250201_alter_transactions_vendor_payment_fk.sql` in your Supabase SQL Editor:

```sql
-- This migration adds payment_method_id FK column and migrates existing data
-- Run this in Supabase SQL Editor BEFORE deploying the new code
```

**What it does:**
- Adds `payment_method_id` UUID column with FK to `payment_methods.id`
- Migrates existing TEXT-based payment method data to proper FK references
- Creates missing payment methods for users as needed
- Preserves all existing data
- Maintains backward compatibility during deployment

### Phase 2: Code Deployment

Deploy the updated application code. The code includes:

**New Features:**
- `usePaymentMethods` hook for CRUD operations on payment_methods table
- Updated `useTransactions` hook to use FK relationships
- Enhanced `usePaymentMethodOptions` using database instead of localStorage
- Updated transaction UI to work with FK relationships
- Backward compatibility for existing data

**Breaking Changes:**
- None! The code maintains full backward compatibility during the transition.

### Phase 3: Verification (Post-Deployment)

After deploying the code, verify:

1. **Existing Transactions Display Correctly**
   - All existing transactions show proper vendor and payment method names
   - No "Unknown Vendor" or "Unknown Payment" unless legitimately missing

2. **New Transaction Creation Works**
   - Add Transaction page loads vendor and payment method dropdowns
   - Can create new vendors and payment methods from the UI
   - New transactions save properly and display correctly

3. **User Isolation Works**
   - Each user only sees their own vendors and payment methods
   - No cross-user data leakage

### Phase 4: Legacy Column Cleanup (OPTIONAL)

**⚠️ DESTRUCTIVE OPERATION - Only after thorough testing**

After verifying everything works perfectly in production for at least a week, you may optionally apply the cleanup migration:

```sql
-- Apply supabase/migrations/20250202_drop_legacy_vendor_payment_columns.sql
-- This removes the old TEXT columns that are no longer needed
```

**Important:** This step is optional. You can leave the legacy columns indefinitely if preferred.

## Rollback Plan

If issues are discovered:

### During Code Deployment
Simply roll back to the previous code version. The database schema changes are backward compatible.

### After Code Deployment
1. Roll back to previous code version
2. The database migration is non-destructive, so no database rollback needed
3. Legacy TEXT columns remain functional

### If Legacy Columns Were Dropped (Phase 4)
If you applied Phase 4 and need to rollback:
1. This is complex - you'll need to restore from backups
2. Recommend testing Phase 4 thoroughly on staging first

## Testing Checklist

### Pre-Deployment Testing
- [ ] Migration tested on staging database clone
- [ ] Code compiles and passes TypeScript checks
- [ ] Unit tests pass
- [ ] Integration tests pass

### Post-Deployment Verification
- [ ] Existing transactions display correctly
- [ ] New transaction creation works
- [ ] Vendor dropdown populates from database
- [ ] Payment method dropdown populates from database  
- [ ] Can add new vendors from transaction form
- [ ] Can add new payment methods from transaction form
- [ ] User isolation verified (test with multiple accounts)
- [ ] Performance is acceptable
- [ ] Error handling works correctly

## Database Schema Changes

### New Columns Added
```sql
-- Added to transactions table
payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL
```

### New Indexes Created
```sql
CREATE INDEX idx_transactions_payment_method_id ON transactions(payment_method_id);
```

### RLS Policies
All existing RLS policies continue to work. The FK relationships inherit the proper user isolation through the referenced tables.

## Performance Impact

**Expected Improvements:**
- Better query performance with proper indexes
- Reduced data duplication
- Better data integrity

**Monitoring Points:**
- Transaction list loading times
- Add transaction form loading times  
- Database query performance

## Support & Troubleshooting

### Common Issues

1. **"Unknown Payment" showing for existing transactions**
   - Check if payment method names in old data match names in payment_methods table
   - Migration should handle this automatically, but manual data cleanup may be needed

2. **Dropdown not loading**
   - Check network tab for API errors
   - Verify Supabase connection and RLS policies

3. **Can't create new vendors/payment methods**
   - Check user authentication status
   - Verify RLS policies allow INSERT for authenticated users

### Debug Commands

Check migration status:
```sql
-- Verify payment_method_id column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' AND column_name = 'payment_method_id';

-- Check data migration
SELECT 
  COUNT(*) as total_transactions,
  COUNT(payment_method_id) as migrated_to_fk,
  COUNT(payment_method) as legacy_text_field
FROM transactions;
```

## Timeline Recommendations

- **Phase 1 (DB Migration)**: Apply immediately during maintenance window
- **Phase 2 (Code Deploy)**: Deploy within 24 hours of Phase 1
- **Phase 3 (Verification)**: Monitor for 1-2 weeks
- **Phase 4 (Cleanup)**: Optional, apply after thorough verification

## Contact

For issues with this migration, contact the development team or create an issue in the repository.
