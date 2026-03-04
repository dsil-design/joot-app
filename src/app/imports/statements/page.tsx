'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Upload, FileText } from 'lucide-react'
import { useStatements } from '@/hooks/use-statements'
import { StatementsStatsBar } from '@/components/page-specific/statements-stats-bar'
import { StatementRow } from '@/components/page-specific/statement-row'
import { UploadStatementDialog } from '@/components/page-specific/upload-statement-dialog'

export default function StatementsPage() {
  const { groups, stats, isLoading, error, refetch, triggerProcessing } = useStatements()

  const [uploadOpen, setUploadOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Statements</h2>
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

      {/* Grouped list */}
      {!isLoading && groups.map(group => (
        <div key={group.paymentMethodId}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {group.paymentMethodName}
          </h3>
          <div className="space-y-2">
            {group.statements.map(stmt => (
              <StatementRow
                key={stmt.id}
                statement={stmt}
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
