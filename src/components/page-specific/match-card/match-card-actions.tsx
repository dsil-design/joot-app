"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Check,
  X,
  Link as LinkIcon,
  Plus,
  Loader2,
  Zap,
  Eye,
  Sparkles,
} from "lucide-react"
import type { MatchCardVariant, MatchCardCallbacks } from "./types"
import type { TransactionProposal } from "@/lib/proposals/types"

type CallbackKey = keyof Pick<
  MatchCardCallbacks,
  "onApprove" | "onReject" | "onLinkManually" | "onCreateAsNew" | "onQuickCreate"
>

interface ActionDescriptor {
  id: string
  label: string
  icon: React.ReactNode
  buttonVariant: "default" | "outline" | "ghost"
  className?: string
  callbackKey: CallbackKey
  isPrimary?: boolean
}

const APPROVE: ActionDescriptor = {
  id: "approve",
  label: "Link",
  icon: <Check className="h-4 w-4" />,
  buttonVariant: "default",
  callbackKey: "onApprove",
  isPrimary: true,
}

const REJECT: ActionDescriptor = {
  id: "reject",
  label: "Reject",
  icon: <X className="h-4 w-4" />,
  buttonVariant: "outline",
  callbackKey: "onReject",
}

const CREATE_AS_NEW: ActionDescriptor = {
  id: "createAsNew",
  label: "Create as New",
  icon: <Plus className="h-4 w-4" />,
  buttonVariant: "default",
  callbackKey: "onCreateAsNew",
  isPrimary: true,
}

const LINK: ActionDescriptor = {
  id: "link",
  label: "Link to Existing",
  icon: <LinkIcon className="h-4 w-4" />,
  buttonVariant: "outline",
  callbackKey: "onLinkManually",
}

const SKIP: ActionDescriptor = {
  id: "skip",
  label: "Skip",
  icon: <X className="h-4 w-4" />,
  buttonVariant: "ghost",
  callbackKey: "onReject",
}

const VARIANT_ACTIONS: Record<MatchCardVariant | "merged-match-with-link", ActionDescriptor[]> = {
  "high-confidence": [
    { ...APPROVE, className: "bg-green-600 hover:bg-green-700" },
    REJECT,
  ],
  "review-needed": [
    { ...APPROVE, className: "bg-amber-600 hover:bg-amber-700" },
    {
      ...CREATE_AS_NEW,
      buttonVariant: "outline",
      isPrimary: false,
    },
    { ...LINK, label: "Link to Other" },
    SKIP,
  ],
  "low-confidence": [
    { ...CREATE_AS_NEW, className: "bg-orange-600 hover:bg-orange-700" },
    LINK,
    SKIP,
  ],
  "new-transaction": [
    { ...CREATE_AS_NEW, className: "bg-purple-600 hover:bg-purple-700" },
    LINK,
    SKIP,
  ],
  "merged-match": [
    { ...CREATE_AS_NEW, label: "Link & Create", className: "bg-blue-600 hover:bg-blue-700" },
    LINK,
    SKIP,
  ],
  "merged-match-with-link": [
    { ...APPROVE, label: "Link to Match", className: "bg-green-600 hover:bg-green-700" },
    { ...CREATE_AS_NEW, label: "Link & Create", buttonVariant: "outline", isPrimary: false },
    { ...LINK, label: "Link to Other" },
    SKIP,
  ],
}

interface MatchCardActionsProps {
  id: string
  variant: MatchCardVariant
  status: "pending" | "approved" | "rejected" | "imported"
  loading: boolean
  callbacks: MatchCardCallbacks
  hasMatchedTransaction?: boolean
  proposal?: TransactionProposal
  proposalModified?: boolean
}

/**
 * Config-driven action buttons per variant.
 * Renders the correct button set based on variant + status.
 */
