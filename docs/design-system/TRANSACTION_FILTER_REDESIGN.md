# Transaction Filtering System - Design Specification

**Version:** 1.0
**Date:** 2025-10-21
**Status:** Proposed Design
**Page:** All Transactions (`src/app/transactions/page.tsx`)

---

## Executive Summary

This document proposes a comprehensive redesign of the transaction filtering system on the All Transactions page. The current implementation uses a collapsible accordion-based filter section that hides important filtering capabilities. The redesign focuses on **smart defaults**, **always-visible quick filters**, and **progressive disclosure** to create a more intuitive, efficient filtering experience.

### Key Problems Addressed

1. **No default filter state** - Users see all transactions from all time, which can be overwhelming
2. **Hidden filters** - Primary filtering controls are buried in a collapsible section
3. **No quick access** - Users must expand the accordion and configure multiple inputs for common filtering tasks
4. **Poor discoverability** - New users may not realize powerful filtering capabilities exist
5. **Inefficient dataset switching** - Changing between common time periods requires multiple clicks

### Core Design Principles

1. **Default to Current Month** - Show meaningful, digestible data by default
2. **Quick Filters Always Visible** - Most common filters should be one click away
3. **Progressive Disclosure** - Advanced filters available but not overwhelming
4. **Visual Feedback** - Clear indication of active filters
5. **Mobile-First Responsive** - Works seamlessly across all devices

---

## Research Findings

### Industry Best Practices

Based on research of leading financial applications (YNAB, Mint, Stripe, banking dashboards), the following patterns emerged:

#### 1. Date Range Presets (Universal Pattern)
- **Today**, **Yesterday**, **Last 7 Days**, **Last 30 Days**
- **This Week**, **This Month**, **Last Month**
- **This Quarter**, **This Year**, **Last Year**
- **Custom Range** option always available

#### 2. Filter Chip/Pill Pattern
- Active filters displayed as dismissible chips above results
- Each chip shows filter type and value (e.g., "Vendor: Starbucks")
- Individual "x" button to remove each filter
- "Clear all" button when multiple filters active

#### 3. Persistent Quick Filters
- Most common filters always visible (not in dropdown/accordion)
- Direct manipulation - click to apply, click again to remove
- Visual distinction between active and inactive states

#### 4. Progressive Disclosure
- Basic filters (80% use case) always visible
- Advanced filters (20% use case) behind "More filters" or similar
- Important to never exceed 2 levels of disclosure

#### 5. Smart Defaults
- Financial apps commonly default to "This Month" or "Last 30 Days"
- Reduces cognitive load for first-time users
- Provides immediate, actionable data

### User Experience Principles

**From Nielsen Norman Group Research:**
- Progressive disclosure reduces cognitive load
- Important information must be visible, not buried
- Users scan more than they read
- Provide clear feedback for actions

**From SaaS Filter Design Research:**
- Filters should be scannable at a glance
- Active filters should be prominent and easy to modify
- "Clear all" functionality is essential
- Embedded column-level filters maintain context

---

## Proposed Design

### 1. Smart Default Behavior

**On Initial Page Load:**
- Automatically apply "This Month" filter
- Display filter chip showing "This Month" with clear indication it's active
- Show transaction count for current selection
- Provide "View All" or "Clear filter" option to see all transactions

**Rationale:**
- Most users care about recent transactions
- Prevents overwhelming wall of historical data
- Faster page load (fewer transactions to fetch/render)
- Sets user expectation that filtering is available

**Implementation Note:**
```typescript
// Default filter state
const [filters, setFilters] = React.useState<TransactionFilters>({
  dateRange: getThisMonthRange(), // Helper function
  searchKeyword: "",
  vendorIds: [],
  paymentMethodIds: [],
  transactionType: "all",
})
```

---

### 2. Filter UI Layout Structure

#### A. Always-Visible Filter Bar (Primary Zone)

Located directly below the page header and navigation, this bar contains:

**Left Side - Quick Date Filters:**
```
[This Month] [Last 30 Days] [This Year] [Custom Range ▼]
```

**Right Side - Quick Type Filter:**
```
[All] [Expenses] [Income]
```

**Design Specifications:**
- Height: 56px (desktop), auto-wrap on mobile
- Background: Light zinc background (zinc-50) or white with border
- Padding: 12px horizontal, 12px vertical
- Border: 1px solid zinc-200
- Border radius: 8px
- Margin: 16px 0

**Button States:**
- **Inactive:** White background, zinc-700 text, zinc-200 border
- **Active:** Primary color background (blue-600), white text, no border
- **Hover (inactive):** zinc-50 background, zinc-900 text
- **Hover (active):** Darker primary (blue-700)

**Mobile Behavior:**
- Stack vertically or allow horizontal scroll
- Maintain button size (minimum 44px tap target)
- Consider using IconButton for compact representation

---

#### B. Active Filter Chips Bar (Secondary Zone)

Located immediately below the Quick Filter Bar when filters are active.

**Display:**
```
Active Filters:  [This Month ×]  [Vendor: Starbucks ×]  [Payment: Chase ×]  [Clear all]
```

