# Phase 4: Advanced Features — Task Breakdown

**Feature:** Email-to-Transaction Linking System
**Phase:** 4 of 4 — Advanced Features
**Status:** `draft`
**Created:** 2025-01-02
**Target Duration:** 2 weeks
**Prerequisites:** Phase 3 complete

---

## Steering & Inputs

| Input | Path | Intent |
|-------|------|--------|
| Main Spec | `design-docs/email-transaction-linking-system.md` | Complete feature specification |
| Wireframes | `design-docs/email-transaction-wireframes.md` | UI layouts and interactions |
| Roadmap | `design-docs/email-transaction-implementation-roadmap.md` | 8-week implementation plan |
| Phase 1-3 Tasks | `design-docs/tasks/phase-*.md` | Previous phase work |
| AI Skill Guide | `.claude/skills/email-linking/SKILL.md` | Code patterns and architecture |

**Key Constraints:**
- Manual linking allows user override of system matches
- Import history provides complete audit trail
- Settings in existing `/settings` structure
- Cron job already integrated (18:00 UTC daily)

---

## AI Implementation Guide

### Recommended Agents by Task Group

| Group | Agent | Why |
|-------|-------|-----|
| Manual Link (P4-001 to P4-005) | `frontend-developer` | Search modal, linking UI |
| History (P4-006 to P4-010) | `frontend-developer` | Timeline UI, export |
| Settings (P4-011 to P4-014) | `frontend-developer` | Settings page integration |
| Jobs (P4-015 to P4-017) | `backend-architect` | Cron verification |
| Email Detail (P4-018 to P4-021) | `frontend-developer` | Detail viewer, edit mode |
| Final (P4-022 to P4-028) | `code-reviewer`, `test-automator` | Quality assurance |

### Critical Codebase Patterns

**Transaction Search API:**
```typescript
// File: src/app/api/transactions/search/route.ts

const { searchParams } = new URL(request.url);
const query = searchParams.get('q');
const dateFrom = searchParams.get('dateFrom');
const dateTo = searchParams.get('dateTo');
const vendorId = searchParams.get('vendor_id');
const paymentMethodId = searchParams.get('payment_method_id');
const limit = parseInt(searchParams.get('limit') || '20');
const offset = parseInt(searchParams.get('offset') || '0');

let queryBuilder = supabase
  .from('transactions')
  .select('*, vendors(*), payment_methods(*)')
  .eq('user_id', user.id)
  .order('transaction_date', { ascending: false })
  .range(offset, offset + limit - 1);

if (query) {
  queryBuilder = queryBuilder.or(`description.ilike.%${query}%,vendors.name.ilike.%${query}%`);
}
if (dateFrom) {
  queryBuilder = queryBuilder.gte('transaction_date', dateFrom);
}
if (dateTo) {
  queryBuilder = queryBuilder.lte('transaction_date', dateTo);
}
```

**Activity Logging Pattern:**
```typescript
async function logImportActivity(
  userId: string,
  activityType: 'sync' | 'upload' | 'approve' | 'reject' | 'link' | 'unlink',
  description: string,
  metadata: Record<string, unknown> = {}
) {
  await supabase.from('import_activities').insert({
    user_id: userId,
    activity_type: activityType,
    description,
    transactions_affected: metadata.count || 1,
    total_amount: metadata.amount || null,
    metadata,
    created_at: new Date().toISOString(),
  });
}
```

**CSV Export Pattern:**
```typescript
function generateCSV(data: ImportActivity[]): string {
  const headers = ['Date', 'Type', 'Description', 'Count', 'Amount'];
  const rows = data.map(item => [
    new Date(item.created_at).toLocaleDateString(),
    item.activity_type,
    item.description,
    item.transactions_affected,
    item.total_amount ? `$${item.total_amount.toFixed(2)}` : '-',
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// Trigger download
const blob = new Blob([csvContent], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `import-history-${dateRange}.csv`;
a.click();
```

