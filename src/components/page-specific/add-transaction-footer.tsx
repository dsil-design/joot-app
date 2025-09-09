import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface AddTransactionFooterProps {
  className?: string
}

export function AddTransactionFooter({ className = "" }: AddTransactionFooterProps) {
  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200 flex flex-col gap-2.5 pb-12 pt-6 px-10 ${className}`}>
      <Link href="/add-transaction" className="w-full">
        <Button className="w-full gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg">
          <Plus className="size-5" />
          <span className="text-[14px] font-medium leading-[20px]">
            Add transaction
          </span>
        </Button>
      </Link>
    </div>
  )
}