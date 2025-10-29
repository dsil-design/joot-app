# Add Transaction Form - Visual Mockups & Layout Diagrams

**Companion Document to:** design-research-add-transaction-form.md
**Date:** October 26, 2025

---

## 1. Sticky Footer - Before & After

### BEFORE (Current Issue)

```
┌────────────────────────────────────────┐
│                                        │
│  [Tags Field]                          │
│                                        │
│                                        │ ← Bottom of scrollable content
├────────────────────────────────────────┤ ← Gap appears here (white space)
│  ┌──────────────────────────────────┐ │
│  │                                  │ │ ← 24px top padding (too much)
│  │  ┌────────────────────────────┐ │ │
│  │  │      [Save Button]         │ │ │ ← 40px button height
│  │  └────────────────────────────┘ │ │
│  │  ┌────────────────────────────┐ │ │
│  │  │  [Save & Add Another]      │ │ │ ← 12px gap
│  │  └────────────────────────────┘ │ │
│  │  ┌────────────────────────────┐ │ │
│  │  │      [Cancel]              │ │ │
│  │  └────────────────────────────┘ │ │
│  │                                  │ │
│  │                                  │ │ ← 48px bottom padding (too much)
│  └──────────────────────────────────┘ │
│                                        │ ← Background doesn't extend
└────────────────────────────────────────┘
  ↑ Side gaps visible (floating appearance)

TOTAL HEIGHT: ~96px visible + safe area
ISSUES:
✗ Background doesn't extend to edges
✗ Excessive vertical padding
✗ Appears disconnected from screen
✗ Takes up too much viewport
```

### AFTER (Recommended Fix)

```
┌──────────────────────────────────────────┐
│                                          │
│  [Tags Field]                            │
│                                          │
│                                          │ ← Bottom of scrollable content
│                                          │
│                                          │ ← Spacer div (48px, hidden on desktop)
├──────────────────────────────────────────┤ ← 1px border, subtle shadow
│ ┌────────────────────────────────────┐  │
│ │   [Save Button]          44px      │  │ ← 12px top padding
│ └────────────────────────────────────┘  │
│ ┌────────────────────────────────────┐  │
│ │   [Save & Add Another]   44px      │  │ ← 10px gap
│ └────────────────────────────────────┘  │
│ ┌────────────────────────────────────┐  │
│ │   [Cancel]               44px      │  │
│ └────────────────────────────────────┘  │
│                                          │ ← 16px base padding
│                                          │   + safe-area-inset-bottom
└──────────────────────────────────────────┘
  ↑ Full width background (fixed positioning)
  ↑ Extends to screen edges perfectly

TOTAL HEIGHT: ~73px visible + safe area (0-34px on iPhone)
IMPROVEMENTS:
✓ Full-width background (no gaps)
✓ Reduced padding (saves 32px)
✓ Proper safe area handling
✓ Professional sticky footer appearance
✓ Matches iOS/Android app conventions
```

### Side-by-Side Comparison

```
CURRENT                          RECOMMENDED
─────────                        ─────────────
96px total height          →     73px total height (-24%)
Floating appearance        →     Edge-to-edge (professional)
40px buttons              →     44px buttons (WCAG AAA)
No shadow                 →     Subtle elevation shadow
Sticky position           →     Fixed position (more reliable)
```

---

## 2. Amount + Currency Field - Pattern Comparison

### CURRENT: Side-by-Side Layout (Mobile)

```
┌──────────────────────────────────────────┐
│ Amount                 Currency          │ ← Labels
├─────────────────────┬────────────────────┤
│                     │                    │
│  ฿ 1,234.56         │  ⦿ THB  ⦾ USD     │ ← Hard to reach on right
│                     │  [Other]           │
│                     │                    │
└─────────────────────┴────────────────────┘
     ↑ 60% width          ↑ 40% width

ISSUES ON MOBILE:
✗ Horizontal reach required (one-handed use difficult)
✗ Currency competes with amount visually
✗ Radio buttons + link = complex interaction
✗ Unconventional pattern (not like Revolut/N26/Wise)
✗ Limited amount input space
```

### RECOMMENDED: Integrated Selector (Mobile)

