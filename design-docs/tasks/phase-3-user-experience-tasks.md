# Phase 3: User Experience — Task Breakdown

**Feature:** Email-to-Transaction Linking System
**Phase:** 3 of 4 — User Experience
**Status:** `draft`
**Created:** 2025-01-02
**Target Duration:** 2 weeks
**Prerequisites:** Phase 2 complete

---

## Steering & Inputs

| Input | Path | Intent |
|-------|------|--------|
| Main Spec | `design-docs/email-transaction-linking-system.md` | Complete feature specification |
| Wireframes | `design-docs/email-transaction-wireframes.md` | UI layouts and interactions |
| Roadmap | `design-docs/email-transaction-implementation-roadmap.md` | 8-week implementation plan |
| Phase 1-2 Tasks | `design-docs/tasks/phase-1-*.md`, `phase-2-*.md` | Foundation and core work |
| AI Skill Guide | `.claude/skills/email-linking/SKILL.md` | Code patterns and architecture |

**Key Constraints:**
- Mobile-first responsive design
- shadcn/ui components + Tailwind CSS
- Swipe gestures for mobile review queue
- Toast notifications via Sonner

---

## AI Implementation Guide

### Recommended Agents by Task Group

| Group | Agent | Why |
|-------|-------|-----|
| Mobile (P3-001 to P3-009) | `mobile-developer` | Gestures, touch interactions |
| Dashboard (P3-010 to P3-012) | `frontend-developer` | React components |
| Error (P3-013 to P3-017) | `frontend-developer` | Error handling patterns |
| UX (P3-018 to P3-019) | `frontend-developer` | Toast notifications |
| Components (P3-020 to P3-023) | `frontend-developer` | Reusable components |
| A11y (P3-024 to P3-027) | `ui-ux-designer` | Accessibility audit |
| Polish (P3-028 to P3-030) | `frontend-developer` | Animations, empty states |
| Testing (P3-031 to P3-032) | `test-automator` | Cross-browser testing |

### Critical Codebase Patterns

**Swipe Gestures (use framer-motion or react-swipeable):**
```typescript
import { motion, useAnimation, PanInfo } from 'framer-motion';

const controls = useAnimation();

const handleDrag = (event: any, info: PanInfo) => {
  const threshold = 100; // pixels
  if (info.offset.x > threshold) {
    // Swiped right - approve
    controls.start({ x: 300, opacity: 0 });
    onApprove();
  } else if (info.offset.x < -threshold) {
    // Swiped left - reject
    controls.start({ x: -300, opacity: 0 });
    onReject();
  }
};
```

**Bottom Sheet (use vaul or custom):**
```typescript
import { Drawer } from 'vaul';

<Drawer.Root>
  <Drawer.Trigger>Open Filters</Drawer.Trigger>
  <Drawer.Portal>
    <Drawer.Overlay className="fixed inset-0 bg-black/40" />
    <Drawer.Content className="fixed bottom-0 left-0 right-0 h-[70vh] rounded-t-lg bg-white">
      {/* Filter content */}
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

**Toast Notifications (Sonner):**
```typescript
import { toast } from 'sonner';

// Success
toast.success('Match approved!', {
  description: 'GrabFood $10.00',
  action: { label: 'Undo', onClick: handleUndo },
  duration: 5000,
});

// Error
toast.error('Failed to approve', {
  description: 'Please try again',
  action: { label: 'Retry', onClick: handleRetry },
});
```

**Haptic Feedback:**
```typescript
const triggerHaptic = (type: 'light' | 'medium' | 'heavy') => {
  if ('vibrate' in navigator) {
    const duration = { light: 10, medium: 20, heavy: 40 }[type];
    navigator.vibrate(duration);
  }
};
```

**Reduced Motion Support:**
```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const animationVariants = prefersReducedMotion
  ? { initial: {}, animate: {}, exit: {} }
  : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
```

### Key File Locations

```
src/components/page-specific/
├── filter-bottom-sheet.tsx    # P3-002
├── swipeable-match-card.tsx   # P3-003 to P3-005
├── undo-toast.tsx             # P3-006
├── activity-feed-item.tsx     # P3-020
├── email-detail-modal.tsx     # P3-021
└── empty-state.tsx            # P3-028

src/components/ui/
├── skeleton.tsx               # P3-011 (likely exists)
└── error-boundary.tsx         # P3-013

