# Database Migration Guide

This guide covers database migrations and schema changes for the Joot application, including the vendors and payment methods foreign key relationship migration.

## Overview

The Joot application has evolved from using TEXT-based fields to proper foreign key relationships for vendors and payment methods. This migration ensures data integrity, user isolation, and better performance.

## Migration History

### Completed Migrations

1. **Initial Schema** - Basic transaction tracking structure
2. **Enhanced Exchange Rates** - Improved currency tracking
3. **Vendor and Payment Method Tables** - Added dedicated tables for vendors and payment methods
4. **Foreign Key Migration** - Migrated from TEXT fields to FK relationships
5. **Currency Configuration** - Added dynamic currency tracking

### Current Migration Files

Located in `/database/migrations/`:

- `20250819100000_add_currency_configuration.sql` - Currency tracking configuration
- `20250819134041_drop_legacy_vendor_payment_columns.sql` - Legacy column cleanup

## Migration Process

### Development Workflow

1. **Create Migration File**
   - Use naming convention: `YYYYMMDD_HHMMSS_description.sql`
   - Place in `/database/migrations/`
   - Include rollback instructions in comments

2. **Test Locally**
   ```bash
   supabase db reset
   supabase db push
   ```

3. **Validate Changes**
   ```bash
   supabase db diff
   npm run test:supabase
   ```

4. **Commit Migration**
   - Add migration file to version control
   - Include clear commit message
   - Document changes in pull request

### Production Deployment

#### Automated Deployment (Recommended)

Migrations are automatically applied when:
- Changes pushed to `main` branch
- Files in `database/migrations/` are modified
- GitHub Actions workflow deploys to Supabase

#### Manual Deployment

For urgent fixes or initial setup:

```bash
# Apply specific migration
supabase db push --include-migrations

# Apply all migrations
supabase db push --include-all
```

## Major Migration: Vendors & Payment Methods FK Relationship

This migration transformed the application from TEXT-based fields to proper foreign key relationships.

### Before Migration

- `transactions.vendor` (TEXT)
- `transactions.payment_method` (TEXT)
- No data integrity constraints
- Potential data inconsistency

### After Migration

- `transactions.vendor_id` (UUID → vendors.id)
- `transactions.payment_method_id` (UUID → payment_methods.id)
- Data integrity through foreign keys
- User-specific vendor and payment method isolation

### Migration Phases

#### Phase 1: Database Schema Update ✅ COMPLETED

**Applied:** `20250115_complete_fk_migration.sql`

**Changes Made:**
- Added `payment_method_id` UUID column with FK to `payment_methods.id`
- Migrated existing TEXT-based payment method data to FK references
- Created missing payment methods for users as needed
- Preserved all existing data
- Maintained backward compatibility

#### Phase 2: Code Deployment ✅ COMPLETED

**New Features Added:**
- `usePaymentMethods` hook for CRUD operations
- Updated `useTransactions` hook for FK relationships
- Enhanced UI components for dropdown selections
- Backward compatibility maintained during transition

#### Phase 3: Legacy Cleanup (Optional)

**Migration:** `20250819134041_drop_legacy_vendor_payment_columns.sql`

⚠️ **DESTRUCTIVE OPERATION** - Only apply after thorough testing

**What it does:**
```sql
-- Removes legacy TEXT columns
ALTER TABLE public.transactions 
DROP COLUMN IF EXISTS vendor,
DROP COLUMN IF EXISTS payment_method;
```

**When to apply:**
- After verifying FK system works correctly in production
- After at least 1 week of successful operation
- With proper backup strategy in place

## Migration Best Practices

### 1. Migration File Structure

```sql
-- Migration: Description of Changes
-- Date: YYYY-MM-DD
-- Author: Developer Name

-- Step 1: Add new structures
-- Step 2: Migrate existing data  
-- Step 3: Add constraints
-- Step 4: Update indexes

-- Rollback instructions:
-- [Describe how to undo changes]
```

### 2. Data Safety

- **Always backup before migrations**
- **Test on staging first**
- **Validate data integrity after migration**
- **Keep rollback plan ready**

### 3. Zero-Downtime Migrations

- Add new columns as nullable initially
- Populate new columns with existing data
- Update application code to use new columns
- Remove old columns in separate migration

