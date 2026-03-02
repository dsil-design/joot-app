/**
 * Email Date Cutoff Utilities
 *
 * Provides functions to determine the earliest relevant date for email processing
 * and to clean up emails that pre-date the user's transaction history.
 *
 * ~14,400 old emails pre-date the earliest Joot transaction — this module
 * helps filter them during sync and clean them up from storage.
 */

import { createServiceRoleClient } from '../supabase/server';

/**
 * Get the earliest transaction date for a user.
 * Returns null if no transactions exist.
 */
export async function getEarliestTransactionDate(userId: string): Promise<Date | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('transactions')
    .select('transaction_date')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return new Date(data.transaction_date);
}

/**
 * Count emails before a cutoff date for a user.
 */
export async function countEmailsBeforeCutoff(
  userId: string,
  cutoffDate: Date
): Promise<{ emailCount: number; emailTransactionCount: number }> {
  const supabase = createServiceRoleClient();
  const cutoffStr = cutoffDate.toISOString();

  const { count: emailCount } = await supabase
    .from('emails')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lt('date', cutoffStr);

  const { count: emailTransactionCount } = await supabase
    .from('email_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lt('email_date', cutoffStr);

  return {
    emailCount: emailCount || 0,
    emailTransactionCount: emailTransactionCount || 0,
  };
}

/**
 * Delete emails and their associated email_transactions before a cutoff date.
 * Deletes email_transactions first (FK dependency), then emails.
 *
 * Returns the count of deleted records.
 */
export async function deleteEmailsBeforeCutoff(
  userId: string,
  cutoffDate: Date
): Promise<{ deletedEmails: number; deletedEmailTransactions: number }> {
  const supabase = createServiceRoleClient();
  const cutoffStr = cutoffDate.toISOString();

  // Delete email_transactions first (references emails via message_id)
  const { data: deletedTx } = await supabase
    .from('email_transactions')
    .delete()
    .eq('user_id', userId)
    .lt('email_date', cutoffStr)
    .select('id');

  // Delete emails
  const { data: deletedEmails } = await supabase
    .from('emails')
    .delete()
    .eq('user_id', userId)
    .lt('date', cutoffStr)
    .select('id');

  return {
    deletedEmails: deletedEmails?.length || 0,
    deletedEmailTransactions: deletedTx?.length || 0,
  };
}