```
┌──────────────────────────────────────────┐
│ Amount                                   │ ← Single label
├──────────────────────────────────────────┤
│ ┌────────┐                               │
│ │฿ THB ▼ │  1,234.56                     │ ← All in vertical reach
│ └────────┘                               │
│  Currency  Large amount input            │
│  button    (flexible width)              │
└──────────────────────────────────────────┘
     ↑ Compact              ↑ Spacious
     ↑ Tappable button      ↑ Primary focus

BENEFITS:
✓ One-handed operation (vertical alignment)
✓ Amount is hero element (visual hierarchy)
✓ Larger input area for amount
✓ Follows industry standards (Revolut/N26/Wise pattern)
✓ Single tap to change currency
✓ Scalable for many currencies
```

### Currency Selector Modal (Tap "฿ THB ▼")

```
┌──────────────────────────────────────────┐
│  ← Select Currency                       │
├──────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  │
│  │  Search currencies...              │  │
│  └────────────────────────────────────┘  │
│                                          │
│  FREQUENTLY USED                         │
│  ┌────────────────────────────────────┐  │
│  │ ฿   THB                        ✓   │  │ ← 56px height (large target)
│  │     Thai Baht                      │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ $   USD                            │  │
│  │     US Dollar                      │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ALL CURRENCIES                          │
│  ┌────────────────────────────────────┐  │
│  │ €   EUR                            │  │ ← 48px height (scrollable)
│  │     Euro                           │  │
│  ├────────────────────────────────────┤  │
│  │ £   GBP                            │  │
│  │     British Pound                  │  │
│  ├────────────────────────────────────┤  │
│  │ ¥   JPY                            │  │
│  │     Japanese Yen                   │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘

FEATURES:
✓ Search for quick access
✓ Frequent currencies prioritized
✓ Large touch targets (56px top, 48px list)
✓ Clear visual feedback (checkmark)
✓ Symbol + Code + Name for clarity
```

### DESKTOP: Comparison

```
CURRENT (Desktop)                    RECOMMENDED (Desktop)
─────────────────                    ──────────────────────

┌─────────────┬──────────┐          ┌─────────────┬──────────┐
│ Amount      │ Currency │          │ Amount      │ Currency │
├─────────────┼──────────┤          ├─────────────┼──────────┤
│ ฿ 1,234.56  │ THB ▼    │     OR   │ ฿ THB ▼ | 1,234.56    │
│             │ USD ▼    │          │                        │
└─────────────┴──────────┘          └────────────────────────┘
  Keep 2-column layout                Optional: Single field
  (Works well on desktop)             (Consistent with mobile)

RECOMMENDATION: Keep 2-column on desktop for familiarity
               during transition period
```

---

## 3. Complete Form Layout - Mobile vs Desktop

### MOBILE (<768px) - RECOMMENDED LAYOUT

```
┌──────────────────────────────────────────┐
│                                          │ ← Page header (80px top padding)
│  Add transaction                         │
│                                          │
├──────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐          │ ← 20px gap between fields
│  │ Expense ✓  │ │ Income     │          │   (gap-5 on mobile)
│  └────────────┘ └────────────┘          │
│                                          │
│  Date                                    │
│  ┌────────────────────────────────────┐  │ ← 44px input height
│  │ October 26, 2025              ▼   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Description                             │
│  ┌────────────────────────────────────┐  │
│  │ Groceries                          │  │ ← Auto-focused field
│  └────────────────────────────────────┘  │
│                                          │
│  Amount                                  │ ← MOVED UP (after description)
│  ┌────────┐                             │
│  │฿ THB ▼ │ 1,234.56                    │
│  └────────┘                             │
│                                          │
│  Vendor                                  │
│  ┌────────────────────────────────────┐  │
│  │ 7-Eleven                      ▼   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Payment Method                          │
│  ┌────────────────────────────────────┐  │
│  │ Bangkok Bank Debit            ▼   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Tags                                    │
│  ┌────────────────────────────────────┐  │
│  │ Food, Shopping                ▼   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [Spacer for fixed footer - 48px]       │ ← Prevents content hiding
│                                          │
├══════════════════════════════════════════┤ ← Fixed to bottom
│ ┌────────────────────────────────────┐  │   Shadow: 0 -1px 3px rgba(0,0,0,0.05)
│ │   Save                             │  │
│ └────────────────────────────────────┘  │
│ ┌────────────────────────────────────┐  │
│ │   Save & Add Another               │  │
│ └────────────────────────────────────┘  │
│ ┌────────────────────────────────────┐  │
│ │   Cancel                           │  │
│ └────────────────────────────────────┘  │
│                                          │ ← Safe area padding
└──────────────────────────────────────────┘
  Screen edge to edge (no side gaps)
```

