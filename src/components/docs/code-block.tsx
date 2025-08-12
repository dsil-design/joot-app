"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CodeBlockProps {
  code: string
  language?: string
  title?: string
  showLineNumbers?: boolean
}

export function CodeBlock({ code, language = "tsx", title, showLineNumbers = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <div className="relative rounded-lg border bg-muted/30">
      {title && (
        <div className="border-b px-4 py-2">
          <p className="text-sm font-medium">{title}</p>
        </div>
      )}
      <div className="relative">
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-2 top-2 h-8 w-8"
          onClick={copyToClipboard}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        <pre className={cn("overflow-x-auto p-4 pr-12 text-sm", showLineNumbers && "pl-12")}>
          <code className={`language-${language}`}>{code}</code>
        </pre>
        {showLineNumbers && (
          <div className="absolute left-0 top-0 flex flex-col border-r bg-muted/50 p-4 text-xs text-muted-foreground">
            {code.split('\n').map((_, index) => (
              <span key={index} className="leading-5">
                {index + 1}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}