**Email Body Sanitization (DOMPurify):**
```typescript
import DOMPurify from 'dompurify';

const sanitizedHtml = DOMPurify.sanitize(emailBody, {
  ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'a', 'img', 'table', 'tr', 'td', 'th', 'div', 'span'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style'],
  ALLOW_DATA_ATTR: false,
});
```

### Key File Locations

```
src/app/imports/
├── history/page.tsx           # P4-006
└── (existing pages)

src/app/settings/
└── emails/page.tsx            # P4-011 (may need to create)

src/components/page-specific/
├── transaction-search-modal.tsx  # P4-001
├── link-confirmation-dialog.tsx  # P4-003
├── full-email-viewer.tsx         # P4-018
└── email-edit-form.tsx           # P4-019

src/app/api/
├── transactions/search/route.ts  # P4-002
├── imports/link/route.ts         # P4-004
├── imports/history/route.ts      # P4-008
└── emails/transactions/[id]/route.ts  # P4-021
```

---

## How to Use This Task List

1. Tasks are numbered `P4-001`, `P4-002`, etc. (P4 = Phase 4)
2. Execute tasks individually or in dependency order
3. Each task contains Acceptance Criteria and Verification steps
4. Parallelizable tasks are marked with `parallel: true`
5. While in `draft`, tasks may be refined. After `approved`, IDs are immutable

---

## Task Index

| Status | ID | Title | Group | Depends | Blocks |
|--------|-----|-------|-------|---------|--------|
| [ ] | P4-001 | Create transaction search modal | Manual Link | — | P4-002 |
| [ ] | P4-002 | Build transaction search API with filters | Manual Link | P4-001 | P4-003 |
| [ ] | P4-003 | Implement link confirmation flow | Manual Link | P4-002 | P4-004 |
| [ ] | P4-004 | Create API route: POST /api/imports/link | Manual Link | P4-003 | P4-005 |
| [ ] | P4-005 | Add unlink capability | Manual Link | P4-004 | — |
| [ ] | P4-006 | Build import history page UI | History | — | P4-007 |
| [ ] | P4-007 | Create activity logging system | History | P4-006 | P4-008 |
| [ ] | P4-008 | Implement filter and search for history | History | P4-007 | P4-009 |
| [ ] | P4-009 | Add CSV export functionality | History | P4-008 | P4-010 |
| [ ] | P4-010 | Create detail expansion view for history items | History | P4-009 | — |
| [ ] | P4-011 | Enhance /settings/emails page | Settings | — | P4-012 |
| [ ] | P4-012 | Add auto-sync preferences toggle | Settings | P4-011 | P4-013 |
| [ ] | P4-013 | Add confidence threshold setting | Settings | P4-012 | P4-014 |
| [ ] | P4-014 | Create import rules configuration | Settings | P4-013 | — |
| [ ] | P4-015 | Verify cron job integration is working | Jobs | — | P4-016 |
| [ ] | P4-016 | Add job monitoring/logging | Jobs | P4-015 | P4-017 |
| [ ] | P4-017 | Implement manual sync trigger from UI | Jobs | P4-016 | — |
| [ ] | P4-018 | Build full email viewer component | Email Detail | — | P4-019 |
| [ ] | P4-019 | Add edit mode for extracted data | Email Detail | P4-018 | P4-020 |
| [ ] | P4-020 | Implement save changes flow | Email Detail | P4-019 | P4-021 |
| [ ] | P4-021 | Create API route: PUT /api/emails/transactions/[id] | Email Detail | P4-020 | — |
| [ ] | P4-022 | Code review and refactoring | Final | — | P4-023 |
| [ ] | P4-023 | Performance optimization pass | Final | P4-022 | P4-024 |
| [ ] | P4-024 | Accessibility audit (WCAG 2.1 AA) | Final | P4-023 | P4-025 |
| [ ] | P4-025 | Documentation updates | Final | P4-024 | P4-026 |
| [ ] | P4-026 | Create user guide for import feature | Final | P4-025 | P4-027 |
| [ ] | P4-027 | End-to-end testing of complete flow | Final | P4-026 | P4-028 |
| [ ] | P4-028 | Beta testing with production data | Final | P4-027 | — |

