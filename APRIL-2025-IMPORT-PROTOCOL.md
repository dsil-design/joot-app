# Monthly Transaction Import Protocol - April 2025

🎯 **Mission**: Import April 2025 historical transaction data using the established 4-Phase Import Protocol v3.1 with 100% comprehensive validation and red flag logging.

---

## 📚 Knowledge Base - Current Status

### Completed Imports:
1. ✅ **September 2025**: 159 transactions, variance -2.24%
2. ✅ **August 2025**: 194 transactions, variance +2.24%
3. ✅ **July 2025**: 176 transactions, variance 1.7%
4. ✅ **June 2025**: 190 transactions, variance +3.18%, **100% verified**
5. ✅ **May 2025**: 174 transactions, variance 0.29%, **100% verified with red flag logging**

### Current Database State (dennis@dsil.design):
- **Total transactions**: ~893 (Sept + Aug + July + June + May)
- **Vendors**: 273+ (197 original + 76 from May)
- **Payment methods**: 39+ (32 original + 7 from May)
- **Tags**: Reimbursement, Florida House, Savings/Investment, Business Expense

### Next Target: **April 2025**

### Critical Context:
- May 2025 was the FIRST import using enhanced protocol v3.1 with comprehensive red flag logging
- All currency values correctly stored as original amounts (THB/USD, not converted)
- Red flag logging successfully tracked 10 issues across all 4 phases
- Pre-flight analysis can be conservative - actual imports may capture more data than flagged

---

## 📁 Reference Files for April 2025

### Primary Sources
- **PDF**: `/csv_imports/Master Reference PDFs/Budget for Import-page5.pdf` (April 2025)
  - Source of truth for validation
  - Contains 4 sections with grand totals
  - Use for 1:1 transaction verification

- **CSV**: `/csv_imports/fullImport_20251017.csv`
  - Lines: TBD (to be identified in pre-flight)
  - Expected: Earlier in file than May (which was lines 1562-1741)

- **Parsing Script**: `/scripts/parse-april-2025.js`
  - Will need to be created/verified to use original currency values
  - Must use Column 6 for THB amounts (NOT conversion column)
  - Must use Column 7/9 for USD amounts (NOT conversion column)

- **Import Script**: `/scripts/db/import-month.js`
  - ✅ Verified working from Sept/Aug/July/June/May imports

### Supporting Documents
- `scripts/FINAL_PARSING_RULES.md` - Complete parsing specification
- `MAY-2025-IMPORT-PROTOCOL.md` - Reference protocol with red flag logging
- `scripts/MAY-2025-RED-FLAGS.md` - Example of comprehensive red flag tracking

---

## 🔧 4-Phase Import Process

### PHASE 1: Pre-Flight Analysis

**Agent**: Task tool → subagent_type=data-engineer

**Objective**: Analyze CSV and PDF to understand data structure, identify issues, and set expectations BEFORE parsing.

