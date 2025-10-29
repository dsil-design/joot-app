# Batch 1 Import Kickoff: August-July-June-May 2023 (V2 - Enhanced with Historical Learnings)

Copy and paste this entire prompt into a new Claude Code tab to begin Batch 1.

---

## TASK: Execute Batch 1 Import (Aug-Jul-Jun-May 2023)

I need you to execute a comprehensive batch transaction import for **4 months** (August, July, June, May 2023) using the proven Three-Gate Architecture, enhanced with critical learnings from 21+ months of historical imports (Dec 2023 - Sept 2025).

---

## CONTEXT

**Historical Import Success:**
- **21+ months imported:** Dec 2023 - Sept 2025 (2,400+ transactions)
- **Recent pilot:** Nov-Oct-Sept 2023 (367 transactions, 100% verified)
- **Success rate:** 95%+ accuracy across all months
- **Proven frameworks:** Three-Gate Architecture, comprehensive validation

**What We're Doing Now:**
- Batch 1: August-July-June-May 2023 (4 months)
- Expected: ~1,060-1,160 transactions
- All months are Thailand-based (high THB percentage expected)
- Apply ALL learnings from 21+ months of imports

---

## CRITICAL LEARNINGS FROM 21+ MONTHS (MUST READ)

**BEFORE YOU START, READ THESE THREE DOCUMENTS:**

1. **BATCH-1-CRITICAL-LEARNINGS-REPORT.md** (38KB)
   - Location: `scripts/archive/BATCH-1-CRITICAL-LEARNINGS-REPORT.md`
   - Contains: 10 sections of deep analysis, month-by-month insights, reusable patterns
   - **READ SECTIONS 1-3 MINIMUM** (Executive Summary, Critical Failures, Top 10 Findings)

2. **BATCH-1-EXPLORATION-COMPLETE.md** (12KB)
   - Location: `scripts/archive/BATCH-1-EXPLORATION-COMPLETE.md`
   - Contains: Executive summary, 2 blocking issues, success criteria
   - **READ IN FULL** (15-minute read, critical for success)

3. **BATCH-1-LEARNINGS-INDEX.md** (8KB)
   - Location: `/Users/dennis/Code Projects/joot-app/BATCH-1-LEARNINGS-INDEX.md`
   - Contains: Quick navigation, action items, next steps
   - **SKIM FOR REFERENCE** (5-minute read)

---

## ⚠️ TWO BLOCKING ISSUES - MUST FIX BEFORE STARTING

### BLOCKING ISSUE #1: Tag Application Failure (CRITICAL)

**Problem:** March 2025 and April 2025 imports had ZERO tags applied despite correct JSON parsing.

**Evidence:**
- JSON files had 34 tags (March), 22+ tags (April)
- Database showed 0 tags after import
- No errors thrown during import
- Silent failure in tag insertion

**REQUIRED ACTION BEFORE BATCH 1:**

1. **Audit Import Script** (`scripts/db/import-month.js` lines 419-451)
   - Verify tags array is read from JSON correctly
   - Verify transaction_tags table insertion logic
   - Check for silent failures in tag linking

2. **Create Test Import** (100 transactions from sample data)
   ```bash
   # Create sample with known tag counts
   # Expected: 15 Reimbursement, 3 Florida House
   # Run import
   # Query: SELECT COUNT(*) FROM transaction_tags WHERE...
   # If count = 0 → FIX REQUIRED
   # If count matches → PROCEED
   ```

3. **Add Immediate Verification** (within 30 seconds of import)
   ```javascript
   // After import completes
   const { data: tagCount } = await supabase
     .from('transaction_tags')
     .select('count')
     .gte('created_at', importStartTime);

   if (tagCount === 0 && expectedTags > 0) {
     throw new Error('TAG APPLICATION FAILED - ROLLBACK REQUIRED');
   }
   ```

**DO NOT PROCEED WITH BATCH 1 UNTIL THIS IS VERIFIED WORKING**

---

### BLOCKING ISSUE #2: Exchange Rate Varies by Month (CRITICAL)

**Problem:** Exchange rate varies 28% across months (0.0241 - 0.0309 USD/THB).

