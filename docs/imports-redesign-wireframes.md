# Imports Section Redesign — Wireframes & Design Specification

**Version:** 1.0
**Date:** 2026-03-01
**Status:** Partially Implemented — Superseded by `email-processing-hub-ux-spec.md` for nav structure
**Scope:** `/imports`, `/imports/statements/[id]`, `/imports/review`

---

## Navigation Structure (New)

The 4-item nav (Dashboard, Review Queue, Statements, History) collapses to 2 views:

```
/imports          →  Coverage Page   (replaces Dashboard + Statements list)
/imports/review   →  Review Queue    (retained, refined)
```

Statements list and History are removed as standalone pages. Statement detail
(`/imports/statements/[id]`) remains as a drill-down destination, accessed only
from the coverage timeline — never directly navigated to.

---

## Color System Reference

```
GREEN  (#16a34a / green-600)   — done, reconciled, all caught up
AMBER  (#d97706 / amber-600)   — pending review, attention needed
BLUE   (#2563eb / blue-600)    — processing, in progress
RED    (#dc2626 / red-600)     — missing, gap, error
PURPLE (#9333ea / purple-600)  — new transaction (not in Joot yet)
GRAY   (#9ca3af / gray-400)    — future month, inactive
```

---

## DESIGN 1: Coverage Page — `/imports` (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  IMPORTS                                                         [Joot nav]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  STATS BAR                                                               │ │
│  │                                                                           │ │
│  │  ╔═══════════════╗  ┊  ⚠ 7 pending review  [Review Now →]  ┊           │ │
│  │  ║  87%           ║  ┊                                       ┊           │ │
│  │  ║  Coverage      ║  ┊  Last email sync: 2 hours ago         ┊           │ │
│  │  ║  rolling 12mo  ║  ┊  14 emails synced · 3 pending         ┊           │ │
│  │  ╚═══════════════╝  ┊                                        ┊  [Sync ↻] │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  Statement Coverage                              [+ Upload Statement]         │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  PAYMENT METHOD CARD — Chase Sapphire Reserve                           │ │
│  │                                                                           │ │
│  │  Chase Sapphire Reserve   [USD]  ●●●●●●●●●○○  92%   [⚙]               │ │
│  │                                                                           │ │
│  │  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec  Jan  Feb  Mar             │ │
│  │  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐        │ │
│  │  │✓ │ │✓ │ │✓ │ │✓ │ │✓ │ │✓ │ │✓ │ │✓ │ │3 │ │✓ │ │↑ │ │  │        │ │
│  │  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘        │ │
│  │  green green green green green green green green amber green  red  gray  │ │
│  │                                                                           │ │
│  │  10 of 11 months captured · 312 extracted · 289 matched · 23 new         │ │
│  │  ⚠ February statement missing — upload to fill the gap                  │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  PAYMENT METHOD CARD — PNC Bank Checking                                │ │
│  │                                                                           │ │
│  │  PNC Bank Checking        [USD]  ●●●●●●●●●●●●  100%  [⚙]              │ │
│  │                                                                           │ │
│  │  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec  Jan  Feb  Mar             │ │
│  │  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐        │ │
│  │  │✓ │ │✓ │ │✓ │ │✓ │ │✓ │ │✓ │ │✓ │ │✓ │ │✓ │ │✓ │ │✓ │ │✓ │        │ │
│  │  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘        │ │
│  │  green (all)                                                              │ │
│  │                                                                           │ │
│  │  12 of 12 months captured · 401 extracted · 401 matched                  │ │
│  │  ✓ All caught up!                                                        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  PAYMENT METHOD CARD — Bangkok Bank                                     │ │
│  │                                                                           │ │
│  │  Bangkok Bank             [THB]  ●●●●●○○○○○○○  42%   [⚙]              │ │
│  │                                                                           │ │
│  │  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec  Jan  Feb  Mar             │ │
│  │  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐        │ │
│  │  │✓ │ │↻ │ │✓ │ │✓ │ │✓ │ │✗ │ │✗ │ │✗ │ │✗ │ │✗ │ │✗ │ │  │        │ │
│  │  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘        │ │
│  │  green blue  green green green  red   red   red   red   red   red  gray  │ │
│  │                                                                           │ │
│  │  5 of 11 months captured · 156 extracted · 140 matched · 16 new          │ │
│  │  ⚠ You're 6 months behind — click the red cells to upload               │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  PAYMENT METHOD CARD — KBank (No statements yet)                        │ │
│  │                                                                           │ │
│  │  KBank                    [THB]  ○○○○○○○○○○○○  0%    [⚙]              │ │
│  │                                                                           │ │
│  │               ┌──────────────────────────────────────┐                  │ │
│  │               │                                        │                 │ │
│  │               │  [file icon]                           │                 │ │
│  │               │  No statements yet                     │                 │ │
│  │               │  Upload your first statement to start  │                 │ │
│  │               │  tracking KBank coverage.              │                 │ │
│  │               │                                        │                 │ │
│  │               │         [Upload Statement]             │                 │ │
│  │               └──────────────────────────────────────┘                  │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  Email Sync                                                                   │
│  ─────────────────────────────────────────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  ✉  Email Receipts    Last synced: Mar 1, 2026, 2:14 PM                │ │
│  │                       14 emails imported · 3 pending review             │ │
│  │                                              [Review Email Items]  [↻ Sync Now] │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  Recent Activity  [▼ expand / collapse]                                       │
│  ─────────────────────────────────────────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  ✓ Approved 12 matches · Chase Sapphire Reserve — Feb 2026  2h ago     │ │
│  │  ─────────────────────────────────────────────────────────────────────  │ │
│  │  ↑ Uploaded statement · Bangkok Bank — Aug 2025             5h ago     │ │
│  │  ─────────────────────────────────────────────────────────────────────  │ │
│  │  ✓ Approved 8 matches · PNC Bank — Feb 2026                 1d ago     │ │
│  │  ─────────────────────────────────────────────────────────────────────  │ │
│  │  ✗ Rejected 1 match · Chase Sapphire Reserve — Jan 2026     2d ago     │ │
│  │                                                                           │ │
│  │                                               [View All Activity]        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Coverage Cell States (Detail)

