"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Tag, TagInsert } from "@/lib/supabase/types"
import { getNextAvailableColor } from "@/lib/constants/tag-colors"

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { data, error: fetchError } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      setTags(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tags")
      setTags([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const createTag = async (name: string, color?: string): Promise<Tag | null> => {
    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      // If no color provided, auto-assign next available color
      let tagColor = color
      if (!tagColor) {
        const usedColors = tags.map(tag => tag.color)
        tagColor = getNextAvailableColor(usedColors)
      }

      const insertData: TagInsert = {
        name: name.trim(),
        color: tagColor,
        user_id: user.id
      }

      const { data, error: insertError } = await supabase
        .from("tags")
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      if (data) {
        // Add to local state
        setTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        return data
      }

      return null
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tag")
      return null
    }
  }

  const updateTag = async (id: string, name: string, color: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: updateError } = await supabase
        .from("tags")
        .update({
          name: name.trim(),
          color,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)

      if (updateError) {
        throw updateError
      }

      // Update local state
      setTags(prev =>
        prev.map(tag =>
          tag.id === id
            ? { ...tag, name: name.trim(), color }
            : tag
        ).sort((a, b) => a.name.localeCompare(b.name))
      )

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tag")
      return false
    }
  }

  const deleteTag = async (id: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from("tags")
        .delete()
        .eq("id", id)

      if (deleteError) {
        throw deleteError
      }

      setTags(prev => prev.filter(tag => tag.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tag")
      return false
    }
  }

  /**
   * Get count of transactions using a specific tag
   */
  const getTagUsageCount = async (tagId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from("transaction_tags")
        .select("*", { count: 'exact', head: true })
        .eq("tag_id", tagId)

      if (error) throw error
      return count || 0
    } catch (err) {
      console.error("Failed to get tag usage count:", err)
      return 0
    }
  }

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  return {
    tags,
    loading,
    error,
    createTag,
    updateTag,
    deleteTag,
    getTagUsageCount,
    refetch: fetchTags
  }
}
