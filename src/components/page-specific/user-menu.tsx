'use client'

import * as React from "react"
import { useTransition } from "react"
import { LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/app/home/actions"

interface UserMenuProps {
  children: React.ReactNode
  userName?: string
}

export function UserMenu({ children, userName = "Johnny Appleseed" }: UserMenuProps) {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-56 bg-background border-border rounded-md shadow-md p-spacing-1"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="px-spacing-2 py-spacing-1_5 text-sm/semibold text-foreground">
          {userName}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem 
          className="px-spacing-2 py-spacing-1_5 text-sm/normal text-foreground cursor-pointer focus:bg-accent focus:text-accent-foreground"
          onClick={handleLogout}
          disabled={isPending}
        >
          <LogOut className="mr-spacing-2 h-4 w-4" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
