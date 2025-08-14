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

function formatDate(date: Date | undefined, formatStr: string = "PPP"): string {
  if (!date) return ""
  return format(date, formatStr)
}

function isValidDate(date: Date | undefined): boolean {
  return date !== undefined && isValid(date)
}

function parseDate(value: string): Date | undefined {
  if (!value.trim()) return undefined
  
  // Try multiple date formats
  const formats = [
    "MMMM d, yyyy",
    "MMM d, yyyy", 
    "M/d/yyyy",
    "MM/dd/yyyy",
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

    // Update input value when date prop changes
    React.useEffect(() => {
      setValue(formatDate(date, formatStr))
    }, [date, formatStr])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      setValue(inputValue)
      
      const parsedDate = parseDate(inputValue)
      if (isValidDate(parsedDate)) {
        onDateChange?.(parsedDate)
        setMonth(parsedDate)
      } else if (!inputValue.trim()) {
        onDateChange?.(undefined)
      }
    }

    const handleInputBlur = () => {
      // Reformat the input value to the standard format if we have a valid date
      if (date) {
        setValue(formatDate(date, formatStr))
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
      setOpen(!open)
    }

    return (
      <div ref={ref} className={cn(datePickerVariants({ size }), className)} {...props}>
        <Popover open={open} onOpenChange={setOpen}>
          <div className="relative flex gap-2">
            <Input
              value={value}
              placeholder={placeholder}
              className="bg-background pr-10"
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              aria-label={label || "Select date"}
            />
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={handleCalendarIconClick}
                disabled={disabled}
                aria-label="Open calendar"
                type="button"
              >
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
          </div>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelect}
              month={month}
              onMonthChange={setMonth}
              disabled={disabled}
              initialFocus
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