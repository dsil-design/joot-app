# Final Parsing Rules for Transaction Import
## Complete Reference Document

**Last Updated:** October 23, 2025
**Status:** ✅ Approved by User

---

## CSV Structure Overview

Each month has up to 6 sections:
1. **Expense Tracker** → Import ✅
2. **Gross Income Tracker** → Import ✅
3. **Personal Savings & Investments** → Import ✅
4. **Florida House Expenses** → Import ✅
5. **Personal Take Home** → Ignore ❌
6. **Deficit/Surplus** → Ignore ❌

---

## Section 1: Expense Tracker

### Column Structure
```
,Desc,Merchant,Reimbursable,Business Expense,Payment Type,Actual Spent,,Conversion (THB to USD),Subtotal
,,,,,,THB,USD,,
```

**Column Mapping:**
- Col 0: Empty (date rows will have date here)
- Col 1: `Desc` → description
- Col 2: `Merchant` → vendor
- Col 3: `Reimbursable` → Flag for future reimbursement (X = yes, but NO TAG)
- Col 4: `Business Expense` → Flag for business expense (X = yes, TAG: "Business Expense")
- Col 5: `Payment Type` → payment_method
- Col 6: `THB` → amount if THB currency
- Col 7: `USD` → amount if USD currency
- Col 8: `Conversion (THB to USD)` → IGNORE
- Col 9: `Subtotal` → USD equivalent (for validation)

### Row Types to Process
1. **Date Rows**: `"Monday, September 1, 2025"` → Store as currentDate
2. **Transaction Rows**: Have Desc and amount → Import

### Rows to SKIP
- Header rows
- Date rows (used for context only)
- "Daily Total" rows
- "GRAND TOTAL" rows
- Empty rows
- Rows with "Estimated" or "Subtotal" in description

### Currency Extraction Logic
```javascript
// Priority: Check THB column first, then USD
if (row[6] && row[6].includes('THB')) {
  // Parse "THB 2782.00" → amount=2782.00, currency='THB'
  const match = row[6].match(/THB\s*([\d,.-]+)/);
  amount = parseFloat(match[1].replace(/,/g, ''));
  currency = 'THB';
} else if (row[7]) {
  // Parse "$612.87" → amount=612.87, currency='USD'
  amount = parseFloat(row[7].replace(/[$,]/g, ''));
  currency = 'USD';
}
```

### Transaction Type Logic
```javascript
if (description.startsWith('Reimbursement:')) {
  transaction_type = 'income';
  tags.push('Reimbursement');
  // Amount should be stored as POSITIVE (money received)
} else {
  transaction_type = 'expense';
}
```

### Tag Assignment Logic
```javascript
tags = [];

// 1. Business Expense Check
if (row[4] === 'X' || row[4] === 'x') {
  tags.push('Business Expense');
}

// 2. Reimbursement Check (also sets type to income)
if (description.toLowerCase().startsWith('reimbursement:')) {
  tags.push('Reimbursement');
  transaction_type = 'income';
}

// Note: Reimbursable column (row[3] = 'X') gets NO TAG
```

### Special Case: Negative Amounts in CSV
In the master CSV, reimbursements appear as negative expenses:
- CSV: `-$30.91` in Expense Tracker
- Database: Store as `income` transaction with amount `30.91` (positive)

---

## Section 2: Gross Income Tracker

### Column Structure
```
Date Receieved,Description,Source,Amount
```

**Column Mapping:**
- Col 0: Date (format: `"Thursday, September 18, 2025"`)
- Col 1: `Description` → description
- Col 2: `Source` → vendor
- Col 3: `Amount` → amount (always USD)

### Field Defaults
- `transaction_type`: `income`
- `currency`: `USD`
- `payment_method`: `PNC: Personal` (default for all income)
- `tags`: None (empty array)

### Rows to SKIP
- "Estimated (Remaining) Subtotal"
- "Estimated Grand Total"
- "GROSS INCOME TOTAL"
- "ACTUAL GRAND TOTAL"
- Empty rows

### Example
```csv
"Thursday, September 18, 2025",Freelance Income - August,NJDA,$175.00
```
Becomes:
```javascript
{
  date: '2025-09-18',
  description: 'Freelance Income - August',
  merchant: 'NJDA',
  payment_method: 'PNC: Personal',
  amount: 175.00,
  currency: 'USD',
  transaction_type: 'income',
  tags: []
}
```

