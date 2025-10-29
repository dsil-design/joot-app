# Document Management & Transaction Reconciliation UX Design

**Project:** Joot Personal Finance Application
**Feature:** Document Upload, Matching, and Reconciliation System
**Date:** October 29, 2025
**Device Context:** Desktop-first (mobile for quick camera captures only)

---

## Executive Summary

This design introduces a three-phase workflow for document management:
1. **Upload & Process** - Bulk upload with intelligent parsing
2. **Match & Review** - AI-assisted matching with user control
3. **Manage & Search** - Document library for long-term access

The system emphasizes **confidence over automation**, giving users clear visibility into matching quality and full control over data accuracy.

---

## 1. Information Architecture

```
Joot App Navigation
├── Dashboard (existing)
├── Transactions (existing)
├── Documents (NEW)
│   ├── Upload
│   ├── Review Queue (badge: pending count)
│   ├── Document Library
│   └── Settings (auto-match preferences)
└── Vendors (existing, enhanced)
```

### Navigation Strategy
- Add "Documents" as a top-level nav item with notification badge showing unmatched documents
- Add "Attach Document" button within existing transaction detail pages
- Show document icon indicator on transaction list items that have attachments

---

## 2. User Flows

### Flow A: Upload Documents (Primary Path)

```
1. User clicks "Documents" → "Upload" in main nav
   ↓
2. Lands on bulk upload interface
   - Large drag-drop zone (takes 70% of screen)
   - Or "Choose Files" button
   ↓
3. Selects/drops multiple files
   - File cards appear with thumbnails
   - Shows file size, type, upload progress
   ↓
4. Clicks "Process Documents" button
   - Backend extracts data (amount, date, vendor, line items for statements)
   - Shows processing status per document
   ↓
5. Processing complete
   - Success notification: "12 documents processed, 10 matches found"
   - Auto-redirect to Review Queue
```

### Flow B: Review Matched Documents

```
1. User lands on Review Queue
   - Split view: Unmatched (left column) | Matched (right column)
   ↓
2. Reviews matched suggestions
   - Each match shows confidence score badge
   - Document preview + transaction details side-by-side
   ↓
3. For high-confidence matches (user's preference threshold):
   Option A: Bulk approve (select multiple, click "Approve Selected")
   Option B: Individual review (click match card)
   ↓
4. For medium/low-confidence matches:
   - Click to open detail comparison view
   - See document data vs transaction data
   - Edit transaction if needed
   - Approve/reject match
   ↓
5. For unmatched documents:
   - Click to view extracted data
   - Option A: Manually link to existing transaction (search)
   - Option B: Create new transaction from document
   - Option C: Ignore/archive (not a transaction)
```

### Flow C: Attach Document to Existing Transaction

```
1. User viewing transaction detail page
   ↓
2. Clicks "Attach Document" button
   ↓
3. Modal opens with two tabs:
   Tab 1: Upload new document
   Tab 2: Choose from unmatched documents
   ↓
4. Selects document
   - Shows extracted data vs current transaction
   - Option to update transaction with extracted data
   ↓
5. Confirms attachment
   - Document now appears in transaction detail
```

### Flow D: Multi-Transaction Statement Processing

```
1. User uploads bank statement PDF
   ↓
2. System detects it's a statement (multiple transactions)
   - Extracts all line items
   - Creates "virtual receipt" for each line item
   ↓
3. Each line item treated as separate document for matching
   - Shows in Review Queue as individual items
   - Each has link icon: "View full statement"
   ↓
4. User approves matches
   - Virtual receipt attached to transaction
   - Full statement PDF linked to all matched transactions
   ↓
5. Transaction detail view:
   - Shows extracted line item as primary view
   - "View full statement" link opens complete PDF
```

---

## 3. Screen Wireframes & Layouts

### 3.1 Upload Interface