### DESKTOP (≥768px) - RECOMMENDED LAYOUT

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│             Add transaction                            │ ← Centered content
│                                                        │
│     ┌─────────────────────────────────────────┐       │
│     │                                         │       │ ← max-w-2xl container
│     │  ┌────────┐ ┌────────┐                 │       │
│     │  │Expense✓│ │Income  │                 │       │
│     │  └────────┘ └────────┘                 │       │
│     │                                         │       │
│     │  Date                                   │       │   24px gap between
│     │  ┌───────────────────────────────────┐ │       │   fields (gap-6)
│     │  │ October 26, 2025             ▼   │ │       │
│     │  └───────────────────────────────────┘ │       │
│     │                                         │       │
│     │  Description                            │       │
│     │  ┌───────────────────────────────────┐ │       │
│     │  │ Groceries                         │ │       │
│     │  └───────────────────────────────────┘ │       │
│     │                                         │       │
│     │  Amount                    Currency    │       │
│     │  ┌──────────────────┐  ┌───────────┐  │       │
│     │  │ ฿ 1,234.56       │  │ THB ▼     │  │       │
│     │  └──────────────────┘  └───────────┘  │       │
│     │                                         │       │
│     │  Vendor                                 │       │
│     │  ┌───────────────────────────────────┐ │       │
│     │  │ 7-Eleven                     ▼   │ │       │
│     │  └───────────────────────────────────┘ │       │
│     │                                         │       │
│     │  Payment Method                         │       │
│     │  ┌───────────────────────────────────┐ │       │
│     │  │ Bangkok Bank Debit           ▼   │ │       │
│     │  └───────────────────────────────────┘ │       │
│     │                                         │       │
│     │  Tags                                   │       │
│     │  ┌───────────────────────────────────┐ │       │
│     │  │ Food, Shopping               ▼   │ │       │
│     │  └───────────────────────────────────┘ │       │
│     │                                         │       │
│     │  ┌───────────────────────────────────┐ │       │
│     │  │ Save                              │ │       │ ← Static position
│     │  └───────────────────────────────────┘ │       │   (not fixed)
│     │  ┌───────────────────────────────────┐ │       │
│     │  │ Save & Add Another                │ │       │
│     │  └───────────────────────────────────┘ │       │
│     │  ┌───────────────────────────────────┐ │       │
│     │  │ Cancel                            │ │       │
│     │  └───────────────────────────────────┘ │       │
│     │                                         │       │
│     └─────────────────────────────────────────┘       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 4. Touch Target Sizing - Before & After

### Input Fields

```
BEFORE (Current)                    AFTER (Recommended)
────────────────                    ───────────────────

Height: 40px (h-10)          →      Height: 44px (h-11)
┌────────────────┐                  ┌────────────────┐
│                │ 40px             │                │ 44px
│  [Input Text]  │                  │  [Input Text]  │
│                │                  │                │
└────────────────┘                  └────────────────┘
  ✗ WCAG AA only                      ✓ WCAG AAA (44×44px minimum)
  ✗ Harder to tap                     ✓ Easier to tap
```

### Buttons

```
BEFORE (Current size="lg")          AFTER (Recommended h-11)
──────────────────────────          ────────────────────────

Variable ~40px                →     Fixed 44px
┌────────────────┐                  ┌────────────────┐
│                │                  │                │ 44px
│  [Button Text] │                  │  [Button Text] │
│                │                  │                │
└────────────────┘                  └────────────────┘
  ✗ Inconsistent                      ✓ Consistent
  ✗ May be < 44px                     ✓ Always ≥ 44px
```

### Radio Buttons & Labels