---

## Section 3: Personal Savings & Investments

### Column Structure
```
Date Made,Description,Vendor,Source,Amount
```

**Column Mapping:**
- Col 0: Date (format: `9/1/2025` - MM/DD/YYYY)
- Col 1: `Description` → description
- Col 2: `Vendor` → vendor
- Col 3: `Source` → payment_method
- Col 4: `Amount` → amount (always USD)

### Field Defaults
- `transaction_type`: `expense` (money leaving to savings)
- `currency`: `USD`
- `tags`: `["Savings/Investment"]`

### Rows to SKIP
- "TOTAL" row
- Empty rows

### Date Parsing
Parse `9/1/2025` as September 1, 2025 → `2025-09-01`

### Example
```csv
9/1/2025,Emergency Savings,Vanguard,PNC Bank Account,$341.67
```
Becomes:
```javascript
{
  date: '2025-09-01',
  description: 'Emergency Savings',
  merchant: 'Vanguard',
  payment_method: 'PNC Bank Account',
  amount: 341.67,
  currency: 'USD',
  transaction_type: 'expense',
  tags: ['Savings/Investment']
}
```

---

## Section 4: Florida House Expenses

### Column Structure
```
,Desc,Merchant,Reimbursement,Payment Type,Subtotal
```

**Column Mapping:**
- Col 0: Empty (date rows will have date here)
- Col 1: `Desc` → description
- Col 2: `Merchant` → vendor
- Col 3: `Reimbursement` → (Pending/X = reimbursable, but no special tag)
- Col 4: `Payment Type` → payment_method
- Col 5: `Subtotal` → amount (always USD)

### Field Defaults
- `transaction_type`: `expense`
- `currency`: `USD`
- `tags`: `["Florida House"]`

### Rows to SKIP
- Header rows
- Date rows
- "GRAND TOTAL" rows
- Empty rows

### Example
```csv
"Tuesday, September 2, 2025",,,,,
,Water Bill,Englewood Water,Pending,Credit Card: Chase Sapphire Reserve,$54.66
```
Becomes:
```javascript
{
  date: '2025-09-02',
  description: 'Water Bill',
  merchant: 'Englewood Water',
  payment_method: 'Credit Card: Chase Sapphire Reserve',
  amount: 54.66,
  currency: 'USD',
  transaction_type: 'expense',
  tags: ['Florida House']
}
```

---

## Duplicate Detection Rules

### Potential Duplicate Criteria
Two transactions are potential duplicates if they match ALL of:
1. Same merchant (case-insensitive)
2. Same amount (exact match)
3. Same date OR within 3 days of each other
4. Same month

### Duplicate Resolution Strategy
When duplicates are found between Expense Tracker and Florida House Expenses:
- **KEEP:** Expense Tracker version
- **REMOVE:** Florida House Expenses version

### Example (September 2025)
```
Line 519 (Expense Tracker): FL Internet Bill | Xfinity | $73.00 ✅ KEEP
Line 642 (Florida House):   FL Internet | Xfinity | $73.00       ❌ REMOVE
```

### Reporting
Before import, generate duplicate report:
```
🔍 DUPLICATE DETECTION REPORT
========================================
Found 1 potential duplicate(s):

1. Xfinity - $73.00 on 2025-09-20
   - Expense Tracker: "FL Internet Bill" ✅ KEEPING
   - Florida House: "FL Internet" ❌ REMOVING
```

---

## Date Parsing Rules

### Format 1: Full Day Name
```
"Monday, September 1, 2025" → 2025-09-01
"Thursday, September 18, 2025" → 2025-09-18
```

**Regex:** `/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d+),\s+(\d{4})/`

### Format 2: MM/DD/YYYY
```
9/1/2025 → 2025-09-01
12/31/2024 → 2024-12-31
```

**Parse:** Use JavaScript Date parsing with explicit month/day/year extraction

### Format 3: ISO Date (if encountered)
```
2025-09-01 → 2025-09-01
```

---

## Validation Rules

### Transaction Count Validation
```javascript
// For September 2025
const expected = {
  expense_tracker: ~150 transactions,
  gross_income: 1 transaction,
  savings_investments: 1 transaction,
  florida_house: 6 transactions (after duplicate removal)
};

const total = 158 transactions (before duplicate removal)
            = 157 transactions (after removing 1 duplicate)
```

