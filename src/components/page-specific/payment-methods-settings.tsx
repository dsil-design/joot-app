"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, GitMerge, GripVertical, ChevronUp, ChevronDown, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface Currency {
  currency_code: string
  display_name: string
  currency_symbol: string
}

interface PaymentMethod {
  id: string
  name: string
  transactionCount: number
  sort_order: number
  preferred_currency?: string | null
}

interface PaymentMethodsSettingsProps {
  paymentMethods: PaymentMethod[]
  currencies: Currency[]
}

type DialogMode = 'create' | 'rename' | 'merge' | null

interface SortableItemProps {
  item: PaymentMethod
  index: number
  totalItems: number
  onRename: (item: PaymentMethod) => void
  onMerge: (item: PaymentMethod) => void
  onDelete: (item: PaymentMethod) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
}

function SortableItem({ item, index, totalItems, onRename, onMerge, onDelete, onMoveUp, onMoveDown }: SortableItemProps) {
  const isNoneItem = item.id === 'none'
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: isNoneItem })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 border-b border-zinc-200 last:border-b-0 transition-colors ${
        isNoneItem ? 'bg-zinc-50' : 'bg-white hover:bg-zinc-50'
      }`}
    >
      {/* Drag Handle - empty space for None item alignment */}
      {isNoneItem ? (
        <div className="w-5 h-5" />
      ) : (
        <button
          className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}

      {/* Content */}
      <div className="flex flex-col flex-1">
        <span className="text-sm font-medium text-zinc-950">
          {item.name}
          {item.preferred_currency && (
            <span className="text-zinc-500 font-normal"> ({item.preferred_currency})</span>
          )}
        </span>
        <span className="text-xs text-zinc-500">
          {item.transactionCount} {item.transactionCount === 1 ? 'transaction' : 'transactions'}
        </span>
      </div>

      {/* Arrow Controls */}
      {!isNoneItem && (
        <div className="flex flex-col gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="h-6 w-6 p-0"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMoveDown(index)}
            disabled={index === totalItems - 1}
            className="h-6 w-6 p-0"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {!isNoneItem && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRename(item)}
              className="h-8 px-2"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            {totalItems > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMerge(item)}
                className="h-8 px-2"
              >
                <GitMerge className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item)}
              className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={item.transactionCount > 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
        {isNoneItem && (
          <span className="text-xs text-zinc-500 italic px-2">
            Transactions without payment method
          </span>
        )}
      </div>
    </div>
  )
}

export function PaymentMethodsSettings({ paymentMethods: initialPaymentMethods, currencies }: PaymentMethodsSettingsProps) {
  const router = useRouter()
  const [paymentMethods, setPaymentMethods] = useState(initialPaymentMethods)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selectedItem, setSelectedItem] = useState<PaymentMethod | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [preferredCurrency, setPreferredCurrency] = useState<string>('')
  const [mergeTargetId, setMergeTargetId] = useState<string>('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<PaymentMethod | null>(null)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleCreate = () => {
    setDialogMode('create')
    setInputValue('')
    setPreferredCurrency('')
    setDialogOpen(true)
  }

  const handleRename = (item: PaymentMethod) => {
    setDialogMode('rename')
    setSelectedItem(item)
    setInputValue(item.name)
    setPreferredCurrency(item.preferred_currency || '')
    setDialogOpen(true)
  }

  const handleMerge = (item: PaymentMethod) => {
    setDialogMode('merge')
    setSelectedItem(item)
    setMergeTargetId('')
    setDialogOpen(true)
  }

  const handleDeleteClick = (item: PaymentMethod) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!itemToDelete) return

    setSaving(true)
    try {
      const response = await fetch(`/api/settings/payment_methods/${itemToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete payment method')
      }

      toast.success('Payment method deleted successfully')
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete payment method')
    } finally {
      setSaving(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = paymentMethods.findIndex((item) => item.id === active.id)
    const newIndex = paymentMethods.findIndex((item) => item.id === over.id)

    const newOrder = arrayMove(paymentMethods, oldIndex, newIndex)
    setPaymentMethods(newOrder)

    // Update sort order on backend
    try {
      const response = await fetch('/api/settings/payment_methods/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderedIds: newOrder.map((item) => item.id),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update order')
      }

      router.refresh()
    } catch (error) {
      toast.error('Failed to update order')
      setPaymentMethods(paymentMethods) // Revert on error
    }
  }

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1

    if (newIndex < 0 || newIndex >= paymentMethods.length) {
      return
    }

    const newOrder = arrayMove(paymentMethods, index, newIndex)
    setPaymentMethods(newOrder)

    // Update sort order on backend
    try {
      const response = await fetch('/api/settings/payment_methods/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderedIds: newOrder.map((item) => item.id),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update order')
      }

      router.refresh()
    } catch (error) {
      toast.error('Failed to update order')
      setPaymentMethods(paymentMethods) // Revert on error
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (dialogMode === 'create') {
        const response = await fetch('/api/settings/payment_methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: inputValue.trim(),
            preferred_currency: preferredCurrency || null,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create payment method')
        }

        toast.success('Payment method created successfully')
      } else if (dialogMode === 'rename' && selectedItem) {
        const response = await fetch(`/api/settings/payment_methods/${selectedItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: inputValue.trim(),
            preferred_currency: preferredCurrency || null,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to rename payment method')
        }

        toast.success('Payment method renamed successfully')
      } else if (dialogMode === 'merge' && selectedItem && mergeTargetId) {
        const response = await fetch(`/api/settings/payment_methods/${selectedItem.id}/merge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetId: mergeTargetId }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to merge payment methods')
        }

        toast.success('Payment methods merged successfully')
      }

      setDialogOpen(false)
      setDialogMode(null)
      setSelectedItem(null)
      setInputValue('')
      setPreferredCurrency('')
      setMergeTargetId('')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-950">Payment Methods</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your payment methods and how they appear in transactions
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Payment Method
        </Button>
      </div>

      <Card className="bg-white border-zinc-200 rounded-lg shadow-sm overflow-hidden">
        {paymentMethods.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <p className="text-lg font-medium mb-2">No payment methods yet</p>
            <p className="text-sm">Click &quot;Add Payment Method&quot; to create your first one.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={paymentMethods.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y divide-zinc-200">
                {paymentMethods.map((item, index) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    index={index}
                    totalItems={paymentMethods.length}
                    onRename={handleRename}
                    onMerge={handleMerge}
                    onDelete={handleDeleteClick}
                    onMoveUp={() => moveItem(index, 'up')}
                    onMoveDown={() => moveItem(index, 'down')}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </Card>

      {/* Create/Rename/Merge Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' && 'Add Payment Method'}
              {dialogMode === 'rename' && 'Rename Payment Method'}
              {dialogMode === 'merge' && 'Merge Payment Methods'}
            </DialogTitle>
            {dialogMode === 'merge' && (
              <DialogDescription>
                Select a payment method to merge &quot;{selectedItem?.name}&quot; into.
                All transactions will be updated to use the target payment method.
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {dialogMode !== 'merge' ? (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Enter payment method name"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="preferred-currency">
                    Preferred Currency (Optional)
                  </Label>
                  <Select
                    value={preferredCurrency || 'none'}
                    onValueChange={(val) => setPreferredCurrency(val === 'none' ? '' : val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.currency_code} value={currency.currency_code}>
                          {currency.currency_symbol} {currency.currency_code} - {currency.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-start gap-2 mt-1">
                    <Info className="h-3.5 w-3.5 text-zinc-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-zinc-500 leading-relaxed">
                      Auto-selects this currency when adding transactions with this payment method
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Label htmlFor="target">
                  Merge &quot;{selectedItem?.name}&quot; into
                </Label>
                <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods
                      .filter((item) => item.id !== selectedItem?.id && item.id !== 'none')
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                (dialogMode !== 'merge' && !inputValue.trim()) ||
                (dialogMode === 'merge' && !mergeTargetId)
              }
            >
              {saving ? 'Saving...' : dialogMode === 'merge' ? 'Merge' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{itemToDelete?.name}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
