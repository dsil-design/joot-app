"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Check, Clock, XCircle, AlertTriangle, MinusCircle, CheckCircle } from "lucide-react"
import type { ExpectedTransactionStatus } from "@/lib/types/recurring-transactions"

export interface StatusBadgeProps {
  status: ExpectedTransactionStatus | "fulfilled" | "variance"
  className?: string
  showIcon?: boolean
  size?: "sm" | "md" | "lg"
}

/**
 * Status badge component for expected transactions
 * 6 variants: matched, variance, pending, overdue, skipped, fulfilled
 */
export function StatusBadge({
  status,
  className,
  showIcon = true,
  size = "md",
}: StatusBadgeProps) {
  const config = getStatusConfig(status)

  return (
    <Badge
      className={cn(
        config.className,
        size === "sm" && "text-[10px] px-1.5 py-0",
        size === "md" && "text-xs px-2 py-0.5",
        size === "lg" && "text-sm px-2.5 py-1",
        className
      )}
    >
      {showIcon && config.icon && (
        <config.icon className={cn(
          size === "sm" && "size-2.5",
          size === "md" && "size-3",
          size === "lg" && "size-3.5",
          "mr-1"
        )} />
      )}
      {config.label}
    </Badge>
  )
}

interface StatusConfig {
  label: string
  icon: React.ElementType | null
  className: string
}

function getStatusConfig(
  status: ExpectedTransactionStatus | "fulfilled" | "variance"
): StatusConfig {
  switch (status) {
    case "matched":
      return {
        label: "Matched",
        icon: Check,
        className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100/80",
      }
    case "variance":
      return {
        label: "Variance",
        icon: AlertTriangle,
        className: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100/80",
      }
    case "pending":
      return {
        label: "Pending",
        icon: Clock,
        className: "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-100/80",
      }
    case "overdue":
      return {
        label: "Overdue",
        icon: XCircle,
        className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100/80",
      }
    case "skipped":
      return {
        label: "Skipped",
        icon: MinusCircle,
        className: "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-100/80",
      }
    case "fulfilled":
      return {
        label: "Fulfilled",
        icon: CheckCircle,
        className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100/80",
      }
    default:
      return {
        label: "Unknown",
        icon: null,
        className: "bg-zinc-100 text-zinc-700 border-zinc-200",
      }
  }
}
