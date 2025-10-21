# Comprehensive 3-Way Transaction Verification Plan

**Objective**: Ensure 1:1 matching between Database, CSV, and PDF sources with zero duplicates

**Timeline**: Weekend (Auto-execution)

**Token Budget**: ~99,000 remaining

---

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Database   │     │  CSV File   │     │  PDF Files  │
│  (15,255)   │     │ (15,255?)   │     │  (102 PDFs) │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────┐
│           Transaction Fingerprinting                │
│  (date + description + amount + currency + type)    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              Cross-Reference Engine                 │
│  • DB ↔ CSV matching                               │
│  • CSV ↔ PDF matching                              │
│  • DB ↔ PDF matching                               │
│  • Duplicate detection                             │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│           Comprehensive Report Generation           │
│  • Missing transactions                            │
│  • Duplicate transactions                          │
│  • Discrepancies by month                          │
│  • Actionable recommendations                      │
└─────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Analysis

**Script**: `1-database-analyzer.js`

**Actions**:
1. Query all transactions for dennis@dsil.design
2. Extract full transaction details:
   - date, description, merchant, amount, currency, type
   - vendor_id → vendor name
   - payment_method_id → payment method name
   - tags via transaction_tags join
3. Create transaction fingerprints (SHA-256 hash)
4. Detect internal duplicates
5. Group by month for summary
6. Export to JSON: `verification-output/database-transactions.json`

**Output Structure**:
```json
{
  "totalCount": 15255,
  "byMonth": { "2025-10": 111, ... },
  "duplicates": [],
  "transactions": [
    {
      "id": "db_123",
      "fingerprint": "hash...",
      "date": "2025-10-01",
      "description": "...",
      "merchant": "...",
      "amount": 6.36,
      "currency": "USD",
      "type": "expense",
      "tags": ["Business Expense"],
      "source": "database"
    }
  ]
}
```

---

## Phase 2: CSV Deep Analysis

**Script**: `2-csv-deep-analyzer.js`

**Actions**:
1. Re-parse CSV with same logic as production import
2. Track source line numbers for traceability
3. Create transaction fingerprints (matching DB format)
4. Detect internal duplicates within CSV
5. Track which section each transaction came from (Expense/Income/Florida)
6. Export to JSON: `verification-output/csv-transactions.json`

**Output Structure**:
```json
{
  "totalCount": 15255,
  "byMonth": { "2025-10": 111, ... },
  "bySection": { "expense": 14283, "income": 972, "florida": 59 },
  "duplicates": [],
  "transactions": [
    {
      "id": "csv_line_1234",
      "fingerprint": "hash...",
      "sourceLineNumber": 1234,
      "section": "expense",
      "date": "2025-10-01",
      "description": "...",
      "merchant": "...",
      "amount": 6.36,
      "currency": "USD",
      "type": "expense",
      "source": "csv"
    }
  ]
}
```

---

## Phase 3: PDF Transaction Extraction

**Script**: `3-pdf-transaction-extractor.js`

**Actions**:
1. Parse all 102 PDFs with improved extraction
2. Use regex patterns to extract actual transaction rows
3. Parse each transaction: date, description, merchant, amount, currency
4. Create transaction fingerprints
5. Map to source PDF page number
6. Detect duplicates within and across PDFs
7. Export to JSON: `verification-output/pdf-transactions.json`

**Enhanced Parsing Strategy**:
- Expense section: Extract rows between date headers and "Daily Total"
- Income section: Extract rows with dollar amounts in "Amount" column
- Florida section: Extract rows with amounts in "Subtotal" column
- Handle multi-line descriptions
- Parse actual amounts and currencies from text

**Output Structure**:
```json
{
  "totalCount": ???,
  "byMonth": { "2025-10": ???, ... },
  "byPDF": { "page1": 111, ... },
  "duplicates": [],
  "transactions": [
    {
      "id": "pdf_page1_line_5",
      "fingerprint": "hash...",
      "sourcePDF": "page1",
      "sourceMonth": "2025-10",
      "date": "2025-10-01",
      "description": "...",
      "merchant": "...",
      "amount": 6.36,
      "currency": "USD",
      "type": "expense",
      "source": "pdf"
    }
  ]
}
```

---

## Phase 4: Duplicate Detection

**Script**: `4-duplicate-detector.js`

**Actions**:
1. Load all three sources
2. Within each source:
   - Find exact duplicates (same fingerprint)
   - Find near-duplicates (fuzzy match on description, same date/amount)
3. Across sources:
   - Find transactions appearing multiple times in import
4. Generate duplicate report with specific examples

**Detection Criteria**:
- **Exact**: Same fingerprint
- **Near**: Same date + amount + 80% description similarity
- **Suspicious**: Same merchant + amount within 1 day

---

## Phase 5: Cross-Reference Analysis

**Script**: `5-cross-reference-engine.js`

**Actions**:
1. Load all three transaction sets
2. Match fingerprints across sources:
   - DB → CSV matching
   - CSV → PDF matching
   - DB → PDF matching
3. Identify:
   - Transactions in DB but not in CSV (impossible, but check)
   - Transactions in CSV but not in DB (import failures)
   - Transactions in PDF but not in CSV (missing from export)
   - Transactions in PDF but not in DB (end-to-end verification)
4. Generate mismatch report with specific transaction details

**Output**: `verification-output/cross-reference-report.json`

---

## Phase 6: Master Orchestration

**Script**: `6-master-verification.js`

**Actions**:
1. Run all previous scripts in sequence
2. Aggregate all results
3. Generate comprehensive HTML report
4. Generate executive summary
5. Create actionable todo list for corrections

**Final Report Sections**:
1. Executive Summary
   - Total counts per source
   - Match percentages
   - Critical issues found
2. Detailed Findings
   - Missing transactions by month
   - Duplicate transactions
   - Discrepancies with examples
3. Month-by-Month Breakdown
   - Table showing all three sources side-by-side
4. Recommendations
   - Which months need manual review
   - Specific transactions to investigate
   - Next steps

---

## Execution Plan

**Auto-Execution Script**: `run-full-verification.sh`

```bash
#!/bin/bash

echo "🚀 Starting Comprehensive 3-Way Verification"
echo "Started at: $(date)"

mkdir -p verification-output

echo "\n📊 Phase 1: Database Analysis..."
node scripts/1-database-analyzer.js

echo "\n📊 Phase 2: CSV Deep Analysis..."
node scripts/2-csv-deep-analyzer.js

echo "\n📊 Phase 3: PDF Transaction Extraction..."
node scripts/3-pdf-transaction-extractor.js

echo "\n📊 Phase 4: Duplicate Detection..."
node scripts/4-duplicate-detector.js

echo "\n📊 Phase 5: Cross-Reference Analysis..."
node scripts/5-cross-reference-engine.js

echo "\n📊 Phase 6: Master Report Generation..."
node scripts/6-master-verification.js

echo "\n✅ Verification Complete!"
echo "Ended at: $(date)"
echo "\nReports available in verification-output/"
```

---

## Success Criteria

✅ **Phase 1-3**: All three sources extracted and fingerprinted
✅ **Phase 4**: Zero or identified duplicates with action plan
✅ **Phase 5**: 100% matching across all three sources
✅ **Phase 6**: Comprehensive report ready for Monday review

**Target**: 15,255 transactions perfectly matched across all three sources with zero unexplained discrepancies.