```
┌─────────────────────────────────────────────────────────────┐
│ Documents > Upload                                    [Help] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │              📄 Drag & Drop Documents                │   │
│  │                                                       │   │
│  │     Supported: PDF, JPG, PNG, EML/MSG files         │   │
│  │                                                       │   │
│  │            [Choose Files to Upload]                  │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Quick Tips:                                                 │
│  • Upload email receipts from Grab, Lazada, Amazon, etc.    │
│  • Bank statements will auto-extract all transactions        │
│  • Multiple files upload simultaneously                      │
│                                                               │
│  [📱 Mobile Camera Upload]  [⚙️ Upload Settings]           │
│                                                               │
└─────────────────────────────────────────────────────────────┘

After files selected:

┌─────────────────────────────────────────────────────────────┐
│ Documents > Upload                   [Clear All] [Process]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────┐          │
│  │ 📄 Grab_receipt_2025-10-15.pdf    [x]        │          │
│  │ 250 KB | Processing... ████████░░ 80%        │          │
│  └──────────────────────────────────────────────┘          │
│                                                               │
│  ┌──────────────────────────────────────────────┐          │
│  │ 🖼️ IMG_0234.jpg                   [x]        │          │
│  │ 1.2 MB | Uploading... ████░░░░░░░ 40%        │          │
│  └──────────────────────────────────────────────┘          │
│                                                               │
│  ┌──────────────────────────────────────────────┐          │
│  │ 📄 Bangkok_Bank_Nov2025.pdf      [x]        │          │
│  │ 850 KB | Queued...                           │          │
│  └──────────────────────────────────────────────┘          │
│                                                               │
│  [+ Add More Files]                                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- Large drop zone for easy targeting (desktop-optimized)
- Clear supported formats listed
- Individual file progress bars
- Mobile camera button for quick receipt capture
- Process button disabled until at least one file uploaded

---

### 3.2 Review Queue (Split View)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Documents > Review Queue                        [Bulk Actions ▾] [⚙️]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Unmatched (8) ────────────┐      Matched (15) ─────────────────┐      │
│                             │                                      │      │
│  Sort: Recent ▾   Filter ▾ │      Sort: Confidence ▾  [Approve   │      │
│                             │                          All High]  │      │
│  ┌────────────────────────┐│      ┌───────────────────────────┐ │      │
│  │ 📄 Amazon Order        ││      │ [✓] 95% HIGH CONFIDENCE  │ │      │
│  │ $34.99 | Oct 28, 2025  ││      │ 📄 Grab receipt           │ │      │
│  │ No matches found       ││      │ ─────────────────────────│ │      │
│  │ [Create] [Link] [Skip] ││      │ $12.50 | Oct 28 → $12.50 │ │      │
│  └────────────────────────┘│      │ Grab Food | Oct 28        │ │      │
│                             │      │ [Review] [Approve]        │ │      │
│  ┌────────────────────────┐│      └───────────────────────────┘ │      │
│  │ 🖼️ Receipt photo       ││                                     │      │
│  │ $18.23 | Oct 27, 2025  ││      ┌───────────────────────────┐ │      │
│  │ Possible: 2 matches    ││      │ [✓] 92% HIGH CONFIDENCE  │ │      │
│  │ [Review Matches]       ││      │ 📄 Lazada order #45678    │ │      │
│  └────────────────────────┘│      │ ─────────────────────────│ │      │
│                             │      │ ฿450.00 | Oct 27 → ฿450  │ │      │
│  ┌────────────────────────┐│      │ Lazada | Oct 27           │ │      │
│  │ 📄 Bank Statement      ││      │ [Review] [Approve]        │ │      │
│  │ 24 transactions found  ││      └───────────────────────────┘ │      │
│  │ [Review & Match All]   ││                                     │      │
│  └────────────────────────┘│      ┌───────────────────────────┐ │      │
│                             │      │ [!] 68% MEDIUM CONFIDENCE│ │      │
│                             │      │ 📄 Email receipt          │ │      │
│                             │      │ ─────────────────────────│ │      │
│                             │      │ $25.00 | Oct 26 → $27.50 │ │      │
│                             │      │ Coffee Shop | Oct 26      │ │      │
│                             │      │ ⚠️ Amount differs by $2.5│ │      │
│                             │      │ [Review Required]         │ │      │
│                             │      └───────────────────────────┘ │      │
│                             │                                     │      │
└─────────────────────────────┴─────────────────────────────────────┘      │
```

**Key Design Decisions:**
- Split view keeps both unmatched and matched visible simultaneously
- Confidence badges with clear visual hierarchy (green/yellow/red)
- Checkboxes on high-confidence matches for bulk approval
- Warning indicators for data conflicts
- Quick action buttons on each card
- Count badges show pending work
- "Approve All High" button for power users who trust the system

---

### 3.3 Document-Transaction Detail Comparison

