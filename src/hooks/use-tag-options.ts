"use client"

import { useTags } from "./use-tags"

export interface TagOption {
  value: string
  label: string
  color: string
  disabled?: boolean
}

/**
 * Hook to provide tag options formatted for multi-select ComboBox
 */
export function useTagOptions() {
  const { tags, loading, error, createTag } = useTags()

  const options: TagOption[] = tags.map(tag => ({
    value: tag.id,
    label: tag.name,
    color: tag.color,
    disabled: false
  }))

  const addCustomOption = async (tagName: string) => {
    const newTag = await createTag(tagName)
    return newTag ? newTag.id : null
  }

  return {
    options,
    addCustomOption,
    loading,
    error
  }
}
