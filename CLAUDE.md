# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**Joot** is a personal transaction tracker for tracking expenses and income between USD and THB currencies.

**Core Features:**
- Transaction management (add, edit, view)
- USD/THB currency conversion with historical exchange rates
- Monthly financial dashboard
- Vendor and payment method tracking
- Tag-based categorization

**Tech Stack:**
- Next.js 15 (App Router, Turbopack)
- Supabase (Auth + PostgreSQL with RLS)
- shadcn/ui components + Tailwind CSS
- TypeScript (strict mode)

## Essential Commands

```bash
# Development
npm run dev              # Start dev server (Turbopack)
npm run build            # Production build
npm run lint             # ESLint

# Database
npm run db:test          # Test Supabase connection
./database/new-migration.sh <name>  # Create new migration
```

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── home/           # Dashboard
│   ├── transactions/   # Transaction list & detail
│   ├── add-transaction/# New transaction form
│   ├── settings/       # User settings
│   ├── login/signup/   # Auth pages
│   └── api/            # API routes
├── components/
│   ├── ui/             # shadcn/ui components
│   ├── page-specific/  # Page-specific components
│   └── forms/          # Form components
├── hooks/              # Custom React hooks
└── lib/                # Utilities & Supabase client

database/
├── migrations/         # Timestamped SQL migrations
├── schema.sql          # Source of truth for DB schema
└── new-migration.sh    # Migration helper script
```

## Database Schema (Core Tables)

- `users` - User profiles (extends Supabase auth)
- `transactions` - Income/expense records with amount & currency
- `vendors` - Transaction vendors
- `payment_methods` - Payment method options
- `tags` / `transaction_tags` - Categorization
- `exchange_rates` - Historical USD/THB rates

## Key Patterns

### Currency Handling
- Amounts stored in original currency (USD or THB)
- Exchange rates fetched from ECB and stored in `exchange_rates`
- Conversion calculated on-the-fly, not stored

### Supabase
- Row Level Security (RLS) on all tables
- Service role key for API routes, anon key for client

### UI Components
- shadcn/ui as primary component library
- Mobile-first responsive design

## Figma Design Implementation

When implementing from Figma designs, follow these rules:

1. **100% visual fidelity** - Match the design exactly
2. **No unauthorized additions** - Don't add UI elements not in the design
3. **Exact layout** - Spacing, positioning, alignment must match precisely
4. **Content fidelity** - Use exact text, labels, and copy as specified

If a design requires functionality not technically possible:
1. Document the issue
2. Propose the smallest possible change
3. Don't add elements based on assumptions

*Note: These rules apply when working from Figma designs. Not all features have Figma designs.*

## Development Workflow

1. Develop and test locally with `npm run dev`
2. Verify it works in browser
3. Push to main → Vercel auto-deploys

### Database Changes

When making schema changes:
1. Create migration: `./database/new-migration.sh description_here`
2. Update `database/schema.sql` to reflect final state
3. Regenerate types: `npx supabase gen types typescript --linked > src/lib/supabase/types.ts`

## Deployment

- **App**: Vercel (auto-deploy from main branch)
- **Database**: Supabase
- **CI/CD**: GitHub Actions for validation
