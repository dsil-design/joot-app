/**
 * Find real refund/credit lines (negative amounts that aren't payments) in
 * each Chase statement. Used to verify what the surgical-append script will
 * actually pick up before running it.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createServiceRoleClient } from '../src/lib/supabase/server';
import { extractPDFText } from '../src/lib/statements/pdf-extractor';

async function main() {
  const sb = createServiceRoleClient();
  const { data: uploads } = await sb
    .from('statement_uploads')
    .select('id, filename, file_path, payment_methods(name)')
    .order('statement_period_end', { ascending: false, nullsFirst: false });

  const chase = (uploads || []).filter((u: any) =>
    /chase|sapphire/i.test(u.payment_methods?.name || '')
  );

  for (const u of chase as any[]) {
    const { data: file } = await sb.storage
      .from('statement-uploads')
      .download(u.file_path);
    if (!file) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    const r = await extractPDFText(buf);
    if (!r.success) continue;

    const lines = r.text.split('\n').map((l) => l.trim()).filter(Boolean);
    const credits: string[] = [];

    for (const line of lines) {
      // Must start with a date
      if (!/^\d{1,2}\/\d{1,2}\s+/.test(line)) continue;
      // Skip the rate line
      if (/\bX\s*[\d.]+\s*\(EXCHG/i.test(line)) continue;
      // Skip headers
      if (/total|balance|interest charged|previous balance|new balance/i.test(line)) continue;
      // Must end in a NEGATIVE amount (with optional glued sign)
      if (!/-[\d,]+\.\d{2}\s*$/.test(line)) continue;
      // Skip Chase autopay
      if (/automatic\s+payment|payment.*thank\s+you/i.test(line)) continue;

      credits.push(line);
    }

    console.log(`\n## ${u.filename}`);
    if (credits.length === 0) {
      console.log('  (no non-payment credits/refunds found)');
    } else {
      for (const c of credits) console.log(`  ${c}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
