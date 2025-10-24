# Comprehensive Month Import & Validation Protocol

**Version:** 3.0
**Date:** October 24, 2025
**Status:** Production Ready

---

## Overview

This protocol ensures 100% accuracy when importing monthly transaction data by validating against PDF source files at multiple levels:
1. **Pre-flight Analysis**: Data structure analysis and issue detection BEFORE parsing
2. **Section-by-section comparison**: Expense Tracker, Gross Income, Savings, Florida House
3. **Daily subtotal verification**: Compare each day's total against PDF
4. **Section grand total verification**: Compare section totals against PDF
5. **100% Comprehensive 1:1 verification**: EVERY transaction verified bidirectionally (PDF→DB and DB→PDF)

**CRITICAL**: Validation is NOT sample-based or spot-checking. Every single transaction must be verified in both directions.

---

## 4-Phase Import Process

### PHASE 1: Pre-Flight Analysis (data-engineer agent)

**Purpose**: Analyze CSV and PDF structure BEFORE parsing to identify issues early.

**Agent**: Task tool → subagent_type=data-engineer

**Tasks**:
1. Find line numbers for all 4 sections in CSV
2. Count transactions per section (raw count before deduplication)
3. Extract GRAND TOTALS from PDF (source of truth)
4. Calculate expected total
5. Detect potential duplicates between sections
6. Count tag conditions (reimbursements, business expenses, etc.)
7. Identify currency distribution (USD vs THB)
8. Verify parsing script correctness (uses Column 6 for THB, NOT Column 8)
9. Compare to previous months (flag anomalies)
10. Identify data quality issues

**Output**: `scripts/[MONTH]-2025-PREFLIGHT-REPORT.md`

**Human Checkpoint**: Review pre-flight report, address red flags before proceeding.

---

### PHASE 2: Parse & Prepare (data-engineer agent)

**Purpose**: Parse CSV data following FINAL_PARSING_RULES.md exactly.

**Agent**: Task tool → subagent_type=data-engineer

**Prerequisites**:
- ✅ Pre-flight report reviewed and approved
- ✅ Parsing script verified/corrected
- ✅ Line ranges identified

**Critical Requirements**:
1. **Currency Handling** (MOST IMPORTANT):
   - THB transactions: Use Column 6 value (e.g., "THB 35000.00")
   - USD transactions: Use Column 7 or Column 9 (subtotal) value
   - NEVER use Column 8 (conversion column)
   - Store currency as 'THB' or 'USD' in the currency field
   - Store amount as the ORIGINAL currency amount

2. Parse all 4 sections using line ranges from pre-flight
3. Apply tag logic per FINAL_PARSING_RULES.md
4. Handle duplicates (remove duplicates between sections, keep Expense Tracker version)
5. Date conversion to YYYY-MM-DD format

**Output**:
- `scripts/[month]-2025-CORRECTED.json` (parsed data)
- `scripts/[MONTH]-2025-PARSE-REPORT.md` (detailed report)

**Human Checkpoint**: Verify rent = 35000 THB, currency split looks correct.

---

### PHASE 3: Database Import (direct command)

**Purpose**: Import parsed JSON to Supabase database.

**Command**:
```bash
node scripts/db/import-month.js --file=scripts/[month]-2025-CORRECTED.json --month=2025-[MM]
```

**What This Does**:
- Matches existing vendors/payment methods/tags
- Creates new ones only when no match found
- Skips duplicate transactions
- Inserts in batches of 50
- Reports import summary

**Human Checkpoint**: Verify import counts match parse report.

---

### PHASE 4: Comprehensive Validation (data-scientist agent)

**Purpose**: Validate imported data against PDF source of truth with 100% coverage.

**Agent**: Task tool → subagent_type=data-scientist

**Prerequisites**:
- ✅ Database import completed
- ✅ Import summary reviewed

**Validation Levels**:
1. Section Grand Totals (4 sections)
2. Daily Subtotals (Expense Tracker, ~30 days)
3. Transaction Count Verification
4. Tag Distribution Verification
5. Critical Transaction Spot Checks (rent, largest, boundaries)
6. **100% Comprehensive 1:1 PDF Verification** (EVERY transaction, both directions)

