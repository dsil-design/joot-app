'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface BillingCycleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentMethod: {
    id: string
    name: string
    billing_cycle_start_day: number | null
    inferredBillingCycleDay: number
  }
  onSave: () => void
}

export function BillingCycleDialog({
  open,
  onOpenChange,
  paymentMethod,
  onSave,
}: BillingCycleDialogProps) {
  const [day, setDay] = useState<string>(
    paymentMethod.billing_cycle_start_day?.toString() ?? ''
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)

    const dayValue = day.trim() === '' ? null : parseInt(day, 10)

    if (dayValue !== null && (isNaN(dayValue) || dayValue < 1 || dayValue > 28)) {
      setError('Day must be between 1 and 28')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/settings/payment_methods/${paymentMethod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing_cycle_start_day: dayValue }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update')
      }

      onSave()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Billing Cycle — {paymentMethod.name}</DialogTitle>
          <DialogDescription>
            Set the day of the month when this billing cycle starts.
            This helps align the coverage grid with your actual statement periods.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="billing-day">Cycle start day (1–28)</Label>
            <Input
              id="billing-day"
              type="number"
              min={1}
              max={28}
              value={day}
              onChange={e => setDay(e.target.value)}
              placeholder={`Inferred: ${paymentMethod.inferredBillingCycleDay}`}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the inferred day ({paymentMethod.inferredBillingCycleDay}) based on your uploaded statements.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
