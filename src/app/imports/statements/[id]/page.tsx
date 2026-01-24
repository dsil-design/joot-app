'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

/**
 * Statement Detail Page
 *
 * Redirects to the results page for this statement.
 * This ensures both `/imports/statements/[id]` and `/imports/statements/[id]/results`
 * work correctly.
 */
export default function StatementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  useEffect(() => {
    router.replace(`/imports/statements/${id}/results`)
  }, [id, router])

  return null
}
