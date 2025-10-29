# Visual Design Specification: Document Management System

**Project:** Joot Personal Finance Application
**Date:** October 29, 2025
**Companion to:** UX-DESIGN-Document-Management-System.md

---

## Design System Integration

### Color Palette for Document Features

```
Document Status Colors:
├── Matched Documents
│   ├── High Confidence: #10B981 (green-500) - Success/trust
│   ├── Medium Confidence: #F59E0B (amber-500) - Caution/review
│   └── Low Confidence: #EF4444 (red-500) - Warning/attention
│
├── Document Types
│   ├── PDF: #DC2626 (red-600) - Industry standard PDF red
│   ├── Image: #3B82F6 (blue-500) - Photo/visual indicator
│   └── Email: #8B5CF6 (purple-500) - Communication indicator
│
├── Processing States
│   ├── Uploading: #60A5FA (blue-400) - In progress
│   ├── Processing: #A78BFA (purple-400) - Computing
│   ├── Complete: #34D399 (green-400) - Success
│   └── Error: #F87171 (red-400) - Failure
│
└── Background Zones
    ├── Drop Zone Idle: #F9FAFB (gray-50) with #E5E7EB border
    ├── Drop Zone Active: #EFF6FF (blue-50) with #3B82F6 border
    └── Review Queue Split: #FFFFFF left, #F9FAFB right
```

### Typography Hierarchy

```
Document Interface Typography:
├── Page Titles: 24px/32px, Font-weight 700, gray-900
│   Example: "Documents > Review Queue"
│
├── Section Headers: 18px/28px, Font-weight 600, gray-800
│   Example: "Unmatched (8)", "Matched (15)"
│
├── Card Titles: 16px/24px, Font-weight 600, gray-900
│   Example: "Grab Receipt", "Bangkok Bank Statement"
│
├── Body Text: 14px/20px, Font-weight 400, gray-700
│   Example: "$12.50 | Oct 28, 2025"
│
├── Metadata: 12px/16px, Font-weight 400, gray-500
│   Example: "Uploaded 2 hours ago", "250 KB"
│
└── Confidence Badges: 12px/16px, Font-weight 600, white text
    Example: "95% HIGH CONFIDENCE"
```

### Spacing & Layout Grid

```
Desktop Grid (1440px viewport):
├── Container: max-width 1280px, centered
├── Column Gutters: 24px
├── Section Padding: 32px vertical, 24px horizontal
├── Card Spacing: 16px vertical gap
└── Component Padding: 16px internal padding

Responsive Breakpoints:
├── Desktop: 1024px+
├── Tablet: 768px - 1023px (not primary, but graceful)
└── Mobile: < 768px (camera capture only)
```

---

## Component Specifications

### 1. Upload Drop Zone

```
State: Idle
┌─────────────────────────────────────────────────────────┐
│                                                           │
│                   [Upload Icon 48x48]                    │
│                   Color: gray-400                         │
│                                                           │
│              Drag & Drop Documents                       │
│              Font: 18px/28px, gray-700                    │
│                                                           │
│    Supported: PDF, JPG, PNG, EML/MSG files              │
│    Font: 14px/20px, gray-500                             │
│                                                           │
│         [Choose Files to Upload Button]                  │
│         bg-blue-600, text-white, hover:bg-blue-700       │
│         px-6 py-3, rounded-lg                            │
│                                                           │
└─────────────────────────────────────────────────────────┘
Background: gray-50 (#F9FAFB)
Border: 2px dashed gray-300 (#D1D5DB)
Border-radius: 12px
Min-height: 320px
Padding: 48px

State: Drag Over
Background: blue-50 (#EFF6FF)
Border: 2px solid blue-500 (#3B82F6)
Text "Drag & Drop" changes to "Drop files here"
Subtle scale animation: scale(1.02)
Transition: all 200ms ease-out

State: Has Files
Border: 2px solid gray-300 (solid, not dashed)
Min-height: Shrinks to 120px
Shows file cards below
```

### 2. File Upload Card

