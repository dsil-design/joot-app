# Testing Documentation

This document provides comprehensive guidance on testing the Joot application, including unit tests, integration tests, end-to-end tests, accessibility tests, and performance tests.

## Test Architecture

The Joot application uses a comprehensive testing strategy with multiple layers:

1. **Unit Tests** - Individual component and function testing
2. **Integration Tests** - Multi-component interaction testing  
3. **End-to-End Tests** - Full user workflow testing
4. **Accessibility Tests** - WCAG compliance testing
5. **Performance Tests** - Rendering and memory testing

## Test Configuration

### Jest Configuration

Configuration file: `jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### Playwright Configuration

Configuration file: `playwright.config.ts`

- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Timeout**: 30 seconds per test
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: On failure only
- **Videos**: On first retry

## Running Tests

### All Tests

```bash
# Run all test suites
npm run test:all

# Run with coverage
npm run test:coverage

# CI pipeline (coverage + e2e)
npm run test:ci
```

### Specific Test Types

```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Accessibility tests
npm run test:accessibility

# Performance tests
npm run test:performance

# Watch mode for development
npm run test:watch
```

### Playwright E2E Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run with UI for debugging
npm run test:e2e:ui

# Run in headed mode (visible browser)
npm run test:e2e:headed
```

## Test Categories

### Unit Tests

**Location:** `__tests__/` folders alongside components
**Purpose:** Test individual components and utilities in isolation

#### Examples:
- Component rendering
- Hook behavior
- Utility function logic
- Form validation

#### Best Practices:
- Test component props and state
- Mock external dependencies
- Test error scenarios
- Verify accessibility attributes

```typescript
// Example unit test
import { render, screen } from '@testing-library/react';
import { TransactionCard } from '@/components/TransactionCard';

describe('TransactionCard', () => {
  it('renders transaction data correctly', () => {
    const transaction = {
      id: '1',
      description: 'Test transaction',
      amount_usd: 100,
      amount_thb: 3500,
    };
    
    render(<TransactionCard transaction={transaction} />);
    
    expect(screen.getByText('Test transaction')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });
});
```

### Integration Tests

**Location:** `__tests__/integration/`
**Purpose:** Test component interactions and data flow

#### Examples:
- Form submission workflows
- API integration with components
- State management across components
- User authentication flows

#### Best Practices:
- Test realistic user scenarios
- Mock external APIs appropriately
- Test error handling
- Verify data persistence

```typescript
// Example integration test
describe('Transaction Creation Flow', () => {
  it('creates transaction and updates list', async () => {
    const user = userEvent.setup();
    render(<TransactionApp />);
    
    // Fill out form
    await user.type(screen.getByLabelText('Description'), 'Coffee');
    await user.type(screen.getByLabelText('Amount'), '5.50');
    await user.click(screen.getByText('Add Transaction'));
    
    // Verify transaction appears in list
    expect(await screen.findByText('Coffee')).toBeInTheDocument();
  });
});
```

### End-to-End Tests

**Location:** `e2e/`
**Purpose:** Test complete user workflows in real browser environment

#### Test Scenarios:
- User registration and login
- Complete transaction management workflow
- Vendor and payment method management
- Currency conversion functionality
- Mobile responsive behavior

#### Best Practices:
- Test happy path and error scenarios
- Use page object models for reusability
- Test across multiple browsers
- Verify visual elements and interactions

```typescript
// Example e2e test
test('user can create and manage transactions', async ({ page }) => {
  await page.goto('/login');
  
  // Login
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Navigate to transactions
  await page.click('text=Add Transaction');
  
  // Fill form
  await page.fill('[name="description"]', 'Test transaction');
  await page.fill('[name="amount"]', '25.00');
  await page.selectOption('[name="vendor"]', 'Starbucks');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Verify transaction created
  await expect(page.locator('text=Test transaction')).toBeVisible();
});
```

### Accessibility Tests

**Location:** `__tests__/accessibility/`
**Purpose:** Ensure WCAG compliance and screen reader compatibility

#### Test Coverage:
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation
- Color contrast ratios
- Focus management

#### Tools Used:
- jest-axe for automated a11y testing
- Manual keyboard navigation testing
- Screen reader testing

