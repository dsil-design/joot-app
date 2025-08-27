# Spacing Foundation

**Last Updated:** 2025-08-27

## Overview

The Joot App spacing system is built on an 8px base unit grid that ensures consistent rhythm and alignment throughout the interface. All spacing values are derived from multiples of this base unit.

## Base Unit System

### 8px Grid Foundation
```
Base unit: 8px
All spacing values are multiples of 8px for consistent alignment
```

### Spacing Scale
```css
/* Tailwind spacing tokens */
0      → 0px      (none)
0.5    → 2px      (0.125rem) - fine borders, minimal gaps
1      → 4px      (0.25rem)  - tight spacing
1.5    → 6px      (0.375rem) - select borders (non-standard)
2      → 8px      (0.5rem)   - base unit
3      → 12px     (0.75rem)  - small gaps
4      → 16px     (1rem)     - standard spacing
5      → 20px     (1.25rem)  - medium gaps
6      → 24px     (1.5rem)   - large spacing
7      → 28px     (1.75rem)  - extra large
8      → 32px     (2rem)     - section spacing
10     → 40px     (2.5rem)   - major spacing
12     → 48px     (3rem)     - large section gaps
16     → 64px     (4rem)     - page-level spacing
```

## Component Spacing Patterns

### Card Components
```tsx
// Standard card padding
<Card className="p-6">           // 24px all around
  <CardHeader className="px-6">  // 24px horizontal
  <CardContent className="px-6"> // 24px horizontal
</Card>

// Compact card variant
<Card className="p-4">           // 16px all around
```

### Layout Containers
```tsx
// Page containers
<div className="px-10 py-16">    // 40px horizontal, 64px vertical
<div className="px-6 py-12">     // 24px horizontal, 48px vertical (mobile)

// Section gaps
<div className="flex flex-col gap-6">  // 24px between sections
<div className="flex flex-col gap-4">  // 16px between elements
```

### Form Elements
```tsx
// Form field spacing
<div className="flex flex-col gap-2">   // 8px between label and input
<div className="flex flex-col gap-4">   // 16px between form fields

// Button spacing
<Button className="px-4 py-2">         // 16px horizontal, 8px vertical
<Button className="px-6 py-3">         // 24px horizontal, 12px vertical (large)
```

### List and Grid Spacing
```tsx
// Transaction list
<div className="flex flex-col gap-3">   // 12px between transactions

// Grid layouts
<div className="grid gap-6">           // 24px grid gaps
<div className="flex gap-4">           // 16px flex gaps
```

## Responsive Spacing

### Mobile-First Approach
```tsx
// Responsive container padding
<div className="px-6 sm:px-8 lg:px-10">
// Mobile: 24px, Small: 32px, Large: 40px

// Responsive section gaps  
<div className="flex flex-col gap-4 sm:gap-6">
// Mobile: 16px, Desktop: 24px
```

### Breakpoint-Specific Spacing
- **Mobile (< 640px)**: Tighter spacing, 16-24px containers
- **Tablet (640px+)**: Standard spacing, 24-32px containers  
- **Desktop (1024px+)**: Generous spacing, 32-40px containers

## Current Implementation Analysis

### ✅ Compliant Usage
Most global components follow the 8px grid system:
```tsx
// Button component - correct spacing
"h-9 px-4 py-2"              // 36px height, 16px horizontal, 8px vertical
"h-10 rounded-md px-6"       // 40px height, 24px horizontal

// Card component - correct spacing  
"gap-6 rounded-xl border py-6" // 24px gaps and vertical padding
"px-6"                         // 24px horizontal padding
```

### ⚠️ Issues Identified

#### TransactionCard Component
**Problem**: Uses hardcoded pixel values instead of Tailwind tokens
```tsx
// Current (Non-compliant)
<div className="p-[24px]">              // Should be p-6
<div className="border border-solid">   // Redundant 'solid' declaration
<div className="rounded-[8px]">         // Should be rounded-lg
```

**Solution**: Migrate to standard tokens
```tsx
// Recommended (Compliant)
<div className="p-6">                   // 24px using token
<div className="border">                // Simplified border
<div className="rounded-lg">            // Standard 8px radius
```

#### Inconsistent Gap Usage
Some layouts mix gap sizes without clear hierarchy:
```tsx
// Current (Inconsistent)
<div className="flex flex-col gap-2">   // 8px
<div className="flex flex-col gap-3">   // 12px
<div className="flex flex-col gap-4">   // 16px

// Recommended (Consistent hierarchy)
<div className="flex flex-col gap-2">   // Tight: label-to-input
<div className="flex flex-col gap-4">   // Standard: between form fields  
<div className="flex flex-col gap-6">   // Loose: between sections
```

## Spacing Hierarchy Guidelines

### Micro Spacing (2-8px)
- Border widths
- Icon-to-text gaps
- Label-to-input spacing
- Button internal padding

### Standard Spacing (8-24px) 
- Element padding
- List item gaps
- Form field spacing
- Card internal spacing

### Macro Spacing (32-64px)
- Section gaps
- Page padding
- Navigation spacing
- Layout container spacing

## Accessibility Considerations

### Touch Targets
Minimum 44px (tap-4.5) touch targets for interactive elements:
```tsx
// Buttons and interactive elements
<Button className="h-10">        // 40px minimum
<Button className="size-10">     // 40x40px for icon buttons

// Form inputs
<Input className="h-10">         // 40px height for easy touch
```

### Focus Areas
Adequate spacing around focusable elements:
```tsx
// Focus ring space consideration
<Button className="focus-visible:ring-[3px]"> // 3px focus ring
// Needs minimum 8px spacing to prevent overlap
```

## Best Practices

### Do's
✅ Use Tailwind spacing tokens (p-4, gap-6, etc.)
✅ Follow the 8px base grid system
✅ Maintain consistent spacing hierarchy
✅ Consider touch target sizes (44px minimum)
✅ Use responsive spacing patterns

### Don'ts
❌ Use arbitrary pixel values like `p-[24px]`
❌ Break the 8px grid with custom spacing
❌ Mix different spacing scales without purpose
❌ Ignore mobile touch target requirements
❌ Use spacing for visual hierarchy alone (combine with typography/color)

## Migration Guide

### Step 1: Replace Hardcoded Values
```tsx
// Before
<div className="p-[24px] gap-[12px]">

// After  
<div className="p-6 gap-3">
```

### Step 2: Standardize Gap Patterns
```tsx
// Before (inconsistent)
<div className="gap-2.5">  // 10px - non-standard

// After (standard)
<div className="gap-3">    // 12px - follows hierarchy
```

### Step 3: Responsive Spacing
```tsx
// Before (fixed)
<div className="px-10">

// After (responsive)
<div className="px-6 sm:px-8 lg:px-10">
```

## Status

**Current Compliance**: ⚠️ Mixed
- Global components mostly follow token system
- TransactionCard uses hardcoded pixel values
- Some components mix arbitrary and token values
- Responsive spacing partially implemented

**Priority Actions**:
1. Replace `p-[24px]` with `p-6` in TransactionCard
2. Standardize gap hierarchy across components
3. Audit mobile touch target sizes
4. Implement consistent responsive spacing patterns