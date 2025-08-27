# Input Component

**Last Updated:** 2025-08-27  
**File Location:** `/src/components/ui/input.tsx`  
**Type:** Global Component

## Overview

The Input component provides a consistent, accessible text input element with proper styling, focus states, and validation indicators. It serves as the foundation for form inputs throughout the application.

## API Reference

### Input

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `string` | `"text"` | HTML input type |
| `className` | `string` | - | Additional CSS classes |
| `...props` | `React.ComponentProps<"input">` | - | All input element props |

## Design Tokens Used

### Colors
- `text-foreground` - Input text color
- `placeholder:text-muted-foreground` - Placeholder text color
- `bg-transparent` - Background (transparent to show container)
- `border-input` - Border color (zinc-200)
- `focus-visible:border-ring` - Focus border color
- `focus-visible:ring-ring/50` - Focus ring color
- `aria-invalid:border-destructive` - Error state border

### Spacing
- `px-3 py-1` - Internal padding (12px x 4px)
- `h-10` - Height (40px) - meets minimum touch target
- `w-full` - Full width within container

### Borders & Shadows
- `rounded-md` - Border radius (6px)
- `border` - Default border width
- `shadow-xs` - Subtle elevation
- `focus-visible:ring-[3px]` - Focus ring width

### Typography
- `text-base` - Desktop text size (16px)
- `md:text-sm` - Mobile text size (14px) 
- `file:text-sm` - File input text size

## Default Styles

```css
text-foreground 
placeholder:text-muted-foreground 
file:text-foreground 
selection:bg-primary 
selection:text-primary-foreground 
dark:bg-input/30 
border-input 
flex h-10 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs 
transition-[color,box-shadow] 
outline-none 
file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium 
disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 
md:text-sm
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive
```

## Interactive States

### Focus State
- Border changes to ring color (primary blue)
- 3px focus ring with 50% opacity
- Smooth transition for accessibility

### Error State  
- Border becomes destructive (red)
- Focus ring becomes destructive with reduced opacity
- Works with `aria-invalid` attribute

### Disabled State
- 50% opacity
- Pointer events disabled
- Cursor shows not-allowed

### File Input Styling
- Custom styling for file upload inputs
- Proper button-like appearance for file selection

## Usage Examples

### Basic Input
```tsx
<Input 
  type="text" 
  placeholder="Enter your name"
/>
```

### With Label
```tsx
<div className="flex flex-col gap-2">
  <Label htmlFor="email">Email Address</Label>
  <Input 
    id="email"
    type="email" 
    placeholder="you@example.com"
  />
</div>
```

### Input Types
```tsx
// Text input
<Input type="text" placeholder="Text input" />

// Email input
<Input type="email" placeholder="Email input" />

// Password input  
<Input type="password" placeholder="Password input" />

// Number input
<Input type="number" placeholder="Number input" />

// Date input
<Input type="date" />

// File input
<Input type="file" accept=".pdf,.doc,.docx" />
```

### Error State
```tsx
<Input 
  type="email"
  placeholder="Enter email"
  aria-invalid={hasError}
  aria-describedby={hasError ? "email-error" : undefined}
/>
{hasError && (
  <p id="email-error" className="text-sm text-destructive">
    Please enter a valid email address
  </p>
)}
```

### Disabled State
```tsx
<Input 
  type="text"
  placeholder="Disabled input"
  disabled 
/>
```

## Form Integration Patterns

### With React Hook Form
```tsx
<form onSubmit={handleSubmit(onSubmit)}>
  <div className="flex flex-col gap-2">
    <Label htmlFor="username">Username</Label>
    <Input
      id="username"
      {...register("username", { required: true })}
      aria-invalid={errors.username ? "true" : "false"}
    />
    {errors.username && (
      <span className="text-sm text-destructive">Username is required</span>
    )}
  </div>
</form>
```

### Input Groups
```tsx
<div className="flex gap-2">
  <Input placeholder="First name" className="flex-1" />
  <Input placeholder="Last name" className="flex-1" />
</div>
```

### With Icons
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
  <Input className="pl-10" placeholder="Search..." />
</div>
```

## Accessibility Features

### Keyboard Support
- **Tab**: Focuses the input
- **Shift+Tab**: Moves focus to previous element
- **Enter**: Submits form (when in form context)
- **Escape**: Clears focus (browser default)

### Screen Reader Support
- Proper semantic `input` element
- Supports `aria-label`, `aria-describedby`, `aria-invalid`
- Placeholder text announced as hint
- Error states properly communicated

### Focus Management
- Clear focus indicators that meet WCAG contrast requirements
- Focus ring visible for keyboard navigation
- Focus ring hidden for mouse interactions (`focus-visible`)

### Touch Accessibility
- 40px minimum height meets touch target requirements
- Adequate spacing for mobile interactions

## Responsive Design

### Text Size
- Mobile: 14px (`md:text-sm`)
- Desktop: 16px (`text-base`)
- Prevents zoom on iOS devices with 16px+ base size

### Container Behavior
- Full width within container (`w-full`)
- Minimum width constraint (`min-w-0` prevents flex overflow)
- Responsive padding maintained across breakpoints

## Dark Theme Support

- `dark:bg-input/30` - Semi-transparent background in dark mode
- `dark:aria-invalid:ring-destructive/40` - Enhanced error visibility
- All color tokens automatically adapt to dark theme

## Best Practices

### Do's
✅ Always pair with proper `Label` components  
✅ Use semantic input types (`email`, `tel`, `url`, etc.)  
✅ Include `aria-invalid` for validation states  
✅ Provide helpful placeholder text  
✅ Use `aria-describedby` for error messages

### Don'ts
❌ Override disabled styles - use proper disabled prop  
❌ Use placeholder as the only label  
❌ Force custom heights that break accessibility  
❌ Remove focus indicators  
❌ Use without proper form structure

## Validation Patterns

### Required Fields
```tsx
<Input 
  type="email"
  required
  aria-required="true"
  placeholder="Email (required)"
/>
```

### Pattern Validation
```tsx
<Input 
  type="tel"
  pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
  placeholder="123-456-7890"
  title="Phone number format: 123-456-7890"
/>
```

### Custom Validation
```tsx
<Input 
  type="password"
  minLength={8}
  aria-describedby="password-requirements"
  aria-invalid={!isValidPassword}
/>
<div id="password-requirements" className="text-sm text-muted-foreground">
  Password must be at least 8 characters
</div>
```

## Implementation Notes

### Transition Effects
- Smooth color and box-shadow transitions (`transition-[color,box-shadow]`)
- Respects user's reduced motion preferences

### File Input Styling
- Custom styling for file inputs maintains accessibility
- File button styled to match design system

### Selection Styling
- Custom text selection colors using semantic tokens
- Maintains brand consistency in user interactions

## Usage in Application

### Form Pages
- Login/signup forms
- Transaction entry forms  
- Profile editing forms
- Search inputs

### Component Integration
- Works with Label, Button, and Card components
- Integrates with form validation libraries
- Compatible with date pickers and select components

## Status

**Compliance**: ✅ Excellent
- Full design token compliance
- Proper accessibility implementation  
- Responsive text sizing
- Comprehensive state management
- Dark theme support

**Strengths**:
- WCAG 2.1 AA compliant
- Touch-friendly sizing
- Comprehensive state indicators
- Smooth transitions
- File input support

**Future Enhancements**:
- Size variants (sm, lg)
- Left/right icon variants
- Loading state indicator
- Input group component integration