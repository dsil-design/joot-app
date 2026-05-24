#!/usr/bin/env tsx
/**
 * Reproduce the AmEx parser run on the failed statement to find the
 * mismatch between the PDF text and the regex patterns.
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: path.resolve(__dirname, '../../.env.local') });

import { extractPDFText } from '../../src/lib/statements/pdf-extractor';
import { amexParser } from '../../src/lib/statements/parsers/amex';

async function main() {
  const pdfPath = path.resolve(
    __dirname,
    'failed-statement-ba55f95a-ff8f-4f1a-8602-4f8de811dfad.pdf'
  );
  const buf = fs.readFileSync(pdfPath);

  const extraction = await extractPDFText(buf);
  if (!extraction.success) {
    console.error('Extraction failed:', extraction.errors);
    return;
  }

  const textPath = path.resolve(__dirname, 'failed-statement.txt');
  fs.writeFileSync(textPath, extraction.text);
  console.log(`Extracted ${extraction.text.length} chars / ${extraction.pageCount} pages → ${textPath}`);

  console.log('\nFirst 1500 chars:');
  console.log(extraction.text.slice(0, 1500));

  console.log('\n--- Running AmEx parser ---');
  const result = amexParser.parse(extraction.text, { includeRawText: false });
  console.log(`canParse=${amexParser.canParse(extraction.text)}`);
  console.log(`success=${result.success} confidence=${result.confidence}`);
  console.log(`period=${result.period?.startDate?.toISOString()} → ${result.period?.endDate?.toISOString()}`);
  console.log(`summary=`, result.summary);
  console.log(`transactions=${result.transactions.length}`);
  console.log(`warnings=`, result.warnings);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
