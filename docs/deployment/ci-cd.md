# CI/CD Deployment Guide

This document covers the comprehensive automated deployment system for the Joot application, including database migrations, application deployments, backup management, and rollback procedures.

## Overview

The CI/CD pipeline provides:
- **Automated database backups** before any migration
- **Safe migration deployment** with synchronization checks  
- **Application deployment** to Vercel with testing
- **Rollback capabilities** for both database and application
- **Slack notifications** and GitHub release management
- **Multi-environment support** (staging/production)

## Workflow Triggers

### Automatic Triggers
The pipeline automatically runs on:
- Push to `main` branch with changes to:
  - `src/**` (application code)
  - `supabase/**` (database migrations)
  - `package.json`, `next.config.ts`, `tsconfig.json`

### Manual Triggers
Use GitHub Actions workflow dispatch to:
- Deploy to specific environments (staging/production)
- Skip backup or tests for emergency deployments
- Force deployment without file changes

## Required GitHub Secrets

Set these in your GitHub repository settings under **Settings → Secrets and variables → Actions**:

### Supabase Configuration
```
SUPABASE_PROJECT_REF=uwjmgjqongcrsamprvjr
SUPABASE_ACCESS_TOKEN=sbp_your_access_token_here  
SUPABASE_DB_PASSWORD=your_database_password_here
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### AWS S3 Backup (Recommended)
```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_DEFAULT_REGION=us-east-1
```

### Vercel Deployment
```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

### Notifications (Optional)
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## Pipeline Stages

### 1. Pre-flight Checks
- Generates unique deployment ID
- Detects changes requiring database or app deployment
- Prevents unnecessary deployments

### 2. Database Backup (if DB changes detected)
- Creates compressed PostgreSQL dump using `pg_dump`
- Uploads to S3 with Git SHA and migration metadata
- Stores local artifact for 30 days
- Applies retention policy (14d daily, 12w weekly, 12m monthly)

### 3. Migration Verification & Application
- Verifies migration synchronization between local and remote
- Sets up non-interactive authentication for CLI
- Applies migrations using `supabase db push`
- Blocks deployment if migration history conflicts detected

### 4. Database Verification
- Confirms migration list matches expectations
- Validates key table existence and counts
- Runs smoke queries to verify database health

### 5. Test Suite (if app changes detected)
- TypeScript compilation check
- ESLint code quality validation  
- Unit test suite via Jest
- End-to-end testing with Playwright

### 6. Application Deployment
- Builds Next.js application with proper environment
- Deploys to Vercel (production or staging)
- Returns deployment URL and ID for potential rollback

### 7. Notifications & Release Management
- Sends Slack notifications with detailed status
- Creates GitHub release on successful main branch deployment
- Includes rollback information and deployment URLs

## Local Development Testing

### Prerequisites
1. Install required tools:
```bash
npm install -g @supabase/cli@latest
npm install -g vercel@latest
```

2. Set up local environment:
```bash
cp .env.deployment.template .env.deployment
# Edit .env.deployment with your actual credentials
```

### Test Scripts Individually

#### Test Database Backup
```bash
# Test backup creation
./scripts/backup-db.sh test_backup

# Test backup with S3 upload (requires AWS credentials)
AWS_ACCESS_KEY_ID=your_key ./scripts/backup-db.sh
```

#### Test Migration Sync Check
```bash
# Check if local and remote migrations are synchronized
./scripts/verify-migration-sync.sh
```

#### Test Database Restore
```bash
# List available backups
./scripts/restore-db.sh

# Restore from latest backup
./scripts/restore-db.sh latest

# Restore from specific backup file
./scripts/restore-db.sh backups/20250819_100000_pre_migration.backup
```

### Test Full Deployment Locally
```bash
# Export environment variables
export $(grep -v '^#' .env.deployment | xargs)

# Run backup
./scripts/backup-db.sh local_test

# Check migration sync
./scripts/verify-migration-sync.sh

# Apply migrations (if needed)
supabase db push

# Run tests
npm run test:ci
npm run test:e2e

# Build application
npm run build
```

## Rollback Procedures

### Automatic Rollbacks
- Database verification failure → Triggers automatic restore from backup
- Critical migration errors → Blocks application deployment

### Manual Rollbacks
Use the manual rollback workflow in GitHub Actions:

1. Go to **Actions → Manual Rollback**
2. Select rollback type:
   - `database_only` - Restore database from backup
   - `application_only` - Revert to previous Vercel deployment
   - `full_rollback` - Both database and application
