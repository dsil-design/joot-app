# APRIL 2025 RED FLAGS LOG

**Generated:** 2025-10-24
**Import Date:** 2025-10-24
**Month:** April 2025
**Total Transactions:** 182
**User:** dennis@dsil.design

---

## SUMMARY

| Severity | Count |
|----------|-------|
| **CRITICAL** | 3 |
| **WARNING** | 1 |
| **RESOLVED** | 3 |

---

## CRITICAL RED FLAGS

### 🚨 RED FLAG #1: Missing Reimbursement Tags (4 transactions)
- Expected: 22, Actual: 18, Variance: -4
- Impact: Expense Tracker calculation incorrect
- Fix: Add Reimbursement tag to 4 missing transactions

### 🚨 RED FLAG #2: Missing Florida House Tag (1 transaction)
- Expected: 5, Actual: 4, Variance: -1
- Impact: Florida House total $107 short
- Fix: Add Florida House tag to 1 missing transaction

### 🚨 RED FLAG #3: Expense Tracker Variance (-17.13%)
- DB Total: $9,145.61, PDF Total: $11,035.98
- Variance: -$1,890.37 (exceeds ±2% threshold)
- Root Cause: Missing tags from #1 and #2
- Fix: Fix tags first, then re-validate

---

## WARNING RED FLAGS

### ⚠️ RED FLAG #4: Gross Income Variance (+$51.46)
- DB Total: $13,146.15, PDF Total: $13,094.69
- Variance: +$51.46 (+0.39%)
- Root Cause: Likely rounding or misclassification
- Action: Investigate non-reimbursement income

---

## RESOLVED

### ✅ Monthly Cleaning Currency: USD → THB (2782)
### ✅ Madame Koh Sign: Negative → Positive (1030 THB)
### ✅ Business Insurance Type: Expense → Income ($30.76)

---

**End of Red Flags Log**
