# June 2025 Import - Full Protocol

**Date**: October 23, 2025
**Month**: June 2025
**Status**: Ready to Execute

---

## Context & Background

### Problem Fixed
May, June, and July 2025 were previously imported with **USD conversion values** instead of **original THB amounts**. The parsing scripts have been corrected to store original currency values.

### What Was Done
- ✅ Deleted old June 2025 data (190 transactions)
- ✅ Fixed parsing script: `scripts/parse-june-2025.js`
- ✅ July 2025 successfully re-imported and verified (100% match with PDF)

### What Needs to Happen Now
Re-import June 2025 using the corrected parsing script, with **comprehensive 1:1 verification** against PDF and CSV sources.

---

## Reference Files

### Primary Sources
- **PDF**: `/csv_imports/Master Reference PDFs/Budget for Import-page5.pdf` (June 2025)
- **CSV**: `/csv_imports/fullImport_20251017.csv` (lines 1232-1519)
- **Parsing Script**: `/scripts/parse-june-2025.js` (CORRECTED)
- **Import Script**: `/scripts/db/import-month.js`

### Supporting Documents
- **Parsing Rules**: `/scripts/FINAL_PARSING_RULES.md`
- **Import Plan**: `/IMPORT_PLAN.md`
- **July Verification**: `/JULY-2025-PDF-VERIFICATION-COMPLETE.md` (reference for process)

---

## Pre-Import Verification

### Step 1: Verify Parsing Script is Corrected

**Check the critical section:**

```bash
grep -A 10 "Currency extraction logic" scripts/parse-june-2025.js
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

✅ **Verify**: NOT using column 9 (subtotal/conversion) for THB amounts

### Step 2: Review Expected Counts

From previous analysis (JUNE-2025-PARSE-REPORT.md):

| Section | Expected Count |
|---------|---------------|
| Expense Tracker | 181 transactions |
| Gross Income Tracker | 1 transaction |
| Personal Savings & Investments | 1 transaction |
| Florida House Expenses | 7 raw → 6 after duplicate removal |
| **TOTAL** | **189 transactions** |

### Step 3: Expected Financial Totals

From PDF (page 5):
- **Expense Tracker GRAND TOTAL**: $6,347.08
- **Gross Income**: $190.00
- **Savings**: $341.67
- **Florida House**: $2,574.77

---

## Execution Steps

### STEP 1: Parse June 2025

```bash
cd /Users/dennis/Code\ Projects/joot-app
node scripts/parse-june-2025.js
```

#### Expected Console Output

```
Starting to parse June 2025 transactions...

=== SECTION 1: Expense Tracker ===
Parsed 181 Expense Tracker transactions

=== SECTION 2: Gross Income Tracker ===
Parsed 1 Gross Income transactions

=== SECTION 3: Personal Savings & Investments ===
Parsed 1 Savings transactions

=== SECTION 4: Florida House Expenses ===
Skipping duplicate at line 1510: Ring subscription - RING - $10.69
Parsed 6 Florida House transactions (after duplicate removal)

======================================================================
💱 CURRENCY VALIDATION CHECK
======================================================================

📊 THB Transactions: XX
   Largest: This Month's Rent = 35000 THB
   ✅ Rent amount looks correct (~35,000 THB)

   Sample THB transactions:
   - [First 3 THB transactions with amounts]

📊 USD Transactions: XX
   Sample USD transactions:
   - [First 3 USD transactions]

✅ Currency validation passed

======================================================================

✅ Saved 188 transactions to /Users/dennis/Code Projects/joot-app/scripts/june-2025-CORRECTED.json
✅ Wrote parse report to /Users/dennis/Code Projects/joot-app/scripts/JUNE-2025-PARSE-REPORT.md
```

#### Critical Validation Checks

**MUST VERIFY:**

1. ✅ Currency validation passed
2. ✅ Rent = 35000 THB (NOT ~1074)
3. ✅ Total = 188 transactions (not 189 - one duplicate removed)
4. ✅ Parse report generated

**If ANY of these fail, STOP and investigate before importing.**

---

### STEP 2: Verify Parsed JSON Against PDF

**Open the parsed JSON and verify key transactions:**

```bash
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scripts/june-2025-CORRECTED.json', 'utf-8'));

console.log('Total Transactions:', data.length);
console.log('');

// Find rent
const rent = data.find(t => t.description.includes('Month') && t.description.includes('Rent') && t.transaction_type === 'expense');
console.log('🏠 Rent Transaction:');
console.log('  Description:', rent.description);
console.log('  Amount:', rent.amount);
console.log('  Currency:', rent.currency);
console.log('  Date:', rent.date);
console.log('  ✅ Expected: 35000 THB');
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

**Open PDF page 5 and verify these transactions 1:1:**

