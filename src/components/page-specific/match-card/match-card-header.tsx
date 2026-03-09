"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { File, Mail, GitMerge } from "lucide-react"
import { getParserTag } from "@/lib/utils/parser-tags"
import type { MatchCardData, MatchCardVariant, VariantConfig, MatchCardCallbacks } from "./types"

/**
 * Confidence dots visualization
 */
function ConfidenceDots({ score }: { score: number }) {
  const filled = Math.round(score / 20)
  return (
    <span className="inline-flex gap-0.5" aria-label={`${score}% confidence`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            i < filled ? "bg-current" : "bg-current opacity-25"
          )}
        />
      ))}
    </span>
  )
}

interface MatchCardHeaderProps {
  data: MatchCardData
  variant: MatchCardVariant
  config: VariantConfig
  selected: boolean
  callbacks: MatchCardCallbacks
}

/**
 * Header row: source badge + confidence badge
 */
export function MatchCardHeader({
  data,
  config,
}: MatchCardHeaderProps) {
  const isApproved = data.status === "approved" || data.status === "imported"
  const isRejected = data.status === "rejected"
  const isEmail = data.source === "email"
  const isMerged = data.source === "merged"

  const source = data.sourceStatement || data.statementTransaction.sourceFilename
  const parserTag = (isEmail || isMerged)
    ? getParserTag(data.emailMetadata?.fromAddress ?? data.mergedEmailData?.metadata.fromAddress, data.emailMetadata?.parserKey ?? data.mergedEmailData?.metadata.parserKey)
    : null

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {/* Source provenance pill */}
        {data.source === "merged" ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
            <GitMerge className="h-3 w-3 shrink-0" />
            Cross-Source
          </span>
        ) : data.source === "email" ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">
            <Mail className="h-3 w-3 shrink-0" />
            Email Only
          </span>
        ) : source ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            <File className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[140px]">{source}</span>
            <span>Only</span>
          </span>
        ) : null}

        {/* Parser tag (Grab, Bolt, etc.) */}
        {parserTag && (
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0", parserTag.className)}>
            {parserTag.label}
          </span>
        )}

        {/* Status badge for resolved items */}
        {isApproved && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            Linked
          </span>
        )}
        {isRejected && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            Skipped
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Confidence badge */}
        {!data.isNew && (
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full",
              config.bgColor,
              config.labelColor
            )}
          >
            {data.confidence}%
            <ConfidenceDots score={data.confidence} />
          </span>
        )}
        {data.isNew && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              config.bgColor,
              config.labelColor
            )}
          >
            {config.label}
          </span>
        )}
      </div>
    </div>
  )
}
