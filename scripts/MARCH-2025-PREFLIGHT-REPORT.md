# March 2025 Pre-Flight Report

**Generated:** October 24, 2025
**Status:** ✅ PDF VERIFIED - Contains March 2025 data
**CSV Source:** csv_imports/fullImport_20251017.csv
**PDF Source:** csv_imports/Master Reference PDFs/Budget for Import-page8.pdf

---

## Executive Summary

March 2025 data has been located and analyzed. **CRITICAL FINDING:** March has significantly higher transaction volume (243 transactions vs average of 179) due to a week-long Hua Hin trip with extensive travel/accommodation expenses and business tax payments.

### Status: ⚠️ READY WITH CAUTIONS

**Action Required:**
1. ✅ Xfinity duplicate resolved (keep Expense Tracker version)
2. ⚠️ Pest Control duplicate needs decision
3. ✅ Flight transaction confirmed (has value, not $0.00)
4. ⚠️ Parsing script needs to be created
5. ⚠️ Large tax payment ($3,490.02) has comma in CSV - verify parsing

---

## 1. Section Line Ranges

| Section | Start Line | End Line | Raw Count |
|---------|-----------|----------|-----------|
| **Expense Tracker** | 2102 | 2407 | ~243 transactions |
| **Gross Income Tracker** | 2409 | 2421 | 7 income entries |
| **Personal Savings & Investments** | 2423 | 2427 | 0 transactions ($0.00) |
| **Florida House Expenses** | 2438 | 2452 | 5 transactions (after duplicate removal) |

**Note:** March 2025 appears BEFORE April 2025 (lines 1802-2098) in the CSV, as expected.

---

## 2. Transaction Counts Per Section

### Expense Tracker
- **Total Transactions:** 243 (before deduplication)
- **Currency Distribution:**
  - USD Transactions: 133
  - THB Transactions: 108
  - Mixed/Other: 2

### Gross Income Tracker
- **Total Income Entries:** 7
  - Freelance Income - February: $175.00
  - Personal Income: Invoice 1005: $6,900.00
  - Paycheck (Rover): $4,093.98
  - Paycheck (Rover): $4,093.96
  - Reimbursement: 2024 Tax Accounting: $700.00
  - Reimbursement: 2024 Federal Tax Return: $3,490.02
  - Reimbursement: Cruise Flights and Excursions: $3,800.00

### Personal Savings & Investments
- **Total Entries:** 1 (Emergency Savings: $0.00)
- **Actual Savings:** $0.00 (no savings this month)

### Florida House Expenses
- **Total Entries:** 5 (after removing 1 Xfinity duplicate)
  1. Electricity Bill (FPL): $36.49
  2. Water Bill (Englewood Water): $54.60
  3. Gas Bill (TECO): $38.67
  4. ~~Internet Bill (Xfinity): $73.00~~ **DUPLICATE - SKIP**
  5. Pest Control (All U Need Pest): $110.00 **⚠️ PENDING DECISION**

---

## 3. Grand Totals from PDF (Source of Truth)

| Section | Amount |
|---------|--------|
| **Expense Tracker NET** | **$12,204.52** |
| Gross Income Total | $23,252.96 |
| Savings/Investment Total | $0.00 |
| Florida House Total | $312.76 |

### Expected Total Calculation
```
Expected Total Expenses = Expense Tracker NET + Florida House + Savings
                        = $12,204.52 + $312.76 + $0.00
                        = $12,517.28
```

**Note:** Expense Tracker NET of $12,204.52 is already the net amount (expenses minus reimbursements received).

---

## 4. Duplicate Detection Results

### ✅ CONFIRMED DUPLICATE #1: Xfinity Internet

| Field | Expense Tracker | Florida House | Action |
|-------|----------------|---------------|--------|
| **Line** | 2266 | 2448 | Keep Expense Tracker |
| **Description** | FL Internet Bill | Internet Bill | - |
| **Merchant** | Xfinity | Xfinity | - |
| **Amount** | $73.00 | $73.00 | - |
| **Date** | Tuesday, March 18, 2025 | Wednesday, March 19, 2025 | - |
| **Payment** | Credit Card: Chase Sapphire Reserve | Credit Card: Chase Sapphire Reserve | - |

**User Decision:** Keep ONLY Expense Tracker version (Line 2266), SKIP Florida House version (Line 2448).

### ⚠️ POTENTIAL DUPLICATE #2: Pest Control