```
┌────┐  GREEN  — done, all approved
│ ✓  │  border: green-300  bg: green-50   text: green-700
└────┘  Clicking navigates to /imports/statements/[id]
        Hover tooltip: "34 extracted · 29 matched · 5 created"

┌────┐  AMBER  — pending review items exist
│ 3  │  border: amber-300  bg: amber-50   text: amber-700
└────┘  Number = count of pending items
        Clicking navigates to /imports/review?statementUploadId=[id]
        Hover tooltip: "34 extracted · 29 matched · 3 pending · 2 new"

┌────┐  BLUE   — processing
│ ↻  │  border: blue-300   bg: blue-50    text: blue-600
└────┘  Spinning icon
        Clicking navigates to /imports/statements/[id]

┌ ─ ┐  RED    — missing / gap
│ ↑  │  border: dashed red-300  bg: red-50/30  text: red-400
└ ─ ┘  Upload icon
        Clicking opens Upload Dialog pre-set to this payment method + period

┌────┐  GRAY   — future month (not yet due)
│    │  border: gray-200   bg: gray-50    text: gray-300
└────┘  Not interactive

```

### Stats Bar Detail

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   ╔═══════════════════╗                                                     │
│   ║                   ║   ⚠  7 pending review              [Review Now →]  │
│   ║   87%             ║   ─────────────────────────────────────────────    │
│   ║   Coverage        ║   ✉  Last sync: 2 hours ago                        │
│   ║   rolling 12 mo   ║       14 emails synced · 3 pending   [↻ Sync Now]  │
│   ╚═══════════════════╝                                                     │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

The 87% figure = (months with status "done" or "pending_review") /
(total expected months across all payment methods, excluding future).

The circular/donut badge is rendered using a CSS conic-gradient or a small
SVG arc — not a full chart library. shadcn Progress is insufficient here;
use a custom SVG ring or Radix primitive.

---

## DESIGN 1: Coverage Page — `/imports` (Mobile, 390px)

```
┌──────────────────────────────┐
│  Imports               [nav] │
├──────────────────────────────┤
│                              │
│  ┌──────────────────────────┐│
│  │  87%    7 pending   [→] ││
│  │  Coverage               ││
│  │  ✉ Synced 2h ago  [↻]  ││
│  └──────────────────────────┘│
│                              │
│  Statement Coverage          │
│  ─────────────────────────── │
│  ┌──────────────────────────┐│
│  │ Chase Sapphire Reserve   ││
│  │ [USD]          92%  [⚙] ││
│  │                          ││
│  │  ← scroll horizontally → ││
│  │ ┌──┬──┬──┬──┬──┬──┬──┬──┐│
│  │ │✓ │✓ │✓ │✓ │✓ │✓ │✓ │3 │ → (scroll)
│  │ └──┴──┴──┴──┴──┴──┴──┴──┘│
│  │ Apr May Jun Jul Aug Sep…  ││
│  │                          ││
│  │ 10 of 11 captured        ││
│  │ ⚠ Feb missing            ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ PNC Bank Checking        ││
│  │ [USD]         100%  [⚙] ││
│  │                          ││
│  │ ← scroll →               ││
│  │ ┌──┬──┬──┬──┬──┬──┬──┬──┐│
│  │ │✓ │✓ │✓ │✓ │✓ │✓ │✓ │✓ │
│  │ └──┴──┴──┴──┴──┴──┴──┴──┘│
│  │ 12 of 12 captured        ││
│  │ ✓ All caught up!         ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ Bangkok Bank             ││
│  │ [THB]          42%  [⚙] ││
│  │                          ││
│  │ ← scroll →               ││
│  │ ┌──┬──┬──┬──┬──┬──┬──┬──┐│
│  │ │✓ │✓ │✓ │✓ │✓ │✗ │✗ │✗ │
│  │ └──┴──┴──┴──┴──┴──┴──┴──┘│
│  │ 5 of 11 captured         ││
│  │ ⚠ 6 months behind        ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ ✉ Email Receipts         ││
│  │ Synced 2h ago · 3 pending││
│  │ [Review Email] [↻ Sync]  ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ Recent Activity    [▼]   ││
│  │ ✓ Approved 12 · 2h ago  ││
│  │ ↑ Uploaded · 5h ago     ││
│  │ ✓ Approved 8 · 1d ago   ││
│  └──────────────────────────┘│
│                              │
└──────────────────────────────┘
```

Mobile-specific notes:
- Stats bar collapses: coverage % + pending count on one line, sync on second line
- Each payment method card uses `overflow-x: auto` on the timeline strip only
- The card header (name, badge, %, gear) stays fixed-width, does not scroll
- Timeline cells are a fixed 44px wide on mobile (touch target size)
- The gear icon opens a bottom sheet (Sheet from shadcn) not a popover

---

## DESIGN 1A: Billing Cycle Settings Dialog

Triggered by the gear icon on each payment method card.