---

## Tasks (Detailed Sections)

<!--P4-001-->
### P4-001 — Create transaction search modal

**Status:** open
**Group:** Manual Link
**Depends on:** —  |  **Blocks:** P4-002  |  **parallel:** true

**Description:**
Build the modal for searching and selecting a transaction to manually link to an email.

**Acceptance Criteria (EARS):**
- Modal SHALL have search box for vendor, amount, description
- Modal SHALL have date range filter (auto-populated ±7 days from email date)
- Modal SHALL have filters for: vendor, payment method, amount range
- Results SHALL show: transaction description, amount, date, payment method
- Results SHALL be selectable (radio button style)

**Deliverables:**
- `src/components/page-specific/transaction-search-modal.tsx`

**Verification:**
- Visual: Matches wireframe
- Search: Results filter correctly

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-002-->
### P4-002 — Build transaction search API with filters

**Status:** open
**Group:** Manual Link
**Depends on:** P4-001  |  **Blocks:** P4-003  |  **parallel:** false

**Description:**
Create API endpoint for searching transactions with various filters for manual linking.

**Acceptance Criteria (EARS):**
- The endpoint SHALL accept: search query, dateFrom, dateTo, vendor_id, payment_method_id, amountMin, amountMax
- Results SHALL be ordered by date descending
- Results SHALL include match suggestions (if any)
- Results SHALL be paginated (limit/offset)

**Deliverables:**
- `src/app/api/transactions/search/route.ts`

**Verification:**
- Functional: All filters work correctly
- Performance: Returns quickly even with many transactions

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-003-->
### P4-003 — Implement link confirmation flow

**Status:** open
**Group:** Manual Link
**Depends on:** P4-002  |  **Blocks:** P4-004  |  **parallel:** false

**Description:**
Build the confirmation dialog when user selects a transaction to link.

**Acceptance Criteria (EARS):**
- Dialog SHALL show email summary and selected transaction summary
- Dialog SHALL show any warnings (e.g., already linked, amount mismatch)
- User SHALL confirm or cancel the link
- WHEN confirmed THEN update database and refresh UI

**Deliverables:**
- Link confirmation dialog component
- Confirmation flow logic

**Verification:**
- Visual: Shows both items clearly
- Warnings: Displays when appropriate

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-004-->
### P4-004 — Create API route: POST /api/imports/link

**Status:** open
**Group:** Manual Link
**Depends on:** P4-003  |  **Blocks:** P4-005  |  **parallel:** false

**Description:**
Create API endpoint to manually link an email to a transaction.

**Acceptance Criteria (EARS):**
- The endpoint SHALL accept: emailId, transactionId
- WHEN linked THEN update email_transactions with matched_transaction_id
- WHEN linked THEN set match_method = 'manual'
- WHEN linked THEN set status = 'matched'
- The response SHALL include updated email and transaction objects

**Deliverables:**
- `src/app/api/imports/link/route.ts`

**Verification:**
- Functional: Link is created correctly
- Status: Email status updated

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-005-->
### P4-005 — Add unlink capability

**Status:** open
**Group:** Manual Link
**Depends on:** P4-004  |  **Blocks:** —  |  **parallel:** false

**Description:**
Allow users to remove a link between an email and transaction.

**Acceptance Criteria (EARS):**
- "Unlink" option SHALL appear on matched emails
- WHEN clicked THEN show confirmation dialog
- WHEN confirmed THEN clear matched_transaction_id
- WHEN unlinked THEN email returns to 'pending_review' status
- Activity log SHALL record the unlink action

**Deliverables:**
- Unlink button in email detail/match card
- API endpoint for unlink (or extend link endpoint)

