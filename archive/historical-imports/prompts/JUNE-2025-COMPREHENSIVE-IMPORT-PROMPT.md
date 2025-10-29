# June 2025 Import - Comprehensive Validation Protocol

**Date:** October 23, 2025
**Month:** June 2025
**Status:** Ready to Execute
**Protocol Version:** 2.0 (Comprehensive Validation)

---

## Context & Background

### Problem Fixed
May, June, and July 2025 were previously imported with USD conversion values instead of original THB amounts. The parsing scripts have been corrected to store original currency values.

### What Was Done
- ✅ Deleted old June 2025 data (190 transactions) - just deleted again for re-import
- ✅ Fixed parsing script: `scripts/parse-june-2025.js`
- ✅ July 2025 validated with new comprehensive protocol (1.7% variance, acceptable)

### What Needs to Happen Now
Re-import June 2025 using the corrected parsing script, with **comprehensive multi-level validation** against PDF source using the new protocol.

---

## Reference Files

### Primary Sources
- **PDF:** `/csv_imports/Master Reference PDFs/Budget for Import-page5.pdf` (June 2025)
- **CSV:** `/csv_imports/fullImport_20251017.csv` (lines 1232-1519)
- **Parsing Script:** `/scripts/parse-june-2025.js` (CORRECTED)
- **Import Script:** `/scripts/db/import-month.js`

### Supporting Documents
- **Comprehensive Protocol:** `/COMPREHENSIVE-VALIDATION-PROTOCOL.md` (NEW - follow this!)
- **Parsing Rules:** `/scripts/FINAL_PARSING_RULES.md`
- **July Example:** `/JULY-2025-VALIDATION-SUMMARY.md` (reference for process)

---

## Execution Steps

### STEP 1: Verify Parsing Script

```bash
grep -A 10 "Currency extraction logic" scripts/parse-june-2025.js
```

**Expected:** Uses original THB values from column 6, NOT USD conversions from column 9.

✅ **Checkpoint:** Script shows correct currency logic

---

### STEP 2: Parse June 2025

```bash
cd /Users/dennis/Code\ Projects/joot-app
node scripts/parse-june-2025.js
```

**Critical Validation Checks:**
- ✅ Currency validation passed
- ✅ Rent = ~35000 THB (NOT ~1074)
- ✅ Total = 188-190 transactions
- ✅ Parse report generated

**If ANY fail, STOP and investigate.**

---

### STEP 3: Calculate Exchange Rate from PDF

From PDF rent transaction (June 1):
```
This Month's Rent | Landlord | Bangkok Bank Account | THB 35000.00 | $1074.50 | $1074.50
```

**Exchange Rate:** 1074.50 / 35000 = **0.0307** (use this for all calculations)

---

### STEP 4: Import to Database

```bash
node scripts/db/import-month.js --file=scripts/june-2025-CORRECTED.json --month=2025-06
```

**Verify import summary.**

---

## Validation Steps (NEW COMPREHENSIVE PROTOCOL)

### VALIDATION 1: Expense Tracker Section

#### 1.1: Daily Subtotal Comparison