```
┌──────────────────────────────────────────────────────────┐
│ [📄 Icon] Grab_receipt_2025-10-15.pdf          [X Icon] │
│          32x32    16px/24px, gray-900          20x20     │
│                                                           │
│ 250 KB | Processing... ████████░░ 80%                   │
│ 12px gray-500       Progress bar height: 8px            │
└──────────────────────────────────────────────────────────┘
Background: white
Border: 1px solid gray-200
Border-radius: 8px
Padding: 16px
Shadow: none initially, hover:shadow-sm

Progress Bar:
├── Track: gray-200, rounded-full
├── Fill: blue-500, rounded-full
├── Animated: transition width 300ms ease-out
└── States: Uploading (blue), Processing (purple), Complete (green)

Remove Button:
├── Size: 20x20px clickable area
├── Icon: X mark, gray-400
├── Hover: gray-600, bg-gray-100 rounded-full
└── Position: absolute top-4 right-4
```

### 3. Confidence Badge

```
High Confidence (90-100%):
┌──────────────────────────────┐
│ ✓ 95% HIGH CONFIDENCE        │
└──────────────────────────────┘
Background: green-500 (#10B981)
Text: white, 12px/16px, font-weight 600
Icon: Checkmark, 14x14px
Padding: 4px 12px
Border-radius: 9999px (fully rounded)

Medium Confidence (70-89%):
┌──────────────────────────────┐
│ ! 78% MEDIUM CONFIDENCE      │
└──────────────────────────────┘
Background: amber-500 (#F59E0B)
Text: white
Icon: Exclamation, 14x14px

Low Confidence (<70%):
┌──────────────────────────────┐
│ ⚠ 58% LOW CONFIDENCE         │
└──────────────────────────────┘
Background: red-500 (#EF4444)
Text: white
Icon: Warning triangle, 14x14px
```

### 4. Match Card (Review Queue)

```
┌─────────────────────────────────────────────────────────┐
│ [✓] 95% HIGH CONFIDENCE                                 │
│     Badge as specified above, top-right corner          │
│                                                          │
│ [📄] Grab receipt                                       │
│ 32x32 16px/24px gray-900                                │
│                                                          │
│ ─────────────────────────────────────────────────────  │
│ Divider: 1px solid gray-200, margin 12px vertical      │
│                                                          │
│ $12.50 | Oct 28 → $12.50                                │
│ 16px/24px gray-900   →   14px/20px gray-500             │
│                                                          │
│ Grab Food | Oct 28                                      │
│ 14px/20px gray-600                                      │
│                                                          │
│ [Review Button] [Approve Button]                        │
│ Secondary        Primary (green-600)                    │
└─────────────────────────────────────────────────────────┘

Card Styling:
├── Background: white
├── Border: 1px solid gray-200
├── Border-radius: 8px
├── Padding: 16px
├── Shadow: hover:shadow-md
├── Cursor: pointer
├── Transition: all 200ms ease-out
└── Selected state: border-2 solid blue-500, shadow-md

Checkbox (top-left, 16px margin from edges):
├── Size: 20x20px
├── Border: 2px solid gray-300
├── Border-radius: 4px
├── Checked: bg-blue-600, white checkmark
└── Hover: border-blue-500

Buttons (at bottom, 8px gap):
├── Review: gray-100 bg, gray-700 text, hover:gray-200
├── Approve: green-600 bg, white text, hover:green-700
├── Padding: px-4 py-2
├── Border-radius: 6px
└── Font: 14px/20px, font-weight 500
```

### 5. Document Preview Modal

