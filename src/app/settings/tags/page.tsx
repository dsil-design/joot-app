import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TagsSettings } from '@/components/page-specific/tags-settings'

export default async function TagsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all tags
  const { data: tags } = await supabase
    .from('tags')
    .select('id, name, color, created_at, updated_at')
    .eq('user_id', user.id)
    .order('name')

  // Fetch all transaction_tags in a single query
  const { data: transactionTags } = await supabase
    .from('transaction_tags')
    .select('tag_id')
    .in('tag_id', (tags || []).map(t => t.id))

  // Count transactions per tag in memory
  const countsByTag = (transactionTags || []).reduce((acc, tt) => {
    acc[tt.tag_id] = (acc[tt.tag_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Combine tags with their transaction counts
  const tagsWithCounts = (tags || []).map(tag => ({
    ...tag,
    transactionCount: countsByTag[tag.id] || 0
  }))

  return <TagsSettings tags={tagsWithCounts} />
}
