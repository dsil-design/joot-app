"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"

interface NavItem {
  title: string
  href?: string
  items?: NavItem[]
}

const navigation: NavItem[] = [
  {
    title: "Foundations",
    items: [
      { title: "Colors", href: "/docs/foundations/colors" },
      { title: "Typography", href: "/docs/foundations/typography" },
      { title: "Spacing", href: "/docs/foundations/spacing" },
      { title: "Icons", href: "/docs/foundations/icons" },
      { title: "Tokens", href: "/docs/foundations/tokens" },
    ],
  },
  {
    title: "Components",
    items: [
      { title: "Accordion", href: "/docs/components/accordion" },
      { title: "Alert", href: "/docs/components/alert" },
      { title: "Alert Dialog", href: "/docs/components/alert-dialog" },
      { title: "Avatar", href: "/docs/components/avatar" },
      { title: "Badge", href: "/docs/components/badge" },
      { title: "Breadcrumb", href: "/docs/components/breadcrumb" },
      { title: "Button", href: "/docs/components/button" },
      { title: "Calendar", href: "/docs/components/calendar" },
      { title: "Card", href: "/docs/components/card" },
      { title: "Carousel", href: "/docs/components/carousel" },
      { title: "Checkbox", href: "/docs/components/checkbox" },
      { title: "ComboBox", href: "/docs/components/combobox" },
      { title: "Command", href: "/docs/components/command" },
      { title: "Context Menu", href: "/docs/components/context-menu" },
      { title: "Date Picker", href: "/docs/components/date-picker" },
      { title: "Dialog", href: "/docs/components/dialog" },
      { title: "Drawer", href: "/docs/components/drawer" },
      { title: "Dropdown Menu", href: "/docs/components/dropdown-menu" },
      { title: "Hover Card", href: "/docs/components/hover-card" },
      { title: "Input", href: "/docs/components/input" },
      { title: "Input OTP", href: "/docs/components/input-otp" },
      { title: "Label", href: "/docs/components/label" },
      { title: "Menubar", href: "/docs/components/menubar" },
      { title: "Pagination", href: "/docs/components/pagination" },
      { title: "Popover", href: "/docs/components/popover" },
      { title: "Progress", href: "/docs/components/progress" },
      { title: "Radio Group", href: "/docs/components/radio-group" },
      { title: "Scroll Area", href: "/docs/components/scroll-area" },
      { title: "Select", href: "/docs/components/select" },
      { title: "Separator", href: "/docs/components/separator" },
      { title: "Sheet", href: "/docs/components/sheet" },
      { title: "Skeleton", href: "/docs/components/skeleton" },
      { title: "Slider", href: "/docs/components/slider" },
      { title: "Switch", href: "/docs/components/switch" },
      { title: "Table", href: "/docs/components/table" },
      { title: "Tabs", href: "/docs/components/tabs" },
      { title: "Textarea", href: "/docs/components/textarea" },
      { title: "Toggle", href: "/docs/components/toggle" },
      { title: "Toggle Group", href: "/docs/components/toggle-group" },
      { title: "Tooltip", href: "/docs/components/tooltip" },
    ],
  },
  {
    title: "Patterns",
    items: [
      { title: "Forms", href: "/docs/patterns/forms" },
      { title: "Navigation", href: "/docs/patterns/navigation" },
      { title: "Data Display", href: "/docs/patterns/data-display" },
    ],
  },
]

function NavSection({ item, level = 0 }: { item: NavItem; level?: number }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(true)

  if (item.items) {
    return (
      <div className="pb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between py-2 text-sm font-medium text-foreground hover:text-foreground/80"
        >
          {item.title}
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {isOpen && (
          <div className="grid grid-flow-row auto-rows-max text-sm">
            {item.items.map((child, index) => (
              <NavSection key={index} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "group flex w-full items-center rounded-md border border-transparent px-2 py-1 text-sm text-muted-foreground hover:text-foreground",
        pathname === item.href && "text-foreground bg-muted",
        level === 1 && "ml-4"
      )}
    >
      {item.title}
    </Link>
  )
}

export function DocsNav() {
  return (
    <nav className="grid gap-2">
      {navigation.map((item, index) => (
        <NavSection key={index} item={item} />
      ))}
    </nav>
  )
}