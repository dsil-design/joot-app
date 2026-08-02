/**
 * Repair script: statement rows left rejected by a re-queue that could not undo.
 *
 * The Review Queue rejects in two calls: the Reject button fires
 * `nextStatus: 'skipped'`, then the feedback toast's "put it back in the queue"
 * fires `nextStatus: 'pending_review'` for the same id. The second call bailed
 * out on any suggestion already marked 'rejected' — which the first call had
 * just done — so the email came back to the queue while its statement row
 * stayed rejected and invisible, with the email↔statement pairing blacklisted
 * on top. A recurring bill would then propose a brand-new single-source
 * transaction every month while its card charge sat hidden.
 *
 * The route no longer does this (src/app/api/imports/reject/route.ts). This
 * repairs rows already in that state, identified by the exact signature:
 * an email back at `pending_review` holding a `rejected_pair_keys` entry that
 * points at a statement suggestion whose status is 'rejected'.
 *
 * Two separate repairs, because they carry different risk:
 *
 *   --apply             restores the stuck statement rows to 'pending'. Safe:
 *                       these are real charges currently invisible in the
 *                       queue, and a restored row stands on its own.
 *   --restore-pair <id> additionally drops the rejected pair key for that
 *                       email, so the pairer may merge it with its statement
 *                       row again. Opt-in per email on purpose — some of these
 *                       keys record pairings the user rejected on the merits
 *                       (an Amazon charge blacklisted against a water-bill
 *                       email), and dropping those would re-create a wrong
 *                       merge. Repeatable.
 *
 * Usage:
 *   npx tsx scripts/repair-stuck-requeued-pairs.ts
 *   npx tsx scripts/repair-stuck-requeued-pairs.ts --apply
 *   npx tsx scripts/repair-stuck-requeued-pairs.ts --apply --restore-pair <emailId>
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const APPLY = process.argv.includes('--apply');
const RESTORE_PAIR_EMAIL_IDS = new Set(
  process.argv.flatMap((arg, i) => (process.argv[i - 1] === '--restore-pair' ? [arg] : []))
);

interface Suggestion {
  transaction_date: string;
  description: string;
  amount: number;
  currency: string;
  matched_transaction_id?: string;
  rejected_transaction_ids?: string[];
  confidence: number;
  reasons: string[];
  is_new: boolean;
  status?: string;
}

interface ExtractionLog {
  suggestions?: Suggestion[];
  [key: string]: unknown;
}

async function main() {
  const { data: emails, error } = await supabase
    .from('email_transactions')
    .select('id, user_id, subject, amount, currency, transaction_date, status, rejected_pair_keys')
    .eq('status', 'pending_review')
    .not('rejected_pair_keys', 'eq', '{}');
  if (error) throw error;

  // statementId -> { indices to restore, and the emails whose keys to drop }
  const perStatement = new Map<string, Map<number, string[]>>();
  const keysToDrop = new Map<string, string[]>();

  const statementIds = Array.from(
    new Set((emails || []).flatMap((e) => (e.rejected_pair_keys || []).map((k: string) => k.split(':')[0])))
  );
  if (statementIds.length === 0) {
    console.log('No emails carry rejected pair keys — nothing to repair.');
    return;
  }

  const { data: statements, error: stmtError } = await supabase
    .from('statement_uploads')
    .select('id, filename, extraction_log')
    .in('id', statementIds);
  if (stmtError) throw stmtError;

  const byId = new Map((statements || []).map((s) => [s.id, s]));

  for (const email of emails || []) {
    for (const key of (email.rejected_pair_keys || []) as string[]) {
      const [statementId, indexStr] = key.split(':');
      const index = Number(indexStr);
      const statement = byId.get(statementId);
      if (!statement) continue;

      const suggestions = (statement.extraction_log as ExtractionLog | null)?.suggestions || [];
      const suggestion = suggestions[index];
      // Only the broken-undo shape: the row is rejected while the email it was
      // paired with is back in the queue. A row rejected on its own merits has
      // no live email pointing at it.
      if (!suggestion || suggestion.status !== 'rejected') continue;

      const indices = perStatement.get(statementId) || new Map<number, string[]>();
      indices.set(index, [...(indices.get(index) || []), email.id]);
      perStatement.set(statementId, indices);

      keysToDrop.set(email.id, [...(keysToDrop.get(email.id) || []), key]);

      const willUnpair = RESTORE_PAIR_EMAIL_IDS.has(email.id);
      console.log(
        `${statement.filename} [${index}] "${suggestion.description}" ${suggestion.amount} ${suggestion.currency} ` +
          `(${suggestion.transaction_date})\n    ↔ email ${email.id} "${email.subject}" ` +
          `${email.amount} ${email.currency} (${email.transaction_date})` +
          `\n    row → pending${willUnpair ? '; pair key dropped (re-merge allowed)' : '; pair key kept'}`
      );
    }
  }

  if (perStatement.size === 0) {
    console.log('No stuck re-queued pairs found.');
    return;
  }

  if (!APPLY) {
    console.log(
      `\nDry run — ${keysToDrop.size} email(s) affected. Pass --apply to restore the rows,` +
        `\nand --restore-pair <emailId> for each pairing that should merge again.`
    );
    return;
  }

  for (const [statementId, indices] of perStatement) {
    const statement = byId.get(statementId)!;
    const log = (statement.extraction_log as ExtractionLog | null) || {};
    const suggestions = log.suggestions || [];

    for (const index of indices.keys()) {
      const suggestion = suggestions[index];
      suggestion.status = 'pending';
      // The link the user rejected must not return with the row.
      if (suggestion.matched_transaction_id) {
        const rejected = suggestion.rejected_transaction_ids || [];
        if (!rejected.includes(suggestion.matched_transaction_id)) {
          suggestion.rejected_transaction_ids = [...rejected, suggestion.matched_transaction_id];
        }
        suggestion.matched_transaction_id = undefined;
        suggestion.confidence = 0;
        suggestion.is_new = true;
        suggestion.reasons = [];
      }
    }

    const { error: updErr } = await supabase
      .from('statement_uploads')
      .update({ extraction_log: { ...log, suggestions } })
      .eq('id', statementId);
    if (updErr) console.error(`  failed statement ${statementId}: ${updErr.message}`);
  }

  let unpaired = 0;
  for (const [emailId, keys] of keysToDrop) {
    if (!RESTORE_PAIR_EMAIL_IDS.has(emailId)) continue;
    const { data: row } = await supabase
      .from('email_transactions')
      .select('rejected_pair_keys')
      .eq('id', emailId)
      .single();
    const remaining = ((row?.rejected_pair_keys || []) as string[]).filter((k) => !keys.includes(k));
    const { error: updErr } = await supabase
      .from('email_transactions')
      .update({ rejected_pair_keys: remaining })
      .eq('id', emailId);
    if (updErr) console.error(`  failed email ${emailId}: ${updErr.message}`);
    else unpaired++;
  }

  console.log(
    `\nRestored ${[...perStatement.values()].reduce((n, m) => n + m.size, 0)} statement row(s) to pending; ` +
      `cleared the pair key on ${unpaired} email(s).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
