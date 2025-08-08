import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from './actions'

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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Welcome message with user email */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900">
            Welcome to Joot
          </h1>
          <p className="text-zinc-600">
            You are logged in as: <span className="font-medium">{user.email}</span>
          </p>
        </div>

        {/* Placeholder content */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-8">
          <p className="text-zinc-500 text-lg">
            This is where the transactions would go.
          </p>
        </div>

        {/* Sign out button */}
        <form action={signOut}>
          <button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
}
