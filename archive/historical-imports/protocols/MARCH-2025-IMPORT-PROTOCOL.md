# Monthly Transaction Import Protocol - March 2025

🎯 **Mission**: Import March 2025 historical transaction data using the established 4-Phase Import Protocol v3.1 with 100% comprehensive validation and red flag logging.

---

## 📚 Knowledge Base - Current Status

### Completed Imports:
1. ✅ **September 2025**: 159 transactions, variance -2.24%
2. ✅ **August 2025**: 194 transactions, variance +2.24%
3. ✅ **July 2025**: 176 transactions, variance 1.7%
4. ✅ **June 2025**: 190 transactions, variance +3.18%, **100% verified**
5. ✅ **May 2025**: 174 transactions, variance 0.29%, **100% verified with red flag logging**
6. ✅ **April 2025**: 182 transactions, **3 user corrections**, **8 tag fixes**, variance TBD

### Current Database State (dennis@dsil.design):
- **Total transactions**: ~1,075 (Sept + Aug + July + June + May + April)
- **Vendors**: 273+ (197 original + 76 from May + new from April)
- **Payment methods**: 39+ (32 original + 7 from May + new from April)
- **Tags**: Reimbursement, Florida House, Savings/Investment, Business Expense

### Next Target: **March 2025**

### Critical Context:
- **April 2025 Lessons Learned**:
  - 3 data corrections needed pre-import (negative amounts, currency errors)
  - 8 tag fixes needed post-import (missing/incorrect tags)
  - Parsing script needed to be created
  - Tag validation revealed: DSIL income incorrectly tagged, CNX utilities incorrectly tagged
- **Protocol Version**: 3.1 (with Red Flag Logging established in May, refined in April)
- **March follows April chronologically** - expect similar patterns

---

## 📁 Reference Files for March 2025

### Primary Sources
- **PDF**: `/csv_imports/Master Reference PDFs/Budget for Import-page8.pdf` (March 2025)
  - **Page Number Calculation**: October 2025 = page1, March 2025 = page8 (7 months back)
  - **Reference**: See `PDF-MONTH-MAPPING.md` for complete page number pattern
  - Source of truth for validation
  - Contains 4 sections with grand totals
  - Use for 1:1 transaction verification
  - **⚠️ CRITICAL PDF VERIFICATION STEP**:
    - **ALWAYS verify the PDF contains the correct month BEFORE starting analysis**
    - Check first transaction date in PDF (e.g., "Thursday, March 1, 2025" or "Friday, March 2, 2025")
    - If PDF shows ANY other month (e.g., May, April), STOP immediately
    - Report: "PDF verification failed - file contains [MONTH] data, not March 2025"
    - Expected PDF based on pattern: page8 (7 months back from October 2025)
    - If verification fails, consult `PDF-MONTH-MAPPING.md` or ask user for correct path

- **CSV**: `/csv_imports/fullImport_20251017.csv`
  - Lines: TBD (to be identified in pre-flight)
  - Expected: BEFORE April's lines 1802-2098
  - Pattern suggests: ~1500-1700 range (estimate)

- **Parsing Script**: `/scripts/parse-march-2025.js`
  - **STATUS**: Likely does NOT exist - will need to be created
  - **MUST** use Column 6 for THB amounts (NOT conversion column)
  - **MUST** use Column 7/9 for USD amounts (NOT conversion column)
  - Use `parse-april-2025.js` or `parse-may-2025.js` as template

- **Import Script**: `/scripts/db/import-month.js`
  - ✅ Verified working from all previous imports (Sept through April)

### Supporting Documents
- `scripts/FINAL_PARSING_RULES.md` - Complete parsing specification
- `MAY-2025-IMPORT-PROTOCOL.md` - Original protocol v3.1
- `APRIL-2025-IMPORT-PROMPT.md` - Recent import with lessons learned
- `scripts/MAY-2025-RED-FLAGS.md` - Example of red flag logging
- `scripts/APRIL-2025-RED-FLAGS.md` - Recent red flag examples

