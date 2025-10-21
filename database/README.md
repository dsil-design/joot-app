# Database Migrations

This directory contains the database schema and migration files for the Joot application.

## Directory Structure

```
database/
├── migrations/           # ALL timestamped migration files go here
├── schema.sql           # Current schema (source of truth)
├── new-migration.sh     # Helper script to create new migrations
└── verify-migrations.sh # Script to verify migrations are organized
```

## Creating a New Migration

**Always use the helper script:**

```bash
./database/new-migration.sh description_of_change
```

This creates a properly timestamped file in `database/migrations/` with the format:
```
YYYYMMDDHHMMSS_description_of_change.sql
```

**Example:**
```bash
./database/new-migration.sh add_user_preferences
# Creates: database/migrations/20251021153045_add_user_preferences.sql
```

## Migration Workflow

1. **Create migration**
   ```bash
   ./database/new-migration.sh add_feature
   ```

2. **Edit the migration file**
   - Add your SQL changes between `BEGIN;` and `COMMIT;`
   - Use `IF NOT EXISTS` and `IF EXISTS` for idempotency

3. **Update schema.sql**
   - Manually update `database/schema.sql` to reflect the final state
   - This file represents what the database should look like after all migrations

4. **Regenerate TypeScript types**
   ```bash
   npx supabase gen types typescript --linked > src/lib/supabase/types.ts
   ```

5. **Verify everything**
   ```bash
   npm run verify:all
   ```

6. **Commit everything together**
   ```bash
   git add database/migrations/[new].sql
   git add database/schema.sql
   git add src/lib/supabase/types.ts
   git commit -m "feat: add feature"
   ```

## Important Rules

### ✅ DO:
- Create migrations using `./database/new-migration.sh`
- Put ALL migrations in `database/migrations/` directory
- Use proper timestamps (YYYYMMDDHHMMSS format)
- Update `schema.sql` to match final state
- Regenerate types after schema changes
- Use `BEGIN;` and `COMMIT;` for transactions
- Make migrations idempotent (use IF EXISTS/IF NOT EXISTS)

### ❌ DON'T:
- Create `.sql` files directly in `database/` root
- Skip updating `schema.sql`
- Forget to regenerate TypeScript types
- Commit migrations without updating schema
- Edit old migrations (create new ones instead)

## Verifying Migration Organization

Run the verification script to check everything is properly organized:

```bash
./database/verify-migrations.sh
```

Or use the npm script:
```bash
npm run verify:migrations
```

This will:
- Check for loose migration files in `database/` root
- List all migrations in chronological order
- Verify the migrations directory exists and has files

## Migration File Template

When you use `./database/new-migration.sh`, it creates this template:

```sql
-- Migration: description_of_change
-- Created: 2025-10-21 15:30:45

BEGIN;

-- Add your migration SQL here

COMMIT;
```

## Example Migration

```sql
-- Migration: add_user_preferences
-- Created: 2025-10-21 15:30:45

BEGIN;

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
ON public.user_preferences(user_id);

COMMIT;
```

## Troubleshooting

### "Migration file not found in migrations/"
- Make sure you created the file using `./database/new-migration.sh`
- Check that the file is in `database/migrations/`, not `database/` root

### "Types don't match schema"
- Run: `npx supabase gen types typescript --linked > src/lib/supabase/types.ts`
- Ensure `schema.sql` is up to date with your migrations

### "Loose migration files detected"
- Move any `.sql` files from `database/` root to `database/migrations/`
- Use proper timestamp format: `YYYYMMDDHHMMSS_description.sql`

## Schema.sql vs Migrations

**Migrations**: Incremental changes over time (like Git commits)
- Track historical changes
- Applied in chronological order
- Never edit old migrations

**Schema.sql**: Current state (like a snapshot)
- Source of truth for what database should look like NOW
- Updated manually after creating migrations
- Used to generate TypeScript types

Both are needed and should always be in sync!

---

**For more information, see**: `DEVELOPMENT.md` and `.claude/QUICK_START.md`
