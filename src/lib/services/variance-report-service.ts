/**
 * Variance Report Service
 *
 * Generates variance reports and analytics for expected vs actual transactions.
 * Provides insights into spending patterns, budget adherence, and anomalies.
 */

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type {
  VarianceReport,
  VarianceSummary,
  CategoryVariance,
  VendorVariance,
  VarianceItem,
  VarianceTrend,
  CurrencyType,
  ExpectedTransaction,
} from '@/lib/types/recurring-transactions'

type DbClient = SupabaseClient<Database>

interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

/**
 * Variance Report Service class
 * Generates comprehensive variance analysis and reporting
 */
export class VarianceReportService {
  private supabase: DbClient

  constructor(supabase: DbClient) {
    this.supabase = supabase
  }

  /**
   * Generate comprehensive variance report for a month
   *
   * @param monthPlanId - Month plan ID
   * @param userId - User ID for authorization
   * @returns Complete variance report with summary and breakdowns
   */
  async generateMonthVarianceReport(
    monthPlanId: string,
    userId: string
  ): Promise<ServiceResponse<VarianceReport>> {
    try {
      // Get month plan details
      const { data: monthPlan, error: planError } = await this.supabase
        .from('month_plans')
        .select('month_year')
        .eq('id', monthPlanId)
        .eq('user_id', userId)
        .single()

      if (planError || !monthPlan) {
        return { data: null, error: 'Month plan not found' }
      }

      // Generate all report sections
      const [summary, byCategory, byVendor, largestVariances] = await Promise.all([
        this.generateVarianceSummary(monthPlanId, userId),
        this.getVariancesByCategory(monthPlanId, userId),
        this.getVariancesByVendor(monthPlanId, userId),
        this.getLargestVariances(monthPlanId, userId, 10),
      ])

      if (summary.error || !summary.data) {
        return { data: null, error: summary.error || 'Failed to generate summary' }
      }

      const report: VarianceReport = {
        month_year: monthPlan.month_year,
        summary: summary.data,
        by_category: byCategory.data || [],
        by_vendor: byVendor.data || [],
        largest_variances: largestVariances.data || [],
      }

      return { data: report, error: null }
    } catch (error) {
      console.error('Unexpected error generating variance report:', error)
      return { data: null, error: 'Failed to generate variance report' }
    }
  }

  /**
   * Get variance breakdown by category (tags)
   *
   * @param monthPlanId - Month plan ID
   * @param userId - User ID for authorization
   * @returns Array of category variances
   */
  async getVariancesByCategory(
    monthPlanId: string,
    userId: string
  ): Promise<ServiceResponse<CategoryVariance[]>> {
    try {
      // Get all expected transactions with tags
      const { data: expectedTransactions, error } = await this.supabase
        .from('expected_transactions')
        .select(`
          *,
          expected_transaction_tags!expected_transaction_tags_expected_transaction_id_fkey (
            tags!expected_transaction_tags_tag_id_fkey (id, name, color)
          )
        `)
        .eq('month_plan_id', monthPlanId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching expected transactions:', error)
        return { data: null, error: error.message }
      }

      // Group by tag
      const categoryMap = new Map<string, {
        tag: { id: string; name: string; color: string }
        expected: Partial<Record<CurrencyType, number>>
        actual: Partial<Record<CurrencyType, number>>
      }>()

      for (const et of expectedTransactions) {
        const tags = et.expected_transaction_tags?.map((ett: any) => ett.tags) || []

        // If no tags, add to "Uncategorized"
        if (tags.length === 0) {
          tags.push({ id: 'uncategorized', name: 'Uncategorized', color: '#9ca3af' })
        }

        for (const tag of tags) {
          if (!categoryMap.has(tag.id)) {
            categoryMap.set(tag.id, {
              tag: { id: tag.id, name: tag.name, color: tag.color },
              expected: {},
              actual: {},
            })
          }

          const category = categoryMap.get(tag.id)!
          const currency = et.original_currency as CurrencyType

          // Add expected amount
          category.expected[currency] =
            (category.expected[currency] || 0) + parseFloat(et.expected_amount as any)

          // Add actual amount if matched
          if (et.status === 'matched' && et.actual_amount) {
            category.actual[currency] =
              (category.actual[currency] || 0) + parseFloat(et.actual_amount as any)
          }
        }
      }

      // Calculate variances and percentages
      const variances: CategoryVariance[] = []

      for (const [_, category] of categoryMap) {
        const variance: Partial<Record<CurrencyType, number>> = {}
        let totalExpected = 0
        let totalVariance = 0

        // Calculate variance for each currency
        for (const [currency, expectedAmount] of Object.entries(category.expected)) {
          const curr = currency as CurrencyType
          const actualAmount = category.actual[curr] || 0
          const expected = (expectedAmount as number) || 0
          variance[curr] = actualAmount - expected
          totalExpected += expected
          totalVariance += actualAmount - expected
        }

        const variancePercentage = totalExpected > 0 ? (totalVariance / totalExpected) * 100 : 0

        variances.push({
          tag: category.tag,
          expected: category.expected,
          actual: category.actual,
          variance,
          variance_percentage: variancePercentage,
        })
      }

      // Sort by absolute variance percentage (descending)
      variances.sort((a, b) => Math.abs(b.variance_percentage) - Math.abs(a.variance_percentage))

      return { data: variances, error: null }
    } catch (error) {
      console.error('Unexpected error calculating category variances:', error)
      return { data: null, error: 'Failed to calculate category variances' }
    }
  }