---

## 🚨 CRITICAL LESSONS FROM APRIL 2025

### Pre-Flight Issues Found:
1. **Negative Amount #1** (Line 1988):
   - Transaction: Dinner at Madame Koh
   - Issue: -THB 1,030.00 (negative expense)
   - Resolution: Changed to +THB 1,030.00 (data entry error)
   - **Lesson**: Check for $(xxx) or negative signs in expense rows

2. **Currency Error** (Line 1868):
   - Transaction: Monthly Cleaning - BLISS
   - Issue: $2,782.00 USD (way too high for cleaning)
   - Resolution: Changed to THB 2,782.00 (~$82 USD)
   - **Lesson**: Cross-reference large amounts against previous months

3. **Negative Amount #2** (Line 1955):
   - Transaction: Partial Refund: Business Insurance
   - Issue: -$30.76 expense (violates database constraint)
   - Resolution: Changed to +$30.76 income (legitimate refund)
   - **Lesson**: Refunds should be income with positive amounts

### Post-Import Tag Issues:
4. **Missing Reimbursement Tags** (4 transactions):
   - Groceries, lunches, dinner with "Reimbursement:" prefix but no tag
   - **Lesson**: Verify ALL income starting with "Reimbursement:" gets tagged

5. **Incorrect Reimbursement Tag** (1 transaction):
   - "Reimbursement: 2025 Estimated Tax Payment" from DSIL Design
   - **NOT a reimbursement** - it's company income
   - **Lesson**: DSIL Design/LLC income should NEVER be tagged as Reimbursement

6. **Incorrect Florida House Tag** (1 transaction):
   - CNX Water Bill (THB 592.99) - Chiang Mai utility, not Florida
   - **Lesson**: CNX/Chiang Mai bills are NOT Florida House

7. **Missing Florida House Tags** (2 transactions):
   - Electricity Bill $34.31 - missing tag
   - FL House Internet $73.00 - missing tag
   - **Lesson**: Verify ALL Florida House section transactions get tagged

### Key Takeaways for March:
- **Pre-flight MUST flag**: Negative amounts, unusually large values, currency anomalies
- **Parsing MUST handle**: User corrections from pre-flight review
- **Validation MUST check**: Tag distribution matches expected counts
- **Tag logic MUST exclude**: DSIL income from Reimbursement, CNX bills from Florida House

---

## 🔧 4-Phase Import Process

### PHASE 1: Pre-Flight Analysis

**Agent**: Task tool → subagent_type=data-engineer

**Objective**: Analyze CSV and PDF to understand data structure, identify issues, and set expectations BEFORE parsing.

