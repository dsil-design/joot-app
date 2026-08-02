"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ComboBox } from '@/components/ui/combobox'
import { MultiSelectComboBox } from '@/components/ui/multi-select-combobox'
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

interface AutoTagRule {
  id: string
  match_type: 'vendor' | 'counterparty_pattern'
  vendor_id: string | null
  pattern: string | null
  transaction_type: 'expense' | 'income' | 'transfer' | null
  source_types: string[] | null
  tag_ids: string[]
  enabled: boolean
  priority: number
  match_count: number
}

interface VendorOption {
  id: string
  name: string
}

interface TagOption {
  id: string
  name: string
  color: string
}

interface AutoTagRulesSettingsProps {
  rules: AutoTagRule[]
  vendors: VendorOption[]
  tags: TagOption[]
}

const SOURCE_LABELS: Record<string, string> = {
  statement: 'Statements',
  email: 'Emails',
  payment_slip: 'Payment slips',
  merged: 'Merged',
}

type FormState = {
  matchType: 'vendor' | 'counterparty_pattern'
  vendorId: string
  pattern: string
  transactionType: string
  sourceTypes: string[]
  tagIds: string[]
  priority: string
}

const EMPTY_FORM: FormState = {
  matchType: 'vendor',
  vendorId: '',
  pattern: '',
  transactionType: 'any',
  sourceTypes: [],
  tagIds: [],
  priority: '0',
}

