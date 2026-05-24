#!/usr/bin/env tsx
/**
 * Inspect the AmEx statement upload that returned zero transactions.
 * Looks for the most recent AmEx upload whose period ends on/near 2026-05-14.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

config({ path: path.resolve(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data, error } = await supabase
    .from('statement_uploads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(15);

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('No uploads found');
    return;
  }

  console.log(`Found ${data.length} recent uploads:\n`);
  for (const row of data) {
    console.log(
      `${row.id}\n  filename: ${row.filename}\n  status: ${row.status}\n  period: ${row.statement_period_start} → ${row.statement_period_end}\n  extracted/matched/new: ${row.transactions_extracted}/${row.transactions_matched}/${row.transactions_new}\n  payment_method_id: ${row.payment_method_id}\n  file_path: ${row.file_path}\n  created_at: ${row.created_at}\n  error: ${row.extraction_error ?? '(none)'}\n`
    );
  }

  // Pick the candidate: AmEx-like, period ending mid-May 2026, zero transactions
  const candidate = data.find(
    (r) =>
      (r.statement_period_end?.startsWith('2026-05') ||
        r.filename?.toLowerCase().includes('amex') ||
        r.filename?.toLowerCase().includes('american')) &&
      (r.transactions_extracted ?? 0) === 0
  );

  if (!candidate) {
    console.log('No matching candidate found among the recent uploads.');
    return;
  }

  console.log(`\nCandidate: ${candidate.id} (${candidate.filename})\n`);

  // Download the file
  const { data: file, error: dlErr } = await supabase.storage
    .from('statement-uploads')
    .download(candidate.file_path);
  if (dlErr || !file) {
    console.error('Download error:', dlErr);
    return;
  }

  const outPath = path.resolve(__dirname, `failed-statement-${candidate.id}.pdf`);
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  console.log(`Saved PDF to: ${outPath} (${buf.length} bytes)`);

  // Dump the extraction log for inspection
  const logPath = path.resolve(__dirname, `failed-statement-${candidate.id}.log.json`);
  fs.writeFileSync(logPath, JSON.stringify(candidate.extraction_log, null, 2));
  console.log(`Saved extraction log to: ${logPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
