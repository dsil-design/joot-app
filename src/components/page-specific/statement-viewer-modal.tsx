'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertCircle, ExternalLink } from 'lucide-react'

interface StatementViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  statementId: string
  filename: string
}

export function StatementViewerModal({
  open,
  onOpenChange,
  statementId,
  filename,
}: StatementViewerModalProps) {
  const [fileUrl, setFileUrl] = React.useState<string | null>(null)
  const [fileType, setFileType] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchFile = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/statements/${statementId}/file`)
      if (!response.ok) throw new Error('Failed to fetch statement file')

      const data = await response.json()
      setFileUrl(data.url)
      setFileType(data.fileType)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [statementId])

  React.useEffect(() => {
    if (!open) {
      setFileUrl(null)
      setFileType(null)
      setError(null)
      return
    }
    fetchFile()
  }, [open, fetchFile])

  const isImage = fileType?.startsWith('image/')
  const isPdf = fileType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="border-b shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4 pr-8">
            <DialogTitle className="text-base leading-snug">
              {filename}
            </DialogTitle>
            {fileUrl && (
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Open
                </a>
              </Button>
            )}
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Original uploaded statement file
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 px-6 py-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="flex-1 px-6 py-4 flex flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchFile}>
              Retry
            </Button>
          </div>
        ) : fileUrl ? (
          <div className="flex-1 overflow-hidden px-6 py-4">
            {isPdf ? (
              <iframe
                src={fileUrl}
                className="w-full h-[calc(90vh-100px)] border-0 rounded"
                title="Statement PDF"
              />
            ) : isImage ? (
              <div className="flex items-center justify-center max-h-[70vh] overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl}
                  alt={filename}
                  className="max-w-full h-auto rounded"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <p className="text-sm text-muted-foreground">
                  Preview not available for this file type.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Open in new tab
                  </a>
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
