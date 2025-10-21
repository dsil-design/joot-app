# Monthly Summary Utility

**Location:** `/src/lib/utils/monthly-summary.ts`
**Created:** October 21, 2025
**Purpose:** Calculate monthly financial summaries with automatic currency conversion

## Overview

The `monthly-summary` utility provides a standardized way to calculate monthly income, expenses, and net position from transaction data. It automatically filters transactions by month and normalizes all currencies to USD for consistent comparison and display.

## API Reference

### `calculateMonthlySummary()`

Calculates monthly financial summary from transaction data with automatic currency conversion.

#### Signature

```typescript
function calculateMonthlySummary(
  transactions: TransactionWithVendorAndPayment[],
  month?: Date,
  exchangeRate?: number
): MonthlySummary
```

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `transactions` | `TransactionWithVendorAndPayment[]` | Yes | - | Array of transactions with vendor and payment method information |
| `month` | `Date` | No | `new Date()` | Target month for calculation (uses current month if not specified) |
| `exchangeRate` | `number` | No | `35` | THB to USD exchange rate for currency conversion |

#### Returns

```typescript
interface MonthlySummary {
  income: number          // Total income in USD
  expenses: number        // Total expenses in USD
  net: number            // Net position (income - expenses) in USD
  currency: 'USD'        // Always USD for consistency
  transactionCount: number      // Total number of transactions
  incomeCount: number    // Number of income transactions
  expenseCount: number   // Number of expense transactions
}
```

#### Examples

**Basic Usage (Current Month)**
```typescript
import { calculateMonthlySummary } from '@/lib/utils/monthly-summary'

// Calculate current month summary
const summary = calculateMonthlySummary(transactions)

console.log(summary)
// {
//   income: 5000.00,
//   expenses: 3000.00,
//   net: 2000.00,
//   currency: 'USD',
//   transactionCount: 25,
//   incomeCount: 5,
//   expenseCount: 20
// }
```

**Specific Month**
```typescript
import { calculateMonthlySummary } from '@/lib/utils/monthly-summary'

// Calculate summary for September 2025
const septemberSummary = calculateMonthlySummary(
  transactions,
  new Date('2025-09-01')
)
```

**Custom Exchange Rate**
```typescript
import { calculateMonthlySummary } from '@/lib/utils/monthly-summary'

// Use actual exchange rate from database
const summary = calculateMonthlySummary(
  transactions,
  new Date(),
  35.5  // Current USD to THB rate
)
```

**Display in UI**
```tsx
'use client'

import { calculateMonthlySummary } from '@/lib/utils/monthly-summary'
import { format } from 'date-fns'

export function MonthlySummaryCard({ transactions, exchangeRate }) {
  const summary = calculateMonthlySummary(transactions, new Date(), exchangeRate)
  const currentMonth = format(new Date(), 'MMMM yyyy')

  return (
    <Card>
      <h2>{currentMonth}</h2>

      <div>
        <label>Total Income</label>
        <span className="text-green-600">
          ${summary.income.toFixed(2)}
        </span>
        <small>{summary.incomeCount} transactions</small>
      </div>

      <div>
        <label>Total Expenses</label>
        <span className="text-red-600">
          ${summary.expenses.toFixed(2)}
        </span>
        <small>{summary.expenseCount} transactions</small>
      </div>

      <div>
        <label>Net {summary.net >= 0 ? 'Surplus' : 'Deficit'}</label>
        <span className={summary.net >= 0 ? 'text-green-600' : 'text-red-600'}>
          ${Math.abs(summary.net).toFixed(2)}
        </span>
        <small>{summary.transactionCount} total</small>
      </div>
    </Card>
  )
}
```

## Implementation Details

### Month Filtering

The utility uses `date-fns` to filter transactions by month:

```typescript
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns'

const monthStart = startOfMonth(targetDate)
const monthEnd = endOfMonth(targetDate)

const monthTransactions = transactions.filter(transaction => {
  const transactionDate = parseISO(transaction.transaction_date)
  return isWithinInterval(transactionDate, { start: monthStart, end: monthEnd })
})
```

### Currency Conversion

All transactions are normalized to USD for consistent display:

```typescript
let amountUSD = transaction.amount

// Convert THB to USD using provided exchange rate
if (transaction.original_currency === 'THB') {
  amountUSD = transaction.amount / exchangeRate
}
```

**Note:** The utility assumes only USD and THB currencies. If additional currencies are added to the system, this conversion logic will need to be updated.

