# Smart Sticky Footer Implementation Guide
## Pattern E: Directional Scroll Awareness

**Date:** October 26, 2025
**Estimated Time:** 5 hours
**Difficulty:** Medium
**Risk:** Low

---

## Overview

This guide provides step-by-step instructions for implementing a "Smart Sticky" footer that hides when users scroll down (filling the form) and appears when users scroll up (ready to submit).

**Pattern Used By:** Medium, Twitter/X, YouTube, Chrome Mobile

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Scroll Direction Hook](#step-1-create-scroll-direction-hook)
3. [Step 2: Update Transaction Form](#step-2-update-transaction-form)
4. [Step 3: Add ARIA Support](#step-3-add-aria-support)
5. [Step 4: Testing](#step-4-testing)
6. [Step 5: Tuning & Optimization](#step-5-tuning--optimization)
7. [Rollback Plan](#rollback-plan)

---

## Prerequisites

**Before starting:**
- [ ] Current form uses sticky footer (Pattern C)
- [ ] React 18+ with hooks support
- [ ] TypeScript configured
- [ ] Tailwind CSS available
- [ ] Development environment ready
- [ ] Real devices available for testing (iOS + Android)

**Time Allocation:**
- Hook creation: 1 hour
- Component integration: 1 hour
- ARIA implementation: 1 hour
- Testing & tuning: 2 hours
- **Total: 5 hours**

---

## Step 1: Create Scroll Direction Hook

### 1.1 Create Hook File

**File:** `/src/hooks/useScrollDirection.ts`

**Estimated Time:** 1 hour

```typescript
import { useEffect, useState, useRef } from 'react'

export type ScrollDirection = 'up' | 'down' | 'none'

interface UseScrollDirectionOptions {
  /**
   * Minimum scroll distance (in pixels) before direction is detected.
   * Prevents jitter from small scroll movements.
   * @default 10
   */
  threshold?: number

  /**
   * Debounce delay in milliseconds.
   * Prevents rapid state changes during scroll.
   * @default 0
   */
  debounce?: number

  /**
   * Enable/disable the hook.
   * Useful for conditional behavior (e.g., mobile only).
   * @default true
   */
  enabled?: boolean
}

/**
 * Detects scroll direction with optimized performance.
 *
 * @example
 * ```tsx
 * const scrollDirection = useScrollDirection({ threshold: 10, debounce: 100 })
 * const showFooter = scrollDirection !== 'down'
 * ```
 *
 * @param options - Configuration options
 * @returns Current scroll direction ('up', 'down', or 'none')
 */
export function useScrollDirection(options: UseScrollDirectionOptions = {}) {
  const {
    threshold = 10,
    debounce = 0,
    enabled = true
  } = options

  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('none')
  const lastScrollY = useRef(0)
  const ticking = useRef(false)
  const debounceTimer = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!enabled) return

    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY

      // Check if scroll distance exceeds threshold
      const scrollDistance = Math.abs(currentScrollY - lastScrollY.current)
      if (scrollDistance < threshold) {
        ticking.current = false
        return
      }

      // Determine direction
      const newDirection: ScrollDirection =
        currentScrollY > lastScrollY.current && currentScrollY > threshold
          ? 'down'
          : currentScrollY < lastScrollY.current
          ? 'up'
          : 'none'

      // Update state (with optional debounce)
      if (debounce > 0) {
        clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => {
          setScrollDirection(newDirection)
        }, debounce)
      } else {
        setScrollDirection(newDirection)
      }

      lastScrollY.current = currentScrollY
      ticking.current = false
    }

    const handleScroll = () => {
      if (!ticking.current) {
        // Use requestAnimationFrame for optimal performance
        window.requestAnimationFrame(updateScrollDirection)
        ticking.current = true
      }
    }

    // Passive event listener for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [threshold, debounce, enabled])

  return scrollDirection
}
```

### 1.2 Test the Hook

**Create test file:** `/src/hooks/__tests__/useScrollDirection.test.ts`

```typescript
import { renderHook } from '@testing-library/react'
import { useScrollDirection } from '../useScrollDirection'

describe('useScrollDirection', () => {
  it('should return "none" initially', () => {
    const { result } = renderHook(() => useScrollDirection())
    expect(result.current).toBe('none')
  })

  it('should detect scroll down', () => {
    const { result } = renderHook(() => useScrollDirection({ threshold: 5 }))

    // Simulate scroll down
    window.scrollY = 100
    window.dispatchEvent(new Event('scroll'))

    // Wait for requestAnimationFrame
    setTimeout(() => {
      expect(result.current).toBe('down')
    }, 100)
  })

  // Add more tests as needed
})
```

**Validation:**
- [ ] Hook compiles without errors
- [ ] TypeScript types are correct
- [ ] Tests pass (if written)

---

## Step 2: Update Transaction Form

### 2.1 Import Hook

**File:** `/src/components/forms/transaction-form.tsx`

**Add import at top:**

```typescript
import { useScrollDirection } from '@/hooks/useScrollDirection'
```

### 2.2 Add Hook to Component

**Inside `TransactionForm` component, after existing state declarations:**

```typescript
export function TransactionForm(props: TransactionFormProps) {
  // ... existing state ...

  // Smart sticky footer scroll detection
  const scrollDirection = useScrollDirection({
    threshold: 10,  // Require 10px scroll to trigger
    debounce: 100,  // 100ms debounce to prevent flicker
  })

  // Footer is visible when NOT scrolling down
  const isFooterVisible = scrollDirection !== 'down'

  // ... rest of component ...
}
```

### 2.3 Update Footer JSX

**Find the footer section (around line 544) and update:**

**BEFORE:**
```typescript
<div className="flex flex-col gap-2.5 items-start justify-start w-full md:gap-3 md:relative md:static fixed bottom-0 left-0 right-0 bg-white pt-3 md:pt-4 [padding-bottom:max(1rem,calc(1rem+env(safe-area-inset-bottom)))] md:pb-0 border-t md:border-t-0 border-zinc-200 shadow-[0_-1px_3px_0_rgb(0_0_0_/0.05)] md:shadow-none z-50 transaction-form-footer">
```

**AFTER:**
```typescript
<div
  className={cn(
    // Base layout
    "flex flex-col gap-2.5 items-start justify-start w-full",

    // Responsive gap
    "md:gap-3",

    // Positioning: Fixed on mobile, static on desktop
    "md:relative md:static",
    "fixed bottom-0 left-0 right-0",

    // Appearance
    "bg-white",
    "pt-3 md:pt-4",
    "[padding-bottom:max(1rem,calc(1rem+env(safe-area-inset-bottom)))] md:pb-0",
    "border-t md:border-t-0 border-zinc-200",
    "shadow-[0_-1px_3px_0_rgb(0_0_0_/0.05)] md:shadow-none",
    "z-50",

    // Transition for smooth hide/show
    "transition-transform duration-300 ease-out",

    // Hide footer on mobile when scrolling down
    !isFooterVisible && "translate-y-full md:translate-y-0",

    "transaction-form-footer"
  )}
  data-visible={isFooterVisible}
  aria-hidden={!isFooterVisible}
>
```

**Don't forget to import `cn` if not already imported:**

```typescript
import { cn } from '@/lib/utils'
```

### 2.4 Add Desktop Override

**Important:** The footer should ALWAYS be visible on desktop (md breakpoint and above).

The `md:translate-y-0` class ensures this. Verify in DevTools that desktop behavior is unaffected.

### 2.5 Verify Button Accessibility

Ensure all buttons have proper `aria-label` attributes (already in place):

```typescript
<Button
  onClick={handleSubmit}
  disabled={saving || !isFormValid}
  size="lg"
  className="w-full h-11 text-base font-medium"
  aria-label="Save transaction"
>
  {/* ... */}
</Button>
```

**Validation:**
- [ ] Footer slides down when scrolling down (mobile only)
- [ ] Footer slides up when scrolling up
- [ ] Footer always visible on desktop (≥768px)
- [ ] Transitions smooth (300ms)
- [ ] No layout shift

---

## Step 3: Add ARIA Support

### 3.1 Add Live Region for Screen Readers

**Add this AFTER the opening `<div>` of the form:**

```typescript
return (
  <div className="flex flex-col gap-5 md:gap-6 w-full">

    {/* Screen reader announcement for footer visibility */}
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {!isFooterVisible && "Action buttons hidden while scrolling. Scroll up to show action buttons."}
    </div>

    {/* Rest of form fields */}
    {/* ... */}
  </div>
)
```

### 3.2 Add Screen Reader Only Class

**Ensure `sr-only` class exists in your globals.css:**

```css
/* Screen reader only - visually hidden but accessible */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**Validation:**
- [ ] VoiceOver/TalkBack announces footer state changes
- [ ] Live region doesn't create visual changes
- [ ] Announcement only happens when footer visibility changes

---

## Step 4: Testing

### 4.1 Manual Testing Checklist

#### Mobile Testing (iOS Safari)

**Test Devices:**
- [ ] iPhone SE (small screen, no notch)
- [ ] iPhone 14 Pro (Dynamic Island)
- [ ] iPhone 14 Pro Max (large screen)
- [ ] iPad Mini (tablet)

**Test Cases:**

1. **Basic Scroll Behavior**
   - [ ] Load page → Footer visible initially
   - [ ] Scroll down slowly → Footer slides down smoothly
   - [ ] Scroll up → Footer slides up smoothly
   - [ ] Footer always visible on iPad (desktop layout)

2. **Edge Cases**
   - [ ] Rapid scroll down/up → No flickering
   - [ ] Very slow scroll → Threshold prevents jitter
   - [ ] Form shorter than viewport → Footer stays visible
   - [ ] Keyboard opens → Footer behavior correct

3. **Safe Area Insets**
   - [ ] Footer respects iPhone notch/home indicator
   - [ ] No content overlap with bottom safe area
   - [ ] Padding adjusts correctly on iPhone X series

4. **Interaction During Transition**
   - [ ] Tap button while footer sliding → Works correctly
   - [ ] Form submission during scroll → No errors
   - [ ] Validation errors while footer hidden → Errors visible

#### Mobile Testing (Android Chrome)

**Test Devices:**
- [ ] Small phone (< 5.5")
- [ ] Standard phone (6-6.5")
- [ ] Large phone (> 6.5")
- [ ] Android tablet

**Test Cases:**
- [ ] Same as iOS tests above
- [ ] Address bar collapse/expand → Footer behaves correctly
- [ ] System navigation gestures → No conflicts

#### Desktop Testing

**Browsers:**
- [ ] Chrome (1280px, 1920px)
- [ ] Safari (1440px)
- [ ] Firefox (1280px)

**Test Cases:**
- [ ] Footer always visible (no smart sticky on desktop)
- [ ] Static positioning works
- [ ] No scroll detection triggered
- [ ] Resize window → Correct behavior at breakpoint

### 4.2 Accessibility Testing

#### Screen Reader Testing

**VoiceOver (iOS):**
- [ ] Open form with VoiceOver enabled
- [ ] Scroll down → Hear "Action buttons hidden while scrolling"
- [ ] Scroll up → Footer buttons discoverable
- [ ] Tab through form → Logical order
- [ ] Footer buttons have clear labels

**TalkBack (Android):**
- [ ] Same tests as VoiceOver
- [ ] Swipe navigation works correctly
- [ ] Hidden footer not in swipe order

**NVDA/JAWS (Desktop):**
- [ ] Tab through form → All fields reachable
- [ ] Footer buttons announced correctly
- [ ] Live region announcements working

#### Keyboard Navigation

- [ ] Tab through entire form
- [ ] Tab reaches footer buttons
- [ ] Shift+Tab goes backwards correctly
- [ ] Enter key submits form (if focused on button)
- [ ] Focus visible on all elements

#### Touch Target Testing

**Tool:** Chrome DevTools → More Tools → Rendering → "Show touch/click targets"

- [ ] All buttons meet 44×44px minimum
- [ ] No overlapping tap targets
- [ ] Footer buttons easy to tap during transition

### 4.3 Performance Testing

#### Frame Rate Monitoring

**Chrome DevTools Performance Tab:**

1. Start recording
2. Scroll up and down rapidly
3. Stop recording
4. Check FPS (should maintain 60fps)

**Acceptance Criteria:**
- [ ] Scrolling maintains 60fps on modern devices
- [ ] No dropped frames during transition
- [ ] Smooth animation on iPhone SE 2020 (A13 chip)

#### CPU Throttling Test

**Chrome DevTools:**
1. Open Performance tab
2. Enable "4× slowdown" CPU throttle
3. Test scroll behavior

**Acceptance Criteria:**
- [ ] Scroll still responsive (may drop to ~55fps, acceptable)
- [ ] No frozen UI
- [ ] Transition completes (may take slightly longer)

#### Memory Leaks

**Test:**
1. Open form
2. Scroll up/down 100+ times
3. Check Chrome DevTools → Memory → Take heap snapshot
4. Look for detached DOM nodes or retained listeners

**Acceptance Criteria:**
- [ ] No memory leaks detected
- [ ] Event listeners properly cleaned up
- [ ] No growing heap size over time

### 4.4 Cross-Browser Testing

**BrowserStack or similar:**
- [ ] iOS Safari 15, 16, 17
- [ ] Chrome Mobile (Android 12, 13, 14)
- [ ] Samsung Internet
- [ ] Desktop: Chrome, Safari, Firefox, Edge (latest versions)

---

## Step 5: Tuning & Optimization

### 5.1 Adjust Scroll Threshold

**If footer is too sensitive (shows/hides too easily):**

```typescript
const scrollDirection = useScrollDirection({
  threshold: 20, // Increase from 10 to 20px
  debounce: 100,
})
```

**If footer is not responsive enough:**

```typescript
const scrollDirection = useScrollDirection({
  threshold: 5, // Decrease from 10 to 5px
  debounce: 50, // Reduce debounce
})
```

### 5.2 Adjust Debounce Timing

**If footer flickers during rapid scrolling:**

```typescript
const scrollDirection = useScrollDirection({
  threshold: 10,
  debounce: 150, // Increase from 100 to 150ms
})
```

**If footer feels sluggish:**

```typescript
const scrollDirection = useScrollDirection({
  threshold: 10,
  debounce: 50, // Decrease from 100 to 50ms
})
```

### 5.3 Adjust Transition Speed

**In the footer className:**

```typescript
// Faster transition
"transition-transform duration-200 ease-out"

// Slower, more dramatic
"transition-transform duration-400 ease-out"

// Current (recommended)
"transition-transform duration-300 ease-out"
```

### 5.4 Alternative Easing Functions

```typescript
// Bounce effect
"transition-transform duration-300 ease-in-out"

// Sharp exit
"transition-transform duration-300 ease-in"

// Smooth (recommended)
"transition-transform duration-300 ease-out"
```

### 5.5 Disable on Desktop Only

**If you only want smart sticky on mobile:**

```typescript
// Detect mobile viewport
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

const scrollDirection = useScrollDirection({
  threshold: 10,
  debounce: 100,
  enabled: isMobile, // Only enable on mobile
})
```

### 5.6 Performance Monitoring in Production

**Add analytics tracking:**

```typescript
useEffect(() => {
  if (!isFooterVisible) {
    // Track footer hide events
    analytics.track('footer_hidden', {
      scrollDirection: 'down',
      timestamp: Date.now()
    })
  } else {
    // Track footer show events
    analytics.track('footer_shown', {
      scrollDirection: 'up',
      timestamp: Date.now()
    })
  }
}, [isFooterVisible])
```

**Monitor metrics:**
- Footer hide/show frequency per session
- Average time footer is hidden
- Correlation with form completion rate
- User feedback/complaints

---

## Rollback Plan

### Immediate Rollback (< 5 minutes)

**Option 1: Disable via Feature Flag**

```typescript
const ENABLE_SMART_STICKY = false // Change to false

const scrollDirection = useScrollDirection({
  threshold: 10,
  debounce: 100,
  enabled: ENABLE_SMART_STICKY, // Disabled
})

const isFooterVisible = ENABLE_SMART_STICKY
  ? scrollDirection !== 'down'
  : true // Always visible
```

**Option 2: Remove Hook Call**

```typescript
// Comment out or remove these lines:
// const scrollDirection = useScrollDirection({ ... })
// const isFooterVisible = scrollDirection !== 'down'

// Add this instead:
const isFooterVisible = true // Always visible
```

**Option 3: Revert CSS Class**

```typescript
// Remove this line:
// !isFooterVisible && "translate-y-full md:translate-y-0",

// Footer will always be visible (no transform)
```

### Full Rollback (< 30 minutes)

**Steps:**
1. Remove `useScrollDirection` hook call from transaction-form.tsx
2. Remove `isFooterVisible` variable
3. Remove `!isFooterVisible && "translate-y-full md:translate-y-0"` from className
4. Remove ARIA live region
5. Test that footer is always visible
6. Deploy

**Git Revert:**
```bash
# If committed to git
git revert <commit-hash>
git push

# If not committed yet
git checkout -- src/components/forms/transaction-form.tsx
git checkout -- src/hooks/useScrollDirection.ts
```

---

## Optional Enhancements

### Enhancement 1: Footer Peek on Form Validation Error

**Idea:** If form submission fails, automatically show footer (even if user scrolled down).

```typescript
const [forceFooterVisible, setForceFooterVisible] = useState(false)

const handleSubmit = async () => {
  const isValid = validateForm()

  if (!isValid) {
    // Force footer visible to show error state
    setForceFooterVisible(true)

    // Reset after 3 seconds
    setTimeout(() => setForceFooterVisible(false), 3000)
  }

  // ... rest of submit logic
}

const isFooterVisible = forceFooterVisible || scrollDirection !== 'down'
```

### Enhancement 2: Show Footer on Form Completion

**Idea:** When all required fields are filled, show footer automatically.

```typescript
useEffect(() => {
  // If form becomes valid, show footer
  if (isFormValid && !isFooterVisible) {
    setForceFooterVisible(true)

    // Reset after user scrolls
    const timer = setTimeout(() => setForceFooterVisible(false), 2000)
    return () => clearTimeout(timer)
  }
}, [isFormValid])
```

### Enhancement 3: Haptic Feedback (Mobile)

**Idea:** Subtle vibration when footer appears (iOS/Android).

```typescript
useEffect(() => {
  if (isFooterVisible && 'vibrate' in navigator) {
    // Very gentle haptic (10ms)
    navigator.vibrate(10)
  }
}, [isFooterVisible])
```

---

## Success Metrics

### Track These KPIs

**Before Implementation (Baseline):**
- Form completion time (average)
- Form abandonment rate
- Scroll depth (average)
- Mobile viewport utilization

**After Implementation (Compare):**
- Form completion time (target: -5 to -10%)
- Form abandonment rate (target: no increase)
- User satisfaction (survey: "Was the form easy to use?")
- Support tickets related to "can't find save button"

**Performance Metrics:**
- Scroll FPS (target: 60fps on modern devices)
- Time to interactive (target: no regression)
- JavaScript bundle size increase (target: < 1KB)

---

## Troubleshooting

### Issue 1: Footer Flickers During Scroll

**Symptoms:** Footer rapidly appears/disappears

**Solutions:**
1. Increase debounce: `debounce: 150`
2. Increase threshold: `threshold: 20`
3. Check for multiple scroll listeners
4. Verify requestAnimationFrame is working

### Issue 2: Footer Doesn't Appear on Scroll Up

**Symptoms:** Footer stays hidden even when scrolling up

**Solutions:**
1. Check `isFooterVisible` state in DevTools
2. Verify scroll direction is updating
3. Check CSS: `md:translate-y-0` should be present
4. Verify no CSS conflicts

### Issue 3: Footer Overlaps Keyboard (Mobile)

**Symptoms:** Keyboard opens, footer covers input field

**Solutions:**
1. Detect keyboard open via `visualViewport` API
2. Hide footer when keyboard is visible
3. Use `inputMode="decimal"` to trigger numeric keyboard

```typescript
useEffect(() => {
  const handleResize = () => {
    const isKeyboardOpen = window.visualViewport.height < window.innerHeight * 0.75

    if (isKeyboardOpen) {
      setFooterVisible(false)
    }
  }

  window.visualViewport?.addEventListener('resize', handleResize)
  return () => window.visualViewport?.removeEventListener('resize', handleResize)
}, [])
```

### Issue 4: Performance Degradation on Low-End Devices

**Symptoms:** Choppy scrolling, low FPS

**Solutions:**
1. Disable on low-end devices: Check `navigator.hardwareConcurrency < 4`
2. Reduce transition duration: `duration-200`
3. Use `will-change: transform` CSS hint
4. Simplify animation (opacity only, no transform)

### Issue 5: Desktop Footer Hides Unexpectedly

**Symptoms:** Footer hides on desktop when it shouldn't

**Solutions:**
1. Verify `md:translate-y-0` is in className
2. Check responsive breakpoint (should be 768px)
3. Test in Chrome DevTools responsive mode at various widths
4. Ensure `enabled: isMobile` if using conditional hook

---

## Code Review Checklist

Before submitting PR:

**Functionality:**
- [ ] Footer hides when scrolling down (mobile only)
- [ ] Footer shows when scrolling up
- [ ] Footer always visible on desktop
- [ ] Smooth 300ms transition
- [ ] No flicker during rapid scrolling

**Accessibility:**
- [ ] ARIA live region announces changes
- [ ] Screen readers can access buttons when visible
- [ ] Keyboard navigation works
- [ ] Focus management correct
- [ ] Touch targets 44×44px minimum

**Performance:**
- [ ] Uses passive scroll listener
- [ ] requestAnimationFrame for scroll handling
- [ ] No memory leaks
- [ ] 60fps on modern devices
- [ ] Debounce prevents excessive state updates

**Code Quality:**
- [ ] TypeScript types correct
- [ ] Hook properly cleaned up on unmount
- [ ] No console errors/warnings
- [ ] Comments explain complex logic
- [ ] Follows project code style

**Testing:**
- [ ] Tested on iOS Safari (iPhone)
- [ ] Tested on Android Chrome
- [ ] Tested on desktop browsers
- [ ] Screen reader tested (VoiceOver/TalkBack)
- [ ] Performance profiled

**Documentation:**
- [ ] Code comments added
- [ ] README updated (if needed)
- [ ] CHANGELOG updated
- [ ] Design decision documented

---

## Deployment Checklist

**Pre-Deploy:**
- [ ] All tests passing (unit + integration)
- [ ] Code reviewed and approved
- [ ] QA sign-off on real devices
- [ ] Accessibility audit completed
- [ ] Performance benchmarks met

**Deploy:**
- [ ] Feature flag enabled (if using)
- [ ] Deploy to staging first
- [ ] Smoke test on staging
- [ ] Deploy to production
- [ ] Monitor error logs

**Post-Deploy:**
- [ ] Monitor analytics for errors
- [ ] Check performance metrics
- [ ] Gather user feedback
- [ ] Monitor support tickets
- [ ] Review success metrics after 1 week

**Rollback Triggers:**
- Form completion rate drops > 10%
- Support tickets increase > 50%
- Performance FPS < 50fps on 50%+ devices
- Accessibility violations reported
- Critical bug discovered

---

## Appendix: Alternative Implementations

### Alternative 1: CSS-Only Attempt (Not Recommended)

**Note:** Pure CSS cannot detect scroll direction, but here's a partial solution:

```css
/* Hides footer when user scrolls past 200px */
@supports (animation-timeline: scroll()) {
  .transaction-form-footer {
    animation: hide-footer linear;
    animation-timeline: scroll();
    animation-range: 200px 400px;
  }

  @keyframes hide-footer {
    to {
      transform: translateY(100%);
    }
  }
}
```

**Limitations:**
- No directional awareness (up vs down)
- Limited browser support (Chrome only)
- Can't customize threshold easily

**Verdict:** JavaScript solution is superior ✅

### Alternative 2: Intersection Observer for Static Footer

**Use Case:** Hide sticky when static footer is visible (like Pattern A, but simpler).

```typescript
const staticFooterRef = useRef<HTMLDivElement>(null)
const [isStaticVisible, setIsStaticVisible] = useState(false)

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      setIsStaticVisible(entry.isIntersecting)
    },
    { threshold: 0.5 }
  )

  if (staticFooterRef.current) {
    observer.observe(staticFooterRef.current)
  }

  return () => observer.disconnect()
}, [])

const isStickyVisible = !isStaticVisible
```

**Verdict:** This is Pattern A (sticky-to-static), not recommended ❌

---

## Final Notes

**Remember:**
- This pattern is **optional** - current implementation (Pattern C) is already excellent
- Smart Sticky is an **enhancement**, not a fix
- Test thoroughly on real devices before deploying
- Monitor metrics post-deploy
- Be ready to rollback if needed

**Questions or Issues?**
- Review main analysis document: `sticky-to-static-transition-analysis.md`
- Check visual mockups: `sticky-footer-pattern-mockups.md`
- Consult design research: `design-research-add-transaction-form.md`

**Good luck with implementation!** 🚀

---

**Document Author:** Claude (AI UX/UI Designer)
**Date Created:** October 26, 2025
**Version:** 1.0
**Status:** Ready for Implementation
