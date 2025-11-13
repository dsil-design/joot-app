/**
 * Template Service
 *
 * Handles CRUD operations for transaction templates.
 * Templates are recurring transaction patterns that can generate expected transactions.
 */

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type {
  TransactionTemplate,
  CreateTemplateData,
  UpdateTemplateData,
  TemplateFilters,
} from '@/lib/types/recurring-transactions'

type DbClient = SupabaseClient<Database>

/**
 * Service response pattern with data and error
 */
interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

/**
 * Template Service class for managing transaction templates
 */
export class TemplateService {
  private supabase: DbClient

  constructor(supabase: DbClient) {
    this.supabase = supabase
  }

  /**
   * Get all templates for a user with optional filters
   *
   * @param userId - User ID
   * @param filters - Optional filters (is_active, frequency, transaction_type)
   * @returns Array of templates with vendor, payment_method, and tags
   */
  async getTemplates(
    userId: string,
    filters?: TemplateFilters
  ): Promise<ServiceResponse<TransactionTemplate[]>> {
    try {
      let query = this.supabase
        .from('transaction_templates')
        .select(`
          *,
          vendors!transaction_templates_vendor_id_fkey (id, name),
          payment_methods!transaction_templates_payment_method_id_fkey (id, name),
          template_tags!template_tags_template_id_fkey (
            tags!template_tags_tag_id_fkey (id, name, color)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }

      if (filters?.frequency) {
        query = query.eq('frequency', filters.frequency)
      }

      if (filters?.transaction_type) {
        query = query.eq('transaction_type', filters.transaction_type)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching templates:', error)
        return { data: null, error: error.message }
      }

      const templates = this.transformTemplates(data)
      return { data: templates, error: null }
    } catch (error) {
      console.error('Unexpected error fetching templates:', error)
      return { data: null, error: 'Failed to fetch templates' }
    }
  }

  /**
   * Get a single template by ID
   *
   * @param templateId - Template ID
   * @param userId - User ID for authorization
   * @returns Template with all relationships
   */
  async getTemplateById(
    templateId: string,
    userId: string
  ): Promise<ServiceResponse<TransactionTemplate>> {
    try {
      const { data, error } = await this.supabase
        .from('transaction_templates')
        .select(`
          *,
          vendors!transaction_templates_vendor_id_fkey (id, name),
          payment_methods!transaction_templates_payment_method_id_fkey (id, name),
          template_tags!template_tags_template_id_fkey (
            tags!template_tags_tag_id_fkey (id, name, color)
          )
        `)
        .eq('id', templateId)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching template:', error)
        return { data: null, error: error.message }
      }

      if (!data) {
        return { data: null, error: 'Template not found' }
      }

      const template = this.transformTemplate(data)
      return { data: template, error: null }
    } catch (error) {
      console.error('Unexpected error fetching template:', error)
      return { data: null, error: 'Failed to fetch template' }
    }
  }

  /**
   * Create a new transaction template
   *
   * @param data - Template creation data
   * @param userId - User ID
   * @returns Created template
   */
  async createTemplate(
    data: CreateTemplateData,
    userId: string
  ): Promise<ServiceResponse<TransactionTemplate>> {
    try {
      // Validate input
      if (data.amount <= 0) {
        return { data: null, error: 'Amount must be positive' }
      }

      if (data.frequency_interval && data.frequency_interval < 1) {
        return { data: null, error: 'Frequency interval must be at least 1' }
      }

      // Create template record
      const templateData = {
        user_id: userId,
        name: data.name,
        description: data.description || null,
        vendor_id: data.vendor_id || null,
        payment_method_id: data.payment_method_id || null,
        amount: data.amount,
        original_currency: data.original_currency,
        transaction_type: data.transaction_type,
        frequency: data.frequency,
        frequency_interval: data.frequency_interval || 1,
        day_of_month: data.day_of_month || null,
        day_of_week: data.day_of_week || null,
        start_date: data.start_date,
        end_date: data.end_date || null,
      }

      const { data: template, error: templateError } = await this.supabase
        .from('transaction_templates')
        .insert(templateData)
        .select()
        .single()

      if (templateError) {
        console.error('Error creating template:', templateError)
        return { data: null, error: templateError.message }
      }

      // Link tags if provided
      if (data.tag_ids && data.tag_ids.length > 0) {
        const tagLinks = data.tag_ids.map((tag_id) => ({
          template_id: template.id,
          tag_id,
        }))

        const { error: tagsError } = await this.supabase
          .from('template_tags')
          .insert(tagLinks)

        if (tagsError) {
          console.error('Error linking tags:', tagsError)
          // Continue even if tags fail - template is created
        }
      }

      // Fetch complete template with relationships
      return await this.getTemplateById(template.id, userId)
    } catch (error) {
      console.error('Unexpected error creating template:', error)
      return { data: null, error: 'Failed to create template' }
    }
  }

  /**
   * Update an existing template
   *
   * @param templateId - Template ID
   * @param data - Fields to update
   * @param userId - User ID for authorization
   * @returns Updated template
   */
  async updateTemplate(
    templateId: string,
    data: UpdateTemplateData,
    userId: string
  ): Promise<ServiceResponse<TransactionTemplate>> {
    try {
      // Build update object with only provided fields
      const updateData: Record<string, any> = {}

      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.is_active !== undefined) updateData.is_active = data.is_active
      if (data.vendor_id !== undefined) updateData.vendor_id = data.vendor_id
      if (data.payment_method_id !== undefined) updateData.payment_method_id = data.payment_method_id
      if (data.amount !== undefined) {
        if (data.amount <= 0) {
          return { data: null, error: 'Amount must be positive' }
        }
        updateData.amount = data.amount
      }
      if (data.original_currency !== undefined) updateData.original_currency = data.original_currency
      if (data.frequency !== undefined) updateData.frequency = data.frequency
      if (data.frequency_interval !== undefined) updateData.frequency_interval = data.frequency_interval
      if (data.day_of_month !== undefined) updateData.day_of_month = data.day_of_month
      if (data.day_of_week !== undefined) updateData.day_of_week = data.day_of_week
      if (data.end_date !== undefined) updateData.end_date = data.end_date

      // Update template
      const { error: updateError } = await this.supabase
        .from('transaction_templates')
        .update(updateData)
        .eq('id', templateId)
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating template:', updateError)
        return { data: null, error: updateError.message }
      }

      // Update tags if provided
      if (data.tag_ids !== undefined) {
        // Delete existing tags
        await this.supabase
          .from('template_tags')
          .delete()
          .eq('template_id', templateId)

        // Insert new tags
        if (data.tag_ids.length > 0) {
          const tagLinks = data.tag_ids.map((tag_id) => ({
            template_id: templateId,
            tag_id,
          }))

          const { error: tagsError } = await this.supabase
            .from('template_tags')
            .insert(tagLinks)

          if (tagsError) {
            console.error('Error updating tags:', tagsError)
            // Continue even if tags fail
          }
        }
      }

      // Fetch updated template
      return await this.getTemplateById(templateId, userId)
    } catch (error) {
      console.error('Unexpected error updating template:', error)
      return { data: null, error: 'Failed to update template' }
    }
  }

  /**
   * Delete a template (soft delete by setting is_active = false)
   *
   * @param templateId - Template ID
   * @param userId - User ID for authorization
   * @returns Success status
   */
  async deleteTemplate(
    templateId: string,
    userId: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from('transaction_templates')
        .update({ is_active: false })
        .eq('id', templateId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error deleting template:', error)
        return { data: null, error: error.message }
      }

      return { data: true, error: null }
    } catch (error) {
      console.error('Unexpected error deleting template:', error)
      return { data: null, error: 'Failed to delete template' }
    }
  }

  /**
   * Get active templates that apply to a specific month
   *
   * @param userId - User ID
   * @param monthYear - First day of the month (e.g., '2025-01-01')
   * @returns Array of active templates that should generate expected transactions
   */
  async getActiveTemplatesForMonth(
    userId: string,
    monthYear: string
  ): Promise<ServiceResponse<TransactionTemplate[]>> {
    try {
      const monthDate = new Date(monthYear)

      const { data, error } = await this.supabase
        .from('transaction_templates')
        .select(`
          *,
          vendors!transaction_templates_vendor_id_fkey (id, name),
          payment_methods!transaction_templates_payment_method_id_fkey (id, name),
          template_tags!template_tags_template_id_fkey (
            tags!template_tags_tag_id_fkey (id, name, color)
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .lte('start_date', monthYear)
        .or(`end_date.is.null,end_date.gte.${monthYear}`)

      if (error) {
        console.error('Error fetching active templates:', error)
        return { data: null, error: error.message }
      }

      const templates = this.transformTemplates(data)
      return { data: templates, error: null }
    } catch (error) {
      console.error('Unexpected error fetching active templates:', error)
      return { data: null, error: 'Failed to fetch active templates' }
    }
  }

  /**
   * Calculate the next occurrence date for a template after a given date
   *
   * @param template - Transaction template
   * @param afterDate - Calculate next occurrence after this date
   * @returns Next occurrence date or null if template has ended
   */
  calculateNextOccurrence(
    template: TransactionTemplate,
    afterDate: Date
  ): Date | null {
    // Check if template has ended
    if (template.end_date) {
      const endDate = new Date(template.end_date)
      if (afterDate > endDate) {
        return null
      }
    }

    const startDate = new Date(template.start_date)
    let nextDate = new Date(afterDate)

    switch (template.frequency) {
      case 'monthly':
        // Find next month with the specified day
        if (template.day_of_month) {
          nextDate.setDate(template.day_of_month)
          if (nextDate <= afterDate) {
            nextDate.setMonth(nextDate.getMonth() + template.frequency_interval)
          }
        } else {
          // Use start date's day
          const day = startDate.getDate()
          nextDate.setDate(day)
          if (nextDate <= afterDate) {
            nextDate.setMonth(nextDate.getMonth() + template.frequency_interval)
          }
        }
        break

      case 'weekly':
        // Find next week with the specified day
        if (template.day_of_week !== null) {
          const targetDay = template.day_of_week
          const currentDay = nextDate.getDay()
          let daysToAdd = (targetDay - currentDay + 7) % 7
          if (daysToAdd === 0 && nextDate <= afterDate) {
            daysToAdd = 7 * template.frequency_interval
          }
          nextDate.setDate(nextDate.getDate() + daysToAdd)
        }
        break

      case 'bi-weekly':
        // Every 2 weeks from start date
        const weeksDiff = Math.ceil((afterDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
        const nextWeeks = Math.ceil(weeksDiff / 2) * 2
        nextDate = new Date(startDate)
        nextDate.setDate(nextDate.getDate() + nextWeeks * 7)
        break

      case 'quarterly':
        // Every 3 months
        const day = template.day_of_month || startDate.getDate()
        nextDate.setDate(day)
        while (nextDate <= afterDate) {
          nextDate.setMonth(nextDate.getMonth() + 3 * template.frequency_interval)
        }
        break

      case 'annually':
        // Every year
        const annualDay = template.day_of_month || startDate.getDate()
        const annualMonth = startDate.getMonth()
        nextDate = new Date(afterDate)
        nextDate.setMonth(annualMonth)
        nextDate.setDate(annualDay)
        if (nextDate <= afterDate) {
          nextDate.setFullYear(nextDate.getFullYear() + template.frequency_interval)
        }
        break

      default:
        // Custom frequency - use simple interval
        return null
    }

    // Check if next occurrence is beyond end date
    if (template.end_date) {
      const endDate = new Date(template.end_date)
      if (nextDate > endDate) {
        return null
      }
    }

    return nextDate
  }

  /**
   * Transform raw database result to TransactionTemplate type
   * Handles nested relationships and null values
   */
  private transformTemplate(raw: any): TransactionTemplate {
    return {
      id: raw.id,
      user_id: raw.user_id,
      name: raw.name,
      description: raw.description,
      is_active: raw.is_active,
      vendor_id: raw.vendor_id,
      payment_method_id: raw.payment_method_id,
      amount: parseFloat(raw.amount),
      original_currency: raw.original_currency,
      transaction_type: raw.transaction_type,
      frequency: raw.frequency,
      frequency_interval: raw.frequency_interval,
      day_of_month: raw.day_of_month,
      day_of_week: raw.day_of_week,
      start_date: raw.start_date,
      end_date: raw.end_date,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      vendor: raw.vendors ? { id: raw.vendors.id, name: raw.vendors.name } : undefined,
      payment_method: raw.payment_methods
        ? { id: raw.payment_methods.id, name: raw.payment_methods.name }
        : undefined,
      tags: raw.template_tags?.map((tt: any) => ({
        id: tt.tags.id,
        name: tt.tags.name,
        color: tt.tags.color,
      })) || [],
    }
  }

  /**
   * Transform array of raw database results
   */
  private transformTemplates(raw: any[]): TransactionTemplate[] {
    return raw.map((item) => this.transformTemplate(item))
  }
}

/**
 * Factory function to create a TemplateService instance
 * Uses the server Supabase client by default
 */
export async function createTemplateService(): Promise<TemplateService> {
  const supabase = await createClient()
  return new TemplateService(supabase)
}

/**
 * Create TemplateService with a specific Supabase client
 * Useful for testing or when you already have a client instance
 */
export function createTemplateServiceWithClient(client: DbClient): TemplateService {
  return new TemplateService(client)
}
