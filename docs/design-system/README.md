# Joot App Design System

**Last Updated:** 2025-10-21

## Overview

The Joot App design system provides a comprehensive set of design foundations, components, and patterns to ensure consistency and scalability across the application. This documentation serves as the source of truth for all UI components and design decisions.

## Design Principles

### Consistency
- All components follow established design tokens for colors, typography, spacing, and shadows
- Consistent interaction patterns across similar component types
- Unified visual language throughout the application

### Accessibility
- Semantic HTML structure with proper ARIA attributes
- Focus management and keyboard navigation support
- Color contrast compliance
- Screen reader compatibility

### Performance
- Lightweight components with minimal bundle impact
- Efficient CSS-in-JS implementation using Tailwind CSS
- Tree-shakable component architecture

### Scalability
- Clear separation between global and localized components
- Token-based design system for easy theme maintenance
- Component composition patterns for flexible layouts

## Architecture

### Component Classification

**Global Components**: Reusable across the entire application
- Located in `/src/components/ui/`
- Follow strict design token compliance
- Minimal customization allowed
- Examples: Button, Card, Input, Avatar

**Localized Components**: Feature-specific implementations
- May extend global components with specific business logic
- Located in various feature directories
- Examples: TransactionCard, HomeTransactionCard

## Design Tokens

### Color System
- **Primary Scale**: Zinc (50-950) for neutral colors
- **Accent Colors**: Blue for primary actions, Red for destructive actions
- **Semantic Tokens**: Background, foreground, muted, accent, destructive
- **Theme Support**: Light and dark mode variants

### Typography
- **Font Stack**: Inter (Medium, Regular) with system fallbacks
- **Scale**: 14px (body), 20px (headers), 30px (page titles)
- **Line Heights**: Calculated for optimal readability

### Spacing
- **Base Unit**: 8px grid system
- **Standard Increments**: 8px, 16px, 24px, 32px
- **Component Padding**: Consistent across similar components

### Shadows & Borders
- **Border Radius**: 8px standard, 6px for smaller elements
- **Shadows**: Subtle shadow-xs for elevation
- **Border Colors**: Zinc-200 for light borders

## Documentation Structure

```
docs/design-system/
├── README.md (this file)
├── ANALYSIS_REPORT.md (comprehensive audit & recommendations)
├── TOKEN_AUDIT.md (design token compliance audit)
├── foundations/
│   ├── colors.md
│   ├── typography.md
│   ├── spacing.md
│   ├── shadows.md
│   ├── date-formatting.md
│   └── formatting.md
├── components/
│   ├── global/
│   │   ├── card.md
│   │   ├── button.md
│   │   ├── input.md
│   │   └── avatar.md
│   ├── localized/
│   │   ├── transaction-card.md
│   │   └── home-transaction-card.md
│   └── page-specific/
│       ├── add-transaction-footer.md
│       └── sidebar-navigation.md (NEW - Oct 21, 2025)
└── patterns/
    ├── layouts.md
    ├── interactions.md
    ├── field-value-pair.md (Oct 2025)
    └── dashboard-summary.md (NEW - Oct 21, 2025)
```

## Usage Guidelines

### For Developers
1. Always use global components when possible
2. Extend global components through composition, not modification
3. Use design tokens instead of hardcoded values
4. Follow established naming conventions
5. Include accessibility attributes

### For Designers
1. Reference this documentation when creating new designs
2. Use established component patterns before creating new ones
3. Maintain consistency with existing design tokens
4. Consider both light and dark mode implications

## Compliance Status

**Overall Compliance**: ✅ Excellent (8.7/10) - Continuous improvements through October 2025

### Recent Achievements (October 2025)
- ✅ **Sidebar Navigation Component** (October 21): Modern primary sidebar with 10/10 compliance score, WCAG 2.1 AA accessible
- ✅ **Home Page Dashboard** (October 21): Redesigned with monthly summary card, 9.5/10 compliance score
- ✅ **Shadow Token Migration**: Home page migrated from hardcoded shadows to proper `shadow-sm` token
- ✅ **Modal Dialog Pattern**: Desktop/mobile responsive patterns consistently implemented
- ✅ **Server/Client Architecture**: Proper Next.js 15 patterns with modal state management
- ✅ **TransactionCard Phase 1 & 2 Complete**: Fully refactored with design tokens, accessibility, and performance optimizations
- ✅ **Transaction Detail Pages Implemented**: View and edit pages with comprehensive functionality
- ✅ **Color Token Usage**: Improved from ~70% to 96% compliance (up from 95%)
- ✅ **Component Consistency**: Achieved 95% target (up from 85%)
- ✅ **Documentation**: Comprehensive design system docs maintained as source of truth

### Remaining Issues (Minor)
- ⚠️ **Shadow Tokens**: Some hardcoded shadow values in 3 files (estimated fix: 1-2 hours) - improved from 4 files
- ⚠️ **Color Tokens**: 1 instance of hardcoded color (estimated fix: 10 minutes) - improved from 2 instances
- ⚠️ **Pattern Extraction**: FieldValuePair pattern identified but not yet extracted (estimated: 1 hour)

### Current Compliance Scores
- **Foundation Tokens**: 9/10 ✅
- **Global Components**: 9/10 ✅
- **Color System**: 9.5/10 ✅ (improved)
- **Typography**: 8/10 ✅
- **Spacing System**: 9/10 ✅
- **Shadow System**: 7.5/10 ✅ (improved from 7/10)
- **Localized Components**: 9/10 ✅
- **Page Implementations**: 8/10 ✅ (new category)

See [ANALYSIS_REPORT.md](./ANALYSIS_REPORT.md) for detailed audit results and recommendations.

## Getting Started

1. Review the [foundations documentation](./foundations/) to understand design tokens
2. Explore [global components](./components/global/) for reusable UI elements
3. Check [localized components](./components/localized/) for feature-specific implementations
4. Follow [patterns documentation](./patterns/) for layout and interaction guidance

## Contributing

When adding new components or modifying existing ones:
1. Ensure compliance with design token system
2. Update documentation with any changes
3. Include accessibility considerations
4. Test both light and dark mode variants
5. Validate against existing pattern guidelines