```
Modal Overlay:
├── Background: black opacity-50
├── Backdrop blur: 4px
├── z-index: 1000
└── Click outside to close

Modal Container:
┌─────────────────────────────────────────────────────────┐
│ Document Preview                    [Expand] [X Close]  │
│ 18px/28px gray-900                  Icons 24x24         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   [Document Image/PDF Viewer]                           │
│   Max-width: 800px                                      │
│   Max-height: 600px                                     │
│   Background: gray-100                                  │
│   Object-fit: contain                                   │
│                                                          │
│   [Zoom Controls: - 100% +]                             │
│   Bottom overlay, semi-transparent                      │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ Metadata:                                                │
│ Uploaded: Oct 28, 2025 2:34 PM                          │
│ Size: 250 KB | Type: PDF                                │
│ 12px/16px gray-500                                      │
│                                                          │
│ [Download] [Print] [Delete]                             │
│ Action buttons, 14px/20px                               │
└─────────────────────────────────────────────────────────┘

Modal Styling:
├── Background: white
├── Border-radius: 12px
├── Shadow: xl (large, elevated)
├── Padding: 24px
├── Animation: Fade in + scale from 95% to 100%, 200ms
└── Max-width: 90vw, max-height: 90vh
```

### 6. Side-by-Side Comparison View

```
┌─────────────────────────────────────────────────────────┐
│ Review Match                    [Approve] [Reject]      │
│ 20px/28px gray-900             Buttons: px-6 py-2       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Confidence Score: 92% HIGH      Match ID: #12345        │
│ Badge as specified              12px gray-500           │
│                                                          │
│ ┌──────────────────────┬───────────────────────────────┐│
│ │ DOCUMENT DATA        │ CURRENT TRANSACTION           ││
│ │ 12px uppercase       │ 12px uppercase                ││
│ │ gray-500             │ gray-500                      ││
│ ├──────────────────────┼───────────────────────────────┤│
│ │                      │                               ││
│ │ [Preview Thumbnail]  │ Date:     Oct 28, 2025        ││
│ │ 280px width          │ Label:    12px gray-500       ││
│ │ 200px height         │ Value:    14px gray-900       ││
│ │ Border-radius: 6px   │                               ││
│ │                      │ Vendor:   Grab Food           ││
│ │ Extracted Data:      │                               ││
│ │ • Amount: $12.50 ✓   │ Amount:   $12.50              ││
│ │ • Date: Oct 28 ✓     │                               ││
│ │ • Vendor: Grab ✓     │ Category: Food & Dining       ││
│ │                      │                               ││
│ │ List style:          │ Spacing: 12px between fields  ││
│ │ 14px gray-700        │                               ││
│ │ Checkmarks: green    │                               ││
│ │                      │                               ││
│ │ [View Full]          │ [Edit Transaction]            ││
│ │ Secondary button     │ Secondary button              ││
│ └──────────────────────┴───────────────────────────────┘│
│                                                          │
│ Matching Factors:                                        │
│ Section header: 14px/20px gray-700 font-weight 600      │
│                                                          │
│ ✓ Amount matches exactly                                │
│ ✓ Date matches exactly                                  │
│ ✓ Vendor name matches (Grab → Grab Food)                │
│ ✓ Transaction type compatible                           │
│                                                          │
│ List: 14px/24px gray-600, green checkmarks 16x16        │
│                                                          │
│ Actions:                                                 │
│ [✓] Attach document to transaction                      │
│ [✓] Enrich vendor profile with extracted data           │
│ [ ] Update transaction with document data               │
│                                                          │
│ Checkboxes: 18x18px, blue-600 when checked              │
│                                                          │
│ [← Back] [Approve Match] [Reject & Link Other]         │
│ Ghost    Primary green   Secondary                      │
└─────────────────────────────────────────────────────────┘

Layout:
├── Two-column grid: 1fr 1fr (equal width)
├── Gap: 24px
├── Section padding: 16px each
├── Left column: light gray background (#F9FAFB)
├── Right column: white background
└── Border between: 1px solid gray-200
```

### 7. Processing Status Indicator

