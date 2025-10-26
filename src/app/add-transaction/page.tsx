"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { TransactionForm, type TransactionFormData } from "@/components/forms/transaction-form"
import { useTransactions } from "@/hooks"
import { format } from "date-fns"
import { toast } from "sonner"

export default function AddTransactionPage() {
  const router = useRouter()
  const { createTransaction } = useTransactions()
  const [saving, setSaving] = React.useState(false)

  const handleSave = async (formData: TransactionFormData) => {
    setSaving(true)

    try {
      const transactionData = {
        description: formData.description.trim() || undefined,
        vendorId: formData.vendor || undefined,
        paymentMethodId: formData.paymentMethod || undefined,
        tagIds: formData.tags || undefined,
        amount: parseFloat(formData.amount),
        originalCurrency: formData.currency,
        transactionType: formData.transactionType,
        transactionDate: format(formData.transactionDate, "yyyy-MM-dd")
      }

      const result = await createTransaction(transactionData)

      if (result) {
        toast.success("Transaction saved successfully!")
        router.push("/home")
      } else {
        toast.error("Failed to save transaction")
      }
    } catch (error) {
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndAddAnother = async (formData: TransactionFormData): Promise<boolean> => {
    setSaving(true)

    try {
      const transactionData = {
        description: formData.description.trim() || undefined,
        vendorId: formData.vendor || undefined,
        paymentMethodId: formData.paymentMethod || undefined,
        tagIds: formData.tags || undefined,
        amount: parseFloat(formData.amount),
        originalCurrency: formData.currency,
        transactionType: formData.transactionType,
        transactionDate: format(formData.transactionDate, "yyyy-MM-dd")
      }

      const result = await createTransaction(transactionData)

      if (result) {
        toast.success("Transaction saved successfully!")
        return true
      } else {
        toast.error("Failed to save transaction")
        return false
      }
    } catch (error) {
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    toast.info("Transaction discarded")
    router.back()
  }

  return (
    <div className="bg-white flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-4 sm:px-6 md:px-10 min-h-screen w-full">
      {/* Page Header */}
      <h1 className="text-2xl sm:text-[30px] md:text-[36px] font-medium text-foreground leading-tight">
        Add transaction
      </h1>

      {/* Form */}
      <TransactionForm
        mode="add"
        onSave={handleSave}
        onSaveAndAddAnother={handleSaveAndAddAnother}
        onCancel={handleCancel}
        saving={saving}
        showDateStepper={true}
        useStandardAmountInput={false}
      />
    </div>
  )
}
