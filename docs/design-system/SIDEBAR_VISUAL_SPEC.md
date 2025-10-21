# Sidebar Navigation - Visual Specification

**Date:** 2025-10-21
**Type:** Visual Design Reference

## Component Anatomy

### Full Layout View (Desktop 1440px)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  ┌──────────────────┐  ┌─────────────────────────────────────────────┐   │
│  │                  │  │                                             │   │
│  │                  │  │  Home                        [Avatar] ▼     │   │
│  │  (Logo Area)     │  │  ────────────────────────────────────────   │   │
│  │  48px height     │  │                                             │   │
│  │  Optional        │  │  October 2025                               │   │
│  │                  │  │  ┌───────────────────────────────────────┐  │   │
│  ├──────────────────┤  │  │                                       │  │   │
│  │                  │  │  │  Monthly Summary Card                 │  │   │
│  │  ☰ Home          │  │  │  (Income, Expenses, Net)              │  │   │
│  │                  │  │  │                                       │  │   │
│  │  ☰ All Trans...  │  │  └───────────────────────────────────────┘  │   │
│  │                  │  │                                             │   │
│  │                  │  │  Year to Date (2025)                        │   │
│  │                  │  │  ┌───────────────────────────────────────┐  │   │
│  │                  │  │  │                                       │  │   │
│  │                  │  │  │  YTD Summary + Exchange Rate          │  │   │
│  │                  │  │  │                                       │  │   │
│  │                  │  │  └───────────────────────────────────────┘  │   │
│  │                  │  │                                             │   │
│  │                  │  │  Recent Transactions                        │   │
│  │                  │  │  ┌───────────────────────────────────────┐  │   │
│  │                  │  │  │                                       │  │   │
│  │                  │  │  │  Transaction List                     │  │   │
│  │                  │  │  │                                       │  │   │
│  │                  │  │  └───────────────────────────────────────┘  │   │
│  │                  │  │                                             │   │
│  │                  │  │                                             │   │
│  ├──────────────────┤  └─────────────────────────────────────────────┘   │
│  │  ──────────────  │                                                     │
│  │  [DS]            │                                                     │
│  │  Dennis Smith    │                                                     │
│  │  dennis@ex...    │                                                     │
│  └──────────────────┘                                                     │
│    240px width        lg:ml-[240px] offset                                │
└────────────────────────────────────────────────────────────────────────────┘
```

## Sidebar Component Detailed View

### Desktop Sidebar (240px × 100vh)

```
┌──────────────────────────────────────┐
│                                      │ ← 0px top
│          (Optional Logo)             │
│                                      │
│                                      │ ← 48px (if logo present)
├──────────────────────────────────────┤
│                                      │ ← 24px padding-top
│  ┌────────────────────────────────┐  │
│  │  [🏠]  Home                    │  │ ← Navigation item
│  └────────────────────────────────┘  │   40px height (min)
│                                      │   12px padding horizontal
│  ┌────────────────────────────────┐  │   10px padding vertical
│  │  [🧾]  All Transactions        │  │
│  └────────────────────────────────┘  │
│                                      │
│                                      │
│                                      │
│              (Flex spacer)           │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
├──────────────────────────────────────┤ ← Border-top separator
│  ┌────────────────────────────────┐  │ ← 16px padding-top
│  │  [DS]  Dennis Smith           │  │
│  │        dennis@example.com      │  │ ← User account section
│  └────────────────────────────────┘  │   72px total height
│                                      │ ← 16px padding-bottom
└──────────────────────────────────────┘
   240px width                           100vh height
```

### Spacing Breakdown

```
Navigation Item Anatomy:
┌─────────────────────────────────────┐
│ ← 12px →                    ← 12px→ │ Horizontal padding (px-3)
│                                     │
│    ↕ 10px                           │ Top padding (py-2.5)
│   ┌─────┐   ← 12px →   Home         │
│   │ 20px│              (text-sm)    │ Icon (h-5 w-5)
│   │ 20px│                           │ Text (14px medium)
│   └─────┘                           │
│    ↕ 10px                           │ Bottom padding (py-2.5)
│                                     │
└─────────────────────────────────────┘
Total height: 40px (20px icon + 20px padding)


User Account Section Anatomy:
┌─────────────────────────────────────┐
│         ← 1px border-top →          │
│ ← 12px →                    ← 12px→ │
│    ↕ 16px                           │ Top padding (py-4)
│   ┌────┐   ← 12px →  Dennis Smith  │
│   │ 32 │              (text-sm)     │ Avatar (h-8 w-8)
│   │ 32 │              dennis@ex...  │ Name (14px medium)
│   └────┘              (text-xs)     │ Email (12px normal)
│    ↕ 16px                           │ Bottom padding (py-4)
└─────────────────────────────────────┘
Total height: ~72px (32px avatar + 40px padding/text)
```

## Interactive States

### Navigation Item States

#### 1. Default State (Inactive)
```
┌─────────────────────────────────────┐
│                                     │
│   [🏠]  Home                        │  Background: transparent
│                                     │  Text: text-muted-foreground
│                                     │  Icon: zinc-500 (light mode)
└─────────────────────────────────────┘
```

#### 2. Hover State
```
┌─────────────────────────────────────┐
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │  Background: bg-accent
│ ▒▒ [🏠]  Home                   ▒▒ │  (zinc-100 light mode)
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │  Text: text-accent-foreground
└─────────────────────────────────────┘  (zinc-900 light mode)
                                         Cursor: pointer
                                         Transition: 200ms ease
