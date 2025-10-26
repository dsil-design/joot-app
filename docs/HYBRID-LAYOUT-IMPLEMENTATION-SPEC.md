# Hybrid 2-Row Button Layout - Implementation Specification
## Conditional Alternative to Vertical Layout

**Status:** OPTIONAL - Use only if vertical space is critical
**Complexity:** Medium
**Implementation Time:** 3-4 hours
**UX Score:** 7.7/10 (vs. 9.0/10 for vertical)

---

## When to Use This Layout

### Use Cases (All must apply)
1. **Space-constrained environments:**
   - Accessibility magnification (200%+)
   - Split-screen multitasking
   - Embedded form contexts

2. **User testing validates improvement:**
   - A/B test shows ≥10% faster completion
   - Error rate remains <10%
   - User satisfaction ≥4.0/5

3. **Team consensus:**
   - Product team approves trade-offs
   - Design system allows exception
   - Stakeholders understand UX implications

### Do NOT Use If
- Standard mobile form usage
- No user testing conducted
- Internationalization is critical (French/German/Spanish)
- Accessibility is primary concern (WCAG AAA required)

---

## Visual Specification

### Layout Structure

```
┌────────────────────────────────────────┐
│  Background: #FFFFFF                   │
│  Border-top: 1px solid #E4E4E7         │
│  Shadow: 0 -1px 3px rgba(0,0,0,0.05)   │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │           SAVE                   │  │ Row 1: Primary
│  │     bg-primary (#155DFC)         │  │ 44px × 288px
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                ↕ 10px gap              │
│  ┌────────────────┐  ┌───────────────┐│
│  │                │  │               ││
│  │  SAVE & NEW    │  │    CANCEL     ││ Row 2: Secondary
│  │  bg-secondary  │  │   bg-ghost    ││ 44px × 136px ea.
│  │                │  │               ││
│  └────────────────┘  └───────────────┘│
│       136px    ↔ 8px   136px          │
└────────────────────────────────────────┘
        Total Height: 126px (base)
```

### Dimensions Table

| Element           | Width    | Height | Margin/Gap |
|-------------------|----------|--------|------------|
| Footer Container  | 100vw    | 126px  | 0          |
| Primary Button    | 288px    | 44px   | 16px L/R   |
| Secondary Buttons | 136px ea.| 44px   | 16px L/R   |
| Vertical Gap      | -        | 10px   | gap-2.5    |
| Horizontal Gap    | 8px      | -      | gap-2.5    |
| Top Padding       | -        | 12px   | pt-3       |
| Bottom Padding    | -        | 16px+  | pb-safe    |

### Color & Typography

```
Primary Button (Save):
- Background: var(--primary) → #155DFC
- Text: var(--primary-foreground) → #FFFFFF
- Font: 16px (text-base), 500 weight (font-medium)
- Hover: bg-primary/90 → #1447E6

Secondary Button (Save & New):
- Background: var(--secondary) → #F4F4F5
- Text: var(--secondary-foreground) → #18181B
- Font: 16px (text-base), 500 weight (font-medium)
- Hover: bg-secondary/80 → #E4E4E7

Ghost Button (Cancel):
- Background: transparent
- Text: var(--foreground) → #09090B
- Font: 16px (text-base), 500 weight (font-medium)
- Hover: bg-accent → #F4F4F5
```

---

## React/TypeScript Implementation

### Component Code

