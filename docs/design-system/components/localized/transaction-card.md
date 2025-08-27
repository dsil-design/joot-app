# TransactionCard Component

**Last Updated:** 2025-08-27  
**File Location:** `/src/components/ui/transaction-card.tsx`  
**Type:** Localized Component

## Overview

TransactionCard is a specialized component for displaying transaction information in a consistent card format. It extends the global Card pattern with transaction-specific styling and layout optimizations.

## Relationship to Global Components

**Parent Component**: Card ✅ **IMPLEMENTED**
- Directly extends the global Card and CardContent components
- Inherits all Card styling, theming, and behavior patterns
- Maintains consistency with other card-based UI elements

## Component Analysis

### API Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `amount` | `string` | - | Primary transaction amount with currency |
| `vendor` | `string` | - | Vendor/merchant name |
| `description` | `string` | - | Transaction description |
| `calculatedAmount` | `string` | `undefined` | Optional secondary amount (converted currency) |
| `className` | `string` | - | Additional CSS classes |
| `interactive` | `boolean` | `false` | Enables hover, focus, and click interactions |
| `onClick` | `() => void` | `undefined` | Click handler for interactive cards |

### Phase 2 Implementation

```tsx
interface TransactionCardProps {
  amount: string
  vendor: string
  description: string
  calculatedAmount?: string
  className?: string
  interactive?: boolean
  onClick?: () => void
}

export const TransactionCard = React.memo(function TransactionCard({ 
  // ... props
}: TransactionCardProps) {
  // Optimized with React.memo, useCallback, useMemo
  // Full accessibility support
  // Extends global Card component
})
```

## Design Token Compliance Issues

### ⚠️ Critical Issues Identified

#### 1. Hardcoded Colors
```tsx
// Current (Non-compliant)
bg-[#ffffff]                    // Should use bg-card
text-zinc-950                   // Should use text-card-foreground  
text-[#71717b]                  // Should use text-muted-foreground
text-[#000000]                  // Should use text-foreground
```

**Migration Required:**
```tsx
// Recommended (Compliant)
bg-card                         // Semantic card background
text-card-foreground            // Primary text on cards
text-muted-foreground          // Secondary text
text-foreground                // Emphasis text
```

#### 2. Hardcoded Typography
```tsx
// Current (Non-compliant)
font-['Inter:Medium',_sans-serif] font-medium
font-['Inter:Regular',_sans-serif] font-normal
```

**Migration Required:**
```tsx
// Recommended (Compliant)
font-medium text-card-foreground    // Title styling
font-normal text-muted-foreground  // Supporting text
```

#### 3. Non-Standard Spacing
```tsx
// Current (Non-compliant)
p-[24px]                        // Should use p-6
rounded-[8px]                   // Should use rounded-lg
```

**Migration Required:**
```tsx
// Recommended (Compliant)
p-6                             // 24px using design token
rounded-lg                      // 8px radius token
```

## Content Structure

### Layout Hierarchy
1. **Container**: Full-width card wrapper
2. **Card Background**: White background with border and shadow
3. **Content Area**: Padded content with flex layout
4. **Primary Row**: Description/vendor on left, amounts on right
5. **Text Columns**: Left column (description + vendor), Right column (amounts)

### Typography Scale
- **Description**: 14px Medium, 20px line-height
- **Vendor**: 14px Regular, 20px line-height  
- **Primary Amount**: 20px Medium, 28px line-height
- **Calculated Amount**: 14px Regular, 20px line-height

## Recommended Migration

### Step 1: Use Global Card Component
```tsx
import { Card, CardContent } from '@/components/ui/card'

export function TransactionCard({ amount, vendor, description, calculatedAmount, className }: TransactionCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        {/* Transaction content */}
      </CardContent>
    </Card>
  )
}
```

