---
trigger: always_on
---

# Joot App - Project Rules

*Transaction Tracker with USD/THB Currency Conversion*

## 🎯 Project Overview

**Core Purpose**: A transaction tracker enabling users to view costs between USD and THB currencies with real-time conversion rates.

**Technical Foundation**: Built on Next.js with shadCN components, TailwindCSS, MynaUI Kit, and integrated automated QA testing.

------

## 🏗️ Technical Architecture Standards

### Framework Stack

- **Frontend**: Next.js 14+ (App Router)
- **UI Components**: shadCN/ui (primary component library)
- **Styling**: TailwindCSS with utility-first approach
- **Additional UI Kit**: MynaUI Kit for specialized components
- **Language**: TypeScript (strict mode)
- **Package Manager**: pnpm (preferred)

### Component Development Rules

#### shadCN Component Usage

1. **Primary Source**: Always use shadCN/ui components as the foundation
2. **Customization Approach**: Extend shadCN components rather than creating from scratch
3. **Variant System**: Utilize `class-variance-authority` for component variants
4. **Proper Imports**: Use relative imports for utilities (`../../lib/utils`) not `@/` aliases

#### Component Architecture Requirements

```typescript
// Required patterns for all components
- React.forwardRef for ref forwarding
- TypeScript interfaces for all props
- Proper component composition with shadCN patterns
- Consistent naming conventions (PascalCase for components)
```

#### TailwindCSS Standards

1. **Utility-First**: Use Tailwind utilities over custom CSS
2. **Responsive Design**: Mobile-first approach with responsive utilities
3. **Consistent Spacing**: Use Tailwind's spacing scale (4, 8, 12, 16, etc.)
4. **Color System**: Leverage Tailwind's color palette consistently
5. **No Arbitrary Values**: Avoid arbitrary values unless absolutely necessary

### MynaUI Kit Integration

- **Complementary Usage**: Use MynaUI components where shadCN doesn't provide suitable options
- **Consistent Styling**: Ensure MynaUI components match overall design system
- **Documentation**: Document any MynaUI component customizations

------

## 🎨 Figma Design Fidelity Standards

### Absolute Design Compliance Rule

**CRITICAL REQUIREMENT**: When implementing any component or page from Figma designs, developers must achieve **100% visual fidelity** with zero unauthorized additions.

### Mandatory Design Constraints

1. **No Extra Elements**: Never add UI elements, components, or features not explicitly shown in the Figma design
2. **Exact Layout Match**: Spacing, positioning, and alignment must match the Figma design precisely
3. **Component Inventory**: Only use components that have direct 1:1 correspondence in the Figma design
4. **Content Fidelity**: Use exact text, labels, and copy as specified in Figma
5. **Interactive Elements**: Only make elements interactive if they are designed as interactive in Figma

### Prohibited Implementation Actions

- **Adding "helpful" elements**: No extra buttons, links, icons, or navigation not in design
- **Layout modifications**: No reorganizing based on development preferences
- **Placeholder content**: No content additions not specified in design
- **Unauthorized functionality**: No features not indicated in the Figma design
- **Spacing adjustments**: No extra margins, padding beyond design specifications
- **UX improvements**: No loading states, error messages, or enhancements unless explicitly designed

### Required Verification Process

1. **Visual Comparison**: Side-by-side comparison with Figma design at all breakpoints
2. **Element Audit**: Verify every element in the code exists in the Figma design
3. **Component Matching**: Confirm each shadCN component maps to a Figma design system component
4. **Interaction Matching**: Ensure only designed interactive elements are functional
5. **Content Verification**: Confirm all text, images, and data match Figma specifications

### Exception Handling Protocol

If a Figma design requires functionality not technically possible:

1. **Document the Issue**: Create detailed note explaining the technical limitation
2. **Propose Minimal Solution**: Suggest the smallest possible change to make it functional
3. **Request Design Clarification**: Flag for design team review before implementation
4. **Never Assume**: Do not add elements based on assumptions about user needs

### Implementation Standards

```typescript
// Required comment block for all Figma-based components
/**
 * FIGMA DESIGN IMPLEMENTATION
 * Design URL: [Figma link] | Node: [node ID]
 * Fidelity: 100% - No unauthorized additions
 */
```

Every Figma component must map 1:1 with coded component. If missing: document, halt implementation, no substitutions without approval.

**Mobile-First Requirements**: Start mobile → tablet → desktop exactly as designed. No assumptions for missing breakpoints.

### Quality Gates

**Pre-Implementation**: [ ] Figma URL/node documented [ ] Components exist [ ] Design tokens mapped [ ] Interactivity identified

**Verification**: [ ] Pixel-perfect match [ ] No unauthorized elements [ ] Component mapping correct [ ] Only designed elements interactive

------

## 🧪 Automated Quality Assurance

### Built-in QA Testing Requirements

All new features must include automated QA testing:

#### Testing Coverage

- **Functional**: Component rendering, user interactions, data flow, currency conversion
- **Visual**: Responsive behavior, component states, accessibility compliance
- **Performance**: Load times, bundle size, memory usage

```typescript
// Every new feature should include:
1. Unit tests for component logic
2. Integration tests for user workflows
3. Visual regression tests for UI consistency
4. Performance benchmarks for critical paths
```