```tsx
// src/components/forms/transaction-form.tsx

interface TransactionFormProps {
  // ... existing props
  footerLayout?: 'vertical' | 'hybrid'  // Add new prop
}

export function TransactionForm({
  // ... existing props
  footerLayout = 'vertical',  // Default to vertical
}: TransactionFormProps) {
  // ... existing state and handlers

  // Footer layout variations
  const FooterVertical = () => (
    <div className="flex flex-col gap-2.5 items-start justify-start w-full">
      <Button
        onClick={handleSubmit}
        disabled={saving || !isFormValid}
        size="lg"
        className="w-full h-11 text-base font-medium"
        aria-label="Save transaction"
      >
        {saving ? "Saving..." : saveButtonLabel || (mode === "edit" ? "Save changes" : "Save")}
      </Button>
      {onSaveAndAddAnother && mode === "add" && (
        <Button
          variant="secondary"
          onClick={handleSubmitAndAddAnother}
          disabled={saving || !isFormValid}
          size="lg"
          className="w-full h-11 text-base font-medium"
          aria-label="Save transaction and add another"
        >
          {saving ? "Saving..." : "Save & New"}
        </Button>
      )}
      <Button
        variant="ghost"
        onClick={onCancel}
        disabled={saving}
        size="lg"
        className="w-full h-11 text-base font-medium"
        aria-label="Discard changes"
      >
        {cancelButtonLabel || (mode === "edit" ? "Discard" : "Cancel")}
      </Button>
    </div>
  )

  const FooterHybrid = () => (
    <div className="grid grid-cols-2 gap-2.5 w-full">
      {/* Primary button - full width */}
      <Button
        onClick={handleSubmit}
        disabled={saving || !isFormValid}
        size="lg"
        className="col-span-2 h-11 text-base font-medium"
        aria-label="Save transaction"
      >
        {saving ? "Saving..." : saveButtonLabel || (mode === "edit" ? "Save changes" : "Save")}
      </Button>

      {/* Secondary buttons - split row */}
      {onSaveAndAddAnother && mode === "add" ? (
        <>
          <Button
            variant="secondary"
            onClick={handleSubmitAndAddAnother}
            disabled={saving || !isFormValid}
            size="lg"
            className="h-11 text-base font-medium"
            aria-label="Save transaction and add another"
          >
            {saving ? "Saving..." : "Save & New"}
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={saving}
            size="lg"
            className="h-11 text-base font-medium"
            aria-label="Discard changes"
          >
            {cancelButtonLabel || (mode === "edit" ? "Discard" : "Cancel")}
          </Button>
        </>
      ) : (
        /* Edit mode: only cancel button, centered */
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
          size="lg"
          className="col-span-2 h-11 text-base font-medium"
          aria-label="Discard changes"
        >
          {cancelButtonLabel || "Discard"}
        </Button>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-6 md:gap-8 items-start justify-start w-full">
      {/* ... existing form fields ... */}

      {/* Actions Footer - Responsive */}
      <div className="
        flex flex-col items-start justify-start w-full
        md:gap-3 md:relative md:static
        fixed bottom-0 left-0 right-0
        bg-white pt-3 md:pt-4
        [padding-bottom:max(1rem,calc(1rem+env(safe-area-inset-bottom)))]
        md:pb-0
        border-t md:border-t-0 border-zinc-200
        shadow-[0_-1px_3px_0_rgb(0_0_0_/0.05)] md:shadow-none
        z-50
        transaction-form-footer
      "
        role="group"
        aria-label="Form actions"
      >
        {footerLayout === 'vertical' ? <FooterVertical /> : <FooterHybrid />}
      </div>
    </div>
  )
}
```

### CSS Updates

```css
/* src/app/globals.css */

/* Existing footer styles remain the same */
.transaction-form-footer {
  width: 100vw;
  max-width: 100vw;
  left: 0;
  right: 0;
}

.transaction-form-footer > * {
  margin-left: max(1rem, env(safe-area-inset-left));
  margin-right: max(1rem, env(safe-area-inset-right));
}

@media (min-width: 640px) {
  .transaction-form-footer > * {
    margin-left: max(1.5rem, env(safe-area-inset-left));
    margin-right: max(1.5rem, env(safe-area-inset-right));
  }
}

@media (min-width: 768px) {
  .transaction-form-footer {
    width: 100%;
    max-width: 100%;
    position: relative;
  }

  .transaction-form-footer > * {
    margin-left: 0;
    margin-right: 0;
  }
}

/* NEW: Hybrid layout specific styles (if needed) */
.transaction-form-footer .grid {
  /* Ensure grid respects safe area margins */
  padding-left: 0;
  padding-right: 0;
}

/* NEW: Prevent button text overflow in hybrid layout */
.transaction-form-footer .grid button {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

---

## Usage Examples

### Add Transaction Page (Default Vertical)

```tsx
// src/app/add-transaction/page.tsx

