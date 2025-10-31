'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

export type DocumentFlowSource = 'home' | 'documents' | 'reconciliation' | null

export function useDocumentFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const source = (searchParams?.get('from') as DocumentFlowSource) || null

  const navigateBack = () => {
    startTransition(() => {
      switch (source) {
        case 'home':
          router.push('/home')
          break
        case 'reconciliation':
          router.push('/reconciliation')
          break
        case 'documents':
        default:
          router.push('/documents')
          break
      }
    })
  }

  const navigateToDocuments = () => {
    startTransition(() => {
      router.push('/documents')
    })
  }

  const navigateToUpload = (from?: DocumentFlowSource) => {
    startTransition(() => {
      const url = from ? `/documents/upload?from=${from}` : '/documents/upload'
      router.push(url)
    })
  }

  const navigateToDetail = (id: string, from?: DocumentFlowSource) => {
    startTransition(() => {
      const url = from ? `/documents/${id}?from=${from}` : `/documents/${id}`
      router.push(url)
    })
  }

  return {
    navigateBack,
    navigateToDocuments,
    navigateToUpload,
    navigateToDetail,
    isPending,
    source,
  }
}
