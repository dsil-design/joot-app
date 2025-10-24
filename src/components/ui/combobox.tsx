"use client"

import * as React from "react"
import { Check, ChevronDown, Plus } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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

export interface ComboBoxOption {
  value: string
  label: string
  disabled?: boolean
  labelSuffix?: string // Optional suffix to render in muted color (e.g., currency code)
}

const comboBoxVariants = cva(
  "w-full justify-between font-normal",
  {
    variants: {
      variant: {
        default: "border-input bg-background hover:bg-accent hover:text-accent-foreground",
        outline: "border-input bg-background hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-3 py-2 text-sm",
        sm: "h-9 px-2 py-1 text-xs",
        lg: "h-11 px-4 py-2 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ComboBoxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange">,
    VariantProps<typeof comboBoxVariants> {
  options: ComboBoxOption[]
  value?: string
  onValueChange?: (value: string) => void
  onAddNew?: (inputValue: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  allowAdd?: boolean
  addNewLabel?: string
  disabled?: boolean
  label?: string
}

const ComboBox = React.forwardRef<HTMLButtonElement, ComboBoxProps>(
  (
    {
      className,
      variant,
      size,
      options = [],
      value,
      onValueChange,
      onAddNew,
      placeholder = "Select option...",
      searchPlaceholder = "Search...",
      emptyMessage = "No options found.",
      allowAdd = false,
      addNewLabel = "Add new",
      disabled = false,
      label,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const [searchValue, setSearchValue] = React.useState("")

    // Find the selected option
    const selectedOption = options.find((option) => option.value === value)

    // Filter options based on search
    const filteredOptions = options.filter((option) =>
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    )

    const handleSelect = (optionValue: string) => {
      onValueChange?.(optionValue === value ? "" : optionValue)
      setOpen(false)
      setSearchValue("")
    }

    const handleAddNew = () => {
      if (searchValue.trim() && onAddNew) {
        onAddNew(searchValue.trim())
        setOpen(false)
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
            className={cn(comboBoxVariants({ variant, size }), className)}
            disabled={disabled}
            {...props}
          >
            <span className="truncate">
              {selectedOption ? (
                <>
                  {selectedOption.label}
                  {selectedOption.labelSuffix && (
                    <span className="text-zinc-500"> ({selectedOption.labelSuffix})</span>
                  )}
                </>
              ) : (
                placeholder
              )}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={setSearchValue}
              className="h-9"
            />
            <CommandList>
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
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">
                        {option.label}
                        {option.labelSuffix && (
                          <span className="text-zinc-500"> ({option.labelSuffix})</span>
                        )}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {showAddNew && (
                <CommandGroup>
                  <CommandItem
                    value={`add-new-${searchValue}`}
                    onSelect={handleAddNew}
                    className="cursor-pointer text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="truncate">
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

ComboBox.displayName = "ComboBox"

export { ComboBox, comboBoxVariants }