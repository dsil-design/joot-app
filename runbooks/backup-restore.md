# Database Backup & Restore SOP

Standard Operating Procedures for database backup and restore operations for the Joot application.

## Overview

This SOP covers the processes, procedures, and best practices for:
- Creating database backups
- Restoring from backups  
- Backup verification and testing
- Emergency recovery procedures
- Backup retention and lifecycle management

## Backup Types

### 1. Automated Pre-Migration Backups
- **Trigger**: Before any database migration
- **Frequency**: Every deployment with database changes
- **Retention**: 30 days local artifacts + S3 long-term storage
- **Location**: `backups/` directory + S3 bucket

### 2. Manual On-Demand Backups  
- **Trigger**: Manual execution of backup script
- **Use cases**: Before major changes, testing, troubleshooting
- **Command**: `./scripts/backup-db.sh [backup_name]`

### 3. Emergency Safety Backups
- **Trigger**: Before rollback operations
- **Purpose**: Preserve current state before restoration
- **Naming**: `emergency_pre_rollback_[timestamp]`

## Backup Procedures

### Prerequisites
- Database credentials configured in `.env.deployment`
- AWS CLI configured (optional, for S3 storage)
- PostgreSQL client tools installed (`pg_dump`, `pg_restore`)
- Sufficient disk space (backup size ≈ 80% of database size when compressed)

### Standard Backup Creation

1. **Prepare Environment**
   ```bash
   # Export credentials
   export $(grep -v '^#' .env.deployment | xargs)
   
   # Verify database connectivity
   scripts/setup-pgpass.sh
   ```

2. **Execute Backup**
   ```bash
   # Standard backup with automatic naming
   ./scripts/backup-db.sh
   
   # Named backup for specific purpose
   ./scripts/backup-db.sh "pre_major_release_v2.1"
   ```

3. **Verify Backup Creation**
   ```bash
   # Check local backup file
   ls -la backups/
   
   # Verify metadata file
   cat backups/[timestamp]_pre_migration.backup.meta
   
   # Check S3 upload (if configured)
   aws s3 ls s3://joot-supabase-backups/backups/
   ```

### Backup Verification

Always verify backups can be restored:

1. **Test Restore to Local Environment**
   ```bash
   # Start local Supabase instance
   supabase start
   
   # Restore to local database
   export SUPABASE_DB_HOST=127.0.0.1
   export SUPABASE_DB_PORT=54322
   ./scripts/restore-db.sh backups/[backup_file].backup
   ```

2. **Verify Data Integrity**
   ```bash
   # Check table counts
   psql "postgresql://postgres@127.0.0.1:54322/postgres" \
     -c "SELECT schemaname, tablename, n_tup_ins FROM pg_stat_user_tables;"
   
   # Verify key data
   psql "postgresql://postgres@127.0.0.1:54322/postgres" \
     -c "SELECT COUNT(*) FROM transactions;" \
     -c "SELECT COUNT(*) FROM auth.users;"
   ```

## Restore Procedures

### Standard Restore Process

1. **Pre-Restore Checklist**
   - [ ] Confirm backup file availability and integrity
   - [ ] Verify restore target (production/staging/local)
   - [ ] Create emergency backup of current state
   - [ ] Notify team of planned restoration
   - [ ] Ensure application is in maintenance mode (if production)

2. **Execute Restore**
   ```bash
   # List available backups
   ./scripts/restore-db.sh
   
   # Restore from latest backup
   ./scripts/restore-db.sh latest
   
   # Restore from specific backup file
   ./scripts/restore-db.sh backups/20250819_100000_pre_migration.backup
   
   # Restore from S3 backup
   ./scripts/restore-db.sh backups/20250819_100000/database.backup
   ```

3. **Post-Restore Verification**
   ```bash
   # Verify table structure
   psql "postgresql://postgres@[host]:5432/postgres" \
     -c "\\dt" \
     -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
   
   # Check data integrity
   psql "postgresql://postgres@[host]:5432/postgres" \
     -c "SELECT COUNT(*) as users FROM auth.users;" \
     -c "SELECT COUNT(*) as transactions FROM transactions;" \
     -c "SELECT COUNT(*) as vendors FROM vendors;"
   
   # Test application connectivity
   npm run test:supabase
   ```

### Emergency Restore Process

For production emergencies:

1. **Immediate Actions**
   ```bash
   # Put application in maintenance mode
   vercel env add MAINTENANCE_MODE true
   
   # Create emergency backup of current state
   ./scripts/backup-db.sh "emergency_$(date +%Y%m%d_%H%M%S)"
   ```

2. **Execute Emergency Restore**
   ```bash
   # Restore from latest known good backup
   ./scripts/restore-db.sh latest
   ```

3. **Validation & Recovery**
   ```bash
   # Quick smoke test
   curl -f https://your-app.vercel.app/api/health
   
   # Remove maintenance mode
   vercel env rm MAINTENANCE_MODE
   
   # Monitor application logs
   vercel logs --follow
   ```

## Backup Storage & Retention

