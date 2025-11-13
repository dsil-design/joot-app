/**
 * Expected Transaction Service
 *
 * Handles CRUD operations for expected transactions and matching operations.
 * Expected transactions are generated from templates or created manually.
 */

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type {
  ExpectedTransaction,
  CreateExpectedTransactionData,
  UpdateExpectedTransactionData,
  ExpectedTransactionFilters,
  ExpectedTransactionStatus,
} from '@/lib/types/recurring-transactions'

type DbClient = SupabaseClient<Database>

interface ServiceResponse<T> {
  data: T | null
  error: string | null
}

/**
 * Expected Transaction Service class
 */
export class ExpectedTransactionService {
  private supabase: DbClient

  constructor(supabase: DbClient) {
    this.supabase = supabase
  }

  /**
   * Get expected transactions with filtering
   *
   * @param filters - Filters (month_plan_id required, plus optional filters)
   * @param userId - User ID for authorization
   * @returns Array of expected transactions with relationships
   */
  async getExpectedTransactions(
    filters: ExpectedTransactionFilters,
    userId: string
  ): Promise<ServiceResponse<ExpectedTransaction[]>> {
    try {
      let query = this.supabase
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
        .eq('user_id', userId)
        .eq('month_plan_id', filters.month_plan_id)
        .order('expected_date', { ascending: true })

      // Apply status filter
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }

      // Apply transaction type filter
      if (filters.transaction_type) {
        query = query.eq('transaction_type', filters.transaction_type)
      }

      // Apply vendor filter
      if (filters.vendor_ids && filters.vendor_ids.length > 0) {
        query = query.in('vendor_id', filters.vendor_ids)
      }

      // Filter out matched if requested
      if (filters.include_matched === false) {
        query = query.neq('status', 'matched')
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching expected transactions:', error)
        return { data: null, error: error.message }
      }

      const transactions = this.transformExpectedTransactions(data)
      return { data: transactions, error: null }
    } catch (error) {
      console.error('Unexpected error fetching expected transactions:', error)
      return { data: null, error: 'Failed to fetch expected transactions' }
    }
  }

  /**
   * Get a single expected transaction by ID
   *
   * @param id - Expected transaction ID
   * @param userId - User ID for authorization
   * @returns Expected transaction with relationships
   */
  async getExpectedTransactionById(
    id: string,
    userId: string
  ): Promise<ServiceResponse<ExpectedTransaction>> {
    try {
      const { data, error } = await this.supabase
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
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching expected transaction:', error)
        return { data: null, error: error.message }
      }

      if (!data) {
        return { data: null, error: 'Expected transaction not found' }
      }

      const transaction = this.transformExpectedTransaction(data)
      return { data: transaction, error: null }
    } catch (error) {
      console.error('Unexpected error fetching expected transaction:', error)
      return { data: null, error: 'Failed to fetch expected transaction' }
    }
  }

  /**
   * Create a manual expected transaction (not from template)
   *
   * @param data - Expected transaction creation data
   * @param userId - User ID
   * @returns Created expected transaction
   */
  async createExpectedTransaction(
    data: CreateExpectedTransactionData,
    userId: string
  ): Promise<ServiceResponse<ExpectedTransaction>> {
    try {
      // Validate input
      if (data.expected_amount <= 0) {
        return { data: null, error: 'Expected amount must be positive' }
      }

      // Create expected transaction record
      const transactionData = {
        user_id: userId,
        template_id: null, // Manual creation, not from template
        month_plan_id: data.month_plan_id,
        vendor_id: data.vendor_id || null,
        payment_method_id: data.payment_method_id || null,
        description: data.description,
        expected_amount: data.expected_amount,
        original_currency: data.original_currency,
        transaction_type: data.transaction_type,
        expected_date: data.expected_date,
        status: 'pending' as ExpectedTransactionStatus,
        notes: data.notes || null,
      }

      const { data: transaction, error: transactionError } = await this.supabase
        .from('expected_transactions')
        .insert(transactionData)
        .select()
        .single()

      if (transactionError) {
        console.error('Error creating expected transaction:', transactionError)
        return { data: null, error: transactionError.message }
      }

      // Link tags if provided
      if (data.tag_ids && data.tag_ids.length > 0) {
        const tagLinks = data.tag_ids.map((tag_id) => ({
          expected_transaction_id: transaction.id,
          tag_id,
        }))

        const { error: tagsError } = await this.supabase
          .from('expected_transaction_tags')
          .insert(tagLinks)

        if (tagsError) {
          console.error('Error linking tags:', tagsError)
          // Continue even if tags fail
        }
      }

      // Fetch complete expected transaction with relationships
      return await this.getExpectedTransactionById(transaction.id, userId)
    } catch (error) {
      console.error('Unexpected error creating expected transaction:', error)
      return { data: null, error: 'Failed to create expected transaction' }
    }
  }

  /**
   * Update an expected transaction
   *
   * @param id - Expected transaction ID
   * @param data - Fields to update
   * @param userId - User ID for authorization
   * @returns Updated expected transaction
   */
  async updateExpectedTransaction(
    id: string,
    data: UpdateExpectedTransactionData,
    userId: string
  ): Promise<ServiceResponse<ExpectedTransaction>> {
    try {
      // Build update object with only provided fields
      const updateData: Record<string, any> = {}

      if (data.description !== undefined) updateData.description = data.description
      if (data.expected_amount !== undefined) {
        if (data.expected_amount <= 0) {
          return { data: null, error: 'Expected amount must be positive' }
        }
        updateData.expected_amount = data.expected_amount
      }
      if (data.expected_date !== undefined) updateData.expected_date = data.expected_date
      if (data.vendor_id !== undefined) updateData.vendor_id = data.vendor_id
      if (data.payment_method_id !== undefined) updateData.payment_method_id = data.payment_method_id
      if (data.status !== undefined) updateData.status = data.status
      if (data.notes !== undefined) updateData.notes = data.notes

      // Update expected transaction
      const { error: updateError } = await this.supabase
        .from('expected_transactions')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating expected transaction:', updateError)
        return { data: null, error: updateError.message }
      }

      // Update tags if provided
      if (data.tag_ids !== undefined) {
        // Delete existing tags
        await this.supabase
          .from('expected_transaction_tags')
          .delete()
          .eq('expected_transaction_id', id)

        // Insert new tags
        if (data.tag_ids.length > 0) {
          const tagLinks = data.tag_ids.map((tag_id) => ({
            expected_transaction_id: id,
            tag_id,
          }))

          const { error: tagsError } = await this.supabase
            .from('expected_transaction_tags')
            .insert(tagLinks)

          if (tagsError) {
            console.error('Error updating tags:', tagsError)
            // Continue even if tags fail
          }
        }
      }

      // Fetch updated expected transaction
      return await this.getExpectedTransactionById(id, userId)
    } catch (error) {
      console.error('Unexpected error updating expected transaction:', error)
      return { data: null, error: 'Failed to update expected transaction' }
    }
  }

  /**
   * Delete an expected transaction
   *
   * @param id - Expected transaction ID
   * @param userId - User ID for authorization
   * @param deleteMatchedTransaction - If true, also delete the matched actual transaction
   * @returns Success status
   */
  async deleteExpectedTransaction(
    id: string,
    userId: string,
    deleteMatchedTransaction = false
  ): Promise<ServiceResponse<boolean>> {
    try {
      // Get expected transaction to check if it's matched
      const { data: expected } = await this.supabase
        .from('expected_transactions')
        .select('matched_transaction_id')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      // If matched and we should delete the actual transaction
      if (expected?.matched_transaction_id && deleteMatchedTransaction) {
        await this.supabase
          .from('transactions')
          .delete()
          .eq('id', expected.matched_transaction_id)
          .eq('user_id', userId)
      }

      // Delete expected transaction (cascade deletes tags)
      const { error } = await this.supabase
        .from('expected_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) {
        console.error('Error deleting expected transaction:', error)
        return { data: null, error: error.message }
      }

      return { data: true, error: null }
    } catch (error) {
      console.error('Unexpected error deleting expected transaction:', error)
      return { data: null, error: 'Failed to delete expected transaction' }
    }
  }

  /**
   * Match an expected transaction to an actual transaction
   *
   * @param expectedId - Expected transaction ID
   * @param transactionId - Actual transaction ID to match
   * @param userId - User ID for authorization
   * @returns Updated expected transaction with match details
   */
  async matchTransaction(
    expectedId: string,
    transactionId: string,
    userId: string
  ): Promise<ServiceResponse<ExpectedTransaction>> {
    try {
      // Get the actual transaction
      const { data: transaction, error: txError } = await this.supabase
        .from('transactions')
        .select('amount, transaction_date')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single()

      if (txError || !transaction) {
        return { data: null, error: 'Transaction not found' }
      }

      // Update expected transaction with match
      const { error: updateError } = await this.supabase
        .from('expected_transactions')
        .update({
          status: 'matched' as ExpectedTransactionStatus,
          matched_transaction_id: transactionId,
          matched_at: new Date().toISOString(),
          actual_amount: transaction.amount,
        })
        .eq('id', expectedId)
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error matching transaction:', updateError)
        return { data: null, error: updateError.message }
      }

      // Update actual transaction to reference expected
      await this.supabase
        .from('transactions')
        .update({
          expected_transaction_id: expectedId,
          source_type: 'matched',
        })
        .eq('id', transactionId)
        .eq('user_id', userId)

      // Fetch updated expected transaction
      return await this.getExpectedTransactionById(expectedId, userId)
    } catch (error) {
      console.error('Unexpected error matching transaction:', error)
      return { data: null, error: 'Failed to match transaction' }
    }
  }

  /**
   * Unmatch an expected transaction from its actual transaction
   *
   * @param expectedId - Expected transaction ID
   * @param userId - User ID for authorization
   * @returns Updated expected transaction
   */
  async unmatchTransaction(
    expectedId: string,
    userId: string
  ): Promise<ServiceResponse<ExpectedTransaction>> {
    try {
      // Get current match info
      const { data: expected } = await this.supabase
        .from('expected_transactions')
        .select('matched_transaction_id, expected_date')
        .eq('id', expectedId)
        .eq('user_id', userId)
        .single()

      if (!expected?.matched_transaction_id) {
        return { data: null, error: 'Expected transaction is not matched' }
      }

      // Determine new status based on date
      const expectedDate = new Date(expected.expected_date)
      const today = new Date()
      const newStatus: ExpectedTransactionStatus =
        expectedDate < today ? 'overdue' : 'pending'

      // Update expected transaction
      const { error: updateError } = await this.supabase
        .from('expected_transactions')
        .update({
          status: newStatus,
          matched_transaction_id: null,
          matched_at: null,
          actual_amount: null,
          variance_amount: null,
          variance_percentage: null,
        })
        .eq('id', expectedId)
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error unmatching transaction:', updateError)
        return { data: null, error: updateError.message }
      }

      // Update actual transaction
      await this.supabase
        .from('transactions')
        .update({
          expected_transaction_id: null,
          source_type: 'manual',
        })
        .eq('id', expected.matched_transaction_id)
        .eq('user_id', userId)

      // Fetch updated expected transaction
      return await this.getExpectedTransactionById(expectedId, userId)
    } catch (error) {
      console.error('Unexpected error unmatching transaction:', error)
      return { data: null, error: 'Failed to unmatch transaction' }
    }
  }

  /**
   * Mark an expected transaction as skipped
   *
   * @param expectedId - Expected transaction ID
   * @param notes - Reason for skipping
   * @param userId - User ID for authorization
   * @returns Updated expected transaction
   */
  async skipExpectedTransaction(
    expectedId: string,
    notes: string,
    userId: string
  ): Promise<ServiceResponse<ExpectedTransaction>> {
    try {
      const { error } = await this.supabase
        .from('expected_transactions')
        .update({
          status: 'skipped' as ExpectedTransactionStatus,
          notes,
        })
        .eq('id', expectedId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error skipping expected transaction:', error)
        return { data: null, error: error.message }
      }

      return await this.getExpectedTransactionById(expectedId, userId)
    } catch (error) {
      console.error('Unexpected error skipping expected transaction:', error)
      return { data: null, error: 'Failed to skip expected transaction' }
    }
  }

  /**
   * Mark pending expected transactions as overdue if past their expected date
   *
   * @param userId - User ID
   * @returns Number of transactions marked as overdue
   */
  async markOverdueTransactions(userId: string): Promise<ServiceResponse<number>> {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await this.supabase
        .from('expected_transactions')
        .update({ status: 'overdue' as ExpectedTransactionStatus })
        .eq('user_id', userId)
        .eq('status', 'pending')
        .lt('expected_date', today)
        .select('id')

      if (error) {
        console.error('Error marking overdue transactions:', error)
        return { data: null, error: error.message }
      }

      return { data: data?.length || 0, error: null }
    } catch (error) {
      console.error('Unexpected error marking overdue transactions:', error)
      return { data: null, error: 'Failed to mark overdue transactions' }
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

  /**
   * Transform array of raw database results
   */
  private transformExpectedTransactions(raw: any[]): ExpectedTransaction[] {
    return raw.map((item) => this.transformExpectedTransaction(item))
  }
}

/**
 * Factory function to create an ExpectedTransactionService instance
 */
export async function createExpectedTransactionService(): Promise<ExpectedTransactionService> {
  const supabase = await createClient()
  return new ExpectedTransactionService(supabase)
}

/**
 * Create ExpectedTransactionService with a specific Supabase client
 */
export function createExpectedTransactionServiceWithClient(
  client: DbClient
): ExpectedTransactionService {
  return new ExpectedTransactionService(client)
}
