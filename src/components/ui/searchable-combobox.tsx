"use client"

import * as React from "react"
import { Check, ChevronDown, Plus, Loader2 } from "lucide-react"
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

export interface SearchableComboBoxProps {
  value?: string
  selectedLabel?: string
  onValueChange?: (value: string) => void
  onSearch: (query: string) => Promise<Array<{ id: string; name: string }>>
  onAddNew?: (inputValue: string) => Promise<string | null>
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  label?: string
  className?: string
}

export function SearchableComboBox({
  value,
  selectedLabel,
  onValueChange,
  onSearch,
  onAddNew,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled = false,
  label,
  className,
}: SearchableComboBoxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = React.useState(false)
  const [displayLabel, setDisplayLabel] = React.useState(selectedLabel || "")

  // Debounced search
  React.useEffect(() => {
    if (!open) return

    const timeoutId = setTimeout(async () => {
      if (searchValue.length >= 1) {
        setLoading(true)
        try {
          const results = await onSearch(searchValue)
          setSearchResults(results)
        } catch (error) {
          console.error('Search error:', error)
          setSearchResults([])
        } finally {
          setLoading(false)
        }
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchValue, open, onSearch])

  // Update display label when selectedLabel prop changes
  React.useEffect(() => {
    setDisplayLabel(selectedLabel || "")
  }, [selectedLabel])

  const handleSelect = (itemId: string, itemName: string) => {
    onValueChange?.(value === itemId ? "" : itemId)
    setDisplayLabel(itemName)
    setOpen(false)
    setSearchValue("")
  }

  const handleAddNew = async () => {
    if (searchValue.trim() && onAddNew) {
      const newId = await onAddNew(searchValue.trim())
      if (newId) {
        onValueChange?.(newId)
        setDisplayLabel(searchValue.trim())
        setOpen(false)
        setSearchValue("")
      }
    }
  }

  const showAddNew = onAddNew &&
    searchValue.trim() &&
    !searchResults.some(result =>
      result.name.toLowerCase() === searchValue.toLowerCase()
    )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          <span className="truncate">
            {displayLabel || placeholder}
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
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
              </div>
            )}

            {!loading && searchValue.length === 0 && (
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-zinc-500">
                  Start typing to search...
                </div>
              </CommandEmpty>
            )}

            {!loading && searchValue.length > 0 && searchResults.length === 0 && !showAddNew && (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}

            {!loading && searchResults.length > 0 && (
              <CommandGroup>
                {searchResults.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.id}
                    onSelect={() => handleSelect(result.id, result.name)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === result.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{result.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!loading && showAddNew && (
              <CommandGroup>
                <CommandItem
                  value={`add-new-${searchValue}`}
                  onSelect={handleAddNew}
                  className="cursor-pointer text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="truncate">
                    Add "{searchValue}"
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