  /**
   * Get variance breakdown by vendor
   *
   * @param monthPlanId - Month plan ID
   * @param userId - User ID for authorization
   * @returns Array of vendor variances
   */
  async getVariancesByVendor(
    monthPlanId: string,
    userId: string
  ): Promise<ServiceResponse<VendorVariance[]>> {
    try {
      // Get all expected transactions with vendors
      const { data: expectedTransactions, error } = await this.supabase
        .from('expected_transactions')
        .select(`
          *,
          vendors!expected_transactions_vendor_id_fkey (id, name)
        `)
        .eq('month_plan_id', monthPlanId)
        .eq('user_id', userId)
        .not('vendor_id', 'is', null)

      if (error) {
        console.error('Error fetching expected transactions:', error)
        return { data: null, error: error.message }
      }

      // Group by vendor
      const vendorMap = new Map<string, {
        vendor: { id: string; name: string }
        expected: Partial<Record<CurrencyType, number>>
        actual: Partial<Record<CurrencyType, number>>
      }>()

      for (const et of expectedTransactions) {
        if (!et.vendors) continue

        const vendorId = et.vendors.id

        if (!vendorMap.has(vendorId)) {
          vendorMap.set(vendorId, {
            vendor: { id: et.vendors.id, name: et.vendors.name },
            expected: {},
            actual: {},
          })
        }

        const vendor = vendorMap.get(vendorId)!
        const currency = et.original_currency as CurrencyType

        // Add expected amount
        vendor.expected[currency] =
          (vendor.expected[currency] || 0) + parseFloat(et.expected_amount as any)

        // Add actual amount if matched
        if (et.status === 'matched' && et.actual_amount) {
          vendor.actual[currency] =
            (vendor.actual[currency] || 0) + parseFloat(et.actual_amount as any)
        }
      }

      // Calculate variances and percentages
      const variances: VendorVariance[] = []

      for (const [_, vendor] of vendorMap) {
        const variance: Partial<Record<CurrencyType, number>> = {}
        let totalExpected = 0
        let totalVariance = 0

        // Calculate variance for each currency
        for (const [currency, expectedAmount] of Object.entries(vendor.expected)) {
          const curr = currency as CurrencyType
          const actualAmount = vendor.actual[curr] || 0
          const expected = (expectedAmount as number) || 0
          variance[curr] = actualAmount - expected
          totalExpected += expected
          totalVariance += actualAmount - expected
        }

        const variancePercentage = totalExpected > 0 ? (totalVariance / totalExpected) * 100 : 0

        variances.push({
          vendor: vendor.vendor,
          expected: vendor.expected,
          actual: vendor.actual,
          variance,
          variance_percentage: variancePercentage,
        })
      }

      // Sort by absolute variance percentage (descending)
      variances.sort((a, b) => Math.abs(b.variance_percentage) - Math.abs(a.variance_percentage))

      return { data: variances, error: null }
    } catch (error) {
      console.error('Unexpected error calculating vendor variances:', error)
      return { data: null, error: 'Failed to calculate vendor variances' }
    }
  }

