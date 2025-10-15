"use client"

import { TransactionCard } from "@/components/ui/transaction-card"
import { useTransactionFlow } from "@/hooks/useTransactionFlow"
import type { TransactionWithVendorAndPayment } from "@/lib/supabase/types"
import { formatTransactionDateLabel } from "@/lib/utils/date-formatter"

interface TransactionCardProps {
  transaction: TransactionWithVendorAndPayment
  viewMode: "recorded" | "all-usd" | "all-thb"
}

function TransactionCardComponent({ transaction, viewMode }: TransactionCardProps) {
  const { navigateToViewTransaction } = useTransactionFlow()

  return (
    <TransactionCard
      transaction={transaction}
      viewMode={viewMode}
      interactive={true}
      onClick={() => navigateToViewTransaction(transaction.id, 'transactions')}
    />
  )
}

interface TransactionGroupProps {
  date: string
  transactions: TransactionWithVendorAndPayment[]
  viewMode: "recorded" | "all-usd" | "all-thb"
}

export function TransactionGroup({ date, transactions, viewMode }: TransactionGroupProps) {
  return (
    <>
      <div className="flex flex-col font-medium justify-center leading-[0] not-italic relative shrink-0 text-black text-[20px] text-nowrap">
        <p className="leading-[28px] whitespace-pre">{formatTransactionDateLabel(date)}</p>
      </div>
      <div className="content-stretch flex flex-col gap-3 items-start justify-start relative shrink-0 w-full">
        {transactions.map((transaction) => (
          <TransactionCardComponent key={transaction.id} transaction={transaction} viewMode={viewMode} />
        ))}
      </div>
    </>
  )
}