# Supabase Backend Setup Guide

This guide will help you set up the Supabase backend infrastructure for the Joot transaction tracker app.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier is sufficient)
- Basic knowledge of SQL and TypeScript

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `joot-app` (or your preferred name)
   - **Database Password**: Generate a strong password (save it securely)
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be provisioned (usually 2-3 minutes)

## 2. Get Project Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project-id.supabase.co`)
   - **Project API Keys**:
     - `anon` `public` key (for client-side operations)
     - `service_role` `secret` key (for server-side operations)

## 3. Configure Environment Variables

Update your `.env.local` file with your actual Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important**: 
- Replace the placeholder values with your actual credentials
- Never commit the service role key to version control
- The `NEXT_PUBLIC_` prefix makes the URL and anon key available to client-side code

## 4. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Create a new query
3. Copy and paste the contents of `supabase/schema.sql`
4. Click "Run" to execute the schema

This will create:
- **Tables**: `users`, `transactions`, `transaction_categories`, `exchange_rates`
- **Row Level Security (RLS)** policies for multi-user isolation
- **Triggers** for automatic timestamp updates and user profile creation
- **Default categories** for new users
- **Sample exchange rates**

## 5. Enable Authentication

1. Go to **Authentication** → **Settings**
2. Configure the following:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback`
3. Enable **Email** provider (enabled by default)
4. Optionally configure other providers (Google, GitHub, etc.)

## 6. Verify Database Setup

1. Go to **Table Editor** in your Supabase dashboard
2. Verify the following tables exist:
   - `users`
   - `transactions` 
   - `transaction_categories`
   - `exchange_rates`
3. Check that RLS is enabled on all tables (you'll see a shield icon)

## 7. Test the Connection

Run the development server to test the connection:

```bash
npm run dev
```

The middleware will handle authentication routing, and you should be able to:
- Access the login page at `http://localhost:3000/login`
- Create a new account
- Be redirected to the dashboard after login

## 8. Database Schema Overview

### Users Table
- Extends Supabase auth.users with additional profile information
- Stores preferred currency and profile details
- Automatically created when a user signs up

### Transactions Table
- Core transaction data with dual currency support (USD/THB)
- Links to categories and users
- Stores both original and converted amounts with exchange rates

### Transaction Categories Table
- User-specific categories with colors and icons
- Default categories created automatically for new users
- Supports custom categories

### Exchange Rates Table
- Historical exchange rate data
- Used for accurate currency conversion
- Shared across all users (read-only)

## 9. Row Level Security (RLS)

All tables have RLS enabled with the following policies:

- **Users**: Can only view/edit their own profile
- **Transactions**: Can only access their own transactions
- **Categories**: Can only access their own categories
- **Exchange Rates**: Read-only access for all authenticated users

## 10. TypeScript Integration

The project includes:
- **Type definitions** in `src/lib/supabase/types.ts`
- **Client configuration** in `src/lib/supabase/client.ts`
- **Server configuration** in `src/lib/supabase/server.ts`
- **Auth utilities** in `src/lib/supabase/auth.ts`
- **Database utilities** in `src/lib/supabase/database.ts`

## 11. Development Workflow

### Adding New Features

1. **Database Changes**: Update `supabase/schema.sql` and run in SQL Editor
2. **Type Updates**: Update `src/lib/supabase/types.ts` to match schema changes
3. **Utilities**: Add new functions to `database.ts` or `auth.ts` as needed

### Testing

- Use the Supabase dashboard to inspect data and test queries
- Check RLS policies by switching between different user accounts
- Monitor real-time subscriptions in the dashboard

## 12. Production Deployment

When deploying to production:

1. **Environment Variables**: Update production environment with production Supabase credentials
2. **Site URL**: Update authentication settings with production domain
3. **Database**: Consider setting up database backups
4. **Monitoring**: Enable logging and monitoring in Supabase dashboard

## 13. Troubleshooting

### Common Issues

**Connection Errors**:
- Verify environment variables are set correctly
- Check that Supabase project is active
- Ensure API keys are not expired

**Authentication Issues**:
- Check Site URL and redirect URLs in auth settings
- Verify middleware configuration
- Check browser console for auth errors

**RLS Policy Issues**:
- Test policies in SQL Editor with different user contexts
- Ensure policies match your application logic
- Check for missing or overly restrictive policies

**TypeScript Errors**:
- Regenerate types if database schema changes
- Ensure all imports are correct
- Check for version compatibility issues

### Getting Help

- **Supabase Documentation**: [docs.supabase.com](https://docs.supabase.com)
- **Community**: [github.com/supabase/supabase/discussions](https://github.com/supabase/supabase/discussions)
- **Discord**: [discord.supabase.com](https://discord.supabase.com)

## 14. Next Steps

After completing this setup:

1. **Test Authentication**: Create test accounts and verify login/logout
2. **Test Transactions**: Create, read, update, delete transactions
3. **Test Categories**: Manage transaction categories
4. **Currency Conversion**: Test USD/THB conversion functionality
5. **Build UI Components**: Integrate with existing shadCN components

Your Supabase backend is now ready for the Joot transaction tracker app!
