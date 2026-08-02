import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AutoTagRulesSettings } from '@/components/page-specific/auto-tag-rules-settings'

export default async function AutoTagsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: rules }, { data: vendors }, { data: tags }] = await Promise.all([
    supabase
      .from('auto_tag_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true }),
    supabase.from('vendors').select('id, name').eq('user_id', user.id).order('name'),
    supabase.from('tags').select('id, name, color').eq('user_id', user.id).order('name'),
  ])

  // match_type is a CHECK-constrained TEXT column, so the generated types widen
  // it to string; narrow it back at the boundary rather than loosening the prop.
  const typedRules = (rules || []).map((rule) => ({
    ...rule,
    match_type: rule.match_type as 'vendor' | 'counterparty_pattern',
  }))

  return (
    <AutoTagRulesSettings
      rules={typedRules}
      vendors={vendors || []}
      tags={tags || []}
    />
  )
}
