"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HomeTransactionList } from '@/components/page-specific/home-transaction-list'
import { AddTransactionFooter } from '@/components/page-specific/add-transaction-footer'
import { ComparisonMetric } from '@/components/ui/comparison-metric'
import { MiniSparkline } from '@/components/ui/mini-sparkline'
import { MonthlyTrendChart } from '@/components/ui/monthly-trend-chart'
import { TopVendorsWidget } from '@/components/ui/top-vendors-widget'
import { MainNavigation } from '@/components/page-specific/main-navigation'
import { SidebarNavigation } from '@/components/page-specific/sidebar-navigation'
import { X, Plus, ArrowRight } from 'lucide-react'
import type { TransactionWithVendorAndPayment } from '@/lib/supabase/types'
import type { EnhancedMonthlySummary, YTDSummary, MonthlyTrendData, TopVendor } from '@/lib/utils/monthly-summary'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TransactionForm, type TransactionFormData } from '@/components/forms/transaction-form'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { useTransactions } from '@/hooks/use-transactions'
import { formatCurrency } from '@/lib/utils'

interface HomePageClientProps {
  fullName: string
  userInitials: string
  userEmail: string
  isAdmin: boolean
  currentMonthName: string
  enhancedMonthlySummary: EnhancedMonthlySummary | null
  ytdSummary: YTDSummary | null
  monthlyTrend: MonthlyTrendData[]
  topVendors: TopVendor[]
  exchangeRate: string
  exchangeRateTimestamp: string
  transactionGroups: { [key: string]: TransactionWithVendorAndPayment[] }
  errorMessage?: string
}

