# Corrected Import Prompt for May, June, July 2025

**Date:** October 23, 2025
**Issue Identified:** May, June, and July 2025 were imported using **converted USD values** instead of **original THB values**
**Action Required:** Delete and re-import these three months with corrected data

---

## Problem Summary

During retroactive PDF verification, we discovered that:

| Month | Current DB Value | Should Be | Issue |
|-------|------------------|-----------|-------|
| **May 2025** | amount: 1057 USD | amount: 35000 THB | Used converted subtotal |
| **June 2025** | amount: 1074.5 USD | amount: 35000 THB | Used converted subtotal |
| **July 2025** | amount: 1078 THB | amount: 35000 THB | Correct currency, wrong value |
| August 2025 | amount: 35000 THB | ✅ Correct | |
| September 2025 | amount: 35000 THB | ✅ Correct | |

**Root Cause:** The parsing script for May/June/July incorrectly used the **"Subtotal"** or **"Conversion (THB to USD)"** column instead of the **"Actual Spent"** column for THB transactions.

---

## Corrected Data Model Understanding

Based on our investigation, the CORRECT data model is:

### Schema Design
```javascript
{
  amount: 35000,           // ← Store value in ORIGINAL currency
  original_currency: "THB", // ← Indicate what currency it is
  transaction_type: "expense",
  // original_amount field should remain null/undefined
}
```

### Example from PDF
```
This Month's Rent | Landlord | Bangkok Bank Account | THB 35000.00 | $1067.50 | $1067.50
                                                      ↑ Use THIS   ↑ NOT this
                                                    (Actual Spent)  (Conversion)
```

### Why This Matters
- **UI Display:** Converts on the fly (shows ฿35,000.00 THB)
- **Charts/Aggregations:** Apply conversion rates at query time
- **Multi-Currency Support:** Preserves original transaction values

---

## Prompt for Claude

Copy and paste this to Claude to fix the imports:

```
I need you to delete and re-import May, June, and July 2025 transactions.

CRITICAL ISSUE DISCOVERED:
These three months were imported using CONVERTED USD values instead of ORIGINAL THB values for Thai Baht transactions. This violates our data model which stores amounts in their original currency.

EXAMPLE OF THE PROBLEM:
- PDF shows: "This Month's Rent | THB 35000.00 | $1067.50 | $1067.50"
- May JSON has: amount: 1057, currency: "USD" ❌ WRONG
- June JSON has: amount: 1074.5, currency: "USD" ❌ WRONG
- July JSON has: amount: 1078, currency: "THB" ❌ WRONG VALUE
- Should be: amount: 35000, currency: "THB" ✅ CORRECT

CORRECT DATA MODEL:
- amount = value in ORIGINAL currency (not converted)
- original_currency = currency code (THB, USD, etc.)
- UI handles conversion for display
- Database stores raw original values

TASKS:
1. Delete all May 2025 transactions for user dennis@dsil.design
2. Delete all June 2025 transactions for user dennis@dsil.design
3. Delete all July 2025 transactions for user dennis@dsil.design

4. Review the parsing scripts that created:
   - scripts/may-2025-CORRECTED.json
   - scripts/june-2025-CORRECTED.json
   - scripts/july-2025-CORRECTED.json

5. Fix the parsing logic to ensure:
   - For THB transactions: Use "Actual Spent" column value (e.g., THB 35000.00)
   - Store as: { amount: 35000, currency: "THB" }
   - DO NOT use the "Conversion (THB to USD)" column
   - DO NOT use the "Subtotal" column
   - The value should be the RAW THB amount from the PDF

6. Re-parse and regenerate corrected JSON files:
   - scripts/may-2025-CORRECTED.json (FIXED)
   - scripts/june-2025-CORRECTED.json (FIXED)
   - scripts/july-2025-CORRECTED.json (FIXED)

7. Import each month using the corrected JSON files

8. Verify each month after import:
   - Check "This Month's Rent" transaction has amount: 35000, currency: "THB"
   - Run totals verification (they should now match the PDF better)
   - Spot check 5 random THB transactions to ensure they have original amounts

VALIDATION CHECKS TO ADD TO PROTOCOL:

After parsing, before import, add this check:
```javascript
// For any month with THB transactions, verify amounts are NOT converted
const thbTransactions = parsed.filter(t => t.currency === 'THB');
const rentTransaction = thbTransactions.find(t => t.description.includes("Rent"));