**Design Specifications:**
- Only visible when filters are active
- Background: Transparent or very light blue tint (blue-50)
- Padding: 8px 0
- Chip design:
  - Background: Blue-100
  - Text: Blue-900
  - Border: 1px solid blue-200
  - Border radius: 16px (full pill shape)
  - Padding: 4px 12px
  - Height: 28px
  - Font size: 13px
  - Gap between chips: 8px

**Chip Format:**
- Date filters: "This Month", "Last 30 Days", "Jan 1 - Jan 31"
- Type filter: "Expenses only", "Income only"
- Vendor filter: "Vendor: [Name]" (or "2 vendors" if multiple)
- Payment filter: "Payment: [Name]" (or "3 payment methods" if multiple)
- Search: "Search: [keyword]"

**Clear All Button:**
- Style: Ghost button or link style
- Position: Right side of chip row
- Text: "Clear all filters"

---

#### C. Advanced Filters Section (Tertiary Zone - Progressive Disclosure)

Accessed via "More filters" button or link positioned at the end of the Quick Filter Bar.

**Trigger:**
```
[... More filters] or [⚙ Advanced]
```

**When Expanded (slide-down panel or modal):**

**Grid Layout (4 columns on desktop, 2 on tablet, 1 on mobile):**

1. **Search by Description**
   - Input field with search icon
   - Placeholder: "Search transactions..."
   - Real-time filtering as user types

2. **Vendor Filter**
   - Multi-select combobox (existing component)
   - Shows selected count in filter chips

3. **Payment Method Filter**
   - Multi-select combobox (existing component)
   - Includes "None" option for transactions without payment method

4. **Amount Range** (NEW - valuable addition)
   - Min and Max input fields
   - Currency symbol prefix based on user preference
   - Example: "$0 - $500"

5. **Tag Filter** (NEW - natural addition)
   - Multi-select for tags
   - Show tag colors in dropdown
   - Useful for finding categorized transactions

**Panel Design:**
- Background: White
- Border: Top border only (zinc-200)
- Padding: 16px
- Shadow: Subtle drop shadow for elevation
- Animation: Smooth slide-down (200ms ease)

**Actions:**
- "Apply Filters" button (primary)
- "Reset" button (secondary)
- Auto-close on "Apply" or outside click

---

### 3. Date Range Preset Definitions

#### Quick Presets (Always Visible)

| Preset | Definition | Rationale |
|--------|-----------|-----------|
| **This Month** | First day of current month to today | Most common timeframe for personal finance review |
| **Last 30 Days** | Today minus 30 days to today | Rolling window, useful for 30-day trends |
| **This Year** | January 1 to today (of current year) | Annual view for tax prep, year-end review |
| **Custom Range** | User-selectable start and end | Flexibility for specific date ranges |

#### Extended Presets (In Custom Range Dropdown)

When user clicks "Custom Range ▼", show dropdown with:

**Quick Options:**
- Today
- Yesterday
- Last 7 Days
- This Week (Mon-Sun or based on locale)
- Last Week
- This Month (same as quick filter)
- Last Month
- This Quarter
- Last Quarter
- This Year (same as quick filter)
- Last Year
- All Time

**Custom Date Picker:**
- "Select custom range..." option opens calendar
- Reuse existing DateRangePicker component
- Remember last 3-5 custom ranges for quick access

---

### 4. Filter Persistence & Memory

#### Session Storage
- Store active filters in sessionStorage
- Restore on page refresh within same session
- Key: `joot_transaction_filters`

#### User Preferences (Future Enhancement)
- Save preferred default filter to user profile
- Option in Settings: "Default transaction view"
  - This Month (default)
  - Last 30 Days
  - This Year
  - All Time

#### Smart Memory (Future Enhancement)
- Track user's most-used filter combinations
- Offer "Save this filter" option
- Show saved filters as chips in Quick Filter Bar
- Example: "Coffee Expenses" = [Vendor: Starbucks] + [Type: Expense]

---

### 5. Component Specifications

#### A. QuickFilterBar Component

**File:** `src/components/page-specific/quick-filter-bar.tsx`

**Props:**
```typescript
interface QuickFilterBarProps {
  activeFilters: TransactionFilters
  onFilterChange: (filters: Partial<TransactionFilters>) => void
  onClearAll: () => void
  transactionCount: number
  totalCount: number
}
```

**Structure:**
```tsx
<div className="quick-filter-bar">
  <div className="quick-filter-section">
    <label>Time Period:</label>
    <ButtonGroup>
      <FilterButton active={isThisMonth}>This Month</FilterButton>
      <FilterButton active={isLast30Days}>Last 30 Days</FilterButton>
      <FilterButton active={isThisYear}>This Year</FilterButton>
      <DropdownButton>Custom Range</DropdownButton>
    </ButtonGroup>
  </div>

  <div className="quick-filter-section">
    <label>Type:</label>
    <ButtonGroup>
      <FilterButton active={isAll}>All</FilterButton>
      <FilterButton active={isExpenses}>Expenses</FilterButton>
      <FilterButton active={isIncome}>Income</FilterButton>
    </ButtonGroup>
  </div>

  <Button variant="ghost" onClick={toggleAdvanced}>
    More filters
  </Button>
</div>
```

---

#### B. ActiveFilterChips Component

**File:** `src/components/page-specific/active-filter-chips.tsx`

