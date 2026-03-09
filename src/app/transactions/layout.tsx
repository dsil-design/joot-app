import { getUserNav } from '@/lib/user-profile'
import { PageShell } from '@/components/page-specific/page-shell'

export default async function TransactionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUserNav()

  return (
    <PageShell user={user}>
      {children}
    </PageShell>
  )
}
