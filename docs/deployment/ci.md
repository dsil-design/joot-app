# CI/CD Documentation

This document outlines the continuous integration and deployment setup for the Joot application using GitHub Actions.

## Overview

The project uses GitHub Actions for automated testing, deployment, and database migrations. The CI/CD pipeline ensures code quality and automates deployment to both Supabase and Vercel.

## Workflows

### 1. CICD Pipeline (`.github/workflows/cicd.yml`)

Main CI/CD pipeline that runs on every push and pull request.

**Triggers:**
- Push to any branch
- Pull requests to main branch

**Jobs:**
- **Test**: Runs unit tests, integration tests, and linting
- **Build**: Builds the Next.js application
- **Type Check**: Validates TypeScript compilation

**Steps:**
1. Checkout code
2. Setup Node.js environment
3. Install dependencies
4. Run linting (`npm run lint`)
5. Run all tests (`npm run test:all`)
6. Build application (`npm run build`)

### 2. Supabase Deployment (`.github/workflows/deploy-supabase.yml`)

Automatically deploys database migrations to Supabase.

**Triggers:**
- Push to `main` branch
- Changes in paths:
  - `database/migrations/**`
  - `database/schema.sql`
  - `database/seed.sql`
- Manual trigger from GitHub Actions UI

**Required Secrets:**
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF` 
- `SUPABASE_DB_PASSWORD`

**Steps:**
1. Checkout code
2. Setup Supabase CLI
3. Link to project using credentials
4. Push database changes (`supabase db push`)

### 3. Claude Code Review (`.github/workflows/claude-code-review.yml`)

Automated code review using Claude AI for pull requests.

**Triggers:**
- Pull requests opened or updated

**Features:**
- Automated code review comments
- Suggestions for improvements
- Code quality analysis

### 4. Rollback Workflow (`.github/workflows/rollback.yml`)

Emergency rollback capabilities for database and application deployments.

**Triggers:**
- Manual trigger only

**Capabilities:**
- Database rollback to previous migration
- Application deployment rollback
- Coordination between services

## Environment Variables and Secrets

### Repository Secrets

Configure these secrets in your GitHub repository settings:

#### Database Secrets
- `SUPABASE_ACCESS_TOKEN`: Personal access token from Supabase
- `SUPABASE_PROJECT_REF`: Project reference ID
- `SUPABASE_DB_PASSWORD`: Database password

#### Optional Secrets
- `VERCEL_TOKEN`: For Vercel deployments (if not using Vercel GitHub integration)

### Environment Variables

Environment variables for different environments:

#### Development
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
```

#### Staging/Production
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

## Setting Up GitHub Secrets

### 1. Supabase Access Token

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click your profile → Account Settings
3. Navigate to "Access Tokens" tab
4. Click "Generate new token"
5. Add as `SUPABASE_ACCESS_TOKEN` in GitHub secrets

### 2. Project Reference ID

1. Go to your Supabase project settings
2. Copy the "Reference ID" from General settings
3. Add as `SUPABASE_PROJECT_REF` in GitHub secrets

### 3. Database Password

1. Go to Supabase Database settings
2. Copy or reset your database password
3. Add as `SUPABASE_DB_PASSWORD` in GitHub secrets

### How to Add Secrets

1. Go to your GitHub repository
2. Click "Settings" tab
3. Navigate to "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add each secret with the exact names above

## Workflow Configuration

### Testing Configuration

The CI pipeline runs comprehensive tests:

```yaml
- name: Run Tests
  run: |
    npm run lint
    npm run test:unit
    npm run test:integration
    npm run test:accessibility
    npm run test:performance
```

### Build Configuration

Application builds are validated on every commit:

```yaml
- name: Build Application
  run: npm run build
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

## Database Migration Automation

### Migration Process

1. **Detection**: Workflow triggers when files in `database/` change
2. **Validation**: Checks migration file format and syntax
3. **Backup**: Creates automatic backup before applying changes
4. **Application**: Applies migrations using Supabase CLI
5. **Verification**: Confirms migrations applied successfully

### Migration File Requirements

- Location: `database/migrations/`
- Naming: `YYYYMMDD_HHMMSS_description.sql`
- Format: Standard SQL with Supabase extensions
- Dependencies: Migrations run in chronological order

### Rollback Capabilities

If a migration fails:

1. **Automatic Rollback**: Failed migrations are automatically reverted
2. **Manual Rollback**: Use rollback workflow for emergency situations
3. **Backup Restoration**: Database can be restored from automatic backups

## Deployment Environments

### Staging Environment

- **Trigger**: Push to `develop` branch
- **Database**: Staging Supabase project
- **Application**: Vercel preview deployment
- **Purpose**: Final testing before production

### Production Environment

- **Trigger**: Push to `main` branch
- **Database**: Production Supabase project
- **Application**: Vercel production deployment
- **Purpose**: Live application

## Monitoring and Notifications

### Build Status

- GitHub status checks on pull requests
- Slack/email notifications on failures
- Build status badges in README

### Deployment Status

- Supabase deployment logs
- Vercel deployment notifications
- Database migration status

## Troubleshooting

### Common CI/CD Issues

#### 1. Test Failures
```bash
# Run tests locally to debug
npm run test:all
npm run lint
```

#### 2. Build Failures
```bash
# Check build locally
npm run build

# Verify environment variables
npm run validate:env
```

#### 3. Migration Failures
```bash
# Validate migration syntax
supabase db diff

# Check migration order
ls -la database/migrations/
```

#### 4. Authentication Issues
- Verify GitHub secrets are set correctly
- Check token expiration dates
- Ensure proper permissions

### Debug Commands

```bash
# Check workflow runs
gh run list

# View specific run logs
gh run view [run-id]

# Re-run failed workflows
gh run rerun [run-id]
```

## Security Best Practices

### Secret Management
- Never commit secrets to code
- Rotate access tokens regularly
- Use least-privilege access
- Monitor secret usage

### Environment Separation
- Separate staging and production secrets
- Different database instances per environment
- Isolated deployment credentials

## Performance Optimization

### Build Optimization
- Parallel test execution
- Cached dependencies
- Incremental builds where possible

### Resource Management
- Appropriate runner sizes
- Timeout configurations
- Resource cleanup after runs

## Maintenance

### Regular Tasks
- Update GitHub Actions versions
- Rotate security tokens
- Review and clean up old workflow runs
- Update documentation

### Monitoring
- Track build times and success rates
- Monitor deployment frequency
- Review failed workflow patterns

## Support and Debugging

For issues with CI/CD:

1. **Check GitHub Actions logs**: Review detailed logs for failed runs
2. **Verify secrets**: Ensure all required secrets are configured
3. **Test locally**: Reproduce issues in local environment
4. **Check dependencies**: Verify all required tools are available
5. **Review recent changes**: Check if recent commits broke the pipeline

### Getting Help

- Check GitHub Actions documentation
- Review Supabase CLI documentation  
- Consult Next.js deployment guides
- Open issues in the repository for team support