**Impact:**
- Cannot use single constant rate for all months
- Must calculate rate per month from rent transaction
- Daily variance up to $100 is NORMAL and expected
- 50-93% daily match rate is ACCEPTABLE

**REQUIRED ACTION:**

1. **Calculate Rate Per Month**
   ```javascript
   // Find rent transaction: "This Month's Rent" = THB 25,000
   // Extract USD equivalent from same transaction
   // Calculate: rate = USD_amount / THB_amount
   // Use THIS rate for all THB conversions in this month
   ```

2. **Accept Variance Thresholds**
   - Daily: ±$100 cumulative (due to rounding)
   - Monthly: ±2% total (different calculation orders)
   - Match rate: 50-93% exact match is GOOD (not 100%)

3. **Validation Query Per Month**
   ```sql
   -- Extract exchange rate from rent
   SELECT amount, original_currency
   FROM transactions
   WHERE description ILIKE '%This Month''s Rent%'
   AND transaction_date BETWEEN '2023-08-01' AND '2023-08-31';

   -- THB transaction: 25000 THB
   -- USD transaction: ~$XXX USD
   -- Rate = USD / 25000
   ```

---

## TOP 10 CRITICAL LEARNINGS (FROM 21+ MONTHS)

### 1. ✅ Tag Verification MUST Be Immediate (30 seconds)
- **Pattern:** 15% of months had tag application failures
- **Solution:** Query `transaction_tags` count within 30 seconds of import
- **Action:** If count = 0, STOP and investigate before proceeding

### 2. ✅ Negative Amounts Appear Every Month (3-7 per month)
- **Pattern:** 100% of months have refunds, winnings, settlements
- **Solution:** Use proven two-path converter in parsing script
- **Verification:** Query for negative amounts in DB (should be 0)

### 3. ✅ Comma-Formatted Amounts in Every Month (2-3 per month)
- **Pattern:** "$1,242.05" or "$2,127.42" in 100% of months
- **Solution:** Use `parseAmount()` sanitizer function
- **Reliability:** 100% success across 13 months

### 4. ✅ Duplicate Transactions in 30% of Months
- **Pattern:** Xfinity, utilities appear in both Expense Tracker + Florida House
- **Solution:** Remove Florida House version (Expense Tracker is source of truth)
- **Detection:** Same date + merchant + amount

### 5. ✅ Typo Reimbursements in 30% of Months
- **Pattern:** "Remibursement", "Rembursement", "Reimbursment"
- **Solution:** Regex `/^Re(im|mi|m)?burs[e]?ment:?/i`
- **Action:** Auto-tag as Reimbursement, flag for user confirmation

### 6. ✅ Florida House Data Has Issues (30-40% of months)
- **Pattern:** Duplicates, missing dates, incomplete data
- **Solution:** Default dates to month-end, prefer Expense Tracker data
- **Impact:** Low (user tracks separately, can be fixed post-import)

### 7. ✅ Missing Merchants in 20% of Months
- **Pattern:** Travel expenses, small daily purchases (Gas, Snack, etc.)
- **Solution:** Default to "Unknown" vendor, fix post-import if needed
- **Impact:** Low (user can update vendor names later)

### 8. ✅ Validation Framework Catches Everything
- **Level 1:** Section totals (catches tag failures immediately)
- **Level 5:** Critical spot checks (both rents, negative amounts, tags)
- **Level 6:** 1:1 PDF verification (100% match when performed)
- **Key:** Run Level 1 within 30 seconds, don't wait for all levels

### 9. ✅ Expected Quality Metrics (Based on 21+ Months)
- Transaction count: 100% accuracy
- Amount accuracy: 95%+
- Daily match rate: 50-93% (within $100 threshold)
- Tag distribution: 100% (if tags applied correctly)
- Section totals: ±2% variance (normal and acceptable)

### 10. ✅ Exchange Rate Varies 28% Across Months
- **Range:** 0.0241 - 0.0309 USD/THB
- **Solution:** Calculate per month from rent transaction
- **Validation:** Accept ±$100 daily, ±2% monthly variance

---

## REUSABLE PATTERNS (100% PROVEN FROM 21+ MONTHS)

### Parser Functions (Copy These Exactly)