### Step 2: Apply Design Tokens
```tsx
export function TransactionCard({ amount, vendor, description, calculatedAmount, className }: TransactionCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between w-full">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <p className="font-medium text-card-foreground text-sm leading-5 truncate">
              {description}
            </p>
            <p className="font-normal text-muted-foreground text-sm leading-5 truncate">
              {vendor}
            </p>
          </div>
          <div className="flex flex-col gap-1 items-end text-right ml-4">
            <p className="font-medium text-foreground text-xl leading-7">
              {amount}
            </p>
            {calculatedAmount && (
              <p className="font-normal text-muted-foreground text-sm leading-5">
                {calculatedAmount}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Usage Examples

### Basic Transaction (Static)
```tsx
<TransactionCard
  amount="$25.50"
  vendor="Coffee Shop"
  description="Morning coffee"
/>
```

### With Currency Conversion
```tsx
<TransactionCard
  amount="$25.50"
  calculatedAmount="฿820.32"
  vendor="Coffee Shop"
  description="Morning coffee"
/>
```

### Interactive Transaction Card
```tsx
<TransactionCard
  amount="$25.50"
  calculatedAmount="฿820.32"
  vendor="Coffee Shop"
  description="Morning coffee"
  interactive
  onClick={() => handleTransactionClick(transaction.id)}
/>
```

### In Transaction List
```tsx
<div className="flex flex-col gap-3">
  {transactions.map((transaction) => (
    <TransactionCard
      key={transaction.id}
      amount={transaction.displayAmount}
      calculatedAmount={transaction.convertedAmount}
      vendor={transaction.vendor}
      description={transaction.description}
      interactive
      onClick={() => handleTransactionDetails(transaction.id)}
    />
  ))}
</div>
```

### Custom Styling
```tsx
<TransactionCard
  amount="$1,250.00"
  vendor="Monthly Rent"
  description="Apartment payment"
  className="ring-2 ring-amber-200 bg-amber-50"
  interactive
  onClick={() => handleLargeTransaction()}
/>
```

## Accessibility Features

### Phase 2 Implementation ✅ **COMPLETE**

#### Keyboard Navigation
- **Tab Navigation**: Interactive cards are keyboard focusable with `tabIndex={0}`
- **Activation**: Both Enter and Space keys trigger onClick handler
- **Focus Indicators**: Clear focus ring using design system tokens

#### Screen Reader Support
- **Dynamic ARIA Labels**: Comprehensive labels that include transaction details
- **Semantic Grouping**: Content grouped with `role="group"` and proper labels
- **Individual Element Labels**: Each data point has descriptive `aria-label`
- **Title Attributes**: Hover tooltips for truncated content

#### Interactive States
```tsx
// Focus management
<Card 
  tabIndex={interactive ? 0 : undefined}
  role={interactive ? 'button' : undefined}
  aria-label="Transaction: Morning coffee, Vendor: Coffee Shop, Amount: $25.50, Converted: ฿820.32"
  className="focus-within:ring-2 focus-within:ring-primary/50"
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }}
>
```

#### Content Structure
```tsx
// Semantic content grouping
<div role="group" aria-labelledby="transaction-details">
  <p id="transaction-details" title="Morning coffee">Morning coffee</p>
  <p title="Coffee Shop" aria-label="Vendor: Coffee Shop">Coffee Shop</p>
</div>
<div role="group" aria-label="Transaction amounts">
  <p title="$25.50" aria-label="Primary amount: $25.50">$25.50</p>
  <p title="฿820.32" aria-label="Converted amount: ฿820.32">฿820.32</p>
