# Shadows & Elevation Foundation

**Last Updated:** 2025-08-27

## Overview

The Joot App shadow system creates visual hierarchy and depth through consistent elevation patterns. All shadows are designed to be subtle and functional, enhancing usability without overwhelming the interface.

## Shadow Scale

### Predefined Shadow Tokens
```css
/* Tailwind shadow utilities */
shadow-xs  → 0px 1px 2px 0px rgba(0,0,0,0.05)    /* Subtle elevation */
shadow-sm  → 0px 1px 2px 0px rgba(0,0,0,0.05)    /* Small cards */
shadow     → 0px 1px 3px 0px rgba(0,0,0,0.1)     /* Default cards */
shadow-md  → 0px 4px 6px -1px rgba(0,0,0,0.1)    /* Raised elements */
shadow-lg  → 0px 10px 15px -3px rgba(0,0,0,0.1)  /* Modals, dropdowns */
shadow-xl  → 0px 20px 25px -5px rgba(0,0,0,0.1)  /* High elevation */
```

### Custom Application Shadows
Based on analysis of current implementation:

#### Transaction Cards
```css
/* Current implementation */
box-shadow: 0px 1px 2px 0px rgba(0,0,0,0.05);
/* Maps to: shadow-xs */
```

#### Form Elements & Buttons
```css  
/* Select elements */
box-shadow: 0px 1px 2px 0px rgba(0,0,0,0.05);
/* Maps to: shadow-xs */

/* Dropdown content */
box-shadow: 0px 4px 8px 0px rgba(0,0,0,0.1);
/* Maps to: shadow-lg (custom) */
```

## Elevation Hierarchy

### Layer 0: Base Surface
- **Elements**: Page backgrounds, base containers
- **Shadow**: None
- **Usage**: Ground level elements

### Layer 1: Subtle Elevation  
- **Elements**: Cards, form inputs, buttons
- **Shadow**: `shadow-xs`
- **Usage**: Content containers that need minimal separation

### Layer 2: Standard Elevation
- **Elements**: Raised cards, navigation elements
- **Shadow**: `shadow-sm`
- **Usage**: Interactive elements with hover states

### Layer 3: Floating Elements
- **Elements**: Dropdowns, tooltips, popovers
- **Shadow**: `shadow-lg`
- **Usage**: Temporary UI that floats above content

### Layer 4: Modal Elements
- **Elements**: Dialogs, modals, overlays
- **Shadow**: `shadow-xl`
- **Usage**: Highest priority UI that blocks interaction

## Border Radius System

### Standard Radius Values
```css
/* Tailwind radius tokens */
rounded-sm   → 2px   /* Fine details */
rounded      → 4px   /* Small elements */ 
rounded-md   → 6px   /* Form elements */
rounded-lg   → 8px   /* Cards, buttons (standard) */
rounded-xl   → 12px  /* Large containers */
rounded-2xl  → 16px  /* Major sections */
```

### Component-Specific Usage
- **Cards**: `rounded-lg` (8px) - primary standard
- **Buttons**: `rounded-md` (6px) - slightly smaller
- **Inputs**: `rounded-md` (6px) - consistent with buttons  
- **Modals**: `rounded-xl` (12px) - larger for prominence

## Current Implementation Analysis

### ✅ Compliant Usage

#### Global Components
```tsx
// Button component - correct shadow usage
"shadow-xs"                    // Subtle button elevation

// Card component - correct patterns
"rounded-xl border shadow-sm"  // 12px radius with small shadow

// Input component  
"rounded-md shadow-xs"         // 6px radius with subtle shadow
```

### ⚠️ Issues Identified

#### TransactionCard Component
**Problems**: 
1. Hardcoded shadow values instead of tokens
2. Inconsistent radius usage
3. Manual border + shadow combination

```tsx
// Current (Non-compliant)
<div className="rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
<div className="absolute border border-solid border-zinc-200 rounded-[8px]">
```

**Solution**: Use design tokens
```tsx
// Recommended (Compliant)  
<div className="rounded-lg shadow-xs border">
// Eliminates duplicate rounded declarations and uses standard tokens
```

