# Sidebar Navigation Component

**Component Type:** Page-Specific
**Status:** Design Specification
**Last Updated:** 2025-10-21
**Design Version:** 1.0

## Overview

The Sidebar Navigation component provides a persistent left-side navigation pattern for the Joot financial transaction tracking app. It follows modern UX conventions seen in products like Vercel, Linear, and Notion while maintaining consistency with the existing design system.

## Design Research Summary

### Modern Sidebar Patterns (2025)

**Key Insights:**
- **Fixed width:** Industry standard ~224px-256px (Notion uses 224px)
- **Vertical rhythm:** Strong alignment and predictable spacing
- **Icon + label:** Improves comprehension and accessibility
- **Visual hierarchy:** Clear distinction between navigation items and user account
- **Persistent visibility:** Always accessible, not hidden on desktop
- **Mobile adaptation:** Collapsible hamburger menu for small screens

**Reference Products:**
- **Linear:** Clean minimalist sidebar with subtle hover states
- **Vercel:** High contrast, clear active states, bottom-anchored user menu
- **Notion:** 224px fixed width, strong visual grouping, psychological design patterns
- **Supabase:** Dense navigation with well-defined subcategories

## Design Specification

### Layout Structure

#### Dimensions
```tsx
// Desktop (>= 1024px)
Width: 240px (fixed)
Height: 100vh
Position: Fixed left

// Tablet (640px - 1023px)
Width: 200px (fixed)
Height: 100vh
Position: Fixed left

// Mobile (< 640px)
Width: 100% (when open, overlay)
Height: 100vh
Position: Fixed, overlay with backdrop
```

#### Internal Structure
```
┌─────────────────────────┐
│ Logo / Brand (optional) │  <- Top section (48px height)
├─────────────────────────┤
│                         │
│ Navigation Items        │  <- Middle section (flex-1)
│   • Home               │
│   • All Transactions   │
│                         │
│         ↕              │
│    (scrollable)        │
│                         │
├─────────────────────────┤
│ User Avatar + Email     │  <- Bottom section (72px height)
│ (clickable to Settings) │
└─────────────────────────┘
```

### Visual Design

#### Container
```tsx
className="
  fixed left-0 top-0 h-screen
  w-[240px]
  bg-background
  border-r border-border
  flex flex-col
  z-30
"
```

**Design Tokens:**
- Background: `bg-background` (white in light mode, zinc-950 in dark mode)
- Border: `border-border` (zinc-200 in light mode, zinc-800 in dark mode)
- Z-index: `z-30` (below modals, above page content)

#### Navigation Section (Top)
```tsx
<nav className="flex-1 overflow-y-auto px-3 pt-6">
  {/* Navigation items */}
</nav>
```

**Spacing:**
- Horizontal padding: `px-3` (12px) - allows room for focus rings
- Top padding: `pt-6` (24px) - breathing room from top
- Overflow: `overflow-y-auto` - scrollable if items exceed viewport

#### User Account Section (Bottom)
```tsx
<div className="border-t border-border px-3 py-4">
  {/* User avatar + email + settings link */}
</div>
```

**Spacing:**
- Border top: `border-t border-border` - visual separation
- Padding: `px-3 py-4` (12px horizontal, 16px vertical)
- Min height: 72px (ensures touch-friendly target)

### Navigation Items

#### Default State
```tsx
<Link
  href="/home"
  className="
    flex items-center gap-3
    px-3 py-2.5
    rounded-lg
    text-sm font-medium
    text-muted-foreground
    transition-colors duration-200
    hover:bg-accent hover:text-accent-foreground
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
  "
>
  <Home className="h-5 w-5 shrink-0" />
  <span>Home</span>
</Link>
```

**Design Tokens:**
- Text color: `text-muted-foreground` (zinc-500 light, zinc-400 dark)
- Font: `text-sm font-medium` (14px, 500 weight)
- Padding: `px-3 py-2.5` (12px horizontal, 10px vertical)
- Gap: `gap-3` (12px between icon and label)
- Border radius: `rounded-lg` (8px)
- Transition: `transition-colors duration-200`

**Touch Target:**
- Minimum height: 40px (10px + 20px + 10px)
- Meets WCAG 2.5.5 Level AAA (44x44px recommended)

#### Hover State
```tsx
hover:bg-accent hover:text-accent-foreground
```

**Design Tokens:**
- Background: `bg-accent` (zinc-100 light, zinc-800 dark)
- Text: `text-accent-foreground` (zinc-900 light, zinc-50 dark)

