"use client"

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageHeaderProps {
  title: string
  actions?: React.ReactNode
  /** Hide the back button (e.g. on initial login landing) */
  hideBack?: boolean
}

export function PageHeader({ title, actions, hideBack }: PageHeaderProps) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        {!hideBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10 shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-[36px] font-medium text-foreground leading-[40px]">
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
