"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

/**
 * MatchCardSkeleton — loading state that mirrors the real card layout.
 */
export function MatchCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("animate-pulse border-2", className)}>
      {/* Header: source badge + confidence badge */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3 w-32 bg-muted rounded" />
          <div className="h-5 w-16 bg-muted rounded-full" />
        </div>
      </CardHeader>

      {/* Body: two-panel comparison */}
      <CardContent className="py-2 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Left panel */}
          <div className="space-y-2">
            <div className="h-2.5 w-20 bg-muted rounded" />
            <div className="h-4 w-28 bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
          {/* Right panel */}
          <div className="space-y-2 md:border-l md:pl-3">
            <div className="h-2.5 w-24 bg-muted rounded" />
            <div className="h-4 w-28 bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
        </div>

        {/* Reasons section */}
        <div className="border-t pt-2 space-y-1">
          <div className="h-2.5 w-20 bg-muted rounded" />
          <div className="h-3 w-full bg-muted rounded" />
          <div className="h-3 w-3/4 bg-muted rounded" />
        </div>
      </CardContent>

      {/* Actions */}
      <CardFooter className="pt-2 gap-2">
        <div className="h-8 w-28 bg-muted rounded" />
        <div className="h-8 w-20 bg-muted rounded" />
      </CardFooter>
    </Card>
  )
}