src/lib/utils/
├── haptics.ts                 # P3-007
└── error-messages.ts          # P3-015
```

---

## How to Use This Task List

1. Tasks are numbered `P3-001`, `P3-002`, etc. (P3 = Phase 3)
2. Execute tasks individually or in dependency order
3. Each task contains Acceptance Criteria and Verification steps
4. Parallelizable tasks are marked with `parallel: true`
5. While in `draft`, tasks may be refined. After `approved`, IDs are immutable

---

## Task Index

| Status | ID | Title | Group | Depends | Blocks |
|--------|-----|-------|-------|---------|--------|
| [ ] | P3-001 | Implement responsive layouts for all import pages | Mobile | — | P3-002 |
| [ ] | P3-002 | Create FilterBottomSheet component | Mobile | P3-001 | P3-003 |
| [ ] | P3-003 | Add swipe gesture support to MatchCard | Mobile | P3-002 | P3-004 |
| [ ] | P3-004 | Implement swipe right to approve | Mobile | P3-003 | P3-005 |
| [ ] | P3-005 | Implement swipe left to reject | Mobile | P3-004 | P3-006 |
| [ ] | P3-006 | Create undo toast after swipe action | Mobile | P3-005 | P3-007 |
| [ ] | P3-007 | Add haptic feedback for swipe gestures | Mobile | P3-006 | — |
| [ ] | P3-008 | Create full-screen modals for mobile | Mobile | P3-001 | P3-009 |
| [ ] | P3-009 | Test on real devices (iOS Safari, Android Chrome) | Mobile | P3-008 | — |
| [ ] | P3-010 | Enhance Dashboard with real-time data | Dashboard | — | P3-011 |
| [ ] | P3-011 | Add loading skeletons for all dashboard cards | Dashboard | P3-010 | P3-012 |
| [ ] | P3-012 | Implement pull-to-refresh on mobile dashboard | Dashboard | P3-011 | — |
| [ ] | P3-013 | Create error boundary components | Error | — | P3-014 |
| [ ] | P3-014 | Build retry logic for failed operations | Error | P3-013 | P3-015 |
| [ ] | P3-015 | Add user-friendly error messages | Error | P3-014 | P3-016 |
| [ ] | P3-016 | Implement validation for all forms | Error | P3-015 | P3-017 |
| [ ] | P3-017 | Create error state UI components | Error | P3-016 | — |
| [ ] | P3-018 | Add toast notifications (Sonner) | UX | — | P3-019 |
| [ ] | P3-019 | Create notification patterns (success, error, info) | UX | P3-018 | — |
| [ ] | P3-020 | Build ActivityFeedItem component | Components | — | P3-021 |
| [ ] | P3-021 | Create EmailDetailModal component | Components | P3-020 | P3-022 |
| [ ] | P3-022 | Add email body rendering (sanitized HTML) | Components | P3-021 | P3-023 |
| [ ] | P3-023 | Create suggested matches UI in modal | Components | P3-022 | — |
| [ ] | P3-024 | Implement keyboard shortcuts for review | A11y | — | P3-025 |
| [ ] | P3-025 | Add ARIA labels and roles | A11y | P3-024 | P3-026 |
| [ ] | P3-026 | Ensure focus management for modals | A11y | P3-025 | P3-027 |
| [ ] | P3-027 | Screen reader testing and fixes | A11y | P3-026 | — |
| [ ] | P3-028 | Add empty states for all lists | Polish | — | P3-029 |
| [ ] | P3-029 | Create onboarding/help text for first use | Polish | P3-028 | P3-030 |
| [ ] | P3-030 | Add animations and transitions | Polish | P3-029 | — |
| [ ] | P3-031 | Cross-browser testing (Chrome, Safari, Firefox) | Testing | P3-009 | — |
| [ ] | P3-032 | Performance audit and optimization | Testing | P3-030 | — |

---

## Tasks (Detailed Sections)

<!--P3-001-->
### P3-001 — Implement responsive layouts for all import pages

**Status:** open
**Group:** Mobile
**Depends on:** —  |  **Blocks:** P3-002  |  **parallel:** true

**Description:**
Ensure all import-related pages are fully responsive across desktop, tablet, and mobile breakpoints.

**Acceptance Criteria (EARS):**
- All pages SHALL render correctly at: 1440px (desktop), 1024px (tablet), 768px (small tablet), 375px (mobile)
- Grid layouts SHALL collapse appropriately (3-col → 2-col → 1-col)
- Text SHALL remain readable without horizontal scrolling
- Touch targets SHALL be at least 44x44px on mobile

**Deliverables:**
- Updated responsive styles for `/imports`, `/imports/review`, `/imports/statements`, `/imports/history`

**Verification:**
- Visual: Test at all breakpoints
- Functional: All interactions work on touch devices

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-002-->
### P3-002 — Create FilterBottomSheet component

**Status:** open
**Group:** Mobile
**Depends on:** P3-001  |  **Blocks:** P3-003  |  **parallel:** false

**Description:**
Build a bottom sheet component for mobile filter controls that slides up from the bottom.

**Acceptance Criteria (EARS):**
- The component SHALL slide up from bottom on mobile when "Filters" tapped
- The sheet SHALL be dismissible by: backdrop tap, swipe down, close button
- The sheet SHALL have a drag handle for swipe gestures
- The sheet SHALL be fixed at 70% screen height (scrollable if needed)
- Desktop SHALL continue to show inline filters (no bottom sheet)

**Deliverables:**
- `src/components/page-specific/filter-bottom-sheet.tsx`
- Mobile filter trigger button

**Verification:**
- Visual: Sheet matches wireframe
- Gesture: Swipe down dismisses correctly
- A11y: Focus trapped within sheet when open

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-003-->
### P3-003 — Add swipe gesture support to MatchCard

**Status:** open
**Group:** Mobile
**Depends on:** P3-002  |  **Blocks:** P3-004  |  **parallel:** false

**Description:**
Add horizontal swipe gesture detection to match cards using react-swipeable or framer-motion.

**Acceptance Criteria (EARS):**
- The card SHALL track horizontal swipe distance
- WHEN swiped 30%+ THEN show action indicator (approve/reject)
- WHEN swiped 60%+ and released THEN trigger action
- WHEN swiped <60% and released THEN snap back to center
- Swipe threshold SHALL be 60% of card width

**Deliverables:**
- Swipe gesture handling in MatchCard component
- Gesture library integration (react-swipeable or framer-motion)

**Verification:**
- Gesture: Swipe tracking works smoothly
- Threshold: Actions trigger at correct distance

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-004-->
### P3-004 — Implement swipe right to approve

**Status:** open
**Group:** Mobile
**Depends on:** P3-003  |  **Blocks:** P3-005  |  **parallel:** false

**Description:**
Complete swipe right gesture to approve a match.

**Acceptance Criteria (EARS):**
- WHEN swiped right past threshold THEN reveal green background with checkmark
- WHEN released past threshold THEN animate card off-screen right
- WHEN animation complete THEN trigger approve API call
- Card SHALL show "Release to approve" text when past threshold

**Deliverables:**
- Swipe right reveal animation
- Approve trigger on release

**Verification:**
- Visual: Green background reveals correctly
- Functional: Approve API called

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-005-->
### P3-005 — Implement swipe left to reject

**Status:** open
**Group:** Mobile
**Depends on:** P3-004  |  **Blocks:** P3-006  |  **parallel:** false

**Description:**
Complete swipe left gesture to reject a match.

**Acceptance Criteria (EARS):**
- WHEN swiped left past threshold THEN reveal red background with X icon
- WHEN released past threshold THEN animate card off-screen left
- WHEN animation complete THEN trigger reject API call
- Card SHALL show "Release to reject" text when past threshold

**Deliverables:**
- Swipe left reveal animation
- Reject trigger on release

**Verification:**
- Visual: Red background reveals correctly
- Functional: Reject API called

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-006-->
### P3-006 — Create undo toast after swipe action

**Status:** open
**Group:** Mobile
**Depends on:** P3-005  |  **Blocks:** P3-007  |  **parallel:** false

**Description:**
Show an undo toast notification after swipe approve/reject actions.

**Acceptance Criteria (EARS):**
- WHEN action taken THEN show toast with "Undo" button
- Toast SHALL appear for 5 seconds
- WHEN "Undo" clicked THEN revert action and restore card
- Toast SHALL show action summary (e.g., "Approved GrabFood $10.00")

**Deliverables:**
- Undo toast component
- Undo logic (re-insert card, revert API call)

**Verification:**
- Timing: Toast auto-dismisses after 5 seconds
- Undo: Card restored correctly

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-007-->
### P3-007 — Add haptic feedback for swipe gestures

**Status:** open
**Group:** Mobile
**Depends on:** P3-006  |  **Blocks:** —  |  **parallel:** false

**Description:**
Add haptic feedback at key gesture thresholds on supported devices.

**Acceptance Criteria (EARS):**
- WHEN swipe passes 50% threshold THEN trigger light haptic
- WHEN swipe passes 100% (action threshold) THEN trigger medium haptic
- WHEN action completes THEN trigger success haptic
- Haptics SHALL gracefully degrade on unsupported devices

**Deliverables:**
- Haptic feedback integration using Vibration API or navigator.vibrate

**Verification:**
- Device: Test on iOS and Android
- Fallback: No errors on unsupported devices

**Notes & Open Questions:**
- iOS requires user gesture to trigger haptics

**Completion Log:** _(empty initially)_

---

<!--P3-008-->
### P3-008 — Create full-screen modals for mobile

**Status:** open
**Group:** Mobile
**Depends on:** P3-001  |  **Blocks:** P3-009  |  **parallel:** true

**Description:**
Create full-screen modal pattern for mobile that replaces dialog modals on small screens.

**Acceptance Criteria (EARS):**
- On mobile (< 768px) THEN modals SHALL be full-screen (100vh, 100vw)
- Modal header SHALL have back arrow and title
- Modal content SHALL be scrollable
- Close/back button SHALL be in top-left corner
- Action buttons SHALL be sticky at bottom

**Deliverables:**
- Full-screen modal wrapper component
- Mobile modal layout pattern

**Verification:**
- Visual: Takes full screen on mobile
- Scroll: Content scrolls correctly

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-009-->
### P3-009 — Test on real devices (iOS Safari, Android Chrome)

**Status:** open
**Group:** Mobile
**Depends on:** P3-008  |  **Blocks:** P3-031  |  **parallel:** false

**Description:**
Conduct thorough testing on real mobile devices (not just emulators).

**Acceptance Criteria (EARS):**
- All swipe gestures SHALL work on iOS Safari
- All swipe gestures SHALL work on Android Chrome
- Touch targets SHALL be appropriately sized
- Virtual keyboard SHALL not break layouts
- Pull-to-refresh SHALL not conflict with gestures

**Deliverables:**
- Bug report with any issues found
- Fixes for identified issues

**Verification:**
- Real devices: iOS (iPhone), Android (various)

**Notes & Open Questions:**
- May need to use BrowserStack or similar for device testing

**Completion Log:** _(empty initially)_

---

<!--P3-010-->
### P3-010 — Enhance Dashboard with real-time data

**Status:** open
**Group:** Dashboard
**Depends on:** —  |  **Blocks:** P3-011  |  **parallel:** true

**Description:**
Connect dashboard components to real data with proper React Query hooks.

**Acceptance Criteria (EARS):**
- Status cards SHALL show live counts from database
- Email sync card SHALL show actual last sync time
- Activity feed SHALL show real activities from `import_activities`
- Data SHALL auto-refresh every 30 seconds (configurable)

**Deliverables:**
- React Query hooks for dashboard data
- Auto-refresh configuration

**Verification:**
- Data: Matches database values
- Refresh: Updates automatically

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-011-->
### P3-011 — Add loading skeletons for all dashboard cards

**Status:** open
**Group:** Dashboard
**Depends on:** P3-010  |  **Blocks:** P3-012  |  **parallel:** false

**Description:**
Add skeleton loading states for all dashboard components.

**Acceptance Criteria (EARS):**
- WHEN data is loading THEN show skeleton matching card dimensions
- Skeletons SHALL have subtle animation (pulse or shimmer)
- Skeletons SHALL match the layout of actual content

**Deliverables:**
- Skeleton components for: status cards, email sync card, activity feed

**Verification:**
- Visual: Skeletons match card layouts
- Timing: Appear during loading, disappear on data

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-012-->
### P3-012 — Implement pull-to-refresh on mobile dashboard

**Status:** open
**Group:** Dashboard
**Depends on:** P3-011  |  **Blocks:** —  |  **parallel:** false

**Description:**
Add pull-to-refresh gesture for mobile dashboard to manually refresh data.

**Acceptance Criteria (EARS):**
- WHEN user pulls down on mobile THEN show refresh indicator
- WHEN released past threshold THEN trigger data refresh
- Refresh indicator SHALL show loading spinner
- WHEN refresh complete THEN hide indicator with success feedback

**Deliverables:**
- Pull-to-refresh implementation
- Refresh trigger for dashboard data

**Verification:**
- Gesture: Works on touch devices
- Data: Actually refreshes data

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-013-->
### P3-013 — Create error boundary components

**Status:** open
**Group:** Error
**Depends on:** —  |  **Blocks:** P3-014  |  **parallel:** true

**Description:**
Create React error boundary components to catch and handle rendering errors gracefully.

**Acceptance Criteria (EARS):**
- Error boundaries SHALL catch errors in child component tree
- WHEN error caught THEN show fallback UI (not blank screen)
- Fallback SHALL offer: "Try Again" button, "Go Home" link
- Errors SHALL be logged (console, and optionally Sentry)

**Deliverables:**
- `src/components/error-boundary.tsx`
- Error fallback UI component

**Verification:**
- Error: Boundary catches and shows fallback
- Recovery: Try Again resets component

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-014-->
### P3-014 — Build retry logic for failed operations

**Status:** open
**Group:** Error
**Depends on:** P3-013  |  **Blocks:** P3-015  |  **parallel:** false

**Description:**
Implement automatic and manual retry logic for failed API operations.

**Acceptance Criteria (EARS):**
- Failed API calls SHALL automatically retry up to 3 times (with exponential backoff)
- WHEN all retries fail THEN show manual retry button
- Retry state SHALL be visible to user (attempt 1/3, etc.)
- Some operations (approve/reject) SHALL allow manual retry only

**Deliverables:**
- Retry wrapper for API calls
- Retry UI patterns

**Verification:**
- Auto-retry: Happens with backoff
- Manual: Button triggers retry

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-015-->
### P3-015 — Add user-friendly error messages

**Status:** open
**Group:** Error
**Depends on:** P3-014  |  **Blocks:** P3-016  |  **parallel:** false

**Description:**
Replace technical error messages with user-friendly explanations.

**Acceptance Criteria (EARS):**
- Error messages SHALL be human-readable (not stack traces)
- Messages SHALL suggest action when possible (e.g., "Check your internet connection")
- Network errors: "Couldn't connect. Please check your connection."
- Auth errors: "Session expired. Please log in again."
- Server errors: "Something went wrong. We're working on it."

**Deliverables:**
- Error message mapping/translation
- Error message component

**Verification:**
- Messages: Are helpful and actionable

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-016-->
### P3-016 — Implement validation for all forms

**Status:** open
**Group:** Error
**Depends on:** P3-015  |  **Blocks:** P3-017  |  **parallel:** false

**Description:**
Add comprehensive form validation using Zod and React Hook Form.

**Acceptance Criteria (EARS):**
- All forms SHALL validate on blur and on submit
- Validation errors SHALL appear inline below fields
- Submit button SHALL be disabled when form is invalid
- Validation messages SHALL be specific (not just "Invalid")

**Deliverables:**
- Zod schemas for all import forms
- Validation error display components

**Verification:**
- Validation: Catches invalid input
- UX: Errors are visible and helpful

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-017-->
### P3-017 — Create error state UI components

**Status:** open
**Group:** Error
**Depends on:** P3-016  |  **Blocks:** —  |  **parallel:** false

**Description:**
Create reusable UI components for various error states.

**Acceptance Criteria (EARS):**
- Upload error state: red border, X icon, error message, retry button
- Processing error state: warning icon, error details, support contact
- Network error state: offline icon, check connection message
- All error states SHALL be visually consistent

**Deliverables:**
- Error state components for: upload, processing, network, generic

**Verification:**
- Visual: Matches spec
- Reusable: Works in different contexts

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-018-->
### P3-018 — Add toast notifications (Sonner)

**Status:** open
**Group:** UX
**Depends on:** —  |  **Blocks:** P3-019  |  **parallel:** true

**Description:**
Integrate Sonner for toast notifications throughout the import feature.

**Acceptance Criteria (EARS):**
- Toast notifications SHALL appear in bottom-right (desktop) or bottom-center (mobile)
- Toasts SHALL auto-dismiss after appropriate time (success: 3s, error: 5s, action: manual)
- Multiple toasts SHALL stack vertically
- Toasts SHALL be dismissible by click/swipe

**Deliverables:**
- Sonner integration in app layout
- Toast configuration

**Verification:**
- Visual: Position and stacking correct
- Timing: Auto-dismiss works

**Notes & Open Questions:**
- Check if Sonner is already in project or needs installing

**Completion Log:** _(empty initially)_

---

<!--P3-019-->
### P3-019 — Create notification patterns (success, error, info)

**Status:** open
**Group:** UX
**Depends on:** P3-018  |  **Blocks:** —  |  **parallel:** false

**Description:**
Define and implement consistent toast patterns for different notification types.

**Acceptance Criteria (EARS):**
- Success: green accent, checkmark icon, positive message
- Error: red accent, X icon, error message with action
- Info: blue accent, info icon, neutral message
- Warning: amber accent, warning icon, caution message
- All patterns SHALL have consistent structure

**Deliverables:**
- Toast helper functions for each pattern
- Documentation of when to use each

**Verification:**
- Visual: Patterns are distinguishable
- Consistent: Same style across app

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-020-->
### P3-020 — Build ActivityFeedItem component

**Status:** open
**Group:** Components
**Depends on:** —  |  **Blocks:** P3-021  |  **parallel:** true

**Description:**
Build the timeline-style activity feed item component.

**Acceptance Criteria (EARS):**
- The component SHALL show: timestamp, icon (color-coded), title, details
- Icons: checkmark (success/green), clock (waiting/blue), upload (purple), X (error/red)
- The component SHALL link to related item when applicable
- Timeline connector SHALL link items vertically

**Deliverables:**
- `src/components/page-specific/activity-feed-item.tsx`

**Verification:**
- Visual: Timeline style matches wireframe
- Interactive: Links work correctly

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-021-->
### P3-021 — Create EmailDetailModal component

**Status:** open
**Group:** Components
**Depends on:** P3-020  |  **Blocks:** P3-022  |  **parallel:** false

**Description:**
Build the modal for viewing and editing email transaction details.

**Acceptance Criteria (EARS):**
- Modal SHALL show: email header info (from, date, subject)
- Modal SHALL show extracted data fields (editable: vendor, amount, date, description)
- Modal SHALL show email body preview (collapsible)
- Modal SHALL show suggested matches (selectable)
- Save/Cancel buttons SHALL be at bottom

**Deliverables:**
- `src/components/page-specific/email-detail-modal.tsx`

**Verification:**
- Visual: Matches wireframe
- Edit: Fields are editable and saveable

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-022-->
### P3-022 — Add email body rendering (sanitized HTML)

**Status:** open
**Group:** Components
**Depends on:** P3-021  |  **Blocks:** P3-023  |  **parallel:** false

**Description:**
Render email HTML bodies safely with sanitization to prevent XSS.

**Acceptance Criteria (EARS):**
- HTML email bodies SHALL be rendered with styling preserved
- All HTML SHALL be sanitized (remove scripts, event handlers)
- Images SHALL be loaded or show placeholder
- Plain text emails SHALL be rendered in preformatted style

**Deliverables:**
- HTML sanitization using DOMPurify or similar
- Email body renderer component

**Verification:**
- Security: XSS vectors are blocked
- Visual: Emails render readably

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-023-->
### P3-023 — Create suggested matches UI in modal

**Status:** open
**Group:** Components
**Depends on:** P3-022  |  **Blocks:** —  |  **parallel:** false

**Description:**
Add UI for viewing and selecting from multiple suggested transaction matches.

**Acceptance Criteria (EARS):**
- Suggested matches SHALL be shown as selectable list
- Each suggestion SHALL show: description, amount, date, confidence %
- Best match SHALL be pre-selected
- User SHALL be able to select different match
- "None of these" option SHALL be available

**Deliverables:**
- Suggested matches component in email detail modal

**Verification:**
- Selection: User can change selection
- Update: Selection updates match link

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-024-->
### P3-024 — Implement keyboard shortcuts for review

**Status:** open
**Group:** A11y
**Depends on:** —  |  **Blocks:** P3-025  |  **parallel:** true

**Description:**
Add keyboard shortcuts for efficient review queue navigation.

**Acceptance Criteria (EARS):**
- `A` key: Approve current item
- `R` key: Reject current item
- `J`/`K` or `↓`/`↑`: Navigate between items
- `Enter`: Open item detail
- `Escape`: Close modal/cancel action
- `?`: Show keyboard shortcuts help

**Deliverables:**
- Keyboard shortcut handling
- Shortcuts help modal/tooltip

**Verification:**
- All shortcuts work as specified
- No conflicts with browser shortcuts

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-025-->
### P3-025 — Add ARIA labels and roles

**Status:** open
**Group:** A11y
**Depends on:** P3-024  |  **Blocks:** P3-026  |  **parallel:** false

**Description:**
Add appropriate ARIA attributes to all interactive components.

**Acceptance Criteria (EARS):**
- All buttons SHALL have descriptive aria-label if not text-only
- Form inputs SHALL have associated labels (explicit or aria-labelledby)
- Status indicators SHALL have aria-live for updates
- Lists SHALL use appropriate list roles

**Deliverables:**
- ARIA attributes added to all import components

**Verification:**
- Audit: axe-core or similar shows no violations

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-026-->
### P3-026 — Ensure focus management for modals

**Status:** open
**Group:** A11y
**Depends on:** P3-025  |  **Blocks:** P3-027  |  **parallel:** false

**Description:**
Implement proper focus management for all modals and dialogs.

**Acceptance Criteria (EARS):**
- WHEN modal opens THEN focus SHALL move to first focusable element
- Focus SHALL be trapped within modal while open
- WHEN modal closes THEN focus SHALL return to trigger element
- Background content SHALL be inert (aria-hidden)

**Deliverables:**
- Focus trap implementation
- Focus restoration logic

**Verification:**
- Tab: Cannot escape modal with tab
- Close: Focus returns correctly

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-027-->
### P3-027 — Screen reader testing and fixes

**Status:** open
**Group:** A11y
**Depends on:** P3-026  |  **Blocks:** —  |  **parallel:** false

**Description:**
Test all import flows with screen reader and fix any issues.

**Acceptance Criteria (EARS):**
- All interactive elements SHALL be announced correctly
- Status updates SHALL be announced (aria-live)
- Form errors SHALL be announced
- Navigation SHALL be logical and complete

**Deliverables:**
- Screen reader test report
- Fixes for any issues found

**Verification:**
- VoiceOver (macOS/iOS): Full flow works
- Optional: NVDA/JAWS on Windows

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-028-->
### P3-028 — Add empty states for all lists

**Status:** open
**Group:** Polish
**Depends on:** —  |  **Blocks:** P3-029  |  **parallel:** true

**Description:**
Add helpful empty states when lists have no items.

**Acceptance Criteria (EARS):**
- Review queue empty: "No items to review! Check back after syncing emails."
- Activity feed empty: "No activity yet. Upload a statement to get started."
- Recent uploads empty: "No statements uploaded yet."
- All empty states SHALL have helpful illustration or icon
- Empty states SHALL suggest next action

**Deliverables:**
- Empty state components for each list

**Verification:**
- Visual: Empty states are helpful not scary
- Action: CTAs link to appropriate pages

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-029-->
### P3-029 — Create onboarding/help text for first use

**Status:** open
**Group:** Polish
**Depends on:** P3-028  |  **Blocks:** P3-030  |  **parallel:** false

**Description:**
Add contextual help and onboarding for first-time users.

**Acceptance Criteria (EARS):**
- WHEN user visits imports for first time THEN show brief onboarding
- Help text SHALL explain: what imports do, how to get started
- Dismissible tooltips SHALL explain key UI elements
- Help icon SHALL link to documentation/support

**Deliverables:**
- First-use onboarding component
- Contextual help tooltips

**Verification:**
- First use: Onboarding appears
- Dismissal: Preference remembered

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-030-->
### P3-030 — Add animations and transitions

**Status:** open
**Group:** Polish
**Depends on:** P3-029  |  **Blocks:** P3-032  |  **parallel:** false

**Description:**
Add subtle animations to improve perceived performance and delight.

**Acceptance Criteria (EARS):**
- Card transitions: fade in on load, slide out on approve/reject
- Modal transitions: fade and scale in/out
- Skeleton to content: crossfade transition
- Button states: subtle hover/active transitions
- Animations SHALL respect prefers-reduced-motion

**Deliverables:**
- Animation classes/variants
- Transition configurations

**Verification:**
- Visual: Animations are smooth
- A11y: Reduced motion honored

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-031-->
### P3-031 — Cross-browser testing (Chrome, Safari, Firefox)

**Status:** open
**Group:** Testing
**Depends on:** P3-009  |  **Blocks:** —  |  **parallel:** false

**Description:**
Test all import functionality across major browsers.

**Acceptance Criteria (EARS):**
- All features SHALL work in: Chrome (latest), Safari (latest), Firefox (latest)
- All features SHALL work in: Chrome Mobile, Safari iOS
- No visual regressions between browsers
- File upload SHALL work in all browsers

**Deliverables:**
- Cross-browser test report
- Fixes for any browser-specific issues

**Verification:**
- Manual testing in each browser

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

<!--P3-032-->
### P3-032 — Performance audit and optimization

**Status:** open
**Group:** Testing
**Depends on:** P3-030  |  **Blocks:** —  |  **parallel:** false

**Description:**
Audit performance and optimize any bottlenecks.

**Acceptance Criteria (EARS):**
- Initial page load: < 2 seconds (LCP)
- Review queue: smooth scroll with 100+ items
- File upload: progress updates smoothly
- No memory leaks in long sessions
- Bundle size impact: documented

**Deliverables:**
- Lighthouse audit report
- Performance optimizations applied

**Verification:**
- Lighthouse: Good scores (>90)
- Profile: No obvious bottlenecks

**Notes & Open Questions:** _(empty)_

**Completion Log:** _(empty initially)_

---

## Dependency Map

```
Mobile Path:
P3-001 ──► P3-002 ──► P3-003 ──► P3-004 ──► P3-005 ──► P3-006 ──► P3-007
                                                                    │