export function HomePageClient({
  fullName,
  userInitials,
  userEmail,
  isAdmin,
  currentMonthName,
  enhancedMonthlySummary,
  ytdSummary,
  monthlyTrend,
  topVendors,
  exchangeRate,
  exchangeRateTimestamp,
  transactionGroups,
  errorMessage
}: HomePageClientProps) {
  // Fallback for empty state
  const monthlySummary = enhancedMonthlySummary || {
    income: 0,
    expenses: 0,
    net: 0,
    currency: 'USD' as const,
    transactionCount: 0,
    incomeCount: 0,
    expenseCount: 0,
    previousMonth: {
      income: { current: 0, previous: 0, changePercent: 0, changeDirection: 'neutral' as const },
      expenses: { current: 0, previous: 0, changePercent: 0, changeDirection: 'neutral' as const },
      net: { current: 0, previous: 0, changePercent: 0, changeDirection: 'neutral' as const }
    },
    twelveMonthAverage: {
      income: { current: 0, previous: 0, changePercent: 0, changeDirection: 'neutral' as const },
      expenses: { current: 0, previous: 0, changePercent: 0, changeDirection: 'neutral' as const },
      net: { current: 0, previous: 0, changePercent: 0, changeDirection: 'neutral' as const }
    },
    dailySpendTrend: [],
    daysElapsed: 0,
    daysInMonth: 30,
    percentElapsed: 0
  }
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { createTransaction } = useTransactions()

  const handleSaveTransaction = async (formData: TransactionFormData) => {
    setSaving(true)

    try {
      const transactionData = {
        description: formData.description.trim() || undefined,
        vendorId: formData.vendor || undefined,
        paymentMethodId: formData.paymentMethod || undefined,
        tagIds: formData.tags || undefined,
        amount: parseFloat(formData.amount),
        originalCurrency: formData.currency,
        transactionType: formData.transactionType,
        transactionDate: format(formData.transactionDate, "yyyy-MM-dd")
      }

      const result = await createTransaction(transactionData)

      if (result) {
        toast.success("Transaction saved successfully!")
        setIsAddModalOpen(false)
      } else {
        toast.error("Failed to save transaction")
      }
    } catch (error) {
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndAddAnother = async (formData: TransactionFormData): Promise<boolean> => {
    setSaving(true)

    try {
      const transactionData = {
        description: formData.description.trim() || undefined,
        vendorId: formData.vendor || undefined,
        paymentMethodId: formData.paymentMethod || undefined,
        tagIds: formData.tags || undefined,
        amount: parseFloat(formData.amount),
        originalCurrency: formData.currency,
        transactionType: formData.transactionType,
        transactionDate: format(formData.transactionDate, "yyyy-MM-dd")
      }

      const result = await createTransaction(transactionData)

      if (result) {
        toast.success("Transaction saved successfully!")
        return true
      } else {
        toast.error("Failed to save transaction")
        return false
      }
    } catch (error) {
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleCancelTransaction = () => {
    toast.info("Transaction discarded")
    setIsAddModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Navigation - Desktop only */}
      <SidebarNavigation
        user={{
          fullName,
          email: userEmail,
          initials: userInitials
        }}
      />

      {/* Main Content Area with sidebar offset */}
      <main className="lg:ml-[240px]">
        {/* Error message for unauthorized access */}
        {errorMessage && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
            <Card className="bg-destructive/10 border-destructive text-destructive p-4 shadow-lg max-w-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {errorMessage === 'unauthorized' || errorMessage === 'auth_error'
                    ? 'Access denied. Admin privileges required.'
                    : errorMessage}
                </span>
                <Button variant="ghost" size="sm" className="h-auto p-1 text-destructive hover:text-destructive/80">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Main scrollable content */}
        <div className="flex flex-col gap-6 pb-12 pt-6 md:pt-12 px-6 md:px-10">
        {/* Header with Navigation */}
        <div className="flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-[36px] font-medium text-foreground leading-[40px]">
              Home
            </h1>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="hidden md:flex gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg h-10"
            >
              <Plus className="size-5" />
              <span className="text-[14px] font-medium leading-[20px]">
                Add transaction
              </span>
            </Button>
          </div>
          {/* Navigation Bar - Mobile/Tablet only */}
          <div className="lg:hidden">
            <MainNavigation />
          </div>
        </div>

        {/* Main Content - Figma Design Implementation */}
        <div className="flex flex-col gap-4 w-full">
          {/* Monthly Summary and YTD Summary - Side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
            {/* Current Month Summary */}
            <div className="flex flex-col gap-2 items-start justify-start">
              <div className="flex items-center justify-between w-full">
                <div className="text-[12px] font-medium text-muted-foreground leading-4">
                  {currentMonthName}
                </div>
                <div className="text-[12px] font-normal text-zinc-400 leading-4">
                  {monthlySummary.daysElapsed} of {monthlySummary.daysInMonth} days ({monthlySummary.percentElapsed}%)
                </div>
              </div>
              <Card className="bg-white border-zinc-200 rounded-lg shadow-sm p-0 w-full">
                <div className="p-6">
                  <div className="grid grid-cols-1 gap-6">
                    {/* Total Income */}
                    <div className="flex flex-col gap-2">
                      <div className="text-[12px] font-medium text-zinc-500 leading-4">
                        Total Income
                      </div>
                      <div className="text-[24px] font-semibold text-green-600 leading-[32px]">
                        {formatCurrency(monthlySummary.income, 'USD')}
                      </div>
                      <div className="text-[12px] font-normal text-zinc-400 leading-4">
                        {monthlySummary.incomeCount} {monthlySummary.incomeCount === 1 ? 'transaction' : 'transactions'}
                      </div>
                      {monthlySummary.previousMonth && (
                        <ComparisonMetric
                          value={monthlySummary.previousMonth.income.current}
                          changeDirection={monthlySummary.previousMonth.income.changeDirection}
                          changePercent={monthlySummary.previousMonth.income.changePercent}
                          label="vs last month"
                          variant="default"
                        />
                      )}
                    </div>

                    {/* Total Expenses */}
                    <div className="flex flex-col gap-2">
                      <div className="text-[12px] font-medium text-zinc-500 leading-4">
                        Total Expenses
                      </div>
                      <div className="text-[24px] font-semibold text-red-600 leading-[32px]">
                        {formatCurrency(monthlySummary.expenses, 'USD')}
                      </div>
                      <div className="text-[12px] font-normal text-zinc-400 leading-4">
                        {monthlySummary.expenseCount} {monthlySummary.expenseCount === 1 ? 'transaction' : 'transactions'}
                      </div>
                      {monthlySummary.previousMonth && (
                        <ComparisonMetric
                          value={monthlySummary.previousMonth.expenses.current}
                          changeDirection={monthlySummary.previousMonth.expenses.changeDirection}
                          changePercent={monthlySummary.previousMonth.expenses.changePercent}
                          label="vs last month"
                          variant="inverse"
                        />
                      )}
                      {monthlySummary.dailySpendTrend.length > 0 && (
                        <div className="mt-2">
                          <MiniSparkline data={monthlySummary.dailySpendTrend} color="#ef4444" height={32} />
                        </div>
                      )}
                    </div>

                    {/* Net Surplus/Deficit */}
                    <div className="flex flex-col gap-2">
                      <div className="text-[12px] font-medium text-zinc-500 leading-4">
                        Net {monthlySummary.net >= 0 ? 'Surplus' : 'Deficit'}
                      </div>
                      <div className={`text-[24px] font-semibold leading-[32px] ${
                        monthlySummary.net >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(Math.abs(monthlySummary.net), 'USD')}
                      </div>
                      <div className="text-[12px] font-normal text-zinc-400 leading-4">
                        {monthlySummary.transactionCount} total {monthlySummary.transactionCount === 1 ? 'transaction' : 'transactions'}
                      </div>
                      {monthlySummary.previousMonth && (
                        <ComparisonMetric
                          value={monthlySummary.previousMonth.net.current}
                          changeDirection={monthlySummary.previousMonth.net.changeDirection}
                          changePercent={monthlySummary.previousMonth.net.changePercent}
                          label="vs last month"
                          variant="default"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* YTD Summary and Exchange Rate - Combined */}
            {ytdSummary && (
              <div className="flex flex-col gap-2 items-start justify-start">
                <div className="text-[12px] font-medium text-muted-foreground leading-4">
                  Year to Date (2025)
                </div>
                <Card className="bg-white border-zinc-200 rounded-lg shadow-sm p-0 w-full">
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-6">
                      {/* YTD Income */}
                      <div className="flex flex-col gap-1">
                        <div className="text-[12px] font-medium text-zinc-500 leading-4">
                          Total Income
                        </div>
                        <div className="text-[24px] font-semibold text-green-600 leading-[32px]">
                          {formatCurrency(ytdSummary.income, 'USD')}
                        </div>
                        <div className="text-[12px] font-normal text-zinc-400 leading-4">
                          {formatCurrency(ytdSummary.averageMonthlyIncome, 'USD')}/month avg
                        </div>
                      </div>

                      {/* YTD Expenses */}
                      <div className="flex flex-col gap-1">
                        <div className="text-[12px] font-medium text-zinc-500 leading-4">
                          Total Expenses
                        </div>
                        <div className="text-[24px] font-semibold text-red-600 leading-[32px]">
                          {formatCurrency(ytdSummary.expenses, 'USD')}
                        </div>
                        <div className="text-[12px] font-normal text-zinc-400 leading-4">
                          {formatCurrency(ytdSummary.averageMonthlyExpenses, 'USD')}/month avg
                        </div>
                      </div>

                      {/* YTD Net */}
                      <div className="flex flex-col gap-1">
                        <div className="text-[12px] font-medium text-zinc-500 leading-4">
                          Net {ytdSummary.net >= 0 ? 'Surplus' : 'Deficit'}
                        </div>
                        <div className={`text-[24px] font-semibold leading-[32px] ${
                          ytdSummary.net >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(Math.abs(ytdSummary.net), 'USD')}
                        </div>
                        <div className="text-[12px] font-normal text-zinc-400 leading-4">
                          {ytdSummary.savingsRate.toFixed(1)}% savings rate
                        </div>
                      </div>

                      {/* Exchange Rate - Compact */}
                      <div className="flex flex-col gap-1 pt-4 border-t border-zinc-200">
                        <div className="text-[12px] font-medium text-zinc-500 leading-4">
                          Latest exchange rate
                        </div>
                        <div className="text-[20px] font-medium text-zinc-950 leading-[28px]">
                          {exchangeRate}
                        </div>
                        <div className="text-[12px] font-normal text-zinc-400 leading-4">
                          1 USD as of {exchangeRateTimestamp}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* 12-Month Trend Chart */}
          {monthlyTrend.length > 0 && (
            <div className="flex flex-col gap-2 items-start justify-start w-full">
              <div className="text-[12px] font-medium text-muted-foreground leading-4">
                12-Month Trend
              </div>
              <Card className="bg-white border-zinc-200 rounded-lg shadow-sm p-0 w-full">
                <div className="p-6">
                  <MonthlyTrendChart data={monthlyTrend} height={300} />
                </div>
              </Card>
            </div>
          )}

          {/* Top Vendors and Recent Transactions - Side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
            {/* Top Vendors */}
            {topVendors.length > 0 && (
              <div className="flex flex-col gap-2 items-start justify-start">
                <div className="text-[12px] font-medium text-muted-foreground leading-4">
                  Top Spending
                </div>
                <Card className="bg-white border-zinc-200 rounded-lg shadow-sm p-0 w-full">
                  <div className="p-6">
                    <TopVendorsWidget vendors={topVendors} timeframeLabel="Year to Date" />
                  </div>
                </Card>
              </div>
            )}

            {/* Recent Transactions with Enhanced Footer */}
            <div className="flex flex-col gap-2 items-start justify-start">
              <div className="flex gap-4 items-center justify-between w-full">
                <div className="flex-1 text-[12px] font-medium text-muted-foreground leading-4">
                  Recent Transactions
                </div>
              </div>
              <Card className="bg-white border-zinc-200 rounded-lg shadow-sm p-0 w-full">
                <div className="p-6">
                  {/* Transaction Groups by Day */}
                  <HomeTransactionList transactionGroups={transactionGroups} />

                  {/* Enhanced Footer with CTAs */}
                  <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-200">
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href="/transactions" className="flex items-center justify-center gap-2">
                        View All Transactions
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => setIsAddModalOpen(true)}
                    >
                      Add Transaction
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
        </div>
      </main>

      {/* Fixed Sticky Footer - Always visible at bottom on mobile */}
      <AddTransactionFooter />

      {/* Add Transaction Modal (Desktop only) */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-medium text-zinc-950">
              Add transaction
            </DialogTitle>
          </DialogHeader>
          <TransactionForm
            mode="add"
            onSave={handleSaveTransaction}
            onSaveAndAddAnother={handleSaveAndAddAnother}
            onCancel={handleCancelTransaction}
            saving={saving}
            showDateStepper={true}
            useStandardAmountInput={false}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
