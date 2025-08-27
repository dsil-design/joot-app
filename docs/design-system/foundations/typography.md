# Typography Foundation

**Last Updated:** 2025-08-27

## Overview

The Joot App typography system is based on the Inter font family with carefully selected weights and sizes to ensure readability and consistency across all devices and contexts.

## Font Stack

### Primary Font: Inter
```css
--font-geist-sans: 'Geist Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
```

**Note**: While the CSS variable is named `geist-sans`, the actual implementation uses Inter font family.

### Fallback Stack
System fonts are used as fallbacks to ensure text remains readable if Inter fails to load:
- `system-ui`
- `-apple-system`
- `BlinkMacSystemFont`
- `'Segoe UI'`
- `Roboto`
- `Oxygen`
- `Ubuntu`
- `Cantarell`
- `'Open Sans'`
- `'Helvetica Neue'`
- `sans-serif`

## Font Weights

### Available Weights
- **Regular (400)**: Body text, descriptions, secondary information
- **Medium (500)**: Headings, emphasized text, button labels
- **Semibold (600)**: Page titles, section headers (used in global components)

### Usage Guidelines
```tsx
// Body text - Regular (400)
<p className="font-normal">Regular body text</p>

// Emphasized text - Medium (500)
<p className="font-medium">Emphasized content</p>

// Headings - Semibold (600)
<h1 className="font-semibold">Page title</h1>
```

## Type Scale

### Size Hierarchy
```css
/* Small text - labels, captions */
12px (0.75rem) - text-xs
line-height: 16px (1rem)

/* Body text - primary content */
14px (0.875rem) - text-sm
line-height: 20px (1.25rem)

/* Base text - standard size */
16px (1rem) - text-base
line-height: 24px (1.5rem)

/* Subheadings */
20px (1.25rem) - text-xl
line-height: 28px (1.75rem)

/* Page headings */
30px (1.875rem) - text-3xl
line-height: 36px (2.25rem)

/* Large headings */
40px (2.5rem) - text-4xl
line-height: 44px (2.75rem)
```

### Component-Specific Usage

#### Transaction Cards
- **Description**: 14px Medium, 20px line-height
- **Vendor**: 14px Regular, 20px line-height  
- **Amount**: 20px Medium, 28px line-height
- **Calculated Amount**: 14px Regular, 20px line-height

#### Page Headers
- **Home Title**: 40px Medium, 44px line-height
- **Section Headers**: 20px Medium, 28px line-height
- **All Transactions**: 30px Medium, 36px line-height

#### Navigation Elements
- **Button Text**: 14px Medium, 20px line-height
- **Menu Items**: 14px Regular, 20px line-height
- **Labels**: 12px Regular, 16px line-height

## Implementation Patterns

### Tailwind CSS Classes
```tsx
// Recommended approach - using Tailwind utilities
<h1 className="text-4xl font-medium leading-10">Page Title</h1>
<p className="text-sm font-normal leading-5">Body text</p>
<span className="text-xl font-medium leading-7">Subheading</span>
```

### CSS Custom Properties
```css
/* Available custom properties */
.heading-large {
  font-family: var(--font-geist-sans);
  font-size: 2.5rem;      /* 40px */
  font-weight: 500;       /* Medium */
  line-height: 2.75rem;   /* 44px */
}

.body-text {
  font-family: var(--font-geist-sans);
  font-size: 0.875rem;    /* 14px */
  font-weight: 400;       /* Regular */
  line-height: 1.25rem;   /* 20px */
}
```

## Accessibility

### Line Height Ratios
All line heights maintain optimal readability ratios:
- **Small text (12-14px)**: 1.33-1.43 ratio
- **Body text (16px)**: 1.5 ratio  
- **Headings (20px+)**: 1.4-1.1 ratio (tighter for large text)

### Contrast Requirements
Typography colors meet WCAG 2.1 AA standards:
- **Primary text**: 21:1 contrast ratio (zinc-950 on white)
- **Secondary text**: 4.8:1 contrast ratio (zinc-500 on white)
- **Muted text**: 4.5:1 contrast ratio minimum

## Current Issues & Migration Needs

### ⚠️ Compliance Issues Identified

#### TransactionCard Component
**Problem**: Uses hardcoded Inter font references
```tsx
// Current (Non-compliant)
<div className="font-['Inter:Medium',_sans-serif] font-medium">
<div className="font-['Inter:Regular',_sans-serif] font-normal">
```

**Solution**: Migrate to design tokens
```tsx
// Recommended (Compliant)
<div className="font-medium text-card-foreground">
<div className="font-normal text-muted-foreground">
```

#### Color Integration
Some components mix typography with hardcoded colors instead of semantic tokens:
```tsx
// Current (Non-compliant)
<p className="text-[#000000]">Black text</p>
<p className="text-[#71717b]">Gray text</p>

// Recommended (Compliant)  
<p className="text-foreground">Primary text</p>
<p className="text-muted-foreground">Secondary text</p>
```

## Best Practices

### Do's
✅ Use semantic font weight classes (`font-medium`, `font-normal`)
✅ Apply consistent line heights for similar content types
✅ Combine typography with semantic color tokens
✅ Test readability across different screen sizes
✅ Maintain hierarchy through size and weight, not just color

### Don'ts
❌ Use hardcoded font family declarations
❌ Mix different font families within the interface
❌ Use font weights outside the approved set (400, 500, 600)
❌ Apply custom line heights without design system approval
❌ Rely solely on color to create visual hierarchy

## Component Typography Patterns

### Card Components
```tsx
// Standard card content pattern
<Card>
  <CardHeader>
    <CardTitle className="text-lg font-semibold leading-none">
      Card Title
    </CardTitle>
    <CardDescription className="text-sm text-muted-foreground">
      Supporting description
    </CardDescription>
  </CardHeader>
  <CardContent className="text-sm">
    Card body content
  </CardContent>
</Card>
```

### Form Elements
```tsx
// Input labels and helpers
<Label className="text-sm font-medium leading-none">
  Field Label
</Label>
<Input className="text-sm" />
<p className="text-xs text-muted-foreground">
  Helper text
</p>
```

## Status

**Current Compliance**: ⚠️ Mixed
- Font stack properly defined in CSS
- Consistent scale and weights established
- Some components use hardcoded Inter references
- Color integration needs improvement

**Priority Actions**:
1. Remove hardcoded `font-['Inter:*']` declarations
2. Migrate to semantic color + typography tokens
3. Standardize component typography patterns
4. Audit mobile typography scaling