```
BEFORE (Current)                    AFTER (Recommended)
────────────────                    ───────────────────

Small hit area                →     Expanded hit area
┌──┐                                ┌─────────────┐
│⦿ │ THB    ~20px circle           │  ⦿  THB     │ 44px min-height
└──┘                                │             │
                                    └─────────────┘
  ✗ Hard to tap circle                ✓ Entire row tappable
  ✗ Below WCAG minimum                ✓ WCAG AAA compliant
```

### Currency "Other" Link

```
BEFORE (Current)                    AFTER (Keep as-is)
────────────────                    ───────────────────

min-h-[44px]                 →     min-h-[44px]
┌──────────┐                        ┌──────────┐
│          │ 44px                   │          │ 44px
│  Other   │                        │  Other   │
│          │                        │          │
└──────────┘                        └──────────┘
  ✓ Already compliant                 ✓ Already compliant
  ✓ Good implementation               ✓ Keep current approach
```

---

## 5. Field Spacing - Visual Comparison

### Gap Between Fields

```
CURRENT (gap-6 = 24px)              RECOMMENDED (gap-5 mobile = 20px)
──────────────────────              ──────────────────────────────────

┌──────────────┐                    ┌──────────────┐
│ Field 1      │                    │ Field 1      │
│              │                    │              │
└──────────────┘                    └──────────────┘
                 24px gap                            20px gap
┌──────────────┐                    ┌──────────────┐
│ Field 2      │                    │ Field 2      │
│              │                    │              │
└──────────────┘                    └──────────────┘
                 24px gap                            20px gap
┌──────────────┐                    ┌──────────────┐
│ Field 3      │                    │ Field 3      │
│              │                    │              │
└──────────────┘                    └──────────────┘

Total: 48px wasted         →        Total: 40px (saves 8px)

ON MOBILE (8 fields):               ON MOBILE (8 fields):
7 gaps × 24px = 168px               7 gaps × 20px = 140px

                                    SAVINGS: 28px vertical space
                                    = Less scrolling required
```

### Label to Input Gap

```
CURRENT (gap-1 = 4px)               RECOMMENDED (gap-1.5 = 6px)
─────────────────────               ───────────────────────────

Description                         Description
    ↓ 4px                               ↓ 6px
┌──────────────┐                    ┌──────────────┐
│              │                    │              │
│              │                    │              │
└──────────────┘                    └──────────────┘

  ✗ Feels cramped                     ✓ Better breathing room
  ✗ Label/input distinction           ✓ Clearer association
    less clear                          while maintaining
                                       separation
```

---

## 6. Responsive Breakpoint Behavior

### Sticky Footer Breakpoint

```
MOBILE (<768px)                     DESKTOP (≥768px)
───────────────                     ────────────────

┌────────────────┐                  ┌────────────────────┐
│                │                  │                    │
│   [Content]    │                  │   [Content]        │
│                │                  │                    │
│                │                  │                    │
│                │                  │  ┌──────────────┐ │
│  (scrollable)  │                  │  │   Save       │ │
│                │                  │  └──────────────┘ │
│                │                  │  ┌──────────────┐ │
│                │                  │  │ Save & Add   │ │
│                │                  │  └──────────────┘ │
├════════════════┤ ← Fixed          │  ┌──────────────┐ │
│ ┌────────────┐ │   to bottom      │  │   Cancel     │ │
│ │   Save     │ │                  │  └──────────────┘ │
│ └────────────┘ │                  │                    │
│ ┌────────────┐ │                  │   (scrolls with   │
│ │ Save & Add │ │                  │    content)       │
│ └────────────┘ │                  │                    │
│ ┌────────────┐ │                  └────────────────────┘
│ │   Cancel   │ │
│ └────────────┘ │
│  + safe area   │
└────────────────┘
  position: fixed           →         position: relative
  shadow: visible                     shadow: none
  full screen width                   container width
```

### Amount/Currency Layout Breakpoint

```
MOBILE (<768px)                     DESKTOP (≥768px)
───────────────                     ────────────────

Full width integrated:              Side-by-side grid:

┌─────────────────────────┐        ┌───────────┬─────────┐
│ Amount                  │        │ Amount    │Currency │
├─────────────────────────┤        ├───────────┼─────────┤
│ ┌───┐                   │        │ ฿ 1234.56 │ THB ▼   │
│ │฿ ▼│ 1,234.56          │        └───────────┴─────────┘
│ └───┘                   │          60% width   40% width
└─────────────────────────┘
  Single full-width field           Two-column layout
```