```
┌─────────────────────────────────────────────────────────────────────┐
│ Review Match                                   [Approve] [Reject]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Confidence Score: 92% HIGH                    Match ID: #12345     │
│                                                                       │
│  ┌──────────────────────────┬───────────────────────────────────┐  │
│  │ DOCUMENT DATA            │ CURRENT TRANSACTION               │  │
│  ├──────────────────────────┼───────────────────────────────────┤  │
│  │                          │                                   │  │
│  │ [Document Preview]       │ Date:        Oct 28, 2025         │  │
│  │ ┌────────────────────┐   │ Vendor:      Grab Food            │  │
│  │ │ GRAB               │   │ Amount:      $12.50               │  │
│  │ │                    │   │ Currency:    USD                  │  │
│  │ │ Your ride receipt  │   │ Category:    Food & Dining        │  │
│  │ │                    │   │ Tags:        Lunch, Delivery      │  │
│  │ │ Total: $12.50      │   │ Notes:       Team lunch order     │  │
│  │ │ Date: 28 Oct 2025  │   │                                   │  │
│  │ └────────────────────┘   │ Attachments: None                 │  │
│  │                          │                                   │  │
│  │ Extracted Data:          │                                   │  │
│  │ • Amount: $12.50 ✓       │                                   │  │
│  │ • Date: Oct 28, 2025 ✓   │                                   │  │
│  │ • Vendor: Grab ✓         │                                   │  │
│  │ • Type: Food Delivery    │                                   │  │
│  │ • Order ID: GR-8392834   │                                   │  │
│  │                          │                                   │  │
│  │ [View Full Document]     │ [Edit Transaction]                │  │
│  │                          │                                   │  │
│  └──────────────────────────┴───────────────────────────────────┘  │
│                                                                       │
│  Matching Factors:                                                   │
│  ✓ Amount matches exactly                                            │
│  ✓ Date matches exactly                                              │
│  ✓ Vendor name matches (Grab → Grab Food)                           │
│  ✓ Transaction type compatible (food delivery)                       │
│                                                                       │
│  Actions:                                                             │
│  [✓ Attach document to transaction]                                 │
│  [✓ Enrich vendor profile with extracted data]                      │
│  [ ] Update transaction with document data (no changes needed)       │
│                                                                       │
│  [← Back to Queue]           [Approve Match] [Reject & Link Other]  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- Side-by-side comparison for easy verification
- Document preview with zoom capability
- Extracted data shown with checkmarks for matches
- Clear explanation of matching factors (transparency)
- Checkboxes for automatic actions (enrich vendor, update transaction)
- Edit transaction button if user wants to fix existing data
- Multiple exit paths (approve, reject, back)

---

### 3.4 Create Transaction from Document

```
┌─────────────────────────────────────────────────────────────────┐
│ Create Transaction from Document                    [Cancel]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────┐    ┌──────────────────────────────┐   │
│  │ Document Preview    │    │ New Transaction              │   │
│  │ ┌─────────────────┐ │    │                              │   │
│  │ │ LAZADA          │ │    │ Date:     [Oct 28, 2025] ✓   │   │
│  │ │                 │ │    │                              │   │
│  │ │ Order Confirmed │ │    │ Vendor:   [Lazada]        ✓  │   │
│  │ │                 │ │    │           [Create new vendor]│   │
│  │ │ Total: ฿450.00  │ │    │                              │   │
│  │ │                 │ │    │ Amount:   [450.00]        ✓  │   │
│  │ └─────────────────┘ │    │ Currency: [THB ▾]         ✓  │   │
│  │                     │    │                              │   │
│  │ Extracted:          │    │ Type:     [Expense ▾]        │   │
│  │ • Amount: ฿450.00   │    │ Category: [Shopping ▾]    ⚠️ │   │
│  │ • Date: Oct 28      │    │           Suggested: Online  │   │
│  │ • Vendor: Lazada    │    │           Shopping           │   │
│  │ • Order: #45678     │    │                              │   │
│  │                     │    │ Tags:     [Online] [Fashion] │   │
│  │                     │    │           [+ Add tag]        │   │
│  │                     │    │                              │   │
│  │                     │    │ Notes:    Lazada Order #45678│   │
│  │                     │    │           (auto-filled)      │   │
│  │                     │    │                              │   │
│  │                     │    │ [ ] Set as recurring         │   │
│  │                     │    │                              │   │
│  └─────────────────────┘    └──────────────────────────────┘   │
│                                                                   │
│  Confidence Indicators:                                          │
│  ✓ High confidence (green) | ⚠️ Low confidence (review needed)  │
│                                                                   │
│  [Create Transaction & Attach Document]                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- Pre-filled form with extracted data
- Confidence indicators on each field (green check, yellow warning)
- Document preview always visible for reference
- Suggestions for low-confidence fields (e.g., category)
- Create vendor inline if not found
- Auto-populated notes with order numbers/IDs
- Single action button combines transaction creation and document attachment

---

### 3.5 Document Library

```
┌─────────────────────────────────────────────────────────────────────┐
│ Documents > Library                    [View: Grid ▾] [Upload New] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Search documents...        [All Types ▾] [All Vendors ▾] [2025 ▾]  │
│                                                                       │
│  Filters: [Matched] [Unmatched] [Statements] [Receipts]             │
│                                                                       │
│  ┌────────────────┬────────────────┬────────────────┬─────────────┐ │
│  │ Document       │ Vendor         │ Amount         │ Status      │ │
│  ├────────────────┼────────────────┼────────────────┼─────────────┤ │
│  │ 📄 Grab        │ Grab Food      │ $12.50         │ ✓ Matched   │ │
│  │ Oct 28, 2025   │                │                │ Transaction │ │
│  │ Receipt        │                │                │ #892        │ │
│  ├────────────────┼────────────────┼────────────────┼─────────────┤ │
│  │ 🖼️ IMG_0234    │ Coffee Shop    │ $8.75          │ ⏳ Pending  │ │
│  │ Oct 27, 2025   │ (extracted)    │                │ Review      │ │
│  │ Photo          │                │                │             │ │
│  ├────────────────┼────────────────┼────────────────┼─────────────┤ │
│  │ 📄 Bangkok     │ Multiple (24)  │ Statement      │ ✓ 24/24     │ │
│  │ Bank Nov 2025  │                │                │ Matched     │ │
│  │ Statement      │                │                │             │ │
│  ├────────────────┼────────────────┼────────────────┼─────────────┤ │
│  │ 📄 Lazada      │ Lazada         │ ฿450.00        │ ✓ Matched   │ │
│  │ Oct 28, 2025   │                │                │ Transaction │ │
│  │ Order #45678   │                │                │ #891        │ │
│  └────────────────┴────────────────┴────────────────┴─────────────┘ │
│                                                                       │
│  Showing 4 of 127 documents                          [1 2 3 ... 13] │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

Click any row to open detail view:

┌─────────────────────────────────────────────────────────────────────┐
│ Document Detail                               [Edit] [Delete] [←]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────┐  Grab Receipt                         │
│  │                          │                                        │
│  │  [Document Preview]      │  Uploaded:     Oct 28, 2025 2:34 PM   │
│  │                          │  Type:         Email Receipt (PDF)     │
│  │  GRAB                    │  Size:         250 KB                  │
│  │                          │  Source:       grab_receipts@grab.com  │
│  │  Your ride receipt       │                                        │
│  │                          │  Extracted Data:                       │
│  │  Total: $12.50           │  • Vendor: Grab Food                   │
│  │  Date: 28 Oct 2025       │  • Amount: $12.50 USD                  │
│  │                          │  • Date: October 28, 2025              │
│  │                          │  • Order ID: GR-8392834                │
│  │                          │  • Payment: Visa ending 1234           │
│  │                          │                                        │
│  │  [Download] [Print]      │  Linked Transaction:                   │
│  │                          │  #892 - Grab Food - $12.50             │
│  │                          │  Oct 28, 2025 | Food & Dining          │
│  │                          │  [View Transaction]                    │
│  └──────────────────────────┘                                        │
│                                                                       │
│  Document History:                                                   │
│  • Oct 28, 2:34 PM - Uploaded                                        │
│  • Oct 28, 2:35 PM - Processed (match found)                         │
│  • Oct 28, 2:36 PM - Matched to transaction #892 (manual approval)  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- Table view for quick scanning of many documents
- Grid view option for visual browsing
- Multi-faceted filtering (type, vendor, date, status)
- Status column shows matching state clearly
- Bank statements show match ratio (24/24 matched)
- Detail view shows full extraction results and history
- Direct link to matched transaction(s)
- Download/print options for record-keeping

---

### 3.6 Transaction Detail Page (Enhanced with Document Attachment)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Transaction #892                              [Edit] [Delete] [←]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Grab Food                                                           │
│  $12.50 USD                                                          │
│  October 28, 2025                                                    │
│                                                                       │
│  Category:  Food & Dining                                            │
│  Tags:      Lunch, Delivery                                          │
│  Notes:     Team lunch order                                         │
│                                                                       │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                       │
│  Attached Documents (1)                          [+ Attach Document] │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 📄 Grab Receipt                              ✓ Verified       │   │
│  │ Email receipt | 250 KB | Uploaded Oct 28                      │   │
│  │                                                                │   │
│  │ ┌────────────────────┐  Extracted:                            │   │
│  │ │ GRAB               │  • Order ID: GR-8392834                │   │
│  │ │                    │  • Payment: Visa ending 1234           │   │
│  │ │ Your ride receipt  │  • Match confidence: 95%               │   │
│  │ │                    │                                        │   │
│  │ │ Total: $12.50      │  [View Full Document] [Detach]         │   │
│  │ └────────────────────┘                                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  Vendor Information                                                  │
│  • Grab Food                                                         │
│  • Category: Food Delivery                                           │
│  • [View Vendor Profile]                                             │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- Documents shown as expandable cards below main transaction info
- Thumbnail preview with key extracted data
- Verification badge shows document was matched
- Quick actions (view full, detach)
- Multiple documents can be attached (stack them vertically)
- "Attach Document" button opens modal with upload or link options

---

### 3.7 Mobile Camera Capture Flow

```
Mobile Experience (Progressive Web App or Native):

