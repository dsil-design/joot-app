'use client'

import * as React from "react"
import { useTransition } from "react"
import Link from "next/link"
import { LogOut, Monitor, Moon, Settings, Sun, SunMoon } from "lucide-react"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/app/home/actions"

interface UserMenuProps {
  children: React.ReactNode
  userName?: string
  isAdmin?: boolean
}

export function UserMenu({ children, userName = "User", isAdmin = false }: UserMenuProps) {
  const [isPending, startTransition] = useTransition()
  const { theme, setTheme } = useTheme()

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

        <Link href="/settings">
          <DropdownMenuItem className="px-spacing-2 py-spacing-1_5 text-sm/normal text-foreground cursor-pointer focus:bg-accent focus:text-accent-foreground">
            <Settings className="mr-spacing-2 h-4 w-4" />
            My settings
          </DropdownMenuItem>
        </Link>

        {isAdmin && (
          <>
            <DropdownMenuSeparator className="bg-border" />
            <Link href="/admin/dashboard">
              <DropdownMenuItem className="px-spacing-2 py-spacing-1_5 text-sm/normal text-foreground cursor-pointer focus:bg-accent focus:text-accent-foreground">
                <Settings className="mr-spacing-2 h-4 w-4" />
                Admin Dashboard
              </DropdownMenuItem>
            </Link>
          </>
        )}

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="px-spacing-2 py-spacing-1_5 text-sm/normal text-foreground cursor-pointer focus:bg-accent focus:text-accent-foreground">
            <SunMoon className="mr-spacing-2 h-4 w-4" />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="bg-background border-border rounded-md shadow-md p-spacing-1">
              <DropdownMenuRadioGroup
                value={theme ?? "system"}
                onValueChange={setTheme}
              >
                <DropdownMenuRadioItem
                  value="light"
                  className="px-spacing-2 py-spacing-1_5 text-sm/normal text-foreground cursor-pointer focus:bg-accent focus:text-accent-foreground"
                >
                  <Sun className="mr-spacing-2 h-4 w-4" />
                  Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="dark"
                  className="px-spacing-2 py-spacing-1_5 text-sm/normal text-foreground cursor-pointer focus:bg-accent focus:text-accent-foreground"
                >
                  <Moon className="mr-spacing-2 h-4 w-4" />
                  Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="system"
                  className="px-spacing-2 py-spacing-1_5 text-sm/normal text-foreground cursor-pointer focus:bg-accent focus:text-accent-foreground"
                >
                  <Monitor className="mr-spacing-2 h-4 w-4" />
                  System
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

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
