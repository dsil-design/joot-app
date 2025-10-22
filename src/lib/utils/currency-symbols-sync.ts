/**
 * Server-safe currency symbol utilities
 * These functions use only static data and can be called from both client and server
 */

export interface CurrencyInfo {
  symbol: string
  decimalPlaces: number
}

/**
 * Currency configuration - provides fallback for common currencies
 * Includes both symbol and decimal place information
 */
export const CURRENCY_CONFIG_FALLBACK: Record<string, CurrencyInfo> = {
  USD: { symbol: '$', decimalPlaces: 2 },
  THB: { symbol: '฿', decimalPlaces: 2 },
  EUR: { symbol: '€', decimalPlaces: 2 },
  GBP: { symbol: '£', decimalPlaces: 2 },
  JPY: { symbol: '¥', decimalPlaces: 0 },
  CNY: { symbol: '¥', decimalPlaces: 2 },
  SGD: { symbol: 'S$', decimalPlaces: 2 },
  MYR: { symbol: 'RM', decimalPlaces: 2 },
  AUD: { symbol: 'A$', decimalPlaces: 2 },
  CAD: { symbol: 'C$', decimalPlaces: 2 },
  CHF: { symbol: 'Fr', decimalPlaces: 2 },
  INR: { symbol: '₹', decimalPlaces: 2 },
  KRW: { symbol: '₩', decimalPlaces: 0 },
  BTC: { symbol: '₿', decimalPlaces: 8 },
  ETH: { symbol: 'Ξ', decimalPlaces: 8 },
}

/**
 * Synchronous version - uses only the fallback mapping
 * Useful for immediate rendering without async calls
 * Safe to use on both client and server
 */
export function getCurrencyInfoSync(currencyCode: string): CurrencyInfo {
  return CURRENCY_CONFIG_FALLBACK[currencyCode] || { symbol: currencyCode, decimalPlaces: 2 }
}

/**
 * Synchronous version - get symbol only
 * Safe to use on both client and server
 */
export function getCurrencySymbolSync(currencyCode: string): string {
  const info = getCurrencyInfoSync(currencyCode)
  return info.symbol
}