```
┌─────────────────────────────────────────────────┐
│  Billing Cycle Settings                    [✕]  │
│  ───────────────────────────────────────────── │
│                                                 │
│  Chase Sapphire Reserve                        │
│                                                 │
│  Billing cycle start day                       │
│  ┌────────────────────────────────────────────┐ │
│  │  15                                   [▲▼] │ │
│  └────────────────────────────────────────────┘ │
│  1 – 28  (day of month)                        │
│                                                 │
│  Chase statements typically close on the 15th  │
│  of each month, covering the 15th to 14th      │
│  billing period.                               │
│                                                 │
│                      [Cancel]  [Save Changes]  │
└─────────────────────────────────────────────────┘
```

Component: Dialog (shadcn).
Input: type="number" min=1 max=28.
On save: PATCH /api/payment-methods/[id] with billing_cycle_start_day.
Optimistically updates card header and timeline cell labels.

---

## DESIGN 1B: Upload Dialog (from red cell click)

```
┌─────────────────────────────────────────────────────┐
│  Upload Statement                             [✕]  │
│  Chase Sapphire Reserve                            │
│                                                     │
│  Expected period: Feb 15 – Mar 14, 2026            │
│  ─────────────────────────────────────────────    │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │         ↑ Drop PDF here                     │   │
│  │                                             │   │
│  │    Drag and drop your statement PDF         │   │
│  │    or  [Browse Files]                       │   │
│  │                                             │   │
│  │    Accepted: PDF  ·  Max 20MB               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ─────────────────────────────────────────────    │
│                         [Cancel]  [Upload →]       │
└─────────────────────────────────────────────────────┘
```

Progress state (during upload):

```
┌─────────────────────────────────────────────────────┐
│  Upload Statement                             [✕]  │
│  Chase Sapphire Reserve                            │
│                                                     │
│  Expected period: Feb 15 – Mar 14, 2026            │
│  ─────────────────────────────────────────────    │
│                                                     │
│  chase_feb2026.pdf                          2.1 MB  │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░   52%    │
│  Uploading...                                       │
│                                                     │
│                                          [Cancel]  │
└─────────────────────────────────────────────────────┘
```

Success state (auto-closes after 1.5s):

```
┌─────────────────────────────────────────────────────┐
│  Upload Statement                                   │
│                                                     │
│  ✓  Statement uploaded successfully                 │
│     Processing will begin shortly.                  │
│     The timeline will update automatically.         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Duplicate warning state:

```
│  ⚠  This file appears to be a duplicate            │
│     chase_feb2026.pdf was already uploaded          │
│     on Feb 28, 2026.                               │
│                                                     │
│     [Cancel]  [Upload Anyway]                      │
```

---

## DESIGN 1C: Bulk Upload Dialog

Accessed via "+ Upload Statement" button at top of coverage page.

```
┌───────────────────────────────────────────────────────────────────┐
│  Bulk Upload Statements                                     [✕]  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                                                           │   │
│  │          ↑ Drop multiple PDFs here                        │   │
│  │                                                           │   │
│  │    Drag and drop multiple statement PDFs                  │   │
│  │    or  [Browse Files]                                     │   │
│  │                                                           │   │
│  │    We'll auto-detect the payment method for each file.   │   │
│  │                                                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ───────────────────────────────────────────────────────────    │
│                                                [Cancel]          │
└───────────────────────────────────────────────────────────────────┘
```

After files are selected (pre-upload review):

```
┌───────────────────────────────────────────────────────────────────┐
│  Bulk Upload Statements                                     [✕]  │
│                                                                   │
│  3 files selected                                                 │
│                                                                   │
│  File                    Detected Method        Period            │
│  ──────────────────────  ─────────────────────  ────────────────  │
│  chase_feb26.pdf         Chase Sapphire Reserve Feb 2026  [✓]    │
│  pnc_jan26.pdf           PNC Bank Checking      Jan 2026  [✓]    │
│  bangkok_unk.pdf         [Select method ▼]      Unknown   [!]    │
│                                                                   │
│  [+ Add More Files]                                               │
│                                                                   │
│  ───────────────────────────────────────────────────────────    │
│                          [Cancel]  [Upload 3 Statements →]       │
└───────────────────────────────────────────────────────────────────┘
```

Detection confidence indicator:
- [✓] green = high confidence auto-detect (parser matched)
- [!] amber = low confidence, user must confirm or correct
- Rows with [!] block the upload button with a tooltip: "Fix undetected files first"

---

## DESIGN 2: Statement Detail Page — `/imports/statements/[id]` (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Coverage                                                                  │
│                                                                              │
│  Chase Sapphire Reserve — Mar 15 to Apr 14, 2026       [Completed ✓]       │
│  chase_mar2026.pdf  ·  Uploaded Mar 15, 2026                                │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  ┌──────────┐  ┌──────────────────────┐  ┌──────────┐                      │
│  │ 34       │  │ 29 matched  (85%)    │  │ 5        │                      │
│  │ Extracted│  │ ████████████████░░░ │  │ Unmatched│                      │
│  └──────────┘  │ Match rate          │  └──────────┘                      │
│                └──────────────────────┘                                     │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  [Statement Transactions]    [Joot Transactions]                            │
│  (active tab — underlined)                                                   │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  ┌─ STATEMENT TRANSACTIONS TAB ────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  [🔍 Search transactions...]    [All ▼]  [Approve All Matched]          ││
│  │                                                                          ││
│  │  Date        Description                    Amount      Status          ││
│  │  ──────────  ─────────────────────────────  ──────────  ──────────────  ││
│  │  Mar 16      AMAZON.COM*1Z234               $47.99      ✓ Matched       ││
│  │              → Joot: Amazon Prime (Mar 16)  $47.99                      ││
│  │  ──────────  ─────────────────────────────  ──────────  ──────────────  ││
│  │  Mar 17      STARBUCKS #4521                $6.50       ✓ Matched       ││
│  │              → Joot: Starbucks (Mar 17)     $6.50                       ││
│  │  ──────────  ─────────────────────────────  ──────────  ──────────────  ││
│  │  Mar 18      GRAB *FOOD                     $23.10      ? Unmatched     ││
│  │              No match found                             [Link] [+ New]  ││
│  │  ──────────  ─────────────────────────────  ──────────  ──────────────  ││
│  │  Mar 19      NETFLIX.COM                    $15.99      + New           ││
│  │              Not in Joot for this period               [Link] [+ New]  ││
│  │  ──────────  ─────────────────────────────  ──────────  ──────────────  ││
│  │  Mar 20      PAYMENT RECEIVED - THANK YOU  -$2,500.00   — Credit       ││
│  │  ──────────  ─────────────────────────────  ──────────  ──────────────  ││
│  │                                                                          ││
│  │  [ Load more — 29 more transactions ]                                   ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────── ┘│
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  Statement Metadata  [▼ collapse]                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  Parser: chase-pdf    Pages: 4    Confidence: 94%                       ││
│  │  Filename: chase_mar2026.pdf    Uploaded: Mar 15, 2026                  ││
│  │  ⚠ 1 warning: "Page 3 partially OCR'd, review amounts manually"        ││
│  │                                                         [Re-process]    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Statement Detail: Joot Transactions Tab

```
│  [Statement Transactions]    [Joot Transactions]                            │
│                              (active tab)                                    │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  ┌─ JOOT TRANSACTIONS TAB ─────────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  [🔍 Search Joot transactions...]    [All ▼]                            ││
│  │                                                                          ││
│  │  Joot transactions for: Chase Sapphire Reserve · Mar 15 – Apr 14, 2026 ││
│  │                                                                          ││
│  │  Date        Vendor                        Amount      Match Status     ││
│  │  ──────────  ───────────────────────────   ──────────  ──────────────  ││
│  │  Mar 16      Amazon                         $47.99     ✓ On statement  ││
│  │  Mar 17      Starbucks                       $6.50     ✓ On statement  ││
│  │  Mar 18      Grab Food                      $23.10     ✗ Not on stmt   ││
│  │              [i] This transaction appears in Joot but not on the       ││
│  │                  statement. Verify the date or payment method.         ││
│  │  Mar 21      Uber                           $18.40     ✓ On statement  ││
│  │  Mar 22      Apple.com/bill                 $9.99      ✓ On statement  ││
│  │  ──────────  ───────────────────────────   ──────────  ──────────────  ││
│  │                                                                          ││
│  │  32 Joot transactions · 31 matched · 1 not found on statement          ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────── ┘│
```

### Statement Transaction Row States (Detail)

```
STATUS INDICATORS (left-aligned colored dot or icon in the status column):

