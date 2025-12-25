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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      document_extractions: {
        Row: {
          amount: number | null
          category: string | null
          confidence_score: number | null
          created_at: string | null
          currency: string | null
          document_id: string
          extraction_confidence: number | null
          id: string
          merchant_name: string | null
          merchant_name_normalized: string | null
          metadata: Json | null
          notes: string | null
          ocr_confidence: number | null
          raw_text: string | null
          transaction_date: string | null
          updated_at: string | null
          user_id: string | null
          vendor_name: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          currency?: string | null
          document_id: string
          extraction_confidence?: number | null
          id?: string
          merchant_name?: string | null
          merchant_name_normalized?: string | null
          metadata?: Json | null
          notes?: string | null
          ocr_confidence?: number | null
          raw_text?: string | null
          transaction_date?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          currency?: string | null
          document_id?: string
          extraction_confidence?: number | null
          id?: string
          merchant_name?: string | null
          merchant_name_normalized?: string | null
          metadata?: Json | null
          notes?: string | null
          ocr_confidence?: number | null
          raw_text?: string | null
          transaction_date?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          classification_confidence: number | null
          created_at: string | null
          document_type: string | null
          file_name: string
          file_size_bytes: number
          file_type: string
          file_url: string
          id: string
          is_multi_transaction: boolean | null
          mime_type: string | null
          ocr_confidence: number | null
          processing_error: string | null
          processing_status: string
          storage_path: string | null
          thumbnail_path: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          classification_confidence?: number | null
          created_at?: string | null
          document_type?: string | null
          file_name: string
          file_size_bytes: number
          file_type: string
          file_url: string
          id?: string
          is_multi_transaction?: boolean | null
          mime_type?: string | null
          ocr_confidence?: number | null
          processing_error?: string | null
          processing_status?: string
          storage_path?: string | null
          thumbnail_path?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          classification_confidence?: number | null
          created_at?: string | null
          document_type?: string | null
          file_name?: string
          file_size_bytes?: number
          file_type?: string
          file_url?: string
          id?: string
          is_multi_transaction?: boolean | null
          mime_type?: string | null
          ocr_confidence?: number | null
          processing_error?: string | null
          processing_status?: string
          storage_path?: string | null
          thumbnail_path?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_accounts: {
        Row: {
          connection_status: string
          created_at: string
          email_address: string
          encryption_iv: string
          folder_config: Json | null
          id: string
          imap_host: string
          imap_password_encrypted: string
          imap_port: number
          last_connection_test_at: string | null
          last_sync_at: string | null
          metadata: Json | null
          monitored_folders: string[] | null
          provider: string
          selected_folder_name: string | null
          sync_enabled: boolean
          total_emails_synced: number
          total_receipts_found: number
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_status?: string
          created_at?: string
          email_address: string
          encryption_iv: string
          folder_config?: Json | null
          id?: string
          imap_host: string
          imap_password_encrypted: string
          imap_port?: number
          last_connection_test_at?: string | null
          last_sync_at?: string | null
          metadata?: Json | null
          monitored_folders?: string[] | null
          provider: string
          selected_folder_name?: string | null
          sync_enabled?: boolean
          total_emails_synced?: number
          total_receipts_found?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_status?: string
          created_at?: string
          email_address?: string
          encryption_iv?: string
          folder_config?: Json | null
          id?: string
          imap_host?: string
          imap_password_encrypted?: string
          imap_port?: number
          last_connection_test_at?: string | null
          last_sync_at?: string | null
          metadata?: Json | null
          monitored_folders?: string[] | null
          provider?: string
          selected_folder_name?: string | null
          sync_enabled?: boolean
          total_emails_synced?: number
          total_receipts_found?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_actions_log: {
        Row: {
          action_data: Json | null
          action_type: string
          email_message_id: string | null
          id: string
          ip_address: unknown
          performed_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          email_message_id?: string | null
          id?: string
          ip_address?: unknown
          performed_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          email_message_id?: string | null
          id?: string
          ip_address?: unknown
          performed_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_actions_log_email_message_id_fkey"
            columns: ["email_message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_actions_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          amount_extracted: number | null
          attachment_count: number
          created_at: string
          currency_extracted: string | null
          detection_score: number | null
          email_account_id: string
          email_hash: string
          extracted_amount: number | null
          extracted_at: string | null
          extracted_currency: string | null
          extracted_date: string | null
          extracted_vendor: string | null
          extraction_confidence: number | null
          extraction_error: string | null
          extraction_metadata: Json | null
          extraction_status: string | null
          has_attachments: boolean
          html_content_path: string | null
          id: string
          is_receipt_candidate: boolean
          match_alternatives: Json | null
          match_confidence: number | null
          match_reasons: Json | null
          match_status: string
          matched_transaction_id: string | null
          message_uid: string
          processing_error: string | null
          processing_status: string
          raw_text_content: string | null
          received_date: string
          sender_domain: string
          sender_email: string
          sender_name: string | null
          storage_path: string
          subject: string
          transaction_date_extracted: string | null
          updated_at: string
          user_id: string
          vendor_name_extracted: string | null
          vendor_name_normalized: string | null
        }
        Insert: {
          amount_extracted?: number | null
          attachment_count?: number
          created_at?: string
          currency_extracted?: string | null
          detection_score?: number | null
          email_account_id: string
          email_hash: string
          extracted_amount?: number | null
          extracted_at?: string | null
          extracted_currency?: string | null
          extracted_date?: string | null
          extracted_vendor?: string | null
          extraction_confidence?: number | null
          extraction_error?: string | null
          extraction_metadata?: Json | null
          extraction_status?: string | null
          has_attachments?: boolean
          html_content_path?: string | null
          id?: string
          is_receipt_candidate?: boolean
          match_alternatives?: Json | null
          match_confidence?: number | null
          match_reasons?: Json | null
          match_status?: string
          matched_transaction_id?: string | null
          message_uid: string
          processing_error?: string | null
          processing_status?: string
          raw_text_content?: string | null
          received_date: string
          sender_domain: string
          sender_email: string
          sender_name?: string | null
          storage_path: string
          subject: string
          transaction_date_extracted?: string | null
          updated_at?: string
          user_id: string
          vendor_name_extracted?: string | null
          vendor_name_normalized?: string | null
        }
        Update: {
          amount_extracted?: number | null
          attachment_count?: number
          created_at?: string
          currency_extracted?: string | null
          detection_score?: number | null
          email_account_id?: string
          email_hash?: string
          extracted_amount?: number | null
          extracted_at?: string | null
          extracted_currency?: string | null
          extracted_date?: string | null
          extracted_vendor?: string | null
          extraction_confidence?: number | null
          extraction_error?: string | null
          extraction_metadata?: Json | null
          extraction_status?: string | null
          has_attachments?: boolean
          html_content_path?: string | null
          id?: string
          is_receipt_candidate?: boolean
          match_alternatives?: Json | null
          match_confidence?: number | null
          match_reasons?: Json | null
          match_status?: string
          matched_transaction_id?: string | null
          message_uid?: string
          processing_error?: string | null
          processing_status?: string
          raw_text_content?: string | null
          received_date?: string
          sender_domain?: string
          sender_email?: string
          sender_name?: string | null
          storage_path?: string
          subject?: string
          transaction_date_extracted?: string | null
          updated_at?: string
          user_id?: string
          vendor_name_extracted?: string | null
          vendor_name_normalized?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sync_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          email_account_id: string
          emails_indexed: number
          emails_skipped: number
          end_uid: string | null
          error_details: Json | null
          error_message: string | null
          folder_name: string
          id: string
          job_status: string
          pg_boss_job_id: string | null
          progress_current: number
          progress_percentage: number | null
          progress_total: number | null
          receipts_detected: number
          retry_count: number
          start_uid: string | null
          started_at: string | null
          sync_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          email_account_id: string
          emails_indexed?: number
          emails_skipped?: number
          end_uid?: string | null
          error_details?: Json | null
          error_message?: string | null
          folder_name: string
          id?: string
          job_status?: string
          pg_boss_job_id?: string | null
          progress_current?: number
          progress_percentage?: number | null
          progress_total?: number | null
          receipts_detected?: number
          retry_count?: number
          start_uid?: string | null
          started_at?: string | null
          sync_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          email_account_id?: string
          emails_indexed?: number
          emails_skipped?: number
          end_uid?: string | null
          error_details?: Json | null
          error_message?: string | null
          folder_name?: string
          id?: string
          job_status?: string
          pg_boss_job_id?: string | null
          progress_current?: number
          progress_percentage?: number | null
          progress_total?: number | null
          receipts_detected?: number
          retry_count?: number
          start_uid?: string | null
          started_at?: string | null
          sync_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sync_jobs_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sync_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      expected_transaction_tags: {
        Row: {
          created_at: string | null
          expected_transaction_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          expected_transaction_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          expected_transaction_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expected_transaction_tags_expected_transaction_id_fkey"
            columns: ["expected_transaction_id"]
            isOneToOne: false
            referencedRelation: "expected_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_transaction_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      expected_transactions: {
        Row: {
          actual_amount: number | null
          created_at: string | null
          description: string
          expected_amount: number
          expected_date: string
          id: string
          matched_at: string | null
          matched_transaction_id: string | null
          month_plan_id: string
          notes: string | null
          original_currency: Database["public"]["Enums"]["currency_type"]
          payment_method_id: string | null
          status: string
          template_id: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          user_id: string
          variance_amount: number | null
          variance_percentage: number | null
          vendor_id: string | null
        }
        Insert: {
          actual_amount?: number | null
          created_at?: string | null
          description: string
          expected_amount: number
          expected_date: string
          id?: string
          matched_at?: string | null
          matched_transaction_id?: string | null
          month_plan_id: string
          notes?: string | null
          original_currency: Database["public"]["Enums"]["currency_type"]
          payment_method_id?: string | null
          status?: string
          template_id?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id: string
          variance_amount?: number | null
          variance_percentage?: number | null
          vendor_id?: string | null
        }
        Update: {
          actual_amount?: number | null
          created_at?: string | null
          description?: string
          expected_amount?: number
          expected_date?: string
          id?: string
          matched_at?: string | null
          matched_transaction_id?: string | null
          month_plan_id?: string
          notes?: string | null
          original_currency?: Database["public"]["Enums"]["currency_type"]
          payment_method_id?: string | null
          status?: string
          template_id?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id?: string
          variance_amount?: number | null
          variance_percentage?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expected_transactions_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_transactions_month_plan_id_fkey"
            columns: ["month_plan_id"]
            isOneToOne: false
            referencedRelation: "month_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_transactions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "transaction_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      month_plans: {
        Row: {
          closed_at: string | null
          created_at: string | null
          id: string
          month_year: string
          notes: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          id?: string
          month_year: string
          notes?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          id?: string
          month_year?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "month_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string | null
          id: string
          name: string
          preferred_currency: string | null
          sort_order: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          preferred_currency?: string | null
          sort_order: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          preferred_currency?: string | null
          sort_order?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_payment_method_currency"
            columns: ["preferred_currency"]
            isOneToOne: false
            referencedRelation: "available_currency_pairs"
            referencedColumns: ["from_currency"]
          },
          {
            foreignKeyName: "fk_payment_method_currency"
            columns: ["preferred_currency"]
            isOneToOne: false
            referencedRelation: "available_currency_pairs"
            referencedColumns: ["to_currency"]
          },
          {
            foreignKeyName: "fk_payment_method_currency"
            columns: ["preferred_currency"]
            isOneToOne: false
            referencedRelation: "currency_configuration"
            referencedColumns: ["currency_code"]
          },
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_jobs: {
        Row: {
          completed_at: string | null
          document_id: string | null
          error_data: Json | null
          id: string
          job_status: string
          job_type: string
          max_retries: number | null
          pg_boss_job_id: string | null
          queued_at: string | null
          result_data: Json | null
          retry_count: number | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          document_id?: string | null
          error_data?: Json | null
          id?: string
          job_status?: string
          job_type: string
          max_retries?: number | null
          pg_boss_job_id?: string | null
          queued_at?: string | null
          result_data?: Json | null
          retry_count?: number | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          document_id?: string | null
          error_data?: Json | null
          id?: string
          job_status?: string
          job_type?: string
          max_retries?: number | null
          pg_boss_job_id?: string | null
          queued_at?: string | null
          result_data?: Json | null
          retry_count?: number | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_jobs_user_id_fkey"
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
      reconciliation_audit_log: {
        Row: {
          action: string
          created_at: string | null
          document_id: string
          id: string
          metadata: Json | null
          performed_by: string
          queue_item_id: string
          transaction_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          document_id: string
          id?: string
          metadata?: Json | null
          performed_by: string
          queue_item_id: string
          transaction_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          document_id?: string
          id?: string
          metadata?: Json | null
          performed_by?: string
          queue_item_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_audit_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_audit_log_queue_item_id_fkey"
            columns: ["queue_item_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_audit_log_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_queue: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          document_id: string
          id: string
          metadata: Json | null
          priority: string
          queue_status: string | null
          status: string
          suggested_matches: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          document_id: string
          id?: string
          metadata?: Json | null
          priority?: string
          queue_status?: string | null
          status?: string
          suggested_matches?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          document_id?: string
          id?: string
          metadata?: Json | null
          priority?: string
          queue_status?: string | null
          status?: string
          suggested_matches?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_queue_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      statement_metadata: {
        Row: {
          account_number_masked: string | null
          account_type: string | null
          beginning_balance: number | null
          created_at: string | null
          document_id: string
          ending_balance: number | null
          extraction_confidence: number | null
          id: string
          institution_name: string | null
          statement_end_date: string | null
          statement_start_date: string | null
          total_credits: number | null
          total_debits: number | null
          transaction_count: number | null
          updated_at: string | null
          user_id: string
          validation_errors: Json | null
          validation_status: string | null
        }
        Insert: {
          account_number_masked?: string | null
          account_type?: string | null
          beginning_balance?: number | null
          created_at?: string | null
          document_id: string
          ending_balance?: number | null
          extraction_confidence?: number | null
          id?: string
          institution_name?: string | null
          statement_end_date?: string | null
          statement_start_date?: string | null
          total_credits?: number | null
          total_debits?: number | null
          transaction_count?: number | null
          updated_at?: string | null
          user_id: string
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Update: {
          account_number_masked?: string | null
          account_type?: string | null
          beginning_balance?: number | null
          created_at?: string | null
          document_id?: string
          ending_balance?: number | null
          extraction_confidence?: number | null
          id?: string
          institution_name?: string | null
          statement_end_date?: string | null
          statement_start_date?: string | null
          total_credits?: number | null
          total_debits?: number | null
          transaction_count?: number | null
          updated_at?: string | null
          user_id?: string
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "statement_metadata_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_metadata_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      statement_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          description: string
          document_id: string
          id: string
          match_confidence: number | null
          match_metadata: Json | null
          match_status: string | null
          matched_transaction_id: string | null
          reviewed_at: string | null
          running_balance: number | null
          statement_metadata_id: string
          transaction_date: string
          transaction_index: number
          transaction_type: string | null
          updated_at: string | null
          user_action: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          description: string
          document_id: string
          id?: string
          match_confidence?: number | null
          match_metadata?: Json | null
          match_status?: string | null
          matched_transaction_id?: string | null
          reviewed_at?: string | null
          running_balance?: number | null
          statement_metadata_id: string
          transaction_date: string
          transaction_index: number
          transaction_type?: string | null
          updated_at?: string | null
          user_action?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string
          document_id?: string
          id?: string
          match_confidence?: number | null
          match_metadata?: Json | null
          match_status?: string | null
          matched_transaction_id?: string | null
          reviewed_at?: string | null
          running_balance?: number | null
          statement_metadata_id?: string
          transaction_date?: string
          transaction_index?: number
          transaction_type?: string | null
          updated_at?: string | null
          user_action?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "statement_transactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_transactions_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_transactions_statement_metadata_id_fkey"
            columns: ["statement_metadata_id"]
            isOneToOne: false
            referencedRelation: "statement_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      template_tags: {
        Row: {
          created_at: string | null
          id: string
          tag_id: string
          template_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag_id: string
          template_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tag_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_tags_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "transaction_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_document_matches: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          confidence_score: number
          created_at: string | null
          document_id: string
          id: string
          match_confidence: number | null
          match_score_breakdown: Json | null
          match_type: string
          matched_at: string | null
          matched_by: string | null
          metadata: Json | null
          transaction_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          confidence_score: number
          created_at?: string | null
          document_id: string
          id?: string
          match_confidence?: number | null
          match_score_breakdown?: Json | null
          match_type: string
          matched_at?: string | null
          matched_by?: string | null
          metadata?: Json | null
          transaction_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          confidence_score?: number
          created_at?: string | null
          document_id?: string
          id?: string
          match_confidence?: number | null
          match_score_breakdown?: Json | null
          match_type?: string
          matched_at?: string | null
          matched_by?: string | null
          metadata?: Json | null
          transaction_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_document_matches_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_document_matches_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
      transaction_templates: {
        Row: {
          amount: number
          created_at: string | null
          day_of_month: number | null
          day_of_week: number | null
          description: string | null
          end_date: string | null
          frequency: string
          frequency_interval: number | null
          id: string
          is_active: boolean
          name: string
          original_currency: Database["public"]["Enums"]["currency_type"]
          payment_method_id: string | null
          start_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          frequency: string
          frequency_interval?: number | null
          id?: string
          is_active?: boolean
          name: string
          original_currency: Database["public"]["Enums"]["currency_type"]
          payment_method_id?: string | null
          start_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          frequency?: string
          frequency_interval?: number | null
          id?: string
          is_active?: boolean
          name?: string
          original_currency?: Database["public"]["Enums"]["currency_type"]
          payment_method_id?: string | null
          start_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_templates_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_templates_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          expected_transaction_id: string | null
          id: string
          original_currency: Database["public"]["Enums"]["currency_type"]
          payment_method_id: string | null
          source_type: string | null
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
          expected_transaction_id?: string | null
          id?: string
          original_currency: Database["public"]["Enums"]["currency_type"]
          payment_method_id?: string | null
          source_type?: string | null
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
          expected_transaction_id?: string | null
          id?: string
          original_currency?: Database["public"]["Enums"]["currency_type"]
          payment_method_id?: string | null
          source_type?: string | null
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_expected_transaction_id_fkey"
            columns: ["expected_transaction_id"]
            isOneToOne: false
            referencedRelation: "expected_transactions"
            referencedColumns: ["id"]
          },
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
      vendor_duplicate_suggestions: {
        Row: {
          confidence_score: number
          created_at: string | null
          id: string
          reasons: string[] | null
          resolved_at: string | null
          source_vendor_id: string
          status: Database["public"]["Enums"]["duplicate_status"]
          target_vendor_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence_score: number
          created_at?: string | null
          id?: string
          reasons?: string[] | null
          resolved_at?: string | null
          source_vendor_id: string
          status?: Database["public"]["Enums"]["duplicate_status"]
          target_vendor_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number
          created_at?: string | null
          id?: string
          reasons?: string[] | null
          resolved_at?: string | null
          source_vendor_id?: string
          status?: Database["public"]["Enums"]["duplicate_status"]
          target_vendor_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_duplicate_suggestions_source_vendor_id_fkey"
            columns: ["source_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_duplicate_suggestions_target_vendor_id_fkey"
            columns: ["target_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_duplicate_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_enrichment_jobs: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          error_message: string | null
          id: string
          job_status: string
          job_type: string
          last_attempt_at: string | null
          updated_at: string | null
          user_id: string
          vendor_id: string
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_status?: string
          job_type?: string
          last_attempt_at?: string | null
          updated_at?: string | null
          user_id: string
          vendor_id: string
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_status?: string
          job_type?: string
          last_attempt_at?: string | null
          updated_at?: string | null
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_enrichment_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_enrichment_jobs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_profiles: {
        Row: {
          category: string | null
          created_at: string | null
          domain: string | null
          id: string
          logo_url: string | null
          metadata: Json | null
          name: string
          normalized_name: string
          transaction_count: number | null
          updated_at: string | null
          user_id: string
          vendor_name: string | null
          vendor_name_normalized: string | null
          website: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name: string
          normalized_name: string
          transaction_count?: number | null
          updated_at?: string | null
          user_id: string
          vendor_name?: string | null
          vendor_name_normalized?: string | null
          website?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          normalized_name?: string
          transaction_count?: number | null
          updated_at?: string | null
          user_id?: string
          vendor_name?: string | null
          vendor_name_normalized?: string | null
          website?: string | null
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
      get_document_storage_path: {
        Args: {
          p_document_id: string
          p_file_extension: string
          p_user_id: string
        }
        Returns: string
      }
      get_email_receipt_stats: {
        Args: { p_user_id: string }
        Returns: {
          average_detection_score: number
          average_match_confidence: number
          last_sync_date: string
          receipts_approved: number
          receipts_matched: number
          receipts_unmatched: number
          total_accounts: number
          total_emails_indexed: number
          total_receipts_detected: number
        }[]
      }
      get_email_reconciliation_queue: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          amount: number
          created_at: string
          currency: string
          email_id: string
          match_confidence: number
          match_reasons: Json
          matched_transaction_id: string
          received_date: string
          sender_email: string
          sender_name: string
          subject: string
          transaction_date: string
          vendor_name: string
        }[]
      }
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
        Args: never
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
      get_next_tag_color: { Args: { p_user_id: string }; Returns: string }
      get_reconciliation_queue: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          amount: number
          created_at: string
          document_id: string
          file_name: string
          merchant_name: string
          priority: number
          queue_id: string
          suggested_matches: Json
          transaction_date: string
        }[]
      }
      get_statement_transactions: {
        Args: { p_document_id: string }
        Returns: {
          amount: number
          description: string
          match_status: string
          matched_transaction_id: string
          running_balance: number
          transaction_date: string
          transaction_id: string
          transaction_index: number
        }[]
      }
      get_sync_configuration: {
        Args: never
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
      get_thumbnail_storage_path: {
        Args: { p_document_id: string; p_user_id: string }
        Returns: string
      }
      get_tracked_currencies: {
        Args: never
        Returns: {
          currency_code: string
          currency_symbol: string
          display_name: string
          is_crypto: boolean
          source: string
        }[]
      }
      get_unmatched_documents: {
        Args: { p_user_id: string }
        Returns: {
          amount: number
          created_at: string
          document_id: string
          file_name: string
          merchant_name: string
          transaction_date: string
        }[]
      }
      get_unmatched_statement_transactions: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          amount: number
          description: string
          document_id: string
          match_confidence: number
          statement_date: string
          suggested_match_id: string
          transaction_id: string
        }[]
      }
      get_vendor_logo_path: {
        Args: { p_file_extension?: string; p_vendor_id: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      update_overdue_expected_transactions: { Args: never; Returns: number }
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
      validate_statement_balances: {
        Args: { p_statement_metadata_id: string }
        Returns: {
          calculated_ending_balance: number
          difference: number
          expected_ending_balance: number
          is_valid: boolean
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
      duplicate_status: "pending" | "ignored" | "merged"
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
  graphql_public: {
    Enums: {},
  },
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
      duplicate_status: ["pending", "ignored", "merged"],
      transaction_type: ["income", "expense"],
      user_role: ["user", "admin"],
    },
  },
} as const
