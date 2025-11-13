"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CurrencyInput } from "@/components/ui/currency-input"
import { DatePicker } from "@/components/ui/date-picker"
import { SearchableComboBox } from "@/components/ui/searchable-combobox"
import { ComboBox } from "@/components/ui/combobox"
import { MultiSelectComboBox } from "@/components/ui/multi-select-combobox"
import { FrequencyPicker } from "./FrequencyPicker"
import { cn } from "@/lib/utils"
import { useVendorSearch } from "@/hooks/use-vendor-search"
import { usePaymentMethodOptions, useTagOptions } from "@/hooks"
import { toast } from "sonner"
import type { CurrencyType, TransactionType } from "@/lib/supabase/types"
import type {
  CreateTemplateData,
  UpdateTemplateData,
  FrequencyType,
  DayOfWeek,
  DayOfMonth,
  TransactionTemplate,
} from "@/lib/types/recurring-transactions"

export interface TemplateFormProps {
  mode: "create" | "edit"
  initialData?: TransactionTemplate
  onSubmit: (data: CreateTemplateData | UpdateTemplateData) => Promise<void>
  onCancel: () => void
  saving?: boolean
  className?: string
}

/**
 * Form for creating/editing transaction templates
 * Includes all fields with validation
 */
export function TemplateForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  saving = false,
  className,
}: TemplateFormProps) {
  // Form state
  const [name, setName] = React.useState(initialData?.name || "")
  const [description, setDescription] = React.useState(initialData?.description || "")
  const [vendorId, setVendorId] = React.useState(initialData?.vendor_id || "")
  const [paymentMethodId, setPaymentMethodId] = React.useState(
    initialData?.payment_method_id || ""
  )
  const [amount, setAmount] = React.useState(
    initialData?.amount?.toString() || ""
  )
  const [currency, setCurrency] = React.useState<CurrencyType>(
    initialData?.original_currency || "THB"
  )
  const [transactionType, setTransactionType] = React.useState<TransactionType>(
    initialData?.transaction_type || "expense"
  )
  const [frequency, setFrequency] = React.useState<FrequencyType>(
    initialData?.frequency || "monthly"
  )
  const [frequencyInterval, setFrequencyInterval] = React.useState(
    initialData?.frequency_interval || 1
  )
  const [dayOfMonth, setDayOfMonth] = React.useState<DayOfMonth | null>(
    (initialData?.day_of_month as DayOfMonth) || 1
  )
  const [dayOfWeek, setDayOfWeek] = React.useState<DayOfWeek | null>(
    (initialData?.day_of_week as DayOfWeek) || 0
  )
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    initialData?.start_date ? new Date(initialData.start_date) : new Date()
  )
  const [endDate, setEndDate] = React.useState<Date | undefined>(
    initialData?.end_date ? new Date(initialData.end_date) : undefined
  )
  const [selectedTags, setSelectedTags] = React.useState<string[]>(
    initialData?.tags?.map((t) => t.id) || []
  )

  // Form validation
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // Custom hooks
  const { searchVendors, getVendorById, createVendor } = useVendorSearch()
  const {
    options: paymentOptions,
    addCustomOption: addPaymentMethod,
    loading: paymentsLoading,
  } = usePaymentMethodOptions()
  const {
    options: tagOptions,
    addCustomOption: addTag,
    loading: tagsLoading,
  } = useTagOptions()

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = "Template name is required"
    }
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = "Amount must be greater than 0"
    }
    if (!startDate) {
      newErrors.startDate = "Start date is required"
    }
    if (endDate && startDate && endDate < startDate) {
      newErrors.endDate = "End date must be after start date"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error("Please fix the errors in the form")
      return
    }

    const formData: CreateTemplateData | UpdateTemplateData = {
      name: name.trim(),
      description: description.trim() || undefined,
      vendor_id: vendorId || undefined,
      payment_method_id: paymentMethodId || undefined,
      amount: parseFloat(amount),
      original_currency: currency,
      transaction_type: transactionType,
      frequency,
      frequency_interval: frequencyInterval,
      day_of_month: dayOfMonth || undefined,
      day_of_week: dayOfWeek || undefined,
      start_date: startDate!.toISOString().split("T")[0],
      end_date: endDate?.toISOString().split("T")[0] || undefined,
      tag_ids: selectedTags.length > 0 ? selectedTags : undefined,
    }

    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      {/* Template Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Template Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Monthly Rent, Netflix Subscription"
          aria-invalid={!!errors.name}
        />
        {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
          placeholder="Optional description"
        />
      </div>

      {/* Transaction Type */}
      <div className="space-y-2">
        <Label>
          Transaction Type <span className="text-red-500">*</span>
        </Label>
        <RadioGroup value={transactionType} onValueChange={(v) => setTransactionType(v as TransactionType)}>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="expense" id="expense" />
              <Label htmlFor="expense" className="cursor-pointer">
                Expense
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="income" id="income" />
              <Label htmlFor="income" className="cursor-pointer">
                Income
              </Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Amount and Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">
            Amount <span className="text-red-500">*</span>
          </Label>
          <CurrencyInput
            id="amount"
            value={amount}
            onChange={setAmount}
            currency={currency}
            placeholder="0.00"
            aria-invalid={!!errors.amount}
          />
          {errors.amount && <p className="text-xs text-red-600">{errors.amount}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <ComboBox
            options={[
              { value: "THB", label: "THB (฿)" },
              { value: "USD", label: "USD ($)" },
              { value: "VND", label: "VND (₫)" },
              { value: "MYR", label: "MYR (RM)" },
              { value: "CNY", label: "CNY (¥)" },
            ]}
            value={currency}
            onValueChange={(v) => setCurrency(v as CurrencyType)}
            placeholder="Select currency"
          />
        </div>
      </div>

      {/* Vendor */}
      <div className="space-y-2">
        <Label htmlFor="vendor">Vendor</Label>
        <SearchableComboBox
          placeholder="Search or create vendor..."
          searchFn={searchVendors}
          getByIdFn={getVendorById}
          createFn={createVendor}
          value={vendorId}
          onValueChange={(value) => setVendorId(value)}
          allowCreate
        />
      </div>

      {/* Payment Method */}
      <div className="space-y-2">
        <Label htmlFor="payment-method">Payment Method</Label>
        <ComboBox
          options={paymentOptions}
          value={paymentMethodId}
          onValueChange={(value) => setPaymentMethodId(value)}
          placeholder="Select payment method"
          allowCreate
          onCreateOption={addPaymentMethod}
          loading={paymentsLoading}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <MultiSelectComboBox
          options={tagOptions}
          values={selectedTags}
          onValuesChange={(values) => setSelectedTags(values)}
          placeholder="Select tags"
          allowCreate
          onCreateOption={addTag}
          loading={tagsLoading}
        />
      </div>

      {/* Frequency Picker */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium mb-4">Recurrence Pattern</h3>
        <FrequencyPicker
          frequency={frequency}
          onFrequencyChange={setFrequency}
          frequencyInterval={frequencyInterval}
          onFrequencyIntervalChange={setFrequencyInterval}
          dayOfMonth={dayOfMonth}
          onDayOfMonthChange={setDayOfMonth}
          dayOfWeek={dayOfWeek}
          onDayOfWeekChange={setDayOfWeek}
          startDate={startDate}
        />
      </div>

      {/* Start and End Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            Start Date <span className="text-red-500">*</span>
          </Label>
          <DatePicker date={startDate} onDateChange={setStartDate} placeholder="Select start date" />
          {errors.startDate && <p className="text-xs text-red-600">{errors.startDate}</p>}
        </div>

        <div className="space-y-2">
          <Label>End Date (Optional)</Label>
          <DatePicker date={endDate} onDateChange={setEndDate} placeholder="No end date" />
          {errors.endDate && <p className="text-xs text-red-600">{errors.endDate}</p>}
          <p className="text-xs text-zinc-500">Leave empty for ongoing template</p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-2 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : mode === "create" ? "Create Template" : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}
