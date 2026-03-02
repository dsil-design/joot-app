"use client"

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * StatCard Component
 *
 * Displays a metric with icon and label.
 * Optionally clickable for filtering interactions.
 */
export function StatCard({
  icon,
  label,
  value,
  isLoading,
  className,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: number
  isLoading?: boolean
  className?: string
  onClick?: () => void
}) {
  const Component = onClick ? "button" : "div"

  return (
    <Component
      className={cn(
        "bg-card rounded-lg border p-4 text-left",
        onClick && "cursor-pointer hover:bg-accent/50 transition-colors"
      )}
      onClick={onClick}
    >
      <div className={cn("flex items-center gap-2 mb-1", className)}>
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      {isLoading ? (
        <Skeleton className="h-7 w-12" />
      ) : (
        <p className="text-2xl font-bold">{value}</p>
      )}
    </Component>
  )
}