Step 1: Quick Capture
┌─────────────────────┐
│ Joot                │
│                     │
│   [Camera View]     │
│                     │
│   ┌────────────┐    │
│   │            │    │
│   │  Receipt   │    │
│   │            │    │
│   └────────────┘    │
│                     │
│   [○ Capture]       │
│                     │
│   Tips:             │
│   • Center receipt  │
│   • Good lighting   │
│   • All edges shown │
│                     │
└─────────────────────┘

Step 2: Review Capture
┌─────────────────────┐
│ Review Photo        │
│                     │
│   [Preview]         │
│   ┌────────────┐    │
│   │ Captured   │    │
│   │ Receipt    │    │
│   │ Image      │    │
│   └────────────┘    │
│                     │
│   [Retake] [Use]    │
│                     │
└─────────────────────┘

Step 3: Processing
┌─────────────────────┐
│ Processing...       │
│                     │
│   📄                │
│   ⬆️ Uploading      │
│   ████████░░ 80%    │
│                     │
│   Next: Review on   │
│   desktop for full  │
│   reconciliation    │
│                     │
└─────────────────────┘
```

**Key Design Decisions:**
- Simplified mobile flow: capture → review → upload
- Tips shown during capture for better image quality
- Processing happens on desktop (mobile is for quick capture only)
- Clear expectation setting: "Review on desktop"
- Auto-crop and enhancement applied to photos

---

## 4. Interaction Patterns

### 4.1 Drag & Drop Handling

**States:**
1. **Idle**: Large drop zone with dashed border, icon, and text
2. **Drag Over**: Blue highlight border, "Drop files here" text
3. **Dropped**: Files appear as cards below, drop zone remains (can add more)
4. **Processing**: Progress bars on each file card
5. **Complete**: Success state with redirect prompt

**Edge Cases:**
- Duplicate file detection: Show warning "This file was already uploaded on [date]"
- Unsupported format: Show error inline, don't block other files
- Large files (>10MB): Show warning, allow but indicate longer processing time
- Failed uploads: Show retry button, keep other files processing

### 4.2 Confidence Score Visualization

**High Confidence (90-100%)**
- Green badge
- Auto-select checkbox for bulk approval
- "Approve" button is primary action

**Medium Confidence (70-89%)**
- Yellow/orange badge
- No auto-select
- "Review" button is primary action

**Low Confidence (Below 70%)**
- Red badge
- Warning icon
- "Review Required" button, approval disabled until reviewed

**Confidence Factors Display:**
Show transparent breakdown:
- Amount match: ✓ or ⚠️ + difference
- Date match: ✓ or ⚠️ + difference
- Vendor match: ✓ or ⚠️ + similarity %
- Category match: ✓ or ⚠️

### 4.3 Bulk Actions

**Bulk Approve High Confidence:**
- Button at top of Matched column
- Only affects matches ≥ user's preference threshold
- Shows count: "Approve 8 High Confidence Matches"
- Confirmation dialog with list preview
- Progress indicator during batch processing
- Success notification with undo option (30 second window)

**Bulk Select:**
- Checkboxes on all match cards
- Select all / deselect all toggle
- Action bar appears at bottom when items selected
- Actions: Approve, Reject, Export

### 4.4 Statement Multi-Transaction Handling

**Upload Phase:**
1. User uploads "Bangkok_Bank_Nov_2025.pdf"
2. System detects it's a statement (heuristics: multiple transactions, bank format)
3. Processing shows: "Extracting 24 transactions from statement..."

**Review Phase:**
1. Statement appears as single item in Unmatched column
2. Card shows: "Bank Statement - 24 transactions found"
3. User clicks "Review & Match All"
4. Opens dedicated statement matching interface:

```
┌──────────────────────────────────────────────────────────────────┐
│ Statement Matching: Bangkok Bank November 2025                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [Full Statement PDF]        Extracted Transactions (24)          │
│  ┌──────────────────────┐                                        │
│  │ Bangkok Bank         │    Line 1: Nov 1 - Lotus - ฿250 [✓]    │
│  │                      │    → Matched: Grocery Shopping #801     │
│  │ Statement            │                                         │
│  │ November 2025        │    Line 2: Nov 2 - PTT - ฿1,200 [✓]    │
│  │                      │    → Matched: Gas Station #802          │
│  │ Page 1 of 3          │                                         │
│  │                      │    Line 3: Nov 3 - Amazon - ฿890 [?]    │
│  │ [Zoom] [Next Page]   │    → Possible: Amazon Order #805 (85%) │
│  │                      │    [Review] [Create New]                │
│  └──────────────────────┘                                        │
│                                                                    │
│  Progress: 18/24 matched   [Approve All Matched] [Review Rest]   │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Result:**
- Each matched transaction gets "virtual receipt" (extracted line item)
- All matched transactions link to full statement PDF
- Transaction detail shows:
  - Primary view: Extracted line item
  - Secondary link: "View full November statement"
