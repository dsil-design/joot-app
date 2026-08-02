/**
 * Backfill script: seed vendor_recipient_mappings from confirmed email links.
 *
 * Learning used to be gated to the bank-transfer parsers, so a merchant whose
 * receipts arrive by email taught the system nothing however many times the
 * same link was confirmed — twenty months of "Xfinity" receipts linked to the
 * Xfinity vendor, and the twenty-first still fell back to a fuzzy guess.
 * `learnVendorRecipientMapping` now records for every parser; this seeds the
 * mappings the already-confirmed links should have produced.
 *
 * Only reads links the user actually made: email_transactions with
 * status='matched' whose matched transaction carries a vendor. Never guesses.
 *
 * Usage:
 *   npx tsx scripts/backfill-email-vendor-mappings.ts          # dry run
 *   npx tsx scripts/backfill-email-vendor-mappings.ts --apply  # write
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

/** Mirrors normalizeRecipientName in src/lib/services/vendor-recipient-mapping.ts. */
function normalizeRecipientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(mr\.|mrs\.|ms\.|miss|นาย|นาง|น\.ส\.|นางสาว)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Candidate {
  userId: string;
  normalized: string;
  raw: string;
  parserKey: string;
  vendorId: string;
  vendorName: string;
  count: number;
}

async function main() {
  const { data: rows, error } = await supabase
    .from('email_transactions')
    .select(
      'user_id, vendor_name_raw, parser_key, matched_transaction_id, transactions:matched_transaction_id (vendor_id, vendors (name))'
    )
    .eq('status', 'matched')
    .not('vendor_name_raw', 'is', null)
    .not('parser_key', 'is', null)
    .not('matched_transaction_id', 'is', null);
  if (error) throw error;

  // key = user|normalized|parser ; a name linked to two different vendors is
  // ambiguous and is left for the user rather than resolved by majority.
  const byKey = new Map<string, Map<string, Candidate>>();

  for (const row of rows || []) {
    const tx = row.transactions as unknown as
      | { vendor_id: string | null; vendors: { name: string } | null }
      | null;
    const vendorId = tx?.vendor_id;
    if (!vendorId) continue;

    const raw = (row.vendor_name_raw || '').trim();
    const normalized = normalizeRecipientName(raw);
    if (!normalized) continue;

    const key = `${row.user_id}|${normalized}|${row.parser_key}`;
    const perVendor = byKey.get(key) || new Map<string, Candidate>();
    const existing = perVendor.get(vendorId);
    if (existing) {
      existing.count++;
    } else {
      perVendor.set(vendorId, {
        userId: row.user_id,
        normalized,
        raw,
        parserKey: row.parser_key!,
        vendorId,
        vendorName: tx?.vendors?.name || vendorId,
        count: 1,
      });
    }
    byKey.set(key, perVendor);
  }

  // A name linked to several vendors is only resolved when one of them is the
  // user's clear convention. "grabfood" is GrabFood 90 times and Grab 21 — a
  // settled habit with some early noise. "unknown recipient" and "/" spread
  // across twenty vendors are placeholders that mean nothing and must stay
  // unmapped; a wrong mapping here would be applied confidently, forever.
  const DOMINANCE = 0.7;
  const MIN_DOMINANT_LINKS = 3;

  const toWrite: Candidate[] = [];
  const ambiguous: string[] = [];
  for (const [key, perVendor] of byKey) {
    const candidates = [...perVendor.values()].sort((a, b) => b.count - a.count);
    if (candidates.length === 1) {
      toWrite.push(candidates[0]);
      continue;
    }

    const total = candidates.reduce((n, c) => n + c.count, 0);
    const top = candidates[0];
    if (top.count >= MIN_DOMINANT_LINKS && top.count / total >= DOMINANCE) {
      toWrite.push(top);
      continue;
    }

    ambiguous.push(
      `${key.split('|')[1]} → ${candidates.map((c) => `${c.vendorName}×${c.count}`).join(', ')}`
    );
  }

  toWrite.sort((a, b) => b.count - a.count);
  for (const c of toWrite) {
    console.log(`${c.count.toString().padStart(4)} × [${c.parserKey}] "${c.raw}" → ${c.vendorName}`);
  }
  if (ambiguous.length > 0) {
    console.log(`\nSkipped ${ambiguous.length} name(s) linked to more than one vendor:`);
    for (const a of ambiguous.slice(0, 20)) console.log(`  ${a}`);
  }

  if (!APPLY) {
    console.log(`\nDry run — ${toWrite.length} mapping(s) to seed. Pass --apply to write.`);
    return;
  }

  let written = 0;
  for (const c of toWrite) {
    const { data: existing } = await supabase
      .from('vendor_recipient_mappings')
      .select('id, vendor_id, match_count')
      .eq('user_id', c.userId)
      .eq('recipient_name_normalized', c.normalized)
      .eq('parser_key', c.parserKey)
      .maybeSingle();

    // Never overwrite a mapping the user's later decisions already moved.
    if (existing) continue;

    const { error: insertError } = await supabase.from('vendor_recipient_mappings').insert({
      user_id: c.userId,
      recipient_name_normalized: c.normalized,
      recipient_name_raw: c.raw,
      vendor_id: c.vendorId,
      parser_key: c.parserKey,
      match_count: c.count,
      last_used_at: new Date().toISOString(),
    });
    if (insertError) console.error(`  failed "${c.raw}": ${insertError.message}`);
    else written++;
  }

  console.log(`\nSeeded ${written} mapping(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