**Verification:**
- Functional: Link is removed correctly
- Status: Email returns to pending_review

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-006-->
### P4-006 — Build import history page UI

**Status:** open
**Group:** History
**Depends on:** —  |  **Blocks:** P4-007  |  **parallel:** true

**Description:**
Build the page showing import activity history with timeline view.

**Acceptance Criteria (EARS):**
- Page SHALL show chronological list of import activities
- Each item SHALL show: timestamp, type icon, description, affected count, total amount
- Items SHALL be grouped by date (Today, Yesterday, This Week, etc.)
- Page SHALL support infinite scroll pagination

**Deliverables:**
- `src/app/imports/history/page.tsx`

**Verification:**
- Visual: Timeline style matches wireframe
- Performance: Handles large history well

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-007-->
### P4-007 — Create activity logging system

**Status:** open
**Group:** History
**Depends on:** P4-006  |  **Blocks:** P4-008  |  **parallel:** false

**Description:**
Implement comprehensive activity logging for all import actions.

**Acceptance Criteria (EARS):**
- ALL import actions SHALL be logged: sync, upload, match, approve, reject, link, unlink
- Each log SHALL include: user_id, activity_type, description, transactions_affected, total_amount, metadata
- Logs SHALL be queryable by type and date range
- Metadata SHALL include relevant IDs for navigation

**Deliverables:**
- Activity logging service/utility
- Integration with all import actions

**Verification:**
- Coverage: All actions logged
- Data: All relevant info captured

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-008-->
### P4-008 — Implement filter and search for history

**Status:** open
**Group:** History
**Depends on:** P4-007  |  **Blocks:** P4-009  |  **parallel:** false

**Description:**
Add filtering and search capabilities to the history page.

**Acceptance Criteria (EARS):**
- Filters SHALL include: activity type, date range
- Search SHALL filter by description text
- Filters SHALL be reflected in URL params
- Clear filters button SHALL reset all

**Deliverables:**
- Filter bar for history page
- URL param sync

**Verification:**
- Functional: Filters work correctly
- URL: State persists in URL

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-009-->
### P4-009 — Add CSV export functionality

**Status:** open
**Group:** History
**Depends on:** P4-008  |  **Blocks:** P4-010  |  **parallel:** false

**Description:**
Allow exporting import history to CSV format.

**Acceptance Criteria (EARS):**
- "Export CSV" button SHALL appear on history page
- Export SHALL respect current filters
- CSV SHALL include: date, type, description, count, amount, currency
- File SHALL be named with date range (e.g., "import-history-2025-01.csv")

**Deliverables:**
- Export button and API endpoint
- CSV generation logic

**Verification:**
- Export: File downloads correctly
- Format: CSV is valid and complete

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-010-->
### P4-010 — Create detail expansion view for history items

**Status:** open
**Group:** History
**Depends on:** P4-009  |  **Blocks:** —  |  **parallel:** false

**Description:**
Add expandable detail view for history items showing affected transactions.

**Acceptance Criteria (EARS):**
- WHEN item clicked THEN expand to show affected transactions
- Detail view SHALL show: list of transactions with amounts
- Transactions SHALL be links to transaction detail
- Collapse on click again or clicking different item

**Deliverables:**
- Expandable detail component in history

**Verification:**
- Visual: Expansion animation smooth
- Links: Navigate to correct transactions

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-011-->
### P4-011 — Enhance /settings/emails page

**Status:** open
**Group:** Settings
**Depends on:** —  |  **Blocks:** P4-012  |  **parallel:** true

**Description:**
Enhance the email settings page with import-related configuration.

**Acceptance Criteria (EARS):**
- Page SHALL show current iCloud connection status
- Page SHALL show sync history (last 5 syncs with status)
- Page SHALL allow testing connection
- Page SHALL link to import dashboard

**Deliverables:**
- Enhanced `/settings/emails` page
- Connection status component

**Verification:**
- Visual: Clear connection status
- Functional: Test connection works

