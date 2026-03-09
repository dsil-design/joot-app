import { getUserNav } from '@/lib/user-profile'
import { PageShell } from '@/components/page-specific/page-shell'
import { PageHeader } from '@/components/page-specific/page-header'

export default async function ReviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUserNav()

  return (
    <PageShell user={user}>
      <PageHeader title="Review Queue" />
      {children}
    </PageShell>
  )
}