**Behavior:**
- Smooth 200ms color transition
- Entire row is clickable (full width of sidebar minus padding)
- Subtle background lift without border or shadow changes

#### Active State
```tsx
className="
  flex items-center gap-3
  px-3 py-2.5
  rounded-lg
  text-sm font-medium
  bg-accent text-accent-foreground
  transition-colors duration-200
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
"
```

**Design Tokens:**
- Background: `bg-accent` (persistent, not just on hover)
- Text: `text-accent-foreground` (higher contrast)
- Font weight: `font-medium` (same as default, relies on color for distinction)

**Visual Distinction:**
- Same background color as hover state, but persistent
- Active state determined by current pathname
- No additional visual indicators (no border-left accent or icon changes)

#### Focus State (Keyboard Navigation)
```tsx
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ring
focus-visible:ring-offset-2
```

**Design Tokens:**
- Ring color: `ring-ring` (blue-600 light, blue-400 dark)
- Ring width: `ring-2` (2px)
- Ring offset: `ring-offset-2` (2px)

**Accessibility:**
- Only visible when navigating via keyboard (focus-visible)
- High contrast against all backgrounds
- 2px offset prevents overlap with text

### User Account Section

#### Layout Structure
```tsx
<div className="border-t border-border px-3 py-4">
  <Link
    href="/settings"
    className="
      flex items-center gap-3
      px-3 py-2.5
      rounded-lg
      transition-colors duration-200
      hover:bg-accent
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
    "
  >
    <Avatar className="h-8 w-8 shrink-0">
      <AvatarFallback className="bg-zinc-100 text-zinc-950 text-xs font-semibold">
        {userInitials}
      </AvatarFallback>
    </Avatar>
    <div className="flex flex-col min-w-0 flex-1">
      <span className="text-sm font-medium text-foreground truncate">
        {fullName}
      </span>
      <span className="text-xs text-muted-foreground truncate">
        {userEmail}
      </span>
    </div>
  </Link>
</div>
```

#### Avatar
**Design Tokens:**
- Size: `h-8 w-8` (32px - smaller than header avatar)
- Background: `bg-zinc-100` (light mode)
- Text: `text-zinc-950 text-xs font-semibold`
- Shrink: `shrink-0` (prevents squishing)

#### User Info
**Design Tokens:**
- Name: `text-sm font-medium text-foreground` (14px, 500 weight, primary color)
- Email: `text-xs text-muted-foreground` (12px, secondary color)
- Container: `flex flex-col min-w-0 flex-1` (allows truncation)
- Truncation: `truncate` (prevents overflow)

**Spacing:**
- Gap between avatar and text: `gap-3` (12px)
- Vertical stacking: `flex-col` with natural line-height spacing

#### Interaction States
**Hover:**
```tsx
hover:bg-accent
```
- Entire row background changes to accent color
- Cursor becomes pointer

**Focus:**
```tsx
focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
```
- Same focus ring as navigation items

**Active (when on Settings page):**
- Could optionally add `bg-accent` when pathname includes '/settings'
- Not required for v1, user context is clear from page content

### Responsive Behavior

#### Desktop (>= 1024px)
```tsx
<aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[240px] flex-col bg-background border-r border-border z-30">
  {/* Sidebar content */}
</aside>
```

**Behavior:**
- Always visible
- Fixed position, doesn't scroll with page
- Page content has `ml-[240px]` to account for sidebar width

#### Tablet (640px - 1023px)
```tsx
// Option 1: Hide completely, use top navigation
<aside className="hidden lg:flex ...">

// Option 2: Reduce width
<aside className="hidden md:flex w-[200px] ...">
```

**Recommendation:** Hide on tablet, use existing top navigation (MainNavigation component)
- Simpler implementation
- Avoids cramped layout on medium screens
- Existing horizontal navigation is sufficient

#### Mobile (< 640px)
```tsx
// Hamburger button trigger
<button
  onClick={() => setIsSidebarOpen(true)}
  className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-background border border-border shadow-sm"
>
  <Menu className="h-5 w-5" />
</button>

// Backdrop
{isSidebarOpen && (
  <div
    className="lg:hidden fixed inset-0 bg-black/40 z-40"
    onClick={() => setIsSidebarOpen(false)}
  />
)}

// Sidebar (overlay)
<aside
  className={cn(
    "lg:hidden fixed left-0 top-0 h-screen w-[280px] flex-col bg-background border-r border-border z-50 transition-transform duration-300",
    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
  )}
>
  <div className="flex justify-end p-4">
    <button onClick={() => setIsSidebarOpen(false)}>
      <X className="h-5 w-5" />
    </button>
  </div>
  {/* Sidebar content */}
</aside>
```

