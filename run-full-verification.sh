#!/bin/bash

# Master Verification Suite Auto-Execution Script
# Runs all 6 phases of transaction verification

set -e  # Exit on error

echo "================================================================================"
echo "MASTER VERIFICATION SUITE"
echo "================================================================================"
echo ""
echo "This will run a comprehensive 3-way verification of:"
echo "  - Database (Supabase)"
echo "  - CSV File (fullImport_20251017.csv)"
echo "  - PDF Files (102 reference PDFs)"
echo ""
echo "Estimated time: 5-10 minutes"
echo ""
echo "================================================================================"
echo ""

# Create output directory
mkdir -p verification-output

# Phase 1: Database Analysis
echo "Phase 1/6: Extracting and analyzing database transactions..."
echo "--------------------------------------------------------------------------------"
node scripts/1-database-analyzer.js
echo ""

# Phase 2: CSV Deep Analysis
echo "Phase 2/6: Deep analysis of CSV file..."
echo "--------------------------------------------------------------------------------"
node scripts/2-csv-deep-analyzer.js
echo ""

# Phase 3: PDF Extraction (longest phase)
echo "Phase 3/6: Extracting transactions from 102 PDF files..."
echo "--------------------------------------------------------------------------------"
echo "⏳ This may take several minutes..."
node scripts/3-pdf-transaction-extractor.js
echo ""

# Phase 4: Duplicate Detection
echo "Phase 4/6: Detecting duplicates within and across sources..."
echo "--------------------------------------------------------------------------------"
node scripts/4-duplicate-detector.js
echo ""

# Phase 5: Cross-Reference Analysis
echo "Phase 5/6: Cross-referencing all three sources..."
echo "--------------------------------------------------------------------------------"
node scripts/5-cross-reference-engine.js
echo ""

# Phase 6: Master Report Generation
echo "Phase 6/6: Generating comprehensive verification report..."
echo "--------------------------------------------------------------------------------"
node scripts/6-master-verification.js
echo ""

echo "================================================================================"
echo "✅ VERIFICATION COMPLETE!"
echo "================================================================================"
echo ""
echo "📊 Reports Generated:"
echo ""
echo "  HTML Report:"
echo "    verification-output/master-verification-report.html"
echo ""
echo "  Executive Summary:"
echo "    verification-output/executive-summary.json"
echo ""
echo "  Detailed Data:"
echo "    verification-output/database-transactions.json"
echo "    verification-output/csv-transactions.json"
echo "    verification-output/pdf-transactions.json"
echo "    verification-output/duplicate-analysis-report.json"
echo "    verification-output/cross-reference-report.json"
echo ""
echo "💡 Open the HTML report in your browser for a comprehensive overview."
echo ""
echo "================================================================================"