**Props:**
```typescript
interface ActiveFilterChipsProps {
  filters: TransactionFilters
  onRemoveFilter: (filterType: string, value?: string) => void
  onClearAll: () => void
  resultCount: number
}
```

**Structure:**
```tsx
<div className="active-filter-chips">
  <span className="filter-label">Active Filters:</span>

  {filters.dateRange && (
    <FilterChip onRemove={() => onRemoveFilter('dateRange')}>
      {formatDateRange(filters.dateRange)}
    </FilterChip>
  )}

  {filters.transactionType !== 'all' && (
    <FilterChip onRemove={() => onRemoveFilter('transactionType')}>
      {filters.transactionType === 'expense' ? 'Expenses only' : 'Income only'}
    </FilterChip>
  )}

  {/* Vendor chips */}
  {/* Payment method chips */}
  {/* Search chip */}

  <Button variant="ghost" onClick={onClearAll}>
    Clear all
  </Button>

  <span className="result-count">
    {resultCount} transactions
  </span>
</div>
```

---

#### C. AdvancedFiltersPanel Component

**File:** `src/components/page-specific/advanced-filters-panel.tsx`

**Props:**
```typescript
interface AdvancedFiltersPanelProps {
  isOpen: boolean
  onClose: () => void
  filters: TransactionFilters
  onApplyFilters: (filters: Partial<TransactionFilters>) => void
  vendors: Array<{ id: string; name: string }>
  paymentMethods: Array<{ id: string; name: string }>
  tags: Array<{ id: string; name: string; color: string }>
}
```

**Features:**
- Slide-down animation
- Apply/Reset buttons
- All advanced filter controls
- Click outside to close
- Escape key to close

---

### 6. Mobile Considerations

#### Mobile-Specific Adaptations

**Quick Filter Bar:**
- Horizontal scrollable container (with scroll snap)
- Filter buttons maintain minimum 44px tap target
- Consider icon + text for compact representation
- Sticky position as user scrolls

**Active Filter Chips:**
- Allow horizontal scroll if many chips
- Keep "Clear all" button always visible (sticky right)
- Show count indicator if chips overflow

**Advanced Filters:**
- Open as bottom sheet (slide up from bottom)
- Full-screen on small phones
- Large touch targets (min 44px)
- Single column layout
- Fixed "Apply" button at bottom

**Date Range Selector:**
- Native-feeling calendar picker
- Large touch targets
- Consider month/year quick jumpers

---

### 7. Accessibility Requirements

#### Keyboard Navigation
- All filter buttons keyboard accessible (Tab navigation)
- Enter/Space to activate buttons
- Arrow keys to navigate between related filter options
- Escape to close Advanced Filters panel
- Focus management when opening/closing panels

#### Screen Reader Support
- Clear labels for all filter controls
- Announce when filters are applied/removed
- Announce result count changes
- ARIA live region for dynamic updates
- ARIA labels: `aria-label="Filter by date range: This Month"`

#### Visual Accessibility
- Minimum 4.5:1 contrast ratio for all text
- Active state indicated by color AND another visual cue (border, icon)
- Focus indicators clearly visible (2px outline)
- Color-blind friendly palette
- Support for reduced motion preferences

---

### 8. Performance Considerations

#### Optimizations

**Debounced Search:**
- Debounce search input by 300ms
- Show loading indicator for search
- Cancel in-flight requests on new input

**Memoized Filtering:**
- Memoize filter functions with useMemo
- Only re-filter when filters or transactions change
- Cache expensive calculations (totals, date parsing)

**Lazy Loading Advanced Filters:**
- Code-split AdvancedFiltersPanel component
- Only load when user clicks "More filters"
- Preload on hover (prefetch strategy)

**Smart Data Fetching:**
- If default is "This Month", only fetch current month on initial load
- Fetch additional data when user expands date range
- Consider pagination for large datasets

---

### 9. Implementation Phases

#### Phase 1: Foundation (MVP)
**Priority: Critical - Ship First**

✅ **Default Filter State**
- Set "This Month" as default dateRange on page load
- Update useTransactions or page component initialization

✅ **Quick Filter Bar - Date Presets**
- Create QuickFilterBar component
- Implement: This Month, Last 30 Days, This Year buttons
- Wire up to existing filter state

✅ **Quick Filter Bar - Transaction Type**
- Add All/Expenses/Income buttons
- Wire to existing transactionType filter

✅ **Active Filter Chips**
- Create ActiveFilterChips component
- Display active filters as dismissible chips
- Implement "Clear all" functionality

✅ **Refactor Existing Filters**
- Keep existing accordion filters for now
- Move to "More filters" progressive disclosure
- Ensure all existing functionality preserved

**Success Criteria:**
- Users see "This Month" data by default
- Users can switch between date presets with one click
- Active filters are clearly visible
- "Clear all" works correctly

---

#### Phase 2: Enhanced UX
**Priority: High - Ship Soon After MVP**

✅ **Custom Date Range Dropdown**
- Add dropdown to "Custom Range" button
- Include all extended presets
- Link to existing DateRangePicker

✅ **Advanced Filters Panel**
- Create AdvancedFiltersPanel component
- Move existing vendor/payment filters here
- Add slide-down animation
- Implement Apply/Reset buttons

