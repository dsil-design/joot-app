# VERIFICATION PROTOCOL v2.0: 1:1 Transaction Matching

**Effective Date:** October 29, 2025
**Replaces:** All previous total-based reconciliation approaches
**Priority:** Transaction-level accuracy over aggregate totals

---

## CORE PRINCIPLE

**The PDF/CSV totals are unreliable due to broken conversion formulas in older months.**

Instead, we verify that **every single transaction from the PDF is present in the database** with matching:
1. ✅ **Description** (exact or semantically equivalent)
2. ✅ **Vendor/Merchant** (mapped correctly)
3. ✅ **Amount** (original amount in original currency)
4. ✅ **Currency** (THB, USD, etc.)
5. ✅ **Payment Method** (mapped to our payment accounts)
6. ✅ **Date** (transaction_date matches PDF date)

---

## VERIFICATION STEPS

### Step 1: Extract All Transactions from PDF
For each month, extract from the PDF:
- Transaction date
- Description
- Merchant/Vendor
- Payment type/account
- Amount (with currency)

### Step 2: Query Database for Same Month
```sql
SELECT
  transaction_date,
  description,
  vendors.name as vendor_name,
  payment_accounts.name as payment_account,
  amount,
  original_currency,
  transaction_type
FROM transactions
LEFT JOIN vendors ON transactions.vendor_id = vendors.id
LEFT JOIN payment_accounts ON transactions.payment_account_id = payment_accounts.id
WHERE user_id = ?
AND transaction_date BETWEEN 'YYYY-MM-01' AND 'YYYY-MM-DD'
ORDER BY transaction_date, amount;
```

### Step 3: Match Each PDF Transaction to Database Record
For each PDF transaction, find a matching database record by:
1. **Date match** (must be exact)
2. **Amount match** (must be exact, in original currency)
3. **Description similarity** (exact or close match)
4. **Vendor match** (if vendor specified)

### Step 4: Report Unmatched Transactions
- **PDF transactions not in DB** → Missing imports (CRITICAL)
- **DB transactions not in PDF** → Over-imported or data entry (investigate)

---

## ACCEPTANCE CRITERIA

For a month to be considered **VERIFIED**:
- ✅ 100% of PDF expense transactions found in database
- ✅ 100% of PDF income transactions found in database
- ✅ 100% of PDF savings transactions found in database
- ✅ All amounts match in original currency
- ✅ All vendors mapped (or NULL if not specified in PDF)
- ✅ All payment accounts mapped

**Minor variances acceptable:**
- Description wording differences (semantically equivalent)
- Vendor name variations (same entity, different name format)
- Transactions split/combined (documented with explanation)

**NOT acceptable:**
- Missing transactions
- Wrong amounts
- Wrong currencies
- Wrong dates

---

## IGNORE TOTALS SECTION

**Do NOT attempt to reconcile:**
- ❌ PDF "GRAND TOTAL" (unreliable due to broken conversion formulas)
- ❌ Daily totals (same issue)
- ❌ Subtotal columns in CSV (conversion formulas broken)

**These are informational only and should not block verification.**

---

## IMPLEMENTATION FOR BATCH 2

### Current Status
- **January 2023**: 155 transactions imported
- **February 2023**: 180 transactions imported
- **March 2023**: 179 transactions imported
- **April 2023**: 204 transactions imported (but missing April 30 - parser bug)

### Required Verification
Create scripts to:
1. Extract all transactions from PDF pages 31-34
2. Query all transactions from database for each month
3. Match transaction-by-transaction
4. Report any mismatches

### April 2023 Known Issue
- Parser used lines 8198-8459 (should be 8198-8469)
- Missing 7 transactions from April 30
- **Action**: Fix parser, delete existing April data, re-import

---

## EXAMPLE VERIFICATION OUTPUT

```
JANUARY 2023: 1:1 TRANSACTION VERIFICATION
==========================================================

PDF Transactions: 155
Database Transactions: 155
Match Rate: 100%

✅ ALL PDF TRANSACTIONS FOUND IN DATABASE

Sample matches:
  2023-01-01: This Month's Rent (Jordan) - $887.00 USD ✅
  2023-01-01: This Month's Rent (Panya) - 19000.00 THB ✅
  2023-01-31: Emergency Savings - $341.67 USD ✅

Unmatched (PDF → DB): 0
Unmatched (DB → PDF): 0

STATUS: ✅ VERIFIED
```

---

## PROTOCOL UPDATES FOR FUTURE BATCHES

### Phase 1: Parse (UNCHANGED)
Extract transactions from CSV

### Phase 2: Import (UNCHANGED)
Import to database

### Phase 3: Validate (UNCHANGED)
- Transaction counts
- Dual residence verification
- Tag structure verification

### Phase 4: 1:1 PDF Verification (UPDATED)
**New requirement:** Transaction-by-transaction matching against PDF
- Extract every transaction from PDF
- Match to database records
- Report 100% match rate or identify discrepancies

**Remove:** Aggregate total reconciliation (unreliable)

---

## TOOLS NEEDED

### PDF Transaction Extractor
Script to parse PDF text and extract structured transaction data:
```javascript
{
  date: '2023-01-01',
  description: 'This Month\'s Rent',
  merchant: 'Jordan',
  payment: 'PNC Bank Account',
  amount: 887.00,
  currency: 'USD',
  type: 'expense'
}
```

### 1:1 Matcher
Script to match each PDF transaction to database record and report:
- Matched transactions (with IDs)
- Unmatched PDF transactions (missing from DB)
- Unmatched DB transactions (not in PDF)
- Match rate percentage

---

## CONCLUSION

**Totals don't matter. Transactions do.**

Every transaction from the PDF must be in the database with correct:
- Date, description, vendor, amount, currency, payment method

This is the new gold standard for batch verification.

---

**Protocol Version:** 2.0
**Effective:** All future batch imports
**Backward Application:** Apply to Batch 2 (Apr-Jan 2023) immediately
