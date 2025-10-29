#!/bin/bash

# Import Files Organization Script
# Purpose: Clean up and organize all historical import files
# Date: October 27, 2025
# IMPORTANT: This script MOVES files, does not delete anything

set -e  # Exit on error

echo "🗂️  Import Files Organization Script"
echo "===================================="
echo ""

ROOT_DIR="/Users/dennis/Code Projects/joot-app"
cd "$ROOT_DIR"

# Create archive structure
echo "📁 Creating archive directory structure..."
mkdir -p archive/historical-imports/{prompts,validation-reports,summaries,protocols,miscellaneous}
mkdir -p scripts/archive/monthly-imports/{september-2024,october-2024,november-2024,december-2024,january-2025,february-2025,march-2025,april-2025,may-2025,june-2025,july-2025,august-2025,september-2025}

# Move root-level import prompts to archive
echo ""
echo "📄 Moving import prompts to archive/historical-imports/prompts/..."
mv -v SEPTEMBER-2024-IMPORT-PROMPT.md archive/historical-imports/prompts/ 2>/dev/null || true
mv -v SEPTEMBER-2024-IMPORT-PROMPT-SHORT.md.backup archive/historical-imports/prompts/ 2>/dev/null || true
mv -v OCTOBER-2024-IMPORT-PROMPT.md archive/historical-imports/prompts/ 2>/dev/null || true
mv -v OCTOBER-2024-IMPORT-PROMPT-FULL.md archive/historical-imports/prompts/ 2>/dev/null || true
mv -v NOVEMBER-2024-IMPORT-PROMPT.md archive/historical-imports/prompts/ 2>/dev/null || true
mv -v NOVEMBER-2024-IMPORT-PROMPT-FULL.md archive/historical-imports/prompts/ 2>/dev/null || true
mv -v DECEMBER-2024-IMPORT-PROMPT.md archive/historical-imports/prompts/ 2>/dev/null || true
mv -v JANUARY-2025-IMPORT-PROMPT.md archive/historical-imports/prompts/ 2>/dev/null || true
mv -v FEBRUARY-2025-IMPORT-PROMPT.md archive/historical-imports/prompts/ 2>/dev/null || true
mv -v MARCH-2025-IMPORT-PROMPT.md archive/historical-imports/prompts/ 2>/dev/null || true
mv -v APRIL-2025-IMPORT-PROMPT.md archive/historical-imports/prompts/ 2>/dev/null || true
mv -v MAY-2025-IMPORT-PROMPT.md archive/historical-imports/prompts/ 2>/dev/null || true
mv -v MAY_2025_IMPORT_PROMPT.md archive/historical-imports/prompts/ 2>/dev/null || true
mv -v JUNE-2025-IMPORT-PROMPT.md archive/historical-imports/prompts/ 2>/dev/null || true
mv -v JUNE-2025-COMPREHENSIVE-IMPORT-PROMPT.md archive/historical-imports/prompts/ 2>/dev/null || true
mv -v JULY_2025_IMPORT_PROMPT.md archive/historical-imports/prompts/ 2>/dev/null || true
mv -v SEPTEMBER_2025_IMPORT_SUCCESS.md archive/historical-imports/prompts/ 2>/dev/null || true

# Move protocols to archive
echo ""
echo "📋 Moving protocols to archive/historical-imports/protocols/..."
mv -v APRIL-2025-IMPORT-PROTOCOL.md archive/historical-imports/protocols/ 2>/dev/null || true
mv -v MAY-2025-IMPORT-PROTOCOL.md archive/historical-imports/protocols/ 2>/dev/null || true
mv -v JUNE-2025-IMPORT-PROTOCOL.md archive/historical-imports/protocols/ 2>/dev/null || true
mv -v MARCH-2025-IMPORT-PROTOCOL.md archive/historical-imports/protocols/ 2>/dev/null || true
mv -v COMPREHENSIVE-VALIDATION-PROTOCOL.md archive/historical-imports/protocols/ 2>/dev/null || true

# Move validation reports to archive
echo ""
echo "✅ Moving validation reports to archive/historical-imports/validation-reports/..."
mv -v APRIL-2025-FINAL-VALIDATION-SUMMARY.md archive/historical-imports/validation-reports/ 2>/dev/null || true
mv -v FEBRUARY-2025-RED-FLAGS.md archive/historical-imports/validation-reports/ 2>/dev/null || true
mv -v JUNE-2025-VALIDATION-COMPLETE.md archive/historical-imports/validation-reports/ 2>/dev/null || true
mv -v JUNE-2025-VALIDATION-INDEX.md archive/historical-imports/validation-reports/ 2>/dev/null || true
mv -v JUNE-2025-VALIDATION-REPORT.md archive/historical-imports/validation-reports/ 2>/dev/null || true
mv -v JULY-2025-VALIDATION-SUMMARY.md archive/historical-imports/validation-reports/ 2>/dev/null || true
mv -v MAY-2025-VALIDATION-SUMMARY.md archive/historical-imports/validation-reports/ 2>/dev/null || true
mv -v VALIDATION-EXECUTION-SUMMARY.md archive/historical-imports/validation-reports/ 2>/dev/null || true
mv -v VALIDATION-FILES-INDEX.txt archive/historical-imports/validation-reports/ 2>/dev/null || true
mv -v VALIDATION-QUICK-REFERENCE.txt archive/historical-imports/validation-reports/ 2>/dev/null || true