✅ **Mobile Optimizations**
- Responsive layout for Quick Filter Bar
- Bottom sheet for Advanced Filters on mobile
- Horizontal scroll for filter chips
- Touch-optimized controls

✅ **Filter Persistence**
- Store filters in sessionStorage
- Restore on page refresh
- Clear on logout

**Success Criteria:**
- All date presets accessible
- Advanced filters accessible but not intrusive
- Mobile experience smooth and native-feeling
- Filters persist across page refreshes

---

#### Phase 3: Advanced Features
**Priority: Medium - Future Enhancement**

🔲 **Amount Range Filter**
- Add min/max amount inputs to Advanced Filters
- Support both USD and THB
- Handle currency conversion scenarios

🔲 **Tag Filter**
- Add tag multi-select to Advanced Filters
- Show tag colors in selection
- Enable tag-based transaction discovery

🔲 **Saved Filter Presets**
- "Save this filter" functionality
- User-named filter presets
- Quick access to saved filters

🔲 **Smart Filter Suggestions**
- Analyze user behavior
- Suggest commonly used filters
- "You often view [Expenses] for [This Month]"

🔲 **User Preference Settings**
- Setting: Default transaction view
- Setting: Preferred date range format
- Setting: Auto-apply filters on change

**Success Criteria:**
- Power users can save custom filter combinations
- Amount filtering works accurately
- Tag filtering enables new discovery patterns
- User preferences reduce repeated actions

---

### 10. Visual Design Mockup (Text Description)

#### Desktop Layout (1440px width)

```
┌─────────────────────────────────────────────────────────────────────┐
│ All transactions                                     [Controls]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Quick Filters                                                   │ │
│ │                                                                 │ │
│ │ Time Period:                                Type:               │ │
│ │ [This Month*] [Last 30 Days] [This Year] [Custom ▼]            │ │
│ │                                             [All*] [Expenses]   │ │
│ │                                             [Income]            │ │
│ │                                                                 │ │
│ │                                            [... More filters]   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Active: [This Month ×]                                          │ │
│ │         Showing 47 transactions                  [Clear all]   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                     Transaction Table                           │ │
│ │  [Checkbox] Date    Description   Vendor   Amount    ...        │ │
│ │     ...                                                         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Note:** * indicates active state

---

#### Mobile Layout (375px width)

```
┌───────────────────────────┐
│ All transactions    [≡]   │
├───────────────────────────┤
│                           │
│ ┌───────────────────────┐ │
│ │ Quick Filters     →   │ │ ← Horizontal scroll
│ │                       │ │
│ │ [This Month*]         │ │
│ │ [Last 30 Days]        │ │
│ │ [This Year]           │ │
│ │                       │ │
│ │ [All*]                │ │
│ │ [Expenses]            │ │
│ │ [Income]              │ │
│ │                       │ │
│ │ [More filters]        │ │
│ └───────────────────────┘ │
│                           │
│ ┌───────────────────────┐ │
│ │ [This Month ×]    →   │ │ ← Horizontal scroll
│ │ 47 transactions       │ │
│ │            [Clear all]│ │
│ └───────────────────────┘ │
│                           │
│ ┌───────────────────────┐ │
│ │ Oct 21                │ │
│ │ ├ Coffee Shop         │ │
│ │ │ $4.50              │ │
│ │ ├ Grocery Store       │ │
│ │ │ $67.23             │ │
│ └───────────────────────┘ │
│                           │
└───────────────────────────┘
```

---

### 11. Example User Flows

#### Flow 1: New User First Visit
1. User navigates to All Transactions
2. Page loads with "This Month" filter auto-applied
3. Sees 47 transactions from current month
4. Sees chip: "Active: [This Month ×]"
5. User understands they're looking at current month
6. User clicks "Last 30 Days" to see rolling 30-day view
7. Transaction list updates, chip changes to "Last 30 Days"

**Outcome:** User immediately sees relevant data, learns filtering is available

---

#### Flow 2: Finding Specific Vendor Expenses
1. User sees "This Month" filter active
2. Clicks "More filters"
3. Advanced panel slides down
4. Selects "Starbucks" in Vendor filter
5. Clicks "Apply Filters"
6. Panel closes
7. Sees chips: [This Month ×] [Vendor: Starbucks ×]
8. Table shows only Starbucks transactions from this month
9. Result count: "8 transactions"

**Outcome:** User combines quick + advanced filters easily

---

#### Flow 3: Switching Date Ranges Quickly
1. User currently viewing "This Month" (47 transactions)
2. Wants to compare with last month
3. Single click on "Custom Range ▼"
4. Dropdown shows presets
5. Clicks "Last Month"
6. Transaction list updates instantly
7. Chip shows "Sep 1 - Sep 30"
8. Can quickly toggle back to "This Month"

**Outcome:** Fast dataset switching without configuration

---

#### Flow 4: Clearing Complex Filter Set
1. User has multiple filters active:
   - [Last 30 Days ×]
   - [Expenses only ×]
   - [Vendor: Starbucks ×]
   - [Payment: Chase ×]
2. User clicks "Clear all"
3. All chips disappear
4. Filter resets to default "This Month"
5. Full transaction list shows

**Outcome:** Easy reset from complex filter state

---

### 12. Success Metrics

#### Quantitative Metrics

**Engagement:**
- Filter usage rate (% of sessions using filters)
- Average filters per session
- Time to first filter interaction
- Quick filter vs Advanced filter usage ratio

**Efficiency:**
- Time to apply filters (vs. current implementation)
- Number of clicks to common filtering tasks
- Filter modification rate (changing existing filters)

**Adoption:**
- % of users discovering "More filters"
- % of users using date range presets
- Saved filter preset usage (Phase 3)

**Performance:**
- Page load time with default filter
- Filter application response time
- Re-filter performance on large datasets

#### Qualitative Metrics

**User Feedback:**
- Ease of finding specific transactions
- Clarity of active filter state
- Usefulness of default "This Month" view
- Mobile filtering experience

**Success Indicators:**
- Reduction in "I can't find a transaction" support queries
- Positive feedback on new filtering system
- Increased transaction page engagement
- Users report faster workflow

---

### 13. Technical Implementation Notes

#### State Management

**Current Filter State:**
```typescript
interface TransactionFilters {
  dateRange?: DateRange
  searchKeyword: string
  vendorIds: string[]
  paymentMethodIds: string[]
  transactionType: TransactionType
}
```

**Proposed Additions:**
```typescript
interface TransactionFilters {
  dateRange?: DateRange
  datePreset?: 'this-month' | 'last-30-days' | 'this-year' | 'custom'
  searchKeyword: string
  vendorIds: string[]
  paymentMethodIds: string[]
  transactionType: TransactionType
  amountRange?: { min?: number; max?: number } // Phase 3
  tagIds?: string[] // Phase 3
}
```

**Reason for datePreset:**
- Needed to determine which quick filter button is active
- Helps with filter persistence
- Separates preset concept from actual date range

---

#### Helper Functions

**Date Range Utilities:**
```typescript
// src/lib/utils/date-filters.ts

