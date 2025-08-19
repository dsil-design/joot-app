#!/bin/bash

# Helper script to get Vercel deployment information
# Useful for finding deployment URLs for rollback operations

set -euo pipefail

# Load environment variables if available
if [[ -f ".env.deployment" ]]; then
  export $(grep -v '^#' .env.deployment | xargs)
fi

echo "🔍 Fetching Vercel deployment information..."

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "❌ VERCEL_TOKEN not set. Please set it in .env.deployment or as environment variable"
  echo "   Get your token from: https://vercel.com/account/tokens"
  exit 1
fi

# Install Vercel CLI if not present
if ! command -v vercel &> /dev/null; then
  echo "📦 Installing Vercel CLI..."
  npm install -g vercel@latest
fi

echo "📋 Recent deployments:"
echo "   (Use the URL column for rollback operations)"
echo ""

# List recent deployments
vercel ls --token="${VERCEL_TOKEN}" | head -20

echo ""
echo "📖 Usage Examples:"
echo ""
echo "🔄 Rollback database and application:"
echo "   1. Go to GitHub Actions → Manual Rollback"
echo "   2. Select 'full_rollback'"
echo "   3. Copy a deployment URL from above"
echo "   4. Paste it in 'Previous Vercel deployment URL' field"
echo ""
echo "🔄 Rollback application only:"
echo "   1. Go to GitHub Actions → Manual Rollback" 
echo "   2. Select 'application_only'"
echo "   3. Use deployment URL from above"
echo ""
echo "💡 Pro tip: You can also rollback directly via Vercel CLI:"
echo "   vercel rollback [deployment-url] --token=\$VERCEL_TOKEN"
