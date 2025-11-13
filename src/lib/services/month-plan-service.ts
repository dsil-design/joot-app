/**
 * Month Plan Service
 *
 * Handles CRUD operations for month plans and generation of expected transactions.
 * Month plans are the organizational unit for tracking expected vs actual transactions.
 */

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type {
  MonthPlan,
  MonthPlanWithStats,
  MonthPlanStats,
  CreateMonthPlanData,
  UpdateMonthPlanData,
  MonthPlanFilters,
  GenerateExpectedOptions,
  GenerateExpectedResult,
  MonthPlanStatus,
  CurrencyType,
} from '@/lib/types/recurring-transactions'
import { TemplateService } from './template-service'

type DbClient = SupabaseClient<Database>

interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

/**
 * Month Plan Service class for managing monthly budget plans
 */
export class MonthPlanService {
  private supabase: DbClient
  private templateService: TemplateService

  constructor(supabase: DbClient, templateService: TemplateService) {
    this.supabase = supabase
    this.templateService = templateService
  }

  /**
   * Get all month plans for a user with optional filters
   *
   * @param userId - User ID
   * @param filters - Optional filters (year, status, limit)
   * @returns Array of month plans with aggregated stats
   */
  async getMonthPlans(
    userId: string,
    filters?: MonthPlanFilters
  ): Promise<ServiceResponse<MonthPlanWithStats[]>> {
    try {
      let query = this.supabase
        .from('month_plans')
        .select('*')
        .eq('user_id', userId)
        .order('month_year', { ascending: false })

      // Apply filters
      if (filters?.year) {
        const yearStart = `${filters.year}-01-01`
        const yearEnd = `${filters.year}-12-31`
        query = query.gte('month_year', yearStart).lte('month_year', yearEnd)
      }

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching month plans:', error)
        return { data: null, error: error.message }
      }

      // Fetch stats for each month plan
      const plansWithStats: MonthPlanWithStats[] = []
      for (const plan of data) {
        const statsResponse = await this.getMonthPlanStats(plan.id, userId)
        if (statsResponse.data) {
          plansWithStats.push({
            ...plan,
            stats: statsResponse.data,
          })
        }
      }

      return { data: plansWithStats, error: null }
    } catch (error) {
      console.error('Unexpected error fetching month plans:', error)
      return { data: null, error: 'Failed to fetch month plans' }
    }
  }

  /**
   * Get a single month plan by ID
   *
   * @param monthPlanId - Month plan ID
   * @param userId - User ID for authorization
   * @returns Month plan
   */
  async getMonthPlan(
    monthPlanId: string,
    userId: string
  ): Promise<ServiceResponse<MonthPlan>> {
    try {
      const { data, error } = await this.supabase
        .from('month_plans')
        .select('*')
        .eq('id', monthPlanId)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching month plan:', error)
        return { data: null, error: error.message }
      }

      if (!data) {
        return { data: null, error: 'Month plan not found' }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Unexpected error fetching month plan:', error)
      return { data: null, error: 'Failed to fetch month plan' }
    }
  }

  /**
   * Get or create a month plan for a specific month
   * This is the primary way to access month plans - creates if doesn't exist
   *
   * @param userId - User ID
   * @param monthYear - First day of the month (e.g., '2025-01-01')
   * @returns Month plan
   */
  async getOrCreateMonthPlan(
    userId: string,
    monthYear: string
  ): Promise<ServiceResponse<MonthPlan>> {
    try {
      // Normalize to first day of month
      const date = new Date(monthYear)
      const normalizedMonthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`

      // Try to get existing
      const { data: existing, error: fetchError } = await this.supabase
        .from('month_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('month_year', normalizedMonthYear)
        .maybeSingle()

      if (fetchError) {
        console.error('Error checking for existing month plan:', fetchError)
        return { data: null, error: fetchError.message }
      }

      if (existing) {
        return { data: existing, error: null }
      }

      // Create new month plan
      const { data: newPlan, error: createError } = await this.supabase
        .from('month_plans')
        .insert({
          user_id: userId,
          month_year: normalizedMonthYear,
          status: 'draft',
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating month plan:', createError)
        return { data: null, error: createError.message }
      }

      return { data: newPlan, error: null }
    } catch (error) {
      console.error('Unexpected error getting/creating month plan:', error)
      return { data: null, error: 'Failed to get or create month plan' }
    }
  }

  /**
   * Generate expected transactions for a month from templates
   *
   * @param monthPlanId - Month plan ID
   * @param userId - User ID for authorization
   * @param options - Generation options (template_ids, override_existing)
   * @returns Result with counts
   */
  async generateExpectedTransactions(
    monthPlanId: string,
    userId: string,
    options?: GenerateExpectedOptions
  ): Promise<ServiceResponse<GenerateExpectedResult>> {
    try {
      // Get month plan
      const planResponse = await this.getMonthPlan(monthPlanId, userId)
      if (planResponse.error || !planResponse.data) {
        return { data: null, error: planResponse.error || 'Month plan not found' }
      }

      const monthPlan = planResponse.data
      const monthDate = new Date(monthPlan.month_year)

      // Get active templates for this month
      const templatesResponse = await this.templateService.getActiveTemplatesForMonth(
        userId,
        monthPlan.month_year
      )

      if (templatesResponse.error || !templatesResponse.data) {
        return { data: null, error: templatesResponse.error || 'Failed to fetch templates' }
      }

      let templates = templatesResponse.data

      // Filter by specific template IDs if provided
      if (options?.template_ids && options.template_ids.length > 0) {
        templates = templates.filter(t => options.template_ids!.includes(t.id))
      }

      if (templates.length === 0) {
        return {
          data: {
            generated_count: 0,
            skipped_count: 0,
            message: 'No active templates found for this month',
          },
          error: null,
        }
      }

      let generatedCount = 0
      let skippedCount = 0

      // Generate expected transactions from each template
      for (const template of templates) {
        // Check if expected transaction already exists for this template
        if (!options?.override_existing) {
          const { data: existing } = await this.supabase
            .from('expected_transactions')
            .select('id')
            .eq('month_plan_id', monthPlanId)
            .eq('template_id', template.id)
            .maybeSingle()

          if (existing) {
            skippedCount++
            continue
          }
        }

        // Calculate expected date for this month
        const expectedDate = this.calculateExpectedDateForMonth(template, monthDate)

        if (!expectedDate) {
          skippedCount++
          continue
        }

        // Create expected transaction
        const { error: createError } = await this.supabase
          .from('expected_transactions')
          .insert({
            user_id: userId,
            template_id: template.id,
            month_plan_id: monthPlanId,
            vendor_id: template.vendor_id,
            payment_method_id: template.payment_method_id,
            description: template.name,
            expected_amount: template.amount,
            original_currency: template.original_currency,
            transaction_type: template.transaction_type,
            expected_date: expectedDate.toISOString().split('T')[0],
            status: 'pending',
          })

        if (createError) {
          console.error('Error creating expected transaction:', createError)
          skippedCount++
          continue
        }

        // Copy tags from template
        if (template.tags && template.tags.length > 0) {
          const { data: expectedTransaction } = await this.supabase
            .from('expected_transactions')
            .select('id')
            .eq('month_plan_id', monthPlanId)
            .eq('template_id', template.id)
            .single()

          if (expectedTransaction) {
            const tagLinks = template.tags.map(tag => ({
              expected_transaction_id: expectedTransaction.id,
              tag_id: tag.id,
            }))

            await this.supabase
              .from('expected_transaction_tags')
              .insert(tagLinks)
          }
        }

        generatedCount++
      }

      // Update month plan status to active if it was draft
      if (monthPlan.status === 'draft' && generatedCount > 0) {
        await this.updateMonthPlanStatus(monthPlanId, 'active', userId)
      }

      const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

      return {
        data: {
          generated_count: generatedCount,
          skipped_count: skippedCount,
          message: `Generated ${generatedCount} expected transactions for ${monthName}`,
        },
        error: null,
      }
    } catch (error) {
      console.error('Unexpected error generating expected transactions:', error)
      return { data: null, error: 'Failed to generate expected transactions' }
    }
  }

  /**
   * Update month plan status
   *
   * @param monthPlanId - Month plan ID
   * @param status - New status
   * @param userId - User ID for authorization
   * @returns Updated month plan
   */
  async updateMonthPlanStatus(
    monthPlanId: string,
    status: MonthPlanStatus,
    userId: string
  ): Promise<ServiceResponse<MonthPlan>> {
    try {
      const updateData: any = { status }

      if (status === 'closed') {
        updateData.closed_at = new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('month_plans')
        .update(updateData)
        .eq('id', monthPlanId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating month plan status:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Unexpected error updating month plan status:', error)
      return { data: null, error: 'Failed to update month plan status' }
    }
  }

  /**
   * Update month plan notes
   *
   * @param monthPlanId - Month plan ID
   * @param data - Update data
   * @param userId - User ID for authorization
   * @returns Updated month plan
   */
  async updateMonthPlan(
    monthPlanId: string,
    data: UpdateMonthPlanData,
    userId: string
  ): Promise<ServiceResponse<MonthPlan>> {
    try {
      const { data: updated, error } = await this.supabase
        .from('month_plans')
        .update(data)
        .eq('id', monthPlanId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating month plan:', error)
        return { data: null, error: error.message }
      }

      return { data: updated, error: null }
    } catch (error) {
      console.error('Unexpected error updating month plan:', error)
      return { data: null, error: 'Failed to update month plan' }
    }
  }

  /**
   * Get aggregated statistics for a month plan
   *
   * @param monthPlanId - Month plan ID
   * @param userId - User ID for authorization
   * @returns Month plan statistics
   */
  async getMonthPlanStats(
    monthPlanId: string,
    userId: string
  ): Promise<ServiceResponse<MonthPlanStats>> {
    try {
      const { data: expectedTransactions, error } = await this.supabase
        .from('expected_transactions')
        .select('*')
        .eq('month_plan_id', monthPlanId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching expected transactions for stats:', error)
        return { data: null, error: error.message }
      }

      // Initialize stats
      const stats: MonthPlanStats = {
        expected_count: expectedTransactions.length,
        matched_count: 0,
        pending_count: 0,
        overdue_count: 0,
        skipped_count: 0,
        total_expected_expenses: {},
        total_actual_expenses: {},
        total_expected_income: {},
        total_actual_income: {},
      }

      // Calculate stats
      for (const et of expectedTransactions) {
        // Count by status
        if (et.status === 'matched') stats.matched_count++
        else if (et.status === 'pending') stats.pending_count++
        else if (et.status === 'overdue') stats.overdue_count++
        else if (et.status === 'skipped') stats.skipped_count++

        const currency = et.original_currency as CurrencyType

        // Sum expected amounts
        if (et.transaction_type === 'expense') {
          stats.total_expected_expenses[currency] =
            (stats.total_expected_expenses[currency] || 0) + parseFloat(et.expected_amount as any)
        } else {
          stats.total_expected_income[currency] =
            (stats.total_expected_income[currency] || 0) + parseFloat(et.expected_amount as any)
        }

        // Sum actual amounts (only for matched)
        if (et.status === 'matched' && et.actual_amount) {
          if (et.transaction_type === 'expense') {
            stats.total_actual_expenses[currency] =
              (stats.total_actual_expenses[currency] || 0) + parseFloat(et.actual_amount as any)
          } else {
            stats.total_actual_income[currency] =
              (stats.total_actual_income[currency] || 0) + parseFloat(et.actual_amount as any)
          }
        }
      }

      return { data: stats, error: null }
    } catch (error) {
      console.error('Unexpected error calculating month plan stats:', error)
      return { data: null, error: 'Failed to calculate month plan stats' }
    }
  }

  /**
   * Close a month plan
   * Marks the plan as closed and sets the closed_at timestamp
   *
   * @param monthPlanId - Month plan ID
   * @param userId - User ID for authorization
   * @returns Closed month plan
   */
  async closeMonth(
    monthPlanId: string,
    userId: string
  ): Promise<ServiceResponse<MonthPlan>> {
    return await this.updateMonthPlanStatus(monthPlanId, 'closed', userId)
  }

  /**
   * Calculate the expected date for a template within a specific month
   * Returns the date when the recurring transaction should occur in the given month
   *
   * @param template - Transaction template
   * @param monthDate - Date representing the target month
   * @returns Expected date or null if template doesn't apply to this month
   */
  private calculateExpectedDateForMonth(
    template: any,
    monthDate: Date
  ): Date | null {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()

    switch (template.frequency) {
      case 'monthly':
        const day = template.day_of_month || new Date(template.start_date).getDate()
        const expectedDate = new Date(year, month, day)

        // Ensure date is valid (e.g., Feb 31 becomes Feb 28/29)
        if (expectedDate.getMonth() !== month) {
          expectedDate.setDate(0) // Last day of previous month
        }

        return expectedDate

      case 'weekly':
      case 'bi-weekly':
        // For weekly patterns, find the first occurrence in the month
        const startDate = new Date(template.start_date)
        let currentDate = new Date(year, month, 1)

        // If template hasn't started yet, return null
        if (currentDate < startDate) {
          return null
        }

        // Calculate weeks between start and target month
        const weeksDiff = Math.floor((currentDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
        const interval = template.frequency === 'bi-weekly' ? 2 : 1

        // Find next occurrence after month start
        const weeksToAdd = Math.ceil(weeksDiff / interval) * interval
        const nextOccurrence = new Date(startDate)
        nextOccurrence.setDate(nextOccurrence.getDate() + weeksToAdd * 7)

        // If occurrence is in target month, return it
        if (nextOccurrence.getMonth() === month && nextOccurrence.getFullYear() === year) {
          return nextOccurrence
        }

        return null

      case 'quarterly':
        // Check if this month is a quarter boundary from start date
        const startMonth = new Date(template.start_date).getMonth()
        const monthsSinceStart = (year - new Date(template.start_date).getFullYear()) * 12 + (month - startMonth)

        if (monthsSinceStart % 3 === 0) {
          const quarterDay = template.day_of_month || new Date(template.start_date).getDate()
          return new Date(year, month, quarterDay)
        }

        return null

      case 'annually':
        // Check if this month matches the template's start month
        const annualStartDate = new Date(template.start_date)
        if (month === annualStartDate.getMonth()) {
          const annualDay = template.day_of_month || annualStartDate.getDate()
          return new Date(year, month, annualDay)
        }

        return null

      default:
        return null
    }
  }
}

/**
 * Factory function to create a MonthPlanService instance
 */
export async function createMonthPlanService(): Promise<MonthPlanService> {
  const supabase = await createClient()
  const templateService = new TemplateService(supabase)
  return new MonthPlanService(supabase, templateService)
}

/**
 * Create MonthPlanService with specific client instances
 */
export function createMonthPlanServiceWithClient(
  client: DbClient,
  templateService: TemplateService
): MonthPlanService {
  return new MonthPlanService(client, templateService)
}