- Unmatched lines can be created as new transactions or skipped

---

## 5. Vendor Profile Enrichment

### 5.1 Automatic Enrichment

**Data Extraction from Documents:**
- Vendor name variations (Grab, Grab Food, Grab Thailand)
- Contact information (email, phone, address)
- Logo/brand imagery (from email headers, PDF headers)
- Category hints (food delivery, ride-hailing, e-commerce)
- Website URLs
- Tax IDs / business registration numbers

**Enrichment Flow:**
1. Document processed with vendor mention
2. System checks if vendor exists in database
3. If exists: Compare extracted data with existing profile
4. If new data found: Show notification "New info found for Grab Food"
5. User reviews in vendor profile page
6. Approve additions to vendor profile

### 5.2 Vendor Profile Page (Enhanced)

```
┌─────────────────────────────────────────────────────────────────┐
│ Vendor: Grab Food                           [Edit] [Merge] [←]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [Grab Logo]  Grab Food                                          │
│               Food Delivery Service                              │
│                                                                   │
│  Contact:     support@grab.com | +66 2 123 4567                  │
│  Website:     www.grab.com/th                                    │
│  Category:    Food & Dining > Delivery                           │
│                                                                   │
│  ─────────────────────────────────────────────────────────────  │
│                                                                   │
│  Document History (12 documents)               [View All]        │
│  Most recent: Oct 28, 2025                                       │
│                                                                   │
│  Pending Enrichment (3)                        [Review All]      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ From document: Grab_receipt_Oct28.pdf                      │ │
│  │                                                             │ │
│  │ Suggested additions:                                        │ │
│  │ • Logo: [Logo preview]                    [Add] [Ignore]   │ │
│  │ • Alternative name: "Grab Thailand"       [Add] [Ignore]   │ │
│  │ • Business address: 123 Sukhumvit Rd...   [Add] [Ignore]   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Transaction History (45 transactions)         [View All]        │
│  Total spent: $342.50                                            │
│  Average: $7.61                                                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- Pending enrichment section highlights new extracted data
- Individual approve/ignore per data point (granular control)
- Shows source document for transparency
- Document history shows all uploaded receipts from this vendor
- Transaction history links vendor to financial analysis

---

## 6. Settings & Preferences

### 6.1 Auto-Match Settings

```
┌─────────────────────────────────────────────────────────────────┐
│ Settings > Documents > Auto-Match                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Automatic Matching Behavior                                     │
│                                                                   │
│  ○ Always require manual review                                 │
│     All matches must be approved by you, regardless of confidence│
│                                                                   │
│  ● Auto-approve high confidence matches                         │
│     Automatically attach documents when confidence is above      │
│     threshold. You'll only review medium/low confidence matches. │
│                                                                   │
│     Confidence threshold: [95%] ▁▂▃▄▅▆▇█                       │
│                                                                   │
│     [ ] Send me daily summary of auto-approved matches           │
│                                                                   │
│  ○ Auto-approve all matches                                     │
│     Trust the system completely. Only review conflicts/errors.   │
│     ⚠️ Not recommended for critical financial data               │
│                                                                   │
│  ─────────────────────────────────────────────────────────────  │
│                                                                   │
│  Matching Preferences                                            │
│                                                                   │
│  Date tolerance:        [± 2 days ▾]                            │
│  Amount tolerance:      [Exact match only ▾]                    │
│  Vendor name matching:  [Fuzzy (recommended) ▾]                 │
│                                                                   │
│  [ ] Auto-update transaction data from documents                 │
│      When a document is matched, automatically update transaction│
│      fields with extracted data if more complete/accurate        │
│                                                                   │
│  ─────────────────────────────────────────────────────────────  │
│                                                                   │
│  Notifications                                                   │
│                                                                   │
│  [✓] New documents processed                                    │
│  [✓] Matches requiring review                                   │
│  [ ] All auto-approved matches (can be noisy)                   │
│                                                                   │
│  [Save Settings]                                                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- Three preset modes (manual, semi-auto, full-auto)
- Visual slider for confidence threshold
- Tolerance settings for flexible matching
- Warnings for risky settings
- Granular notification control

