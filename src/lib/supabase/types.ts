export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      exchange_rates: {
        Row: {
          id: string
          from_currency: Database["public"]["Enums"]["currency_type"]
          to_currency: Database["public"]["Enums"]["currency_type"]
          rate: number
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          from_currency: Database["public"]["Enums"]["currency_type"]
          to_currency: Database["public"]["Enums"]["currency_type"]
          rate: number
          date?: string
          created_at?: string
        }
        Update: {
          id?: string
          from_currency?: Database["public"]["Enums"]["currency_type"]
          to_currency?: Database["public"]["Enums"]["currency_type"]
          rate?: number
          date?: string
          created_at?: string
        }
        Relationships: []
      }
      transaction_categories: {
        Row: {
          id: string
          name: string
          color: string
          icon: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          icon?: string
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          icon?: string
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          title: string
          description: string | null
          amount_usd: number
          amount_thb: number
          exchange_rate: number
          original_currency: Database["public"]["Enums"]["currency_type"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          transaction_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          title: string
          description?: string | null
          amount_usd: number
          amount_thb: number
          exchange_rate: number
          original_currency: Database["public"]["Enums"]["currency_type"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          transaction_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          title?: string
          description?: string | null
          amount_usd?: number
          amount_thb?: number
          exchange_rate?: number
          original_currency?: Database["public"]["Enums"]["currency_type"]
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          transaction_date?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          preferred_currency: Database["public"]["Enums"]["currency_type"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          preferred_currency?: Database["public"]["Enums"]["currency_type"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          preferred_currency?: Database["public"]["Enums"]["currency_type"]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      currency_type: "USD" | "THB"
      transaction_type: "income" | "expense"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience types for easier usage
export type User = Database["public"]["Tables"]["users"]["Row"]
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"]
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"]

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"]
export type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"]
export type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"]

export type TransactionCategory = Database["public"]["Tables"]["transaction_categories"]["Row"]
export type TransactionCategoryInsert = Database["public"]["Tables"]["transaction_categories"]["Insert"]
export type TransactionCategoryUpdate = Database["public"]["Tables"]["transaction_categories"]["Update"]

export type ExchangeRate = Database["public"]["Tables"]["exchange_rates"]["Row"]
export type ExchangeRateInsert = Database["public"]["Tables"]["exchange_rates"]["Insert"]
export type ExchangeRateUpdate = Database["public"]["Tables"]["exchange_rates"]["Update"]

export type CurrencyType = Database["public"]["Enums"]["currency_type"]
export type TransactionType = Database["public"]["Enums"]["transaction_type"]

// Extended types with relationships
export type TransactionWithCategory = Transaction & {
  transaction_categories: TransactionCategory | null
}

export type TransactionWithDetails = Transaction & {
  transaction_categories: TransactionCategory | null
  users: Pick<User, 'id' | 'email' | 'full_name'>
}
