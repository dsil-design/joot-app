/**
 * Seed the Nidnoi → reimbursement auto-tag rules.
 *
 * Money arriving from Nidnoi is almost always her half of something shared, so
 * these two rules tag it on sight instead of waiting for enough history for the
 * statistical strategies to infer it:
 *
 *   1. vendor rule — fires once the engine resolves the vendor "Nidnoi"
 *   2. counterparty pattern — fires on the raw sender name, covering slips
 *      where her name arrives in a spelling vendor_recipient_mappings hasn't
 *      learned yet and vendor resolution therefore returns nothing
 *
 * Both are scoped to income: money going the other way isn't a reimbursement.
 *
 * Usage:
 *   npx tsx scripts/seed-nidnoi-reimbursement-rule.ts            # report only
 *   npx tsx scripts/seed-nidnoi-reimbursement-rule.ts --apply    # write
 *
 * Idempotent: re-running never creates a duplicate rule.
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
const VENDOR_NAME = 'Nidnoi';
const TAG_NAME = 'reimbursement';

/** Fallback pattern if no learned spelling of her name is on file. */
const FALLBACK_PATTERN = 'nidnoi';

async function main() {
  // The rules table is per-user; every other table here is too, so resolve the
  // user from the vendor rather than guessing.
  const { data: vendors, error: vendorError } = await supabase
    .from('vendors')
    .select('id, name, user_id')
    .ilike('name', VENDOR_NAME);

  if (vendorError) {
    console.error('Failed to look up vendor:', vendorError.message);
    process.exit(1);
  }
  if (!vendors || vendors.length === 0) {
    console.error(`No vendor named "${VENDOR_NAME}" found. Create it first.`);
    process.exit(1);
  }
  if (vendors.length > 1) {
    console.error(
      `Found ${vendors.length} vendors named "${VENDOR_NAME}" across users — refusing to guess.`
    );
    process.exit(1);
  }

  const vendor = vendors[0];
  const userId = vendor.user_id;
  console.log(`Vendor: ${vendor.name} (${vendor.id})`);

  // 1. Ensure the tag exists
  const { data: existingTag } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', userId)
    .ilike('name', TAG_NAME)
    .maybeSingle();

  let tagId = existingTag?.id;
  if (tagId) {
    console.log(`Tag: ${existingTag!.name} (${tagId}) — already exists`);
  } else if (!APPLY) {
    console.log(`Tag: "${TAG_NAME}" would be created`);
  } else {
    const { data: created, error } = await supabase
      .from('tags')
      .insert({ name: TAG_NAME, color: '#dbeafe', user_id: userId })
      .select('id')
      .single();
    if (error || !created) {
      console.error('Failed to create tag:', error?.message);
      process.exit(1);
    }
    tagId = created.id;
    console.log(`Tag: created "${TAG_NAME}" (${tagId})`);
  }

  // 2. Pick the counterparty pattern from what the app has actually learned,
  //    so the rule matches the spellings that really show up on slips.
  const { data: mappings } = await supabase
    .from('vendor_recipient_mappings')
    .select('recipient_name_normalized, recipient_name_raw')
    .eq('user_id', userId)
    .eq('vendor_id', vendor.id);

  const { pattern, coverage, total } = pickPattern(mappings || []);
  if (total === 0) {
    console.log(`Pattern: "${pattern}" (no learned spellings on file — using fallback)`);
  } else {
    console.log(
      `Pattern: "${pattern}" — appears in ${coverage} of ${total} learned spelling${
        total === 1 ? '' : 's'
      }`
    );
    if (coverage < total) {
      console.log(
        `  Note: the other spellings are OCR variants and are matched by the vendor\n` +
          `  rule instead (each is already mapped to the vendor). The pattern rule only\n` +
          `  has to catch spellings the app has not seen before.`
      );
    }
  }

  // 3. Upsert the two rules
  const desired = [
    {
      label: 'vendor rule',
      row: {
        user_id: userId,
        match_type: 'vendor' as const,
        vendor_id: vendor.id,
        pattern: null,
        transaction_type: 'income' as const,
        source_types: null,
        tag_ids: tagId ? [tagId] : [],
        enabled: true,
        priority: 0,
      },
    },
    {
      label: 'counterparty pattern rule',
      row: {
        user_id: userId,
        match_type: 'counterparty_pattern' as const,
        vendor_id: null,
        pattern,
        transaction_type: 'income' as const,
        source_types: null,
        tag_ids: tagId ? [tagId] : [],
        enabled: true,
        priority: 0,
      },
    },
  ];

  const { data: existingRules } = await supabase
    .from('auto_tag_rules')
    .select('id, match_type, vendor_id, pattern')
    .eq('user_id', userId);

  for (const { label, row } of desired) {
    const already = (existingRules || []).find(
      (r) =>
        r.match_type === row.match_type &&
        (row.match_type === 'vendor'
          ? r.vendor_id === row.vendor_id
          : (r.pattern || '').toLowerCase() === (row.pattern || '').toLowerCase())
    );

    if (already) {
      console.log(`${label}: already exists (${already.id}) — skipped`);
      continue;
    }
    if (!APPLY) {
      console.log(`${label}: would be created`);
      continue;
    }

    const { data: created, error } = await supabase
      .from('auto_tag_rules')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      console.error(`${label}: failed —`, error.message);
      process.exitCode = 1;
      continue;
    }
    console.log(`${label}: created (${created!.id})`);
  }

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to write these changes.');
  } else {
    console.log(
      '\nDone. Existing pending proposals were generated before these rules and ' +
        'will not have the tag until they are regenerated — run:\n' +
        '  npx tsx scripts/reapply-auto-tag-rules.ts --apply'
    );
  }
}

