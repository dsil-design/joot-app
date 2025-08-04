# Joot Authentication Testing Documentation

## Overview

This document provides comprehensive testing documentation for the Joot app's authentication system, including test case descriptions, user acceptance criteria, and guidelines for multi-user testing.

## Test Structure

### Directory Structure
```
src/__tests__/
├── auth/                     # Authentication service tests
├── pages/                    # Page component tests  
├── integration/              # Integration flow tests
├── accessibility/            # Accessibility validation tests
├── performance/              # Performance and optimization tests
└── error-scenarios/          # Error handling tests

e2e/                          # End-to-end tests with Playwright
├── auth-flow.spec.ts         # Complete user journey tests
```

### Test Categories

#### 1. Unit Tests (`npm run test:unit`)
- **Auth Service Tests**: Test individual authentication functions
- **Component Tests**: Test React components in isolation
- **Page Tests**: Test login and signup pages
- **Protected Route Tests**: Test route protection logic

#### 2. Integration Tests (`npm run test:integration`)
- **Complete Auth Flows**: Test signup → email verification → login flow
- **Session Management**: Test session persistence and expiry
- **Multi-user Scenarios**: Test user switching and data isolation
- **Error Recovery**: Test recovery from network/API errors

#### 3. End-to-End Tests (`npm run test:e2e`)
- **User Registration Flow**: Complete signup process
- **User Login Flow**: Complete login process
- **Form Validation**: Real browser validation testing
- **Responsive Design**: Cross-device compatibility
- **Performance**: Core Web Vitals simulation

#### 4. Accessibility Tests (`npm run test:accessibility`)
- **WCAG Compliance**: Automated accessibility testing
- **Keyboard Navigation**: Tab order and focus management
- **Screen Reader Support**: ARIA labels and announcements
- **Color Contrast**: Visual accessibility validation

#### 5. Performance Tests (`npm run test:performance`)
- **Render Performance**: Component render timing
- **Form Interaction**: Input responsiveness
- **API Performance**: Authentication request timing
- **Memory Management**: Memory leak detection

#### 6. Error Scenario Tests
- **Network Errors**: Timeout and connection failures  
- **Authentication Errors**: Invalid credentials, rate limiting
- **Session Errors**: Expired sessions, corrupted state
- **Validation Errors**: Form validation edge cases

## User Acceptance Criteria

### 1. User Registration (Sign-up)

#### AC-001: Valid User Registration
**Given** a new user visits the signup page  
**When** they fill in all required fields with valid data  
**And** click "Create account"  
**Then** they should see a success message  
**And** receive an email verification link  
**And** be redirected to login page after 3 seconds  

**Test Coverage:**
- Unit: `src/__tests__/pages/signup.test.tsx`
- Integration: `src/__tests__/integration/auth-flow.test.tsx`
- E2E: `e2e/auth-flow.spec.ts`

#### AC-002: Form Validation
**Given** a user is on the signup page  
**When** they submit the form with invalid or missing data  
**Then** they should see appropriate validation errors  
**And** errors should clear when they start typing  
**And** the form should not submit until all validations pass  

**Validation Rules:**
- Full name: Required, non-empty
- Email: Required, valid email format
- Password: Required, minimum 8 characters
- Confirm Password: Required, must match password

#### AC-003: Duplicate Email Handling
**Given** a user tries to register with an existing email  
**When** they submit the signup form  
**Then** they should see "User already registered" error  
**And** be offered a link to the login page  

### 2. User Authentication (Sign-in)

#### AC-004: Valid User Login
**Given** a registered user with verified email  
**When** they enter correct credentials and click "Sign in"  
**Then** they should be redirected to the dashboard  
**And** their session should be established  

#### AC-005: Invalid Credentials
**Given** a user enters incorrect email or password  
**When** they attempt to sign in  
**Then** they should see "Invalid login credentials" error  
**And** remain on the login page  
**And** form data should be preserved for retry  

#### AC-006: Unverified Email
**Given** a user with unverified email attempts to sign in  
**When** they enter correct credentials  
**Then** they should see "Email not confirmed" error  
**And** be offered option to resend verification email  

### 3. Session Management

#### AC-007: Session Persistence
**Given** a user is logged in  
**When** they refresh the page or close/reopen browser  
**Then** they should remain logged in (until session expires)  
**And** have access to protected pages  

#### AC-008: Session Expiry
**Given** a user's session expires  
**When** they try to access a protected page  
**Then** they should be redirected to login page  
**And** see appropriate message about session expiry  

#### AC-009: Manual Sign-out
**Given** a logged-in user clicks "Sign out"  
**When** the sign-out process completes  
**Then** they should be redirected to login page  
**And** their session should be completely cleared  
**And** they should not be able to access protected pages  

### 4. Protected Routes

#### AC-010: Authenticated Access
**Given** a user is logged in  
**When** they navigate to a protected page  
**Then** they should see the page content immediately  
**And** not see any loading or redirect screens  

#### AC-011: Unauthenticated Redirect
**Given** a user is not logged in  
**When** they try to access a protected page  
**Then** they should be redirected to login page  
**And** see appropriate message about needing to sign in  

### 5. Multi-User Data Isolation

