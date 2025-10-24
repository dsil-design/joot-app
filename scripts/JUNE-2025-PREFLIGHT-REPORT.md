# JUNE 2025 PRE-FLIGHT REPORT

**Generated:** 2025-10-24T03:17:41.796Z
**Source:** csv_imports/fullImport_20251017.csv
**Reference PDF:** csv_imports/Master Reference PDFs/Budget for Import-page5.pdf

---

## 1. Section Line Numbers & Transaction Counts

| Section | Line Range | Raw Count | Valid Count | Notes |
|---------|------------|-----------|-------------|-------|
| **Expense Tracker** | 1232-1478 | 184 | 183 | Includes dates, headers, totals |
| **Gross Income Tracker** | 1479-1486 | 2 | 1 | Single income transaction |
| **Personal Savings & Investments** | 1487-1491 | 2 | 1 | Emergency savings |
| **Florida House Expenses** | 1502-1519 | 8 | 6 | Includes 1 missing amount |
| **TOTAL** | - | **196** | **191** | Before deduplication |

---

## 2. Expected Totals from PDF (Source of Truth)

### From PDF Budget for Import-page5.pdf:

| Section | Grand Total |
|---------|-------------|
| **Expense Tracker NET** | **$6,347.08** |
| **Gross Income** | $175.00 |
| **Savings/Investment** | $341.67 |
| **Florida House** | $344.28 |

### Expected Total Calculation:

```
Expected Total = Expense Tracker NET + Florida House + Savings
               = $6,347.08 + $344.28 + $341.67
               = $7,033.03
```

**Note:** Gross Income is already factored into Expense Tracker NET (as reimbursements reduce expenses).

---

## 3. Duplicate Detection Results



**Found 1 potential duplicate(s):**


### Duplicate 1: RING - $10.69

- **Expense Tracker (Line 1320):**
  - Description: Monthly Subscription: Ring
  - Date: 2025-06-13
  - **Action:** ✅ KEEP

- **Florida House (Line 1510):**
  - Description: Doorcam
  - Date: 2025-06-12
  - **Action:** ❌ REMOVE

- **Date Match:** Yes (within 3 days)


### Missing Amount Issue:

One transaction in Florida House section has **no amount**:
- **Line ~1513:** FL Internet - Xfinity - **(no amount)**
- **Likely Duplicate:** Expense Tracker has "FL Internet Bill - Xfinity - $73.00" at line 1380
- **Action:** Florida House version should be skipped (already missing amount)

---

## 4. Tag Distribution Preview

| Tag Type | Count | Source |
|----------|-------|--------|
| **Reimbursements** | 25 | Description starts with "Reimbursement:" (income type) |
| **Business Expenses** | 0 | Column 4 has "X" (expense with tag) |
| **Reimbursables** | 0 | Column 3 has "X" (tracking only, NO tag) |
| **Florida House** | 6 | From Florida House section (expense with tag) |
| **Savings/Investment** | 1 | From Savings section (expense with tag) |

---

## 5. Currency Breakdown

| Currency | Count | Percentage |
|----------|-------|------------|
| **USD** | 106 | 55.5% |
| **THB** | 85 | 44.5% |
| **Total** | 191 | 100% |

**Critical Verification:**
- ✅ Rent transaction should be: **THB 35,000.00** (NOT ~$1,074)
- ✅ Parsing must use **Column 6** for THB amounts
- ❌ Parsing must **NOT use Column 8** (conversion column)

---

## 6. Parsing Script Verification

**Status:** Script found at `scripts/parse-june-2025.js`

### Verification Checklist:

- [x] Uses Column 6 for THB amount detection
- [x] Uses Column 7 for USD amount
- [x] Uses Column 9 (Subtotal) as fallback
- [x] Does NOT use Column 8 (conversion column)

✅ **VERIFIED:** Parsing script uses correct columns for currency extraction.

---

## 7. Comparison to Previous Months

| Month | Total Transactions | Reimbursements | THB Transactions | Notes |
|-------|-------------------|----------------|------------------|-------|
| **June 2025** | **191** | **25** | **85** | Current analysis |
| September 2025 | 159 | 23 | ~70 | Reference |
| August 2025 | 225 | 32 | 82 | Reference |
| July 2025 | 176 | 26 | ~90 | Reference |
| May 2025 | ~180 | ~25 | ~75 | Estimated |

### Structural Differences:

- ⚠️ **Transaction count higher than September** by 32 transactions
- ✅ Reimbursement count within normal range (+2 vs September)
- ✅ THB transaction count within normal range (+15 vs September)

---

## 8. Anomalies & Data Quality Issues

**Found 2 anomaly/anomalies:**


1. **Line 1233:** Missing amount
   - Description: Desc
   - Merchant: Merchant
   


2. **Line 1512:** Missing amount in Florida House section
   - Description: FL Internet
   - Merchant: Xfinity
   - Note: Likely duplicate with Expense Tracker line (FL Internet Bill - Xfinity - $73.00)

---

## 9. Red Flags for Human Review

✅ **No critical warnings**

Data appears structurally sound for import.

---

## 10. Parsing Strategy Recommendations

### Pre-Import Actions:

1. **Duplicate Handling:**
   - Remove Florida House "FL Internet" entry (missing amount anyway)
   - If Ring subscription duplicate exists, keep Expense Tracker version

2. **Currency Verification:**
   - Verify parsing script uses Column 6 for THB (e.g., "THB 35000.00")
   - Verify parsing script uses Column 7/9 for USD (e.g., "$1,000.00")
   - Do NOT use Column 8 (conversion column - labeled "Conversion (THB to USD)")

3. **Tag Application:**
   - Reimbursements: 25 transactions (description starts with "Reimbursement:")
   - Business Expenses: 0 transactions (Column 4 = "X")
   - Florida House: 6 transactions (from Florida House section)
   - Savings/Investment: 1 transaction (from Savings section)
   - Reimbursables: 0 transactions (Column 3 = "X" - NO TAG, tracking only)

4. **Expected Outcomes:**
   - Total transactions after deduplication: ~190
   - Expense Tracker NET should match: $6,347.08 (±1.5%)
   - All sections combined NET: ~$7,033.03

### Import Order:

1. Expense Tracker (183 transactions)
2. Gross Income (1 transaction)
3. Savings/Investment (1 transaction)
4. Florida House (6 transactions - 1 duplicate = 5)

---

## Summary

**Status:** ✅ READY FOR PARSING

- **Total Transactions (raw):** 191
- **After Deduplication:** ~190
- **Expected NET Total:** $6,347.08 (Expense Tracker only)
- **Expected Combined Total:** $7,033.03 (all sections)
- **Duplicates to Remove:** 2 (includes missing amount entry)
- **Critical Issues:** 0


**Next Steps:**
1. Verify parsing script correctness
2. Run `node scripts/parse-june-2025.js`
3. Review parse report for accuracy
4. Import to database using `scripts/db/import-month.js`


---

**End of Pre-Flight Report**