**Prompt**:
```
Analyze March 2025 data from csv_imports/fullImport_20251017.csv and csv_imports/Master Reference PDFs/Budget for Import-page8.pdf using scripts/FINAL_PARSING_RULES.md.

**STEP 0 - CRITICAL PDF VERIFICATION (DO THIS FIRST)**:
Before starting any analysis, you MUST verify the PDF contains March 2025 data:
1. Read: csv_imports/Master Reference PDFs/Budget for Import-page8.pdf
2. Find the first transaction date in the "Expense Tracker" section
3. Verify it shows "March 2025" (e.g., "Thursday, March 1, 2025" or "Friday, March 2, 2025")
4. If PDF shows ANY other month (e.g., May 2025, April 2025), STOP IMMEDIATELY
5. Report to user: "PDF verification failed - Budget for Import-page8.pdf contains [ACTUAL MONTH] data, not March 2025"
6. Note: Expected page number is 8 (October 2025 = page1, March = 7 months back = page8)
7. Consult PDF-MONTH-MAPPING.md or ask user for correct path before continuing

Only proceed with tasks 1-10 below if Step 0 passes (PDF contains March 2025 data).

Tasks:
1. Find line numbers for all 4 sections in CSV:
   - Expense Tracker
   - Gross Income Tracker
   - Personal Savings & Investments
   - Florida House Expenses

   NOTE: March 2025 should be BEFORE April 2025 (lines 1802-2098) in the CSV.

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
   - NOTE from April: Sometimes the "duplicate" needs to stay in Florida House for totals to match

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
   - Check if scripts/parse-march-2025.js exists
   - If exists: verify it uses Column 6 for THB (NOT Column 8 conversion)
   - If exists: verify it uses Column 7/9 for USD (NOT Column 8 conversion)
   - If NOT exists: flag that script needs to be created following parse-april-2025.js or parse-may-2025.js pattern
   - Flag if script needs correction

9. Compare to previous months:
   - September 2025: 159 transactions, 23 reimbursements, ~70 THB
   - August 2025: 194 transactions, 32 reimbursements, 82 THB
   - July 2025: 176 transactions, 26 reimbursements, ~90 THB
   - June 2025: 190 transactions, 27 reimbursements, 85 THB
   - May 2025: 174 transactions, 16 reimbursements, 89 THB
   - April 2025: 182 transactions, 22 reimbursements, 93 THB
   - Flag significant structural differences

10. Identify anomalies (CRITICAL - LESSONS FROM APRIL):
    - **Negative amounts**: Check for $(xxx) or negative signs in expense rows
    - **Unusually large amounts**: Flag USD amounts >$1000 that seem abnormal for recurring expenses
    - **Currency errors**: Compare recurring expenses (rent, cleaning, utilities) to previous months
    - Missing amounts
    - Invalid dates (e.g., wrong year)
    - Unusual patterns
    - Data quality issues

Output Files:
- scripts/MARCH-2025-PREFLIGHT-REPORT.md
- scripts/MARCH-2025-RED-FLAGS.md (for tracking anomalies/issues for later review)

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
- **Negative amounts flagged** (with line numbers)
- **Unusually large amounts flagged** (with context from previous months)
- **Currency anomalies flagged** (comparing to typical patterns)
- Red flags or structural differences
- Parsing strategy recommendations

Red Flag Log Must Include:
For EACH anomaly/issue discovered:
- Transaction details (date, description, amount, line number)
- Issue type (missing amount, invalid date, duplicate, parsing error, negative amount, currency error, etc.)
- Severity (CRITICAL / WARNING / INFO)
- Phase detected (Pre-Flight / Parsing / Import / Validation)
- Status (OPEN / RESOLVED / ACCEPTED)
- Notes/context
- **Comparison to previous months** (if applicable)

CRITICAL VERIFICATION:
- Verify rent transaction should be THB 35,000.00 (NOT ~$1074)
- Verify parsing script uses Column 6 for THB amounts (or flag if needs creation)
- Verify parsing script does NOT use Column 8 (conversion column)
- **Flag ANY negative amounts for user review**
- **Flag ANY unusually large recurring expense amounts**

This is critical pre-import validation - flag any anomalies before we proceed to parsing.

IMPORTANT: Create both output files (report and red flag log) with all findings. Return a summary of the key findings including any red flags that need human review before proceeding.

NOTE: April 2025 pre-flight was effective at catching issues - aim for similar thoroughness. Don't over-flag but don't under-flag either.
```

**Output**:
- `scripts/MARCH-2025-PREFLIGHT-REPORT.md`
- `scripts/MARCH-2025-RED-FLAGS.md`

**Human Checkpoint**: ⏸️ Review pre-flight report and red flag log, address any critical issues before Phase 2. Confirm corrections for any negative amounts, currency errors, or other anomalies.

---

### PHASE 2: Parse & Prepare

**Agent**: Task tool → subagent_type=data-engineer

**Objective**: Parse CSV data following FINAL_PARSING_RULES.md exactly, producing clean JSON for import.

**Prerequisites**:
- ✅ Pre-flight report reviewed and approved
- ✅ Parsing script verified/corrected/created
- ✅ Line ranges identified
- ✅ User corrections confirmed for any red flags