#### AC-012: User Data Separation
**Given** multiple users using the same device  
**When** User A logs out and User B logs in  
**Then** User B should only see their own data  
**And** have no access to User A's information  
**And** all previous session data should be cleared  

#### AC-013: Concurrent Sessions
**Given** the same user logs in on multiple devices  
**When** they use the application on different devices  
**Then** each session should work independently  
**And** logging out on one device shouldn't affect others  

### 6. Error Handling

#### AC-014: Network Error Recovery
**Given** a user experiences network connectivity issues  
**When** they try to authenticate  
**Then** they should see helpful error messages  
**And** be able to retry when connection is restored  
**And** form data should be preserved during retries  

#### AC-015: Rate Limiting Handling
**Given** a user exceeds login attempt limits  
**When** they try to sign in again  
**Then** they should see "Too many attempts" message  
**And** be informed about wait time before retry  

### 7. Accessibility Requirements

#### AC-016: Keyboard Navigation
**Given** a user navigates using only keyboard  
**When** they tab through form elements  
**Then** focus should move logically through all interactive elements  
**And** they should be able to complete all auth flows  

#### AC-017: Screen Reader Support
**Given** a user with screen reader software  
**When** they navigate auth pages  
**Then** all form fields should have proper labels  
**And** errors should be announced appropriately  
**And** loading states should be communicated clearly  

#### AC-018: Color and Contrast
**Given** users with visual impairments  
**When** they view auth pages  
**Then** all text should meet WCAG contrast requirements  
**And** errors should not rely solely on color  
**And** interactive elements should be clearly distinguishable  

### 8. Mobile and Responsive Design

#### AC-019: Mobile Form Interaction
**Given** a user on a mobile device  
**When** they interact with auth forms  
**Then** all form fields should be easily tappable  
**And** virtual keyboard should not obscure important content  
**And** form validation should work properly on mobile  

#### AC-020: Cross-Device Consistency
**Given** users switch between desktop and mobile  
**When** they use the authentication system  
**Then** the experience should be consistent across devices  
**And** all functionality should work equally well  

### 9. Performance Requirements

#### AC-021: Page Load Performance
**Given** users visit auth pages  
**When** pages load  
**Then** initial render should complete within 2.5 seconds  
**And** interactive elements should respond within 100ms  
**And** form submission should provide immediate feedback  

#### AC-022: Form Responsiveness
**Given** users interact with auth forms  
**When** they type or click rapidly  
**Then** all interactions should be smooth and responsive  
**And** validation should occur without noticeable delay  
**And** no memory leaks should occur during extended use  

## Testing Scenarios for Multi-User Testing

### Scenario 1: Family Account Testing
1. **Setup**: Create 3-4 test accounts for family members
2. **Test**: Each family member signs up and verifies email
3. **Validate**: Each gets separate dashboard access
4. **Switch**: Test logging out and switching between accounts
5. **Verify**: No data crossover between family members

### Scenario 2: Friend Group Testing
1. **Setup**: Coordinate with 5-6 friends for concurrent testing
2. **Test**: All sign up simultaneously from different devices
3. **Validate**: All receive verification emails and can log in
4. **Stress Test**: All perform actions simultaneously
5. **Check**: System handles concurrent load gracefully

### Scenario 3: Device Switching
1. **Setup**: Use same account on phone, tablet, and desktop
2. **Test**: Log in on multiple devices simultaneously
3. **Validate**: Each device maintains independent session
4. **Logout**: Test logging out from one device
5. **Verify**: Other devices remain logged in

### Scenario 4: Network Conditions
1. **Setup**: Test on different network conditions (WiFi, 4G, slow 3G)
2. **Test**: Complete auth flows under each condition
3. **Validate**: Appropriate error handling for slow/failed requests
4. **Recovery**: Test recovery when network improves

## Running Tests

### Development Testing
```bash
# Run all tests during development
npm run test:all

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:accessibility
npm run test:performance

# Run E2E tests
npm run test:e2e

# Watch mode for active development
npm run test:watch
```

### Pre-deployment Testing
```bash
# Full test suite with coverage
npm run test:ci

# E2E tests with UI for debugging  
npm run test:e2e:ui
```

### Test Coverage Goals
- **Unit Tests**: 90%+ code coverage
- **Integration Tests**: All critical user flows
- **E2E Tests**: Complete user journeys
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Core Web Vitals "Good" rating

## Troubleshooting Common Issues

### Test Failures
1. **Mock Issues**: Ensure all external dependencies are properly mocked
2. **Timing Issues**: Use `waitFor` for async operations
3. **State Cleanup**: Verify `beforeEach` clears previous test state
4. **Environment**: Check that test environment matches expectations

### E2E Test Issues
1. **Server Not Running**: Ensure dev server is running for E2E tests
2. **Timeouts**: Increase timeout for slow operations
3. **Element Not Found**: Verify selectors match current UI
4. **Network Issues**: Check for proper network mocking in tests

### Accessibility Test Issues
1. **axe-core Updates**: Keep jest-axe updated for latest WCAG rules
2. **False Positives**: Review and document any intentional violations
3. **Dynamic Content**: Ensure dynamic content is properly tested

This testing documentation ensures comprehensive coverage of the Joot authentication system and provides clear criteria for validating the user experience across all scenarios.