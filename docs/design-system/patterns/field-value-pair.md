# FieldValuePair Pattern

**Last Updated:** 2025-10-15
**Status:** 🔄 Identified Pattern - Not Yet Extracted
**Type:** Layout Pattern / Potential Global Component

## Overview

The FieldValuePair pattern is a common layout pattern used for displaying read-only field/value pairs in detail views. It provides a consistent structure for showing labeled data with optional secondary text and indicators.

## Current Implementation

**Location:** Inline in `/src/app/transactions/[id]/page.tsx` (lines 29-54)
**Status:** Not extracted as reusable component

```tsx
interface FieldValuePairProps {
  label: string
  value: string
  secondaryText?: string
  showAsterisk?: boolean
}

function FieldValuePair({ label, value, secondaryText, showAsterisk }: FieldValuePairProps) {
  return (
    <div className="content-stretch flex flex-col gap-1 items-start justify-start relative shrink-0">
      <div className="content-stretch flex gap-2 items-center justify-start relative shrink-0">
        <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-zinc-950">
          <p className="leading-[20px] whitespace-pre">{label}{showAsterisk ? '*' : ''}</p>
        </div>
      </div>
      <div className="flex flex-col font-normal justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-zinc-950">
        <p className="leading-[20px] whitespace-pre">{value}</p>
      </div>
      {secondaryText && (
        <div className="flex flex-col font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#71717b] text-[14px] text-nowrap">
          <p className="leading-[20px] whitespace-pre">{secondaryText}</p>
        </div>
      )}
    </div>
  )
}
```

## Current Usage

The pattern is currently used in the View Transaction page to display transaction details:

```tsx
<FieldValuePair
  label="Type"
  value={transaction.transaction_type === "expense" ? "Expense" : "Income"}
/>
<FieldValuePair
  label="Date"
  value={formatDate(transaction.transaction_date)}
/>
<FieldValuePair
  label="Description"
  value={transaction.description || "No description"}
/>
<FieldValuePair
  label="Vendor"
  value={transaction.vendors?.name || "Unknown"}
/>
<FieldValuePair
  label="Payment method"
  value={transaction.payment_methods?.name || "Unknown"}
/>
<FieldValuePair
  label="Amount"
  value={formatAmount(transaction)}
/>
<FieldValuePair
  label="Exchange rate"
  value={formatExchangeRate(transaction, exchangeRate)}
  secondaryText={formatExchangeRateTimestamp(exchangeRateTimestamp, isUsingLatestRate, fallbackRateDate)}
  showAsterisk={isUsingLatestRate || !!fallbackRateDate}
/>
```

## Design Tokens Used

### Current Implementation (⚠️ Non-compliant)
- **Colors**:
  - `text-zinc-950` ✅ (for label and value)
  - `text-[#71717b]` ❌ Should use `text-muted-foreground`
- **Typography**:
  - `text-[14px]` ⚠️ Hardcoded (acceptable for Figma fidelity, but should consider semantic tokens)
  - `font-medium`, `font-normal` ✅
- **Spacing**:
  - `gap-1` ✅ (4px)
  - `gap-2` ✅ (8px)

### Recommended Implementation (After Extraction)
```tsx
// Improved with design tokens
<div className="flex flex-col gap-1">
  <div className="flex gap-2 items-center">
    <p className="text-sm font-medium text-foreground leading-5">
      {label}{showAsterisk ? '*' : ''}
    </p>
  </div>
  <p className="text-sm font-normal text-foreground leading-5">
    {value}
  </p>
  {secondaryText && (
    <p className="text-sm font-normal text-muted-foreground leading-5">
      {secondaryText}
    </p>
  )}
</div>
```

## Proposed Global Component

### Recommended Location
`/src/components/ui/field-value-pair.tsx`

### Component API

```tsx
interface FieldValuePairProps {
  /**
   * The label/field name to display
   */
  label: string

  /**
   * The value to display
   */
  value: string

  /**
   * Optional secondary text (e.g., metadata, notes)
   */
  secondaryText?: string

  /**
   * Whether to show an asterisk indicator next to the label
   * Useful for indicating special conditions or required fields
   */
  showAsterisk?: boolean

  /**
   * Optional className for customization
   */
  className?: string

  /**
   * Optional data-testid for testing
   */
  'data-testid'?: string
}

export function FieldValuePair({
  label,
  value,
  secondaryText,
  showAsterisk = false,
  className,
  'data-testid': testId,
}: FieldValuePairProps) {
  return (
    <div
      className={cn("flex flex-col gap-1", className)}
      data-testid={testId}
      data-slot="field-value-pair"
    >
      {/* Label */}
      <div className="flex gap-2 items-center">
        <p className="text-sm font-medium text-foreground leading-5">
          {label}{showAsterisk && <span className="text-amber-600">*</span>}
        </p>
      </div>

      {/* Value */}
      <p className="text-sm font-normal text-foreground leading-5">
        {value}
      </p>

      {/* Secondary Text */}
      {secondaryText && (
        <p className="text-sm font-normal text-muted-foreground leading-5">
          {secondaryText}
        </p>
      )}
    </div>
  )
}
```

