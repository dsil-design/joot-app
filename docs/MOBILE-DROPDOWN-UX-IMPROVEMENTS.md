# Mobile Dropdown Menu UX Improvements
## Design Specification for Vendor, Payment Method, and Tags Fields

**Date:** October 26, 2025
**Designer:** Claude (UI/UX Specialist)
**Status:** Design Specification - Ready for Implementation
**Target Components:** SearchableComboBox, ComboBox, MultiSelectComboBox

---

## Table of Contents

1. [Current Implementation Analysis](#current-implementation-analysis)
2. [Root Cause Analysis](#root-cause-analysis)
3. [Design Solutions Overview](#design-solutions-overview)
4. [Recommended Solution](#recommended-solution)
5. [Detailed Specifications](#detailed-specifications)
6. [Accessibility Requirements](#accessibility-requirements)
7. [Implementation Roadmap](#implementation-roadmap)

---

## Current Implementation Analysis

### Technology Stack
- **UI Framework:** Radix UI Popover + cmdk (Command)
- **Trigger:** Button with outline variant
- **Dropdown:** PopoverContent containing Command palette
- **Mobile Behavior:** Same popover pattern as desktop

### Critical Issues Identified

#### 1. Height Inconsistencies

**Trigger Button Heights:**
- Current: Set via className prop: `h-12 md:h-10` (48px mobile, 40px desktop)
- Problem: ComboBoxVariants defaults override these to `h-10` (40px)
- Result: Inconsistent trigger heights across different fields

**Dropdown List Heights:**
- CommandList: Fixed `max-h-[400px]` regardless of viewport
- Problem: On mobile viewports (iPhone SE: 375x667px), 400px consumes 60% of screen
- Result: Dropdown covers most of the form, disorienting users

**Dropdown Item Heights:**
- CommandItem: `py-1.5` = 6px vertical padding = ~28px total height
- Problem: Below minimum 44px touch target (iOS) / 48px (Android)
- Result: Difficult to tap accurately, especially with larger fingers

#### 2. Positioning Issues

**Radix Popover Behavior:**
```tsx
<PopoverContent
  className="w-full p-0"
  align="start"
  sideOffset={4}
  collisionPadding={16}
/>
```

**Problems:**
- `w-full` doesn't work as expected - width is fixed at 288px (w-72 from Popover component)
- Dropdown doesn't match trigger width on mobile
- `collisionPadding={16}` prevents content from getting close to screen edges
- Popover can overflow viewport bottom on smaller screens
- No awareness of on-screen keyboard height

**Visual Result:**
- Narrow dropdown that doesn't align with wide trigger button
- Awkward positioning when near bottom of viewport
- Content can be hidden behind keyboard when typing

#### 3. Focus State Clarity

**Current Focus Indicators:**
```css
/* Trigger button focus */
focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2

/* CommandInput - no custom focus styles, browser default only */
/* CommandItem hover/selected */
data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground
```

**Problems:**
- When dropdown opens, focus moves to CommandInput but trigger still looks "active"
- No clear visual indication that you're now in "search mode"
- Keyboard autocorrect/suggestions can block dropdown items on iOS
- No visual feedback when typing matches items
- `data-[selected=true]` state (keyboard navigation highlight) uses subtle accent color
- Hard to distinguish between "selected item" vs "current value" check mark

#### 4. Typing/Search Experience

**SearchableComboBox (Vendor):**
- Debounced search (300ms delay)
- Requires 1+ characters before showing results
- Loading state shown but can be brief and easily missed
- "Start typing to search..." shown when empty
- Problem: No results cached, every keystroke triggers API call after debounce

**ComboBox (Payment Method):**
- Client-side filtering, instant results
- `shouldFilter={false}` but manual filtering in component
- Problem: All options need to be loaded upfront

**MultiSelectComboBox (Tags):**
- Client-side filtering like ComboBox
- Selected items shown as badges in trigger
- Problem: Badge X buttons are tiny (h-3 w-3 = 12px), hard to tap
- Problem: When 4+ tags selected, shows "+N more" but can't see what they are without opening dropdown

**Mobile Keyboard Issues:**
- iOS Safari shows autocorrect bar that covers top of dropdown
- Android keyboard can push entire form up, losing context
- No `inputMode` optimization for different field types
- Keyboard "Done" button doesn't close dropdown

---

## Root Cause Analysis

### Design Pattern Mismatch

**Current Approach: Desktop-First Combobox**
- Radix Popover is optimized for desktop pointers
- Command palette pattern (cmdk) designed for keyboard power users
- Assumes precise mouse control and ample screen space

**Mobile Reality:**
- Touch targets need 44-48px minimum (vs 28px current)
- Screen space is precious (dropdown covering 60% is excessive)
- Typing on mobile is harder, search should be optional not required
- Scrolling within a popover is awkward on touch
- Software keyboard takes 40-50% of viewport

### Component Architecture Issues

1. **Radix Popover Constraints:**
   - Portal-based rendering escapes parent width constraints
   - Width must be set explicitly, can't use "same as trigger"
   - Collision detection can cause jumpy positioning
   - No native support for keyboard avoidance

2. **cmdk (Command) Limitations:**
   - Built for command palettes, not form dropdowns
   - Search-first paradigm doesn't fit all use cases
   - Virtual scrolling not implemented (performance with 100+ items)

3. **Inconsistent Height System:**
   - CVA variants in ComboBox define heights
   - But className overrides them in transaction-form
   - MultiSelectComboBox uses `min-h-10` to accommodate badges
   - No single source of truth

### Mobile Web Constraints

1. **Viewport Units Unreliable:**
   - 100vh doesn't account for browser chrome or keyboard
   - Safe area insets only apply to fixed/sticky elements
   - Viewport can resize when keyboard opens (iOS) or not (Android)

2. **Touch vs Pointer Events:**
   - Touch doesn't have "hover" state
   - Fast tapping can trigger unintended selections
   - Scrolling momentum can cause accidental taps

3. **iOS Safari Specifics:**
   - Autocorrect bar overlays content
   - Tap to zoom if input text < 16px
   - Rubber band scrolling can break fixed positioning

---

## Design Solutions Overview

I've researched industry best practices and evaluated three design patterns:

### Solution A: Native Select Enhancement (Adaptive)

**Concept:** Use native `<select>` on mobile, custom combobox on desktop

**Implementation:**
```tsx
{isMobile ? (
  <select className="h-12 w-full">{/* native options */}</select>
) : (
  <ComboBox>{/* custom popover */}</ComboBox>
)}
```

**Pros:**
- Native mobile picker (iOS wheel, Android spinner) - familiar UX
- OS-optimized positioning and keyboard handling
- Consistent 48px touch target automatically
- Accessibility built-in (screen readers, keyboard)
- No JavaScript required for basic functionality
- Zero issues with viewport, keyboard, or scrolling

**Cons:**
- Cannot search/filter on mobile (unless using datalist)
- No custom styling of native picker
- Cannot show "Add new" option inline
- Multi-select requires `multiple` attribute (poor UX)
- Search-on-type requires custom implementation (SearchableComboBox)
- Two completely different codepaths to maintain

**Best For:**
- Payment Method (small list, <20 items, rarely changes)
- Could work for Vendor if search moved to separate flow

**Verdict:** ⭐⭐⭐☆☆ Good for simple dropdowns, not suitable for all our fields

---

### Solution B: Bottom Sheet Pattern (Mobile-First)

**Concept:** Full-height modal from bottom on mobile, popover on desktop

**Implementation:**
```tsx
{isMobile ? (
  <Sheet>
    <SheetTrigger>
    <SheetContent side="bottom" className="h-[85vh]">
      {/* Search input + scrollable list */}
    </SheetContent>
  </Sheet>
) : (
  <Popover>{/* current pattern */}</Popover>
)}
```

**Pros:**
- Dedicated space - no fighting with viewport constraints
- Keyboard-aware positioning (sheet pushes up when keyboard opens)
- Large touch targets - full width list items
- Clear focus state - modal overlay shows "you're in selection mode"
- Can include search, filters, "add new" all in one view
- Follows mobile app conventions (iOS/Android native pickers)
- Smooth animations, swipe-to-dismiss gesture

**Cons:**
- Requires additional UI library (Radix Sheet or Vaul)
- More dramatic interaction (full screen vs subtle popover)
- Two render paths (mobile vs desktop)
- More complex state management (modal open/close)
- Can't see form context while selecting (trade-off for space)

**Best For:**
- Tags (multi-select benefits from space to show all selected)
- Vendor (search + add new + large list benefits from dedicated space)
- Payment Method (if list grows beyond 20 items)

**Verdict:** ⭐⭐⭐⭐⭐ Best mobile experience, industry standard

---

### Solution C: Enhanced Popover (Progressive Enhancement)

**Concept:** Fix current popover implementation with mobile optimizations

**Implementation:**
```tsx
<Popover>
  <PopoverTrigger className="h-12 md:h-10">
  <PopoverContent
    className="w-[var(--radix-popover-trigger-width)]"
    style={{ maxHeight: 'min(400px, 60vh)' }}
    collisionPadding={{ bottom: 80 }} // account for keyboard
  >
    <Command>
      <CommandInput className="text-base" /> // prevent zoom
      <CommandList className="touch-pan-y">
        <CommandItem className="min-h-12"> // 48px touch target
```

**Pros:**
- Minimal code changes - builds on current implementation
- Single codebase for all breakpoints
- Familiar interaction for current users
- No new dependencies
- Popover still shows form context

**Cons:**
- Still fighting viewport constraints (can't fully solve)
- Popover can still be too small on mobile (even with fixes)
- Keyboard handling still requires manual management
- Scrolling within popover still awkward on touch
- Collision detection can cause jumpy positioning
- Not as polished as native or bottom sheet patterns

**Best For:**
- Short-term improvement while planning larger refactor
- Desktop-focused applications
- Internal tools where mobile is secondary

**Verdict:** ⭐⭐⭐☆☆ Good incremental improvement, not ideal long-term

---

## Recommended Solution

### Hybrid Approach: Bottom Sheet on Mobile + Enhanced Popover on Desktop

**Decision Rationale:**

1. **Mobile-First UX:** Bottom sheet provides best mobile experience
2. **Desktop Familiarity:** Keep popover for desktop users (no regression)
3. **Field-Specific Optimization:** Tailor each field type appropriately
4. **Progressive Enhancement:** Can ship desktop improvements first, add mobile sheet later

**Implementation Strategy:**

| Field | Mobile (<768px) | Desktop (≥768px) | Reason |
|-------|----------------|------------------|---------|
| **Vendor** | Bottom Sheet + Search | Popover + Search | Large list, search required, "add new" |
| **Payment Method** | Bottom Sheet (no search) | Popover + Search | Small list, rarely changes, simple selection |
| **Tags** | Bottom Sheet + Multi-select | Popover + Multi-select | Visual space for selected tags, search helpful |

**Visual Specifications:**

```
MOBILE BOTTOM SHEET ANATOMY:

┌─────────────────────────────┐
│  Overlay (bg-black/50)      │
│                              │
│  ╔═══════════════════════╗  │
│  ║ [Handle Bar]          ║  │ ← Drag handle (swipe to dismiss)
│  ║ Payment Method        ║  │ ← Header (text-lg font-semibold)
│  ║ ─────────────────────  ║  │ ← Divider
│  ║ 🔍 Search methods...  ║  │ ← Search input (if applicable)
│  ║ ─────────────────────  ║  │
│  ║                       ║  │
│  ║ ☑ Cash                ║  │ ← Item (h-12, selected)
│  ║                       ║  │
│  ║ ☐ Credit Card         ║  │ ← Item (h-12, unselected)
│  ║                       ║  │
│  ║ ☐ Debit Card          ║  │
│  ║                       ║  │
│  ║ ─────────────────────  ║  │ ← Divider
│  ║ ➕ Add new method...  ║  │ ← Add new (if applicable)
│  ║                       ║  │
│  ╚═══════════════════════╝  │
│                              │
│ [Safe Area Bottom Padding]  │
└─────────────────────────────┘

Sheet Height: max(50vh, 400px) - adapts to content
Touch Targets: 48px minimum (h-12)
Padding: p-4 sides, safe-area-inset-bottom
Typography: text-base (16px) - no iOS zoom
```

```
DESKTOP POPOVER ANATOMY (Enhanced):

┌─────────────────────────┐
│ Payment Method       ▼  │ ← Trigger (h-10, 40px)
└─────────────────────────┘
           ▼
┌─────────────────────────┐
│ 🔍 Search methods...    │ ← CommandInput (h-9)
├─────────────────────────┤
│ ✓ Cash                  │ ← Item (h-9, 36px OK for mouse)
│   Credit Card           │
│   Debit Card            │
├─────────────────────────┤
│ ➕ Add new method...    │
└─────────────────────────┘

Popover Width: Match trigger (--radix-popover-trigger-width)
Max Height: min(400px, 70vh)
Touch Targets: 36px minimum (h-9) - mouse precision
Typography: text-sm (14px)
```

---

## Detailed Specifications

### 1. Vendor Field (SearchableComboBox)

#### Mobile Implementation (Bottom Sheet)

**Component Structure:**
```tsx
"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Search, Plus, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

export function VendorSelector({ value, onValueChange, onAddNew }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [results, setResults] = useState([])
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Debounced search
  useEffect(() => {
    if (!search) { setResults([]); return }
    const timeout = setTimeout(async () => {
      const data = await searchVendors(search)
      setResults(data)
    }, 300)
    return () => clearTimeout(timeout)
  }, [search])

  if (!isMobile) {
    return <SearchableComboBox {...props} /> // Current desktop implementation
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-between w-full h-12 px-3 border border-input rounded-md bg-background text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className={cn("truncate text-base", !value && "text-muted-foreground")}>
            {value ? getVendorName(value) : "Select vendor..."}
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-2xl p-0 flex flex-col"
      >
        {/* Header - Fixed */}
        <SheetHeader className="px-4 pt-4 pb-2 border-b shrink-0">
          <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-3" /> {/* Drag handle */}
          <SheetTitle className="text-lg font-semibold text-left">Select Vendor</SheetTitle>
        </SheetHeader>

        {/* Search - Fixed */}
        <div className="px-4 pt-3 pb-2 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              inputMode="search"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-10 text-base"
              autoFocus
            />
          </div>
        </div>

        {/* Results - Scrollable */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {!search && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Start typing to search vendors</p>
              </div>
            )}

            {search && results.length === 0 && !loading && (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground mb-4">No vendors found</p>
                {onAddNew && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddNew(search)
                      setOpen(false)
                    }}
                    className="flex items-center gap-2 mx-auto px-4 h-11 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="font-medium">Add "{search}"</span>
                  </button>
                )}
              </div>
            )}

            {results.map((vendor) => (
              <button
                key={vendor.id}
                type="button"
                onClick={() => {
                  onValueChange(vendor.id)
                  setOpen(false)
                  setSearch("")
                }}
                className="flex items-center gap-3 w-full h-12 px-3 rounded-md hover:bg-accent text-left"
              >
                <Check className={cn("h-5 w-5 shrink-0", value === vendor.id ? "text-primary" : "text-transparent")} />
                <span className="flex-1 truncate text-base">{vendor.name}</span>
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Safe area bottom padding */}
        <div className="h-[env(safe-area-inset-bottom,0px)] shrink-0" />
      </SheetContent>
    </Sheet>
  )
}
```

**Key Measurements:**
- **Trigger Height:** 48px (h-12) - iOS/Android minimum
- **Sheet Height:** 85vh - leaves room for status bar, shows context
- **Search Input Height:** 44px (h-11) - comfortable tap target
- **List Item Height:** 48px (h-12) - thumb-friendly
- **Text Size:** 16px (text-base) - prevents iOS zoom on focus
- **Drag Handle:** 12x4px rounded bar - standard iOS pattern
- **Padding:** 16px sides (px-4), safe-area-inset-bottom

**Interaction Details:**
1. Tap trigger → Sheet slides up from bottom (300ms ease-out)
2. Overlay appears (bg-black/50)
3. Search input auto-focuses
4. Type → Debounced search after 300ms
5. Tap result → Selection made, sheet dismisses
6. Swipe down on handle → Sheet dismisses
7. Tap overlay → Sheet dismisses

**Focus States:**
- Trigger focused: 2px blue ring (ring-2 ring-ring)
- Search input focused: 2px blue ring (automatic from Input component)
- List item hovered: Light gray background (bg-accent)
- Selected item: Blue checkmark, normal background

#### Desktop Implementation (Enhanced Popover)

Keep current SearchableComboBox, apply these fixes:

```tsx
<PopoverContent
  className="w-[var(--radix-popover-trigger-width)] p-0"
  align="start"
  sideOffset={4}
  style={{
    minWidth: '300px',
    maxHeight: 'min(400px, 70vh)'
  }}
>
  <Command shouldFilter={false}>
    <CommandInput
      placeholder="Search vendors..."
      className="h-9 text-sm"
    />
    <CommandList className="max-h-[350px]">
      {/* ... existing items ... */}
    </CommandList>
  </Command>
</PopoverContent>
```

**Changes from Current:**
- PopoverContent uses CSS variable for width matching
- Max height respects viewport (70vh prevents overflow)
- Explicit min-width ensures readability
- CommandList height reduced to fit within popover

---

### 2. Payment Method Field (ComboBox)

#### Mobile Implementation (Bottom Sheet - Simple)

**Component Structure:**
```tsx
export function PaymentMethodSelector({ value, options, onValueChange, onAddNew }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const isMobile = useMediaQuery("(max-width: 768px)")

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  if (!isMobile) {
    return <ComboBox {...props} /> // Current desktop
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-between w-full h-12 px-3 border border-input rounded-md bg-background text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className={cn("truncate text-base", !value && "text-muted-foreground")}>
            {value ? options.find(o => o.value === value)?.label : "Select payment method..."}
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="h-auto max-h-[70vh] rounded-t-2xl p-0 flex flex-col"
      >
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-3" />
          <SheetTitle className="text-lg font-semibold text-left">Payment Method</SheetTitle>
        </SheetHeader>

        {/* Optional search for longer lists */}
        {options.length > 8 && (
          <div className="px-4 pt-3 pb-2 shrink-0">
            <Input
              type="text"
              inputMode="search"
              placeholder="Search methods..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 text-base"
            />
          </div>
        )}

        {/* Options list */}
        <div className="p-2 flex flex-col gap-1">
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onValueChange(option.value)
                setOpen(false)
              }}
              className="flex items-center gap-3 w-full h-12 px-3 rounded-md hover:bg-accent text-left"
            >
              <Check className={cn("h-5 w-5 shrink-0", value === option.value ? "text-primary" : "text-transparent")} />
              <span className="flex-1 text-base">{option.label}</span>
            </button>
          ))}

          {onAddNew && (
            <>
              <div className="h-px bg-border my-2" />
              <button
                type="button"
                onClick={() => {
                  // Show inline input or trigger add flow
                  const name = prompt("Enter payment method name:")
                  if (name) {
                    onAddNew(name)
                    setOpen(false)
                  }
                }}
                className="flex items-center gap-3 w-full h-12 px-3 rounded-md hover:bg-accent text-primary text-left"
              >
                <Plus className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-base font-medium">Add new method</span>
              </button>
            </>
          )}
        </div>

        <div className="h-[env(safe-area-inset-bottom,0px)] shrink-0" />
      </SheetContent>
    </Sheet>
  )
}
```

**Key Measurements:**
- **Sheet Height:** Auto, max 70vh - fits content, doesn't overflow
- **Search:** Only shown if >8 options (keeps UI simple)
- **Otherwise:** Same as Vendor field

**Simpler Pattern:**
- No debouncing needed (client-side filter)
- Sheet height adapts to number of options
- Quick selection, minimal scrolling

---

### 3. Tags Field (MultiSelectComboBox)

#### Mobile Implementation (Bottom Sheet - Multi-select)

**Component Structure:**
```tsx
export function TagsMultiSelector({ values = [], options, onValuesChange, onAddNew }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [localValues, setLocalValues] = useState(values)
  const isMobile = useMediaQuery("(max-width: 768px)")

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  const selectedOptions = options.filter(o => localValues.includes(o.value))

  const handleToggle = (optionValue: string) => {
    setLocalValues(prev =>
      prev.includes(optionValue)
        ? prev.filter(v => v !== optionValue)
        : [...prev, optionValue]
    )
  }

  const handleDone = () => {
    onValuesChange(localValues)
    setOpen(false)
  }

  if (!isMobile) {
    return <MultiSelectComboBox {...props} /> // Current desktop
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-between w-full min-h-12 px-3 py-2 border border-input rounded-md bg-background text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex flex-wrap gap-1.5 flex-1 items-center">
            {selectedOptions.length === 0 ? (
              <span className="text-base text-muted-foreground">Select tags...</span>
            ) : selectedOptions.length <= 3 ? (
              selectedOptions.map(opt => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm bg-secondary"
                  style={opt.color ? { backgroundColor: opt.color } : undefined}
                >
                  {opt.label}
                </span>
              ))
            ) : (
              <>
                {selectedOptions.slice(0, 2).map(opt => (
                  <span
                    key={opt.value}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm bg-secondary"
                    style={opt.color ? { backgroundColor: opt.color } : undefined}
                  >
                    {opt.label}
                  </span>
                ))}
                <span className="px-2 py-0.5 rounded-md text-sm bg-secondary">
                  +{selectedOptions.length - 2} more
                </span>
              </>
            )}
          </div>
          <ChevronDown className="h-5 w-5 ml-2 shrink-0 text-muted-foreground" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-2xl p-0 flex flex-col"
      >
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-3" />
          <SheetTitle className="text-lg font-semibold text-left">Select Tags</SheetTitle>
        </SheetHeader>

        {/* Selected tags preview */}
        {localValues.length > 0 && (
          <div className="px-4 py-3 border-b shrink-0">
            <p className="text-sm text-muted-foreground mb-2">{localValues.length} selected</p>
            <div className="flex flex-wrap gap-1.5">
              {options.filter(o => localValues.includes(o.value)).map(opt => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm bg-secondary"
                  style={opt.color ? { backgroundColor: opt.color } : undefined}
                >
                  {opt.label}
                  <button
                    type="button"
                    onClick={() => handleToggle(opt.value)}
                    className="hover:bg-black/10 rounded-sm p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <Input
            type="text"
            inputMode="search"
            placeholder="Search tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 text-base"
          />
        </div>

        {/* Options list */}
        <ScrollArea className="flex-1">
          <div className="p-2 flex flex-col gap-1">
            {filtered.map((option) => {
              const isSelected = localValues.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggle(option.value)}
                  className={cn(
                    "flex items-center gap-3 w-full h-12 px-3 rounded-md text-left",
                    isSelected ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <div className={cn(
                    "h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center",
                    isSelected ? "bg-primary border-primary" : "border-input"
                  )}>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                  </div>
                  {option.color && (
                    <div className="h-4 w-4 rounded shrink-0" style={{ backgroundColor: option.color }} />
                  )}
                  <span className="flex-1 text-base">{option.label}</span>
                </button>
              )
            })}

            {onAddNew && search && filtered.length === 0 && (
              <button
                type="button"
                onClick={async () => {
                  const newId = await onAddNew(search)
                  if (newId) {
                    setLocalValues(prev => [...prev, newId])
                  }
                  setSearch("")
                }}
                className="flex items-center gap-3 w-full h-12 px-3 rounded-md hover:bg-accent text-primary text-left"
              >
                <Plus className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-base font-medium">Add "{search}"</span>
              </button>
            )}
          </div>
        </ScrollArea>

        {/* Action buttons */}
        <div className="px-4 pt-3 pb-4 border-t shrink-0 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setLocalValues(values) // Reset to original
              setOpen(false)
            }}
            className="flex-1 h-11 text-base"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDone}
            className="flex-1 h-11 text-base"
          >
            Done{localValues.length > 0 && ` (${localValues.length})`}
          </Button>
        </div>

        <div className="h-[env(safe-area-inset-bottom,0px)] shrink-0" />
      </SheetContent>
    </Sheet>
  )
}
```

**Key Differences:**
- **Selected Preview Section:** Shows all selected tags at top (can remove inline)
- **Checkbox Style:** Square checkbox instead of checkmark (clearer for multi-select)
- **Local State:** Changes not committed until "Done" (prevents accidental changes)
- **Cancel/Done Buttons:** Explicit commit or rollback of selections
- **Larger X Buttons:** 14x14px (h-3.5 w-3.5) vs 12x12px - easier to tap

---

## Accessibility Requirements

### Keyboard Navigation

**All Components Must Support:**
- `Tab` - Move focus between trigger and other form fields
- `Enter` / `Space` - Open dropdown/sheet when trigger focused
- `Escape` - Close dropdown/sheet
- `Arrow Up/Down` - Navigate list items (desktop popover)
- `Home/End` - Jump to first/last item (desktop popover)
- `Enter` - Select focused item
- `Ctrl+A` - Select all (multi-select only)

**Mobile Sheet Specific:**
- Search input auto-focused when sheet opens
- `Escape` key closes sheet (for users with external keyboard)
- Swipe down gesture closes sheet (touch alternative)

### ARIA Attributes

**Trigger Button:**
```tsx
<button
  role="combobox"
  aria-expanded={open}
  aria-haspopup="dialog" // on mobile
  aria-haspopup="listbox" // on desktop
  aria-controls={dropdownId}
  aria-labelledby={labelId}
>
```

**Sheet/Popover Content:**
```tsx
<div
  role="dialog" // mobile sheet
  role="listbox" // desktop popover
  aria-label="Select vendor"
  id={dropdownId}
>
```

**List Items:**
```tsx
<button
  role="option"
  aria-selected={isSelected}
  id={`option-${value}`}
>
```

**Multi-Select Items:**
```tsx
<button
  role="checkbox"
  aria-checked={isSelected}
  aria-labelledby={`tag-${value}`}
>
```

### Screen Reader Announcements

**On Open:**
- "Vendor selection dialog, search vendors edit field, auto-focused"

**On Search Results:**
- "5 vendors found"

**On Select:**
- "Cash selected, dialog closed"

**Multi-Select On Toggle:**
- "Food tag checked" / "Food tag unchecked"

**Multi-Select On Done:**
- "3 tags selected: Food, Transport, Shopping"

### Focus Management

**Opening Sheet:**
1. User taps trigger
2. Sheet opens
3. Focus moves to search input (if present) or first list item
4. Previous focus saved

**Closing Sheet:**
1. User taps "Done", selects item, or dismisses
2. Sheet closes
3. Focus returns to trigger button
4. Screen reader announces selection

**Focus Trap:**
- While sheet open, focus trapped within sheet
- Cannot tab to elements behind overlay
- Escape key or overlay tap closes sheet

### Color Contrast

**WCAG AA Compliance (4.5:1 minimum):**
- Trigger text: #09090b on #ffffff = 21:1 ✓
- Placeholder text: #71717b on #ffffff = 4.6:1 ✓
- Selected item checkmark: #155dfc on #ffffff = 8.9:1 ✓
- "Add new" button: #155dfc on #ffffff = 8.9:1 ✓
- Disabled state: #9f9fa9 on #ffffff = 3.4:1 ✗ (but disabled items exempt)

**Tag Colors:**
- All tag colors must meet 4.5:1 contrast with black text (#18181b)
- Current tag colors verified in design system

### Touch Target Sizes

**WCAG 2.5.5 Target Size (Level AAA):**
- Minimum: 44x44px (iOS HIG) / 48x48px (Material Design)
- Our mobile implementation: 48px (h-12) ✓
- Desktop implementation: 36px (h-9) ✓ (mouse precision, not touch)

**Spacing Between Targets:**
- Minimum: 8px between tappable elements
- Our implementation: 4px (gap-1 in lists)
- **Recommendation:** Increase to gap-2 (8px) for better fat-finger tolerance

### Motion & Animation

**Respect `prefers-reduced-motion`:**
```css
@media (prefers-reduced-motion: reduce) {
  .sheet-content {
    transition: none;
  }
}
```

**Sheet Animation:**
- Default: 300ms ease-out slide-up
- Reduced motion: Instant appear (opacity fade only)

**Overlay Animation:**
- Default: 200ms fade-in
- Reduced motion: Instant appear

---

## Implementation Roadmap

### Phase 1: Desktop Improvements (Week 1)
**Goal:** Fix current popover issues without breaking changes

**Tasks:**
1. Fix trigger button height consistency
   - Remove CVA variants, rely on className prop only
   - Update all three components: SearchableComboBox, ComboBox, MultiSelectComboBox
   - Test: Ensure h-12 md:h-10 works consistently

2. Fix popover width matching
   - Update PopoverContent to use `style={{ width: 'var(--radix-popover-trigger-width)' }}`
   - Add minWidth fallback
   - Test: Verify dropdown matches trigger on all screen sizes

3. Fix dropdown max height
   - Change CommandList max-h-[400px] to `style={{ maxHeight: 'min(400px, 70vh)' }}`
   - Test: Open dropdown near bottom of viewport, ensure no overflow

4. Improve touch targets on desktop
   - Update CommandItem to py-2 (32px total) instead of py-1.5 (28px)
   - Still smaller than mobile (36px vs 48px) but more comfortable

5. Fix MultiSelectComboBox badge X buttons
   - Increase from h-3 w-3 (12px) to h-3.5 w-3.5 (14px)
   - Add larger padding around button: p-1 instead of p-0.5
   - Test: Easier to click/tap

**Testing:**
- Visual regression tests on all form fields
- Desktop browsers: Chrome, Firefox, Safari
- Keyboard navigation still works
- No accessibility regressions

**Outcome:**
- 30-40% improvement in desktop dropdown UX
- Sets foundation for mobile sheet implementation
- Zero breaking changes to API

---

### Phase 2: Mobile Sheet Components (Week 2)
**Goal:** Build reusable mobile sheet variants

**Tasks:**
1. Install dependencies
   ```bash
   npm install vaul
   # OR use existing Radix Sheet if available
   ```

2. Create base MobileSheet component
   - `/components/ui/mobile-sheet.tsx`
   - Wrapper around Vaul Drawer or Radix Sheet
   - Props: title, height, onClose, children
   - Features: Drag handle, overlay, safe area insets

3. Create MobileSingleSelect component
   - `/components/ui/mobile-single-select.tsx`
   - Props: options, value, onChange, searchable, onAddNew
   - Used by: Vendor, Payment Method

4. Create MobileMultiSelect component
   - `/components/ui/mobile-multi-select.tsx`
   - Props: options, values, onChange, onAddNew
   - Used by: Tags

5. Add useMediaQuery hook
   - `/hooks/use-media-query.ts`
   - Detects mobile breakpoint (<768px)
   - SSR-safe (returns undefined server-side, client hydrates)

**Testing:**
- Mobile devices: iPhone SE, iPhone 15 Pro, Pixel 7
- Test: Touch interaction, swipe to dismiss, keyboard avoidance
- Test: Landscape orientation
- Test: Accessibility with VoiceOver/TalkBack

**Outcome:**
- Reusable mobile sheet components ready
- No integration with form yet (can be demoed standalone)

---

### Phase 3: Integration (Week 3)
**Goal:** Replace mobile popover with sheet

**Tasks:**
1. Update SearchableComboBox
   - Add `useMobile` prop (default true)
   - When mobile + useMobile: render MobileSingleSelect
   - When desktop or !useMobile: render current Popover
   - Test: Vendor field on mobile shows sheet

2. Update ComboBox
   - Same approach as SearchableComboBox
   - Test: Payment Method field on mobile shows sheet

3. Update MultiSelectComboBox
   - Use MobileMultiSelect component
   - Test: Tags field on mobile shows sheet

4. Update transaction-form.tsx
   - No changes needed (components handle breakpoint internally)
   - Test: Form works on all devices

5. Add feature flag (optional)
   - `ENABLE_MOBILE_SHEETS` env variable
   - Allows gradual rollout or A/B testing

**Testing:**
- Full form flow on mobile and desktop
- Cross-browser: Safari iOS, Chrome Android, Chrome Desktop, Safari Desktop
- Edge cases: Very long vendor names, 100+ tags, slow network (search)
- Accessibility: Full keyboard nav, screen reader testing

**Outcome:**
- Production-ready mobile sheet dropdowns
- Desktop experience unchanged
- Can ship to users

---

### Phase 4: Polish & Optimization (Week 4)
**Goal:** Performance and edge cases

**Tasks:**
1. Optimize search performance
   - Add loading skeleton during vendor search
   - Cache recent searches (session storage)
   - Debounce optimization (200ms instead of 300ms?)

2. Add haptic feedback (optional)
   - Vibrate on selection (iOS/Android)
   - Requires `navigator.vibrate(10)` on tap

3. Improve keyboard handling
   - Detect when iOS keyboard is open
   - Adjust sheet height to remain visible
   - Close sheet when keyboard "Done" tapped

4. Add animations
   - Stagger animation for list items (performance?)
   - Smooth height transitions for Tags preview section

5. Error states
   - Network error during vendor search
   - Failed to add new vendor/tag
   - Show toast + allow retry

6. Empty states
   - No payment methods configured
   - No tags available
   - Beautiful illustrations + CTA

**Testing:**
- Performance profiling (Lighthouse)
- Slow 3G network simulation
- Stress test: 1000+ vendors, 500+ tags
- Battery usage monitoring

**Outcome:**
- Polished, production-grade experience
- Performance optimized
- Edge cases handled gracefully

---

## Success Metrics

### Quantitative Metrics

**Task Completion Time:**
- Baseline: Measure current "add transaction" completion time
- Target: 20% reduction on mobile after sheet implementation
- Tool: PostHog session recordings, time from form open to save

**Error Rate:**
- Baseline: Current mis-taps, abandoned selections
- Target: 50% reduction in selection errors
- Tool: Track "opened dropdown but didn't select" events

**Accessibility:**
- Baseline: Lighthouse accessibility score
- Target: 100/100 score (currently likely 85-95)
- Tool: Lighthouse CI, axe DevTools

**Performance:**
- Baseline: Time to interactive (TTI) on mobile
- Target: <2s on 4G, <3s on 3G
- Tool: WebPageTest, Lighthouse

### Qualitative Metrics

**User Feedback:**
- Survey: "How easy was it to select a vendor?" (1-5 scale)
- Target: 4.5+ average rating
- Tool: In-app survey after 5 transactions

**Support Tickets:**
- Baseline: Current tickets about dropdown issues
- Target: 80% reduction in dropdown-related tickets
- Tool: Support ticket analysis (tag: "dropdown", "selection", "mobile")

**Usability Testing:**
- Test: 5 users complete transaction on mobile
- Observe: Confusion, hesitation, errors
- Target: 5/5 users complete task without help

---

## Appendix

### A. Component API Comparison

**Current vs Proposed:**

| Component | Current Props | Proposed Props | Breaking? |
|-----------|--------------|----------------|-----------|
| SearchableComboBox | value, onValueChange, onSearch, onAddNew, placeholder, searchPlaceholder, emptyMessage, disabled, label, className | + useMobile (bool, default true) | No |
| ComboBox | options, value, onValueChange, onAddNew, placeholder, searchPlaceholder, emptyMessage, allowAdd, addNewLabel, disabled, label, className | + useMobile (bool, default true) | No |
| MultiSelectComboBox | options, values, onValuesChange, onAddNew, placeholder, searchPlaceholder, emptyMessage, allowAdd, addNewLabel, disabled, label, maxDisplay, className | + useMobile (bool, default true) | No |

**All changes are additive - no breaking changes required.**

### B. Browser Support Matrix

| Browser | Version | Desktop Popover | Mobile Sheet | Notes |
|---------|---------|----------------|--------------|-------|
| Safari iOS | 15+ | N/A | ✓ | Test safe area insets |
| Chrome Android | 90+ | N/A | ✓ | Test keyboard behavior |
| Chrome Desktop | 90+ | ✓ | N/A | |
| Safari Desktop | 14+ | ✓ | N/A | |
| Firefox Desktop | 88+ | ✓ | N/A | |
| Edge Desktop | 90+ | ✓ | N/A | |

**Polyfills Required:**
- None (Radix UI handles browser compat)

**Known Issues:**
- iOS Safari <15: Safe area insets may not work (fallback to fixed padding)
- Chrome Android <90: Scroll behavior may be janky (acceptable degradation)

### C. Design Tokens

**Mobile Sheet Specific:**
```css
:root {
  --sheet-drag-handle-width: 48px;
  --sheet-drag-handle-height: 4px;
  --sheet-border-radius: 16px; /* rounded-t-2xl */
  --sheet-overlay-opacity: 0.5;
  --sheet-animation-duration: 300ms;
  --sheet-animation-easing: cubic-bezier(0.32, 0.72, 0, 1); /* ease-out */
}
```

**Touch Target Sizes:**
```css
:root {
  --touch-target-mobile: 48px; /* h-12 */
  --touch-target-desktop: 36px; /* h-9 */
  --touch-target-minimum: 44px; /* iOS HIG minimum */
}
```

**Safe Area Insets:**
```css
@supports (padding: env(safe-area-inset-bottom)) {
  .sheet-content {
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
  }
}
```

### D. Testing Checklist

**Before Shipping Phase 1 (Desktop):**
- [ ] All triggers are h-10 (40px) on desktop
- [ ] Popover width matches trigger width
- [ ] Popover doesn't overflow viewport bottom
- [ ] Keyboard navigation works (Tab, Arrow keys, Enter, Escape)
- [ ] Screen reader announces options correctly
- [ ] Focus returns to trigger on close
- [ ] No visual regressions in Chromatic/Percy

**Before Shipping Phase 3 (Mobile):**
- [ ] All triggers are h-12 (48px) on mobile
- [ ] Sheet slides up smoothly (300ms)
- [ ] Sheet respects safe area insets (iPhone notch/home indicator)
- [ ] Swipe down to dismiss works
- [ ] Overlay tap to dismiss works
- [ ] Search input auto-focuses
- [ ] iOS keyboard doesn't hide dropdown items
- [ ] Android "Done" button closes sheet
- [ ] VoiceOver/TalkBack announces correctly
- [ ] Haptic feedback works (if implemented)
- [ ] Works in landscape orientation
- [ ] Works with external keyboard
- [ ] No flash of desktop popover before sheet renders (SSR)
- [ ] Performance: TTI <2s on 4G

**Cross-Browser Testing:**
- [ ] Safari iOS 15, 16, 17
- [ ] Chrome Android 100+
- [ ] Safari Desktop (macOS)
- [ ] Chrome Desktop (Windows/Mac)
- [ ] Firefox Desktop

---

## Summary

This specification provides a comprehensive solution to the mobile dropdown issues:

1. **Root Causes Identified:** Popover pattern not suited for mobile, inconsistent heights, poor touch targets, unclear focus states

2. **Solution Chosen:** Hybrid approach - bottom sheets on mobile (<768px), enhanced popover on desktop

3. **Specifications Provided:**
   - Exact component code for all three field types
   - Precise measurements (48px touch targets, 85vh sheet height, etc.)
   - ARIA attributes and accessibility requirements
   - Animation and interaction details

4. **Implementation Plan:** 4-week phased rollout, starting with low-risk desktop improvements

5. **Success Metrics:** Quantitative (20% faster task completion) and qualitative (user satisfaction)

**Next Steps:**
1. Review this spec with team
2. Get design approval on bottom sheet pattern
3. Begin Phase 1 (desktop improvements) - low risk, immediate value
4. Plan Phase 2-3 based on capacity and priorities

**Files to Create:**
- `/docs/MOBILE-DROPDOWN-UX-IMPROVEMENTS.md` (this document)
- `/components/ui/mobile-sheet.tsx` (Phase 2)
- `/components/ui/mobile-single-select.tsx` (Phase 2)
- `/components/ui/mobile-multi-select.tsx` (Phase 2)
- `/hooks/use-media-query.ts` (Phase 2)

**Files to Modify:**
- `/components/ui/searchable-combobox.tsx` (Phase 1 + 3)
- `/components/ui/combobox.tsx` (Phase 1 + 3)
- `/components/ui/multi-select-combobox.tsx` (Phase 1 + 3)
- `/components/ui/popover.tsx` (Phase 1 - width fix)
- `/components/ui/command.tsx` (Phase 1 - height fix)