```typescript
// Example accessibility test
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<TransactionForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('supports keyboard navigation', () => {
    render(<TransactionForm />);
    const firstInput = screen.getByLabelText('Description');
    
    firstInput.focus();
    expect(firstInput).toHaveFocus();
    
    userEvent.tab();
    expect(screen.getByLabelText('Amount')).toHaveFocus();
  });
});
```

### Performance Tests

**Location:** `__tests__/performance/`
**Purpose:** Ensure application performance meets standards

#### Test Areas:
- Component render times
- Memory usage patterns
- Bundle size optimization
- Core Web Vitals metrics

#### Metrics Tracked:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Memory leaks

```typescript
// Example performance test
describe('Performance', () => {
  it('renders large transaction list efficiently', async () => {
    const startTime = performance.now();
    
    const transactions = Array.from({ length: 1000 }, (_, i) => ({
      id: i.toString(),
      description: `Transaction ${i}`,
      amount_usd: Math.random() * 100,
    }));
    
    render(<TransactionList transactions={transactions} />);
    
    const renderTime = performance.now() - startTime;
    expect(renderTime).toBeLessThan(100); // 100ms threshold
  });
});
```

## Test Data Management

### Mock Data

**Location:** `__tests__/mocks/`
**Purpose:** Consistent test data across test suites

#### Categories:
- User data
- Transaction data
- Vendor data
- Payment method data
- Exchange rate data

### Database Testing

**Environment:** Supabase local development
**Purpose:** Test database operations and RLS policies

```bash
# Start local Supabase for testing
supabase start

# Run database tests
npm run test:supabase
```

## Continuous Integration

### GitHub Actions Integration

Tests run automatically on:
- Pull request creation
- Push to main branch
- Manual workflow dispatch

### Test Pipeline:

1. **Install Dependencies**
2. **Run Linting** (`npm run lint`)
3. **Run Unit Tests** (`npm run test:unit`)
4. **Run Integration Tests** (`npm run test:integration`)
5. **Run Accessibility Tests** (`npm run test:accessibility`)
6. **Run Performance Tests** (`npm run test:performance`)
7. **Build Application** (`npm run build`)
8. **Run E2E Tests** (`npm run test:e2e`)

### Coverage Requirements

- **Minimum Coverage**: 70% for all metrics
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Debugging Tests

### Jest Tests

```bash
# Run specific test file
npm test -- TransactionCard.test.tsx

# Run with verbose output
npm test -- --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Playwright Tests

```bash
# Run with debug mode
npx playwright test --debug

# Run with UI for step-by-step debugging
npx playwright test --ui

# Generate test report
npx playwright show-report
```

## Test Utilities

### Custom Render Functions

```typescript
// test-utils.tsx
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}
```

### Mock Factories

```typescript
// mockFactories.ts
export const createMockTransaction = (overrides = {}) => ({
  id: '1',
  user_id: 'user-1',
  description: 'Test transaction',
  amount_usd: 100,
  amount_thb: 3500,
  exchange_rate: 35,
  transaction_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  ...overrides,
});
```

## Best Practices

### General Testing

1. **Write tests first** (TDD approach when possible)
2. **Test behavior, not implementation**
3. **Use descriptive test names**
4. **Keep tests simple and focused**
5. **Mock external dependencies**
6. **Test error scenarios**

### Component Testing

1. **Test user interactions**
2. **Verify accessibility attributes**
3. **Test responsive behavior**
4. **Mock API calls appropriately**
5. **Test loading and error states**

### E2E Testing

1. **Test critical user paths**
2. **Use stable selectors**
3. **Implement proper waits**
4. **Test across browsers**
5. **Verify visual elements**

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout values
   - Check for unresolved promises
   - Verify async operations

2. **Flaky tests**
   - Add proper waits
   - Mock time-dependent code
   - Use deterministic test data

3. **Memory leaks in tests**
   - Clean up event listeners
   - Clear timers
   - Reset global state

### Performance Optimization

1. **Parallel test execution**
2. **Efficient test setup/teardown**
3. **Selective test running in CI**
4. **Test result caching**

## Maintenance

### Regular Tasks

- Update test dependencies
- Review and update test data
- Clean up obsolete tests
- Optimize slow tests
- Review coverage reports

### Monitoring

- Track test execution times
- Monitor flaky test patterns
- Review coverage trends
- Analyze failure patterns

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Playwright Documentation](https://playwright.dev/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Testing Best Practices](https://kentcdodds.com/blog/react-testing-library-tutorial)
