import * as React from "react"
import { cn } from "@/lib/utils"

interface ActionFieldsetProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  children: React.ReactNode
}

/**
 * ActionFieldset - A semantic HTML fieldset that disables all interactive elements within it
 * when the disabled prop is true. This leverages native browser behavior for accessibility
 * and works with all form controls and interactive elements.
 */
const ActionFieldset = React.forwardRef<HTMLFieldSetElement, ActionFieldsetProps>(
  ({ className, disabled, children, ...props }, ref) => {
    return (
      <fieldset
        ref={ref}
        disabled={disabled}
        className={cn(
          // Use 'contents' to make fieldset invisible in layout
          // This ensures it doesn't affect CSS Grid/Flexbox layouts
          "contents",
          // Apply disabled styles when fieldset is disabled
          disabled && [
            // Global cursor change for all interactive elements
            "[&_button]:cursor-not-allowed [&_button]:opacity-50",
            "[&_input]:cursor-not-allowed [&_input]:opacity-50", 
            "[&_textarea]:cursor-not-allowed [&_textarea]:opacity-50",
            "[&_select]:cursor-not-allowed [&_select]:opacity-50",
            "[&_[role=button]]:cursor-not-allowed [&_[role=button]]:opacity-50",
            "[&_a]:cursor-not-allowed [&_a]:opacity-50",
          ],
          className
        )}
        {...props}
      >
        {children}
      </fieldset>
    )
  }
)

ActionFieldset.displayName = "ActionFieldset"

export { ActionFieldset }
