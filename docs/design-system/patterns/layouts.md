# Layout Patterns

**Last Updated:** 2025-08-27

## Overview

This document outlines the standard layout patterns used throughout the Joot App, ensuring consistency in spacing, structure, and responsive behavior across different screen sizes and contexts.

## Page Layout Patterns

### Main Page Container
```tsx
<div className="min-h-screen bg-background">
  <div className="flex flex-col gap-6 pb-32 pt-16 px-10">
    {/* Page content */}
  </div>
</div>
```

**Key Features**:
- Full viewport height with `min-h-screen`
- Background uses semantic token
- Consistent top padding (64px) for header space
- Bottom padding (128px) for sticky footer clearance
- Horizontal padding (40px) for desktop

### Responsive Container Sizing
```tsx
// Home page pattern
<div className="px-10">                    // Desktop: 40px
  
// Transaction pages pattern  
<div className="px-6 sm:px-8 lg:px-10">   // Mobile: 24px, Tablet: 32px, Desktop: 40px

// Constrained width pattern
<div className="w-full max-w-md sm:max-w-lg mx-auto">
```

### Section Spacing Hierarchy
```tsx
// Major sections
<div className="flex flex-col gap-6">     // 24px between major sections

// Related elements  
<div className="flex flex-col gap-4">     // 16px between related items

// Tight groupings
<div className="flex flex-col gap-2">     // 8px for closely related content
```

## Card Layout Patterns

### KPI Card Grid
```tsx
<div className="flex flex-row gap-7 items-center justify-start w-full">
  <div className="flex-1">
    <Card className="bg-card border-border rounded-lg shadow-xs p-0">
      <div className="p-6">
        <div className="flex flex-col gap-1">
          <div className="font-medium text-xl">฿32.24</div>
          <div className="font-normal text-sm text-muted-foreground">1 USD</div>
          <div className="font-medium text-sm">as of 2:12pm</div>
        </div>
      </div>
    </Card>
  </div>
  <div className="flex-1">
    {/* Second KPI card */}
  </div>
</div>
```

**Pattern Features**:
- Equal width cards with `flex-1`
- 28px gap between cards (`gap-7`)
- Consistent internal padding (24px)
- 4px gap between KPI elements (`gap-1`)

### Transaction List Layout
```tsx
<div className="flex flex-col gap-3 w-full">
  {transactions.map((transaction) => (
    <TransactionCard key={transaction.id} {...props} />
  ))}
</div>
```

**Pattern Features**:
- 12px gap between transaction items (`gap-3`)
- Full width cards for optimal touch targets
- Consistent spacing regardless of content length

## Header Patterns

### Page Header with Navigation
```tsx
<div className="flex items-center justify-between w-full">
  <h1 className="text-4xl font-medium text-foreground leading-10">
    Page Title
  </h1>
  <UserMenu>
    <Avatar className="size-10" />
  </UserMenu>
</div>
```

### Navigation Header with Back Button
```tsx
<div className="flex items-center justify-between relative shrink-0 w-full">
  <button className="bg-white flex gap-1.5 items-center justify-center rounded-lg shrink-0 size-10 border border-zinc-200 shadow-xs">
    <ArrowLeft className="size-5" />
  </button>
  <div className="absolute left-1/2 transform -translate-x-1/2">
    <h1 className="text-lg font-medium">Page Title</h1>
  </div>
</div>
```

### Section Header with Action
```tsx
<div className="flex flex-row gap-4 items-center justify-start w-full">
  <div className="flex-1 font-medium text-xs text-muted-foreground leading-4">
    Section Title
  </div>
  <Button variant="link" size="default" asChild>
    <Link href="/view-all">View all</Link>
  </Button>
</div>
```

## Sticky Elements

### Fixed Footer Pattern
```tsx
<div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
  <div className="flex flex-col gap-2.5 pb-12 pt-6 px-10">
    <Button className="w-full">
      Primary Action
    </Button>
  </div>
</div>
```

**Features**:
- Fixed positioning for persistent access
- High z-index for layering (`z-50`)
- Top border for visual separation
- Bottom padding for safe area (iOS)
- Consistent horizontal padding matching page

