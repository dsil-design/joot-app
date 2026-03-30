"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { SearchableComboBox } from "@/components/ui/searchable-combobox"
import { ComboBox } from "@/components/ui/combobox"
import { MultiSelectComboBox } from "@/components/ui/multi-select-combobox"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Plus,
  Loader2,
  FileText,
  Coins,
  Calendar,
  Zap,
} from "lucide-react"
import { useVendorSearch } from "@/hooks/use-vendor-search"
import { usePaymentMethodOptions, useTagOptions } from "@/hooks"
import { toast } from "sonner"

/**
 * AI smart pre-fill hints from email extraction context
 */
export interface SmartPreFillHints {
  /** Vendor ID from parser mapping (already validated in DB) */
  vendorId?: string
  /** Raw vendor name from email (for fuzzy matching) */
  vendorNameRaw?: string
  /** Parser key used for extraction (e.g., 'bangkok-bank', 'grab') */
  parserKey?: string
  /** Description from parser (e.g., "Breakfast: Restaurant Name") */
  description?: string
  /** Extraction confidence (0-100) */
  extractionConfidence?: number
}

/**
 * Statement data used to pre-fill the form
 */
export interface CreateFromImportData {
  compositeId: string
  description: string
  amount: number
  currency: string
  date: string
  paymentMethodId?: string
  /** AI-driven smart pre-fill hints */
  smartHints?: SmartPreFillHints
  /** Smart transaction proposal */
  proposal?: TransactionProposal
}

export interface ProposalMeta {
  proposalId?: string
  proposalFieldsModified: boolean
  modifiedFields?: Record<string, { from: unknown; to: unknown }>
}

export interface CreateFromImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: CreateFromImportData | null
  onConfirm: (
    compositeId: string,
    transactionData: {
      description: string
      amount: number
      currency: string
      date: string
      vendorId?: string
      paymentMethodId?: string
      tagIds?: string[]
      transactionType: string
    },
    meta?: ProposalMeta
  ) => Promise<void>
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PARSER_PAYMENT_METHOD_MAP } from "@/lib/proposals/payment-method-mapper"
import type { TransactionProposal } from "@/lib/proposals/types"

/**
 * Zap icon with optional reasoning tooltip
 */