if (rentTransaction) {
  console.log('\n🔍 THB VALIDATION CHECK:');
  console.log(`Rent amount: ${rentTransaction.amount}`);
  console.log(`Expected: ~35000 (THB value)`);

  if (rentTransaction.amount < 10000) {
    console.error('❌ ERROR: Rent amount looks like USD conversion!');
    console.error('   Check parsing logic - should use "Actual Spent" column');
    process.exit(1);
  } else {
    console.log('✅ Amount looks correct (THB original value)');
  }
}
```

EXPECTED OUTCOME:
After re-import, querying "This Month's Rent" for these months should return:
- May: amount: 35000, currency: "THB"
- June: amount: 35000, currency: "THB"
- July: amount: 35000, currency: "THB"

And the UI should display them as "฿35,000.00 THB" (not as $1000-1100).

Let me know when you're ready to proceed with the deletion and I'll confirm.
```

---

## PDF Reference for Verification

### May 2025 Rent (from page6.pdf)
```
This Month's Rent | Landlord | Bangkok Bank Account | THB 35000.00 | $1057.00 | $1057.00
```
**Correct Import:** `{ amount: 35000, currency: "THB" }`

### June 2025 Rent (from page5.pdf)
```
This Month's Rent | Landlord | Bangkok Bank Account | THB 35000.00 | $1074.50 | $1074.50
```
**Correct Import:** `{ amount: 35000, currency: "THB" }`

### July 2025 Rent (from page4.pdf)
```
This Month's Rent | Landlord | Bangkok Bank Account | THB 35000.00 | $1078.00 | $1078.00
```
**Correct Import:** `{ amount: 35000, currency: "THB" }`

---

## Updated Import Protocol - Add This Section

### Section: Currency Handling Validation

**CRITICAL: After parsing, before importing any month, run this validation:**

```javascript
function validateCurrencyHandling(transactions) {
  console.log('\n💱 CURRENCY VALIDATION CHECK');
  console.log('='.repeat(70));

  // Group by currency
  const byCurrency = transactions.reduce((acc, t) => {
    if (!acc[t.currency]) acc[t.currency] = [];
    acc[t.currency].push(t);
    return acc;
  }, {});

  // Check THB transactions
  if (byCurrency.THB) {
    console.log(`\n📊 THB Transactions: ${byCurrency.THB.length}`);

    // Find largest THB transaction (usually rent)
    const largest = byCurrency.THB.reduce((max, t) =>
      t.amount > max.amount ? t : max
    );

    console.log(`   Largest: ${largest.description} = ${largest.amount}`);

    // Validation: THB rent should be ~35,000, not ~1,000
    if (largest.description.toLowerCase().includes('rent')) {
      if (largest.amount < 10000) {
        console.error('\n❌ CRITICAL ERROR: THB CONVERSION ISSUE DETECTED!');
        console.error(`   Rent shows ${largest.amount} THB (suspiciously low)`);
        console.error(`   Expected: ~35,000 THB`);
        console.error(`   Likely cause: Used "Conversion" column instead of "Actual Spent"`);
        console.error('\n   FIX: Review parsing logic and use correct column');
        throw new Error('THB conversion validation failed');
      } else if (largest.amount > 30000 && largest.amount < 40000) {
        console.log('   ✅ Rent amount looks correct (~35,000 THB)');
      }
    }

    // Spot check 3 random THB transactions
    const samples = byCurrency.THB
      .filter(t => !t.description.toLowerCase().includes('rent'))
      .slice(0, 3);

    console.log('\n   Sample THB transactions:');
    samples.forEach(t => {
      console.log(`   - ${t.description}: ${t.amount} THB`);
    });
  }

  // Check USD transactions
  if (byCurrency.USD) {
    console.log(`\n📊 USD Transactions: ${byCurrency.USD.length}`);

    // Spot check
    const samples = byCurrency.USD.slice(0, 3);
    console.log('   Sample USD transactions:');
    samples.forEach(t => {
      console.log(`   - ${t.description}: $${t.amount}`);
    });
  }

  console.log('\n✅ Currency validation passed\n');
}

// Run before import
validateCurrencyHandling(parsedTransactions);
```