✓ Matched     green-600   Transaction exists in Joot and matches
? Unmatched   amber-600   Statement item has no Joot counterpart
+ New         purple-600  Statement item is genuinely new (not in Joot)
— Credit      gray-400    Payment/credit/refund row (not a charge)

JOOT TRANSACTION MATCH STATUS:
✓ On statement   green-600   Joot txn confirmed on PDF
✗ Not on stmt    red-600     Joot txn has no corresponding statement line
```

### Row Interaction: Matched Pair Highlighting

```
When a user clicks a statement row (matched):

Statement Transactions panel:               Joot Transactions panel:
┌────────────────────────────────┐          ┌──────────────────────────────┐
│ Mar 16  AMAZON.COM  $47.99  ✓ │ ──────→  │ Mar 16  Amazon  $47.99  ✓   │
│ [highlighted row, blue ring]   │          │ [highlighted row, blue ring] │
└────────────────────────────────┘          └──────────────────────────────┘

The paired row scrolls into view and pulses briefly with a blue highlight.
This works in tab mode on mobile too: tapping a row shows a toast:
"Matched with Joot: Amazon — Mar 16, $47.99 · [View in Joot Transactions tab]"
```

---

## DESIGN 2: Statement Detail Page — Mobile (390px)

```
┌──────────────────────────────┐
│ ← Coverage                  │
│                              │
│ Chase Sapphire Reserve       │
│ Mar 15 – Apr 14, 2026        │
│ [Completed ✓]                │
│                              │
│ ┌────────┬─────────┬────────┐│
│ │ 34     │ 29 (85%)│ 5      ││
│ │ Extrac.│ Matched │ Unmatc.││
│ └────────┴─────────┴────────┘│
│ ████████████████░░░  85%    │
│                              │
│ ┌──────────────┬────────────┐│
│ │ Statement    │ Joot Txns  ││
│ │ Transactions │            ││
│ └──────────────┴────────────┘│
│                              │
│ [🔍 Search...]    [Filter ▼]│
│                              │
│ Mar 16                       │
│ AMAZON.COM*1Z234             │
│ $47.99          ✓ Matched    │
│ ─────────────────────────── │
│ Mar 17                       │
│ STARBUCKS #4521              │
│ $6.50           ✓ Matched    │
│ ─────────────────────────── │
│ Mar 18                       │
│ GRAB *FOOD                   │
│ $23.10          ? Unmatched  │
│ [Link to Existing] [+ New]  │
│ ─────────────────────────── │
│ Mar 19                       │
│ NETFLIX.COM                  │
│ $15.99              + New    │
│ [Link to Existing] [+ New]  │
│ ─────────────────────────── │
│                              │
│ [Load more — 29 remaining]  │
└──────────────────────────────┘
```

Mobile tab switching:
- Tabs use full-width layout, swipeable with touch gesture
- On mobile, "cross-panel" highlighting shows a bottom sheet instead:
  "Matched Joot transaction: Amazon · Mar 16 · $47.99" with a link to see it

---

## DESIGN 3: Review Queue — `/imports/review` (Desktop, refined)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Coverage                                                                  │
│                                                                              │
│  Review Queue                                                                │
│  Review and approve transaction matches                                      │
│                                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ 42 Total │  │ 7 Pending│  │ 28 High Conf │  │ 7 Needs Attention    │   │
│  └──────────┘  └──────────┘  └──────────────┘  └──────────────────────┘   │
│                   amber           green                  red                 │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  [🔍 Search vendor, amount...]   [Statement ▼]   [Source ▼]  [Status ▼]   │
│  [Currency ▼]   [Confidence ▼]   [Date range ▼]          [✕ Clear All]     │
│                                                                              │
│  ── OR, when arriving from Coverage (breadcrumb context bar): ─────────    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  ← Chase Sapphire Reserve — Mar 2026   Showing 12 items from this stmt ││
│  │                                                    [✕ Clear filter]     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  [✓ Approve All High Confidence (28)]                 [↻ Refresh]          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  [□] AMAZON.COM*1Z234       Mar 16, 2026    $47.99   ●●● High 94%      ││
│  │       Statement: Chase Sapphire Reserve · Mar 2026                      ││
│  │       Joot match: Amazon · Mar 16 · $47.99 · Chase Sapphire Reserve    ││
│  │                                        [✓ Approve]   [✗ Reject]        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  [□] STARBUCKS #4521        Mar 17, 2026    $6.50    ●●○ Med 72%       ││
│  │       Statement: Chase Sapphire Reserve · Mar 2026                      ││
│  │       Joot match: Starbucks · Mar 17 · $6.50 · Chase Sapphire Reserve  ││
│  │       Reasons: Date match +40, Amount match +32                         ││
│  │                              [Link Manually]  [✓ Approve]  [✗ Reject]  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  [□] GRAB *FOOD             Mar 18, 2026   $23.10   ○○○ No match       ││
│  │       Statement: Chase Sapphire Reserve · Mar 2026                      ││
│  │       No Joot transaction found for this period and amount              ││
│  │       Source: Statement                                                  ││
│  │                              [Link to Existing]     [+ Create New]      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  [□] Order #TH2938420       Mar 19, 2026   ฿890     ●●● High 91%       ││
│  │       Source: Email — Lazada <noreply@lazada.co.th>                     ││
│  │       Joot match: Lazada · Mar 19 · ฿890 · KBank                       ││
│  │       Cross-source: Email + Statement corroborate                       ││
│  │                                        [✓ Approve]   [✗ Reject]        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [ Loading more... ]  or  [ All caught up! No more pending items ]          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Review Queue Empty State (All caught up)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│              ✓                                                               │
│                                                                              │
│         All caught up!                                                       │
│         No items pending review.                                             │
│                                                                              │
│         Your financial picture is fully reconciled.                          │
│                                                                              │
│              [← Back to Coverage]                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Review Queue: Source Filter Clarification

The source filter dropdown is redesigned to clearly distinguish the three
origin types with descriptive labels:

```
┌──────────────────────────────────────────────┐
│  Source                                   [▼] │
├──────────────────────────────────────────────┤
│  ● All Sources                               │
│  ─────────────────                           │
│  ○ PDF Statements                            │
│    Extracted from uploaded bank/CC PDFs      │
│  ○ Email Receipts                            │
│    Auto-synced from Gmail/inbox              │
│  ○ Cross-Source Matches                      │
│    Email + statement corroborate same txn    │
└──────────────────────────────────────────────┘
```

### Context Breadcrumb Bar (when arriving from coverage)

When the user clicks an amber cell in the coverage grid and lands on the
review queue pre-filtered to a statement, a context bar appears above the
filter row:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Viewing:  Chase Sapphire Reserve — Mar 2026        12 items              │
│  ← Back to Coverage                                  [✕ Clear filter]     │
└──────────────────────────────────────────────────────────────────────────┘
```

