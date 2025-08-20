# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Joot is a Next.js 15 transaction tracking application with USD/THB currency conversion capabilities. Built with TypeScript, React 19, Supabase for backend services, and shadcn/ui components with Tailwind CSS. The app features comprehensive authentication, transaction management, and extensive testing coverage.

## Core Technologies

- **Framework**: Next.js 15 with App Router and Turbopack for development
- **Authentication**: Supabase Auth with middleware-based route protection
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **UI**: shadcn/ui components ("new-york" style) with Radix UI primitives
- **Styling**: Tailwind CSS with Geist font family
- **Testing**: Jest for unit/integration tests, Playwright for E2E testing
- **Language**: TypeScript 5 with strict configuration

## Development Commands

### Core Development
```bash
# Start development server with Turbopack (fast refresh)
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Code linting
npm run lint
```

### Testing Suite
```bash
# All unit tests (excluding integration/e2e/accessibility/performance)
npm run test:unit

# Integration tests
npm run test:integration  

# End-to-end tests with Playwright
npm run test:e2e
npm run test:e2e:ui        # With Playwright UI
npm run test:e2e:headed    # With browser head

# Accessibility tests using jest-axe
npm run test:accessibility

# Performance tests
npm run test:performance

# All Jest-based tests (unit + integration + accessibility + performance)
npm run test:all

# Watch mode for active development
npm run test:watch

# Coverage report
npm run test:coverage

# CI pipeline (coverage + e2e)
npm run test:ci
```

### Environment and Setup
```bash
# Validate required environment variables
npm run validate:env

# Test Supabase connection and database setup
npm run test:supabase

# Reset transaction data with fresh examples (fixes display issues)
npm run db:reset-transactions
# Or run the wrapper script:
./scripts/reset-transactions.sh
```

## Application Architecture

### Directory Structure
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components organized by purpose:
  - `ui/` - shadcn/ui base components
  - `auth/` - Authentication-related components
  - `providers/` - React context providers
  - `page-specific/` - Components for specific pages
- `src/hooks/` - Custom React hooks for data fetching
- `src/lib/` - Utility functions and configurations
- `src/types/` - TypeScript type definitions
- `src/contexts/` - React Context definitions

### Authentication Flow
The app uses Supabase Auth with a comprehensive middleware system:

1. **Middleware** (`src/middleware.ts`) handles route protection:
   - Public routes: `/`, `/login`, `/signup`, `/auth/*`, `/docs`, `/error`
   - Protected routes: All others require authentication
   - Automatic redirect to `/login` for unauthenticated users
   - Environment validation with fallback to `/error` page

2. **Auth Configuration**:
   - Server-side auth in middleware using `@supabase/ssr`
   - Client-side auth state management in `src/lib/auth.ts`
   - Protected route component wrapper available

3. **User Session Management**:
   - Automatic session handling via Supabase cookies
   - Session persistence across browser restarts
   - Graceful handling of expired sessions

### Database Architecture
Supabase PostgreSQL with RLS-enabled tables:

- **users**: Extended user profiles linked to Supabase auth.users
- **transactions**: Core transaction data with dual currency support and FK relationships
- **vendors**: User-specific vendor list for transaction categorization
- **payment_methods**: User-specific payment method list for transaction tracking
- **exchange_rates**: Historical rate data for USD/THB conversion

All tables implement Row Level Security ensuring user data isolation.

**Foreign Key Relationships:**
- `transactions.vendor_id` → `vendors.id` (nullable)
- `transactions.payment_method_id` → `payment_methods.id` (nullable)
- `vendors.user_id` → `users.id` (ensures vendor isolation)
- `payment_methods.user_id` → `users.id` (ensures payment method isolation)

### Component System
Built on shadcn/ui with "new-york" style:
- Base color: Slate
- CSS variables enabled for theming
- Lucide React icons
- Full TypeScript support
- Accessible by default (Radix UI primitives)

### State Management
- **Global Actions**: Context-based system via `GlobalActionWrapper`
- **Demo Context**: Separate context for demo/test scenarios
- **Custom Hooks**: Specialized hooks for transactions, vendors, payment methods, and exchange rates
- **Supabase Real-time**: Real-time subscriptions for live data updates

## Environment Configuration

### Required Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Environment Validation
- Built-in validation script checks all required variables
- Middleware validates environment and redirects to error page if missing
- Development helper scripts for connection testing

## Testing Strategy

### Test Organization
- **Unit Tests**: Individual component and utility testing
- **Integration Tests**: Complete user flow testing
- **E2E Tests**: Browser automation with Playwright
- **Accessibility Tests**: WCAG compliance via jest-axe
- **Performance Tests**: Render timing and memory management

### Coverage Requirements
- 70% minimum coverage for branches, functions, lines, and statements
- Comprehensive error scenario testing
- Multi-user data isolation validation
- Cross-browser compatibility (Chrome, Firefox, Safari, Mobile)

### Test Configuration
- Jest with Next.js integration and jsdom environment
- Playwright configured for multiple browsers and devices
- Custom test timeouts and transformation patterns for Supabase ESM modules

## Database Development