---

## 7. Visual Hierarchy - Information Architecture

### Current Field Order

```
1. Type (Expense/Income)     ← Good: Critical classification
2. Date                      ← Good: Temporal context
3. Description              ← Good: Primary identifier
4. Vendor                   ← Supporting context
5. Payment Method           ← Supporting context
6. Amount + Currency        ⚠️  Should be higher priority
7. Tags                     ← Good: Optional metadata

ISSUE: Amount buried at position 6
```

### Recommended Field Order

```
1. Type (Expense/Income)     ← Critical classification
2. Date                      ← Temporal context
3. Description              ← Primary identifier (What?)
4. Amount + Currency        ← Critical value (How much?) ← MOVED UP
5. Vendor                   ← Supporting context (Where?)
6. Payment Method           ← Supporting context (How paid?)
7. Tags                     ← Optional metadata (Categories)

IMPROVED: Amount at position 4 (top 50% of form)
FOLLOWS MENTAL MODEL: "Bought groceries for 500 baht"
                       ↑ What?      ↑ How much?
```

### Visual Weight Distribution

```
BEFORE                              AFTER
──────                              ─────

HIGH PRIORITY                       HIGH PRIORITY
┌──────────────┐                    ┌──────────────┐
│ Type         │ 10%                │ Type         │ 10%
│ Date         │ 10%                │ Date         │ 10%
│ Description  │ 15%                │ Description  │ 15%
└──────────────┘                    │ Amount       │ 20% ← Increased
                                    └──────────────┘

MEDIUM PRIORITY                     MEDIUM PRIORITY
┌──────────────┐                    ┌──────────────┐
│ Vendor       │ 15%                │ Vendor       │ 15%
│ Payment      │ 15%                │ Payment      │ 10%
└──────────────┘                    └──────────────┘

LOW PRIORITY                        LOW PRIORITY
┌──────────────┐                    ┌──────────────┐
│ Amount       │ 20%  ← Too low     │ Tags         │ 10%
│ Tags         │ 15%                └──────────────┘
└──────────────┘

VISUAL ATTENTION:                   VISUAL ATTENTION:
Description + Amount = 35%          Description + Amount = 35%
But separated by 3 fields           Adjacent = stronger association
```

---

## 8. Safe Area Insets - iPhone Models

### iPhone 14 Pro (With Dynamic Island)

```
┌─────────────────────────────────────────┐ ← Top safe area
│  ═══  Dynamic Island  ═══               │   (59px)
├─────────────────────────────────────────┤
│                                         │
│                                         │
│           [App Content]                 │
│                                         │
│                                         │
│                                         │
│                                         │
│                                         │
├═════════════════════════════════════════┤ ← Fixed footer starts
│ ┌─────────────────────────────────────┐ │
│ │  Save                               │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │  Save & Add Another                 │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │  Cancel                             │ │
│ └─────────────────────────────────────┘ │
│                                         │ ← 16px base padding
│                                         │
│         ═══════════════                 │ ← Home indicator
└─────────────────────────────────────────┘   +34px safe area

Total bottom padding:
16px (base) + 34px (safe area) = 50px
```

### iPhone SE (No Notch)

```
┌─────────────────────────────────────────┐ ← No top safe area needed
│  [Status Bar]                           │   (standard 20px)
├─────────────────────────────────────────┤
│                                         │
│           [App Content]                 │
│                                         │
├═════════════════════════════════════════┤ ← Fixed footer
│ ┌─────────────────────────────────────┐ │
│ │  Save                               │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │  Save & Add Another                 │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │  Cancel                             │ │
│ └─────────────────────────────────────┘ │
│                                         │ ← 16px base padding only
└─────────────────────────────────────────┘   (0px safe area)

Total bottom padding:
16px (base) + 0px (safe area) = 16px
```

### iPad (No Safe Areas)

