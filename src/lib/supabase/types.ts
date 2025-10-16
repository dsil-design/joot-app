export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      currency_configuration: {
        Row: {
          created_at: string | null
          currency_code: string
          currency_symbol: string | null
          decimal_places: number | null
          display_name: string
          id: string
          is_crypto: boolean | null
          is_tracked: boolean | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency_code: string
          currency_symbol?: string | null
          decimal_places?: number | null
          display_name: string
          id?: string
          is_crypto?: boolean | null
          is_tracked?: boolean | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency_code?: string
          currency_symbol?: string | null
          decimal_places?: number | null
          display_name?: string
          id?: string
          is_crypto?: boolean | null
          is_tracked?: boolean | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          created_at: string | null
          date: string
          from_currency: Database["public"]["Enums"]["currency_type"]
          id: string
          interpolated_from_date: string | null
          is_interpolated: boolean | null
          rate: number
          source: string | null
          to_currency: Database["public"]["Enums"]["currency_type"]
        }
        Insert: {
          created_at?: string | null
          date?: string
          from_currency: Database["public"]["Enums"]["currency_type"]
          id?: string
          interpolated_from_date?: string | null
          is_interpolated?: boolean | null
          rate: number
          source?: string | null
          to_currency: Database["public"]["Enums"]["currency_type"]
        }
        Update: {
          created_at?: string | null
          date?: string
          from_currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          interpolated_from_date?: string | null
          is_interpolated?: boolean | null
          rate?: number
          source?: string | null
          to_currency?: Database["public"]["Enums"]["currency_type"]
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_changes: {
        Row: {
          change_type: string
          created_at: string | null
          exchange_rate_id: string | null
          from_currency: string
          id: string
          new_rate: number | null
          old_rate: number | null
          rate_date: string
          sync_history_id: string | null
          to_currency: string
        }
        Insert: {
          change_type: string
          created_at?: string | null
          exchange_rate_id?: string | null
          from_currency: string
          id?: string
          new_rate?: number | null
          old_rate?: number | null
          rate_date: string
          sync_history_id?: string | null
          to_currency: string
        }
        Update: {
          change_type?: string
          created_at?: string | null
          exchange_rate_id?: string | null
          from_currency?: string
          id?: string
          new_rate?: number | null
          old_rate?: number | null
          rate_date?: string
          sync_history_id?: string | null
          to_currency?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_changes_exchange_rate_id_fkey"
            columns: ["exchange_rate_id"]
            isOneToOne: false
            referencedRelation: "exchange_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_changes_sync_history_id_fkey"
            columns: ["sync_history_id"]
            isOneToOne: false
            referencedRelation: "sync_history"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_configuration: {
        Row: {
          auto_sync_enabled: boolean | null
          created_at: string | null
          id: string
          last_modified_by: string | null
          max_retries: number | null
          retry_delay_seconds: number | null
          start_date: string
          sync_time: string | null
          updated_at: string | null
        }
        Insert: {
          auto_sync_enabled?: boolean | null
          created_at?: string | null
          id?: string
          last_modified_by?: string | null
          max_retries?: number | null
          retry_delay_seconds?: number | null
          start_date?: string
          sync_time?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_sync_enabled?: boolean | null
          created_at?: string | null
          id?: string
          last_modified_by?: string | null
          max_retries?: number | null
          retry_delay_seconds?: number | null
          start_date?: string
          sync_time?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_history: {
        Row: {
          completed_at: string | null
          created_at: string | null
          currencies_tracked: string[] | null
          database_time_ms: number | null
          duration_ms: number | null
          end_date: string | null
          error_details: Json | null
          error_message: string | null
          filtered_rates: number | null
          id: string
          new_rates_inserted: number | null
          processing_time_ms: number | null
          rates_deleted: number | null
          rates_unchanged: number | null
          rates_updated: number | null
          retry_count: number | null
          retry_of: string | null
          start_date: string | null
          started_at: string
          status: string
          sync_type: string
          total_rates_in_xml: number | null
          triggered_by: string | null
          xml_download_time_ms: number | null
          xml_file_size_bytes: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          currencies_tracked?: string[] | null
          database_time_ms?: number | null
          duration_ms?: number | null
          end_date?: string | null
          error_details?: Json | null
          error_message?: string | null
          filtered_rates?: number | null
          id?: string
          new_rates_inserted?: number | null
          processing_time_ms?: number | null
          rates_deleted?: number | null
          rates_unchanged?: number | null
          rates_updated?: number | null
          retry_count?: number | null
          retry_of?: string | null
          start_date?: string | null
          started_at?: string
          status: string
          sync_type: string
          total_rates_in_xml?: number | null
          triggered_by?: string | null
          xml_download_time_ms?: number | null
          xml_file_size_bytes?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          currencies_tracked?: string[] | null
          database_time_ms?: number | null
          duration_ms?: number | null
          end_date?: string | null
          error_details?: Json | null
          error_message?: string | null
          filtered_rates?: number | null
          id?: string
          new_rates_inserted?: number | null
          processing_time_ms?: number | null
          rates_deleted?: number | null
          rates_unchanged?: number | null
          rates_updated?: number | null
          retry_count?: number | null
          retry_of?: string | null
          start_date?: string | null
          started_at?: string
          status?: string
          sync_type?: string
          total_rates_in_xml?: number | null
          triggered_by?: string | null
          xml_download_time_ms?: number | null
          xml_file_size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_history_retry_of_fkey"
            columns: ["retry_of"]
            isOneToOne: false
            referencedRelation: "sync_history"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          details: Json | null
          id: string
          log_level: string
          message: string
          phase: string
          sync_history_id: string | null
          timestamp: string | null
        }
        Insert: {
          details?: Json | null
          id?: string
          log_level: string
          message: string
          phase: string
          sync_history_id?: string | null
          timestamp?: string | null
        }
        Update: {
          details?: Json | null
          id?: string
          log_level?: string
          message?: string
          phase?: string
          sync_history_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_sync_history_id_fkey"
            columns: ["sync_history_id"]
            isOneToOne: false
            referencedRelation: "sync_history"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_tags: {
        Row: {
          created_at: string | null
          id: string
          tag_id: string
          transaction_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag_id: string
          transaction_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tag_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          original_currency: Database["public"]["Enums"]["currency_type"]
          payment_method_id: string | null
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          original_currency: Database["public"]["Enums"]["currency_type"]
          payment_method_id?: string | null
          transaction_date?: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          original_currency?: Database["public"]["Enums"]["currency_type"]
          payment_method_id?: string | null
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vendors: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      available_currency_pairs: {
        Row: {
          from_currency: string | null
          from_display_name: string | null
          to_currency: string | null
          to_display_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_exchange_rate_with_fallback: {
        Args: {
          p_date: string
          p_from_currency: Database["public"]["Enums"]["currency_type"]
          p_max_days_back?: number
          p_to_currency: Database["public"]["Enums"]["currency_type"]
        }
        Returns: {
          actual_date: string
          is_interpolated: boolean
          rate: number
          source: string
        }[]
      }
      get_latest_sync_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          completed_at: string
          duration_ms: number
          error_message: string
          id: string
          new_rates_inserted: number
          rates_deleted: number
          rates_unchanged: number
          rates_updated: number
          started_at: string
          status: string
          sync_type: string
        }[]
      }
      get_next_tag_color: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_sync_configuration: {
        Args: Record<PropertyKey, never>
        Returns: {
          auto_sync_enabled: boolean
          max_retries: number
          retry_delay_seconds: number
          start_date: string
          sync_time: string
          tracked_currencies: string[]
        }[]
      }
      get_sync_statistics: {
        Args: { p_days?: number }
        Returns: {
          average_duration_ms: number
          failed_syncs: number
          last_failed_sync: string
          last_successful_sync: string
          successful_syncs: number
          total_rates_inserted: number
          total_rates_updated: number
          total_syncs: number
        }[]
      }
      get_tracked_currencies: {
        Args: Record<PropertyKey, never>
        Returns: {
          currency_code: string
          currency_symbol: string
          display_name: string
          is_crypto: boolean
          source: string
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_sync_configuration: {
        Args: {
          p_auto_sync_enabled?: boolean
          p_start_date?: string
          p_sync_time?: string
          p_user_id?: string
        }
        Returns: boolean
      }
      update_tracked_currencies: {
        Args: { p_currencies: string[] }
        Returns: {
          message: string
          removed_rates: number
          success: boolean
        }[]
      }
    }
    Enums: {
      currency_type:
        | "USD"
        | "THB"
        | "EUR"
        | "GBP"
        | "SGD"
        | "VND"
        | "MYR"
        | "BTC"
        | "JPY"
        | "CHF"
        | "CAD"
        | "AUD"
        | "NZD"
        | "SEK"
        | "NOK"
        | "DKK"
        | "PLN"
        | "CZK"
        | "HUF"
        | "BGN"
        | "RON"
        | "ISK"
        | "TRY"
        | "RUB"
        | "HRK"
        | "CNY"
        | "INR"
        | "KRW"
        | "BRL"
        | "ZAR"
        | "MXN"
        | "ILS"
        | "HKD"
        | "PHP"
        | "IDR"
      transaction_type: "income" | "expense"
      user_role: "user" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      currency_type: [
        "USD",
        "THB",
        "EUR",
        "GBP",
        "SGD",
        "VND",
        "MYR",
        "BTC",
        "JPY",
        "CHF",
        "CAD",
        "AUD",
        "NZD",
        "SEK",
        "NOK",
        "DKK",
        "PLN",
        "CZK",
        "HUF",
        "BGN",
        "RON",
        "ISK",
        "TRY",
        "RUB",
        "HRK",
        "CNY",
        "INR",
        "KRW",
        "BRL",
        "ZAR",
        "MXN",
        "ILS",
        "HKD",
        "PHP",
        "IDR",
      ],
      transaction_type: ["income", "expense"],
      user_role: ["user", "admin"],
    },
  },
} as const

// Convenience type aliases
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export type Vendor = Database['public']['Tables']['vendors']['Row']
export type VendorInsert = Database['public']['Tables']['vendors']['Insert']
export type VendorUpdate = Database['public']['Tables']['vendors']['Update']

export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']
export type PaymentMethodInsert = Database['public']['Tables']['payment_methods']['Insert']
export type PaymentMethodUpdate = Database['public']['Tables']['payment_methods']['Update']

export type ExchangeRate = Database['public']['Tables']['exchange_rates']['Row']
export type ExchangeRateInsert = Database['public']['Tables']['exchange_rates']['Insert']
export type ExchangeRateUpdate = Database['public']['Tables']['exchange_rates']['Update']

export type Tag = Database['public']['Tables']['tags']['Row']
export type TagInsert = Database['public']['Tables']['tags']['Insert']
export type TagUpdate = Database['public']['Tables']['tags']['Update']

export type TransactionTag = Database['public']['Tables']['transaction_tags']['Row']
export type TransactionTagInsert = Database['public']['Tables']['transaction_tags']['Insert']
export type TransactionTagUpdate = Database['public']['Tables']['transaction_tags']['Update']

export type CurrencyType = Database['public']['Enums']['currency_type']
export type TransactionType = Database['public']['Enums']['transaction_type']
export type UserRole = Database['public']['Enums']['user_role']

// Extended types with relationships
export type TransactionWithVendorAndPayment = Transaction & {
  vendors: {
    id: string
    name: string
  } | null
  payment_methods: {
    id: string
    name: string
  } | null
  tags?: {
    id: string
    name: string
    color: string
  }[]
}
