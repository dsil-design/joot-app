"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { PaymentMethod, PaymentMethodInsert } from "@/lib/supabase/types"

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("User not authenticated")
      }

      const { data, error: fetchError } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })
        .limit(10000) // Increase limit to handle large payment method lists

      if (fetchError) {
        throw fetchError
      }

      setPaymentMethods(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch payment methods")
      setPaymentMethods([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const createPaymentMethod = async (name: string): Promise<PaymentMethod | null> => {
    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Get the next sort_order by finding the max and adding 1
      const { data: maxSortOrder } = await supabase
        .from("payment_methods")
        .select("sort_order")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single()

      const nextSortOrder = maxSortOrder ? maxSortOrder.sort_order + 1 : 1

      const insertData: PaymentMethodInsert = {
        name: name.trim(),
        user_id: user.id,
        sort_order: nextSortOrder
      }

      const { data, error: insertError } = await supabase
        .from("payment_methods")
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      if (data) {
        // Add to local state and re-fetch to get proper sort order
        await fetchPaymentMethods()
        return data
      }

      return null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payment method")
      return null
    }
  }

  const updatePaymentMethod = async (id: string, name: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: updateError } = await supabase
        .from("payment_methods")
        .update({ 
          name: name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", id)

      if (updateError) {
        throw updateError
      }

      // Update local state
      setPaymentMethods(prev =>
        prev.map(paymentMethod =>
          paymentMethod.id === id
            ? { ...paymentMethod, name: name.trim() }
            : paymentMethod
        )
      )

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update payment method")
      return false
    }
  }

  const deletePaymentMethod = async (id: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id)

      if (deleteError) {
        throw deleteError
      }

      setPaymentMethods(prev => prev.filter(paymentMethod => paymentMethod.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete payment method")
      return false
    }
  }

  useEffect(() => {
    fetchPaymentMethods()
  }, [fetchPaymentMethods])

  return {
    paymentMethods,
    loading,
    error,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    refetch: fetchPaymentMethods
  }
}
