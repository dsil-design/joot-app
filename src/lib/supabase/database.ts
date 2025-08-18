import { createClient } from './client'
import type { PostgrestError } from '@supabase/supabase-js'
import type { 
  Transaction, 
  TransactionInsert, 
  TransactionUpdate,
  ExchangeRate,
  ExchangeRateInsert,
  CurrencyType 
} from './types'

// Client-side database functions
export const db = {
  // Transaction operations
  transactions: {
    // Get all transactions for current user
    getAll: async (): Promise<{ data: Transaction[] | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
      
      return { data, error }
    },

    // Get transaction by ID
    getById: async (id: string): Promise<{ data: Transaction | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single()
      
      return { data, error }
    },

    // Create new transaction
    create: async (transaction: TransactionInsert): Promise<{ data: Transaction | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single()
      
      return { data, error }
    },

    // Update transaction
    update: async (id: string, updates: TransactionUpdate): Promise<{ data: Transaction | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      return { data, error }
    },

    // Delete transaction
    delete: async (id: string): Promise<{ error: PostgrestError | null }> => {
      const supabase = createClient()
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
      
      return { error }
    },

    // Get transactions by date range
    getByDateRange: async (startDate: string, endDate: string): Promise<{ data: Transaction[] | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false })
      
      return { data, error }
    },

  },

  // Exchange rate operations
  exchangeRates: {
    // Get latest exchange rate
    getLatest: async (fromCurrency: CurrencyType, toCurrency: CurrencyType): Promise<{ data: ExchangeRate | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .order('date', { ascending: false })
        .limit(1)
        .single()
      
      return { data, error }
    },

    // Get exchange rate for specific date
    getByDate: async (fromCurrency: CurrencyType, toCurrency: CurrencyType, date: string): Promise<{ data: ExchangeRate | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .eq('date', date)
        .single()
      
      return { data, error }
    },

    // Get exchange rate with automatic fallback to interpolated data
    getWithFallback: async (
      fromCurrency: CurrencyType, 
      toCurrency: CurrencyType, 
      date: string
    ): Promise<{ data: ExchangeRate | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      
      // First try exact date
      let { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .eq('date', date)
        .order('is_interpolated', { ascending: true }) // Prefer actual rates over interpolated
        .limit(1)
        .single()
      
      // If no exact match, try fallback within 7 days
      if (error?.code === 'PGRST116') { // No rows returned
        const fallbackResult = await supabase
          .from('exchange_rates')
          .select('*')
          .eq('from_currency', fromCurrency)
          .eq('to_currency', toCurrency)
          .gte('date', new Date(Date.parse(date) - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .lte('date', date)
          .order('date', { ascending: false })
          .order('is_interpolated', { ascending: true })
          .limit(1)
          .single()
        
        data = fallbackResult.data
        error = fallbackResult.error
      }
      
      return { data, error }
    },

    // Store interpolated rate
    storeInterpolated: async (
      fromCurrency: CurrencyType,
      toCurrency: CurrencyType,
      date: string,
      rate: number,
      sourceDate: string
    ): Promise<{ data: ExchangeRate | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      const interpolatedRate: ExchangeRateInsert = {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        date,
        rate,
        source: 'ECB',
        is_interpolated: true,
        interpolated_from_date: sourceDate
      }
      
      const { data, error } = await supabase
        .from('exchange_rates')
        .insert(interpolatedRate)
        .select()
        .single()
      
      return { data, error }
    },

    // Bulk insert rates for performance
    bulkInsert: async (rates: ExchangeRateInsert[]): Promise<{ data: ExchangeRate[] | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      const batchSize = 500
      let allData: ExchangeRate[] = []
      let lastError: PostgrestError | null = null
      
      // Process in batches to avoid overwhelming the database
      for (let i = 0; i < rates.length; i += batchSize) {
        const batch = rates.slice(i, i + batchSize)
        
        const { data, error } = await supabase
          .from('exchange_rates')
          .insert(batch)
          .select()
        
        if (error) {
          lastError = error
          break
        }
        
        if (data) {
          allData = allData.concat(data)
        }
      }
      
      return { data: lastError ? null : allData, error: lastError }
    },

    // Upsert rates (insert or update if conflict)
    upsert: async (rates: ExchangeRateInsert[]): Promise<{ data: ExchangeRate[] | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('exchange_rates')
        .upsert(rates, {
          onConflict: 'from_currency,to_currency,date',
          ignoreDuplicates: false
        })
        .select()
      
      return { data, error }
    },

    // Bulk upsert rates for performance
    bulkUpsert: async (rates: ExchangeRateInsert[]): Promise<{ data: ExchangeRate[] | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      const batchSize = 500
      let allData: ExchangeRate[] = []
      let lastError: PostgrestError | null = null
      
      // Process in batches to avoid overwhelming the database
      for (let i = 0; i < rates.length; i += batchSize) {
        const batch = rates.slice(i, i + batchSize)
        
        const { data, error } = await supabase
          .from('exchange_rates')
          .upsert(batch, {
            onConflict: 'from_currency,to_currency,date',
            ignoreDuplicates: false
          })
          .select()
        
        if (error) {
          lastError = error
          break
        }
        
        if (data) {
          allData = allData.concat(data)
        }
      }
      
      return { data: lastError ? null : allData, error: lastError }
    },

    // Get all rates for a specific date range
    getByDateRange: async (
      fromCurrency: CurrencyType,
      toCurrency: CurrencyType,
      startDate: string,
      endDate: string
    ): Promise<{ data: ExchangeRate[] | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
      
      return { data, error }
    },
  },
}

// Note: Server-side database functions have been moved to server-database.ts
// to avoid importing server utilities in client components

// Utility functions for currency conversion
export const currencyUtils = {
  // Convert amount between currencies using exchange rate
  convertAmount: (amount: number, exchangeRate: number): number => {
    return Math.round(amount * exchangeRate * 100) / 100
  },

  // Format currency for display
  formatCurrency: (amount: number, currency: CurrencyType): string => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return formatter.format(amount)
  },

  // Calculate both USD and THB amounts based on original currency
  calculateAmounts: (originalAmount: number, originalCurrency: CurrencyType, exchangeRate: number) => {
    if (originalCurrency === 'USD') {
      return {
        amount_usd: originalAmount,
        amount_thb: currencyUtils.convertAmount(originalAmount, exchangeRate),
      }
    } else {
      return {
        amount_usd: currencyUtils.convertAmount(originalAmount, exchangeRate),
        amount_thb: originalAmount,
      }
    }
  },
}
