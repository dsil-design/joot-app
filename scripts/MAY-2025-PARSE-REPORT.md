# MAY 2025 PARSING REPORT

**Generated:** 2025-10-24T04:24:11.268Z
**Source:** csv_imports/fullImport_20251017.csv

## Transaction Counts

| Section | Count | Notes |
|---------|-------|-------|
| Expense Tracker | 167 | 151 expenses, 16 income/reimbursements |
| Gross Income Tracker | 4 | Total: $10409.29 |
| Personal Savings & Investments | 1 | Total: $341.67 |
| Florida House Expenses | 2 | After deduplication |
| **TOTAL** | **174** | |

## Transaction Types

- Expenses: 154
- Income: 20

## Tag Distribution

| Tag | Count |
|-----|-------|
| Reimbursement | 16 |
| Florida House | 2 |
| Savings/Investment | 1 |

## Currency Distribution

| Currency | Count |
|----------|-------|
| USD | 85 |
| THB | 89 |

## Duplicate Detection

Found 1 duplicate(s):


1. **Xfinity** - $73.00 on 2025-05-19
   - Expense Tracker: "FL Internet Bill" ✅ KEPT
   - Florida House: "FL Internet" ❌ REMOVED


## Rent Verification


- Description: This Month’s Rent
- Merchant: Landlord
- Amount: 35000 THB
- Expected: 35000 THB
- Status: ✅ CORRECT


## Sample Transactions

### Expense Tracker (first 5)
```json
[
  {
    "date": "2025-05-01",
    "description": "Work Email",
    "merchant": "Google",
    "payment_method": "Credit Card: Chase Sapphire Reserve",
    "amount": 6.36,
    "currency": "USD",
    "transaction_type": "expense",
    "tags": []
  },
  {
    "date": "2025-05-01",
    "description": "Florida House",
    "merchant": "Me",
    "payment_method": "PNC: Personal",
    "amount": 1000,
    "currency": "USD",
    "transaction_type": "expense",
    "tags": []
  },
  {
    "date": "2025-05-01",
    "description": "Semi-weekly: Gym Membership",
    "merchant": "Virgin Active",
    "payment_method": "Credit Card: Chase Sapphire Reserve",
    "amount": 18.65,
    "currency": "USD",
    "transaction_type": "expense",
    "tags": []
  },
  {
    "date": "2025-05-01",
    "description": "Meal Plan",
    "merchant": "Chef Fuji",
    "payment_method": "Bangkok Bank Account",
    "amount": 1000,
    "currency": "THB",
    "transaction_type": "expense",
    "tags": []
  },
  {
    "date": "2025-05-01",
    "description": "Wooden Sign (Desposit)",
    "merchant": "Teak Wood Shop",
    "payment_method": "Bangkok Bank Account",
    "amount": 500,
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
    "date": "2025-05-02",
    "description": "Paycheck",
    "merchant": "Rover",
    "payment_method": "PNC: Personal",
    "amount": 3975.66,
    "currency": "USD",
    "transaction_type": "income",
    "tags": []
  },
  {
    "date": "2025-05-16",
    "description": "Paycheck",
    "merchant": "Rover",
    "payment_method": "PNC: Personal",
    "amount": 3041.81,
    "currency": "USD",
    "transaction_type": "income",
    "tags": []
  },
  {
    "date": "2025-05-27",
    "description": "Freelance Income - March & April",
    "merchant": "NJDA",
    "payment_method": "PNC: Personal",
    "amount": 350,
    "currency": "USD",
    "transaction_type": "income",
    "tags": []
  },
  {
    "date": "2025-05-30",
    "description": "Paycheck",
    "merchant": "Rover",
    "payment_method": "PNC: Personal",
    "amount": 3041.82,
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
    "date": "2025-05-01",
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

### Florida House Expenses (all 2)
```json
[
  {
    "date": "2025-05-06",
    "description": "Water Bill",
    "merchant": "Englewood Water",
    "payment_method": "Credit Card: Chase Sapphire Reserve",
    "amount": 57.24,
    "currency": "USD",
    "transaction_type": "expense",
    "tags": [
      "Florida House"
    ]
  },
  {
    "date": "2025-05-14",
    "description": "Gas Bill",
    "merchant": "TECO",
    "payment_method": "PNC: House Account",
    "amount": 36.59,
    "currency": "USD",
    "transaction_type": "expense",
    "tags": [
      "Florida House"
    ]
  }
]
```

## Red Flags Summary

Total Issues: 4


1. **WARNING** - Flight for Leigh
   - Issue: Missing or zero amount
   - Status: OPEN
   


2. **WARNING** - Doorcam
   - Issue: Missing or zero amount in Florida House section
   - Status: OPEN
   


3. **WARNING** - Electricity Bill
   - Issue: Missing or zero amount in Florida House section
   - Status: OPEN
   


4. **INFO** - Xfinity - $73
   - Issue: Duplicate between Expense Tracker and Florida House - keeping Expense Tracker version
   - Status: RESOLVED
   - Notes: Expense Tracker: "FL Internet Bill" vs Florida House: "FL Internet"


## Validation Status

- [ ] Transaction count matches expected (177)
- [x] Rent verification passed (35000 THB)
- [x] Both USD and THB transactions present
- [x] Expected duplicates removed (1)
- [x] Reimbursement tag count matches (16)
- [ ] Florida House tag count matches (4 after dedup)
- [x] Savings/Investment tag count matches (1)

## Ready for Import

⚠️ **REVIEW REQUIRED** - Some validation checks failed

---
*Generated by parse-may-2025.js*