  /**
   * Get transactions with largest variances (anomalies)
   *
   * @param monthPlanId - Month plan ID
   * @param userId - User ID for authorization
   * @param limit - Maximum number of items to return
   * @returns Array of variance items sorted by variance magnitude
   */
  async getLargestVariances(
    monthPlanId: string,
    userId: string,
    limit = 10
  ): Promise<ServiceResponse<VarianceItem[]>> {
    try {
      const { data: expectedTransactions, error } = await this.supabase
        .from('expected_transactions')
        .select(`
          *,
          vendors!expected_transactions_vendor_id_fkey (id, name),
          payment_methods!expected_transactions_payment_method_id_fkey (id, name),
          expected_transaction_tags!expected_transaction_tags_expected_transaction_id_fkey (
            tags!expected_transaction_tags_tag_id_fkey (id, name, color)
          ),
          transactions!expected_transactions_matched_transaction_id_fkey (
            id, transaction_date, amount, description
          )
        `)
        .eq('month_plan_id', monthPlanId)
        .eq('user_id', userId)
        .eq('status', 'matched')
        .not('variance_amount', 'is', null)

      if (error) {
        console.error('Error fetching expected transactions:', error)
        return { data: null, error: error.message }
      }

      // Transform and sort by absolute variance percentage
      const items: VarianceItem[] = expectedTransactions
        .map(et => ({
          expected_transaction: this.transformExpectedTransaction(et),
          variance_amount: parseFloat(et.variance_amount as any),
          variance_percentage: parseFloat(et.variance_percentage as any),
        }))
        .sort((a, b) => Math.abs(b.variance_percentage) - Math.abs(a.variance_percentage))
        .slice(0, limit)

      return { data: items, error: null }
    } catch (error) {
      console.error('Unexpected error calculating largest variances:', error)
      return { data: null, error: 'Failed to calculate largest variances' }
    }
  }

  /**
   * Get transactions with critical variances (>20% or >1000 in base currency)
   *
   * @param monthPlanId - Month plan ID
   * @param userId - User ID for authorization
   * @returns Array of critical variance items
   */
  async getCriticalVariances(
    monthPlanId: string,
    userId: string
  ): Promise<ServiceResponse<VarianceItem[]>> {
    try {
      const { data: expectedTransactions, error } = await this.supabase
        .from('expected_transactions')
        .select(`
          *,
          vendors!expected_transactions_vendor_id_fkey (id, name),
          payment_methods!expected_transactions_payment_method_id_fkey (id, name),
          expected_transaction_tags!expected_transaction_tags_expected_transaction_id_fkey (
            tags!expected_transaction_tags_tag_id_fkey (id, name, color)
          ),
          transactions!expected_transactions_matched_transaction_id_fkey (
            id, transaction_date, amount, description
          )
        `)
        .eq('month_plan_id', monthPlanId)
        .eq('user_id', userId)
        .eq('status', 'matched')
        .not('variance_amount', 'is', null)

      if (error) {
        console.error('Error fetching expected transactions:', error)
        return { data: null, error: error.message }
      }

      // Filter for critical variances
      const items: VarianceItem[] = expectedTransactions
        .filter(et => {
          const variancePct = parseFloat(et.variance_percentage as any)
          const varianceAmt = Math.abs(parseFloat(et.variance_amount as any))

          // Critical if >20% variance OR >1000 THB/USD
          return Math.abs(variancePct) > 20 || varianceAmt > 1000
        })
        .map(et => ({
          expected_transaction: this.transformExpectedTransaction(et),
          variance_amount: parseFloat(et.variance_amount as any),
          variance_percentage: parseFloat(et.variance_percentage as any),
        }))
        .sort((a, b) => Math.abs(b.variance_percentage) - Math.abs(a.variance_percentage))

      return { data: items, error: null }
    } catch (error) {
      console.error('Unexpected error calculating critical variances:', error)
      return { data: null, error: 'Failed to calculate critical variances' }
    }
  }

