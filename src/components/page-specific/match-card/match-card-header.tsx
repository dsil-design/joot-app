"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { File, Mail } from "lucide-react"
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
 * Header row: source badge + confidence badge + optional checkbox
 */
export function MatchCardHeader({
  data,
  config,
  selected,
  callbacks,
}: MatchCardHeaderProps) {
  const isApproved = data.status === "approved" || data.status === "imported"
  const isRejected = data.status === "rejected"
  const isPending = data.status === "pending"

  const isEmail = data.source === "email"
  const isMerged = data.source === "merged"
  const source = data.sourceStatement || data.statementTransaction.sourceFilename
  const SourceIcon = isEmail ? Mail : File

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {/* Source badge */}
        {isMerged ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            <span>+</span>
            <File className="h-3 w-3 shrink-0" />
            <span className="truncate">Cross-Source Match</span>
          </span>
        ) : source && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <SourceIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{source}</span>
          </span>
        )}

        {/* Classification badge for email/merged items */}
        {(isEmail || isMerged) && data.emailMetadata?.classification && data.emailMetadata.classification !== "unknown" && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 capitalize">
            {data.emailMetadata.classification.replace(/_/g, " ")}
          </span>
        )}

        {/* Status badge for resolved items */}
        {isApproved && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            Approved
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

        {/* Selection checkbox */}
        {callbacks.onSelectionChange && isPending && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) =>
              callbacks.onSelectionChange!(data.id, e.target.checked)
            }
            className="h-4 w-4 rounded border-gray-300"
            aria-label="Select for batch action"
          />
        )}
      </div>
    </div>
  )
}
