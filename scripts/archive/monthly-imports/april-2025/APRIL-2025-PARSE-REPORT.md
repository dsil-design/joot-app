# APRIL 2025 PARSING REPORT

**Generated:** 2025-10-24T05:49:43.784Z
**Source:** csv_imports/fullImport_20251017.csv
**Line Ranges:** 1802-2098 (Expense Tracker: 1802-2029, Gross Income: 2030-2032, Savings: 2033-2034, Florida House: 2035-2098)

## Transaction Counts

| Section | Count | Notes |
|---------|-------|-------|
| Expense Tracker | 172 | 149 expenses, 23 income/reimbursements |
| Gross Income Tracker | 4 | Total: $13094.69 |
| Personal Savings & Investments | 1 | Total: $341.67 |
| Florida House Expenses | 5 | After deduplication |
| **TOTAL** | **182** | |

## Transaction Types

- Expenses: 155
- Income: 27

## Tag Distribution

| Tag | Count |
|-----|-------|
| Reimbursement | 22 |
| Florida House | 5 |
| Savings/Investment | 1 |

## Currency Distribution

| Currency | Count |
|----------|-------|
| USD | 89 |
| THB | 93 |

## User-Confirmed Corrections Applied

### Correction #1: Line 1988 - Madame Koh (Sign Error)

**Before:** -THB 1,030.00 (negative amount)
**After:** +THB 1,030.00 (positive amount)
**Reason:** Data entry error - this was a normal expense, not a refund
**Status:** ✅ RESOLVED (User confirmed)

### Correction #2: Line 1868 - Monthly Cleaning (Currency Error)

**Before:** $2,782.00 USD
**After:** THB 2,782.00
**Reason:** Currency error in CSV - amount was in THB, not USD
**Status:** ✅ RESOLVED (User confirmed)

## Duplicate Detection

Found 1 duplicate(s):


1. **Xfinity** - $73.00 on 2025-04-19
   - Line 1967 (Expense Tracker): "FL House Internet" ✅ KEPT
   - Line 2095 (Florida House): "Internet Bill" ❌ REMOVED


## Rent Verification


- Description: This Month’s Rent
- Merchant: Landlord
- Amount: 35000 THB
- Expected: 35000 THB
- Status: ✅ CORRECT


## Critical Transaction Verifications

### 1. Rent (Line 1846)
- ✅ Amount: 35000 THB
- ✅ Currency: THB (not converted)
- ✅ Merchant: Landlord

### 2. Monthly Cleaning (Line 1868) - CORRECTED
- ✅ Amount: 2782 THB (corrected from 2782 USD)
- ✅ Currency: THB
- ✅ Merchant: BLISS

### 3. Madame Koh (Line 1988) - CORRECTED
- ✅ Amount: 1030 THB (corrected from -1030 THB)
- ✅ Sign: Positive (normal expense)
- ✅ Merchant: Madame Koh

## Sample Transactions

### Expense Tracker (first 5)
```json
[
  {
    "date": "2025-04-01",
    "description": "Work Email",
    "merchant": "Google",
    "payment_method": "Credit Card: Chase Sapphire Reserve",
    "amount": 6.36,
    "currency": "USD",
    "transaction_type": "expense",
    "tags": []
  },
  {
    "date": "2025-04-01",
    "description": "Florida House",
    "merchant": "Me",
    "payment_method": "PNC: Personal",
    "amount": 1000,
    "currency": "USD",
    "transaction_type": "expense",
    "tags": []
  },
  {
    "date": "2025-04-01",
    "description": "Reimbursement: Rent",
    "merchant": "Nidnoi",
    "payment_method": "Bangkok Bank Account",
    "amount": 8000,
    "currency": "THB",
    "transaction_type": "income",
    "tags": [
      "Reimbursement"
    ]
  },
  {
    "date": "2025-04-01",
    "description": "Reimbursement: Electricity Bill",
    "merchant": "Nidnoi",
    "payment_method": "Bangkok Bank Account",
    "amount": 1099,
    "currency": "THB",
    "transaction_type": "income",
    "tags": [
      "Reimbursement"
    ]
  },
  {
    "date": "2025-04-01",
    "description": "Coffee",
    "merchant": "Nidnoi",
    "payment_method": "Bangkok Bank Account",
    "amount": 65,
    "currency": "THB",
    "transaction_type": "expense",
    "tags": []
  }
]
```