# Move summaries to archive
echo ""
echo "📊 Moving summaries to archive/historical-imports/summaries/..."
mv -v FEBRUARY-2025-EXECUTIVE-SUMMARY.md archive/historical-imports/summaries/ 2>/dev/null || true
mv -v HISTORICAL-IMPORT-PROGRESS.md archive/historical-imports/summaries/ 2>/dev/null || true
mv -v JUNE-2025-IMPORT-COMPLETE.md archive/historical-imports/summaries/ 2>/dev/null || true
mv -v JULY-2025-CORRECTED-IMPORT-COMPLETE.md archive/historical-imports/summaries/ 2>/dev/null || true
mv -v JULY-2025-PDF-VERIFICATION-COMPLETE.md archive/historical-imports/summaries/ 2>/dev/null || true

# Move miscellaneous files to archive
echo ""
echo "📦 Moving miscellaneous files to archive/historical-imports/miscellaneous/..."
mv -v IMPORT_PLAN.md archive/historical-imports/miscellaneous/ 2>/dev/null || true
mv -v CORRECTED-IMPORT-PROMPT.md archive/historical-imports/miscellaneous/ 2>/dev/null || true
mv -v APRIL-2025-QUICK-REFERENCE.txt archive/historical-imports/miscellaneous/ 2>/dev/null || true
mv -v MARCH-2025-QUICK-START.md archive/historical-imports/miscellaneous/ 2>/dev/null || true

# Move scripts directory monthly files to organized monthly archives
echo ""
echo "📅 Organizing scripts directory monthly files..."

# September 2024
echo "  Moving September 2024 files..."
mv -v scripts/SEPTEMBER-2024-*.md scripts/archive/monthly-imports/september-2024/ 2>/dev/null || true
mv -v scripts/SEPTEMBER-2024-*.txt scripts/archive/monthly-imports/september-2024/ 2>/dev/null || true
mv -v scripts/september-2024-*.json scripts/archive/monthly-imports/september-2024/ 2>/dev/null || true
mv -v scripts/september-2024-*.js scripts/archive/monthly-imports/september-2024/ 2>/dev/null || true

# October 2024
echo "  Moving October 2024 files..."
mv -v scripts/OCTOBER-2024-*.md scripts/archive/monthly-imports/october-2024/ 2>/dev/null || true
mv -v scripts/OCTOBER-2024-*.txt scripts/archive/monthly-imports/october-2024/ 2>/dev/null || true
mv -v scripts/october-2024-*.json scripts/archive/monthly-imports/october-2024/ 2>/dev/null || true
mv -v scripts/october-2024-*.js scripts/archive/monthly-imports/october-2024/ 2>/dev/null || true

# November 2024
echo "  Moving November 2024 files..."
mv -v scripts/NOVEMBER-2024-*.md scripts/archive/monthly-imports/november-2024/ 2>/dev/null || true
mv -v scripts/NOVEMBER-2024-*.txt scripts/archive/monthly-imports/november-2024/ 2>/dev/null || true
mv -v scripts/november-2024-*.json scripts/archive/monthly-imports/november-2024/ 2>/dev/null || true
mv -v scripts/november-2024-*.js scripts/archive/monthly-imports/november-2024/ 2>/dev/null || true

# December 2024
echo "  Moving December 2024 files..."
mv -v scripts/DECEMBER-2024-*.md scripts/archive/monthly-imports/december-2024/ 2>/dev/null || true
mv -v scripts/DECEMBER-2024-*.txt scripts/archive/monthly-imports/december-2024/ 2>/dev/null || true
mv -v scripts/december-2024-*.json scripts/archive/monthly-imports/december-2024/ 2>/dev/null || true
mv -v scripts/december-2024-*.js scripts/archive/monthly-imports/december-2024/ 2>/dev/null || true

# January 2025
echo "  Moving January 2025 files..."
mv -v scripts/JANUARY-2025-*.md scripts/archive/monthly-imports/january-2025/ 2>/dev/null || true
mv -v scripts/JANUARY-2025-*.txt scripts/archive/monthly-imports/january-2025/ 2>/dev/null || true
mv -v scripts/january-2025-*.json scripts/archive/monthly-imports/january-2025/ 2>/dev/null || true
mv -v scripts/january-2025-*.js scripts/archive/monthly-imports/january-2025/ 2>/dev/null || true