---

## 7. Error Handling & Edge Cases

### 7.1 Upload Errors

**Scenario: File too large**
```
┌──────────────────────────────────────────────┐
│ 📄 Bank_Statement_2025.pdf        [x]        │
│ 15.3 MB | ⚠️ File exceeds 10MB limit          │
│ [Try compressing] [Upload anyway]            │
└──────────────────────────────────────────────┘
```

**Scenario: Unsupported format**
```
┌──────────────────────────────────────────────┐
│ 📄 receipt.docx                   [x]        │
│ ❌ Unsupported format. Use PDF or images      │
│ [Remove]                                      │
└──────────────────────────────────────────────┘
```

**Scenario: Network failure**
```
┌──────────────────────────────────────────────┐
│ 📄 Grab_receipt.pdf               [x]        │
│ ❌ Upload failed. Check connection.           │
│ [Retry] [Cancel]                             │
└──────────────────────────────────────────────┘
```

### 7.2 Processing Errors

**Scenario: OCR failure (low quality image)**
```
┌────────────────────────────────────────────────────────────┐
│ ⚠️ Low Quality Document                                     │
│                                                             │
│ We couldn't extract data from IMG_0234.jpg                  │
│ The image quality is too low.                               │
│                                                             │
│ Suggestions:                                                │
│ • Re-upload with better lighting                            │
│ • Use PDF instead of photo if available                     │
│ • Manually enter transaction details                        │
│                                                             │
│ [Upload New Version] [Enter Manually] [Skip]               │
└────────────────────────────────────────────────────────────┘
```

**Scenario: Ambiguous vendor**
```
┌────────────────────────────────────────────────────────────┐
│ Review Required: Ambiguous Vendor                           │
│                                                             │
│ Document shows "ABC Store" but we found 3 possible matches: │
│                                                             │
│ ○ ABC Store (Bangkok) - Grocery - 12 past transactions     │
│ ○ ABC Store (Phuket) - Convenience - 3 past transactions   │
│ ○ ABC Department Store - Retail - 8 past transactions      │
│ ○ None of these - Create new vendor                        │
│                                                             │
│ [Continue]                                                  │
└────────────────────────────────────────────────────────────┘
```

### 7.3 Matching Conflicts

**Scenario: Document already attached**
```
┌────────────────────────────────────────────────────────────┐
│ ⚠️ Duplicate Document                                       │
│                                                             │
│ This document is already attached to:                       │
│ Transaction #892 - Grab Food - $12.50 - Oct 28, 2025       │
│                                                             │
│ Options:                                                    │
│ ○ View existing transaction                                │
│ ○ This is a different transaction (keep both)              │
│ ○ Replace existing attachment                              │
│                                                             │
│ [Continue]                                                  │
└────────────────────────────────────────────────────────────┘
```

**Scenario: Multiple high-confidence matches**
```
┌────────────────────────────────────────────────────────────┐
│ Review Required: Multiple Matches                           │
│                                                             │
│ Document: Coffee_receipt_Oct27.pdf ($8.75)                  │
│                                                             │
│ Found 2 possible matches with similar confidence:           │
│                                                             │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ○ #887 - Coffee Shop - $8.75 - Oct 27, 9:45 AM        │ │
│ │   Confidence: 88% (time not in document)               │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ○ #890 - Coffee Shop - $8.75 - Oct 27, 2:30 PM        │ │
│ │   Confidence: 86% (time not in document)               │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                             │
│ ○ Neither - create new transaction                          │
│                                                             │
│ [Continue with selected match]                              │
└────────────────────────────────────────────────────────────┘
```

### 7.4 Data Conflicts

**Scenario: Amount mismatch**
```
┌────────────────────────────────────────────────────────────┐
│ ⚠️ Data Conflict: Amount                                    │
│                                                             │
│ Document shows:          Transaction has:                   │
│ $27.50                   $25.00                             │
│                                                             │
│ This could be:                                              │
│ • Tip included in document but not in transaction           │
│ • Different currency conversion rate                        │
│ • Manual entry error                                        │
│ • Wrong transaction match                                   │
│                                                             │
│ How to proceed?                                             │
│ ○ Update transaction to $27.50 (trust document)            │
│ ○ Keep transaction at $25.00 (trust my entry)              │
│ ○ Reject this match and find different transaction         │
│                                                             │
│ [Continue]                                                  │
└────────────────────────────────────────────────────────────┘
```

---

## 8. Mobile Considerations

### 8.1 Mobile-Optimized Features

Given the desktop-first priority, mobile serves specific use cases:

**Primary Mobile Use Case: Quick Receipt Capture**
- Camera access for instant photo capture
- Auto-crop and image enhancement
- Upload to processing queue
- Notification when processing complete
- Redirect to desktop for full reconciliation

**Secondary Mobile Use Case: Quick Review**
- View document library (read-only mostly)
- Approve high-confidence matches on-the-go
- Limited editing capabilities
- Full features deferred to desktop

