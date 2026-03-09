'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Upload, FileText } from 'lucide-react'
import { useStatements } from '@/hooks/use-statements'
import { StatementsStatsBar } from '@/components/page-specific/statements-stats-bar'
import { StatementRow } from '@/components/page-specific/statement-row'
import { UploadStatementDialog } from '@/components/page-specific/upload-statement-dialog'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type TypeFilter = 'all' | 'credit_card' | 'bank_account'

const typeFilterTabs: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'credit_card', label: 'Credit Cards' },
  { value: 'bank_account', label: 'Bank Accounts' },
]

export default function StatementsPage() {
  const { groups, stats, isLoading, error, refetch, triggerProcessing } = useStatements()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  // Filter groups by payment method type
  const filteredGroups = typeFilter === 'all'
    ? groups
    : groups.filter(g => g.paymentMethodType === typeFilter)

  // Count by type for tab labels
  const creditCardCount = groups.filter(g => g.paymentMethodType === 'credit_card').reduce((sum, g) => sum + g.statements.length, 0)
  const bankAccountCount = groups.filter(g => g.paymentMethodType === 'bank_account').reduce((sum, g) => sum + g.statements.length, 0)

  const tabCounts: Record<TypeFilter, number> = {
    all: stats.total,
    credit_card: creditCardCount,
    bank_account: bankAccountCount,
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Statements Hub</h2>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Statement
        </Button>
      </div>

      {/* Stats bar */}
      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : stats.total > 0 ? (
        <StatementsStatsBar stats={stats} />
      ) : null}

      {/* Type filter tabs */}
      {!isLoading && stats.total > 0 && (
        <div className="flex items-center gap-2">
          {typeFilterTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                typeFilter === tab.value
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              )}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-70">
                {tabCounts[tab.value]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load statements: {error}
          <Button variant="link" size="sm" className="ml-2 text-destructive" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && stats.total === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-1">No statements yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a credit card or bank statement to get started.
          </p>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Statement
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {/* Filtered empty state */}
      {!isLoading && stats.total > 0 && filteredGroups.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No {typeFilter === 'credit_card' ? 'credit card' : 'bank account'} statements found.
        </div>
      )}

      {/* Grouped list */}
      {!isLoading && filteredGroups.map(group => (
        <div key={group.paymentMethodId}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {group.paymentMethodName}
          </h3>
          <div>
            {group.statements.map(stmt => (
              <StatementRow
                key={stmt.id}
                statement={stmt}
                paymentMethodType={group.paymentMethodType}
                onProcess={triggerProcessing}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Upload dialog */}
      <UploadStatementDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        paymentMethodId={null}
        expectedPeriod={null}
        onUploadComplete={() => refetch()}
      />
    </div>
  )
}