export default function AddTransactionPage() {
  // ... existing code

  return (
    <div className="...">
      <h1>Add transaction</h1>

      <div className="w-full pb-[180px] md:pb-0">
        <TransactionForm
          mode="add"
          onSave={handleSave}
          onSaveAndAddAnother={handleSaveAndAddAnother}
          onCancel={handleCancel}
          saving={saving}
          showDateStepper={true}
          useStandardAmountInput={false}
          // footerLayout="vertical" (default, can omit)
        />
      </div>
    </div>
  )
}
```

### Add Transaction with Hybrid Layout (Opt-in)

```tsx
// src/app/add-transaction/page.tsx

export default function AddTransactionPage() {
  // ... existing code

  return (
    <div className="...">
      <h1>Add transaction</h1>

      {/* Adjust padding for shorter footer */}
      <div className="w-full pb-[140px] md:pb-0">
        <TransactionForm
          mode="add"
          onSave={handleSave}
          onSaveAndAddAnother={handleSaveAndAddAnother}
          onCancel={handleCancel}
          saving={saving}
          showDateStepper={true}
          useStandardAmountInput={false}
          footerLayout="hybrid"  // OPT-IN to hybrid layout
        />
      </div>
    </div>
  )
}
```

### Feature Flag Implementation (A/B Testing)

```tsx
// src/app/add-transaction/page.tsx

'use client'

import { useFeatureFlag } from '@/hooks/useFeatureFlag'

export default function AddTransactionPage() {
  const { isEnabled } = useFeatureFlag('hybrid-footer-layout')

  return (
    <div className="...">
      <h1>Add transaction</h1>

      <div className={`w-full ${isEnabled ? 'pb-[140px]' : 'pb-[180px]'} md:pb-0`}>
        <TransactionForm
          mode="add"
          onSave={handleSave}
          onSaveAndAddAnother={handleSaveAndAddAnother}
          onCancel={handleCancel}
          saving={saving}
          showDateStepper={true}
          useStandardAmountInput={false}
          footerLayout={isEnabled ? 'hybrid' : 'vertical'}
        />
      </div>
    </div>
  )
}
```

---

## Accessibility Considerations

### ARIA Labels (Important!)

```tsx
// Ensure clear button identification

<Button
  aria-label="Save transaction"           // Not just "Save"
  aria-describedby="save-help"            // Optional tooltip
>
  Save
</Button>

<Button
  aria-label="Save transaction and add another"  // Full description
  aria-describedby="save-new-help"
>
  Save & New
</Button>

<Button
  aria-label="Discard changes and return to previous page"
>
  Cancel
</Button>
```

### Keyboard Navigation

```tsx
// Maintain tab order (left-to-right, top-to-bottom)

<div
  role="group"
  aria-label="Form actions"
  className="grid grid-cols-2 gap-2.5"
>
  <Button tabIndex={0}>Save</Button>         {/* Tab order: 1 */}
  <Button tabIndex={0}>Save & New</Button>   {/* Tab order: 2 */}
  <Button tabIndex={0}>Cancel</Button>       {/* Tab order: 3 */}
</div>
```

### Focus Indicators

```css
/* Ensure focus is visible in grid layout */
.transaction-form-footer button:focus-visible {
  outline: 3px solid var(--ring);
  outline-offset: 2px;
  z-index: 10; /* Prevent overlap with adjacent buttons */
}
```

---

## Testing Checklist

### Visual Regression Testing

```bash
# Capture screenshots for comparison
npm run test:visual -- --component=TransactionForm --variant=hybrid

