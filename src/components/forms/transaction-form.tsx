"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { SearchableComboBox } from "@/components/ui/searchable-combobox"
import { ComboBox } from "@/components/ui/combobox"
import { MultiSelectComboBox } from "@/components/ui/multi-select-combobox"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useVendorSearch } from "@/hooks/use-vendor-search"
import { usePaymentMethodOptions, useTagOptions } from "@/hooks"
import { toast } from "sonner"
import { CreditCard, DollarSign, ChevronLeft, ChevronRight } from "lucide-react"
import type { CurrencyType, TransactionType } from "@/lib/supabase/types"

export interface TransactionFormData {
  currency: CurrencyType
  transactionType: TransactionType
  vendor?: string
  paymentMethod?: string
  tags?: string[]
  description: string
  amount: string
  transactionDate: Date
}

export interface TransactionFormProps {
  mode: "add" | "edit"
  initialData?: Partial<TransactionFormData>
  onSave: (data: TransactionFormData) => Promise<void>
  onSaveAndAddAnother?: (data: TransactionFormData) => Promise<boolean>
  onCancel: () => void
  saving?: boolean
  saveButtonLabel?: string
  cancelButtonLabel?: string
  showDateStepper?: boolean
  useStandardAmountInput?: boolean
}

export function TransactionForm({
  mode,
  initialData,
  onSave,
  onSaveAndAddAnother,
  onCancel,
  saving = false,
  saveButtonLabel,
  cancelButtonLabel,
  showDateStepper = false,
  useStandardAmountInput = false,
}: TransactionFormProps) {
  // Refs for auto-focus and intersection observer
  const descriptionRef = React.useRef<HTMLInputElement>(null)
  const staticFooterRef = React.useRef<HTMLDivElement>(null)
  const formContainerRef = React.useRef<HTMLDivElement>(null)

  // State for sticky footer visibility
  const [showStickyFooter, setShowStickyFooter] = React.useState(true)
  const [isFormShort, setIsFormShort] = React.useState(false)

  // Form state
  const [currency, setCurrency] = React.useState<CurrencyType>(
    initialData?.currency || "THB"
  )
  const [transactionType, setTransactionType] = React.useState<TransactionType>(
    initialData?.transactionType || "expense"
  )
  const [vendor, setVendor] = React.useState(initialData?.vendor || "")
  const [paymentMethod, setPaymentMethod] = React.useState(
    initialData?.paymentMethod || ""
  )
  const [tags, setTags] = React.useState<string[]>(initialData?.tags || [])
  const [description, setDescription] = React.useState(
    initialData?.description || ""
  )
  const [amount, setAmount] = React.useState(initialData?.amount || "")
  const [transactionDate, setTransactionDate] = React.useState<Date>(
    initialData?.transactionDate || new Date()
  )

  // Custom hooks for search-based selection
  const { searchVendors, getVendorById, createVendor } = useVendorSearch()
  const { options: paymentOptions, paymentMethods, addCustomOption: addPaymentMethod, loading: paymentsLoading } = usePaymentMethodOptions()
  const { options: tagOptions, addCustomOption: addTag, loading: tagsLoading } = useTagOptions()

  // State for dynamic currency field
  const [showCurrencyDropdown, setShowCurrencyDropdown] = React.useState(false)
  const [availableCurrencies, setAvailableCurrencies] = React.useState<Array<{ code: string; symbol: string; name: string }>>([])

  // Load available currencies on mount
  React.useEffect(() => {
    const loadCurrencies = async () => {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data } = await supabase
        .from('currency_configuration')
        .select('currency_code, currency_symbol, display_name')
        .eq('is_tracked', true)
        .order('currency_code', { ascending: true })

      if (data) {
        setAvailableCurrencies(
          data
            .filter(c => c.currency_symbol !== null)
            .map(c => ({ code: c.currency_code, symbol: c.currency_symbol!, name: c.display_name }))
        )
      }
    }
    loadCurrencies()
  }, [])

  // State to track display labels for searchable fields
  const [vendorLabel, setVendorLabel] = React.useState("")

  // Sync form state when initialData changes (important for edit mode)
  React.useEffect(() => {
    if (initialData) {
      if (initialData.currency) setCurrency(initialData.currency)
      if (initialData.transactionType) setTransactionType(initialData.transactionType)
      if (initialData.vendor !== undefined) setVendor(initialData.vendor)
      if (initialData.paymentMethod !== undefined) setPaymentMethod(initialData.paymentMethod)
      if (initialData.tags !== undefined) setTags(initialData.tags)
      if (initialData.description !== undefined) setDescription(initialData.description)
      if (initialData.amount !== undefined) setAmount(initialData.amount)
      if (initialData.transactionDate) setTransactionDate(initialData.transactionDate)
    }
  }, [initialData])

  // Load vendor name in edit mode and check if currency dropdown should be shown
  React.useEffect(() => {
    const loadLabels = async () => {
      if (mode === 'edit' && initialData?.vendor) {
        const vendorData = await getVendorById(initialData.vendor)
        if (vendorData) {
          setVendorLabel(vendorData.name)
        }
      }

      // In edit mode, show dropdown if currency is not THB or USD
      if (mode === 'edit' && initialData?.currency && !['THB', 'USD'].includes(initialData.currency)) {
        setShowCurrencyDropdown(true)
      }
    }

    loadLabels()
  }, [mode, initialData?.vendor, initialData?.currency, getVendorById])

  // Auto-select currency when payment method changes
  React.useEffect(() => {
    if (!paymentMethod) return

    const selectedPaymentMethod = paymentMethods.find(pm => pm.id === paymentMethod)
    if (!selectedPaymentMethod?.preferred_currency) return

    const preferredCurrency = selectedPaymentMethod.preferred_currency as CurrencyType

    // If preferred currency is not THB or USD, switch to dropdown
    if (!['THB', 'USD'].includes(preferredCurrency)) {
      setShowCurrencyDropdown(true)
    }

    // Set the currency to the preferred currency
    setCurrency(preferredCurrency)
  }, [paymentMethod, paymentMethods])

  // Auto-focus description field on mount
  React.useEffect(() => {
    descriptionRef.current?.focus()
  }, [])

  // Check if form is short (doesn't require scrolling)
  React.useEffect(() => {
    const checkFormHeight = () => {
      if (formContainerRef.current) {
        const formHeight = formContainerRef.current.scrollHeight
        const viewportHeight = window.innerHeight
        // If form + padding is shorter than viewport, it's a short form
        setIsFormShort(formHeight + 200 < viewportHeight)
      }
    }

    // Check on mount and when window resizes
    checkFormHeight()
    window.addEventListener('resize', checkFormHeight)
    return () => window.removeEventListener('resize', checkFormHeight)
  }, [])

  // IntersectionObserver to detect when static footer is visible
  React.useEffect(() => {
    if (!staticFooterRef.current || isFormShort) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // When static footer is visible, hide sticky footer
          // When static footer is not visible, show sticky footer
          setShowStickyFooter(!entry.isIntersecting)
        })
      },
      {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0.1, // Trigger when 10% of static footer is visible
      }
    )

    observer.observe(staticFooterRef.current)

    return () => {
      observer.disconnect()
    }
  }, [isFormShort])

  // Reset form (keeping date and currency)
  const resetForm = () => {
    setTransactionType("expense")
    setVendor("")
    setPaymentMethod("")
    setTags([])
    setDescription("")
    setAmount("")
    setVendorLabel("")

    // Scroll to top and focus description
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => {
      descriptionRef.current?.focus()
    }, 100)
  }

  const handleAddVendor = async (vendorName: string): Promise<string | null> => {
    const newVendor = await createVendor(vendorName)
    if (newVendor) {
      setVendor(newVendor.id)
      setVendorLabel(newVendor.name)
      toast.success(`Added vendor: ${vendorName}`)
      return newVendor.id
    } else {
      toast.error("Failed to add vendor")
      return null
    }
  }

  const handleAddPaymentMethod = async (methodName: string) => {
    const newMethod = await addPaymentMethod(methodName)
    if (newMethod) {
      setPaymentMethod(newMethod)
      toast.success(`Added payment method: ${methodName}`)
      return newMethod
    } else {
      toast.error("Failed to add payment method")
      return null
    }
  }

  const handleSearchVendors = React.useCallback(async (query: string) => {
    const results = await searchVendors(query)
    return results.map(v => ({ id: v.id, name: v.name }))
  }, [searchVendors])

  const handleAddTag = async (tagName: string) => {
    const newTag = await addTag(tagName)
    if (newTag) {
      toast.success(`Added tag: ${tagName}`)
      return newTag
    } else {
      toast.error("Failed to add tag")
      return null
    }
  }

  const handleDateStep = (days: number) => {
    const newDate = new Date(transactionDate)
    newDate.setDate(newDate.getDate() + days)
    setTransactionDate(newDate)
  }

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Please enter a description")
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    const formData: TransactionFormData = {
      currency,
      transactionType,
      vendor,
      paymentMethod,
      tags,
      description,
      amount,
      transactionDate,
    }

    await onSave(formData)
  }

  const handleSubmitAndAddAnother = async () => {
    if (!description.trim()) {
      toast.error("Please enter a description")
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    if (!onSaveAndAddAnother) {
      return
    }

    const formData: TransactionFormData = {
      currency,
      transactionType,
      vendor,
      paymentMethod,
      tags,
      description,
      amount,
      transactionDate,
    }

    const success = await onSaveAndAddAnother(formData)
    if (success) {
      resetForm()
    }
  }

  const isFormValid =
    description.trim() && amount && parseFloat(amount) > 0

  return (
    <div ref={formContainerRef} className="flex flex-col gap-6 md:gap-8 items-start justify-start w-full">
      <div className="flex flex-col gap-4 md:gap-6 items-start justify-start w-full">
        {/* Transaction Type Toggle */}
        <div className="flex gap-3 sm:gap-2 items-start justify-start">
          <Button
            variant={transactionType === "expense" ? "default" : "ghost"}
            size="sm"
            className={`h-9 gap-2 px-2.5 py-0 rounded-md ${
              transactionType === "expense"
                ? "bg-accent text-accent-foreground hover:bg-accent/80"
                : "bg-transparent text-foreground hover:bg-accent"
            }`}
            onClick={() => setTransactionType("expense")}
          >
            <CreditCard className="h-4 w-4" />
            <span className="text-sm font-medium">Expense</span>
          </Button>
          <Button
            variant={transactionType === "income" ? "default" : "ghost"}
            size="sm"
            className={`h-9 gap-2 px-2.5 py-0 rounded-md ${
              transactionType === "income"
                ? "bg-accent text-accent-foreground hover:bg-accent/80"
                : "bg-transparent text-foreground hover:bg-accent"
            }`}
            onClick={() => setTransactionType("income")}
          >
            <DollarSign className="h-4 w-4" />
            <span className="text-sm font-medium">Income</span>
          </Button>
        </div>

        {/* Date Field */}
        <div className="flex flex-col gap-1 items-start justify-start w-full">
          <Label className="text-sm font-medium text-foreground">Date</Label>
          {showDateStepper ? (
            <div className="flex gap-2 items-center w-full">
              <DatePicker
                date={transactionDate}
                onDateChange={(date) => date && setTransactionDate(date)}
                placeholder="March 13, 2024"
                className="flex-1 h-12 md:h-10"
                formatStr="MMMM d, yyyy"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDateStep(-1)}
                aria-label="Previous day"
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDateStep(1)}
                aria-label="Next day"
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <DatePicker
              date={transactionDate}
              onDateChange={(date) => date && setTransactionDate(date)}
              placeholder="March 13, 2024"
              className="w-full h-12 md:h-10"
              formatStr="MMMM d, yyyy"
            />
          )}
        </div>

        {/* Description Input */}
        <div className="flex flex-col gap-1 items-start justify-start w-full">
          <Label htmlFor="description" className="text-sm font-medium text-foreground">
            Description
          </Label>
          <Input
            ref={descriptionRef}
            id="description"
            type="text"
            placeholder="e.g., Groceries, Drinks, Gas"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="h-12 md:h-10 text-base md:text-sm"
          />
        </div>

        {/* Vendor SearchableComboBox */}
        <div className="flex flex-col gap-1 items-start justify-start w-full">
          <Label htmlFor="vendor" className="text-sm font-medium text-foreground">
            Vendor
          </Label>
          <SearchableComboBox
            value={vendor}
            selectedLabel={vendorLabel}
            onValueChange={setVendor}
            onSearch={handleSearchVendors}
            onAddNew={handleAddVendor}
            placeholder="Search for vendor..."
            searchPlaceholder="Type to search..."
            emptyMessage="No vendors found."
            label="Search or add a vendor"
            className="w-full h-12 md:h-10"
          />
        </div>

        {/* Payment Method ComboBox */}
        <div className="flex flex-col gap-1 items-start justify-start w-full">
          <Label htmlFor="payment-method" className="text-sm font-medium text-foreground">
            Payment Method
          </Label>
          <ComboBox
            id="payment-method"
            options={paymentOptions}
            value={paymentMethod}
            onValueChange={setPaymentMethod}
            onAddNew={handleAddPaymentMethod}
            allowAdd={true}
            placeholder="Select option"
            searchPlaceholder="Search payment methods..."
            addNewLabel="Add payment method"
            label="Select or add a payment method"
            disabled={paymentsLoading}
            className="w-full h-12 md:h-10"
          />
        </div>

        {/* Amount and Currency - Integrated Row */}
        <div className="flex flex-col gap-1 items-start justify-start w-full">
          <Label htmlFor="amount" className="text-sm font-medium text-foreground">
            Amount
          </Label>
          <div className="flex gap-2 md:gap-3 items-stretch justify-start w-full">
            {/* Amount Input - Flexible width */}
            <div className="flex-1 min-w-0">
              {useStandardAmountInput ? (
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  required
                  className="h-12 md:h-10 text-base md:text-sm"
                />
              ) : (
                <CurrencyInput
                  id="amount"
                  currency={currency}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="h-12 md:h-10 text-base md:text-sm"
                />
              )}
            </div>

            {/* Currency Selector - Compact */}
            {showCurrencyDropdown ? (
              <Select
                value={currency}
                onValueChange={(value: CurrencyType) => setCurrency(value)}
              >
                <SelectTrigger className="w-[110px] md:w-[100px] h-12 md:h-10 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-1 items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrency("THB")}
                  className={`h-12 md:h-10 px-3 md:px-2.5 rounded-md border transition-colors font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    currency === "THB"
                      ? "bg-blue-50 border-blue-600 text-blue-700"
                      : "bg-background border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                  aria-label="Select THB currency"
                  aria-pressed={currency === "THB"}
                >
                  THB
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={`h-12 md:h-10 px-3 md:px-2.5 rounded-md border transition-colors font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    currency === "USD"
                      ? "bg-blue-50 border-blue-600 text-blue-700"
                      : "bg-background border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                  aria-label="Select USD currency"
                  aria-pressed={currency === "USD"}
                >
                  USD
                </button>
                <button
                  type="button"
                  onClick={() => setShowCurrencyDropdown(true)}
                  className="h-12 md:h-10 px-3 md:px-2.5 rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Select other currency"
                >
                  •••
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tags Multi-Select */}
        <div className="flex flex-col gap-1 items-start justify-start w-full">
          <Label htmlFor="tags" className="text-sm font-medium text-foreground">
            Tags
          </Label>
          <MultiSelectComboBox
            id="tags"
            options={tagOptions}
            values={tags}
            onValuesChange={setTags}
            onAddNew={handleAddTag}
            allowAdd={true}
            placeholder="Select tags..."
            searchPlaceholder="Search tags..."
            addNewLabel="Add tag"
            label="Select or add tags"
            disabled={tagsLoading}
            className="w-full h-12 md:h-10"
          />
        </div>
      </div>

      {/* Static Footer - Below form fields with all buttons (mobile only, hidden on desktop) */}
      <div
        ref={staticFooterRef}
        className="flex flex-col gap-2.5 items-start justify-start w-full md:gap-3 md:relative md:static pb-20 md:pb-0"
      >
        <Button
          onClick={handleSubmit}
          disabled={saving || !isFormValid}
          size="lg"
          className="w-full h-11 text-base font-medium"
          aria-label="Save transaction"
        >
          {saving
            ? "Saving..."
            : saveButtonLabel || (mode === "edit" ? "Save changes" : "Save")}
        </Button>
        {onSaveAndAddAnother && mode === "add" && (
          <Button
            variant="secondary"
            onClick={handleSubmitAndAddAnother}
            disabled={saving || !isFormValid}
            size="lg"
            className="w-full h-11 text-base font-medium"
            aria-label="Save transaction and add another"
          >
            {saving ? "Saving..." : "Save & New"}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
          size="lg"
          className="w-full h-11 text-base font-medium"
          aria-label="Discard changes"
        >
          {cancelButtonLabel || (mode === "edit" ? "Discard" : "Cancel")}
        </Button>
      </div>

      {/* Sticky Footer - Only Save button, shows when static footer is out of view */}
      {/* Hide on desktop (md+) and on short forms */}
      {!isFormShort && (
        <div
          className={`flex flex-col gap-2.5 items-start justify-start w-full md:hidden fixed bottom-0 left-0 right-0 bg-white pt-3 [padding-bottom:max(1rem,calc(1rem+env(safe-area-inset-bottom)))] border-t border-zinc-200 shadow-[0_-1px_3px_0_rgb(0_0_0_/0.05)] z-50 transaction-form-footer transition-opacity duration-200 ease-in-out ${
            showStickyFooter ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          <Button
            onClick={handleSubmit}
            disabled={saving || !isFormValid}
            size="lg"
            className="w-full h-11 text-base font-medium"
            aria-label="Save transaction"
          >
            {saving
              ? "Saving..."
              : saveButtonLabel || (mode === "edit" ? "Save changes" : "Save")}
          </Button>
        </div>
      )}
    </div>
  )
}
