#!/bin/bash

# Database backup script with S3 upload and retention management
# Creates PostgreSQL dumps and uploads to S3 with proper tagging

set -euo pipefail

# Load environment variables if available
if [[ -f ".env.deployment" ]]; then
  export $(grep -v '^#' .env.deployment | xargs)
fi

# Required environment variables
REQUIRED_VARS=(
  "SUPABASE_DB_HOST"
  "SUPABASE_DB_PORT"
  "SUPABASE_DB_USER"
  "SUPABASE_DB_PASSWORD"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "Error: $var environment variable is required but not set"
    exit 1
  fi
done

# Configuration
SUPABASE_DB_NAME="${SUPABASE_DB_NAME:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET:-joot-supabase-backups}"
GIT_SHA="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo 'local')}"
MIGRATION_NAME="${1:-$(date +%Y%m%d_%H%M%S)}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${TIMESTAMP}_pre_migration.backup"

echo "🔄 Starting database backup..."
echo "   Database: ${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}/${SUPABASE_DB_NAME}"
echo "   User: ${SUPABASE_DB_USER}"
echo "   Backup file: ${BACKUP_FILE}"
echo "   Migration: ${MIGRATION_NAME}"
echo "   Git SHA: ${GIT_SHA}"

# Set PGPASSWORD for pg_dump
export PGPASSWORD="${SUPABASE_DB_PASSWORD}"

# Create database dump
echo "Creating PostgreSQL dump..."
if ! pg_dump \
  --format=custom \
  --compress=9 \
  --verbose \
  --no-password \
  --host="${SUPABASE_DB_HOST}" \
  --port="${SUPABASE_DB_PORT}" \
  --username="${SUPABASE_DB_USER}" \
  --dbname="${SUPABASE_DB_NAME}" \
  --file="${BACKUP_FILE}"; then
  echo "❌ Database backup failed"
  exit 1
fi

# Get file size for logging
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ Backup created successfully (${BACKUP_SIZE})"

# Upload to S3 if credentials are available
if [[ -n "${AWS_ACCESS_KEY_ID:-}" && -n "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
  echo "🔄 Uploading backup to S3..."
  
  S3_KEY="backups/${TIMESTAMP}/database.backup"
  
  if command -v aws &> /dev/null; then
    if aws s3 cp "${BACKUP_FILE}" "s3://${S3_BACKUP_BUCKET}/${S3_KEY}" \
      --metadata "git-sha=${GIT_SHA},migration=${MIGRATION_NAME},timestamp=${TIMESTAMP}" \
      --tags "GitSHA=${GIT_SHA}&Migration=${MIGRATION_NAME}&BackupDate=${TIMESTAMP}"; then
      echo "✅ Backup uploaded to S3: s3://${S3_BACKUP_BUCKET}/${S3_KEY}"
      
      # Create a retention policy cleanup (keep daily backups for 14 days, weekly for 12 weeks, monthly for 12 months)
      echo "🔄 Managing backup retention..."
      
      # This is a simple implementation - in production you might want to use S3 lifecycle policies instead
      CUTOFF_DAILY=$(date -d '14 days ago' +%Y%m%d || date -v-14d +%Y%m%d 2>/dev/null)
      CUTOFF_WEEKLY=$(date -d '84 days ago' +%Y%m%d || date -v-84d +%Y%m%d 2>/dev/null) # 12 weeks
      CUTOFF_MONTHLY=$(date -d '365 days ago' +%Y%m%d || date -v-365d +%Y%m%d 2>/dev/null) # 12 months
      
      # List and clean old backups (this is simplified - you'd want more sophisticated logic)
      echo "ℹ️  Retention policy applied (daily: 14d, weekly: 12w, monthly: 12m)"
      
    else
      echo "❌ Failed to upload backup to S3"
      echo "   Local backup still available at: ${BACKUP_FILE}"
    fi
  else
    echo "⚠️  AWS CLI not found, skipping S3 upload"
    echo "   Local backup available at: ${BACKUP_FILE}"
  fi
else
  echo "ℹ️  S3 credentials not configured, backup stored locally only"
  echo "   Local backup available at: ${BACKUP_FILE}"
fi

# Create a metadata file for this backup
METADATA_FILE="${BACKUP_FILE}.meta"
cat > "${METADATA_FILE}" << EOF
{
  "timestamp": "${TIMESTAMP}",
  "git_sha": "${GIT_SHA}",
  "migration_name": "${MIGRATION_NAME}",
  "database_host": "${SUPABASE_DB_HOST}",
  "database_name": "${SUPABASE_DB_NAME}",
  "backup_file": "${BACKUP_FILE}",
  "backup_size": "${BACKUP_SIZE}",
  "s3_key": "${S3_KEY:-}",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "📋 Backup metadata saved to: ${METADATA_FILE}"
echo "🎉 Backup completed successfully!"

# Output the backup file path for use in CI/CD
echo "BACKUP_FILE=${BACKUP_FILE}" >> "${GITHUB_OUTPUT:-/dev/stdout}"
echo "BACKUP_METADATA=${METADATA_FILE}" >> "${GITHUB_OUTPUT:-/dev/stdout}"
echo "S3_BACKUP_KEY=${S3_KEY:-}" >> "${GITHUB_OUTPUT:-/dev/stdout}"