/**
 * Choose a counterparty pattern from the learned spellings.
 *
 * "Longest token common to every spelling" is the obvious approach and it does
 * not survive contact with this data: the Thai spellings come from OCR of
 * payment slips and are garbled differently almost every time (สุภาภรณ์,
 * สุภากรณ์, สุดาภรณ์, สุรากรณ์ …), so the intersection across all spellings is
 * empty and the fallback would fire — a pattern present in 1 of 19 spellings.
 *
 * Latin-script tokens are far more stable than OCR'd Thai, so prefer the
 * best-covered Latin token and only fall back to the overall best if there
 * isn't one. The garbled Thai variants are already covered by the vendor rule,
 * because each one is mapped to the vendor in vendor_recipient_mappings; this
 * pattern only has to catch spellings the app has never seen.
 */
function pickPattern(
  mappings: Array<{ recipient_name_normalized: string }>
): { pattern: string; coverage: number; total: number } {
  const total = mappings.length;
  if (total === 0) return { pattern: FALLBACK_PATTERN, coverage: 0, total: 0 };

  const coverageByToken = new Map<string, number>();
  for (const m of mappings) {
    const tokens = new Set(
      m.recipient_name_normalized.split(/\s+/).filter((t) => t.length >= 4)
    );
    for (const token of tokens) {
      coverageByToken.set(token, (coverageByToken.get(token) || 0) + 1);
    }
  }
  if (coverageByToken.size === 0) {
    return { pattern: FALLBACK_PATTERN, coverage: 0, total };
  }

  const isLatin = (token: string) => /^[a-z0-9.\-']+$/.test(token);
  const rank = (a: [string, number], b: [string, number]) =>
    b[1] - a[1] || b[0].length - a[0].length;

  const entries = [...coverageByToken.entries()];
  const latin = entries.filter(([token]) => isLatin(token)).sort(rank);
  const best = (latin.length > 0 ? latin : entries.sort(rank))[0];

  return { pattern: best[0], coverage: best[1], total };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