### Gross Income Tracker (all 4)
```json
[
  {
    "date": "2025-04-18",
    "description": "Partial Refund: Business Insurance",
    "merchant": "The Hartford",
    "payment_method": "PNC: Personal",
    "amount": 30.76,
    "currency": "USD",
    "transaction_type": "income",
    "tags": []
  },
  {
    "date": "2025-04-02",
    "description": "Insurance Refund",
    "merchant": "Insureon",
    "payment_method": "PNC: Personal",
    "amount": 1533,
    "currency": "USD",
    "transaction_type": "income",
    "tags": []
  },
  {
    "date": "2025-04-03",
    "description": "Reimbursement: 2025 Estimated Tax Payment",
    "merchant": "DSIL Design",
    "payment_method": "PNC: Personal",
    "amount": 3492.06,
    "currency": "USD",
    "transaction_type": "income",
    "tags": []
  },
  {
    "date": "2025-04-04",
    "description": "Paycheck",
    "merchant": "Rover",
    "payment_method": "PNC: Personal",
    "amount": 4093.98,
    "currency": "USD",
    "transaction_type": "income",
    "tags": []
  },
  {
    "date": "2025-04-18",
    "description": "Paycheck",
    "merchant": "Rover",
    "payment_method": "PNC: Personal",
    "amount": 3975.65,
    "currency": "USD",
    "transaction_type": "income",
    "tags": []
  }
]
```

### Personal Savings & Investments (all 1)
```json
[
  {
    "date": "2025-04-01",
    "description": "Emergency Savings",
    "merchant": "Vanguard",
    "payment_method": "PNC Bank Account",
    "amount": 341.67,
    "currency": "USD",
    "transaction_type": "expense",
    "tags": [
      "Savings/Investment"
    ]
  }
]
```

### Florida House Expenses (all 5)
```json
[
  {
    "date": "2025-04-01",
    "description": "Quarterly: HOA Fee",
    "merchant": "Castle Management",
    "payment_method": "PNC: House Account",
    "amount": 1048.55,
    "currency": "USD",
    "transaction_type": "expense",
    "tags": [
      "Florida House"
    ]
  },
  {
    "date": "2025-04-29",
    "description": "Electricity Bill",
    "merchant": "FPL",
    "payment_method": "PNC: House Account",
    "amount": 36.12,
    "currency": "USD",
    "transaction_type": "expense",
    "tags": [
      "Florida House"
    ]
  },
  {
    "date": "2025-04-02",
    "description": "Water Bill",
    "merchant": "Englewood Water",
    "payment_method": "Credit Card: Chase Sapphire Reserve",
    "amount": 58.99,
    "currency": "USD",
    "transaction_type": "expense",
    "tags": [
      "Florida House"
    ]
  },
  {
    "date": "2025-04-14",
    "description": "Gas Bill",
    "merchant": "TECO",
    "payment_method": "PNC: House Account",
    "amount": 42.84,
    "currency": "USD",
    "transaction_type": "expense",
    "tags": [
      "Florida House"
    ]
  },
  {
    "date": "2025-04-29",
    "description": "Electricity Bill",
    "merchant": "FPL",
    "payment_method": "PNC: House Account",
    "amount": 34.31,
    "currency": "USD",
    "transaction_type": "expense",
    "tags": [
      "Florida House"
    ]
  }
]
```

## Red Flags Summary

Total Issues: 0

*No issues found*

## Validation Status

- [x] Transaction count matches expected (182 after removing 1 duplicate)
- [x] Rent verification passed (35000 THB)
- [x] Both USD and THB transactions present
- [x] Expected duplicates removed (1)
- [x] Reimbursement tag count matches (22 from Expense Tracker only)
- [x] Gross Income count matches (4)
- [x] Florida House tag count matches (5 after dedup)
- [x] Savings/Investment tag count matches (1)
- [ ] User-confirmed corrections applied (2)

## Expected CSV Totals

**From CSV Grand Total (Line 2055):** $11,035.98

**Calculation Method:**
- Sum of all Expense Tracker expenses (positive amounts)
- Minus sum of all Expense Tracker reimbursements (negative amounts)
- Does NOT include Gross Income, Savings, or Florida House sections

**Note:** After corrections, expected totals may vary slightly from CSV due to:
1. Line 1868 correction: Reduced expenses by ~$2,680 (changed from USD to THB)
2. Line 1988 correction: Changed sign from negative to positive (+$60.56 to expenses)

## Ready for Import

⚠️ **REVIEW REQUIRED** - Some validation checks failed

---
*Generated by parse-april-2025.js*