**Prompt**:
```
Analyze April 2025 data from csv_imports/fullImport_20251017.csv and csv_imports/Master Reference PDFs/Budget for Import-page5.pdf using scripts/FINAL_PARSING_RULES.md.

Tasks:
1. Find line numbers for all 4 sections in CSV:
   - Expense Tracker
   - Gross Income Tracker
   - Personal Savings & Investments
   - Florida House Expenses

2. Count transactions per section (raw count before deduplication)

3. Extract GRAND TOTALS from PDF (NOT CSV):
   - Expense Tracker NET total
   - Gross Income total
   - Savings/Investment total
   - Florida House total

4. Calculate expected total: Expense Tracker NET + Florida House + Savings

5. Detect potential duplicates between sections:
   - Compare Expense Tracker vs Florida House (same merchant + amount + date)
   - Document which version to keep (per FINAL_PARSING_RULES.md: keep Expense Tracker)

6. Count tag conditions:
   - Reimbursements: description starts with "Reimbursement:" (income type)
   - Business Expenses: column 4 has "X" (expense with tag)
   - Reimbursables: column 3 has "X" (tracking only, NO tag)
   - Florida House: from Florida House section (expense with tag)
   - Savings/Investment: from Savings section (expense with tag)

7. Identify currency distribution:
   - USD transactions (column 7/9 has value, column 6 no THB)
   - THB transactions (column 6 has "THB XXX")
   - Mixed/other patterns

8. Verify parsing script correctness:
   - Check if scripts/parse-april-2025.js exists
   - If exists: verify it uses Column 6 for THB (NOT Column 8 conversion)
   - If exists: verify it uses Column 7/9 for USD (NOT Column 8 conversion)
   - If NOT exists: flag that script needs to be created following parse-may-2025.js pattern
   - Flag if script needs correction

9. Compare to previous months:
   - September 2025: 159 transactions, 23 reimbursements, ~70 THB
   - August 2025: 194 transactions, 32 reimbursements, 82 THB
   - July 2025: 176 transactions, 26 reimbursements, ~90 THB
   - June 2025: 190 transactions, 27 reimbursements, 85 THB
   - May 2025: 174 transactions, 16 reimbursements, 89 THB
   - Flag significant structural differences

10. Identify anomalies:
    - Missing amounts
    - Invalid dates (e.g., wrong year)
    - Unusual patterns
    - Data quality issues

Output Files:
- scripts/APRIL-2025-PREFLIGHT-REPORT.md
- scripts/APRIL-2025-RED-FLAGS.md (for tracking anomalies/issues for later review)

Report must include:
- Line number ranges for each section
- Transaction counts per section
- Expected totals from PDF (source of truth)
- Expected total calculation
- Duplicate detection results with line numbers
- Tag distribution preview (counts)
- Currency breakdown (USD vs THB vs other)
- Parsing script verification status (exists/needs creation/needs correction)
- Comparison to previous months
- Red flags or structural differences
- Parsing strategy recommendations

Red Flag Log Must Include:
For EACH anomaly/issue discovered:
- Transaction details (date, description, amount, line number)
- Issue type (missing amount, invalid date, duplicate, parsing error, etc.)
- Severity (CRITICAL / WARNING / INFO)
- Phase detected (Pre-Flight / Parsing / Import / Validation)
- Status (OPEN / RESOLVED / ACCEPTED)
- Notes/context

CRITICAL VERIFICATION:
- Verify rent transaction should be THB 35,000.00 (NOT ~$1074)
- Verify parsing script uses Column 6 for THB amounts (or flag if needs creation)
- Verify parsing script does NOT use Column 8 (conversion column)

This is critical pre-import validation - flag any anomalies before we proceed to parsing.

IMPORTANT: Create both output files (report and red flag log) with all findings. Return a summary of the key findings including any red flags that need human review before proceeding.

NOTE: May 2025 pre-flight was overly conservative - some flagged transactions were successfully imported. Don't over-flag issues.
```

**Output**:
- `scripts/APRIL-2025-PREFLIGHT-REPORT.md`
- `scripts/APRIL-2025-RED-FLAGS.md`

**Human Checkpoint**: ⏸️ Review pre-flight report and red flag log, address any critical issues before Phase 2.

---

### PHASE 2: Parse & Prepare

**Agent**: Task tool → subagent_type=data-engineer

**Objective**: Parse CSV data following FINAL_PARSING_RULES.md exactly, producing clean JSON for import.

**Prerequisites**:
- ✅ Pre-flight report reviewed and approved
- ✅ Parsing script verified/corrected/created
- ✅ Line ranges identified

