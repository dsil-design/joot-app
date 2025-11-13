"use client"

import * as React from "react"
import { TemplateCard } from "./TemplateCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Search, Filter, Plus } from "lucide-react"
import type {
  TransactionTemplate,
  FrequencyType,
  TemplateFilters,
} from "@/lib/types/recurring-transactions"
import type { TransactionType } from "@/lib/supabase/types"

export interface TemplateListProps {
  templates: TransactionTemplate[]
  onToggleActive?: (id: string, isActive: boolean) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onCreate?: () => void
  loading?: boolean
  className?: string
}

/**
 * List view of all templates with filtering and search
 */
export function TemplateList({
  templates,
  onToggleActive,
  onEdit,
  onDelete,
  onCreate,
  loading = false,
  className,
}: TemplateListProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterActive, setFilterActive] = React.useState<"all" | "active" | "inactive">("all")
  const [filterFrequency, setFilterFrequency] = React.useState<FrequencyType | "all">("all")
  const [filterType, setFilterType] = React.useState<TransactionType | "all">("all")
  const [sortBy, setSortBy] = React.useState<"name" | "amount" | "frequency">("name")

  // Apply filters and search
  const filteredTemplates = React.useMemo(() => {
    let filtered = templates

    // Filter by active status
    if (filterActive !== "all") {
      filtered = filtered.filter((t) =>
        filterActive === "active" ? t.is_active : !t.is_active
      )
    }

    // Filter by frequency
    if (filterFrequency !== "all") {
      filtered = filtered.filter((t) => t.frequency === filterFrequency)
    }

    // Filter by transaction type
    if (filterType !== "all") {
      filtered = filtered.filter((t) => t.transaction_type === filterType)
    }

    // Search by name or vendor
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.vendor?.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "amount":
          return b.amount - a.amount
        case "frequency":
          return a.frequency.localeCompare(b.frequency)
        default:
          return 0
      }
    })

    return filtered
  }, [templates, searchQuery, filterActive, filterFrequency, filterType, sortBy])

  // Calculate stats
  const stats = React.useMemo(() => {
    const activeCount = templates.filter((t) => t.is_active).length
    const inactiveCount = templates.length - activeCount
    const expenseCount = templates.filter((t) => t.transaction_type === "expense").length
    const incomeCount = templates.filter((t) => t.transaction_type === "income").length

    return {
      total: templates.length,
      active: activeCount,
      inactive: inactiveCount,
      expenses: expenseCount,
      income: incomeCount,
    }
  }, [templates])

  const hasActiveFilters =
    filterActive !== "all" || filterFrequency !== "all" || filterType !== "all" || searchQuery !== ""

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Templates</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{stats.total} total</Badge>
            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
              {stats.active} active
            </Badge>
            {stats.inactive > 0 && (
              <Badge variant="outline" className="text-zinc-500">
                {stats.inactive} inactive
              </Badge>
            )}
          </div>
        </div>

        {onCreate && (
          <Button onClick={onCreate}>
            <Plus className="size-4 mr-2" />
            New Template
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input
            placeholder="Search templates by name, vendor, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-zinc-400" />
            <span className="text-sm text-zinc-600">Filter:</span>
          </div>

          {/* Active Status Filter */}
          <Select value={filterActive} onValueChange={(v) => setFilterActive(v as typeof filterActive)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>

          {/* Frequency Filter */}
          <Select value={filterFrequency} onValueChange={(v) => setFilterFrequency(v as typeof filterFrequency)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Frequencies</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="amount">Sort by Amount</SelectItem>
              <SelectItem value="frequency">Sort by Frequency</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setFilterActive("all")
                setFilterFrequency("all")
                setFilterType("all")
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Template List */}
      {loading ? (
        <div className="text-center py-12 text-sm text-zinc-500">Loading templates...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-zinc-50">
          <p className="text-sm text-zinc-500 mb-4">
            {hasActiveFilters
              ? "No templates match your filters"
              : "No templates yet"}
          </p>
          {!hasActiveFilters && onCreate && (
            <Button onClick={onCreate}>
              <Plus className="size-4 mr-2" />
              Create Your First Template
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="text-sm text-zinc-500 mb-2">
            Showing {filteredTemplates.length} of {stats.total} templates
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onToggleActive={onToggleActive}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
