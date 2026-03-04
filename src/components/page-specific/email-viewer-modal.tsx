"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { AlertCircle, Columns2, Square, RectangleHorizontal } from "lucide-react"

const STORAGE_KEY = "joot-email-viewer-width"

type WidthPreset = "compact" | "standard" | "wide"

const WIDTH_CLASSES: Record<WidthPreset, string> = {
  compact: "sm:max-w-2xl",
  standard: "sm:max-w-4xl",
  wide: "sm:max-w-6xl",
}

function getStoredWidth(): WidthPreset {
  if (typeof window === "undefined") return "standard"
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "compact" || stored === "standard" || stored === "wide") return stored
  return "standard"
}

interface EmailViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  emailId: string
  subject: string | null
  fromName: string | null
  fromAddress: string | null
  emailDate: string | null
}

export function EmailViewerModal({
  open,
  onOpenChange,
  emailId,
  subject,
  fromName,
  fromAddress,
  emailDate,
}: EmailViewerModalProps) {
  const [htmlBody, setHtmlBody] = React.useState<string | null>(null)
  const [textBody, setTextBody] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [widthPreset, setWidthPreset] = React.useState<WidthPreset>("standard")

  // Load persisted width preference on mount
  React.useEffect(() => {
    setWidthPreset(getStoredWidth())
  }, [])

  function handleWidthChange(value: string) {
    if (!value) return
    const preset = value as WidthPreset
    setWidthPreset(preset)
    localStorage.setItem(STORAGE_KEY, preset)
  }

  React.useEffect(() => {
    if (!open) {
      setHtmlBody(null)
      setTextBody(null)
      setError(null)
      return
    }

    let cancelled = false

    async function fetchEmail() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/emails/${emailId}`)
        if (!response.ok) throw new Error("Failed to fetch email")

        const data = await response.json()
        if (!cancelled) {
          setHtmlBody(data.email?.html_body ?? null)
          setTextBody(data.email?.text_body ?? null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error")
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchEmail()
    return () => { cancelled = true }
  }, [open, emailId])

  const hasBoth = htmlBody && textBody
  const hasNeither = !htmlBody && !textBody && !isLoading && !error

  const formattedDate = emailDate
    ? new Date(emailDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${WIDTH_CLASSES[widthPreset]} max-h-[90vh] flex flex-col p-0 gap-0 transition-[max-width] duration-200`}>
        {/* Header */}
        <DialogHeader className="border-b shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4 pr-8">
            <DialogTitle className="text-base leading-snug">
              {subject || "No subject"}
            </DialogTitle>
            <ToggleGroup
              type="single"
              value={widthPreset}
              onValueChange={handleWidthChange}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              <ToggleGroupItem value="compact" aria-label="Compact width" title="Compact">
                <Columns2 className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="standard" aria-label="Standard width" title="Standard">
                <Square className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="wide" aria-label="Wide width" title="Wide">
                <RectangleHorizontal className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{fromName || fromAddress || "Unknown sender"}</span>
              {fromName && fromAddress && (
                <span className="text-xs">&lt;{fromAddress}&gt;</span>
              )}
              {formattedDate && <span>{formattedDate}</span>}
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        {isLoading ? (
          <div className="flex-1 px-6 py-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="flex-1 px-6 py-4 flex flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null)
                setIsLoading(true)
                fetch(`/api/emails/${emailId}`)
                  .then((r) => {
                    if (!r.ok) throw new Error("Failed to fetch email")
                    return r.json()
                  })
                  .then((data) => {
                    setHtmlBody(data.email?.html_body ?? null)
                    setTextBody(data.email?.text_body ?? null)
                  })
                  .catch((err) =>
                    setError(err instanceof Error ? err.message : "Unknown error")
                  )
                  .finally(() => setIsLoading(false))
              }}
            >
              Retry
            </Button>
          </div>
        ) : hasNeither ? (
          <div className="flex-1 px-6 py-4 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Email body not available
            </p>
          </div>
        ) : hasBoth ? (
          <Tabs defaultValue="html" className="flex-1 overflow-hidden flex flex-col">
            <div className="px-6 pt-3">
              <TabsList>
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="text">Plain Text</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="html" className="flex-1 overflow-hidden px-6 py-4">
              <iframe
                srcDoc={htmlBody}
                sandbox=""
                className="w-full h-[60vh] border-0 rounded bg-white"
                title="Email content"
              />
            </TabsContent>
            <TabsContent value="text" className="flex-1 overflow-hidden px-6 py-4">
              <div className="whitespace-pre-wrap font-mono text-sm max-h-[60vh] overflow-y-auto">
                {textBody}
              </div>
            </TabsContent>
          </Tabs>
        ) : htmlBody ? (
          <div className="flex-1 overflow-hidden px-6 py-4">
            <iframe
              srcDoc={htmlBody}
              sandbox=""
              className="w-full h-[60vh] border-0 rounded bg-white"
              title="Email content"
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden px-6 py-4">
            <div className="whitespace-pre-wrap font-mono text-sm max-h-[60vh] overflow-y-auto">
              {textBody}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
