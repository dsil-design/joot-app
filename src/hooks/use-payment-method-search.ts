"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { PaymentMethod, PaymentMethodInsert } from "@/lib/supabase/types"

export function usePaymentMethodSearch() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const searchPaymentMethods = useCallback(async (query: string, limit = 20): Promise<PaymentMethod[]> => {
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
        .ilike("name", `%${query}%`)
        .order("name", { ascending: true })
        .limit(limit)

      if (fetchError) {
        throw fetchError
      }

      return data || []
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search payment methods")
      return []
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const getPaymentMethodById = useCallback(async (id: string): Promise<PaymentMethod | null> => {
    try {
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("id", id)
        .single()

      if (fetchError) {
        throw fetchError
      }

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch payment method")
      return null
    }
  }, [supabase])

  const createPaymentMethod = async (name: string): Promise<PaymentMethod | null> => {
    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      const insertData: PaymentMethodInsert = {
        name: name.trim(),
        user_id: user.id
      }

      const { data, error: insertError } = await supabase
        .from("payment_methods")
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payment method")
      return null
    }
  }

  return {
    searchPaymentMethods,
    getPaymentMethodById,
    createPaymentMethod,
    loading,
    error
  }
}
