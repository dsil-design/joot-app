#!/bin/bash

# Migration synchronization verification script
# Ensures local and remote migrations are in sync before deployment

set -euo pipefail

# Load environment variables if available  
if [[ -f ".env.deployment" ]]; then
  export $(grep -v '^#' .env.deployment | xargs)
fi

echo "🔄 Verifying migration synchronization..."

# Get remote migrations (applied to linked Supabase project)
echo "   Fetching remote migration list..."
if ! REMOTE_MIGRATIONS=$(supabase migration list --linked --password "${SUPABASE_DB_PASSWORD:-}" 2>/dev/null | tail -n +4 | grep -v "^\s*$" | awk '{print $3}' | sort); then
  echo "❌ Failed to fetch remote migrations"
  echo "   Make sure you're authenticated with Supabase and the project is linked"
  exit 1
fi

# Get local migrations (files in supabase/migrations/)
echo "   Scanning local migration files..."
LOCAL_MIGRATIONS=""
if ls supabase/migrations/*.sql >/dev/null 2>&1; then
  LOCAL_MIGRATIONS=$(ls supabase/migrations/*.sql | xargs -n1 basename | sed 's/\.sql$//' | sort)
else
  echo "   No local migration files found"
fi

# Create temporary files for comparison
TEMP_REMOTE=$(mktemp)
TEMP_LOCAL=$(mktemp)

echo "${REMOTE_MIGRATIONS}" > "${TEMP_REMOTE}"
echo "${LOCAL_MIGRATIONS}" > "${TEMP_LOCAL}"

echo "   Comparing migration states..."

# Check for differences
if DIFF_OUTPUT=$(diff "${TEMP_REMOTE}" "${TEMP_LOCAL}" 2>/dev/null); then
  echo "✅ Migrations are synchronized"
  SYNC_STATUS="synchronized"
else
  echo "⚠️  Migration divergence detected:"
  echo ""
  
  # Show detailed differences
  echo "   Migrations only in REMOTE:"
  comm -23 "${TEMP_REMOTE}" "${TEMP_LOCAL}" | sed 's/^/     /'
  
  echo "   Migrations only in LOCAL:"  
  comm -13 "${TEMP_REMOTE}" "${TEMP_LOCAL}" | sed 's/^/     /'
  
  # Count the differences
  REMOTE_ONLY=$(comm -23 "${TEMP_REMOTE}" "${TEMP_LOCAL}" | wc -l | xargs)
  LOCAL_ONLY=$(comm -13 "${TEMP_REMOTE}" "${TEMP_LOCAL}" | wc -l | xargs)
  
  SYNC_STATUS="diverged"
  
  # Determine if this is acceptable (only forward migrations)
  if [[ "${REMOTE_ONLY}" -eq 0 && "${LOCAL_ONLY}" -gt 0 ]]; then
    echo ""
    echo "✅ Acceptable state: Local has ${LOCAL_ONLY} new migration(s) to apply"
    echo "   These will be applied during deployment"
    SYNC_STATUS="forward_migrations_pending"
  elif [[ "${REMOTE_ONLY}" -gt 0 && "${LOCAL_ONLY}" -eq 0 ]]; then
    echo ""
    echo "❌ CRITICAL: Remote has ${REMOTE_ONLY} migration(s) not present locally"
    echo "   This indicates the local codebase is behind the database"
    echo "   You must synchronize before deploying to prevent conflicts"
    SYNC_STATUS="local_behind_remote"
  elif [[ "${REMOTE_ONLY}" -gt 0 && "${LOCAL_ONLY}" -gt 0 ]]; then
    echo ""
    echo "❌ CRITICAL: Both local and remote have unique migrations"
    echo "   This indicates a branching/merging issue that must be resolved"
    echo "   Remote unique: ${REMOTE_ONLY}, Local unique: ${LOCAL_ONLY}"
    SYNC_STATUS="conflicting_migrations"
  fi
fi

# Clean up temporary files
rm -f "${TEMP_REMOTE}" "${TEMP_LOCAL}"

# Show summary
echo ""
echo "📊 Migration Status Summary:"
echo "   Remote migrations: $(echo "${REMOTE_MIGRATIONS}" | grep -c . || echo "0")"
echo "   Local migrations:  $(echo "${LOCAL_MIGRATIONS}" | grep -c . || echo "0")"
echo "   Status: ${SYNC_STATUS}"

# Set GitHub Actions outputs if running in CI
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "sync_status=${SYNC_STATUS}" >> "${GITHUB_OUTPUT}"
  echo "remote_count=$(echo "${REMOTE_MIGRATIONS}" | grep -c . || echo "0")" >> "${GITHUB_OUTPUT}"
  echo "local_count=$(echo "${LOCAL_MIGRATIONS}" | grep -c . || echo "0")" >> "${GITHUB_OUTPUT}"
fi

# Exit based on sync status
case "${SYNC_STATUS}" in
  "synchronized"|"forward_migrations_pending")
    echo "✅ Migration check passed - safe to proceed with deployment"
    exit 0
    ;;
  "local_behind_remote"|"conflicting_migrations")
    echo ""
    echo "🔧 Resolution suggestions:"
    echo "   1. Run: supabase db pull --schema public"
    echo "   2. Review the generated diff and resolve conflicts"
    echo "   3. Update local migrations to match remote state"
    echo "   4. Commit and try deployment again"
    echo ""
    echo "❌ Migration check failed - deployment blocked for safety"
    exit 1
    ;;
  *)
    echo "❌ Unknown sync status: ${SYNC_STATUS}"
    exit 1
    ;;
esac