function ReasoningZap({ reasoning }: { reasoning?: string }) {
  if (!reasoning) {
    return (
      <span className="text-purple-500">
        <Zap className="h-3.5 w-3.5" />
      </span>
    )
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-purple-500 cursor-help" tabIndex={0}>
            <Zap className="h-3.5 w-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs text-left leading-relaxed">
          {reasoning}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * CreateFromImportDialog
 *
 * Pre-filled form dialog for creating a new transaction from a statement entry.
 * Allows user to assign vendor, tags, edit description before saving.
 * Supports AI-driven smart pre-fill with visual indicators.
 */
export function CreateFromImportDialog({
  open,
  onOpenChange,
  data,
  onConfirm,
}: CreateFromImportDialogProps) {
  // Form state
  const [description, setDescription] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [date, setDate] = React.useState<Date>(new Date())
  const [vendor, setVendor] = React.useState("")
  const [vendorLabel, setVendorLabel] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState("")
  const [tags, setTags] = React.useState<string[]>([])
  const [transactionType, setTransactionType] = React.useState<"expense" | "income" | "transfer">("expense")
  const [isSaving, setIsSaving] = React.useState(false)

  // Track which fields were AI-prefilled (cleared when user modifies)
  const [aiPrefilled, setAiPrefilled] = React.useState<Set<string>>(new Set())

  // Track proposal field reasoning for tooltips
  const [fieldReasoning, setFieldReasoning] = React.useState<Record<string, string>>({})

  // Track original proposal values for modification detection
  const proposalValuesRef = React.useRef<Record<string, unknown>>({})

  // Proposal-derived suggestion data
  const proposal = data?.proposal
  const vendorAlternatives = proposal?.vendor?.value.alternatives?.slice(0, 3) || []
  const showVendorSuggestions = proposal?.vendor && proposal.vendor.confidence < 60 && vendorAlternatives.length > 0
  const suggestedTags = React.useMemo(() => {
    if (!proposal?.tags?.value) return []
    return proposal.tags.value.filter((t) => !tags.includes(t.id))
  }, [proposal, tags])

  // Hooks for selectors
  const { searchVendors, getVendorById, createVendor } = useVendorSearch()
  const {
    options: paymentOptions,
    addCustomOption: addPaymentMethod,
    loading: paymentsLoading,
  } = usePaymentMethodOptions()
  const {
    options: tagOptions,
    addCustomOption: addTag,
    loading: tagsLoading,
  } = useTagOptions()

  // Clear AI indicator when user changes a field
  const clearAiFlag = React.useCallback((field: string) => {
    setAiPrefilled((prev) => {
      if (!prev.has(field)) return prev
      const next = new Set(prev)
      next.delete(field)
      return next
    })
  }, [])

  // Keep a ref to paymentOptions so the effect doesn't re-trigger on every render
  const paymentOptionsRef = React.useRef(paymentOptions)
  paymentOptionsRef.current = paymentOptions

  // Pre-fill form when data changes
  React.useEffect(() => {
    if (data && open) {
      // Reset AI flags
      setAiPrefilled(new Set())
      setFieldReasoning({})
      proposalValuesRef.current = {}

      // Standard pre-fills from extraction
      setDescription(data.description)
      setAmount(Math.abs(data.amount).toFixed(2))
      // Parse date — handle both YYYY-MM-DD and full ISO timestamps
      const dateStr = data.date.split("T")[0] // extract YYYY-MM-DD portion
      setDate(new Date(dateStr + "T00:00:00"))
      setPaymentMethod(data.paymentMethodId || "")
      setVendor("")
      setVendorLabel("")
      setTags([])
      setTransactionType("expense")

      // Priority 1: Pre-fill from proposal (richer data)
      if (data.proposal) {
        const p = data.proposal
        const prefilledFields = new Set<string>()
        const reasoning: Record<string, string> = {}
        const originalValues: Record<string, unknown> = {}

        // Transaction type
        if (p.transactionType) {
          setTransactionType(p.transactionType.value)
          prefilledFields.add("transactionType")
          reasoning.transactionType = p.transactionType.reasoning
          originalValues.transactionType = p.transactionType.value
        }

        // Description
        if (p.description) {
          setDescription(p.description.value)
          prefilledFields.add("description")
          reasoning.description = p.description.reasoning
          originalValues.description = p.description.value
        }

        // Vendor
        if (p.vendor?.value.id) {
          setVendor(p.vendor.value.id)
          setVendorLabel(p.vendor.value.name)
          prefilledFields.add("vendor")
          reasoning.vendor = p.vendor.reasoning
          originalValues.vendor = p.vendor.value.id
        }

        // Payment method
        if (p.paymentMethod?.value.id) {
          setPaymentMethod(p.paymentMethod.value.id)
          prefilledFields.add("paymentMethod")
          reasoning.paymentMethod = p.paymentMethod.reasoning
          originalValues.paymentMethod = p.paymentMethod.value.id
        }

        // Tags
        if (p.tags?.value && p.tags.value.length > 0) {
          setTags(p.tags.value.map((t) => t.id))
          prefilledFields.add("tags")
          reasoning.tags = p.tags.reasoning
          originalValues.tags = p.tags.value.map((t) => t.id)
        }

        if (prefilledFields.size > 0) {
          setAiPrefilled(prefilledFields)
          setFieldReasoning(reasoning)
          proposalValuesRef.current = originalValues
        }
        return // Skip smartHints when proposal is available
      }

      // Priority 2: Smart pre-fills from AI hints (async)
      if (data.smartHints) {
        const hints = data.smartHints
        const resolve = async () => {
          const prefilledFields = new Set<string>()

          // 1. Resolve vendor
          if (hints.vendorId) {
            const vendorData = await getVendorById(hints.vendorId)
            if (vendorData) {
              setVendor(vendorData.id)
              setVendorLabel(vendorData.name)
              prefilledFields.add("vendor")
            }
          } else if (hints.vendorNameRaw) {
            const results = await searchVendors(hints.vendorNameRaw, 5)
            const exactMatch = results.find(
              (v) =>
                v.name.toLowerCase() === hints.vendorNameRaw!.toLowerCase()
            )
            if (exactMatch) {
              setVendor(exactMatch.id)
              setVendorLabel(exactMatch.name)
              prefilledFields.add("vendor")
            }
          }

          // 2. Resolve payment method by parser key
          if (hints.parserKey && PARSER_PAYMENT_METHOD_MAP[hints.parserKey]) {
            const patterns = PARSER_PAYMENT_METHOD_MAP[hints.parserKey]
            const matched = paymentOptionsRef.current.find((opt) =>
              patterns.some((p) => opt.label.toLowerCase().includes(p))
            )
            if (matched) {
              setPaymentMethod(matched.value)
              prefilledFields.add("paymentMethod")
            }
          }

          // 3. Pre-fill description only from dedicated parsers with high confidence
          if (
            hints.description &&
            hints.parserKey &&
            hints.parserKey !== "ai-fallback" &&
            (hints.extractionConfidence ?? 0) >= 75
          ) {
            setDescription(hints.description)
            prefilledFields.add("description")
          }

          if (prefilledFields.size > 0) {
            setAiPrefilled(prefilledFields)
          }
        }
        resolve()
      }
    }
  }, [data, open, getVendorById, searchVendors])

  // Retry payment method pre-fill once options finish loading
  React.useEffect(() => {
    if (!open || !data?.smartHints?.parserKey || paymentsLoading || paymentMethod) return
    const parserKey = data.smartHints.parserKey
    const patterns = PARSER_PAYMENT_METHOD_MAP[parserKey]
    if (!patterns) return
    const matched = paymentOptions.find((opt) =>
      patterns.some((p) => opt.label.toLowerCase().includes(p))
    )
    if (matched) {
      setPaymentMethod(matched.value)
      setAiPrefilled((prev) => new Set([...prev, "paymentMethod"]))
    }
  }, [open, data, paymentsLoading, paymentOptions, paymentMethod])

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setIsSaving(false)
      setAiPrefilled(new Set())
    }
  }, [open])

  const handleSearchVendors = React.useCallback(
    async (query: string) => {
      const results = await searchVendors(query)
      return results.map((v) => ({ id: v.id, name: v.name }))
    },
    [searchVendors]
  )

  const handleAddVendor = async (
    vendorName: string
  ): Promise<string | null> => {
    const newVendor = await createVendor(vendorName)
    if (newVendor) {
      setVendor(newVendor.id)
      setVendorLabel(newVendor.name)
      clearAiFlag("vendor")
      toast.success(`Added vendor: ${vendorName}`)
      return newVendor.id
    }
    toast.error("Failed to add vendor")
    return null
  }

  const handleAddPaymentMethod = async (methodName: string) => {
    const newMethod = await addPaymentMethod(methodName)
    if (newMethod) {
      setPaymentMethod(newMethod)
      clearAiFlag("paymentMethod")
      toast.success(`Added payment method: ${methodName}`)
      return newMethod
    }
    toast.error("Failed to add payment method")
    return null
  }

  const handleAddTag = async (tagName: string) => {
    const newTag = await addTag(tagName)
    if (newTag) {
      toast.success(`Added tag: ${tagName}`)
      return newTag
    }
    toast.error("Failed to add tag")
    return null
  }

  const handleConfirm = async () => {
    if (!data || !description.trim() || !amount) return

    setIsSaving(true)
    try {
      // Compute proposal modifications
      let meta: ProposalMeta | undefined
      if (data.proposal) {
        const original = proposalValuesRef.current
        const modifiedFields: Record<string, { from: unknown; to: unknown }> = {}

        if (original.vendor !== undefined && original.vendor !== (vendor || undefined)) {
          modifiedFields.vendor_id = { from: original.vendor, to: vendor || null }
        }
        if (original.paymentMethod !== undefined && original.paymentMethod !== (paymentMethod || undefined)) {
          modifiedFields.payment_method_id = { from: original.paymentMethod, to: paymentMethod || null }
        }
        if (original.description !== undefined && original.description !== description.trim()) {
          modifiedFields.description = { from: original.description, to: description.trim() }
        }
        if (original.transactionType !== undefined && original.transactionType !== transactionType) {
          modifiedFields.transaction_type = { from: original.transactionType, to: transactionType }
        }
        if (original.tags !== undefined) {
          const origTags = (original.tags as string[]).sort().join(',')
          const newTags = [...tags].sort().join(',')
          if (origTags !== newTags) {
            modifiedFields.tag_ids = { from: original.tags, to: tags }
          }
        }

        meta = {
          proposalId: data.proposal.id,
          proposalFieldsModified: Object.keys(modifiedFields).length > 0,
          modifiedFields: Object.keys(modifiedFields).length > 0 ? modifiedFields : undefined,
        }
      }

      await onConfirm(
        data.compositeId,
        {
          description: description.trim(),
          amount: parseFloat(amount),
          currency: data.currency,
          date: date.toISOString().split("T")[0],
          vendorId: vendor || undefined,
          paymentMethodId: paymentMethod || undefined,
          tagIds: tags.length > 0 ? tags : undefined,
          transactionType,
        },
        meta
      )
      onOpenChange(false)
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false)
    }
  }

  const isValid = description.trim() && amount && parseFloat(amount) > 0
  const hasAnyPrefill = aiPrefilled.size > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-purple-500" />
            Create as New Transaction
          </DialogTitle>
          <DialogDescription>
            Create a new transaction from this statement entry.
          </DialogDescription>
        </DialogHeader>

        {/* Smart pre-fill banner */}
        {hasAnyPrefill && (
          <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 dark:border-purple-800 dark:bg-purple-950/30">
            <Zap className="h-4 w-4 text-purple-500 shrink-0" />
            <p className="text-xs text-purple-700 dark:text-purple-300">
              Some fields were auto-filled{data?.proposal ? " by AI proposal" : " from the email"}.{" "}
              <span className="text-purple-500">
                <Zap className="inline h-3 w-3" />
              </span>{" "}
              indicates a smart pre-fill.
            </p>
          </div>
        )}

        {/* Source info */}
        {data && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              From statement:
            </p>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">
                {data.description}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" />
                {formatAmount(data.amount, data.currency)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(data.date.split("T")[0] + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-4">
          {/* Transaction Type Toggle */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="relative flex gap-2" role="group" aria-label="Transaction type">
              <Button
                type="button"
                size="sm"
                variant={transactionType === "expense" ? "default" : "outline"}
                className={transactionType === "expense" ? "bg-purple-600 hover:bg-purple-700" : ""}
                aria-pressed={transactionType === "expense"}
                onClick={() => { setTransactionType("expense"); clearAiFlag("transactionType") }}
              >
                Expense
              </Button>
              <Button
                type="button"
                size="sm"
                variant={transactionType === "income" ? "default" : "outline"}
                className={transactionType === "income" ? "bg-green-600 hover:bg-green-700" : ""}
                aria-pressed={transactionType === "income"}
                onClick={() => { setTransactionType("income"); clearAiFlag("transactionType") }}
              >
                Income
              </Button>
              <Button
                type="button"
                size="sm"
                variant={transactionType === "transfer" ? "default" : "outline"}
                className={transactionType === "transfer" ? "bg-blue-600 hover:bg-blue-700" : ""}
                aria-pressed={transactionType === "transfer"}
                onClick={() => { setTransactionType("transfer"); clearAiFlag("transactionType") }}
              >
                Transfer
              </Button>
              {aiPrefilled.has("transactionType") && (
                <ReasoningZap reasoning={fieldReasoning.transactionType} />
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="create-description">Description</Label>
            <div className="relative">
              <Input
                id="create-description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  clearAiFlag("description")
                }}
                placeholder="Transaction description"
                className={
                  aiPrefilled.has("description")
                    ? "border-purple-300 bg-purple-50/50 pr-8 dark:border-purple-700 dark:bg-purple-950/20"
                    : undefined
                }
              />
              {aiPrefilled.has("description") && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <ReasoningZap reasoning={fieldReasoning.description} />
                </span>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="create-amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                {data?.currency === "THB" ? "฿" : "$"}
              </span>
              <Input
                id="create-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <DatePicker
              date={date}
              onDateChange={(d) => d && setDate(d)}
              className="w-full"
            />
          </div>

          {/* Vendor */}
          <div className="space-y-1.5">
            <Label>Vendor</Label>
            <div className="relative">
              <SearchableComboBox
                value={vendor}
                selectedLabel={vendorLabel}
                onValueChange={(val) => {
                  setVendor(val)
                  clearAiFlag("vendor")
                }}
                onSearch={handleSearchVendors}
                onAddNew={handleAddVendor}
                placeholder="Search for vendor..."
                searchPlaceholder="Type to search..."
                emptyMessage="No vendors found."
                label="Search or add a vendor"
                className={
                  aiPrefilled.has("vendor")
                    ? "w-full border-purple-300 dark:border-purple-700 [&>button]:bg-purple-50/50 dark:[&>button]:bg-purple-950/20"
                    : "w-full"
                }
              />
              {aiPrefilled.has("vendor") && (
                <span className="absolute right-8 top-1/2 -translate-y-1/2 z-10">
                  <ReasoningZap reasoning={fieldReasoning.vendor} />
                </span>
              )}
            </div>
            {showVendorSuggestions && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">Did you mean:</span>
                {vendorAlternatives.map((alt) => (
                  <Badge
                    key={alt.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent text-xs"
                    role="button"
                    tabIndex={0}
                    aria-label={`Select vendor ${alt.name}`}
                    onClick={() => {
                      setVendor(alt.id)
                      setVendorLabel(alt.name)
                      clearAiFlag("vendor")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setVendor(alt.id)
                        setVendorLabel(alt.name)
                        clearAiFlag("vendor")
                      }
                    }}
                  >
                    {alt.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <div className="relative">
              <ComboBox
                options={paymentOptions}
                value={paymentMethod}
                onValueChange={(val) => {
                  setPaymentMethod(val)
                  clearAiFlag("paymentMethod")
                }}
                onAddNew={handleAddPaymentMethod}
                allowAdd={true}
                placeholder="Select payment method"
                searchPlaceholder="Search..."
                addNewLabel="Add payment method"
                label="Select or add a payment method"
                disabled={paymentsLoading}
                className={
                  aiPrefilled.has("paymentMethod")
                    ? "w-full border-purple-300 dark:border-purple-700 [&>button]:bg-purple-50/50 dark:[&>button]:bg-purple-950/20"
                    : "w-full"
                }
              />
              {aiPrefilled.has("paymentMethod") && (
                <span className="absolute right-8 top-1/2 -translate-y-1/2 z-10">
                  <ReasoningZap reasoning={fieldReasoning.paymentMethod} />
                </span>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <MultiSelectComboBox
              options={tagOptions}
              values={tags}
              onValuesChange={setTags}
              onAddNew={handleAddTag}
              allowAdd={true}
              placeholder="Select tags..."
              searchPlaceholder="Search tags..."
              addNewLabel="Add tag"
              label="Select or add tags"
              disabled={tagsLoading}
              className="w-full"
            />
            {suggestedTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">Suggested:</span>
                {suggestedTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80 text-xs"
                    role="button"
                    tabIndex={0}
                    aria-label={`Add tag ${tag.name}`}
                    onClick={() => setTags((prev) => [...prev, tag.id])}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setTags((prev) => [...prev, tag.id])
                      }
                    }}
                  >
                    + {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isSaving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Transaction
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