**Run this query to get daily totals:**

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
    AND t.transaction_date >= '2025-06-01'
    AND t.transaction_date < '2025-07-01'
  GROUP BY t.id, t.transaction_date, t.description, t.amount, t.original_currency, t.transaction_type
),
filtered AS (
  SELECT *,
    CASE
      WHEN transaction_type = 'expense' THEN
        CASE WHEN original_currency = 'THB' THEN amount * 0.0307 ELSE amount END
      WHEN transaction_type = 'income' AND tags LIKE '%Reimbursement%' THEN
        -1 * CASE WHEN original_currency = 'THB' THEN amount * 0.0307 ELSE amount END
      ELSE 0
    END as amount_usd
  FROM expense_tracker_txns
  WHERE
    (tags IS NULL OR tags NOT LIKE '%Florida House%')
    AND (tags IS NULL OR tags NOT LIKE '%Savings/Investment%')
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

**Compare each day against PDF "Daily Total" rows:**

Create a comparison table:

| Date | DB Total | PDF Total | Difference | Status |
|------|----------|-----------|------------|--------|
| Jun 1 | $XXX.XX | $2,287.16 | $X.XX | ✅/❌ |
| Jun 2 | $XXX.XX | $57.25 | $X.XX | ✅/❌ |
| ... | ... | ... | ... | ... |

**Acceptance Criteria:**
- ✅ At least 80% of days match within $1.00
- ✅ No single day differs by more than $100

#### 1.2: Expense Tracker Grand Total

**Query for grand total:**

```sql
-- [Same CTEs as above]
SELECT
  COUNT(*) as total_expense_tracker_transactions,
  ROUND(SUM(amount_usd)::numeric, 2) as grand_total_usd
FROM filtered;
```

**PDF GRAND TOTAL (Expense Tracker):** $6,347.08

**Compare:**
- Database total: $X,XXX.XX
- PDF total: $6,347.08
- Difference: $XX.XX
- Percentage: X.X%

**Acceptance:** ✅ Difference ≤ $150 OR ≤ 2%

---

### VALIDATION 2: Gross Income Tracker Section

**Query:**

```sql
SELECT
  t.transaction_date,
  t.description,
  t.amount,
  t.original_currency,
  ROUND(
    CASE WHEN t.original_currency = 'THB'
    THEN t.amount * 0.0307
    ELSE t.amount END::numeric, 2
  ) as amount_usd
FROM transactions t
WHERE t.user_id = (SELECT id FROM auth.users WHERE email = 'dennis@dsil.design')
  AND t.transaction_date >= '2025-06-01'
  AND t.transaction_date < '2025-07-01'
  AND t.transaction_type = 'income'
  AND t.id NOT IN (
    SELECT tt.transaction_id
    FROM transaction_tags tt
    JOIN tags tg ON tt.tag_id = tg.id
    WHERE tg.name = 'Reimbursement'
  )
ORDER BY t.transaction_date;
```

**Compare against PDF "Gross Income Tracker":**

Expected from PDF:
- June 16: Freelance Income - May | NJDA | $175.00

**Verification:**
- ✅ Transaction found in DB: Yes/No
- ✅ Amount matches: $175.00
- ✅ Date matches: 2025-06-16

**Total:** $175.00 (PDF) vs $XXX.XX (DB)

**Acceptance:** ✅ All income transactions match 1:1

---

### VALIDATION 3: Personal Savings & Investments Section

**Query:**

```sql
SELECT
  t.transaction_date,
  t.description,
  t.amount,
  t.original_currency,
  ROUND(
    CASE WHEN t.original_currency = 'THB'
    THEN t.amount * 0.0307
    ELSE t.amount END::numeric, 2
  ) as amount_usd
FROM transactions t
JOIN transaction_tags tt ON t.id = tt.transaction_id
JOIN tags tg ON tt.tag_id = tg.id
WHERE t.user_id = (SELECT id FROM auth.users WHERE email = 'dennis@dsil.design')
  AND t.transaction_date >= '2025-06-01'
  AND t.transaction_date < '2025-07-01'
  AND tg.name = 'Savings/Investment'
ORDER BY t.transaction_date;
```

**Compare against PDF "Personal Savings & Investments":**

Expected from PDF:
- June 1: Emergency Savings | Vanguard | PNC Bank Account | $341.67

**Verification:**
- ✅ Transaction found in DB: Yes/No
- ✅ Amount matches: $341.67
- ✅ Date matches: 2025-06-01

**Total:** $341.67 (PDF) vs $XXX.XX (DB)

**Acceptance:** ✅ All savings transactions match 1:1

---

### VALIDATION 4: Florida House Expenses Section

**Query:**

```sql
SELECT
  t.transaction_date,
  t.description,
  t.amount,
  t.original_currency,
  ROUND(
    CASE WHEN t.original_currency = 'THB'
    THEN t.amount * 0.0307
    ELSE t.amount END::numeric, 2
  ) as amount_usd
FROM transactions t
JOIN transaction_tags tt ON t.id = tt.transaction_id
JOIN tags tg ON tt.tag_id = tg.id
WHERE t.user_id = (SELECT id FROM auth.users WHERE email = 'dennis@dsil.design')
  AND t.transaction_date >= '2025-06-01'
  AND t.transaction_date < '2025-07-01'
  AND tg.name = 'Florida House'
ORDER BY t.transaction_date;
```

**Compare against PDF "Florida House Expenses":**

Expected from PDF (based on typical structure):
- Water Bill: ~$54.80
- Gas Bill: ~$36.10
- Doorcam RING: ~$10.69
- Pest Control: ~$110.00
- Electricity Bill: ~$49.69
- Electricity Bill: ~$83.00

**Total:** $344.28 (PDF) vs $XXX.XX (DB)

**Acceptance:** ✅ All Florida House transactions match 1:1

---

### VALIDATION 5: 1:1 Transaction-Level Verification

#### 5.1: PDF → Database Check

**Process:**
1. Open PDF: `/csv_imports/Master Reference PDFs/Budget for Import-page5.pdf`
2. Go through each section in order
3. For each transaction row in the PDF, search for it in the database
4. Create verification table

**Example format:**

```
EXPENSE TRACKER SECTION:
========================

June 1, 2025:
✅ Work Email | Google | $6.36 USD → Found in DB (exact match)
✅ Florida House | Me | $1,000.00 USD → Found in DB (exact match)
✅ This Month's Rent | Landlord | THB 35000.00 → Found in DB (35000 THB)
✅ Soap Refill | Lazada | $11.28 USD → Found in DB (exact match)
... continue for all transactions ...

June 2, 2025:
✅ Gifts for Leigh | Lazada | $45.04 USD → Found in DB (exact match)
... continue for all transactions ...

GROSS INCOME TRACKER:
=====================
✅ June 16: Freelance Income - May | NJDA | $175.00 → Found in DB

PERSONAL SAVINGS & INVESTMENTS:
================================
✅ June 1: Emergency Savings | Vanguard | $341.67 → Found in DB

FLORIDA HOUSE EXPENSES:
=======================
✅ Water Bill | Englewood Water | $54.80 → Found in DB
... continue for all transactions ...
```

**Track:**
- Total PDF transactions: XXX
- Found in DB: XXX
- NOT found in DB: X (list them!)
- Amount mismatches: X (list them!)

#### 5.2: Database → PDF Check

**Query to get all June transactions:**

```sql
SELECT
  t.transaction_date,
  t.description,
  t.amount,
  t.original_currency,
  t.transaction_type,
  STRING_AGG(tg.name, ', ') as tags
FROM transactions t
LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
LEFT JOIN tags tg ON tt.tag_id = tg.id
WHERE t.user_id = (SELECT id FROM auth.users WHERE email = 'dennis@dsil.design')
  AND t.transaction_date >= '2025-06-01'
  AND t.transaction_date < '2025-07-01'
GROUP BY t.id, t.transaction_date, t.description, t.amount, t.original_currency, t.transaction_type
ORDER BY t.transaction_date, t.amount DESC;
```

**For each DB transaction, verify it exists in PDF:**

```
DATABASE TRANSACTION VERIFICATION:
==================================

2025-06-01 | Work Email | $6.36 USD | expense | → Found in PDF (Expense Tracker, June 1)
2025-06-01 | Florida House | $1000 USD | expense | → Found in PDF (Expense Tracker, June 1)
2025-06-01 | This Month's Rent | 35000 THB | expense | → Found in PDF (Expense Tracker, June 1)
... continue for all transactions ...

NOT FOUND IN PDF:
[List any DB transactions that don't appear in PDF]
```

**Track:**
- Total DB transactions: XXX
- Found in PDF: XXX
- NOT found in PDF: X (list them!)

#### 5.3: Summary Report

```
1:1 VERIFICATION SUMMARY
========================

PDF → Database:
  Total PDF transactions: XXX
  Found in DB: XXX (XX%)
  Not found: X
  Mismatches: X

Database → PDF:
  Total DB transactions: XXX
  Found in PDF: XXX (XX%)
  Not found: X
  Extra in DB: X

CRITICAL ISSUES:
[List any transactions missing in either direction]

WARNINGS:
[List any amount/currency mismatches]

OVERALL STATUS: ✅ PASS / ❌ FAIL
```

---

## Final Validation Report

Create: `JUNE-2025-VALIDATION-REPORT.md`

**Must include:**

### 1. Executive Summary
- Total transactions imported
- Overall validation status (PASS/FAIL)
- Key metrics (match rate, discrepancies, etc.)

### 2. Section Validation Results
- Expense Tracker: Grand total, daily totals, discrepancies
- Gross Income: Total, match status
- Savings/Investment: Total, match status
- Florida House: Total, match status

### 3. 1:1 Verification Results
- PDF → DB: match rate, missing transactions
- DB → PDF: match rate, extra transactions

### 4. Discrepancies Found
- List all issues by severity (Critical, Warning, Minor)
- For each discrepancy: date, description, expected, actual, difference

### 5. Recommendation
- ✅ ACCEPT: <2% variance, all critical checks pass
- ⚠️ ACCEPT WITH NOTES: 2-5% variance, minor issues documented
- ❌ REJECT: >5% variance, critical issues found

---

## Success Criteria

### MUST PASS (All required):
- ✅ Rent transaction = 35,000 THB (not ~1074)
- ✅ Expense Tracker grand total within 2% of $6,347.08
- ✅ All Gross Income transactions match ($175.00 total)
- ✅ All Savings transactions match ($341.67 total)
- ✅ All Florida House transactions match (~$344.28 total)
- ✅ 100% of PDF transactions found in DB (or documented exceptions)
- ✅ 100% of DB transactions found in PDF (or documented exceptions)

### SHOULD PASS (Expected):
- ✅ At least 80% of daily totals match within $1.00
- ✅ No single daily discrepancy >$100
- ✅ All amount mismatches <$0.50

### ACCEPTABLE FAILURES:
- Small rounding differences (<$0.10 per transaction)
- Daily exchange rate variations causing <$5 daily variance
- Overall variance <2% of total

---

## Expected Results (from PDF)

### Expense Tracker
- **GRAND TOTAL:** $6,347.08
- **Daily Totals:** 30 days of data

### Gross Income Tracker
- **GROSS INCOME TOTAL:** $175.00
- 1 transaction (Freelance Income)

### Personal Savings & Investments
- **TOTAL:** $341.67
- 1 transaction (Emergency Savings)

### Florida House Expenses
- **GRAND TOTAL:** $344.28
- ~4-6 transactions

### Expected Total Transactions
- Expense Tracker: ~183 transactions
- Gross Income: 1 transaction
- Savings: 1 transaction
- Florida House: 4-6 transactions
- **Total:** ~189-191 transactions

---

## If Issues Found

### Scenario 1: >2% variance in Expense Tracker
**Action:**
1. Identify which days have largest discrepancies
2. Manually verify those days transaction-by-transaction
3. Check for:
   - Missing transactions
   - Duplicate transactions
   - Wrong section assignment
   - Currency conversion errors
4. Document all issues
5. Fix if critical, accept if minor

### Scenario 2: Missing transactions (PDF → DB)
**Action:**
1. List all missing transactions
2. Check if they were in the CSV source
3. Check if parsing script handled them
4. Re-parse if needed
5. Document why they were missing

### Scenario 3: Extra transactions (DB → PDF)
**Action:**
1. List all extra transactions
2. Check if they're from another month
3. Check if they're duplicates
4. Check if they're from a different section/source
5. Delete if incorrect, document if valid

---

## Tools & Scripts Needed

1. **Daily comparison script:** `scripts/validate-june-expense-tracker.js`
2. **1:1 verification script:** `scripts/verify-june-1to1.js`
3. **SQL queries:** Provided in this document

---

## Estimated Time

- Parsing & Import: 10 minutes
- Section validation: 30 minutes
- 1:1 verification: 45-60 minutes
- Report generation: 15 minutes
- **Total:** 1.5-2 hours

---

## Ready to Execute

Follow this protocol step-by-step. Document everything. Flag any issues for human review immediately.

**Start with STEP 1 and work through sequentially.**

Good luck! 🚀