# February 2025
echo "  Moving February 2025 files..."
mv -v scripts/FEBRUARY-2025-*.md scripts/archive/monthly-imports/february-2025/ 2>/dev/null || true
mv -v scripts/FEBRUARY-2025-*.txt scripts/archive/monthly-imports/february-2025/ 2>/dev/null || true
mv -v scripts/february-2025-*.json scripts/archive/monthly-imports/february-2025/ 2>/dev/null || true
mv -v scripts/february-2025-*.js scripts/archive/monthly-imports/february-2025/ 2>/dev/null || true

# March 2025
echo "  Moving March 2025 files..."
mv -v scripts/MARCH-2025-*.md scripts/archive/monthly-imports/march-2025/ 2>/dev/null || true
mv -v scripts/MARCH-2025-*.txt scripts/archive/monthly-imports/march-2025/ 2>/dev/null || true
mv -v scripts/march-2025-*.json scripts/archive/monthly-imports/march-2025/ 2>/dev/null || true
mv -v scripts/march-2025-*.js scripts/archive/monthly-imports/march-2025/ 2>/dev/null || true

# April 2025
echo "  Moving April 2025 files..."
mv -v scripts/APRIL-2025-*.md scripts/archive/monthly-imports/april-2025/ 2>/dev/null || true
mv -v scripts/APRIL-2025-*.txt scripts/archive/monthly-imports/april-2025/ 2>/dev/null || true
mv -v scripts/april-2025-*.json scripts/archive/monthly-imports/april-2025/ 2>/dev/null || true
mv -v scripts/april-2025-*.js scripts/archive/monthly-imports/april-2025/ 2>/dev/null || true

# May 2025
echo "  Moving May 2025 files..."
mv -v scripts/MAY-2025-*.md scripts/archive/monthly-imports/may-2025/ 2>/dev/null || true
mv -v scripts/MAY-2025-*.txt scripts/archive/monthly-imports/may-2025/ 2>/dev/null || true
mv -v scripts/may-2025-*.json scripts/archive/monthly-imports/may-2025/ 2>/dev/null || true
mv -v scripts/may-2025-*.js scripts/archive/monthly-imports/may-2025/ 2>/dev/null || true

# June 2025
echo "  Moving June 2025 files..."
mv -v scripts/JUNE-2025-*.md scripts/archive/monthly-imports/june-2025/ 2>/dev/null || true
mv -v scripts/JUNE-2025-*.txt scripts/archive/monthly-imports/june-2025/ 2>/dev/null || true
mv -v scripts/june-2025-*.json scripts/archive/monthly-imports/june-2025/ 2>/dev/null || true
mv -v scripts/june-2025-*.js scripts/archive/monthly-imports/june-2025/ 2>/dev/null || true

# July 2025
echo "  Moving July 2025 files..."
mv -v scripts/JULY-2025-*.md scripts/archive/monthly-imports/july-2025/ 2>/dev/null || true
mv -v scripts/JULY-2025-*.txt scripts/archive/monthly-imports/july-2025/ 2>/dev/null || true
mv -v scripts/july-2025-*.json scripts/archive/monthly-imports/july-2025/ 2>/dev/null || true
mv -v scripts/july-2025-*.js scripts/archive/monthly-imports/july-2025/ 2>/dev/null || true

# August 2025
echo "  Moving August 2025 files..."
mv -v scripts/AUGUST-2025-*.md scripts/archive/monthly-imports/august-2025/ 2>/dev/null || true
mv -v scripts/AUGUST-2025-*.txt scripts/archive/monthly-imports/august-2025/ 2>/dev/null || true
mv -v scripts/august-2025-*.json scripts/archive/monthly-imports/august-2025/ 2>/dev/null || true
mv -v scripts/august-2025-*.js scripts/archive/monthly-imports/august-2025/ 2>/dev/null || true

# September 2025
echo "  Moving September 2025 files..."
mv -v scripts/SEPTEMBER-2025-*.md scripts/archive/monthly-imports/september-2025/ 2>/dev/null || true
mv -v scripts/SEPTEMBER-2025-*.txt scripts/archive/monthly-imports/september-2025/ 2>/dev/null || true
mv -v scripts/september-2025-*.json scripts/archive/monthly-imports/september-2025/ 2>/dev/null || true
mv -v scripts/september-2025-*.js scripts/archive/monthly-imports/september-2025/ 2>/dev/null || true

echo ""
echo "✅ Organization complete!"
echo ""
echo "📊 Summary of changes:"
echo "  - Created archive/historical-imports/ with subdirectories"
echo "  - Created scripts/archive/monthly-imports/ with month subdirectories"
echo "  - Moved all root-level import prompts to archive"
echo "  - Moved all protocols to archive"
echo "  - Moved all validation reports to archive"
echo "  - Moved all summaries to archive"
echo "  - Organized all monthly import files into month-specific folders"
echo ""
echo "📁 Files are now organized by:"
echo "  - Type (prompts, protocols, validation, summaries)"
echo "  - Month (for monthly-specific files)"
echo ""
echo "⚠️  IMPORTANT: No files were deleted, only moved to archive/"
