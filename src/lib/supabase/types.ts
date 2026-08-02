/**
 * Supabase types for the app.
 *
 * `database.types.ts` next to this file is generated and overwritten wholesale:
 *
 *   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 *
 * The convenience aliases below used to live in that file and were lost the
 * next time it was regenerated, which is why ~20 modules were importing names
 * that no longer existed. They live here instead, and this file re-exports the
 * generated types so `@/lib/supabase/types` stays the single import site.
 *
 * Nothing here should be generated — add table/enum changes by regenerating
 * `database.types.ts`, and only hand-write derived aliases in this file.
 */

export * from './database.types'

import type { Database, Tables, TablesInsert, TablesUpdate } from './database.types'

// ── Enums ────────────────────────────────────────────────────────────────
export type CurrencyType = Database['public']['Enums']['currency_type']
export type TransactionType = Database['public']['Enums']['transaction_type']

// ── Row aliases ──────────────────────────────────────────────────────────
export type Transaction = Tables<'transactions'>
export type TransactionInsert = TablesInsert<'transactions'>
export type TransactionUpdate = TablesUpdate<'transactions'>

export type ExchangeRate = Tables<'exchange_rates'>
export type ExchangeRateInsert = TablesInsert<'exchange_rates'>

export type PaymentMethod = Tables<'payment_methods'>
export type PaymentMethodInsert = TablesInsert<'payment_methods'>

export type Vendor = Tables<'vendors'>
export type VendorInsert = TablesInsert<'vendors'>

export type Tag = Tables<'tags'>
export type TagInsert = TablesInsert<'tags'>

export type User = Tables<'users'>
export type UserUpdate = TablesUpdate<'users'>

// ── Joined shapes ────────────────────────────────────────────────────────

/**
 * A transaction with its vendor and payment method joined in. `payment_method`
 * is the flattened name some callers project alongside the joined row.
 */
export type TransactionWithVendorAndPayment = Tables<'transactions'> & {
  vendors?: Tables<'vendors'> | null
  payment_methods?: Tables<'payment_methods'> | null
  payment_method?: string
}

/**
 * The email a transaction was imported from, as shown on the detail page.
 * Shape per docs/transaction-source-references-spec.md.
 */
export interface EmailSourceData {
  id: string
  subject: string | null
  from_address: string | null
  from_name: string | null
  email_date: string | null
  extraction_confidence: number | null
  match_confidence: number | null
  match_method: string | null
  status: string
}

/**
 * The statement a transaction was matched against, as shown on the detail page.
 * Shape per docs/transaction-source-references-spec.md.
 */
export interface StatementSourceData {
  id: string
  filename: string
  statement_period_start: string | null
  statement_period_end: string | null
  payment_method_name: string | null
  match_confidence: number | null
  match_method: string | null
}