| Field | Expense Tracker | Florida House | Action |
|-------|----------------|---------------|--------|
| **Line** | 2364 | 2450 | **NEEDS DECISION** |
| **Description** | Pest Control | Pest Control | - |
| **Merchant** | All U Need Pest Control | All U Need Pest  | - |
| **Amount** | $110.00 | $110.00 | - |
| **Date** | Thursday, March 27, 2025 | (No specific date in FL section) | - |
| **Payment** | Credit Card: Chase Sapphire Reserve | Credit Card: Chase Sapphire Reserve | - |

**Analysis:**
In April 2025, we learned that sometimes what appears as a duplicate actually needs to stay in Florida House section for totals to match. The PDF shows Florida House total of $312.76, which includes this Pest Control charge.

**Recommendation:**
- **Option A:** Keep ONLY Expense Tracker (consistent with Xfinity rule) → Florida total becomes $202.76 (should verify against PDF)
- **Option B:** Keep BOTH if Expense Tracker Pest Control is tagged as reimbursable and this is the actual Florida House expense

**PENDING USER DECISION**

---

## 5. Tag Distribution Preview

### Reimbursements (Income Type)
- **Count:** 28 reimbursements
- **Pattern:** Description starts with "Reimbursement:"
- **Examples:**
  - Reimbursement: Groceries (multiple)
  - Reimbursement: Dinner (multiple)
  - Reimbursement: Rent: -THB 8000.00
  - Reimbursement: Hua Hin Trip: -THB 10786.00 (~$314.95)

### Business Expenses (Tagged)
- **Count:** 2 business expenses
- **Pattern:** Column 4 has "X"
- **Entries:**
  1. 2024 Tax Accounting | Whittaker & Saucier: $700.00 (Line 2344)
  2. 2024 Federal Tax Return | Pay1040 - IRS: $3,490.02 (Line 2345)

**Note:** Both are marked as reimbursable (Column 3 = X) AND business expense (Column 4 = X).

### Reimbursables (Tracking Only, NO TAG)
- **Count:** 7 reimbursable expenses
- **Pattern:** Column 3 has "X" (but no tag applied)
- **Examples:**
  - Flights: CNX-HHQ | AirAsia: $377.96
  - Hotel: Hua Hin | Agoda: $594.57
  - FL Internet Bill | Xfinity: $73.00
  - Excursions | NCL: $688.98
  - Cruise Trp Excursions w/ Nidnoi: $688.98

### Florida House Expenses (Tagged)
- **Count:** 5 transactions (after duplicate removal)
- **Tag:** "Florida House"

### Savings/Investment (Tagged)
- **Count:** 0 transactions (no savings this month)

---

## 6. Currency Distribution

### USD Transactions: 133 (54.8%)
- Primary payment methods:
  - Credit Card: Chase Sapphire Reserve (majority)
  - PNC: Personal (transfers)
  - Grab (delivery/transport)

### THB Transactions: 108 (44.4%)
- Primary payment methods:
  - Bangkok Bank Account (majority)
  - Cash (small amounts)

### Mixed/Other: 2 (0.8%)
- Service charges, special cases

### Critical Currency Verification

✅ **Rent Transaction (Line 2105):**
- **Description:** This Month's Rent
- **Merchant:** Landlord
- **Amount:** THB 35,000.00
- **Conversion shown:** $1,022.00
- **Status:** ✅ CORRECT - Should import as THB 35,000.00

**Parsing Rule:** Use Column 6 for THB amounts, NOT Column 8 (conversion).

---

## 7. Parsing Script Verification

### Current Status: ❌ DOES NOT EXIST

**File:** `scripts/parse-march-2025.js`
**Status:** Not found

### Required Actions:
1. **Create parsing script** following pattern from:
   - `scripts/parse-april-2025.js` (most recent, good model)
   - `scripts/parse-may-2025.js` (alternative reference)

2. **Critical Requirements:**
   - ✅ Use Column 6 for THB amounts (e.g., "THB 35000.00")
   - ✅ Use Column 7/9 for USD amounts (NOT Column 8)
   - ❌ Do NOT use Column 8 (conversion column)
   - ✅ Handle negative amounts (refunds in parentheses)
   - ✅ Handle comma-formatted large amounts (e.g., "$3,490.02")
   - ✅ Skip Xfinity duplicate in Florida House section
   - ⚠️ Handle Pest Control duplicate per user decision

3. **Special Cases to Handle:**
   - Negative amounts in parentheses: `$(28.22)` → -28.22
   - Comma-formatted amounts: `"$ 3,490.02"` → 3490.02
   - Reimbursements as negative THB: `-THB 8000.00` → income of 8000.00 THB

---

## 8. Comparison to Previous Months

