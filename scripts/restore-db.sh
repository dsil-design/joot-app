#!/bin/bash

# Database restoration script 
# Can restore from local backup file or S3 key

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
S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET:-joot-supabase-backups}"
BACKUP_DIR="${BACKUP_DIR:-backups}"

# Parse command line arguments
BACKUP_SOURCE="${1:-}"

if [[ -z "${BACKUP_SOURCE}" ]]; then
  echo "Usage: $0 <backup-file-or-s3-key>"
  echo ""
  echo "Examples:"
  echo "  $0 backups/20250819_100000_pre_migration.backup  # Restore from local file"
  echo "  $0 backups/20250819_100000/database.backup       # Restore from S3 key"
  echo "  $0 latest                                         # Restore from latest local backup"
  echo ""
  echo "Available local backups:"
  if ls "${BACKUP_DIR}"/*.backup &>/dev/null; then
    ls -lt "${BACKUP_DIR}"/*.backup | head -5
  else
    echo "  No local backups found"
  fi
  exit 1
fi

echo "🔄 Starting database restoration..."
echo "   Database: ${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}/${SUPABASE_DB_NAME}"
echo "   User: ${SUPABASE_DB_USER}"
echo "   Source: ${BACKUP_SOURCE}"

# Set PGPASSWORD for pg_restore
export PGPASSWORD="${SUPABASE_DB_PASSWORD}"

# Determine if we're dealing with a local file or S3 key
RESTORE_FILE=""

if [[ "${BACKUP_SOURCE}" == "latest" ]]; then
  # Find the latest local backup
  LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/*.backup 2>/dev/null | head -1 || echo "")
  if [[ -z "${LATEST_BACKUP}" ]]; then
    echo "❌ No local backups found"
    exit 1
  fi
  RESTORE_FILE="${LATEST_BACKUP}"
  echo "   Using latest backup: ${RESTORE_FILE}"
  
elif [[ -f "${BACKUP_SOURCE}" ]]; then
  # Local file path
  RESTORE_FILE="${BACKUP_SOURCE}"
  echo "   Using local backup file: ${RESTORE_FILE}"
  
elif [[ "${BACKUP_SOURCE}" == s3://* ]] || [[ "${BACKUP_SOURCE}" == backups/* ]]; then
  # S3 key or path
  if [[ -n "${AWS_ACCESS_KEY_ID:-}" && -n "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
    echo "🔄 Downloading backup from S3..."
    
    S3_KEY="${BACKUP_SOURCE#s3://*/}"  # Remove s3://bucket/ prefix if present
    S3_KEY="${S3_KEY#backups/}"       # Ensure we have the right path format
    S3_KEY="backups/${S3_KEY}"        # Add backups/ prefix
    
    TEMP_RESTORE_FILE="${BACKUP_DIR}/temp_restore_$(date +%Y%m%d_%H%M%S).backup"
    
    if command -v aws &> /dev/null; then
      if aws s3 cp "s3://${S3_BACKUP_BUCKET}/${S3_KEY}" "${TEMP_RESTORE_FILE}"; then
        echo "✅ Backup downloaded from S3"
        RESTORE_FILE="${TEMP_RESTORE_FILE}"
      else
        echo "❌ Failed to download backup from S3"
        exit 1
      fi
    else
      echo "❌ AWS CLI not found, cannot download from S3"
      exit 1
    fi
  else
    echo "❌ S3 credentials not configured, cannot download backup"
    exit 1
  fi
  
else
  echo "❌ Backup source not found: ${BACKUP_SOURCE}"
  exit 1
fi

# Verify the backup file exists and is readable
if [[ ! -f "${RESTORE_FILE}" ]]; then
  echo "❌ Backup file not found: ${RESTORE_FILE}"
  exit 1
fi

# Get backup file info
BACKUP_SIZE=$(du -h "${RESTORE_FILE}" | cut -f1)
echo "   Backup file size: ${BACKUP_SIZE}"

# Load metadata if available
METADATA_FILE="${RESTORE_FILE}.meta"
if [[ -f "${METADATA_FILE}" ]]; then
  echo "   Metadata found, loading backup info..."
  if command -v jq &> /dev/null; then
    GIT_SHA=$(jq -r '.git_sha // "unknown"' "${METADATA_FILE}")
    MIGRATION_NAME=$(jq -r '.migration_name // "unknown"' "${METADATA_FILE}")
    CREATED_AT=$(jq -r '.created_at // "unknown"' "${METADATA_FILE}")
    echo "     Git SHA: ${GIT_SHA}"
    echo "     Migration: ${MIGRATION_NAME}"
    echo "     Created: ${CREATED_AT}"
  fi
