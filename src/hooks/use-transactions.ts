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
          vendors!transactions_vendor_id_fkey (
            id,
            name
          ),
          payment_methods!transactions_payment_method_id_fkey (
            id,
            name
          ),
          transaction_tags!transaction_tags_transaction_id_fkey (
            tag_id,
            tags!transaction_tags_tag_id_fkey (
              id,
              name,
              color
            )
          ),
          transaction_document_matches!transaction_document_matches_transaction_id_fkey (
            id,
            document_id,
            confidence_score,
            approved,
            created_at,
            documents!transaction_document_matches_document_id_fkey (
              id,
              file_name,
              file_size_bytes,
              file_type,
              mime_type,
              created_at,
              document_extractions!document_extractions_document_id_fkey (
                merchant_name,
                amount,
                currency,
                transaction_date
              )
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

      // Transform the data to include tags array, documents, and rename joined tables
      const transformedData = (data || []).map((transaction: any) => ({
        ...transaction,
        vendor: transaction.vendors,
        payment_method: transaction.payment_methods,
        tags: transaction.transaction_tags?.map((tt: any) => tt.tags).filter(Boolean) || [],
        attached_documents: transaction.transaction_document_matches
          ?.filter((match: any) => match.approved) // Only show approved matches
          ?.map((match: any) => ({
            ...match.documents,
            match_id: match.id,
            confidence_score: match.confidence_score,
            match_created_at: match.created_at,
            extraction: match.documents?.document_extractions?.[0] || null
          })) || []
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

  const bulkDeleteTransactions = async (ids: string[]): Promise<boolean> => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .in("id", ids)

      if (deleteError) {
        throw deleteError
      }

      setTransactions(prev => prev.filter(transaction => !ids.includes(transaction.id)))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete transactions")
      return false
    }
  }

  const bulkUpdateTransactions = async (
    ids: string[],
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
        .in("id", ids)

      if (updateError) {
        throw updateError
      }

      // Update local state
      setTransactions(prev =>
        prev.map(transaction =>
          ids.includes(transaction.id)
            ? { ...transaction, ...updates }
            : transaction
        )
      )

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update transactions")
      return false
    }
  }

  const bulkUpdateDescriptions = async (
    ids: string[],
    mode: "prepend" | "append" | "replace",
    text: string
  ): Promise<boolean> => {
    try {
      setError(null)

      // For prepend/append, we need to update each transaction individually
      // since we need to read the current description first
      if (mode === "prepend" || mode === "append") {
        const updates = transactions
          .filter(t => ids.includes(t.id))
          .map(t => {
            const currentDesc = t.description || ""
            const newDesc = mode === "prepend"
              ? `${text}${currentDesc}`
              : `${currentDesc}${text}`
            return { id: t.id, description: newDesc }
          })

        for (const update of updates) {
          const { error: updateError } = await supabase
            .from("transactions")
            .update({
              description: update.description,
              updated_at: new Date().toISOString()
            })
            .eq("id", update.id)

          if (updateError) {
            throw updateError
          }
        }

        // Update local state
        setTransactions(prev =>
          prev.map(transaction => {
            const update = updates.find(u => u.id === transaction.id)
            return update ? { ...transaction, description: update.description } : transaction
          })
        )
      } else {
        // Replace mode
        await bulkUpdateTransactions(ids, { description: text })
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update descriptions")
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
          vendors!transactions_vendor_id_fkey (
            id,
            name
          ),
          payment_methods!transactions_payment_method_id_fkey (
            id,
            name
          ),
          transaction_tags!transaction_tags_transaction_id_fkey (
            tag_id,
            tags!transaction_tags_tag_id_fkey (
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

      // Transform the data to include tags array and rename joined tables
      const transformed = {
        ...data,
        vendor: (data as any).vendors,
        payment_method: (data as any).payment_methods,
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
          vendors!transactions_vendor_id_fkey (
            id,
            name
          ),
          payment_methods!transactions_payment_method_id_fkey (
            id,
            name
          ),
          transaction_tags!transaction_tags_transaction_id_fkey (
            tag_id,
            tags!transaction_tags_tag_id_fkey (
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

      // Transform the data to include tags array and rename joined tables
      const transformedData = (data || []).map((transaction: any) => ({
        ...transaction,
        vendor: transaction.vendors,
        payment_method: transaction.payment_methods,
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
    bulkDeleteTransactions,
    bulkUpdateTransactions,
    bulkUpdateDescriptions,
    getTransactionById,
    getTransactionsByDateRange,
    updateTransactionTags,
    refetch: fetchTransactions
  }
}