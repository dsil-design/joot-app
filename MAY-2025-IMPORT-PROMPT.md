# May 2025 Import - Full Protocol

**Date:** October 23, 2025
**Month:** May 2025
**Status:** Ready to Execute

---

## Context & Background

### Problem Fixed
May, June, and July 2025 were previously imported with USD conversion values instead of original THB amounts. The parsing scripts have been corrected to store original currency values.

### What Was Done
- ✅ Deleted old May 2025 data
- ✅ Fixed parsing script: `scripts/parse-may-2025.js`
- ✅ July 2025 successfully re-imported and verified (100% match with PDF)
- ✅ June 2025 successfully re-imported and verified (100% match with PDF)

### What Needs to Happen Now
Re-import May 2025 using the corrected parsing script, with comprehensive 1:1 verification against PDF and CSV sources.

---

## Reference Files

### Primary Sources
- **PDF:** `/csv_imports/Master Reference PDFs/Budget for Import-page4.pdf` (May 2025)
- **CSV:** `/csv_imports/fullImport_20251017.csv` (lines for May 2025 section)
- **Parsing Script:** `/scripts/parse-may-2025.js` (CORRECTED)
- **Import Script:** `/scripts/db/import-month.js`

### Supporting Documents
- **Parsing Rules:** `/scripts/FINAL_PARSING_RULES.md`
- **Import Plan:** `/IMPORT_PLAN.md`
- **June Verification:** `/JUNE-2025-VALIDATION-REPORT.md` (reference for process)
- **July Verification:** `/JULY-2025-PDF-VERIFICATION-COMPLETE.md` (reference for process)

---

## Pre-Import Verification

### Step 1: Verify Parsing Script is Corrected

Check the critical section:
```bash
grep -A 10 "Currency extraction logic" scripts/parse-may-2025.js
```

**Expected output should show:**
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

### Step 2: Expected Counts

From previous analysis, May 2025 should have approximately:
- Expense Tracker: ~150-180 transactions
- Gross Income: 1-2 transactions
- Savings/Investments: 1 transaction
- Florida House: ~5-7 transactions (after duplicate removal)

**Note:** Exact counts will be confirmed during parsing.

---

## Execution Steps

### STEP 1: Parse May 2025

```bash
cd /Users/dennis/Code\ Projects/joot-app
node scripts/parse-may-2025.js
```

#### Expected Console Output
```
Starting to parse May 2025 transactions...
=== SECTION 1: Expense Tracker ===
Parsed XXX Expense Tracker transactions

=== SECTION 2: Gross Income Tracker ===
Parsed X Gross Income transactions

=== SECTION 3: Personal Savings & Investments ===
Parsed X Savings transactions

=== SECTION 4: Florida House Expenses ===
Skipping duplicate at line XXXX: [description]
Parsed X Florida House transactions (after duplicate removal)

======================================================================
💱 CURRENCY VALIDATION CHECK
======================================================================
📊 THB Transactions: XX
   Largest: This Month's Rent = ~35000 THB
   ✅ Rent amount looks correct (~35,000 THB)
   Sample THB transactions:
   - [First 3 THB transactions with amounts]

📊 USD Transactions: XX
   Sample USD transactions:
   - [First 3 USD transactions]

✅ Currency validation passed
======================================================================

✅ Saved XXX transactions to scripts/may-2025-CORRECTED.json
✅ Wrote parse report to scripts/MAY-2025-PARSE-REPORT.md
```

#### Critical Validation Checks

**MUST VERIFY:**
- ✅ Currency validation passed
- ✅ Rent = ~35000 THB (NOT ~1074)
- ✅ Total transaction count seems reasonable
- ✅ Parse report generated

**If ANY of these fail, STOP and investigate before importing.**

---

### STEP 2: Verify Parsed JSON Against PDF

