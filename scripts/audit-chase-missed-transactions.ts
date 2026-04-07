/**
 * Audit: how many transactions on each Chase statement were silently dropped
 * by the chase parser's whitespace-required regex?
 *
 * Chase prints domestic-US charges with the merchant state code glued to the
 * amount, e.g. "03/05     ANTHROPIC ANTHROPIC.COM CA5.00" — no space between
 * "CA" and "5.00". The TRANSACTION_PATTERN requires \s+ before the amount, so
 * these lines never match. Foreign charges have a space (because the city
 * name precedes the amount) and are captured normally.
 *
 * For each Chase upload we:
 *   1. Re-extract the raw text from storage
 *   2. Count lines that look like a transaction (starts with MM/DD)
 *   3. Count how many of those would be missed by the current regex
 *   4. Compare to transactions_extracted in DB
 *
 * Usage: npx tsx scripts/audit-chase-missed-transactions.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createServiceRoleClient } from '../src/lib/supabase/server';
import { extractPDFText } from '../src/lib/statements/pdf-extractor';

// Mirrors the parser's strict pattern: requires \s+ before the amount.
const STRICT_TXN = /^(\d{1,2}\/\d{1,2})\s+(?:(\d{1,2}\/\d{1,2})\s+)?(.+?)\s+([-]?\$?[\d,]+\.\d{2})$/;

// Lines that *start* with a date — candidate transaction lines, regardless of
// whether they have whitespace before the amount.
const ANY_DATED_LINE = /^(\d{1,2}\/\d{1,2})\s+.+/;

// A trailing amount of any kind (with or without preceding whitespace).
// Captures the description portion before so we can sanity-filter out the
// foreign-block "<amount> X <rate> (EXCHG RATE)" lines and posting-date-only
// lines.
const ANY_TRAILING_AMOUNT = /(.+?)([-]?\$?[\d,]+\.\d{2})\s*$/;

// The "<amount> X <rate> (EXCHG RATE)" line — not a transaction.
const RATE_LINE = /\bX\s*[\d.]+\s*\(EXCHG/i;

// Section/header words that look transaction-ish but aren't.
const NOT_A_TXN = /total|balance|payment\s+due|interest\s+charged|previous\s+balance|new\s+balance/i;

interface AuditRow {
  id: string;
  filename: string;
  period: string;
  pdfTxnLines: number;
  capturedByStrict: number;
  missedByStrict: number;
  inDb: number;
  missedExamples: string[];
}

async function main() {
  const sb = createServiceRoleClient();

  const { data: uploads, error } = await sb
    .from('statement_uploads')
    .select('id, filename, file_path, statement_period_start, statement_period_end, transactions_extracted, payment_method_id, payment_methods(name)')
    .order('statement_period_end', { ascending: false, nullsFirst: false });

  if (error || !uploads) {
    console.error('failed to fetch uploads', error);
    process.exit(1);
  }

  // Filter to Chase
  const chase = uploads.filter((u: any) =>
    /chase|sapphire/i.test(u.payment_methods?.name || '') ||
    /chase|sapphire/i.test(u.filename || '')
  );

  console.log(`# Auditing ${chase.length} Chase statements\n`);

  const rows: AuditRow[] = [];

  for (const u of chase as any[]) {
    const { data: file, error: dlErr } = await sb.storage
      .from('statement-uploads')
      .download(u.file_path);
    if (dlErr || !file) {
      console.error(`  ${u.filename}: download failed`, dlErr);
      continue;
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const r = await extractPDFText(buf);
    if (!r.success) {
      console.error(`  ${u.filename}: extract failed`, r.errors);
      continue;
    }

    const lines = r.text.split('\n').map((l) => l.trim()).filter(Boolean);

    let pdfTxnLines = 0;
    let capturedByStrict = 0;
    let missedByStrict = 0;
    const missedExamples: string[] = [];

    for (const line of lines) {
      // Must start with a date and contain a trailing amount
      if (!ANY_DATED_LINE.test(line)) continue;
      // Skip exchange-rate lines
      if (RATE_LINE.test(line)) continue;
      // Skip header/total lines
      if (NOT_A_TXN.test(line)) continue;
      // Must end in a numeric amount
      const trailing = line.match(ANY_TRAILING_AMOUNT);
      if (!trailing) continue;
      // Skip lines whose "description" before the amount is too short or
      // pure punctuation/whitespace — likely a fragment or summary line.
      const desc = trailing[1].replace(/\d{1,2}\/\d{1,2}\s+/, '').trim();
      if (desc.length < 5) continue;

      pdfTxnLines++;

      if (STRICT_TXN.test(line)) {
        capturedByStrict++;
      } else {
        missedByStrict++;
        if (missedExamples.length < 5) missedExamples.push(line);
      }
    }

    rows.push({
      id: u.id,
      filename: u.filename,
      period: `${u.statement_period_start} → ${u.statement_period_end}`,
      pdfTxnLines,
      capturedByStrict,
      missedByStrict,
      inDb: u.transactions_extracted ?? 0,
      missedExamples,
    });
  }

  // Print report
  console.log('## Per-statement summary\n');
  console.log('| period | filename | PDF txn lines | captured by strict | missed | DB extracted |');
  console.log('|---|---|---|---|---|---|');
  for (const r of rows) {
    console.log(
      `| ${r.period} | ${r.filename} | ${r.pdfTxnLines} | ${r.capturedByStrict} | **${r.missedByStrict}** | ${r.inDb} |`
    );
  }

  const totalMissed = rows.reduce((s, r) => s + r.missedByStrict, 0);
  const totalLines = rows.reduce((s, r) => s + r.pdfTxnLines, 0);
  const affected = rows.filter((r) => r.missedByStrict > 0).length;

  console.log(`\n## Totals\n`);
  console.log(`- Statements audited: ${rows.length}`);
  console.log(`- Statements affected by the bug (≥1 missed line): ${affected}`);
  console.log(`- Total transaction-shaped lines across all PDFs: ${totalLines}`);
  console.log(`- Total missed (would-be transactions silently dropped): ${totalMissed}`);
  console.log(`- Aggregate capture rate: ${((totalLines - totalMissed) / totalLines * 100).toFixed(1)}%`);

  console.log(`\n## Sample missed lines\n`);
  for (const r of rows) {
    if (r.missedExamples.length === 0) continue;
    console.log(`### ${r.filename}`);
    for (const ex of r.missedExamples) console.log(`  ${ex}`);
    console.log();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