**Notes & Open Questions:**
- Check if `/settings/emails` exists or needs to be created

**Completion Log:** _(empty initially)_

---

<!--P4-012-->
### P4-012 — Add auto-sync preferences toggle

**Status:** open
**Group:** Settings
**Depends on:** P4-011  |  **Blocks:** P4-013  |  **parallel:** false

**Description:**
Add toggle to enable/disable automatic email sync.

**Acceptance Criteria (EARS):**
- Toggle SHALL enable/disable the daily cron email sync
- WHEN disabled THEN manual sync still available
- Setting SHALL be persisted in user preferences
- Current status SHALL be clearly shown

**Deliverables:**
- Auto-sync toggle in settings
- User preference storage

**Verification:**
- Toggle: State persists
- Cron: Respects setting

**Notes & Open Questions:**
- Cron job already checks `auto_sync_enabled` configuration

**Completion Log:** _(empty initially)_

---

<!--P4-013-->
### P4-013 — Add confidence threshold setting

**Status:** open
**Group:** Settings
**Depends on:** P4-012  |  **Blocks:** P4-014  |  **parallel:** false

**Description:**
Allow user to configure the confidence threshold for "high confidence" matches.

**Acceptance Criteria (EARS):**
- Slider or dropdown to set threshold (default: 90%)
- Range: 50% to 100%
- WHEN threshold changed THEN affects batch approve visibility
- Setting SHALL be persisted

**Deliverables:**
- Confidence threshold control in settings
- Integration with matching logic

**Verification:**
- Setting: Persists correctly
- Effect: Batch approve reflects threshold

**Notes & Open Questions:**
- This affects which matches show as "high confidence" but does NOT enable auto-approve

**Completion Log:** _(empty initially)_

---

<!--P4-014-->
### P4-014 — Create import rules configuration

**Status:** open
**Group:** Settings
**Depends on:** P4-013  |  **Blocks:** —  |  **parallel:** false

**Description:**
Allow configuring rules for how different email types are handled.

**Acceptance Criteria (EARS):**
- User SHALL see list of recognized email types (Grab, Bolt, etc.)
- For each type, user SHALL configure: default payment method, default status
- Rules SHALL affect how new emails are classified
- Reset to defaults SHALL be available

**Deliverables:**
- Import rules configuration UI
- Rules storage and application

**Verification:**
- Rules: Apply to new emails correctly
- Reset: Works correctly

**Notes & Open Questions:**
- This is a lighter version of the Phase 5 "learn from confirmations" feature

**Completion Log:** _(empty initially)_

---

<!--P4-015-->
### P4-015 — Verify cron job integration is working

**Status:** open
**Group:** Jobs
**Depends on:** —  |  **Blocks:** P4-016  |  **parallel:** true

**Description:**
Verify that the daily cron job correctly syncs emails and populates email_transactions.

**Acceptance Criteria (EARS):**
- Cron job SHALL run at 18:00 UTC daily
- Emails SHALL be synced and parsed
- email_transactions SHALL be populated with extracted data
- Errors SHALL be logged to sync_history

**Deliverables:**
- Test results documenting cron behavior
- Any fixes needed

**Verification:**
- Logs: Confirm job runs
- Data: email_transactions populated

**Notes & Open Questions:**
- Cron already integrated in Phase 1, this is verification

**Completion Log:** _(empty initially)_

---

<!--P4-016-->
### P4-016 — Add job monitoring/logging

**Status:** open
**Group:** Jobs
**Depends on:** P4-015  |  **Blocks:** P4-017  |  **parallel:** false

**Description:**
Enhance job monitoring with detailed logging and status tracking.

**Acceptance Criteria (EARS):**
- Each sync SHALL log: start time, end time, emails processed, errors
- Failed syncs SHALL include error details
- sync_history SHALL be queryable for debugging
- Dashboard SHALL show last sync status

**Deliverables:**
- Enhanced logging in sync service
- Query functions for sync_history

