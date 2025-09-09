# Currency Formatting

**Last Updated:** 2025-09-01

## Overview

The Joot App design system includes global currency formatting utilities to ensure consistent monetary value display across the application. These utilities handle internationalization, number formatting, and proper comma placement for large amounts.

## Core Utility

### `formatCurrency(amount, currency, options?)`

**Location:** `/src/lib/utils.ts`

**Purpose:** Primary currency formatting function that provides consistent monetary value display with automatic thousands separators and proper currency symbols.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | `number` | Yes | The numeric amount to format |
| `currency` | `CurrencyType` | Yes | Currency code from database schema |
| `options` | `object` | No | Formatting configuration |

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minimumFractionDigits` | `number` | `2` | Minimum decimal places |
| `maximumFractionDigits` | `number` | `2` | Maximum decimal places |
| `useGrouping` | `boolean` | `true` | Enable thousands separators |

#### Supported Currencies

The utility supports all currencies defined in the database schema:

**Primary Currencies:**
- USD ($), THB (฿), EUR (€), GBP (£)

**Extended Support:**
- SGD (S$), VND (₫), MYR (RM), BTC (₿)
- JPY (¥), CHF (CHF), CAD (C$), AUD (A$)
- And 22 additional international currencies

## Usage Examples

### Basic Formatting

```typescript
import { formatCurrency } from '@/lib/utils'

// Standard usage with automatic comma separators
formatCurrency(1000, 'USD')      // → "$1,000.00"
formatCurrency(1000, 'THB')      // → "฿1,000.00"
formatCurrency(50000, 'EUR')     // → "€50,000.00"
```

### Advanced Options

```typescript
// Custom decimal places
formatCurrency(1234.567, 'USD', { 
  maximumFractionDigits: 3 
})  // → "$1,234.567"

// No grouping separators
formatCurrency(1000, 'THB', { 
  useGrouping: false 
})  // → "฿1000.00"

// Integer display
formatCurrency(1000, 'JPY', { 
  minimumFractionDigits: 0,
  maximumFractionDigits: 0 
})  // → "¥1,000"
```

## Implementation Guidelines

### When to Use

✅ **Always use `formatCurrency()` for:**
- Transaction amounts in cards and lists
- Exchange rates and price displays
- Financial summaries and totals
- Any user-facing monetary values

❌ **Avoid for:**
- Internal calculations (use raw numbers)
- API request/response data
- Database storage values

### Component Integration

The utility is automatically integrated into key components:

```typescript
// Transaction Card - automatic formatting
<TransactionCard 
  transaction={transaction} 
  viewMode="recorded" 
/>

// Manual usage in custom components
<div className="text-xl font-medium">
  {formatCurrency(amount, currency)}
</div>
```

## Design Principles

### Consistency
- All monetary values use identical formatting rules
- Consistent thousands separators (commas)
- Uniform decimal place handling

### Internationalization
- Proper currency symbols for each currency type
- Supports both Latin and non-Latin characters
- Fallback to currency code for unsupported symbols

### Accessibility
- Formatted values maintain proper screen reader compatibility
- Currency symbols precede amounts for consistent reading order
- Large numbers with commas improve readability

## Migration from Legacy Patterns

### Before
```typescript
// Old pattern - inconsistent formatting
`$${amount.toFixed(2)}`
`฿${amount.toFixed(2)}`
```

### After
```typescript
// New pattern - consistent and scalable
formatCurrency(amount, 'USD')
formatCurrency(amount, 'THB')
```

## Testing

The formatting utility includes comprehensive test coverage:

```typescript
// Tests verify comma placement for various amounts
expect(formatCurrency(1000, 'USD')).toBe('$1,000.00')
expect(formatCurrency(1000000, 'THB')).toBe('฿1,000,000.00')
```

## Performance Considerations

- Uses native `Intl.NumberFormat` for optimal performance
- Lightweight implementation with minimal bundle impact
- Currency symbol mapping cached for repeated calls

## Future Enhancements

**Planned Features:**
- Locale-specific formatting (European decimal comma)
- Dynamic currency symbol loading
- Integration with user preference settings
- Support for cryptocurrency precision handling

## Related Documentation

- [Typography](./typography.md) - Text styling guidelines
- [Component Guidelines](../components/global/) - Using formatted values in components
- [Currency Converter](../patterns/data-display.md) - Complex currency display patterns