# Monthly Transaction Import Protocol - June 2025

## 🎯 Mission

Import June 2025 historical transaction data using the established Month-by-Month Import Protocol, maintaining data integrity and consistency with comprehensive PDF validation.

---

## 📚 Knowledge Base - Established From Previous Imports

### Project Status

**Completed Imports:**
- ✅ September 2025: 159 transactions, variance -2.24%
- ✅ August 2025: 194 transactions, variance +2.24%
- ✅ July 2025: 176 transactions, variance 1.7% (with comprehensive PDF validation)

**Current Database State (dennis@dsil.design):**
- Total transactions: ~529 (Sept + Aug + July)
- Vendors: 115+ (matched where possible)
- Payment methods: 25+
- Tags: Reimbursement, Florida House, Savings/Investment, Business Expense

**Next Target:** June 2025

**Critical Context:**
- May, June, and July 2025 were PREVIOUSLY imported with **INCORRECT** USD conversion values instead of original THB amounts
- All three months have been DELETED and July has been successfully re-imported with corrected data
- June 2025 needs to be re-imported using the **CORRECTED** parsing approach

---

## 📁 Reference Files for June 2025

### Primary Sources
1. **PDF:** `/csv_imports/Master Reference PDFs/Budget for Import-page5.pdf` (June 2025)
   - Source of truth for validation
   - Contains 4 sections with grand totals
   - Use for 1:1 transaction verification

2. **CSV:** `/csv_imports/fullImport_20251017.csv`
   - Lines: TBD (to be identified in pre-flight)
   - Expected: ~1232-1519 based on May/July patterns

3. **Parsing Script:** `/scripts/parse-june-2025.js`
   - ✅ ALREADY CORRECTED to use original currency values
   - Uses Column 6 for THB amounts (NOT conversion column)
   - Uses Column 7/9 for USD amounts (NOT conversion column)

4. **Import Script:** `/scripts/db/import-month.js`
   - ✅ Verified working from Sept/Aug/July imports

### Supporting Documents
1. **`scripts/FINAL_PARSING_RULES.md`** - Complete parsing specification
2. **`COMPREHENSIVE-VALIDATION-PROTOCOL.md`** - NEW validation protocol (established with July)
3. **`JULY-2025-VALIDATION-SUMMARY.md`** - Reference example of successful validation
4. **`scripts/AUGUST_2025_PRE_FLIGHT_REPORT.md`** - Example of pre-flight analysis

---

## 🔧 Standard Import Workflow (4-Phase Process)

### PHASE 1: Pre-Flight Analysis

**Agent:** Task tool → subagent_type=data-engineer

**Objective:** Analyze CSV and PDF to understand data structure, identify issues, and set expectations BEFORE parsing.

**Prompt:**
```
Analyze June 2025 data from csv_imports/fullImport_20251017.csv and csv_imports/Master Reference PDFs/Budget for Import-page5.pdf using scripts/FINAL_PARSING_RULES.md.

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
   - Read scripts/parse-june-2025.js
   - Verify it uses Column 6 for THB (NOT Column 8 conversion)
   - Verify it uses Column 7/9 for USD (NOT Column 8 conversion)
   - Flag if script needs correction

9. Compare to previous months:
   - September 2025: 159 transactions, 23 reimbursements, ~70 THB
   - August 2025: 225 transactions, 32 reimbursements, 82 THB
   - July 2025: 176 transactions, 26 reimbursements, ~90 THB
   - Flag significant structural differences

10. Identify anomalies:
    - Missing amounts
    - Invalid dates (e.g., wrong year)
    - Unusual patterns
    - Data quality issues

Output Files:
- scripts/JUNE-2025-PREFLIGHT-REPORT.txt or .md

Report must include:
- Line number ranges for each section
- Transaction counts per section
- Expected totals from PDF (source of truth)
- Expected total calculation
- Duplicate detection results with line numbers
- Tag distribution preview (counts)
- Currency breakdown (USD vs THB vs other)
- Parsing script verification status
- Comparison to previous months
- Red flags or structural differences
- Parsing strategy recommendations

This is critical pre-import validation - flag any anomalies before we proceed to parsing.
```

**Human Review Checkpoint:** Address any red flags, clarifying questions, or script corrections before Phase 2.

---

### PHASE 2: Parse & Prepare

