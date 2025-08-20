#!/bin/bash

# Reset Transaction Data - Warp Workflow Script
# 
# This script wipes and reseeds transaction-related data with realistic examples.
# Perfect for resolving transaction display issues and getting a fresh start.
#
# Usage: ./scripts/reset-transactions.sh
# Or run via npm: npm run db:reset-transactions

set -e  # Exit on any error

echo "🔄 Resetting Transaction Data..."
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: This script must be run from the project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Please cd to your project root and run: ./scripts/reset-transactions.sh"
    exit 1
fi

# Check for required environment files
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local file not found"
    echo "   Make sure your Supabase credentials are configured in environment variables"
    echo "   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    echo ""
fi

# Load environment variables if .env.local exists
if [ -f ".env.local" ]; then
    echo "📋 Loading environment variables from .env.local..."
    export $(grep -v '^#' .env.local | xargs)
fi

# Validate required environment variables
echo "🔍 Checking environment variables..."
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -z "$SUPABASE_PROJECT_URL" ]; then
    echo "❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_PROJECT_URL"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    exit 1
fi

echo "✅ Environment variables OK"
echo ""

# Run the Node.js script
echo "🚀 Executing reset script..."
echo ""

npm run db:reset-transactions

echo ""
echo "🎉 Transaction data reset completed!"
echo ""
echo "💡 What to do next:"
echo "   1. Open your app: npm run dev"
echo "   2. Navigate to the home page"
echo "   3. You should now see sample transactions displayed"
echo ""
echo "🔧 If you still don't see transactions:"
echo "   - Check the browser console for errors"
echo "   - Verify your authentication is working"
echo "   - Check Supabase logs for any RLS policy issues"
echo ""