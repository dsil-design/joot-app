"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ComboBox } from "@/components/ui/combobox"
import { DatePicker } from "@/components/ui/date-picker"
// Removed Card imports - not needed for pixel-perfect Figma design"
import { useVendorOptions, usePaymentMethodOptions, useExchangeRates, useTransactions } from "@/hooks"
import { format } from "date-fns"
import { toast } from "sonner"
import { CreditCard, DollarSign } from "lucide-react"

export default function AddTransactionPage() {
  const router = useRouter()
  const [currency, setCurrency] = React.useState<"THB" | "USD">("THB")
  const [transactionType, setTransactionType] = React.useState<"income" | "expense">("expense")
  const [vendor, setVendor] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [transactionDate, setTransactionDate] = React.useState<Date>(new Date())
  const [saving, setSaving] = React.useState(false)

  // Custom hooks
  const { options: vendorOptions, addCustomOption: addVendor, loading: vendorsLoading } = useVendorOptions()
  const { options: paymentOptions, addCustomOption: addPaymentMethod, loading: paymentsLoading } = usePaymentMethodOptions()
  const { getTHBRate, getUSDRate } = useExchangeRates()
  const { createTransaction } = useTransactions()

  const handleAddVendor = async (vendorName: string) => {
    const newVendor = addVendor(vendorName)
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
    const newMethod = addPaymentMethod(methodName)
    if (newMethod) {
      setPaymentMethod(newMethod)
      toast.success(`Added payment method: ${methodName}`)
      return newMethod
    } else {
      toast.error("Failed to add payment method")
      return null
    }
  }

  const handleSave = async () => {
    if (!description.trim()) {
      toast.error("Please enter a description")
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    setSaving(true)

    try {
      // Get current exchange rate
      const exchangeRate = currency === "USD" ? getTHBRate().rate : getUSDRate().rate
      
      
      const transactionData = {
        description: description.trim() || undefined,
        vendor: vendor || undefined,
        paymentMethod: paymentMethod || undefined,
        amount: parseFloat(amount),
        originalCurrency: currency,
        transactionType,
        transactionDate: format(transactionDate, "yyyy-MM-dd")
      }

      console.log("Transaction data:", transactionData)
      console.log("Exchange rate:", exchangeRate)
      
      const result = await createTransaction(transactionData, exchangeRate)
      
      if (result) {
        toast.success("Transaction saved successfully!")
        // Navigate back to home after successful save
        router.push("/home")
      } else {
        toast.error("Failed to save transaction")
      }
    } catch (error) {
      console.error("Transaction save error:", error)
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Navigate back to home
    router.push("/home")
  }

  // Removed converted amount display to match Figma design exactly

  return (
    <div className="bg-white flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-10 min-h-screen w-full">
      {/* Page Header */}
      <h1 className="text-3xl font-medium text-zinc-950 leading-9">
        Add transaction
      </h1>

      {/* Form */}
      <div className="flex flex-col gap-8 items-start justify-start w-full">
        {/* Form Fields */}
        <div className="flex flex-col gap-8 items-start justify-start w-full">
          <div className="flex flex-col gap-6 items-start justify-start w-full">
            {/* Transaction Type Toggle */}
            <div className="flex flex-row gap-2 items-start justify-start">
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
              <Label className="text-sm font-medium text-zinc-950">
                Date
              </Label>
              <DatePicker
                date={transactionDate}
                onDateChange={(date) => date && setTransactionDate(date)}
                placeholder="March 13, 2024"
                className="w-full"
                formatStr="MMMM d, yyyy"
              />
            </div>

            {/* Description Input Group */}
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

            {/* Vendor ComboBox Group */}
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

            {/* Payment Method ComboBox Group */}
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
            <div className="flex flex-row gap-6 items-center justify-start w-full">
              {/* Amount Input Group */}
              <div className="flex flex-col gap-1 items-start justify-start flex-1">
                <Label htmlFor="amount" className="text-sm font-medium text-zinc-950">
                  Amount
                </Label>
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
              </div>

              {/* Currency Radio Group */}
              <div className="flex flex-col gap-1 items-start justify-start">
                <Label className="text-sm font-medium text-zinc-950">
                  Currency
                </Label>
                <RadioGroup
                  value={currency}
                  onValueChange={(value: "THB" | "USD") => setCurrency(value)}
                  className="flex flex-row gap-6 h-10 items-center justify-start"
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
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 items-start justify-start w-full">
            <Button
              onClick={handleSave}
              disabled={saving || !description.trim() || !amount || parseFloat(amount) <= 0}
              className="h-10 w-full bg-blue-600 text-white rounded-lg px-6 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={saving}
              className="h-10 w-full bg-zinc-100 text-zinc-900 rounded-lg px-6 text-sm font-medium hover:bg-zinc-200"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
