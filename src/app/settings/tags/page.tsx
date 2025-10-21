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

  // Fetch tags with transaction counts
  const { data: tags } = await supabase
    .from('tags')
    .select(`
      id,
      name,
      color,
      created_at,
      updated_at
    `)
    .eq('user_id', user.id)
    .order('name')

  // Get transaction counts for each tag
  const tagsWithCounts = await Promise.all(
    (tags || []).map(async (tag) => {
      const { count } = await supabase
        .from('transaction_tags')
        .select('transaction_id', { count: 'exact', head: true })
        .eq('tag_id', tag.id)

      return {
        ...tag,
        transactionCount: count || 0,
      }
    })
  )

  return <TagsSettings tags={tagsWithCounts} />
}