export function AutoTagRulesSettings({
  rules,
  vendors,
  tags,
}: AutoTagRulesSettingsProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AutoTagRule | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<AutoTagRule | null>(null)

  const vendorName = (id: string | null) =>
    vendors.find((v) => v.id === id)?.name || 'Unknown vendor'

  const tagById = (id: string) => tags.find((t) => t.id === id)

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (rule: AutoTagRule) => {
    setEditing(rule)
    setForm({
      matchType: rule.match_type,
      vendorId: rule.vendor_id || '',
      pattern: rule.pattern || '',
      transactionType: rule.transaction_type || 'any',
      sourceTypes: rule.source_types || [],
      tagIds: rule.tag_ids,
      priority: String(rule.priority),
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (form.matchType === 'vendor' && !form.vendorId) {
      toast.error('Pick a vendor for this rule')
      return
    }
    if (form.matchType === 'counterparty_pattern' && !form.pattern.trim()) {
      toast.error('Enter the text to match on')
      return
    }
    if (form.tagIds.length === 0) {
      toast.error('Pick at least one tag to apply')
      return
    }

    setSaving(true)
    try {
      const body = {
        match_type: form.matchType,
        vendor_id: form.matchType === 'vendor' ? form.vendorId : null,
        pattern: form.matchType === 'counterparty_pattern' ? form.pattern.trim() : null,
        transaction_type: form.transactionType === 'any' ? null : form.transactionType,
        source_types: form.sourceTypes.length > 0 ? form.sourceTypes : null,
        tag_ids: form.tagIds,
        priority: Number(form.priority) || 0,
      }

      const res = await fetch(
        editing
          ? `/api/settings/auto-tag-rules/${editing.id}`
          : '/api/settings/auto-tag-rules',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed to save rule' }))
        throw new Error(error || 'Failed to save rule')
      }

      toast.success(editing ? 'Rule updated' : 'Rule created')
      setDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (rule: AutoTagRule, enabled: boolean) => {
    try {
      const res = await fetch(`/api/settings/auto-tag-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) throw new Error('Failed to update rule')
      router.refresh()
    } catch {
      toast.error('Failed to update rule')
    }
  }

  const handleDelete = async () => {
    if (!ruleToDelete) return
    try {
      const res = await fetch(`/api/settings/auto-tag-rules/${ruleToDelete.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete rule')
      toast.success('Rule deleted')
      setRuleToDelete(null)
      router.refresh()
    } catch {
      toast.error('Failed to delete rule')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Auto-Tagging Rules</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Always apply certain tags to transactions from a given vendor or sender.
            Rules run when a proposal is generated from a statement, email or payment
            slip, and are never overridden by the AI.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          New Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card className="p-8 text-center">
          <Zap className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No auto-tagging rules yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create one to tag incoming transactions from a person or vendor automatically.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
                    <span className="text-muted-foreground">When</span>
                    {rule.match_type === 'vendor' ? (
                      <>
                        <span className="text-muted-foreground">vendor is</span>
                        <span className="font-medium">{vendorName(rule.vendor_id)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-muted-foreground">sender contains</span>
                        <span className="font-medium">&ldquo;{rule.pattern}&rdquo;</span>
                      </>
                    )}
                    {rule.transaction_type && (
                      <>
                        <span className="text-muted-foreground">and type is</span>
                        <span className="font-medium capitalize">{rule.transaction_type}</span>
                      </>
                    )}
                    <span className="text-muted-foreground">&rarr; apply</span>
                    {rule.tag_ids.map((id) => {
                      const tag = tagById(id)
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          // Tag colors are pale by design, so they need a dark
                          // foreground — same pairing the transaction detail
                          // modal uses.
                          style={
                            tag?.color
                              ? { backgroundColor: tag.color, color: '#18181b' }
                              : undefined
                          }
                        >
                          {tag?.name || 'deleted tag'}
                        </Badge>
                      )
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {rule.source_types && rule.source_types.length > 0 && (
                      <span>
                        Sources:{' '}
                        {rule.source_types.map((s) => SOURCE_LABELS[s] || s).join(', ')}
                      </span>
                    )}
                    {rule.priority !== 0 && <span>Priority {rule.priority}</span>}
                    <span>
                      {rule.match_count === 0
                        ? 'Not used yet'
                        : `Used ${rule.match_count} time${rule.match_count === 1 ? '' : 's'}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(checked) => handleToggle(rule, checked)}
                    aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRuleToDelete(rule)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Rule' : 'New Auto-Tagging Rule'}</DialogTitle>
            <DialogDescription>
              Tags from this rule are added to what the app already infers — they
              don&apos;t replace it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Match on</Label>
              <Select
                value={form.matchType}
                onValueChange={(v) =>
                  setForm({ ...form, matchType: v as FormState['matchType'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendor">A vendor</SelectItem>
                  <SelectItem value="counterparty_pattern">
                    Sender / description text
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.matchType === 'vendor' ? (
              <div className="space-y-2">
                <Label>Vendor</Label>
                <ComboBox
                  options={vendors.map((v) => ({ value: v.id, label: v.name }))}
                  value={form.vendorId}
                  onValueChange={(v) => setForm({ ...form, vendorId: v })}
                  placeholder="Select vendor..."
                  searchPlaceholder="Search vendors..."
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Text to match</Label>
                <Input
                  value={form.pattern}
                  onChange={(e) => setForm({ ...form, pattern: e.target.value })}
                  placeholder="e.g. supaporn"
                />
                <p className="text-xs text-muted-foreground">
                  Matched against the sender and recipient names on payment slips and
                  emails, and the statement description. Case-insensitive, and titles
                  like &ldquo;MS.&rdquo; are ignored. Useful when the same person shows
                  up under spellings the app hasn&apos;t learned yet.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Apply tags</Label>
              <MultiSelectComboBox
                options={tags.map((t) => ({ value: t.id, label: t.name, color: t.color }))}
                values={form.tagIds}
                onValuesChange={(v) => setForm({ ...form, tagIds: v })}
                placeholder="Select tags..."
                searchPlaceholder="Search tags..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Only for type</Label>
                <Select
                  value={form.transactionType}
                  onValueChange={(v) => setForm({ ...form, transactionType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any type</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Higher wins when rules disagree.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Only for sources</Label>
              <MultiSelectComboBox
                options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                values={form.sourceTypes}
                onValuesChange={(v) => setForm({ ...form, sourceTypes: v })}
                placeholder="Any source"
                searchPlaceholder="Search sources..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!ruleToDelete}
        onOpenChange={(open) => !open && setRuleToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
            <AlertDialogDescription>
              Transactions already tagged by it keep their tags. Only future proposals
              are affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