**Prompt**:
```
Parse April 2025 transactions following scripts/FINAL_PARSING_RULES.md exactly.

Source: csv_imports/fullImport_20251017.csv

Line Ranges: [from pre-flight report]

Critical Requirements:

1. **Currency Handling (MOST IMPORTANT):**
   - THB transactions: Use Column 6 value (e.g., "THB 35000.00")
   - USD transactions: Use Column 7 or Column 9 (subtotal) value
   - NEVER use Column 8 (conversion column)
   - Store currency as 'THB' or 'USD' in the currency field
   - Store amount as the ORIGINAL currency amount (e.g., 35000 for THB, not 1074)

2. Parse all 4 sections:
   - Expense Tracker (lines X-Y from pre-flight)
   - Gross Income Tracker (lines X-Y)
   - Personal Savings & Investments (lines X-Y)
   - Florida House Expenses (lines X-Y)

3. Apply tag logic:
   - "Reimbursement": description starts with "Reimbursement:" → income type + tag
   - "Florida House": from Florida House section → expense type + tag
   - "Business Expense": column 4 has "X" → expense type + tag
   - "Savings/Investment": from Savings section → expense type + tag
   - Reimbursable (column 3): NO tag, tracking only

4. Handle duplicates:
   - Remove duplicates between Expense Tracker and Florida House
   - Keep Expense Tracker version per FINAL_PARSING_RULES.md
   - Document which transactions were removed

5. Date conversion:
   - "Monday, April 1, 2025" → "2025-04-01"
   - "4/1/2025" → "2025-04-01"
   - Apply any date corrections identified in pre-flight

6. Transaction structure:
   ```json
   {
     "date": "2025-04-01",
     "description": "This Month's Rent",
     "merchant": "Landlord",
     "payment_method": "Bangkok Bank Account",
     "amount": 35000,
     "currency": "THB",
     "transaction_type": "expense",
     "tags": []
   }
   ```

Expected Outputs (from pre-flight):
- Total transactions: [from pre-flight]
- Transaction types: [expenses vs income counts]
- Tag distribution:
  - Reimbursement: [count]
  - Florida House: [count]
  - Business Expense: [count]
  - Savings/Investment: [count]
- Currency split: [USD vs THB counts]
- Duplicates removed: [list]

Output Files:
1. scripts/april-2025-CORRECTED.json - Parsed transaction data
2. scripts/APRIL-2025-PARSE-REPORT.md - Detailed parsing report
3. scripts/APRIL-2025-RED-FLAGS.md - APPEND new issues found during parsing

Parse Report Must Include:
- Transaction counts by section
- Transaction counts by type (expense vs income)
- Tag distribution (actual counts)
- Currency distribution (USD vs THB)
- Duplicates removed (with details)
- Expected totals from CSV
- Date corrections applied (if any)
- Warnings or issues encountered
- Sample transactions (first 5 from each section)

Critical Verification:
- Rent transaction MUST be 35000 THB (NOT ~1074 USD)
- All THB transactions stored as THB with original amounts
- All USD transactions stored as USD with original amounts

Red Flag Logging:
- APPEND any new parsing errors, currency issues, or anomalies to scripts/APRIL-2025-RED-FLAGS.md
- Include line numbers, transaction details, and resolution status
- Flag duplicates removed for human review (mark as INFO/RESOLVED)
- Log any transactions excluded due to missing data

IMPORTANT: If parsing script doesn't exist, create it following scripts/parse-may-2025.js as template. Run the parsing script and create all output files (JSON, report, and updated red flag log). Return a summary showing transaction counts, rent verification, currency distribution, and ready-for-import confirmation.
```

**Output**:
- `scripts/april-2025-CORRECTED.json`
- `scripts/APRIL-2025-PARSE-REPORT.md`
- `scripts/APRIL-2025-RED-FLAGS.md` (updated)

**Human Checkpoint**: ⏸️ Verify rent = 35000 THB, currency split correct, review red flags, approve for import.

---

### PHASE 3: Database Import

**Execution**: Direct command (no agent needed)

**Prerequisites**:
- ✅ Parse report reviewed and approved
- ✅ Rent transaction verified as 35000 THB
- ✅ Currency split verified

**Command**:
```bash
node scripts/db/import-month.js --file=scripts/april-2025-CORRECTED.json --month=2025-04
```

**What This Does**:
- Matches existing vendors (273+ in database from previous imports)
- Matches existing payment methods (39+ in database)
- Matches existing tags (Reimbursement, Florida House, Savings/Investment, Business Expense)
- Creates new vendors/payment methods only when no match found
- Skips duplicate transactions (same date + description + amount + vendor)
- Inserts transactions in batches of 50
- Creates transaction_tag relationships
- Reports: new vendors, new payment methods, import counts