# Test on multiple devices
- iPhone SE (320px)
- iPhone 14 (390px)
- iPhone 14 Pro Max (428px)
- iPad Mini (768px) - should show vertical on tablet
```

### Unit Tests

```tsx
// src/__tests__/components/transaction-form-hybrid.test.tsx

import { render, screen } from '@testing-library/react'
import { TransactionForm } from '@/components/forms/transaction-form'

describe('TransactionForm - Hybrid Layout', () => {
  it('renders three buttons in grid layout', () => {
    render(
      <TransactionForm
        mode="add"
        footerLayout="hybrid"
        onSave={jest.fn()}
        onSaveAndAddAnother={jest.fn()}
        onCancel={jest.fn()}
      />
    )

    const saveButton = screen.getByRole('button', { name: /save transaction/i })
    const saveNewButton = screen.getByRole('button', { name: /save.*and add another/i })
    const cancelButton = screen.getByRole('button', { name: /discard/i })

    expect(saveButton).toBeInTheDocument()
    expect(saveNewButton).toBeInTheDocument()
    expect(cancelButton).toBeInTheDocument()

    // Check grid layout
    const footer = saveButton.closest('[role="group"]')
    expect(footer).toHaveClass('grid', 'grid-cols-2')
  })

  it('primary button spans full width', () => {
    render(
      <TransactionForm
        mode="add"
        footerLayout="hybrid"
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    )

    const saveButton = screen.getByRole('button', { name: /save transaction/i })
    expect(saveButton).toHaveClass('col-span-2')
  })

  it('secondary buttons are in split row', () => {
    render(
      <TransactionForm
        mode="add"
        footerLayout="hybrid"
        onSave={jest.fn()}
        onSaveAndAddAnother={jest.fn()}
        onCancel={jest.fn()}
      />
    )

    const saveNewButton = screen.getByRole('button', { name: /save.*and add another/i })
    const cancelButton = screen.getByRole('button', { name: /discard/i })

    // Both buttons should NOT have col-span-2
    expect(saveNewButton).not.toHaveClass('col-span-2')
    expect(cancelButton).not.toHaveClass('col-span-2')
  })
})
```

### Interaction Tests

```tsx
// src/__tests__/components/transaction-form-hybrid-interactions.test.tsx

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('TransactionForm - Hybrid Layout Interactions', () => {
  it('calls correct handler when Save is clicked', async () => {
    const handleSave = jest.fn()

    render(
      <TransactionForm
        mode="add"
        footerLayout="hybrid"
        onSave={handleSave}
        onCancel={jest.fn()}
        initialData={{
          description: 'Test',
          amount: '100',
          transactionDate: new Date()
        }}
      />
    )

    const saveButton = screen.getByRole('button', { name: /save transaction/i })
    await userEvent.click(saveButton)

    expect(handleSave).toHaveBeenCalledTimes(1)
  })

  it('calls correct handler when Save & New is clicked', async () => {
    const handleSaveAndAddAnother = jest.fn()

    render(
      <TransactionForm
        mode="add"
        footerLayout="hybrid"
        onSave={jest.fn()}
        onSaveAndAddAnother={handleSaveAndAddAnother}
        onCancel={jest.fn()}
        initialData={{
          description: 'Test',
          amount: '100',
          transactionDate: new Date()
        }}
      />
    )

    const saveNewButton = screen.getByRole('button', { name: /save.*and add another/i })
    await userEvent.click(saveNewButton)

    expect(handleSaveAndAddAnother).toHaveBeenCalledTimes(1)
  })

  it('maintains keyboard navigation order', async () => {
    render(
      <TransactionForm
        mode="add"
        footerLayout="hybrid"
        onSave={jest.fn()}
        onSaveAndAddAnother={jest.fn()}
        onCancel={jest.fn()}
      />
    )

    const saveButton = screen.getByRole('button', { name: /save transaction/i })
    const saveNewButton = screen.getByRole('button', { name: /save.*and add another/i })
    const cancelButton = screen.getByRole('button', { name: /discard/i })

    // Simulate tab navigation
    saveButton.focus()
    expect(document.activeElement).toBe(saveButton)

    await userEvent.tab()
    expect(document.activeElement).toBe(saveNewButton)

    await userEvent.tab()
    expect(document.activeElement).toBe(cancelButton)
  })
})
```

### Accessibility Audit

```bash
# Run axe-core accessibility tests
npm run test:a11y -- --component=TransactionForm --variant=hybrid

