// Server-side database functions ONLY
// This file should only be imported in server components, API routes, or middleware
import { createClient as createServerClient } from './server'
import type { PostgrestError } from '@supabase/supabase-js'
import type { 
  TransactionWithCategory,
  TransactionCategory,
  UserUpdate,
} from './types'

export const serverDb = {
  // Server-side transaction operations
  transactions: {
    getAll: async (userId: string): Promise<{ data: TransactionWithCategory[] | null; error: PostgrestError | null }> => {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_categories (*)
        `)
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
      
      return { data, error }
    },

    getById: async (id: string, userId: string): Promise<{ data: TransactionWithCategory | null; error: PostgrestError | null }> => {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_categories (*)
        `)
        .eq('id', id)
        .eq('user_id', userId)
        .single()
      
      return { data, error }
    },

    getByDateRange: async (userId: string, startDate: string, endDate: string): Promise<{ data: TransactionWithCategory[] | null; error: PostgrestError | null }> => {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_categories (*)
        `)
        .eq('user_id', userId)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false })
      
      return { data, error }
    },
  },
  
  // Server-side category operations
  categories: {
    getAll: async (userId: string): Promise<{ data: TransactionCategory[] | null; error: PostgrestError | null }> => {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .eq('user_id', userId)
        .order('name')
      
      return { data, error }
    },

    getById: async (id: string, userId: string): Promise<{ data: TransactionCategory | null; error: PostgrestError | null }> => {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()
      
      return { data, error }
    },
  },

  // Server-side user operations
  users: {
    getProfile: async (userId: string) => {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      return { data, error }
    },

    updateProfile: async (userId: string, updates: UserUpdate) => {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()
      
      return { data, error }
    },
  },
}
