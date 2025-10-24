"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, parse, isValid } from "date-fns"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Detect mobile/touch devices
function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  )
}

function formatDate(date: Date | undefined, formatStr: string = "PPP"): string {
  if (!date) return ""
  return format(date, formatStr)
}

function isValidDate(date: Date | undefined): boolean {
  return date !== undefined && isValid(date)
}

function parseDate(value: string): Date | undefined {
  if (!value.trim()) return undefined

  // Try multiple date formats (US formats prioritized)
  const formats = [
    "M/d/yyyy",
    "MM/dd/yyyy",
    "M-d-yyyy",
    "MM-dd-yyyy",
    "MMMM d, yyyy",
    "MMM d, yyyy",
    "yyyy-MM-dd",
    "d MMMM yyyy",
    "d MMM yyyy"
  ]

  for (const formatStr of formats) {
    try {
      const parsed = parse(value, formatStr, new Date())
      if (isValid(parsed)) {
        return parsed
      }
    } catch {
      // Continue to next format
    }
  }

  // Fallback to native Date parsing
  const fallback = new Date(value)
  return isValid(fallback) ? fallback : undefined
}

const datePickerVariants = cva(
  "relative w-full",
  {
    variants: {
      size: {
        default: "",
        sm: "",
        lg: "",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface DatePickerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">,
    VariantProps<typeof datePickerVariants> {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  formatStr?: string
  label?: string
}

const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  (
    {
      className,
      size,
      date,
      onDateChange,
      placeholder = "Pick a date",
      disabled = false,
      formatStr = "MMMM d, yyyy",
      label,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState(formatDate(date, formatStr))
    const [month, setMonth] = React.useState<Date | undefined>(date)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const calendarRef = React.useRef<HTMLDivElement>(null)

    // Generate placeholder showing today's date
    const defaultPlaceholder = React.useMemo(() => {
      return placeholder === "Pick a date"
        ? formatDate(new Date(), formatStr)
        : placeholder
    }, [placeholder, formatStr])

    // Update input value when date prop changes
    React.useEffect(() => {
      setValue(formatDate(date, formatStr))
    }, [date, formatStr])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      setValue(inputValue)
      // Don't parse/validate while typing - only on blur
    }

    const handleInputBlur = () => {
      // Parse and validate the input value on blur
      const parsedDate = parseDate(value)
      if (isValidDate(parsedDate)) {
        onDateChange?.(parsedDate)
        setMonth(parsedDate)
        setValue(formatDate(parsedDate, formatStr))
      } else if (!value.trim()) {
        onDateChange?.(undefined)
        setValue("")
      } else {
        // Invalid input - revert to the last valid date
        if (date) {
          setValue(formatDate(date, formatStr))
        } else {
          setValue("")
        }
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown" && !open) {
        e.preventDefault()
        setOpen(true)
      } else if (e.key === "Escape" && open) {
        e.preventDefault()
        setOpen(false)
      }
    }

    const handleSelect = (selectedDate: Date | undefined) => {
      onDateChange?.(selectedDate)
      setOpen(false)
      if (selectedDate) {
        setValue(formatDate(selectedDate, formatStr))
      }
    }

    const handleCalendarIconClick = () => {
      const willOpen = !open
      setOpen(willOpen)

      if (willOpen) {
        // Focus the calendar so keyboard navigation works immediately
        setTimeout(() => {
          // If we have a selected date, focus it
          if (date && value.trim()) {
            const selectedDayButton = calendarRef.current?.querySelector('button[data-selected-single="true"]')
            if (selectedDayButton instanceof HTMLElement) {
              selectedDayButton.focus()
              return
            }
          }

          // Otherwise, focus today's date (soft highlight only, not selected)
          const todayButton = calendarRef.current?.querySelector('button[data-today="true"]')
          if (todayButton instanceof HTMLElement) {
            todayButton.focus()
            return
          }

          // Fall back to first available day
          const firstDayButton = calendarRef.current?.querySelector('[role="gridcell"]:not([aria-disabled="true"]) button')
          if (firstDayButton instanceof HTMLElement) {
            firstDayButton.focus()
          }
        }, 100)
      }
    }

    const handleInputFocus = () => {
      // Mobile: Open calendar on focus
      if (isMobile()) {
        setOpen(true)
      }
      // Desktop: Just focus the field for text editing, no calendar popup
    }

    const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
      // Mobile: Ensure calendar opens and stays open
      if (isMobile() && !open) {
        setOpen(true)
      }
      // Desktop: Allow normal cursor positioning (no action needed)
    }

    return (
      <div ref={ref} className={cn(datePickerVariants({ size }), className)} {...props}>
        <Popover open={open} onOpenChange={setOpen}>
          <div className="relative flex gap-2">
            <Input
              ref={inputRef}
              value={value}
              placeholder={defaultPlaceholder}
              className="bg-background pr-10"
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onFocus={handleInputFocus}
              onClick={handleInputClick}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              aria-label={label || "Select date"}
              aria-describedby="date-instructions"
            />
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCalendarIconClick()
                }}
                disabled={disabled}
                aria-label="Open calendar"
                aria-haspopup="dialog"
                type="button"
              >
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <span id="date-instructions" className="sr-only">
              Enter date or press down arrow to open calendar
            </span>
          </div>
          <PopoverContent
            id="calendar-popup"
            ref={calendarRef}
            className="w-auto p-0"
            align="end"
            role="dialog"
            aria-modal="true"
            aria-label="Choose date from calendar"
            onOpenAutoFocus={(e) => {
              // Allow calendar to receive focus when opened via icon click
              // The setTimeout in handleCalendarIconClick handles the focus
              if (isMobile()) {
                // On mobile, prevent input from stealing focus back
                e.preventDefault()
              }
            }}
            onCloseAutoFocus={(e) => {
              // Return focus to input when calendar closes
              e.preventDefault()
              setTimeout(() => {
                inputRef.current?.focus()
              }, 0)
            }}
          >
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelect}
              month={month}
              onMonthChange={setMonth}
              disabled={disabled}
            />
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)

DatePicker.displayName = "DatePicker"

// Legacy DateInput component for backward compatibility
export interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  formatStr?: string
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      className,
      date,
      onDateChange,
      placeholder = "March 13, 2024",
      formatStr = "MMMM d, yyyy",
      disabled = false,
      ...props
    },
    ref
  ) => {
    const [inputValue, setInputValue] = React.useState(
      date ? format(date, formatStr) : ""
    )

    React.useEffect(() => {
      setInputValue(date ? format(date, formatStr) : "")
    }, [date, formatStr])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setInputValue(value)

      const parsedDate = parseDate(value)
      if (isValidDate(parsedDate)) {
        onDateChange?.(parsedDate)
      } else if (!value.trim()) {
        onDateChange?.(undefined)
      }
    }

    const handleBlur = () => {
      // On blur, reformat the input to match the selected date
      if (date) {
        setInputValue(format(date, formatStr))
      }
    }

    return (
      <Input
        ref={ref}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        {...props}
      />
    )
  }
)

DateInput.displayName = "DateInput"

export { DatePicker, DateInput, datePickerVariants }