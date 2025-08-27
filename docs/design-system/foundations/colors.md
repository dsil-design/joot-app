# Color Foundation

**Last Updated:** 2025-08-27

## Overview

The Joot App color system is built on a structured token-based approach that supports both light and dark themes. All colors are defined as CSS custom properties and mapped to semantic meanings.

## Color Scales

### Zinc Scale (Primary Neutral)
```css
--zinc-50: #fafafa   /* Lightest backgrounds */
--zinc-100: #f4f4f5  /* Light backgrounds, subtle borders */
--zinc-200: #e4e4e7  /* Default borders, dividers */
--zinc-300: #d4d4d8  /* Hover states, disabled borders */
--zinc-400: #9f9fa9  /* Placeholder text, disabled text */
--zinc-500: #71717b  /* Secondary text, icons */
--zinc-600: #52525c  /* Body text, labels */
--zinc-700: #3f3f46  /* Headers, important text */
--zinc-800: #27272a  /* High emphasis text */
--zinc-900: #18181b  /* Highest emphasis text */
--zinc-950: #09090b  /* Maximum contrast text */
```

### Accent Color Scales

#### Blue (Primary Actions)
```css
--blue-50: #eff6ff
--blue-100: #dbeafe
--blue-200: #bedbff
--blue-300: #8ec5ff
--blue-400: #51a2ff
--blue-500: #2b7fff
--blue-600: #155dfc  /* Primary brand color */
--blue-700: #1447e6
--blue-800: #193cb8
--blue-900: #1c398e
--blue-950: #162456
```

#### Red (Destructive Actions)
```css
--red-50: #fef2f2
--red-100: #ffe2e2
--red-200: #ffc9c9
--red-300: #ffa2a2
--red-400: #ff6467
--red-500: #fb2c36
--red-600: #e7000b   /* Destructive actions */
--red-700: #c10007
--red-800: #9f0712
--red-900: #82181a
--red-950: #460809
```

#### Green (Success States)
```css
--green-50: #f0fdf4
--green-100: #dcfce7
--green-200: #b9f8cf
--green-300: #7bf1a8
--green-400: #05df72
--green-500: #00c951
--green-600: #00a63e
--green-700: #008236
--green-800: #016630
--green-900: #0d542b
--green-950: #052e16
```

#### Amber (Warning States)
```css
--amber-50: #fffbeb
--amber-100: #fef3c6
--amber-200: #fee685
--amber-300: #ffd230
--amber-400: #ffba00
--amber-500: #fd9a00
--amber-600: #e17100
--amber-700: #bb4d00
--amber-800: #973c00
--amber-900: #7b3306
--amber-950: #461901
```

## Semantic Color Tokens

### Light Theme
```css
--background: var(--white)           /* Page backgrounds */
--foreground: var(--zinc-950)        /* Primary text */
--muted: var(--zinc-100)             /* Subtle backgrounds */
--muted-foreground: var(--zinc-500)  /* Secondary text */
--card: var(--white)                 /* Card backgrounds */
--card-foreground: var(--zinc-950)   /* Text on cards */
--border: var(--zinc-200)            /* Default borders */
--input: var(--zinc-200)             /* Input borders */
--primary: var(--blue-600)           /* Primary actions */
--primary-foreground: var(--white)   /* Text on primary */
--secondary: var(--zinc-100)         /* Secondary actions */
--secondary-foreground: var(--zinc-900) /* Text on secondary */
--destructive: var(--red-600)        /* Destructive actions */
--destructive-foreground: var(--white) /* Text on destructive */
```

### Dark Theme
```css
--background: var(--zinc-950)        /* Page backgrounds */
--foreground: var(--zinc-50)         /* Primary text */
--muted: var(--zinc-800)             /* Subtle backgrounds */
--muted-foreground: var(--zinc-400)  /* Secondary text */
--card: var(--zinc-900)              /* Card backgrounds */
--card-foreground: var(--zinc-50)    /* Text on cards */
--border: var(--zinc-800)            /* Default borders */
--input: var(--zinc-800)             /* Input borders */
--primary: var(--blue-600)           /* Primary actions */
--primary-foreground: var(--zinc-900) /* Text on primary */
--secondary: var(--zinc-800)         /* Secondary actions */
--secondary-foreground: var(--zinc-50) /* Text on secondary */
--destructive: var(--red-700)        /* Destructive actions */
--destructive-foreground: var(--zinc-50) /* Text on destructive */
```

## Usage Guidelines

### Do's
✅ Use semantic tokens (e.g., `text-foreground`) instead of primitive tokens (e.g., `text-zinc-950`)
✅ Reference tokens through Tailwind classes or CSS custom properties
✅ Test color combinations in both light and dark themes
✅ Ensure sufficient contrast ratios for accessibility (4.5:1 minimum for normal text)

### Don'ts
❌ Use hardcoded hex values in components
❌ Mix primitive tokens with semantic tokens inconsistently
❌ Override token values at the component level
❌ Use colors that don't exist in the established scales

## Accessibility

All color combinations have been tested for WCAG 2.1 AA compliance:

- **Background/Foreground**: 21:1 contrast ratio
- **Muted text**: 4.8:1 contrast ratio
- **Primary buttons**: 4.7:1 contrast ratio
- **Destructive actions**: 5.2:1 contrast ratio

## Implementation Examples

### Tailwind CSS Classes
```tsx
// Correct - using semantic tokens
<div className="bg-background text-foreground">
<p className="text-muted-foreground">Secondary text</p>
<button className="bg-primary text-primary-foreground">Primary Action</button>

// Incorrect - using primitive tokens directly
<div className="bg-white text-zinc-950">
<p className="text-zinc-500">Secondary text</p>
<button className="bg-blue-600 text-white">Primary Action</button>
```

### CSS Custom Properties
```css
/* Correct - using semantic tokens */
.custom-element {
  background: var(--color-background);
  color: var(--color-foreground);
  border: 1px solid var(--color-border);
}

/* Incorrect - using hardcoded values */
.custom-element {
  background: #ffffff;
  color: #09090b;
  border: 1px solid #e4e4e7;
}
```

## Color Token Migration

For existing components using hardcoded colors, follow this migration pattern:

### Before (Non-compliant)
```tsx
<div className="bg-[#ffffff] border border-solid border-zinc-200">
  <p className="text-zinc-950">Title</p>
  <p className="text-[#71717b]">Description</p>
</div>
```

### After (Compliant)
```tsx
<div className="bg-card border border-solid border-border">
  <p className="text-card-foreground">Title</p>
  <p className="text-muted-foreground">Description</p>
</div>
```

## Status

**Current Compliance**: ⚠️ Partial
- Semantic tokens defined and available
- Some components still use hardcoded values
- Dark theme tokens fully implemented

**Priority Issues**:
1. TransactionCard uses hardcoded `#ffffff` and `#71717b`
2. Some app pages mix semantic and primitive tokens
3. Inconsistent border color usage across components