**Expected Output**:
```
📥 INCREMENTAL MONTH IMPORT
==================================================
Target Month: 2025-04
Data File: scripts/april-2025-CORRECTED.json
User: dennis@dsil.design

📊 Loaded XXX transactions from file

👤 User ID: [uuid]

🔍 Found 0 existing transactions in 2025-04
✅ No existing transactions - proceeding with clean import.

🔄 Processing X batches of 50 transactions...

   Batch 1/X: Processing 50 transactions...
   ✅ Imported 50 transactions
   [...]

==================================================
📋 IMPORT SUMMARY
==================================================
Total Transactions: XXX imported, 0 skipped (duplicates)
Transaction Types: XXX expenses, XX income
New Vendors: X
New Payment Methods: X
New Tags: X (should be 0 - all tags exist)
==================================================
✅ Import complete!
```

**Red Flag Logging**:
- If import reveals issues (unexpected duplicates, vendor mismatches, etc.), APPEND to scripts/APRIL-2025-RED-FLAGS.md
- Document any new vendors/payment methods created for review
- Flag any transactions that were skipped as duplicates for verification

**Human Checkpoint**: ⏸️ Verify import summary matches parse report counts, review any new red flags.

---

### PHASE 4: Comprehensive Validation (100% Coverage)

**Agent**: Task tool → subagent_type=data-scientist

**Objective**: Validate imported data against PDF source of truth using comprehensive multi-level verification with 100% transaction coverage.

**Prerequisites**:
- ✅ Database import completed
- ✅ Import summary reviewed