This bar reads `statementUploadId` from the URL param and resolves the
statement label. The filter bar's "Statement" dropdown also shows the
pre-selected value. Clearing the filter removes the bar and shows all items.

---

## DESIGN 3: Review Queue — Mobile (390px, refined)

```
┌──────────────────────────────┐
│ ← Coverage                  │
│                              │
│ Review Queue                 │
│                              │
│ ┌────────┬────────┬─────────┐│
│ │42 Total│7 Pend. │28 High  ││
│ └────────┴────────┴─────────┘│
│                              │
│ [🔍 Search...]   [Filter (3)]│
│                              │
│ [✓ Approve All High (28)]   │
│                              │
│ ─────────────────────────── │
│ [□] AMAZON.COM              │
│     Mar 16 · $47.99          │
│     ●●● High 94%             │
│     Chase CSR · Statement    │
│     Joot: Amazon · $47.99   │
│     [✓ Approve] [✗ Reject]  │
│ ─────────────────────────── │
│ [□] STARBUCKS #4521          │
│     Mar 17 · $6.50           │
│     ●●○ Medium 72%           │
│     Chase CSR · Statement    │
│     Joot: Starbucks · $6.50 │
│     [✓ Approve] [✗ Reject]  │
│ ─────────────────────────── │
│ [□] GRAB *FOOD               │
│     Mar 18 · $23.10          │
│     ○○○ No match             │
│     Chase CSR · Statement    │
│     [Link Existing] [+ New] │
│ ─────────────────────────── │
└──────────────────────────────┘
```

