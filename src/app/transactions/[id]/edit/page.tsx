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
import { TransactionForm, type TransactionFormData } from "@/components/forms/transaction-form"
import { useTransactionFlow } from "@/hooks/useTransactionFlow"
import { useTransactions } from "@/hooks"
import type { TransactionWithVendorAndPayment } from "@/lib/supabase/types"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"

export default function EditTransactionPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id as string
  const source = searchParams?.get('from') as 'home' | 'transactions' | null
  const { navigateBack, navigateToViewTransactionFromEdit, isPending: navigationPending } = useTransactionFlow()
  const { getTransactionById, updateTransaction, updateTransactionTags } = useTransactions()

  const [transaction, setTransaction] = React.useState<TransactionWithVendorAndPayment | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    const fetchTransaction = async () => {
      if (!id) return

      setLoading(true)
      setError(null)

      try {
        const data = await getTransactionById(id)
        if (data) {
          setTransaction(data)
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
  }, [id, getTransactionById])

  const handleSave = async (formData: TransactionFormData) => {
    if (!transaction) return

    setSaving(true)

    try {
      const transactionDateStr = format(formData.transactionDate, "yyyy-MM-dd")

      const updates = {
        description: formData.description.trim(),
        vendor_id: formData.vendor || null,
        payment_method_id: formData.paymentMethod || null,
        amount: Math.round(parseFloat(formData.amount) * 100) / 100,
        original_currency: formData.currency,
        transaction_type: formData.transactionType,
        transaction_date: transactionDateStr
      }

      const result = await updateTransaction(transaction.id, updates)

      if (result) {
        // Update tags separately
        await updateTransactionTags(transaction.id, formData.tags || [])

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

  const handleCancel = () => {
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

  // Prepare initial form data from transaction
  const initialFormData: Partial<TransactionFormData> = {
    currency: transaction.original_currency === "USD" || transaction.original_currency === "THB"
      ? transaction.original_currency
      : "THB",
    transactionType: transaction.transaction_type,
    vendor: transaction.vendor_id || undefined,
    paymentMethod: transaction.payment_method_id || undefined,
    tags: transaction.tags?.map(tag => tag.id) || [],
    description: transaction.description || "",
    amount: String(transaction.amount),
    transactionDate: parseISO(transaction.transaction_date)
  }

  return (
    <div className="bg-white box-border content-stretch flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-10 relative min-h-screen w-full">
      <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-zinc-950">
        <p className="leading-[36px] whitespace-pre">Edit transaction</p>
      </div>

      <TransactionForm
        mode="edit"
        initialData={initialFormData}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving || navigationPending}
        showDateStepper={false}
        useStandardAmountInput={true}
      />
    </div>
  )
}