**1. Parse Amount (Handles Commas)**
```javascript
function parseAmount(value) {
  if (!value) return 0;
  // Remove $, commas, tabs, spaces, parentheses
  const cleaned = String(value).replace(/[$,"	()s]/g, '').trim();
  return parseFloat(cleaned) || 0;
}
```

**2. Detect Typo Reimbursement**
```javascript
function isReimbursement(description) {
  // Matches: Reimbursement, Remibursement, Rembursement, Reimbursment
  return /^Re(im|mi|m)?burs[e]?ment:?/i.test(description);
}
```

**3. Convert Negative to Income**
```javascript
function convertNegativeAmount(txn) {
  if (txn.amount < 0) {
    return {
      ...txn,
      amount: Math.abs(txn.amount),
      transaction_type: 'income',
      // Add note if not reimbursement
      description: isReimbursement(txn.description)
        ? txn.description
        : `${txn.description} (converted from negative)`
    };
  }
  return txn;
}
```

**4. Find Duplicates**
```javascript
function findDuplicates(transactions) {
  const seen = new Set();
  const duplicates = [];

  for (const txn of transactions) {
    const key = `${txn.date}|${txn.merchant}|${txn.amount}`;
    if (seen.has(key)) {
      duplicates.push(txn);
    } else {
      seen.add(key);
    }
  }

  return duplicates;
}
```

### Validation Thresholds (Proven Across 21+ Months)

**Section Totals (Level 1):**
- Expense Tracker: ±2% OR ±$150
- Florida House: ±2% OR ±$50
- Savings: Exact match
- Gross Income: ±1% OR ±$1

**Daily Subtotals (Level 4):**
- Accept if 50%+ of days within $1.00
- All days must be within $100
- 50-93% exact match rate is NORMAL

**Critical Spot Checks (Level 5):**
- Both rents present (USA + Thailand)
- No negative amounts in database
- All Reimbursement transactions tagged
- All Florida House transactions tagged (if section exists)

---

## PROTOCOLS TO FOLLOW

**Primary Protocols:**
1. **BATCH-IMPORT-PROTOCOL v1.2** (`scripts/batch-imports/BATCH-IMPORT-PROTOCOL-v1.2.md`)
2. **MONTHLY-TRANSACTION-IMPORT-PROTOCOL v3.6** (`scripts/batch-imports/MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md`)
3. **SCALED-UP-BATCH-PLAN-JAN-AUG-2023.md** (`scripts/batch-imports/SCALED-UP-BATCH-PLAN-JAN-AUG-2023.md`)
4. **BATCH-1-CRITICAL-LEARNINGS-REPORT.md** (`scripts/archive/BATCH-1-CRITICAL-LEARNINGS-REPORT.md`) ← NEW

**Reference Materials:**
- Successful pilot: `scripts/batch-imports/batch-nov-sept-2023/`
- Historical imports: `scripts/archive/monthly-imports/` (21+ months)
- Dual residence context: `scripts/batch-imports/batch-nov-sept-2023/DUAL-RESIDENCE-CONTEXT.md`
- Parsing templates: `parse-november-2023.js`, `parse-october-2023.js`, `parse-september-2023.js`
- Import script: `scripts/db/import-month.js`
- Verification scripts: `verify-batch-against-pdfs.js`, `gate3-complete-verification.js`

---

## THREE-GATE ARCHITECTURE (ENHANCED)

### **Gate 1: Pre-Flight Analysis** (2-3 hours)

Execute comprehensive batch analysis for all 4 months:

1. **CSV Line Range Identification**
   - Scan master CSV file for each month
   - Identify line ranges for August, July, June, May 2023
   - Expected ranges (approximate):
     - August 2023: lines ~7174-7460 (~286 lines)
     - July 2023: lines ~7461-7710 (~249 lines)
     - June 2023: lines ~7711-7980 (~269 lines)
     - May 2023: lines ~7981-8250 (~269 lines)

2. **Transaction Count Estimation**
   - Estimate transaction count per month
   - Expected totals:
     - August: ~265-295 transactions
     - July: ~235-265 transactions
     - June: ~250-280 transactions
     - May: ~255-285 transactions

