# Supabase Automated Deployment Setup

This project uses GitHub Actions to automatically deploy Supabase migrations when changes are pushed to the main branch.

## Required GitHub Secrets

You need to add the following secrets to your GitHub repository:

### 1. SUPABASE_ACCESS_TOKEN
- Go to [Supabase Dashboard](https://supabase.com/dashboard) 
- Click on your profile (top right) → Account Settings
- Go to "Access Tokens" tab
- Click "Generate new token"
- Copy the token and add it as `SUPABASE_ACCESS_TOKEN` in GitHub secrets

### 2. SUPABASE_PROJECT_REF
- Go to your [Supabase Project Settings](https://supabase.com/dashboard/project/uwjmgjqongcrsamprvjr/settings/general)
- Copy the "Reference ID" (appears to be: `uwjmgjqongcrsamprvjr`)
- Add this as `SUPABASE_PROJECT_REF` in GitHub secrets

### 3. SUPABASE_DB_PASSWORD
- Go to your [Supabase Database Settings](https://supabase.com/dashboard/project/uwjmgjqongcrsamprvjr/settings/database)
- Copy your database password (or reset it if needed)
- Add this as `SUPABASE_DB_PASSWORD` in GitHub secrets

## How to Add GitHub Secrets

1. Go to your GitHub repository
2. Click on "Settings" tab
3. In the left sidebar, click "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add each secret with the exact names above

## How the Deployment Works

The workflow (`deploy-supabase.yml`) will automatically run when:
- You push changes to the `main` branch
- The changes include files in `supabase/migrations/`, `supabase/schema.sql`, or `supabase/seed.sql`
- You can also trigger it manually from the GitHub Actions tab

## Manual Deployment

You can still deploy manually if needed:
```bash
npx supabase db push
```

## Troubleshooting

If the deployment fails:
1. Check that all GitHub secrets are set correctly
2. Verify your Supabase access token hasn't expired
3. Ensure your database password is correct
4. Check the GitHub Actions logs for specific error messages