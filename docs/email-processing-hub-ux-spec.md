# Email Processing Hub — UX Specification

**Project:** Joot Transaction Tracker
**Feature:** Email Processing Hub (`/imports/emails`)
**Date:** 2026-03-02
**Version:** 1.0
**Author:** UX Design
**Status:** Implemented

---

## Table of Contents

1. [Design Context & Constraints](#design-context--constraints)
2. [Information Architecture](#information-architecture)
3. [User Flows](#user-flows)
4. [Color & Status System](#color--status-system)
5. [Page Layout Specifications](#page-layout-specifications)
6. [Component Specifications](#component-specifications)
7. [Interaction Patterns](#interaction-patterns)
8. [Mobile Adaptations](#mobile-adaptations)
9. [Empty States & Edge Cases](#empty-states--edge-cases)
10. [Accessibility Requirements](#accessibility-requirements)

---

## Design Context & Constraints

### What Already Exists

The `/imports` section has an established two-tab structure:

```
/imports          →  Coverage     (statement-centric, payment method cards + timeline grid)
/imports/review   →  Review Queue (mixed statement + email items in MatchCard format)
```

The `ImportsLayout` component renders a left sidebar nav on desktop (`md:w-64`) and horizontal tab pills on mobile. Adding a third nav item is a minimal, additive change requiring only an update to `navigationItems` in `imports-layout.tsx`.

The existing color system from `imports-redesign-wireframes.md` governs all status states:

```
GREEN  — done, reconciled, all caught up
AMBER  — pending review, attention needed
BLUE   — processing, in progress
RED    — missing, gap, error
PURPLE — new transaction (not in Joot yet)
GRAY   — future / inactive
```

The `MatchCard` component already establishes the two-panel comparison UI pattern with confidence-tiered borders. The Email Processing Hub reuses this visual language rather than inventing new patterns.

### Design Decisions Made Without Clarification

This specification makes the following decisions based on codebase analysis:

1. **Tab within /imports, not a separate page.** The layout wrapper already exists and handles auth, responsive structure, and navigation. A third nav tab adds zero structural overhead. A separate page at `/emails` would require duplicating the layout and break the mental model where "Imports" owns all data ingestion.

2. **Information density: compact table as primary, expandable rows for detail.** The Review Queue uses card-based layouts for individual decision-making. The Email Hub serves a different mode — scanning and filtering across many emails to understand pipeline health. A data table with expandable rows handles both modes. Users who want the card experience can click through to Review Queue filtered by source=email.

3. **Batch operations are secondary, not primary.** The Review Queue already handles bulk approve. The Email Hub's primary job is visibility and triage, not action. Batch operations (skip multiple, mark as reviewed) appear as secondary toolbar items that activate on selection.

4. **"Waiting for Statement" items surface as a filterable status plus a dedicated callout widget.** A separate full page would fragment the experience. A dismissible callout card at the top of the Email Hub (visible only when waiting items exist) plus a filter preset gives users two entry points.

---

## Information Architecture

### Navigation Structure

```
/imports
├── Coverage         (/imports)          — existing, statement-centric
├── Review           (/imports/review)   — existing, mixed queue
└── Emails           (/imports/emails)   — NEW, email-centric hub
```

The three-tab left sidebar on desktop:

```
┌─────────────────────────────────┐
│  LayoutDashboard  Coverage      │  ← /imports
│  ClipboardCheck   Review        │  ← /imports/review
│  Mail             Emails        │  ← /imports/emails  (NEW)
└─────────────────────────────────┘
```

`ImportsLayout` change is additive:

```ts
// imports-layout.tsx — add one entry to navigationItems
{
  name: 'Emails',
  href: '/imports/emails',
  icon: Mail,  // from lucide-react
}
```

### Page Hierarchy within /imports/emails

```
/imports/emails
├── (default view)   — stats dashboard + filterable email transaction table
└── (no sub-routes) — detail panel opens inline as expandable row, not a new page
```

The email detail does not get its own URL. The match comparison panel opens as an in-page expansion. This avoids deep-linking complexity and keeps the user in context for sequential review.

### Relationship to Existing Pages

```
/imports/emails  ──[filter by status=pending_review]──►  items visible in /imports/review
/imports/emails  ──[click View Match link]─────────────►  opens match panel inline (not /review)
/imports/emails  ──[bulk action: Send to Review]────────►  stays on /imports/emails
/imports         ──[emailsPendingReview badge]──────────►  links to /imports/emails
/settings/emails ──[operational status only]────────────►  no crossover
```

`/settings/emails` remains a raw sync-status debug view (emails table, sync timestamps, folder info). It is not merged into the hub. Users who need to diagnose sync problems go to Settings. Users who need to process email transactions go to Imports > Emails.

---

## User Flows

### Flow 1: Daily Processing Review

User opens app after overnight email sync to check what arrived.

```
1. /imports (Coverage Page)
   Stats bar shows: "12 emails pending review"
   User clicks "Review Emails →" link in stats bar

2. /imports/emails
   Dashboard widget shows:
   - 12 pending_review  (amber)
   - 3 waiting_for_statement  (blue)
   - 0 matched this week  (green, empty)
   Funnel shows drop-off at extraction stage

3. User scans the table (default filter: status=pending_review)
   Sees column breakdown: vendor, amount, date, parser, confidence, status

4. User spots a Grab receipt with 72 confidence score
   Clicks row to expand inline match panel

5. Match panel opens below the row:
   Left side: email extracted data (Grab, ฿340, Jan 15)
   Right side: best candidate transaction match (Grab, $9.84 USD, Jan 15)
   Confidence breakdown: Amount 40/40, Date 30/30, Vendor 2/30 = 72

6. User confirms: "Yes this matches" → clicks Link to Transaction
   Row updates status badge to "matched" (green)
   Row collapses. Next row auto-focuses.

7. User sees 4 low-confidence emails with no candidate matches
   Selects all 4 via checkboxes → bulk action: "Mark as Waiting for Statement"
   Status updates to waiting_for_statement (blue)

8. Session complete. User sees table is now mostly green + 3 blue.
```

### Flow 2: Waiting for Statement Resolution

User has uploaded a new Bangkok Bank statement and wants to match it against waiting emails.

```
1. Statement is uploaded via /imports, processed, appears in Review Queue
2. User navigates to /imports/emails
3. "Waiting for Statement" callout is visible at top:
   "3 emails are waiting for Bangkok Bank charges to appear"
   [View Waiting Items]

4. User clicks → table filters to status=waiting_for_statement
5. User sees 3 Bangkok Bank items: ฿1,200, ฿890, ฿450
6. User clicks each to expand match panel
7. For 2 of them, the newly uploaded statement created candidates
   Match panel shows green high-confidence match
8. User approves both → status moves to "matched"
9. Third item still has no match → user skips or leaves as waiting
```

### Flow 3: Extraction Audit

User wants to understand why some emails extracted with low confidence.

```
1. /imports/emails, filter: confidence=low
2. Table shows 8 items. User scans "Parser" column — all show "unknown" or "lazada"
3. User clicks Lazada item with 35% confidence to expand
4. Extraction panel shows:
   - Fields extracted: amount=฿299, date=Jan 12
   - Fields missing: vendor_name (empty), order_id (failed regex)
   - Extraction note: "Amount found but vendor pattern not matched"
5. User understands the issue. No action needed — this is diagnostic.
6. User bulk-selects all "unknown" parser items → Skip All
7. They remain in table with "skipped" status for audit trail
```

### Flow 4: Creating a Transaction from Email

User sees a receipt email that extracted cleanly but has no matching transaction.

```
1. /imports/emails, find item: status=pending_review, confidence=high, isNew=true
2. Expand row → match panel shows email data on left, "No match found" on right
   Recommended action: "Create as new transaction"
3. User clicks "Create Transaction" button in panel
4. CreateFromImportDialog opens (reused from Review Queue)
   Pre-filled: vendor=Grab, amount=฿340, date=Jan 15, currency=THB
5. User selects tags, confirms → transaction created and linked
6. Row status updates to "imported" (green)
```

---

## Color & Status System

### Email Transaction Statuses

Status badges use the established color system:

```
pending_review         AMBER   bg-amber-100  text-amber-700  border-amber-300
matched                GREEN   bg-green-100  text-green-700  border-green-300
waiting_for_statement  BLUE    bg-blue-100   text-blue-700   border-blue-300
ready_to_import        PURPLE  bg-purple-100 text-purple-700 border-purple-300
imported               GREEN   bg-green-50   text-green-600  (muted, done state)
skipped                GRAY    bg-gray-100   text-gray-500   border-gray-200
```

### Classification Tags

Inline pill badges, secondary/outline style:

```
receipt               text-xs  pill  (default/zinc)
order_confirmation    text-xs  pill  (default/zinc)
bank_transfer         text-xs  pill  (blue tint)
bill_payment          text-xs  pill  (default/zinc)
unknown               text-xs  pill  (red-50/red-600)
```

### Confidence Score Display

Reuses the existing `ConfidenceIndicator` component:

```
High   score >= 90   green progress bar  "High" badge
Medium score 55-89   amber progress bar  "Medium" badge
Low    score < 55    red progress bar    "Low" badge
```

In the table, confidence is shown as a compact inline badge, not the full progress bar:

```
[●●●○] 72    — three filled dots = medium
[●●●●] 94    — four filled dots = high
[●○○○] 31    — one filled dot = low
```

### Parser Source Tags

Small monospace-style labels in table rows:

```
grab          bg-orange-50  text-orange-700
bolt          bg-green-50   text-green-700
lazada        bg-blue-50    text-blue-700
bangkok-bank  bg-teal-50    text-teal-700
kasikorn      bg-purple-50  text-purple-700
unknown       bg-gray-100   text-gray-500
```

---

## Page Layout Specifications

### DESIGN A: Email Hub — Desktop (1280px+)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  IMPORTS                                                           [Joot nav] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ← [Back to Home]                                                            │
│  Imports                                                                      │
│                                                                               │
│  ┌──────────────────┐  ┌─────────────────────────────────────────────────┐   │
│  │ Coverage         │  │                                                   │   │
│  │ Review           │  │  STATS ROW                                       │   │
│  │ Emails  ←(active)│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────┐ │   │
│  └──────────────────┘  │  │ 12       │ │ 3        │ │ 47       │ │ 8  │ │   │
│                        │  │ Pending  │ │ Waiting  │ │ Matched  │ │Imp.│ │   │
│  [desktop left nav]    │  │ Review   │ │ for Stmt │ │ (30d)    │ │(7d)│ │   │
│                        │  │ AMBER    │ │ BLUE     │ │ GREEN    │ │GRN │ │   │
│                        │  └──────────┘ └──────────┘ └──────────┘ └────┘ │   │
│                        │                                                   │   │
│                        │  FUNNEL                                           │   │
│                        │  ┌─────────────────────────────────────────────┐ │   │
│                        │  │ Synced: 156  →  Parsed: 148  →  Extracted:  │ │   │
│                        │  │ 127          →  Matched: 47  →  Imported: 8 │ │   │
│                        │  │ ░░░░░░░░░░░ ████████████ ████████ █████ ██  │ │   │
│                        │  └─────────────────────────────────────────────┘ │   │
│                        │                                                   │   │
│                        │  ─── WAITING FOR STATEMENT CALLOUT ─── [×]      │   │
│                        │  ┌─────────────────────────────────────────────┐ │   │
│                        │  │ ● 3 emails are waiting for Bangkok Bank     │ │   │
│                        │  │   charges to appear in a statement.         │ │   │
│                        │  │   Total: ฿2,540 across 3 receipts           │ │   │
│                        │  │                    [View Waiting Items →]   │ │   │
│                        │  └─────────────────────────────────────────────┘ │   │
│                        │                                                   │   │
│                        │  FILTER BAR                                       │   │
│                        │  [Status ▾] [Parser ▾] [Confidence ▾] [Date ▾]  │   │
│                        │  [🔍 Search vendor, subject, order ID...]         │   │
│                        │  Active: status=pending_review  [Clear all]      │   │
│                        │                                                   │   │
│                        │  EMAIL TRANSACTION TABLE                          │   │
│                        │  ┌──┬──────────────┬──────┬──────┬────────┬────┐ │   │
│                        │  │☐ │ Vendor/Subj  │ Amt  │ Date │ Parser │ St │ │   │
│                        │  ├──┼──────────────┼──────┼──────┼────────┼────┤ │   │
│                        │  │☐ │ Grab ·       │ ฿340 │Jan15 │[grab]  │[●] │ │   │
│                        │  │  │ order #A1234 │      │      │        │    │ │   │
│                        │  ├──┼──────────────┼──────┼──────┼────────┼────┤ │   │
│                        │  │☐ │ Bolt ·       │ ฿189 │Jan14 │[bolt]  │[⚠] │ │   │
│                        │  │  │ Trip receipt │      │      │        │    │ │   │
│                        │  ├──┼──────────────┼──────┼──────┼────────┼────┤ │   │
│                        │  │  │ ── EXPANDED ROW ──────────────────────── │ │   │
│                        │  │  │  EMAIL SIDE         │  MATCH SIDE         │ │   │
│                        │  │  │  Lazada · ฿299      │  No match found     │ │   │
│                        │  │  │  Jan 12, 2026       │  [●] Low confidence │ │   │
│                        │  │  │  order #LZ-8821     │                     │ │   │
│                        │  │  │  classification:    │  Nearest candidate: │ │   │
│                        │  │  │  order_confirmation │  Lazada, $8.50 USD  │ │   │
│                        │  │  │                     │  Jan 11, score 31   │ │   │
│                        │  │  │  Confidence 31/100  │                     │ │   │
│                        │  │  │  ● Amount: 20/40    │  [Link to Existing] │ │   │
│                        │  │  │  ● Date:   11/30    │  [Create New]       │ │   │
│                        │  │  │  ● Vendor:  0/30    │  [Skip]             │ │   │
│                        │  ├──┴──────────────────────────────────────────┤ │   │
│                        │  │ [Approve Selected] [Skip Selected]  12 items │ │   │
│                        │  └─────────────────────────────────────────────┘ │   │
│                        └─────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### DESIGN B: Email Hub — Mobile (390px)

```
┌──────────────────────────┐
│  Imports            [nav] │
├──────────────────────────┤
│  [Coverage] [Review] [Emails ←] │
│  (horizontal tab pills)   │
│                           │
│  ┌────────────────────────┐
│  │ 12 Pending  3 Waiting  │
│  │ AMBER       BLUE       │
│  │ 47 Matched  8 Imported │
│  │ GREEN       GREEN      │
│  └────────────────────────┘
│                           │
│  ┌────────────────────────┐
│  │ ● 3 waiting for        │
│  │   Bangkok Bank         │
│  │   ฿2,540 total         │
│  │   [View Waiting →]     │
│  └────────────────────────┘
│                           │
│  [Status ▾][Parser ▾][More▾]│
│  ┌─────────────────────────┐
│  │ 🔍 Search...            │
│  └─────────────────────────┘
│                           │
│  ┌────────────────────────┐
│  │ ☐  Grab                │
│  │    ฿340 · Jan 15       │
│  │    [grab] [●●●●] 94    │
│  │    [pending_review]    │
│  │                 [→]   │
│  ├────────────────────────┤
│  │ ☐  Bolt                │
│  │    ฿189 · Jan 14       │
│  │    [bolt] [●●○○] 67    │
│  │    [pending_review]    │
│  │                 [→]   │
│  ├────────────────────────┤
│  │ ☐  Lazada    [EXPANDED]│
│  │    ฿299 · Jan 12       │
│  │    [lazada] [●○○○] 31  │
│  │    [pending_review]    │
│  │  ┌──────────────────┐  │
│  │  │ Email: ฿299      │  │
│  │  │ Lazada · Jan 12  │  │
│  │  │ Order #LZ-8821   │  │
│  │  │ ─────────────── │  │
│  │  │ Match: $8.50 USD │  │
│  │  │ Jan 11 · score 31│  │
│  │  │ Confidence: Low  │  │
│  │  │ [Link] [Create]  │  │
│  │  │ [Skip]           │  │
│  │  └──────────────────┘  │
│  ├────────────────────────┤
│  │  Load more...          │
│  └────────────────────────┘
│                           │
└──────────────────────────┘
```

Mobile-specific layout notes:
- Stats row wraps into 2x2 grid (not 4-column strip)
- Filter bar shows 2 selects + "More" overflow dropdown
- Search input appears below filters when focus is tapped (not inline)
- Expanded row takes full-width single-column layout (email data above, match data below)
- Action buttons (Link, Create, Skip) stack full-width in expanded panel

---

### DESIGN C: Funnel Visualization (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Email Pipeline                                        Last 30 days          │
│                                                                               │
│  Synced    Parsed     Extracted   Matched    Imported                        │
│    156  →    148    →    127    →    47    →    8                            │
│                                                                               │
│  ████████████████████  ███████████████████  █████████████  ██████  ██       │
│  ←──── 100% ─────────► ←── 95% ───────────► ←── 81% ─────► ←37%► ←6%►     │
│                                                                               │
│  [●] 8 not parsed  (5%)      [?] Click stages for details                   │
│  [●] 21 extracted but unmatched (17%)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

Implementation note: This is a horizontal bar chart rendered with CSS flex-grow on `div` elements with proportional widths. No chart library needed. Bar segments are `bg-blue-500`, `bg-green-500` etc. with `rounded-md`. Labels sit above each segment.

---

### DESIGN D: Expanded Row — Match Comparison Panel

This panel appears inline when a table row is clicked. It replaces the standalone MatchCard used in the Review Queue and is optimized for the scanning context.

#### Desktop: Side-by-Side (two columns)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Lazada · ฿299 · Jan 12, 2026 · order_confirmation              [collapse]│
├───────────────────────────────┬─────────────────────────────────────────────┤
│  EMAIL DATA                   │  MATCH CANDIDATE                             │
│                               │                                               │
│  Vendor:    Lazada            │  No existing match found                     │
│  Amount:    ฿299.00           │                                               │
│  Currency:  THB               │  Nearest candidate:                          │
│  Date:      Jan 12, 2026      │  Vendor: Lazada                              │
│  Order ID:  LZ-8821567        │  Amount: $8.50 USD (~฿296)                   │
│  From:      orders@lazada.com │  Date:   Jan 11, 2026 (1d off)              │
│  Subject:   Your order is on  │  Pay method: Chase Sapphire Reserve          │
│             its way!          │                                               │
│                               │  Score: 31/100   [Low Confidence]            │
│  Classification:              │  ● Amount:  20/40  (within 1%)              │
│  order_confirmation           │  ● Date:    11/30  (1 day off)              │
│                               │  ● Vendor:   0/30  (no text match)          │
│  Extraction: 45/100 (Low)     │                                               │
│  ● Amount:  20/40             │  Cross-currency:                             │
│  ● Date:    15/30             │  ฿299 = $8.50 @ 0.02843 (Jan 11 rate)       │
│  ● Vendor:   0/10             │  Rate source: ECB historical                 │
│  ● Order ID:10/10             │                                               │
│                               ├─────────────────────────────────────────────┤
│  Notes:                       │  ACTIONS                                     │
│  "Amount found but vendor     │                                               │
│  pattern not matched"         │  [Link to this transaction]                  │
│                               │  [Search other transactions]                 │
│                               │  [Create as new transaction]                 │
│                               │  [Skip — not a transaction]                  │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

#### Mobile: Stacked (single column)

```
┌─────────────────────────────────────────────┐
│  EMAIL DATA                          [close] │
│  ─────────────────────────────────────────  │
│  Lazada · ฿299 · Jan 12, 2026               │
│  Order #LZ-8821567                          │
│  order_confirmation                         │
│  Extraction confidence: 45/100 (Low)        │
│                                             │
│  MATCH                                      │
│  ─────────────────────────────────────────  │
│  Nearest: Lazada $8.50 USD · Jan 11        │
│  Score: 31/100 (Low)                        │
│  ● Amount 20/40  ● Date 11/30  ● Vendor 0/30│
│  Cross-currency: ฿299 ≈ $8.50               │
│                                             │
│  [Link to Transaction]                      │
│  [Create New Transaction]                   │
│  [Skip]                                     │
└─────────────────────────────────────────────┘
```

---

## Component Specifications

### 1. EmailHubStatsRow

Displays four stat cards across the top.

**Props (derived from API):**
- `pendingReview: number` — amber card
- `waitingForStatement: number` — blue card
- `matchedLast30Days: number` — green card
- `importedLast7Days: number` — green (muted) card
- `isLoading: boolean`

**Behavior:**
- Clicking the amber "Pending Review" card applies `status=pending_review` filter to the table
- Clicking the blue "Waiting" card applies `status=waiting_for_statement` filter
- Cards are not links; they dispatch filter state changes
- Numbers animate via CSS counter when data loads (no library, just transition)
- Mobile: wraps to 2x2 grid, 4-column strip becomes two rows

**States:**
- Loading: Skeleton replacing each card
- Zero state: Card displays "0" without special treatment (green cards read naturally as "caught up")

---

### 2. WaitingForStatementCallout

A dismissible alert card shown at the top of the content area (below stats, above filter bar) when `waitingForStatement > 0`.

**Content:**
```
[●]  3 emails are waiting for a statement charge to appear.
     Total value: ฿2,540 across 3 receipts (Bangkok Bank)
                                            [View Waiting Items →]
```

**Behavior:**
- Only renders when `waitingForStatement > 0`
- "View Waiting Items" button applies `status=waiting_for_statement` filter
- [×] dismiss button hides the card for the session (sessionStorage, not persisted)
- If multiple payment methods have waiting items, shows the highest-count one with "+N more" link that filters without specifying a method
- Mobile: full-width card, button below text

**Design:**
- `border-blue-300 bg-blue-50/50` — matching the blue status color
- Blue dot indicator (matches `email_sync_card` pattern)
- Text: "text-blue-800", supporting text: "text-blue-600"

---

### 3. EmailHubFilterBar

A horizontal filter row below the stats area.

**Filters (left to right):**
1. **Status** — Select: All / Pending Review / Waiting / Matched / Ready to Import / Imported / Skipped
2. **Parser** — Select: All / Grab / Bolt / Lazada / Bangkok Bank / Kasikorn / Unknown
3. **Confidence** — Select: All / High (90+) / Medium (55-89) / Low (<55)
4. **Date Range** — DateRangePicker (reused from ReviewQueueFilterBar)
5. **Search** — Text input: searches vendor_name_raw, subject, order_id, from_address

**Active filter chips:**
When any filter is non-default, chips appear below the filter row showing active values with individual clear [×] buttons. Uses the existing `ActiveFilterChips` component pattern.

**URL sync:**
Filters sync to URL search params (same pattern as ReviewQueueFilterBar). This enables direct linking to filtered views from the Coverage page stats bar.

**Behavior:**
- Changing any filter resets table to page 1
- Filters persist in URL on page reload
- "Clear all" button appears when any filter is active
- Mobile: first two selects visible, remaining collapse under "More ▾" dropdown

---

### 4. EmailTransactionTable

The core content area. A paginated (infinite scroll) table of email_transactions.

**Columns (desktop):**

| Column | Width | Content |
|---|---|---|
| Checkbox | 36px | Batch selection |
| Vendor / Subject | flex-1 | `vendor_name_raw` or truncated email subject. Secondary line: order_id if present |
| Amount | 88px | Amount + currency badge. Cross-currency: shows THB and converted USD below |
| Date | 80px | Transaction date (not email date). Format: "Jan 15" |
| Parser | 88px | Color-coded parser tag (grab, bolt, etc.) |
| Confidence | 72px | Dot-and-score inline display |
| Status | 96px | Status badge |
| Expand | 40px | Chevron icon, rotates on expansion |

**Columns (mobile):**

Row collapses to two lines + action chevron:
- Line 1: `vendor_name_raw` (bold) — right: `amount currency`
- Line 2: `date` · `[parser tag]` · `[status badge]`
- Right edge: `[confidence score]` + chevron

**Row states:**
- Default: white background, hover: `bg-zinc-50`
- Expanded: `bg-zinc-50` border-left `border-l-2 border-l-zinc-300`
- Status imported or matched: `opacity-75`
- Status skipped: `opacity-50 text-muted-foreground`
- Selected: `bg-blue-50 border-l-2 border-l-blue-400`

**Sort behavior:**
- Default sort: `email_date DESC` (most recent first)
- Clicking column headers toggles ASC/DESC on: date, amount, confidence
- Active sort column shows up/down arrow icon

**Infinite scroll:**
- Same `useInfiniteScroll` hook pattern as Review Queue
- Load 25 items per page (slightly more than Review Queue's 20, because email hub is scanning-mode not decision-mode)
- `LoadMoreTrigger` at bottom

**Selection:**
- Row-level checkbox at left
- "Select all on page" checkbox in header
- Selection counter appears in batch action toolbar when `selectedIds.size > 0`

---

### 5. EmailDetailPanel (Expanded Row)

Opens inline below the selected row. Only one row can be expanded at a time; opening another collapses the previous.

**Layout:**
- Desktop: Two-column grid (`grid-cols-2 gap-6`)
- Mobile: Single column stack

**Left panel — Email Data:**

```
EMAIL DATA
──────────────────────────────────
Vendor:         Grab
Amount:         ฿340.00
Currency:       THB
Tx Date:        Jan 15, 2026
Email Date:     Jan 15, 2026
Order ID:       GR-A12345678
From:           receipts@grab.com
Subject:        Your Grab receipt

Classification: receipt
Parser:         grab

Extraction Confidence: 94/100
● All required fields extracted
● Amount: 40/40  Date: 30/30
● Vendor: 14/10  Order ID: 10/10
```

**Right panel — Match Candidate:**

Three states:

**State A — High confidence match exists:**
```
MATCH FOUND
──────────────────────────────────
Grab · ฿340 = $9.84 USD
Chase Sapphire Reserve · Jan 15
Score: 96/100  [High]

Breakdown:
● Amount:  40/40
● Date:    30/30
● Vendor:  26/30

Cross-currency:
฿340 @ 0.02893 = $9.84
Rate source: ECB (Jan 15, 2026)

[✓ Link to Transaction]      ←— primary CTA
[Search other transactions]
[Skip]
```

**State B — Low or no match:**
```
NO STRONG MATCH FOUND
──────────────────────────────────
Nearest candidate:
Lazada · $8.50 USD · Jan 11
Score: 31/100  [Low]

● Amount:  20/40
● Date:    11/30
● Vendor:   0/30

Cross-currency:
฿299 @ 0.02843 = $8.50
1 day date difference

[Link to this transaction]   ←— secondary, not green
[Search other transactions]  ←— primary when no match
[Create as new transaction]
[Skip]
```

**State C — Already actioned:**
```
MATCHED  ✓
──────────────────────────────────
Linked to:
Grab · $9.84 · Jan 15, 2026
[View Transaction →]

Matched on: Jan 15, 2026
Method: Manual
```

**Action button hierarchy:**
- Primary (solid): The most recommended action given confidence
- Secondary (outline): Alternative actions
- Destructive text link: Skip (always last, no border)

The panel reuses `CreateFromImportDialog` and `LinkToExistingDialog` from the Review Queue. No new dialog components needed.

---

### 6. EmailHubFunnelChart

A horizontal pipeline visualization showing the count at each processing stage.

**Stages and source fields:**
1. Synced — `emails` table count
2. Parsed — `email_transactions` count (any status)
3. Extracted — `extraction_confidence IS NOT NULL`
4. Matched — `status IN ('matched', 'imported')`
5. Imported — `status = 'imported'`

**Visual design:**
- Five labeled segments, proportional width flex containers
- Each segment: `h-4 rounded-md` with color fills
- Segments connected by `→` labels showing drop-off %
- Tooltip on hover: shows count + % of previous stage
- No chart library — pure CSS/flexbox

**Drop-off callouts:**
Below the bar, show only non-trivial drop-offs (>10%):

```
● 8 emails not parsed (5%)     — link: filters table to parser=unknown
● 21 extracted but unmatched (17%) — link: filters to status=pending_review,confidence=all
```

**Mobile:** Funnel chart collapses to a simple 2x3 grid of labeled numbers (same as stats row pattern). The bar visualization is hidden on mobile — too small to be useful.

---

### 7. BatchActionToolbar

Appears as a sticky bottom bar when `selectedIds.size > 0`.

```
┌──────────────────────────────────────────────────────────────┐
│  3 selected                                                   │
│  [Mark as Waiting]  [Skip Selected]  [Cancel]                │
└──────────────────────────────────────────────────────────────┘
```

**Actions:**
- **Mark as Waiting** — sets status to `waiting_for_statement` for all selected
- **Skip Selected** — sets status to `skipped` for all selected
- **Cancel** — clears selection without action

**Design:**
- `position: fixed bottom-0` on mobile
- Inline toolbar above table footer on desktop
- Shows item count
- Buttons: outline style except Cancel which is ghost
- Confirmation dialog for destructive bulk actions (Skip > 5 items triggers confirm dialog)

---

## Interaction Patterns

### Expanding / Collapsing Rows

- Click anywhere on a row (not on checkbox) expands it
- Expanded state: chevron rotates 180°, panel animates in from top (`animate-in slide-in-from-top-1 duration-150`)
- Clicking the same row again collapses (toggle)
- Clicking a different row: previous row collapses, new row expands (accordion)
- Mobile: expanded panel takes full available width below the row

### Filter Application

- All filters are applied immediately on change (no "Apply" button)
- Debounce: search field has 300ms debounce
- Status filter preset buttons in stats cards dispatch immediately
- When filters change, table scrolls to top and infinite scroll resets

### Status Transitions

After a successful action (Link, Create, Skip), the row updates in-place:
1. Row shows loading spinner on action button
2. On success: status badge updates to new value (green/gray animation)
3. Row collapses (detail panel closes)
4. Stats row re-fetches and updates counts
5. If a filter is active that would exclude the updated row (e.g., filtering for pending_review and an item is marked matched), the row fades out and removes itself from the list

### Sorting

- Clicking a sortable column header once: ASC
- Clicking again: DESC
- Clicking again: back to default sort (date DESC)
- Sort state does not persist in URL (session-only)
- Sort indicator: `ChevronUp` / `ChevronDown` icon next to column label

### Search

- Searches against: `vendor_name_raw`, email `subject`, `order_id`, `from_address`
- Results highlight matching text within the vendor/subject column
- Empty search result shows "No emails match your search" empty state (not global empty state)

### Keyboard Navigation

- `Tab` moves focus between filter controls
- `Space` on a row expands/collapses it
- `Escape` collapses expanded row
- `Space` on checkbox selects/deselects
- `Enter` on an action button inside detail panel confirms action

---

## Mobile Adaptations

### Responsive Breakpoints

This follows the existing Tailwind breakpoints used across the app:

```
< 768px  (md):  Mobile layout
768px+   (md):  Tablet/desktop — side nav appears, horizontal tabs disappear
1280px+  (xl):  Full desktop — wider content area
```

### Navigation

Mobile uses horizontal tab pills (existing pattern from `ImportsLayout`):
```
[Coverage] [Review] [Emails]   ← scrollable horizontal row
```

Adding "Emails" as a third pill is a one-line change to `navigationItems`. The pill row already handles overflow gracefully via `overflow-x: auto`.

### Stats Row

Desktop: 4 cards in a single horizontal row (`grid-cols-4`)
Mobile: 2x2 grid (`grid-cols-2`)
```
┌─────────────┬─────────────┐
│ 12 Pending  │  3 Waiting  │
├─────────────┼─────────────┤
│ 47 Matched  │  8 Imported │
└─────────────┴─────────────┘
```

### Filter Bar

Desktop: All filters visible in one row
Mobile: Status + Parser dropdowns visible, rest collapse into "More ▾" which opens a bottom sheet (shadcn Sheet) containing the remaining filters

Search input: collapsed by default on mobile. A search icon button expands an input overlay covering the filter row. This follows the pattern used in other apps on this stack and avoids horizontal scroll on small screens.

### Table to Card Transition

The table does not attempt to render as a narrow table on mobile. Each row renders as a card with the two-line summary pattern. This is a common pattern in data-heavy mobile UIs.

### Expanded Panel

Desktop: side-by-side two-column grid
Mobile: single-column with a visual divider between EMAIL DATA and MATCH sections. Action buttons stack full-width.

### Batch Toolbar

Desktop: appears above the table footer, inline
Mobile: `position: fixed; bottom: 0; left: 0; right: 0;` with safe-area-inset-bottom padding for iPhone notch. This ensures it does not obscure table rows.

---

## Empty States & Edge Cases

### Global Empty State (no email_transactions at all)

```
┌─────────────────────────────────────────────────────┐
│                                                       │
│              [Mail icon, 48px, muted]                │
│                                                       │
│           No emails synced yet                       │
│                                                       │
│   Joot automatically parses receipt emails from     │
│   your iCloud "Transactions" folder.                 │
│                                                       │
│   [Configure Email Sync →]     ← links to /settings/emails
│                                                       │
└─────────────────────────────────────────────────────┘
```

Condition: `email_transactions` table is empty for this user.

### Filter Empty State (records exist but filter returns nothing)

```
┌─────────────────────────────────────────────────────┐
│                                                       │
│              [Filter icon, 32px, muted]              │
│                                                       │
│         No emails match your filters                 │
│         Try adjusting your filters or                │
│         clearing the search.                         │
│                                                       │
│              [Clear all filters]                     │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Zero Pending State (all caught up)

When `pendingReview === 0` AND user is on default (all-statuses) view:

Show a green callout above the table (replaces the WaitingForStatement callout):
```
┌─────────────────────────────────────────────────────┐
│  ✓  All caught up! No pending emails to review.     │
└─────────────────────────────────────────────────────┘
```

Then show the full table with status=all to let user browse history.

### Partial Extraction

When an email has `extraction_confidence < 55` and critical fields are missing:

In the detail panel, show a warning banner:
```
┌─────────────────────────────────────────────────────┐
│  ⚠ Partial extraction — some fields could not be   │
│     read from this email. Review manually.          │
└─────────────────────────────────────────────────────┘
```

Missing fields show a dash placeholder: `Amount: —` with text-muted-foreground styling.

### Unknown Parser

When `classification = 'unknown'` and no parser matched:

Parser column shows `[unknown]` tag (red-50/red-600).
Detail panel left side shows:
```
Parser:    unknown
Subject:   (email subject shown directly)
Body preview: first 200 chars of text_body in a monospace <pre>
```

This lets users read the raw email to decide what it is.

### Network Error

If the API call fails:
```
┌─────────────────────────────────────────────────────┐
│  ⚠  Failed to load email transactions.              │
│     Check your connection.             [Try again]  │
└─────────────────────────────────────────────────────┘
```

Same pattern as Review Queue error state.

### Skipped State (attempting to expand)

Skipped rows can still be expanded. The detail panel shows:
- Left: email data (dimmed)
- Right: "Skipped — marked as not a transaction" label
- Actions: "Restore to pending review" link (un-skip)

This preserves the audit trail and allows recovery.

---

## Accessibility Requirements

### Focus Management

- When a row expands, focus moves to the first interactive element inside the detail panel
- When a row collapses via keyboard Escape, focus returns to the row's expand trigger
- When an action succeeds and the row removes itself from the list, focus moves to the next row

### Color Independence

All status indicators use both color and text/icon:
- Amber "Pending" card: amber color + exclamation icon + "Pending Review" label
- Blue "Waiting" card: blue color + clock icon + "Waiting for Statement" label
- Status badges: always include text label, never color-only

Confidence levels: always shown as score number + text label, not just dot color.

### Screen Reader Labels

- Stats cards: `aria-label="12 emails pending review"`
- Expand button: `aria-expanded="true/false"` `aria-label="Expand Grab receipt Jan 15"`
- Status badges: `role="status"` on update animations
- Table: `role="table"` with proper `th scope="col"` headers
- Checkboxes: `aria-label="Select Grab receipt Jan 15"`
- Batch toolbar: `aria-live="polite"` on selection count

### Interactive Target Sizes

Mobile touch targets minimum 44x44px:
- Row expand area (entire row minus checkbox)
- Checkbox: 24px visual, 44px touch area with padding
- Action buttons in detail panel: full-width, minimum 48px height
- Filter selects: minimum 44px height

---

## Implementation Notes for Developers

### New Files Required

```
src/app/imports/emails/page.tsx
src/components/page-specific/email-hub-stats-row.tsx
src/components/page-specific/email-hub-filter-bar.tsx
src/components/page-specific/email-hub-funnel-chart.tsx
src/components/page-specific/email-transaction-table.tsx
src/components/page-specific/email-detail-panel.tsx
src/components/page-specific/waiting-for-statement-callout.tsx
src/hooks/use-email-hub-data.ts
src/app/api/imports/emails/route.ts
```

### Modified Files

```
src/components/page-specific/imports-layout.tsx
  — add { name: 'Emails', href: '/imports/emails', icon: Mail } to navigationItems

src/components/page-specific/coverage-stats-bar.tsx
  — add link from emailsPendingReview count to /imports/emails?status=pending_review
```

### Reused Components (no modification)

```
CreateFromImportDialog       — pre-filled from email extraction data
LinkToExistingDialog         — same interface, email item as source
ConfidenceIndicator          — compact "sm" size in table
BatchApproveDialog           — adapted for email batch actions
ReviewQueueFilterBar         — DateRangePicker extracted and reused in filter bar
useInfiniteScroll hook       — identical usage pattern
useMatchActions hook         — reusable for link/create/skip actions
LoadMoreTrigger              — identical usage
ActiveFilterChips            — identical usage
```

### API Endpoint Shape

`GET /api/imports/emails`

Query params: `page`, `limit`, `status`, `parser`, `confidence`, `from`, `to`, `search`

Response:
```json
{
  "items": [...],
  "hasMore": true,
  "total": 156,
  "stats": {
    "pendingReview": 12,
    "waitingForStatement": 3,
    "matchedLast30Days": 47,
    "importedLast7Days": 8,
    "funnelCounts": {
      "synced": 156,
      "parsed": 148,
      "extracted": 127,
      "matched": 47,
      "imported": 8
    }
  }
}
```

Item shape matches `email_transactions` joined with `vendors` (vendor_name), with a `best_match_candidate` nested object containing the highest-scored transaction match and its confidence breakdown.

### State Management

The page is client-rendered (`'use client'`). Filter state lives in URL search params (same as Review Queue). The stats row and funnel data come from the same API response as the first page of items. No separate stats API call needed — stats are always returned alongside item data.

---

*End of specification. Version 1.0 — 2026-03-02*