3. **Red Flag Identification** (Based on 21+ Months)

   **Expected Red Flags (Handle Automatically):**
   - ✅ Negative amount reimbursements (3-7 per month)
   - ✅ Comma-formatted amounts (2-3 per month)
   - ✅ Typo reimbursements (1-2 per month)
   - ✅ Duplicates (possible in 30% of months)
   - ✅ Missing merchants (possible in 20% of months)

   **Flag for User Confirmation:**
   - ⚠️ Large one-time expenses (>$1,000)
   - ⚠️ Rent amount variations (moves or lease changes)
   - ⚠️ Income adjustments (negative income)
   - ⚠️ Unusual reimbursement patterns

4. **Currency Distribution Analysis**
   - Expect 45-55% THB (Thailand-based months)
   - Calculate exchange rate per month from rent transaction
   - Verify dual residence pattern continues (USA + Thailand rents)

5. **Critical Transaction Spotting**
   - Both rents each month ($957-987 USD + THB 25,000)
   - Large expenses (flights, electronics)
   - Reimbursement patterns (check for typos)
   - Florida House section (if exists, check for duplicates)

**Deliverables:**
- `GATE-1-EXECUTIVE-SUMMARY.md`
- `BATCH-PREFLIGHT-REPORT.md`
- `BATCH-MANIFEST.md`
- Red flags document for each month (with auto-handle vs user-confirm flags)

---

### **Gate 2: Per-Month Import** (4 Phases × 4 Months)

**Process in REVERSE CHRONOLOGICAL order: August → July → June → May**

For EACH month, complete all 4 phases before moving to the next month:

#### **Phase 1: Parse CSV** (10-15 min per month)

1. Create parsing script using template from `parse-november-2023.js`
2. **INCORPORATE ALL REUSABLE PATTERNS** from learnings report
3. Update line ranges for the specific month
4. Set target month (e.g., '2023-08')
5. Run parsing script
6. Output: `{month}-2023-CORRECTED.json`

**Template location:** `scripts/batch-imports/batch-nov-sept-2023/november-2023/parse-november-2023.js`

**MUST INCLUDE (from 21+ months):**
- ✅ `parseAmount()` function (comma handling)
- ✅ `isReimbursement()` regex (typo detection)
- ✅ `convertNegativeAmount()` (two-path converter)
- ✅ `findDuplicates()` detection (Florida House vs Expense Tracker)
- ✅ Currency extraction: Column 6 (THB), Column 7/9 (USD), NEVER Column 8
- ✅ Deduplication key: date + description + amount + currency + merchant
- ✅ Exchange rate calculation from rent transaction

**Validation After Parsing:**
```bash
# Check JSON output
cat {month}-2023-CORRECTED.json | jq 'length'  # Should match expected count
cat {month}-2023-CORRECTED.json | jq '[.[] | select(.amount < 0)] | length'  # Should be 0
cat {month}-2023-CORRECTED.json | jq '[.[] | select(.tags | length > 0)] | length'  # Should be >0
```

#### **Phase 2: Import to Database** (5-10 min per month)

**CRITICAL: Verify Tag Application Fix Before Running**

1. Run import script:
   ```bash
   node scripts/db/import-month.js \
     --file=scripts/batch-imports/batch-aug-may-2023/{month}-2023/{month}-2023-CORRECTED.json \
     --month=2023-{MM}
   ```

2. Save log to `/tmp/{month}-2023-import.log`

3. **IMMEDIATE VERIFICATION (within 30 seconds):**
   ```javascript
   // Query transaction_tags count
   const { data: tagCount } = await supabase
     .from('transaction_tags')
     .select('count')
     .eq('transaction_date', 'BETWEEN start AND end');

   console.log('Tags applied:', tagCount);

   if (tagCount === 0 && expectedTags > 0) {
     throw new Error('TAG APPLICATION FAILED - STOP IMMEDIATELY');
   }
   ```

4. Review import summary for:
   - Total transactions imported vs expected
   - New vendors created
   - New payment methods created
   - New tags created
   - **TAG COUNT VERIFICATION** ← CRITICAL
   - Skipped duplicates (should be 0 for clean months)

#### **Phase 3: Validation Queries** (10-15 min per month)

Run comprehensive validation using proven framework:

