"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { SearchableComboBox } from "@/components/ui/searchable-combobox"
import { MultiSelectComboBox } from "@/components/ui/multi-select-combobox"
import { DatePicker } from "@/components/ui/date-picker"
import { useVendorSearch } from "@/hooks/use-vendor-search"
import { usePaymentMethodSearch } from "@/hooks/use-payment-method-search"
import { useTagOptions } from "@/hooks"
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
  onCancel,
  saving = false,
  saveButtonLabel,
  cancelButtonLabel,
  showDateStepper = false,
  useStandardAmountInput = false,
}: TransactionFormProps) {
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
  const { searchPaymentMethods, getPaymentMethodById, createPaymentMethod } = usePaymentMethodSearch()
  const { options: tagOptions, addCustomOption: addTag, loading: tagsLoading } = useTagOptions()

  // State to track display labels for searchable fields
  const [vendorLabel, setVendorLabel] = React.useState("")
  const [paymentMethodLabel, setPaymentMethodLabel] = React.useState("")

  // Load vendor and payment method names in edit mode
  React.useEffect(() => {
    const loadLabels = async () => {
      if (mode === 'edit' && initialData?.vendor) {
        const vendorData = await getVendorById(initialData.vendor)
        if (vendorData) {
          setVendorLabel(vendorData.name)
        }
      }

      if (mode === 'edit' && initialData?.paymentMethod) {
        const paymentMethodData = await getPaymentMethodById(initialData.paymentMethod)
        if (paymentMethodData) {
          setPaymentMethodLabel(paymentMethodData.name)
        }
      }
    }

    loadLabels()
  }, [mode, initialData?.vendor, initialData?.paymentMethod, getVendorById, getPaymentMethodById])

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

  const handleAddPaymentMethod = async (methodName: string): Promise<string | null> => {
    const newMethod = await createPaymentMethod(methodName)
    if (newMethod) {
      setPaymentMethod(newMethod.id)
      setPaymentMethodLabel(newMethod.name)
      toast.success(`Added payment method: ${methodName}`)
      return newMethod.id
    } else {
      toast.error("Failed to add payment method")
      return null
    }
  }

  const handleSearchVendors = async (query: string) => {
    const results = await searchVendors(query)
    return results.map(v => ({ id: v.id, name: v.name }))
  }

  const handleSearchPaymentMethods = async (query: string) => {
    const results = await searchPaymentMethods(query)
    return results.map(pm => ({ id: pm.id, name: pm.name }))
  }

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

  const isFormValid =
    description.trim() && amount && parseFloat(amount) > 0

  return (
    <div className="flex flex-col gap-8 items-start justify-start w-full">
      <div className="flex flex-col gap-6 items-start justify-start w-full">
        {/* Transaction Type Toggle */}
        <div className="flex gap-2 items-start justify-start">
          <Button
            variant={transactionType === "expense" ? "default" : "ghost"}
            size="sm"
            className={`h-9 gap-2 px-2.5 py-0 rounded-md ${
              transactionType === "expense"
                ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                : "bg-transparent text-zinc-950 hover:bg-zinc-100"
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
                ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
                : "bg-transparent text-zinc-950 hover:bg-zinc-100"
            }`}
            onClick={() => setTransactionType("income")}
          >
            <DollarSign className="h-4 w-4" />
            <span className="text-sm font-medium">Income</span>
          </Button>
        </div>

        {/* Date Field */}
        <div className="flex flex-col gap-1 items-start justify-start w-full">
          <Label className="text-sm font-medium text-zinc-950">Date</Label>
          {showDateStepper ? (
            <div className="flex gap-2 items-center w-full">
              <DatePicker
                date={transactionDate}
                onDateChange={(date) => date && setTransactionDate(date)}
                placeholder="March 13, 2024"
                className="flex-1"
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
              className="w-full"
              formatStr="MMMM d, yyyy"
            />
          )}
        </div>

        {/* Description Input */}
        <div className="flex flex-col gap-1 items-start justify-start w-full">
          <Label htmlFor="description" className="text-sm font-medium text-zinc-950">
            Description
          </Label>
          <Input
            id="description"
            type="text"
            placeholder="e.g., Groceries, Drinks, Gas"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Vendor SearchableComboBox */}
        <div className="flex flex-col gap-1 items-start justify-start w-full">
          <Label htmlFor="vendor" className="text-sm font-medium text-zinc-950">
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
            className="w-full"
          />
        </div>

        {/* Payment Method SearchableComboBox */}
        <div className="flex flex-col gap-1 items-start justify-start w-full">
          <Label htmlFor="payment-method" className="text-sm font-medium text-zinc-950">
            Payment Method
          </Label>
          <SearchableComboBox
            value={paymentMethod}
            selectedLabel={paymentMethodLabel}
            onValueChange={setPaymentMethod}
            onSearch={handleSearchPaymentMethods}
            onAddNew={handleAddPaymentMethod}
            placeholder="Search for payment method..."
            searchPlaceholder="Type to search..."
            emptyMessage="No payment methods found."
            label="Search or add a payment method"
            className="w-full"
          />
        </div>

        {/* Amount and Currency Row */}
        <div className="flex gap-6 items-center justify-start w-full">
          {/* Amount Input */}
          <div className="flex flex-col gap-1 items-start justify-start flex-1">
            <Label htmlFor="amount" className="text-sm font-medium text-zinc-950">
              Amount
            </Label>
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
              />
            ) : (
              <CurrencyInput
                id="amount"
                currency={currency}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            )}
          </div>

          {/* Currency Radio Group */}
          <div className="flex flex-col gap-1 items-start justify-start">
            <Label className="text-sm font-medium text-zinc-950">Currency</Label>
            <RadioGroup
              value={currency}
              onValueChange={(value: CurrencyType) => setCurrency(value)}
              className="flex gap-6 h-10 items-center justify-start"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="THB" id="thb" className="border-blue-600" />
                <Label htmlFor="thb" className="text-sm font-medium text-zinc-950">
                  THB
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="USD" id="usd" className="border-blue-600" />
                <Label htmlFor="usd" className="text-sm font-medium text-zinc-950">
                  USD
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Tags Multi-Select */}
        <div className="flex flex-col gap-1 items-start justify-start w-full">
          <Label htmlFor="tags" className="text-sm font-medium text-zinc-950">
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
            className="w-full"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 items-start justify-start w-full">
        <Button
          onClick={handleSubmit}
          disabled={saving || !isFormValid}
          size="lg"
          className="w-full"
        >
          {saving
            ? "Saving..."
            : saveButtonLabel || (mode === "edit" ? "Save changes" : "Save")}
        </Button>
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={saving}
          size="lg"
          className="w-full"
        >
          {cancelButtonLabel || (mode === "edit" ? "Discard" : "Cancel")}
        </Button>
      </div>
    </div>
  )
}
