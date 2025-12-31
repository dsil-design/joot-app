# iCloud Email Integration - Task Breakdown

## Overview

This document breaks the iCloud email integration plan into isolated, executable tasks with clear dependencies and approval gates. Each task is designed to be completed independently and verified before proceeding.

---

## Task Dependency Graph

```
T1 (Database Schema)
    ↓
T2 (TypeScript Types)
    ↓
T3 (Install ImapFlow)
    ↓
T4 (Email Service)
    ↓
T5 (Sync API Route)
    ↓
T6 (List API Route) ←──┬── T7 (Detail API Route)
    ↓                   │
T8 (Settings UI)        │
    ↓                   │
T9 (Cron Integration) ──┘
    ↓
T10 (Production Deploy)
```

---

## Task List

### T1: Database Schema Migration

**Description:** Create the `emails` and `email_sync_state` tables with RLS policies and indexes.

**Deliverables:**
- [ ] New migration file: `database/migrations/XXXXXX_add_email_tables.sql`
- [ ] Updated `database/schema.sql` with new tables
- [ ] Migration applied to Supabase

**Implementation:**
```bash
./database/new-migration.sh add_email_tables
```

**Tables to create:**
- `emails` - Stores synced email metadata
- `email_sync_state` - Tracks sync progress per folder

**Blockers:** None

**Approval Gate:**
- [ ] Schema reviewed for correctness
- [ ] RLS policies verified (users can only see own emails)
- [ ] Indexes confirmed for query performance
- [ ] Migration runs successfully on Supabase

---

### T2: TypeScript Type Generation

**Description:** Regenerate Supabase TypeScript types to include new email tables.

**Deliverables:**
- [ ] Updated `src/lib/supabase/types.ts`