</div>
```

#### WCAG 2.1 AA Compliance
- ✅ **Color Contrast**: All text meets 4.5:1 minimum contrast ratio
- ✅ **Touch Targets**: 44px minimum height maintained through Card padding
- ✅ **Focus Indicators**: 2px minimum focus ring visibility
- ✅ **Text Alternatives**: Complete alternative text for all content
- ✅ **Keyboard Access**: Full keyboard navigation support

## Integration with HomeTransactionCard

The TransactionCard serves as the base component for HomeTransactionCard:

```tsx
// HomeTransactionCard wraps TransactionCard with business logic
export function HomeTransactionCard({ transaction }: HomeTransactionCardProps) {
  // ... currency calculation logic
  
  return (
    <TransactionCard
      amount={amounts.primary}
      calculatedAmount={amounts.secondary || undefined}
      vendor={transaction.vendors?.name || 'Unknown Vendor'}
      description={transaction.description || 'No description'}
    />
  )
}
```

## Performance Considerations

### Current Issues
- Excessive CSS declarations with hardcoded values
- Redundant styling declarations
- Non-optimized class concatenation

### Optimizations
- Use design token classes for better CSS optimization
- Reduce redundant style declarations
- Leverage Tailwind's built-in optimizations

## Status

**Compliance**: ✅ Excellent - Phase 1 Complete (2025-08-27)
- All hardcoded color values replaced with semantic tokens
- Standard typography declarations using design tokens  
- Consistent spacing tokens throughout
- Simplified and optimized styling patterns

**Phase 1 Improvements Completed**:
1. ✅ Replaced `bg-[#ffffff]` with `bg-card`
2. ✅ Replaced `text-[#71717b]` with `text-muted-foreground`
3. ✅ Replaced `text-[#000000]` with `text-foreground`
4. ✅ Removed `font-['Inter:*']` declarations
5. ✅ Replaced `p-[24px]` with `p-6`
6. ✅ Replaced `rounded-[8px]` with `rounded-lg`
7. ✅ Simplified shadow to `shadow-xs`
8. ✅ Optimized class structure and removed redundancies

**Migration Status**: ✅ Complete - Phase 2 Finished
- Component now fully compliant with design system
- Improved performance through token optimization and React.memo
- Better theme switching support
- Enhanced accessibility with WCAG 2.1 AA compliance
- Interactive states and keyboard navigation implemented
- Proper integration with global Card component

## Phase 2 Enhancement Checklist

### Architecture Improvements ✅ **COMPLETE**
- ✅ Extend global Card component as base
- ✅ Implement React.memo for performance optimization
- ✅ Add useCallback and useMemo for efficient re-renders
- ✅ Use cn() utility for clean class merging
- ✅ Optimize component structure and props

### Interactive Features ✅ **COMPLETE**
- ✅ Add interactive prop for hover/focus states
- ✅ Implement onClick handler support
- ✅ Add keyboard navigation (Enter/Space keys)
- ✅ Include smooth shadow transitions
- ✅ Focus management with design system tokens

### Accessibility Enhancements ✅ **COMPLETE**
- ✅ Comprehensive ARIA labels and descriptions
- ✅ Semantic HTML structure with role attributes
- ✅ Screen reader friendly content grouping
- ✅ Title attributes for truncated content
- ✅ Keyboard accessibility implementation
- ✅ WCAG 2.1 AA compliance verification

### Performance Optimizations ✅ **COMPLETE**
- ✅ React.memo implementation to prevent unnecessary re-renders
- ✅ useCallback for event handlers
- ✅ useMemo for computed aria labels
- ✅ Efficient class name composition
- ✅ Minimal DOM structure

### Future Considerations
- [ ] Loading state variant for async operations
- [ ] Error state styling for failed transactions
- [ ] Animation variants for list additions/removals
- [ ] Skeleton loading state integration
- [ ] Drag and drop support for transaction reordering

## Best Practices for Localized Components

### Do's
✅ Extend global components when possible  
✅ Use semantic design tokens consistently  
✅ Document relationship to parent components  
✅ Include business logic documentation  
✅ Maintain accessibility standards

### Don'ts
❌ Duplicate global component styling  
❌ Use hardcoded values instead of tokens  
❌ Break design system consistency  
❌ Ignore responsive design patterns  
❌ Skip accessibility considerations

## Future Vision

TransactionCard should evolve to:
1. **Extend Global Card**: Build on established card patterns
2. **Full Token Compliance**: Use only design system tokens
3. **Enhanced Interactivity**: Support selection, hover, focus states
4. **Accessibility First**: Screen reader friendly, keyboard navigable
5. **Performance Optimized**: Minimal CSS footprint, efficient rendering