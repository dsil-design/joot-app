'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function useTransactionFlow() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  
  const navigateToHome = () => {
    startTransition(() => {
      router.push('/home')
    })
  }
  
  const navigateToTransactions = () => {
    startTransition(() => {
      router.push('/transactions')
    })
  }
  
  const navigateToAddTransaction = () => {
    startTransition(() => {
      router.push('/add-transaction')
    })
  }
  
  const navigateToViewTransaction = (id: string, source?: 'home' | 'transactions') => {
    startTransition(() => {
      const url = `/transactions/${id}${source ? `?from=${source}` : ''}`
      router.push(url)
    })
  }
  
  const navigateToEditTransaction = (id: string, source?: 'home' | 'transactions') => {
    // Mark that we entered edit from within the app, so that on save/cancel
    // we can pop the edit entry off history instead of leaving it behind.
    // This keeps the browser back button pointing to the page the user was
    // on *before* the view page, skipping the edit round-trip entirely.
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('joot:editEntryFromApp', id)
    }
    startTransition(() => {
      const url = `/transactions/${id}/edit${source ? `?from=${source}` : ''}`
      router.push(url)
    })
  }

  const navigateToViewTransactionFromEdit = (id: string, source?: 'home' | 'transactions') => {
    const cameFromApp =
      typeof window !== 'undefined' &&
      window.sessionStorage.getItem('joot:editEntryFromApp') === id
    if (cameFromApp) {
      window.sessionStorage.removeItem('joot:editEntryFromApp')
    }
    startTransition(() => {
      if (cameFromApp) {
        // Pop the edit entry off history so back goes to the page the user
        // was on before opening the transaction, not back to this same view.
        router.back()
        router.refresh()
      } else {
        // Deep link / hard refresh into /edit — no view entry to return to.
        const url = `/transactions/${id}${source ? `?from=${source}` : ''}`
        router.replace(url)
      }
    })
  }
  
  const navigateBack = () => {
    startTransition(() => {
      router.back()
    })
  }
  
  return { 
    navigateToHome, 
    navigateToTransactions, 
    navigateToAddTransaction,
    navigateToViewTransaction,
    navigateToEditTransaction,
    navigateToViewTransactionFromEdit,
    navigateBack,
    isPending 
  }
}