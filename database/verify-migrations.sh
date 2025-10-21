#!/bin/bash
# Verification script to ensure migrations are properly organized
# This helps catch migrations created in the wrong location

set -e

echo "🔍 Verifying database migration organization..."
echo ""

# Check for .sql files in database/ root (excluding schema.sql and config.toml)
LOOSE_FILES=$(find database -maxdepth 1 -name "*.sql" -not -name "schema.sql" -type f 2>/dev/null || true)

if [ -n "$LOOSE_FILES" ]; then
  echo "❌ ERROR: Found migration files in database/ root directory!"
  echo "   These should be in database/migrations/ with proper timestamps:"
  echo ""
  echo "$LOOSE_FILES" | while read -r file; do
    echo "   - $file"
  done
  echo ""
  echo "   Use: ./database/new-migration.sh <description>"
  echo "   Or move existing files to: database/migrations/YYYYMMDDHHMMSS_description.sql"
  exit 1
else
  echo "✅ No loose migration files in database/ root"
fi

# Check that migrations directory exists and has files
if [ ! -d "database/migrations" ]; then
  echo "❌ ERROR: database/migrations/ directory not found!"
  exit 1
fi

MIGRATION_COUNT=$(find database/migrations -name "*.sql" -type f 2>/dev/null | wc -l | tr -d ' ')

if [ "$MIGRATION_COUNT" -eq 0 ]; then
  echo "⚠️  WARNING: No migration files found in database/migrations/"
else
  echo "✅ Found $MIGRATION_COUNT migration(s) in database/migrations/"
fi

# List all migrations in order
echo ""
echo "📋 Migration history (in chronological order):"
find database/migrations -name "*.sql" -type f | sort | while read -r file; do
  FILENAME=$(basename "$file")
  echo "   $FILENAME"
done

echo ""
echo "✅ Migration organization verified!"
