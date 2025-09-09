import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CurrencyType } from "@/lib/supabase/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: CurrencyType | string, options?: Intl.NumberFormatOptions): string {
  // If options are provided, use Intl.NumberFormat for advanced formatting
  if (options) {
    const currencyCode = currency === 'THB' ? 'THB' : currency === 'USD' ? 'USD' : currency.toString()
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        ...options
      }).format(amount)
    } catch {
      // Fallback if currency code is not supported
      const symbol = currency === 'USD' ? '$' : currency === 'THB' ? '฿' : currency.toString()
      return `${symbol}${amount.toFixed(options.maximumFractionDigits ?? 2)}`
    }
  }
  
  // Simple formatting for basic use cases
  if (currency === 'USD') {
    return `$${amount.toFixed(2)}`
  } else if (currency === 'THB') {
    return `฿${amount.toFixed(2)}`
  } else {
    return `${currency}${amount.toFixed(2)}`
  }
}