**Level 1: Section Totals** (IMMEDIATE - within 30 seconds)
```sql
-- Expense Tracker
SELECT SUM(amount) FROM transactions
WHERE transaction_date BETWEEN '2023-08-01' AND '2023-08-31'
AND transaction_type = 'expense'
AND NOT EXISTS (
  SELECT 1 FROM transaction_tags tt
  JOIN tags t ON tt.tag_id = t.id
  WHERE tt.transaction_id = transactions.id
  AND t.name = 'Florida House'
);
-- Accept if within ±2% OR ±$150 of PDF total

-- Florida House (if exists)
SELECT SUM(amount) FROM transactions t
JOIN transaction_tags tt ON t.id = tt.transaction_id
JOIN tags tag ON tt.tag_id = tag.id
WHERE t.transaction_date BETWEEN '2023-08-01' AND '2023-08-31'
AND tag.name = 'Florida House';
-- Accept if within ±2% OR ±$50 of PDF total
```

**Level 2: Transaction Count Check**
```sql
SELECT COUNT(*) FROM transactions
WHERE user_id = 'USER_ID'
AND transaction_date >= '2023-08-01'
AND transaction_date <= '2023-08-31';
-- Must match expected count (±5 acceptable)
```

**Level 3: Dual Rent Verification**
```sql
-- USA Rent
SELECT * FROM transactions
WHERE transaction_date BETWEEN '2023-08-01' AND '2023-08-31'
AND description ILIKE '%This Month''s Rent%'
AND original_currency = 'USD';
-- Expected: ~$957-987

-- Thailand Rent
SELECT * FROM transactions
WHERE transaction_date BETWEEN '2023-08-01' AND '2023-08-31'
AND description ILIKE '%This Month''s Rent%'
AND original_currency = 'THB';
-- Expected: THB 25,000
```

**Level 4: No Negative Amounts**
```sql
SELECT COUNT(*) FROM transactions
WHERE amount < 0 AND transaction_date BETWEEN '2023-08-01' AND '2023-08-31';
-- Must return 0
```

**Level 5: Tag Verification** (CRITICAL)
```sql
-- Count all tags
SELECT COUNT(*) FROM transaction_tags tt
JOIN transactions t ON tt.transaction_id = t.id
WHERE t.transaction_date BETWEEN '2023-08-01' AND '2023-08-31';
-- Must be > 0

-- Count Reimbursement tags
SELECT COUNT(*) FROM transaction_tags tt
JOIN transactions t ON tt.transaction_id = t.id
JOIN tags tag ON tt.tag_id = tag.id
WHERE t.transaction_date BETWEEN '2023-08-01' AND '2023-08-31'
AND tag.name = 'Reimbursement';
-- Should match expected count from JSON
```

**Level 6: Currency Distribution**
```sql
SELECT
  COUNT(*) as thb_count,
  (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM transactions WHERE transaction_date BETWEEN '2023-08-01' AND '2023-08-31')) as thb_percentage
FROM transactions
WHERE original_currency = 'THB'
AND transaction_date BETWEEN '2023-08-01' AND '2023-08-31';
-- Expected: 45-55% for Thailand months
```

#### **Phase 4: Per-Month PDF Verification** (20-30 min per month)

Compare against PDF bank statement using proven approach:

**Critical Checks:**
1. ✅ Both rents present (USA + Thailand)
2. ✅ Exchange rate calculated from rent
3. ✅ Large expenses verified (>$1,000)
4. ✅ Reimbursement transactions tagged
5. ✅ Section totals within ±2%
6. ✅ Daily variance within $100
7. ✅ 50-93% daily match rate (acceptable)

**Spot Check Sample:**
- 5-10 random transactions (date, description, amount, currency)
- All Reimbursement transactions
- All large expenses (>$1,000)
- Both rent transactions

**✅ MUST PASS Phase 4 before proceeding to next month**

**If Phase 4 FAILS:**
- STOP immediately
- Investigate discrepancies
- Check tag application
- Verify exchange rate calculation
- Re-run validation queries
- DO NOT proceed to next month until resolved

---

### **Gate 3: 100% Batch Verification** (2-3 hours)

After all 4 months imported, execute comprehensive verification:

1. **Run Comprehensive Verification Script**
   ```bash
   node scripts/batch-imports/batch-aug-may-2023/gate3-complete-verification.js
   ```

