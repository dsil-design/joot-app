"use client"

import { createClient } from "@/lib/supabase/client"
import type { CurrencyType, TransactionWithVendorAndPayment } from "@/lib/supabase/types"

export interface CurrencyDisplayAmounts {
  primary: string
  secondary: string | null
  secondaryNeedsSync?: boolean
}

/**
 * Get the most recent exchange rate available (preferably today's rate)
 */
export async function getCurrentExchangeRate(
  fromCurrency: CurrencyType,
  toCurrency: CurrencyType
): Promise<{ rate: number | null; needsSync: boolean }> {
  if (fromCurrency === toCurrency) {
    return { rate: 1, needsSync: false }
  }

  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  
  // Try to get today's rate first using the database function
  const { data, error } = await supabase.rpc('get_exchange_rate_with_fallback', {
    p_date: today,
    p_from_currency: fromCurrency,
    p_to_currency: toCurrency,
    p_max_days_back: 30 // Look back up to 30 days for most recent rate
  })

  if (error || !data || data.length === 0) {
    return { rate: null, needsSync: true }
  }

  const rateData = data[0]
  // We need sync if we don't have today's rate
  const needsSync = rateData.actual_date !== today

  return { rate: rateData.rate, needsSync }
}

/**
 * Calculate the correct display amounts for a transaction
 * Primary = recorded currency amount (from transaction.amount)
 * Secondary = calculated amount in the opposite currency using CURRENT exchange rates
 */
export async function calculateTransactionDisplayAmounts(
  transaction: TransactionWithVendorAndPayment
): Promise<CurrencyDisplayAmounts> {
  const recordedCurrency = transaction.original_currency
  const recordedAmount = transaction.amount

  // Primary amount is always the recorded amount with correct symbol
  const primarySymbol = recordedCurrency === 'USD' ? '$' : '฿'
  const primary = `${primarySymbol}${recordedAmount.toFixed(2)}`

  // For secondary amount, we calculate using CURRENT exchange rates (today's rate or most recent)
  const oppositeCurrency: CurrencyType = recordedCurrency === 'USD' ? 'THB' : 'USD'
  const oppositeSymbol = oppositeCurrency === 'USD' ? '$' : '฿'

  try {
    const { rate, needsSync } = await getCurrentExchangeRate(
      recordedCurrency,
      oppositeCurrency
    )

    if (rate === null) {
      return {
        primary,
        secondary: null,
        secondaryNeedsSync: true
      }
    }

    const calculatedAmount = recordedAmount * rate
    const secondary = `${oppositeSymbol}${calculatedAmount.toFixed(2)}`

    return {
      primary,
      secondary,
      secondaryNeedsSync: needsSync
    }
  } catch (error) {
    console.error('Error calculating currency conversion:', error)
    return {
      primary,
      secondary: null,
      secondaryNeedsSync: true
    }
  }
}

/**
 * Trigger exchange rate sync if needed
 */
export async function triggerExchangeRateSync(): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/sync/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ syncType: 'daily' })
    })

    return response.ok
  } catch (error) {
    console.error('Failed to trigger exchange rate sync:', error)
    return false
  }
}