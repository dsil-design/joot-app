import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CurrencyType } from "@/lib/supabase/types"
import { getCurrencySymbolSync } from "@/lib/utils/currency-symbols-sync"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: CurrencyType | string, options?: Intl.NumberFormatOptions): string {
  const currencyCode = currency === 'THB' ? 'THB' : currency === 'USD' ? 'USD' : currency.toString()

  // Get currency symbol
  const symbol = getCurrencySymbolSync(currencyCode)

  try {
    // Use decimal formatting and prepend symbol manually
    const formattedNumber = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options  // Allow overrides
    }).format(amount)

    return `${symbol}${formattedNumber}`
  } catch {
    // Fallback with manual thousand separators if formatting fails
    const decimalPlaces = options?.maximumFractionDigits ?? 2
    const formattedNumber = amount.toFixed(decimalPlaces).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return `${symbol}${formattedNumber}`
  }
}
