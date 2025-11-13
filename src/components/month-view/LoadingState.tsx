"use client"

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface LoadingStateProps {
  variant?: "cards" | "list" | "summary"
  count?: number
  className?: string
}

/**
 * Loading state with skeleton animations
 * Matches layout of actual components
 */
export function LoadingState({
  variant = "list",
  count = 3,
  className,
}: LoadingStateProps) {
  switch (variant) {
    case "cards":
      return <SummaryCardsLoading className={className} />
    case "summary":
      return <SummaryCardsLoading className={className} />
    case "list":
      return <ExpectedTransactionListLoading count={count} className={className} />
    default:
      return <ExpectedTransactionListLoading count={count} className={className} />
  }
}

/**
 * Loading state for summary cards
 */
function SummaryCardsLoading({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="size-4 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <Skeleton className="h-8 w-32 mb-3" />
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Loading state for expected transaction list
 */
function ExpectedTransactionListLoading({
  count,
  className,
}: {
  count: number
  className?: string
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-zinc-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>

                {/* Amounts */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-2 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>

              {/* Actions */}
              <Skeleton className="size-8 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Week group loading skeleton
 */
export function WeekGroupLoading({ className }: { className?: string }) {
  return (
    <div className={cn("border-b border-zinc-200", className)}>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-4 rounded" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  )
}

/**
 * Full month view loading state
 */
export function MonthViewLoading({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCardsLoading />

      {/* Week Groups */}
      <div className="border rounded-lg overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <WeekGroupLoading key={i} />
        ))}
      </div>
    </div>
  )
}