**Verification:**
- Logs: Complete and queryable
- Dashboard: Shows accurate status

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-017-->
### P4-017 — Implement manual sync trigger from UI

**Status:** open
**Group:** Jobs
**Depends on:** P4-016  |  **Blocks:** —  |  **parallel:** false

**Description:**
Allow users to trigger email sync manually from the dashboard.

**Acceptance Criteria (EARS):**
- "Sync Now" button SHALL trigger immediate sync
- Button SHALL show loading state during sync
- WHEN sync completes THEN show success toast with count
- WHEN sync fails THEN show error toast with retry option
- WHEN sync already running THEN disable button

**Deliverables:**
- Sync Now button integration
- Sync status feedback

**Verification:**
- Functional: Sync triggers correctly
- Feedback: User knows what's happening

**Notes & Open Questions:**
- API endpoint already exists from Phase 1

**Completion Log:** _(empty initially)_

---

<!--P4-018-->
### P4-018 — Build full email viewer component

**Status:** open
**Group:** Email Detail
**Depends on:** —  |  **Blocks:** P4-019  |  **parallel:** true

**Description:**
Build component for viewing complete email details including body.

**Acceptance Criteria (EARS):**
- Viewer SHALL show: full header (from, to, date, subject)
- Viewer SHALL show: email body (HTML sanitized or plain text)
- Viewer SHALL show: attachments list (if any)
- Body SHALL be collapsible/expandable

**Deliverables:**
- Full email viewer component

**Verification:**
- Visual: All email parts visible
- Security: HTML sanitized

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-019-->
### P4-019 — Add edit mode for extracted data

**Status:** open
**Group:** Email Detail
**Depends on:** P4-018  |  **Blocks:** P4-020  |  **parallel:** false

**Description:**
Allow editing of extracted transaction data in email detail view.

**Acceptance Criteria (EARS):**
- "Edit" button SHALL switch to edit mode
- Editable fields: vendor, amount, currency, date, description
- Vendor field SHALL have autocomplete from existing vendors
- Cancel SHALL revert changes
- Validation SHALL prevent invalid data

**Deliverables:**
- Edit mode for email detail
- Form validation

**Verification:**
- Edit: Fields are editable
- Validation: Invalid data rejected

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-020-->
### P4-020 — Implement save changes flow

**Status:** open
**Group:** Email Detail
**Depends on:** P4-019  |  **Blocks:** P4-021  |  **parallel:** false

**Description:**
Complete the save flow for edited email transaction data.

**Acceptance Criteria (EARS):**
- "Save" button SHALL submit changes to API
- WHEN saved THEN show success toast
- WHEN saved THEN update UI with new data
- WHEN save fails THEN show error and preserve edit state
- Activity log SHALL record the edit

**Deliverables:**
- Save flow implementation
- Optimistic update handling

**Verification:**
- Save: Data persists correctly
- Error: Edit state preserved on failure

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-021-->
### P4-021 — Create API route: PUT /api/emails/transactions/[id]

**Status:** open
**Group:** Email Detail
**Depends on:** P4-020  |  **Blocks:** —  |  **parallel:** false

**Description:**
Create API endpoint to update email transaction extracted data.

**Acceptance Criteria (EARS):**
- The endpoint SHALL accept: vendor_id, amount, currency, transaction_date, description
- The endpoint SHALL validate all fields
- WHEN updated THEN recalculate match confidence
- The response SHALL include updated email object

**Deliverables:**
- `src/app/api/emails/transactions/[id]/route.ts`

**Verification:**
- Functional: Updates saved correctly
- Validation: Invalid data rejected

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-022-->
### P4-022 — Code review and refactoring

**Status:** open
**Group:** Final
**Depends on:** —  |  **Blocks:** P4-023  |  **parallel:** false

**Description:**
Conduct comprehensive code review of all import feature code.

**Acceptance Criteria (EARS):**
- All code SHALL follow project coding standards
- No console.log statements in production code
- No TODO comments without linked issue
- TypeScript strict mode passes
- No any types without justification