**Agent:** Task tool → subagent_type=data-engineer

**Objective:** Parse CSV data following FINAL_PARSING_RULES.md exactly, producing clean JSON for import.

**Prerequisites:**
- ✅ Pre-flight report reviewed and approved
- ✅ Parsing script verified/corrected
- ✅ Line ranges identified

**Prompt:**
```
Parse June 2025 transactions following scripts/FINAL_PARSING_RULES.md exactly.

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
   - "Monday, June 1, 2025" → "2025-06-01"
   - "6/1/2025" → "2025-06-01"
   - Apply any date corrections identified in pre-flight

6. Transaction structure:
   ```json
   {
     "date": "2025-06-01",
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
1. scripts/june-2025-CORRECTED.json - Parsed transaction data
2. scripts/JUNE-2025-PARSE-REPORT.md - Detailed parsing report

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
```

**Human Review Checkpoint:**
1. Verify parse report totals match pre-flight expectations
2. Verify rent transaction is 35000 THB
3. Verify currency distribution looks correct
4. Approve before database import

---

### PHASE 3: Database Import

**Execution:** Direct command (no agent needed)

**Prerequisites:**
- ✅ Parse report reviewed and approved
- ✅ Rent transaction verified as 35000 THB
- ✅ Currency split verified

**Command:**
```bash
node scripts/db/import-month.js \
  --file=scripts/june-2025-CORRECTED.json \
  --month=2025-06
```

**What This Does:**
- Matches existing vendors (115+ in database)
- Matches existing payment methods (25+ in database)
- Matches existing tags (Reimbursement, Florida House, Savings/Investment, Business Expense)
- Creates new vendors/payment methods only when no match found
- Skips duplicate transactions (same date + description + amount + vendor)
- Inserts transactions in batches of 50
- Creates transaction_tag relationships
- Reports: new vendors, new payment methods, import counts

**Expected Output:**
- Transaction count: [from parse report]
- Transaction types: X expenses, Y income
- New vendors created: [list]
- New payment methods created: [list]
- Tags applied: [counts]

**Verification:**
- Import summary should match parse report counts
- No unexpected duplicates skipped
- Tags applied correctly

---

### PHASE 4: Comprehensive Validation

**Agent:** Task tool → subagent_type=data-scientist

**Objective:** Validate imported data against PDF source of truth using multi-level verification.

**Prerequisites:**
- ✅ Database import completed
- ✅ Import summary reviewed

**Reference:** Follow the comprehensive validation protocol established for July 2025 (see JULY-2025-VALIDATION-SUMMARY.md)

**Prompt:**
```
Validate June 2025 import against PDF source of truth using comprehensive multi-level validation.

Source Documents:
- PDF: csv_imports/Master Reference PDFs/Budget for Import-page5.pdf
- Parse Report: scripts/JUNE-2025-PARSE-REPORT.md
- Database: Supabase (use environment variables)
- User: dennis@dsil.design

Exchange Rate (from PDF rent transaction):
- June 1: This Month's Rent = THB 35000.00 = $1074.50
- Rate: 1074.50 / 35000 = 0.0307 (use for all USD conversions)

Validation Levels:

LEVEL 1: Section Grand Totals
- Query Expense Tracker transactions (expenses + reimbursements, exclude Florida House, exclude Savings, exclude non-reimbursement income)
- Convert THB to USD using 0.0307 rate
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
- Query daily totals from Expense Tracker section
- Compare each day to PDF "Daily Total" rows
- Create comparison table:
  | Date | DB Total | PDF Total | Difference | Status |
- Track: days within $1.00, days within $5.00, days >$5.00
- Acceptance: ≥80% of days within $1.00, no day >$100 variance

LEVEL 3: Transaction Count Verification
- Count total transactions in database for June 2025
- Compare to parse report expected count
- Break down by type: expense vs income
- Break down by currency: USD vs THB
- Break down by section/tag
- Acceptance: Exact match to parse report

LEVEL 4: Tag Distribution Verification
- Count each tag in database:
  - Reimbursement: [count]
  - Florida House: [count]
  - Business Expense: [count]
  - Savings/Investment: [count]
- Compare to parse report expected counts
- Acceptance: Exact match

LEVEL 5: Critical Transaction Spot Checks
- Verify rent transaction:
  - Description: "This Month's Rent"
  - Amount: 35000
  - Currency: THB
  - Date: 2025-06-01
- Verify largest THB transaction
- Verify largest USD transaction
- Verify first and last transaction of month
- Acceptance: All match PDF

LEVEL 6: 1:1 PDF Verification (Sample-Based)
- Select 20 random transactions from database
- Locate each in PDF
- Verify: date, description, amount, currency
- Track: found count, not found count, mismatches
- Acceptance: ≥95% match rate

Output File: scripts/JUNE-2025-VALIDATION-REPORT.md

Report Structure:
1. Executive Summary
   - Overall status: PASS/FAIL
   - Total variance: $X.XX (X.X%)
   - Transaction count: X imported, Y expected
   - Key findings

2. Level 1: Section Grand Totals
   - Expense Tracker: $X,XXX.XX (DB) vs $X,XXX.XX (PDF) = $X.XX variance (X.X%)
   - Florida House: $XXX.XX (DB) vs $XXX.XX (PDF) = $X.XX variance
   - Savings: $XXX.XX (DB) vs $XXX.XX (PDF) = $X.XX variance
   - Gross Income: $XXX.XX (DB) vs $XXX.XX (PDF) = $X.XX variance
   - Status: PASS/FAIL for each

3. Level 2: Daily Subtotals Analysis
   - Days analyzed: 30
   - Days within $1.00: X (XX%)
   - Days within $5.00: X (XX%)
   - Days >$5.00: X (XX%)
   - Largest daily variance: $XX.XX on [date]
   - Status: PASS/FAIL

4. Level 3: Transaction Count Verification
   - Expected: XXX transactions
   - Imported: XXX transactions
   - Difference: X
   - Type breakdown: X expenses, Y income (expected: X, Y)
   - Currency breakdown: X USD, Y THB (expected: X, Y)
   - Status: PASS/FAIL

5. Level 4: Tag Distribution
   - Reimbursement: X (expected: Y)
   - Florida House: X (expected: Y)
   - Business Expense: X (expected: Y)
   - Savings/Investment: X (expected: Y)
   - Status: PASS/FAIL

6. Level 5: Critical Transactions
   - Rent: ✅/❌ (35000 THB on 2025-06-01)
   - Largest THB: ✅/❌ ([details])
   - Largest USD: ✅/❌ ([details])
   - First transaction: ✅/❌ ([details])
   - Last transaction: ✅/❌ ([details])
   - Status: PASS/FAIL

7. Level 6: 1:1 PDF Verification
   - Sample size: 20 transactions
   - Found in PDF: X
   - Not found: Y
   - Mismatches: Z
   - Match rate: XX%
   - Status: PASS/FAIL

8. Discrepancies Found
   - Critical: [list]
   - Warnings: [list]
   - Minor: [list]

9. Final Recommendation
   - ✅ ACCEPT: All levels pass, variance within acceptable range
   - ⚠️ ACCEPT WITH NOTES: Minor issues documented, variance acceptable
   - ❌ REJECT: Critical issues found, re-import required

Acceptance Criteria (Overall):
- Level 1: All sections within variance thresholds
- Level 2: ≥80% daily match rate
- Level 3: Exact transaction count match
- Level 4: Exact tag distribution match
- Level 5: All critical transactions verified
- Level 6: ≥95% PDF match rate

This is the final validation before accepting the import.
```

**Human Review Checkpoint:**
1. Review validation report
2. If ACCEPT: Mark June 2025 complete, proceed to May 2025
3. If ACCEPT WITH NOTES: Document issues, mark complete
4. If REJECT: Investigate discrepancies, fix parsing script, re-import

---

## 📊 Expected Results for June 2025

### From PDF (Budget for Import-page5.pdf)

**Expense Tracker:**
- GRAND TOTAL (NET): $6,347.08
- Daily totals: 30 days of data
- Transaction count: ~183 (estimate)

**Gross Income Tracker:**
- GROSS INCOME TOTAL: $175.00
- Transactions: 1 (Freelance Income - May, NJDA)

**Personal Savings & Investments:**
- TOTAL: $341.67
- Transactions: 1 (Emergency Savings, Vanguard)

**Florida House Expenses:**
- GRAND TOTAL: $344.28
- Transactions: 4-6 (estimate)

**Expected Totals:**
- Total transactions: 189-191
- Currency split: ~85 THB, ~105 USD (estimate)
- Reimbursements: ~25-30 (estimate)

**Critical Transaction:**
- Rent: THB 35,000.00 on June 1 (MUST verify)

---

## ✅ Success Criteria

### Must Pass (All Required)
- [ ] Pre-flight analysis completed with no critical issues
- [ ] Parsing script verified to use original currency values
- [ ] Rent transaction = 35,000 THB (NOT ~1074)
- [ ] All transactions stored in original currency (THB or USD)
- [ ] Import completes without errors
- [ ] Transaction count matches parse report
- [ ] Tag distribution matches parse report
- [ ] Expense Tracker grand total within 2% of PDF ($6,347.08)
- [ ] All section grand totals within acceptable variance
- [ ] 80%+ of daily totals match within $1.00
- [ ] Critical transactions verified against PDF

### Should Pass (Expected)
- [ ] All daily totals within $5.00
- [ ] 95%+ PDF match rate on spot checks
- [ ] No unexpected new vendors/payment methods
- [ ] Overall variance <1.5%

### Documentation Requirements
- [ ] JUNE-2025-PREFLIGHT-REPORT.md/txt created
- [ ] JUNE-2025-PARSE-REPORT.md created
- [ ] JUNE-2025-VALIDATION-REPORT.md created
- [ ] june-2025-CORRECTED.json created
- [ ] All issues documented in validation report

---

## 🚨 Red Flags - Stop and Investigate

**Parsing Issues:**
- Rent transaction ≠ 35000 THB
- Currency field shows "USD" for Thai rent
- Amount shows ~1074 instead of 35000
- THB transactions stored as USD amounts
- Conversion column (column 8) being used

**Import Issues:**
- Transaction count doesn't match parse report
- Large number of duplicates skipped unexpectedly
- Tags not applied correctly
- New vendors created when they should match existing

**Validation Issues:**
- Variance >5% on any section grand total
- Daily variance >$100 on any day
- Transaction count mismatch
- Tag count mismatch
- Critical transactions not found in database
- PDF match rate <90%

---

## 🔄 Recovery Procedures

### If Parsing Script is Wrong
1. Stop before database import
2. Fix parsing script currency logic
3. Re-run Phase 2 (parse)
4. Verify rent = 35000 THB in new output
5. Proceed to Phase 3

### If Import Goes Wrong
1. Delete June 2025 transactions from database
2. Fix issue (parsing script or import script)
3. Re-run from Phase 2
4. Re-import to database

### If Validation Fails
1. Investigate discrepancies in validation report
2. Determine root cause:
   - Parsing error → fix script, re-parse, re-import
   - Import error → delete and re-import
   - PDF vs CSV mismatch → document and accept if minor
3. Re-run validation after fix

---

## 📝 Lessons Learned from Previous Months

### September 2025 (First Import)
- Established clean-slate import process
- Created vendor/payment method/tag matching
- Variance: -2.24% (excellent)

### August 2025
- Pre-flight analysis critical for catching anomalies
- Date correction needed (2004 → 2025 for one transaction)
- Missing amounts in Florida House section
- Variance: +2.24% (acceptable)

### July 2025
- **NEW:** Comprehensive PDF validation protocol established
- Daily subtotal verification added
- 1:1 transaction verification introduced
- Multi-level validation catches more issues
- Variance: 1.7% (excellent with new protocol)

### Key Takeaways for June 2025
1. **ALWAYS** run pre-flight analysis with data-engineer
2. **ALWAYS** verify parsing script currency logic
3. **ALWAYS** check rent transaction = 35000 THB before import
4. **ALWAYS** use comprehensive PDF validation
5. **NEVER** skip human review checkpoints
6. **NEVER** calculate exchange rates during parsing (store original values)
7. **NEVER** use conversion column (column 8) from CSV

---

## 🚀 Ready to Execute

This protocol has been battle-tested on September, August, and July 2025 imports. Follow each phase sequentially. Do not skip steps. Document everything.

**Current Status:** ✅ Ready to begin Phase 1 (Pre-Flight Analysis)

**Next Action:** Launch data-engineer agent with Phase 1 prompt

---

**Protocol Version:** 3.0 (Comprehensive Validation)
**Last Updated:** October 24, 2025
**Created By:** Human + Claude Code collaboration
**Status:** APPROVED FOR PRODUCTION USE
