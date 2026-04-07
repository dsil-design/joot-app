/**
 * Surgical-append Chase missed transactions.
 *
 * Backs up each Chase statement's extraction_log, then APPENDS new
 * pending-status suggestions for transaction lines the original parser
 * silently dropped (glued state codes, glued negative signs, etc.).
 *
 * Why append instead of reprocess? Reprocessing wholly overwrites
 * extraction_log, which would:
 *   - reset every approved suggestion back to pending
 *   - invalidate every transactions.source_statement_suggestion_index FK
 *     (positions shift when new entries are inserted)
 *   - silently break any email_transactions.manual_pair_keys that reference
 *     stmt:<uploadId>:<index> composites
 *
 * Append-only writes preserve all existing positional indices and approval
 * state. New entries land at the END of the suggestions array as fresh
 * pending items, just as if the user had uploaded the statement today.
 *
 * Filters:
 *   - SKIP Chase autopay ("automatic payment", "payment thank you")
 *   - SKIP "TRAVEL CREDIT" lines per user preference (set INCLUDE_TRAVEL_CREDIT=1 to keep)
 *   - KEEP everything else (charges + refunds)
 *
 * Special: the Jan '26 statement (22f7c94f) is reset to a clean state first
 * (clear all matched_transaction_id / status from existing suggestions) so
 * the user can review the whole thing fresh.
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/surgical-append-chase-missed.ts   # default — print plan, no writes
 *   npx tsx scripts/surgical-append-chase-missed.ts              # actually write
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createServiceRoleClient } from '../src/lib/supabase/server';
import { extractPDFText } from '../src/lib/statements/pdf-extractor';

const DRY_RUN = process.env.DRY_RUN !== '0'; // default ON
const INCLUDE_TRAVEL_CREDIT = process.env.INCLUDE_TRAVEL_CREDIT === '1';
const JAN_26_UPLOAD_ID = '22f7c94f-f68b-4881-8dcf-17d30a46f971';

// Relaxed transaction-line regex: same shape as the parser's strict one but
// allows zero-or-more whitespace before the amount (and the optional minus
// sign), so it captures glued state codes and glued payment signs.
//
// Capture groups:
//   1: txn date MM/DD
//   2: optional posting date MM/DD
//   3: description
//   4: amount with optional leading minus
const RELAXED_TXN =
  /^(\d{1,2}\/\d{1,2})\s+(?:(\d{1,2}\/\d{1,2})\s+)?(.+?)\s*(-?\$?[\d,]+\.\d{2})\s*$/;

// Lines we never want to count as transactions
const NOT_A_TXN =
  /total|previous balance|new balance|interest charged|payment due|payment information|account summary|fees? charged|account activity|merchant\s+name/i;

// Chase rate-block line (followed-line in foreign block)
const RATE_LINE = /\bX\s*[\d.]+\s*\(EXCHG/i;

// Skip filters per user requirements
const PAYMENT_LINE = /automatic\s+payment|payment.*thank\s+you/i;
const TRAVEL_CREDIT_LINE = /travel\s+credit/i;

// Currency-name word line in a foreign block (BAHT, DONG, etc.)
const FOREIGN_CURRENCY_WORD = /^(?:\d{1,2}\/\d{1,2}\s+)?([A-Z]{3,})\s*$/;
const FOREIGN_RATE = /^([\d,]+(?:\.\d+)?)\s*X\s*([\d.]+)\s*\(EXCHG\s*RATE\)\s*$/i;
const CURRENCY_WORD_TO_ISO: Record<string, string> = {
  BAHT: 'THB',
  DONG: 'VND',
  YEN: 'JPY',
  EURO: 'EUR',
  EUROS: 'EUR',
  POUND: 'GBP',
  POUNDS: 'GBP',
  PESO: 'MXN',
  PESOS: 'MXN',
  WON: 'KRW',
  YUAN: 'CNY',
  RUPEE: 'INR',
  RUPEES: 'INR',
  RUPIAH: 'IDR',
  RINGGIT: 'MYR',
  FRANC: 'CHF',
  FRANCS: 'CHF',
};
const NOISE_WORDS = new Set([
  'THE','AND','FOR','YOUR','TOTAL','PURCHASE','PURCHASES','PAYMENTS','CREDITS',
  'INTEREST','BALANCE','ACCOUNT','ACTIVITY','CONTINUED','USD',
]);

interface NewSuggestion {
  amount: number;
  currency: string;
  description: string;
  transaction_date: string;
  is_new: true;
  status: 'pending';
  confidence: 0;
  reasons: string[];
  matched_transaction_id?: undefined;
  original_matched_transaction_id: null;
  foreign_transaction?: {
    originalAmount: number;
    originalCurrency: string;
    exchangeRate?: number;
  };
}

interface ExistingSuggestion {
  amount: number;
  currency: string;
  description: string;
  transaction_date: string;
  is_new?: boolean;
  status?: string;
  matched_transaction_id?: string | null;
  [k: string]: unknown;
}

function parseAmount(str: string): number {
  const cleaned = str.replace(/[$,\s]/g, '');
  return parseFloat(cleaned);
}

function buildIsoDate(mmdd: string, periodEnd: string): string {
  // periodEnd format: '2026-03-18'. Determine the year for this MM/DD by
  // assuming the txn falls within (periodEnd - 60 days, periodEnd]. If MM is
  // greater than periodEnd's month and the day is plausible, use prev year.
  const [year, , ] = periodEnd.split('-').map((s) => parseInt(s, 10));
  const [m, d] = mmdd.split('/').map((s) => parseInt(s, 10));
  const periodEndDate = new Date(periodEnd + 'T00:00:00Z');
  let candidate = new Date(Date.UTC(year, m - 1, d));
  if (candidate.getTime() > periodEndDate.getTime() + 86400000) {
    candidate = new Date(Date.UTC(year - 1, m - 1, d));
  }
  return candidate.toISOString();
}

function extractForeignBlock(
  lines: string[],
  i: number
): { originalAmount: number; originalCurrency: string; exchangeRate: number } | undefined {
  // STRICT requirement to avoid stealing the following transaction's foreign
  // block: the very next non-empty line MUST be a bare currency word (with
  // optional posting-date prefix) AND the line after that MUST be the rate
  // line. If we encounter another transaction-shaped line first, bail out.
  let phase: 'expect-currency' | 'expect-rate' = 'expect-currency';
  let currencyWord: string | undefined;

  for (let j = i + 1; j < lines.length; j++) {
    const line = lines[j];
    if (!line) continue;

    // If we hit another dated transaction line before completing the block,
    // this transaction has no foreign info.
    if (RELAXED_TXN.test(line) && !FOREIGN_RATE.test(line) && !FOREIGN_CURRENCY_WORD.test(line)) {
      return undefined;
    }

    if (phase === 'expect-currency') {
      const wm = line.match(FOREIGN_CURRENCY_WORD);
      if (!wm) return undefined;
      const word = wm[1].toUpperCase();
      if (NOISE_WORDS.has(word)) return undefined;
      currencyWord = word;
      phase = 'expect-rate';
      continue;
    }

    // phase === 'expect-rate'
    const rm = line.match(FOREIGN_RATE);
    if (!rm) return undefined;
    const originalAmount = parseFloat(rm[1].replace(/,/g, ''));
    const exchangeRate = parseFloat(rm[2]);
    if (!currencyWord) return undefined;
    if (Math.abs(exchangeRate - 1) < 1e-9 && currencyWord === 'USD') return undefined;
    return {
      originalAmount,
      originalCurrency: CURRENCY_WORD_TO_ISO[currencyWord] || currencyWord,
      exchangeRate,
    };
  }
  return undefined;
}

function extractCandidateTransactions(
  text: string,
  periodEnd: string
): NewSuggestion[] {
  const lines = text.split('\n').map((l) => l.trim());
  const out: NewSuggestion[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (RATE_LINE.test(line)) continue;
    if (NOT_A_TXN.test(line)) continue;

    const m = line.match(RELAXED_TXN);
    if (!m) continue;
    const [, dateStr, , descRaw, amountStr] = m;
    const description = descRaw.trim();
    if (description.length < 5) continue;
    if (/^[\d$,.\s-]+$/.test(description)) continue;
    // Skip the foreign-block second line "<MM/DD> BAHT" which would also
    // technically match if the amount-side parser was lax (it isn't here,
    // because that line has no trailing amount). Belt-and-braces.
    if (/^[A-Z]{3,8}\s*$/.test(description)) continue;

    const amount = parseAmount(amountStr);
    if (isNaN(amount)) continue;

    // Apply user filters
    if (PAYMENT_LINE.test(description)) continue;
    if (!INCLUDE_TRAVEL_CREDIT && TRAVEL_CREDIT_LINE.test(description)) continue;

    const txn: NewSuggestion = {
      amount: Math.abs(amount), // store positive; sign is implied by type/direction
      currency: 'USD',
      description,
      transaction_date: buildIsoDate(dateStr, periodEnd),
      is_new: true,
      status: 'pending',
      confidence: 0,
      reasons: [],
      original_matched_transaction_id: null,
    };

    // Negative amount = credit/refund — preserve the sign on amount so the
    // review queue and approve flow recognize it as money in. The existing
    // parser convention stores negatives for credit/payment types.
    if (amount < 0) {
      txn.amount = -Math.abs(amount);
    }

    const fx = extractForeignBlock(lines, i);
    if (fx) txn.foreign_transaction = fx;

    out.push(txn);
  }

  return out;
}

function isDuplicate(
  candidate: NewSuggestion,
  existing: ExistingSuggestion[]
): boolean {
  const candDate = candidate.transaction_date.slice(0, 10);
  const candDesc = candidate.description.replace(/\s+/g, ' ').trim().toLowerCase();
  for (const e of existing) {
    const eDate = (e.transaction_date || '').slice(0, 10);
    if (eDate !== candDate) continue;
    if (Math.abs(Number(e.amount) - candidate.amount) > 0.001) continue;
    const eDesc = String(e.description || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (eDesc === candDesc) return true;
  }
  return false;
}

async function main() {
  const sb = createServiceRoleClient();

  const { data: uploads } = await sb
    .from('statement_uploads')
    .select('id, filename, file_path, statement_period_end, transactions_extracted, transactions_new, extraction_log, payment_methods(name)')
    .order('statement_period_end', { ascending: false, nullsFirst: false });

  const chase = (uploads || []).filter((u: any) =>
    /chase|sapphire/i.test(u.payment_methods?.name || '')
  );

  console.log(`# Surgical Chase append — ${DRY_RUN ? 'DRY RUN' : 'LIVE WRITE'}`);
  console.log(`# include_travel_credit=${INCLUDE_TRAVEL_CREDIT}`);
  console.log(`# ${chase.length} statements to inspect\n`);

  // Backup directory
  const backupDir = path.join(process.cwd(), 'scripts', 'backups', `chase-append-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  if (!DRY_RUN) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  let totalAppended = 0;

  for (const u of chase as any[]) {
    console.log(`## ${u.filename}  (${u.statement_period_end})`);

    // Backup
    if (!DRY_RUN) {
      const backupPath = path.join(backupDir, `${u.id}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(u.extraction_log, null, 2));
      console.log(`  backup → ${backupPath}`);
    }

    const extractionLog = (u.extraction_log || {}) as Record<string, unknown>;
    let suggestions = (extractionLog.suggestions || []) as ExistingSuggestion[];

    // Special handling for Jan '26: clear matched_transaction_id and status
    // on existing suggestions so the whole thing is re-reviewable from a
    // clean state. The user has 0 actual transactions linked back to this
    // upload (txns_linked_back=0 in audit), so this is non-destructive — we
    // only touch in-extraction_log fields.
    if (u.id === JAN_26_UPLOAD_ID) {
      console.log(`  ⚠ Jan '26 special: resetting status/matched_transaction_id on ${suggestions.length} existing suggestions`);
      suggestions = suggestions.map((s) => ({
        ...s,
        status: 'pending',
        matched_transaction_id: undefined,
        original_matched_transaction_id: null,
        is_new: true,
        confidence: 0,
        reasons: [],
      }));
    }

    // Re-extract PDF text
    const { data: file } = await sb.storage.from('statement-uploads').download(u.file_path);
    if (!file) {
      console.log(`  ✗ download failed, skipping`);
      continue;
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const r = await extractPDFText(buf);
    if (!r.success) {
      console.log(`  ✗ extract failed, skipping`);
      continue;
    }

    // Find candidate transactions with the relaxed regex
    const candidates = extractCandidateTransactions(r.text, u.statement_period_end);

    // Filter to ones not already in suggestions
    const toAppend = candidates.filter((c) => !isDuplicate(c, suggestions));

    console.log(`  candidates from PDF: ${candidates.length}, already in suggestions: ${candidates.length - toAppend.length}, to append: ${toAppend.length}`);

    if (toAppend.length > 0) {
      const sample = toAppend.slice(0, 5);
      for (const s of sample) {
        const sign = s.amount < 0 ? '-' : '';
        const fx = s.foreign_transaction
          ? ` [${s.foreign_transaction.originalAmount} ${s.foreign_transaction.originalCurrency}]`
          : '';
        console.log(`    + ${s.transaction_date.slice(0, 10)}  ${sign}$${Math.abs(s.amount).toFixed(2).padStart(8)}  ${s.description}${fx}`);
      }
      if (toAppend.length > 5) console.log(`    ... and ${toAppend.length - 5} more`);
    }

    // Build new suggestions array
    const newSuggestions = [...suggestions, ...toAppend];

    if (DRY_RUN) {
      console.log(`  (dry run — no write)`);
    } else {
      // Persist
      const newExtractionLog = { ...extractionLog, suggestions: newSuggestions };
      const newCounts = {
        transactions_extracted: newSuggestions.length,
        transactions_new: newSuggestions.filter((s) => (s.status || 'pending') === 'pending').length,
        // Keep status as ready_for_review so the queue picks them up
        status: 'ready_for_review',
        extraction_log: newExtractionLog,
      };
      const { error: updErr } = await sb
        .from('statement_uploads')
        .update(newCounts)
        .eq('id', u.id);
      if (updErr) {
        console.log(`  ✗ write failed: ${updErr.message}`);
      } else {
        console.log(`  ✓ wrote ${toAppend.length} new suggestions, total now ${newSuggestions.length}`);
      }
    }

    totalAppended += toAppend.length;
    console.log();
  }

  console.log(`# Total appended across all statements: ${totalAppended}`);
  if (DRY_RUN) {
    console.log(`#`);
    console.log(`# This was a DRY RUN. To actually write, re-run with:`);
    console.log(`#   DRY_RUN=0 npx tsx scripts/surgical-append-chase-missed.ts`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