| Month | Total Trans. | Reimbursements | THB Trans. | Notes |
|-------|-------------|----------------|-----------|-------|
| **March 2025** | **243** | **28** | **108** | **Hua Hin trip week** |
| April 2025 | 182 | 22 | 93 | - |
| May 2025 | 174 | 16 | 89 | - |
| June 2025 | 190 | 27 | 85 | - |
| July 2025 | 176 | 26 | ~90 | - |
| August 2025 | 194 | 32 | 82 | - |
| September 2025 | 159 | 23 | ~70 | - |
| **Average** | **179** | **24** | **85** | - |

### Variance Analysis
- **Transactions:** +35.8% above average (+64 transactions)
- **Reimbursements:** +16.7% above average (+4 reimbursements)
- **THB Transactions:** +27.1% above average (+23 THB transactions)

### Explanation for High Transaction Count
March 2025 includes:
1. **Hua Hin Trip (March 16-28):** Extended vacation with:
   - Hotel bookings
   - Flights (CNX-HHQ): $377.96
   - Multiple restaurant meals
   - Daily coffees and transportation
   - Large reimbursement: -THB 10,786.00 (~$314.95)

2. **Large Business Expenses:**
   - 2024 Tax Accounting: $700.00
   - 2024 Federal Tax Return: $3,490.02
   - Both reimbursed via DSIL Design income

3. **Cruise Planning:**
   - NCL Excursions: $688.98
   - OnDeck Travel Excursions: $688.98
   - Total: $1,377.96 for cruise prep

**Conclusion:** Higher transaction count is explainable and legitimate.

---

## 9. Anomalies and Red Flags

### 🔴 CRITICAL: Negative Amounts Detected (4)

| Line | Description | Merchant | Amount | Type | Status |
|------|-------------|----------|--------|------|--------|
| 2159 | Refund Cashback | Agoda | -$28.22 | Refund | ✅ Normal |
| 2206 | Refund Thunderbolt Cable | Lazada | -$23.23 | Refund | ✅ Normal |
| 2310 | Partial Refund: Pizza | Grab | -$7.98 | Partial Refund | ✅ Normal |
| 2378 | Partial Refund | Grab | -$7.49 | Partial Refund | ✅ Normal |

**Analysis:** All negative amounts are legitimate refunds/credits. No anomalies detected.

### ⚠️ WARNING: Large Amounts (>$500 USD) - 5 Transactions

| Line | Description | Merchant | Amount | USD Equiv | Status |
|------|-------------|----------|--------|-----------|--------|
| 2105 | This Month's Rent | Landlord | THB 35,000 | ~$1,022 | ✅ Normal |
| 2261 | Hotel: Hua Hin | Agoda | $594.57 | $594.57 | ✅ Normal (vacation) |
| 2344 | 2024 Tax Accounting | Whittaker & Saucier | $700.00 | $700.00 | ✅ Normal (reimbursed) |
| 2346 | Excursions | NCL | $688.98 | $688.98 | ✅ Normal (cruise) |
| 2347 | Cruise Excursions w/ Nidnoi | OnDeck Travel | $688.98 | $688.98 | ✅ Normal (cruise) |

**Analysis:** All large amounts are expected:
- Rent is standard monthly THB 35,000
- Hotel for week-long Hua Hin trip
- Tax accounting fee (business expense, reimbursed)
- Cruise excursion bookings (planned expense)

**Note:** The $3,490.02 Federal Tax Return (Line 2345) is not in this list because it's formatted with a comma in the CSV, which may have affected detection. This is a **business expense that was reimbursed** as income.

### ⚠️ DATA QUALITY ISSUES

#### Issue #1: Federal Tax Return Amount Formatting
- **Line:** 2345
- **Amount in CSV:** `"$ 3,490.02"` (with quotes and comma)
- **Expected:** $3,490.02
- **Impact:** Parsing script must handle comma-separated values correctly
- **Severity:** CRITICAL - $3,490 is a large amount that must parse correctly

#### Issue #2: Pest Control Merchant Name Truncated
- **Expense Tracker:** "All U Need Pest Control" (Line 2364)
- **Florida House:** "All U Need Pest " (Line 2450) - note trailing space and truncation
- **Impact:** Duplicate detection may be affected by name mismatch
- **Severity:** WARNING - Already detected, but verify vendor matching

### ℹ️ INFO: Structural Differences from Recent Months

1. **Zero Savings:** March has $0.00 in savings (vs typical $341.67/month)
2. **Higher Reimbursement Percentage:** 11.5% of transactions are reimbursements (vs ~10% typical)
3. **More Large Single-Day Totals:**
   - March 26: $5,605.89 (tax payments + excursions)
   - March 16: $646.66 (flight day)
