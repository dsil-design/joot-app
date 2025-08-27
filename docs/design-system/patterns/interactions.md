# Interaction Patterns

**Last Updated:** 2025-08-27

## Overview

This document defines the standard interaction patterns used throughout the Joot App, ensuring consistent user experience across all components and features.

## Button Interaction Patterns

### Primary Actions
```tsx
<Button className="w-full gap-1.5 px-4 py-2 transition-all duration-200 hover:scale-[0.98] hover:bg-primary/90 active:scale-[0.96]">
  <Plus className="size-5 transition-transform duration-200 group-hover:rotate-90" />
  <span className="text-sm font-medium text-primary-foreground leading-5">
    Add transaction
  </span>
</Button>
```

**Interaction Features**:
- Scale animation on hover/active (98%/96%)
- Background opacity change on hover (90%)
- Icon rotation on hover (90 degrees)
- 200ms transition timing
- Combined hover effects for rich feedback

### Secondary Actions
```tsx
<Button variant="outline" className="hover:bg-accent hover:text-accent-foreground transition-colors duration-200">
  Cancel
</Button>

<Button variant="ghost" className="hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 transition-colors duration-200">
  Learn More
</Button>
```

**Interaction Features**:
- Color transitions instead of scale
- 200ms transition timing
- Semantic color changes
- Dark mode considerations

### Navigation Buttons
```tsx
<button className="bg-white hover:bg-zinc-50 transition-colors disabled:opacity-50 size-10 border border-zinc-200 shadow-xs rounded-lg">
  <ArrowLeft className="size-5" />
</button>
```

**Features**:
- Subtle background change
- Disabled state handling
- Consistent sizing (40x40px)

## Card Interaction Patterns

### Static Information Cards
```tsx
<Card className="bg-card border-border rounded-lg shadow-xs">
  {/* No hover effects - static content */}
</Card>
```

### Interactive Cards
```tsx
<Card className="cursor-pointer hover:shadow-md transition-shadow duration-200 focus-within:ring-2 focus-within:ring-primary">
  {/* Clickable content */}
</Card>
```

**Interaction Features**:
- Shadow elevation increase on hover
- Focus ring for keyboard navigation
- Cursor change indication
- 200ms smooth transitions

### List Item Cards
```tsx
<TransactionCard className="hover:bg-accent/50 transition-colors duration-150 cursor-pointer">
  {/* Transaction content */}
</TransactionCard>
```

## Form Interaction Patterns

### Input Focus States
```tsx
<Input className="focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive transition-[color,box-shadow] duration-200" />
```

**Focus Features**:
- 3px focus ring with 50% opacity
- Border color change to primary
- Error state ring color
- Smooth color and shadow transitions

### Form Validation States
```tsx
// Success state
<Input className="border-green-500 focus-visible:ring-green-500/50" />

// Error state  
<Input aria-invalid="true" className="border-destructive focus-visible:ring-destructive/20" />

// Warning state
<Input className="border-amber-500 focus-visible:ring-amber-500/50" />
```

### Select and Dropdown Interactions
```tsx
<Select>
  <SelectTrigger className="hover:bg-zinc-50 transition-colors duration-150">
    <SelectValue />
  </SelectTrigger>
  <SelectContent className="bg-white border border-zinc-200 rounded-[6px] shadow-lg animate-in slide-in-from-top-1 duration-150">
    <SelectItem className="hover:bg-zinc-100 transition-colors duration-100">
      Option
    </SelectItem>
  </SelectContent>
</Select>
```

**Interaction Features**:
- Hover states on trigger and items
- Smooth open/close animations
- Consistent timing (150ms for dropdowns)
- Shadow elevation for floating content

## Avatar and User Menu Patterns

### Avatar Hover States
```tsx
<Avatar className="size-10 cursor-pointer hover:opacity-80 transition-opacity duration-200">
  <AvatarFallback className="bg-secondary text-secondary-foreground">
    {userInitials}
  </AvatarFallback>
</Avatar>
```

**Features**:
- Opacity reduction on hover (80%)
- Cursor change indication
- Smooth opacity transition

### User Menu Interactions
```tsx
<UserMenu>
  <MenuTrigger asChild>
    <Avatar className="cursor-pointer hover:opacity-80 transition-opacity" />
  </MenuTrigger>
  <MenuContent className="animate-in slide-in-from-top-2 duration-200">
    <MenuItem className="hover:bg-accent hover:text-accent-foreground transition-colors duration-150">
      Profile
    </MenuItem>
  </MenuContent>
</UserMenu>
```

## Loading States

### Button Loading
```tsx
<Button disabled className="opacity-50 cursor-not-allowed">
  <Loader className="size-4 animate-spin mr-2" />
  Loading...
</Button>
```

### Page Loading
```tsx
<div className="flex items-center justify-center py-12">
  <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-950 rounded-full animate-spin"></div>
</div>
```

### Skeleton Loading
```tsx
<div className="animate-pulse">
  <div className="h-4 bg-zinc-200 rounded w-3/4 mb-2"></div>
  <div className="h-4 bg-zinc-200 rounded w-1/2"></div>
</div>
```