2. **1:1 Transaction Matching**
   - Compare all JSON transactions vs database
   - Verify no missing transactions
   - Verify no extra transactions
   - Check for duplicates

3. **Field-Level Verification**
   - Transaction type (expense vs income)
   - Vendor associations
   - Payment method associations
   - Tag associations (CRITICAL - verify non-zero)
   - Amount accuracy
   - Currency correctness

4. **Cross-Month Analysis**
   - Verify 8 total rents (2 per month × 4 months)
   - Check subscription continuity (Xfinity, utilities, etc.)
   - Validate tag patterns (Reimbursement frequency)
   - Confirm currency distributions (45-55% THB expected)
   - Calculate exchange rate per month

5. **PDF Page-by-Page Verification** (Based on 21+ Months)
   - August: PDF page [TBD]
   - July: PDF page [TBD]
   - June: PDF page [TBD]
   - May: PDF page [TBD]

   **Accept as PASS if:**
   - Transaction counts match (±5 acceptable)
   - Section totals within ±2%
   - Daily variance within $100
   - 50-93% daily exact match
   - All critical transactions present

**Deliverables:**
- `GATE3-VERIFICATION-REPORT.json`
- `GATE3-FINAL-REPORT.md`
- `BATCH-IMPORT-COMPLETE.md`
- Exchange rate summary per month

---

## CRITICAL REQUIREMENTS (ENHANCED)

### ✅ Must Follow

1. **Fix Tag Application BEFORE Starting** - Blocking Issue #1
2. **Calculate Exchange Rate Per Month** - Blocking Issue #2
3. **Run Tag Verification Within 30 Seconds** - Lesson from 21+ months
4. **Accept 50-93% Daily Match Rate** - Normal variance from 21+ months
5. **Use All Reusable Patterns** - 100% proven reliability
6. **Reverse Chronological Order:** August → July → June → May
7. **Independent Month Validation:** Complete all 4 phases per month before next
8. **100% Verification:** Gate 3 is mandatory, not optional
9. **Dual Residence Pattern:** Both USA + Thailand rents MUST appear each month
10. **No Negative Amounts in Database:** Convert negative income to positive during parsing
11. **Currency Integrity:** THB from Column 6, USD from Column 7/9, NEVER Column 8
12. **Two-Step Tag Verification:** Count + UUID validation
13. **Deduplication:** Include merchant in key to avoid false duplicates

### ❌ Must Avoid

1. **Do NOT skip tag application verification** - causes 15% failure rate
2. **Do NOT use single exchange rate** - varies 28% across months
3. **Do NOT expect 100% daily match** - 50-93% is normal and acceptable
4. **Do NOT skip any phases** - all 4 phases required per month
5. **Do NOT proceed if tags = 0** - blocking issue requiring immediate fix
6. **Do NOT use Column 8** for currency values (conversion column)
7. **Do NOT create new payment method schema** - use existing
8. **Do NOT skip Gate 3** - 100% verification is mandatory

---

## EXPECTED PATTERNS (FROM 21+ MONTHS)

**Dual Residence Rents:**
- USA: $957-987/month + utilities (Conshohocken, PA)
- Thailand: THB 25,000/month (Bangkok)
- Both are valid expenses (user confirmed since June 2017)

**Currency Distribution:**
- Thailand months: 45-55% THB
- USA months: 2-4% THB
- Transition months: 40-45% THB

**Exchange Rate Variation:**
- Range: 0.0241 - 0.0309 USD/THB (28% variance)
- Calculate per month from rent transaction
- Accept ±$100 daily, ±2% monthly variance

**Common Red Flags (Auto-Handled):**
- ✅ Negative reimbursements (3-7 per month) → Convert to positive income
- ✅ Comma-formatted amounts ($1,242.05) → parseAmount() handles
- ✅ Typo reimbursements (Remibursement) → Flexible regex catches
- ✅ Duplicates (30% of months) → Detect and remove Florida House version
- ✅ Missing merchants (20% of months) → Default to "Unknown"
- ✅ Apostrophe variations (Month's vs Month's) → Unicode 8217 handling

