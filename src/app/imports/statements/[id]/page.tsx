'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { StatementDetailHeader } from '@/components/page-specific/statement-detail-header'
import { StatementTransactionList } from '@/components/page-specific/statement-transaction-list'
import { JootTransactionList } from '@/components/page-specific/joot-transaction-list'
import {
  LinkToExistingDialog,
  type LinkSourceItem,
} from '@/components/page-specific/link-to-existing-dialog'
import {
  CreateFromImportDialog,
  type CreateFromImportData,
} from '@/components/page-specific/create-from-import-dialog'
import { useMatchActions } from '@/hooks/use-match-actions'
import { useTransactions } from '@/hooks'
import { toast } from 'sonner'
import { RefreshCw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface StatementInfo {
  id: string
  filename: string
  payment_method: { id: string; name: string } | null
  period: { start: string | null; end: string | null }
  processed_at: string | null
}

interface ProcessingResult {
  statement: StatementInfo
  status: 'pending' | 'processing' | 'completed' | 'failed'
  summary: {
    total_extracted: number
    total_matched: number
    total_new: number
    warnings: string[]
    parser_used: string | null
  } | null
  error?: string | null
  progress?: {
    step: string
    percent: number
    message: string
  } | null
}

async function fetchResults(statementId: string): Promise<ProcessingResult | null> {
  try {
    const response = await fetch(`/api/statements/${statementId}/matches`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

export default function StatementDetailPage() {
  const params = useParams<{ id: string }>()
  const statementId = params?.id as string

  const [result, setResult] = React.useState<ProcessingResult | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [highlightedMatchId, setHighlightedMatchId] = React.useState<string | null>(null)

  // Dialog state
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false)
  const [linkingItem, setLinkingItem] = React.useState<LinkSourceItem | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [createDialogData, setCreateDialogData] = React.useState<CreateFromImportData | null>(null)

  // Hooks
  const { linkToExisting } = useMatchActions({})
  const { createTransaction } = useTransactions()

  // Fetch on mount
  React.useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const data = await fetchResults(statementId)
      if (!data) {
        setError('Statement not found')
      } else {
        setResult(data)
      }
      setIsLoading(false)
    }
    load()
  }, [statementId])

  // Poll while processing
  React.useEffect(() => {
    if (result?.status === 'processing') {
      const interval = setInterval(async () => {
        const data = await fetchResults(statementId)
        if (data) {
          setResult(data)
          if (data.status !== 'processing') {
            clearInterval(interval)
          }
        }
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [result?.status, statementId])

  // Handle link from statement transaction list
  const handleLinkClick = (item: { description: string; amount: number; currency: string; date: string }) => {
    setLinkingItem({
      id: `stmt-${statementId}-${item.description}`,
      description: item.description,
      amount: item.amount,
      currency: item.currency,
      date: item.date,
    })
    setLinkDialogOpen(true)
  }

  const handleLinkConfirm = async (transactionId: string) => {
    if (!linkingItem) return
    await linkToExisting(linkingItem.id, transactionId)
    setLinkDialogOpen(false)
    setLinkingItem(null)
    toast.success('Transaction linked')
  }

  // Handle create from statement transaction list
  const handleCreateClick = (item: { description: string; amount: number; currency: string; date: string }) => {
    setCreateDialogData({
      compositeId: `stmt-${statementId}-${item.description}`,
      description: item.description,
      amount: item.amount,
      currency: item.currency,
      date: item.date,
    })
    setCreateDialogOpen(true)
  }

  const handleCreateConfirm = async (
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
  ) => {
    const result = await createTransaction({
      description: transactionData.description,
      amount: transactionData.amount,
      originalCurrency: transactionData.currency as 'USD' | 'THB',
      transactionDate: transactionData.date,
      transactionType: transactionData.transactionType as 'expense' | 'income',
      vendorId: transactionData.vendorId,
      paymentMethodId: transactionData.paymentMethodId,
      tagIds: transactionData.tagIds,
    })

    if (!result) throw new Error('Failed to create transaction')

    await linkToExisting(compositeId, result.id)
    toast.success('Transaction created and linked')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Error state
  if (error || !result) {
    return (
      <div className="text-center py-16">
        <XCircle className="h-12 w-12 mx-auto text-destructive/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">{error || 'Not found'}</h3>
        <Button asChild variant="outline">
          <Link href="/imports">Back to Coverage</Link>
        </Button>
      </div>
    )
  }

  const { statement, status, summary } = result
  const pmName = statement.payment_method?.name || 'Unknown'
  const pmId = statement.payment_method?.id || ''

  // Processing state
  if (status === 'processing') {
    return (
      <div className="space-y-6">
        <StatementDetailHeader
          paymentMethodName={pmName}
          period={statement.period}
          status={status}
          filename={statement.filename}
          stats={{ extracted: 0, matched: 0, unmatched: 0 }}
          matchRate={0}
        />
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              <span className="font-medium text-blue-900">Processing statement...</span>
            </div>
            {result.progress && (
              <>
                <Progress value={result.progress.percent} className="h-2" />
                <p className="text-sm text-blue-700">{result.progress.message}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Completed state
  const extracted = summary?.total_extracted ?? 0
  const matched = summary?.total_matched ?? 0
  const unmatched = extracted - matched
  const matchRate = extracted > 0 ? Math.round((matched / extracted) * 100) : 0

  return (
    <div className="space-y-6">
      <StatementDetailHeader
        paymentMethodName={pmName}
        period={statement.period}
        status={status}
        filename={statement.filename}
        stats={{ extracted, matched, unmatched }}
        matchRate={matchRate}
      />

      {/* Tabs */}
      {status === 'completed' && (
        <Tabs defaultValue="statement" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="statement">
              Statement Transactions ({extracted})
            </TabsTrigger>
            <TabsTrigger value="joot">
              Joot Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="statement" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                <StatementTransactionList
                  statementId={statementId}
                  onLinkClick={handleLinkClick}
                  onCreateClick={handleCreateClick}
                  highlightedMatchId={highlightedMatchId}
                  onRowClick={(matchedTxId) => setHighlightedMatchId(matchedTxId)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="joot" className="mt-4">
            <Card>
              <CardContent className="pt-4">
                {pmId && statement.period.start && statement.period.end ? (
                  <JootTransactionList
                    statementId={statementId}
                    paymentMethodId={pmId}
                    periodStart={statement.period.start}
                    periodEnd={statement.period.end}
                    highlightedTransactionId={highlightedMatchId}
                    onRowClick={(txId) => setHighlightedMatchId(txId)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Payment method or period information unavailable.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Metadata */}
      {summary && summary.warnings.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm font-medium mb-2">Warnings</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {summary.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Link to existing dialog */}
      <LinkToExistingDialog
        open={linkDialogOpen}
        onOpenChange={(open) => {
          setLinkDialogOpen(open)
          if (!open) setLinkingItem(null)
        }}
        item={linkingItem}
        onConfirm={handleLinkConfirm}
      />

      {/* Create from import dialog */}
      <CreateFromImportDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) setCreateDialogData(null)
        }}
        data={createDialogData}
        onConfirm={handleCreateConfirm}
      />
    </div>
  )
}
