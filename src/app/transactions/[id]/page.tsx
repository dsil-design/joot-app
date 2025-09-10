/**
 * FIGMA DESIGN IMPLEMENTATION
 * Design URL: https://www.figma.com/design/sGttHlfcLJEy1pNBgqpEr6/%F0%9F%9A%A7-Transactions?node-id=40000108-2289
 * Node: 40000108:2289 - MASTER - View transaction
 * Fidelity: 100% - No unauthorized additions
 */
"use client"

import * as React from "react"
import { useParams, useSearchParams } from "next/navigation"
import { ArrowLeft, Edit } from "lucide-react"
import { useTransactionFlow } from "@/hooks/useTransactionFlow"
import { useTransactions } from "@/hooks/use-transactions"
import type { TransactionWithVendorAndPayment } from "@/lib/supabase/types"
import { format, parseISO } from "date-fns"

function ArrowLeftIcon() {
  return (
    <div className="relative size-full">
      <ArrowLeft className="absolute inset-0 w-full h-full text-zinc-800" strokeWidth={1.5} />
    </div>
  )
}

function EditIcon() {
  return (
    <div className="relative size-full">
      <Edit className="absolute inset-0 w-full h-full text-zinc-800" strokeWidth={1.5} />
    </div>
  )
}

interface FieldValuePairProps {
  label: string
  value: string
}

function FieldValuePair({ label, value }: FieldValuePairProps) {
  return (
    <div className="content-stretch flex flex-col gap-1 items-start justify-start relative shrink-0">
      <div className="content-stretch flex gap-2 items-center justify-start relative shrink-0">
        <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-zinc-950">
          <p className="leading-[20px] whitespace-pre">{label}</p>
        </div>
      </div>
      <div className="flex flex-col font-normal justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-zinc-950">
        <p className="leading-[20px] whitespace-pre">{value}</p>
      </div>
    </div>
  )
}

export default function ViewTransactionPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id as string
  const source = searchParams?.get('from') as 'home' | 'transactions' | null
  const { navigateBack, navigateToHome, navigateToTransactions, isPending } = useTransactionFlow()
  const { getTransactionById } = useTransactions()
  
  const [transaction, setTransaction] = React.useState<TransactionWithVendorAndPayment | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

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
  }, [id])

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      return format(date, "MMMM d, yyyy")
    } catch {
      return dateString
    }
  }

  const formatAmount = (transaction: TransactionWithVendorAndPayment) => {
    const symbol = transaction.original_currency === "USD" ? "$" : "฿"
    const amount = transaction.original_currency === "USD" 
      ? transaction.amount_usd 
      : transaction.amount_thb
    return `${symbol}${amount.toFixed(2)} ${transaction.original_currency}`
  }

  const handleBackClick = () => {
    if (source === 'home') {
      navigateToHome()
    } else if (source === 'transactions') {
      navigateToTransactions()
    } else {
      navigateBack() // Fallback to browser back
    }
  }

  const handleEditClick = () => {
    if (transaction) {
      const url = `/transactions/${transaction.id}/edit${source ? `?from=${source}` : ''}`
      window.location.href = url // Use direct navigation to preserve source
    }
  }

  if (loading) {
    return (
      <div className="bg-white box-border content-stretch flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-10 relative min-h-screen w-full">
        <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
          <button
            onClick={handleBackClick}
            disabled={isPending}
            className="bg-white content-stretch flex gap-1.5 items-center justify-center relative rounded-[8px] shrink-0 size-10 border border-zinc-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            <div className="relative shrink-0 size-5">
              <ArrowLeftIcon />
            </div>
          </button>
        </div>
        <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-zinc-950">
          <p className="leading-[36px] whitespace-pre">View transaction</p>
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
        <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
          <button
            onClick={handleBackClick}
            disabled={isPending}
            className="bg-white content-stretch flex gap-1.5 items-center justify-center relative rounded-[8px] shrink-0 size-10 border border-zinc-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            <div className="relative shrink-0 size-5">
              <ArrowLeftIcon />
            </div>
          </button>
        </div>
        <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-zinc-950">
          <p className="leading-[36px] whitespace-pre">View transaction</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-zinc-500">{error || "Transaction not found"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white box-border content-stretch flex flex-col gap-6 items-start justify-start pb-0 pt-20 px-10 relative min-h-screen w-full">
      <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
        <button
          onClick={handleBackClick}
          disabled={isPending}
          className="bg-white content-stretch flex gap-1.5 items-center justify-center relative rounded-[8px] shrink-0 size-10 border border-zinc-200 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-zinc-50 transition-colors disabled:opacity-50"
        >
          <div className="relative shrink-0 size-5">
            <ArrowLeftIcon />
          </div>
        </button>
        <button
          onClick={handleEditClick}
          disabled={isPending}
          className="bg-zinc-100 box-border content-stretch flex gap-1.5 h-9 items-center justify-center px-4 py-2 relative rounded-[8px] shrink-0 hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          <div className="relative shrink-0 size-5">
            <EditIcon />
          </div>
          <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-zinc-900">
            <p className="leading-[20px] whitespace-pre">Edit</p>
          </div>
        </button>
      </div>
      <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-nowrap text-zinc-950">
        <p className="leading-[36px] whitespace-pre">View transaction</p>
      </div>
      <div className="content-stretch flex flex-col gap-8 items-start justify-start relative shrink-0 w-full">
        <div className="content-stretch flex flex-col gap-6 items-start justify-start relative shrink-0 w-full">
          <FieldValuePair 
            label="Type" 
            value={transaction.transaction_type === "expense" ? "Expense" : "Income"} 
          />
          <FieldValuePair 
            label="Date" 
            value={formatDate(transaction.transaction_date)} 
          />
          <FieldValuePair 
            label="Description" 
            value={transaction.description || "No description"} 
          />
          <FieldValuePair 
            label="Vendor" 
            value={transaction.vendors?.name || "Unknown"} 
          />
          <FieldValuePair 
            label="Payment method" 
            value={transaction.payment_methods?.name || "Unknown"} 
          />
          <FieldValuePair 
            label="Amount" 
            value={formatAmount(transaction)} 
          />
        </div>
        <div className="h-10 shrink-0 w-full" />
      </div>
    </div>
  )
}