# Should pass:
# - 2.5.5 Target Size (Level AAA): 44×136px buttons
# - 1.4.3 Contrast (Minimum): All text passes
# - 2.4.7 Focus Visible: Focus indicators present
# - 4.1.2 Name, Role, Value: All buttons have aria-labels
```

---

## Performance Considerations

### Layout Shift Prevention

```tsx
// Ensure consistent height regardless of button count

const footerHeight = {
  vertical: {
    twoButtons: 126,  // Save + Cancel (edit mode)
    threeButtons: 180 // Save + Save&New + Cancel (add mode)
  },
  hybrid: {
    twoButtons: 126,  // Same as three (grid collapses nicely)
    threeButtons: 126 // Consistent height!
  }
}

// Use in page layout
<div className={`pb-[${footerHeight.hybrid.threeButtons}px] md:pb-0`}>
  <TransactionForm footerLayout="hybrid" />
</div>
```

### CSS Grid Performance

```css
/* Optimize grid layout for GPU acceleration */
.transaction-form-footer .grid {
  will-change: transform; /* Hint for compositor */
  transform: translateZ(0); /* Force GPU layer */
}

/* Prevent layout thrashing */
.transaction-form-footer button {
  contain: layout style; /* Isolate layout calculations */
}
```

---

## Internationalization Testing

### Required Language Tests

| Language | "Save & New" Translation | Fits in 136px? | Notes |
|----------|-------------------------|----------------|-------|
| English  | Save & New              | ✓ Yes (88px)   | Base case |
| Spanish  | Guardar y nuevo         | ✓ Yes (136px)  | Exact fit |
| German   | Speichern & neu         | ~ Tight (128px)| Works |
| French   | Enregistrer & nouveau   | ✗ No (176px)   | TRUNCATES |
| Japanese | 保存して新規             | ✓ Yes (96px)   | Works |
| Chinese  | 保存并新建               | ✓ Yes (96px)   | Works |

**Critical:** French language will truncate. Solutions:

1. **Accept truncation (not recommended):**
   ```
   Enregistrer & n...
   ```

2. **Use shorter French translation:**
   ```
   "Sauver & nouveau" (112px) ✓ Fits
   ```

3. **Fallback to vertical on French locale:**
   ```tsx
   const layout = locale === 'fr' ? 'vertical' : 'hybrid'
   ```

---

## Migration Guide

### Step 1: Add Feature Flag (Day 1)

```typescript
// src/lib/features.ts

export const FEATURES = {
  HYBRID_FOOTER_LAYOUT: {
    key: 'hybrid-footer-layout',
    defaultEnabled: false,
    description: 'Use hybrid 2-row button layout in forms'
  }
}
```

### Step 2: Update Component (Day 1-2)

```tsx
// Add footerLayout prop to TransactionForm
// Implement FooterHybrid subcomponent
// Add unit tests
```

### Step 3: A/B Test Setup (Day 2-3)

```typescript
// src/lib/analytics.ts

export function trackFooterLayout(layout: 'vertical' | 'hybrid') {
  analytics.track('footer_layout_impression', {
    layout,
    timestamp: Date.now()
  })
}