```bash
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scripts/may-2025-CORRECTED.json', 'utf-8'));
console.log('Total Transactions:', data.length);
console.log('');

// Find rent
const rent = data.find(t => t.description.includes('Month') && t.description.includes('Rent') && t.transaction_type === 'expense');
console.log('🏠 Rent Transaction:');
console.log('  Description:', rent.description);
console.log('  Amount:', rent.amount);
console.log('  Currency:', rent.currency);
console.log('  Date:', rent.date);
console.log('  ✅ Expected: ~35000 THB');
console.log('');

// Currency breakdown
const thb = data.filter(t => t.currency === 'THB');
const usd = data.filter(t => t.currency === 'USD');
console.log('Currency Breakdown:');
console.log('  THB:', thb.length, 'transactions');
console.log('  USD:', usd.length, 'transactions');
"
```

#### PDF Cross-Reference (Manual Spot Check)

Open PDF page 4 and verify at least 10 transactions 1:1:

| PDF Line | Description | PDF Amount | JSON Amount | Match? |
|----------|-------------|------------|-------------|--------|
| May 1 | This Month's Rent | THB ~35000.00 | ? | ? |
| May X | [Transaction 2] | [Amount] | ? | ? |
| May X | [Transaction 3] | [Amount] | ? | ? |
| ... | ... | ... | ... | ... |

**Verify at least 10 THB transactions match PDF exactly (amount and currency).**

If mismatches found, document them and ask for clarification.

---

### STEP 3: Comprehensive PDF Verification

Create comprehensive verification:

```bash
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scripts/may-2025-CORRECTED.json', 'utf-8'));

// Add PDF samples from May 2025 PDF after reviewing it
const pdfSamples = [
  { date: '2025-05-01', desc: 'Rent', amount: 35000, currency: 'THB' },
  // Add 15-20 more samples from PDF
];

console.log('PDF VERIFICATION REPORT - MAY 2025');
console.log('='.repeat(70));
console.log('');

let matches = 0;
let mismatches = 0;

pdfSamples.forEach((sample, index) => {
  const found = data.find(t => {
    const descMatch = t.description.toLowerCase().includes(sample.desc.toLowerCase());
    const dateMatch = t.date === sample.date;
    const currencyMatch = t.currency === sample.currency;
    return descMatch && dateMatch && currencyMatch;
  });

  if (found && Math.abs(found.amount - sample.amount) < 0.01) {
    console.log(\`✅ [\${(index + 1).toString().padStart(2, ' ')}] \${sample.date} | \${sample.desc.padEnd(30)} | \${sample.amount.toString().padStart(8)} \${sample.currency}\`);
    matches++;
  } else if (found) {
    console.log(\`❌ [\${(index + 1).toString().padStart(2, ' ')}] \${sample.desc}: Expected \${sample.amount}, got \${found.amount}\`);
    mismatches++;
  } else {
    console.log(\`⚠️  [\${(index + 1).toString().padStart(2, ' ')}] \${sample.desc}: NOT FOUND\`);
    mismatches++;
  }
});

console.log('');
console.log('='.repeat(70));
console.log(\`✅ Matches:     \${matches}\`);
console.log(\`❌ Mismatches:  \${mismatches}\`);
console.log(\`📊 Pass Rate:   \${(matches/pdfSamples.length*100).toFixed(1)}%\`);
console.log('='.repeat(70));

if (matches / pdfSamples.length >= 0.95) {
  console.log('✅ VERIFICATION PASSED - Ready to import!');
  process.exit(0);
} else {
  console.log('❌ VERIFICATION FAILED - Review mismatches');
  process.exit(1);
}
"
```

**Minimum acceptance: 95% pass rate**

**Only proceed to import if verification passes.**

---

### STEP 4: Import to Database

**Only proceed if Steps 1-3 passed.**

```bash
node scripts/db/import-month.js --file=scripts/may-2025-CORRECTED.json --month=2025-05
```

#### Expected Output

```
📥 INCREMENTAL MONTH IMPORT
==================================================
Target Month: 2025-05
Data File: scripts/may-2025-CORRECTED.json
User: dennis@dsil.design

📊 Loaded XXX transactions from file

👤 User ID: [uuid]

🔍 Found 0 existing transactions in 2025-05
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
New Vendors: XX
New Payment Methods: X
New Tags: X
==================================================
✅ Import complete!
```