Mobile filter pattern:
- Single "[Filter (3)]" button opens a bottom sheet with all filter controls
- Active filter count shown as badge on the button
- Filter bottom sheet has a full-width "Apply" button at the bottom

---

## Component Breakdown

### New Components Required

**`<CoverageRing />`** (new)
- SVG ring showing overall coverage %
- Props: percentage (number), size ("sm" | "md" | "lg")
- Colors: arc fill = green-500, track = gray-200
- Used in: StatsBar on coverage page

**`<PaymentMethodCoverageCard />`** (new, replaces StatementCoverageGrid table row)
- Full card per payment method, with scrollable timeline strip
- Props: paymentMethod, cells (12 months), coveragePercent, onCellClick, onGearClick
- Internally uses `<CoverageTimeline />` and `<CoverageCell />`
- Handles onboarding empty state

**`<CoverageTimeline />`** (new, extracted from StatementCoverageGrid)
- Horizontal row of 12 `<CoverageCell />` components
- `overflow-x: auto` on mobile
- Props: months[], cells{}, paymentMethodId

**`<CoverageCell />`** (refactored from existing cell logic in StatementCoverageGrid)
- Single month cell with status-based rendering
- Props: cell (CellData), month (string), onClick
- States: done | pending_review | processing | missing | future

**`<CoverageStatsBar />`** (new, replaces the amber banner + QuickActionsGrid)
- Top bar: CoverageRing + pending count + email sync info
- Props: coveragePercent, pendingCount, lastSyncAt, isSyncing, onSync

**`<UploadStatementDialog />`** (new, replaces navigation to /imports/statements/new)
- Props: open, paymentMethod, expectedPeriod, onSuccess, onClose
- Internal states: idle | uploading | duplicate_warning | success | error

**`<BulkUploadDialog />`** (new)
- Props: open, paymentMethods[], onSuccess, onClose
- Internal state: file rows with detected payment method + override select

**`<BillingCycleDialog />`** (new)
- Props: open, paymentMethod, currentStartDay, onSave, onClose
- Simple Dialog with number input

**`<StatementTransactionList />`** (new, core of statement detail page)
- Virtualized or paginated list of statement-extracted transactions
- Props: statementId, onRowClick (for cross-panel highlight)
- Renders `<StatementTransactionRow />` per item

**`<JootTransactionList />`** (new, second tab/panel of statement detail page)
- List of Joot transactions for the same period + payment method
- Props: paymentMethodId, periodStart, periodEnd, highlightedId
- Renders `<JootTransactionRow />` per item

**`<StatementDetailHeader />`** (new)
- Back arrow, title (method + period), status badge, stats row, progress bar
- Props: statement (full object), summary

**`<ContextBreadcrumb />`** (new, for review queue)
- Contextual filter context bar that shows when arriving from coverage
- Props: statementLabel, itemCount, onClear

### Modified Components

**`ReviewQueueFilterBar`** (modify)
- Add context breadcrumb rendering when `statementUploadId` is set
- Update Source filter dropdown to use descriptive option groups
- Add "Statements" vs "Emails" vs "Cross-Source" labels

**`StatementCoverageGrid`** (replace)
- The current table-based grid becomes `PaymentMethodCoverageCard` per row
- The table structure is removed entirely
- Each card is standalone with its own gear and nudge message

---

## Page Layout Specifications

### Coverage Page Layout Structure

```jsx
// /src/app/imports/page.tsx
<div className="flex flex-col gap-6 max-w-4xl mx-auto py-6 px-4">
  <CoverageStatsBar />                     {/* sticky on scroll? TBD */}
  <section>
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">Statement Coverage</h2>
      <Button onClick={openBulkUpload}>+ Upload Statement</Button>
    </div>
    {paymentMethods.map(pm => (
      <PaymentMethodCoverageCard key={pm.id} ... />
    ))}
  </section>
  <EmailSyncCard />
  <RecentActivityFeed collapsible defaultCollapsed={false} limit={5} />
  <UploadStatementDialog ... />
  <BulkUploadDialog ... />
  <BillingCycleDialog ... />
</div>
```

### Statement Detail Page Layout Structure

```jsx
// /src/app/imports/statements/[id]/page.tsx  (replaces redirect)
<div className="flex flex-col gap-0 max-w-5xl mx-auto py-6 px-4">
  <StatementDetailHeader statement={data} summary={data.summary} />
  <Separator />
  <Tabs defaultValue="statement">
    <TabsList>
      <TabsTrigger value="statement">
        Statement Transactions
        <Badge>{data.summary.total_extracted}</Badge>
      </TabsTrigger>
      <TabsTrigger value="joot">
        Joot Transactions
        <Badge>{jootCount}</Badge>
      </TabsTrigger>
    </TabsList>
    <TabsContent value="statement">
      <StatementTransactionList statementId={id} />
    </TabsContent>
    <TabsContent value="joot">
      <JootTransactionList paymentMethodId={...} periodStart={...} />
    </TabsContent>
  </Tabs>
  <Collapsible>
    <StatementMetadataPanel statement={data} />
  </Collapsible>
</div>
```

### Review Queue Layout Structure (minimal change)

```jsx
// /src/app/imports/review/page.tsx
<div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
  <ReviewQueueHeader />                      {/* back arrow + title + refresh */}
  <StatCards stats={stats} />
  {filters.statementUploadId && (
    <ContextBreadcrumb
      statementLabel={resolvedLabel}
      itemCount={stats.total}
      onClear={() => setFilters({ ...filters, statementUploadId: '' })}
    />
  )}
  <ReviewQueueFilterBar ... />
  <BatchApproveButton />
  <MatchCardList ... />
</div>
```

