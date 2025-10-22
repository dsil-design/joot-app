import { DocsNav } from "@/components/docs/docs-nav"
import { SmartBackButton } from "@/components/docs/smart-back-button"

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center px-4">
          <div className="flex items-center space-x-4">
            <SmartBackButton />
            <h1 className="text-xl font-semibold">Joot Design System</h1>
          </div>
        </div>
      </div>
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <aside className="fixed top-16 z-30 -ml-2 hidden h-[calc(100vh-4rem)] w-full shrink-0 md:sticky md:top-16 md:block border-r border-border">
          <div className="h-full py-6 pl-8 pr-6 overflow-y-auto">
            <DocsNav />
          </div>
        </aside>
        <main className="relative py-6 lg:gap-10 lg:py-8">
          <div className="mx-auto w-full min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}