**Deliverables:**
- Code review notes
- Refactoring commits

**Verification:**
- Lint: ESLint passes
- Types: TypeScript compiles without errors

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-023-->
### P4-023 — Performance optimization pass

**Status:** open
**Group:** Final
**Depends on:** P4-022  |  **Blocks:** P4-024  |  **parallel:** false

**Description:**
Optimize performance across all import feature pages.

**Acceptance Criteria (EARS):**
- All pages SHALL achieve Lighthouse performance score > 90
- Review queue SHALL handle 500+ items without jank
- Large file uploads SHALL not block UI
- Database queries SHALL be optimized (explain analyze)
- Bundle size impact SHALL be documented

**Deliverables:**
- Lighthouse reports
- Performance optimizations applied

**Verification:**
- Lighthouse: Scores > 90
- Real use: No perceptible lag

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-024-->
### P4-024 — Accessibility audit (WCAG 2.1 AA)

**Status:** open
**Group:** Final
**Depends on:** P4-023  |  **Blocks:** P4-025  |  **parallel:** false

**Description:**
Conduct comprehensive accessibility audit of all import features.

**Acceptance Criteria (EARS):**
- All pages SHALL pass axe-core automated tests
- All interactive elements SHALL be keyboard accessible
- Color contrast SHALL meet WCAG AA (4.5:1 for text)
- Screen reader testing SHALL confirm usability
- Focus order SHALL be logical

**Deliverables:**
- Accessibility audit report
- Fixes for any violations

**Verification:**
- Tools: axe-core, Lighthouse accessibility
- Manual: VoiceOver testing

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-025-->
### P4-025 — Documentation updates

**Status:** open
**Group:** Final
**Depends on:** P4-024  |  **Blocks:** P4-026  |  **parallel:** false

**Description:**
Update technical documentation for the import feature.

**Acceptance Criteria (EARS):**
- CLAUDE.md SHALL be updated with import feature info
- API endpoints SHALL be documented
- Database schema changes SHALL be documented
- Design docs SHALL be updated with implementation notes

**Deliverables:**
- Updated CLAUDE.md
- API documentation
- Updated design docs

**Verification:**
- Accuracy: Docs match implementation

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-026-->
### P4-026 — Create user guide for import feature

**Status:** open
**Group:** Final
**Depends on:** P4-025  |  **Blocks:** P4-027  |  **parallel:** false

**Description:**
Create user-facing documentation/guide for the import feature.

**Acceptance Criteria (EARS):**
- Guide SHALL cover: getting started, uploading statements, reviewing matches, manual linking
- Guide SHALL include screenshots
- Guide SHALL be accessible from app (help link)
- FAQ section SHALL address common questions

**Deliverables:**
- User guide document or help page

**Verification:**
- Complete: All features covered
- Clear: Non-technical users can understand

**Notes & Open Questions:**
- Can be in-app help or external documentation

**Completion Log:** _(empty initially)_

---

<!--P4-027-->
### P4-027 — End-to-end testing of complete flow

**Status:** open
**Group:** Final
**Depends on:** P4-026  |  **Blocks:** P4-028  |  **parallel:** false

**Description:**
Create and run comprehensive end-to-end tests for the complete import flow.

**Acceptance Criteria (EARS):**
- Test: Email sync → extraction → statement upload → matching → approve
- Test: Manual link flow
- Test: Reject flow
- Test: Edit and save flow
- Tests SHALL use realistic data

**Deliverables:**
- E2E test suite using Playwright or Cypress
- Test fixtures

**Verification:**
- All E2E tests pass
- Coverage of critical paths

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P4-028-->
### P4-028 — Beta testing with production data

**Status:** open
**Group:** Final
**Depends on:** P4-027  |  **Blocks:** —  |  **parallel:** false

**Description:**
Conduct beta testing using real production data (your own account).

