# Smart Transaction Proposals — Design Specification

**Feature:** Smart Transaction Proposals
**Location:** `/imports/review` (Review Queue)
**Status:** Design spec — not yet implemented
**Date:** 2026-03-07
**Author:** UX Design

---

## Table of Contents

1. [Overview](#1-overview)
2. [Design Principles](#2-design-principles)
3. [Data Model Extensions](#3-data-model-extensions)
4. [Component Architecture](#4-component-architecture)
5. [Enhanced MatchCard for New Transactions](#5-enhanced-matchcard-for-new-transactions)
6. [Confidence Bar Component](#6-confidence-bar-component)
7. [Field-Level Confidence Indicators](#7-field-level-confidence-indicators)
8. [Enhanced CreateFromImportDialog](#8-enhanced-createfromimportdialog)
9. [Action Button Logic](#9-action-button-logic)
10. [Batch Quick Create](#10-batch-quick-create)
11. [Post-Creation Feedback States](#11-post-creation-feedback-states)
12. [Stale Proposal Indicator](#12-stale-proposal-indicator)
13. [Loading and Error States](#13-loading-and-error-states)
14. [Responsive Behavior](#14-responsive-behavior)
15. [Accessibility Requirements](#15-accessibility-requirements)
16. [Integration Points](#16-integration-points)
17. [Open Questions](#17-open-questions)

---

## 1. Overview

The Review Queue at `/imports/review` currently shows "New Transaction" cards with only raw import data (statement description, amount, date) and a placeholder "No matching transaction found" message on the right panel. Users must open the `CreateFromImportDialog` with minimal pre-fill context and manually enter all enrichment fields (vendor, tags, payment method, transaction type).

This feature adds AI-generated **Smart Proposals** to new transaction cards. A proposal is a structured data object representing the system's best guess at what the final transaction should look like — including vendor, tags, payment method, and transaction type — each with a per-field confidence score and reasoning text.

The goal is to reduce the cognitive overhead of the "New Transactions" section by letting high-quality proposals flow through with a single action, while keeping the user fully in control through clear confidence signaling and easy modification.

### What Stays the Same

- The two-section layout ("Proposed Matches" / "New Transactions") in `ReviewQueuePage`
- The `MatchCard` component structure: `CardHeader`, `CardContent`, `CardFooter`
- The left panel of `MatchCardPanels` (raw import data display)
- The purple `new-transaction` variant styling (`border-purple-400`, `bg-purple-50`)
- The existing `SmartPreFillHints` and AI lightning bolt pattern in `CreateFromImportDialog`
- All existing action callbacks (`onCreateAsNew`, `onLinkManually`, `onReject`)

### What Changes

| Area | Change |
|---|---|
| `MatchCardData` type | Add optional `proposal` field |
| `MatchCardPanels` right panel | Replace "No matching transaction found" placeholder with proposal preview |
| `MatchCardActions` | Conditional "Quick Create" button and modified primary button label |
| `CreateFromImportDialog` | Field-level confidence tooltips, vendor suggestions, tag chips, transaction type toggle |
| `ReviewQueuePage` | Batch Quick Create action, `handleQuickCreate` callback |
| New component: `ProposalPanel` | Standalone right-panel content for proposals |
| New component: `ProposalConfidenceBar` | Visual confidence bar shown below the panels |
| API: `/api/imports/queue` | Proposal data included in queue item response |

---

## 2. Design Principles

**Confidence transparency.** The system's confidence is shown at two levels: per-field (within the proposal panel and the dialog) and overall (the confidence bar). Users should never be surprised by what gets created.

**Progressive disclosure.** High-confidence proposals default to the quickest path (Quick Create). Low-confidence proposals always require dialog review. Medium proposals offer both options.

**Non-destructive defaults.** Quick Create never bypasses undo. Every quick-create action produces an immediate undo toast (using the existing `sonner` toast library), consistent with the pattern used elsewhere in the app.

**Modification awareness.** The system detects when a user changes proposal values in the dialog and records this in the post-creation badge (see Section 11). This creates a feedback loop for future model improvement.

**Color continuity.** The proposal panel uses the existing purple AI system color (`text-purple-600`, `border-purple-200`, `bg-purple-50`) established by the `SmartPreFillHints` pattern in `CreateFromImportDialog`. Field-level confidence degradation uses the existing amber/orange system from the match card confidence tiers.

---

## 3. Data Model Extensions

### 3.1 ProposedField

A single AI-proposed field value with confidence metadata.

```typescript
interface ProposedField<T> {
  value: T
  confidence: number        // 0-100
  reasoning: string         // Human-readable explanation for tooltip
}
```

**Examples:**
- `{ value: "grab-vendor-uuid", confidence: 92, reasoning: "Matched 'GRAB CAR' to vendor 'Grab' based on 47 similar transactions" }`
- `{ value: "transport-tag-uuid", confidence: 78, reasoning: "Transportation tag applied to 89% of Grab transactions" }`
- `{ value: "expense", confidence: 95, reasoning: "Negative amount indicates an expense" }`

### 3.2 TransactionProposal

The full proposal object attached to a queue item.

```typescript
interface TransactionProposal {
  /** Database ID of the proposal (used for PATCH updates) */
  id: string

  /** Overall confidence score for the proposal as a whole (0-100) */
  overallConfidence: number

  /** ISO timestamp when this proposal was generated */
  generatedAt: string

  /** Which engine generated this proposal */
  engine: 'rule_based' | 'llm' | 'hybrid'

  /** Current status of this proposal */
  status: 'pending' | 'accepted' | 'modified' | 'rejected' | 'stale'

  /** Proposed vendor (id is null when suggesting a new vendor name not yet in the DB) */
  vendor?: ProposedField<{
    id: string | null
    name: string
    /** Alternative candidates when confidence is low */
    alternatives?: Array<{ id: string; name: string; confidence: number }>
  }>

  /** Proposed amount — typically mirrors import data, confidence reflects currency conversion certainty */
  amount?: ProposedField<number>

  /** Proposed currency */
  currency?: ProposedField<string>

  /** Proposed date — typically mirrors import data */
  date?: ProposedField<string>

  /** Proposed payment method */
  paymentMethod?: ProposedField<{
    id: string
    name: string
  }>

  /** Proposed tags */
  tags?: ProposedField<Array<{
    id: string
    name: string
  }>>

  /** Proposed transaction type */
  transactionType?: ProposedField<"expense" | "income">

  /** Proposed human-readable description */
  description?: ProposedField<string>
}
```

### 3.3 MatchCardData Extension

Add `proposal` as an optional field to the existing `MatchCardData` interface in `src/components/page-specific/match-card/types.ts`:

```typescript
export interface MatchCardData {
  // ...existing fields unchanged...
  proposal?: TransactionProposal
}
```

No breaking changes — the field is optional. All existing `new-transaction` cards without proposals fall back to current behavior.

### 3.4 ProposalStatus

Track the loading/availability state of a proposal separately from the queue item status. This is a UI-layer concern; it does not need to be persisted.

```typescript
type ProposalStatus =
  | "loading"    // Proposal is being generated (show skeleton)
  | "available"  // Proposal exists on the item
  | "failed"     // Generation attempt failed (show retry)
  | "absent"     // No proposal and none attempted (legacy behavior)
```

---

## 4. Component Architecture

The changes are additive. No existing components are removed or renamed.

```
ReviewQueuePage
├── MatchCard (existing, extended)
│   ├── MatchCardHeader (unchanged)
│   ├── MatchCardPanels (modified — right panel branch)
│   │   ├── [existing] Left panel: import data
│   │   └── [new] ProposalPanel (replaces "No matching transaction found")
│   │       └── ProposedFieldRow (per-field row with confidence dot)
│   ├── [new] ProposalConfidenceBar (below panels, above reasons)
│   ├── MatchCardReasons (unchanged)
│   └── MatchCardActions (modified — Quick Create button logic)
│
├── CreateFromImportDialog (modified — proposal-aware)
│   ├── [existing] AI pre-fill banner
│   ├── [new] Field-level confidence tooltips on Zap icon
│   ├── [new] Vendor suggestion chips (when vendor confidence < 60)
│   ├── [new] Tag suggestion chips (below tag field)
│   └── [new] TransactionTypeToggle (expense / income)
│
└── [new] BatchQuickCreateDialog
    └── (mirrors BatchApproveDialog pattern exactly)
```

---

## 5. Enhanced MatchCard for New Transactions

### 5.1 Right Panel — ProposalPanel

When `data.isNew === true` and `data.proposal` is defined, replace the current placeholder in `MatchCardPanels` with `ProposalPanel`.

**Current code path (to be replaced for this case only):**
```
// src/components/page-specific/match-card/match-card-panels.tsx, lines 357-363
{data.isNew && data.source !== "merged" && (
  <div className="space-y-1.5 md:border-l md:pl-3 flex items-center justify-center">
    <p className="text-sm text-muted-foreground italic">
      No matching transaction found
    </p>
  </div>
)}
```

**Replacement logic:**
```
if data.isNew && data.source !== "merged":
  if data.proposal:
    render <ProposalPanel proposal={data.proposal} />
  else:
    render existing placeholder (no change)
```

### 5.2 ProposalPanel Layout

The panel lives in `md:border-l md:pl-3` to match the existing matched transaction panel structure.

```
PROPOSED TXN  ⚡
─────────────────────────────────
[calendar]  Feb 14, 2026
[store]     Grab
[dollar]    $12.50 USD
[credit]    Chase CC           [amber dot]
[tag]       Transport          [amber dot]
            Food & Drink
[type]      Expense
```

- The section label is "Proposed Txn" with a `Zap` icon in `text-purple-500` (matches existing AI color)
- Each row uses the existing `TransactionDetailRow` component from `src/components/ui/transaction-detail-row`
- Confidence dots appear to the right of the field value (see Section 7)
- Tags render as stacked small badges using `Badge` from `shadcn/ui` with `variant="secondary"`
- Multiple tags stack vertically within the row; limit display to 3, then "+N more" if needed

### 5.3 Full Card Layout Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  [checkbox]  New Transaction  [purple dot]  chase_feb_2026   │  CardHeader
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  FROM STATEMENT  [eye] [link]  │  PROPOSED TXN  ⚡           │  CardContent
│  ─────────────────────────────┼──────────────────────────   │
│  [cal]  Feb 14, 2026          │  [cal]  Feb 14, 2026        │
│  [txt]  GRAB CAR 2/14         │  [str]  Grab                │
│  [$]    $12.50 USD            │  [$]    $12.50 USD          │
│                               │  [cc]   Chase CC   [amber]  │
│                               │  [tag]  Transport  [amber]  │
│                               │         Food & Drink        │
│                               │  [type] Expense             │
│                                                              │
│  ████████████░░  85%  Proposal Confidence                    │  ProposalConfidenceBar
│                                                              │
│  • Vendor matched from 47 similar "GRAB CAR" transactions   │  MatchCardReasons
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  [Quick Create ⚡]  [Create as New ⚡]  [Link to Existing]  [Skip] │  CardFooter
└──────────────────────────────────────────────────────────────┘
```

**Mobile (stacked):**
```
┌─────────────────────────────────┐
│  New Transaction [purple dot]   │  CardHeader
│  chase_feb_2026                 │
├─────────────────────────────────┤
│  FROM STATEMENT  [eye] [link]   │
│  Feb 14, 2026                   │
│  GRAB CAR 2/14                  │
│  $12.50 USD                     │
│                                 │
│  PROPOSED TXN  ⚡               │
│  Feb 14, 2026                   │
│  Grab                           │
│  $12.50 USD                     │
│  Chase CC      [amber dot]      │
│  Transport     [amber dot]      │
│  Expense                        │
│                                 │
│  ████████░░  85%                │
├─────────────────────────────────┤
│  [Quick Create ⚡]              │
│  [Create as New ⚡]  [Skip]     │
└─────────────────────────────────┘
```

---

## 6. Confidence Bar Component

### 6.1 ProposalConfidenceBar

A new sub-component rendered inside `CardContent`, between `MatchCardPanels` and `MatchCardReasons`.

Only rendered when `data.isNew && data.proposal`.

**Visual:**
```
████████████░░░░  78%  Proposal Confidence
```

**Spec:**
- Use the existing `Progress` component from `src/components/ui/progress` (already used in `BatchApproveDialog`)
- Bar color adapts to overall confidence:
  - `>= 85`: `[&>div]:bg-green-500`
  - `55-84`: `[&>div]:bg-amber-500`
  - `< 55`: `[&>div]:bg-orange-500`
- Label: `"{score}% Proposal Confidence"` in `text-xs text-muted-foreground`
- The score shown is `data.proposal.overallConfidence`
- `aria-label="Proposal confidence: {score} out of 100"`

**Tailwind classes:**
```
<div className="space-y-1">
  <div className="flex items-center justify-between">
    <span className="text-xs text-muted-foreground">Proposal Confidence</span>
    <span className="text-xs font-medium text-muted-foreground">{score}%</span>
  </div>
  <Progress
    value={score}
    className="h-1.5 [&>div]:transition-none"
    aria-label={`Proposal confidence: ${score} out of 100`}
  />
</div>
```

---

## 7. Field-Level Confidence Indicators

### 7.1 Confidence Dot

Each `ProposedFieldRow` may show a confidence dot to the right of its value. The dot is omitted when field confidence is >= 80 (high confidence — no visual noise needed).

| Field Confidence | Dot Color | Additional |
|---|---|---|
| >= 80 | None | No indicator |
| 50-79 | `bg-amber-400` | Amber dot |
| < 50 | `bg-orange-400` | Orange dot + `?` character in text |

**Implementation:** A small `span` element, `h-2 w-2 rounded-full inline-block ml-1.5 shrink-0`, with `aria-label="Medium confidence"` or `aria-label="Low confidence"`.

### 7.2 ProposedFieldRow Component

Wraps `TransactionDetailRow` with an optional confidence dot.

```typescript
interface ProposedFieldRowProps {
  icon: React.ReactNode
  value: React.ReactNode
  confidence?: number   // 0-100; omit to show no dot
  className?: string
}
```

The component renders the dot only when `confidence !== undefined && confidence < 80`.

### 7.3 Proposal Panel Section Label

```
PROPOSED TXN  ⚡
```

Uses the existing pattern:
```
<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
  Proposed Txn
  <Zap className="h-3 w-3 text-purple-500" />
</p>
```

---

## 8. Enhanced CreateFromImportDialog

### 8.1 Proposal-Aware Pre-fill

When `CreateFromImportDialog` is opened from a card that has a `proposal`, the `CreateFromImportData` payload (already passed via `setCreateDialogData` in `ReviewQueuePage`) must be extended to include proposal data.

**Extend `CreateFromImportData`:**
```typescript
export interface CreateFromImportData {
  compositeId: string
  description: string
  amount: number
  currency: string
  date: string
  paymentMethodId?: string
  smartHints?: SmartPreFillHints
  // NEW:
  proposal?: TransactionProposal
}
```

All proposal fields are pre-filled using the same `aiPrefilled` Set mechanism already in place. The `proposal` fields populate identically to `smartHints` fields, but with richer metadata available for tooltips.

### 8.2 Field-Level Confidence Tooltips

When `aiPrefilled` contains a field that originated from the proposal, hovering over the `Zap` icon shows a tooltip with `reasoning` text from the `ProposedField`.

**Implementation pattern:**
- Wrap the `<Zap>` icon in a `Tooltip` + `TooltipContent` from `shadcn/ui`
- Tooltip content = `proposedField.reasoning`
- Tooltip trigger = the `Zap` icon element itself
- Tooltip is keyboard-accessible (focus shows tooltip)

**Example tooltip text:**
- Vendor: `"Matched 'GRAB CAR' to vendor 'Grab' based on 47 similar transactions"`
- Payment method: `"Bangkok Bank payment method inferred from parser key 'bangkok-bank'"`
- Tags: `"Transportation tag applied to 89% of Grab transactions"`

**Tailwind for tooltip content:**
```
max-w-xs text-xs text-left leading-relaxed
```

### 8.3 Vendor Suggestion Chips

When the proposed vendor has `confidence < 60` and `vendor.value.alternatives` is non-empty, show a suggestion row below the vendor field:

```
Did you mean:  [Grab]  [Grabfood]
```

- "Did you mean:" label: `text-xs text-muted-foreground`
- Each chip: `Badge` with `variant="outline"` + `cursor-pointer hover:bg-accent`
- Clicking a chip: sets the vendor field to that alternative, clears AI flag for vendor, fires `clearAiFlag("vendor")`
- Maximum 3 chips shown; if more alternatives exist, they are truncated silently

**Layout:**
```
<div className="space-y-1.5">
  <Label>Vendor</Label>
  <div className="relative">
    <SearchableComboBox ... />
    {zapIcon}
  </div>
  {showSuggestions && (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-muted-foreground">Did you mean:</span>
      {alternatives.map(alt => (
        <Badge
          key={alt.id}
          variant="outline"
          className="cursor-pointer hover:bg-accent text-xs"
          onClick={() => selectVendorAlternative(alt)}
        >
          {alt.name}
        </Badge>
      ))}
    </div>
  )}
</div>
```

### 8.4 Tag Suggestion Chips

Below the tag `MultiSelectComboBox`, show unselected proposed tags as clickable chips:

```
Suggested:  [+ Transport]  [+ Food & Drink]
```

- Only show tags that are not already in the selected `tags` state
- "Suggested:" label: `text-xs text-muted-foreground`
- Each chip: `Badge` with `variant="secondary"` + `cursor-pointer` + `+` prefix in the label
- Clicking adds the tag to the `tags` array (same as selecting from the multi-select)
- Chip disappears immediately once the tag is selected
- The `aiPrefilled` Set is not affected by chip clicks (tags were already AI-prefilled)

**Layout:**
```
<div className="space-y-1.5">
  <Label>Tags</Label>
  <MultiSelectComboBox ... />
  {suggestedTags.length > 0 && (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-muted-foreground">Suggested:</span>
      {suggestedTags.map(tag => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="cursor-pointer hover:bg-secondary/80 text-xs"
          onClick={() => addSuggestedTag(tag.id)}
        >
          + {tag.name}
        </Badge>
      ))}
    </div>
  )}
</div>
```

### 8.5 Transaction Type Toggle

Add a transaction type toggle above the description field (first form field). This field does not currently exist in `CreateFromImportDialog`.

**Visual:**
```
Type
[Expense]  [Income]
```

- Implemented as two `Button` elements in a segmented control pattern
- Active state: `bg-purple-600 text-white` (expense) or `bg-green-600 text-white` (income)
- Inactive state: `variant="outline"`
- Pre-selected from `proposal.transactionType.value` when proposal is available
- If no proposal: defaults to `"expense"` (matching current hardcoded behavior in `handleConfirm`)
- When AI-prefilled from proposal: show the Zap icon to the right of the active button (same absolute positioning pattern as other fields)
- Modifying (clicking the non-active button) clears the AI flag for `transactionType`

**Layout:**
```
<div className="space-y-1.5">
  <Label>Type</Label>
  <div className="relative flex gap-2">
    <Button
      type="button"
      size="sm"
      variant={transactionType === "expense" ? "default" : "outline"}
      className={transactionType === "expense" ? "bg-purple-600 hover:bg-purple-700" : ""}
      onClick={() => { setTransactionType("expense"); clearAiFlag("transactionType") }}
    >
      Expense
    </Button>
    <Button
      type="button"
      size="sm"
      variant={transactionType === "income" ? "default" : "outline"}
      className={transactionType === "income" ? "bg-green-600 hover:bg-green-700" : ""}
      onClick={() => { setTransactionType("income"); clearAiFlag("transactionType") }}
    >
      Income
    </Button>
    {aiPrefilled.has("transactionType") && (
      <span className="self-center ml-1 text-purple-500">
        <Zap className="h-3.5 w-3.5" />
      </span>
    )}
  </div>
</div>
```

### 8.6 Modified onConfirm Payload

The `transactionType` field in the `onConfirm` payload is currently hardcoded to `"expense"`. Replace the hardcoded value with the `transactionType` state variable.

```typescript
// Before
transactionType: "expense",

// After
transactionType: transactionType,  // from state, defaulting to "expense"
```

### 8.7 Modification Tracking

Track whether the user modified any proposal-derived field before submitting. This is needed for the post-creation feedback badge (Section 11).

Add a `modifiedProposalFields` Set alongside `aiPrefilled`. A field enters this set when the user changes it while `aiPrefilled` still contains it (i.e., the user changed an AI-suggested value, not a blank field). The set is passed to `onConfirm` for upstream use.

```typescript
// Extend onConfirm signature (current signature has only compositeId + transactionData)
onConfirm: (
  compositeId: string,
  transactionData: { ... },
  meta: {
    proposalId?: string
    proposalFieldsModified: boolean
    modifiedFields?: Record<string, { from: unknown; to: unknown }>
  }
) => Promise<void>
```

---

## 9. Action Button Logic

### 9.1 Decision Tree

The action buttons for `new-transaction` variant change based on proposal presence and overall confidence.

```
Is data.isNew?
  YES:
    Does data.proposal exist?
      NO  → Current behavior: [Create as New] [Link to Existing] [Skip]
      YES:
        overallConfidence >= 85?
          YES → [Quick Create ⚡] [Create as New ⚡] [Link to Existing] [Skip]
          NO, confidence >= 50?
            YES → [Create as New ⚡] [Link to Existing] [Skip]
            NO (< 50) → [Review & Create] [Link to Existing] [Skip]
```

### 9.2 Button Definitions

**Quick Create ⚡**
- Only shown when `overallConfidence >= 85`
- `variant="default"`, `className="bg-purple-600 hover:bg-purple-700"`
- Icon: `Zap` from lucide-react
- On click: calls `onQuickCreate(id)` (new callback — see Section 9.3)
- Position: leftmost (primary action)

**Create as New ⚡** (proposal present, confidence 50-84)
- Replaces existing "Create as New" label when proposal is present
- `variant="default"`, `className="bg-purple-600 hover:bg-purple-700"` (matching existing style)
- Icon: `Zap` instead of `Plus`
- Opens `CreateFromImportDialog` with proposal data pre-filled
- When Quick Create is also shown, this button is `variant="outline"` (secondary)

**Review & Create** (confidence < 50)
- Used when proposal exists but confidence is too low to suggest quick creation
- `variant="default"`, `className="bg-orange-600 hover:bg-orange-700"` (matching existing low-confidence style)
- Icon: `Eye` from lucide-react
- Always opens `CreateFromImportDialog` — never bypasses review

**Link to Existing** — unchanged
**Skip** — unchanged

### 9.3 MatchCardCallbacks Extension

Add `onQuickCreate` to `MatchCardCallbacks` and `MatchCardProps`:

```typescript
export interface MatchCardCallbacks {
  // ...existing callbacks...
  onQuickCreate?: (id: string) => void
}
```

### 9.4 VARIANT_ACTIONS Update

The `VARIANT_ACTIONS` config object in `match-card-actions.tsx` currently has a static entry per variant. The `new-transaction` variant now needs to be dynamic based on proposal data.

Rather than adding variant sub-types, pass `proposal` as a prop to `MatchCardActions` and compute the action list at render time. This avoids polluting the variant type system.

```typescript
interface MatchCardActionsProps {
  id: string
  variant: MatchCardVariant
  status: "pending" | "approved" | "rejected" | "imported"
  loading: boolean
  callbacks: MatchCardCallbacks
  hasMatchedTransaction?: boolean
  // NEW:
  proposal?: TransactionProposal
}
```

Inside the component, when `variant === "new-transaction" && proposal`:
- Compute `confidence = proposal.overallConfidence`
- Build action list inline based on the decision tree in Section 9.1

---

## 10. Batch Quick Create

### 10.1 Trigger

In `ReviewQueuePage`, alongside the existing "Link All High (N)" button for matches, add a "Quick Create All (N)" button for the "New Transactions" section header.

The button appears when there are 2 or more pending new transaction items with `proposal.overallConfidence >= 85`.

```
New Transactions (12)                        [Quick Create All (5) ⚡]
```

- `className="bg-purple-600 hover:bg-purple-700"`, `size="sm"`
- Icon: `Zap`

### 10.2 BatchQuickCreateDialog

A new dialog component modeled directly after `BatchApproveDialog`. Reuse `BatchApproveDialog` with custom `title` and `description` props, or create `BatchQuickCreateDialog` if the content differs enough to warrant it.

**Dialog content:**
```
Quick Create 5 Transactions

The following transactions will be created using AI proposals.
You can undo any of them individually after creation.

Source breakdown: 3 from email, 2 from statement

  GRAB CAR 2/14     $12.50    Feb 14  [confidence: 91%]
  STARBUCKS 2/15    $6.80     Feb 15  [confidence: 88%]
  7-ELEVEN 2/16     $3.20     Feb 16  [confidence: 85%]
  ...

[Cancel]                    [Create 5 Transactions ⚡]
```

- Each row in the list shows: description, amount, date, confidence percentage
- The "Create" button is `bg-purple-600 hover:bg-purple-700`
- On confirm: calls `onBatchQuickCreate(ids)` in `ReviewQueuePage`

### 10.3 Undo Behavior

After batch quick create:
- Each created transaction emits a separate undo toast (using `sonner`) with a 6-second window
- Toast format: `"Created {vendorName || description}" [Undo]`
- Undo calls a DELETE on the created transaction and resets the queue item status to `"pending"`

If the queue has > 5 items created at once, consolidate into a single toast: `"Created 7 transactions [Undo all]"` — undo all deletes all 7.

---

## 11. Post-Creation Feedback States

These replace or augment the existing approved/rejected status rendering in `MatchCardActions`.

### 11.1 Created Without Modification

When a transaction was created from a proposal and no proposal fields were changed:

```
[green check]  Created
```

- `className="flex items-center gap-1 text-sm text-green-600"`
- Icon: `Check` from lucide-react
- Text: "Created"

This is the same visual as the existing "Linked" state. No change needed if `meta.proposalFieldsModified === false`.

### 11.2 Created With Modification

When the user modified one or more AI-proposed fields before creating:

```
[amber check]  Created (modified)
```

- `className="flex items-center gap-1 text-sm text-amber-600"`
- Icon: `Check` from lucide-react
- Text: "Created (modified)"

**Implementation:** The `meta.proposalFieldsModified` boolean (from Section 8.7) is stored on the queue item update. `ReviewQueuePage.handleCreateConfirm` receives this from the dialog and stores it in local state (keyed by item ID) for rendering.

A new optional field on `MatchCardData`:
```typescript
proposalModified?: boolean  // set after creation
```

When `status === "imported"` and `proposalModified === true`, render the amber variant instead of green.

---

## 12. Stale Proposal Indicator

### 12.1 Trigger Condition

A proposal is considered stale when:
- The transaction count in the user's database increased after `proposal.generatedAt`
- OR the queue was refreshed via the "Refresh" button after proposals were generated

The staleness check happens server-side. The API response includes `proposalIsStale: boolean` on queue items where applicable.

### 12.2 Visual

A small chip shown in the `ProposalPanel` section, below the last field row:

```
[rotate-icon]  Refresh proposal
```

- `className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground"`
- Icon: `RefreshCw` at `h-3 w-3`
- On click: calls `onRefreshProposal(id)` — new callback, triggers a targeted API call to regenerate just this item's proposal
- The chip disappears and the right panel enters `"loading"` state (skeleton shimmer) during regeneration

---

## 13. Loading and Error States

### 13.1 Proposal Loading (right panel)

When `proposalStatus === "loading"` for a `new-transaction` item, the right panel shows a skeleton shimmer in place of `ProposalPanel`:

```
PROPOSED TXN  ⚡
────────────────────────────
[shimmer bar — 60% width]
[shimmer bar — 80% width]
[shimmer bar — 45% width]
[shimmer bar — 70% width]

Generating proposal...
```

- Use the existing `Skeleton` component from `shadcn/ui`
- Label below shimmer: `"Generating proposal..."` in `text-xs text-muted-foreground italic`
- The `ProposalConfidenceBar` is not shown during loading
- `MatchCardActions` shows the no-proposal action set during loading (no Quick Create)

### 13.2 Proposal Failed (right panel)

When `proposalStatus === "failed"`:

```
PROPOSED TXN  ⚡
────────────────────────────
Could not generate proposal.
[Retry]
```

- Text: `text-sm text-muted-foreground`
- Retry button: `variant="ghost"`, `size="sm"`, calls `onRefreshProposal(id)`
- The card still functions normally — user can "Create as New" (opens dialog with standard pre-fill only)

### 13.3 No Proposal (absent)

Falls back entirely to current behavior. The right panel shows "No matching transaction found" and actions show `[Create as New] [Link to Existing] [Skip]` — no Zap icon on the button, no confidence bar.

---

## 14. Responsive Behavior

### 14.1 Desktop (md and above)

The two-panel layout (`grid-cols-1 md:grid-cols-2`) is already handled by `MatchCardPanels`. `ProposalPanel` occupies the right column with `md:border-l md:pl-3` — matching the existing `matchedTransaction` panel style exactly.

The `ProposalConfidenceBar` spans the full card width below both panels, inside `CardContent`.

Action buttons in `CardFooter` are `flex-wrap` (already set), so the Quick Create + Create as New + Link to Existing + Skip row wraps naturally on narrower desktop widths.

### 14.2 Mobile (below md)

The grid collapses to a single column. `ProposalPanel` appears below the left (import data) panel with no border separator. Add a top border instead on mobile:

```
<div className="space-y-1.5 border-t pt-3 md:border-t-0 md:pt-0 md:border-l md:pl-3">
```

Action buttons in `CardFooter`: Quick Create takes full width on the first row (`w-full`), secondary buttons share the second row.

```
[Quick Create ⚡          ]
[Create as New ⚡]  [Skip]
```

This matches the mobile pattern used for the primary action in other card variants.

### 14.3 Dialog (CreateFromImportDialog)

Dialog is already `max-w-md max-h-[90vh] overflow-y-auto` with full-screen behavior on mobile (handled by the existing `Dialog` component). No changes needed to the dialog's responsive behavior.

---

## 15. Accessibility Requirements

### 15.1 Confidence Dots

Every confidence dot must have an `aria-label`:
- Amber: `aria-label="Medium confidence"`
- Orange: `aria-label="Low confidence"`

Dots are `role="img"` elements, not interactive. They convey supplemental information already present in the tooltip (when in the dialog) or in the confidence bar (on the card).

### 15.2 Confidence Bar

```html
<div
  role="meter"
  aria-valuenow={score}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={`Proposal confidence: ${score} out of 100`}
>
```

### 15.3 Lightning Bolt Icons (Zap)

In the dialog, Zap icons are wrapped in `Tooltip`. The `TooltipTrigger` must be keyboard-focusable. Use `tabIndex={0}` on the wrapping `span` if the icon is not inside a button.

On the card (ProposalPanel section label and action buttons), Zap icons are decorative when accompanied by text. Add `aria-hidden="true"` to the icon element and ensure the button label includes the word that conveys the meaning (e.g., "Quick Create" — the Zap is decorative).

### 15.4 Vendor Suggestion Chips

Suggestion chips are interactive. Each `Badge` acting as a button must:
- Use `role="button"` or be rendered as `<button>` (preferred)
- Have `tabIndex={0}`
- Support `onKeyDown` for Enter/Space activation
- Have an accessible label: `aria-label="Select vendor {name}"`

### 15.5 Transaction Type Toggle

Each toggle button must:
- Communicate selected state with `aria-pressed={transactionType === "expense"}` / `aria-pressed={transactionType === "income"}`
- Group both buttons in a `role="group"` with `aria-label="Transaction type"`

### 15.6 Color-Only Rule

No information is conveyed by color alone:
- Amber confidence dot: always paired with `aria-label` text
- Orange confidence dot: always paired with `aria-label` text + a `?` character in the displayed value
- Green/amber post-creation badge: always paired with the text "Created" or "Created (modified)"
- Confidence bar color: the numeric score is always shown as text alongside the bar

---

## 16. Integration Points

### 16.1 API — Queue Response

The `/api/imports/queue` endpoint must include `proposal` in each queue item where proposals have been generated.

Proposals are generated asynchronously (not on queue-load). The response should include:

```json
{
  "id": "stmt-abc-123",
  "isNew": true,
  "proposal": {
    "overallConfidence": 85,
    "generatedAt": "2026-03-07T10:00:00Z",
    "vendor": {
      "value": { "id": "uuid", "name": "Grab", "alternatives": [] },
      "confidence": 92,
      "reasoning": "Matched 'GRAB CAR' to vendor 'Grab' based on 47 similar transactions"
    },
    "paymentMethod": {
      "value": { "id": "uuid", "name": "Chase CC" },
      "confidence": 65,
      "reasoning": "Inferred from statement source 'chase_feb_2026.pdf'"
    },
    "tags": {
      "value": [{ "id": "uuid", "name": "Transport" }],
      "confidence": 72,
      "reasoning": "Transportation tag applied to 89% of Grab transactions"
    },
    "transactionType": {
      "value": "expense",
      "confidence": 99,
      "reasoning": "Negative amount indicates an expense"
    }
  },
  "proposalIsStale": false
}
```

If no proposal exists yet, `proposal` is `null` or omitted.

### 16.2 API — Quick Create

`onQuickCreate` in `ReviewQueuePage` calls a new endpoint (or extends the existing create-and-link endpoint) that:
1. Accepts `{ compositeId, useProposal: true }`
2. Creates the transaction using proposal field values
3. Links the import item to the new transaction
4. Returns the created transaction ID for the undo toast

### 16.3 API — Batch Quick Create

`onBatchQuickCreate` calls the same endpoint in a batch mode:
```json
{
  "items": [
    { "compositeId": "...", "useProposal": true },
    ...
  ]
}
```

Returns an array of `{ compositeId, transactionId }` pairs for constructing undo toasts.

### 16.4 API — Proposal Regeneration

`onRefreshProposal(id)` calls the generate endpoint with `force: true` (see FEATURE_SPEC.md Section 6):
```
POST /api/imports/proposals/generate
{ "compositeIds": ["..."], "force": true }
```

Returns the updated proposal data. The `ReviewQueuePage` updates the item in local state via `updateItemByKey`.

### 16.5 handleCreateAsNew Extension (ReviewQueuePage)

The existing `handleCreateAsNew` function currently builds `CreateFromImportData` without proposal data:

```typescript
// Current
const handleCreateAsNew = (id: string) => {
  const item = items.find((i) => i.id === id)
  if (!item) return
  setCreateDialogData({
    compositeId: id,
    description: item.statementTransaction.description,
    amount: item.statementTransaction.amount,
    currency: item.statementTransaction.currency,
    date: item.statementTransaction.date,
  })
  setCreateDialogOpen(true)
}
```

Extend to pass proposal:

```typescript
// Updated
const handleCreateAsNew = (id: string) => {
  const item = items.find((i) => i.id === id)
  if (!item) return
  setCreateDialogData({
    compositeId: id,
    description: item.statementTransaction.description,
    amount: item.statementTransaction.amount,
    currency: item.statementTransaction.currency,
    date: item.statementTransaction.date,
    proposal: item.proposal,  // NEW — may be undefined
  })
  setCreateDialogOpen(true)
}
```

---

## 17. Open Questions

The following items require product or engineering decisions before implementation begins.

**Q1. Proposal generation timing.** *RESOLVED in FEATURE_SPEC.md Section 8.*
Proposals are pre-computed in the background when imports arrive (option a: eagerly). The loading skeleton (Section 13.1) will appear only when the user navigates to the review queue before background generation completes, or during on-demand regeneration.

**Q2. Proposal persistence.** *RESOLVED in FEATURE_SPEC.md Section 5.*
Proposals are stored in a `transaction_proposals` table, enabling staleness detection, auditing, and the Refresh indicator (Section 12).

**Q3. Undo granularity for batch quick create.**
The spec calls for individual undo toasts when N <= 5 and a consolidated "Undo all" when N > 5. Confirm this threshold and whether partial undo (undo only some items from a batch) is required.

**Q4. Transaction type — income handling.**
The app currently records transaction types but the review queue and `CreateFromImportDialog` always defaults to `"expense"`. Confirm whether income transactions can realistically appear in bank statement imports and whether the toggle is needed at launch or can be deferred.

**Q5. `proposalFieldsModified` reporting.** *PARTIALLY RESOLVED in FEATURE_SPEC.md Section 9.*
The "Created (modified)" feedback (Section 11.2) requires the dialog to report which fields were changed. Per FEATURE_SPEC, modifications are fed back to the proposal model via `ai_feedback` entries and the `user_modifications` JSONB field (full field-level diff, not just a boolean). The UI design should therefore pass a `modifiedFields: Record<string, { from: any; to: any }>` structure rather than only a boolean, to enable the learning loop. The boolean `proposalFieldsModified` remains useful as a quick UI flag derived from `Object.keys(modifiedFields).length > 0`.

**Q6. Proposal confidence thresholds.**
The thresholds (>= 85 for Quick Create, 50-84 for "Create as New ⚡", < 50 for "Review & Create") are a starting point. These should be validated against real proposal data and adjusted after the first batch of user testing.