**Implementation:**
```bash
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

**Blockers:**
- [ ] T1 (Database Schema) must be complete

**Approval Gate:**
- [ ] Types generated successfully
- [ ] `emails` and `email_sync_state` types present in file
- [ ] No TypeScript errors in project

---

### T3: Install ImapFlow Package

**Description:** Add the ImapFlow npm package for IMAP connectivity.

**Deliverables:**
- [ ] `imapflow` added to `package.json`
- [ ] `package-lock.json` updated

**Implementation:**
```bash
npm install imapflow
```

**Blockers:** None

**Approval Gate:**
- [ ] Package installed successfully
- [ ] No dependency conflicts
- [ ] Build still works: `npm run build`

---

### T4: Email Sync Service

**Description:** Create the core IMAP sync service that connects to iCloud and syncs email metadata.

**Deliverables:**
- [ ] New file: `src/lib/services/email-types.ts`
- [ ] New file: `src/lib/services/email-sync-service.ts`

**Implementation Details:**

`email-types.ts`:
- `EmailMetadata` interface (message ID, UID, subject, from, date, etc.)
- `SyncResult` interface (success count, errors, last UID)
- `EmailContent` interface (for future on-demand body fetching)

`email-sync-service.ts`:
- `EmailSyncService` class with methods:
  - `connect()` - Establish IMAP connection
  - `syncFolder(folder: string, userId: string)` - Sync metadata from folder
  - `fetchEmailContent(uid: number)` - On-demand content fetch (stub for now)
  - `disconnect()` - Close connection
- Uses env vars: `ICLOUD_EMAIL`, `ICLOUD_APP_PASSWORD`, `ICLOUD_FOLDER`
- Incremental sync using UID from `email_sync_state`
- Error handling with logging

**Blockers:**
- [ ] T2 (TypeScript Types) must be complete
- [ ] T3 (ImapFlow) must be installed

**Approval Gate:**
- [ ] Service compiles without errors
- [ ] Unit test or manual test confirms IMAP connection works
- [ ] Metadata correctly inserted into `emails` table
- [ ] `email_sync_state` updated with last synced UID
- [ ] Error handling tested (invalid credentials, network failure)

---

### T5: Email Sync API Route

**Description:** Create API endpoint to trigger manual email sync.

**Deliverables:**
- [ ] New file: `src/app/api/emails/sync/route.ts`

**Endpoints:**
- `POST /api/emails/sync` - Trigger sync for authenticated user

**Response:**
```json
{
  "success": true,
  "synced": 15,
  "errors": 0,
  "lastUid": 12345
}
```

**Blockers:**
- [ ] T4 (Email Sync Service) must be complete

**Approval Gate:**
- [ ] Route protected by authentication
- [ ] Calling sync endpoint triggers email fetch
- [ ] Response includes sync statistics
- [ ] Error responses handled gracefully
- [ ] Tested via curl or API client

---

### T6: Email List API Route

**Description:** Create API endpoint to retrieve synced emails with pagination.

**Deliverables:**
- [ ] New file: `src/app/api/emails/route.ts`

**Endpoints:**
- `GET /api/emails` - List emails for authenticated user

**Query Parameters:**
- `folder` (optional) - Filter by folder
- `limit` (default: 50)
- `offset` (default: 0)
- `search` (optional) - Search subject/from

**Response:**
```json
{
  "emails": [...],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

**Blockers:**
- [ ] T4 (Email Sync Service) must be complete
- [ ] Some emails synced in database for testing

**Approval Gate:**
- [ ] Route protected by authentication
- [ ] Pagination works correctly
- [ ] Search filters results
- [ ] Only returns emails for authenticated user (RLS verified)

---

### T7: Email Detail API Route

**Description:** Create API endpoint to retrieve single email details.

**Deliverables:**
- [ ] New file: `src/app/api/emails/[id]/route.ts`

**Endpoints:**
- `GET /api/emails/[id]` - Get single email by ID

**Blockers:**
- [ ] T4 (Email Sync Service) must be complete

**Approval Gate:**
- [ ] Route protected by authentication
- [ ] Returns 404 for non-existent or unauthorized emails
- [ ] Returns complete email metadata

---

### T8: Settings UI for Emails

**Description:** Create the settings page to view and manage synced emails.

**Deliverables:**
- [ ] New file: `src/app/settings/emails/page.tsx`
- [ ] New file: `src/components/page-specific/emails-settings.tsx`
- [ ] Modified: `src/components/page-specific/settings-layout.tsx` (add nav item)

**Features:**
- Email list with subject, from, date columns
- Sync status display (last sync time, total count)
- "Sync Now" button (calls POST /api/emails/sync)
- Basic search/filter functionality
- Loading and error states

**Blockers:**
- [ ] T5 (Sync API) must be complete
- [ ] T6 (List API) must be complete

**Approval Gate:**
- [ ] Page accessible from settings navigation
- [ ] Email list displays correctly
- [ ] Sync Now button triggers sync and updates list
- [ ] Responsive design (mobile-friendly)
- [ ] Loading/error states work properly

---

### T9: Cron Integration

**Description:** Integrate email sync into the daily cron job.

**Deliverables:**
- [ ] Modified: `src/app/api/cron/sync-all-rates/route.ts`

**Implementation:**
- Add email sync step after exchange rate sync
- Only runs if `ICLOUD_EMAIL` and `ICLOUD_APP_PASSWORD` are configured
- Logs sync results
- Handles errors without blocking rate sync

```typescript
// After rate sync...
if (process.env.ICLOUD_EMAIL && process.env.ICLOUD_APP_PASSWORD) {
  const emailService = new EmailSyncService();
  await emailService.connect();
  await emailService.syncFolder(process.env.ICLOUD_FOLDER || 'Transactions', userId);
  await emailService.disconnect();
}
```

**Blockers:**
- [ ] T4 (Email Sync Service) must be complete
- [ ] T5 (Sync API) verified working

**Approval Gate:**
- [ ] Cron job still runs successfully
- [ ] Email sync executes as part of cron
- [ ] Errors in email sync don't break rate sync
- [ ] Logs show sync results

---

### T10: Production Deployment

**Description:** Deploy to production with all required environment variables.

**Deliverables:**
- [ ] Environment variables added to Vercel:
  - `ICLOUD_EMAIL`
  - `ICLOUD_APP_PASSWORD`
  - `ICLOUD_FOLDER`
- [ ] Code deployed to production
- [ ] Manual sync tested in production
- [ ] Cron job verified working

**Blockers:**
- [ ] All previous tasks complete
- [ ] iCloud app-specific password generated (requires 2FA on Apple ID)

**Approval Gate:**
- [ ] Production deployment successful
- [ ] Manual sync works via API
- [ ] Settings UI shows synced emails
- [ ] Cron job runs and syncs emails daily
- [ ] No errors in Vercel logs

---

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `ICLOUD_EMAIL` | iCloud email address | `user@icloud.com` |
| `ICLOUD_APP_PASSWORD` | App-specific password | `xxxx-xxxx-xxxx-xxxx` |
| `ICLOUD_FOLDER` | IMAP folder to sync | `Transactions` |

**To generate app-specific password:**
1. Go to appleid.apple.com
2. Sign in with 2FA enabled
3. Security → App-Specific Passwords → Generate

---

## Recommended Execution Order

| Order | Task | Est. Effort | Risk Level |
|-------|------|-------------|------------|
| 1 | T1: Database Schema | Low | Low |
| 2 | T2: TypeScript Types | Low | Low |
| 3 | T3: Install ImapFlow | Low | Low |
| 4 | T4: Email Sync Service | High | High |
| 5 | T5: Sync API Route | Medium | Medium |
| 6 | T6: List API Route | Low | Low |
| 7 | T7: Detail API Route | Low | Low |
| 8 | T8: Settings UI | Medium | Low |
| 9 | T9: Cron Integration | Low | Medium |
| 10 | T10: Production Deploy | Low | Medium |

**High-risk items:**
- T4 (Email Sync Service) - Core IMAP logic, authentication, error handling

**Parallel options:**
- T6 and T7 can be developed in parallel after T4/T5
- T3 can run in parallel with T1/T2

---

## Testing Checklist

### Local Testing
- [ ] Generate iCloud app-specific password
- [ ] Set env vars in `.env.local`
- [ ] Create test folder in iCloud Mail with sample emails
- [ ] Test sync via API
- [ ] Verify data in Supabase dashboard

### Production Testing
- [ ] Add env vars to Vercel
- [ ] Deploy and test manual sync
- [ ] Wait for cron job, verify auto-sync
- [ ] Check Vercel function logs for errors

---

## Rollback Plan

If issues occur after deployment:

1. **Immediate:** Remove email sync from cron job (T9 revert)
2. **If needed:** Delete API routes (T5-T7)
3. **Last resort:** Drop email tables (but preserve data if possible)

The email sync is additive and isolated - it won't affect existing transaction functionality.
