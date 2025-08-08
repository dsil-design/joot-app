import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from './actions'
import { Button } from '@/components/ui/button'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not authenticated, redirect to login
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Welcome message with user email */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome to Joot
          </h1>
          <p className="text-muted-foreground">
            You are logged in as: <span className="font-medium">{user.email}</span>
          </p>
        </div>

        {/* Placeholder content */}
        <div className="bg-muted border border-border rounded-lg p-8">
          <p className="text-muted-foreground text-lg">
            This is where the transactions would go.
          </p>
        </div>

        {/* Sign out button */}
        <form action={signOut}>
          <Button
            type="submit"
            variant="destructive"
          >
            Sign Out
          </Button>
        </form>
      </div>
    </div>
  )
}
