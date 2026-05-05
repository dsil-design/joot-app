import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CurrencyType } from "@/lib/supabase/types"
import { getCurrencySymbolSync } from "@/lib/utils/currency-symbols-sync"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a readable foreground color (zinc-900 or zinc-50) for a given
 * hex background color, based on relative luminance (WCAG formula).
 * Falls back to zinc-900 (dark text) when the hex is unrecognized.
 */
export function getReadableTextColor(hex: string): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6 && clean.length !== 3) return '#18181b'

  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean

  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255

  // Linearize
  const lin = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

  // zinc-900 (#18181b) for light backgrounds, zinc-50 (#fafafa) for dark
  return L > 0.179 ? '#18181b' : '#fafafa'
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

/**
 * Format an amount with currency symbol, returning "—" when the amount is missing.
 * Used by views that may render rows with or without extracted data.
 */
export function formatAmountOrDash(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return "—"
  const num = Number(amount)
  if (!currency) {
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return formatCurrency(num, currency)
}
