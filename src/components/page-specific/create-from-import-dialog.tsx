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
  DollarSign,
  Calendar,
} from "lucide-react"
import { useVendorSearch } from "@/hooks/use-vendor-search"
import { usePaymentMethodOptions, useTagOptions } from "@/hooks"
import { toast } from "sonner"

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
    }
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

/**
 * CreateFromImportDialog
 *
 * Pre-filled form dialog for creating a new transaction from a statement entry.
 * Allows user to assign vendor, tags, edit description before saving.
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
  const [isSaving, setIsSaving] = React.useState(false)

  // Hooks for selectors
  const { searchVendors, createVendor } = useVendorSearch()
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

  // Pre-fill form when data changes
  React.useEffect(() => {
    if (data && open) {
      setDescription(data.description)
      setAmount(Math.abs(data.amount).toString())
      setDate(new Date(data.date + "T00:00:00"))
      setPaymentMethod(data.paymentMethodId || "")
      setVendor("")
      setVendorLabel("")
      setTags([])
    }
  }, [data, open])

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setIsSaving(false)
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
      await onConfirm(data.compositeId, {
        description: description.trim(),
        amount: parseFloat(amount),
        currency: data.currency,
        date: date.toISOString().split("T")[0],
        vendorId: vendor || undefined,
        paymentMethodId: paymentMethod || undefined,
        tagIds: tags.length > 0 ? tags : undefined,
        transactionType: "expense",
      })
      onOpenChange(false)
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false)
    }
  }

  const isValid = description.trim() && amount && parseFloat(amount) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-purple-500" />
            Create as New Transaction
          </DialogTitle>
          <DialogDescription>
            Create a new transaction from this statement entry.
          </DialogDescription>
        </DialogHeader>

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
                <DollarSign className="h-3.5 w-3.5" />
                {formatAmount(data.amount, data.currency)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {data.date}
              </span>
            </div>
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-4">
          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="create-description">Description</Label>
            <Input
              id="create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Transaction description"
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="create-amount">
              Amount ({data?.currency || "USD"})
            </Label>
            <Input
              id="create-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
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
            <SearchableComboBox
              value={vendor}
              selectedLabel={vendorLabel}
              onValueChange={setVendor}
              onSearch={handleSearchVendors}
              onAddNew={handleAddVendor}
              placeholder="Search for vendor..."
              searchPlaceholder="Type to search..."
              emptyMessage="No vendors found."
              label="Search or add a vendor"
              className="w-full"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <ComboBox
              options={paymentOptions}
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              onAddNew={handleAddPaymentMethod}
              allowAdd={true}
              placeholder="Select payment method"
              searchPlaceholder="Search..."
              addNewLabel="Add payment method"
              label="Select or add a payment method"
              disabled={paymentsLoading}
              className="w-full"
            />
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
