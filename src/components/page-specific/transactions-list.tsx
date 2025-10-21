"use client"

import { TransactionCard } from "@/components/ui/transaction-card"
import { useTransactionFlow } from "@/hooks/useTransactionFlow"
import type { TransactionWithVendorAndPayment } from "@/lib/supabase/types"
import { formatTransactionDateLabel } from "@/lib/utils/date-formatter"

interface TransactionCardProps {
  transaction: TransactionWithVendorAndPayment
  viewMode: "recorded" | "all-usd" | "all-thb"
  isMobile: boolean
  onEditTransaction?: (transaction: TransactionWithVendorAndPayment) => void
}

function TransactionCardComponent({ transaction, viewMode, isMobile, onEditTransaction }: TransactionCardProps) {
  const { navigateToViewTransaction } = useTransactionFlow()

  const handleClick = () => {
    if (isMobile) {
      // On mobile, navigate to detail view
      navigateToViewTransaction(transaction.id, 'transactions')
    } else {
      // On desktop, open edit modal
      onEditTransaction?.(transaction)
    }
  }

  return (
    <TransactionCard
      transaction={transaction}
      viewMode={viewMode}
      interactive={true}
      onClick={handleClick}
    />
  )
}

interface TransactionGroupProps {
  date: string
  transactions: TransactionWithVendorAndPayment[]
  viewMode: "recorded" | "all-usd" | "all-thb"
  isMobile: boolean
  onEditTransaction?: (transaction: TransactionWithVendorAndPayment) => void
}

export function TransactionGroup({ date, transactions, viewMode, isMobile, onEditTransaction }: TransactionGroupProps) {
  return (
    <>
      <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-black text-[20px] text-nowrap">
        <p className="leading-[28px] whitespace-pre">{formatTransactionDateLabel(date)}</p>
      </div>
      <div className="content-stretch flex flex-col gap-3 items-start justify-start relative shrink-0 w-full">
        {transactions.map((transaction) => (
          <TransactionCardComponent
            key={transaction.id}
            transaction={transaction}
            viewMode={viewMode}
            isMobile={isMobile}
            onEditTransaction={onEditTransaction}
          />
        ))}
      </div>
    </>
  )
}