```
Uploading State:
┌─────────────────────────────────────┐
│ [◐ Spinner] Uploading...            │
│ 20x20 blue  14px blue-600           │
└─────────────────────────────────────┘

Processing State:
┌─────────────────────────────────────┐
│ [◑ Spinner] Processing document...  │
│ 20x20 purple 14px purple-600        │
└─────────────────────────────────────┘

Extracting State:
┌─────────────────────────────────────┐
│ [◒ Spinner] Extracting data...      │
│ 20x20 purple 14px purple-600        │
└─────────────────────────────────────┘

Matching State:
┌─────────────────────────────────────┐
│ [◓ Spinner] Finding matches...      │
│ 20x20 blue  14px blue-600           │
└─────────────────────────────────────┘

Complete State:
┌─────────────────────────────────────┐
│ [✓ Check] Complete! 10 matches found│
│ 20x20 green 14px green-600          │
└─────────────────────────────────────┘

Spinner Animation:
├── Rotation: 360deg in 1s linear infinite
├── Icon: Circular arrow (⟳)
├── Size: 20x20px
└── Color: matches state color
```

### 8. Notification Toast

```
Success Toast:
┌──────────────────────────────────────────────────┐
│ [✓] Document matched and approved               │
│ 20x20 14px/20px white text                       │
│ green                                            │
│                                   [Undo] [X]     │
│                                   Buttons        │
└──────────────────────────────────────────────────┘
Background: green-600
Text: white
Position: Top-right corner, 16px margin
Width: 360px
Padding: 16px
Border-radius: 8px
Shadow: lg
Animation: Slide in from right, duration 300ms
Auto-dismiss: 5 seconds (30s if undo available)

Warning Toast:
Background: amber-500
Icon: ! (exclamation)

Error Toast:
Background: red-600
Icon: ⚠ (warning triangle)

Info Toast:
Background: blue-600
Icon: ℹ (info)
```

---

## Interaction Animations

### Micro-interactions

```
Button Hover:
├── Scale: 1.0 → 1.02
├── Transition: transform 150ms ease-out
└── Shadow: none → shadow-sm

Button Active (Click):
├── Scale: 1.0 → 0.98
├── Duration: 100ms
└── Feedback: immediate

Card Hover:
├── Shadow: none → shadow-md
├── Border: gray-200 → gray-300
├── Transition: all 200ms ease-out
└── Cursor: pointer

Drag Over Drop Zone:
├── Scale: 1.0 → 1.02
├── Border pulse: 2px solid blue-500
├── Background shift: gray-50 → blue-50
└── Transition: all 200ms ease-out

File Upload Progress:
├── Progress bar fill: animated width change
├── Smooth transition: width 300ms ease-out
├── Color shift: blue → purple → green
└── Completion bounce: scale 1.0 → 1.1 → 1.0

Confidence Badge Appearance:
├── Fade in: opacity 0 → 1
├── Slide down: translateY(-8px) → 0
├── Duration: 300ms
└── Easing: ease-out

Match Card Selection:
├── Border: 1px → 2px
├── Border color: gray-200 → blue-500
├── Shadow: none → shadow-md
├── Background: white → blue-50 (very subtle)
└── Transition: all 150ms ease-out
```

### Loading States

```
Skeleton Screen (Document Library):
┌─────────────────────────────────────┐
│ [████████░░░░░░░░░░░] Loading...    │
│ Animated shimmer effect             │
│ Gray-200 background                 │
│ Gray-300 shimmer gradient           │
│ Animation: translateX(-100% → 100%) │
│ Duration: 1.5s ease-in-out infinite │
└─────────────────────────────────────┘

Shimmer Gradient:
linear-gradient(
  90deg,
  transparent 0%,
  rgba(255,255,255,0.8) 50%,
  transparent 100%
)
```

### Page Transitions

```
Review Queue Load:
├── Content: Fade in from opacity 0 → 1
├── Cards: Stagger animation (each card 50ms delay)
├── Initial: translateY(16px) → 0
├── Duration: 300ms per card
└── Easing: ease-out

Modal Open:
├── Overlay: Fade in (opacity 0 → 1, 200ms)
├── Content: Scale + fade (scale 0.95 → 1.0, 300ms)
├── Origin: center
└── Easing: cubic-bezier(0.4, 0, 0.2, 1)

Modal Close:
├── Reverse of open animation
├── Duration: 200ms (faster)
└── Remove from DOM after animation
```