## Error and Success States

### Error Toast/Alert
```tsx
<Card className="bg-destructive/10 border-destructive text-destructive p-4 shadow-lg animate-in slide-in-from-top-4 duration-300">
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium">
      Access denied. Admin privileges required.
    </span>
    <Button variant="ghost" size="sm" className="h-auto p-1 text-destructive hover:text-destructive/80">
      <X className="h-4 w-4" />
    </Button>
  </div>
</Card>
```

### Success Feedback
```tsx
<Card className="bg-green-50 border-green-200 text-green-800 p-4 animate-in slide-in-from-top-4 duration-300">
  <div className="flex items-center gap-2">
    <Check className="size-4" />
    <span className="text-sm font-medium">Successfully saved!</span>
  </div>
</Card>
```

## Touch and Mobile Interactions

### Touch Target Sizing
```tsx
// Minimum 44px touch targets
<Button className="h-10 min-w-[44px]">  // 40px base + padding
<input className="h-10">                 // 40px minimum
<Avatar className="size-10">             // 40px exactly
```

### Mobile-Specific Interactions
```tsx
// Prevent zoom on iOS
<Input className="text-base md:text-sm" />  // 16px+ prevents zoom

// Touch-friendly spacing
<div className="flex flex-col gap-4">      // Minimum 16px between touch targets
```

### Swipe and Gesture Hints
```tsx
// Horizontal scroll hint
<div className="overflow-x-auto">
  <div className="flex gap-4 pb-2">  // Padding bottom shows scroll indicator
    {/* Scrollable content */}
  </div>
</div>
```

## Accessibility Interaction Patterns

### Keyboard Navigation
```tsx
<Button 
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleAction()
    }
  }}
  className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
>
  Action
</Button>
```

### Screen Reader Support
```tsx
<Button 
  aria-label="Add new transaction"
  aria-describedby="add-transaction-help"
>
  <Plus className="size-4" />
</Button>
<div id="add-transaction-help" className="sr-only">
  Click to open the transaction form
</div>
```

### Focus Management
```tsx
// Focus trap in modals
<Dialog onOpenChange={(open) => {
  if (open) {
    // Focus first interactive element
    setTimeout(() => firstInputRef.current?.focus(), 0)
  }
}}>
```

## Animation Timing and Easing

### Standard Timings
```css
/* Quick interactions */
duration-100  /* 100ms - hover state changes */
duration-150  /* 150ms - dropdown opens, menu items */
duration-200  /* 200ms - button hover, card hover, standard transitions */
duration-300  /* 300ms - page transitions, toast animations */

/* Easing functions */
ease-in-out   /* Most UI animations */
ease-out      /* Exits and state changes */
ease-in       /* Entrances */
```

### Reduced Motion Support
```tsx
<div className="transition-transform duration-200 motion-reduce:transition-none hover:scale-105 motion-reduce:hover:scale-100">
  Respects user preferences
</div>
```

## Interaction State Management

### Hover States
- **Background**: Subtle background color change
- **Shadow**: Elevation increase for cards
- **Scale**: Slight scale reduction for buttons (98%)
- **Opacity**: Opacity reduction for avatars/images (80%)

### Active States
- **Scale**: Further scale reduction (96%) for buttons
- **Background**: Darker background color
- **Shadow**: Shadow reduction or removal

### Focus States
- **Ring**: 2-3px ring with brand color
- **Border**: Border color change to focus color
- **Background**: Optional background color change

### Disabled States
- **Opacity**: 50% opacity reduction
- **Cursor**: `cursor-not-allowed`
- **Interaction**: `pointer-events-none`

## Best Practices

### Do's
✅ Use consistent timing across similar interactions  
✅ Provide clear visual feedback for all actions  
✅ Respect user motion preferences  
✅ Ensure 44px minimum touch targets on mobile  
✅ Include proper focus states for keyboard navigation

### Don'ts
❌ Use overly dramatic animations (> 300ms for UI)  
❌ Animate too many properties simultaneously  
❌ Ignore reduced motion preferences  
❌ Create interactions without clear affordances  
❌ Use different timing for similar interactions

## Performance Considerations

### Efficient Animations
```tsx
// Animate transforms and opacity (GPU accelerated)
<div className="transition-transform transition-opacity">

// Avoid animating layout properties
// Bad: transition-all (animates everything)
// Good: transition-[transform,opacity] (specific properties)
```

### Animation Frame Budget
- Keep animations under 16ms per frame (60fps)
- Use `transform` and `opacity` for smoothest performance
- Minimize reflows and repaints during animations

## Testing Interactions

### Checklist
- [ ] All interactive elements respond to hover
- [ ] Focus states visible for keyboard navigation
- [ ] Touch targets meet 44px minimum on mobile
- [ ] Loading states prevent double-clicking
- [ ] Error states provide clear feedback
- [ ] Animations respect reduced motion preferences
- [ ] Transitions feel responsive (< 300ms)
- [ ] Interactive feedback is consistent across components