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
  
  const navigateToEditTransaction = (id: string) => {
    startTransition(() => {
      router.push(`/transactions/${id}/edit`)
    })
  }
  
  const navigateToViewTransactionFromEdit = (id: string, source?: 'home' | 'transactions') => {
    startTransition(() => {
      const url = `/transactions/${id}${source ? `?from=${source}` : ''}`
      router.replace(url) // Use replace instead of push to avoid adding to history
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