export function getThisMonthRange(): DateRange {
  const now = new Date()
  const firstDay = startOfMonth(now)
  return { from: firstDay, to: now }
}

export function getLast30DaysRange(): DateRange {
  const now = new Date()
  const thirtyDaysAgo = subDays(now, 30)
  return { from: thirtyDaysAgo, to: now }
}

export function getThisYearRange(): DateRange {
  const now = new Date()
  const firstDay = startOfYear(now)
  return { from: firstDay, to: now }
}

export function getLastMonthRange(): DateRange {
  const now = new Date()
  const lastMonth = subMonths(now, 1)
  return {
    from: startOfMonth(lastMonth),
    to: endOfMonth(lastMonth)
  }
}

export const DATE_PRESETS = {
  'today': () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
  'yesterday': () => {
    const yesterday = subDays(new Date(), 1)
    return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
  },
  'last-7-days': () => ({ from: subDays(new Date(), 7), to: new Date() }),
  'this-week': () => ({ from: startOfWeek(new Date()), to: new Date() }),
  'last-week': () => {
    const lastWeek = subWeeks(new Date(), 1)
    return { from: startOfWeek(lastWeek), to: endOfWeek(lastWeek) }
  },
  'this-month': getThisMonthRange,
  'last-month': getLastMonthRange,
  'last-30-days': getLast30DaysRange,
  'this-quarter': () => ({ from: startOfQuarter(new Date()), to: new Date() }),
  'last-quarter': () => {
    const lastQ = subQuarters(new Date(), 1)
    return { from: startOfQuarter(lastQ), to: endOfQuarter(lastQ) }
  },
  'this-year': getThisYearRange,
  'last-year': () => {
    const lastY = subYears(new Date(), 1)
    return { from: startOfYear(lastY), to: endOfYear(lastY) }
  },
}

export function formatDateRangeChip(range: DateRange): string {
  if (!range.from) return ''

  if (!range.to || isSameDay(range.from, range.to)) {
    return format(range.from, 'MMM d, yyyy')
  }

  if (isSameMonth(range.from, range.to)) {
    return format(range.from, 'MMM d') + ' - ' + format(range.to, 'd, yyyy')
  }

  if (isSameYear(range.from, range.to)) {
    return format(range.from, 'MMM d') + ' - ' + format(range.to, 'MMM d, yyyy')
  }

  return format(range.from, 'MMM d, yyyy') + ' - ' + format(range.to, 'MMM d, yyyy')
}

export function detectPreset(range: DateRange | undefined): string | null {
  if (!range?.from) return null

  for (const [key, getRange] of Object.entries(DATE_PRESETS)) {
    const presetRange = getRange()
    if (
      isSameDay(range.from, presetRange.from) &&
      range.to &&
      presetRange.to &&
      isSameDay(range.to, presetRange.to)
    ) {
      return key
    }
  }

  return 'custom'
}
```

---

#### Filter Persistence

**SessionStorage Implementation:**
```typescript
// src/lib/utils/filter-persistence.ts

const STORAGE_KEY = 'joot_transaction_filters'

export function saveFilters(filters: TransactionFilters): void {
  try {
    const serialized = JSON.stringify({
      ...filters,
      dateRange: filters.dateRange ? {
        from: filters.dateRange.from?.toISOString(),
        to: filters.dateRange.to?.toISOString(),
      } : undefined,
    })
    sessionStorage.setItem(STORAGE_KEY, serialized)
  } catch (error) {
    console.warn('Failed to save filters:', error)
  }
}

