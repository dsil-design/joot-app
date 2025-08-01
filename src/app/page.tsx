"use client"

import { useEffect } from "react"
import { getAuthState } from "@/lib/auth"

export default function HomePage() {
  useEffect(() => {
    const authState = getAuthState()
    
    if (authState.isAuthenticated) {
      // If authenticated, redirect to dashboard
      window.location.href = '/dashboard'
    } else {
      // If not authenticated, redirect to login
      window.location.href = '/login'
    }
  }, [])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