  /**
   * Get variance trends over multiple months
   *
   * @param userId - User ID
   * @param startMonth - Start month (e.g., '2025-01-01')
   * @param endMonth - End month (e.g., '2025-06-01')
   * @returns Array of monthly variance trends
   */
  async getVarianceTrends(
    userId: string,
    startMonth: string,
    endMonth: string
  ): Promise<ServiceResponse<VarianceTrend[]>> {
    try {
      // Get all month plans in range
      const { data: monthPlans, error: plansError } = await this.supabase
        .from('month_plans')
        .select('id, month_year')
        .eq('user_id', userId)
        .gte('month_year', startMonth)
        .lte('month_year', endMonth)
        .order('month_year', { ascending: true })

      if (plansError) {
        console.error('Error fetching month plans:', plansError)
        return { data: null, error: plansError.message }
      }

      const trends: VarianceTrend[] = []

      // Calculate variance for each month
      for (const plan of monthPlans) {
        const summaryResponse = await this.generateVarianceSummary(plan.id, userId)

        if (summaryResponse.data) {
          const summary = summaryResponse.data

          // Calculate total variance across all currencies (simplified - just sum)
          let totalVarianceAmount = 0
          let totalExpectedAmount = 0

          for (const [currency, variance] of Object.entries(summary.total_variance)) {
            totalVarianceAmount += variance
          }

          for (const [currency, expected] of Object.entries(summary.total_expected_expenses)) {
            totalExpectedAmount += expected
          }

          const variancePercentage =
            totalExpectedAmount > 0 ? (totalVarianceAmount / totalExpectedAmount) * 100 : 0

          trends.push({
            month_year: plan.month_year,
            total_variance: summary.total_variance,
            variance_percentage: variancePercentage,
          })
        }
      }

      return { data: trends, error: null }
    } catch (error) {
      console.error('Unexpected error calculating variance trends:', error)
      return { data: null, error: 'Failed to calculate variance trends' }
    }
  }