------

## 💱 Transaction Tracker Specific Rules

### Currency Conversion Features

1. **Real-time Rates**: Implement live USD/THB exchange rate fetching
2. **Rate Caching**: Cache exchange rates with appropriate TTL
3. **Fallback Handling**: Graceful degradation when rate API is unavailable
4. **Historical Data**: Track and display rate history when relevant

### Transaction Management

1. **Data Persistence**: Use appropriate storage solution (localStorage/database)
2. **Transaction Categories**: Implement flexible categorization system
3. **Search & Filter**: Provide robust transaction search and filtering
4. **Export Options**: Enable data export in common formats (CSV, JSON)

### User Experience Requirements

1. **Fast Input**: Optimize for quick transaction entry
2. **Visual Clarity**: Clear distinction between USD and THB amounts
3. **Mobile-First**: Prioritize mobile usability for on-the-go usage
4. **Offline Capability**: Basic functionality when network is unavailable

------

## 📁 Project Structure Standards

```
/app
├── /components        # shadCN and custom components
│   ├── ui/           # shadCN base components
│   ├── forms/        # Form-specific components
│   ├── charts/       # Data visualization components
│   └── layout/       # Layout and navigation components
├── /lib              # Utilities and helpers
│   ├── utils.ts      # Tailwind merge and clsx utilities
│   ├── currency.ts   # Currency conversion logic
│   └── validations.ts # Form and data validation schemas
├── /hooks            # Custom React hooks
├── /types            # TypeScript type definitions
├── /services         # API and external service integrations
└── /tests            # Test files and utilities
```

------

## 🔄 Development Workflow

### Feature Development Process

1. **Design Review**: Analyze requirements and technical approach
2. **Component Planning**: Identify shadCN components to use/extend
3. **Implementation**: Build feature following architectural standards
4. **QA Testing**: Run automated test suite and manual verification
5. **Performance Check**: Verify performance benchmarks are met
6. **Code Review**: Ensure adherence to project standards
7. **Deployment**: Deploy with appropriate monitoring

### Code Quality Gates

- **TypeScript**: Zero TypeScript errors allowed
- **ESLint**: All linting rules must pass
- **Prettier**: Consistent code formatting enforced
- **Test Coverage**: Minimum 80% coverage for new features
- **Performance Budget**: Bundle size and runtime performance limits

### Git Workflow

- **Branch Naming**: `feature/transaction-list`, `fix/currency-display`
- **Commit Messages**: Conventional commits format
- **Pull Requests**: Required for all changes with QA test results
- **Code Reviews**: Mandatory review focusing on standards compliance

------

## 🎨 Design System Principles

### Visual Consistency

1. **Color Palette**: Use Tailwind's default palette with custom brand colors
2. **Typography**: Consistent font sizes and weights throughout
3. **Spacing**: Maintain consistent spacing using Tailwind's scale
4. **Iconography**: Use Lucide React icons for consistency

### Component Consistency

1. **Naming Conventions**: Clear, descriptive component names
2. **Prop Interfaces**: Consistent prop naming and typing
3. **State Management**: Predictable state patterns across components
4. **Error Handling**: Consistent error states and messaging

### Accessibility Standards

1. **WCAG Compliance**: Meet WCAG 2.1 AA standards minimum
2. **Keyboard Navigation**: Full keyboard accessibility
3. **Screen Readers**: Proper ARIA labels and semantic HTML
4. **Color Contrast**: Minimum 4.5:1 contrast ratio for text

------

## 🚀 Performance Requirements

### Core Web Vitals Targets

- **LCP**: < 2.5 seconds
- **FID**: < 100 milliseconds
- **CLS**: < 0.1

### Optimization Strategies

1. **Code Splitting**: Implement route-based and component-based splitting
2. **Image Optimization**: Use Next.js Image component with proper sizing
3. **Bundle Analysis**: Regular bundle size monitoring and optimization
4. **Caching Strategy**: Implement appropriate caching for API calls and assets

------

## 📋 Definition of Done

A feature is considered complete when:

- [ ] All functional requirements implemented
- [ ] shadCN components used appropriately
- [ ] TailwindCSS standards followed
- [ ] Automated QA tests pass (functional, visual, performance)
- [ ] TypeScript compilation successful with no errors
- [ ] ESLint and Prettier standards met
- [ ] Accessibility requirements verified
- [ ] Performance benchmarks achieved
- [ ] Code reviewed and approved
- [ ] Documentation updated (if applicable)

------

## 🔧 Development Tools & Dependencies

### Required Dependencies

```json
{
  "@shadcn/ui": "latest",
  "tailwindcss": "^3.4.0",
  "next": "^14.0.0",
  "typescript": "^5.0.0",
  "class-variance-authority": "latest",
  "clsx": "latest",
  "tailwind-merge": "latest"
}
```

### Development Dependencies

```json
{
  "@testing-library/react": "latest",
  "@testing-library/jest-dom": "latest",
  "eslint": "latest",
  "prettier": "latest",
  "husky": "latest",
  "lint-staged": "latest"
}
```

------

*These rules evolve with the project. Regular reviews ensure they remain relevant and effective for the Joot app's development goals.*