**Add to import protocol checklist:**
- [ ] Currency validation check passed
- [ ] THB amounts are in original currency (not converted)
- [ ] USD amounts are in original currency
- [ ] Largest THB transaction (rent) is ~35,000, not ~1,000

---

## Files to Update

### 1. Parsing Script
**File:** `scripts/parse-[month]-2025.js` (or wherever parsing happens)

**Change needed:**
```javascript
// ❌ WRONG - Don't do this:
amount: parseFloat(row['Subtotal']) // This is USD!
amount: parseFloat(row['Conversion (THB to USD)']) // This is USD!

// ✅ CORRECT - Do this:
amount: parseFloat(row['Actual Spent'].replace(/[^0-9.-]/g, ''))
currency: row['Payment Type'].includes('THB') ? 'THB' : 'USD'
```

### 2. Import Script
**File:** `scripts/db/import-month.js`

**Ensure it stores values as-is:**
```javascript
{
  amount: transaction.amount, // Don't convert, store as-is
  original_currency: transaction.currency,
  // Don't populate original_amount unless needed
}
```

### 3. Validation Script
**File:** `scripts/validate-month.js`

**Add currency conversion for totals:**
```javascript
// When calculating totals for comparison to PDF:
const totalUSD = transactions.reduce((sum, t) => {
  if (t.original_currency === 'THB') {
    return sum + (t.amount / exchangeRate);
  }
  return sum + t.amount;
}, 0);
```

---

## Success Criteria

After re-importing May, June, and July:

### Database Checks
```sql
-- Should return 35000 for all three months
SELECT
  transaction_date,
  description,
  amount,
  original_currency
FROM transactions
WHERE description = 'This Month''s Rent'
AND transaction_date >= '2025-05-01'
AND transaction_date < '2025-08-01'
ORDER BY transaction_date;
```

**Expected Output:**
```
2025-05-05 | This Month's Rent | 35000 | THB
2025-06-01 | This Month's Rent | 35000 | THB
2025-07-03 | This Month's Rent | 35000 | THB
```

### Totals Verification
Run the verification script - variances should now be within ±3%:
- May 2025: ✅ PASS
- June 2025: ✅ PASS
- July 2025: ✅ PASS

---

## Lessons Learned - Document in Protocol

**Add to "Common Pitfalls" section:**

### ⚠️ Pitfall: Using Converted Values Instead of Original Amounts

**Problem:** Parsing script uses "Subtotal" or "Conversion (THB to USD)" column for THB transactions, resulting in USD values being stored with THB currency code.

**Example:**
```
PDF: THB 35,000 | $1,074.50 | $1,074.50
Wrong: { amount: 1074.5, currency: "USD" }
Right: { amount: 35000, currency: "THB" }
```

**Detection:**
- Rent showing ~$1,000-1,100 instead of ~35,000 THB
- THB totals seem too low when queried
- UI might show correct display but charts/aggregations are wrong

**Prevention:**
1. Always use "Actual Spent" column for amount
2. Run currency validation check before import
3. Spot check largest THB transaction (usually rent)
4. Verify rent = 35,000 THB, not ~1,000

**Fix:** Delete and re-import with corrected parsing logic

---

## Next Steps

1. ✅ Review this prompt
2. ⏭️ Copy prompt to new Claude conversation
3. ⏭️ Confirm deletion of May/June/July
4. ⏭️ Re-parse with corrected logic
5. ⏭️ Re-import with validation
6. ⏭️ Verify against PDFs
7. ⏭️ Update IMPORT_PLAN.md with currency validation section

---

**Status:** Ready for execution
**Priority:** HIGH - Data integrity issue affecting 3 months
