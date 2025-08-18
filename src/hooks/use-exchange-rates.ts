"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ExchangeRate, CurrencyType } from "@/lib/supabase/types"

export interface ExchangeRateData {
  rate: number
  date: string
  isLatest: boolean
}

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchExchangeRates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from("exchange_rates")
        .select("*")
        .order("date", { ascending: false })
        .limit(10) // Get latest 10 rates

      if (fetchError) {
        throw fetchError
      }

      setRates(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch exchange rates")
      setRates([])
    } finally {
      setLoading(false)
    }
  }, [])

  const getLatestRate = useCallback((fromCurrency: CurrencyType, toCurrency: CurrencyType): ExchangeRateData | null => {
    if (fromCurrency === toCurrency) {
      return {
        rate: 1,
        date: new Date().toISOString().split('T')[0],
        isLatest: true
      }
    }

    const latestRate = rates.find(
      rate => rate.from_currency === fromCurrency && rate.to_currency === toCurrency
    )

    if (latestRate) {
      const today = new Date().toISOString().split('T')[0]
      return {
        rate: latestRate.rate,
        date: latestRate.date,
        isLatest: latestRate.date === today
      }
    }

    return null
  }, [rates])

  const convertAmount = useCallback((
    amount: number,
    fromCurrency: CurrencyType,
    toCurrency: CurrencyType
  ): number | null => {
    const rateData = getLatestRate(fromCurrency, toCurrency)
    if (!rateData) {
      return null
    }
    return Math.round(amount * rateData.rate * 100) / 100
  }, [getLatestRate])

  const getTHBRate = useCallback((): ExchangeRateData => {
    const usdToThb = getLatestRate("USD", "THB")
    if (usdToThb) {
      return usdToThb
    }

    // Fallback rate if no data available
    return {
      rate: 35.0,
      date: new Date().toISOString().split('T')[0],
      isLatest: false
    }
  }, [getLatestRate])

  const getUSDRate = useCallback((): ExchangeRateData => {
    const thbToUsd = getLatestRate("THB", "USD")
    if (thbToUsd) {
      return thbToUsd
    }

    // Calculate inverse if THB to USD not available
    const usdToThb = getLatestRate("USD", "THB")
    if (usdToThb) {
      return {
        rate: Math.round((1 / usdToThb.rate) * 10000) / 10000,
        date: usdToThb.date,
        isLatest: usdToThb.isLatest
      }
    }

    // Fallback rate if no data available
    return {
      rate: 0.0286,
      date: new Date().toISOString().split('T')[0],
      isLatest: false
    }
  }, [getLatestRate])

  // Mock function to simulate fetching from external API
  const fetchLatestRatesFromAPI = async (): Promise<boolean> => {
    try {
      setError(null)
      
      // In a real app, this would call an external exchange rate API
      // For now, we'll create mock data
      const today = new Date().toISOString().split('T')[0]
      
      const mockRates = [
        {
          from_currency: "USD" as CurrencyType,
          to_currency: "THB" as CurrencyType,
          rate: 35.25 + (Math.random() - 0.5) * 0.5, // Random rate around 35.25
          date: today
        },
        {
          from_currency: "THB" as CurrencyType,
          to_currency: "USD" as CurrencyType,
          rate: 1 / (35.25 + (Math.random() - 0.5) * 0.5),
          date: today
        }
      ]

      const supabase = createClient()
      const { error: insertError } = await supabase
        .from("exchange_rates")
        .upsert(mockRates, {
          onConflict: "from_currency,to_currency,date"
        })

      if (insertError) {
        throw insertError
      }

      // Refresh local data
      await fetchExchangeRates()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update exchange rates")
      return false
    }
  }

  useEffect(() => {
    fetchExchangeRates()
  }, [fetchExchangeRates])

  return {
    rates,
    loading,
    error,
    getLatestRate,
    convertAmount,
    getTHBRate,
    getUSDRate,
    fetchLatestRatesFromAPI,
    refetch: fetchExchangeRates
  }
}