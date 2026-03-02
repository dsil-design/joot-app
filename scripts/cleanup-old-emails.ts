#!/usr/bin/env npx tsx
/**
 * Cleanup Old Emails Script
 *
 * Deletes emails (and their email_transactions) that pre-date the user's
 * earliest transaction. These are irrelevant to the app and waste storage.
 *
 * Usage:
 *   npx tsx scripts/cleanup-old-emails.ts [--dry-run]
 *
 * Options:
 *   --dry-run   Show what would be deleted without actually deleting
 */

import 'dotenv/config';
import { createServiceRoleClient } from '../src/lib/supabase/server';
import {
  getEarliestTransactionDate,
  countEmailsBeforeCutoff,
  deleteEmailsBeforeCutoff,
} from '../src/lib/email/date-cutoff';

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log('=== Email Cleanup Script ===');
  if (isDryRun) {
    console.log('(DRY RUN — no deletions will be made)\n');
  }

  const supabase = createServiceRoleClient();

  // Get the user (single-user app — get first user)
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error('No users found:', userError?.message);
    process.exit(1);
  }

  const user = users[0];
  console.log(`User: ${user.email} (${user.id})`);

  // Get earliest transaction date
  const cutoffDate = await getEarliestTransactionDate(user.id);
  if (!cutoffDate) {
    console.log('No transactions found — cannot determine cutoff date.');
    process.exit(0);
  }

  console.log(`Earliest transaction: ${cutoffDate.toISOString().split('T')[0]}`);
  console.log(`Cutoff: deleting all emails before this date\n`);

  // Count what would be affected
  const counts = await countEmailsBeforeCutoff(user.id, cutoffDate);
  console.log(`Emails before cutoff: ${counts.emailCount}`);
  console.log(`Email transactions before cutoff: ${counts.emailTransactionCount}`);

  if (counts.emailCount === 0 && counts.emailTransactionCount === 0) {
    console.log('\nNothing to clean up.');
    process.exit(0);
  }

  if (isDryRun) {
    console.log('\nDry run complete. Run without --dry-run to delete.');
    process.exit(0);
  }

  // Perform deletion
  console.log('\nDeleting...');
  const result = await deleteEmailsBeforeCutoff(user.id, cutoffDate);
  console.log(`Deleted ${result.deletedEmailTransactions} email_transactions`);
  console.log(`Deleted ${result.deletedEmails} emails`);
  console.log('\nCleanup complete.');
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