---

## Responsive Adaptations

### Tablet (768px - 1023px)

```
Review Queue:
├── Switch from side-by-side to tabs
├── Tab 1: Unmatched (count badge)
├── Tab 2: Matched (count badge)
├── Cards: Full width within tab
└── Sticky tab bar at top

Document Library:
├── Grid view: 2 columns instead of 3-4
├── Card size: Maintain aspect ratio
└── Filters: Collapse into dropdown "Filters (3)"

Comparison View:
├── Stack columns vertically
├── Document preview: Full width, max-height 300px
├── Transaction details: Full width below
└── Buttons: Full width, stacked
```

### Mobile (<768px)

```
Camera Capture Only:
├── Full-screen camera interface
├── Bottom sheet for captured image review
├── Large "Use" and "Retake" buttons
├── Upload progress: Full-width banner at top
└── Redirect to desktop for reconciliation

Minimal Review:
├── High-confidence matches only
├── Swipe gestures: Right=approve, Left=reject
├── Card stack interface (Tinder-like)
├── Skip button for "review on desktop"
└── Limited to 10 matches per mobile session
```

---

## Accessibility Enhancements

### Focus Indicators

```
Keyboard Focus Ring:
├── Color: blue-500
├── Width: 2px
├── Offset: 2px from element edge
├── Border-radius: matches element + 2px
├── Never remove outline (accessibility requirement)
└── Style: outline-style: solid

Focus Order:
1. Main navigation
2. Upload button / drop zone
3. File cards (if present)
4. Review queue tabs/columns
5. Match cards (top to bottom)
6. Action buttons
7. Pagination
8. Footer
```

### High Contrast Mode

```
@media (prefers-contrast: high) {
  Adjustments:
  ├── Border widths: 1px → 2px
  ├── Text weights: 400 → 500, 600 → 700
  ├── Shadows: Remove all, use borders instead
  ├── Confidence badges: Add border, increase contrast
  └── Focus rings: 2px → 3px
}
```

### Reduced Motion

```
@media (prefers-reduced-motion: reduce) {
  Adjustments:
  ├── Disable all scale animations
  ├── Disable all translateY/translateX animations
  ├── Fade-in only (opacity change)
  ├── Instant transitions (duration: 0ms)
  └── Keep functional animations (progress bars)
}
```

### Screen Reader Announcements

```
Live Regions:
├── Upload progress: aria-live="polite"
├── Match count changes: aria-live="polite"
├── Error messages: aria-live="assertive"
└── Success toasts: aria-live="polite"

Hidden Labels:
├── All icon buttons have aria-label
├── Confidence badges include full text
├── Progress bars have aria-valuenow, aria-valuemin, aria-valuemax
└── Status indicators have role="status"

Semantic HTML:
├── <main> for primary content
├── <nav> for navigation
├── <article> for match cards
├── <section> for grouped content
└── <button> never <div> with onClick
```

---

## Dark Mode Considerations (Future)

```
Color Adjustments:
├── Background: white → gray-900
├── Cards: white → gray-800
├── Text: gray-900 → gray-100
├── Borders: gray-200 → gray-700
├── Drop zone: gray-50 → gray-800
└── Confidence badges: Darken by 10%

Contrast Requirements:
├── Maintain 4.5:1 minimum for all text
├── Adjust shadows (use lighter shadows)
├── Document previews: Add white border for definition
└── Thumbnails: Slightly dimmed overlay

Toggle:
├── Position: User settings or header
├── Icon: Sun/Moon toggle
├── Persist preference: localStorage
└── System preference: prefers-color-scheme
```

---

## Icon Library

