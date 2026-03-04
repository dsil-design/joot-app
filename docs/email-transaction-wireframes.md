# Email-to-Transaction Linking - Detailed Wireframes

**Project:** Joot Transaction Tracker
**Date:** 2025-12-31
**Version:** 1.0
**Status:** Superseded by `docs/imports-redesign-wireframes.md` and `email-processing-hub-ux-spec.md`

---

## Table of Contents

1. [Desktop Wireframes](#desktop-wireframes)
2. [Mobile Wireframes](#mobile-wireframes)
3. [Component Details](#component-details)
4. [Interaction Specifications](#interaction-specifications)

---

## Desktop Wireframes

### 1. Import Dashboard (Desktop - 1440px)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                                         ┌────────┐ │
│ │          │  Imports                                                                │  DW    │ │
│ │  🏠 Home │                                                                         │ User   │ │
│ │          │                                                                         └────────┘ │
│ │ 🧾 Trans │  ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │          │  │                                                                              │ │
│ │ 📥 Import│  │  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐    │ │
│ │   (active│  │  │                    │  │                    │  │                    │    │ │
│ │          │  │  │    ⚠️  Pending     │  │    ⏳  Waiting     │  │    ✓  Matched     │    │ │
│ │ ⚙️  Sett │  │  │       Review       │  │   for Statement    │  │      (30d)        │    │ │
│ │          │  │  │                    │  │                    │  │                    │    │ │
│ │          │  │  │        42          │  │         18         │  │        156         │    │ │
│ │──────────│  │  │                    │  │                    │  │                    │    │ │
│ │          │  │  │   Click to review  │  │  Will auto-match   │  │  Successfully      │    │ │
│ │ 👤 Dennis│  │  │                    │  │  when stmt arrives │  │  imported          │    │ │
│ │  Wagner  │  │  └────────────────────┘  └────────────────────┘  └────────────────────┘    │ │
│ │  d@w.com │  │                                                                              │ │
│ └──────────┘  └──────────────────────────────────────────────────────────────────────────────┘
│    240px                                                                                       │
│               ┌──────────────────────────────────────────────────────────────────────────────┐ │
│               │ 📧 Email Sync                                                                │ │
│               │                                                                              │ │
│               │  Last synced: 2 hours ago (Dec 31, 10:00 AM)                                │ │
│               │  Folder: Transactions                                                       │ │
│               │  Total synced: 1,247 emails                                                 │ │
│               │                                                                              │ │
│               │  ┌──────────────────────────────────────────────────────────┐               │ │
│               │  │ ● Connected                                              │  [🔄 Sync Now]│ │
│               │  │ icloud.com/Transactions                                  │               │ │
│               │  └──────────────────────────────────────────────────────────┘               │ │
│               └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                │
│               ┌──────────────────────────────────────────────────────────────────────────────┐ │
│               │ 🎯 Quick Actions                                                             │ │
│               │                                                                              │ │
│               │  ┌─────────────────────────┐  ┌─────────────────────────┐                  │ │
│               │  │                         │  │                         │                  │ │
│               │  │   📤                    │  │   🔍                    │                  │ │
│               │  │                         │  │                         │                  │ │
│               │  │   Upload Statement      │  │   Review Queue          │                  │ │
│               │  │                         │  │                         │                  │ │
│               │  └─────────────────────────┘  └─────────────────────────┘                  │ │
│               │                                                                              │ │
│               │  ┌─────────────────────────┐  ┌─────────────────────────┐                  │ │
│               │  │                         │  │                         │                  │ │
│               │  │   📊                    │  │   ⚙️                     │                  │ │
│               │  │                         │  │                         │                  │ │
│               │  │   View History          │  │   Import Settings       │                  │ │
│               │  │                         │  │                         │                  │ │
│               │  └─────────────────────────┘  └─────────────────────────┘                  │ │
│               └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                │
│               ┌──────────────────────────────────────────────────────────────────────────────┐ │
│               │ 📜 Recent Activity                                                           │ │
│               │                                                                              │ │
│               │  Today, 10:15 AM                                                             │ │
│               │  ✓ Matched 12 Grab receipts to Chase charges                                │ │
│               │    12 high-confidence matches • $142.50 total                               │ │
│               │                                                                              │ │
│               │  Today, 9:30 AM                                                              │ │
│               │  ⏳ 8 Bolt receipts waiting for statement                                    │ │
│               │    Expected: ~$35.20 USD on next Chase statement                            │ │
│               │                                                                              │ │
│               │  Dec 30, 4:20 PM                                                             │ │
│               │  ✓ Imported 5 Bangkok Bank transfers                                        │ │
│               │    ฿6,450.00 THB • Payment methods, groceries, utilities                    │ │
│               │                                                                              │ │
│               │  Dec 30, 11:45 AM                                                            │ │
│               │  📤 Processed Chase December statement                                       │ │
│               │    38 matches found • 7 new transactions • 45 total processed                │ │
│               │                                                                              │ │
│               │  Dec 29, 3:15 PM                                                             │ │
│               │  ✓ Bulk approved 15 high-confidence matches                                 │ │
│               │    $456.78 USD imported successfully                                         │ │
│               │                                                                              │ │
│               │                                              [View All History →]            │ │
│               └──────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Spacing & Typography:**
- Page padding: `px-10 py-12`
- Card gap: `gap-6`
- Card padding: `p-6`
- Section titles: `text-lg font-semibold`
- Body text: `text-sm text-muted-foreground`

---

### 2. Review Queue (Desktop - 1440px)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                                         ┌────────┐ │
│ │          │  Review Queue                                                           │  DW    │ │
│ │  🏠 Home │                                                                         │ User   │ │
│ │          │  ┌──────────────────────────────────────────────────────────────────────┘        │ │
│ │ 🧾 Trans │  │ Filters & Search                                                             │ │
│ │          │  │                                                                              │ │
│ │ 📥 Import│  │  [All ▼]  [Status ▼]  [Currency ▼]        [🔍 Search vendor, amount...]    │ │
│ │   >Review│  │                                                                              │ │
│ │          │  │  42 items • High: 28, Medium: 8, Waiting: 6                                 │ │
│ │ ⚙️  Sett │  │                                            [✓ Approve All High-Confidence]  │ │
│ │          │  └──────────────────────────────────────────────────────────────────────────────┘ │
│ │──────────│                                                                                   │
│ │ 👤 Dennis│  ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ └──────────┘  │ HIGH CONFIDENCE MATCH (87%)                                                  │ │
│               │                                                                              │ │
│               │  📧  GrabFood Receipt                                    Dec 15, 2025        │ │
│               │      no-reply@grab.com                                                       │ │
│               │      ฿340.00 THB                                                            │ │
│               │      Order #GF-20251215-XYABC                                                │ │
│               │                                                                              │ │
│               │  ────────────────────────────────────────────────────────────────────────    │ │
│               │                                                                              │ │
│               │  🔗  Matched to: Chase Sapphire Reserve                                      │ │
│               │      Grab* Bangkok TH                                                        │ │
│               │      $10.00 USD • Dec 15, 2025                                              │ │
│               │      Exchange rate: 1 USD = 34.00 THB (±0% variance)                        │ │
│               │                                                                              │ │
│               │      Confidence: 87%  ████████░░  HIGH                                       │ │
│               │      ✓ Amount match (exact after conversion)                                │ │
│               │      ✓ Date match (same day)                                                │ │
│               │      ✓ Vendor match (Grab → Grab*)                                          │ │
│               │      ⚠ Manual review recommended (first Grab match)                         │ │
│               │                                                                              │ │
│               │  ────────────────────────────────────────────────────────────────────────    │ │
│               │                                                                              │ │
│               │  Transaction Details:                                                        │ │
│               │  Vendor: GrabFood  •  Payment Method: Chase Sapphire Reserve                │ │
│               │  Description: Dinner - KFC Sukhumvit  •  Tags: Food, Delivery               │ │
│               │                                                                              │ │
│               │  ────────────────────────────────────────────────────────────────────────    │ │
│               │                                                                              │ │
│               │  [✓ Approve]  [✗ Reject]  [🔗 Link to Different Transaction]  [👁️ View Email]│ │
│               └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                │
│               ┌──────────────────────────────────────────────────────────────────────────────┐ │
│               │ WAITING FOR STATEMENT                                                        │ │
│               │                                                                              │ │
│               │  📧  Bolt Ride Receipt                                   Dec 18, 2025        │ │
│               │      bangkok@bolt.eu                                                         │ │
│               │      ฿156.00 THB                                                            │ │
│               │      Trip ID: BOLT-12345678                                                  │ │
│               │                                                                              │ │
│               │  ────────────────────────────────────────────────────────────────────────    │ │
│               │                                                                              │ │
│               │  ⏳  Waiting for Chase Sapphire Reserve statement                            │ │
│               │      Expected charge: ~$4.59 USD (฿156 ÷ 34)                               │ │
│               │      Expected posting date: Dec 18-19, 2025                                  │ │
│               │                                                                              │ │
│               │      ℹ️  This receipt will automatically match when you upload the           │ │
│               │         December Chase statement. No action needed.                          │ │
│               │                                                                              │ │
│               │  ────────────────────────────────────────────────────────────────────────    │ │
│               │                                                                              │ │
│               │  [📎 Link Manually]  [➕ Import as THB Transaction]  [👁️ View Email]        │ │
│               └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                │
│               ┌──────────────────────────────────────────────────────────────────────────────┐ │
│               │ READY TO IMPORT                                                              │ │
│               │                                                                              │ │
│               │  📧  Bangkok Bank Transfer                               Dec 20, 2025        │ │
│               │      BualuangmBanking@bangkokbank.com                                        │ │
│               │      ฿1,200.00 THB                                                          │ │
│               │      To: 7-Eleven (PromptPay 02-xxx-xxxx)                                    │ │
│               │                                                                              │ │
│               │  ────────────────────────────────────────────────────────────────────────    │ │
│               │                                                                              │ │
│               │  ✓  Ready to import as new transaction                                       │ │
│               │     No matching database record found                                        │ │
│               │                                                                              │ │
│               │     Vendor: 7-Eleven                            (Confidence: 98%)            │ │
│               │     Payment Method: Bangkok Bank (Bualuang)                                  │ │
│               │     Amount: ฿1,200.00 THB                                                   │ │
│               │     Description: PromptPay payment to 7-Eleven                               │ │
│               │     Date: Dec 20, 2025                                                       │ │
│               │     Tags: (None suggested)                                                   │ │
│               │                                                                              │ │
│               │  ────────────────────────────────────────────────────────────────────────    │ │
│               │                                                                              │ │
│               │  [✓ Approve & Import]  [✏️ Edit Details]  [✗ Skip]  [👁️ View Email]         │ │
│               └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                │
│               ┌──────────────────────────────────────────────────────────────────────────────┐ │
│               │ MEDIUM CONFIDENCE MATCH (68%) - NEEDS REVIEW                                 │ │
│               │                                                                              │ │
│               │  📧  Lazada Order Confirmation                           Dec 22, 2025        │ │
│               │      order@lazada.co.th                                                      │ │
│               │      ฿850.00 THB (estimated)                                                │ │
│               │      Order #1052844351508824                                                 │ │
│               │                                                                              │ │
│               │  ────────────────────────────────────────────────────────────────────────    │ │
│               │                                                                              │ │
│               │  🔗  Possible match: Chase Sapphire Reserve                                  │ │
│               │      Lazada* Bangkok TH                                                      │ │
│               │      $28.50 USD • Dec 24, 2025                                              │ │
│               │      Exchange rate: 1 USD = 34.00 THB (+13% variance ⚠️)                    │ │
│               │                                                                              │ │
│               │      Confidence: 68%  ██████░░░░  MEDIUM                                     │ │
│               │      ⚠ Amount variance high (฿850 estimated, actual $28.50 = ฿969)         │ │
│               │      ⚠ Date mismatch (2 days later - possible posting delay)                │ │
│               │      ✓ Vendor match (Lazada → Lazada*)                                      │ │
│               │                                                                              │ │
│               │      ⚠  Manual review required - amount and date discrepancies               │ │
│               │                                                                              │ │
│               │  ────────────────────────────────────────────────────────────────────────    │ │
│               │                                                                              │ │
│               │  [✓ Confirm Match]  [✗ Reject Match]  [🔍 Search Other Transactions]        │ │
│               └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                │
│               [← Previous]  [Page 1 of 3]  [Next →]                                           │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Card Visual Design:**
- **High Confidence:** Green left border (4px), white background
- **Medium Confidence:** Amber left border, white background
- **Low Confidence:** Red left border, white background
- **Waiting:** Blue left border, blue-50 background
- **Ready to Import:** Purple left border, purple-50 background

**Button Styles:**
- Primary action (Approve): `bg-green-600 text-white hover:bg-green-700`
- Destructive (Reject): `border-red-600 text-red-600 hover:bg-red-50`
- Secondary (Link Other): `border-gray-300 text-gray-700 hover:bg-gray-50`
- Tertiary (View Email): `text-blue-600 hover:underline`

---

### 3. Statement Upload (Desktop - 1440px)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                                         ┌────────┐ │
│ │          │  Upload Statement                                                       │  DW    │ │
│ │  🏠 Home │                                                                         │ User   │ │
│ │          │                                                                         └────────┘ │
│ │ 🧾 Trans │  ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │          │  │ Statement Type                                                               │ │
│ │ 📥 Import│  │                                                                              │ │
│ │   >Upload│  │  ○  Chase Sapphire Reserve (USD)                                            │ │
│ │          │  │  ●  American Express (USD)                          ← Selected              │ │
│ │ ⚙️  Sett │  │  ○  Bangkok Bank (Bualuang) (THB)                                           │ │
│ │          │  │  ○  Kasikorn Bank (K PLUS) (THB)                                            │ │
│ │──────────│  │                                                                              │ │
│ │ 👤 Dennis│  └──────────────────────────────────────────────────────────────────────────────┘ │
│ └──────────┘                                                                                   │
│               ┌──────────────────────────────────────────────────────────────────────────────┐ │
│               │ Upload File                                                                  │ │
│               │                                                                              │ │
│               │  ┌────────────────────────────────────────────────────────────────────────┐  │ │
│               │  │                                                                        │  │ │
│               │  │                                                                        │  │ │
│               │  │                              📄                                        │  │ │
│               │  │                                                                        │  │ │
│               │  │                   Drag & drop statement here                          │  │ │
│               │  │                      or click to browse                               │  │ │
│               │  │                                                                        │  │ │
│               │  │            Accepts: PDF, PNG, JPG, HEIC (Max 10MB)                    │  │ │
│               │  │                                                                        │  │ │
│               │  │                                                                        │  │ │
│               │  └────────────────────────────────────────────────────────────────────────┘  │ │
│               │                                                                              │ │
│               └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                │
│               ┌──────────────────────────────────────────────────────────────────────────────┐ │
│               │ Recent Uploads                                                               │ │
│               │                                                                              │ │
│               │  Dec 30, 2025 - 11:45 AM                                                     │ │
│               │  Chase Sapphire Reserve - December 2025 Statement                            │ │
│               │  45 transactions • 38 matched • 7 new          [View Results →]              │ │
│               │                                                                              │ │
│               │  Nov 28, 2025 - 2:30 PM                                                      │ │
│               │  Chase Sapphire Reserve - November 2025 Statement                            │ │
│               │  52 transactions • 49 matched • 3 new          [View Results →]              │ │
│               │                                                                              │ │
│               └──────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────┘


AFTER UPLOAD - Processing State:

┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│               ┌──────────────────────────────────────────────────────────────────────────────┐ │
│               │ Processing Statement                                                         │ │
│               │                                                                              │ │
│               │  ✓  File uploaded (amex-december-2025.pdf)                  2.3 MB           │ │
│               │  ✓  Validated file type and size                                             │ │
│               │  ⏳  Extracting transactions...                              80%              │ │
│               │      [████████████████████░░░░]  36 of 45 processed                          │ │
│               │                                                                              │ │
│               │  Next steps:                                                                 │ │
│               │  • Cross-reference with synced emails                                        │ │
│               │  • Calculate match confidence scores                                         │ │
│               │  • Prepare review queue                                                      │ │
│               │                                                                              │ │
│               │  Estimated time remaining: ~15 seconds                                       │ │
│               │                                                                              │ │
│               └──────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────┘


AFTER PROCESSING - Results State:

┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│               ┌──────────────────────────────────────────────────────────────────────────────┐ │
│               │ Extraction Results                                                           │ │
│               │                                                                              │ │
│               │  American Express - December 2025 Statement                                  │ │
│               │  Statement Period: Nov 20 - Dec 19, 2025                                     │ │
│               │                                                                              │ │
│               │  ──────────────────────────────────────────────────────────────────────────  │ │
│               │                                                                              │ │
│               │  📊  Summary                                                                 │ │
│               │                                                                              │ │
│               │      45  Transactions extracted                                              │ │
│               │      38  Matched to receipt emails (84% match rate)                          │ │
│               │       7  New transactions (no matching receipt)                              │ │
│               │                                                                              │ │
│               │      $1,247.89  Total charges                                                │ │
│               │        $94.91  Total credits                                                 │ │
│               │     $1,152.98  Net charges                                                   │ │
│               │                                                                              │ │
│               │  ──────────────────────────────────────────────────────────────────────────  │ │
│               │                                                                              │ │
│               │  🎯  Match Quality Distribution                                              │ │
│               │                                                                              │ │
│               │      High Confidence (>90%)   ██████████████████████  38  (84%)             │ │
│               │      Medium (55-90%)          ░░░░░░░░░░░░░░░░░░░░░░   0   (0%)             │ │
│               │      Low (<55%)               ░░░░░░░░░░░░░░░░░░░░░░   0   (0%)             │ │
│               │      No Match Found           ░░░░░░░░░░░░░░░░░░░░░░   7  (16%)             │ │
│               │                                                                              │ │
│               │  ──────────────────────────────────────────────────────────────────────────  │ │
│               │                                                                              │ │
│               │  📋  Breakdown by Category                                                   │ │
│               │                                                                              │ │
│               │      Cross-currency matches (THB → USD):  26 transactions                   │ │
│               │      Direct USD receipts:                  12 transactions                   │ │
│               │      No email receipt:                      7 transactions                   │ │
│               │                                                                              │ │
│               │  ──────────────────────────────────────────────────────────────────────────  │ │
│               │                                                                              │ │
│               │  ⚠️  Action Required                                                         │ │
│               │                                                                              │ │
│               │      7 transactions have no matching email receipt.                          │ │
│               │      These will need manual verification before import.                      │ │
│               │                                                                              │ │
│               │  ──────────────────────────────────────────────────────────────────────────  │ │
│               │                                                                              │ │
│               │  [🔍 Review All Matches]     [✓ Approve High-Confidence Only]               │ │
│               │                                                                              │ │
│               │  [💾 Download Full Report (CSV)]      [✏️ Review Unmatched Individually]     │ │
│               │                                                                              │ │
│               └──────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Upload Zone States:**

1. **Default (Idle):**
   - Dashed border: `border-2 border-dashed border-gray-300`
   - Background: `bg-gray-50`
   - Icon: Gray upload icon
   - Text: Gray helper text

2. **Drag Over:**
   - Dashed border: `border-2 border-dashed border-blue-500`
   - Background: `bg-blue-50`
   - Icon: Blue upload icon (animated pulse)
   - Text: "Drop file here"

3. **Processing:**
   - Solid border: `border-2 border-blue-500`
   - Background: `bg-white`
   - Content: Progress bar + status text
   - Icon: Spinner animation

4. **Success:**
   - Solid border: `border-2 border-green-500`
   - Background: `bg-green-50`
   - Icon: Green checkmark
   - Text: Filename + file size

5. **Error:**
   - Solid border: `border-2 border-red-500`
   - Background: `bg-red-50`
   - Icon: Red X
   - Text: Error message + retry button

---

## Mobile Wireframes

### 1. Import Dashboard (Mobile - 375px)

```
┌─────────────────────────────────────────┐
│ ☰  Imports                          DW  │
├─────────────────────────────────────────┤
│                                         │
│ [Home] [Transactions] [Imports] [⚙️]     │
│                          ^^^^^^         │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │   ⚠️  Pending Review                │ │
│ │                                     │ │
│ │            42                       │ │
│ │                                     │ │
│ │      Click to review                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │   ⏳  Waiting for Statement         │ │
│ │                                     │ │
│ │            18                       │ │
│ │                                     │ │
│ │   Will auto-match when uploaded    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │   ✓  Matched (30 days)             │ │
│ │                                     │ │
│ │           156                       │ │
│ │                                     │ │
│ │   Successfully imported             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📧 Email Sync                       │ │
│ │                                     │ │
│ │ Last synced: 2 hours ago            │ │
│ │ Folder: Transactions                │ │
│ │ Total: 1,247 emails                 │ │
│ │                                     │ │
│ │           [🔄 Sync Now]             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🎯 Quick Actions                    │ │
│ │                                     │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │  📤  Upload Statement            │ │ │
│ │ └─────────────────────────────────┘ │ │
│ │                                     │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │  🔍  Review Queue                │ │ │
│ │ └─────────────────────────────────┘ │ │
│ │                                     │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │  📊  View History                │ │ │
│ │ └─────────────────────────────────┘ │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📜 Recent Activity                  │ │
│ │                                     │ │
│ │ Today, 10:15 AM                     │ │
│ │ ✓ Matched 12 Grab receipts          │ │
│ │   $142.50 total                     │ │
│ │                                     │ │
│ │ Today, 9:30 AM                      │ │
│ │ ⏳ 8 Bolt receipts waiting           │ │
│ │   ~$35.20 USD expected              │ │
│ │                                     │ │
│ │ Dec 30, 4:20 PM                     │ │
│ │ ✓ Imported 5 bank transfers         │ │
│ │   ฿6,450.00 THB                    │ │
│ │                                     │ │
│ │          [View All →]               │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Mobile Spacing:**
- Horizontal padding: `px-4`
- Vertical padding: `py-6`
- Card gap: `gap-4`
- Card padding: `p-4`

---

### 2. Review Queue (Mobile - 375px)

```
┌─────────────────────────────────────────┐
│ ←  Review Queue                      ⋯  │
├─────────────────────────────────────────┤
│                                         │
│ [Filters ▼]  [🔍 Search]                │
│                                         │
│ 42 items                                │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ HIGH CONFIDENCE (87%)               │ │
│ │                                     │ │
│ │ 📧 GrabFood Receipt                 │ │
│ │    Dec 15, 2025                     │ │
│ │                                     │ │
│ │    ฿340.00 THB                     │ │
│ │    Order #GF-20251215-XYABC         │ │
│ │                                     │ │
│ │ ─────────────────────────────────   │ │
│ │                                     │ │
│ │ 🔗 Matched to:                      │ │
│ │    Grab* Bangkok TH                 │ │
│ │    $10.00 USD • Dec 15              │ │
│ │    Chase Sapphire Reserve           │ │
│ │                                     │ │
│ │    Confidence: 87%                  │ │
│ │    ████████░░ HIGH                  │ │
│ │                                     │ │
│ │    ✓ Amount match                   │ │
│ │    ✓ Date match                     │ │
│ │    ✓ Vendor match                   │ │
│ │                                     │ │
│ │ ─────────────────────────────────   │ │
│ │                                     │ │
│ │ [✓ Approve]  [✗ Reject]             │ │
│ │                                     │ │
│ │ [More Options ▼]                    │ │
│ └─────────────────────────────────────┘ │
│         ↕️ Swipe to approve/reject      │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ WAITING FOR STATEMENT               │ │
│ │                                     │ │
│ │ 📧 Bolt Ride Receipt                │ │
│ │    Dec 18, 2025                     │ │
│ │                                     │ │
│ │    ฿156.00 THB                     │ │
│ │    Trip ID: BOLT-12345678           │ │
│ │                                     │ │
│ │ ─────────────────────────────────   │ │
│ │                                     │ │
│ │ ⏳ Waiting for Chase statement       │ │
│ │                                     │ │
│ │    Expected: ~$4.59 USD             │ │
│ │    Date: Dec 18-19                  │ │
│ │                                     │ │
│ │    Will auto-match when             │ │
│ │    statement is uploaded            │ │
│ │                                     │ │
│ │ ─────────────────────────────────   │ │
│ │                                     │ │
│ │ [📎 Link Manually]                  │ │
│ │                                     │ │
│ │ [➕ Import as THB]                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ READY TO IMPORT                     │ │
│ │                                     │ │
│ │ 📧 Bangkok Bank Transfer            │ │
│ │    Dec 20, 2025                     │ │
│ │                                     │ │
│ │    ฿1,200.00 THB                   │ │
│ │    To: 7-Eleven (PromptPay)         │ │
│ │                                     │ │
│ │ ─────────────────────────────────   │ │
│ │                                     │ │
│ │ ✓ Ready to import                   │ │
│ │                                     │ │
│ │   Vendor: 7-Eleven                  │ │
│ │   Payment: Bangkok Bank             │ │
│ │   Amount: ฿1,200.00 THB            │ │
│ │                                     │ │
│ │ ─────────────────────────────────   │ │
│ │                                     │ │
│ │ [✓ Approve & Import]                │ │
│ │                                     │ │
│ │ [✏️ Edit]  [✗ Skip]                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Load more...                        │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘

SWIPE GESTURE (Right to Approve):

┌─────────────────────────────────────────┐
│                                         │
│    [Swiped card 60% to the right]      │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ✓✓✓ GrabFood Receipt      ═══════►  │ │
│ │     $10.00 USD                      │ │
│ │                                     │ │
│ │     [Green background revealed]     │ │
│ │                                     │ │
│ │     Release to approve              │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘

SWIPE GESTURE (Left to Reject):

┌─────────────────────────────────────────┐
│                                         │
│    [Swiped card 60% to the left]       │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │  ◄═══════  GrabFood Receipt   ✗✗✗  │ │
│ │               $10.00 USD            │ │
│ │                                     │ │
│ │     [Red background revealed]       │ │
│ │                                     │ │
│ │     Release to reject               │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Swipe Interaction:**
- Threshold: 60% of card width
- Haptic feedback at 50% and 100%
- Auto-complete if released past threshold
- Undo toast appears for 5 seconds
- Animate card out on confirm

---

### 3. Filter Bottom Sheet (Mobile)

```
┌─────────────────────────────────────────┐
│                                         │
│    [Backdrop - semi-transparent]        │
│                                         │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ━━━━━ ← Drag handle                 │ │
│ │                                     │ │
│ │ Filters                         [✕] │ │
│ │                                     │ │
│ │ Status                              │ │
│ │ ○ All (42)                          │ │
│ │ ● Pending Review (28)               │ │
│ │ ○ High Confidence (28)              │ │
│ │ ○ Medium Confidence (0)             │ │
│ │ ○ Waiting for Statement (6)         │ │
│ │ ○ Ready to Import (8)               │ │
│ │                                     │ │
│ │ Currency                            │ │
│ │ ● All                               │ │
│ │ ○ USD only                          │ │
│ │ ○ THB only                          │ │
│ │                                     │ │
│ │ Date Range                          │ │
│ │ [Last 30 Days ▼]                    │ │
│ │                                     │ │
│ │ ─────────────────────────────────   │ │
│ │                                     │ │
│ │ [Clear All]      [Apply Filters]    │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Bottom Sheet Behavior:**
- Opens from bottom with slide-up animation
- Backdrop tap to close
- Drag handle for swipe-down dismiss
- Fixed at 70% screen height
- Scrollable if content exceeds height

---

### 4. Email Detail Modal (Mobile - Full Screen)

```
┌─────────────────────────────────────────┐
│ ←  Email Details                     ✕  │
├─────────────────────────────────────────┤
│                                         │
│ From: no-reply@grab.com                 │
│ Date: Dec 15, 2025, 7:45 PM             │
│ Subject: Your Grab E-Receipt            │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Extracted Data                      │ │
│ │                                     │ │
│ │ Vendor                              │ │
│ │ [GrabFood                        ▼] │ │
│ │ ✓ Confidence: 95%                   │ │
│ │                                     │ │
│ │ Amount                              │ │
│ │ [340.00]  [THB ▼]                   │ │
│ │                                     │ │
│ │ Date                                │ │
│ │ [Dec 15, 2025                    ▼] │ │
│ │                                     │ │
│ │ Description                         │ │
│ │ [Dinner - KFC Sukhumvit          ]  │ │
│ │                                     │ │
│ │ Payment Method                      │ │
│ │ [Chase Sapphire Reserve          ▼] │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Email Preview            [Expand ▼] │ │
│ │                                     │ │
│ │ Thank you for your order!           │ │
│ │                                     │ │
│ │ Order Summary:                      │ │
│ │ - 2x Original Chicken   ฿120.00    │ │
│ │ - 1x Fries               ฿50.00    │ │
│ │ - 1x Coke                ฿30.00    │ │
│ │ - Delivery              ฿140.00    │ │
│ │                                     │ │
│ │ Total:                  ฿340.00    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Suggested Matches (3)               │ │
│ │                                     │ │
│ │ ● Grab* Bangkok TH                  │ │
│ │   $10.00 USD • Dec 15               │ │
│ │   87% match ✓                       │ │
│ │                                     │ │
│ │ ○ Grab* Bangkok TH                  │ │
│ │   $10.12 USD • Dec 15               │ │
│ │   82% match                         │ │
│ │                                     │ │
│ │ ○ Grab* Bangkok TH                  │ │
│ │   $9.85 USD • Dec 16                │ │
│ │   68% match                         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│                                         │
│ ─────────────────────────────────────── │
│ [Save Changes]         [Cancel]         │
└─────────────────────────────────────────┘
```

**Mobile Modal:**
- Full-screen overlay (100vh)
- Back button in header
- Sticky action buttons at bottom
- Scrollable content area
- Close X in top right

---

## Component Details

### Confidence Indicator Component

**Visual Representation:**

```
High Confidence (95%):
┌──────────────────────────────────────┐
│ Confidence: 95%  █████████▓  HIGH    │
│                  └─ Gradient bar     │
└──────────────────────────────────────┘
Colors: bg-green-500 → bg-green-600

Medium Confidence (72%):
┌──────────────────────────────────────┐
│ Confidence: 72%  ███████░░░  MEDIUM  │
└──────────────────────────────────────┘
Colors: bg-amber-500 → bg-amber-600

Low Confidence (45%):
┌──────────────────────────────────────┐
│ Confidence: 45%  ████░░░░░░  LOW     │
└──────────────────────────────────────┘
Colors: bg-red-500 → bg-red-600
```

**Implementation:**
```tsx
<div className="flex items-center gap-2">
  <span className="text-sm text-muted-foreground">
    Confidence: {score}%
  </span>
  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
    <div
      className={cn(
        "h-full rounded-full transition-all",
        score > 90 && "bg-gradient-to-r from-green-500 to-green-600",
        score > 55 && score <= 90 && "bg-gradient-to-r from-amber-500 to-amber-600",
        score <= 55 && "bg-gradient-to-r from-red-500 to-red-600"
      )}
      style={{ width: `${score}%` }}
    />
  </div>
  <Badge variant={
    score > 90 ? "success" : score > 55 ? "warning" : "destructive"
  }>
    {score > 90 ? "HIGH" : score > 55 ? "MEDIUM" : "LOW"}
  </Badge>
</div>
```

---

### Activity Feed Item Component

**Timeline Style:**

```
┌────────────────────────────────────────────────┐
│ ●──  Today, 10:15 AM                           │
│ │    ✓ Matched 12 Grab receipts to Chase       │
│ │      12 high-confidence matches               │
│ │      $142.50 USD total                        │
│ │                                               │
│ ●──  Today, 9:30 AM                            │
│ │    ⏳ 8 Bolt receipts waiting for statement   │
│ │      Expected: ~$35.20 USD                    │
│ │                                               │
│ ●──  Dec 30, 4:20 PM                           │
│      ✓ Imported 5 Bangkok Bank transfers       │
│        ฿6,450.00 THB                           │
│        Payment methods, groceries, utilities    │
└────────────────────────────────────────────────┘
```

**Color Coding:**
- Success (✓): Green dot and icon
- Waiting (⏳): Blue dot and icon
- Upload (📤): Purple dot and icon
- Error (✗): Red dot and icon

---

## Interaction Specifications

### 1. Batch Approve Flow (Desktop)

**Initial State:**
```
[✓ Approve All High-Confidence (38 items)]  ← Disabled until items loaded
```

**User Clicks:**
```
┌────────────────────────────────────────┐
│ Approve High-Confidence Matches?       │
│                                        │
│ You're about to import 38 transactions │
│ with >90% confidence match.            │
│                                        │
│ Total amount: $1,247.89 USD            │
│                                        │
│ First 5 transactions:                  │
│ • Grab* Bangkok TH - $10.00            │
│ • Grab* Bangkok TH - $12.50            │
│ • Lazada* Bangkok - $28.30             │
│ • Anthropic - $30.00                   │
│ • Grab* Bangkok TH - $8.20             │
│ ...and 33 more                         │
│                                        │
│ ─────────────────────────────────────  │
│                                        │
│ [Cancel]          [Approve All]        │
└────────────────────────────────────────┘
```

**Processing:**
```
┌────────────────────────────────────────┐
│ Importing Transactions...              │
│                                        │
│ Progress: 15 of 38                     │
│ [███████░░░░░░░░░░░░░]  39%            │
│                                        │
│ Please wait...                         │
└────────────────────────────────────────┘
```

**Success:**
```
┌────────────────────────────────────────┐
│ ✓ Import Successful                    │
│                                        │
│ 38 transactions imported               │
│ Total: $1,247.89 USD                   │
│                                        │
│ [View Transactions]  [Done]            │
└────────────────────────────────────────┘
```

---

### 2. Manual Link Flow

**Step 1: User clicks "Link to Different Transaction"**
```
┌─────────────────────────────────────────────────────┐
│ Find Transaction to Link                        ✕  │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Search                                          │ │
│ │ [🔍 Search by vendor, amount, description...]   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Date Range (auto-populated ±7 days from receipt)   │
│ [Dec 8, 2025]  to  [Dec 22, 2025]                  │
│                                                     │
│ Filters:                                            │
│ Vendor: [All ▼]  Payment Method: [Chase ▼]         │
│ Amount Range: [$5.00] to [$15.00]                  │
│                                                     │
│ ───────────────────────────────────────────────────  │
│                                                     │
│ Results (12 transactions):                          │
│                                                     │
│ ○ Grab* Bangkok TH                                  │
│   $10.00 USD • Dec 15, 2025                        │
│   Chase Sapphire Reserve                           │
│   87% suggested match ✓                            │
│                                                     │
│ ○ Grab* Bangkok TH                                  │
│   $10.12 USD • Dec 15, 2025                        │
│   Chase Sapphire Reserve                           │
│   82% suggested match                              │
│                                                     │
│ ○ Food & Dining                                     │
│   $11.50 USD • Dec 14, 2025                        │
│   Chase Sapphire Reserve                           │
│   42% possible match                               │
│                                                     │
│ [...9 more results]                                 │
│                                                     │
│ ───────────────────────────────────────────────────  │
│                                                     │
│ [Cancel]                    [Link Selected]         │
└─────────────────────────────────────────────────────┘
```

**Step 2: User selects a transaction and clicks "Link Selected"**
```
┌─────────────────────────────────────────┐
│ Confirm Link                            │
│                                         │
│ Link this email:                        │
│ GrabFood Receipt (฿340.00 THB)        │
│ Dec 15, 2025                            │
│                                         │
│ To this transaction:                    │
│ Grab* Bangkok TH ($10.00 USD)          │
│ Dec 15, 2025                            │
│ Chase Sapphire Reserve                  │
│                                         │
│ ──────────────────────────────────────  │
│                                         │
│ [Cancel]            [Confirm Link]      │
└─────────────────────────────────────────┘
```

**Step 3: Success**
```
Toast notification (top-right):
┌───────────────────────────────────┐
│ ✓ Email linked successfully       │
│   GrabFood → Grab* Bangkok TH     │
└───────────────────────────────────┘
(Auto-dismiss after 3 seconds)

Card updates to show "Matched" status
```

---

### 3. Error States

**Upload Error:**
```
┌──────────────────────────────────────────┐
│ Upload File                              │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │           ✗                        │  │
│  │                                    │  │
│  │   Upload failed                    │  │
│  │                                    │  │
│  │   amex-dec-2025.pdf exceeds        │  │
│  │   the 10MB file size limit.        │  │
│  │                                    │  │
│  │   Please compress or split the     │  │
│  │   file and try again.              │  │
│  │                                    │  │
│  │   [Try Again]                      │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
Border: border-red-500
Background: bg-red-50
```

**Processing Error:**
```
┌──────────────────────────────────────────┐
│ Processing Failed                        │
│                                          │
│ ✗ Couldn't extract transactions from     │
│   the uploaded file.                     │
│                                          │
│ This may happen if:                      │
│ • The file is corrupted                  │
│ • The file format is unsupported         │
│ • The file doesn't contain a statement   │
│                                          │
│ ──────────────────────────────────────── │
│                                          │
│ [Try Different File]  [Contact Support]  │
└──────────────────────────────────────────┘
```

**Email Sync Error:**
```
Alert banner at top of page:
┌────────────────────────────────────────────────────┐
│ ⚠️  Email sync failed                              │
│    Couldn't connect to iCloud. Please check your  │
│    email settings and try again.                  │
│                        [Go to Settings]  [Dismiss] │
└────────────────────────────────────────────────────┘
Background: bg-amber-50
Border: border-amber-200
```

---

## Summary

This wireframe document provides:

1. **Desktop layouts** for all 5 main pages with exact spacing and component placement
2. **Mobile adaptations** showing responsive changes and touch interactions
3. **Component specifications** with visual examples and implementation notes
4. **Interaction flows** with step-by-step UI states

### Implementation Priority

**Phase 1 (Foundation):**
- Import Dashboard (desktop + mobile)
- Email sync integration
- Basic card components

**Phase 2 (Core Features):**
- Review Queue with match cards
- Statement Upload with processing
- Approve/Reject flows

**Phase 3 (Polish):**
- Mobile swipe gestures
- Bottom sheets and modals
- Error handling and loading states

**Phase 4 (Advanced):**
- Manual linking
- Import history
- Batch operations

All wireframes follow existing Joot design patterns using shadcn/ui components and Tailwind CSS utilities.