3. Specify backup source (file, S3 key, or "latest")
4. For app rollbacks, provide previous Vercel deployment ID
5. Confirm rollback and provide reason

### Emergency Rollback Commands
```bash
# Emergency database rollback to latest backup
./scripts/restore-db.sh latest

# Emergency app rollback via Vercel CLI  
vercel promote previous-deployment-id --prod
```

## Monitoring & Troubleshooting

### Common Issues

#### "Migration divergence detected"
**Cause**: Local migration files don't match remote migration history.

**Resolution**:
```bash
# View the current state
supabase migration list --linked

# Repair migration history (use suggested commands from error)
supabase migration repair --status applied MIGRATION_NAME
```

#### "Database backup failed"
**Causes**: Network issues, authentication failure, disk space.

**Resolution**:
1. Check database credentials in secrets
2. Verify network connectivity to Supabase
3. Ensure sufficient disk space in CI environment
4. Check AWS S3 credentials if using S3 backup

#### "Application deployment failed"
**Causes**: Build errors, Vercel authentication, environment variables.

**Resolution**:
1. Check build logs for compilation errors
2. Verify Vercel token and project configuration
3. Ensure all required environment variables are set
4. Test build locally: `npm run build`

#### "Tests failed" 
**Causes**: Code quality issues, test failures, Playwright setup.

**Resolution**:
1. Run tests locally: `npm run test:ci`
2. Check lint errors: `npm run lint`  
3. For E2E failures: ensure Playwright browsers installed
4. Verify test environment variables

### Monitoring Commands
```bash
# Check deployment status
gh workflow list
gh run list --workflow=cicd.yml

# View specific deployment logs
gh run view RUN_ID --log

# List recent backups
aws s3 ls s3://joot-supabase-backups/backups/ --recursive

# Check database migration status
supabase migration list --linked
```

## Security Considerations

### Secret Management
- Never commit credentials to version control
- Rotate access tokens regularly (quarterly recommended)
- Use least-privilege AWS IAM policies for S3 backup
- Monitor GitHub secret access logs

### Database Security
- Database backups contain sensitive user data
- S3 bucket should have encryption enabled
- Implement backup retention policies
- Regular security audits of database access

### Network Security
- Supabase connections use TLS encryption
- Vercel deployments use HTTPS only
- Consider IP whitelisting for production database access

## Performance Optimization

### Pipeline Performance
- Backup creation: ~2-5 minutes depending on database size
- Migration application: ~30 seconds - 2 minutes
- Test suite: ~3-8 minutes depending on test coverage  
- Application build: ~2-4 minutes
- Total pipeline: ~10-20 minutes for full deployment

### Optimization Tips
- Use `skip_tests` for emergency hotfixes
- Consider parallel test execution for large test suites
- Implement incremental backup strategies for large databases
- Use Vercel build cache optimization

## Compliance & Auditing

### Audit Trail
- All deployments logged in GitHub releases
- Backup metadata includes Git SHA and timestamps
- Slack notifications provide deployment history
- Rollback actions logged to `ROLLBACK_LOG.md`

### Compliance Features
- Automated backup before any database change
- Migration history preservation
- Deployment approval workflows (manual dispatch)
- Complete audit trail of all changes

## Advanced Configuration

### Custom Environments
To add new deployment environments:

1. Create environment-specific secrets in GitHub
2. Update workflow inputs in `.github/workflows/cicd.yml`
3. Configure corresponding Vercel projects
4. Set up environment-specific Supabase projects if needed

### Custom Notification Channels
Beyond Slack, you can integrate:
- Microsoft Teams webhooks
- Discord notifications  
- Email alerts via SendGrid
- Custom webhook endpoints

### Advanced Backup Strategies
- Implement cross-region backup replication
- Set up backup verification workflows
- Configure backup encryption with customer-managed keys
- Implement backup compression optimization

## Support & Escalation

### Getting Help
1. Check this documentation first
2. Review GitHub Actions logs for specific error messages
3. Test deployment scripts locally to isolate issues
4. Check Supabase and Vercel status pages

### Escalation Procedures
For production issues:
1. Use emergency rollback procedures immediately
2. Document the issue in GitHub issues
3. Notify team via Slack with deployment failure details
4. Investigate and fix in development environment first

Remember: **Always test changes in staging environment before production deployment.**
