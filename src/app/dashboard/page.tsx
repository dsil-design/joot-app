import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6 px-6 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Welcome to Joot Dashboard!</h1>
        <p className="text-muted-foreground">
          You are signed in as {user.email}
        </p>
      </div>
      
      <div className="bg-card rounded-lg p-6 border">
        <h2 className="text-lg font-semibold mb-4">Transaction Tracker</h2>
        <p className="text-muted-foreground">
          Your USD/THB currency conversion and transaction tracking will be implemented here.
        </p>
      </div>

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        >
          Sign Out
        </button>
      </form>
    </div>
  )
}