# Card Component

**Last Updated:** 2025-08-27  
**File Location:** `/src/components/ui/card.tsx`  
**Type:** Global Component

## Overview

The Card component provides a flexible container for grouping related content with consistent styling and structure. It follows a compound component pattern with multiple sub-components for different content areas.

## Component Structure

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
    <CardAction>Action Button</CardAction>
  </CardHeader>
  <CardContent>
    Main content area
  </CardContent>
  <CardFooter>
    Footer content or actions
  </CardFooter>
</Card>
```

## API Reference

### Card
Main container component.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `...props` | `React.ComponentProps<"div">` | - | All div element props |

**Default Styles:**
```css
bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm
```

### CardHeader
Header section with built-in grid layout for title/description and actions.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `...props` | `React.ComponentProps<"div">` | - | All div element props |

**Default Styles:**
```css
@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6
```

### CardTitle
Styled heading for the card.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `...props` | `React.ComponentProps<"div">` | - | All div element props |

**Default Styles:**
```css
leading-none font-semibold
```

### CardDescription
Supporting text below the title.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `...props` | `React.ComponentProps<"div">` | - | All div element props |

**Default Styles:**
```css
text-muted-foreground text-sm
```

### CardAction
Action area positioned in the top-right of the header.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `...props` | `React.ComponentProps<"div">` | - | All div element props |

**Default Styles:**
```css
col-start-2 row-span-2 row-start-1 self-start justify-self-end
```

### CardContent
Main content area of the card.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `...props` | `React.ComponentProps<"div">` | - | All div element props |

**Default Styles:**
```css
px-6
```

### CardFooter
Footer area for actions or additional content.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `...props` | `React.ComponentProps<"div">` | - | All div element props |

**Default Styles:**
```css
flex items-center px-6 [.border-t]:pt-6
```

## Design Tokens Used

### Colors
- `bg-card` - Card background color
- `text-card-foreground` - Primary text color
- `text-muted-foreground` - Secondary text color

### Spacing
- `gap-6` - Internal spacing between sections (24px)
- `px-6` - Horizontal padding (24px)
- `py-6` - Vertical padding (24px)
- `gap-1.5` - Header element gap (6px)

### Borders & Shadows
- `rounded-xl` - Border radius (12px)
- `border` - Default border
- `shadow-sm` - Subtle elevation shadow

### Typography
- `font-semibold` - Title font weight
- `text-sm` - Description text size
- `leading-none` - Tight line height for titles

## Usage Examples

### Basic Card
```tsx
<Card>
  <CardHeader>
    <CardTitle>Exchange Rate</CardTitle>
    <CardDescription>Current USD to THB rate</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="text-xl font-medium">฿32.24</div>
  </CardContent>
</Card>
```

### Card with Action
```tsx
<Card>
  <CardHeader>
    <CardTitle>Monthly Spending</CardTitle>
    <CardDescription>Your expenses this month</CardDescription>
    <CardAction>
      <Button variant="ghost" size="sm">
        View Details
      </Button>
    </CardAction>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-medium">$2,760</div>
  </CardContent>
</Card>
```

### Card with Footer
```tsx
<Card>
  <CardHeader>
    <CardTitle>Transaction Summary</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Your transaction history for this month.</p>
  </CardContent>
  <CardFooter className="border-t">
    <Button variant="outline">Export Data</Button>
  </CardFooter>
</Card>
```

## Variants

### Compact Card
For tighter layouts:
```tsx
<Card className="py-4">
  <CardHeader className="px-4">
    <CardTitle className="text-base">Compact Title</CardTitle>
  </CardHeader>
  <CardContent className="px-4">
    Compact content
  </CardContent>
</Card>
```

### Interactive Card
For clickable cards:
```tsx
<Card className="cursor-pointer hover:shadow-md transition-shadow">
  <CardContent>
    Interactive card content
  </CardContent>
</Card>
```

## Accessibility

- **Semantic Structure**: Uses proper div elements with data slots for styling hooks
- **Focus Management**: Interactive cards should include proper focus states
- **Screen Readers**: Content is naturally accessible with proper heading hierarchy
- **Color Contrast**: Uses semantic color tokens that meet WCAG standards

## Relationship to Other Components

### Related Global Components
- **Button**: Often used in CardAction and CardFooter
- **Avatar**: Commonly placed in CardHeader
- **Badge**: Used for status indicators in cards

### Usage in Pages
- **Home Page**: KPI cards for exchange rates and monthly spending
- **Transaction Pages**: Not directly used (uses custom TransactionCard)
- **Admin Dashboard**: System health cards and data quality displays

## Best Practices

### Do's
✅ Use CardHeader for titles and descriptions  
✅ Place actions in CardAction for consistent positioning  
✅ Use semantic color tokens for customizations  
✅ Apply consistent spacing with design tokens  
✅ Structure content logically from header to footer

### Don'ts
❌ Override default spacing without design system approval  
❌ Place interactive elements in CardContent without proper focus handling  
❌ Mix different card patterns within the same context  
❌ Use hardcoded colors instead of semantic tokens

## Implementation Notes

### Data Slots
The component uses `data-slot` attributes for styling hooks:
- `data-slot="card"`
- `data-slot="card-header"`
- `data-slot="card-title"`
- `data-slot="card-description"`
- `data-slot="card-action"`
- `data-slot="card-content"`
- `data-slot="card-footer"`

### Container Queries
CardHeader uses `@container/card-header` for responsive layout within the card context.

### CSS Selectors
Uses advanced CSS selectors for contextual styling:
- `has-data-[slot=card-action]:grid-cols-[1fr_auto]` - Adjusts grid when action is present
- `[.border-b]:pb-6` - Adds padding when border is applied
- `[.border-t]:pt-6` - Adds padding when top border is applied

## Status

**Compliance**: ✅ Excellent
- Follows all design token standards
- Proper semantic color usage
- Consistent spacing with 8px grid
- Appropriate shadow and border radius
- Accessible markup structure

**Future Enhancements**:
- Consider adding size variants (sm, md, lg)
- Add loading state variant
- Implement error state styling