## Usage Examples

### Basic Field Display
```tsx
<FieldValuePair
  label="Email"
  value="user@example.com"
/>
```

### With Secondary Text
```tsx
<FieldValuePair
  label="Exchange rate"
  value="1 USD = 35.50 THB"
  secondaryText="as of 2:45pm, October 15, 2025"
/>
```

### With Asterisk Indicator
```tsx
<FieldValuePair
  label="Exchange rate"
  value="1 USD = 35.50 THB"
  secondaryText="*rate not available, using latest instead"
  showAsterisk={true}
/>
```

### In a Form Group
```tsx
<div className="flex flex-col gap-6 w-full">
  <FieldValuePair label="Type" value="Expense" />
  <FieldValuePair label="Date" value="October 15, 2025" />
  <FieldValuePair label="Description" value="Coffee" />
  <FieldValuePair label="Amount" value="$5.50" />
</div>
```

### Custom Styling
```tsx
<FieldValuePair
  label="Total Amount"
  value="$1,234.56"
  className="p-4 bg-zinc-50 rounded-lg"
/>
```

## Variants

### Horizontal Layout (Alternative)
```tsx
// For compact displays
<div className="flex items-center gap-4">
  <p className="text-sm font-medium text-foreground min-w-32">
    {label}:
  </p>
  <p className="text-sm font-normal text-foreground">
    {value}
  </p>
</div>
```

### With Icon
```tsx
// For adding visual indicators
<div className="flex flex-col gap-1">
  <div className="flex gap-2 items-center">
    {icon && <div className="size-4">{icon}</div>}
    <p className="text-sm font-medium text-foreground leading-5">
      {label}
    </p>
  </div>
  <p className="text-sm font-normal text-foreground leading-5">
    {value}
  </p>
</div>
```

## Accessibility Considerations

### Current Implementation
- ✅ Semantic HTML structure
- ⚠️ No ARIA labels (acceptable for simple display)
- ✅ Readable text hierarchy

### Recommended Enhancements
```tsx
// For screen readers
<div
  role="group"
  aria-labelledby={`${id}-label`}
  className="flex flex-col gap-1"
>
  <p
    id={`${id}-label`}
    className="text-sm font-medium text-foreground leading-5"
  >
    {label}
  </p>
  <p
    aria-labelledby={`${id}-label`}
    className="text-sm font-normal text-foreground leading-5"
  >
    {value}
  </p>
</div>
```

## Migration Plan

### Phase 1: Extract Component (1 hour)
1. Create `/src/components/ui/field-value-pair.tsx`
2. Implement component with design token compliance
3. Add proper TypeScript types
4. Include accessibility enhancements

### Phase 2: Migrate Existing Usage (30 minutes)
1. Update View Transaction page to import FieldValuePair
2. Replace inline implementation with global component
3. Test for visual regression

### Phase 3: Documentation & Testing (1 hour)
1. Write component tests
2. Add Storybook stories (if applicable)
3. Update design system documentation

## Benefits of Extraction

### Consistency
- ✅ Ensures all field/value displays look identical
- ✅ Easy to update styling across entire app
- ✅ Reduces code duplication

### Maintainability
- ✅ Single source of truth for field display pattern
- ✅ Easier to update design tokens
- ✅ Simpler to test

### Reusability
- ✅ Can be used in other detail pages
- ✅ Supports profile pages, settings, dashboards
- ✅ Extensible for future use cases

## Related Patterns

### Label Component
The FieldValuePair pattern complements the global Label component but serves a different purpose:
- **Label**: Form input labels (interactive)
- **FieldValuePair**: Read-only data display (non-interactive)

### Card Component
Often used together for structured layouts:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Transaction Details</CardTitle>
  </CardHeader>
  <CardContent className="flex flex-col gap-6">
    <FieldValuePair label="Date" value="Oct 15, 2025" />
    <FieldValuePair label="Amount" value="$50.00" />
  </CardContent>
</Card>
```

## Recommendations

### Immediate (Next Sprint)
1. ✅ Document pattern (this file)
2. ⚠️ Extract to global component
3. ⚠️ Migrate existing usage
4. ⚠️ Add tests

### Future Enhancements
- Consider horizontal variant for compact displays
- Add support for custom icons
- Implement copy-to-clipboard functionality for values
- Add tooltip support for long values

## Status

**Current State**: ⚠️ Pattern identified, not extracted
**Priority**: Low-Medium
**Estimated Effort**: 2-3 hours total
**Recommended Timeline**: Next sprint or when additional usage is needed

## See Also

- [Global Components Documentation](../components/global/)
- [Typography Foundation](../foundations/typography.md)
- [Spacing System](../foundations/spacing.md)
- [Label Component](../components/global/label.md)
- [Card Component](../components/global/card.md)
