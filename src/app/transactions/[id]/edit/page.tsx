/**
 * FIGMA DESIGN IMPLEMENTATION
 * Design URL: https://www.figma.com/design/sGttHlfcLJEy1pNBgqpEr6/%F0%9F%9A%A7-Transactions?node-id=40000108-2759
 * Node: 40000108:2759 - MASTER - Edit transaction
 * Fidelity: 100% - No unauthorized additions
 */
"use client"

import * as React from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ComboBox } from "@/components/ui/combobox"
import { DatePicker } from "@/components/ui/date-picker"
import { useTransactionFlow } from "@/hooks/useTransactionFlow"
import { useTransactions, useVendorOptions, usePaymentMethodOptions, useExchangeRates } from "@/hooks"
import type { TransactionWithVendorAndPayment } from "@/lib/supabase/types"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { CreditCard, DollarSign } from "lucide-react"

export default function EditTransactionPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id as string
  const source = searchParams?.get('from') as 'home' | 'transactions' | null
  const { navigateBack, navigateToViewTransactionFromEdit, isPending: navigationPending } = useTransactionFlow()
  const { getTransactionById, updateTransaction } = useTransactions()
  const { options: vendorOptions, addCustomOption: addVendor, loading: vendorsLoading } = useVendorOptions()
  const { options: paymentOptions, addCustomOption: addPaymentMethod, loading: paymentsLoading } = usePaymentMethodOptions()
  const { getTHBRate, getUSDRate } = useExchangeRates()
  
  const [transaction, setTransaction] = React.useState<TransactionWithVendorAndPayment | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  
  // Form state
  const [currency, setCurrency] = React.useState<"THB" | "USD">("THB")
  const [transactionType, setTransactionType] = React.useState<"income" | "expense">("expense")
  const [vendor, setVendor] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [transactionDate, setTransactionDate] = React.useState<Date>(new Date())

  React.useEffect(() => {
    const fetchTransaction = async () => {
      if (!id) return
      
      setLoading(true)
      setError(null)
      
      try {
        const data = await getTransactionById(id)
        if (data) {
          setTransaction(data)
          // Populate form with existing data
          setCurrency(data.original_currency === "USD" || data.original_currency === "THB" ? data.original_currency : "THB")
          setTransactionType(data.transaction_type)
          setVendor(data.vendor_id || "")
          setPaymentMethod(data.payment_method_id || "")
          setDescription(data.description || "")
          setAmount(String(data.original_currency === "USD" ? data.amount_usd : data.amount_thb))
          setTransactionDate(parseISO(data.transaction_date))
        } else {
          setError("Transaction not found")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load transaction")
      } finally {
        setLoading(false)
      }
    }

    fetchTransaction()
  }, [id])

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

  const handleSaveChanges = async () => {
    if (!transaction) return
    
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
      
      // Calculate amounts in both currencies
      const isUSD = currency === "USD"
      const amountUSD = isUSD ? parseFloat(amount) : parseFloat(amount) * (1 / exchangeRate)
      const amountTHB = isUSD ? parseFloat(amount) * exchangeRate : parseFloat(amount)

      const updates = {
        description: description.trim(),
        vendor_id: vendor || null,
        payment_method_id: paymentMethod || null,
        amount_usd: Math.round(amountUSD * 100) / 100,
        amount_thb: Math.round(amountTHB * 100) / 100,
        exchange_rate: exchangeRate,
        original_currency: currency,
        transaction_type: transactionType,
        transaction_date: format(transactionDate, "yyyy-MM-dd")
      }

      const result = await updateTransaction(transaction.id, updates)
      
      if (result) {
        toast.success("Transaction updated successfully!")
        navigateToViewTransactionFromEdit(transaction.id, source || undefined)
      } else {
        toast.error("Failed to update transaction")
      }
    } catch (error) {
      toast.error(`Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    if (transaction) {
      toast.info("Changes discarded")
      navigateToViewTransactionFromEdit(transaction.id, source || undefined)
    } else {
      navigateBack()
    }
  }

  if (loading) {
    return (
      <div className="bg-white box-border content-stretch flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-10 relative min-h-screen w-full">
        <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-zinc-950">
          <p className="leading-[36px] whitespace-pre">Edit transaction</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-950 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="bg-white box-border content-stretch flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-10 relative min-h-screen w-full">
        <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-zinc-950">
          <p className="leading-[36px] whitespace-pre">Edit transaction</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-zinc-500">{error || "Transaction not found"}</p>
          <Button
            onClick={navigateBack}
            variant="outline"
            className="mt-4"
          >
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white box-border content-stretch flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-10 relative min-h-screen w-full">
      <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-zinc-950">
        <p className="leading-[36px] whitespace-pre">Edit transaction</p>
      </div>
      
      <div className="content-stretch flex flex-col gap-8 items-start justify-start relative shrink-0 w-full">
        <div className="content-stretch flex flex-col gap-6 items-start justify-start relative shrink-0 w-full">
          {/* Transaction Type Toggle */}
          <div className="content-stretch flex gap-2 items-start justify-start relative shrink-0">
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
          <div className="content-stretch flex flex-col gap-1 items-start justify-start relative shrink-0 w-full">
            <Label className="text-sm font-medium text-zinc-950">Date</Label>
            <DatePicker
              date={transactionDate}
              onDateChange={(date) => date && setTransactionDate(date)}
              placeholder="March 13, 2024"
              className="w-full"
              formatStr="MMMM d, yyyy"
            />
          </div>

          {/* Description Input */}
          <div className="content-stretch flex flex-col gap-1 items-start justify-start relative shrink-0 w-full">
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
          <div className="content-stretch flex flex-col gap-1 items-start justify-start relative shrink-0 w-full">
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
          <div className="content-stretch flex flex-col gap-1 items-start justify-start relative shrink-0 w-full">
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
          <div className="content-stretch flex gap-6 items-center justify-start relative shrink-0 w-full">
            {/* Amount Input */}
            <div className="basis-0 content-stretch flex flex-col gap-1 grow items-start justify-start min-h-px min-w-px relative shrink-0">
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
            <div className="content-stretch flex flex-col gap-1 items-start justify-start relative shrink-0">
              <Label className="text-sm font-medium text-zinc-950">Currency</Label>
              <RadioGroup
                value={currency}
                onValueChange={(value: "THB" | "USD") => setCurrency(value)}
                className="content-stretch flex gap-6 h-10 items-center justify-start relative shrink-0 w-full"
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
        <div className="content-stretch flex flex-col gap-3 items-start justify-start relative shrink-0 w-full">
          <Button
            onClick={handleSaveChanges}
            disabled={saving || navigationPending || !description.trim() || !amount || parseFloat(amount) <= 0}
            className="bg-[#155dfc] box-border content-stretch flex gap-1.5 h-10 items-center justify-center px-6 py-0 relative rounded-[8px] shrink-0 w-full text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
          <Button
            onClick={handleDiscard}
            disabled={saving || navigationPending}
            className="bg-zinc-100 box-border content-stretch flex gap-1.5 h-10 items-center justify-center px-6 py-0 relative rounded-[8px] shrink-0 w-full text-zinc-900 hover:bg-zinc-200"
          >
            Discard
          </Button>
        </div>
      </div>
    </div>
  )
}