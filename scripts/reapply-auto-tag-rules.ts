/**
 * Apply auto-tag rules to proposals that were generated before the rules existed.
 *
 * Deliberately narrow: this only unions rule tags into `proposed_tag_ids` and
 * rewrites the `tag_ids` entry of `field_confidence`. It does NOT regenerate
 * proposals. A full regeneration would re-run the LLM and could change the
 * vendor, description or date on queue rows that have already been reviewed by
 * eye — a much bigger blast radius than "this one should also be tagged".
 *
 * Only status='pending' proposals are touched. Accepted and rejected rows are
 * history and are left alone.
 *
 * Usage:
 *   npx tsx scripts/reapply-auto-tag-rules.ts             # report only
 *   npx tsx scripts/reapply-auto-tag-rules.ts --apply     # write
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { evaluateAutoTagRules, fetchAutoTagRules } from '../src/lib/services/auto-tag-rules';
import type { ProposalInput, ProposalSourceType } from '../src/lib/proposals/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const APPLY = process.argv.includes('--apply');

async function main() {
  // Rules are per-user; run over every user that has any.
  const { data: ruleOwners } = await supabase
    .from('auto_tag_rules')
    .select('user_id')
    .eq('enabled', true);

  const userIds = Array.from(new Set((ruleOwners || []).map((r) => r.user_id)));
  if (userIds.length === 0) {
    console.log('No enabled auto-tag rules found. Nothing to do.');
    return;
  }

  for (const userId of userIds) {
    await processUser(userId);
  }

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to write these changes.');
  }
}

async function processUser(userId: string) {
  const rules = await fetchAutoTagRules(supabase, userId);
  if (rules.length === 0) return;

  const { data: tags } = await supabase.from('tags').select('id, name').eq('user_id', userId);
  const tagName = new Map((tags || []).map((t) => [t.id, t.name]));
  const knownTagIds = new Set((tags || []).map((t) => t.id));

  const { data: proposals, error } = await supabase
    .from('transaction_proposals')
    .select(
      'id, composite_id, source_type, proposed_description, proposed_vendor_id, ' +
        'proposed_transaction_type, proposed_tag_ids, field_confidence, ' +
        'statement_upload_id, email_transaction_id, payment_slip_upload_id'
    )
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (error) {
    console.error(`Failed to load proposals for ${userId}:`, error.message);
    process.exitCode = 1;
    return;
  }
  if (!proposals || proposals.length === 0) {
    console.log(`${userId}: no pending proposals`);
    return;
  }

  // Counterparty patterns match on raw source text, so pull the names off the
  // slips and emails these proposals came from.
  const slipIds = proposals.map((p) => p.payment_slip_upload_id).filter(Boolean) as string[];
  const emailIds = proposals.map((p) => p.email_transaction_id).filter(Boolean) as string[];

  const [slipRes, emailRes] = await Promise.all([
    slipIds.length > 0
      ? supabase
          .from('payment_slip_uploads')
          .select('id, sender_name, recipient_name')
          .in('id', slipIds)
      : Promise.resolve({ data: [] }),
    emailIds.length > 0
      ? supabase
          .from('email_transactions')
          .select('id, from_name, vendor_name_raw')
          .in('id', emailIds)
      : Promise.resolve({ data: [] }),
  ]);

  const slipById = new Map(
    ((slipRes.data || []) as Array<{ id: string; sender_name: string | null; recipient_name: string | null }>)
      .map((s) => [s.id, s])
  );
  const emailById = new Map(
    ((emailRes.data || []) as Array<{ id: string; from_name: string | null; vendor_name_raw: string | null }>)
      .map((e) => [e.id, e])
  );

  let changed = 0;

  for (const p of proposals) {
    const slip = p.payment_slip_upload_id ? slipById.get(p.payment_slip_upload_id) : undefined;
    const email = p.email_transaction_id ? emailById.get(p.email_transaction_id) : undefined;

    // Minimal input: only the fields rule matching actually reads.
    const item: ProposalInput = {
      compositeId: p.composite_id,
      sourceType: p.source_type as ProposalSourceType,
      description: p.proposed_description || '',
      amount: 0,
      currency: 'USD',
      date: '1970-01-01',
      statementUploadId: p.statement_upload_id || undefined,
      emailTransactionId: p.email_transaction_id || undefined,
      paymentSlipUploadId: p.payment_slip_upload_id || undefined,
      senderName: slip?.sender_name || undefined,
      recipientName: slip?.recipient_name || undefined,
      fromName: email?.from_name || undefined,
      vendorNameRaw: email?.vendor_name_raw || undefined,
    };

    const match = evaluateAutoTagRules(
      rules,
      item,
      p.proposed_vendor_id,
      p.proposed_transaction_type,
      knownTagIds
    );
    if (!match) continue;

    const existing = (p.proposed_tag_ids as string[] | null) || [];
    const added = match.tagIds.filter((id) => !existing.includes(id));
    if (added.length === 0) continue;

    const nextTags = [...existing, ...added];
    const names = match.tagIds.map((id) => tagName.get(id) || id).join(', ');

    console.log(
      `${p.composite_id}: +${added.map((id) => tagName.get(id) || id).join(', ')}` +
        (existing.length > 0
          ? ` (keeping ${existing.map((id) => tagName.get(id) || id).join(', ')})`
          : '')
    );
    changed++;

    if (!APPLY) continue;

    const fieldConfidence = {
      ...((p.field_confidence as Record<string, unknown>) || {}),
      tag_ids: {
        score: 98,
        reasoning: `Auto-tag ${match.labels.join(' + ')}: ${names}`,
        source: 'user_rule',
      },
    };

    const { error: updateError } = await supabase
      .from('transaction_proposals')
      .update({ proposed_tag_ids: nextTags, field_confidence: fieldConfidence })
      .eq('id', p.id);

    if (updateError) {
      console.error(`  failed: ${updateError.message}`);
      process.exitCode = 1;
    }
  }

  console.log(
    `${userId}: ${changed} of ${proposals.length} pending proposal${
      proposals.length === 1 ? '' : 's'
    } ${APPLY ? 'updated' : 'would change'}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
