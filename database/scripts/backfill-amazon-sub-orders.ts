#!/usr/bin/env tsx
/**
 * Backfill Amazon sub-orders for already-stored email_transactions.
 *
 * For every email_transactions row that looks like an Amazon order email
 * (sender on amazon.* — including iCloud-mangled forms — OR vendor_name_raw
 * matching "Amazon"), runs the new regex parser against the raw email body
 * stored in `emails`. If sub-orders are detected, writes them to
 * `email_sub_orders` and re-runs auto-matching against existing transactions.
 *
 * Idempotent: persistSubOrders is a delete-then-insert. Re-running it just
 * rewrites the sub-order rows from the current parser output.
 *
 * Usage:
 *   npx tsx database/scripts/backfill-amazon-sub-orders.ts          # dry-run
 *   npx tsx database/scripts/backfill-amazon-sub-orders.ts --apply  # write
 *   npx tsx database/scripts/backfill-amazon-sub-orders.ts --apply --id <uuid>
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../../.env.local') });

import { amazonParser } from '../../src/lib/email/extractors/amazon';
import { persistSubOrders, autoMatchSubOrders } from '../../src/lib/email/sub-order-matcher';
import { normalizeICloudRelay } from '../../src/lib/email/icloud-relay';
import type { RawEmailData } from '../../src/lib/email/types';
import type { TargetTransaction } from '../../src/lib/matching/match-scorer';

const APPLY = process.argv.includes('--apply');
const idArgIdx = process.argv.indexOf('--id');
const SINGLE_ID = idArgIdx >= 0 ? process.argv[idArgIdx + 1] : null;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface EmailTxRow {
  id: string;
  user_id: string;
  message_id: string;
  folder: string;
  uid: number;
  subject: string | null;
  from_address: string | null;
  from_name: string | null;
  email_date: string | null;
  transaction_date: string | null;
  amount: number | null;
  currency: string | null;
  vendor_name_raw: string | null;
  description: string | null;
  status: string;
  parser_key: string | null;
}

async function fetchAmazonEmailTransactions(): Promise<EmailTxRow[]> {
  let query = supabase
    .from('email_transactions')
    .select('id, user_id, message_id, folder, uid, subject, from_address, from_name, email_date, transaction_date, amount, currency, vendor_name_raw, description, status, parser_key');

  if (SINGLE_ID) {
    query = query.eq('id', SINGLE_ID);
  } else {
    query = query
      .or('vendor_name_raw.ilike.%amazon%,from_address.ilike.%amazon%,from_name.ilike.%amazon%')
      .order('email_date', { ascending: false })
      .limit(200);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as EmailTxRow[];
}

async function loadRawEmailBody(userId: string, messageId: string): Promise<{ text: string | null; html: string | null } | null> {
  const { data } = await supabase
    .from('emails')
    .select('text_body, html_body')
    .eq('user_id', userId)
    .eq('message_id', messageId)
    .maybeSingle();
  if (!data) return null;
  return { text: data.text_body, html: data.html_body };
}

async function loadCandidateTransactions(userId: string, dateStr: string): Promise<TargetTransaction[]> {
  // ±7 days mirrors extractionService.tryAutoMatch
  const center = new Date(dateStr + 'T00:00:00');
  const from = new Date(center);
  from.setDate(from.getDate() - 7);
  const to = new Date(center);
  to.setDate(to.getDate() + 7);

  const { data, error } = await supabase
    .from('transactions')
    .select('id, description, amount, original_currency, transaction_date, vendors:vendor_id (id, name)')
    .eq('user_id', userId)
    .gte('transaction_date', from.toISOString().slice(0, 10))
    .lte('transaction_date', to.toISOString().slice(0, 10))
    .order('transaction_date', { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return data.map((tx) => ({
    id: tx.id,
    amount: Number(tx.amount),
    currency: tx.original_currency as string,
    date: tx.transaction_date as string,
    vendor: (tx.vendors as { name: string } | null)?.name || tx.description || '',
    description: (tx.description as string) || undefined,
  }));
}

async function main() {
  console.log(APPLY ? '*** APPLY MODE — writing changes ***' : 'DRY RUN (use --apply to write)');
  console.log('');

  const rows = await fetchAmazonEmailTransactions();
  console.log(`Found ${rows.length} candidate email_transactions`);

  let processed = 0;
  let extracted = 0;
  let withSubOrders = 0;
  let totalMatched = 0;

  for (const row of rows) {
    if (!row.email_date) continue;
    const normalizedFrom = normalizeICloudRelay(row.from_address ?? '');
    const fromLower = normalizedFrom.toLowerCase();
    const subjectLower = (row.subject ?? '').toLowerCase();
    // Skip rows that aren't actually Amazon order confirmations
    if (!/amazon\.[a-z.]+/.test(fromLower) && !/^ordered:|^your amazon|^amazon\.[a-z.]+ order of/.test(subjectLower)) {
      continue;
    }
    processed++;

    const body = await loadRawEmailBody(row.user_id, row.message_id);
    if (!body || !body.text) {
      console.log(`  ${row.id}  SKIP (no raw text body in emails table)`);
      continue;
    }

    const raw: RawEmailData = {
      message_id: row.message_id,
      uid: row.uid,
      folder: row.folder,
      subject: row.subject,
      from_address: normalizedFrom || row.from_address,
      from_name: row.from_name,
      email_date: new Date(row.email_date),
      text_body: body.text,
      html_body: body.html,
      seen: true,
      has_attachments: false,
    };

    const result = amazonParser.extract(raw);
    if (result instanceof Promise) throw new Error('Amazon parser is sync');

    if (!result.success || !result.data) {
      console.log(`  ${row.id}  parse failed: ${result.errors?.join('; ') || 'unknown'}`);
      continue;
    }
    extracted++;

    const subs = result.data.sub_orders ?? [];
    if (subs.length < 2) {
      console.log(`  ${row.id}  single-order ($${result.data.amount}) — no sub-orders to write`);
      continue;
    }
    withSubOrders++;

    console.log(`  ${row.id}  ${row.email_date}  parent=$${row.amount} → ${subs.length} sub-orders: ${subs.map((s) => `$${s.amount}`).join(' + ')} = $${result.data.amount}`);

    if (!APPLY) continue;

    try {
      const persisted = await persistSubOrders(supabase, row.id, row.user_id, subs);
      const targets = await loadCandidateTransactions(row.user_id, row.transaction_date ?? row.email_date.slice(0, 10));
      const matched = await autoMatchSubOrders(supabase, row.user_id, persisted, targets, {
        sourceDate: row.transaction_date ?? row.email_date.slice(0, 10),
        sourceVendor: row.vendor_name_raw ?? 'Amazon.com',
      });
      totalMatched += matched;
      console.log(`    persisted ${persisted.length} sub-orders, ${matched} auto-matched`);

      // Update parser_key so the row is recognized as Amazon-parsed going forward
      await supabase
        .from('email_transactions')
        .update({ parser_key: amazonParser.key })
        .eq('id', row.id);
    } catch (err) {
      console.error(`    ERROR: ${err}`);
    }
  }

  console.log('');
  console.log(`Summary: ${processed} examined, ${extracted} successfully parsed, ${withSubOrders} had ≥2 sub-orders, ${totalMatched} sub-orders auto-matched`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
