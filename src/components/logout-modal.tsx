'use client'

import * as React from "react"
import { useTransition } from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/home/actions"

interface LogoutModalProps {
  children: React.ReactNode
}

export function LogoutModal({ children }: LogoutModalProps) {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-background border-border rounded-lg shadow-lg max-w-md">
        <AlertDialogHeader className="space-y-spacing-4">
          <AlertDialogTitle className="text-3xl font-bold text-foreground leading-9">
            Log Out
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-muted-foreground leading-6 space-y-spacing-4">
            <p>
              Use this when you logout options from the Authenticated 
              state and want to go to the Unauthenticated state. 
              Upon a user completing the logout action, the user is 
              redirected to the login screen with a logout toast 
              notification.
            </p>
            <p className="font-medium">
              Key Points:
            </p>
            <p>
              Tapping the logout opens the 
              logout Menu.
            </p>
            <p>
              This returns to unauthenticated state requiring login 
              again.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-spacing-3 pt-spacing-6">
          <AlertDialogCancel asChild>
            <Button 
              variant="outline" 
              className="flex-1"
              disabled={isPending}
            >
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={handleLogout}
              disabled={isPending}
            >
              {isPending ? "Logging out..." : "Log Out"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