**Quality Metrics (From 21+ Months):**
- Transaction count: 100% accuracy
- Amount accuracy: 95%+
- Daily match rate: 50-93% (normal, not 100%)
- Tag distribution: 100% (if tags applied correctly)
- Section totals: ±2% variance (acceptable)

**Tags to Watch:**
- Reimbursement: Income from friends/roommates (15+ per month expected)
- Savings/Investment: Transfers to savings accounts
- Florida House: Property-related expenses (if section exists)
- Business Expense: Work-related costs

---

## DIRECTORY STRUCTURE

Create this structure for Batch 1:

```
scripts/batch-imports/batch-aug-may-2023/
├── GATE-1-EXECUTIVE-SUMMARY.md
├── BATCH-PREFLIGHT-REPORT.md
├── BATCH-MANIFEST.md
├── EXCHANGE-RATE-SUMMARY.md          ← NEW (track rate per month)
├── TAG-VERIFICATION-LOG.md           ← NEW (immediate tag checks)
├── august-2023/
│   ├── parse-august-2023.js
│   ├── august-2023-CORRECTED.json
│   └── RED-FLAGS.md
├── july-2023/
│   ├── parse-july-2023.js
│   ├── july-2023-CORRECTED.json
│   └── RED-FLAGS.md
├── june-2023/
│   ├── parse-june-2023.js
│   ├── june-2023-CORRECTED.json
│   └── RED-FLAGS.md
├── may-2023/
│   ├── parse-may-2023.js
│   ├── may-2023-CORRECTED.json
│   └── RED-FLAGS.md
├── verify-batch-against-pdfs.js
├── gate3-complete-verification.js
├── GATE3-VERIFICATION-REPORT.json
├── GATE3-FINAL-REPORT.md
└── BATCH-IMPORT-COMPLETE.md
```

---

## SUCCESS CRITERIA (ENHANCED FROM 21+ MONTHS)

### Per-Month (Gate 2 Phase 4):
- ✅ Transaction count within ±5 of expected (100% accuracy target)
- ✅ Both rents verified (USA + Thailand)
- ✅ Exchange rate calculated from rent transaction
- ✅ All tags verified (count > 0 AND matches expected within 95%)
- ✅ No negative amounts in database (0 expected)
- ✅ Currency distribution matches expected (45-55% THB)
- ✅ Section totals within ±2% OR threshold ($150 Expense, $50 Florida)
- ✅ Daily variance within $100 (50-93% exact match acceptable)
- ✅ All critical transactions found (both rents, large expenses)

### Batch-Wide (Gate 3):
- ✅ All 4 months individually validated
- ✅ 100% PDF verification (~1,060-1,160 transactions)
- ✅ 8 total rents confirmed (2 per month)
- ✅ Exchange rates documented per month
- ✅ Tag counts verified non-zero for all months
- ✅ Subscription continuity verified (Xfinity, utilities)
- ✅ Tag distributions within expected ranges
- ✅ Currency patterns match Thailand location (45-55% THB)
- ✅ No systematic errors detected
- ✅ 0 missing transactions (or ±5 acceptable)
- ✅ 0 extra transactions
- ✅ 0 duplicates (after duplicate removal)
- ✅ 50-93% daily match rate achieved (not 100%)
- ✅ 95%+ amount accuracy

---

## ESTIMATED TIME

Based on successful Nov-Oct-Sept pilot + 21 months of data:

| Phase | Time per Month | Total (4 months) |
|-------|----------------|------------------|
| **Pre-Work: Fix Tag Application** | - | 1-2 hours |
| **Gate 1: Pre-Flight** | - | 2-3 hours |
| **Gate 2 Phase 1: Parse** | 10-15 min | 40-60 min |
| **Gate 2 Phase 2: Import** | 5-10 min | 20-40 min |
| **Gate 2 Phase 3: Validate** | 15-20 min | 60-80 min (enhanced) |
| **Gate 2 Phase 4: PDF Verify** | 20-30 min | 80-120 min |
| **Gate 3: Comprehensive** | - | 2-3 hours |
| **TOTAL** | **50-75 min/month** | **12-16 hours** |

**Note:** Slightly longer than original estimate due to enhanced validation from 21+ months of learnings.

---

## FINAL CHECKLIST (ENHANCED)