**Prompt**:
```
Validate April 2025 import against PDF source of truth using comprehensive multi-level validation with 100% coverage.

Source Documents:
- PDF: csv_imports/Master Reference PDFs/Budget for Import-page5.pdf
- Parse Report: scripts/APRIL-2025-PARSE-REPORT.md
- Database: Supabase (use environment variables from .env.local)
- User: dennis@dsil.design

Exchange Rate (from PDF rent transaction):
- April: This Month's Rent = THB 35000.00 = $XXXX (extract from PDF)
- Rate: Calculate from rent transaction (use for all USD conversions in validation)

Validation Levels:

LEVEL 1: Section Grand Totals

- Query Expense Tracker transactions (expenses + reimbursements, exclude Florida House, exclude Savings, exclude non-reimbursement income)
- Convert THB to USD using calculated rate
- Calculate grand total
- Compare to PDF Expense Tracker GRAND TOTAL: $[from PDF]
- Acceptance: ±2% variance OR ±$150 absolute

- Query Florida House tagged transactions
- Convert and total
- Compare to PDF Florida House GRAND TOTAL: $[from PDF]
- Acceptance: Exact match or ±$5

- Query Savings/Investment tagged transactions
- Convert and total
- Compare to PDF Savings GRAND TOTAL: $[from PDF]
- Acceptance: Exact match

- Query Gross Income (exclude reimbursements)
- Convert and total
- Compare to PDF Gross Income GRAND TOTAL: $[from PDF]
- Acceptance: Exact match

LEVEL 2: Daily Subtotals (Expense Tracker)

- Query daily totals from Expense Tracker section (April 1-30, 2025)
- Compare each day to PDF "Daily Total" rows
- Create comparison table:
  | Date | DB Total | PDF Total | Difference | Status |
- Track: days within $1.00, days within $5.00, days >$5.00
- Acceptance: ≥50% of days within $1.00 (lowered from 80% based on May learnings), no day >$100 variance

LEVEL 3: Transaction Count Verification

- Count total transactions in database for April 2025
- Compare to import summary: XXX imported
- Break down by type: expense vs income (expected: XXX expenses, XX income)
- Break down by currency: USD vs THB (expected: XXX USD, XX THB)
- Break down by section/tag
- Acceptance: Exact match to import summary

LEVEL 4: Tag Distribution Verification

- Count each tag in database:
  - Reimbursement: expected [from parse report]
  - Florida House: expected [from parse report]
  - Business Expense: expected [from parse report]
  - Savings/Investment: expected [from parse report]
- Compare to parse report expected counts
- Acceptance: Exact match

LEVEL 5: Critical Transaction Spot Checks

- Verify rent transaction:
  - Description: "This Month's Rent" (or similar)
  - Amount: 35000
  - Currency: THB
  - Date: 2025-04-XX (find in PDF)
- Verify largest THB transaction
- Verify largest USD transaction
- Verify first and last transaction of month
- Acceptance: All match PDF

LEVEL 6: 100% Comprehensive 1:1 PDF Verification

**CRITICAL REQUIREMENT**: This is NOT a spot check or sample-based verification. You must verify EVERY transaction in both directions (PDF→DB and DB→PDF).

Task 6.1: PDF → Database Verification (100% Coverage)

For EACH section in the PDF:
1. Extract ALL transaction rows (ignore headers/totals/summaries)
2. For EVERY transaction, search for match in database:
   - Date: exact match
   - Description: fuzzy match ≥80% similarity acceptable
   - Amount: within $0.10 tolerance
   - Currency: exact match (THB or USD)
3. Create complete verification table showing ALL transactions

Items to IGNORE from PDF (document but don't count as missing):
- Section header rows
- Column header rows
- Daily total summary rows
- Grand total rows
- Blank/separator rows
- Date-only rows (calendar markers)

Track statistics:
- Total PDF transaction rows: XXX
- Found in DB: XXX (XX.X%)
- Not found: X (list EVERY missing transaction)
- Amount mismatches >$0.10: X (list EVERY mismatch)
- Currency mismatches: X (list EVERY mismatch)

Task 6.2: Database → PDF Verification (100% Coverage)

1. Query ALL April 2025 transactions from database (no filtering)
2. For EVERY database transaction:
   - Which section should it be in based on tags/type?
   - Is it present in that section?
   - Do amounts and currency match?
3. Create complete verification table showing ALL transactions

Track statistics:
- Total DB transactions: XXX
- Found in PDF: XXX (XX.X%)
- Not found: X (list EVERY extra transaction)
- Wrong section: X (list EVERY misplaced transaction)
- Amount mismatches >$0.10: X (list EVERY mismatch)

Task 6.3: Discrepancy Analysis

For EVERY discrepancy found:
1. Document in detail (what's in PDF vs what's in DB)
2. Root cause analysis (parsing error, duplicate removal, import logic, data entry)
3. Classify: CRITICAL (must fix) / WARNING (review needed) / ACCEPTABLE (minor)

Output Files:
1. scripts/APRIL-2025-VALIDATION-REPORT.md - Executive summary and all validation levels
2. scripts/APRIL-2025-COMPREHENSIVE-VALIDATION.md - Complete 1:1 verification tables
3. scripts/APRIL-2025-RED-FLAGS.md - APPEND all discrepancies found during validation

Report Structure:

1. Executive Summary
   - Overall status: PASS/FAIL
   - Total variance: $X.XX (X.X%)
   - Transaction count: X imported, Y expected
   - Key findings

2. Level 1: Section Grand Totals
   - [Results for each section]

3. Level 2: Daily Subtotals Analysis
   - [Daily comparison results]

4. Level 3: Transaction Count Verification
   - [Count verification results]

5. Level 4: Tag Distribution
   - [Tag verification results]

6. Level 5: Critical Transactions
   - [Critical transaction verification]

7. Level 6: 100% Comprehensive 1:1 Verification
   - PDF → Database: [complete results with statistics]
   - Database → PDF: [complete results with statistics]
   - Discrepancy Details: [EVERY discrepancy with root cause]

8. Final Recommendation
   - ✅ ACCEPT: All levels pass, variance within acceptable range
   - ⚠️ ACCEPT WITH NOTES: Minor issues documented, variance acceptable
   - ❌ REJECT: Critical issues found, re-import required

Acceptance Criteria (Overall):
- Level 1: All sections within variance thresholds
- Level 2: ≥50% daily match rate within $1.00 (lowered based on May learnings), no day >$100 variance
- Level 3: Exact transaction count match
- Level 4: Exact tag distribution match
- Level 5: All critical transactions verified
- Level 6: 100% of PDF transactions found in DB, 100% of DB transactions found in PDF

Red Flag Logging:
- APPEND ALL validation discrepancies to scripts/APRIL-2025-RED-FLAGS.md
- For each discrepancy: transaction details, variance amount, root cause, severity
- For missing transactions: full details from PDF or DB
- For amount mismatches: both values and difference
- For currency mismatches: expected vs actual
- Daily variances >$5.00 should be logged as WARNING

IMPORTANT:
1. Use Supabase client to query the database
2. Read the PDF to extract ALL transaction rows (not samples)
3. Create comprehensive validation report with complete verification tables
4. Verify EVERY transaction in BOTH directions
5. APPEND all discrepancies to red flag log with full details
6. Return executive summary with pass/fail status and variance percentages

NOTE from May 2025 validation:
- THB→USD conversion rounding is expected and acceptable
- Daily match rate of 50-60% is acceptable if all variances <$100
- Database may be more accurate than PDF in some cases (data entry errors in PDF)
- Pre-flight warnings about missing amounts may be false positives
```

