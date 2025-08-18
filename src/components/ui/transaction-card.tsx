import { Card } from '@/components/ui/card'

interface TransactionCardProps {
  amount: string
  vendor: string
  description: string
  className?: string
}

export function TransactionCard({ 
  amount, 
  vendor, 
  description, 
  className 
}: TransactionCardProps) {
  return (
    <Card className={`bg-white border border-zinc-200 rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-0 w-full ${className}`}>
      <div className="p-6 flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          {/* Amount - text-xl/medium, black */}
          <div className="text-xl font-medium text-black leading-7">
            {amount}
          </div>
          {/* Vendor - text-sm/normal, muted-foreground */}
          <div className="text-sm font-normal text-muted-foreground leading-5">
            {vendor}
          </div>
          {/* Description - text-sm/medium, foreground */}
          <div className="text-sm font-medium text-foreground leading-5">
            {description}
          </div>
        </div>
      </div>
    </Card>
  )
}
