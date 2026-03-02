#!/usr/bin/env npx tsx
/**
 * Reprocess All Emails Script
 *
 * After deploying pipeline changes (iCloud relay fix, new parsers, pattern fixes),
 * this script re-runs extraction on all emails to populate email_transactions
 * with accurate data.
 *
 * Usage:
 *   npx tsx scripts/reprocess-all-emails.ts [--cleanup-first] [--dry-run]
 *
 * Options:
 *   --cleanup-first  Run date cutoff cleanup before reprocessing
 *   --dry-run        Show what would happen without making changes
 */

import 'dotenv/config';
import { createServiceRoleClient } from '../src/lib/supabase/server';
import { extractionService } from '../src/lib/email/extraction-service';
import { normalizeICloudRelay } from '../src/lib/email/icloud-relay';
import {
  getEarliestTransactionDate,
  countEmailsBeforeCutoff,
  deleteEmailsBeforeCutoff,
} from '../src/lib/email/date-cutoff';
import type { RawEmailData } from '../src/lib/email/types';

const isDryRun = process.argv.includes('--dry-run');
const cleanupFirst = process.argv.includes('--cleanup-first');

async function main() {
  console.log('=== Email Reprocessing Script ===');
  if (isDryRun) console.log('(DRY RUN — no changes will be made)\n');

  const supabase = createServiceRoleClient();

  // Get the user
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .limit(1);

  if (userError || !users?.length) {
    console.error('No users found:', userError?.message);
    process.exit(1);
  }

  const user = users[0];
  console.log(`User: ${user.email} (${user.id})\n`);

  // Optional: cleanup old emails first
  if (cleanupFirst) {
    console.log('--- Step 1: Date Cutoff Cleanup ---');
    const cutoffDate = await getEarliestTransactionDate(user.id);
    if (cutoffDate) {
      const counts = await countEmailsBeforeCutoff(user.id, cutoffDate);
      console.log(`Cutoff: ${cutoffDate.toISOString().split('T')[0]}`);
      console.log(`Emails to delete: ${counts.emailCount}`);
      console.log(`Email transactions to delete: ${counts.emailTransactionCount}`);

      if (!isDryRun && (counts.emailCount > 0 || counts.emailTransactionCount > 0)) {
        const result = await deleteEmailsBeforeCutoff(user.id, cutoffDate);
        console.log(`Deleted: ${result.deletedEmails} emails, ${result.deletedEmailTransactions} email_transactions`);
      }
    } else {
      console.log('No transactions found — skipping cleanup');
    }
    console.log();
  }

  // Clear existing email_transactions
  console.log('--- Step 2: Clear Existing Email Transactions ---');
  const { count: existingCount } = await supabase
    .from('email_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  console.log(`Existing email_transactions: ${existingCount || 0}`);

  if (!isDryRun && existingCount && existingCount > 0) {
    const { error: deleteError } = await supabase
      .from('email_transactions')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Failed to clear email_transactions:', deleteError.message);
      process.exit(1);
    }
    console.log('Cleared all email_transactions');
  }
  console.log();

  // Fetch all emails
  console.log('--- Step 3: Reprocess All Emails ---');
  const { data: emails, error: fetchError, count: totalCount } = await supabase
    .from('emails')
    .select('id, user_id, message_id, uid, folder, subject, from_address, from_name, date, seen, has_attachments, text_body, html_body, synced_at, created_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('uid', { ascending: true });

  if (fetchError) {
    console.error('Failed to fetch emails:', fetchError.message);
    process.exit(1);
  }

  console.log(`Total emails to process: ${totalCount || emails?.length || 0}`);

  if (!emails || emails.length === 0) {
    console.log('No emails to process.');
    process.exit(0);
  }

  // Process stats
  const stats = {
    total: emails.length,
    parserMatches: {} as Record<string, number>,
    noMatch: 0,
    extracted: 0,
    failed: 0,
    confidenceSum: 0,
    confidenceCount: 0,
    statusCounts: {} as Record<string, number>,
  };

  const batchSize = 100;
  const toInsert: Array<Record<string, unknown>> = [];

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];

    const rawEmail: RawEmailData = {
      message_id: email.message_id,
      uid: email.uid,
      folder: email.folder,
      subject: email.subject,
      from_address: email.from_address,
      from_name: email.from_name,
      email_date: email.date ? new Date(email.date) : new Date(),
      text_body: email.text_body ?? null,
      html_body: email.html_body ?? null,
      seen: email.seen ?? false,
      has_attachments: email.has_attachments ?? false,
    };

    // Extract
    const extraction = extractionService.extractFromEmail(rawEmail);

    // Classify with extraction context
    const classification = extractionService.classifyEmailWithExtraction(rawEmail, extraction);

    // Track parser match
    if (classification.parserKey) {
      stats.parserMatches[classification.parserKey] = (stats.parserMatches[classification.parserKey] || 0) + 1;
    } else {
      stats.noMatch++;
    }

    // Calculate confidence
    const breakdown = extractionService.calculateConfidenceWithBreakdown(extraction);
    const confidence = breakdown.totalScore;

    if (extraction.success) {
      stats.extracted++;
      stats.confidenceSum += confidence;
      stats.confidenceCount++;
    } else {
      stats.failed++;
    }

    // Determine status
    const { determineStatusFromConfidence } = await import('../src/lib/email/confidence-scoring');
    const status = determineStatusFromConfidence(confidence, classification.status);
    stats.statusCounts[status] = (stats.statusCounts[status] || 0) + 1;

    // Build insert row
    const row: Record<string, unknown> = {
      user_id: user.id,
      message_id: email.message_id,
      uid: email.uid,
      folder: email.folder,
      subject: email.subject,
      from_address: email.from_address,
      from_name: email.from_name,
      email_date: email.date || new Date().toISOString(),
      seen: email.seen ?? false,
      has_attachments: email.has_attachments ?? false,
      status,
      classification: classification.classification,
      extraction_confidence: confidence,
      extraction_notes: `Parser: ${classification.parserKey || 'none'} | ${breakdown.summary}`,
      synced_at: email.synced_at || new Date().toISOString(),
      processed_at: new Date().toISOString(),
    };

    if (extraction.success && extraction.data) {
      row.vendor_name_raw = extraction.data.vendor_name_raw;
      row.amount = extraction.data.amount;
      row.currency = extraction.data.currency;
      row.transaction_date = extraction.data.transaction_date.toISOString().split('T')[0];
      row.description = extraction.data.description || null;
      row.order_id = extraction.data.order_id || null;
    }

    toInsert.push(row);

    // Insert in batches
    if (toInsert.length >= batchSize || i === emails.length - 1) {
      if (!isDryRun) {
        const { error: insertError } = await supabase
          .from('email_transactions')
          .insert(toInsert);

        if (insertError) {
          console.error(`Batch insert failed at email ${i + 1}:`, insertError.message);
        }
      }
      process.stdout.write(`\r  Processed ${i + 1}/${emails.length} emails...`);
      toInsert.length = 0;
    }
  }

  console.log('\n');

  // Report
  console.log('=== Results ===');
  console.log(`Total processed: ${stats.total}`);
  console.log(`Successfully extracted: ${stats.extracted}`);
  console.log(`Failed extraction: ${stats.failed}`);
  console.log(`No parser match: ${stats.noMatch}`);
  console.log();

  console.log('Parser match counts:');
  const sortedParsers = Object.entries(stats.parserMatches).sort(([, a], [, b]) => b - a);
  for (const [parser, count] of sortedParsers) {
    console.log(`  ${parser}: ${count}`);
  }
  console.log();

  console.log('Status distribution:');
  for (const [status, count] of Object.entries(stats.statusCounts)) {
    console.log(`  ${status}: ${count}`);
  }
  console.log();

  if (stats.confidenceCount > 0) {
    console.log(`Average confidence (extracted): ${Math.round(stats.confidenceSum / stats.confidenceCount)}%`);
  }

  // Show iCloud relay stats
  let relayCount = 0;
  for (const email of emails) {
    if (email.from_address?.includes('_at_') && email.from_address?.endsWith('@icloud.com')) {
      relayCount++;
    }
  }
  if (relayCount > 0) {
    console.log(`\niCloud relay addresses normalized: ${relayCount}`);
  }
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