```
Recommended: Heroicons (https://heroicons.com/)
License: MIT (free for commercial use)
Style: Outline for default, Solid for emphasis

Required Icons:
├── Upload: CloudArrowUpIcon
├── Document: DocumentIcon
├── Image: PhotoIcon
├── Email: EnvelopeIcon
├── Check: CheckIcon
├── X / Close: XMarkIcon
├── Warning: ExclamationTriangleIcon
├── Info: InformationCircleIcon
├── Search: MagnifyingGlassIcon
├── Filter: FunnelIcon
├── Download: ArrowDownTrayIcon
├── Edit: PencilIcon
├── Delete: TrashIcon
├── View: EyeIcon
├── Settings: Cog6ToothIcon
├── Spinner: ArrowPathIcon (animated)
├── Link: LinkIcon
├── Calendar: CalendarIcon
├── Currency: CurrencyDollarIcon
├── Tag: TagIcon
└── Camera: CameraIcon

Sizing:
├── Small: 16x16px (inline with text)
├── Medium: 20x20px (default)
├── Large: 24x24px (prominent actions)
└── Extra Large: 32x32px, 48x48px (empty states)
```

---

## Component Library Recommendations

```
If using React with Tailwind CSS:

Headless UI (by Tailwind Labs):
├── Modal/Dialog components
├── Dropdown menus
├── Tabs
├── Transitions
└── https://headlessui.com/

React Dropzone:
├── Drag-and-drop file upload
├── File type validation
├── Multiple file handling
└── https://react-dropzone.js.org/

React PDF Viewer:
├── PDF preview in modal
├── Zoom controls
├── Page navigation
└── https://react-pdf-viewer.dev/

Framer Motion (optional, for animations):
├── Page transitions
├── List animations (stagger)
├── Gesture recognition
└── https://www.framer.com/motion/
```

---

## Design Handoff Checklist

For developers implementing this design:

- [ ] All colors specified with Tailwind classes or hex codes
- [ ] All spacing using consistent 8px grid (4, 8, 12, 16, 24, 32, 48, 64)
- [ ] Typography scale follows defined system
- [ ] All interactive states documented (hover, active, focus, disabled)
- [ ] Animation durations and easing functions specified
- [ ] Responsive breakpoints clearly defined
- [ ] Accessibility requirements listed (ARIA labels, focus management)
- [ ] Icon library and sizes standardized
- [ ] Component reusability considered (buttons, cards, badges)
- [ ] Error states and edge cases designed
- [ ] Loading states defined for all async operations
- [ ] Success/error feedback mechanisms specified
- [ ] Keyboard navigation order documented
- [ ] Screen reader text provided for non-text elements
- [ ] High contrast and reduced motion variants considered

---

## Design QA Testing

Before considering design complete:

**Visual Consistency:**
- [ ] All similar components use same styling
- [ ] Color usage is consistent throughout
- [ ] Typography hierarchy is clear
- [ ] Spacing is rhythmic and consistent

**Usability:**
- [ ] All buttons have clear labels
- [ ] All interactive elements have obvious affordances
- [ ] Error messages are helpful and actionable
- [ ] Success states provide clear feedback
- [ ] Loading states prevent confusion

**Accessibility:**
- [ ] Tab through entire flow without mouse
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Verify color contrast meets WCAG AA
- [ ] Test with high contrast mode enabled
- [ ] Test with reduced motion preference

**Responsiveness:**
- [ ] Test at 1440px (desktop)
- [ ] Test at 1024px (small desktop/tablet)
- [ ] Test at 768px (tablet)
- [ ] Test at 375px (mobile)
- [ ] Verify no horizontal scroll at any size

**Performance:**
- [ ] Images optimized and lazy-loaded
- [ ] Animations don't cause jank (60fps)
- [ ] Large lists use virtualization
- [ ] Fonts are preloaded

---

## Version Control

**Version:** 1.0
**Last Updated:** October 29, 2025
**Status:** Design Specification Complete

**Related Documents:**
- UX-DESIGN-Document-Management-System.md (user flows, wireframes)
- Joot Design System (base styles, existing components)

**Next Steps:**
1. Design review with development team
2. Accessibility audit
3. Create interactive prototype (Figma/Framer)
4. User testing with prototype
5. Iterate based on feedback
6. Begin Phase 1 implementation
