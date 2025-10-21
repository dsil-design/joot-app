"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Vendor, VendorInsert } from "@/lib/supabase/types"

export function useVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  const fetchVendors = useCallback(async () => {
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
        .order("name", { ascending: true })
        .limit(10000) // Increase limit to handle large vendor lists

      if (fetchError) {
        throw fetchError
      }

      setVendors(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch vendors")
      setVendors([])
    } finally {
      setLoading(false)
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

      if (data) {
        // Add to local state
        setVendors(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        return data
      }

      return null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vendor")
      return null
    }
  }

  const updateVendor = async (id: string, name: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: updateError } = await supabase
        .from("vendors")
        .update({ 
          name: name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", id)

      if (updateError) {
        throw updateError
      }

      // Update local state
      setVendors(prev =>
        prev.map(vendor =>
          vendor.id === id 
            ? { ...vendor, name: name.trim() }
            : vendor
        ).sort((a, b) => a.name.localeCompare(b.name))
      )

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update vendor")
      return false
    }
  }

  const deleteVendor = async (id: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from("vendors")
        .delete()
        .eq("id", id)

      if (deleteError) {
        throw deleteError
      }

      setVendors(prev => prev.filter(vendor => vendor.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete vendor")
      return false
    }
  }

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  return {
    vendors,
    loading,
    error,
    createVendor,
    updateVendor,
    deleteVendor,
    refetch: fetchVendors
  }
}