| PDF Line | Description | PDF Amount | JSON Amount | Match? |
|----------|-------------|------------|-------------|--------|
| June 1 | This Month's Rent | THB 35000.00 | ? | ? |
| June 2 | Work Email | $6.36 | ? | ? |
| June 3 | Monthly Cleaning | THB 3420.00 | ? | ? |
| June 5 | Annual Subscription: Amazon Prime | $140.25 | ? | ? |
| June 7 | Elephant Sanctuary w/ Austin | THB 3500.00 | ? | ? |

**Verify at least 10 THB transactions match PDF exactly** (amount and currency).

**If mismatches found, document them and ask for clarification.**

---

### STEP 3: CSV Line-by-Line Verification (Sample)

**Pick 5 random lines from CSV and verify against parsed JSON:**

Example CSV lines to check (from lines 1232-1519):
- Line 1234: [First transaction after header]
- Line 1300: [Mid-month transaction]
- Line 1400: [Another mid-month]
- Line 1470: [Near end of Expense Tracker]
- Line 1510: [The duplicate that should be REMOVED]

**For each line:**
1. Read CSV row
2. Find matching transaction in JSON by date + description
3. Verify:
   - ✅ Amount matches
   - ✅ Currency correct (THB from column 6, USD from column 7)
   - ✅ Transaction type correct
   - ✅ Tags correct
   - ✅ Merchant/payment method populated

**Document**: Create a simple table showing these 5 verifications.

---

### STEP 4: Import to Database

**Only proceed if Steps 1-3 passed.**

```bash
node scripts/db/import-month.js --file=scripts/june-2025-CORRECTED.json --month=2025-06
```

#### Expected Output

```
📥 INCREMENTAL MONTH IMPORT
==================================================
Target Month: 2025-06
Data File: scripts/june-2025-CORRECTED.json
User: dennis@dsil.design

📊 Loaded 188 transactions from file

👤 User ID: [uuid]

🔍 Found 0 existing transactions in 2025-06
✅ No existing transactions - proceeding with clean import.

🔄 Processing 4 batches of 50 transactions...

   Batch 1/4: Processing 50 transactions...
   ✅ Imported 50 transactions
   Batch 2/4: Processing 50 transactions...
   ✅ Imported 50 transactions
   Batch 3/4: Processing 50 transactions...
   ✅ Imported 50 transactions
   Batch 4/4: Processing 38 transactions...
   ✅ Imported 38 transactions

==================================================
📋 IMPORT SUMMARY
==================================================
Total Transactions: 188 imported, 0 skipped (duplicates)
Transaction Types: XXX expenses, XX income
New Vendors: X
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
  AND transaction_date >= '2025-06-01'
  AND transaction_date < '2025-07-01';
"
```

**Expected Output:**
```
 transaction_date |     description     |  amount  | original_currency
------------------+---------------------+----------+-------------------
 2025-06-01       | This Month's Rent   | 35000.00 | THB
```

✅ **CRITICAL**: Must show 35000.00 THB (NOT 1074.5!)

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
  AND transaction_date >= '2025-06-01'
  AND transaction_date < '2025-07-01'
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

✅ **Verify**: THB max = 35000.00 (the rent)

#### 5.3: Spot Check 10 THB Transactions Against PDF

```bash
PGPASSWORD=NkWsbieKWodIMkjF psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -d postgres -U postgres.uwjmgjqongcrsamprvjr -c "
SELECT transaction_date, description, amount, original_currency
FROM transactions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dennis@dsil.design')
  AND transaction_date >= '2025-06-01'
  AND transaction_date < '2025-07-01'
  AND original_currency = 'THB'
ORDER BY amount DESC
LIMIT 10;
"
```

**For each result, cross-reference with PDF page 5:**
- Find matching line in PDF
- Verify amount matches "Actual Spent" column (THB value)
- Verify amount does NOT match "Conversion" column (USD value)

**Create verification table:**

| DB Date | DB Description | DB Amount | PDF Amount | Match? |
|---------|----------------|-----------|------------|--------|
| 2025-06-01 | This Month's Rent | 35000 THB | THB 35000.00 | ✅ |
| ... | ... | ... | ... | ... |

**All 10 must be ✅**

#### 5.4: Verify Transaction Count

```bash
PGPASSWORD=NkWsbieKWodIMkjF psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -d postgres -U postgres.uwjmgjqongcrsamprvjr -c "
SELECT COUNT(*) as total_count
FROM transactions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'dennis@dsil.design')
  AND transaction_date >= '2025-06-01'
  AND transaction_date < '2025-07-01';
"
```

**Expected**: 188 transactions

#### 5.5: Verify Tag Distribution

```bash
PGPASSWORD=NkWsbieKWodIMkjF psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -d postgres -U postgres.uwjmgjqongcrsamprvjr -c "
SELECT t.name, COUNT(*) as count
FROM tags t
JOIN transaction_tags tt ON t.id = tt.tag_id
JOIN transactions txn ON tt.transaction_id = txn.id
WHERE txn.user_id = (SELECT id FROM auth.users WHERE email = 'dennis@dsil.design')
  AND txn.transaction_date >= '2025-06-01'
  AND txn.transaction_date < '2025-07-01'
GROUP BY t.name
ORDER BY count DESC;
"
```

