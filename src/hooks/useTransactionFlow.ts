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
  
  return { 
    navigateToHome, 
    navigateToTransactions, 
    navigateToAddTransaction,
    isPending 
  }
}