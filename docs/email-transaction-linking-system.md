# Email-to-Transaction Linking System - Design Specification

**Project:** Joot Transaction Tracker
**Feature:** Email Receipt Import & Statement Matching
**Date:** 2025-12-31
**Version:** 1.0
**Status:** Implemented — Historical Reference (see [STATUS.md](./STATUS.md) for current state)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [User Flow Diagram](#user-flow-diagram)
3. [Information Architecture](#information-architecture)
4. [Page Specifications](#page-specifications)
5. [Component Library](#component-library)
6. [Mobile Adaptations](#mobile-adaptations)
7. [Interaction Patterns](#interaction-patterns)
8. [Database Schema Extensions](#database-schema-extensions)
9. [Implementation Notes](#implementation-notes)

---

## Executive Summary

### The Problem
Currently, the user processes ~200 emails/month manually via CLI:
- Receipt emails (Grab, Bolt, Lazada) in THB
- Credit card statements (Chase, Amex) in USD
- Bank statements (Bangkok Bank, Kasikorn) in THB
- Cross-currency matching is manual and error-prone

### The Solution
An in-app workflow that:
1. Auto-syncs receipt emails from iCloud "Transactions" folder
2. Extracts transaction data using existing patterns
3. Matches THB receipts to USD credit card charges
4. Presents matches for user review and approval
5. Creates transactions in bulk with full audit trail

### Core User Journey
```
Email Sync (Auto) → Statement Upload (Manual) → Review Queue → Approve/Reject → Import
```

---

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        IMPORT DASHBOARD                             │
│                        /imports                                     │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  Pending Review │  │ Waiting for Stmt│  │  Recently Matched│    │
│  │      42         │  │       18        │  │       156        │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                     │
│  Last sync: 2 hours ago           [Sync Now] [Upload Statement]    │
│                                                                     │
│  Recent Activity:                                                   │
│  ✓ Matched 12 Grab receipts to Chase charges                      │
│  ⏳ 8 Bolt receipts waiting for statement                          │
│  ✓ Imported 5 bank transfers                                      │
│                                                                     │
└──────────┬────────────────────────────────────────┬───────────────┘
           │                                        │
           │                                        │
    [Review Queue]                         [Upload Statement]
           │                                        │
           ↓                                        ↓
┌──────────────────────────┐           ┌──────────────────────────┐
│   REVIEW QUEUE           │           │  STATEMENT UPLOAD        │
│   /imports/review        │           │  /imports/statements     │
│                          │           │                          │
│ Filter: [All ▼] Search   │           │ Statement Type:          │
│                          │           │ ○ Chase Sapphire Reserve │
│ ┌────────────────────┐   │           │ ○ American Express       │
│ │ 📧 GrabFood Receipt│   │           │ ○ Bangkok Bank          │
│ │ ฿340.00 THB       │   │           │ ○ Kasikorn Bank         │
│ │ Dec 15, 2025      │   │           │                          │
│ ├──────────────────  │   │           │ [Drag & Drop PDF/Image] │
│ │ 🔗 Matched 87%    │   │           │                          │
│ │ Grab* Bangkok TH  │   │           │ ┌────────────────────┐  │
│ │ $10.00 USD Dec 15 │   │           │ │ Processing...       │  │
│ │ Chase Sapphire    │   │           │ │ Extracted 45 trans  │  │
│ │                   │   │           │ │ Found 38 matches    │  │
│ │ [✓ Approve]       │   │           │ └────────────────────┘  │
│ │ [✗ Reject]        │   │           │                          │
│ │ [🔗 Link Other]   │   │           │ [Review Matches]         │
│ └────────────────────┘   │           │                          │
│                          │           └──────────────────────────┘
│ ┌────────────────────┐   │                      │
│ │ 📧 Bolt Ride      │   │                      │
│ │ ฿156.00 THB       │   │                      ↓
│ │ Dec 18, 2025      │   │           ┌──────────────────────────┐
│ ├──────────────────  │   │           │  MATCH REVIEW            │
│ │ ⏳ Waiting for Stmt│   │           │                          │
│ │ Expected ~$4.59   │   │           │ 38 high-confidence ✓     │
│ │                   │   │           │ 7 need review            │
│ │ [📎 Link Manually]│   │           │                          │
│ │ [➕ Import as THB]│   │           │ [Approve All High]       │
│ └────────────────────┘   │           │ [Review Individually]    │
│                          │           └──────────────────────────┘
│ Batch Actions:           │
│ [✓ Approve All High]     │
│ [Export Report]          │
└──────────────────────────┘
```

---

## Information Architecture

### Navigation Structure

```
Main App
├── Home (/home)
├── All Transactions (/transactions)
├── Imports (/imports) ← NEW
│   ├── Dashboard (/imports)
│   ├── Review Queue (/imports/review)
│   ├── Statement Upload (/imports/statements)
│   └── History (/imports/history)
└── Settings (/settings)
    ├── Payment Methods
    ├── Vendors
    ├── Tags
    └── Emails (/settings/emails) ← EXISTING
```

### Navigation Integration

**Desktop Sidebar (240px):**
```
┌─────────────────────┐
│ 🏠 Home             │
│ 🧾 All Transactions │
│ 📥 Imports          │  ← Add here
│ ⚙️  Settings         │
│                     │
│ ─────────────────── │
│ 👤 User Profile     │
└─────────────────────┘
```

**Mobile/Tablet Top Nav:**
```
[Home] [Transactions] [Imports] [Settings]
                        ↑
                      NEW TAB
```

---

## Page Specifications

### 1. Import Dashboard (`/imports`)

**Purpose:** Central hub for all import activities - status overview and quick actions

**Layout Structure:**
```
┌────────────────────────────────────────────────────────────────┐
│ [Sidebar]  │  Imports                              [User Menu] │
│            │                                                    │
│            │  ┌──────────────────────────────────────────────┐ │
│            │  │ 📊 Import Status                             │ │
│            │  │                                              │ │
│            │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │ │
│            │  │  │ Pending  │  │ Waiting  │  │ Matched  │   │ │
│            │  │  │ Review   │  │ for Stmt │  │ (30d)    │   │ │
│            │  │  │   42     │  │    18    │  │   156    │   │ │
│            │  │  └──────────┘  └──────────┘  └──────────┘   │ │
│            │  └──────────────────────────────────────────────┘ │
│            │                                                    │
│            │  ┌──────────────────────────────────────────────┐ │
│            │  │ 📧 Email Sync                                │ │
│            │  │                                              │ │
│            │  │ Last synced: 2 hours ago (Dec 31, 10:00 AM) │ │
│            │  │ Folder: Transactions                         │ │
│            │  │ Total synced: 1,247 emails                   │ │
│            │  │                                              │ │
│            │  │                         [🔄 Sync Now]        │ │
│            │  └──────────────────────────────────────────────┘ │
│            │                                                    │
│            │  ┌──────────────────────────────────────────────┐ │
│            │  │ 🎯 Quick Actions                             │ │
│            │  │                                              │ │
│            │  │  [📤 Upload Statement]  [🔍 Review Queue]    │ │
│            │  │  [📊 View History]      [⚙️  Settings]       │ │
│            │  └──────────────────────────────────────────────┘ │
│            │                                                    │
│            │  ┌──────────────────────────────────────────────┐ │
│            │  │ 📜 Recent Activity                           │ │
│            │  │                                              │ │
│            │  │ Today, 10:15 AM                              │ │
│            │  │ ✓ Matched 12 Grab receipts to Chase charges  │ │
│            │  │                                              │ │
│            │  │ Today, 9:30 AM                               │ │
│            │  │ ⏳ 8 Bolt receipts waiting for statement      │ │
│            │  │                                              │ │
│            │  │ Dec 30, 4:20 PM                              │ │
│            │  │ ✓ Imported 5 Bangkok Bank transfers          │ │
│            │  │                                              │ │
│            │  │ Dec 30, 11:45 AM                             │ │
│            │  │ 📤 Processed Chase December statement        │ │
│            │  │   38 matches found, 7 new transactions       │ │
│            │  │                                              │ │
│            │  │                      [View All History →]    │ │
│            │  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

**Component Breakdown:**

1. **Status Cards (Grid: 3 columns on desktop, 1 on mobile)**
   - Card component: shadcn/ui Card
   - Icon + Large number + Label
   - Clickable → navigates to filtered view
   - Colors:
     - Pending Review: Amber/Yellow accent
     - Waiting for Statement: Blue accent
     - Recently Matched: Green accent

2. **Email Sync Card**
   - Shows sync status with timestamp
   - "Sync Now" button with loading state (spinner icon when active)
   - Visual indicator: Green dot if synced < 1 hour, Yellow if 1-6 hours, Gray if > 6 hours
   - Compact stats: folder name, total count

3. **Quick Actions Grid (2x2)**
   - Large touch-friendly buttons
   - Icon + Label
   - Primary CTA: "Upload Statement" (primary button style)
   - Secondary: Others (outline style)

4. **Recent Activity Feed**
   - Timeline-style list (chronological, newest first)
   - Icon indicators:
     - ✓ (green) = Success/Matched
     - ⏳ (blue) = Waiting/Pending
     - 📤 (purple) = Upload/Process
     - ✗ (red) = Error/Rejected
   - Timestamp in relative format ("2 hours ago", "Today, 10:15 AM")
   - Limited to 5 most recent items
   - "View All History" link → `/imports/history`

**Visual Design:**
- Background: `bg-background` (white)
- Card spacing: `gap-6`
- Card padding: `p-6`
- Typography:
  - Page title: `text-[36px] font-medium`
  - Card titles: `text-lg font-semibold`
  - Stats numbers: `text-3xl font-bold`
  - Body text: `text-sm text-muted-foreground`

**States:**
- Loading: Show skeleton cards
- Empty state: "No recent activity" with illustration
- Error state: Alert banner at top with retry option

---

### 2. Review Queue (`/imports/review`)

**Purpose:** Review and approve transaction matches before importing

**Layout Structure:**
```
┌────────────────────────────────────────────────────────────────┐
│ [Sidebar]  │  Review Queue                         [User Menu] │
│            │                                                    │
│            │  ┌──────────────────────────────────────────────┐ │
│            │  │ Filters & Search                             │ │
│            │  │                                              │ │
│            │  │ [All ▼] [Status ▼] [Currency ▼]  [🔍 Search]│ │
│            │  │                                              │ │
│            │  │ 42 items • [✓ Approve All High-Confidence]  │ │
│            │  └──────────────────────────────────────────────┘ │
│            │                                                    │
│            │  ┌──────────────────────────────────────────────┐ │
│            │  │ MATCHED - HIGH CONFIDENCE (87%)              │ │
│            │  │                                              │ │
│            │  │ 📧 GrabFood Receipt         Dec 15, 2025     │ │
│            │  │    no-reply@grab.com                         │ │
│            │  │    ฿340.00 THB                              │ │
│            │  │    Order #GF-20251215-XYABC                  │ │
│            │  │                                              │ │
│            │  │ ──────────────────────────────────────────── │ │
│            │  │                                              │ │
│            │  │ 🔗 Matched to: Chase Sapphire Reserve        │ │
│            │  │    Grab* Bangkok TH                          │ │
│            │  │    $10.00 USD • Dec 15, 2025                │ │
│            │  │    Exchange rate: 1 USD = 34.00 THB          │ │
│            │  │                                              │ │
│            │  │    Confidence: 87% ████████░░ HIGH           │ │
│            │  │    ✓ Amount match (±2%)                      │ │
│            │  │    ✓ Date match (same day)                   │ │
│            │  │    ✓ Vendor match (Grab → Grab*)            │ │
│            │  │                                              │ │
│            │  │ ──────────────────────────────────────────── │ │
│            │  │                                              │ │
│            │  │ [✓ Approve] [✗ Reject] [🔗 Link Other] [⋯]  │ │
│            │  └──────────────────────────────────────────────┘ │
│            │                                                    │
│            │  ┌──────────────────────────────────────────────┐ │
│            │  │ WAITING FOR STATEMENT                        │ │
│            │  │                                              │ │
│            │  │ 📧 Bolt Ride Receipt        Dec 18, 2025     │ │
│            │  │    bangkok@bolt.eu                           │ │
│            │  │    ฿156.00 THB                              │ │
│            │  │    Trip ID: BOLT-12345678                    │ │
│            │  │                                              │ │
│            │  │ ──────────────────────────────────────────── │ │
│            │  │                                              │ │
│            │  │ ⏳ Waiting for Chase statement                │ │
│            │  │    Expected charge: ~$4.59 USD               │ │
│            │  │    Expected date: Dec 18-19, 2025            │ │
│            │  │                                              │ │
│            │  │    This receipt will auto-match when the     │ │
│            │  │    December statement is uploaded.           │ │
│            │  │                                              │ │
│            │  │ ──────────────────────────────────────────── │ │
│            │  │                                              │ │
│            │  │ [📎 Link Manually] [➕ Import as THB] [⋯]    │ │
│            │  └──────────────────────────────────────────────┘ │
│            │                                                    │
│            │  ┌──────────────────────────────────────────────┐ │
│            │  │ READY TO IMPORT                              │ │
│            │  │                                              │ │
│            │  │ 📧 Bangkok Bank Transfer    Dec 20, 2025     │ │
│            │  │    BualuangmBanking@bangkokbank.com          │ │
│            │  │    ฿1,200.00 THB                            │ │
│            │  │    To: 7-Eleven (PromptPay)                  │ │
│            │  │                                              │ │
│            │  │ ──────────────────────────────────────────── │ │
│            │  │                                              │ │
│            │  │ ✓ Ready to import as new transaction         │ │
│            │  │   No matching DB record found                │ │
│            │  │                                              │ │
│            │  │   Vendor: 7-Eleven                           │ │
│            │  │   Payment Method: Bangkok Bank (Bualuang)    │ │
│            │  │   Amount: ฿1,200.00 THB                     │ │
│            │  │                                              │ │
│            │  │ ──────────────────────────────────────────── │ │
│            │  │                                              │ │
│            │  │ [✓ Approve & Import] [✏️ Edit Details] [⋯]  │ │
│            │  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

**Component Breakdown:**

1. **Filter Bar**
   - Status dropdown: All, Pending Review, High Confidence, Waiting for Statement, Ready to Import
   - Currency filter: All, USD, THB
   - Search input: Full-text search across vendor, description, email subject
   - Batch action button: "Approve All High-Confidence" (only visible when high-confidence items exist)

2. **Match Card - High Confidence (>90%)**
   - **Top Section (Email):**
     - Email icon (blue)
     - Subject line (bold)
     - From address (small, gray)
     - Amount + Currency (large, primary color based on currency)
     - Transaction ID / Order number (small, monospace)

   - **Divider line**

   - **Middle Section (Match Details):**
     - Link icon + "Matched to:" label
     - Payment method name
     - Vendor/merchant description
     - Amount in target currency + Date
     - Exchange rate (if cross-currency)
     - Confidence bar with percentage
     - Match reason bullets (checkmarks for positive signals)

   - **Divider line**

   - **Action Bar:**
     - Primary: "Approve" (green button)
     - Secondary: "Reject" (outline, red text)
     - Tertiary: "Link Other" (outline)
     - More menu (⋯) → View Email, Report Issue, Skip

3. **Match Card - Waiting for Statement**
   - **Top Section:** Same as high-confidence
   - **Middle Section:**
     - Clock icon + "Waiting for statement" label
     - Expected charge calculation
     - Expected date range (posting date variance)
     - Helpful message explaining auto-matching

   - **Action Bar:**
     - "Link Manually" → Opens search dialog for existing transactions
     - "Import as THB" → Creates transaction in original currency
     - More menu

4. **Match Card - Ready to Import**
   - **Top Section:** Same as others
   - **Middle Section:**
     - Checkmark + "Ready to import" label
     - Extracted transaction details:
       - Vendor (with confidence if auto-detected)
       - Payment method
       - Amount
       - Suggested description (if applicable)

   - **Action Bar:**
     - Primary: "Approve & Import" (green)
     - Secondary: "Edit Details" → Opens inline edit form
     - More menu

**Visual Design:**
- Card background: White with border
- Divider lines: `border-t border-border`
- Section spacing: `space-y-3`
- Confidence bar colors:
  - High (>90%): Green
  - Medium (55-90%): Amber
  - Low (<55%): Red
- Amount display: Currency-specific color
  - USD: Blue
  - THB: Purple
  - Others: Gray

**Interaction States:**
- Hover: Subtle shadow elevation
- Loading (during action): Disable buttons, show spinner
- Success: Green flash animation, auto-remove from list
- Error: Red border, show error message inline

**Infinite Scroll:**
- Load 20 items initially
- Load 20 more when scrolled to 400px from bottom
- Show loading skeleton at bottom while fetching

---

### 3. Statement Upload (`/imports/statements`)

**Purpose:** Upload credit card/bank statements and process matches

**Layout Structure:**
```
┌────────────────────────────────────────────────────────────────┐
│ [Sidebar]  │  Upload Statement                     [User Menu] │
│            │                                                    │
│            │  ┌──────────────────────────────────────────────┐ │
│            │  │ Statement Type                               │ │
│            │  │                                              │ │
│            │  │ ○ Chase Sapphire Reserve (USD)               │ │
│            │  │ ○ American Express (USD)                     │ │
│            │  │ ○ Bangkok Bank (Bualuang) (THB)             │ │
│            │  │ ○ Kasikorn Bank (K PLUS) (THB)              │ │
│            │  └──────────────────────────────────────────────┘ │
│            │                                                    │
│            │  ┌──────────────────────────────────────────────┐ │
│            │  │ Upload File                                  │ │
│            │  │                                              │ │
│            │  │  ┌────────────────────────────────────────┐  │ │
│            │  │  │                                        │  │ │
│            │  │  │          📄                            │  │ │
│            │  │  │                                        │  │ │
│            │  │  │   Drag & drop statement here           │  │ │
│            │  │  │   or click to browse                   │  │ │
│            │  │  │                                        │  │ │
│            │  │  │   Accepts: PDF, PNG, JPG, HEIC         │  │ │
│            │  │  │                                        │  │ │
│            │  │  └────────────────────────────────────────┘  │ │
│            │  └──────────────────────────────────────────────┘ │
│            │                                                    │
│            │  ┌──────────────────────────────────────────────┐ │
│            │  │ Processing Status                            │ │
│            │  │                                              │ │
│            │  │ ✓ File uploaded (chase-dec-2025.pdf)         │ │
│            │  │ ⏳ Extracting transactions... 80%             │ │
│            │  │   [████████░░] 36 of 45 processed            │ │
│            │  │                                              │ │
│            │  │ Next: Cross-referencing with emails...       │ │
│            │  └──────────────────────────────────────────────┘ │
│            │                                                    │
│            │  ┌──────────────────────────────────────────────┐ │
│            │  │ Extraction Results                           │ │
│            │  │                                              │ │
│            │  │ Chase Sapphire Reserve - December 2025       │ │
│            │  │ Statement Period: Nov 19 - Dec 18, 2025      │ │
│            │  │                                              │ │
│            │  │ ──────────────────────────────────────────── │ │
│            │  │                                              │ │
│            │  │ 📊 Summary                                   │ │
│            │  │                                              │ │
│            │  │  45 transactions extracted                   │ │
│            │  │  38 matched to receipt emails (84%)          │ │
│            │  │   7 new (no matching receipt)                │ │
│            │  │                                              │ │
│            │  │  Total charges: $1,247.89                    │ │
│            │  │  Total credits: $94.91                       │ │
│            │  │                                              │ │
│            │  │ ──────────────────────────────────────────── │ │
│            │  │                                              │ │
│            │  │ 🎯 Match Quality                             │ │
│            │  │                                              │ │
│            │  │  ████████░░  38 High-confidence (>90%)       │ │
│            │  │  ░░░░░░░░░░   0 Need review (55-90%)         │ │
│            │  │  ░░░░░░░░░░   0 Low match (<55%)             │ │
│            │  │  ░░░░░░░░░░   7 No match found               │ │
│            │  │                                              │ │
│            │  │ ──────────────────────────────────────────── │ │
│            │  │                                              │ │
│            │  │ [🔍 Review Matches]  [💾 Download Report]    │ │
│            │  │ [✓ Approve All High] [✏️ Review Individually]│ │
│            │  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

**Component Breakdown:**

1. **Statement Type Selector**
   - Radio button group (shadcn/ui RadioGroup)
   - Each option shows:
     - Payment method name
     - Currency indicator (USD/THB badge)
   - Required before upload enabled

2. **File Upload Zone**
   - Drag-and-drop area (use react-dropzone or similar)
   - Visual states:
     - Default: Dashed border, upload icon, helper text
     - Drag over: Solid blue border, "Drop file here" message
     - Processing: Solid border, loading spinner
     - Success: Green checkmark, filename
     - Error: Red border, error message
   - Accepted formats listed below
   - Max file size: 10MB (display in helper text)

3. **Processing Status (Progressive)**
   - Multi-step progress indicator
   - Steps:
     1. Upload file
     2. Extract transactions
     3. Cross-reference with emails
     4. Calculate match scores
   - Current step highlighted with progress bar
   - Estimated time remaining (if possible)

4. **Extraction Results Card**
   - **Header:**
     - Statement identifier (auto-detected or manual entry)
     - Statement period (from/to dates)

   - **Summary Stats:**
     - Total transactions extracted
     - Match rate percentage (with color coding)
     - Total charges/credits

   - **Match Quality Breakdown:**
     - Visual bars showing distribution
     - Color-coded by confidence:
       - Green: High (>90%)
       - Amber: Medium (55-90%)
       - Red: Low (<55%)
       - Gray: No match

   - **Action Buttons:**
     - Primary: "Review Matches" → Navigate to `/imports/review` with filter
     - Secondary: "Approve All High" → Batch approve >90% matches
     - Tertiary: "Review Individually" → Same as primary but opens first item
     - Utility: "Download Report" → Export CSV with all matches/non-matches

**Visual Design:**
- Upload zone: Dashed border, `border-2 border-dashed`
- Drag-over state: `border-blue-500 bg-blue-50`
- Progress bar: shadcn/ui Progress component
- Stats: Large numbers (`text-3xl font-bold`) with small labels

**Error Handling:**
- Invalid file type: Red banner, "Please upload PDF, PNG, JPG, or HEIC"
- File too large: "File exceeds 10MB limit"
- Processing error: Show error details, offer retry
- No transactions found: "No transactions detected. Please verify file is a valid statement."

---

### 4. Email Detail Modal

**Purpose:** View full email content and adjust extracted data

**Layout Structure:**
```
┌──────────────────────────────────────────────────────────┐
│  Email Details                                      [✕]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Email Header                                       │  │
│  │                                                    │  │
│  │ From: no-reply@grab.com (GrabFood)                │  │
│  │ Subject: Your Grab E-Receipt                      │  │
│  │ Date: Dec 15, 2025, 7:45 PM                       │  │
│  │ To: user@icloud.com                               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Extracted Data                  [Edit Mode Toggle]│  │
│  │                                                    │  │
│  │ Vendor: GrabFood                 ✓ Confidence: 95%│  │
│  │ [GrabFood                                       ▼] │  │
│  │                                                    │  │
│  │ Amount: ฿340.00                                   │  │
│  │ [340.00] [THB ▼]                                  │  │
│  │                                                    │  │
│  │ Transaction Date: Dec 15, 2025                    │  │
│  │ [Dec 15, 2025                                   ▼] │  │
│  │                                                    │  │
│  │ Description: Dinner - KFC Sukhumvit              │  │
│  │ [Dinner - KFC Sukhumvit                          ] │  │
│  │                                                    │  │
│  │ Payment Method: (Auto-detect from match)          │  │
│  │ [Chase Sapphire Reserve                         ▼] │  │
│  │                                                    │  │
│  │ Order ID: GF-20251215-XYABC                       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Email Body (Preview)               [View Full ↗]  │  │
│  │                                                    │  │
│  │ ───────────────────────────────────────────────    │  │
│  │                                                    │  │
│  │ Thank you for your order!                         │  │
│  │                                                    │  │
│  │ Order Summary:                                    │  │
│  │ - 2x Original Recipe Chicken      ฿120.00        │  │
│  │ - 1x French Fries                  ฿50.00        │  │
│  │ - 1x Coke                          ฿30.00        │  │
│  │ - Delivery fee                    ฿140.00        │  │
│  │                                                    │  │
│  │ Total:                            ฿340.00        │  │
│  │                                                    │  │
│  │ Delivered to: 123 Sukhumvit Rd...                │  │
│  │                                                    │  │
│  │ ───────────────────────────────────────────────    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Suggested Matches (3)                              │  │
│  │                                                    │  │
│  │ ○ Grab* Bangkok TH - $10.00 USD (Dec 15) 87% ✓   │  │
│  │ ○ Grab* Bangkok TH - $10.12 USD (Dec 15) 82%     │  │
│  │ ○ Grab* Bangkok TH - $9.85 USD (Dec 16)  68%     │  │
│  │                                                    │  │
│  │ [Link to Different Transaction]                   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │            [Save Changes]  [Cancel]                │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Component Breakdown:**

1. **Email Header Section** (Read-only)
   - Metadata display
   - From/To/Subject/Date
   - Small, muted text

2. **Extracted Data Form**
   - Toggle between view/edit mode
   - All fields editable when in edit mode:
     - Vendor: Dropdown (searchable, from DB vendors)
     - Amount: Number input + Currency selector
     - Date: Date picker
     - Description: Text input
     - Payment Method: Dropdown (from DB payment methods)
   - Confidence indicators next to auto-detected fields
   - Validation: Required fields, amount > 0

3. **Email Body Preview**
   - Scrollable area, max height 300px
   - Rendered HTML (sanitized)
   - "View Full" button → Opens email in new modal or expands

4. **Suggested Matches**
   - Radio button list of potential matches
   - Each shows:
     - Transaction description
     - Amount + Currency
     - Date
     - Confidence percentage
     - Visual indicator (checkmark for high confidence)
   - Selected match highlighted
   - "Link to Different Transaction" → Opens transaction search

5. **Action Buttons**
   - Primary: "Save Changes" (if edit mode enabled)
   - Secondary: "Cancel" (closes modal, discards changes)

**Visual Design:**
- Modal width: 800px (max-w-3xl)
- Modal height: 90vh (scrollable)
- Section spacing: gap-6
- Form fields: shadcn/ui form components

---

### 5. Import History (`/imports/history`)

**Purpose:** Audit trail of all imports and processing

**Layout Structure:**
```
┌────────────────────────────────────────────────────────────────┐
│ [Sidebar]  │  Import History                       [User Menu] │
│            │                                                    │
│            │  ┌──────────────────────────────────────────────┐ │
│            │  │ Filters                                      │ │
│            │  │                                              │ │
│            │  │ Date Range: [Last 30 Days ▼]   Source: [All▼]│ │
│            │  │ Status: [All ▼]                 [🔍 Search]  │ │
│            │  └──────────────────────────────────────────────┘ │
│            │                                                    │
│            │  ┌──────────────────────────────────────────────┐ │
│            │  │ Dec 30, 2025 - 4:20 PM                       │ │
│            │  │ 📤 Statement Upload: Chase Sapphire Reserve   │ │
│            │  │                                              │ │
│            │  │ 45 transactions processed                    │ │
│            │  │ 38 matched (84%)                             │ │
│            │  │  7 imported as new                           │ │
│            │  │                                              │ │
│            │  │ [View Details] [Download Report]             │ │
│            │  └──────────────────────────────────────────────┘ │
│            │                                                    │
│            │  ┌──────────────────────────────────────────────┐ │
│            │  │ Dec 30, 2025 - 10:00 AM                      │ │
│            │  │ 🔄 Email Sync                                │ │
│            │  │                                              │ │
│            │  │ 24 emails synced                             │ │
│            │  │ 18 pending review                            │ │
│            │  │  6 auto-matched                              │ │
│            │  │                                              │ │
│            │  │ [View Queue]                                 │ │
│            │  └──────────────────────────────────────────────┘ │
│            │                                                    │
│            │  ┌──────────────────────────────────────────────┐ │
│            │  │ Dec 28, 2025 - 3:15 PM                       │ │
│            │  │ ✓ Bulk Approval                              │ │
│            │  │                                              │ │
│            │  │ 15 transactions approved and imported        │ │
│            │  │ Total value: $456.78 USD                     │ │
│            │  │                                              │ │
│            │  │ [View Transactions]                          │ │
│            │  └──────────────────────────────────────────────┘ │
│            │                                                    │
│            │  [Load More History]                             │
└────────────────────────────────────────────────────────────────┘
```

**Component Breakdown:**

1. **Filter Bar**
   - Date range dropdown: Last 7 days, 30 days, 90 days, Custom
   - Source filter: All, Email Sync, Statement Upload, Manual
   - Status filter: All, Success, Partial, Failed
   - Search: Filter by vendor, amount, description

2. **History Item Card**
   - **Header:**
     - Timestamp
     - Action type icon + label
   - **Stats:**
     - Key metrics (count, match rate, totals)
   - **Actions:**
     - Context-specific: View Details, Download Report, View Queue, View Transactions

**Visual Design:**
- Chronological list (newest first)
- Card with subtle left border (colored by action type)
- Expandable details on click
- Infinite scroll pagination

---

## Component Library

### New Components to Create

#### 1. `MatchCard` Component

**Location:** `/src/components/page-specific/match-card.tsx`

**Props:**
```typescript
interface MatchCardProps {
  email: EmailTransaction
  match?: Transaction | null
  matchConfidence?: number
  status: 'matched' | 'waiting' | 'ready' | 'pending_review'
  onApprove: (emailId: string) => void
  onReject: (emailId: string) => void
  onLinkOther: (emailId: string) => void
  onEditDetails: (emailId: string) => void
  onViewEmail: (emailId: string) => void
}
```

**Features:**
- Responsive layout (card on mobile, list-item on desktop)
- Collapsible details section
- Action button states (loading, disabled)
- Confidence visual indicator
- Currency-aware amount display

#### 2. `StatementUploadZone` Component

**Location:** `/src/components/page-specific/statement-upload-zone.tsx`

**Props:**
```typescript
interface StatementUploadZoneProps {
  paymentMethodId: string
  onUploadComplete: (result: UploadResult) => void
  onError: (error: Error) => void
  acceptedFileTypes?: string[]
  maxFileSize?: number
}
```

**Features:**
- Drag-and-drop with visual feedback
- File type validation
- Progress indicator
- Preview uploaded file
- Error state handling

#### 3. `ImportStatusCard` Component

**Location:** `/src/components/page-specific/import-status-card.tsx`

**Props:**
```typescript
interface ImportStatusCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  variant: 'pending' | 'waiting' | 'success' | 'info'
  onClick?: () => void
}
```

**Features:**
- Color-coded by variant
- Hover state (if clickable)
- Loading skeleton state
- Responsive sizing

#### 4. `ConfidenceIndicator` Component

**Location:** `/src/components/ui/confidence-indicator.tsx`

**Props:**
```typescript
interface ConfidenceIndicatorProps {
  score: number // 0-100
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}
```

**Features:**
- Progress bar visual
- Color gradient (red → amber → green)
- Percentage label
- Semantic labeling (Low/Medium/High)

#### 5. `ActivityFeedItem` Component

**Location:** `/src/components/page-specific/activity-feed-item.tsx`

**Props:**
```typescript
interface ActivityFeedItemProps {
  timestamp: string
  activityType: 'sync' | 'upload' | 'match' | 'import' | 'error'
  description: string
  metadata?: Record<string, any>
  onViewDetails?: () => void
}
```

**Features:**
- Icon based on activity type
- Relative timestamp
- Expandable metadata
- Optional action link

---

### Existing Components to Reuse

1. **shadcn/ui Components:**
   - `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
   - `Button` (all variants)
   - `Badge`
   - `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`
   - `RadioGroup`, `RadioGroupItem`
   - `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`
   - `Input`
   - `Progress`
   - `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
   - `Separator`

2. **Page-specific Components:**
   - `SidebarNavigation` (add "Imports" item)
   - `MainNavigation` (add "Imports" tab)
   - `TransactionForm` (for editing extracted data)

---

## Mobile Adaptations

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Key Mobile Changes

#### 1. Import Dashboard
- **Mobile:**
  - Status cards stack vertically (1 column)
  - Quick actions grid 1x4 (vertical)
  - Recent activity shows 3 items (instead of 5)
  - Compact spacing (gap-4 instead of gap-6)

#### 2. Review Queue
- **Mobile:**
  - Filter bar becomes bottom sheet
  - Match cards full-width
  - Action buttons stack vertically
  - Swipe gestures:
    - Swipe right: Approve
    - Swipe left: Reject
    - Tap: Expand details

#### 3. Statement Upload
- **Mobile:**
  - File upload zone full-width, shorter height
  - Statement type selector: Dropdown instead of radio buttons
  - Results card: Stats in 2x2 grid
  - Action buttons stack vertically

#### 4. Email Detail Modal
- **Mobile:**
  - Full-screen modal (100vh)
  - Extracted data form: Single column
  - Email body preview: Collapsible section
  - Action buttons fixed at bottom

#### 5. Import History
- **Mobile:**
  - Filters in bottom sheet
  - History cards: Condensed layout
  - Stats in 2-column grid
  - Load more: Button instead of infinite scroll

### Touch Interactions

1. **Tap Targets:**
   - Minimum 44x44px for all interactive elements
   - Adequate spacing between buttons (8px minimum)

2. **Swipe Gestures:**
   - Review queue cards: Swipe to approve/reject
   - Visual feedback: Card slides with action color
   - Undo toast after swipe action

3. **Modals:**
   - Bottom sheets on mobile (instead of centered modals)
   - Drag handle at top for dismiss
   - Backdrop tap to close

---

## Interaction Patterns

### 1. Approve Flow

**Desktop:**
1. User clicks "Approve" button on match card
2. Button shows loading spinner
3. API call to create transaction + link email
4. Success: Card animates out (fade + slide up)
5. Toast notification: "Transaction imported successfully"
6. Next card in queue auto-focuses

**Mobile:**
1. User swipes card right
2. Card slides right with green background reveal
3. Auto-confirms after 300ms swipe
4. Undo button in toast (5 second window)
5. Card animates out if not undone

### 2. Reject Flow

**Both platforms:**
1. User clicks "Reject" or swipes left (mobile)
2. Confirmation dialog: "Mark as non-transaction?"
3. User confirms
4. Email status updated to "skipped"
5. Card removed from queue
6. Toast: "Email marked as skipped"

### 3. Link Other Flow

**Step-by-step:**
1. User clicks "Link Other" on match card
2. Search modal opens
3. User searches existing transactions by:
   - Date range (auto-populated ±7 days)
   - Vendor
   - Amount range
4. Results shown in list
5. User selects transaction
6. Confirmation: "Link this receipt to [Transaction]?"
7. User confirms
8. Email linked to selected transaction
9. Card updated to show "Matched" status

### 4. Statement Upload Flow

**Complete flow:**
1. User selects payment method (required)
2. User uploads file (drag-drop or browse)
3. File validation (type, size)
4. Upload to server
5. Progress indicator (upload + processing)
6. **Phase 1:** Extract transactions from file
   - Show progress: "Extracting... 12 of 45"
7. **Phase 2:** Cross-reference with emails
   - Show progress: "Matching... 8 of 45"
8. **Phase 3:** Calculate confidence scores
   - Show progress: "Analyzing... 100%"
9. Results displayed
10. User can:
    - Approve all high-confidence
    - Review individually
    - Download report
11. Navigate to review queue

### 5. Batch Approve Flow

**High-confidence batch:**
1. User clicks "Approve All High-Confidence"
2. Confirmation modal:
   - "Approve 38 transactions?"
   - Show total amount
   - List first 5 with "...and 33 more"
3. User confirms
4. Progress indicator: "Importing... 15 of 38"
5. Success summary:
   - "38 transactions imported"
   - "Total: $1,247.89 USD"
6. Navigate to transaction list with filter

### 6. Error Handling

**Common errors:**

| Error | User Message | Recovery Action |
|-------|-------------|-----------------|
| Upload failed | "Failed to upload file. Please try again." | Retry button |
| Processing error | "Couldn't extract transactions. Verify file is valid." | Re-upload or skip |
| No transactions found | "No transactions detected in this file." | Try different file |
| Duplicate upload | "This statement was already processed on [date]." | View existing results |
| Email sync failed | "Couldn't connect to iCloud. Check settings." | Open email settings |
| Match conflict | "This receipt is already linked to a different transaction." | Unlink option |

**Error display:**
- Inline (within card/form): Red border + icon + message
- Page-level: Alert banner at top
- Toast: For transient errors (auto-dismiss)

---

## Database Schema Extensions

### New Tables

#### 1. `email_transactions`

```sql
CREATE TABLE public.email_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Email metadata
  message_id TEXT NOT NULL UNIQUE,
  uid INTEGER,
  folder TEXT NOT NULL,
  subject TEXT,
  from_address TEXT,
  from_name TEXT,
  email_date TIMESTAMP WITH TIME ZONE,
  seen BOOLEAN DEFAULT FALSE,
  has_attachments BOOLEAN DEFAULT FALSE,

  -- Extracted transaction data
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_name_raw TEXT, -- Original text from email
  amount DECIMAL(12, 2),
  currency currency_type,
  transaction_date DATE,
  description TEXT,
  order_id TEXT, -- External reference (Grab order, Lazada order, etc.)

  -- Matching data
  matched_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  match_confidence DECIMAL(5, 2), -- 0-100
  match_method TEXT, -- 'auto', 'manual', 'statement_upload'

  -- Status and classification
  status TEXT NOT NULL DEFAULT 'pending_review',
    -- 'pending_review', 'matched', 'waiting_for_statement',
    -- 'ready_to_import', 'imported', 'skipped'
  classification TEXT NOT NULL DEFAULT 'import',
    -- 'import', 'reconcile', 'watch_for', 'income', 'non_transaction'

  -- Processing metadata
  extraction_confidence DECIMAL(5, 2), -- How confident in extracted data
  extraction_notes JSONB, -- Detailed extraction log

  -- Timestamps
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  matched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN (
    'pending_review', 'matched', 'waiting_for_statement',
    'ready_to_import', 'imported', 'skipped'
  )),
  CONSTRAINT valid_classification CHECK (classification IN (
    'import', 'reconcile', 'watch_for', 'income', 'non_transaction'
  ))
);

-- Indexes
CREATE INDEX idx_email_transactions_user_id ON public.email_transactions(user_id);
CREATE INDEX idx_email_transactions_status ON public.email_transactions(status);
CREATE INDEX idx_email_transactions_matched_transaction ON public.email_transactions(matched_transaction_id);
CREATE INDEX idx_email_transactions_date ON public.email_transactions(transaction_date DESC);
CREATE INDEX idx_email_transactions_folder ON public.email_transactions(folder);
CREATE INDEX idx_email_transactions_synced_at ON public.email_transactions(synced_at DESC);

-- Full-text search on subject and description
CREATE INDEX idx_email_transactions_search ON public.email_transactions
  USING gin(to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(description, '')));
```

#### 2. `statement_uploads`

```sql
CREATE TABLE public.statement_uploads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- File metadata
  filename TEXT NOT NULL,
  file_path TEXT, -- S3/storage path
  file_size INTEGER,
  file_type TEXT, -- 'pdf', 'png', 'jpg', etc.

  -- Statement metadata
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL NOT NULL,
  statement_period_start DATE,
  statement_period_end DATE,

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending',
    -- 'pending', 'processing', 'completed', 'failed'

  -- Extraction results
  transactions_extracted INTEGER DEFAULT 0,
  transactions_matched INTEGER DEFAULT 0,
  transactions_new INTEGER DEFAULT 0,

  -- Processing metadata
  extraction_started_at TIMESTAMP WITH TIME ZONE,
  extraction_completed_at TIMESTAMP WITH TIME ZONE,
  extraction_error TEXT,
  extraction_log JSONB,

  -- Timestamps
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_upload_status CHECK (status IN (
    'pending', 'processing', 'completed', 'failed'
  ))
);

-- Indexes
CREATE INDEX idx_statement_uploads_user_id ON public.statement_uploads(user_id);
CREATE INDEX idx_statement_uploads_payment_method ON public.statement_uploads(payment_method_id);
CREATE INDEX idx_statement_uploads_uploaded_at ON public.statement_uploads(uploaded_at DESC);
CREATE INDEX idx_statement_uploads_status ON public.statement_uploads(status);
```

#### 3. `import_activities`

```sql
CREATE TABLE public.import_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Activity type
  activity_type TEXT NOT NULL,
    -- 'email_sync', 'statement_upload', 'bulk_approve',
    -- 'manual_link', 'reject', 'import'

  -- Related entities
  statement_upload_id UUID REFERENCES public.statement_uploads(id) ON DELETE SET NULL,

  -- Activity summary
  description TEXT,
  transactions_affected INTEGER DEFAULT 0,
  total_amount DECIMAL(12, 2),
  currency currency_type,

  -- Metadata
  metadata JSONB, -- Activity-specific data

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_activity_type CHECK (activity_type IN (
    'email_sync', 'statement_upload', 'bulk_approve',
    'manual_link', 'reject', 'import'
  ))
);

-- Indexes
CREATE INDEX idx_import_activities_user_id ON public.import_activities(user_id);
CREATE INDEX idx_import_activities_type ON public.import_activities(activity_type);
CREATE INDEX idx_import_activities_created_at ON public.import_activities(created_at DESC);
```

### Table Relationships

```
users
  └── email_transactions
        ├── vendors (vendor_id)
        └── transactions (matched_transaction_id)
  └── statement_uploads
        └── payment_methods (payment_method_id)
  └── import_activities
        └── statement_uploads (statement_upload_id)
```

### Row Level Security (RLS)

```sql
-- email_transactions
ALTER TABLE public.email_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email transactions"
  ON public.email_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email transactions"
  ON public.email_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email transactions"
  ON public.email_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email transactions"
  ON public.email_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- statement_uploads
ALTER TABLE public.statement_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own statement uploads"
  ON public.statement_uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own statement uploads"
  ON public.statement_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own statement uploads"
  ON public.statement_uploads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own statement uploads"
  ON public.statement_uploads FOR DELETE
  USING (auth.uid() = user_id);

-- import_activities
ALTER TABLE public.import_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own import activities"
  ON public.import_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import activities"
  ON public.import_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## Implementation Notes

### Phase 1: Foundation (Week 1-2)

1. **Database setup:**
   - Create migrations for new tables
   - Add indexes and RLS policies
   - Generate TypeScript types

2. **Email integration:**
   - Enhance existing `/settings/emails` page
   - Add email parsing logic (already exists in import skill)
   - Create email_transactions table population

3. **Basic UI:**
   - Add "Imports" to navigation
   - Create dashboard page skeleton
   - Set up routing structure

### Phase 2: Core Matching (Week 3-4)

1. **Statement processing:**
   - File upload API endpoint
   - PDF/image text extraction (use existing patterns)
   - Transaction extraction logic

2. **Matching algorithm:**
   - Cross-currency matching (THB ↔ USD)
   - Confidence scoring
   - Date tolerance (±1 day)

3. **Review queue:**
   - Match card component
   - Filter and search
   - Approve/reject actions

### Phase 3: Polish & Testing (Week 5-6)

1. **Batch operations:**
   - Bulk approve high-confidence
   - Export functionality

2. **Mobile optimization:**
   - Responsive layouts
   - Touch interactions
   - Bottom sheets

3. **Error handling:**
   - Comprehensive validation
   - User-friendly messages
   - Recovery flows

### Phase 4: Advanced Features (Week 7-8)

1. **Manual linking:**
   - Transaction search modal
   - Link override capability

2. **Import history:**
   - Activity logging
   - Audit trail
   - Download reports

3. **Settings integration:**
   - Email folder configuration
   - Auto-sync preferences
   - Notification settings

### Technical Considerations

**API Routes:**
```
POST   /api/emails/sync
GET    /api/emails/transactions
PUT    /api/emails/transactions/:id
DELETE /api/emails/transactions/:id

POST   /api/statements/upload
GET    /api/statements/:id/matches
POST   /api/statements/:id/process

POST   /api/imports/approve
POST   /api/imports/reject
POST   /api/imports/link
GET    /api/imports/history
```

**File Storage:**
- Use Supabase Storage for uploaded statements
- Store in bucket: `statement-uploads/{user_id}/{upload_id}.pdf`
- Generate signed URLs for downloads
- Files kept forever (no auto-delete)

**Background Jobs:**
- Email sync: Already integrated into daily cron (18:00 UTC) at `/api/cron/sync-all-rates`
- Statement processing: Queue-based (for long-running extractions)
- Match recalculation: On-demand or nightly

**Performance:**
- Paginate review queue (20 items per page)
- Cache match results (Redis or in-memory)
- Debounce search inputs (300ms)
- Lazy load email bodies (only on expand/modal open)

**Security:**
- Validate file types on upload
- Sanitize extracted text (prevent XSS)
- Rate limit API endpoints
- Audit log all imports

---

## Design Decisions (Finalized)

1. **Navigation placement:** ✅ Top-level "Imports" nav item (primary workflow)

2. **Auto-approve:** ✅ Never auto-approve, always require user confirmation
   - Future Phase 5 enhancement: Learn from user confirmations to improve pattern recognition

3. **Email sync frequency:** ✅ Piggybacks on existing daily cron job (18:00 UTC)
   - Already integrated into `/api/cron/sync-all-rates`
   - Manual "Sync Now" button also available

4. **Statement retention:** ✅ Keep uploaded files forever (no auto-delete)

5. **Duplicate handling:** ✅ Block with warning, show previous results

6. **Exchange rate variance:** ✅ ±2% tolerance, using stored `exchange_rates` table
   - Cross-currency matching uses historical rates from database

7. **Notifications:** ✅ Skip for now, add later as enhancement

---

## Conflict Resolution System

### Overview

The system must handle ambiguous matches intelligently. Since auto-approval is never allowed, all conflicts surface in the Review Queue for user decision.

### Scenario 1: Two Emails Match Same Statement Transaction

**Example:** Two Grab rides on same day, both ฿340 THB → $10.00 USD

**Resolution Strategy:**
1. Check for unique identifiers in emails:
   - Grab: Order ID (`GF-20251215-XYABC`)
   - Bolt: Trip ID from email body
   - Lazada: Order number
   - Bank transfers: Transaction reference number
2. Check secondary differentiators:
   - Exact timestamp in email body (not just date)
   - Pickup/dropoff locations (for rides)
   - Restaurant name (for food delivery)
3. If still ambiguous → Present both as candidates for user selection

**UI Treatment:**
- Show "Multiple matches found" warning badge on the MatchCard
- Display both emails side-by-side with highlighting of differences
- User selects which email corresponds to the statement charge
- Unselected email moves to "Waiting for Statement" status

### Scenario 2: Email Matches Existing Database Transaction

Before creating a new transaction from email approval, query for potential duplicates:

```sql
SELECT * FROM transactions
WHERE user_id = $1
  AND transaction_date BETWEEN email_date - INTERVAL '1 day' AND email_date + INTERVAL '1 day'
  AND vendor_id = $2
  AND ABS(amount - $3) / NULLIF(amount, 0) < 0.02  -- ±2% tolerance
```

**Resolution Strategy:**
1. Calculate match confidence using standard algorithm
2. If high confidence (>90%) → Suggest linking email to existing transaction (not creating new)
3. If medium confidence → Show comparison and ask user
4. If low confidence → Proceed with new transaction creation

**UI Treatment:**
- "Possible duplicate found" modal when approving
- Side-by-side comparison: Email data vs. Existing transaction
- Actions: "Link to existing" | "Create new anyway" | "Skip email"

### Scenario 3: Statement Transaction Has No Email

**Examples:**
- In-person purchases (wine shop, grocery store)
- Auto-subscriptions (Netflix, Notion)
- EZ Pass replenishment

**Classification:** "Ready to Import" (no email match needed)

**UI Treatment:**
- Different card variant (purple border, no email section)
- Pre-populated from statement data only
- User can optionally add description/tags before import

### Scenario 4: Email Has No Statement Match (Yet)

**Status:** "Waiting for Statement"

**Auto-resolution:** When next statement is uploaded, re-run matching against all waiting emails.

**Manual Options:**
- "Link Manually" → Search existing transactions
- "Import as THB" → Create transaction in original currency (for cash/direct THB payments)
- "Skip" → Mark as non-transaction

### Scenario 5: Same Transaction in Multiple Sources

**Example:** Bangkok Bank email AND Bangkok Bank statement both show same ฿1,200 transfer

**Detection:** Match on:
- Same date (exact)
- Same amount (exact)
- Same vendor or recipient
- Same payment method

**Resolution:**
- Mark statement line as "Validated" (not "New")
- Link email to existing transaction
- Do NOT create duplicate

---

## Appendix: Color Palette

**Status Colors:**
- Pending Review: `bg-amber-50 border-amber-200 text-amber-900`
- Waiting for Statement: `bg-blue-50 border-blue-200 text-blue-900`
- Matched (High): `bg-green-50 border-green-200 text-green-900`
- Ready to Import: `bg-purple-50 border-purple-200 text-purple-900`
- Skipped: `bg-gray-50 border-gray-200 text-gray-600`
- Error: `bg-red-50 border-red-200 text-red-900`

**Currency Colors:**
- USD: `text-blue-600`
- THB: `text-purple-600`
- Default: `text-gray-900`

**Confidence Levels:**
- High (>90%): `text-green-600 bg-green-100`
- Medium (55-90%): `text-amber-600 bg-amber-100`
- Low (<55%): `text-red-600 bg-red-100`

---

## Appendix: Match Scoring Algorithm

**Factors (weighted):**

1. **Amount match (40%):**
   - Exact: 40 points
   - Within 2%: 35 points
   - Within 5%: 25 points
   - Within 10%: 15 points
   - Beyond 10%: 0 points

2. **Date match (30%):**
   - Same day: 30 points
   - ±1 day: 25 points
   - ±2 days: 15 points
   - ±3 days: 5 points
   - Beyond 3 days: 0 points

3. **Vendor match (20%):**
   - Exact name: 20 points
   - Fuzzy match >80%: 15 points
   - Fuzzy match >60%: 10 points
   - Category match: 5 points
   - No match: 0 points

4. **Currency alignment (10%):**
   - Both same currency: 10 points
   - Cross-currency with known rate: 8 points
   - Cross-currency without rate: 5 points

**Total Score:** Sum of all factors (0-100)

**Thresholds:**
- High Confidence: >90
- Medium Confidence: 55-90
- Low Confidence: <55

**Special Rules:**
- If amount variance >10% → max score = 60 (force manual review)
- If date variance >3 days → max score = 70
- Cross-currency matches require exchange rate within ±2%

---

**End of Design Specification**

This document is a living specification and should be updated as requirements evolve during implementation.
