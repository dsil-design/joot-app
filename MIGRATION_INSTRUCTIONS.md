# Database Migration Instructions

## Issue
The transaction form is failing because the database is missing required columns that the application code expects.

## What's Missing
- `title` column in the `transactions` table
- `vendor` TEXT column in the `transactions` table  
- `payment_method_id` UUID FK column in the `transactions` table

## Solution
Run the migration script in your Supabase SQL Editor to fix the schema and populate test data.

## Steps

### 1. Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: `uwjmgjqongcrsamprvjr`
3. Click on "SQL Editor" in the left sidebar

### 2. Run the Migration
1. Copy the entire contents of `supabase/migrations/20250115_complete_fk_migration.sql`
2. Paste it into a new query in the SQL Editor
3. Click "RUN" to execute the migration

### 3. Verify the Migration
After running the migration, you should see output like:
```
NOTICE: Migration completed successfully:
NOTICE:   Users: 1
NOTICE:   Vendors: 10
NOTICE:   Payment Methods: 5  
NOTICE:   Transactions: 5
```

### 4. Test the Application
1. Restart your Next.js dev server: `npm run dev`
2. Navigate to the Add Transaction page
3. The vendor and payment method dropdowns should now be populated
4. Try creating a new transaction - it should work without errors

## What the Migration Does

1. **Adds missing columns** to the `transactions` table
2. **Creates default vendors and payment methods** for each user
3. **Adds proper indexes** for performance
4. **Creates sample transactions** for testing (only if none exist)
5. **Reports the final status** of all tables

## Rollback Plan
This migration is non-destructive and only adds columns/data. If you need to rollback:
1. The original `payment_method` column remains intact
2. The `vendor_id` column was already there
3. No data is deleted or modified (except adding `title` where missing)

## Expected Result
After this migration:
- ✅ Add Transaction form will work properly
- ✅ Vendor dropdown will show user-specific vendors
- ✅ Payment method dropdown will show user-specific payment methods
- ✅ New transactions will be saved with proper FK relationships
- ✅ Transaction list will display vendor and payment method names correctly
