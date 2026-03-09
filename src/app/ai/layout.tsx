import { getUserNav } from '@/lib/user-profile'
import { AiLayout } from '@/components/page-specific/ai-layout'

export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUserNav()

  return (
    <AiLayout user={user}>
      {children}
    </AiLayout>
  )
}
