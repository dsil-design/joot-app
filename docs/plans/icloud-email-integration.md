# iCloud Email Integration Plan

## Overview

Add iCloud email folder access to Joot for the transaction import feature. The app will connect via IMAP, sync email metadata from a specific folder, and provide a UI to view synced emails.

## Technical Approach

### Authentication
- **iCloud IMAP** via app-specific password (requires 2FA on Apple ID)
- Server: `imap.mail.me.com`, Port: `993` (TLS)
- Credentials stored in environment variables (`ICLOUD_EMAIL`, `ICLOUD_APP_PASSWORD`)
- Hardcoded folder name (configurable later)

### Sync Strategy
- **Polling via existing cron**: Piggyback on daily `sync-all-rates` cron job to avoid Vercel Hobby plan limits
- Store email **metadata only**: message ID, subject, from, date, folder, seen status
- Track sync state to fetch only new emails on each run
- Full email content fetched on-demand when needed for import

### Library
- **ImapFlow** - Modern Node.js IMAP client with async/await support

---

## Implementation Plan

### Phase 1: Database Schema

**New table: `emails`**
```sql
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,           -- IMAP message ID (for deduplication)
  uid INTEGER NOT NULL,               -- IMAP UID (for fetching)
  folder TEXT NOT NULL,               -- Source folder name
  subject TEXT,
  from_address TEXT,
  from_name TEXT,
  date TIMESTAMPTZ,
  seen BOOLEAN DEFAULT FALSE,
  has_attachments BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);

-- RLS policy
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own emails" ON emails
  FOR ALL USING (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX idx_emails_user_date ON emails(user_id, date DESC);
```

**New table: `email_sync_state`**
```sql
CREATE TABLE email_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder TEXT NOT NULL,
  last_uid INTEGER DEFAULT 0,         -- Highest UID synced
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, folder)
);
```

**Files to modify/create:**
- `database/migrations/XXXXXX_add_email_tables.sql`
- `database/schema.sql` (update with new tables)
- `src/lib/supabase/types.ts` (regenerate)

---

### Phase 2: Email Service

**New service: `src/lib/services/email-sync-service.ts`**

Core functionality:
- Connect to iCloud IMAP using ImapFlow
- Open specified folder
- Fetch email metadata (not body) since last sync UID
- Store metadata in `emails` table
- Update `email_sync_state` with new highest UID
- Graceful error handling and logging

```typescript
// Pseudocode structure
export class EmailSyncService {
  async connect(): Promise<void>
  async syncFolder(folder: string, userId: string): Promise<SyncResult>
  async fetchEmailContent(uid: number): Promise<EmailContent>  // On-demand
  async disconnect(): Promise<void>
}
```

**Files to create:**
- `src/lib/services/email-sync-service.ts`
- `src/lib/services/email-types.ts` (types for email data)

---

### Phase 3: API Routes

**Email sync endpoint: `src/app/api/emails/sync/route.ts`**
- POST: Trigger manual sync (for testing/on-demand)
- Protected by auth

**Email list endpoint: `src/app/api/emails/route.ts`**
- GET: List synced emails with pagination
- Query params: `folder`, `limit`, `offset`, `search`

**Email detail endpoint: `src/app/api/emails/[id]/route.ts`**
- GET: Fetch single email metadata
- Future: Could fetch full content on-demand

**Files to create:**
- `src/app/api/emails/sync/route.ts`
- `src/app/api/emails/route.ts`
- `src/app/api/emails/[id]/route.ts`

---

### Phase 4: Cron Integration

**Modify: `src/app/api/cron/sync-all-rates/route.ts`**

Add email sync step after rate sync:
```typescript
// After existing rate sync logic...
if (process.env.ICLOUD_EMAIL && process.env.ICLOUD_APP_PASSWORD) {
  await emailSyncService.syncFolder('Transactions', userId);
}
```

Or create a consolidated daily sync that calls both services.

---

### Phase 5: Settings UI

**New page: `src/app/settings/emails/page.tsx`**

Features:
- Display list of synced emails (subject, from, date)
- Show sync status (last sync time, email count)
- Manual "Sync Now" button for testing
- Basic search/filter

**Files to create:**
- `src/app/settings/emails/page.tsx` (server component)
- `src/components/page-specific/emails-settings.tsx` (client component)

**Modify:**
- Settings navigation to include new "Emails" tab

---

## Configuration

**Environment variables to add:**
```
ICLOUD_EMAIL=your-email@icloud.com
ICLOUD_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
ICLOUD_FOLDER=Transactions
```

**Local `.env.local` and Vercel environment settings**

---

## Dependencies

**New npm package:**
```bash
npm install imapflow
```

---

## File Summary

### New Files
| File | Purpose |
|------|---------|
| `database/migrations/XXXXXX_add_email_tables.sql` | Email tables schema |
| `src/lib/services/email-sync-service.ts` | IMAP sync logic |
| `src/lib/services/email-types.ts` | TypeScript types |
| `src/app/api/emails/sync/route.ts` | Manual sync endpoint |
| `src/app/api/emails/route.ts` | List emails endpoint |
| `src/app/api/emails/[id]/route.ts` | Single email endpoint |
| `src/app/settings/emails/page.tsx` | Emails settings page |
| `src/components/page-specific/emails-settings.tsx` | Emails UI component |

### Modified Files
| File | Change |
|------|--------|
| `database/schema.sql` | Add email tables |
| `src/lib/supabase/types.ts` | Regenerate types |
| `src/app/api/cron/sync-all-rates/route.ts` | Add email sync call |
| `src/components/page-specific/settings-layout.tsx` | Add Emails to `navigationItems` array (line 19) |

---

## Implementation Order

1. **Database**: Create migration, update schema, regenerate types
2. **Service**: Install imapflow, build EmailSyncService
3. **API**: Create email API routes
4. **Test**: Manual sync via API, verify emails stored
5. **UI**: Build settings page to view emails
6. **Cron**: Integrate into daily sync
7. **Deploy**: Add env vars to Vercel, test in production

---

## Future Enhancements (Out of Scope)

- Full email content/body storage
- Attachment handling
- Multiple folder support
- Link emails to imported transactions
- Real-time sync via separate worker service