P3-001 ──► P3-008 ──► P3-009 ────────────────────────────────────────┼──► P3-031


Dashboard Path:
P3-010 ──► P3-011 ──► P3-012

Error Handling Path:
P3-013 ──► P3-014 ──► P3-015 ──► P3-016 ──► P3-017

Components Path:
P3-020 ──► P3-021 ──► P3-022 ──► P3-023

A11y Path:
P3-024 ──► P3-025 ──► P3-026 ──► P3-027

Polish Path:
P3-028 ──► P3-029 ──► P3-030 ──► P3-032

Safe Parallel Lanes:
- P3-001, P3-010, P3-013, P3-018, P3-020, P3-024, P3-028 can start in parallel
- Mobile and Dashboard paths are independent
```

---

## Traceability

| Spec Requirement | Plan Section | Task IDs |
|-----------------|--------------|----------|
| Mobile optimization | Phase 3: Mobile Optimization | P3-001–P3-009 |
| Swipe gestures | Phase 3: Mobile Optimization | P3-003–P3-007 |
| Dashboard implementation | Phase 3: Dashboard Implementation | P3-010–P3-012 |
| Error handling | Phase 3: Error Handling | P3-013–P3-017 |
| Components library | Phase 3: Components Library | P3-020–P3-023 |
| Accessibility | General requirements | P3-024–P3-027 |
| Polish and testing | Phase 3: Final Polish | P3-028–P3-032 |

---

## Estimates & Sequencing Notes

| Task ID | Estimate | Notes |
|---------|----------|-------|
| P3-001 | M (3-4 hrs) | Layout audit and fixes |
| P3-002–P3-007 | S-M (2-3 hrs each) | Gesture implementation |
| P3-008–P3-009 | M (3-4 hrs total) | Modal + device testing |
| P3-010–P3-012 | S-M (2-3 hrs each) | Dashboard enhancements |
| P3-013–P3-017 | S (1-2 hrs each) | Error handling |
| P3-018–P3-019 | S (1-2 hrs total) | Toast setup |
| P3-020–P3-023 | M (2-3 hrs each) | Component building |
| P3-024–P3-027 | M (2-3 hrs each) | Accessibility |
| P3-028–P3-030 | S (1-2 hrs each) | Polish |
| P3-031–P3-032 | M (3-4 hrs total) | Testing |

**Total Estimated Time:** ~50-60 hours (2 weeks with buffer)

---

## Update Protocol

When implementing tasks:

1. **Mark task in progress:** Add note to Completion Log with start timestamp
2. **Update status when done:**
   - Flip checkbox in Task Index: `[ ]` → `[x]`
   - Change `**Status:** open` → `**Status:** done`
   - Add Completion Log entry: `- done: <ISO-8601> · by: <agent|user> · notes: <optional>`
3. **If blocked:** Add note to Notes & Open Questions, do not mark done
4. **If scope changes:** Append new tasks with next available ID (P3-033, etc.)
5. **Never renumber** existing task IDs after document is approved

---

## Approval Gate

Task breakdown complete (initial state: all tasks open).

**Phase 3 Summary:**
- 32 tasks total
- 9 Mobile, 3 Dashboard, 5 Error, 2 UX, 4 Components, 4 A11y, 3 Polish, 2 Testing
- Focus on mobile experience and polish
- Multiple parallel work opportunities

Would you like to approve or modify the tasks?