  /**
   * Generate variance summary for a month
   * Private helper method used by other functions
   */
  private async generateVarianceSummary(
    monthPlanId: string,
    userId: string
  ): Promise<ServiceResponse<VarianceSummary>> {
    try {
      const { data: expectedTransactions, error } = await this.supabase
        .from('expected_transactions')
        .select('*')
        .eq('month_plan_id', monthPlanId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching expected transactions:', error)
        return { data: null, error: error.message }
      }

      const summary: VarianceSummary = {
        total_expected_expenses: {},
        total_actual_expenses: {},
        total_expected_income: {},
        total_actual_income: {},
        total_variance: {},
        variance_percentage: {},
      }

      // Calculate sums by currency and type
      for (const et of expectedTransactions) {
        const currency = et.original_currency as CurrencyType

        if (et.transaction_type === 'expense') {
          // Expected expenses
          summary.total_expected_expenses[currency] =
            ((summary.total_expected_expenses[currency] as number) || 0) +
            parseFloat(et.expected_amount as any)

          // Actual expenses (only for matched)
          if (et.status === 'matched' && et.actual_amount) {
            summary.total_actual_expenses[currency] =
              ((summary.total_actual_expenses[currency] as number) || 0) +
              parseFloat(et.actual_amount as any)
          }
        } else {
          // Expected income
          summary.total_expected_income[currency] =
            ((summary.total_expected_income[currency] as number) || 0) +
            parseFloat(et.expected_amount as any)

          // Actual income (only for matched)
          if (et.status === 'matched' && et.actual_amount) {
            summary.total_actual_income[currency] =
              ((summary.total_actual_income[currency] as number) || 0) +
              parseFloat(et.actual_amount as any)
          }
        }
      }

      // Calculate variances and percentages
      const allCurrencies = new Set([
        ...Object.keys(summary.total_expected_expenses),
        ...Object.keys(summary.total_actual_expenses),
        ...Object.keys(summary.total_expected_income),
        ...Object.keys(summary.total_actual_income),
      ])

      for (const currency of allCurrencies) {
        const curr = currency as CurrencyType

        const expectedExpenses = (summary.total_expected_expenses[curr] as number | undefined) || 0
        const actualExpenses = (summary.total_actual_expenses[curr] as number | undefined) || 0
        const expectedIncome = (summary.total_expected_income[curr] as number | undefined) || 0
        const actualIncome = (summary.total_actual_income[curr] as number | undefined) || 0

        // Calculate net variance (actual - expected) for both income and expenses
        const expenseVariance = actualExpenses - expectedExpenses
        const incomeVariance = actualIncome - expectedIncome
        summary.total_variance[curr] = expenseVariance + incomeVariance

        // Calculate percentage (comparing total actual vs total expected)
        const totalExpected = expectedExpenses + expectedIncome
        const totalActual = actualExpenses + actualIncome
        const totalVariance = totalActual - totalExpected

        summary.variance_percentage[curr] =
          totalExpected > 0 ? (totalVariance / totalExpected) * 100 : 0
      }

      return { data: summary, error: null }
    } catch (error) {
      console.error('Unexpected error generating variance summary:', error)
      return { data: null, error: 'Failed to generate variance summary' }
    }
  }

  /**
   * Transform raw database result to ExpectedTransaction type
   */
  private transformExpectedTransaction(raw: any): ExpectedTransaction {
    return {
      id: raw.id,
      user_id: raw.user_id,
      template_id: raw.template_id,
      month_plan_id: raw.month_plan_id,
      vendor_id: raw.vendor_id,
      payment_method_id: raw.payment_method_id,
      description: raw.description,
      expected_amount: parseFloat(raw.expected_amount),
      original_currency: raw.original_currency,
      transaction_type: raw.transaction_type,
      expected_date: raw.expected_date,
      status: raw.status,
      matched_transaction_id: raw.matched_transaction_id,
      matched_at: raw.matched_at,
      actual_amount: raw.actual_amount ? parseFloat(raw.actual_amount) : null,
      variance_amount: raw.variance_amount ? parseFloat(raw.variance_amount) : null,
      variance_percentage: raw.variance_percentage ? parseFloat(raw.variance_percentage) : null,
      notes: raw.notes,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      vendor: raw.vendors ? { id: raw.vendors.id, name: raw.vendors.name } : undefined,
      payment_method: raw.payment_methods
        ? { id: raw.payment_methods.id, name: raw.payment_methods.name }
        : undefined,
      tags: raw.expected_transaction_tags?.map((ett: any) => ({
        id: ett.tags.id,
        name: ett.tags.name,
        color: ett.tags.color,
      })) || [],
      matched_transaction: raw.transactions
        ? {
            id: raw.transactions.id,
            transaction_date: raw.transactions.transaction_date,
            amount: parseFloat(raw.transactions.amount),
            description: raw.transactions.description,
          }
        : undefined,
    }
  }
}

/**
 * Factory function to create a VarianceReportService instance
 */
export async function createVarianceReportService(): Promise<VarianceReportService> {
  const supabase = await createClient()
  return new VarianceReportService(supabase)
}

/**
 * Create VarianceReportService with a specific Supabase client
 */
export function createVarianceReportServiceWithClient(client: DbClient): VarianceReportService {
  return new VarianceReportService(client)
}