fi

# Confirmation prompt (skip in CI/CD)
if [[ -z "${CI:-}" && -z "${GITHUB_ACTIONS:-}" ]]; then
  echo ""
  echo "⚠️  WARNING: This will COMPLETELY REPLACE the current database!"
  echo "   All current data will be PERMANENTLY LOST!"
  echo ""
  read -p "Are you sure you want to continue? (yes/no): " -r
  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled by user"
    exit 0
  fi
fi

# Create a safety backup of current state (if not in CI)
if [[ -z "${CI:-}" && -z "${GITHUB_ACTIONS:-}" ]]; then
  echo "🔄 Creating safety backup of current database state..."
  SAFETY_BACKUP="${BACKUP_DIR}/safety_backup_$(date +%Y%m%d_%H%M%S).backup"
  
  if pg_dump \
    --format=custom \
    --compress=9 \
    --no-password \
    --host="${SUPABASE_DB_HOST}" \
    --port="${SUPABASE_DB_PORT}" \
    --username="${SUPABASE_DB_USER}" \
    --dbname="${SUPABASE_DB_NAME}" \
    --file="${SAFETY_BACKUP}" 2>/dev/null; then
    echo "✅ Safety backup created: ${SAFETY_BACKUP}"
  else
    echo "⚠️  Could not create safety backup, continuing anyway..."
  fi
fi

# Perform the restoration
echo "🔄 Restoring database from backup..."
echo "   This may take several minutes depending on database size..."

# First, we need to drop all existing objects (be very careful!)
echo "🔄 Preparing database for restoration..."

# Drop all user objects (tables, functions, etc.) but keep system objects
if psql "postgresql://${SUPABASE_DB_USER}@${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}/${SUPABASE_DB_NAME}" \
  -c "
    DO \$\$ 
    DECLARE
        r RECORD;
    BEGIN
        -- Drop all tables in public schema
        FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
            EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
        
        -- Drop all functions in public schema
        FOR r IN SELECT proname, oidvectortypes(proargtypes) as args
                 FROM pg_proc INNER JOIN pg_namespace ON (pg_proc.pronamespace = pg_namespace.oid) 
                 WHERE pg_namespace.nspname = 'public' LOOP
            EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
        END LOOP;
        
        -- Drop all sequences in public schema
        FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' LOOP
            EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequencename) || ' CASCADE';
        END LOOP;
    END
    \$\$;
  "; then
  echo "✅ Database prepared for restoration"
else
  echo "❌ Failed to prepare database for restoration"
  exit 1
fi

# Restore from backup
if pg_restore \
  --verbose \
  --clean \
  --no-acl \
  --no-owner \
  --no-password \
  --host="${SUPABASE_DB_HOST}" \
  --port="${SUPABASE_DB_PORT}" \
  --username="${SUPABASE_DB_USER}" \
  --dbname="${SUPABASE_DB_NAME}" \
  "${RESTORE_FILE}"; then
  
  echo "✅ Database restoration completed successfully!"
  
  # Verify the restoration by checking if key tables exist
  echo "🔄 Verifying restoration..."
  
  TABLE_COUNT=$(psql "postgresql://${SUPABASE_DB_USER}@${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}/${SUPABASE_DB_NAME}" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")
  
  echo "   Tables restored: ${TABLE_COUNT}"
  
  if [[ "${TABLE_COUNT}" -gt "0" ]]; then
    echo "✅ Verification successful - database restored and accessible"
  else
    echo "⚠️  Warning: No tables found after restoration, please verify manually"
  fi
  
else
  echo "❌ Database restoration failed"
  exit 1
fi

# Clean up temporary files
if [[ -n "${TEMP_RESTORE_FILE:-}" && -f "${TEMP_RESTORE_FILE}" ]]; then
  rm -f "${TEMP_RESTORE_FILE}"
  echo "🧹 Temporary download file cleaned up"
fi

echo "🎉 Database restoration completed!"
echo ""
echo "Next steps:"
echo "1. Verify your application works correctly with the restored data"
echo "2. Run any necessary post-restore migrations if needed"
echo "3. Test key application functionality"

# If we have a safety backup, remind the user
if [[ -n "${SAFETY_BACKUP:-}" && -f "${SAFETY_BACKUP}" ]]; then
  echo ""
  echo "ℹ️  Safety backup of previous state saved as: ${SAFETY_BACKUP}"
  echo "   You can use this to rollback if needed"
fi
