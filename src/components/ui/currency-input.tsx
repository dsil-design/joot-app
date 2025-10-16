import * as React from "react"
import { cn } from "@/lib/utils"
import { getCurrencyInfoSync } from "@/lib/utils/currency-symbols"

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, 'type' | 'onChange'> {
  currency: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, currency, value, onChange, onBlur, placeholder, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const measureRef = React.useRef<HTMLSpanElement>(null)
    const [isFocused, setIsFocused] = React.useState(false)
    const [textWidth, setTextWidth] = React.useState(0)

    // Get currency configuration
    const currencyInfo = getCurrencyInfoSync(currency)
    const { symbol, decimalPlaces } = currencyInfo

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

    /**
     * Measure the actual rendered width of the input text
     * This ensures the decimal hint aligns perfectly without shifting
     */
    React.useEffect(() => {
      if (measureRef.current) {
        const width = measureRef.current.getBoundingClientRect().width
        setTextWidth(width)
      }
    }, [value])

    /**
     * Calculate the decimal placeholder hint
     * When empty: show "0.00" (both focused and unfocused for seamless transition)
     * When typing: show remaining decimals (e.g., "42" → ".00", "42." → "00", "42.5" → "0")
     */
    const getDecimalPlaceholder = (inputValue: string): string => {
      if (decimalPlaces === 0) {
        return ''
      }

      // If empty, show full placeholder including leading zero (both focused and unfocused)
      if (!inputValue) {
        return '0.' + '0'.repeat(decimalPlaces)
      }

      // Only show hints when focused after user starts typing
      if (!isFocused) {
        return ''
      }

      // Check if input has decimal point
      const decimalIndex = inputValue.indexOf('.')

      if (decimalIndex === -1) {
        // No decimal point yet - show full decimal placeholder
        return '.' + '0'.repeat(decimalPlaces)
      }

      // Has decimal point - calculate remaining decimals needed
      const currentDecimals = inputValue.length - decimalIndex - 1
      const remainingDecimals = decimalPlaces - currentDecimals

      if (remainingDecimals > 0) {
        return '0'.repeat(remainingDecimals)
      }

      return ''
    }

    /**
     * Validate and sanitize input value
     * Only allow numbers and one decimal point
     * Restrict decimal places based on currency
     */
    const validateInput = (inputValue: string): string => {
      // Remove any non-numeric characters except decimal point
      let sanitized = inputValue.replace(/[^\d.]/g, '')

      // Only allow one decimal point
      const decimalCount = (sanitized.match(/\./g) || []).length
      if (decimalCount > 1) {
        // Keep only the first decimal point
        const firstDecimalIndex = sanitized.indexOf('.')
        sanitized = sanitized.slice(0, firstDecimalIndex + 1) + sanitized.slice(firstDecimalIndex + 1).replace(/\./g, '')
      }

      // Restrict decimal places
      if (decimalPlaces === 0) {
        // No decimals allowed - remove decimal point and everything after
        sanitized = sanitized.split('.')[0]
      } else {
        const parts = sanitized.split('.')
        if (parts.length === 2 && parts[1].length > decimalPlaces) {
          // Truncate to allowed decimal places
          sanitized = parts[0] + '.' + parts[1].slice(0, decimalPlaces)
        }
      }

      return sanitized
    }

    /**
     * Format value to proper decimal places on blur
     */
    const formatValue = (inputValue: string): string => {
      if (!inputValue || inputValue === '.') {
        return ''
      }

      const numValue = parseFloat(inputValue)
      if (isNaN(numValue)) {
        return ''
      }

      return numValue.toFixed(decimalPlaces)
    }

    /**
     * Handle input changes with validation
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const validated = validateInput(e.target.value)

      // Create a new event with the validated value
      const newEvent = {
        ...e,
        target: {
          ...e.target,
          value: validated
        }
      } as React.ChangeEvent<HTMLInputElement>

      onChange(newEvent)
    }

    /**
     * Handle blur - format to proper decimal places
     */
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)

      const formatted = formatValue(value)

      // Create event with formatted value
      const newEvent = {
        ...e,
        target: {
          ...e.target,
          value: formatted
        }
      } as React.FocusEvent<HTMLInputElement>

      // Update parent with formatted value
      if (formatted !== value) {
        onChange(newEvent as unknown as React.ChangeEvent<HTMLInputElement>)
      }

      // Call original onBlur if provided
      onBlur?.(newEvent)
    }

    /**
     * Handle focus
     */
    const handleFocus = () => {
      setIsFocused(true)
    }

    const decimalPlaceholder = getDecimalPlaceholder(value)

    // Calculate base offset for currency symbol
    const symbolOffset = symbol.length === 1 ? '1.75rem' : symbol.length === 2 ? '2.25rem' : '2.75rem'

    return (
      <div className="relative w-full">
        {/* Currency symbol - positioned absolutely, not selectable */}
        <span
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-base text-foreground md:text-sm",
            "flex items-center"
          )}
          aria-hidden="true"
        >
          {symbol}
        </span>

        {/* Main input field */}
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          data-slot="input"
          className={cn(
            "text-foreground placeholder:text-muted-foreground file:text-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-10 w-full min-w-0 rounded-md border bg-transparent py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            // Add left padding based on symbol width
            symbol.length === 1 ? "pl-7" : symbol.length === 2 ? "pl-9" : "pl-11",
            // Add right padding to make room for decimal placeholder
            "pr-3",
            className
          )}
          placeholder=""
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          {...props}
        />

        {/* Hidden measuring span - mirrors input text to measure actual width */}
        <span
          ref={measureRef}
          className={cn(
            "pointer-events-none invisible absolute whitespace-pre text-base md:text-sm",
            // Match input font styling exactly
            "font-[inherit]"
          )}
          aria-hidden="true"
        >
          {value || ''}
        </span>

        {/* Decimal placeholder hint - shown for empty field or when focused and typing */}
        {decimalPlaceholder && (
          <span
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 select-none text-base text-muted-foreground md:text-sm",
              "flex items-center"
            )}
            style={{
              left: value.length === 0
                ? symbolOffset
                : `calc(${symbolOffset} + ${textWidth}px)`
            }}
            aria-hidden="true"
          >
            {decimalPlaceholder}
          </span>
        )}
      </div>
    )
  }
)

CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
