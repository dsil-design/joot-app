import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CurrencyType } from "@/lib/supabase/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: CurrencyType | string, options?: Intl.NumberFormatOptions): string {
  const currencyCode = currency === 'THB' ? 'THB' : currency === 'USD' ? 'USD' : currency.toString()

  try {
    // Always use Intl.NumberFormat for consistent thousand separators
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options  // Allow overrides
    }).format(amount)
  } catch {
    // Fallback with manual thousand separators if currency code is not supported
    const symbol = currency === 'USD' ? '$' : currency === 'THB' ? '฿' : currency.toString()
    const decimalPlaces = options?.maximumFractionDigits ?? 2
    const formattedNumber = amount.toFixed(decimalPlaces).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return `${symbol}${formattedNumber}`
  }
}