**Mobile UX Adaptations:**
- Simplified navigation (bottom tab bar)
- Card-based layouts (easier touch targets)
- Swipe gestures for approve/reject
- Minimal multi-column layouts (stack vertically)
- Bottom sheets instead of modals

**Mobile Flow Example:**
```
1. User takes photo of receipt with phone
2. Uploads via mobile camera capture
3. Gets notification: "Receipt processing..."
4. Later notification: "1 new match found - Review now?"
5. Opens app, sees match card
6. If high confidence: Swipes right to approve
7. If low confidence: Taps "Review on desktop" reminder
```

---

## 9. Accessibility Considerations

### 9.1 WCAG 2.1 AA Compliance

**Visual:**
- Color contrast ratio ≥ 4.5:1 for all text
- Confidence badges use icons + color (not color alone)
- High/medium/low indicated by text, not just green/yellow/red
- Document thumbnails include alt text with extracted info
- Zoom support up to 200% without layout breaking

**Keyboard Navigation:**
- All drag-drop areas have "Choose Files" button alternative
- Tab order follows logical reading flow
- Skip links to jump between Unmatched/Matched columns
- Keyboard shortcuts:
  - `A` - Approve selected match
  - `R` - Reject selected match
  - `N` - Next unreviewed item
  - `Esc` - Close modal/detail view

**Screen Reader:**
- Upload progress announced dynamically ("File 1 of 3: 60% uploaded")
- Match confidence read as "High confidence: 95 percent match"
- Status changes announced ("Document attached to transaction 892")
- Document preview images have descriptive alt text
- Form fields have associated labels and error messages

**Focus Management:**
- Modal opens: Focus moves to first interactive element
- Modal closes: Focus returns to trigger button
- Bulk actions: Focus moves to first selected item
- Processing complete: Focus moves to "View matches" button

### 9.2 Inclusive Design

**Low Vision:**
- Large touch targets (minimum 44x44px)
- Clear visual hierarchy with size, weight, spacing
- Optional high contrast mode
- Resizable text without horizontal scrolling

