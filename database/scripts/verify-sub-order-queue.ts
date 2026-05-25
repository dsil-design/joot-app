#!/usr/bin/env tsx
/**
 * Headless verification that the queue builder now surfaces sub-order data
 * for the April 30 Amazon multi-shipment email. We can't drive the auth-gated
 * /review page from a script, but we can call the same builder directly and
 * inspect the QueueItem payload that the card component will receive.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../../.env.local') });

import { fetchEmailQueueItems } from '../../src/lib/imports/email-queue-builder';

const USER_ID = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const items = await fetchEmailQueueItems(supabase, USER_ID, {
    fromDate: '2026-04-25',
    toDate: '2026-05-05',
  });

  const amazonItems = items.filter((i) =>
    /amazon/i.test(i.emailMetadata?.fromAddress ?? '') ||
    /amazon/i.test(i.emailMetadata?.fromName ?? ''),
  );
  console.log(`Total items: ${items.length}, Amazon items: ${amazonItems.length}\n`);

  for (const item of amazonItems) {
    const subs = item.emailMetadata?.subOrders;
    console.log(`--- ${item.id}`);
    console.log(`    subject: ${item.emailMetadata?.subject?.slice(0, 80) ?? '(none)'}`);
    console.log(`    amount: ${item.statementTransaction.amount} ${item.statementTransaction.currency}`);
    console.log(`    status: ${item.status}, waiting: ${item.waitingForStatement ?? false}`);
    if (!subs || subs.length === 0) {
      console.log(`    (no sub-orders)`);
    } else {
      console.log(`    SUB-ORDERS (${subs.length}):`);
      for (const s of subs) {
        const tag = s.matchedTransactionId ? `matched→${s.matchedTransaction?.description ?? s.matchedTransactionId}` : 'waiting';
        console.log(`      #${s.position + 1}  ${s.orderId}  $${s.amount} ${s.currency}  [${tag}]`);
      }
    }
    console.log('');
  }
}
main().catch((err) => { console.error(err); process.exit(1); });
