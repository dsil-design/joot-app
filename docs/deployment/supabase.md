# Supabase Deployment Guide

This guide covers setting up and deploying the Supabase database for the Joot application.

## Prerequisites

1. **Supabase Account**: Create an account at [supabase.com](https://supabase.com)
2. **Supabase CLI**: Install the CLI tool for local development
3. **Environment Variables**: Have your database credentials ready

## Initial Setup

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: joot-app
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Wait for project provisioning (2-3 minutes)

### 2. Get Project Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Project Reference ID**: Used for CI/CD (e.g., `uwjmgjqongcrsamprvjr`)
   - **anon/public key**: For client-side access
   - **service_role key**: For server-side operations (keep secret)

### 3. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Configure **Site URL**:
   - Development: `http://localhost:3000`
   - Production: `https://your-app.vercel.app`
3. Add redirect URLs as needed
4. Configure email templates if using email auth

## Database Schema Deployment

### Method 1: Manual Deployment (Recommended for Initial Setup)

1. Go to **SQL Editor** in your Supabase dashboard
2. Create a new query
3. Copy the contents of `database/schema.sql`
4. Execute the query
5. Verify all tables, policies, and triggers are created

### Method 2: CLI Deployment

```bash
# Link your project
supabase init
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### Method 3: Automated Deployment (CI/CD)

See [CI/CD Documentation](ci.md) for GitHub Actions setup.

## Migration Management

### Database Migrations Location

Database migrations are stored in: `/database/migrations/`

### Naming Convention

Migration files follow the pattern: `YYYYMMDD_HHMMSS_description.sql`

Example: `20250819100000_add_currency_configuration.sql`

### Applying New Migrations

For new migration files:

```bash
# Using Supabase CLI
supabase db push

# Or apply manually in SQL Editor
# Copy and paste migration content
```

### Migration History

Current migrations:
- `20250819100000_add_currency_configuration.sql` - Adds currency tracking configuration
- `20250819134041_drop_legacy_vendor_payment_columns.sql` - Removes legacy TEXT columns

## Automated Deployment Setup

The project uses GitHub Actions to automatically deploy migrations when changes are pushed to the main branch.

### Required GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

#### 1. SUPABASE_ACCESS_TOKEN
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Click on your profile (top right) → Account Settings
- Go to "Access Tokens" tab
- Click "Generate new token"
- Copy the token and add as `SUPABASE_ACCESS_TOKEN`

#### 2. SUPABASE_PROJECT_REF
- Go to your Supabase Project Settings → General
- Copy the "Reference ID"
- Add as `SUPABASE_PROJECT_REF`

#### 3. SUPABASE_DB_PASSWORD
- Go to your Supabase Database Settings
- Copy your database password (or reset if needed)
- Add as `SUPABASE_DB_PASSWORD`

### How Automated Deployment Works

The workflow (`deploy-supabase.yml`) automatically runs when:
- You push changes to the `main` branch
- Changes include files in `database/migrations/`, `database/schema.sql`, or seed files
- You can trigger it manually from GitHub Actions tab

## Database Schema Overview

### Core Tables

- **users**: Extended user profiles linked to Supabase auth.users
- **transactions**: Core transaction data with dual currency support
- **vendors**: User-specific vendor list
- **payment_methods**: User-specific payment method list
- **exchange_rates**: Historical exchange rate data
- **currency_configuration**: Dynamic currency tracking configuration

### Security Model

- **Row Level Security (RLS)** enabled on all tables
- User data isolation through RLS policies
- Authenticated users can only access their own data
- Exchange rates are read-only for all authenticated users

### Foreign Key Relationships

- `transactions.vendor_id` → `vendors.id` (nullable)
- `transactions.payment_method_id` → `payment_methods.id` (nullable)
- All tables have `user_id` → `users.id` for data isolation

## Testing Database Connection

Use the built-in validation script:

```bash
npm run test:supabase
```

This will verify:
- Database connectivity
- Schema integrity
- RLS policies functionality
- Sample data operations

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check if your IP is allowed in Supabase network restrictions
   - Verify project credentials are correct

2. **RLS Policy Errors**
   - Ensure user is properly authenticated
   - Check RLS policies allow the operation for the user

3. **Migration Failures**
   - Check for syntax errors in migration files
   - Verify foreign key constraints
   - Ensure proper order of operations

### Debug Commands

```sql
-- Check migration status
SELECT * FROM supabase_migrations.schema_migrations;

-- Verify table structure
\d transactions

-- Test RLS policies
SET ROLE authenticated;
SELECT * FROM transactions LIMIT 1;
```

### Manual Recovery

If automated deployment fails:

```bash
# Reset local state
supabase db reset

# Apply migrations manually
supabase db push --include-all
```

## Environment Variables

Required environment variables for your application:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Server-side only
```

## Production Checklist

Before going live:

- [ ] Supabase project created and configured
- [ ] Database schema applied successfully
- [ ] All migrations run without errors
- [ ] Environment variables configured in production
- [ ] Authentication flow tested
- [ ] RLS policies verified
- [ ] Backup strategy implemented
- [ ] Monitoring and alerts set up

## Support

For issues:
1. Check Supabase dashboard logs
2. Review GitHub Actions deployment logs
3. Test database connection locally
4. Verify environment variables
5. Check RLS policy configuration