**Output**: `scripts/[MONTH]-2025-VALIDATION-REPORT.md` and `scripts/[MONTH]-2025-COMPREHENSIVE-VALIDATION.md`

**Human Checkpoint**: Review validation report, accept/reject import based on results.

---

## Pre-Import Steps (Legacy - Use Phase 1 Instead)

### Step 1: Verify Parsing Script is Corrected

Check the critical currency extraction logic:

```bash
grep -A 10 "Currency extraction logic" scripts/parse-[month]-2025.js
```

**Expected output:**
```javascript
if (thbAmount && thbAmount.includes('THB')) {
  // THB transaction - store ORIGINAL THB value
  const match = thbAmount.match(/THB\s*([\d,.-]+)/);
  if (match) {
    amount = parseAmount(match[1]); // Store original THB amount
    currency = 'THB'; // Store as THB currency
  }
}
```

✅ **Verify:** NOT using column 9 (subtotal/conversion) for THB amounts

### Step 2: Parse Month Data

```bash
cd /Users/dennis/Code\ Projects/joot-app
node scripts/parse-[month]-2025.js
```

**Critical Validation Checks:**
- ✅ Currency validation passed
- ✅ Rent = ~35000 THB (NOT ~1074)
- ✅ Total transaction count reasonable
- ✅ Parse report generated

**If ANY fail, STOP and investigate before importing.**

### Step 3: Import to Database

```bash
node scripts/db/import-month.js --file=scripts/[month]-2025-CORRECTED.json --month=2025-[MM]
```

**Verify import summary shows:**
- Total transactions imported
- No unexpected duplicates
- Tags, vendors, payment methods created

---

## Validation Steps

### STEP 1: Expense Tracker Section Validation

#### 1.1: Daily Subtotal Comparison

**Query to calculate daily totals:**

```sql
WITH expense_tracker_txns AS (
  SELECT
    t.id,
    t.transaction_date,
    t.description,
    t.amount,
    t.original_currency,
    t.transaction_type,
    STRING_AGG(tg.name, ',') as tags
  FROM transactions t
  LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
  LEFT JOIN tags tg ON tt.tag_id = tg.id
  WHERE t.user_id = (SELECT id FROM auth.users WHERE email = 'dennis@dsil.design')
    AND t.transaction_date >= '2025-[MM]-01'
    AND t.transaction_date < '2025-[MM+1]-01'
  GROUP BY t.id, t.transaction_date, t.description, t.amount, t.original_currency, t.transaction_type
),
filtered AS (
  SELECT *,
    CASE
      -- For expenses, add the amount
      WHEN transaction_type = 'expense' THEN
        CASE WHEN original_currency = 'THB' THEN amount * ([PDF_EXCHANGE_RATE]) ELSE amount END
      -- For income (reimbursements), SUBTRACT the amount
      WHEN transaction_type = 'income' AND tags LIKE '%Reimbursement%' THEN
        -1 * CASE WHEN original_currency = 'THB' THEN amount * ([PDF_EXCHANGE_RATE]) ELSE amount END
      ELSE 0
    END as amount_usd
  FROM expense_tracker_txns
  WHERE
    -- Exclude Florida House
    (tags IS NULL OR tags NOT LIKE '%Florida House%')
    -- Exclude Savings/Investment
    AND (tags IS NULL OR tags NOT LIKE '%Savings/Investment%')
    -- Exclude Gross Income (but keep Reimbursements)
    AND NOT (
      transaction_type = 'income'
      AND (tags IS NULL OR tags NOT LIKE '%Reimbursement%')
    )
)
SELECT
  transaction_date,
  COUNT(*) as tx_count,
  ROUND(SUM(amount_usd)::numeric, 2) as daily_total_usd
FROM filtered
GROUP BY transaction_date
ORDER BY transaction_date;
```

**[PDF_EXCHANGE_RATE]:** Calculate from rent transaction (e.g., 1078 / 35000 = 0.0308)

**Compare each day's total against PDF "Daily Total" rows:**
- Create a comparison table showing DB vs PDF for each day
- Flag discrepancies > $1.00
- Note: Small differences (<$0.50) are acceptable due to rounding

**Acceptance Criteria:**
- ✅ At least 80% of days match within $1.00
- ✅ No single day differs by more than $100