**Prompt**:
```
Parse March 2025 transactions following scripts/FINAL_PARSING_RULES.md exactly.

Source: csv_imports/fullImport_20251017.csv

Line Ranges: [from pre-flight report]

**USER-CONFIRMED CORRECTIONS** (if any from Phase 1):
[List any corrections confirmed by user during pre-flight review]
Example from April:
- Line XXXX: Negative amount → positive amount
- Line YYYY: Currency USD → THB
- Line ZZZZ: Negative expense → positive income

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

   **CRITICAL EXCEPTIONS** (learned from April):
   - If description contains "Reimbursement:" BUT merchant is "DSIL Design" or "DSIL LLC":
     → This is company income, NOT a reimbursement
     → Type: income, Tags: EMPTY (no Reimbursement tag)
   - If transaction is from Florida House section BUT description contains "CNX" or "Chiang Mai":
     → This is Thailand expense, NOT Florida
     → Review with user before tagging as Florida House

4. Handle duplicates:
   - Remove duplicates between Expense Tracker and Florida House
   - Keep Expense Tracker version per FINAL_PARSING_RULES.md
   - Document which transactions were removed
   - **NOTE from April**: If validation fails, may need to add Florida House tag to "duplicate"

5. Date conversion:
   - "Monday, March 1, 2025" → "2025-03-01"
   - "3/1/2025" → "2025-03-01"
   - Apply any date corrections identified in pre-flight

6. Transaction structure:
   ```json
   {
     "date": "2025-03-01",
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
- User corrections applied: [list]

Output Files:
1. scripts/march-2025-CORRECTED.json - Parsed transaction data
2. scripts/MARCH-2025-PARSE-REPORT.md - Detailed parsing report
3. scripts/MARCH-2025-RED-FLAGS.md - APPEND new issues found during parsing

Parse Report Must Include:
- Transaction counts by section
- Transaction counts by type (expense vs income)
- Tag distribution (actual counts)
- Currency distribution (USD vs THB)
- Duplicates removed (with details)
- **User corrections applied** (with before/after values)
- Expected totals from CSV
- Date corrections applied (if any)
- Warnings or issues encountered
- Sample transactions (first 5 from each section)

Critical Verification:
- Rent transaction MUST be 35000 THB (NOT ~1074 USD)
- All THB transactions stored as THB with original amounts
- All USD transactions stored as USD with original amounts
- **No negative amounts** (unless confirmed as legitimate refunds converted to income)
- All user corrections from pre-flight applied

Red Flag Logging:
- APPEND any new parsing errors, currency issues, or anomalies to scripts/MARCH-2025-RED-FLAGS.md
- Include line numbers, transaction details, and resolution status
- Flag duplicates removed for human review (mark as INFO/RESOLVED)
- Log any transactions excluded due to missing data
- **Document all user corrections as RESOLVED** with confirmation note

IMPORTANT: If parsing script doesn't exist, create it following scripts/parse-april-2025.js or scripts/parse-may-2025.js as template. Run the parsing script and create all output files (JSON, report, and updated red flag log). Return a summary showing transaction counts, rent verification, currency distribution, corrections applied, and ready-for-import confirmation.
```

**Output**:
- `scripts/march-2025-CORRECTED.json`
- `scripts/MARCH-2025-PARSE-REPORT.md`
- `scripts/MARCH-2025-RED-FLAGS.md` (updated)

**Human Checkpoint**: ⏸️ Verify rent = 35000 THB, currency split correct, user corrections applied, review red flags, approve for import.

---

### PHASE 3: Database Import

**Execution**: Direct command (no agent needed)

**Prerequisites**:
- ✅ Parse report reviewed and approved
- ✅ Rent transaction verified as 35000 THB
- ✅ Currency split verified
- ✅ User corrections verified as applied

**Command**:
```bash
node scripts/db/import-month.js --file=scripts/march-2025-CORRECTED.json --month=2025-03
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
Target Month: 2025-03
Data File: scripts/march-2025-CORRECTED.json
User: dennis@dsil.design

📊 Loaded XXX transactions from file

👤 User ID: [uuid]

🔍 Found 0 existing transactions in 2025-03
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

**If Import Fails** (learned from April):
- **Error: "positive_amount" constraint violation**:
  → A negative amount got through parsing
  → Delete partial import: Create `scripts/cleanup-march-2025.js` (use April's as template)
  → Fix amount in parsing script
  → Re-parse and re-import

- **Error: Other database constraint**:
  → Review error message for details
  → Clean up partial import
  → Fix issue in parsing script or data
  → Re-parse and re-import

**Red Flag Logging**:
- If import reveals issues (unexpected duplicates, vendor mismatches, negative amounts, etc.), APPEND to scripts/MARCH-2025-RED-FLAGS.md
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
Validate March 2025 import against PDF source of truth using comprehensive multi-level validation with 100% coverage.

Source Documents:
- PDF: csv_imports/Master Reference PDFs/Budget for Import-page8.pdf
- Parse Report: scripts/MARCH-2025-PARSE-REPORT.md
- Database: Supabase (use environment variables from .env.local)
- User: dennis@dsil.design

Exchange Rate (from PDF rent transaction):
- March: This Month's Rent = THB 35000.00 = $XXXX (extract from PDF)
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

- Query daily totals from Expense Tracker section (March 1-31, 2025)
- Compare each day to PDF "Daily Total" rows
- Create comparison table:
  | Date | DB Total | PDF Total | Difference | Status |
- Track: days within $1.00, days within $5.00, days >$5.00
- Acceptance: ≥50% of days within $1.00 (lowered from 80% based on May/April learnings), no day >$100 variance

LEVEL 3: Transaction Count Verification

- Count total transactions in database for March 2025
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
  - Date: 2025-03-XX (find in PDF)
- Verify any user-corrected transactions (from pre-flight/parsing phases)
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

1. Query ALL March 2025 transactions from database (no filtering)
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
2. Root cause analysis (parsing error, duplicate removal, import logic, data entry, user correction)
3. Classify: CRITICAL (must fix) / WARNING (review needed) / ACCEPTABLE (minor, user-confirmed correction)

Output Files:
1. scripts/MARCH-2025-VALIDATION-REPORT.md - Executive summary and all validation levels
2. scripts/MARCH-2025-COMPREHENSIVE-VALIDATION.md - Complete 1:1 verification tables
3. scripts/MARCH-2025-RED-FLAGS.md - APPEND all discrepancies found during validation

Report Structure:
1. Executive Summary
   - Overall status: PASS/FAIL
   - Total variance: $X.XX (X.X%)
   - Transaction count: X imported, Y expected
   - Key findings
   - User corrections applied summary
2. Level 1: Section Grand Totals
   - [Results for each section]
3. Level 2: Daily Subtotals Analysis
   - [Daily comparison results]
4. Level 3: Transaction Count Verification
   - [Count verification results]
5. Level 4: Tag Distribution
   - [Tag verification results]
6. Level 5: Critical Transactions
   - [Critical transaction verification including user corrections]
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
- Level 2: ≥50% daily match rate within $1.00 (lowered based on May/April learnings), no day >$100 variance
- Level 3: Exact transaction count match
- Level 4: Exact tag distribution match
- Level 5: All critical transactions verified (including user corrections)
- Level 6: 100% of PDF transactions found in DB, 100% of DB transactions found in PDF

Red Flag Logging:
- APPEND ALL validation discrepancies to scripts/MARCH-2025-RED-FLAGS.md
- For each discrepancy: transaction details, variance amount, root cause, severity
- For missing transactions: full details from PDF or DB
- For amount mismatches: both values and difference
- For currency mismatches: expected vs actual
- Daily variances >$5.00 should be logged as WARNING
- User corrections should be logged as RESOLVED/ACCEPTABLE

IMPORTANT:
1. Use Supabase client to query the database
2. Read the PDF to extract ALL transaction rows (not samples)
3. Create comprehensive validation report with complete verification tables
4. Verify EVERY transaction in BOTH directions
5. APPEND all discrepancies to red flag log with full details
6. Return executive summary with pass/fail status and variance percentages
7. Document all user corrections as ACCEPTABLE in discrepancy analysis

NOTE from May/April 2025 validation:
- THB→USD conversion rounding is expected and acceptable
- Daily match rate of 50-60% is acceptable if all variances <$100
- Database may be more accurate than PDF in some cases (data entry errors in PDF)
- Pre-flight warnings about missing amounts may be false positives
- User-confirmed corrections should be marked as ACCEPTABLE

**APRIL 2025 TAG LESSONS**:
If validation reveals tag count mismatches (Level 4 failure):
- This is EXPECTED based on April experience
- Likely causes:
  - Missing Reimbursement tags on legitimate reimbursements
  - Incorrect Reimbursement tags on DSIL income
  - Missing Florida House tags on utilities
  - Incorrect Florida House tags on CNX/Chiang Mai bills
- Document ALL missing/incorrect tags with transaction details
- Prepare for post-validation tag fixes (Phase 4.5)

IMPORTANT: Create all 3 output files and return a comprehensive executive summary with pass/fail recommendation and tag fix requirements (if any).
```

**Output**:
- `scripts/MARCH-2025-VALIDATION-REPORT.md`
- `scripts/MARCH-2025-COMPREHENSIVE-VALIDATION.md`
- `scripts/MARCH-2025-RED-FLAGS.md` (final update with all issues)

**Human Checkpoint**: ⏸️ Review validation report and complete red flag log, accept/reject import based on results. If tag fixes needed, proceed to Phase 4.5.

---

### PHASE 4.5: Post-Validation Tag Fixes (If Needed)

**Context**: Based on April 2025 experience, tag fixes were needed after validation. This phase is OPTIONAL and only executed if validation reveals tag count mismatches.

**Execution**: Manual with assistance (Option B from April)

**When to Execute**:
- Level 4 validation fails (tag distribution doesn't match expected)
- Validation report identifies specific missing or incorrect tags

**Process**:

**Step 1: Diagnostic Analysis**

Create diagnostic script to find missing tags:
```bash
# Create from April template
cp scripts/find-missing-tags-april.js scripts/find-missing-tags-march.js
# Update for March dates and tag expectations
node scripts/find-missing-tags-march.js
```

**What it finds**:
- Income transactions with "Reimbursement:" in description but no Reimbursement tag
- Exception: Income from DSIL Design/LLC (should NOT be tagged)
- Florida House section transactions missing Florida House tag
- Exception: CNX/Chiang Mai transactions (should NOT be tagged as Florida House)

**Step 2: Human Review of Findings**

**CRITICAL**: Review each flagged transaction before applying fixes:

**Reimbursement Tag Review**:
- ✅ Add tag if: Description starts with "Reimbursement:" AND merchant is NOT DSIL
- ❌ Do NOT add if: Merchant is "DSIL Design" or "DSIL LLC" (even if description says "Reimbursement")

**Florida House Tag Review**:
- ✅ Add tag if: Transaction from Florida House section AND NOT CNX/Chiang Mai
- ❌ Do NOT add if: Description contains "CNX", "Chiang Mai", "CNX Electric", "CNX Water", etc.

**Step 3: Apply Fixes**

Create fix script:
```bash
# Create from April template
cp scripts/fix-april-tags.js scripts/fix-march-tags.js
# Update with March transaction IDs from diagnostic
node scripts/fix-march-tags.js
```

**Step 4: Re-Validate**

After applying fixes, re-run Level 1 and Level 4 validation:
- Query section totals (should now match PDF)
- Query tag counts (should now match expected)
- Verify variance is now within acceptable thresholds

**Step 5: Final Red Flag Update**

Update `scripts/MARCH-2025-RED-FLAGS.md` with:
- Which tags were added/removed
- Transaction details for each fix
- Validation results before/after fixes
- Final acceptance status

**Expected from April**:
- April needed 8 tag fixes (5 added, 3 removed)
- After fixes, Florida House went from -$107 variance to $0.00 (exact match)
- Expense Tracker improved significantly
- All sections passed validation after fixes

**Human Checkpoint**: ⏸️ After tag fixes, verify all sections now pass validation. Accept import if all thresholds met.

---

## 📊 Expected Results for March 2025

### From Previous Month Patterns:
- **Transactions**: ~170-190 (April had 182)
- **Currency Split**: ~45-50% USD, ~50-55% THB
- **Tag Breakdown**:
  - Reimbursements: ~20-25 (April had 22)
  - Florida House: ~5-7 (April had 6 after fixes)
  - Business Expense: ~0-2
  - Savings/Investment: ~0-1

### Critical Transaction:
- **Rent**: THB 35,000.00 on March 1 or 5 (MUST verify)

### Expected Section Totals (from PDF page 6):
- Expense Tracker NET: $[extract from PDF]
- Gross Income: $[extract from PDF]
- Savings/Investment: $[extract from PDF]
- Florida House: $[extract from PDF]

---

## ✅ Success Criteria

### Must Pass (All Required):
- ✅ Pre-flight analysis completed with no critical blockers
- ✅ Parsing script verified/created to use original currency values
- ✅ Rent transaction = 35,000 THB (NOT ~$1074)
- ✅ All transactions stored in original currency (THB or USD)
- ✅ All user corrections applied (if any)
- ✅ Import completes without errors
- ✅ Transaction count matches parse report
- ✅ Tag distribution matches parse report (after any fixes)
- ✅ Expense Tracker grand total within 2% of PDF
- ✅ Florida House exact match or within $5
- ✅ All section grand totals within acceptable variance
- ✅ No daily variance >$100
- ✅ 100% of PDF transactions found in database
- ✅ 100% of database transactions found in PDF
- ✅ Critical transactions verified against PDF

### Should Pass (Expected):
- ⚠️ ≥50% of daily totals within $1.00 (lowered from 80% based on May/April learnings)
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
- ❌ Any negative amounts not addressed in pre-flight

### Import Issues:
- ❌ Transaction count doesn't match parse report
- ❌ Large number of duplicates skipped unexpectedly
- ❌ Tags not applied correctly
- ❌ New tags created (all should exist from previous imports)
- ❌ Database constraint violation (negative amounts)

### Validation Issues:
- ❌ Variance >5% on any section grand total
- ❌ Daily variance >$100 on any day
- ❌ Transaction count mismatch
- ❌ Tag count mismatch (expected based on April - proceed to Phase 4.5)
- ❌ Critical transactions not found in database
- ❌ Any PDF transaction not found in database
- ❌ Any database transaction not found in PDF

---

## 🔄 Recovery Procedures

### If Parsing Script is Wrong or Missing:
1. Stop before database import
2. Create/fix parsing script following parse-april-2025.js or parse-may-2025.js pattern
3. Verify script uses Column 6 for THB, Column 7/9 for USD
4. Re-run Phase 2 (parse)
5. Verify rent = 35000 THB in new output
6. Proceed to Phase 3

### If Import Goes Wrong:
1. Create cleanup script: `scripts/cleanup-march-2025.js` (use April's as template)
2. Run cleanup to delete March 2025 transactions
3. Fix issue (parsing script or import script)
4. Re-run from Phase 2
5. Re-import to database

### If Validation Fails:
1. Investigate discrepancies in validation report
2. Determine root cause:
   - Parsing error → fix script, re-parse, re-import
   - Import error → delete and re-import
   - **Tag issues** → proceed to Phase 4.5 (post-validation tag fixes)
   - PDF vs CSV mismatch → document and accept if minor
3. Re-run validation after fix

### If Tag Fixes Needed (Based on April):
1. Run diagnostic: `node scripts/find-missing-tags-march.js`
2. Review each flagged transaction
3. **Verify tag logic** (check for DSIL income, CNX utilities)
4. Apply fixes: `node scripts/fix-march-tags.js`
5. Re-run validation (Level 1 and Level 4)
6. Accept if all sections now within thresholds

---

## 📝 Lessons Learned Summary

### From September through April (6 months):

**What Always Works**:
1. ✅ 4-Phase protocol with human checkpoints
2. ✅ Pre-flight analysis catches most issues
3. ✅ Storing original currency values (not conversions)
4. ✅ 100% bidirectional PDF verification
5. ✅ Red flag logging for comprehensive issue tracking

**What Needs Attention**:
1. ⚠️ Negative amounts (April had 2 - always check)
2. ⚠️ Currency errors (April had 1 - cross-reference recurring expenses)
3. ⚠️ Tag issues (April had 8 fixes - expect similar)
4. ⚠️ DSIL income tagging (never tag as Reimbursement)
5. ⚠️ CNX utility tagging (never tag as Florida House)
6. ⚠️ Duplicate handling (sometimes needed in both sections)

**Key Metrics**:
- **Pre-Flight Time**: 10-15 minutes
- **Parsing Time**: 10-15 minutes (including user review)
- **Import Time**: 2-3 minutes
- **Validation Time**: 15-20 minutes
- **Tag Fixes Time** (if needed): 10-15 minutes
- **Total Time**: 45-60 minutes (with tag fixes), 30-40 minutes (clean import)

---

## 🚀 Ready to Execute

**Current Status**: ✅ Ready to begin Phase 1 (Pre-Flight Analysis)

**Next Action**: Launch data-engineer agent with Phase 1 prompt

**Expected Timeline**:
- Phase 1: 10-15 minutes
- Human Review: 5 minutes
- Phase 2: 10-15 minutes
- Human Review: 5 minutes
- Phase 3: 2-3 minutes
- Human Review: 2 minutes
- Phase 4: 15-20 minutes
- Tag Fixes (if needed): 10-15 minutes
- Human Review: 5 minutes

**Total**: 45-70 minutes

---

**Protocol Version**: 3.1 (Comprehensive Validation with 100% Coverage + Red Flag Logging + April Learnings)
**Last Updated**: October 24, 2025 (after April 2025 completion)
**Created By**: Human + Claude Code collaboration
**Status**: APPROVED FOR PRODUCTION USE

---

## 📋 Quick Reference Card

**CSV Columns**:
- Column 3: Reimbursable flag (X) - tracking only, NO tag
- Column 4: Business expense flag (X) - add Business Expense tag
- Column 6: THB amount (e.g., "THB 35000.00") ← **USE THIS**
- Column 7: USD amount (for expenses)
- Column 8: **CONVERSION - NEVER USE**
- Column 9: USD subtotal (use if Column 7 empty)

**Tag Logic**:
```
Reimbursement:
  ✅ Income + "Reimbursement:" prefix
  ❌ UNLESS merchant is DSIL Design/LLC

Florida House:
  ✅ Expense + from Florida House section
  ❌ UNLESS contains CNX/Chiang Mai

Business Expense:
  ✅ Expense + Column 4 has "X"

Savings/Investment:
  ✅ Expense + from Savings section
```

**Exchange Rate Calculation**:
```
Find rent in PDF: THB 35,000 = $X
Rate = X / 35000
Use this rate for ALL THB→USD conversions
```

**File Locations**:
- PDF: `csv_imports/Master Reference PDFs/Budget for Import-page8.pdf` (March 2025)
- CSV: `csv_imports/fullImport_20251017.csv`
- Rules: `scripts/FINAL_PARSING_RULES.md`
- Template: `scripts/parse-april-2025.js` or `scripts/parse-may-2025.js`
- PDF Mapping: `PDF-MONTH-MAPPING.md` (page number reference)

**Human Checkpoints** (⏸️ = STOP):
1. ⏸️ After Pre-Flight: Review red flags, confirm corrections
2. ⏸️ After Parsing: Verify rent=35000 THB, corrections applied
3. ⏸️ After Import: Verify counts match parse report
4. ⏸️ After Validation: Review full report, accept/reject
5. ⏸️ After Tag Fixes (if needed): Verify all sections pass

---

Ready to begin? Copy this entire protocol and paste into a new chat to start the March 2025 import process.
