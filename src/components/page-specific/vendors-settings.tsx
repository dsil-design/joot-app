"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, GitMerge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface Vendor {
  id: string
  name: string
  transactionCount: number
}

interface VendorsSettingsProps {
  vendors: Vendor[]
}

type DialogMode = 'create' | 'rename' | 'merge' | null

export function VendorsSettings({ vendors: initialVendors }: VendorsSettingsProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selectedItem, setSelectedItem] = useState<Vendor | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [mergeTargetId, setMergeTargetId] = useState<string>('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<Vendor | null>(null)
  const [saving, setSaving] = useState(false)

  const handleCreate = () => {
    setDialogMode('create')
    setInputValue('')
    setDialogOpen(true)
  }

  const handleRename = (item: Vendor) => {
    setDialogMode('rename')
    setSelectedItem(item)
    setInputValue(item.name)
    setDialogOpen(true)
  }

  const handleMerge = (item: Vendor) => {
    setDialogMode('merge')
    setSelectedItem(item)
    setMergeTargetId('')
    setDialogOpen(true)
  }

  const handleDeleteClick = (item: Vendor) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!itemToDelete) return

    setSaving(true)
    try {
      const response = await fetch(`/api/settings/vendors/${itemToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete vendor')
      }

      toast.success('Vendor deleted successfully')
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete vendor')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (dialogMode === 'create') {
        const response = await fetch('/api/settings/vendors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: inputValue.trim() }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create vendor')
        }

        toast.success('Vendor created successfully')
      } else if (dialogMode === 'rename' && selectedItem) {
        const response = await fetch(`/api/settings/vendors/${selectedItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: inputValue.trim() }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to rename vendor')
        }

        toast.success('Vendor renamed successfully')
      } else if (dialogMode === 'merge' && selectedItem && mergeTargetId) {
        const response = await fetch(`/api/settings/vendors/${selectedItem.id}/merge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetId: mergeTargetId }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to merge vendors')
        }

        toast.success('Vendors merged successfully')
      }

      setDialogOpen(false)
      setDialogMode(null)
      setSelectedItem(null)
      setInputValue('')
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
          <h2 className="text-2xl font-semibold text-zinc-950">Vendors</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Manage vendors and merchants where you make transactions
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <Card className="bg-white border-zinc-200 rounded-lg shadow-sm overflow-hidden">
        {initialVendors.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <p className="text-lg font-medium mb-2">No vendors yet</p>
            <p className="text-sm">Click &quot;Add Vendor&quot; to create your first one.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {initialVendors.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-950">{item.name}</span>
                  <span className="text-xs text-zinc-500">
                    {item.transactionCount} {item.transactionCount === 1 ? 'transaction' : 'transactions'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRename(item)}
                    className="h-8 px-2"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {initialVendors.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMerge(item)}
                      className="h-8 px-2"
                    >
                      <GitMerge className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(item)}
                    className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={item.transactionCount > 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create/Rename/Merge Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' && 'Add Vendor'}
              {dialogMode === 'rename' && 'Rename Vendor'}
              {dialogMode === 'merge' && 'Merge Vendors'}
            </DialogTitle>
            {dialogMode === 'merge' && (
              <DialogDescription>
                Select a vendor to merge &quot;{selectedItem?.name}&quot; into.
                All transactions will be updated to use the target vendor.
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {dialogMode !== 'merge' ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter vendor name"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label htmlFor="target">
                  Merge &quot;{selectedItem?.name}&quot; into
                </Label>
                <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {initialVendors
                      .filter((item) => item.id !== selectedItem?.id)
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
