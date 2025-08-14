import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserMenu } from '@/components/page-specific/user-menu'
import { ViewAllTransactionsButton } from '@/components/page-specific/view-all-transactions-button'
import { Plus } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not authenticated, redirect to login
  if (!user) {
    redirect('/login')
  }

  // Fetch user profile data
  const { data: userProfile } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  // Create full name from first and last name
  const fullName = userProfile?.first_name && userProfile?.last_name
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : userProfile?.first_name || userProfile?.last_name || user.email || "User"

  // Generate initials from first and last name
  const getInitials = (firstName?: string | null, lastName?: string | null): string => {
    if (firstName && lastName) {
      return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase()
    }
    if (lastName) {
      return lastName.charAt(0).toUpperCase()
    }
    return "U" // Default fallback
  }

  const userInitials = getInitials(userProfile?.first_name, userProfile?.last_name)

  return (
    <div className="min-h-screen bg-background">
      {/* Main scrollable content */}
      <div className="flex flex-col gap-6 pb-32 pt-16 px-10">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <h1 className="text-4xl font-medium text-foreground leading-10">
            Home
          </h1>
          <UserMenu userName={fullName}>
            <Avatar className="size-10 cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </UserMenu>
        </div>

        {/* Main Content */}
        <div className="flex flex-col gap-12 pb-12">
          {/* Stats Cards */}
          <div className="flex flex-col gap-6">
            {/* Total spent card */}
            <Card className="bg-card border-border rounded-lg shadow-xs p-0">
              <div className="p-6 pb-0">
                <h2 className="text-xl font-semibold text-foreground leading-7">
                  Total spent
                </h2>
              </div>
              <div className="px-6 pb-6 pt-1">
                <p className="text-sm text-muted-foreground leading-5">
                  $1,234.56
                </p>
              </div>
            </Card>

            {/* This month card */}
            <Card className="bg-card border-border rounded-lg shadow-xs p-0">
              <div className="p-6 pb-0">
                <h2 className="text-xl font-semibold text-foreground leading-7">
                  This month
                </h2>
              </div>
              <div className="px-6 pb-6 pt-1">
                <p className="text-sm text-muted-foreground leading-5">
                  $789.01
                </p>
              </div>
            </Card>

            {/* Average cost card */}
            <Card className="bg-card border-border rounded-lg shadow-xs p-0">
              <div className="p-6 pb-0">
                <h2 className="text-xl font-semibold text-foreground leading-7">
                  Average cost
                </h2>
              </div>
              <div className="px-6 pb-6 pt-1">
                <p className="text-sm text-muted-foreground leading-5">
                  $18.23
                </p>
              </div>
            </Card>

            {/* Top method card */}
            <Card className="bg-card border-border rounded-lg shadow-xs p-0">
              <div className="p-6 pb-0">
                <h2 className="text-xl font-semibold text-foreground leading-7">
                  Top method
                </h2>
              </div>
              <div className="px-6 pb-6 pt-1">
                <p className="text-sm text-muted-foreground leading-5">
                  Credit Card
                </p>
              </div>
            </Card>
          </div>

          {/* View all transactions button */}
          <ViewAllTransactionsButton />
        </div>
      </div>

      {/* Fixed Sticky Footer - Always visible at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex flex-col gap-2.5 pb-12 pt-6 px-10">
        <Link href="/add-transaction" className="w-full">
          <Button className="w-full gap-1.5 px-4 py-2 transition-all duration-200 hover:scale-[0.98] hover:bg-primary/90 active:scale-[0.96]">
            <Plus className="size-5 transition-transform duration-200 group-hover:rotate-90" />
            <span className="text-sm font-medium text-primary-foreground leading-5">
              Add transaction
            </span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