export function trackButtonClick(buttonName: string, layout: string) {
  analytics.track('footer_button_click', {
    button: buttonName,
    layout,
    timestamp: Date.now()
  })
}
```

### Step 4: Gradual Rollout (Week 2-4)

```typescript
// Rollout schedule
const rollout = {
  week1: { percentage: 10, users: 'internal_testers' },
  week2: { percentage: 25, users: 'beta_users' },
  week3: { percentage: 50, users: 'all_users' },
  week4: { percentage: 100, decision: 'based_on_metrics' }
}
```

### Step 5: Metrics Analysis (Week 4)

```sql
-- Query A/B test results
SELECT
  footer_layout,
  COUNT(*) as impressions,
  AVG(completion_time_ms) as avg_completion_time,
  SUM(CASE WHEN error_occurred THEN 1 ELSE 0 END) / COUNT(*) as error_rate,
  AVG(satisfaction_rating) as avg_satisfaction
FROM
  form_submissions
WHERE
  created_at >= '2025-11-01'
GROUP BY
  footer_layout;
```

**Success Criteria:**
- Hybrid error_rate ≤ 10% (vs. 5% for vertical)
- Hybrid avg_completion_time ≤ 3.5s (vs. 3.3s for vertical)
- Hybrid avg_satisfaction ≥ 4.0 (vs. 4.2 for vertical)

**If metrics pass:** Ship hybrid to 100%
**If metrics fail:** Revert to vertical, document learnings

---

## Rollback Plan

### Quick Rollback (Emergency)

```tsx
// src/app/add-transaction/page.tsx

// Change this line:
footerLayout="hybrid"

// To this:
footerLayout="vertical"

// Deploy immediately
```

### Feature Flag Rollback

```typescript
// src/lib/features.ts

export const FEATURES = {
  HYBRID_FOOTER_LAYOUT: {
    defaultEnabled: false,  // ← Set to false
    // ...
  }
}
```

### Database Rollback (If Stored)

```sql
-- Reset user preferences
UPDATE user_preferences
SET footer_layout_preference = 'vertical'
WHERE footer_layout_preference = 'hybrid';
```

---

## Documentation Updates

### Design System Documentation

```markdown
# Form Footer Button Layouts

## Vertical Layout (Default)
- Use for: Standard forms, accessibility-first designs
- Benefits: Large tap targets, clear hierarchy
- UX Score: 9.0/10

## Hybrid 2-Row Layout (Opt-in)
- Use for: Space-constrained environments
- Benefits: 30% space savings, adequate tap targets
- UX Score: 7.7/10
- Requirements: User testing validation

## Never Use
- Pure horizontal 3-button layout (fails i18n)
- Icon-only buttons (fails WCAG)
```

### Component API Documentation

```tsx
/**
 * TransactionForm - Form for adding/editing transactions
 *
 * @prop {string} footerLayout - Button layout variant
 *   - 'vertical': Stack all buttons vertically (default)
 *   - 'hybrid': Primary full-width, secondary split row
 *
 * @example
 * // Default vertical layout
 * <TransactionForm mode="add" onSave={handleSave} />
 *
 * @example
 * // Hybrid layout (opt-in after A/B testing)
 * <TransactionForm mode="add" footerLayout="hybrid" onSave={handleSave} />
 */
```

---

## Final Checklist

Before shipping hybrid layout:

- [ ] Unit tests pass (100% coverage)
- [ ] Visual regression tests pass
- [ ] Accessibility audit passes (axe-core)
- [ ] Cross-browser testing complete (iOS Safari, Chrome)
- [ ] i18n testing complete (English, Spanish, German)
- [ ] A/B test data shows improvement or neutrality
- [ ] Product team approval obtained
- [ ] Design system documentation updated
- [ ] Rollback plan documented
- [ ] Monitoring dashboards configured

---

**Document Version:** 1.0
**Status:** Implementation Ready
**Estimated Effort:** 3-4 hours coding + 1-2 weeks testing
**Risk Level:** Medium (UX trade-offs, requires validation)

**Recommendation:** Only implement if user testing validates improvement over vertical layout.
