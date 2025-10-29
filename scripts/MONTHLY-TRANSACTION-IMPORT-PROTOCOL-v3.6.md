# Monthly Transaction Import Protocol - Version 3.6

**Last Updated:** October 26, 2025
**Status:** APPROVED FOR PRODUCTION USE
**Previous Version:** 3.5 (November 2024)
**Next Target Month:** October 2024

---

## 📋 Table of Contents

1. [Mission Statement](#mission-statement)
2. [Knowledge Base](#knowledge-base)
3. [Reference Files](#reference-files)
4. [Critical Lessons Learned](#critical-lessons-learned)
5. [4-Phase Import Process](#4-phase-import-process)
6. [Success Criteria](#success-criteria)
7. [Red Flag Categories](#red-flag-categories)
8. [Recovery Procedures](#recovery-procedures)
9. [Quick Reference Card](#quick-reference-card)

---

## 🎯 Mission Statement

Import historical monthly transaction data with 100% accuracy using a proven 4-phase protocol that includes comprehensive validation and red flag logging. Each import must maintain data integrity, preserve user intent, and integrate seamlessly with existing transaction history.

---

## 📚 Knowledge Base

### Completed Imports (12 Months)

| Month | Transactions | Tags Applied | THB % | Variance | Status | Notes |
|-------|--------------|--------------|-------|----------|--------|-------|
| **October 2025** | 119 | N/A | N/A | N/A | ✅ | Most recent month |
| **September 2025** | 159 | 23 Reimb | ~44% | -2.24% | ✅ | Standard import |
| **August 2025** | 194 | 32 Reimb | 42% | +2.24% | ✅ | Standard import |
| **July 2025** | 176 | 26 Reimb | ~51% | 1.7% | ✅ | Standard import |
| **June 2025** | 190 | 27 Reimb | 45% | +3.18% | ✅ | 100% verified |
| **May 2025** | 174 | 16 Reimb | 51% | 0.29% | ✅ | Red flag logging added |
| **April 2025** | 182 | 22 Reimb | 51% | N/A | ✅ | 3 user corrections, 8 tag fixes |
| **March 2025** | 253 | 28 Reimb + 4 FH + 2 BE | 43% | N/A | ✅ | Tag import bug fixed, 2 user corrections |
| **February 2025** | 211 | 19 Reimb | 69.2% | N/A | ✅ | 3 typo reimb, FL House date fix |
| **January 2025** | 195 | 15 Reimb + 3 BE + 3 FH | 53% | N/A | ✅ | Apartment move (2 rents), income adj |
| **December 2024** | 259 | 18 Reimb | 44.4% | 1.88% | ✅ | HIGHEST count, 1 manual tag fix |
| **November 2024** | 118 | 0 Reimb + 13 BE + 3 FH + 2 S/I | 5% | 0.79% | ✅ | 3 refunds, 1 comma amount |

**Total Transactions Imported:** ~2,111 across 12 months
**Total Vendors:** 588+
**Total Payment Methods:** 46+

### Current Database State (dennis@dsil.design)

- **Database:** Supabase production
- **User ID:** `a1c3caff-a5de-4898-be7d-ab4b76247ae6`
- **Import Direction:** Going backwards from October 2025
- **Next Target:** October 2024 (13 months back from October 2025)
- **Expected Position:** BEFORE November 2024 (lines 3403-3617 in CSV)

### Expected Tag IDs (Verify After Every Import)

```javascript
{
  "Reimbursement": "205d99a2-cf0a-44e0-92f3-e2b9eae1bf72",
  "Florida House": "178739fd-1712-4356-b21a-8936b6d0a461",
  "Business Expense": "973433bd-bf9f-469f-9b9f-20128def8726",
  "Savings/Investment": "c0928dfe-1544-4569-bbad-77fea7d7e5aa"
}
```

**CRITICAL:** Always verify tag mapping after import using verification scripts.

---

## 📁 Reference Files

### Primary Files

1. **CSV Source:**
   - Path: `/csv_imports/fullImport_20251017.csv`
   - Contains all historical transaction data
   - Organized by month in reverse chronological order
   - Each month has 4-6 sections

2. **PDF Reference (per month):**
   - Location: `/csv_imports/Master Reference PDFs/Budget for Import-page{N}.pdf`
   - Page calculation: `page_number = 1 + months_back_from_October_2025`
   - See `PDF-MONTH-MAPPING.md` for complete mapping
   - **CRITICAL:** Always verify PDF month before starting analysis

3. **Parsing Rules:**
   - Path: `/scripts/FINAL_PARSING_RULES.md`
   - Complete column mapping and field extraction logic
   - Tag assignment rules
   - Currency handling specifications
   - Special case handling

4. **PDF Month Mapping:**
   - Path: `/PDF-MONTH-MAPPING.md`
   - Page number calculation formula
   - PDF verification logic
   - Quick reference table

### Import Scripts

1. **Monthly Parsing Script:**
   - Location: `/scripts/parse-{month}-{year}.js`
   - Created fresh for each month (use most recent as template)
   - Must incorporate ALL lessons learned
   - Template hierarchy: November 2024 → December 2024 → January 2025

2. **Database Import Script:**
   - Location: `/scripts/db/import-month.js`
   - ✅ Verified working across all 12 imports
   - ✅ Tag matching bug fixed (March 2025)
   - ⚠️ May have edge case where 1 tag doesn't apply (manual fix acceptable)

### Supporting Documents

- Previous month import prompts (lessons learned reference)
- Previous month validation reports (pattern analysis)
- Previous month red flag logs (issue tracking)
- `COMPREHENSIVE-VALIDATION-PROTOCOL.md` (validation methodology)

---

## 🚨 Critical Lessons Learned (ALL 12 MONTHS)

### Currency Handling (FOUNDATIONAL - APPLIES TO ALL)

**⚠️ HARD RULE: Parser ONLY Extracts Amount + Currency**

**Core Principle:**
- ✅ Parser extracts: Raw amount (e.g., 25000.00) + Currency symbol (e.g., 'THB')
- ✅ Database stores: `amount=25000.00`, `original_currency='THB'`
- ✅ Application converts at display time using proper historical/live rates
- ❌ Parser NEVER performs conversions
- ❌ Parser NEVER uses conversion columns (Column 8)
- ❌ Parser NEVER multiplies by exchange rates

**Rationale:**
Exchange rates in CSV may be erroneous (e.g., Dec 2023: $0.00003 per THB instead of $0.0284). The application is the source of truth for conversion rates, not the CSV.

**Lesson Source:** May/June/July 2025 major re-import

**Issue:**
- Original imports used converted USD values from Column 8 instead of original THB amounts from Column 6
- Caused all THB transactions to have incorrect amounts in database
- Required deletion and re-import of 3 entire months

**Solution:**
```javascript
// CORRECT - Extract amount and currency ONLY (no conversion)
if (row[6] && row[6].includes('THB')) {
  const match = row[6].match(/THB\s*([\d,.-]+)/);
  amount = parseFloat(match[1].replace(/,/g, '')); // Extract ACTUAL amount only
  currency = 'THB';                                 // Store currency symbol
  // NEVER use Column 8 (conversion column - completely ignore it)
  // NEVER calculate USD equivalents
  // NEVER multiply by exchange rates
}
// CORRECT - Use Column 7/9 for USD amounts
else if (row[7] || row[9]) {
  amount = parseFloat((row[7] || row[9]).replace(/[$,]/g, ''));
  currency = 'USD';
}

// Example: CSV shows "THB 25000.00" in Column 6 and "$0.71" in Column 8 (erroneous conversion)
// Parser extracts: amount=25000.00, currency='THB'
// Database stores: amount=25000.00, original_currency='THB'
// Application converts at display time using proper rates
```

**Verification:**
- Parser script extracts raw amounts and currency symbols ONLY
- Parser script does NOT use Column 8 (conversion column)
- Parser script does NOT perform any currency calculations

---

### Negative Amount Handling (DATABASE CONSTRAINT)

**Lesson Source:** March 2025
**Applied:** All subsequent imports

**Issue:**
- Database has CHECK constraint requiring all amounts to be positive
- Refunds/credits appear as negative in CSV
- Import fails with constraint violation

**Solution:**
```javascript
// Detect negative amounts and convert to positive income
if (amount < 0) {
  transactionType = 'income';
  amount = Math.abs(amount);
  console.log(`✓ REFUND/INCOME: Converting negative expense to positive income`);
}
```

**Common Patterns:**
- Refunds: "Refund: {item}" with negative amount
- Credits: "Credit: {description}" with negative amount
- Trade-ins: "Trade-in: {item}" with negative amount
- Winnings: "Golf Winnings" with negative amount
- Compensation: "Compensation" with negative amount
- Class action: "Payout: Class Action Settlement" with negative amount

**Pre-Flight Check:**
- Scan CSV for negative amounts: `$(xxx)` or `-$xxx` patterns
- Flag all instances for automatic conversion
- Document in red flag log

---

### Comma-Formatted Amounts (PARSING EDGE CASE)

**Lesson Source:** March 2025 (Tax payment $3,490.02)
**Applied:** All subsequent imports

**Issue:**
- Large amounts may have commas: "$3,490.02" or "$1,000.00"
- May also have tabs, quotes, spaces: `"$ 1,000.00"` or `"$\t1,000.00"`
- parseFloat() alone produces incorrect values

**Solution:**
```javascript
function parseAmount(amountStr) {
  // Remove all: $, commas, quotes, tabs, parentheses, spaces
  const cleaned = amountStr.replace(/[$,"\t()\s]/g, '').trim();
  return parseFloat(cleaned);
}
```

**Pre-Flight Check:**
- Search CSV for amounts containing commas
- Verify parser has enhanced cleaning function
- Test cases: "$3,490.02" → 3490.02, "$1,000.00" → 1000.00

---

### Typo Reimbursement Detection (USER ERROR TOLERANCE)

**Lesson Source:** February 2025
**Applied:** All subsequent imports

**Issue:**
- User occasionally misspells "Reimbursement:" in descriptions
- Found variants: "Remibursement:", "Rembursement:", "Reimbursment:"
- Standard exact match fails to detect and tag these

**Solution:**
```javascript
// Flexible regex pattern for typo detection
const isReimbursement = /^Re(im|mi|m)?burs[e]?ment:/i.test(description.trim());

// Also handle without colon (January 2025 lesson)
const isReimbursement = /^Re(im|mi|m)?burs[e]?ment:?/i.test(description.trim());
```

**Pre-Flight Check:**
- Search CSV for "Remibursement", "Rembursement", "Reimbursment" patterns
- Document count in red flag log
- Verify parser has flexible regex

---

### Florida House Missing Dates (DATA QUALITY ISSUE)

**Lesson Source:** February 2025
**Applied:** All subsequent imports

**Issue:**
- Florida House section in CSV may have empty date column
- Import fails with "null value in column transaction_date" error
- Requires parser default date

**Solution:**
```javascript
// Section 4: Florida House Expenses
console.log('\nParsing Florida House Expenses...');
// Default to last day of month for Florida House transactions without specific dates
currentDate = '2024-10-31'; // Use target month's last day
```

**Pre-Flight Check:**
- Check if Florida House section has dates
- If missing, flag for parser default date handling
- Verify parser defaults to correct month/year

---

### DSIL Design/LLC Reimbursement Exclusion (BUSINESS LOGIC)

**Lesson Source:** December 2024
**Applied:** All subsequent imports

**Issue:**
- Some gross income from DSIL Design labeled "Reimbursement:" in description
- These are company income payments, NOT personal reimbursements
- Should NOT have Reimbursement tag

**Rule:**
```javascript
// Check merchant BEFORE applying Reimbursement tag
const isDSILIncome = merchant && (
  merchant.includes('DSIL Design') ||
  merchant.includes('DSIL LLC')
);

if (isReimbursement && !isDSILIncome) {
  tags.push('Reimbursement');
  transactionType = 'income';
}
```

**Pre-Flight Check:**
- Search for DSIL Design/LLC transactions with "Reimbursement:" in description
- Flag for exclusion from Reimbursement tag
- Document in red flag log

---

### Column 3 vs Column 4 Distinction (TAG LOGIC)

**Lesson Source:** December 2024
**Applied:** All subsequent imports

**CSV Columns:**
- **Column 3:** "Reimbursable" - Tracking only, NO TAG
- **Column 4:** "Business Expense" - Apply "Business Expense" tag

**Rule:**
```javascript
// Column 4 "X" = Business Expense tag
if (row[4] === 'X' || row[4] === 'x') {
  tags.push('Business Expense');
}

// Column 3 "X" = NO TAG (just tracking for user)
// Do NOT create or apply any tag for column 3
```

**Common Confusion:**
- User marks some expenses in Column 3 for future reimbursement
- These should NOT get "Reimbursement" tag
- Only Column 4 "X" creates a tag

---

### Preserve Original Descriptions (USER PREFERENCE)

**Lesson Source:** December 2024
**Applied:** All subsequent imports

**Rule:**
- Import ALL descriptions exactly as-is from CSV
- No rewrites, corrections, or modifications
- Only exception: obvious data entry errors with user confirmation

**Rationale:**
- User prefers authentic original data
- Descriptions reflect context at time of entry
- Changes lose historical intent

---

### Manual Tag Fix Acceptable (IMPORT SCRIPT EDGE CASE)

**Lesson Source:** December 2024
**Applied:** All subsequent imports

**Issue:**
- Import script has rare edge case where 1 tag may not apply
- Occurs with specific description + amount combinations
- All other tags apply correctly

**Solution:**
```sql
-- Manual tag fix via direct database insert
INSERT INTO transaction_tags (transaction_id, tag_id)
VALUES (
  (SELECT id FROM transactions WHERE description = 'Meal Plan' AND transaction_date = '2024-12-16'),
  '205d99a2-cf0a-44e0-92f3-e2b9eae1bf72' -- Reimbursement tag ID
);
```

**When to Use:**
- After import, if tag verification shows 1 missing tag
- All other data correct
- Faster than re-importing entire month
- Document in red flag log

---

### Special Transaction User Consultation (UNUSUAL PATTERNS)

**Lesson Source:** January 2025
**Applied:** All subsequent imports

**Issue:**
- Some months have unusual transactions requiring user guidance
- Examples:
  - Income adjustment (-$602) - should it be negative income or positive expense?
  - Multiple rent payments (apartment move) - are both valid or is one a duplicate?
  - Large one-time expenses - are they correct or data entry errors?

**Solution:**
- Flag unusual patterns in pre-flight report
- Ask user for confirmation/guidance
- Document user decision in red flag log
- Implement correction in parsing script

**Common Patterns to Flag:**
- Multiple payments to same vendor on same day
- Unusually large amounts for recurring expenses
- Income adjustments or corrections
- Negative income amounts
- Multiple rent payments in one month

---

### Tag Verification is CRITICAL (QUALITY ASSURANCE)

**Lesson Source:** January 2025 (and March 2025 zero-tag disaster)
**Applied:** All subsequent imports

**Issue:**
- Import script may fail silently on tag application
- March 2025: ALL 253 transactions imported with ZERO tags (unusable)
- Requires two-step verification after every import

**Verification Process:**
```bash
# Step 1: Verify tags were applied
node -e "
const { createClient } = require('@supabase/supabase-js');
// Query transaction_tags table for current month
// Count tags by type
"

# Step 2: Verify tags mapped to correct IDs
node -e "
const { createClient } = require('@supabase/supabase-js');
// Join transactions + transaction_tags + tags
// Verify tag IDs match expected UUIDs
"
```

**Expected Counts:**
- Check pre-flight report for expected tag distribution
- Compare against database query results
- If mismatch: investigate before proceeding

**Tag ID Verification:**
- Reimbursement: `205d99a2-cf0a-44e0-92f3-e2b9eae1bf72`
- Florida House: `178739fd-1712-4356-b21a-8936b6d0a461`
- Business Expense: `973433bd-bf9f-469f-9b9f-20128def8726`
- Savings/Investment: `c0928dfe-1544-4569-bbad-77fea7d7e5aa`

---

### Import Script "New Tags" Message is Misleading (KNOWN BEHAVIOR)

**Lesson Source:** February 2025
**Applied:** All subsequent imports

**Issue:**
- Import script reports "New Tags: 3" even when no duplicates created
- Message checks script cache, not database existence
- Can cause confusion about tag duplication

**Solution:**
- Ignore "New Tags" console message
- Always verify with database queries
- Check transaction_tags join to confirm correct IDs
- Expected behavior: message will always show "new" tags

---

### PDF Formula Errors Acceptable (DATA SOURCE HIERARCHY)

**Lesson Source:** February 2025, December 2024
**Applied:** All subsequent imports

**Issue:**
- PDF daily totals may have formula errors
- PDF labels (e.g., "Gross Income") may reference wrong cells
- Database validation shows variance but line items match

**Rule:**
- **Database is source of truth**, not PDF labels or calculated totals
- If line items match 1:1, accept variance in daily/section totals
- Document variance in validation report
- Status: ACCEPTABLE (not a data integrity issue)

**Validation Approach:**
- Level 1: Check section grand totals (±2% threshold)
- Level 2: Check daily subtotals (flag variances)
- Level 6: 100% line item verification (MUST match)
- If Level 6 passes but Level 2 shows variance → PDF formula error (acceptable)

---

### Duplicate Handling Requires User Decision (DATA AMBIGUITY)

**Lesson Source:** March 2025
**Applied:** All subsequent imports

**Issue:**
- Same transaction may appear in Expense Tracker AND Florida House
- Example: Florida utility payment in both sections
- Parser must know which to keep

**Default Rule (FINAL_PARSING_RULES.md):**
- Keep Expense Tracker version
- Remove Florida House duplicate

**Exception:**
- User may override default
- Flag duplicates in pre-flight report
- Ask user which version to keep
- Document decision in red flag log

---

### Apartment Move Special Case (MULTIPLE RENTS)

**Lesson Source:** January 2025
**Applied:** All subsequent imports

**Pattern:**
- Month shows 2 different rent amounts (e.g., THB 25,000 and THB 35,000)
- Indicates apartment move (partial month each location)
- Both are valid, NOT duplicates

**Pre-Flight Check:**
- Flag multiple rent payments
- Confirm with user if unusual (especially if different from typical pattern)
- Document in red flag log as INFO (not a problem)

---

### Validation Agent PDF Matching Error (PROCESS IMPROVEMENT)

**Lesson Source:** November 2024 validation
**Applied:** v3.6 improvements

**Issue:**
- Validation agent reported refunds as "missing" from database
- Refunds were actually present, but query logic was incorrect
- Agent looked for negative amounts when they were correctly stored as positive income

**Improved Verification Logic:**
```javascript
// WRONG (November 2024 error)
const refunds = await supabase
  .from('transactions')
  .select('*')
  .filter('amount', 'lt', 0);  // ❌ Will find nothing (all amounts positive)

// CORRECT (v3.6 improvement)
const refunds = await supabase
  .from('transactions')
  .select('*')
  .filter('transaction_type', 'eq', 'income')
  .filter('description', 'ilike', '%refund%');  // ✅ Finds refunds as positive income
```

**Validation Protocol Update:**
- Query by transaction_type + description pattern, NOT by amount sign
- Verify critical transactions using multiple approaches
- Cross-check against PDF line items (1:1 verification)

---

## 🔧 4-Phase Import Process

### PHASE 1: Pre-Flight Analysis

**Agent Type:** `data-engineer` (via Task tool)

**Objective:** Analyze CSV and PDF to understand data structure, identify issues, and set expectations BEFORE parsing.

**Prerequisites:**
- PDF file for target month exists and is accessible
- CSV file is up to date
- FINAL_PARSING_RULES.md has been reviewed

**Detailed Prompt Template:**

```
Analyze {MONTH} {YEAR} data from csv_imports/fullImport_20251017.csv and csv_imports/Master Reference PDFs/Budget for Import-page{PAGE}.pdf using scripts/FINAL_PARSING_RULES.md.

**STEP 0 - CRITICAL PDF VERIFICATION (DO THIS FIRST)**:
Before starting any analysis, you MUST verify the PDF contains {MONTH} {YEAR} data:
1. Read: csv_imports/Master Reference PDFs/Budget for Import-page{PAGE}.pdf
2. Find the first transaction date in the "Expense Tracker" section
3. Verify it shows "{MONTH} {YEAR}" (e.g., "Wednesday, October 1, 2024" or "Thursday, October 2, 2024")
4. If PDF shows ANY other month, STOP IMMEDIATELY
5. Report to user: "PDF verification failed - Budget for Import-page{PAGE}.pdf contains [ACTUAL MONTH] data, not {MONTH} {YEAR}"
6. Note: Expected page number is {PAGE} (October 2025 = page1, {MONTH} {YEAR} = {MONTHS_BACK} months back = page{PAGE})
7. Consult PDF-MONTH-MAPPING.md or ask user for correct path before continuing

Only proceed with tasks 1-10 below if Step 0 passes (PDF contains {MONTH} {YEAR} data).

Tasks:
1. Find line numbers for all 4 sections in CSV:
   - Expense Tracker
   - Gross Income Tracker
   - Personal Savings & Investments
   - Florida House Expenses
   NOTE: {MONTH} {YEAR} should be {POSITION} in the CSV (relative to {PREVIOUS_MONTH}).

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
   - NOTE: User must decide on duplicates (learned from March 2025)

6. Count tag conditions:
   - Reimbursements: description matches `/^Re(im|mi|m)?burs[e]?ment:?/i` (includes typos + no colon variants)
   - EXCLUDE from Reimbursement count: DSIL Design or DSIL LLC merchant (company income, no tag)
   - Business Expenses: column 4 has "X" (expense with tag)
   - Reimbursables: column 3 has "X" (tracking only, NO tag)
   - Florida House: from Florida House section (expense with tag)
   - Savings/Investment: from Savings section (expense with tag)

7. Identify currency distribution:
   - USD transactions (column 7/9 has value, column 6 no THB)
   - THB transactions (column 6 has "THB XXX")
   - Mixed/other patterns

8. Verify parsing script correctness:
   - Check if scripts/parse-{month}-{year}.js exists
   - If NOT exists: flag that script needs to be created following parse-{previous-month}-{year}.js pattern
   - If exists: verify it uses Column 6 for THB (NOT Column 8 conversion)
   - If exists: verify it handles negative amounts (converts to positive income)
   - If exists: verify it handles comma-formatted amounts
   - If exists: verify it has typo reimbursement regex
   - If exists: verify it defaults Florida House dates to {YEAR}-{MONTH}-{LAST_DAY}
   - If exists: verify it excludes DSIL Design/LLC from Reimbursement tag

9. Compare to previous months:
   - [List all 12 completed imports with transaction counts, reimb counts, THB %]
   - Flag significant structural differences
   - NOTE: {MONTH} {YEAR} is {POSITION} month - may have different patterns

10. Identify anomalies (CRITICAL - LESSONS FROM ALL PREVIOUS MONTHS):
    - **Negative amounts**: Check for $(xxx) or negative signs in expense rows (MUST convert to income)
    - **Comma-formatted amounts**: Check for amounts like "$3,490.02" or "$1,000.00" (MUST handle in parser)
    - **Typo reimbursements**: Check for "Remibursement", "Rembursement", "Reimbursment" variants
    - **DSIL Design reimbursements**: Flag any DSIL Design/LLC transactions with "Reimbursement:" in description (should NOT get tag)
    - **Unusual transactions**: Multiple rents, income adjustments, large one-time expenses (requires user consultation)
    - **Unusually large amounts**: Flag USD amounts >$1000 that seem abnormal for recurring expenses
    - **Currency errors**: Compare recurring expenses (rent, cleaning, utilities) to later months
    - **Missing dates in Florida House**: Check if Florida House section has dates
    - Missing amounts
    - Invalid dates (e.g., wrong year)
    - Unusual patterns
    - Data quality issues

Output Files:
- scripts/{MONTH}-{YEAR}-PREFLIGHT-REPORT.md
- scripts/{MONTH}-{YEAR}-RED-FLAGS.md (for tracking anomalies/issues for later review)

Report must include:
- PDF verification status (CRITICAL - must pass before continuing)
- Line number ranges for each section
- Transaction counts per section
- Expected totals from PDF (source of truth)
- Expected total calculation
- Duplicate detection results with line numbers
- Tag distribution preview (counts)
- Currency breakdown (USD vs THB vs other)
- Parsing script verification status (exists/needs creation/needs correction)
- Comparison to previous months (all 12 completed imports)
- **Negative amounts flagged** (with line numbers) - CRITICAL
- **Comma-formatted amounts flagged** (with line numbers) - CRITICAL
- **Typo reimbursements flagged** (with line numbers) - CRITICAL
- **DSIL Design reimbursements flagged** (with line numbers) - CRITICAL
- **Unusual transactions flagged** (with line numbers) - CRITICAL for user consultation
- **Missing dates in Florida House flagged** - CRITICAL
- **Currency anomalies flagged** (comparing to typical patterns)
- Red flags or structural differences
- Parsing strategy recommendations

Red Flag Log Must Include:
For EACH anomaly/issue discovered:
- Transaction details (date, description, amount, line number)
- Issue type (negative amount, comma-formatted, duplicate, currency error, typo reimbursement, DSIL Design reimbursement, missing date, unusual transaction, etc.)
- Severity (CRITICAL / WARNING / INFO)
- Phase detected (Pre-Flight)
- Status (OPEN / RESOLVED / ACCEPTED)
- Notes/context
- **Comparison to previous months** (if applicable)
- **User consultation needed** (YES / NO)

CRITICAL VERIFICATION:
- Verify PDF month matches {MONTH} {YEAR} (MUST DO FIRST)
- Verify rent transaction should be THB 25,000-35,000 (or flag if different pattern)
- Verify parsing script uses Column 6 for THB amounts (or flag if needs creation)
- Verify parsing script does NOT use Column 8 (conversion column)
- **Flag ANY negative amounts for conversion to income**
- **Flag ANY comma-formatted amounts for special parsing**
- **Flag ANY typo reimbursements for regex detection**
- **Flag ANY DSIL Design reimbursements for exclusion from tag**
- **Flag ANY unusual transactions for user consultation**
- **Flag ANY missing dates in Florida House section**
- **Flag ANY currency anomalies**

This is critical pre-import validation - flag any anomalies before we proceed to parsing.

IMPORTANT: Create both output files (report and red flag log) with all findings. Return a summary of the key findings including any red flags that need human review before proceeding, especially any unusual transactions that require user consultation and any DSIL Design reimbursements that should not get tags.
```

**Output Files:**
- `scripts/{MONTH}-{YEAR}-PREFLIGHT-REPORT.md`
- `scripts/{MONTH}-{YEAR}-RED-FLAGS.md`

**Human Checkpoint:** ⏸️
- Review pre-flight report thoroughly
- Review red flag log for all issues
- **Address critical issues:**
  - Confirm PDF month is correct
  - Provide guidance on unusual transactions
  - Confirm DSIL Design exclusions
  - Approve parsing strategy
  - Make decisions on duplicates
- Only proceed to Phase 2 after approval

---

### PHASE 2: Parse & Prepare

**Agent Type:** `data-engineer` (via Task tool)

**Objective:** Parse CSV data following FINAL_PARSING_RULES.md exactly, producing clean JSON for import with ALL lessons applied.

**Prerequisites:**
- ✅ Pre-flight report reviewed and approved
- ✅ PDF verified as correct month
- ✅ Line ranges identified
- ✅ User corrections confirmed for any red flags
- ✅ Unusual transactions guidance received
- ✅ DSIL Design exclusions confirmed

**Detailed Prompt Template:**

```
Parse {MONTH} {YEAR} transactions following scripts/FINAL_PARSING_RULES.md exactly, incorporating ALL lessons learned from 12 previous imports.

Source: csv_imports/fullImport_20251017.csv
Line Ranges: [from pre-flight report]
  - Expense Tracker: lines X-Y
  - Gross Income: lines X-Y
  - Savings/Investment: lines X-Y
  - Florida House: lines X-Y

**USER-CONFIRMED CORRECTIONS** (if any from Phase 1):
[List any corrections confirmed by user during pre-flight review]
Example:
- Line 1234: Christmas Dinner - EXCLUDE from Business Expense tag (personal celebration)
- Line 5678: Multiple rents - BOTH valid (apartment move)

Critical Requirements:

1. **Currency Handling (MOST IMPORTANT - FOUNDATIONAL LESSON):**
   - THB transactions: Use Column 6 value (e.g., "THB 25000.00")
   - USD transactions: Use Column 7 or Column 9 (subtotal) value
   - NEVER use Column 8 (conversion column)
   - Store currency as 'THB' or 'USD' in the currency field
   - Store amount as the ORIGINAL currency amount (e.g., 25000 for THB, not 735)
   - **Verification**: Rent should be THB 25,000-35,000 (NOT ~$740 USD)

2. **CRITICAL: Negative Amount Handling (MARCH LESSON):**
   - ANY negative expense amount MUST be converted to positive income
   - This includes refunds, credits, partial refunds, winnings, trade-ins, compensation, settlements
   - Implementation:
     ```javascript
     else if (amount < 0) {
       transactionType = 'income';
       amount = Math.abs(amount);
       console.log(`✓ REFUND/INCOME: Converting negative expense to positive income`);
     }
     ```
   - Database constraint requires ALL amounts to be positive
   - Document all conversions in red flag log

3. **CRITICAL: Comma-Formatted Amount Handling (MARCH LESSON):**
   - Clean ALL currency symbols: $, commas, quotes, tabs, parentheses, spaces
   - Example: "$3,490.02" or "$ 3,490.02" or "$1,000.00" or "$\t1,000.00" → 3490.02 or 1000.00
   - Implementation:
     ```javascript
     function parseAmount(amountStr) {
       const cleaned = amountStr.replace(/[$,"\t()\s]/g, '').trim();
       return parseFloat(cleaned);
     }
     ```

4. **CRITICAL: Typo Reimbursement Detection (FEBRUARY LESSON):**
   - Standard: description starts with "Reimbursement:"
   - Also detect: "Remibursement:", "Rembursement:", "Reimbursment:"
   - Also allow without colon: "Reimbursement" (January lesson)
   - Implementation:
     ```javascript
     const isReimbursement = /^Re(im|mi|m)?burs[e]?ment:?/i.test(description.trim());
     ```

5. **CRITICAL: DSIL Design/LLC Exclusion (DECEMBER LESSON):**
   - Check merchant BEFORE applying Reimbursement tag
   - DSIL Design and DSIL LLC transactions = company income (NO tag)
   - Implementation:
     ```javascript
     const isDSILIncome = merchant && (
       merchant.includes('DSIL Design') ||
       merchant.includes('DSIL LLC')
     );

     if (isReimbursement && !isDSILIncome) {
       tags.push('Reimbursement');
       transactionType = 'income';
     }
     ```

6. **CRITICAL: Florida House Date Handling (FEBRUARY LESSON):**
   - Florida House section may have missing dates in CSV
   - Default to last day of month if no date found: '{YEAR}-{MONTH}-{LAST_DAY}'
   - Implementation:
     ```javascript
     // Section 4: Florida House Expenses
     console.log('\nParsing Florida House Expenses...');
     // Default to last day of month for Florida House transactions without specific dates
     currentDate = '{YEAR}-{MONTH}-{LAST_DAY}';
     ```

7. **CRITICAL: Column 3 vs Column 4 Distinction (DECEMBER LESSON):**
   - Column 3 "X" = Reimbursable (tracking only, NO TAG)
   - Column 4 "X" = Business Expense (apply tag)
   - Implementation:
     ```javascript
     // Only column 4 creates a tag
     if (row[4] === 'X' || row[4] === 'x') {
       tags.push('Business Expense');
     }
     // Column 3 "X" creates NO TAG
     ```

8. **CRITICAL: Preserve Original Descriptions (DECEMBER LESSON):**
   - Import ALL descriptions exactly as-is from CSV
   - No rewrites, corrections, or modifications
   - User prefers authentic original data

9. Parse all 4 sections:
   - Expense Tracker (lines X-Y from pre-flight)
   - Gross Income Tracker (lines X-Y)
   - Personal Savings & Investments (lines X-Y)
   - Florida House Expenses (lines X-Y)

10. Apply tag logic correctly:
    - "Reimbursement": description matches `/^Re(im|mi|m)?burs[e]?ment:?/i` → income type + tag
      - ❌ UNLESS merchant is "DSIL Design" or "DSIL LLC" (company income, no tag)
    - "Florida House": from Florida House section → expense type + tag
    - "Business Expense": column 4 has "X" → expense type + tag (NOT column 3)
    - "Savings/Investment": from Savings section → expense type + tag

11. Handle duplicates (per user decisions from pre-flight):
    - Remove duplicates between Expense Tracker and Florida House
    - Keep Expense Tracker version per FINAL_PARSING_RULES.md (unless user specifies otherwise)
    - Document which transactions were removed

12. Quality checks:
    - Verify total transaction count matches pre-flight expectation
    - Verify tag counts match pre-flight expectations
    - Verify currency distribution matches pre-flight
    - Verify NO negative amounts in output
    - Verify all dates are valid and in correct month/year
    - Verify rent transaction is THB (not USD conversion)

Output Files:
- scripts/{month}-{year}-CORRECTED.json (formatted, ready for import)
- Update scripts/{MONTH}-{YEAR}-RED-FLAGS.md with parsing results:
  - User-confirmed corrections applied
  - Negative amount conversions (with details)
  - Typo reimbursements detected (with details)
  - Comma-formatted amounts handled (with details)
  - Florida House dates defaulted (if any)
  - Parsing verification summary

Final Verification Summary in Red Flag Log:
✅ Rent: {amount} {currency} (verify THB, not USD)
✅ Line {number}: ${amount} USD (comma-formatted, if applicable)
✅ Refunds: {count} found (all converted to positive income)
✅ Negative amounts in output: 0
✅ Currency distribution: {usd_count} USD, {thb_count} THB
✅ Typo reimbursements detected: {count}
✅ Negative conversions: {count}
✅ Comma-formatted amounts: {count}
✅ Florida dates defaulted: {count}
✅ DSIL Design exclusions: {count}

Ready for Import: ✅ YES / ❌ NO

IMPORTANT: Update the red flag log with comprehensive parsing results. Document EVERY correction, conversion, and special handling for full audit trail.
```

**Output Files:**
- `scripts/{month}-{year}-CORRECTED.json`
- Updated `scripts/{MONTH}-{YEAR}-RED-FLAGS.md`

**Human Checkpoint:** ⏸️
- Review parsing results
- Verify transaction count matches expectations
- Review all corrections and conversions in red flag log
- Spot-check critical transactions (rent, large amounts, refunds)
- Confirm ready for database import

---

### PHASE 3: Database Import

**Agent Type:** Direct bash commands (NOT an agent)

**Objective:** Import parsed JSON to Supabase database and verify tag application.

**Prerequisites:**
- ✅ JSON file created and verified
- ✅ Parsing results approved by user
- ✅ Red flag log updated with parsing results

**Step-by-Step Commands:**

**Step 1: Import to Database**
```bash
cd /Users/dennis/Code\ Projects/joot-app
node scripts/db/import-month.js scripts/{month}-{year}-CORRECTED.json
```

**Expected Output:**
```
Reading JSON file: scripts/{month}-{year}-CORRECTED.json
Found XXX transactions to import

Processing transactions...
✓ Imported XXX/XXX transactions
New Vendors: XX
New Payment Methods: XX
New Tags: XX [NOTE: This message is misleading - verify with queries below]

Import Summary:
- Total: XXX
- Expenses: XXX
- Income: XXX
- USD: XXX
- THB: XXX
```

**Step 2: Verify Tag Application**

Create verification script or run direct queries:

```bash
# Verify tags were applied (count by tag type)
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const startDate = '{YEAR}-{MONTH}-01';
  const endDate = '{YEAR}-{MONTH}-{LAST_DAY}';

  // Get all tags for this month
  const { data: transactions } = await supabase
    .from('transactions')
    .select(\`
      id,
      description,
      amount,
      transaction_date,
      transaction_tags (
        tags (
          id,
          name
        )
      )
    \`)
    .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  // Count tags by type
  const tagCounts = {};
  transactions.forEach(t => {
    if (t.transaction_tags?.length > 0) {
      t.transaction_tags.forEach(tt => {
        const tagName = tt.tags?.name || 'Unknown';
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      });
    }
  });

  console.log('Tag Distribution:');
  console.log(tagCounts);
  console.log(\`Total transactions: \${transactions.length}\`);
  console.log(\`Tagged transactions: \${transactions.filter(t => t.transaction_tags?.length > 0).length}\`);
})();
"
```

**Step 3: Verify Tag ID Mapping**

```bash
# Verify tag IDs match expected UUIDs
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EXPECTED_TAG_IDS = {
  'Reimbursement': '205d99a2-cf0a-44e0-92f3-e2b9eae1bf72',
  'Florida House': '178739fd-1712-4356-b21a-8936b6d0a461',
  'Business Expense': '973433bd-bf9f-469f-9b9f-20128def8726',
  'Savings/Investment': 'c0928dfe-1544-4569-bbad-77fea7d7e5aa'
};

(async () => {
  const { data: tags } = await supabase
    .from('tags')
    .select('id, name')
    .in('name', Object.keys(EXPECTED_TAG_IDS));

  console.log('Tag ID Verification:');
  tags.forEach(tag => {
    const expected = EXPECTED_TAG_IDS[tag.name];
    const match = tag.id === expected ? '✅' : '❌';
    console.log(\`\${match} \${tag.name}: \${tag.id} (expected: \${expected})\`);
  });
})();
"
```

**Step 4: Manual Tag Fix (if needed)**

If tag verification shows 1 missing tag (edge case from December 2024 lesson):

```bash
# Manual tag insert
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Find transaction
  const { data: transaction } = await supabase
    .from('transactions')
    .select('id')
    .eq('description', '{DESCRIPTION}')
    .eq('transaction_date', '{DATE}')
    .single();

  if (transaction) {
    // Insert tag
    const { error } = await supabase
      .from('transaction_tags')
      .insert({
        transaction_id: transaction.id,
        tag_id: '{TAG_ID}'
      });

    if (error) {
      console.error('Error:', error);
    } else {
      console.log('✅ Tag applied manually');
    }
  } else {
    console.log('❌ Transaction not found');
  }
})();
"
```

**Success Criteria:**
- Import completes without errors
- Transaction count matches JSON file
- Tag counts match pre-flight expectations
- Tag IDs match expected UUIDs
- No duplicate transactions created

**Human Checkpoint:** ⏸️
- Review import summary
- Verify tag verification results
- Confirm all expected tags applied
- If 1 tag missing: apply manual fix and re-verify
- Only proceed to Phase 4 after verification passes

**Update Red Flag Log:**
```markdown
## Import Run: {TIMESTAMP}

**Status:** SUCCESS / PARTIAL (1 manual tag fix) / FAILED

**Import Results:**
- Total imported: XXX
- Expenses: XXX
- Income: XXX
- USD: XXX
- THB: XXX

**Tag Verification:**
- Reimbursement: XXX (expected: XXX) ✅/❌
- Florida House: XXX (expected: XXX) ✅/❌
- Business Expense: XXX (expected: XXX) ✅/❌
- Savings/Investment: XXX (expected: XXX) ✅/❌

**Tag ID Verification:**
- All tag IDs match expected UUIDs: ✅/❌

**Manual Fixes Applied:**
- [List any manual tag inserts or corrections]

**Issues Found:**
- [List any import errors or discrepancies]
```

---

### PHASE 4: Comprehensive Validation

**Agent Type:** `data-scientist` (via Task tool)

**Objective:** Perform 6-level comprehensive validation against PDF source of truth, achieving 100% verification.

**Prerequisites:**
- ✅ Import completed successfully
- ✅ Tag verification passed
- ✅ Tag ID mapping verified
- ✅ Manual fixes applied (if needed)

**Detailed Prompt Template:**

```
Perform comprehensive 6-level validation of {MONTH} {YEAR} import against PDF source of truth.

**Data Sources:**
- PDF: csv_imports/Master Reference PDFs/Budget for Import-page{PAGE}.pdf
- Database: Supabase (user: dennis@dsil.design)
- Month: {YEAR}-{MONTH}-01 to {YEAR}-{MONTH}-{LAST_DAY}

**Expected Counts (from pre-flight):**
- Total transactions: XXX
- Expenses: XXX
- Income: XXX
- USD: XXX
- THB: XXX
- Reimbursement tags: XXX
- Florida House tags: XXX
- Business Expense tags: XXX
- Savings/Investment tags: XXX

**Validation Levels:**

**Level 1: Section Grand Totals**

Compare database totals against PDF section totals:

1. Expense Tracker NET total:
   - PDF Total: $X,XXX.XX (from PDF grand total)
   - DB Total: [calculate sum of expenses in Expense Tracker]
   - Variance: [calculate]
   - Threshold: ±2% OR ±$150
   - Status: PASS / FAIL

2. Florida House total:
   - PDF Total: $X,XXX.XX
   - DB Total: [calculate sum of Florida House tagged transactions]
   - Variance: [calculate]
   - Threshold: ±$5
   - Status: PASS / FAIL

3. Savings/Investment total:
   - PDF Total: $X,XXX.XX
   - DB Total: [calculate sum of Savings/Investment tagged transactions]
   - Variance: [calculate]
   - Threshold: Exact match
   - Status: PASS / FAIL

4. Gross Income total:
   - PDF Total: $XXX.XX
   - DB Total: [calculate sum of income transactions]
   - Variance: [calculate]
   - Threshold: Within $1
   - Status: PASS / FAIL

**Level 2: Daily Subtotals Analysis**

Extract daily totals from PDF and compare to database:

1. Calculate database daily totals (by transaction_date)
2. Extract PDF daily totals (if available in PDF)
3. Compare each day
4. Variance threshold: ±$1 per day
5. Flag discrepancies
6. NOTE: If Level 1 passes but Level 2 shows variance → likely PDF formula error (acceptable per February lesson)

**Level 3: Transaction Count Verification**

| Category | Database | Expected | Match |
|----------|----------|----------|-------|
| Total | [count] | XXX | ✅/❌ |
| Expenses | [count] | XXX | ✅/❌ |
| Income | [count] | XXX | ✅/❌ |
| USD | [count] | XXX | ✅/❌ |
| THB | [count] | XXX | ✅/❌ |

**Level 4: Tag Distribution**

| Tag | Database | Expected | Match |
|-----|----------|----------|-------|
| Reimbursement | [count] | XXX | ✅/❌ |
| Florida House | [count] | XXX | ✅/❌ |
| Business Expense | [count] | XXX | ✅/❌ |
| Savings/Investment | [count] | XXX | ✅/❌ |

**CRITICAL (November 2024 lesson):**
- Do NOT query for negative amounts when looking for refunds
- Refunds are stored as POSITIVE income transactions
- Query by: transaction_type='income' AND description ILIKE '%refund%'

**Level 5: Critical Transaction Spot Checks**

Verify these specific critical transactions exist in database:

1. **Rent Transaction:**
   - PDF: "This Month's Rent" | THB 25,000-35,000 | {DATE}
   - DB Query: Find by description + date
   - Verify: Amount matches, Currency is THB (NOT USD), Date matches
   - Status: FOUND / MISSING

2. **Florida House Transactions:**
   - PDF: Count transactions in Florida House section
   - DB Query: Count transactions with Florida House tag
   - Status: MATCH / MISMATCH

3. **Refunds (if any in pre-flight):**
   - PDF: [List refunds from pre-flight]
   - DB Query: transaction_type='income' AND description ILIKE '%refund%'
   - Verify: All refunds present as POSITIVE income (NOT negative)
   - Status: ALL FOUND / SOME MISSING

4. **Comma-Formatted Amounts (if flagged in pre-flight):**
   - PDF: Line {number} | ${amount with comma}
   - DB Query: Find by description + date
   - Verify: Amount parsed correctly (e.g., $1,000.00 → 1000, NOT 1 or 100000)
   - Status: CORRECT / INCORRECT

**Level 6: 100% Comprehensive 1:1 Verification**

Perform complete PDF ↔ Database verification:

1. **PDF → Database (100% coverage):**
   - Extract ALL transactions from PDF (all 4 sections)
   - For each PDF transaction:
     - Find matching database transaction (by date + description + amount)
     - Verify: amount matches (within $0.10), currency matches, date matches, type matches
     - Mark: FOUND / MISSING / MISMATCH
   - Calculate: Match rate (must be 100%)

2. **Database → PDF (100% coverage):**
   - Query ALL database transactions for this month
   - For each database transaction:
     - Find in PDF extraction
     - Verify: present in PDF
     - Mark: VERIFIED / NOT_IN_PDF
   - Calculate: Verification rate (must be 100%)

3. **Discrepancy Analysis:**
   - List any missing transactions
   - List any mismatched amounts/dates/types
   - Categorize: CRITICAL / WARNING / INFO
   - For each discrepancy:
     - Provide transaction details
     - Explain likely cause
     - Recommend action (fix / acceptable / investigate)

**Exchange Rate Calculation:**

From PDF rent transaction:
- Description: "This Month's Rent"
- Amount: THB {amount} = ${usd_amount} USD
- Calculated Rate: {usd_amount / thb_amount} (e.g., 740 / 25000 = 0.0296)
- Use this rate for ALL THB to USD conversions in validation

**Output Files:**

1. `scripts/{MONTH}-{YEAR}-VALIDATION-REPORT.md`
   - Executive summary
   - All 6 validation levels with results
   - Pass/fail status for each level
   - Overall pass/fail recommendation

2. Update `scripts/{MONTH}-{YEAR}-RED-FLAGS.md`
   - Append validation results
   - Document any discrepancies found
   - Flag items for human review

3. `scripts/{MONTH}-{YEAR}-COMPREHENSIVE-VALIDATION.md` (if doing 100% verification)
   - Complete PDF transaction extraction
   - PDF → DB verification table
   - DB → PDF verification table
   - Detailed discrepancy analysis

**Red Flag Criteria:**

Log red flag if:
- Section grand total variance > threshold (CRITICAL)
- Transaction count mismatch (CRITICAL)
- Tag count mismatch (CRITICAL)
- Critical transaction missing (CRITICAL - e.g., rent, refunds)
- Daily variance > $10 (WARNING - unless Level 6 passes, then PDF formula error)
- Amount mismatch > $0.10 (WARNING)
- Any transaction missing from PDF or DB (CRITICAL)

**Success Criteria:**

- Level 1: All section totals within variance thresholds
- Level 2: Daily variances acceptable (or explained by PDF formula errors)
- Level 3: All transaction counts exact match
- Level 4: All tag counts exact match
- Level 5: All critical transactions verified
- Level 6: 100% match rate both directions

**IMPORTANT NOTES:**

1. **Refund Verification (November 2024 lesson):**
   - Do NOT look for negative amounts
   - Query: transaction_type='income' AND description contains 'refund'
   - Verify stored as POSITIVE income amounts

2. **PDF Formula Errors (February/December lesson):**
   - If Level 1 shows variance but Level 6 shows 100% line item match
   - Likely PDF daily total formula error
   - Status: ACCEPTABLE (database is source of truth)
   - Document in validation report

3. **Database is Source of Truth:**
   - If PDF labels incorrect but line items match → database correct
   - Focus on 1:1 transaction verification, not PDF calculated totals

Please perform all 6 levels of validation and create comprehensive reports. Flag any discrepancies for human review.
```

**Output Files:**
- `scripts/{MONTH}-{YEAR}-VALIDATION-REPORT.md`
- Updated `scripts/{MONTH}-{YEAR}-RED-FLAGS.md`
- `scripts/{MONTH}-{YEAR}-COMPREHENSIVE-VALIDATION.md` (optional)

**Success Criteria:**
- All 6 validation levels pass
- 100% transaction match rate (PDF ↔ Database)
- All critical transactions verified
- Zero unexplained discrepancies

**Human Checkpoint:** ⏸️
- Review validation report thoroughly
- Investigate any red flags
- Verify acceptable variances (PDF formula errors)
- Approve import as production-ready OR identify fixes needed

**Final Status:**

✅ **APPROVED FOR PRODUCTION** - All validations passed
⚠️ **APPROVED WITH NOTES** - Minor acceptable variances (PDF formula errors)
❌ **FAILED - REQUIRES FIXES** - Critical discrepancies found

---

## ✅ Success Criteria

### Must Pass (Blocking)

1. **PDF Verification:**
   - PDF contains correct month data (verified in Phase 1 Step 0)
   - First transaction date matches target month

2. **Parsing Accuracy:**
   - All negative amounts converted to positive income
   - All comma-formatted amounts parsed correctly
   - All typo reimbursements detected
   - All DSIL Design exclusions applied
   - Currency handling correct (THB from Column 6, USD from Column 7/9, NOT Column 8)
   - No negative amounts in final JSON

3. **Import Integrity:**
   - Import completes without errors
   - Transaction count matches JSON file
   - No duplicate transactions created

4. **Tag Verification:**
   - All expected tags applied (within ±1 for edge cases)
   - Tag IDs match expected UUIDs
   - Manual fix applied if 1 tag missing (acceptable)

5. **Validation Levels:**
   - Level 1: Section grand totals within variance thresholds
   - Level 3: Transaction counts exact match
   - Level 4: Tag counts exact match (within ±1)
   - Level 5: All critical transactions verified
   - Level 6: 100% transaction match rate (both directions)

### Should Pass (Quality)

1. **Level 2: Daily Subtotals:**
   - Daily variances within ±$1
   - If variance > $1 but Level 6 passes → acceptable (PDF formula error)

2. **Red Flag Resolution:**
   - All CRITICAL red flags resolved
   - All WARNING red flags investigated
   - All INFO red flags documented

3. **Data Quality:**
   - All descriptions preserved exactly as-is
   - All dates valid and in correct month
   - All amounts reasonable (no obvious data entry errors)

### Acceptance Thresholds

- **Section Grand Totals:** ±2% OR ±$150 for Expense Tracker, ±$5 for Florida House, exact for Savings/Investment, ±$1 for Gross Income
- **Daily Variances:** ±$1 per day (or explained by PDF formula errors)
- **Transaction Count:** Must be exact match
- **Tag Count:** Must be exact match (±1 for edge case manual fix)
- **Amount Precision:** Within $0.10 per transaction
- **100% Verification:** Must achieve 100% match rate in both directions

---

## 🚨 Red Flag Categories

### CRITICAL (Blocks Production)

1. **Data Integrity Issues:**
   - Negative amounts in final JSON
   - Incorrect currency (USD instead of THB for rent)
   - Missing critical transactions (rent, refunds)
   - Duplicate transactions created
   - Wrong month imported

2. **Import Failures:**
   - Import script errors
   - Database constraint violations
   - Zero tags applied (March 2025 disaster scenario)
   - Tag IDs don't match expected UUIDs

3. **Validation Failures:**
   - Section grand total variance > threshold
   - Transaction count mismatch
   - Tag count mismatch > 1
   - 100% verification fails (< 100% match rate)

### WARNING (Investigate Before Approval)

1. **Data Quality:**
   - Unusually large amounts (>$1000 for recurring expenses)
   - Multiple payments to same vendor on same day (unless explained)
   - Unusual transaction patterns

2. **Parsing Issues:**
   - Many typo reimbursements (indicates data quality issue)
   - Many comma-formatted amounts (check parser)
   - Missing Florida House dates (verify default applied)

3. **Validation Variances:**
   - Daily subtotal variances > $1 (check PDF formula errors)
   - Minor amount mismatches ($0.10-$1.00)

### INFO (Document Only)

1. **Processing Notes:**
   - Negative amount conversions applied
   - Typo reimbursements detected and tagged
   - Comma-formatted amounts parsed
   - Florida House dates defaulted
   - DSIL Design exclusions applied
   - Duplicates removed

2. **Special Cases:**
   - User-confirmed corrections applied
   - Manual tag fix performed
   - PDF formula errors identified

---

## 🔧 Recovery Procedures

### Parsing Failures

**Scenario:** Parser produces incorrect JSON

**Recovery Steps:**
1. Identify error from parsing output
2. Check relevant lesson learned section in this protocol
3. Update parsing script with fix
4. Delete incorrect JSON file
5. Re-run parser
6. Verify fix in output
7. Update red flag log with issue and resolution

**Common Fixes:**
- Add comma cleaning to parseAmount()
- Add typo reimbursement regex
- Add DSIL Design exclusion check
- Fix Florida House date defaulting
- Fix negative amount conversion

---

### Import Failures

**Scenario:** Import script fails or produces incorrect results

**Recovery Steps:**

**If import started but failed midway:**
1. Check error message
2. Identify last successful transaction
3. Delete partial import:
   ```sql
   DELETE FROM transactions
   WHERE user_id = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6'
   AND transaction_date >= '{YEAR}-{MONTH}-01'
   AND transaction_date <= '{YEAR}-{MONTH}-{LAST_DAY}';
   ```
4. Fix root cause (JSON formatting, database connection, etc.)
5. Re-run import
6. Verify complete import

**If import succeeded but tags not applied:**
1. DO NOT delete transactions immediately
2. Check if JSON file has tags
3. If JSON has tags but DB doesn't:
   - Import script bug (March 2025 scenario)
   - Delete all transactions for month
   - Fix import script tag logic
   - Re-import
4. If JSON missing tags:
   - Parser bug
   - Delete all transactions for month
   - Fix parser
   - Re-parse
   - Re-import

**If import created duplicates:**
1. Query to identify duplicates:
   ```sql
   SELECT transaction_date, description, amount, COUNT(*)
   FROM transactions
   WHERE user_id = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6'
   AND transaction_date >= '{YEAR}-{MONTH}-01'
   AND transaction_date <= '{YEAR}-{MONTH}-{LAST_DAY}'
   GROUP BY transaction_date, description, amount
   HAVING COUNT(*) > 1;
   ```
2. Manually delete duplicates (keep first instance):
   ```sql
   DELETE FROM transactions
   WHERE id IN (
     SELECT id FROM (
       SELECT id, ROW_NUMBER() OVER (
         PARTITION BY transaction_date, description, amount
         ORDER BY created_at DESC
       ) as rn
       FROM transactions
       WHERE user_id = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6'
       AND transaction_date >= '{YEAR}-{MONTH}-01'
       AND transaction_date <= '{YEAR}-{MONTH}-{LAST_DAY}'
     ) t
     WHERE rn > 1
   );
   ```
3. Verify duplicates removed
4. Re-run validation

---

### Tag Verification Failures

**Scenario:** Tags not applied or mapped incorrectly

**Recovery Steps:**

**If 1 tag missing (edge case):**
1. Confirm only 1 tag missing (acceptable per December 2024 lesson)
2. Identify transaction needing tag
3. Apply manual tag fix (see Phase 3 Step 4)
4. Re-verify tag counts
5. Document in red flag log

**If multiple tags missing:**
1. Query to check transaction_tags table:
   ```sql
   SELECT COUNT(*)
   FROM transaction_tags tt
   JOIN transactions t ON tt.transaction_id = t.id
   WHERE t.user_id = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6'
   AND t.transaction_date >= '{YEAR}-{MONTH}-01'
   AND t.transaction_date <= '{YEAR}-{MONTH}-{LAST_DAY}';
   ```
2. If count = 0 (March 2025 scenario):
   - DELETE all transactions for month
   - Fix import script tag application logic
   - Re-import from JSON
3. If count > 0 but < expected:
   - Investigate which tags missing
   - Check JSON file for those transactions
   - If JSON correct, import script bug
   - If JSON incorrect, parser bug
   - Fix relevant script
   - Delete and re-import

**If tag IDs don't match expected UUIDs:**
1. Query tags table to confirm expected IDs
2. If different UUIDs:
   - **DO NOT change tag IDs** (other months depend on them)
   - Update protocol with correct IDs
3. If tags duplicated:
   - Investigate why duplicates created
   - Merge duplicates (advanced, requires careful SQL)
   - Update all transaction_tags references
4. Document issue in red flag log

---

### Validation Failures

**Scenario:** Validation shows discrepancies

**Recovery Steps:**

**If section grand total variance > threshold:**
1. Check if Level 6 (100% verification) passes
2. If Level 6 passes:
   - Likely PDF formula error (acceptable)
   - Document in validation report
   - Status: APPROVED WITH NOTES
3. If Level 6 fails:
   - Identify missing/incorrect transactions
   - Check if parsing or import error
   - Fix and re-import if needed

**If transaction count mismatch:**
1. Identify which transactions missing or extra
2. Check pre-flight report for expected count
3. Check PDF for actual count
4. Common causes:
   - Duplicates removed (expected, verify)
   - Transactions skipped in parsing (bug)
   - Wrong line ranges used (error)
5. Fix parsing script or re-parse with correct ranges
6. Re-import

**If tag count mismatch > 1:**
1. Query database for actual tag distribution
2. Compare to pre-flight expected counts
3. Check JSON file for expected tags
4. If JSON correct but DB wrong:
   - Import script bug
   - Delete and re-import with fixed script
5. If JSON wrong:
   - Parser bug
   - Re-parse and re-import

**If critical transaction missing:**
1. Search PDF for transaction
2. Search database for transaction
3. If in PDF but not DB:
   - Parsing bug (not extracted)
   - Import bug (not imported)
   - Check JSON file to determine which
4. Fix relevant script
5. Re-parse and/or re-import

**If 100% verification fails:**
1. Review discrepancy list
2. Categorize: missing, mismatched amount, mismatched date, etc.
3. For each discrepancy:
   - Check PDF (source of truth)
   - Check CSV (intermediate source)
   - Check JSON (parser output)
   - Check DB (final destination)
   - Identify where error occurred
4. Fix bugs in parser or import script
5. Delete and re-import
6. Re-validate until 100% achieved

---

## 📇 Quick Reference Card

### CSV Column Mapping

**Expense Tracker:**
- Col 0: Date (context only)
- Col 1: Description
- Col 2: Merchant (vendor)
- Col 3: Reimbursable (X = tracking only, NO TAG)
- Col 4: Business Expense (X = tag)
- Col 5: Payment Method
- Col 6: THB amount (USE THIS for THB)
- Col 7: USD amount (USE THIS for USD)
- Col 8: Conversion (NEVER USE)
- Col 9: Subtotal USD (alternative to Col 7)

**Gross Income:**
- Col 0: Date
- Col 1: Description
- Col 2: Source (vendor)
- Col 3: Amount (always USD)

**Savings/Investment:**
- Col 0: Date
- Col 1: Description
- Col 2: Account (vendor)
- Col 3: Amount (currency varies)

**Florida House:**
- Col 0: Date (may be missing)
- Col 1: Description
- Col 2: Merchant (vendor)
- Col 3: Amount (currency varies)

### Tag Assignment Logic

```javascript
tags = [];

// Business Expense: Column 4 "X"
if (row[4] === 'X' || row[4] === 'x') {
  tags.push('Business Expense');
}

// Reimbursement: Description pattern + NOT DSIL
const isReimbursement = /^Re(im|mi|m)?burs[e]?ment:?/i.test(description.trim());
const isDSILIncome = merchant && (
  merchant.includes('DSIL Design') ||
  merchant.includes('DSIL LLC')
);

if (isReimbursement && !isDSILIncome) {
  tags.push('Reimbursement');
  transactionType = 'income';
}

// Florida House: From Florida House section
if (inFloridaHouseSection) {
  tags.push('Florida House');
}

// Savings/Investment: From Savings section
if (inSavingsSection) {
  tags.push('Savings/Investment');
}

// Column 3 "X" = NO TAG (just tracking)
```

### Exchange Rate Calculation

```javascript
// Extract from PDF rent transaction
// Rent: THB 25,000 = $740 USD
const exchangeRate = 740 / 25000; // 0.0296

// Use for all THB to USD conversions in validation
const usdEquivalent = thbAmount * exchangeRate;
```

### File Locations

- CSV: `/csv_imports/fullImport_20251017.csv`
- PDF: `/csv_imports/Master Reference PDFs/Budget for Import-page{N}.pdf`
- Parsing script: `/scripts/parse-{month}-{year}.js`
- Import script: `/scripts/db/import-month.js`
- FINAL_PARSING_RULES: `/scripts/FINAL_PARSING_RULES.md`
- PDF-MONTH-MAPPING: `/PDF-MONTH-MAPPING.md`

### Critical Verifications

**After Parsing:**
- ✅ Rent is THB 25,000-35,000 (NOT USD ~$740)
- ✅ No negative amounts in JSON
- ✅ Comma amounts parsed correctly ($3,490.02 → 3490.02)
- ✅ Typo reimbursements detected
- ✅ DSIL Design exclusions applied
- ✅ Florida House dates defaulted (if missing)
- ✅ Transaction count matches pre-flight

**After Import:**
- ✅ Import completes without errors
- ✅ Transaction count matches JSON
- ✅ Tag counts match expectations (±1)
- ✅ Tag IDs match expected UUIDs
- ✅ No duplicate transactions created

**After Validation:**
- ✅ All section totals within thresholds
- ✅ All transaction counts exact match
- ✅ All tag counts exact match (±1)
- ✅ All critical transactions verified
- ✅ 100% match rate achieved

### Expected Tag IDs (VERIFY THESE)

```javascript
{
  "Reimbursement": "205d99a2-cf0a-44e0-92f3-e2b9eae1bf72",
  "Florida House": "178739fd-1712-4356-b21a-8936b6d0a461",
  "Business Expense": "973433bd-bf9f-469f-9b9f-20128def8726",
  "Savings/Investment": "c0928dfe-1544-4569-bbad-77fea7d7e5aa"
}
```

---

## 📊 Protocol Version History

**v3.6 (October 26, 2025):**
- Fixed validation agent PDF matching error (refunds query logic)
- Enhanced critical transaction verification (query by type + description, not amount)
- Added complete lessons learned from all 12 imports
- Improved validation protocol with November 2024 learnings
- Added comprehensive recovery procedures for all failure types
- Expanded red flag categories with all historical patterns
- Updated knowledge base with November 2024 completion (118 transactions)
- Total imports: 12 months, ~2,111 transactions

**v3.5 (January 26, 2025):**
- Added December 2024 lessons (manual tag fix, DSIL Design rules, preserve descriptions)
- Enhanced DSIL Design/LLC exclusion from Reimbursement tag
- Added manual tag fix procedure for import script edge cases
- Updated knowledge base with December 2024 completion (259 transactions)
- Total imports: 11 months

**v3.4 (October 26, 2025):**
- Added January 2025 lessons (special transaction handling, apartment move)
- Enhanced tag verification process
- Added user consultation workflow
- Total imports: 10 months

**v3.3 (October 24, 2025):**
- Added February 2025 lessons (typo reimbursements, Florida House dates)
- Enhanced reimbursement detection regex
- Added Florida House date defaulting
- Total imports: 9 months

**v3.2 (October 24, 2025):**
- Added March 2025 lessons (negative amounts, comma-formatted amounts)
- Fixed tag matching bug in import script
- Added duplicate handling user decision workflow
- Total imports: 8 months

---

**Status:** APPROVED FOR PRODUCTION USE
**Next Update:** After October 2024 import completion
**Maintained By:** Human + Claude Code collaboration
**Last Reviewed:** October 26, 2025