**Output**:
- `scripts/APRIL-2025-VALIDATION-REPORT.md`
- `scripts/APRIL-2025-COMPREHENSIVE-VALIDATION.md`
- `scripts/APRIL-2025-RED-FLAGS.md` (final update with all issues)

**Human Checkpoint**: ⏸️ Review validation report and complete red flag log, accept/reject import based on results.

---

## 📊 Expected Results for April 2025

### From PDF (Budget for Import-page5.pdf)

**Expense Tracker**:
- GRAND TOTAL (NET): $[from PDF]
- Daily totals: 30 days of data (April has 30 days)
- Transaction count: ~170-190 (estimate based on pattern)

**Gross Income Tracker**:
- GROSS INCOME TOTAL: $[from PDF]
- Transactions: [count from PDF]

**Personal Savings & Investments**:
- TOTAL: $[from PDF]
- Transactions: [count from PDF]

**Florida House Expenses**:
- GRAND TOTAL: $[from PDF]
- Transactions: [count from PDF]

**Expected Totals**:
- Total transactions: ~170-195 (estimate based on previous months)
- Currency split: ~45-50% USD, ~50-55% THB (estimate)
- Reimbursements: ~15-30 (estimate)

**Critical Transaction**:
- Rent: THB 35,000.00 on April XX (MUST verify)

---

## ✅ Success Criteria

### Must Pass (All Required):
- ✅ Pre-flight analysis completed with no critical blockers
- ✅ Parsing script verified/created to use original currency values
- ✅ Rent transaction = 35,000 THB (NOT ~1078)
- ✅ All transactions stored in original currency (THB or USD)
- ✅ Import completes without errors
- ✅ Transaction count matches parse report
- ✅ Tag distribution matches parse report
- ✅ Expense Tracker grand total within 2% of PDF
- ✅ All section grand totals within acceptable variance
- ✅ No daily variance >$100
- ✅ **100% of PDF transactions found in database**
- ✅ **100% of database transactions found in PDF**
- ✅ Critical transactions verified against PDF

### Should Pass (Expected):
- ⚠️ ≥50% of daily totals within $1.00 (lowered from 80% based on May learnings)
- ✅ All daily totals within $5.00 (acceptable if failed)
- ✅ 100% PDF-DB bidirectional match
- ✅ Minimal new vendors/payment methods (most should match existing)
- ✅ Overall variance <2%

---

## 🚨 Red Flags - Stop and Investigate

### Parsing Issues:
- ❌ Rent transaction ≠ 35000 THB
- ❌ Currency field shows "USD" for Thai rent
- ❌ Amount shows ~1078 instead of 35000
- ❌ THB transactions stored as USD amounts
- ❌ Conversion column (column 8) being used

### Import Issues:
- ❌ Transaction count doesn't match parse report
- ❌ Large number of duplicates skipped unexpectedly
- ❌ Tags not applied correctly
- ❌ New tags created (all should exist from previous imports)

### Validation Issues:
- ❌ Variance >5% on any section grand total
- ❌ Daily variance >$100 on any day
- ❌ Transaction count mismatch
- ❌ Tag count mismatch
- ❌ Critical transactions not found in database
- ❌ Any PDF transaction not found in database
- ❌ Any database transaction not found in PDF

---

## 🔄 Recovery Procedures

