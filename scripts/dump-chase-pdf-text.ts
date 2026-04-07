/**
 * One-off: download a Chase Sapphire statement PDF from Supabase storage,
 * extract raw text, and print blocks around foreign-currency markers so we
 * can see the exact line layout the parser needs to match.
 *
 * Usage: npx tsx scripts/dump-chase-pdf-text.ts [upload_id]
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createServiceRoleClient } from '../src/lib/supabase/server';
import { extractPDFText } from '../src/lib/statements/pdf-extractor';
import { chaseParser } from '../src/lib/statements/parsers/chase';

async function main() {
  const uploadId =
    process.argv[2] || '31e2b767-c29b-4013-875e-63b2ba823f26';
  const supabase = createServiceRoleClient();

  const { data: upload, error } = await supabase
    .from('statement_uploads')
    .select('id, filename, file_path')
    .eq('id', uploadId)
    .single();

  if (error || !upload) {
    console.error('upload not found', error);
    process.exit(1);
  }

  console.log(`# ${upload.filename} (${upload.id})`);

  const { data: file, error: dlErr } = await supabase.storage
    .from('statement-uploads')
    .download(upload.file_path);
  if (dlErr || !file) {
    console.error('download failed', dlErr);
    process.exit(1);
  }
  const buf = Buffer.from(await file.arrayBuffer());

  const result = await extractPDFText(buf);
  if (!result.success) {
    console.error('extract failed', result.errors);
    process.exit(1);
  }

  const lines = result.text.split('\n');
  console.log(`# total lines: ${lines.length}`);

  // Find lines containing currency-of-interest tokens or "EXCHG" / "rate"
  const markers =
    /(THB|VND|DONG|BAHT|EXCHG|EXCHANGE\s+RATE|FOREIGN|CURRENCY CONVERSION)/i;

  const hits: number[] = [];
  lines.forEach((l, i) => {
    if (markers.test(l)) hits.push(i);
  });

  console.log(`# marker hits: ${hits.length}`);
  console.log('---');

  // Print 4 lines of context around each hit
  const printed = new Set<number>();
  for (const i of hits) {
    for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 3); j++) {
      if (printed.has(j)) continue;
      printed.add(j);
      console.log(`${j.toString().padStart(4, '0')}: ${lines[j]}`);
    }
    console.log('---');
  }

  // Run the parser and report foreign-transaction extraction stats
  const parseResult = chaseParser.parse(result.text);
  const withForeign = parseResult.transactions.filter((t) => t.foreignTransaction);
  console.log(
    `\n# parser: ${parseResult.transactions.length} transactions, ${withForeign.length} with foreign details`
  );
  for (const t of withForeign.slice(0, 10)) {
    const ft = t.foreignTransaction!;
    console.log(
      `  ${t.transactionDate.toISOString().slice(0, 10)} ${t.description.slice(0, 40).padEnd(40)} $${t.amount.toFixed(2)}  →  ${ft.originalAmount} ${ft.originalCurrency} @ ${ft.exchangeRate}`
    );
  }

  // Also print a slice from the first known foreign txn area for orientation:
  // search for "HAI CHAU" / "DA NANG" / "HA NOI" to find the Vietnam block
  const idx = lines.findIndex((l) => /HAI CHAU|DA NANG|HA NOI/i.test(l));
  if (idx >= 0) {
    console.log('# Vietnam block context');
    for (let j = Math.max(0, idx - 2); j < Math.min(lines.length, idx + 15); j++) {
      console.log(`${j.toString().padStart(4, '0')}: ${lines[j]}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
