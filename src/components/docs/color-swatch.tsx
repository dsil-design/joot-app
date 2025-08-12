"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

interface ColorSwatchProps {
  name: string
  value: string
  cssVar: string
  description?: string
}

export function ColorSwatch({ name, value, cssVar, description }: ColorSwatchProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <div className="space-y-2">
      <div 
        className="h-20 w-full rounded-lg border border-border cursor-pointer hover:ring-2 hover:ring-ring/50 transition-all"
        style={{ backgroundColor: `var(${cssVar})` }}
        onClick={() => copyToClipboard(cssVar)}
      />
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{name}</h3>
          <button
            onClick={() => copyToClipboard(cssVar)}
            className={cn(
              "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors",
              copied && "text-green-600"
            )}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {cssVar}
          </button>
        </div>
        <div className="text-xs text-muted-foreground">{value}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </div>
    </div>
  )
}