**Expected tags** (from June 2025):
- Reimbursement: ~XX
- Florida House: 6
- Savings/Investment: 1
- Business Expense: ~X

---

### STEP 6: Comprehensive PDF Verification

**Create verification script:**

```bash
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scripts/june-2025-CORRECTED.json', 'utf-8'));

// PDF Sample Transactions (from page 5)
const pdfSamples = [
  { date: '2025-06-01', desc: 'This Month\\'s Rent', amount: 35000, currency: 'THB' },
  { date: '2025-06-03', desc: 'Monthly Cleaning', amount: 3420, currency: 'THB' },
  { date: '2025-06-07', desc: 'Elephant Sanctuary', amount: 3500, currency: 'THB' },
  // Add more from PDF
];

console.log('PDF Verification Report');
console.log('='.repeat(50));

let matches = 0;
let mismatches = 0;

pdfSamples.forEach(sample => {
  const found = data.find(t =>
    t.date === sample.date &&
    t.description.toLowerCase().includes(sample.desc.toLowerCase()) &&
    t.currency === sample.currency
  );

  if (found && Math.abs(found.amount - sample.amount) < 0.01) {
    console.log(\`✅ \${sample.desc}: \${sample.amount} \${sample.currency}\`);
    matches++;
  } else if (found) {
    console.log(\`❌ \${sample.desc}: Expected \${sample.amount}, got \${found.amount}\`);
    mismatches++;
  } else {
    console.log(\`⚠️  \${sample.desc}: Not found in parsed data\`);
    mismatches++;
  }
});

console.log('');
console.log(\`Matches: \${matches}/\${pdfSamples.length}\`);
console.log(\`Pass Rate: \${(matches/pdfSamples.length*100).toFixed(1)}%\`);
"
```

**Minimum acceptance: 95% pass rate**

---

### STEP 7: Create Validation Report

**Generate comprehensive report:**

```bash
node scripts/validate-june-2025-corrected.js > JUNE-2025-VALIDATION-REPORT.md
```

**Report must include:**

1. **Transaction Count Verification**
   - Expected vs Actual
   - Pass/Fail status

2. **Currency Verification**
   - THB transaction count
   - USD transaction count
   - Rent = 35000 THB verification

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
- [ ] Rent transaction = 35000 THB in parsed JSON
- [ ] Total transaction count = 188
- [ ] At least 10 THB transactions verified 1:1 with PDF
- [ ] Database import completed successfully
- [ ] Rent transaction = 35000 THB in database
- [ ] Currency distribution matches expectations
- [ ] Tag distribution matches expectations
- [ ] PDF verification pass rate ≥ 95%
- [ ] Validation report generated and reviewed

---

## If Issues Found

### Scenario 1: Parsing Issues

**Symptom**: Currency validation fails, rent ≠ 35000 THB

**Action**:
1. STOP - Do not import
2. Review parsing script changes
3. Compare with July 2025 script (known working)
4. Fix and re-parse
5. Start verification from Step 1

### Scenario 2: Import Issues

**Symptom**: Database values don't match parsed JSON

**Action**:
1. Check import script mapping
2. Verify `currency` → `original_currency` mapping
3. Delete June 2025 transactions
4. Fix import script
5. Re-import

### Scenario 3: PDF Mismatch

**Symptom**: Parsed values don't match PDF

**Action**:
1. Document all mismatches in detail
2. Check CSV source for those specific transactions
3. Ask user for clarification
4. Do NOT proceed until resolved

---

## Questions to Ask if Uncertain

1. **Currency Values**: "I found transaction X with amount Y in currency Z. The PDF shows [amount]. Which should I use?"

2. **Merchant Names**: "CSV has merchant 'ABC', PDF has 'ABC Company'. Which should be stored?"

3. **Tag Assignment**: "Transaction X has flag Y. Should this get tag Z?"

4. **Date Discrepancies**: "CSV shows date A, but it appears in section for date B. Which is correct?"

5. **Amount Calculation**: "For THB transaction, CSV column 6 shows X, column 9 shows Y. I'm using X (column 6) - is this correct?"

---

## Post-Import Next Steps

**After successful June 2025 import:**

1. Document completion in `JUNE-2025-IMPORT-COMPLETE.md`
2. Archive validation artifacts
3. Prepare prompt for May 2025 (same process)

---

## References

- **Similar Process**: See `JULY-2025-CORRECTED-IMPORT-COMPLETE.md` for reference
- **Parsing Rules**: See `FINAL_PARSING_RULES.md` for all rules
- **Data Model**: See corrected import prompt in conversation history

---

**Status**: Ready to Execute
**Estimated Time**: 1-2 hours (with full verification)
**Priority**: HIGH - Fix data integrity issue
