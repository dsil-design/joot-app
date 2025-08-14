"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { TransactionCategory, TransactionCategoryInsert } from "@/lib/supabase/types"

export interface TransactionCategoryOption {
  value: string
  label: string
  disabled?: boolean
}

// Default options for new users
const defaultVendorOptions: TransactionCategoryOption[] = [
  { value: "7-eleven", label: "7-Eleven" },
  { value: "grab", label: "Grab" },
  { value: "apple", label: "Apple" },
  { value: "netflix", label: "Netflix" },
  { value: "shell", label: "Shell" },
  { value: "grocery-store", label: "Grocery Store" },
  { value: "gas-station", label: "Gas Station" },
  { value: "restaurant", label: "Restaurant" },
  { value: "pharmacy", label: "Pharmacy" },
]

const defaultPaymentOptions: TransactionCategoryOption[] = [
  { value: "cash", label: "Cash" },
  { value: "credit-card", label: "Credit Card" },
  { value: "debit-card", label: "Debit Card" },
  { value: "checking-account", label: "Checking Account" },
  { value: "bank-transfer", label: "Bank Transfer" },
]

export function useTransactionCategories(type: "vendor" | "payment") {
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("User not authenticated")
      }

      const { data, error: fetchError } = await supabase
        .from("transaction_categories")
        .select("*")
        .eq("user_id", user.id)
        .eq("icon", type === "vendor" ? "store" : "credit-card")
        .order("name", { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      setCategories(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch categories")
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const addCategory = async (name: string): Promise<TransactionCategory | null> => {
    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("User not authenticated")
      }

      const categoryData: TransactionCategoryInsert = {
        name,
        user_id: user.id,
        color: type === "vendor" ? "#3b82f6" : "#10b981", // Blue for vendors, Green for payment
        icon: type === "vendor" ? "store" : "credit-card"
      }

      const { data, error: insertError } = await supabase
        .from("transaction_categories")
        .insert(categoryData)
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      if (data) {
        setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        return data
      }

      return null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category")
      return null
    }
  }

  const updateCategory = async (id: string, updates: Partial<TransactionCategory>): Promise<boolean> => {
    try {
      setError(null)

      const { error: updateError } = await supabase
        .from("transaction_categories")
        .update(updates)
        .eq("id", id)

      if (updateError) {
        throw updateError
      }

      setCategories(prev =>
        prev.map(category =>
          category.id === id ? { ...category, ...updates } : category
        )
      )

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category")
      return false
    }
  }

  const deleteCategory = async (id: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from("transaction_categories")
        .delete()
        .eq("id", id)

      if (deleteError) {
        throw deleteError
      }

      setCategories(prev => prev.filter(category => category.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category")
      return false
    }
  }

  // Convert categories to ComboBox options
  const getOptions = (): TransactionCategoryOption[] => {
    // If no categories exist in database, return default options
    if (categories.length === 0) {
      return type === "vendor" ? defaultVendorOptions : defaultPaymentOptions
    }
    
    return categories.map(category => ({
      value: category.id,
      label: category.name,
      disabled: false
    }))
  }

  useEffect(() => {
    fetchCategories()
  }, [type])

  return {
    categories,
    loading,
    error,
    options: getOptions(),
    addCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories
  }
}

// Specific hooks for vendors and payment methods
export function useVendors() {
  return useTransactionCategories("vendor")
}

export function usePaymentMethods() {
  return useTransactionCategories("payment")
}