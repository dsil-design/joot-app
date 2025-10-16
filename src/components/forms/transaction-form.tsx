"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ComboBox } from "@/components/ui/combobox"
import { MultiSelectComboBox } from "@/components/ui/multi-select-combobox"
import { DatePicker } from "@/components/ui/date-picker"
import { useVendorOptions, usePaymentMethodOptions, useTagOptions } from "@/hooks"
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

  // Custom hooks for options
  const { options: vendorOptions, addCustomOption: addVendor, loading: vendorsLoading } = useVendorOptions()
  const { options: paymentOptions, addCustomOption: addPaymentMethod, loading: paymentsLoading } = usePaymentMethodOptions()
  const { options: tagOptions, addCustomOption: addTag, loading: tagsLoading } = useTagOptions()

  const handleAddVendor = async (vendorName: string) => {
    const newVendor = await addVendor(vendorName)
    if (newVendor) {
      setVendor(newVendor)
      toast.success(`Added vendor: ${vendorName}`)
      return newVendor
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

        {/* Vendor ComboBox */}
        <div className="flex flex-col gap-1 items-start justify-start w-full">
          <Label htmlFor="vendor" className="text-sm font-medium text-zinc-950">
            Vendor
          </Label>
          <ComboBox
            id="vendor"
            options={vendorOptions}
            value={vendor}
            onValueChange={setVendor}
            onAddNew={handleAddVendor}
            allowAdd={true}
            placeholder="Select option"
            searchPlaceholder="Search vendors..."
            addNewLabel="Add vendor"
            label="Select or add a vendor"
            disabled={vendorsLoading}
            className="w-full"
          />
        </div>

        {/* Payment Method ComboBox */}
        <div className="flex flex-col gap-1 items-start justify-start w-full">
          <Label htmlFor="payment-method" className="text-sm font-medium text-zinc-950">
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
