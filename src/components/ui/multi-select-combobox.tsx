"use client"

import * as React from "react"
import { Check, ChevronDown, Plus, X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface MultiSelectOption {
  value: string
  label: string
  color?: string
  disabled?: boolean
}

const multiSelectComboBoxVariants = cva(
  "w-full justify-between font-normal min-h-10",
  {
    variants: {
      variant: {
        default: "border-input bg-background hover:bg-accent hover:text-accent-foreground",
        outline: "border-input bg-background hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "min-h-10 px-3 py-2 text-sm",
        sm: "min-h-9 px-2 py-1 text-xs",
        lg: "min-h-11 px-4 py-2 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface MultiSelectComboBoxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange">,
    VariantProps<typeof multiSelectComboBoxVariants> {
  options: MultiSelectOption[]
  values?: string[]
  onValuesChange?: (values: string[]) => void
  onAddNew?: (inputValue: string) => Promise<string | null>
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  allowAdd?: boolean
  addNewLabel?: string
  disabled?: boolean
  label?: string
  maxDisplay?: number
}

const MultiSelectComboBox = React.forwardRef<HTMLButtonElement, MultiSelectComboBoxProps>(
  (
    {
      className,
      variant,
      size,
      options = [],
      values = [],
      onValuesChange,
      onAddNew,
      placeholder = "Select options...",
      searchPlaceholder = "Search...",
      emptyMessage = "No options found.",
      allowAdd = false,
      addNewLabel = "Add new",
      disabled = false,
      label,
      maxDisplay = 3,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const [searchValue, setSearchValue] = React.useState("")
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Auto-focus input when dropdown opens
    React.useEffect(() => {
      if (open && inputRef.current) {
        setTimeout(() => {
          inputRef.current?.focus()
        }, 50)
      }
    }, [open])

    // Get selected options
    const selectedOptions = options.filter((option) => values.includes(option.value))

    // Filter options based on search
    const filteredOptions = options.filter((option) =>
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    )

    const handleSelect = (optionValue: string) => {
      const newValues = values.includes(optionValue)
        ? values.filter((v) => v !== optionValue)
        : [...values, optionValue]

      onValuesChange?.(newValues)
    }

    const handleRemove = (optionValue: string, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const newValues = values.filter((v) => v !== optionValue)
      onValuesChange?.(newValues)
    }

    const handleAddNew = async () => {
      if (searchValue.trim() && onAddNew) {
        const newId = await onAddNew(searchValue.trim())
        if (newId) {
          // Add the new tag to selected values
          onValuesChange?.([...values, newId])
        }
        setSearchValue("")
      }
    }

    const showAddNew = allowAdd &&
      onAddNew &&
      searchValue.trim() &&
      !filteredOptions.some(opt =>
        opt.label.toLowerCase() === searchValue.toLowerCase()
      )

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={label}
            className={cn(multiSelectComboBoxVariants({ variant, size }), className)}
            disabled={disabled}
            {...props}
          >
            <div className="flex flex-wrap gap-1 flex-1 items-center">
              {selectedOptions.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : selectedOptions.length <= maxDisplay ? (
                selectedOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    style={
                      option.color
                        ? {
                            backgroundColor: option.color,
                            color: '#18181b', // zinc-950 for readable text
                          }
                        : undefined
                    }
                    className="gap-1"
                  >
                    {option.label}
                    <span
                      role="button"
                      tabIndex={0}
                      className="ml-0.5 ring-offset-background rounded-sm hover:bg-zinc-900/10 cursor-pointer p-1 -m-1"
                      onMouseDown={(e) => handleRemove(option.value, e)}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleRemove(option.value, e as unknown as React.MouseEvent)
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                ))
              ) : (
                <>
                  {selectedOptions.slice(0, maxDisplay - 1).map((option) => (
                    <Badge
                      key={option.value}
                      variant="secondary"
                      style={
                        option.color
                          ? {
                              backgroundColor: option.color,
                              color: '#18181b',
                            }
                          : undefined
                      }
                      className="gap-1"
                    >
                      {option.label}
                      <span
                        role="button"
                        tabIndex={0}
                        className="ml-0.5 ring-offset-background rounded-sm hover:bg-zinc-900/10 cursor-pointer p-1 -m-1"
                        onMouseDown={(e) => handleRemove(option.value, e)}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleRemove(option.value, e as unknown as React.MouseEvent)
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </Badge>
                  ))}
                  <Badge variant="secondary">
                    +{selectedOptions.length - (maxDisplay - 1)} more
                  </Badge>
                </>
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(calc(100vw-2rem),var(--radix-popover-trigger-width))] p-0"
          align="start"
          sideOffset={6}
          collisionPadding={16}
          style={{
            maxHeight: 'min(400px, calc(100vh - 100px))',
          }}
        >
          <Command shouldFilter={false}>
            <CommandInput
              ref={inputRef as any}
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={setSearchValue}
              className="h-11 md:h-9"
            />
            <CommandList className="max-h-[min(300px,calc(100vh-200px))]">
              {filteredOptions.length === 0 && !showAddNew && (
                <CommandEmpty>{emptyMessage}</CommandEmpty>
              )}

              {filteredOptions.length > 0 && (
                <CommandGroup>
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                      onSelect={() => handleSelect(option.value)}
                      className="cursor-pointer min-h-[44px] flex items-center px-3"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            values.includes(option.value) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {option.color && (
                          <div
                            className="h-3 w-3 rounded-sm shrink-0"
                            style={{ backgroundColor: option.color }}
                          />
                        )}
                        <span className="truncate flex-1">{option.label}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {showAddNew && (
                <CommandGroup>
                  <CommandItem
                    value={`add-new-${searchValue}`}
                    onSelect={handleAddNew}
                    className="cursor-pointer text-primary min-h-[44px] flex items-center px-3"
                  >
                    <Plus className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">
                      {addNewLabel} "{searchValue}"
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }
)

MultiSelectComboBox.displayName = "MultiSelectComboBox"

export { MultiSelectComboBox, multiSelectComboBoxVariants }
