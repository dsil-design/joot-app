"use client"

import { TransactionCard } from "@/components/ui/transaction-card"
import { useTransactionFlow } from "@/hooks/useTransactionFlow"
import type { TransactionWithVendorAndPayment } from "@/lib/supabase/types"

interface HomeTransactionListProps {
  transactionGroups: { [key: string]: TransactionWithVendorAndPayment[] }
}

export function HomeTransactionList({ transactionGroups }: HomeTransactionListProps) {
  const { navigateToViewTransaction } = useTransactionFlow()

  return (
    <div className="flex flex-col gap-4 w-full">
      {Object.keys(transactionGroups).length > 0 ? (
        Object.entries(transactionGroups).map(([dayLabel, dayTransactions]) => (
          <div key={dayLabel} className="flex flex-col gap-2 items-start justify-start w-full">
            <div className="text-[12px] font-light text-muted-foreground leading-4">
              {dayLabel}
            </div>
            <div className="flex flex-col gap-0 w-full">
              {dayTransactions.map((transaction, index) => (
                <div key={transaction.id} className={index > 0 ? "mt-2" : ""}>
                  <TransactionCard 
                    transaction={transaction as TransactionWithVendorAndPayment}
                    viewMode="recorded"
                    interactive={true}
                    onClick={() => navigateToViewTransaction(transaction.id, 'home')}
                  />
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No transactions yet. Add your first transaction!
        </div>
      )}
    </div>
  )
}