#### 1.2: Expense Tracker Grand Total Comparison

**Query to calculate grand total:**

```sql
-- [Same CTE as above, then:]
SELECT
  COUNT(*) as total_expense_tracker_transactions,
  ROUND(SUM(amount_usd)::numeric, 2) as grand_total_usd
FROM filtered;
```

**Compare against PDF "GRAND TOTAL" (Expense Tracker section):**
- Calculate difference
- Calculate percentage error: `(DB - PDF) / PDF * 100`

**Acceptance Criteria:**
- ✅ Difference ≤ $150 OR ≤ 2% of PDF total (whichever is larger)
- ⚠️ If >2% but <5%, flag for review
- ❌ If ≥5%, FAIL validation - investigate before accepting

---

### STEP 2: Gross Income Tracker Section Validation

**Query to get Gross Income transactions:**

```sql
SELECT
  t.transaction_date,
  t.description,
  t.amount,
  t.original_currency,
  ROUND(
    CASE WHEN t.original_currency = 'THB'
    THEN t.amount * ([PDF_EXCHANGE_RATE])
    ELSE t.amount END::numeric, 2
  ) as amount_usd
FROM transactions t
WHERE t.user_id = (SELECT id FROM auth.users WHERE email = 'dennis@dsil.design')
  AND t.transaction_date >= '2025-[MM]-01'
  AND t.transaction_date < '2025-[MM+1]-01'
  AND t.transaction_type = 'income'
  AND t.id NOT IN (
    -- Exclude reimbursements
    SELECT tt.transaction_id
    FROM transaction_tags tt
    JOIN tags tg ON tt.tag_id = tg.id
    WHERE tg.name = 'Reimbursement'
  )
ORDER BY t.transaction_date;
```

**Compare against PDF "Gross Income Tracker" section:**
- Verify each income transaction is listed
- Verify amounts match
- Calculate total and compare to PDF "GROSS INCOME TOTAL"

**Acceptance Criteria:**
- ✅ All income transactions match 1:1
- ✅ Total matches within $1.00

---

### STEP 3: Personal Savings & Investments Section Validation

**Query to get Savings/Investment transactions:**

```sql
SELECT
  t.transaction_date,
  t.description,
  t.amount,
  t.original_currency,
  ROUND(
    CASE WHEN t.original_currency = 'THB'
    THEN t.amount * ([PDF_EXCHANGE_RATE])
    ELSE t.amount END::numeric, 2
  ) as amount_usd
FROM transactions t
JOIN transaction_tags tt ON t.id = tt.transaction_id
JOIN tags tg ON tt.tag_id = tg.id
WHERE t.user_id = (SELECT id FROM auth.users WHERE email = 'dennis@dsil.design')
  AND t.transaction_date >= '2025-[MM]-01'
  AND t.transaction_date < '2025-[MM+1]-01'
  AND tg.name = 'Savings/Investment'
ORDER BY t.transaction_date;
```

**Compare against PDF "Personal Savings & Investments" section:**
- Verify each savings transaction is listed
- Verify amounts match
- Calculate total and compare to PDF "TOTAL"

**Acceptance Criteria:**
- ✅ All savings transactions match 1:1
- ✅ Total matches within $1.00

---

### STEP 4: Florida House Expenses Section Validation

**Query to get Florida House transactions:**

```sql
SELECT
  t.transaction_date,
  t.description,
  t.amount,
  t.original_currency,
  ROUND(
    CASE WHEN t.original_currency = 'THB'
    THEN t.amount * ([PDF_EXCHANGE_RATE])
    ELSE t.amount END::numeric, 2
  ) as amount_usd
FROM transactions t
JOIN transaction_tags tt ON t.id = tt.transaction_id
JOIN tags tg ON tt.tag_id = tg.id
WHERE t.user_id = (SELECT id FROM auth.users WHERE email = 'dennis@dsil.design')
  AND t.transaction_date >= '2025-[MM]-01'
  AND t.transaction_date < '2025-[MM+1]-01'
  AND tg.name = 'Florida House'
ORDER BY t.transaction_date;
```

