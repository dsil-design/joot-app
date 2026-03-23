/**
 * Payment Direction Detector
 *
 * Determines whether a payment slip represents an expense or income
 * by comparing sender/recipient against the user's known bank accounts.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { PaymentSlipExtraction, UserBankAccount } from './types'

export interface DirectionResult {
  direction: 'expense' | 'income' | null
  confidence: 'matched' | 'inferred'
  matchedAccount: UserBankAccount | null
  paymentMethodId: string | null
}

/**
 * Normalize a name for comparison: lowercase, strip titles, collapse whitespace.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|miss|น\.ส\.|นาย|นาง|นางสาว)\b\.?\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalize an account identifier for comparison.
 * Strip dashes and x-masking patterns, keep only the visible digits.
 */
function normalizeAccount(account: string): string {
  return account.replace(/[-\s]/g, '').toLowerCase()
}

/**
 * Check if two account identifiers match (handling masked numbers).
 * Matches if the visible digit suffix is the same.
 */
function accountsMatch(slipAccount: string, knownAccount: string): boolean {
  const a = normalizeAccount(slipAccount)
  const b = normalizeAccount(knownAccount)
  if (a === b) return true

  // Extract visible digits (non-x characters)
  const aDigits = a.replace(/x/g, '')
  const bDigits = b.replace(/x/g, '')

  // If both have at least 3 visible digits, check if one ends with the other
  if (aDigits.length >= 3 && bDigits.length >= 3) {
    return aDigits.endsWith(bDigits) || bDigits.endsWith(aDigits)
  }

  return false
}

/**
 * Detect whether the payment slip is an expense or income for the user.
 */
export async function detectDirection(
  supabase: SupabaseClient,
  userId: string,
  extraction: PaymentSlipExtraction
): Promise<DirectionResult> {
  // Fetch user's known bank accounts
  const { data: accounts } = await supabase
    .from('user_bank_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!accounts || accounts.length === 0) {
    // No known accounts — can't determine direction
    return { direction: null, confidence: 'inferred', matchedAccount: null, paymentMethodId: null }
  }

  // Check if sender matches any known account (user sent money = expense)
  for (const account of accounts) {
    const nameMatch = extraction.sender_name &&
      normalizeName(extraction.sender_name).includes(normalizeName(account.account_holder_name || ''))

    const accountMatch = extraction.sender_account &&
      accountsMatch(extraction.sender_account, account.account_identifier)

    if (nameMatch || accountMatch) {
      const acct = account as UserBankAccount
      return { direction: 'expense', confidence: 'matched', matchedAccount: acct, paymentMethodId: acct.payment_method_id }
    }
  }

  // Check if recipient matches any known account (user received money = income)
  for (const account of accounts) {
    const nameMatch = extraction.recipient_name &&
      normalizeName(extraction.recipient_name).includes(normalizeName(account.account_holder_name || ''))

    const accountMatch = extraction.recipient_account &&
      accountsMatch(extraction.recipient_account, account.account_identifier)

    if (nameMatch || accountMatch) {
      const acct = account as UserBankAccount
      return { direction: 'income', confidence: 'matched', matchedAccount: acct, paymentMethodId: acct.payment_method_id }
    }
  }

  // No match found
  return { direction: null, confidence: 'inferred', matchedAccount: null, paymentMethodId: null }
}

/**
 * Save a newly discovered bank account for future direction detection.
 */
export async function learnBankAccount(
  supabase: SupabaseClient,
  userId: string,
  bankName: string,
  accountIdentifier: string,
  accountHolderName: string | null
): Promise<void> {
  await supabase
    .from('user_bank_accounts')
    .upsert(
      {
        user_id: userId,
        bank_name: bankName,
        account_identifier: accountIdentifier,
        account_holder_name: accountHolderName,
        is_active: true,
      },
      { onConflict: 'user_id,bank_name,account_identifier' }
    )
}
