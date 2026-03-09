"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, Copy, ExternalLink, Eye, Mail, Unlink } from "lucide-react"
import { format, parseISO } from "date-fns"
import { EmailViewerModal } from "./email-viewer-modal"

export interface EmailSourceCardData {
  id: string
  subject: string | null
  from_address: string | null
  from_name: string | null
  email_date: string | null
  extraction_confidence: number | null
  match_confidence: number | null
  match_method: string | null
  status: string
}

function MatchMethodBadge({ method, status }: { method: string | null; status: string | null }) {
  if (status === "imported") {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-0 text-[12px] font-normal">
        Created from email
      </Badge>
    )
  }
  if (method === "auto") {
    return (
      <Badge className="bg-green-100 text-green-700 border-0 text-[12px] font-normal">
        Auto-linked
      </Badge>
    )
  }
  if (method === "manual") {
    return (
      <Badge className="bg-gray-100 text-gray-500 border-0 text-[12px] font-normal">
        Manually linked
      </Badge>
    )
  }
  return null
}

export function EmailSourceCard({ source, onUnlink }: { source: EmailSourceCardData; onUnlink?: () => void }) {
  const [viewerOpen, setViewerOpen] = React.useState(false)

  const formattedDate = source.email_date
    ? format(parseISO(source.email_date), "MMM d, yyyy")
    : null

  const fromLine = source.from_name
    ? `${source.from_name} <${source.from_address}>`
    : source.from_address

  return (
    <>
      <div className="bg-zinc-50 rounded-lg border border-zinc-200 p-4 w-full text-left">
        <div className="flex items-start gap-3">
          <Mail className="size-4 text-zinc-400 mt-0.5 shrink-0" strokeWidth={1.5} />
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <p className="text-[14px] font-normal text-zinc-950 truncate">
              {source.subject || "No subject"}
            </p>
            {fromLine && (
              <p className="text-[14px] font-normal text-zinc-500 truncate">
                {fromLine}
              </p>
            )}
            {formattedDate && (
              <p className="text-[14px] font-normal text-zinc-500">
                {formattedDate}
              </p>
            )}
            {source.extraction_confidence !== null && (
              <p className="text-[14px] font-normal text-zinc-500">
                {source.extraction_confidence}% extraction confidence
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <MatchMethodBadge method={source.match_method} status={source.status} />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-900"
                onClick={() => setViewerOpen(true)}
              >
                <Eye className="size-3.5 mr-1" />
                View Email
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-900"
                asChild
              >
                <a
                  href={`/imports/emails?search=${encodeURIComponent(source.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-3.5 mr-1" />
                  Open in Email Hub
                </a>
              </Button>
              {onUnlink && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-zinc-500 hover:text-destructive"
                  onClick={onUnlink}
                >
                  <Unlink className="size-3.5 mr-1" />
                  Unlink
                </Button>
              )}
            </div>
            <CopyableEmailId id={source.id} />
          </div>
        </div>
      </div>

      <EmailViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        emailId={source.id}
        subject={source.subject}
        fromName={source.from_name}
        fromAddress={source.from_address}
        emailDate={source.email_date}
      />
    </>
  )
}

function CopyableEmailId({ id }: { id: string }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className="text-[12px] text-zinc-400 font-mono truncate">{id}</span>
      <button
        onClick={handleCopy}
        className="text-zinc-400 hover:text-zinc-700 transition-colors p-0.5 shrink-0"
        aria-label="Copy email ID"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}
