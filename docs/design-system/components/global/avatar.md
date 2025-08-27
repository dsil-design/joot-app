# Avatar Component

**Last Updated:** 2025-08-27  
**File Location:** `/src/components/ui/avatar.tsx`  
**Type:** Global Component  
**Status:** Referenced (not implemented in analyzed files)

## Overview

The Avatar component displays user profile pictures, initials, or fallback imagery in a circular container. It's commonly used in navigation, user menus, and profile sections throughout the application.

## Expected Implementation

Based on usage patterns found in the application, the Avatar component should follow this structure:

```tsx
<Avatar className="size-10">
  <AvatarImage src={user.profileImage} alt={user.name} />
  <AvatarFallback className="bg-secondary text-secondary-foreground">
    {userInitials}
  </AvatarFallback>
</Avatar>
```

## Design Tokens Used

### Colors
- `bg-secondary` - Fallback background color
- `text-secondary-foreground` - Fallback text color
- Should support semantic color variants

### Spacing & Sizing
- `size-10` - Standard size (40px x 40px) - common usage
- Should support multiple size variants:
  - `size-6` - Small (24px)
  - `size-8` - Medium (32px)
  - `size-10` - Default (40px)
  - `size-12` - Large (48px)
  - `size-16` - Extra large (64px)

### Typography
- `text-sm` - Fallback text size for standard avatar
- `font-semibold` - Fallback text weight for better legibility

### Borders & Shadows
- `rounded-full` - Circular shape
- Optional ring/border variants for interactive states

## Current Usage Analysis

### Home Page Implementation
```tsx
// Found in /src/app/home/page.tsx
<Avatar className="size-10 cursor-pointer hover:opacity-80 transition-opacity">
  <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-semibold">
    {userInitials}
  </AvatarFallback>
</Avatar>
```

**Analysis**: 
- ✅ Uses semantic color tokens
- ✅ Appropriate sizing for touch targets
- ✅ Includes hover interaction
- ✅ Proper typography styling

### Observed Patterns
- Commonly used in user menus and navigation
- Interactive with hover states  
- Supports initials-based fallbacks
- Integrates with UserMenu component

## Recommended API Reference

### Avatar (Container)
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "md" \| "default" \| "lg" \| "xl"` | `"default"` | Avatar size variant |
| `className` | `string` | - | Additional CSS classes |
| `...props` | `React.ComponentProps<"div">` | - | All div element props |

### AvatarImage
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | - | Image source URL |
| `alt` | `string` | - | Alternative text |
| `className` | `string` | - | Additional CSS classes |
| `...props` | `React.ComponentProps<"img">` | - | All img element props |

### AvatarFallback
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `delayMs` | `number` | `600` | Delay before showing fallback |
| `...props` | `React.ComponentProps<"div">` | - | All div element props |

## Recommended Implementation

### Base Component Structure
```tsx
const avatarSizes = {
  sm: "size-6 text-xs",
  md: "size-8 text-sm", 
  default: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-lg"
}

function Avatar({ size = "default", className, ...props }) {
  return (
    <div 
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        avatarSizes[size],
        className
      )}
      {...props}
    />
  )
}
```

### With Image Support
```tsx
function AvatarImage({ src, alt, className, ...props }) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn("aspect-square h-full w-full object-cover", className)}
      {...props}
    />
  )
}
```

### Fallback Implementation
```tsx
function AvatarFallback({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-secondary text-secondary-foreground font-semibold",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
```

## Usage Examples

### Basic Avatar with Initials
```tsx
<Avatar>
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

### Avatar with Image and Fallback
```tsx
<Avatar>
  <AvatarImage src="/profile.jpg" alt="John Doe" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

### Different Sizes
```tsx
<Avatar size="sm">
  <AvatarFallback>JS</AvatarFallback>
</Avatar>

<Avatar size="lg">
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

### Interactive Avatar
```tsx
<Avatar className="cursor-pointer hover:opacity-80 transition-opacity">
  <AvatarImage src={user.avatar} alt={user.name} />
  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
</Avatar>
```

### With Status Indicator
```tsx
<div className="relative">
  <Avatar>
    <AvatarImage src="/profile.jpg" alt="User" />
    <AvatarFallback>U</AvatarFallback>
  </Avatar>
  <div className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full border-2 border-background"></div>
</div>
```

## Accessibility Features

### Image Accessibility
- Proper `alt` text for screen readers
- Graceful fallback when images fail to load
- Maintains aspect ratio for consistent layout

### Interactive States
- Proper focus indicators when used as button
- Keyboard navigation support
- Screen reader friendly role attributes

### Color Contrast
- Fallback colors meet WCAG contrast requirements
- Semantic token usage ensures theme compatibility

## Best Practices

### Do's
✅ Always provide meaningful fallback content  
✅ Use appropriate size for context (touch targets)  
✅ Include proper alt text for images  
✅ Use semantic color tokens for fallbacks  
✅ Consider loading states for remote images

### Don'ts
❌ Use avatars smaller than 24px in interactive contexts  
❌ Omit alt text for profile images  
❌ Use hardcoded colors for fallback backgrounds  
❌ Make avatars interactive without proper keyboard support  
❌ Use unclear or missing fallback content

## Integration Patterns

### User Menu Integration
```tsx
<UserMenu trigger={
  <Avatar className="cursor-pointer">
    <AvatarImage src={user.profileImage} alt={user.name} />
    <AvatarFallback>{userInitials}</AvatarFallback>
  </Avatar>
}>
  <UserMenuContent />
</UserMenu>
```

### List Item Usage
```tsx
<div className="flex items-center gap-3">
  <Avatar size="sm">
    <AvatarFallback>{user.initials}</AvatarFallback>
  </Avatar>
  <div>
    <p className="font-medium">{user.name}</p>
    <p className="text-sm text-muted-foreground">{user.email}</p>
  </div>
</div>
```

## Status

**Implementation Status**: 🔄 Component referenced but not analyzed
- Used in home page implementation
- Follows design system patterns
- Requires full component implementation audit

**Compliance Expectations**: ✅ Should be excellent
- Current usage follows design token patterns
- Proper semantic color usage observed
- Appropriate sizing and hover states

**Priority Actions**:
1. Locate and analyze actual component implementation
2. Verify size variant system
3. Ensure image loading and error handling
4. Validate accessibility implementation
5. Document complete API surface

## Related Components

- **UserMenu**: Primary container for avatar interactions
- **Button**: For interactive avatar behaviors  
- **Dropdown**: Often triggered by avatar clicks
- **Badge**: For status indicators on avatars

## Future Enhancements

- **Group Avatars**: Stack multiple avatars
- **Avatar Upload**: File upload integration
- **Status Variants**: Online, busy, away indicators  
- **Loading States**: Skeleton loading for images
- **Crop/Edit Integration**: Image editing capabilities