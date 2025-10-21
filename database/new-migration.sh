#!/bin/bash
# Helper script to create new database migrations with proper timestamp
# Usage: ./database/new-migration.sh description_of_change

set -e

DESCRIPTION=$1

if [ -z "$DESCRIPTION" ]; then
  echo "Error: Migration description required"
  echo "Usage: ./database/new-migration.sh description_of_change"
  echo "Example: ./database/new-migration.sh add_user_preferences"
  exit 1
fi

# Generate timestamp in format YYYYMMDDHHMMSS
TIMESTAMP=$(date +"%Y%m%d%H%M%S")

# Create filename
FILENAME="${TIMESTAMP}_${DESCRIPTION}.sql"
FILEPATH="database/migrations/${FILENAME}"

# Create the file with a basic template
cat > "$FILEPATH" << EOF
-- Migration: ${DESCRIPTION}
-- Created: $(date +"%Y-%m-%d %H:%M:%S")

BEGIN;

-- Add your migration SQL here

COMMIT;
EOF

echo "✅ Created migration: $FILEPATH"
echo ""
echo "Next steps:"
echo "1. Edit the migration file to add your SQL"
echo "2. Update database/schema.sql to reflect final state"
echo "3. Regenerate types if schema changed: npx supabase gen types typescript --linked > src/lib/supabase/types.ts"
echo "4. Commit all changes together"
