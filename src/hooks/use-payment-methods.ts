"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { PaymentMethod, PaymentMethodInsert } from "@/lib/supabase/types"

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  const fetchPaymentMethods = async () => {
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
        .order("name", { ascending: true })

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
  }

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

      if (data) {
        // Add to local state
        setPaymentMethods(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
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
        ).sort((a, b) => a.name.localeCompare(b.name))
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
  }, [])

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