```

#### 3. Active State (Current Page)
```
┌─────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  Background: bg-accent
│ ▓▓ [🏠]  Home                   ▓▓ │  (persistent, same as hover)
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  Text: text-accent-foreground
└─────────────────────────────────────┘  aria-current="page"
```

#### 4. Focus State (Keyboard Navigation)
```
┌─────────────────────────────────────┐
│ ╔═══════════════════════════════╗   │  Focus ring: 2px blue-600
│ ║ ┌───────────────────────────┐ ║   │  Ring offset: 2px
│ ║ │ [🏠]  Home                │ ║   │  Visible only on Tab focus
│ ║ └───────────────────────────┘ ║   │  (focus-visible)
│ ╚═══════════════════════════════╝   │
└─────────────────────────────────────┘
```

### User Account Section States

#### 1. Default State
```
┌─────────────────────────────────────┐
│  ────────────────────────────────   │ ← 1px border (zinc-200)
│                                     │
│  ┌────┐  Dennis Smith              │  Background: transparent
│  │ DS │  dennis@example.com         │  Avatar: bg-zinc-100
│  └────┘                             │  Name: text-foreground
│                                     │  Email: text-muted-foreground
└─────────────────────────────────────┘
```

#### 2. Hover State (Entire Section)
```
┌─────────────────────────────────────┐
│  ────────────────────────────────   │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │
│ ▒▒ ┌────┐  Dennis Smith         ▒▒ │  Background: bg-accent
│ ▒▒ │ DS │  dennis@example.com   ▒▒ │  Cursor: pointer
│ ▒▒ └────┘                        ▒▒ │  Transition: 200ms ease
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │
└─────────────────────────────────────┘
```

#### 3. Focus State
```
┌─────────────────────────────────────┐
│  ────────────────────────────────   │
│ ╔═══════════════════════════════╗   │
│ ║ ┌────┐  Dennis Smith         ║   │  Focus ring: 2px blue-600
│ ║ │ DS │  dennis@example.com   ║   │  Ring offset: 2px
│ ║ └────┘                        ║   │  Keyboard accessible
│ ╚═══════════════════════════════╝   │
└─────────────────────────────────────┘
```

## Color Specifications

### Light Mode (Default)

```
Sidebar Background:    bg-background      → #ffffff
Sidebar Border:        border-border      → #e4e4e7 (zinc-200)

Default Text:          text-muted-fg      → #71717b (zinc-500)
User Name:             text-foreground    → #09090b (zinc-950)
User Email:            text-muted-fg      → #71717b (zinc-500)

Hover/Active BG:       bg-accent          → #f4f4f5 (zinc-100)
Hover/Active Text:     text-accent-fg     → #18181b (zinc-900)

Focus Ring:            ring-ring          → #155dfc (blue-600)
Avatar BG:             bg-zinc-100        → #f4f4f5
Avatar Text:           text-zinc-950      → #09090b
```

### Dark Mode

```
Sidebar Background:    bg-background      → #09090b (zinc-950)
Sidebar Border:        border-border      → #27272a (zinc-800)

Default Text:          text-muted-fg      → #9f9fa9 (zinc-400)
User Name:             text-foreground    → #fafafa (zinc-50)
User Email:            text-muted-fg      → #9f9fa9 (zinc-400)

Hover/Active BG:       bg-accent          → #27272a (zinc-800)
Hover/Active Text:     text-accent-fg     → #fafafa (zinc-50)

Focus Ring:            ring-ring          → #51a2ff (blue-400)
Avatar BG:             bg-zinc-100        → #f4f4f5 (stays light)
Avatar Text:           text-zinc-950      → #09090b (stays dark)
```

## Responsive Breakpoints

### Desktop (>= 1024px) - Sidebar Visible
```
┌──────────────┬─────────────────────────────┐
│              │                             │
│   Sidebar    │   Main Content              │
│   240px      │   (Remaining width)         │
│   Fixed      │   ml-[240px] offset         │
│              │                             │
└──────────────┴─────────────────────────────┘
```

### Tablet/Mobile (< 1024px) - Sidebar Hidden
```
┌─────────────────────────────────────────┐
│                                         │
│   Main Content (Full Width)             │
│   Uses existing MainNavigation (top)    │
│                                         │
└─────────────────────────────────────────┘
```

## Typography Scale

```
Navigation Item Label:
├─ Font family: font-sans (Geist Sans)
├─ Font size: text-sm → 14px
├─ Font weight: font-medium → 500
├─ Line height: 1.25rem (20px)
└─ Letter spacing: Default