### Notification Overlay
```tsx
<div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
  <Card className="bg-destructive/10 border-destructive text-destructive p-4 shadow-lg max-w-md">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">Message</span>
      <Button variant="ghost" size="sm">
        <X className="h-4 w-4" />
      </Button>
    </div>
  </Card>
</div>
```

## Form Layout Patterns

### Vertical Form
```tsx
<form className="flex flex-col gap-4">
  <div className="flex flex-col gap-2">
    <Label htmlFor="field">Field Label</Label>
    <Input id="field" type="text" />
  </div>
  <div className="flex flex-col gap-2">
    <Label htmlFor="field2">Another Field</Label>
    <Input id="field2" type="email" />
  </div>
  <div className="flex gap-2 pt-4">
    <Button variant="outline" className="flex-1">Cancel</Button>
    <Button className="flex-1">Submit</Button>
  </div>
</form>
```

### Horizontal Field Groups
```tsx
<div className="flex gap-4">
  <div className="flex flex-col gap-2 flex-1">
    <Label>First Name</Label>
    <Input />
  </div>
  <div className="flex flex-col gap-2 flex-1">
    <Label>Last Name</Label>
    <Input />
  </div>
</div>
```

## Responsive Layout Breakpoints

### Mobile First Approach
```tsx
// Base mobile styles, then override for larger screens
<div className="px-6 py-4 sm:px-8 sm:py-6 lg:px-10 lg:py-8">

// Mobile: 24px padding, 16px vertical
// Small: 32px padding, 24px vertical  
// Large: 40px padding, 32px vertical
```

### Grid Responsive Pattern
```tsx
// Single column mobile, two column desktop
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

// Responsive card layouts
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

## Content Layout Patterns

### Two-Column Content
```tsx
<div className="flex items-start justify-between w-full">
  <div className="flex-1 min-w-0">
    <h3 className="font-medium truncate">Primary Content</h3>
    <p className="text-muted-foreground text-sm truncate">Supporting text</p>
  </div>
  <div className="flex flex-col items-end text-right ml-4">
    <span className="font-medium text-lg">$123.45</span>
    <span className="text-muted-foreground text-sm">Secondary</span>
  </div>
</div>
```

**Features**:
- `min-w-0` prevents flex overflow
- `truncate` handles long content gracefully
- `ml-4` provides consistent gap between columns
- Right column maintains alignment with `items-end`

### Center-Aligned Content
```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <h2 className="text-xl font-medium mb-2">Empty State</h2>
  <p className="text-muted-foreground mb-4">No items found</p>
  <Button>Add New Item</Button>
</div>
```

## Animation and Transition Patterns

### Page Transitions
```tsx
<div className="transition-opacity duration-200 ease-in-out">
  {/* Page content */}
</div>
```

### Interactive Element Transitions
```tsx
<Button className="transition-all duration-200 hover:scale-[0.98] active:scale-[0.96]">
  Interactive Button
</Button>

<Card className="cursor-pointer hover:shadow-md transition-shadow duration-200">
  Interactive Card
</Card>
```

## Best Practices

### Do's
✅ Use consistent spacing hierarchy (gap-2, gap-4, gap-6)  
✅ Follow mobile-first responsive patterns  
✅ Maintain semantic HTML structure  
✅ Use flexbox for component layout, grid for page layout  
✅ Apply consistent padding/margin patterns

### Don'ts
❌ Mix arbitrary spacing values with token system  
❌ Use absolute positioning unless absolutely necessary  
❌ Break responsive patterns for edge cases  
❌ Ignore safe areas on mobile devices  
❌ Create layouts that don't scale with content

## Layout Testing Checklist

- [ ] Mobile viewport (375px) displays correctly
- [ ] Tablet viewport (768px) maintains proportions
- [ ] Desktop viewport (1200px+) utilizes space well
- [ ] Long content handles gracefully with truncation
- [ ] Empty states are properly centered
- [ ] Interactive elements meet touch target minimums
- [ ] Safe areas respected on iOS devices
- [ ] Keyboard navigation works properly
- [ ] Focus indicators are visible and consistent