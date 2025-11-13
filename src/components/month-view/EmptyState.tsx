"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Calendar, FileText, Plus } from "lucide-react"

export interface EmptyStateProps {
  variant?: "no-templates" | "no-expected-transactions" | "no-month-plan"
  onAction?: () => void
  actionLabel?: string
  className?: string
}

/**
 * Empty state component for various scenarios
 */
export function EmptyState({
  variant = "no-expected-transactions",
  onAction,
  actionLabel,
  className,
}: EmptyStateProps) {
  const config = getEmptyStateConfig(variant)

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="mb-4 rounded-full bg-zinc-100 p-3">
        <config.icon className="size-8 text-zinc-400" />
      </div>

      <h3 className="text-lg font-semibold text-zinc-900 mb-2">{config.title}</h3>
      <p className="text-sm text-zinc-500 max-w-md mb-6">{config.description}</p>

      {onAction && (
        <Button onClick={onAction} size="lg">
          <Plus className="size-4 mr-2" />
          {actionLabel || config.defaultActionLabel}
        </Button>
      )}

      {config.helpText && (
        <div className="mt-6 text-xs text-zinc-400 max-w-lg">
          {config.helpText}
        </div>
      )}
    </div>
  )
}

interface EmptyStateConfig {
  icon: React.ElementType
  title: string
  description: string
  defaultActionLabel: string
  helpText?: string
}

function getEmptyStateConfig(
  variant: "no-templates" | "no-expected-transactions" | "no-month-plan"
): EmptyStateConfig {
  switch (variant) {
    case "no-templates":
      return {
        icon: FileText,
        title: "No Templates Yet",
        description:
          "Templates help you track recurring expenses and income. Create your first template to get started with month planning.",
        defaultActionLabel: "Create Template",
        helpText:
          "Examples: Rent, Netflix subscription, monthly salary, utility bills. Templates automatically generate expected transactions each month.",
      }
    case "no-expected-transactions":
      return {
        icon: Calendar,
        title: "No Expected Transactions",
        description:
          "This month doesn't have any expected transactions yet. Generate them from your templates or add them manually.",
        defaultActionLabel: "Generate from Templates",
        helpText:
          "Expected transactions help you plan your month and track variances between what you expected to spend and what you actually spent.",
      }
    case "no-month-plan":
      return {
        icon: Calendar,
        title: "No Month Plan",
        description:
          "Create a month plan to start tracking expected vs actual expenses for this month.",
        defaultActionLabel: "Create Month Plan",
      }
    default:
      return {
        icon: Calendar,
        title: "No Data",
        description: "There's nothing here yet.",
        defaultActionLabel: "Get Started",
      }
  }
}