### Schema Management
- Schema defined in SQL files at project root
- Migration scripts available for database updates
- RLS policies enforce user data separation
- Automatic user profile creation via database triggers

### Development Workflow
1. Update schema SQL files
2. Apply changes in Supabase SQL Editor
3. Update TypeScript types to match schema
4. Test with connection validation script
5. Update relevant components and hooks

## Deployment

### Design-to-Deployment Workflow Pipeline

The project uses a 4-stage CI/CD pipeline optimized for UX designers working with AI agents:

#### 🧪 Test & Validate (Stage 1)
- **Workflow**: `warp-test-validate.yml`
- **Purpose**: Validate AI-generated code without any deployment
- **When to use**: After AI agents complete coding, before touching production
- **What it does**: TypeScript compilation, linting, build verification, unit tests
- **Perfect for**: Ensuring AI-generated code is production-ready
- **Command**: `gh workflow run warp-test-validate.yml --field run_all_tests=false`

#### 🗄️ Deploy Database Changes (Stage 2)
- **Workflow**: `warp-deploy-db.yml`
- **Purpose**: Database schema/migrations deployment with light validation
- **When to use**: When you have database changes to deploy independently
- **What it does**: Light testing (TypeScript + lint + build) + Supabase deployment
- **Perfect for**: Iterative database changes during development
- **Command**: `gh workflow run warp-deploy-db.yml --field environment=production`

#### 🚀 Full Production Deployment (Stage 3)
- **Workflow**: `warp-full-deploy.yml`
- **Purpose**: Deploy application to production (assumes DB already updated)
- **When to use**: Final step after testing and DB are confirmed working
- **What it does**: Smoke tests + Vercel deployment + monitoring setup
- **Perfect for**: Going live with confidence
- **Command**: `gh workflow run warp-full-deploy.yml --field environment=production`

#### 🔄 Emergency Rollback (Emergency Only)
- **Workflow**: `rollback.yml`
- **Purpose**: Emergency rollback of Vercel and/or database
- **When to use**: When production has critical issues that need immediate rollback
- **What it does**: 
  - Vercel: Automatic rollback to previous stable commit
  - Database: Guided manual rollback process via Supabase dashboard
- **Perfect for**: Incident response and damage control
- **Command**: `gh workflow run rollback.yml --field rollback_type=vercel_only`

### Recommended Usage Flow for Designers + AI Agents

1. **🎨 Design Phase**: Create designs in Figma
2. **🤖 AI Development Phase**: Use MCP/AI agents to generate code
3. **🧪 Validation Phase**: Run "Test & Validate" to ensure code quality
4. **🗄️ Database Phase**: Deploy any schema changes separately  
5. **🚀 Production Phase**: Deploy the validated application
6. **👀 Monitor**: Watch for issues, ready to 🔄 rollback if needed

This approach gives you **checkpoints** at each stage to catch issues before they reach production.

### Vercel Configuration
- Environment variables must be set in Vercel dashboard
- Critical fix documentation for common deployment issues
- **Automatic deployments from main branch** (triggered by full deployment workflow)
- Preview deployments for pull requests

### Production Checklist
- Supabase project configured with production credentials
- Database schema applied and tested
- Authentication flows verified
- Error handling and fallback pages tested

## File Aliases
- `@/components` → `src/components`
- `@/lib` → `src/lib`  
- `@/hooks` → `src/hooks`
- `@/ui` → `src/components/ui`
- `@/utils` → `src/lib/utils`

## Common Development Patterns

### Adding New Components
1. Create in appropriate `src/components/` subdirectory
2. Use shadcn/ui base components where possible
3. Implement TypeScript interfaces for props
4. Add corresponding test file in `__tests__/`
5. Consider accessibility requirements

### Database Interactions
1. Use custom hooks from `src/hooks/` for data fetching
2. Implement proper error handling and loading states
3. Leverage Supabase real-time subscriptions for live updates
4. Ensure RLS policies are properly configured

### Authentication Integration
1. Use middleware for route protection (automatic)
2. Implement client-side auth state checks where needed
3. Handle authentication errors gracefully
4. Test both authenticated and unauthenticated scenarios

## Performance Considerations
- Turbopack enabled for fast development builds
- Image optimization via Next.js built-in features
- Component lazy loading where appropriate
- Memory leak detection in performance tests
- Core Web Vitals monitoring and optimization

## Troubleshooting

### Transaction Display Issues

**Problem**: Home page shows "No transactions yet" despite having data in the database.

**Common Causes**:
- Broken foreign key relationships from incomplete migrations
- Missing vendor/payment method data
- RLS policy conflicts
- Data integrity issues after schema changes

**Solution**: Reset transaction data with fresh examples
```bash
# Quick fix - reset all transaction data with realistic examples
npm run db:reset-transactions

# Or use the interactive script with helpful guidance
./scripts/reset-transactions.sh
```

**What this does**:
1. Wipes existing transactions, vendors, and payment methods
2. Creates fresh, consistent data with proper FK relationships  
3. Generates 15+ realistic transaction examples per user
4. Ensures data works correctly with the home page query
5. Provides verification and troubleshooting output

**After running**: Refresh your home page - you should see sample transactions immediately.