### Transaction Categorization

Transactions are separated by type during calculation:

```typescript
if (transaction.transaction_type === 'income') {
  totalIncome += amountUSD
  incomeCount++
} else if (transaction.transaction_type === 'expense') {
  totalExpenses += amountUSD
  expenseCount++
}
```

## Usage in Application

### Home Page Dashboard

The primary use case is the home page dashboard:

**File:** `/src/app/home/page.tsx`

```typescript
import { calculateMonthlySummary } from '@/lib/utils/monthly-summary'

// In server component
const monthlySummary = transactions
  ? calculateMonthlySummary(transactions, new Date(), latestExchangeRate?.rate || 35)
  : { income: 0, expenses: 0, net: 0, currency: 'USD', transactionCount: 0, incomeCount: 0, expenseCount: 0 }
```

The summary is then passed to the client component for display with proper color coding and formatting.

## Edge Cases

### Empty Transaction Array

Returns a zero-initialized summary:

```typescript
// Input: []
calculateMonthlySummary([])

// Output:
{
  income: 0,
  expenses: 0,
  net: 0,
  currency: 'USD',
  transactionCount: 0,
  incomeCount: 0,
  expenseCount: 0
}
```

### No Transactions in Target Month

Returns zeros if no transactions fall within the specified month:

```typescript
// Input: transactions from January, but querying for February
calculateMonthlySummary(januaryTransactions, new Date('2025-02-01'))

// Output: All zeros
```

### Missing Exchange Rate

Uses default rate of 35 if not provided:

```typescript
// These are equivalent:
calculateMonthlySummary(transactions)
calculateMonthlySummary(transactions, new Date(), 35)
```

## Testing

### Unit Test Coverage

**File:** `/src/__tests__/utils/monthly-summary.test.ts`

Required test cases:
- ✅ Calculate correct totals for mixed USD/THB transactions
- ✅ Filter by specified month correctly
- ✅ Convert THB to USD using provided rate
- ✅ Handle empty transaction array
- ✅ Count income and expense transactions separately
- ✅ Calculate net position (income - expenses)
- ✅ Use default exchange rate when not provided
- ✅ Handle transactions on month boundaries

## Performance Considerations

### Time Complexity

- **Filtering**: O(n) - single pass through all transactions
- **Calculation**: O(m) - single pass through month's transactions
- **Overall**: O(n) where n is total transactions

### Optimization Opportunities

For large datasets (10,000+ transactions):

1. **Database-Level Filtering**: Move month filtering to SQL query
2. **Caching**: Cache results for current month with invalidation on new transactions
3. **Memoization**: Use React `useMemo` when passing to client components

Example with memoization:

```typescript
// In client component
import { useMemo } from 'react'

const summary = useMemo(() =>
  calculateMonthlySummary(transactions, new Date(), exchangeRate),
  [transactions, exchangeRate]
)
```

## Future Enhancements

### Planned Features

1. **Multi-Currency Support**: Extend beyond USD/THB
2. **Year-to-Date Calculation**: Add YTD summary function
3. **Comparison Periods**: Compare current month to previous month or same month last year
4. **Category Breakdown**: Include expense/income by category
5. **Trend Calculation**: Calculate month-over-month change percentage

### Proposed API Extension

```typescript
interface ExtendedMonthlySummary extends MonthlySummary {
  categoryBreakdown?: {
    [categoryId: string]: {
      amount: number
      count: number
    }
  }
  comparedTo?: {
    period: 'previous-month' | 'same-month-last-year'
    income: number
    expenses: number
    incomeChange: number  // percentage
    expenseChange: number // percentage
  }
}
```

## Dependencies

- `date-fns`: Date manipulation and filtering
  - `startOfMonth`
  - `endOfMonth`
  - `parseISO`
  - `isWithinInterval`
- `@/lib/supabase/types`: TypeScript type definitions
  - `TransactionWithVendorAndPayment`

## Related Documentation

- [Design System - Dashboard Summary Pattern](../design-system/patterns/dashboard-summary.md)
- [Home Page Implementation](../architecture/pages.md#home-page)
- [Transaction Types](../database/schema.md#transactions-table)
- [Currency Configuration](../database/schema.md#currency-configuration)

## Changelog

### October 21, 2025
- Initial implementation
- Basic monthly summary calculation
- USD/THB currency conversion support
- Transaction type separation (income/expense)

---

**Maintained by:** Engineering Team
**Last Updated:** October 21, 2025
**Version:** 1.0.0
