"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useTransactionFlow } from "@/hooks/useTransactionFlow"

export function ViewAllTransactionsButton() {
  const { navigateToTransactions, isPending } = useTransactionFlow()
  
  return (
    <Button 
      variant="secondary" 
      className="w-full h-9 gap-1.5 px-4 py-2 disabled:opacity-50"
      onClick={navigateToTransactions}
      disabled={isPending}
    >
      <span className="text-sm font-medium text-secondary-foreground leading-5">
        {isPending ? "Loading..." : "View all transactions"}
      </span>
      <ArrowRight className="size-5" />
    </Button>
  )
}