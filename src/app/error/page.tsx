'use client'

import { Button } from '@/components/ui/button'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const message = searchParams?.get('message')
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-destructive">
            Authentication Error
          </h1>
          <p className="text-sm text-muted-foreground">
            {message ? decodeURIComponent(message) : 'Sorry, we couldn\'t authenticate you. Please try again.'}
          </p>
          <Button
            asChild
            variant="default"
            className="w-full"
          >
            <Link href="/login">
              Try Again
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-4 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-destructive">
              Authentication Error
            </h1>
            <p className="text-sm text-muted-foreground">
              Loading...
            </p>
          </div>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
