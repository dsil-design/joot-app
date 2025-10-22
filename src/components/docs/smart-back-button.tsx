"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function SmartBackButton() {
  const router = useRouter()
  const [hasHistory, setHasHistory] = useState(false)

  useEffect(() => {
    // Check if there's navigation history
    // We can detect this by checking if the user navigated here from another page
    setHasHistory(window.history.length > 1)
  }, [])

  const handleBack = () => {
    // If there's history, go back
    if (hasHistory && window.history.length > 1) {
      router.back()
    } else {
      // Fallback to login if no history (e.g., direct link access)
      router.push("/login")
    }
  }

  return (
    <Button onClick={handleBack} variant="ghost" size="sm">
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back to App
    </Button>
  )
}
