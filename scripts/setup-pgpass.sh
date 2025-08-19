#!/bin/bash

# Setup PostgreSQL authentication for non-interactive Supabase CLI access
# This script creates a ~/.pgpass file with the database credentials

set -euo pipefail

# Check required environment variables
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

# Default database name for Supabase
SUPABASE_DB_NAME="${SUPABASE_DB_NAME:-postgres}"

# Create ~/.pgpass entry
PGPASS_ENTRY="${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}:${SUPABASE_DB_NAME}:${SUPABASE_DB_USER}:${SUPABASE_DB_PASSWORD}"

echo "Setting up ~/.pgpass for non-interactive database access..."

# Create ~/.pgpass if it doesn't exist
touch ~/.pgpass

# Remove existing entry for this host/port/db/user combination if it exists
grep -v "^${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}:${SUPABASE_DB_NAME}:${SUPABASE_DB_USER}:" ~/.pgpass > ~/.pgpass.tmp 2>/dev/null || true
mv ~/.pgpass.tmp ~/.pgpass 2>/dev/null || true

# Add the new entry
echo "${PGPASS_ENTRY}" >> ~/.pgpass

# Set correct permissions (required by PostgreSQL)
chmod 0600 ~/.pgpass

echo "✅ ~/.pgpass configured successfully"
echo "   Host: ${SUPABASE_DB_HOST}"
echo "   Port: ${SUPABASE_DB_PORT}" 
echo "   Database: ${SUPABASE_DB_NAME}"
echo "   User: ${SUPABASE_DB_USER}"

# Test the connection
if command -v psql &> /dev/null; then
  echo "Testing connection..."
  if psql "postgresql://${SUPABASE_DB_USER}@${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}/${SUPABASE_DB_NAME}" -c "SELECT version();" &>/dev/null; then
    echo "✅ Database connection test successful"
  else
    echo "❌ Database connection test failed"
    echo "Note: This might be expected if running in CI/CD or if psql is not available"
  fi
else
  echo "ℹ️  psql not found, skipping connection test"
fi

echo "Done! Supabase CLI should now work without password prompts."