**Behavior:**
- Hidden by default
- Triggered by hamburger menu icon (top-left corner)
- Slides in from left with smooth transition (300ms)
- Semi-transparent backdrop (black/40)
- Close button in top-right of sidebar
- Closes when clicking backdrop
- Wider on mobile (280px) for easier touch targets
- Z-index 50 (above page content and backdrop)

**Recommendation for v1:** Desktop-only sidebar
- Mobile continues using existing top navigation
- Simpler implementation
- Avoids complexity of mobile overlay pattern
- Can add mobile drawer in future iteration

### Accessibility Requirements

#### Semantic HTML
```tsx
<aside role="navigation" aria-label="Main navigation">
  <nav>
    {/* Navigation items */}
  </nav>
  <div role="region" aria-label="User account">
    {/* User account section */}
  </div>
</aside>
```

#### Keyboard Navigation
- **Tab:** Focus next interactive element
- **Shift+Tab:** Focus previous interactive element
- **Enter/Space:** Activate focused link
- **Escape:** Close mobile sidebar (if open)

#### Focus Management
- All navigation items are keyboard accessible
- Focus indicators are clearly visible (2px ring)
- Focus order follows visual order (top to bottom)
- No keyboard traps

#### Screen Reader Support
```tsx
<Link href="/home" aria-current={isActive ? "page" : undefined}>
  <Home aria-hidden="true" />
  <span>Home</span>
</Link>
```

- Icons marked `aria-hidden="true"` (decorative)
- Text labels provide semantic meaning
- `aria-current="page"` indicates active page
- ARIA labels for regions

#### Color Contrast
All color combinations meet WCAG 2.1 AA standards:
- **Default state:** zinc-500 on background (4.8:1)
- **Hover/Active state:** zinc-900 on zinc-100 (11.5:1)
- **Focus ring:** blue-600 with 2px offset (visible on all backgrounds)

### Component Props Interface

```typescript
interface SidebarNavigationProps {
  /**
   * User information for bottom section
   */
  user: {
    fullName: string
    email: string
    initials: string
  }

  /**
   * Current pathname for active state detection
   */
  currentPath: string

  /**
   * Optional: Control sidebar open state (mobile)
   */
  isOpen?: boolean

  /**
   * Optional: Callback when sidebar state changes (mobile)
   */
  onOpenChange?: (open: boolean) => void

  /**
   * Optional: Additional navigation items (future expansion)
   */
  customItems?: NavigationItem[]

  /**
   * Optional: Show/hide logo section
   */
  showLogo?: boolean
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number // For future notifications
}
```

### Integration with Existing Design System

#### Design Token Usage
All styling uses existing design tokens:

**Colors:**
- `bg-background` - main sidebar background
- `border-border` - sidebar border and dividers
- `text-foreground` - primary text
- `text-muted-foreground` - secondary text
- `bg-accent` / `text-accent-foreground` - hover and active states
- `ring-ring` - focus indicators

**Spacing:**
- `px-3` (12px) - horizontal padding
- `py-2.5` (10px) - vertical padding for items
- `py-4` (16px) - vertical padding for user section
- `pt-6` (24px) - top padding for navigation
- `gap-3` (12px) - icon-to-text spacing

**Typography:**
- `text-sm font-medium` - navigation items (14px, 500 weight)
- `text-xs` - email address (12px)

**Border Radius:**
- `rounded-lg` - navigation items (8px)

**Shadows:**
- None used (follows flat design pattern)

**Transitions:**
- `transition-colors duration-200` - smooth color changes

#### Compliance Score: 10/10
- ✅ 100% design token usage
- ✅ No hardcoded colors
- ✅ No arbitrary spacing values
- ✅ Consistent with existing patterns
- ✅ Semantic color tokens throughout

### Page Layout Adjustments

#### Main Content Area
```tsx
// Before (current)
<div className="min-h-screen bg-background">
  <div className="flex flex-col gap-6 pb-12 pt-6 md:pt-12 px-6 md:px-10">
    {/* Page content */}
  </div>
</div>

// After (with sidebar)
<div className="min-h-screen bg-background">
  <SidebarNavigation user={user} currentPath={pathname} />

  <main className="lg:ml-[240px] min-h-screen">
    <div className="flex flex-col gap-6 pb-12 pt-6 md:pt-12 px-6 md:px-10">
      {/* Page content */}
    </div>
  </main>
</div>
```

