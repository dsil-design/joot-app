"use client"

import * as React from "react"
import { startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek, format, isSameMonth } from "date-fns"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { MainLayout } from "@/components/layouts/MainLayout"
import {
  MonthViewSummaryCards,
  MonthNavigation,
  WeekGroup,
  EmptyState,
  MonthViewLoading,
  QuickMatchModal,
  SkipTransactionDialog,
  MarkPaidDialog,
  VarianceDetailModal,
} from "@/components/month-view"
import {
  useMonthPlan,
  useExpectedTransactions,
  useMatchSuggestions,
  useSkipTransaction,
  useMatchTransaction,
  useVarianceReport,
  useGenerateExpectedTransactions,
  useAutoMatch,
} from "@/hooks"
import { toast } from "sonner"
import { AlertTriangle, RefreshCw, Zap } from "lucide-react"
import type { MarkPaidData } from "@/components/month-view"
import type { ExpectedTransaction } from "@/lib/types/recurring-transactions"

export default function MonthViewPage() {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(startOfMonth(new Date()))
  const monthYear = format(currentMonth, "yyyy-MM-dd")

  // Fetch month plan and expected transactions
  const { data: monthPlanData, isLoading: monthPlanLoading } = useMonthPlan(monthYear)
  const monthPlan = monthPlanData

  const { data: expectedTransactionsData, isLoading: expectedLoading } = useExpectedTransactions(
    monthPlan?.id || "",
    { include_matched: true }
  )
  const expectedTransactions = expectedTransactionsData?.expected_transactions || []

  // Variance report
  const { data: varianceData } = useVarianceReport(monthYear)
  const varianceReport = varianceData

  // Mutations
  const { mutateAsync: generateExpected, isPending: isGenerating } = useGenerateExpectedTransactions()
  const { mutateAsync: autoMatch, isPending: isAutoMatching } = useAutoMatch()
  const { mutateAsync: skipTransaction } = useSkipTransaction()
  const { mutateAsync: matchTransaction } = useMatchTransaction()

  // Modal states
  const [selectedExpectedTransaction, setSelectedExpectedTransaction] = React.useState<ExpectedTransaction | null>(null)
  const [isMatchModalOpen, setIsMatchModalOpen] = React.useState(false)
  const [isSkipDialogOpen, setIsSkipDialogOpen] = React.useState(false)
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = React.useState(false)
  const [isVarianceModalOpen, setIsVarianceModalOpen] = React.useState(false)

  // Match suggestions
  const { data: matchSuggestionsData } = useMatchSuggestions(monthPlan?.id || "")
  const matchSuggestions = matchSuggestionsData?.suggestions || []

  // Group transactions by week
  const weekGroups = React.useMemo(() => {
    if (!expectedTransactions.length) return []

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const weeks = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 0 }
    )

    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 })
      const weekTransactions = expectedTransactions.filter((et) => {
        const date = new Date(et.expected_date)
        return date >= weekStart && date <= weekEnd
      })

      // Sort by date
      weekTransactions.sort((a, b) =>
        new Date(a.expected_date).getTime() - new Date(b.expected_date).getTime()
      )

      return {
        weekStart,
        weekEnd,
        label: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`,
        transactions: weekTransactions,
      }
    }).filter(group => group.transactions.length > 0)
  }, [expectedTransactions, currentMonth])

  // Calculate variance count for alert
  const varianceCount = expectedTransactions.filter(
    (et) => et.status === "matched" && et.variance_amount !== null && Math.abs(et.variance_amount) > 0
  ).length

  const overdueCount = expectedTransactions.filter(
    (et) => et.status === "overdue"
  ).length

  // Handlers
  const handleGenerateExpected = async () => {
    if (!monthPlan?.id) {
      toast.error("No month plan found")
      return
    }

    try {
      await generateExpected({ monthPlanId: monthPlan.id })
      toast.success("Expected transactions generated successfully")
    } catch (error) {
      toast.error("Failed to generate expected transactions")
    }
  }

  const handleAutoMatch = async () => {
    if (!monthPlan?.id) {
      toast.error("No month plan found")
      return
    }

    try {
      const result = await autoMatch({
        monthPlanId: monthPlan.id,
        options: { confidence_threshold: 85 },
      })
      toast.success(`Matched ${result.matched_count} transactions`)
    } catch (error) {
      toast.error("Failed to auto-match transactions")
    }
  }

  const handleMatch = (expectedId: string) => {
    const expected = expectedTransactions.find((et) => et.id === expectedId)
    if (expected) {
      setSelectedExpectedTransaction(expected)
      setIsMatchModalOpen(true)
    }
  }

  const handleSkip = (expectedId: string) => {
    const expected = expectedTransactions.find((et) => et.id === expectedId)
    if (expected) {
      setSelectedExpectedTransaction(expected)
      setIsSkipDialogOpen(true)
    }
  }

  const handleMarkPaid = (expectedId: string) => {
    const expected = expectedTransactions.find((et) => et.id === expectedId)
    if (expected) {
      setSelectedExpectedTransaction(expected)
      setIsMarkPaidDialogOpen(true)
    }
  }

  const handleConfirmMatch = async (expectedId: string, transactionId: string) => {
    try {
      await matchTransaction({
        expectedTransactionId: expectedId,
        data: { transaction_id: transactionId },
      })
      toast.success("Transaction matched successfully")
    } catch (error) {
      toast.error("Failed to match transaction")
    }
  }

  const handleConfirmSkip = async (expectedId: string, notes?: string) => {
    try {
      await skipTransaction({
        expectedTransactionId: expectedId,
        data: notes ? { notes } : undefined,
      })
      toast.success("Transaction skipped")
    } catch (error) {
      toast.error("Failed to skip transaction")
    }
  }

  const handleConfirmMarkPaid = async (data: MarkPaidData) => {
    // TODO: Implement mark as paid logic
    // This would create an actual transaction if createActualTransaction is true
    toast.info("Mark as paid feature coming soon")
  }

  const isLoading = monthPlanLoading || expectedLoading

  return (
    <MainLayout showSidebar={true} showMobileNav={false}>
      <div className="w-full max-w-md md:max-w-none mx-auto bg-white flex flex-col gap-6 min-h-screen pb-32 pt-6 md:pt-12 px-6 md:px-8">
        {/* Page Title */}
        <div className="flex flex-col gap-4 w-full">
          <h1 className="text-[36px] font-medium text-foreground leading-[40px]">
            Month View
          </h1>
          {/* Navigation Bar - Mobile/Tablet only */}
          <div className="lg:hidden">
            <div className="border-b border-border">
              <nav className="flex gap-4 overflow-x-auto scrollbar-hide">
                <a href="/home" className="py-3 px-1 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-foreground whitespace-nowrap">
                  Home
                </a>
                <a href="/transactions" className="py-3 px-1 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-foreground whitespace-nowrap">
                  All Transactions
                </a>
                <a href="/month-view" className="py-3 px-1 text-sm font-medium text-foreground border-b-2 border-foreground whitespace-nowrap">
                  Month View
                </a>
                <a href="/templates" className="py-3 px-1 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-foreground whitespace-nowrap">
                  Templates
                </a>
                <a href="/documents" className="py-3 px-1 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-foreground whitespace-nowrap">
                  Documents
                </a>
                <a href="/reconciliation" className="py-3 px-1 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-foreground whitespace-nowrap">
                  Reconciliation
                </a>
              </nav>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <MonthNavigation
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateExpected}
                disabled={isGenerating || !monthPlan}
              >
                <RefreshCw className={`size-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
                {isGenerating ? "Generating..." : "Generate Expected"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoMatch}
                disabled={isAutoMatching || !monthPlan}
              >
                <Zap className={`size-4 mr-2 ${isAutoMatching ? "animate-pulse" : ""}`} />
                {isAutoMatching ? "Matching..." : "Auto-Match"}
              </Button>
            </div>
          </div>

          {/* Variance Alert */}
          {(varianceCount > 0 || overdueCount > 0) && (
            <Alert variant="default" className="border-amber-200 bg-amber-50">
              <AlertTriangle className="size-4 text-amber-600" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-sm text-amber-900">
                  {varianceCount > 0 && `${varianceCount} transaction${varianceCount > 1 ? "s" : ""} differ from expected amounts`}
                  {varianceCount > 0 && overdueCount > 0 && " • "}
                  {overdueCount > 0 && `${overdueCount} overdue transaction${overdueCount > 1 ? "s" : ""}`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVarianceModalOpen(true)}
                  className="text-amber-900 hover:bg-amber-100"
                >
                  Review Details →
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : monthPlan?.stats ? (
            <MonthViewSummaryCards stats={monthPlan.stats} />
          ) : null}

          {/* Week Groups */}
          {isLoading ? (
            <MonthViewLoading />
          ) : weekGroups.length === 0 ? (
            <EmptyState
              variant="no-expected-transactions"
              onAction={handleGenerateExpected}
              actionLabel="Generate from Templates"
            />
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {weekGroups.map((group, index) => (
                <WeekGroup
                  key={index}
                  weekLabel={group.label}
                  startDate={group.weekStart}
                  endDate={group.weekEnd}
                  expectedTransactions={group.transactions}
                  onMatch={handleMatch}
                  onSkip={handleSkip}
                  onMarkPaid={handleMarkPaid}
                  defaultExpanded={index === 0}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modals */}
        <QuickMatchModal
          open={isMatchModalOpen}
          onOpenChange={setIsMatchModalOpen}
          expectedTransaction={selectedExpectedTransaction}
          matchSuggestions={matchSuggestions.filter(
            (s) => s.expected_transaction_id === selectedExpectedTransaction?.id
          )}
          onMatch={handleConfirmMatch}
        />

        <SkipTransactionDialog
          open={isSkipDialogOpen}
          onOpenChange={setIsSkipDialogOpen}
          expectedTransaction={selectedExpectedTransaction}
          onSkip={handleConfirmSkip}
        />

        <MarkPaidDialog
          open={isMarkPaidDialogOpen}
          onOpenChange={setIsMarkPaidDialogOpen}
          expectedTransaction={selectedExpectedTransaction}
          onMarkPaid={handleConfirmMarkPaid}
        />

        <VarianceDetailModal
          open={isVarianceModalOpen}
          onOpenChange={setIsVarianceModalOpen}
          varianceReport={varianceReport || null}
        />
      </div>
    </MainLayout>
  )
}
