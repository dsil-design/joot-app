# Development Guide

> **Note**: This codebase is primarily developed by Claude Code. This guide is optimized for AI-assisted development workflows.

## Overview

- **Developer**: Dennis (owner) + Claude Code (AI assistant)
- **Deployment**: Vercel (auto-deploy from main branch)
- **Database**: Supabase (production)
- **Workflow**: Direct push to main → auto-deploy

## Critical Rules

### 1. Database Migrations

**⚠️ ALWAYS create migrations in `database/migrations/` FIRST**

```bash
# Use the helper script to create new migrations
./database/new-migration.sh add_feature_name

# This creates: database/migrations/YYYYMMDDHHMMSS_add_feature_name.sql
```

**Complete Migration Workflow:**
1. Create migration using helper script
2. Edit the migration file with your SQL changes
3. Update `database/schema.sql` to reflect the final state
4. Regenerate TypeScript types: `npx supabase gen types typescript --linked > src/lib/supabase/types.ts`
5. Update code to use new schema
6. Run tests
7. Commit everything together:
   ```bash
   git add database/migrations/[new].sql
   git add database/schema.sql
   git add src/lib/supabase/types.ts
   git add [updated-code-files]
   git commit -m "feat: description of change"
   ```

**Never:**
- ❌ Create `.sql` files directly in `database/` root
- ❌ Update schema without creating a migration
- ❌ Commit migrations separately from schema changes

### 2. Testing

**Run tests before every commit:**

```bash
# TypeScript type checking
NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-key \
SUPABASE_SERVICE_ROLE_KEY=dummy-service-key \
NODE_ENV=test \
npx tsc --noEmit

# Unit tests
NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-key \
SUPABASE_SERVICE_ROLE_KEY=dummy-service-key \
NODE_ENV=test \
npm run test:unit

# Build check
NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-key \
SUPABASE_SERVICE_ROLE_KEY=dummy-service-key \
NODE_ENV=test \
npm run build
```

### 3. Git Workflow

**Simple push-to-deploy:**
```bash
git add .
git commit -m "type: description"
git push origin main
```

Vercel automatically deploys from main branch.

**Commit message format:**
- `feat:` - New features
- `fix:` - Bug fixes
- `refactor:` - Code restructuring
- `docs:` - Documentation only
- `test:` - Test updates
- `chore:` - Maintenance tasks

### 4. Code Organization

**Key Directories:**
```
src/
├── app/                    # Next.js app router pages
├── components/
│   ├── forms/             # Form components
│   ├── page-specific/     # Page-specific components
│   └── ui/                # Reusable UI components
├── hooks/                 # React hooks
├── lib/
│   ├── supabase/         # Supabase client & types
│   └── utils/            # Utility functions
└── __tests__/            # Test files

database/
├── migrations/           # ALL migrations go here (timestamped)
├── schema.sql           # Source of truth for current schema
└── new-migration.sh     # Helper to create migrations
```

**File Naming Conventions:**
- Components: `kebab-case.tsx` (e.g., `transaction-card.tsx`)
- Hooks: `use-*.ts` (e.g., `use-transactions.ts`)
- Types: Match Supabase generated types in `src/lib/supabase/types.ts`
- Tests: `*.test.tsx` or `*.test.ts`

### 5. Type Safety

**Always use generated Supabase types:**

```typescript
import { Database } from '@/lib/supabase/types'

type Transaction = Database['public']['Tables']['transactions']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
```

**Regenerate types after schema changes:**
```bash
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

### 6. Environment Variables

**Required for testing:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations)

**Use dummy values for tests** to avoid hitting production database.

## Pre-Commit Checklist

Before every commit, Claude should:

- [ ] Run TypeScript type check
- [ ] Run unit tests
- [ ] Run build check
- [ ] Verify migrations are in `database/migrations/`
- [ ] Ensure `schema.sql` matches migrations
- [ ] Update types if schema changed
- [ ] Check for TODO comments that should be addressed

## Common Tasks

### Adding a New Feature

1. Plan the changes (schema, code, tests)
2. If schema changes needed:
   - Create migration with `./database/new-migration.sh feature_name`
   - Update `database/schema.sql`
   - Regenerate types
3. Implement feature
4. Write/update tests
5. Run all tests
6. Commit everything together

### Fixing a Bug

1. Write a failing test that reproduces the bug
2. Fix the bug
3. Verify test passes
4. Run full test suite
5. Commit with `fix:` prefix

### Refactoring

1. Ensure tests exist for code being refactored
2. Make changes
3. Verify all tests still pass
4. Commit with `refactor:` prefix

## Helper Scripts

### Database
- `./database/new-migration.sh <description>` - Create new migration
- `database/verify-migrations.sh` - Check migration files are properly organized

### Testing
All test commands use dummy env vars (see Testing section above)

### Supabase
- `npx supabase db dump --linked` - Dump current schema
- `npx supabase gen types typescript --linked > src/lib/supabase/types.ts` - Regenerate types

## Performance Considerations

- Use React Server Components where possible
- Minimize client-side JavaScript
- Lazy load heavy components
- Use Supabase query optimization (select only needed columns)
- Cache exchange rates (already implemented)

## AI Development Notes

**For Claude Code instances:**

1. **Always read this file first** when starting a new session with schema changes
2. **Use the helper scripts** - they're designed for you
3. **Follow the migration workflow religiously** - it prevents broken deployments
4. **Test before committing** - the test commands are standardized
5. **Keep commits atomic** - one logical change per commit
6. **Update documentation** when making significant architectural changes

**Common Pitfalls to Avoid:**
- Don't create migrations outside `database/migrations/`
- Don't skip type regeneration after schema changes
- Don't commit without running tests
- Don't make schema changes without migrations
- Don't use production database credentials in tests

## Troubleshooting

### "Column doesn't exist" errors
- Check if migration was created and schema.sql updated
- Regenerate types
- Verify migration is in correct directory

### Type errors after schema changes
- Run: `npx supabase gen types typescript --linked > src/lib/supabase/types.ts`
- Check that code uses new schema

### Tests failing
- Ensure using dummy env vars
- Check if mocks need updating after schema changes
- Verify test database state

## Architecture Decisions

### Currency Handling
- Store amounts in **original currency only**
- Exchange rates in separate `exchange_rates` table
- Convert on-the-fly for display
- Single source of truth for rates

### Transaction Schema
- Single `amount` field (not dual USD/THB)
- `original_currency` indicates which currency was entered
- No stored exchange rates on transactions
- Simplified, normalized design

### Testing Philosophy
- Test business logic, not implementation details
- Use dummy data for database tests
- Mock external APIs (exchange rate providers)
- Fast, isolated unit tests

---

**Last Updated**: 2025-10-21
**Maintained By**: Claude Code