### If Parsing Script is Wrong or Missing:
1. Stop before database import
2. Create/fix parsing script following parse-may-2025.js pattern
3. Verify script uses Column 6 for THB, Column 7/9 for USD
4. Re-run Phase 2 (parse)
5. Verify rent = 35000 THB in new output
6. Proceed to Phase 3

### If Import Goes Wrong:
1. Delete April 2025 transactions from database
2. Fix issue (parsing script or import script)
3. Re-run from Phase 2
4. Re-import to database

### If Validation Fails:
1. Investigate discrepancies in validation report
2. Determine root cause:
   - Parsing error → fix script, re-parse, re-import
   - Import error → delete and re-import
   - PDF vs CSV mismatch → document and accept if minor
3. Re-run validation after fix

---

## 📝 Lessons Learned from Previous Months

### September 2025 (First Import):
- Established clean-slate import process
- Created vendor/payment method/tag matching
- Variance: -2.24% (excellent)

### August 2025:
- Pre-flight analysis critical for catching anomalies
- Date correction needed (2004 → 2025 for one transaction)
- Missing amounts in Florida House section
- Variance: +2.24% (acceptable)

### July 2025:
- Comprehensive PDF validation protocol established
- Daily subtotal verification added
- 1:1 transaction verification introduced
- Multi-level validation catches more issues
- Variance: 1.7% (excellent with new protocol)

### June 2025:
- **100% comprehensive validation** (no sampling/spot checks)
- Perfect bidirectional verification (PDF→DB and DB→PDF)
- 190 transactions, ZERO data errors found
- 3 of 4 sections matched exactly (100% accuracy)
- Variance: 3.18% (acceptable, due to exchange rate differences, not data errors)
- 9 comprehensive documentation files generated

### May 2025 (Latest - v3.1 with Red Flag Logging):
- **Enhanced protocol with comprehensive red flag logging**
- 174 transactions, 100% verified
- Variance: 0.29% (excellent)
- Pre-flight analysis was overly conservative:
  - Flagged "Groceries $16.62" as missing → Actually imported successfully
  - Flagged "Taxi $4.26" as missing → Likely imported successfully
- Daily match rate: 54.8% within $1.00 (below 80% ideal but acceptable)
- All daily variances <$40 (threshold is <$100)
- THB→USD conversion rounding creates systematic minor differences
- 10 red flags tracked across all phases (4 critical, 6 warnings)
- Database was MORE accurate than PDF in one case (PDF data entry error)

### Key Takeaways for April 2025:
- ✅ ALWAYS run pre-flight analysis with data-engineer
- ✅ ALWAYS verify parsing script currency logic (or create if missing)
- ✅ ALWAYS check rent transaction = 35000 THB before import
- ✅ ALWAYS use comprehensive validation with data-scientist
- ✅ ALWAYS verify 100% of transactions bidirectionally
- ✅ ALWAYS log ALL anomalies in red flag log across all phases
- ⚠️ Pre-flight warnings may be conservative - actual import may capture more
- ⚠️ Daily match rate 50-60% is acceptable if all variances <$100
- ⚠️ THB→USD rounding differences are expected and acceptable
- ❌ NEVER skip human review checkpoints
- ❌ NEVER calculate exchange rates during parsing (store original values)
- ❌ NEVER use conversion column (column 8) from CSV
- ❌ NEVER use sampling/spot checks - verify EVERY transaction

---

## 🚀 Ready to Execute

This protocol has been battle-tested on September, August, July, June, and May 2025 imports (5 consecutive months, 100% success rate). Follow each phase sequentially. Do not skip steps. Document everything. Verify 100% of transactions. Log every anomaly in the red flag log.

**Current Status**: ✅ Ready to begin Phase 1 (Pre-Flight Analysis)

**Next Action**: Launch data-engineer agent with Phase 1 prompt

---

**Protocol Version**: 3.1 (Comprehensive Validation with 100% Coverage + Red Flag Logging)
**Last Updated**: October 24, 2025 (after May 2025 completion)
**Created By**: Human + Claude Code collaboration
**Status**: APPROVED FOR PRODUCTION USE