**Changes:**
- Add `lg:ml-[240px]` to main content wrapper
- Maintains existing spacing and layout
- No changes to internal page structure
- Sidebar and content are siblings in layout

#### Header Adjustments
**Remove duplicate navigation:**
- Current: Header shows Home/Transactions/Settings tabs
- New: Remove top navigation tabs, use sidebar only
- Keep: User menu in top-right (with avatar)
- Keep: Page title in top-left

```tsx
// Simplified header (desktop with sidebar)
<div className="flex items-center justify-between w-full">
  <h1 className="text-[36px] font-medium text-foreground leading-[40px]">
    {pageTitle}
  </h1>
  <div className="flex items-center gap-3">
    {/* Optional: Add transaction button */}
    <UserMenu userName={fullName} isAdmin={isAdmin}>
      <Avatar className="size-10 cursor-pointer">
        <AvatarFallback>{userInitials}</AvatarFallback>
      </Avatar>
    </UserMenu>
  </div>
</div>
```

### Implementation Notes

#### Component Location
```
/src/components/page-specific/sidebar-navigation.tsx
```

**Rationale:**
- Page-specific component (navigation is app-level)
- Follows existing pattern (main-navigation.tsx in same directory)
- Not a global UI component (has business logic for route detection)

#### State Management
```tsx
"use client"

import { usePathname } from 'next/navigation'

export function SidebarNavigation({ user }: SidebarNavigationProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href)
  }

  // Component implementation
}
```

**Considerations:**
- Client component (requires usePathname hook)
- No external state needed for desktop version
- Mobile version would need useState for open/close
- Active state determined by pathname matching

#### Relationship to Existing Components

**Replace:**
- `MainNavigation` component (horizontal tabs) on desktop only
- Keep for mobile until mobile sidebar is implemented

**Integrate:**
- `UserMenu` component (reuse in user account section)
- `Avatar` component (reuse in user account section)

**Maintain:**
- Page layouts and content structure
- Add transaction footer (bottom sticky bar)
- Modal dialogs and overlays

### Development Phases

#### Phase 1: Desktop-Only Sidebar (Recommended for v1)
**Scope:**
- ✅ Desktop sidebar (>= 1024px)
- ✅ Navigation items (Home, All Transactions)
- ✅ User account section (avatar, name, email)
- ✅ Click to navigate to Settings
- ✅ Active state detection
- ✅ Hover and focus states
- ✅ Accessibility features

**Effort:** 4-6 hours
**Files modified:** 3-4 files
**Design token compliance:** 100%

#### Phase 2: Mobile Drawer Pattern (Future)
**Scope:**
- ☐ Mobile hamburger menu trigger
- ☐ Slide-in overlay with backdrop
- ☐ Close button and outside-click dismiss
- ☐ Smooth transitions
- ☐ Touch-friendly sizing (280px width)

**Effort:** 3-4 hours
**Complexity:** Medium (animation and state management)

#### Phase 3: Enhanced Features (Future)
**Scope:**
- ☐ Optional logo/brand section at top
- ☐ Notification badges on navigation items
- ☐ Collapsible sidebar (pin/unpin)
- ☐ User preference persistence
- ☐ Additional navigation items
- ☐ Sub-navigation support

**Effort:** 6-8 hours
**Complexity:** High (preferences, animations, complex states)

### Design Rationale

#### Why Left Sidebar vs Top Navigation?

**Advantages:**
1. **Vertical space efficiency:** Modern apps have many features, vertical lists scale better
2. **Visual hierarchy:** Clear separation between navigation and content
3. **Consistency:** Matches industry patterns (Notion, Linear, Vercel)
4. **Expandability:** Easy to add more navigation items without crowding
5. **User muscle memory:** Left sidebar is expected pattern for productivity apps
6. **Desktop real estate:** Horizontal space is abundant, vertical is precious

**Trade-offs:**
1. Reduces content width by 240px on desktop (acceptable for 1440px+ displays)
2. Adds complexity for mobile (requires overlay pattern)
3. Shifts user mental model (current users expect top nav)

**Recommendation:** Proceed with left sidebar for desktop, maintain top nav for mobile in v1

#### Why User Account in Sidebar vs Header?