### 4. Foreign Key Best Practices

- Use `ON DELETE SET NULL` for optional relationships
- Use `ON DELETE CASCADE` only when appropriate
- Add proper indexes for FK columns
- Validate referential integrity

## Rollback Procedures

### Automated Rollback

GitHub Actions include rollback workflows:

```bash
# Trigger rollback workflow
gh workflow run rollback.yml
```

### Manual Rollback

For emergency situations:

1. **Application Rollback**
   ```bash
   # Revert to previous deployment
   vercel rollback --production
   ```

2. **Database Rollback**
   ```bash
   # Restore from backup
   supabase db reset --linked
   # Apply migrations up to specific point
   ```

### Rollback Strategy by Migration Type

#### Schema Changes
- Keep old columns during transition
- Use feature flags to switch behavior
- Remove old columns in separate migration

#### Data Migrations
- Maintain backup of original data
- Use reversible transformation functions
- Test rollback procedure before applying

#### FK Constraints
- Add constraints as separate step
- Test with existing data first
- Keep backup plan for constraint removal

## Testing Migrations

### Pre-Migration Testing

```bash
# Create test database
supabase db reset --linked

# Apply migration
supabase db push

# Run validation tests
npm run test:supabase

# Test application functionality
npm run dev
```

### Post-Migration Validation

1. **Data Integrity**
   - Verify all existing data preserved
   - Check FK relationships work correctly
   - Validate user data isolation

2. **Application Functionality**
   - Test transaction creation
   - Verify vendor/payment method dropdowns
   - Check user-specific data access

3. **Performance Testing**
   - Monitor query performance
   - Verify indexes are effective
   - Check for N+1 query problems

## Common Migration Patterns

### Adding New Table

```sql
-- 1. Create table
CREATE TABLE new_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add indexes
CREATE INDEX idx_new_table_user_id ON new_table(user_id);

-- 3. Add RLS policies
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own data" ON new_table
  FOR ALL USING (auth.uid() = user_id);
```

### Adding Foreign Key

```sql
-- 1. Add nullable FK column
ALTER TABLE existing_table 
ADD COLUMN new_fk_id UUID;

-- 2. Populate FK data
UPDATE existing_table 
SET new_fk_id = (
  SELECT id FROM reference_table 
  WHERE reference_table.name = existing_table.old_text_field
  AND reference_table.user_id = existing_table.user_id
);

-- 3. Add FK constraint
ALTER TABLE existing_table 
ADD CONSTRAINT fk_new_constraint 
FOREIGN KEY (new_fk_id) REFERENCES reference_table(id) 
ON DELETE SET NULL;

-- 4. Add index
CREATE INDEX idx_existing_table_new_fk_id ON existing_table(new_fk_id);
```

## Troubleshooting

### Migration Failures

1. **Check syntax errors**
   ```bash
   supabase db lint
   ```

2. **Verify dependencies**
   - Ensure referenced tables exist
   - Check column data types match
   - Validate constraint logic

3. **Check permissions**
   - Verify RLS policies
   - Test with authenticated user
   - Check service role permissions

### Data Migration Issues

1. **Inconsistent data**
   - Clean up data before migration
   - Handle edge cases in migration script
   - Validate data after migration

2. **Performance issues**
   - Break large migrations into smaller batches
   - Add appropriate indexes
   - Monitor migration progress

### Application Integration

1. **Code synchronization**
   - Deploy database changes first
   - Update application code to use new schema
   - Remove deprecated code in separate deployment

2. **API compatibility**
   - Maintain API contract during transition
   - Use feature flags for new functionality
   - Deprecate old endpoints gracefully

## Monitoring and Maintenance

### Migration Monitoring

- Track migration execution time
- Monitor database performance after migrations
- Set up alerts for migration failures
- Review migration logs regularly

### Regular Maintenance

- Clean up old migration backups
- Review and optimize database indexes
- Update documentation for schema changes
- Plan for future migrations

## Support

For migration-related issues:

1. Check migration logs in GitHub Actions
2. Review database logs in Supabase dashboard
3. Test migration locally with sample data
4. Contact team for complex migration scenarios
5. Consider rollback if critical issues arise
