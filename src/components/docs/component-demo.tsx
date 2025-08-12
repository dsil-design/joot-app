"use client"

import { cn } from "@/lib/utils"

interface ComponentDemoProps {
  children: React.ReactNode
  className?: string
  description?: string
}

export function ComponentDemo({ children, className, description }: ComponentDemoProps) {
  return (
    <div className="relative rounded-lg border bg-background">
      {description && (
        <div className="border-b px-4 py-3">
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      )}
      <div className={cn("flex items-center justify-center p-6", className)}>
        {children}
      </div>
    </div>
  )
}