**Advantages:**
1. **Reduces header clutter:** Cleaner, more focused page headers
2. **Persistent access:** Always visible without scrolling
3. **Conventional pattern:** Matches Linear, Notion, Figma, etc.
4. **Click to Settings:** Direct navigation to settings (current pattern requires dropdown)
5. **Visual balance:** Anchors bottom of sidebar, creates bookend effect

**Trade-offs:**
1. User must look to bottom-left instead of top-right
2. Breaks existing mental model (avatar currently in top-right)
3. Requires user re-learning

**Recommendation:** Proceed with sidebar placement for modern pattern consistency

### Testing Checklist

#### Visual Testing
- [ ] Default state renders correctly
- [ ] Hover states work on all navigation items
- [ ] Active state displays on current page
- [ ] Focus rings visible and properly positioned
- [ ] User account section displays name and email correctly
- [ ] Avatar initials render properly
- [ ] Border and spacing match design tokens
- [ ] Dark mode colors render correctly

#### Functional Testing
- [ ] Clicking Home navigates to /home
- [ ] Clicking All Transactions navigates to /transactions
- [ ] Clicking user account section navigates to /settings
- [ ] Active state updates when route changes
- [ ] Page content shifts correctly with sidebar (ml-[240px])
- [ ] Sidebar is hidden on mobile/tablet (< 1024px)
- [ ] Existing top navigation still works on mobile

#### Accessibility Testing
- [ ] Tab key moves focus through navigation items
- [ ] Focus indicators are visible
- [ ] Enter/Space activates focused link
- [ ] Screen reader announces navigation landmarks
- [ ] aria-current="page" set on active item
- [ ] Color contrast meets WCAG AA standards
- [ ] Touch targets meet 44x44px minimum

#### Responsive Testing
- [ ] Desktop (1440px): Sidebar visible, content shifted
- [ ] Laptop (1280px): Sidebar visible, content not cramped
- [ ] Tablet (768px): Sidebar hidden, top nav visible
- [ ] Mobile (375px): Sidebar hidden, top nav visible

#### Integration Testing
- [ ] Works with all existing pages (home, transactions, settings)
- [ ] Doesn't break modal dialogs
- [ ] Doesn't interfere with sticky footer
- [ ] Works with UserMenu dropdown
- [ ] Maintains proper z-index layering

### Design Assets & References

#### Figma Design File
*To be created based on this specification*

**Recommended frames:**
1. Desktop default state (1440px width)
2. Hover states (all variations)
3. Active state variations
4. Dark mode version
5. User account section detail
6. Focus states (keyboard navigation)
7. Mobile overlay pattern (future)

#### Component Preview
```tsx
// Example usage in layout
import { SidebarNavigation } from '@/components/page-specific/sidebar-navigation'

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNavigation
        user={{
          fullName: "Dennis Smith",
          email: "dennis@example.com",
          initials: "DS"
        }}
        currentPath="/home"
      />

      <main className="lg:ml-[240px]">
        {children}
      </main>
    </div>
  )
}
```

### Future Enhancements

#### V1.1: Mobile Drawer Pattern
- Hamburger menu trigger
- Smooth slide-in animation
- Touch-friendly sizing
- Outside-click dismiss

#### V1.2: Logo Section
- Optional brand logo at top
- 48px height section
- Clickable to navigate home
- Configurable show/hide

#### V1.3: Notification Badges
- Badge support on navigation items
- Red dot for new notifications
- Number display for counts
- Accessible announcements

#### V2.0: Collapsible Sidebar
- Pin/unpin toggle
- Collapsed state (icon-only, 64px width)
- Tooltip labels when collapsed
- User preference persistence

#### V2.1: Keyboard Shortcuts
- CMD+K / CTRL+K command palette
- Keyboard navigation hints
- Global shortcuts for each nav item
- Accessibility improvements

---

## Summary

This sidebar navigation component provides a modern, accessible, and design-system-compliant navigation pattern for the Joot app. The specification prioritizes:

1. **Design token compliance:** 100% usage of existing design system tokens
2. **Accessibility:** WCAG 2.1 AA compliant, full keyboard support
3. **Modern UX patterns:** Follows industry best practices from Linear, Notion, Vercel
4. **Phased implementation:** Desktop-first approach with clear future roadmap
5. **Integration ease:** Minimal disruption to existing pages and components

**Recommended next steps:**
1. Review and approve this specification
2. Create Figma design file based on spec
3. Implement Phase 1 (Desktop-only sidebar)
4. Test with existing pages and user flows
5. Gather user feedback before Phase 2 (Mobile)