export function MatchCardActions({
  id,
  variant,
  status,
  loading,
  callbacks,
  hasMatchedTransaction,
  proposal,
  proposalModified,
}: MatchCardActionsProps) {
  const isPending = status === "pending"
  const isApproved = status === "approved" || status === "imported"
  const isRejected = status === "rejected"

  if (isPending) {
    // Proposal-aware action buttons for new/unmatched items
    const isNewWithProposal = (variant === "new-transaction" || (variant === "merged-match" && !hasMatchedTransaction)) && proposal
    if (isNewWithProposal) {
      const confidence = proposal.overallConfidence
      return (
        <>
          {confidence >= 85 && (
            <Button
              size="sm"
              variant="default"
              onClick={() => callbacks.onQuickCreate?.(id)}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" aria-hidden="true" />
              )}
              Quick Create
            </Button>
          )}
          {confidence >= 50 ? (
            <Button
              size="sm"
              variant={confidence >= 85 ? "outline" : "default"}
              onClick={() => callbacks.onCreateAsNew?.(id)}
              disabled={loading}
              className={confidence >= 85 ? "" : "bg-purple-600 hover:bg-purple-700"}
            >
              <Zap className="h-4 w-4" aria-hidden="true" />
              Create as New
            </Button>
          ) : (
            <Button
              size="sm"
              variant="default"
              onClick={() => callbacks.onCreateAsNew?.(id)}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Eye className="h-4 w-4" />
              Review & Create
            </Button>
          )}
          {callbacks.onLinkManually && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => callbacks.onLinkManually?.(id)}
              disabled={loading}
            >
              <LinkIcon className="h-4 w-4" />
              Link to Existing
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => callbacks.onReject?.(id)}
            disabled={loading}
          >
            <X className="h-4 w-4" />
            Skip
          </Button>
        </>
      )
    }

    // For new/unmatched cards without a proposal, show a generate button
    const isNewWithoutProposal = (variant === "new-transaction" || (variant === "merged-match" && !hasMatchedTransaction)) && !proposal
    if (isNewWithoutProposal && callbacks.onRefreshProposal) {
      return (
        <>
          <Button
            size="sm"
            variant="default"
            onClick={() => callbacks.onRefreshProposal?.(id)}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            Generate Proposal
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => callbacks.onCreateAsNew?.(id)}
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
            Create Manually
          </Button>
          {callbacks.onLinkManually && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => callbacks.onLinkManually?.(id)}
              disabled={loading}
            >
              <LinkIcon className="h-4 w-4" />
              Link to Existing
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => callbacks.onReject?.(id)}
            disabled={loading}
          >
            <X className="h-4 w-4" />
            Skip
          </Button>
        </>
      )
    }

    const effectiveVariant =
      variant === "merged-match" && hasMatchedTransaction
        ? "merged-match-with-link"
        : variant
    const actions = VARIANT_ACTIONS[effectiveVariant]
    return (
      <>
        {actions.map((action) => {
          const handler = callbacks[action.callbackKey] as
            | ((id: string) => void)
            | undefined
          return (
            <Button
              key={action.id}
              size="sm"
              variant={action.buttonVariant}
              onClick={() => handler?.(id)}
              disabled={loading}
              className={action.className}
            >
              {loading && action.isPrimary ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                action.icon
              )}
              {action.label}
            </Button>
          )
        })}
      </>
    )
  }

  if (isApproved) {
    // Show "Created (modified)" for proposal items that were modified
    if (proposalModified) {
      return (
        <span className="flex items-center gap-1 text-sm text-amber-600">
          <Check className="h-4 w-4" />
          Created (modified)
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 text-sm text-green-600">
        <Check className="h-4 w-4" />
        {status === "imported" ? "Imported" : "Linked"}
      </span>
    )
  }

  if (isRejected) {
    // After rejecting a match, show actions to create new or link to a different transaction
    const hasFollowUpActions = callbacks.onCreateAsNew || callbacks.onLinkManually
    if (hasFollowUpActions) {
      return (
        <>
          <span className="flex items-center gap-1 text-sm text-gray-500 mr-auto">
            <X className="h-4 w-4" />
            Match rejected
          </span>
          {callbacks.onCreateAsNew && (
            <Button
              size="sm"
              variant="default"
              onClick={() => callbacks.onCreateAsNew?.(id)}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Create as New
            </Button>
          )}
          {callbacks.onLinkManually && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => callbacks.onLinkManually?.(id)}
              disabled={loading}
            >
              <LinkIcon className="h-4 w-4" />
              Link to Existing
            </Button>
          )}
        </>
      )
    }

    return (
      <span className="flex items-center gap-1 text-sm text-gray-500">
        <X className="h-4 w-4" />
        Skipped
      </span>
    )
  }

  return null
}