### Financial Validation
```javascript
// CSV Grand Total Calculation (Expense Tracker only)
Grand Total = Sum of all Expense Tracker rows (including negative reimbursements)
            = $6,804.11 for September 2025

// Database Validation
Total Expenses (from Expense Tracker) = ~$7,484
Total Income/Reimbursements (from Expense Tracker) = ~$680
NET = Total Expenses - Total Income = ~$6,804

// Acceptance Criteria
Variance ≤ 1.5% of expected total
For $6,804.11 → acceptable range: $6,702 to $6,906
```

### Tag Distribution Validation
For September 2025 (expected):
- "Florida House": 6 transactions
- "Reimbursement": ~22 transactions
- "Business Expense": 0 transactions
- "Savings/Investment": 1 transaction

---

## Special Cases & Edge Cases

### 1. The "$1,000 Florida House" Transaction
```csv
Line 396: ,Florida House,Me,,,PNC: Personal,,"$1,000.00",$0.00,$1000.00
```

**Treatment:**
- Import as: expense transaction
- Vendor: "Me"
- Payment Method: "PNC: Personal"
- Amount: $1,000.00
- Tags: NONE (not a Florida House expense, despite description)
- Note: This is a transfer to Florida House bank account

### 2. Reimbursements with Zero Subtotal
Some reimbursements show $0.00 in subtotal:
```csv
,Reimbursement: Baggage,Nidnoi,,,Bangkok Bank Account,-THB 557.00,,,$0.00
```

**Treatment:**
- Parse THB amount: 557.00 THB
- Convert to USD using exchange rate or subtotal if available
- If truly $0.00, still import to maintain transaction history

### 3. Anomalous Dates
The production-import.js script has date corrections:
```javascript
function correctAnomalousDate(dateStr, description, merchant) {
  if (dateStr === '2004-07-31' && description.includes('Freelance Income') && merchant === 'NJDA') {
    return '2025-08-01'; // Typo in year
  }
  // ... other corrections
  return dateStr;
}
```

Apply these corrections during parsing.

---

## Vendor Matching Strategy

### On Import
1. **Check existing vendors**: Query database for vendor with same name (case-insensitive)
2. **Fuzzy match**: Try matching with slight variations:
   - "Starbucks Coffee" vs "Starbucks"
   - "Amazon.com" vs "Amazon"
3. **Create new if no match**: Don't fret too much - user has UI to merge vendors later
4. **Track new vendors**: Report all new vendors created during import

### Vendor Normalization (Optional)
Consider basic normalization:
- Trim whitespace
- Convert to title case
- Remove common suffixes: "Inc", "LLC", "Corp"

But keep original name as-is in database for user review.

---

## Summary of All Tags

| Tag Name | Condition | Transaction Type | Sections |
|----------|-----------|------------------|----------|
| `Florida House` | In Florida House Expenses section | expense | Florida House Expenses |
| `Reimbursement` | Description starts with "Reimbursement:" | income | Expense Tracker |
| `Business Expense` | Column 4 = "X" | expense | Expense Tracker |
| `Savings/Investment` | In Personal Savings & Investments | expense | Personal Savings & Investments |

**No Tags:**
- Gross Income Tracker transactions
- Reimbursable items (Column 3 = "X")
- Regular expenses without special flags

---

## Import Order

For each month, import sections in this order:

1. **Expense Tracker** (largest section)
2. **Gross Income Tracker**
3. **Personal Savings & Investments**
4. **Florida House Expenses** (with duplicate detection)

This order ensures:
- Main expenses imported first
- Income/reimbursements clearly separated
- Duplicates can be detected against already-imported Expense Tracker

---

## Final Validation Checklist

After importing each month:

- [ ] Transaction count matches expected (±1-2 for edge cases)
- [ ] NET total matches CSV Grand Total (within 1.5%)
- [ ] All tags correctly applied
- [ ] No unexpected duplicates remain
- [ ] All sections processed (4 import sections)
- [ ] Date range covers full month
- [ ] Currency distribution looks correct
- [ ] Vendor count seems reasonable
- [ ] Payment methods all mapped

---

**Status:** ✅ READY FOR IMPLEMENTATION

This document represents the complete, final parsing rules approved by the user.
