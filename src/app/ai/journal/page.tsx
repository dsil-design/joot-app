'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Brain, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useAiJournal, useAiJournalStats } from '@/hooks/use-ai-journal'
import { useAiInsights } from '@/hooks/use-ai-insights'
import { AiJournalStatsBar } from '@/components/page-specific/ai-journal-stats-bar'
import { AiJournalInsightsList } from '@/components/page-specific/ai-journal-insights-list'
import { AiJournalLogTable } from '@/components/page-specific/ai-journal-log-table'

export default function AiJournalPage() {
  const [page, setPage] = useState(1)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const { stats, isLoading: statsLoading, refetch: refetchStats } = useAiJournalStats()
  const { insights, isLoading: insightsLoading, updateInsight, runAnalysis } = useAiInsights()
  const {
    entries,
    total,
    totalPages,
    isLoading: journalLoading,
    refetch: refetchJournal,
  } = useAiJournal({ page })

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      const result = await runAnalysis()
      if (result?.success) {
        toast.success(`Analysis complete: ${result.insights_found} insights found`)
        refetchStats()
      } else {
        toast.error('Analysis could not be completed')
      }
    } catch {
      toast.error('Failed to run analysis')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDismiss = async (id: string) => {
    const success = await updateInsight(id, 'dismiss')
    if (success) {
      toast.success('Insight dismissed')
      refetchStats()
    }
  }

  const handleImplement = async (id: string) => {
    const success = await updateInsight(id, 'implement')
    if (success) {
      toast.success('Insight marked as implemented')
      refetchStats()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold">AI Journal</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchStats()
              refetchJournal()
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Run Analysis'
            )}
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <AiJournalStatsBar stats={stats} isLoading={statsLoading} />

      {/* Active Insights */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">
          Active Insights ({insights.length})
        </h3>
        <AiJournalInsightsList
          insights={insights}
          isLoading={insightsLoading}
          onDismiss={handleDismiss}
          onImplement={handleImplement}
        />
      </div>

      {/* Journal Log */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">
          Journal Log
        </h3>
        <AiJournalLogTable
          entries={entries}
          total={total}
          page={page}
          totalPages={totalPages}
          isLoading={journalLoading}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
