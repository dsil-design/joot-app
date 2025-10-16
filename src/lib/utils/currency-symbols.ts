"use client"

import { createClient } from "@/lib/supabase/client"

export interface CurrencyInfo {
  symbol: string
  decimalPlaces: number
}

/**
 * Currency configuration - provides fallback for common currencies
 * Includes both symbol and decimal place information
 */
const CURRENCY_CONFIG_FALLBACK: Record<string, CurrencyInfo> = {
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

// Cache for currency configuration to avoid repeated database queries
let currencyConfigCache: Record<string, CurrencyInfo> | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Load currency configuration from the database
 * This is a future-proof implementation that queries the currency_configuration table
 */
async function loadCurrencyConfigFromDB(): Promise<Record<string, CurrencyInfo>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('currency_configuration')
    .select('currency_code, currency_symbol, decimal_places')

  if (error || !data) {
    console.warn('Failed to load currency configuration from database, using fallback:', error)
    return CURRENCY_CONFIG_FALLBACK
  }

  const configMap: Record<string, CurrencyInfo> = {}
  for (const row of data) {
    if (row.currency_symbol) {
      configMap[row.currency_code] = {
        symbol: row.currency_symbol,
        decimalPlaces: row.decimal_places ?? 2 // Default to 2 if not specified
      }
    }
  }

  // Merge with fallback to ensure we have all common currencies
  return { ...CURRENCY_CONFIG_FALLBACK, ...configMap }
}

/**
 * Get full currency configuration (symbol + decimal places) for a given currency code
 * Uses cached values when available and falls back to database or hardcoded values
 */
export async function getCurrencyInfo(currencyCode: string): Promise<CurrencyInfo> {
  const now = Date.now()

  // Check if cache is valid
  if (currencyConfigCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION_MS) {
    return currencyConfigCache[currencyCode] || { symbol: currencyCode, decimalPlaces: 2 }
  }

  // Reload cache from database
  currencyConfigCache = await loadCurrencyConfigFromDB()
  cacheTimestamp = now

  return currencyConfigCache[currencyCode] || { symbol: currencyCode, decimalPlaces: 2 }
}

/**
 * Synchronous version - uses only the fallback mapping
 * Useful for immediate rendering without async calls
 */
export function getCurrencyInfoSync(currencyCode: string): CurrencyInfo {
  // First check cache if available
  if (currencyConfigCache && currencyConfigCache[currencyCode]) {
    return currencyConfigCache[currencyCode]
  }

  // Fall back to hardcoded values
  return CURRENCY_CONFIG_FALLBACK[currencyCode] || { symbol: currencyCode, decimalPlaces: 2 }
}

/**
 * Get currency symbol for a given currency code
 * @deprecated Use getCurrencyInfo or getCurrencyInfoSync for full configuration
 */
export async function getCurrencySymbol(currencyCode: string): Promise<string> {
  const info = await getCurrencyInfo(currencyCode)
  return info.symbol
}

/**
 * Synchronous version - get symbol only
 * @deprecated Use getCurrencyInfoSync for full configuration
 */
export function getCurrencySymbolSync(currencyCode: string): string {
  const info = getCurrencyInfoSync(currencyCode)
  return info.symbol
}

/**
 * Preload currency configuration into cache
 * Call this early in the application lifecycle to populate the cache
 */
export async function preloadCurrencyConfig(): Promise<void> {
  currencyConfigCache = await loadCurrencyConfigFromDB()
  cacheTimestamp = Date.now()
}