```
┌───────────────────────────────────────────────────┐
│                                                   │
│                  [App Content]                    │
│                   (max-w-2xl)                     │
│                                                   │
│   ┌─────────────────────────────────────────┐   │
│   │  Save                                   │   │
│   └─────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────┐   │
│   │  Save & Add Another                     │   │
│   └─────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────┐   │
│   │  Cancel                                 │   │
│   └─────────────────────────────────────────┘   │
│                                                   │
└───────────────────────────────────────────────────┘

Footer behavior:
- NOT fixed (static positioning)
- Scrolls with content
- No safe area handling needed
```

---

## 9. Button Layout Options - Comparison

### Option A: Current (Three Stacked Buttons)

```
┌─────────────────────────────────┐
│  [Save]                         │ ← Primary action
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  [Save & Add Another]           │ ← Secondary action
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  [Cancel]                       │ ← Tertiary action
└─────────────────────────────────┘

PROS:
✓ Clear hierarchy
✓ Large tap targets
✓ Familiar pattern
✓ No accidental taps

CONS:
✗ Takes vertical space
✗ Three buttons may overwhelm
```

### Option B: Primary + Menu (Alternative)

```
┌───────────────────────┬─────┐
│  [Save]               │ [≡] │ ← Primary + overflow menu
└───────────────────────┴─────┘
  80% width             20%

Tap [≡] opens:
  • Save & Add Another
  • Cancel

PROS:
✓ Saves vertical space
✓ Cleaner appearance
✓ Primary action prominent

CONS:
✗ Hidden actions
✗ Extra tap required
✗ Less discoverable
```

### Option C: Primary + Inline Secondary (Alternative)

```
┌─────────────────────────────────┐
│  [Save]                         │ ← Primary only
└─────────────────────────────────┘

[Save & Add Another]  [Cancel]     ← Text links below
  Secondary link      Tertiary link

PROS:
✓ Saves space
✓ Clear primary action
✓ Secondary actions visible

CONS:
✗ Links < 44px height (accessibility)
✗ Unconventional pattern
```

### RECOMMENDATION: Keep Option A (Current)

**Rationale:**
- With tighter spacing, vertical space concern reduced
- Clear hierarchy prevents errors
- WCAG compliant
- User testing should validate if needed

---

## 10. Elevation & Shadows Reference

### Sticky Footer Shadow (Mobile)

```
SUBTLE (Recommended):
shadow-[0_-1px_3px_0_rgb(0_0_0_/0.05)]

Visual:
────────────────────────────────────
Soft gradient shadow
││││││                              ← Very subtle
════════════════════════════════════
[Footer content]


MEDIUM (Alternative):
shadow-[0_-2px_8px_0_rgb(0_0_0_/0.1)]

Visual:
────────────────────────────────────
Noticeable gradient
████                                ← More prominent
════════════════════════════════════
[Footer content]


HEAVY (Not Recommended):
shadow-[0_-4px_16px_0_rgb(0_0_0_/0.2)]

Visual:
────────────────────────────────────
Dark shadow
████████                            ← Too heavy
════════════════════════════════════
[Footer content]
```

**Recommendation:** Use SUBTLE for professional, modern appearance

---

## Summary: Key Visual Changes

### Critical Fixes (Immediate Impact)

1. **Sticky Footer:**
   - ✓ Full-width background (edge to edge)
   - ✓ Reduced height (96px → 73px)
   - ✓ Subtle top shadow
   - ✓ Fixed positioning (more reliable)
   - ✓ Safe area handling

2. **Touch Targets:**
   - ✓ Inputs: 40px → 44px
   - ✓ Buttons: 40px → 44px
   - ✓ Radio buttons: Expanded hit area

3. **Spacing:**
   - ✓ Fields: 24px → 20px (mobile)
   - ✓ Label-to-input: 4px → 6px
   - ✓ Button gaps: 12px → 10px

### Medium-Term Improvements

4. **Field Order:**
   - ✓ Move Amount after Description
   - ✓ Better information hierarchy

5. **Responsive Grid:**
   - ✓ Desktop two-column for Amount/Currency
   - ✓ Mobile full-width stacking

### Long-Term Enhancements

6. **Amount/Currency Pattern:**
   - ✓ Integrated selector (mobile)
   - ✓ Currency modal with search
   - ✓ Industry-standard UX
