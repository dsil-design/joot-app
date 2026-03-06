'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import type { JournalEntry } from '@/hooks/use-ai-journal'

interface AiJournalLogTableProps {
  entries: JournalEntry[]
  total: number
  page: number
  totalPages: number
  isLoading: boolean
  onPageChange: (page: number) => void
}

const invocationBadgeStyles: Record<string, string> = {
  classification_only: 'bg-blue-100 text-blue-700',
  combined_extraction: 'bg-purple-100 text-purple-700',
  fallback_extraction: 'bg-amber-100 text-amber-700',
  reprocess: 'bg-zinc-100 text-zinc-700',
}

function confidenceColor(confidence: number | null): string {
  if (confidence === null) return 'text-zinc-400'
  if (confidence >= 80) return 'text-green-600'
  if (confidence >= 55) return 'text-amber-600'
  return 'text-red-600'
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function AiJournalLogTable({
  entries,
  total,
  page,
  totalPages,
  isLoading,
  onPageChange,
}: AiJournalLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
        <p className="text-sm">No journal entries yet. Process some emails to start logging.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Table header */}
      <div className="hidden md:grid md:grid-cols-[2rem_1fr_1fr_8rem_6rem_5rem_5rem] gap-2 px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        <div />
        <div>Subject / Sender</div>
        <div>Classification</div>
        <div>Type</div>
        <div>Parser</div>
        <div>Conf.</div>
        <div>Time</div>
      </div>

      {/* Entries */}
      {entries.map((entry) => {
        const isExpanded = expandedId === entry.id

        return (
          <div key={entry.id} className="border rounded-lg bg-white">
            {/* Row */}
            <button
              className="w-full grid grid-cols-[2rem_1fr] md:grid-cols-[2rem_1fr_1fr_8rem_6rem_5rem_5rem] gap-2 items-center px-3 py-2.5 text-sm text-left hover:bg-zinc-50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
            >
              <div className="text-zinc-400">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>

              {/* Subject / Sender */}
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900">
                  {entry.subject || '(no subject)'}
                </p>
                <p className="truncate text-xs text-zinc-500 md:hidden">
                  {entry.from_address || 'unknown'} &middot;{' '}
                  {new Date(entry.created_at).toLocaleString()}
                </p>
                <p className="hidden md:block truncate text-xs text-zinc-500">
                  {entry.from_address || 'unknown'}
                </p>
              </div>

              {/* Classification */}
              <div className="hidden md:block">
                {entry.ai_classification ? (
                  <Badge variant="outline" className="text-xs">
                    {entry.ai_classification.replace(/_/g, ' ')}
                  </Badge>
                ) : (
                  <span className="text-xs text-zinc-400">-</span>
                )}
              </div>

              {/* Invocation type */}
              <div className="hidden md:block">
                <Badge
                  variant="outline"
                  className={`text-xs ${invocationBadgeStyles[entry.invocation_type] || ''}`}
                >
                  {entry.invocation_type.replace(/_/g, ' ')}
                </Badge>
              </div>

              {/* Parser */}
              <div className="hidden md:block text-xs text-zinc-600 truncate">
                {entry.final_parser_key || '-'}
              </div>

              {/* Confidence */}
              <div className={`hidden md:block text-xs font-medium ${confidenceColor(entry.final_confidence)}`}>
                {entry.final_confidence !== null ? `${entry.final_confidence}%` : '-'}
              </div>

              {/* Duration */}
              <div className="hidden md:block text-xs text-zinc-500">
                {formatDuration(entry.duration_ms)}
              </div>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="border-t px-4 py-3 bg-zinc-50 text-sm space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Detail label="Date" value={entry.email_date ? new Date(entry.email_date).toLocaleString() : '-'} />
                  <Detail label="Status" value={entry.final_status || '-'} />
                  <Detail label="Tokens" value={entry.prompt_tokens !== null ? `${entry.prompt_tokens} / ${entry.response_tokens}` : '-'} />
                  <Detail label="Feedback examples" value={String(entry.feedback_examples_used)} />
                </div>

                {entry.ai_extracted_vendor && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Detail label="Vendor" value={entry.ai_extracted_vendor} />
                    <Detail label="Amount" value={entry.ai_extracted_amount !== null ? `${entry.ai_extracted_amount} ${entry.ai_extracted_currency || ''}` : '-'} />
                    <Detail label="Tx Date" value={entry.ai_extracted_date || '-'} />
                    <Detail label="Skip" value={entry.ai_suggested_skip ? 'Yes' : 'No'} />
                  </div>
                )}

                {entry.regex_parser_attempted && (
                  <div className="grid grid-cols-2 gap-3">
                    <Detail label="Regex parser" value={entry.regex_parser_attempted} />
                    <Detail label="Regex success" value={entry.regex_extraction_success ? 'Yes' : 'No'} />
                  </div>
                )}

                {entry.ai_reasoning && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1">AI Reasoning</p>
                    <p className="text-xs text-zinc-700 bg-white rounded p-2 border">
                      {entry.ai_reasoning}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-500">
            {total} entries
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(1)}
              disabled={page <= 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-zinc-500 px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="text-xs text-zinc-700">{value}</p>
    </div>
  )
}