---

## Navigation & Routing Changes

### Current routes (4 items)
```
/imports                        Dashboard
/imports/review                 Review Queue
/imports/statements             Statements list
/imports/statements/new         Upload new statement
/imports/statements/[id]        → redirects to /[id]/results
/imports/statements/[id]/results  Results summary
```

### New routes (2 primary + drill-down)
```
/imports                        Coverage Page (primary)
/imports/review                 Review Queue (primary)
/imports/statements/[id]        Statement Detail (drill-down only)
```

### Routes to remove / redirect
```
/imports/statements             → redirect to /imports
/imports/statements/new         → replaced by UploadStatementDialog on /imports
/imports/statements/[id]/results → redirect to /imports/statements/[id]
```

The existing redirect logic in `/imports/statements/[id]/page.tsx` is
replaced with the actual statement detail page content.

### In-app navigation links to update
- `StatementCoverageGrid` cell href for "done" state: was `/imports/statements/[id]/results`, becomes `/imports/statements/[id]`
- `ProcessingResultsPage` "Back to Statements" button: becomes "← Coverage", links to `/imports`
- Review queue "Upload Statement" empty state CTA: opens `UploadStatementDialog` instead of navigating

---

## Interaction Flows

### Flow 1: Fill a Coverage Gap
```
1. User sees red/dashed cell on Bangkok Bank — Sep 2025
2. User clicks cell
3. UploadStatementDialog opens:
   - Title: "Upload Statement — Bangkok Bank"
   - Subtitle: "Expected period: Sep 1 – Sep 30, 2025" (based on billing cycle config)
   - Drop zone
4. User drops PDF
5. Progress bar advances: Uploading → Processing
6. Dialog closes, cell updates to blue "processing"
7. Cell transitions to green ✓ or amber (N) after processing completes
```

### Flow 2: Review After Processing
```
1. User sees amber cell "3" on Chase Sapphire Reserve — Mar 2026
2. User clicks cell
3. App navigates to /imports/review?statementUploadId=[id]
4. Context breadcrumb shows "Chase Sapphire Reserve — Mar 2026 · 3 items"
5. Filter is pre-set to that statement
6. User reviews 3 items, approves all
7. User clicks "← Back to Coverage" in context bar
8. Coverage page shows cell has turned green ✓
```

### Flow 3: Investigate an Unmatched Statement Item
```
1. User clicks green cell for Chase — Mar 2026 (goes to statement detail)
2. On Statement Transactions tab, user sees "GRAB *FOOD $23.10 — Unmatched"
3. User clicks [Link to Existing]
4. LinkToExistingDialog opens, pre-filled with GRAB *FOOD $23.10 Mar 18
5. User finds and selects the Joot "Grab" transaction
6. Row updates to ✓ Matched
```

### Flow 4: Discover a Joot Error via Statement
```
1. User on Statement Detail, switches to Joot Transactions tab
2. Sees "Grab Food $23.10 — Not on statement" (red X)
3. User realizes they entered it under wrong payment method
4. User clicks through to the Joot transaction (link in row)
5. User edits the payment method, returns
6. Joot Transactions tab refreshes, row now shows ✓ On statement
```

---

## Accessibility Notes

- All coverage cells must have descriptive `aria-label`:
  e.g., `aria-label="Chase Sapphire Reserve, March 2026, 3 pending review items"`
- Gear icon button: `aria-label="Chase Sapphire Reserve billing cycle settings"`
- Timeline strip: `role="list"` with each cell as `role="listitem"`
- Status color is never the only indicator — icon + text always accompany color
- Upload dialog: file input must be keyboard-accessible, not just drag-and-drop
- Statement transaction table: `role="grid"`, row actions in a focus trap on
  keyboard activation
- Review queue breadcrumb: announced via `aria-live="polite"` when it appears
- Loading states: all Skeleton components have `aria-busy="true"` on their
  container

---

## Data Requirements & API Changes

### New API endpoints needed

**`GET /api/imports/coverage`** (existing, extend response)
```typescript
// Add to response:
{
  overallCoveragePercent: number,    // rolling 12mo across all payment methods
  pendingTotal: number,
  lastEmailSync: string | null,
  emailsPendingReview: number,
  recentActivity: ActivityItem[]
}
```

**`GET /api/imports/statements/[id]/transactions`** (new)
```typescript
// Returns paginated list of extracted statement transactions
{
  transactions: StatementTransaction[],
  total: number,
  hasMore: boolean
}
```

**`GET /api/imports/joot-transactions`** (new)
```typescript
// Returns Joot transactions for a payment method + period
// Query params: paymentMethodId, periodStart, periodEnd
{
  transactions: JootTransactionWithMatchStatus[],
  total: number,
  matchedCount: number,
  unmatchedCount: number
}
```

**`PATCH /api/payment-methods/[id]`** (new or extend)
```typescript
// Update billing cycle start day
{ billing_cycle_start_day: number }
```

### Database change needed
```sql
-- Add to payment_methods table
ALTER TABLE payment_methods
ADD COLUMN billing_cycle_start_day INTEGER DEFAULT 1 CHECK (
  billing_cycle_start_day BETWEEN 1 AND 28
);
```

---

## Design Tokens & Spacing

All spacing uses Tailwind's 4px grid. Key values:

```
Card padding:        p-4 (16px) desktop, p-3 (12px) mobile
Card gap:            gap-4 (16px) between payment method cards
Timeline cell size:  h-10 w-14 (40px × 56px) desktop
                     h-11 w-11 (44px × 44px) mobile (touch target)
Coverage ring:       w-16 h-16 desktop, w-12 h-12 in compact mobile bar
Section heading:     text-lg font-semibold (18px/600)
Stat number:         text-3xl font-bold (30px/700) on detail pages
                     text-2xl font-bold (24px/700) on queue stats
Month label:         text-xs (12px) below timeline cell
Badge (currency):    text-xs px-2 py-0.5 rounded-full
```

---

## shadcn/ui Component Mapping

| UI Element                        | shadcn Component         | Notes                               |
|-----------------------------------|--------------------------|-------------------------------------|
| Payment method card               | Card, CardContent        | no CardHeader (custom layout)       |
| Coverage cell                     | custom div               | not a shadcn component              |
| Coverage percentage ring          | custom SVG               | no shadcn analog                    |
| Billing cycle dialog              | Dialog                   | standard Dialog                     |
| Upload dialog                     | Dialog                   | standard Dialog                     |
| Bulk upload dialog                | Dialog                   | wider, max-w-2xl                    |
| Mobile upload sheet               | Sheet                    | side="bottom"                       |
| Mobile filter sheet               | Sheet                    | side="bottom"                       |
| Statement transactions tab        | Tabs, TabsList, TabsContent |                                  |
| Context breadcrumb bar            | Alert (variant="default") or custom |                         |
| Match card                        | Card                     | existing component, unchanged       |
| Source filter dropdown            | Select + SelectGroup     | add group labels                    |
| Pending badge                     | Badge (variant="warning") |                                    |
| Match status pill                 | Badge                    | colored by status                   |
| Bulk approve button               | Button (green-600 bg)    | existing pattern                    |
| Timeline scroll container         | ScrollArea               | horizontal scroll on mobile         |
| Metadata collapsible              | Collapsible              | shadcn Collapsible                  |
| Recent activity collapsible       | Collapsible              | shadcn Collapsible                  |
| Progress bar (match rate)         | Progress                 | standard Progress                   |
| Gear icon                         | Button (variant="ghost", size="icon") |                       |
| Stat cards (queue)                | custom div (existing StatCard) |                               |

---

## Design Decisions (Resolved)

### 1. Coverage percentage formula
**Decision:** A month is "covered" if a statement exists (status = `done` OR
`pending_review`). "missing" and "processing" months are NOT covered. Future
months are excluded from the denominator.

However, each coverage cell and payment method card must communicate **deeper
status** beyond just "exists":
- **Extracted**: how many transactions the parser found
- **Matched**: how many matched existing Joot transactions
- **New/Unmatched**: how many still need action (create or link)
- **Created**: how many new Joot transactions were created from this statement

This deeper status appears in:
- **Tooltip on hover** over a green/amber cell: "34 extracted · 29 matched · 5 new"
- **Card-level summary row**: aggregate across all statements for that payment method
- **Statement detail page**: full breakdown with progress bar

### 2. Bulk upload
**Decision:** Deferred. Not included in v1. The "+ Upload Statement" button
at the top of the coverage page opens the single-file upload dialog with a
payment method selector (not pre-filled). Bulk upload can be added later.

### 3. Joot Transactions cross-reference
**Decision:** Confirmed. Joot transactions are the source of truth / end result.
New reference sources (statements, emails) get matched against existing Joot
transactions. The Statement Detail "Joot Transactions" tab queries the
`transactions` table filtered by `payment_method_id` + date range overlapping
the statement period, then cross-references against `extraction_log.suggestions`
to determine match status.

For "on statement" status: a Joot transaction is "on statement" if any suggestion
in the statement's `extraction_log.suggestions` has `matched_transaction_id`
pointing to that Joot transaction's ID. Otherwise, it's "not on statement."

This means the query pattern is:
1. Fetch Joot transactions for (payment_method, period)
2. Fetch the statement's `extraction_log.suggestions` (already loaded)
3. Build a Set of `matched_transaction_id` values from approved suggestions
4. Mark each Joot transaction as on/off statement

### 4. Billing cycle inference
**Decision:** Auto-infer from existing statement data before falling back to
default. The logic:

```
For each payment method:
1. Query all completed statement_uploads with non-null statement_period_start
2. Extract the day-of-month from each statement_period_start
3. If there are 2+ statements and the mode (most common day) appears in >50%
   of them, use that day as the inferred billing_cycle_start_day
4. Otherwise, default to 1 (calendar month)
```

This inference runs in the coverage API and is stored/cached on the
`payment_methods` row via the `billing_cycle_start_day` column. The user
can override via the gear icon settings dialog.

The DB migration still adds the column:
```sql
ALTER TABLE payment_methods
ADD COLUMN billing_cycle_start_day INTEGER DEFAULT NULL CHECK (
  billing_cycle_start_day BETWEEN 1 AND 28
);
```

NULL means "not yet configured — use inference or default to 1."
A non-null value means "user explicitly set this."

### 5. Bulk upload auto-detect
**Decision:** Deferred along with bulk upload (see #2).

---

## Remaining Implementation Notes

1. **Polling for processing state**: Use coarse polling (10 seconds) on the
   coverage page when any cell has status "processing". The statement detail
   page can poll more frequently (2-3 seconds) since the user is actively
   watching. No WebSocket needed for v1.

2. **Statement detail page data source**: New endpoint
   `GET /api/imports/statements/[id]/transactions` extracts and returns the
   transaction list from `extraction_log`. Does NOT send the raw JSONB to
   the client. Supports pagination.

3. **Navigation changes**: `/imports/statements` (the old upload page) redirects
   to `/imports`. `/imports/statements/[id]/results` redirects to
   `/imports/statements/[id]`. The `/imports/history` stub is removed from nav.
