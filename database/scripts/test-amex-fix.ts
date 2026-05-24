#!/usr/bin/env tsx
/**
 * Validate the proposed parser fix: relax the multi-line date pattern to also
 * accept "date + trailing description on the same line", so the Hilton-Honors
 * Screen-Reader AmEx format is captured.
 */

import fs from 'fs';
import path from 'path';

const text = fs.readFileSync(
  path.resolve(__dirname, 'failed-statement.txt'),
  'utf8'
);
const lines = text.split('\n').map((l) => l.trim());

// PROPOSED: header (start) date line — date optionally followed by content
// (excluding the case where the same line ends in a dollar amount, which is
// the single-line format and handled elsewhere).
const headerLinePattern =
  /^(\d{1,2}\/\d{1,2}\/\d{2})(?:\s+(.+?))?$/;
const amountLinePattern = /^\$([\d,]+\.\d{2})(\s*CR)?$/i;

// Mirror parser's SECTION_HEADERS plus an explicit "details" table opener.
const SECTION_HEADERS: Record<string, RegExp> = {
  payments: /(?:payments?\s+(?:and\s+)?(?:other\s+)?credits?|credits?\s+and\s+payments?)/i,
  purchases: /(?:new\s+)?(?:charges?|purchases?|transactions?|activity)\s+details?$/i,
  feesDetails: /^fees?$/i,
  interestDetails: /^interest\s+charged?$/i,
  totals: /(?:total\s+(?:new\s+)?(?:charges?|balance|activity)|account\s+summary)/i,
  rewards: /(?:membership\s+rewards?|points?\s+(?:summary|earned))/i,
};
const TRANSACTION_SECTIONS = new Set(['payments', 'purchases', 'feesDetails']);

type Tx = { date: string; description: string; amount: number; section: string };
const txs: Tx[] = [];

let currentSection = '';
let i = 0;
while (i < lines.length) {
  // Update section tracking
  for (const [name, re] of Object.entries(SECTION_HEADERS)) {
    if (re.test(lines[i])) {
      currentSection = name;
      break;
    }
  }

  const m = lines[i].match(headerLinePattern);
  if (!m) {
    i++;
    continue;
  }
  // Only emit transactions inside known transaction sections.
  if (!TRANSACTION_SECTIONS.has(currentSection)) {
    i++;
    continue;
  }
  // Skip if the trailing content already contains a $amount (single-line case)
  const trailing = m[2] ?? '';
  if (/\$[\d,]+\.\d{2}/.test(trailing)) {
    i++;
    continue;
  }

  const date = m[1];
  const descParts: string[] = trailing ? [trailing] : [];
  const rawLines: string[] = [lines[i]];
  i++;

  let amount: number | null = null;
  while (i < lines.length) {
    const am = lines[i].match(amountLinePattern);
    if (am) {
      amount = parseFloat(am[1].replace(/,/g, ''));
      rawLines.push(lines[i]);
      i++;
      break;
    }
    if (headerLinePattern.test(lines[i])) break;
    if (lines[i]) descParts.push(lines[i]);
    rawLines.push(lines[i]);
    i++;
  }

  if (amount !== null && descParts.length > 0) {
    txs.push({
      date,
      description: descParts.join(' ').trim(),
      amount,
      section: currentSection,
    });
  }
}

console.log(`Captured ${txs.length} transactions:`);
for (const t of txs) {
  console.log(`  [${t.section}] ${t.date}  $${t.amount.toFixed(2)}  ${t.description.slice(0, 80)}`);
}