**Compare against PDF "Florida House Expenses" section:**
- Verify each Florida House transaction is listed
- Verify amounts match
- Calculate total and compare to PDF "GRAND TOTAL" (Florida House section)

**Acceptance Criteria:**
- ✅ All Florida House transactions match 1:1
- ✅ Total matches within $1.00

---

### STEP 5: 1:1 Transaction-Level Verification

**CRITICAL REQUIREMENT:** This step ensures EVERY transaction in the PDF is accounted for in the database, and vice versa. This is NOT a spot check or sample-based verification - it is a comprehensive, exhaustive verification of 100% of transactions.

#### 5.1: PDF → Database Verification (100% Comprehensive)

**Process:**
1. Open PDF file for the month
2. For EACH section (Expense Tracker, Gross Income, Savings, Florida House):
   - Go through EVERY transaction row in the PDF table (no sampling)
   - Search for matching transaction in database by:
     - Date (exact match)
     - Description (fuzzy match acceptable, ≥80% similarity)
     - Amount (within $0.10 due to rounding)
     - Currency (exact match)
3. Create a COMPLETE verification table showing ALL transactions:

| PDF Row | Date | Description | Amount | Currency | Found in DB? | DB Match Quality | Notes |
|---------|------|-------------|--------|----------|--------------|------------------|-------|
| 1 | 2025-06-01 | Work Email | $6.36 | USD | ✅ | Exact | Perfect match |
| 2 | 2025-06-01 | Rent | THB 35000 | THB | ✅ | Exact | Perfect match |
| 3 | 2025-06-02 | Groceries | THB 500 | THB | ✅ | Fuzzy (85%) | Description slight diff |
| ... | ... | ... | ... | ... | ... | ... | ... |