---

### STEP 5: Database Verification

#### 5.1: Verify Rent Transaction

```bash
PGPASSWORD=NkWsbieKWodIMkjF psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -d postgres -U postgres.uwjmgjqongcrsamprvjr -c "
SELECT transaction_date, description, amount, original_currency
FROM transactions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dennis@dsil.design')
  AND description ILIKE '%month%rent%'
  AND transaction_date >= '2025-05-01'
  AND transaction_date < '2025-06-01';
"
```

**Expected Output:**
```
 transaction_date |     description     |  amount  | original_currency
------------------+---------------------+----------+-------------------
 2025-05-01       | This Month's Rent   | 35000.00 | THB
```

✅ **CRITICAL:** Must show ~35000.00 THB (NOT ~1074!)

#### 5.2: Verify Currency Distribution

```bash
PGPASSWORD=NkWsbieKWodIMkjF psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -d postgres -U postgres.uwjmgjqongcrsamprvjr -c "
SELECT
  original_currency,
  COUNT(*) as count,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount,
  ROUND(AVG(amount)::numeric, 2) as avg_amount
FROM transactions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dennis@dsil.design')
  AND transaction_date >= '2025-05-01'
  AND transaction_date < '2025-06-01'
GROUP BY original_currency
ORDER BY original_currency;
"
```

**Expected Output:**
```
 original_currency | count | min_amount | max_amount | avg_amount
-------------------+-------+------------+------------+------------
 THB               |    XX |       X.XX |   35000.00 |    XXXX.XX
 USD               |   XXX |       X.XX |    XXXX.XX |      XX.XX
```

✅ **Verify:** THB max = ~35000.00 (the rent)

#### 5.3: Spot Check 10 THB Transactions Against PDF

```bash
PGPASSWORD=NkWsbieKWodIMkjF psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -d postgres -U postgres.uwjmgjqongcrsamprvjr -c "
SELECT transaction_date, description, amount, original_currency
FROM transactions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dennis@dsil.design')
  AND transaction_date >= '2025-05-01'
  AND transaction_date < '2025-06-01'
  AND original_currency = 'THB'
ORDER BY amount DESC
LIMIT 10;
"
```

For each result, cross-reference with PDF page 4:
- Find matching line in PDF
- Verify amount matches "Actual Spent" column (THB value)
- Verify amount does NOT match "Conversion" column (USD value)

Create verification table:

| DB Date | DB Description | DB Amount | PDF Amount | Match? |
|---------|----------------|-----------|------------|--------|
| 2025-05-XX | This Month's Rent | 35000 THB | THB 35000.00 | ✅ |
| ... | ... | ... | ... | ... |

**All 10 must be ✅**

#### 5.4: Verify Transaction Count

```bash
PGPASSWORD=NkWsbieKWodIMkjF psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -d postgres -U postgres.uwjmgjqongcrsamprvjr -c "
SELECT COUNT(*) as total_count
FROM transactions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dennis@dsil.design')
  AND transaction_date >= '2025-05-01'
  AND transaction_date < '2025-06-01';
"
```

**Expected:** Total count from parsing step

#### 5.5: Verify Tag Distribution

```bash
PGPASSWORD=NkWsbieKWodIMkjF psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -d postgres -U postgres.uwjmgjqongcrsamprvjr -c "
SELECT t.name, COUNT(*) as count
FROM tags t
JOIN transaction_tags tt ON t.id = tt.tag_id
JOIN transactions txn ON tt.transaction_id = txn.id
WHERE txn.user_id = (SELECT id FROM auth.users WHERE email = 'dennis@dsil.design')
  AND txn.transaction_date >= '2025-05-01'
  AND txn.transaction_date < '2025-06-01'
GROUP BY t.name
ORDER BY count DESC;
"
```

**Expected tags:** Reimbursement, Florida House, Savings/Investment, possibly Business Expense

---

### STEP 6: Create Validation Report

Generate comprehensive report:

```bash
node scripts/validate-may-2025-corrected.js > MAY-2025-VALIDATION-REPORT.md
```

**Report must include:**

1. **Transaction Count Verification**
   - Expected vs Actual
   - Pass/Fail status

2. **Currency Verification**
   - THB transaction count
   - USD transaction count
   - Rent = ~35000 THB verification

3. **PDF Cross-Reference**
   - Sample of 10-20 transactions
   - Match rate
   - Any discrepancies

4. **Tag Verification**
   - Expected vs Actual for each tag
   - Pass/Fail status

5. **Financial Totals**
   - Total expenses (with currency conversion)
   - Total income
   - Variance from PDF expected

6. **Final Status**
   - ✅ PASS or ❌ FAIL
   - Recommendation to proceed or investigate

---

## Success Criteria

**ALL must be ✅ before marking complete:**

- [ ] Parsing script executed without errors
- [ ] Currency validation passed during parsing
- [ ] Rent transaction = ~35000 THB in parsed JSON
- [ ] Total transaction count reasonable
- [ ] At least 10 THB transactions verified 1:1 with PDF
- [ ] Database import completed successfully
- [ ] Rent transaction = ~35000 THB in database
- [ ] Currency distribution matches expectations
- [ ] Tag distribution matches expectations
- [ ] PDF verification pass rate ≥ 95%
- [ ] Validation report generated and reviewed

---

## If Issues Found

### Scenario 1: Parsing Issues
**Symptom:** Currency validation fails, rent ≠ ~35000 THB

**Action:**
1. STOP - Do not import
2. Review parsing script changes
3. Compare with June/July 2025 scripts (known working)
4. Fix and re-parse
5. Start verification from Step 1

### Scenario 2: Import Issues
**Symptom:** Database values don't match parsed JSON

**Action:**
1. Check import script mapping
2. Verify currency → original_currency mapping
3. Delete May 2025 transactions
4. Fix import script
5. Re-import

### Scenario 3: PDF Mismatch
**Symptom:** Parsed values don't match PDF

**Action:**
1. Document all mismatches in detail
2. Check CSV source for those specific transactions
3. Ask user for clarification
4. Do NOT proceed until resolved

---

## Questions to Ask if Uncertain

1. **Currency Values:** "I found transaction X with amount Y in currency Z. The PDF shows [amount]. Which should I use?"
2. **Merchant Names:** "CSV has merchant 'ABC', PDF has 'ABC Company'. Which should be stored?"
3. **Tag Assignment:** "Transaction X has flag Y. Should this get tag Z?"
4. **Date Discrepancies:** "CSV shows date A, but it appears in section for date B. Which is correct?"
5. **Amount Calculation:** "For THB transaction, CSV column 6 shows X, column 9 shows Y. I'm using X (column 6) - is this correct?"

---

## Post-Import Next Steps

After successful May 2025 import:

1. Document completion in `MAY-2025-IMPORT-COMPLETE.md`
2. Archive validation artifacts
3. Update project status
4. All historical months (May-September 2025) will be complete with correct currency values

---

## Reference

- **Similar Process:** June 2025 re-import (100% pass rate)
- **Similar Process:** July 2025 re-import (100% pass rate)
- **Parsing Rules:** `/scripts/FINAL_PARSING_RULES.md`
- **Data Model:** See corrected import prompts in conversation history

---

## Status: Ready to Execute

**Estimated Time:** 1-2 hours (with full verification)
**Priority:** HIGH - Fix data integrity issue
**Confidence:** HIGH (Based on successful June and July imports)

---

## Execution Checklist

- [ ] Read May 2025 PDF to understand data structure
- [ ] Verify parsing script is corrected
- [ ] Parse May 2025 transactions
- [ ] Verify parsed JSON against PDF (20+ samples)
- [ ] Comprehensive PDF verification (≥95% pass rate)
- [ ] Import to database
- [ ] Database verification (rent, currency, counts, tags)
- [ ] Create validation report
- [ ] Document completion

---

**Ready to begin when you are. Follow the steps sequentially and verify at each stage.**
