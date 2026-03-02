'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface ContextBreadcrumbProps {
  statementUploadId: string
  onClearFilter: () => void
}

export function ContextBreadcrumb({
  statementUploadId,
  onClearFilter,
}: ContextBreadcrumbProps) {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    const fetchLabel = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('statement_uploads')
        .select(`
          statement_period_start,
          payment_methods (name)
        `)
        .eq('id', statementUploadId)
        .single()

      if (data) {
        const pmName = (data.payment_methods as { name: string } | null)?.name || 'Unknown'
        const period = data.statement_period_start
          ? new Date(data.statement_period_start).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })
          : ''
        setLabel([pmName, period].filter(Boolean).join(' — '))
      }
    }
    fetchLabel()
  }, [statementUploadId])

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
      <Link
        href="/imports"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Coverage
      </Link>
      <span className="text-muted-foreground">·</span>
      <span className="font-medium">
        Viewing: {label || 'Loading...'}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 ml-auto"
        onClick={onClearFilter}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