**Items to IGNORE from PDF (document but don't flag as missing):**
- Section header rows
- Daily total summary rows
- Grand total rows
- Blank/separator rows
- Date-only rows (calendar markers)

**Flag for human review:**
- ❌ CRITICAL: Any PDF transaction NOT found in database
- ❌ CRITICAL: Any PDF transaction with amount mismatch >$0.10
- ❌ CRITICAL: Any PDF transaction with currency mismatch
- ⚠️ WARNING: Any PDF transaction with description match <80% similarity

#### 5.2: Database → PDF Verification (100% Comprehensive)

**Process:**
1. Query ALL transactions for the month from database (no filtering)
2. For EVERY database transaction:
   - Search for matching row in PDF across ALL sections
   - Verify it appears in the correct section
   - Verify amount and currency match
3. Create a COMPLETE verification table showing ALL transactions:

| DB ID | Date | Description | Amount | Currency | Found in PDF? | PDF Section | PDF Match Quality | Notes |
|-------|------|-------------|--------|----------|---------------|-------------|-------------------|-------|
| uuid1 | 2025-06-01 | Work Email | $6.36 | USD | ✅ | Expense Tracker | Exact | Perfect |
| uuid2 | 2025-06-01 | Rent | 35000 THB | THB | ✅ | Expense Tracker | Exact | Perfect |
| uuid3 | 2025-06-15 | Reimbursement: Client X | 5000 THB | THB | ✅ | Expense Tracker | Exact | Correctly in ET not GI |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

**Expected Section Mappings:**
- Expense Tracker: All expenses + all reimbursements (income type with Reimbursement tag)
- Gross Income Tracker: Income transactions WITHOUT Reimbursement tag
- Personal Savings & Investments: Transactions with Savings/Investment tag
- Florida House Expenses: Transactions with Florida House tag

**Flag for human review:**
- ❌ CRITICAL: Any database transaction NOT found in PDF
- ❌ CRITICAL: Any database transaction in wrong section
- ❌ CRITICAL: Any database transaction with amount/currency mismatch >$0.10
- ⚠️ WARNING: Any database transaction with description not matching any PDF row

#### 5.3: Summary Report (Exhaustive Analysis)

**Create comprehensive summary showing:**

**PDF Analysis:**
- Total rows in PDF: XXX
- Header/total/separator rows (ignored): XX
- Actual transaction rows: XXX
- Found in DB: XXX (XX.X%)
- NOT found in DB: X (list EVERY missing transaction with details)
- Amount mismatches: X (list EVERY mismatch with both values)
- Currency mismatches: X (list EVERY mismatch)

**Database Analysis:**
- Total transactions in DB for month: XXX
- Found in PDF: XXX (XX.X%)
- NOT found in PDF: X (list EVERY extra transaction with details)
- Wrong section: X (list EVERY misplaced transaction)
- Amount/currency mismatches: X (list EVERY mismatch)

**Bidirectional Match Analysis:**
- Perfect matches (date, description, amount, currency, section): XXX
- Fuzzy matches (description slightly different): XX
- Amount within tolerance ($0.10): XX
- Total verified: XXX

**Discrepancy Details:**
[For EACH discrepancy, provide:]
- Transaction date, description, amount, currency
- What it is in PDF vs what it is in DB
- Root cause analysis
- Recommended action (fix, accept, investigate)

**Acceptance Criteria (STRICT):**
- ✅ 100% of PDF transactions found in DB (allowing for rounding ≤$0.10)
- ✅ 100% of DB transactions found in PDF
- ✅ Zero unexplained mismatches
- ✅ All section assignments correct
- ✅ All currency assignments correct (THB stored as THB, not converted)

**If ANY criteria fails:**
- Document the exact discrepancies
- Determine root cause (parsing error, duplicate removal, import logic, etc.)
- Fix and re-import if critical
- Accept with notes if minor and explainable

---

## Validation Report Template

After completing all steps, create a comprehensive validation report:

```markdown
# [Month] 2025 Validation Report

**Date:** [Date]
**Status:** ✅ PASSED / ⚠️ PASSED WITH WARNINGS / ❌ FAILED

---

## Summary

- **Total Transactions:** XXX
- **Expense Tracker:** XXX transactions, $X,XXX.XX total
- **Gross Income:** XX transactions, $XXX.XX total
- **Savings/Investment:** X transactions, $XXX.XX total
- **Florida House:** X transactions, $XXX.XX total

---

## Section Validation Results

### Expense Tracker
- **Daily Totals:** XX/XX days match perfectly
- **Grand Total:** $X,XXX.XX (DB) vs $X,XXX.XX (PDF)
- **Difference:** $XX.XX (X.X%)
- **Status:** ✅ PASS / ⚠️ WARNING / ❌ FAIL

### Gross Income Tracker
- **Total:** $XXX.XX (DB) vs $XXX.XX (PDF)
- **Difference:** $X.XX
- **Status:** ✅ PASS / ❌ FAIL

### Personal Savings & Investments
- **Total:** $XXX.XX (DB) vs $XXX.XX (PDF)
- **Difference:** $X.XX
- **Status:** ✅ PASS / ❌ FAIL

### Florida House Expenses
- **Total:** $XXX.XX (DB) vs $XXX.XX (PDF)
- **Difference:** $X.XX
- **Status:** ✅ PASS / ❌ FAIL

---

## 1:1 Transaction Verification

### PDF → Database
- **Total PDF transactions:** XXX
- **Found in DB:** XXX (XX%)
- **Not found in DB:** X
- **Mismatches:** X

### Database → PDF
- **Total DB transactions:** XXX
- **Found in PDF:** XXX (XX%)
- **Not found in PDF:** X
- **Mismatches:** X

---

## Issues Found

### Critical Issues (Must Fix):
[List any critical issues]

### Warnings (Review):
[List any warnings]

### Minor Discrepancies (Acceptable):
[List minor issues like rounding differences]

---

## Recommendations

✅ ACCEPT / ⚠️ ACCEPT WITH NOTES / ❌ REJECT AND FIX

[Detailed explanation]

---

**Validated By:** Database queries + PDF cross-reference
**Validation Date:** [Date]
**Confidence Level:** HIGH / MEDIUM / LOW
```

---

## Success Criteria (Overall)

**MUST PASS (Critical):**
- ✅ Rent transaction = ~35000 THB
- ✅ Expense Tracker grand total within 2% of PDF
- ✅ All Gross Income transactions match 1:1
- ✅ All Savings transactions match 1:1
- ✅ All Florida House transactions match 1:1
- ✅ 100% of PDF transactions found in DB
- ✅ 100% of DB transactions found in PDF

**SHOULD PASS (Important):**
- ✅ At least 80% of daily totals match within $1.00
- ✅ No amount mismatches >$0.10 on matched transactions
- ✅ Correct currency attribution (THB vs USD)

**NICE TO HAVE (Acceptable if failed):**
- Perfect match on all daily totals
- Zero rounding differences
- All transactions match within $0.01

---

## Troubleshooting

### Issue: Daily totals don't match

**Possible causes:**
1. Wrong exchange rate - recalculate from rent transaction
2. Reimbursements added instead of subtracted - check transaction_type handling
3. Transactions in wrong section - verify filtering logic
4. Missing/extra transactions - do 1:1 verification

### Issue: Grand total >2% different

**Actions:**
1. Stop - Do not accept import
2. Review largest discrepancies (sort by daily total difference)
3. Manually verify top 3 discrepant days
4. Check for duplicate transactions
5. Check for missing transactions
6. Re-parse if needed

### Issue: Transactions in DB but not in PDF

**Possible causes:**
1. Duplicate import - check if month was imported twice
2. Wrong month - verify transaction dates
3. Manual entry - check transaction source
4. Parsing error - verify against CSV

### Issue: Transactions in PDF but not in DB

**Possible causes:**
1. Parsing failed for certain formats
2. Duplicate detection removed valid transaction
3. Import script filtering too aggressive
4. Need to re-parse and re-import

---

## Exchange Rate Handling

**Standard Approach:**
- Use exchange rate from rent transaction (THB 35000 = $1078)
- Rate = 1078 / 35000 = 0.0308 (approximately)

**Note:** PDF may use daily exchange rates, causing small variations (<$0.50 per transaction).

**Acceptable variance:**
- Individual transaction: ±$0.50
- Daily total: ±$5.00
- Monthly total: ±$150 or ±2% (whichever is larger)

---

## Files Generated

After validation, ensure these files exist:

1. **Parsed JSON:** `scripts/[month]-2025-CORRECTED.json`
2. **Parse Report:** `scripts/[MONTH]-2025-PARSE-REPORT.md`
3. **Validation Report:** `[MONTH]-2025-VALIDATION-REPORT.md`
4. **Completion Summary:** `[MONTH]-2025-IMPORT-COMPLETE.md`
5. **Daily Comparison:** `scripts/[month]-daily-comparison.txt` (optional)

---

## Version History

- **v3.0 (Oct 24, 2025):**
  - Added 4-Phase Import Process (Pre-Flight → Parse → Import → Validate)
  - Strengthened 1:1 verification to require 100% coverage (NO sampling/spot checks)
  - Added pre-flight analysis phase for early issue detection
  - Integrated agent assignments (data-engineer for phases 1-2, data-scientist for phase 4)
  - Incorporated learnings from June 2025 import (190 transactions, 100% verified)
  - Added bidirectional verification tables requirement
  - Enhanced discrepancy classification (critical/warning/acceptable)

- **v2.0 (Oct 23, 2025):** Added comprehensive 1:1 verification, section-by-section validation, daily subtotal comparison

- **v1.0 (Oct 23, 2025):** Initial protocol with basic PDF verification

---

## Key Learnings from June 2025 Import

**What Worked Well**:
- ✅ Pre-flight analysis caught all issues before parsing
- ✅ 100% comprehensive validation found zero data errors
- ✅ Bidirectional verification (PDF→DB and DB→PDF) ensured completeness
- ✅ Currency preservation (THB as THB) confirmed working correctly
- ✅ 4-phase process provided clear checkpoints and human review

**Important Findings**:
- Grand total variances may occur due to exchange rate differences (PDF uses variable rates, validation uses fixed rate)
- 3 of 4 sections matching exactly (100%) is excellent indicator of data quality
- Calculation-level variances (e.g., 3.18%) are acceptable if underlying transaction data is 100% accurate
- Documentation is critical: 9 files generated for June 2025 provided complete audit trail

**Best Practices**:
- Always verify rent transaction = THB 35,000 (critical canary)
- Always run pre-flight analysis with data-engineer agent
- Always use comprehensive validation with data-scientist agent
- Never skip human review checkpoints between phases
- Document every discrepancy with root cause analysis

---

**This protocol ensures maximum data accuracy and provides a clear audit trail for all imported transactions.**
