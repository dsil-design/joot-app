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

interface PaymentSlipViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slipId: string
  filename: string
}

export function PaymentSlipViewerModal({
  open,
  onOpenChange,
  slipId,
  filename,
}: PaymentSlipViewerModalProps) {
  const [fileUrl, setFileUrl] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  // Tracks an object URL created for a client-side HEIC->JPEG conversion so we
  // can revoke it and avoid leaking memory.
  const objectUrlRef = React.useRef<string | null>(null)

  const revokeObjectUrl = React.useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const fetchFile = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    revokeObjectUrl()

    try {
      const response = await fetch(`/api/payment-slips/${slipId}/file`)
      if (!response.ok) throw new Error('Failed to fetch payment slip file')
      const data = await response.json()

      const signedUrl: string = data.url
      const fileType: string | null = data.fileType ?? null
      // Browsers can't decode HEIC (the iPhone default) in an <img> tag, so the
      // preview would render blank. Detect it by MIME type or extension — HEIC
      // uploads often arrive with an empty/octet-stream MIME type — and convert
      // to a JPEG the browser can display.
      const isHeic =
        fileType?.toLowerCase() === 'image/heic' ||
        filename.toLowerCase().endsWith('.heic') ||
        filename.toLowerCase().endsWith('.heif')

      if (isHeic) {
        const heic2any = (await import('heic2any')).default
        const srcResponse = await fetch(signedUrl)
        if (!srcResponse.ok) throw new Error('Failed to download payment slip')
        const heicBlob = await srcResponse.blob()
        const converted = await heic2any({ blob: heicBlob, toType: 'image/jpeg', quality: 0.9 })
        const jpegBlob = Array.isArray(converted) ? converted[0] : converted
        const objectUrl = URL.createObjectURL(jpegBlob)
        objectUrlRef.current = objectUrl
        setFileUrl(objectUrl)
      } else {
        setFileUrl(signedUrl)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [slipId, filename, revokeObjectUrl])

  React.useEffect(() => {
    if (!open) {
      revokeObjectUrl()
      setFileUrl(null)
      setError(null)
      return
    }
    fetchFile()
  }, [open, fetchFile, revokeObjectUrl])

  // Revoke any outstanding object URL when the component unmounts.
  React.useEffect(() => revokeObjectUrl, [revokeObjectUrl])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="border-b shrink-0 px-4 sm:px-6 pt-5 sm:pt-6 pb-4">
          <div className="flex items-start justify-between gap-4 pr-8">
            <DialogTitle className="text-base leading-snug truncate">
              {filename}
            </DialogTitle>
            {fileUrl && (
              <Button variant="outline" size="sm" asChild className="shrink-0 min-h-[44px] sm:min-h-0">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Open
                </a>
              </Button>
            )}
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Original payment slip image
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 px-6 py-4 space-y-3">
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
          <div className="flex-1 overflow-auto px-4 sm:px-6 py-4 min-h-0">
            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={filename}
                className="max-w-full h-auto rounded max-h-[70vh]"
              />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
