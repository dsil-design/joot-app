"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type {
  Transaction,
  TransactionInsert,
  TransactionWithVendorAndPayment,
  CurrencyType,
  TransactionType
} from "@/lib/supabase/types"

export interface CreateTransactionData {
  description?: string
  vendorId?: string
  paymentMethodId?: string
  tagIds?: string[]
  amount: number
  originalCurrency: CurrencyType
  transactionType: TransactionType
  transactionDate?: string
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<TransactionWithVendorAndPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  const fetchTransactions = useCallback(async (limit?: number) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("User not authenticated")
      }

      let query = supabase
        .from("transactions")
        .select(`
          *,
          vendors (
            id,
            name
          ),
          payment_methods (
            id,
            name
          ),
          transaction_tags (
            tag_id,
            tags (
              id,
              name,
              color
            )
          )
        `)
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false })

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      // Transform the data to include tags array
      const transformedData = (data || []).map((transaction: any) => ({
        ...transaction,
        tags: transaction.transaction_tags?.map((tt: any) => tt.tags).filter(Boolean) || []
      }))

      setTransactions(transformedData as TransactionWithVendorAndPayment[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch transactions")
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const createTransaction = async (
    transactionData: CreateTransactionData
  ): Promise<Transaction | null> => {
    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      const transactionDate = transactionData.transactionDate || new Date().toISOString().split('T')[0]

      const insertData: TransactionInsert = {
        user_id: user.id,
        description: transactionData.description || null,
        vendor_id: transactionData.vendorId || null,
        payment_method_id: transactionData.paymentMethodId || null,
        amount: Math.round(transactionData.amount * 100) / 100,
        original_currency: transactionData.originalCurrency,
        transaction_type: transactionData.transactionType,
        transaction_date: transactionDate
      }

      const { data, error: insertError } = await supabase
        .from("transactions")
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      if (data) {
        // If there are tags, create the transaction_tags relationships
        if (transactionData.tagIds && transactionData.tagIds.length > 0) {
          const tagInserts = transactionData.tagIds.map(tagId => ({
            transaction_id: data.id,
            tag_id: tagId
          }))

          const { error: tagError } = await supabase
            .from("transaction_tags")
            .insert(tagInserts)

          if (tagError) {
            console.error("Failed to add tags to transaction:", tagError)
          }
        }

        // Optimistically add the new transaction to the state
        // The home page will handle fetching fresh data when it loads
        setTransactions(prev => [data as TransactionWithVendorAndPayment, ...prev])
        return data
      }

      return null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create transaction")
      return null
    }
  }

  const updateTransaction = async (
    id: string, 
    updates: Partial<Transaction>
  ): Promise<boolean> => {
    try {
      setError(null)

      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)

      if (updateError) {
        throw updateError
      }

      // Update local state
      setTransactions(prev =>
        prev.map(transaction =>
          transaction.id === id 
            ? { ...transaction, ...updates }
            : transaction
        )
      )

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update transaction")
      return false
    }
  }

  const deleteTransaction = async (id: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)

      if (deleteError) {
        throw deleteError
      }

      setTransactions(prev => prev.filter(transaction => transaction.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete transaction")
      return false
    }
  }

  const getTransactionById = useCallback(async (
    id: string
  ): Promise<TransactionWithVendorAndPayment | null> => {
    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { data, error: fetchError } = await supabase
        .from("transactions")
        .select(`
          *,
          vendors (
            id,
            name
          ),
          payment_methods (
            id,
            name
          ),
          transaction_tags (
            tag_id,
            tags (
              id,
              name,
              color
            )
          )
        `)
        .eq("user_id", user.id)
        .eq("id", id)
        .single()

      if (fetchError) {
        console.error("Error fetching transaction:", fetchError)
        throw fetchError
      }

      if (!data) {
        return null
      }

      // Transform the data to include tags array
      const transformed = {
        ...data,
        tags: (data as any).transaction_tags?.map((tt: any) => tt.tags).filter(Boolean) || []
      }

      return transformed as TransactionWithVendorAndPayment
    } catch (err) {
      console.error("getTransactionById error:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch transaction")
      return null
    }
  }, [supabase])

  const getTransactionsByDateRange = async (
    startDate: string, 
    endDate: string
  ): Promise<TransactionWithVendorAndPayment[]> => {
    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("User not authenticated")
      }

      const { data, error: fetchError } = await supabase
        .from("transactions")
        .select(`
          *,
          vendors (
            id,
            name
          ),
          payment_methods (
            id,
            name
          ),
          transaction_tags (
            tag_id,
            tags (
              id,
              name,
              color
            )
          )
        `)
        .eq("user_id", user.id)
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate)
        .order("transaction_date", { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      // Transform the data to include tags array
      const transformedData = (data || []).map((transaction: any) => ({
        ...transaction,
        tags: transaction.transaction_tags?.map((tt: any) => tt.tags).filter(Boolean) || []
      }))

      return transformedData as TransactionWithVendorAndPayment[]
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch transactions by date range")
      return []
    }
  }

  const updateTransactionTags = async (
    transactionId: string,
    tagIds: string[]
  ): Promise<boolean> => {
    try {
      setError(null)

      // Delete existing tags
      const { error: deleteError } = await supabase
        .from("transaction_tags")
        .delete()
        .eq("transaction_id", transactionId)

      if (deleteError) {
        throw deleteError
      }

      // Insert new tags if any
      if (tagIds.length > 0) {
        const tagInserts = tagIds.map(tagId => ({
          transaction_id: transactionId,
          tag_id: tagId
        }))

        const { error: insertError } = await supabase
          .from("transaction_tags")
          .insert(tagInserts)

        if (insertError) {
          throw insertError
        }
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update transaction tags")
      return false
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  return {
    transactions,
    loading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionById,
    getTransactionsByDateRange,
    updateTransactionTags,
    refetch: fetchTransactions
  }
}