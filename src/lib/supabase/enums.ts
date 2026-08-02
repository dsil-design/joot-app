/**
 * Runtime guards for the database enums.
 *
 * Enum-typed columns can only be filtered on values the enum actually declares.
 * Values that reach the API as free-form strings — URL search params, LLM tool
 * arguments — have to be checked before they are used in a query; passing an
 * unrecognised one through produces a Postgres error rather than simply
 * matching nothing.
 */

import { Constants } from './database.types'
import type { CurrencyType, TransactionType } from './types'

/** The value if it is a currency this database knows, otherwise null. */
export function asCurrency(value: unknown): CurrencyType | null {
  return typeof value === 'string' &&
    (Constants.public.Enums.currency_type as readonly string[]).includes(value)
    ? (value as CurrencyType)
    : null
}

/** The value if it is a transaction type this database knows, otherwise null. */
export function asTransactionType(value: unknown): TransactionType | null {
  return typeof value === 'string' &&
    (Constants.public.Enums.transaction_type as readonly string[]).includes(value)
    ? (value as TransactionType)
    : null
}