#### Inconsistent Shadow Application
Some components layer shadows with borders unnecessarily:
```tsx
// Current (Redundant)
<div className="border border-zinc-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">

// Recommended (Simplified)
<div className="shadow-xs border"> // Shadow provides elevation, border defines edges
```

## Interactive Shadow States

### Hover Effects
```tsx
// Button hover progression
"shadow-xs hover:shadow-sm"           // Subtle lift on hover

// Card hover effects  
"shadow-sm hover:shadow-md"           // More pronounced lift

// Interactive elements
"transition-shadow duration-200"      // Smooth shadow transitions
```

### Focus States
```tsx
// Focus rings work with shadows
"shadow-xs focus-visible:ring-[3px] focus-visible:ring-primary/50"
// Shadow + focus ring creates clear interactive feedback
```

## Dark Theme Considerations

### Shadow Adjustments
In dark themes, shadows need adjustment for visibility:
```css
/* Light theme */
.light-shadow { box-shadow: 0px 1px 2px 0px rgba(0,0,0,0.05); }

/* Dark theme - increased opacity for visibility */  
.dark-shadow { box-shadow: 0px 1px 2px 0px rgba(0,0,0,0.3); }
```

### Implementation
The current system doesn't show explicit dark theme shadow adjustments, suggesting shadows may need enhancement for dark mode visibility.

## Accessibility

### Visual Hierarchy
Shadows should enhance, not replace, other hierarchy indicators:
- Combine with typography scale
- Use with appropriate color contrast
- Don't rely solely on shadows for important distinctions

### Motion Sensitivity
```tsx
// Respect reduced motion preferences
"transition-shadow duration-200 motion-reduce:transition-none"
```

## Best Practices

### Do's
✅ Use predefined shadow tokens (`shadow-xs`, `shadow-sm`, etc.)
✅ Combine radius and shadow consistently
✅ Apply shadows to enhance functional hierarchy
✅ Use smooth transitions for interactive shadow changes
✅ Consider dark theme shadow visibility

### Don'ts  
❌ Use hardcoded shadow values like `shadow-[0px_1px_2px...]`
❌ Apply multiple conflicting shadows to one element
❌ Use shadows purely for decoration without functional purpose
❌ Mix different radius values on related elements
❌ Ignore motion preferences for shadow transitions

## Component Shadow Patterns

### Card Components
```tsx
// Standard card pattern
<Card className="rounded-xl border shadow-sm">
  <CardHeader className="border-b"> // Internal borders for structure
    <CardContent>                   // No additional shadows needed
```

### Interactive Elements
```tsx
// Button shadow patterns
<Button className="shadow-xs hover:shadow-sm transition-shadow">

// Input focus with shadows
<Input className="shadow-xs focus-visible:shadow-sm focus-visible:ring-2">
```

### Floating UI
```tsx
// Dropdown/popover pattern
<Popover className="rounded-lg border shadow-lg"> // Higher elevation for floating

// Modal pattern  
<Dialog className="rounded-xl shadow-xl">         // Maximum elevation
```

## Status

**Current Compliance**: ⚠️ Mixed
- Global components use appropriate shadow tokens
- TransactionCard uses hardcoded shadow values
- Inconsistent combination of borders and shadows
- Dark theme shadow visibility needs review

**Priority Actions**:
1. Replace hardcoded shadows with `shadow-xs` token in TransactionCard  
2. Simplify border + shadow combinations
3. Standardize radius usage across similar components
4. Enhance dark theme shadow visibility
5. Implement consistent hover/focus shadow states

## Migration Guide

### Step 1: Replace Hardcoded Shadows
```tsx
// Before
<div className="shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">

// After
<div className="shadow-xs">
```

### Step 2: Simplify Radius + Shadow
```tsx
// Before  
<div className="rounded-[8px]">
  <div className="rounded-[8px] shadow-[...]">

// After
<div className="rounded-lg shadow-xs">
```

### Step 3: Consistent Interactive States
```tsx
// Before (static)
<div className="shadow-xs">

// After (interactive)
<div className="shadow-xs hover:shadow-sm transition-shadow">
```