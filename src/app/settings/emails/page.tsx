import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmailsSettings } from '@/components/page-specific/emails-settings'

export default async function EmailsSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if iCloud integration is configured
  const isConfigured = !!(process.env.ICLOUD_EMAIL && process.env.ICLOUD_APP_PASSWORD)

  // Fetch initial emails
  const { data: emails } = await supabase
    .from('emails')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(50)

  // Fetch sync state
  const { data: syncStates } = await supabase
    .from('email_sync_state')
    .select('folder, last_uid, last_sync_at')
    .eq('user_id', user.id)

  // Get total email count
  const { count: totalEmails } = await supabase
    .from('emails')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Find most recent sync
  const lastSyncAt = syncStates?.reduce((latest, state) => {
    if (!state.last_sync_at) return latest
    if (!latest) return state.last_sync_at
    return state.last_sync_at > latest ? state.last_sync_at : latest
  }, null as string | null) || null

  return (
    <EmailsSettings
      emails={emails || []}
      totalEmails={totalEmails || 0}
      lastSyncAt={lastSyncAt}
      isConfigured={isConfigured}
      folders={syncStates?.map(s => s.folder) || []}
    />
  )
}