**Acceptance Criteria (EARS):**
- Test with real November-December statement
- Test with real emails from Grab, Bolt, banks
- Document any issues found
- Verify matching accuracy on real data
- Confirm no data loss or corruption

**Deliverables:**
- Beta test report
- Bug fixes for any issues found

**Verification:**
- Real data: Works correctly
- Accuracy: Matches are correct

**Notes & Open Questions:**
- This is single-user app, so beta testing is with your own data

**Completion Log:** _(empty initially)_

---

## Dependency Map

```
Manual Link Path:
P4-001 ──► P4-002 ──► P4-003 ──► P4-004 ──► P4-005

History Path:
P4-006 ──► P4-007 ──► P4-008 ──► P4-009 ──► P4-010

Settings Path:
P4-011 ──► P4-012 ──► P4-013 ──► P4-014

Jobs Path:
P4-015 ──► P4-016 ──► P4-017

Email Detail Path:
P4-018 ──► P4-019 ──► P4-020 ──► P4-021

Final Path (sequential):
P4-022 ──► P4-023 ──► P4-024 ──► P4-025 ──► P4-026 ──► P4-027 ──► P4-028

Safe Parallel Lanes:
- P4-001, P4-006, P4-011, P4-015, P4-018 can all start in parallel
- Manual Link, History, Settings, Jobs, Email Detail paths are independent
- Final path must wait for all feature work to complete
```

---

## Traceability

| Spec Requirement | Plan Section | Task IDs |
|-----------------|--------------|----------|
| Manual linking | Phase 4: Manual Linking | P4-001–P4-005 |
| Import history | Phase 4: Import History | P4-006–P4-010 |
| Settings integration | Phase 4: Settings Integration | P4-011–P4-014 |
| Background jobs | Phase 4: Background Jobs | P4-015–P4-017 |
| Email detail view | Phase 4: Email Detail View | P4-018–P4-021 |
| Final polish | Phase 4: Final Polish | P4-022–P4-028 |

---

## Estimates & Sequencing Notes

| Task ID | Estimate | Notes |
|---------|----------|-------|
| P4-001–P4-005 | S-M (2-3 hrs each) | Manual linking flow |
| P4-006–P4-010 | S-M (2-3 hrs each) | History page |
| P4-011–P4-014 | S (1-2 hrs each) | Settings integration |
| P4-015–P4-017 | S (1-2 hrs each) | Jobs verification |
| P4-018–P4-021 | M (2-3 hrs each) | Email detail editing |
| P4-022–P4-024 | M (3-4 hrs each) | Code quality |
| P4-025–P4-026 | M (2-4 hrs each) | Documentation |
| P4-027–P4-028 | L (4-6 hrs each) | Testing |

**Total Estimated Time:** ~55-70 hours (2 weeks with buffer)

---

## Update Protocol

When implementing tasks:

1. **Mark task in progress:** Add note to Completion Log with start timestamp
2. **Update status when done:**
   - Flip checkbox in Task Index: `[ ]` → `[x]`
   - Change `**Status:** open` → `**Status:** done`
   - Add Completion Log entry: `- done: <ISO-8601> · by: <agent|user> · notes: <optional>`
3. **If blocked:** Add note to Notes & Open Questions, do not mark done
4. **If scope changes:** Append new tasks with next available ID (P4-029, etc.)
5. **Never renumber** existing task IDs after document is approved

---

## Approval Gate

Task breakdown complete (initial state: all tasks open).

**Phase 4 Summary:**
- 28 tasks total
- 5 Manual Link, 5 History, 4 Settings, 3 Jobs, 4 Email Detail, 7 Final
- Focus on advanced features and polish
- Multiple parallel work opportunities before final polish

**Complete Feature Summary (All Phases):**
- Phase 1: 27 tasks (Foundation)
- Phase 2: 35 tasks (Core Matching)
- Phase 3: 32 tasks (User Experience)
- Phase 4: 28 tasks (Advanced Features)
- **Total: 122 tasks**

Would you like to approve or modify the tasks?
