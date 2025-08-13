import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowRight, Plus } from 'lucide-react'

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main scrollable content */}
      <div className="flex-1 flex flex-col gap-6 pb-12 pt-16 px-10">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <h1 className="text-4xl font-medium text-foreground leading-10">
            Home
          </h1>
          <Avatar className="size-10">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-semibold">
              DS
            </AvatarFallback>
          </Avatar>
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
          <Button variant="secondary" className="w-full h-9 gap-1.5 px-4 py-2">
            <span className="text-sm font-medium text-secondary-foreground leading-5">
              View all transactions
            </span>
            <ArrowRight className="size-5" />
          </Button>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="bg-card border-t border-border flex flex-col gap-2.5 pb-12 pt-6 px-10">
        <Button className="w-full gap-1.5 px-4 py-2">
          <Plus className="size-5" />
          <span className="text-sm font-medium text-primary-foreground leading-5">
            Add transaction
          </span>
        </Button>
      </div>
    </div>
  )
}
