"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Vendor, VendorInsert } from "@/lib/supabase/types"

export function useVendorSearch() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const searchVendors = useCallback(async (query: string, limit = 20): Promise<Vendor[]> => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { data, error: fetchError } = await supabase
        .from("vendors")
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
      setError(err instanceof Error ? err.message : "Failed to search vendors")
      return []
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const getVendorById = useCallback(async (id: string): Promise<Vendor | null> => {
    try {
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", id)
        .single()

      if (fetchError) {
        throw fetchError
      }

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch vendor")
      return null
    }
  }, [supabase])

  const createVendor = async (name: string): Promise<Vendor | null> => {
    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      const insertData: VendorInsert = {
        name: name.trim(),
        user_id: user.id
      }

      const { data, error: insertError } = await supabase
        .from("vendors")
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vendor")
      return null
    }
  }

  return {
    searchVendors,
    getVendorById,
    createVendor,
    loading,
    error
  }
}