4. **Extended Travel Period:** Hua Hin trip spans 12 days with daily transactions

---

## 10. Parsing Strategy Recommendations

### Recommended Parsing Approach

1. **Create `parse-march-2025.js`** based on April/May templates

2. **Column Mapping (Expense Tracker):**
   ```javascript
   - Col 0: Empty (date rows will have date here)
   - Col 1: Desc → description
   - Col 2: Merchant → vendor
   - Col 3: Reimbursable → Flag (X = yes, NO TAG)
   - Col 4: Business Expense → Flag (X = yes, TAG: "Business Expense")
   - Col 5: Payment Type → payment_method
   - Col 6: THB → amount if THB currency ✅ USE THIS
   - Col 7: USD → amount if USD currency ✅ USE THIS
   - Col 8: Conversion → ❌ IGNORE (do not use)
   - Col 9: Subtotal → USD equivalent (for validation only)
   ```

3. **Amount Parsing Logic:**
   ```javascript
   // For THB (Column 6)
   if (row[6] && row[6].includes('THB')) {
     const match = row[6].match(/THB\s*([-\d,]+\.?\d*)/);
     amount = parseFloat(match[1].replace(/,/g, ''));
     currency = 'THB';
   }

   // For USD (Column 7)
   else if (row[7] && row[7].trim()) {
     // Handle parentheses for negative amounts
     const isNegative = row[7].includes('(');
     // Remove $, commas, quotes, parentheses
     const cleaned = row[7].replace(/[$,"()]/g, '').trim();
     amount = parseFloat(cleaned);
     if (isNegative) amount = -amount;
     currency = 'USD';
   }
   ```

### Pre-Import Checklist

- [ ] Create `parse-march-2025.js` script
- [ ] Verify THB parsing uses Column 6 (not Column 8)
- [ ] Verify USD parsing uses Column 7 (not Column 8)
- [ ] Test comma-formatted amount parsing ($3,490.02)
- [ ] Test negative amount parsing (refunds in parentheses)
- [ ] Implement Xfinity duplicate skip in Florida House section
- [ ] Get user decision on Pest Control duplicate
- [ ] Run preflight validation against PDF totals
- [ ] Verify rent = THB 35,000.00 (not USD conversion)
- [ ] Verify 28 reimbursements tagged correctly
- [ ] Verify 2 business expenses tagged correctly
- [ ] Generate import summary report

---

## Summary of Key Findings

### ✅ READY TO PROCEED (with cautions)

**Strengths:**
- PDF verified containing March 2025 data
- All section boundaries clearly identified
- Currency distribution normal (54% USD, 44% THB)
- Rent transaction correctly shows THB 35,000
- All negative amounts are legitimate refunds
- High transaction count is explainable (Hua Hin trip + tax payments)

**Cautions:**
- ⚠️ Parsing script needs to be created
- ⚠️ Pest Control duplicate needs user decision
- ⚠️ Large tax payment has comma formatting - verify parser handles it
- ⚠️ Higher than average transaction count (but explainable)

**Required Actions Before Import:**
1. Create `parse-march-2025.js` following April/May pattern
2. Get user decision on Pest Control duplicate (keep Expense Tracker version OR keep both)
3. Verify comma-formatted amount parsing works ($3,490.02)
4. Run comprehensive validation after parsing

**Expected Outcome:**
- **Total Transactions:** ~255 (after deduplication and processing all sections)
- **Expected Total Expenses:** $12,517.28 (or $12,407.28 if Pest Control deduplicated)
- **Expected Gross Income:** $23,252.96
- **Expected Net:** +$10,735.68

---

## Next Steps

1. **User Decisions Needed:**
   - Pest Control: Keep Expense Tracker only (consistent) OR keep both (if needed for totals)?

2. **Create Parsing Script:**
   - Base on `parse-april-2025.js` template
   - Add special handling for comma-formatted amounts
   - Implement Xfinity duplicate skip
   - Implement Pest Control duplicate handling (per user decision)

3. **Run Validation:**
   - Parse CSV using new script
   - Generate `march-2025-CORRECTED.json`
   - Validate totals against PDF
   - Generate comparison report

4. **Proceed to Import:**
   - Only after validation passes
   - Use `db/import-month.js` script
   - Generate post-import validation report

---

**Report Status:** ✅ COMPLETE
**Recommendation:** PROCEED with caution - Create parsing script and get Pest Control decision before importing.
