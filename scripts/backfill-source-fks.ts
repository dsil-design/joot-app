/**
 * Backfill script: Set source_statement_upload_id on transactions
 * that have approved matches in statement extraction_log but are missing the FK.
 *
 * Usage: npx tsx scripts/backfill-source-fks.ts
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

interface Suggestion {
  transaction_date: string;
  description: string;
  amount: number;
  currency: string;
  matched_transaction_id?: string;
  confidence?: number;
  status?: string;
  is_new: boolean;
}

interface ExtractionLog {
  suggestions?: Suggestion[];
  [key: string]: unknown;
}

async function backfill() {
  console.log('Backfilling source_statement_upload_id from approved statement suggestions...\n');

  // Fetch all statement_uploads with extraction_log
  const { data: statements, error } = await supabase
    .from('statement_uploads')
    .select('id, user_id, extraction_log');

  if (error) {
    console.error('Error fetching statements:', error);
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let alreadySet = 0;

  for (const stmt of statements || []) {
    const log = stmt.extraction_log as ExtractionLog | null;
    const suggestions = log?.suggestions || [];

    for (let idx = 0; idx < suggestions.length; idx++) {
      const suggestion = suggestions[idx];

      if (suggestion.status !== 'approved' || !suggestion.matched_transaction_id) {
        continue;
      }

      // Check if FK is already set
      const { data: tx } = await supabase
        .from('transactions')
        .select('id, source_statement_upload_id')
        .eq('id', suggestion.matched_transaction_id)
        .single();

      if (!tx) {
        console.log(`  SKIP: Transaction ${suggestion.matched_transaction_id} not found (may have been deleted)`);
        skipped++;
        continue;
      }

      if (tx.source_statement_upload_id) {
        alreadySet++;
        continue;
      }

      // Set the FK
      const { error: updateErr } = await supabase
        .from('transactions')
        .update({
          source_statement_upload_id: stmt.id,
          source_statement_suggestion_index: idx,
          source_statement_match_confidence: suggestion.confidence ?? null,
        })
        .eq('id', suggestion.matched_transaction_id);

      if (updateErr) {
        console.log(`  FAIL: Transaction ${suggestion.matched_transaction_id}: ${updateErr.message}`);
        failed++;
      } else {
        updated++;
      }
    }
  }

  console.log(`\nResults:`);
  console.log(`  Updated:     ${updated}`);
  console.log(`  Already set: ${alreadySet}`);
  console.log(`  Skipped:     ${skipped}`);
  console.log(`  Failed:      ${failed}`);
}

backfill().catch(console.error);