Before starting:
- [ ] Read BATCH-1-CRITICAL-LEARNINGS-REPORT.md (sections 1-3 minimum)
- [ ] Read BATCH-1-EXPLORATION-COMPLETE.md (full document)
- [ ] Skim BATCH-1-LEARNINGS-INDEX.md (quick reference)
- [ ] Read BATCH-IMPORT-PROTOCOL v1.2
- [ ] Read MONTHLY-TRANSACTION-IMPORT-PROTOCOL v3.6
- [ ] Review SCALED-UP-BATCH-PLAN-JAN-AUG-2023.md
- [ ] Review successful pilot: batch-nov-sept-2023/
- [ ] Review historical imports: archive/monthly-imports/ (sample 2-3 months)
- [ ] Understand dual residence context
- [ ] **FIX BLOCKING ISSUE #1: Tag application in import-month.js**
- [ ] **TEST tag application with sample data (100 transactions)**
- [ ] Confirm database connection working
- [ ] Confirm CSV file accessible
- [ ] Confirm PDF files accessible

During execution:
- [ ] Complete Gate 1 for all 4 months
- [ ] Process each month in reverse chronological order
- [ ] Complete all 4 phases per month before next
- [ ] **Verify tags within 30 seconds of each import**
- [ ] Calculate exchange rate per month from rent
- [ ] Use all reusable patterns (parseAmount, isReimbursement, etc.)
- [ ] Accept 50-93% daily match rate (don't expect 100%)
- [ ] Save all logs to /tmp/
- [ ] Generate all required deliverables
- [ ] Pass Gate 3 with 100% verification

After completion:
- [ ] All 4 months imported successfully
- [ ] All validation passed (with acceptable variance)
- [ ] Exchange rates documented per month
- [ ] Tag counts verified non-zero
- [ ] All documentation generated
- [ ] Quality metrics meet 21+ month standards (95%+ accuracy)
- [ ] Ready to proceed to Batch 2 (Apr-Mar-Feb-Jan 2023)

---

## QUESTIONS OR ISSUES

If you encounter:
- **Tag count = 0:** STOP immediately, investigate import script, do not proceed
- **Exchange rate seems wrong:** Verify calculation from rent transaction, accept 28% variance across months
- **Daily match rate < 50%:** Investigate parsing logic or exchange rate
- **Section totals >±2%:** Check for missing tags or duplicate transactions
- **Unexpected transaction counts:** Flag in Gate 1, investigate before proceeding
- **Missing dual rents:** STOP - investigate CSV parsing logic
- **High duplicate count:** Check deduplication key includes merchant, remove Florida House duplicates
- **Negative amounts in DB:** STOP - parsing script failed to convert
- **Gate 3 verification failures:** Investigate discrepancies, check against 21+ month patterns

User is available for consultation on:
- Red flag interpretation
- Large expense confirmation
- Unusual patterns requiring context
- Decision points not covered by protocols
- Blocking issues requiring fixes

---

## BEGIN EXECUTION

**STEP 1: Fix Blocking Issues (1-2 hours)**
1. Audit `scripts/db/import-month.js` tag application logic
2. Create 100-transaction test import
3. Verify tags applied correctly (count > 0)
4. If tags = 0, FIX before proceeding

**STEP 2: Read Critical Learnings (30-45 minutes)**
1. Read BATCH-1-CRITICAL-LEARNINGS-REPORT.md (sections 1-3)
2. Read BATCH-1-EXPLORATION-COMPLETE.md (full)
3. Skim BATCH-1-LEARNINGS-INDEX.md

**STEP 3: Execute Gate 1 (2-3 hours)**
Start with Gate 1: Pre-Flight Analysis for all 4 months (August, July, June, May 2023).

Use the TodoWrite tool to track progress through all gates and phases.

Execute with the same rigor and attention to detail that achieved 95%+ accuracy across 21+ months of imports, enhanced with proven patterns and validation frameworks.

**Expected outcome:** ~1,060-1,160 transactions imported with 95%+ accuracy, 50-93% daily match rate, 0 negative amounts, verified tags, and 1:1 verification against CSV and PDF sources.

---

**Ready to begin? Start with Blocking Issue Fixes, then Gate 1 Pre-Flight Analysis.**
