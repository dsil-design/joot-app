# Quick Start Guide for Claude Code

> **Read this FIRST when starting any development session**

## Pre-Flight Checklist

Every time you start a session, quickly verify:

```bash
# 1. Check migration organization
npm run verify:migrations

# 2. Check current git status
git status
```

## Most Common Commands

### Before Every Commit
```bash
# Run full verification (migrations + types + tests + build)
npm run verify:all
```

### Creating Database Migrations
```bash
# Create new migration with proper timestamp
./database/new-migration.sh description_here

# Example:
./database/new-migration.sh add_user_preferences
```

### After Schema Changes
```bash
# 1. Update schema.sql manually
# 2. Regenerate types
npx supabase gen types typescript --linked > src/lib/supabase/types.ts

# 3. Verify everything works
npm run verify:types
npm run test:unit
```

### Testing Commands
```bash
# Type check only
npm run verify:types

# Unit tests only
npm run test:unit

# Build check
NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-key \
SUPABASE_SERVICE_ROLE_KEY=dummy-service-key \
NODE_ENV=test \
npm run build

# Full verification (everything)
npm run verify:all
```

## Critical Rules (Never Break These!)

1. **Migrations MUST go in `database/migrations/` with timestamp**
   - Use: `./database/new-migration.sh description`
   - NOT in `database/` root

2. **Always update schema.sql after migrations**
   - Keep it as source of truth for final state

3. **Regenerate types after schema changes**
   - Run: `npx supabase gen types typescript --linked > src/lib/supabase/types.ts`

4. **Test before committing**
   - Run: `npm run verify:all`

5. **Commit migrations + schema + types together**
   - Never commit them separately

## Typical Workflows

### Adding a New Feature (with schema changes)

```bash
# 1. Create migration
./database/new-migration.sh add_feature_name

# 2. Edit migration file
# database/migrations/YYYYMMDDHHMMSS_add_feature_name.sql

# 3. Update schema.sql to match final state

# 4. Regenerate types
npx supabase gen types typescript --linked > src/lib/supabase/types.ts

# 5. Implement feature in code

# 6. Write/update tests

# 7. Verify everything
npm run verify:all

# 8. Commit all together
git add database/migrations/[new].sql database/schema.sql src/lib/supabase/types.ts [code-files]
git commit -m "feat: add feature name"
git push origin main
```

### Bug Fix (no schema changes)

```bash
# 1. Write failing test that reproduces bug
# 2. Fix the bug
# 3. Verify tests pass
npm run test:unit

# 4. Full verification
npm run verify:all

# 5. Commit
git add [fixed-files]
git commit -m "fix: description of fix"
git push origin main
```

### Refactoring Code

```bash
# 1. Ensure tests exist
# 2. Make changes
# 3. Verify tests still pass
npm run verify:all

# 4. Commit
git add [refactored-files]
git commit -m "refactor: description"
git push origin main
```

## File Structure Reference

```
database/
├── migrations/           # ✅ ALL migrations go here (timestamped .sql files)
├── schema.sql           # ✅ Source of truth for current schema
├── new-migration.sh     # ✅ Helper to create new migrations
└── verify-migrations.sh # ✅ Verify migrations are organized

src/
├── app/                 # Next.js pages (App Router)
├── components/
│   ├── forms/          # Form components
│   ├── page-specific/  # Page-specific components
│   └── ui/             # Reusable UI components
├── hooks/              # React hooks (use-*.ts)
├── lib/
│   ├── supabase/
│   │   ├── client.ts  # Supabase client setup
│   │   └── types.ts   # ✅ Auto-generated from schema
│   └── utils/         # Utility functions
└── __tests__/         # Test files
```

## Common Mistakes to Avoid

❌ **DON'T:**
- Create `.sql` files in `database/` root
- Update schema without creating migration
- Commit migrations separately from schema changes
- Skip type regeneration after schema changes
- Use production database in tests
- Push without running `npm run verify:all`

✅ **DO:**
- Use `./database/new-migration.sh` for new migrations
- Update `database/schema.sql` to match migrations
- Regenerate types after schema changes
- Use dummy env vars for tests
- Run `npm run verify:all` before every push
- Commit migrations + schema + types + code together

## Environment Variables for Tests

Always use these dummy values for tests:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-key
SUPABASE_SERVICE_ROLE_KEY=dummy-service-key
NODE_ENV=test
```

## Quick Verification

After making changes, run this quick check:

```bash
# Verify everything is correct
npm run verify:all
```

This runs:
1. Migration organization check
2. TypeScript type checking
3. Unit tests
4. Build verification

If this passes, you're good to commit and push!

## Architecture Notes

### Current Schema Design
- **Transactions**: Single `amount` field (original currency)
- **Currency**: Stored in `original_currency` field
- **Exchange Rates**: Separate `exchange_rates` table
- **Conversion**: Calculated on-the-fly (not stored)

### Testing Philosophy
- Use dummy database credentials
- Mock external APIs
- Test business logic, not implementation
- Fast, isolated unit tests

---

**For detailed information, see**: `DEVELOPMENT.md`

**Last Updated**: 2025-10-21
