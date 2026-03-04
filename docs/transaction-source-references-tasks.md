# Transaction Source References — Implementation Tasks

**Spec:** `docs/transaction-source-references-spec.md`
**Created:** 2026-03-04

## Task Dependency Graph

```
Task 1 (migration) ──┬──→ Task 3 (populate statement source columns)
                      └──→ Task 4 (extend getTransactionById) ──→ Task 5 (UI components)
Task 2 (populate email source column) ── (independent, no blockers)
```

Tasks 1 and 2 can run in parallel. Task 5 is the final step.

---

## Task 1: Create database migration for statement source columns

**Status:** Not started
**Blocked by:** Nothing

**What:**
- Run `./database/new-migration.sh add_statement_source_columns_to_transactions`
- Add columns: `source_statement_upload_id UUID FK`, `source_statement_suggestion_index INTEGER`, `source_statement_match_confidence INTEGER (0-100)`
- Add index: `idx_transactions_source_statement`
- Update `database/schema.sql`
- Regenerate types: `npx supabase gen types typescript --linked > src/lib/supabase/types.ts`

**Files:** `database/migrations/`, `database/schema.sql`, `src/lib/supabase/types.ts`

---

## Task 2: Populate source_email_transaction_id in approve/link flows

**Status:** Not started
**Blocked by:** Nothing

**What:**
The column `transactions.source_email_transaction_id` exists but is NEVER set. Update these flows:

1. `src/app/api/imports/approve/route.ts` — EMAIL items (~line 209): set `source_email_transaction_id` on INSERT. MERGED items (~line 285): same.
2. `src/app/api/imports/link/route.ts` — EMAIL items (~line 196): UPDATE transaction to set it. MERGED items (~line 83): same.
3. `src/lib/email/extraction-service.ts` tryAutoMatch (~line 371): when auto-matching, also update the transaction.
4. `src/lib/email/waiting-resolver.ts` (~line 93): same as above.

**Files:** `src/app/api/imports/approve/route.ts`, `src/app/api/imports/link/route.ts`, `src/lib/email/extraction-service.ts`, `src/lib/email/waiting-resolver.ts`

---

## Task 3: Populate statement source columns in approve/link flows

**Status:** Not started
**Blocked by:** Task 1

**What:**
Update approve/link flows to set the 3 new statement columns when a statement suggestion is approved or linked:

1. `src/app/api/imports/approve/route.ts` — STATEMENT items: set `source_statement_upload_id`, `source_statement_suggestion_index`, `source_statement_match_confidence` on INSERT. MERGED items: same.
2. `src/app/api/imports/link/route.ts` — STATEMENT items (~line 149): UPDATE transaction with all 3 columns. MERGED items (~line 83): same.

Confidence value comes from `extraction_log.suggestions[index].confidence`.

**Files:** `src/app/api/imports/approve/route.ts`, `src/app/api/imports/link/route.ts`

---

## Task 4: Extend getTransactionById to join source tables

**Status:** Not started
**Blocked by:** Task 1

**What:**
In `src/hooks/use-transactions.ts` `getTransactionById` (line 324):

1. Add to select query:
   - `email_transactions!transactions_source_email_transaction_id_fkey (id, subject, from_address, from_name, email_date, extraction_confidence, match_confidence, match_method, status)`
   - `statement_uploads!transactions_source_statement_upload_id_fkey (id, filename, statement_period_start, statement_period_end, payment_methods!statement_uploads_payment_method_id_fkey (name))`
2. Extend transform to map `emailSource` and `statementSource`
3. Define `EmailSourceData` and `StatementSourceData` interfaces
4. Extend `TransactionWithVendorAndPayment` type

**Files:** `src/hooks/use-transactions.ts`, `src/lib/supabase/types.ts` (or inline types)

---

## Task 5: Build TransactionSources UI components on detail page

**Status:** Not started
**Blocked by:** Task 4

**What:**
Add to `src/app/transactions/[id]/page.tsx`:

1. Import `Mail`, `FileText` from lucide-react
2. Define inline components: `TransactionSources`, `EmailSourceCard`, `StatementSourceCard`, `MatchMethodBadge`, `formatStatementPeriod`
3. Insert `<TransactionSources>` after `<FieldTags>` (line ~356)
4. Handle 4 states: no sources, email only, statement only, both

See spec Section 4 for full component code.

**Files:** `src/app/transactions/[id]/page.tsx`