### Local Storage
- **Location**: `backups/` directory
- **Retention**: Manual cleanup required
- **Security**: File system permissions (600)

### S3 Storage  
- **Bucket**: `joot-supabase-backups`
- **Structure**: 
  ```
  backups/
    ├── 20250819_100000/
    │   ├── database.backup
    │   └── metadata.json
    └── 20250820_143000/
        ├── database.backup
        └── metadata.json
  ```

### Retention Policy
- **Daily backups**: Keep for 14 days
- **Weekly backups**: Keep for 12 weeks (84 days)  
- **Monthly backups**: Keep for 12 months (365 days)
- **Major release backups**: Keep indefinitely

### Implementation
```bash
# Set S3 lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket joot-supabase-backups \
  --lifecycle-configuration file://s3-lifecycle-policy.json
```

## Monitoring & Alerting

### Backup Health Checks
- Monitor backup job success/failure
- Verify backup file sizes (should be consistent)
- Check S3 upload completion
- Validate metadata completeness

### Automated Monitoring
```bash
# Daily backup verification script
#!/bin/bash
LATEST_BACKUP=$(ls -t backups/*.backup | head -1)
if [[ -z "$LATEST_BACKUP" ]]; then
  echo "ALERT: No recent backups found"
  exit 1
fi

BACKUP_AGE=$(( $(date +%s) - $(stat -c %Y "$LATEST_BACKUP") ))
if [[ $BACKUP_AGE -gt 86400 ]]; then
  echo "ALERT: Latest backup is over 24 hours old"
  exit 1
fi

echo "Backup health check passed"
```

## Security Considerations

### Access Control
- Backup files contain sensitive user data
- Restrict access to backup storage locations
- Use IAM policies for S3 bucket access
- Encrypt backups at rest and in transit

### Data Protection
```bash
# Encrypt backup before upload (optional)
gpg --symmetric --cipher-algo AES256 backup.sql
aws s3 cp backup.sql.gpg s3://bucket/encrypted/

# Decrypt when needed
aws s3 cp s3://bucket/encrypted/backup.sql.gpg .
gpg --decrypt backup.sql.gpg > backup.sql
```

### Audit Trail
- Log all backup and restore operations
- Track who performed operations and when
- Maintain restore justification documentation

## Troubleshooting Common Issues

### Backup Failures

#### "pg_dump: connection failed"
```bash
# Verify credentials
echo $SUPABASE_DB_PASSWORD | wc -c  # Should be > 10

# Test connectivity
telnet db.uwjmgjqongcrsamprvjr.supabase.co 5432

# Check ~/.pgpass format
cat ~/.pgpass
```

#### "No space left on device"
```bash
# Check disk usage
df -h

# Clean old backups
find backups/ -name "*.backup" -mtime +30 -delete

# Compress existing backups
gzip backups/*.backup
```

### Restore Failures

#### "pg_restore: [archiver] unsupported version"
```bash
# Check PostgreSQL versions
pg_dump --version
pg_restore --version

# Update PostgreSQL client
sudo apt update && sudo apt install postgresql-client-15
```

#### "pg_restore: error: connection to server"
```bash
# Verify target database is accessible
psql "postgresql://postgres@host:5432/postgres" -c "SELECT version();"

# Check if database exists
psql "postgresql://postgres@host:5432/" -l
```

#### "relation already exists"
```bash
# Clean target database first
psql "postgresql://postgres@host:5432/postgres" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Use --clean flag in pg_restore
pg_restore --clean --if-exists backup.backup
```

## Performance Optimization

### Backup Performance
- Use compression (`--compress=9` in pg_dump)
- Exclude unnecessary schemas or tables
- Consider parallel backup for large databases
- Monitor backup duration trends

### Restore Performance  
- Use parallel restoration (`-j` flag)
- Disable WAL during restoration
- Temporary increase `shared_buffers` and `work_mem`
- Consider point-in-time recovery for large datasets

## Best Practices

### General
- Always test backup and restore procedures regularly
- Document any manual interventions or exceptions
- Keep backup scripts and procedures version controlled
- Regular DR drills to validate procedures

### Backup Strategy
- Implement 3-2-1 rule: 3 copies, 2 different media, 1 offsite
- Test restore procedures monthly
- Validate backup integrity before relying on them
- Maintain backup documentation and runbooks

### Security
- Never log database passwords
- Use environment variables for credentials
- Implement backup encryption for sensitive data
- Regular access reviews for backup systems

### Monitoring
- Set up alerts for backup failures
- Monitor backup sizes and durations
- Track restoration test success rates
- Maintain backup inventory and metadata

## Emergency Contacts

### Escalation Path
1. **On-call Engineer**: Check backup/restore procedures
2. **Database Administrator**: Complex corruption issues
3. **DevOps Lead**: Infrastructure and S3 issues
4. **CTO/Technical Lead**: Critical data loss scenarios

### Communication
- Post in #incidents Slack channel
- Include backup status, restore ETA, and impact
- Update stakeholders every 30 minutes during incident

Remember: **When in doubt, create a backup before proceeding with any database operation.**
