import { useTransactions } from '@/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface CreateTransactionInput {
  description: string
  amount: number
  currency: string
  date: string
  vendorId?: string
  paymentMethodId?: string
  tagIds?: string[]
  transactionType: string
}

export function useCreateAndLink(
  linkFn: (compositeId: string, transactionId: string) => Promise<unknown>
) {
  const { createTransaction } = useTransactions()
  const queryClient = useQueryClient()

  const createAndLink = async (
    compositeId: string,
    data: CreateTransactionInput
  ) => {
    const result = await createTransaction({
      description: data.description,
      amount: data.amount,
      originalCurrency: data.currency as 'USD' | 'THB',
      transactionDate: data.date,
      transactionType: data.transactionType as 'expense' | 'income',
      vendorId: data.vendorId,
      paymentMethodId: data.paymentMethodId,
      tagIds: data.tagIds,
    })

    if (!result) throw new Error('Failed to create transaction')
    await linkFn(compositeId, result.id)
    await queryClient.invalidateQueries({ queryKey: ['transactions', 'paginated'] })
    toast.success('Transaction created and linked')
    return result
  }

  return { createAndLink }
}
