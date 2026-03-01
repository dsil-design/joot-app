import * as React from "react"
import { cn } from "@/lib/utils"

interface TransactionDetailRowProps {
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}

/**
 * A single icon + content row used inside match cards
 * and transaction detail displays.
 */
export function TransactionDetailRow({
  icon,
  children,
  className,
}: TransactionDetailRowProps) {
  return (
    <div className={cn("flex items-center gap-1.5 text-sm min-w-0", className)}>
      <span className="text-muted-foreground shrink-0">{icon}</span>
      {children}
    </div>
  )
}