User Name:
├─ Font family: font-sans
├─ Font size: text-sm → 14px
├─ Font weight: font-medium → 500
├─ Line height: 1.25rem (20px)
└─ Truncate: Yes (overflow-hidden)

User Email:
├─ Font family: font-sans
├─ Font size: text-xs → 12px
├─ Font weight: font-normal → 400
├─ Line height: 1rem (16px)
└─ Truncate: Yes (overflow-hidden)
```

## Icon Specifications

```
Navigation Icons (Home, Receipt):
├─ Source: lucide-react
├─ Size: h-5 w-5 → 20px × 20px
├─ Stroke width: Default (2px)
├─ Color: Inherits from parent text
├─ ARIA: aria-hidden="true"
└─ Shrink: shrink-0

User Avatar:
├─ Component: Avatar from shadcn/ui
├─ Size: h-8 w-8 → 32px × 32px
├─ Background: bg-zinc-100
├─ Text size: text-xs → 12px
├─ Font weight: font-semibold → 600
└─ Content: Two-letter initials (uppercase)
```

## Z-Index Layering

```
Modal Dialogs:         z-50
Sidebar:               z-30  ← Sidebar navigation
Sticky Footer:         z-20
Page Content:          z-0
Background:            z-0

Mobile Overlay (Future):
├─ Backdrop:           z-40
└─ Sidebar Drawer:     z-50
```

## Transitions & Animations

```
Navigation Item Hover:
├─ Property: background-color, color
├─ Duration: 200ms
├─ Timing: ease-in-out
└─ Class: transition-colors duration-200

User Section Hover:
├─ Property: background-color
├─ Duration: 200ms
├─ Timing: ease-in-out
└─ Class: transition-colors duration-200

Focus Ring:
├─ Property: Instant (no transition)
├─ Visibility: Only on :focus-visible
└─ Class: focus-visible:ring-2
```

## Touch Target Guidelines

```
Minimum Touch Targets (WCAG 2.5.5):
├─ Level A: 24px × 24px
├─ Level AA: 36px × 36px  ← We meet this
└─ Level AAA: 44px × 44px ← Recommended

Navigation Items:
├─ Width: Full sidebar width minus padding (216px)
├─ Height: 40px (min)
├─ Clickable area: Entire row
└─ Status: ✅ Exceeds AA (36px), Approaches AAA (44px)

User Account Section:
├─ Width: Full sidebar width minus padding (216px)
├─ Height: ~72px
├─ Clickable area: Entire row
└─ Status: ✅✅ Exceeds AAA (44px)
```

## Border & Elevation

```
Sidebar Border:
├─ Side: Right border only
├─ Width: 1px
├─ Color: border-border (zinc-200 light, zinc-800 dark)
└─ Style: Solid

User Section Divider:
├─ Side: Top border only
├─ Width: 1px
├─ Color: border-border
└─ Style: Solid

Shadows:
├─ Navigation items: None (flat design)
├─ User section: None (flat design)
└─ Sidebar container: None (relies on border for definition)
```

## Accessibility Annotations

```
<aside
  role="navigation"                    ← Landmark role
  aria-label="Main navigation"         ← Descriptive label
  className="..."
>
  <nav>                                ← Semantic HTML
    <Link
      href="/home"
      aria-current={isActive ? "page" : undefined}  ← Current page indicator
      className="..."
    >
      <Home aria-hidden="true" />      ← Decorative icon
      <span>Home</span>                ← Meaningful text label
    </Link>
  </nav>

  <div
    role="region"                      ← Landmark for user section
    aria-label="User account"          ← Descriptive label
  >
    <Link href="/settings" className="...">
      <Avatar>...</Avatar>
      <div>
        <span>Dennis Smith</span>      ← Visible name
        <span>dennis@example.com</span>← Visible email
      </div>
    </Link>
  </div>
</aside>
```

## Implementation Code Reference

### Navigation Item Component
```tsx
<Link
  href="/home"
  aria-current={isActive ? "page" : undefined}
  className={cn(
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
  )}
>
  <Home className="h-5 w-5 shrink-0" aria-hidden="true" />
  <span>Home</span>
</Link>
```

### User Account Section Component
```tsx
<div className="border-t border-border px-3 py-4">
  <Link
    href="/settings"
    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  >
    <Avatar className="h-8 w-8 shrink-0">
      <AvatarFallback className="bg-zinc-100 text-zinc-950 text-xs font-semibold">
        DS
      </AvatarFallback>
    </Avatar>
    <div className="flex flex-col min-w-0 flex-1">
      <span className="text-sm font-medium text-foreground truncate">
        Dennis Smith
      </span>
      <span className="text-xs text-muted-foreground truncate">
        dennis@example.com
      </span>
    </div>
  </Link>
</div>
```

---

## Design Files

**Specification Documents:**
- Full spec: `/docs/design-system/components/page-specific/sidebar-navigation.md`
- Summary: `/docs/design-system/SIDEBAR_NAVIGATION_SUMMARY.md`
- Visual spec: This file

**Figma Mockup:** To be created (optional)

**Component Location:**
- `/src/components/page-specific/sidebar-navigation.tsx`