**Cognitive:**
- Progressive disclosure (don't show all options at once)
- Clear status indicators at all times
- Undo available for 30 seconds after bulk actions
- Consistent patterns throughout (approve always green, reject always red)
- Plain language, no jargon

**Motor:**
- Drag-drop not required (always have button alternative)
- Sticky action buttons (don't need to scroll up to approve)
- Confirmation dialogs for destructive actions
- Forgiving click targets (entire card clickable, not just button)

---

## 10. Performance Considerations

### 10.1 Upload Optimization

**Chunked Uploads:**
- Files split into 2MB chunks
- Resume capability if connection drops
- Parallel uploads (max 3 simultaneous)
- Progress aggregation for user feedback

**Background Processing:**
- OCR and extraction run server-side asynchronously
- WebSocket updates for real-time status
- User can navigate away during processing
- Notification when processing complete

**Image Optimization:**
- Client-side compression before upload (JPEG quality 85%)
- Auto-rotate based on EXIF data
- Thumbnail generation on server
- Lazy loading in document library

### 10.2 UI Performance

**Virtual Scrolling:**
- Document library with 1000+ items uses virtual scroll
- Only render visible rows + buffer
- Smooth 60fps scrolling

**Debounced Search:**
- Search input debounced 300ms
- Server-side search with indexing
- Results paginated (50 per page)

**Optimistic UI:**
- Approve action shows success immediately
- Undo available if server request fails
- Background sync for reliability

---

## 11. Implementation Priorities

### Phase 1: MVP (Core Upload & Manual Matching)
1. Upload interface with drag-drop
2. Document processing (OCR, extraction)
3. Manual linking: document → transaction
4. Document library (basic view)
5. Transaction detail: show attached documents

**Success Criteria:**
- Users can upload and manually link documents
- Documents stored and retrievable
- Basic extraction working (amount, date, vendor)

### Phase 2: Automatic Matching
1. Matching algorithm implementation
2. Review queue (matched/unmatched split)
3. Confidence scoring
4. Bulk approve high-confidence
5. Settings for auto-match preferences

**Success Criteria:**
- 80%+ of clear matches identified automatically
- Users save 50%+ time vs manual linking
- False positive rate < 5%

### Phase 3: Advanced Features
1. Statement multi-transaction handling
2. Create transaction from document
3. Vendor profile enrichment
4. Mobile camera capture
5. Conflict resolution workflows

**Success Criteria:**
- Bank statements fully supported
- Vendor profiles automatically enriched
- Mobile capture workflow complete

### Phase 4: Polish & Optimization
1. Advanced search and filtering
2. Batch operations
3. Export capabilities
4. Performance optimization
5. Accessibility audit and fixes

---

## 12. Success Metrics

### User Engagement
- % of transactions with attached documents (target: 60%+)
- Documents uploaded per user per month (target: 15+)
- Time from upload to final reconciliation (target: <3 minutes)

### Matching Accuracy
- Auto-match success rate (target: 85%+)
- False positive rate (target: <5%)
- User override rate (target: <10%)

### Efficiency Gains
- Time saved vs manual entry (target: 70% reduction)
- Clicks to reconcile a document (target: <5 for high confidence)
- % of documents requiring manual review (target: <30%)

### User Satisfaction
- Feature adoption rate (target: 70%+ of active users)
- User-reported accuracy satisfaction (target: 4.5/5)
- Support tickets related to document issues (target: <2% of users)

---

## 13. Future Enhancements

### Email Integration
- Connect Gmail/Outlook account
- Auto-scan inbox for receipts
- Whitelist trusted senders (Grab, Amazon, etc.)
- Automatic forwarding rules

### Smart Categorization
- Learn from user corrections
- Vendor → category mapping
- Recurring transaction detection
- Anomaly detection (unusual amounts)

### Collaborative Features
- Shared household accounts
- Approval workflows (spouse approval)
- Comment threads on documents
- Audit trail for business expenses

### Advanced Parsing
- Line-item extraction (itemized receipts)
- Tax/tip separation
- Multi-currency handling
- Handwritten receipt OCR (premium feature)

### Integrations
- Export to accounting software (QuickBooks, Xero)
- Connect to bank APIs (auto-download statements)
- Tax preparation export
- Expense reimbursement systems

---

## Appendix A: Design Rationale

### Why Split View for Review Queue?
**Decision:** Unmatched (left) | Matched (right) columns

**Rationale:**
- Users need to see both queues simultaneously to understand workload
- Split view prevents context switching between tabs
- Desktop screen space allows side-by-side comparison
- Visual balance: unmatched typically fewer items, matched more numerous

**Alternative Considered:** Tab-based interface
**Rejected because:** Requires clicking to see other queue, loses context

### Why Confidence Badges Instead of Just Scores?
**Decision:** High/Medium/Low badges with colors and icons

**Rationale:**
- Average users don't understand what "83%" means
- Categorical labels are faster to scan
- Colors provide quick visual distinction
- Accessibility: text + color + icon
- Reduces cognitive load during bulk review

**Alternative Considered:** Just showing percentage scores
**Rejected because:** Requires users to interpret numbers, slower decision-making

### Why Allow Multiple Documents per Transaction?
**Decision:** Transactions can have unlimited document attachments

**Rationale:**
- Real-world scenario: Order confirmation email + shipping receipt + invoice
- Bank statements can attach to multiple transactions
- Audit trail completeness
- Users might upload corrected/updated receipts

**Alternative Considered:** One document per transaction
**Rejected because:** Too restrictive, doesn't match real-world use

### Why Desktop-First Despite Mobile Camera Advantage?
**Decision:** Full features on desktop, mobile for quick capture only

**Rationale:**
- User confirmed desktop priority
- Reconciliation requires careful review (better on large screen)
- Side-by-side comparison difficult on mobile
- Mobile camera still available for receipt capture
- Most personal finance management happens at desk/computer

### Why User Preference for Auto-Match Threshold?
**Decision:** Let users choose their automation comfort level

**Rationale:**
- User risk tolerance varies (cautious vs trusting)
- Financial data is sensitive (users want control)
- Power users can save more time with higher automation
- New users can start manual, increase automation as they trust system

**Alternative Considered:** Fixed threshold for all users
**Rejected because:** One size doesn't fit all for financial data

---

## Appendix B: Technical Considerations

### Document Storage
- Cloud storage: AWS S3 or similar
- Encryption at rest and in transit
- Retention policy: Keep forever vs auto-delete after X years?
- File size limits: 10MB per file, 100MB per batch upload
- Supported formats: PDF, JPEG, PNG, EML, MSG

### OCR & Extraction
- OCR engine: Tesseract, Google Vision API, or AWS Textract
- Extraction logic: Rule-based + ML models
- Vendor-specific parsers (Grab, Lazada, etc. have consistent formats)
- Confidence scoring algorithm
- Fallback to manual entry for failed extractions

### Matching Algorithm
- Fuzzy matching for vendor names (Levenshtein distance)
- Date tolerance: ±2 days default
- Amount tolerance: Exact match or within ±2% for currency conversion
- Transaction type compatibility check
- Multiple signals weighted for confidence score

### Data Privacy
- User owns their documents (GDPR compliance)
- Option to delete all documents
- Anonymized extraction for ML training (user consent required)
- Secure document sharing (if collaborative features added)
- No third-party tracking in document viewer

### API Design
- RESTful endpoints for CRUD operations
- WebSocket for real-time processing updates
- Batch operations endpoint for bulk approvals
- Rate limiting to prevent abuse
- Webhook support for integrations

---

## Appendix C: User Research Questions (For Future Validation)

Before building, validate these assumptions:

1. **Upload Behavior:**
   - How often do users keep physical/digital receipts today?
   - What triggers them to upload receipts (daily, weekly, monthly)?
   - What receipt types are most important to them?

2. **Trust & Control:**
   - What confidence level makes users comfortable with auto-approval?
   - How much detail do they want in matching explanations?
   - What would make them distrust the matching system?

3. **Vendor Information:**
   - What vendor data is most valuable? (Logo, contact, category?)
   - Would they use vendor profiles for anything beyond transaction tagging?
   - How important is vendor consistency across transactions?

4. **Reconciliation Priorities:**
   - Do they prioritize speed (bulk approve) or accuracy (review all)?
   - How important is it to have proof documents vs just having accurate data?
   - What would they do with a document library (search by date, vendor, amount)?

5. **Mobile vs Desktop:**
   - Would they ever do full reconciliation on mobile?
   - Is mobile camera capture valuable or would they just scan/forward emails?
   - What mobile features are must-haves vs nice-to-haves?

---

## Document Control

**Version:** 1.0
**Last Updated:** October 29, 2025
**Next Review:** After user testing of Phase 1 MVP

**Change Log:**
- v1.0 (Oct 29, 2025): Initial comprehensive design document