export function loadFilters(): TransactionFilters | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored)

    return {
      ...parsed,
      dateRange: parsed.dateRange ? {
        from: parsed.dateRange.from ? new Date(parsed.dateRange.from) : undefined,
        to: parsed.dateRange.to ? new Date(parsed.dateRange.to) : undefined,
      } : undefined,
    }
  } catch (error) {
    console.warn('Failed to load filters:', error)
    return null
  }
}

export function clearStoredFilters(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
```

**Usage in Component:**
```typescript
// In AllTransactionsPage component

const getInitialFilters = (): TransactionFilters => {
  // Try to load from session storage
  const stored = loadFilters()
  if (stored) return stored

  // Default to "This Month"
  return {
    dateRange: getThisMonthRange(),
    datePreset: 'this-month',
    searchKeyword: "",
    vendorIds: [],
    paymentMethodIds: [],
    transactionType: "all",
  }
}

const [filters, setFilters] = React.useState<TransactionFilters>(getInitialFilters)

// Save filters whenever they change
React.useEffect(() => {
  saveFilters(filters)
}, [filters])
```

---

### 14. Compatibility & Migration

#### Backward Compatibility

**Existing Functionality Preserved:**
- All current filter capabilities remain functional
- Existing DateRangePicker component reused
- Existing MultiSelectComboBox components reused
- Transaction filtering logic unchanged
- URL parameters (if any) continue to work

**Migration Strategy:**
1. Add new components alongside existing accordion
2. Wire new components to existing filter state
3. Deprecate accordion in favor of new UI
4. Remove accordion code after successful rollout

**No Breaking Changes:**
- Filter state structure extends, doesn't replace
- Existing filter logic still works
- No database schema changes required

---

### 15. Testing Strategy

#### Unit Tests

**Filter State Logic:**
- ✅ Default filter initialization
- ✅ Date preset range calculation
- ✅ Filter serialization/deserialization
- ✅ Filter chip label formatting
- ✅ Preset detection from date range

**Component Tests:**
- ✅ QuickFilterBar renders correctly
- ✅ Clicking quick filter updates state
- ✅ Active state styling applies correctly
- ✅ ActiveFilterChips displays correct chips
- ✅ Removing chip updates filters
- ✅ Clear all removes all filters
- ✅ AdvancedFiltersPanel opens/closes

---

#### Integration Tests

**Filter Application:**
- ✅ Quick filter applies and updates table
- ✅ Combining multiple filters works
- ✅ Clear all resets to default state
- ✅ Advanced filters integrate with quick filters
- ✅ Filter persistence across page refresh
- ✅ Mobile responsive behavior

---

#### E2E Tests (Cypress/Playwright)

**User Workflows:**
- ✅ New user sees default "This Month" filter
- ✅ User can switch between date presets
- ✅ User can apply advanced filters
- ✅ User can clear all filters
- ✅ Filter state persists on refresh
- ✅ Mobile filtering experience
- ✅ Keyboard navigation works

---

#### Accessibility Testing

**Manual Testing:**
- ✅ Keyboard-only navigation
- ✅ Screen reader announcement accuracy
- ✅ Focus management
- ✅ Color contrast (WCAG AA)

**Automated Testing:**
- ✅ axe-core accessibility scan
- ✅ ARIA attribute validation
- ✅ Focus trap in modal/panel

---

### 16. Documentation Requirements

#### User-Facing Documentation

**Help Articles:**
1. "Filtering Your Transactions" - Overview guide
2. "Quick Filters vs Advanced Filters" - Feature comparison
3. "Creating Custom Date Ranges" - Tutorial
4. "Saving Filter Presets" - Phase 3 feature (future)

**In-App Tooltips:**
- Tooltip on "More filters": "Access additional filter options"
- Tooltip on filter chips: "Click × to remove this filter"
- Tooltip on "Clear all": "Remove all active filters and reset to This Month"

---

#### Developer Documentation

**Component API Docs:**
- Props and usage for QuickFilterBar
- Props and usage for ActiveFilterChips
- Props and usage for AdvancedFiltersPanel

**State Management Guide:**
- Filter state structure
- How to add new filter types
- Persistence strategy

**Testing Guide:**
- How to test filter components
- Mock data for tests
- E2E test scenarios

---

### 17. Open Questions & Decisions Needed

#### Product Decisions

1. **Default Filter:**
   - ✅ **Recommendation:** "This Month"
   - Alternative: "Last 30 Days"
   - Reasoning: Month boundaries align with budgeting cycles

2. **Filter Persistence:**
   - ✅ **Recommendation:** Session-only (resets on close)
   - Alternative: Persistent across sessions
   - Reasoning: Financial apps often reset to default for privacy

3. **Custom Range Button:**
   - ✅ **Recommendation:** Dropdown with presets + custom picker
   - Alternative: Direct calendar picker
   - Reasoning: Presets cover 80% use cases, custom available for 20%

4. **Advanced Filters Trigger:**
   - ✅ **Recommendation:** "More filters" text link/button
   - Alternative: Gear icon, "Advanced" button
   - Reasoning: Clear, explicit language

5. **Amount Range Filter:**
   - Phase 3 feature
   - Decision needed: Single currency or dual currency?
   - Recommendation: Single currency with currency selector

---

#### Technical Decisions

1. **State Management:**
   - ✅ **Current:** Local component state
   - Alternative: Context API, Zustand, or other state library
   - Recommendation: Stay with local state unless app-wide filter state needed

2. **URL Parameters:**
   - Should filters be reflected in URL?
   - Pros: Shareable links, browser back/forward
   - Cons: URL complexity, privacy concerns
   - **Recommendation:** Don't add to URL (financial privacy)

3. **Animation Library:**
   - Use Framer Motion for advanced filter panel?
   - Alternative: CSS transitions only
   - **Recommendation:** CSS transitions (smaller bundle, sufficient)

4. **Mobile Filter UI:**
   - Bottom sheet (slide up) or full-screen modal?
   - **Recommendation:** Bottom sheet for advanced filters
   - Reasoning: Maintains context, familiar mobile pattern

---

### 18. Future Enhancements (Post-Phase 3)

#### Intelligent Filtering

1. **AI-Powered Suggestions:**
   - "You usually filter by [Vendor: Starbucks] for [This Month]"
   - One-click apply suggested filter
   - Learn from user behavior

2. **Natural Language Search:**
   - "Show me coffee expenses last week"
   - Parse query and apply appropriate filters
   - Voice input support

3. **Smart Categories:**
   - Auto-detect spending categories
   - Filter by category (dining, transport, shopping)
   - Visual category icons

---

#### Advanced Analytics Integration

1. **Filter-Based Insights:**
   - "Your Starbucks spending is up 30% this month"
   - Show trends for current filter selection
   - Compare filtered data across time periods

2. **Export Filtered Data:**
   - CSV export of filtered transactions
   - PDF report generation
   - Schedule regular filter-based reports

---

#### Collaboration Features

1. **Shared Filter Views:**
   - Share filter configuration with household members
   - "View John's coffee expenses"
   - Collaborative budget tracking

2. **Filter Templates:**
   - Pre-built filters for common scenarios
   - "Monthly Budget Review"
   - "Tax Preparation"
   - "Business Expenses"

---

### 19. Design Tokens & Styling

#### Color Palette

**Filter Buttons:**
```scss
// Inactive state
--filter-btn-bg: white
--filter-btn-text: #3f3f46 (zinc-700)
--filter-btn-border: #e4e4e7 (zinc-200)

// Active state
--filter-btn-active-bg: #2563eb (blue-600)
--filter-btn-active-text: white
--filter-btn-active-border: transparent

// Hover (inactive)
--filter-btn-hover-bg: #fafafa (zinc-50)
--filter-btn-hover-text: #18181b (zinc-900)

// Hover (active)
--filter-btn-active-hover-bg: #1d4ed8 (blue-700)
```

**Filter Chips:**
```scss
--chip-bg: #dbeafe (blue-100)
--chip-text: #1e3a8a (blue-900)
--chip-border: #bfdbfe (blue-200)
--chip-hover-bg: #bfdbfe (blue-200)
```

**Quick Filter Bar:**
```scss
--filter-bar-bg: #fafafa (zinc-50)
--filter-bar-border: #e4e4e7 (zinc-200)
```

---

#### Typography

**Filter Labels:**
```scss
font-family: Inter, system-ui, sans-serif
font-size: 13px
font-weight: 500
line-height: 1.4
color: #52525b (zinc-600)
```

**Filter Buttons:**
```scss
font-family: Inter, system-ui, sans-serif
font-size: 14px
font-weight: 500
line-height: 20px
```

**Filter Chips:**
```scss
font-family: Inter, system-ui, sans-serif
font-size: 13px
font-weight: 500
line-height: 1.2
```

---

#### Spacing

**Quick Filter Bar:**
```scss
padding: 12px 16px
gap: 16px (between sections)
border-radius: 8px
```

**Filter Buttons:**
```scss
padding: 8px 16px
height: 36px
border-radius: 6px
gap: 8px (between buttons)
```

**Filter Chips:**
```scss
padding: 4px 12px
height: 28px
border-radius: 16px (pill)
gap: 8px (between chips)
```

---

### 20. Conclusion & Next Steps

#### Summary

This redesign transforms the transaction filtering experience from hidden, complex accordion-based filters to an intuitive, always-visible quick filter system with progressive disclosure for advanced options.

**Key Improvements:**
1. ✅ Smart default ("This Month") reduces cognitive load
2. ✅ One-click date range switching increases efficiency
3. ✅ Always-visible filters improve discoverability
4. ✅ Active filter chips provide clear feedback
5. ✅ Progressive disclosure maintains clean UI while preserving power
6. ✅ Mobile-optimized for on-the-go usage

---

#### Immediate Next Steps

**For Product Team:**
1. Review and approve design direction
2. Prioritize Phase 1 vs Phase 2 features
3. Decide on open questions (see Section 17)
4. Schedule user testing for prototype

**For Design Team:**
1. Create high-fidelity mockups in Figma
2. Design mobile bottom sheet interactions
3. Document component variants in design system
4. Create prototype for user testing

**For Development Team:**
1. Review technical implementation notes
2. Estimate Phase 1 implementation effort
3. Identify any technical constraints
4. Plan code structure and component breakdown

**For QA Team:**
1. Review testing strategy
2. Create test plan based on user flows
3. Prepare accessibility testing checklist
4. Set up E2E test framework

---

#### Success Criteria for Launch

**Phase 1 Success:**
- [ ] Default "This Month" filter applies on page load
- [ ] Quick filter bar renders on desktop and mobile
- [ ] Date preset buttons work correctly
- [ ] Transaction type filter works correctly
- [ ] Active filter chips display accurately
- [ ] Clear all functionality works
- [ ] Existing advanced filters accessible
- [ ] No regressions in existing functionality
- [ ] Passes accessibility audit (WCAG AA)
- [ ] Mobile experience is smooth and intuitive
- [ ] Page performance maintained or improved

**User Adoption:**
- 80%+ of users interact with filters within first session
- 50%+ of users use quick filters vs accordion
- Reduced support queries about finding transactions
- Positive user feedback in surveys

---

### Appendix A: Competitive Analysis Summary

**YNAB (You Need A Budget):**
- ✅ Strong filtering with visual feedback
- ✅ Information bar shows active filters
- ✅ Single-tap to clear filters
- ✅ Category-based filtering prominent
- ❌ No quick date presets
- **Lesson:** Visual filter feedback is essential

**Mint:**
- ✅ Category, timeframe, and account filters
- ✅ Customizable reports by filter
- ✅ Date range selector with presets
- ❌ Filters somewhat buried in interface
- **Lesson:** Make filters prominent, not hidden

**Stripe Dashboard:**
- ✅ Prominent filter bar always visible
- ✅ Date presets: Last 7 days, 30 days, etc.
- ✅ Filter chips show active filters
- ✅ Fast filter application
- **Lesson:** Developer-focused UIs prioritize speed and clarity

**Chase Bank App:**
- ✅ Simple date range selector
- ✅ Transaction type filter
- ✅ Search by description
- ❌ Limited advanced filtering
- **Lesson:** Focus on 80% use cases, don't over-complicate

**PayPal:**
- ✅ Date presets in dropdown
- ✅ Quick filters for status
- ✅ Search prominent
- ❌ Advanced filters hard to discover
- **Lesson:** Balance simple and advanced

---

### Appendix B: User Research Insights

**Pain Points from User Feedback:**
1. "I can't find transactions from last month easily"
   - → Solution: Quick "Last Month" preset

2. "Too many clicks to filter by vendor"
   - → Solution: Advanced filters panel with saved state

3. "I don't know what transactions I'm looking at"
   - → Solution: Active filter chips showing current view

4. "The page loads with too much data"
   - → Solution: Default to "This Month"

5. "I want to see just my Starbucks expenses"
   - → Solution: Combine vendor filter + type filter easily

**User Mental Models:**
- Users think in time periods first (when), then categories (what)
- Users expect "current month" as default timeframe
- Users want to quickly compare time periods
- Users expect filters to be sticky within a session
- Users prefer visual feedback over hidden state

---

### Appendix C: Implementation Checklist

#### Pre-Development
- [ ] Design approval from stakeholders
- [ ] Figma mockups completed
- [ ] User testing completed
- [ ] Technical feasibility confirmed
- [ ] Dependencies identified
- [ ] Acceptance criteria defined

#### Phase 1 Development
- [ ] Create utility functions for date presets
- [ ] Create QuickFilterBar component
- [ ] Create ActiveFilterChips component
- [ ] Update AllTransactionsPage with default filter
- [ ] Wire QuickFilterBar to filter state
- [ ] Wire ActiveFilterChips to filter state
- [ ] Implement "Clear all" functionality
- [ ] Add filter persistence (sessionStorage)
- [ ] Style components per design spec
- [ ] Responsive layout for mobile
- [ ] Unit tests for new components
- [ ] Integration tests for filter flows
- [ ] Accessibility testing
- [ ] Performance testing
- [ ] Code review
- [ ] QA testing
- [ ] User acceptance testing
- [ ] Documentation updates

#### Phase 2 Development
- [ ] Create AdvancedFiltersPanel component
- [ ] Implement custom date range dropdown
- [ ] Add all date presets to dropdown
- [ ] Mobile bottom sheet implementation
- [ ] Animation for panel open/close
- [ ] Apply/Reset button functionality
- [ ] Move existing filters to panel
- [ ] Test filter combinations
- [ ] E2E tests for advanced filters
- [ ] Mobile testing on devices
- [ ] Performance optimization
- [ ] Documentation updates

#### Post-Launch
- [ ] Monitor filter usage metrics
- [ ] Collect user feedback
- [ ] Track performance metrics
- [ ] Identify issues/bugs
- [ ] Plan Phase 3 features
- [ ] Iterate based on learnings

---

**END OF DOCUMENT**

---

## Document Metadata

**Author:** Claude (AI UX Designer)
**Reviewer:** [Pending]
**Approved By:** [Pending]
**Version:** 1.0
**Last Updated:** 2025-10-21
**Related Documents:**
- Transaction Table Implementation Guide
- Design System - Filter Components
- Accessibility Standards
