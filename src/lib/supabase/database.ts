import { createClient } from './client'
import type { PostgrestError } from '@supabase/supabase-js'
import type { 
  Transaction, 
  TransactionInsert, 
  TransactionUpdate,
  TransactionWithCategory,
  TransactionCategory,
  TransactionCategoryInsert,
  TransactionCategoryUpdate,
  ExchangeRate,
  CurrencyType 
} from './types'

// Client-side database functions
export const db = {
  // Transaction operations
  transactions: {
    // Get all transactions for current user
    getAll: async (): Promise<{ data: TransactionWithCategory[] | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
      
      return { data, error }
    },

    // Get transaction by ID
    getById: async (id: string): Promise<{ data: TransactionWithCategory | null; error: PostgrestError | null }> => {
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
    getByDateRange: async (startDate: string, endDate: string): Promise<{ data: TransactionWithCategory[] | null; error: PostgrestError | null }> => {
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

  // Category operations
  categories: {
    // Get all categories for current user
    getAll: async (): Promise<{ data: TransactionCategory[] | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .order('name')
      
      return { data, error }
    },

    // Create new category
    create: async (category: TransactionCategoryInsert): Promise<{ data: TransactionCategory | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('transaction_categories')
        .insert(category)
        .select()
        .single()
      
      return { data, error }
    },

    // Update category
    update: async (id: string, updates: TransactionCategoryUpdate): Promise<{ data: TransactionCategory | null; error: PostgrestError | null }> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('transaction_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      return { data, error }
    },

    // Delete category
    delete: async (id: string): Promise<{ error: PostgrestError | null }> => {
      const supabase = createClient()
      const { error } = await supabase
        .from('transaction_categories')
        .delete()
        .eq('id', id)
      
      return { error }
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
