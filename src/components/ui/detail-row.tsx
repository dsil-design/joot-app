import * as React from "react"

interface DetailRowProps {
  icon?: React.ReactNode
  label: string
  value: React.ReactNode
}

export function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
      <span className="text-muted-foreground shrink-0 w-20">{label}</span>
      <span className="font-medium break-words min-w-0">{value}</span>
    </div>
  )
}
