"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { SearchableComboBox } from "@/components/ui/searchable-combobox"
import { ComboBox } from "@/components/ui/combobox"
import { DatePicker } from "@/components/ui/date-picker"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useVendorSearch } from "@/hooks/use-vendor-search"
import { usePaymentMethodOptions } from "@/hooks"
import { toast } from "sonner"

interface BulkEditVendorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (vendorId: string) => void
  saving?: boolean
}

export function BulkEditVendorModal({
  open,
  onOpenChange,
  onConfirm,
  saving = false,
}: BulkEditVendorModalProps) {
  const [vendorId, setVendorId] = React.useState("")
  const [vendorLabel, setVendorLabel] = React.useState("")
  const { searchVendors, createVendor } = useVendorSearch()

  const handleSearchVendors = React.useCallback(async (query: string) => {
    const results = await searchVendors(query)
    return results.map(v => ({ id: v.id, name: v.name }))
  }, [searchVendors])

  const handleAddVendor = async (vendorName: string): Promise<string | null> => {
    const newVendor = await createVendor(vendorName)
    if (newVendor) {
      setVendorId(newVendor.id)
      setVendorLabel(newVendor.name)
      toast.success(`Added vendor: ${vendorName}`)
      return newVendor.id
    } else {
      toast.error("Failed to add vendor")
      return null
    }
  }

  const handleConfirm = () => {
    if (!vendorId) {
      toast.error("Please select a vendor")
      return
    }
    onConfirm(vendorId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium text-zinc-950">
            Edit Vendor for Selected Transactions
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bulk-vendor" className="text-sm font-medium text-zinc-950">
              Vendor
            </Label>
            <SearchableComboBox
              value={vendorId}
              selectedLabel={vendorLabel}
              onValueChange={setVendorId}
              onSearch={handleSearchVendors}
              onAddNew={handleAddVendor}
              placeholder="Search for vendor..."
              searchPlaceholder="Type to search..."
              emptyMessage="No vendors found."
              label="Search or add a vendor"
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !vendorId}>
            {saving ? "Saving..." : "Apply to Selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface BulkEditDateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (date: Date) => void
  saving?: boolean
}

export function BulkEditDateModal({
  open,
  onOpenChange,
  onConfirm,
  saving = false,
}: BulkEditDateModalProps) {
  const [date, setDate] = React.useState<Date>(new Date())

  const handleConfirm = () => {
    if (!date) {
      toast.error("Please select a date")
      return
    }
    onConfirm(date)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium text-zinc-950">
            Edit Date for Selected Transactions
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bulk-date" className="text-sm font-medium text-zinc-950">
              Date
            </Label>
            <DatePicker
              date={date}
              onDateChange={(newDate) => newDate && setDate(newDate)}
              placeholder="Select date"
              className="w-full"
              formatStr="MMMM d, yyyy"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !date}>
            {saving ? "Saving..." : "Apply to Selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface BulkEditPaymentMethodModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (paymentMethodId: string) => void
  saving?: boolean
}

export function BulkEditPaymentMethodModal({
  open,
  onOpenChange,
  onConfirm,
  saving = false,
}: BulkEditPaymentMethodModalProps) {
  const [paymentMethodId, setPaymentMethodId] = React.useState("")
  const { options: paymentOptions, addCustomOption: addPaymentMethod, loading: paymentsLoading } = usePaymentMethodOptions()

  const handleAddPaymentMethod = async (methodName: string) => {
    const newMethod = await addPaymentMethod(methodName)
    if (newMethod) {
      setPaymentMethodId(newMethod)
      toast.success(`Added payment method: ${methodName}`)
      return newMethod
    } else {
      toast.error("Failed to add payment method")
      return null
    }
  }

  const handleConfirm = () => {
    if (!paymentMethodId) {
      toast.error("Please select a payment method")
      return
    }
    onConfirm(paymentMethodId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium text-zinc-950">
            Edit Payment Method for Selected Transactions
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bulk-payment-method" className="text-sm font-medium text-zinc-950">
              Payment Method
            </Label>
            <ComboBox
              id="bulk-payment-method"
              options={paymentOptions}
              value={paymentMethodId}
              onValueChange={setPaymentMethodId}
              onAddNew={handleAddPaymentMethod}
              allowAdd={true}
              placeholder="Select option"
              searchPlaceholder="Search payment methods..."
              addNewLabel="Add payment method"
              label="Select or add a payment method"
              disabled={paymentsLoading}
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !paymentMethodId}>
            {saving ? "Saving..." : "Apply to Selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface BulkEditDescriptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (mode: "prepend" | "append" | "replace", text: string) => void
  saving?: boolean
}

export function BulkEditDescriptionModal({
  open,
  onOpenChange,
  onConfirm,
  saving = false,
}: BulkEditDescriptionModalProps) {
  const [mode, setMode] = React.useState<"prepend" | "append" | "replace">("replace")
  const [text, setText] = React.useState("")

  const handleConfirm = () => {
    if (!text.trim()) {
      toast.error("Please enter some text")
      return
    }
    onConfirm(mode, text)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium text-zinc-950">
            Edit Description for Selected Transactions
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-zinc-950">
              Edit Mode
            </Label>
            <RadioGroup
              value={mode}
              onValueChange={(value: "prepend" | "append" | "replace") => setMode(value)}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="mode-replace" />
                <Label htmlFor="mode-replace" className="text-sm font-normal cursor-pointer">
                  Replace entire description
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="prepend" id="mode-prepend" />
                <Label htmlFor="mode-prepend" className="text-sm font-normal cursor-pointer">
                  Add to beginning of description
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="append" id="mode-append" />
                <Label htmlFor="mode-append" className="text-sm font-normal cursor-pointer">
                  Add to end of description
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bulk-description" className="text-sm font-medium text-zinc-950">
              Text
            </Label>
            <Input
              id="bulk-description"
              type="text"
              placeholder={
                mode === "replace"
                  ? "New description"
                  : mode === "prepend"
                  ? "Text to add before..."
                  : "Text to add after..."
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !text.trim()}>
            {saving ? "Saving..." : "Apply to Selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
