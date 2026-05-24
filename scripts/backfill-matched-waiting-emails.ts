/**
 * Backfill: email_transactions rows that have a matched_transaction_id set but
 * are still status='waiting_for_statement' (or other waiting states). This was
 * caused by a bug in waiting-resolver.ts that wrote matched_transaction_id
 * without updating status.
 *
 * Usage:
 *   npx tsx scripts/backfill-matched-waiting-emails.ts          # dry-run
 *   npx tsx scripts/backfill-matched-waiting-emails.ts --apply  # apply updates
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(APPLY ? "=== APPLY MODE ===" : "=== DRY-RUN (no writes) — pass --apply to commit ===");

  // Find email_transactions that have a matched_transaction_id AND are still in a "waiting_*" status.
  const { data: stuck, error } = await supabase
    .from("email_transactions")
    .select("id, user_id, status, matched_transaction_id, match_confidence, match_method, vendor_name_raw, subject, amount, currency, transaction_date")
    .not("matched_transaction_id", "is", null)
    .in("status", ["waiting_for_statement", "waiting_for_email", "waiting_for_slip"]);

  if (error) {
    console.error("Query error:", error);
    process.exit(1);
  }

  if (!stuck || stuck.length === 0) {
    console.log("Nothing to backfill — no matched-but-waiting rows found.");
    return;
  }

  console.log(`\nFound ${stuck.length} candidate rows.`);

  // Validate: for each row, confirm the matched transaction still exists.
  const txIds = Array.from(new Set(stuck.map((s) => s.matched_transaction_id!).filter(Boolean)));
  const { data: existingTxs } = await supabase
    .from("transactions")
    .select("id")
    .in("id", txIds);
  const validTxIds = new Set((existingTxs ?? []).map((t) => t.id));

  const toUpdate: typeof stuck = [];
  const orphans: typeof stuck = [];
  for (const row of stuck) {
    if (validTxIds.has(row.matched_transaction_id!)) {
      toUpdate.push(row);
    } else {
      orphans.push(row);
    }
  }

  console.log(`  ${toUpdate.length} will be flipped to status='matched'`);
  console.log(`  ${orphans.length} have orphan matched_transaction_id (target row deleted) — will be SKIPPED, not touched`);

  console.log("\n--- ROWS TO UPDATE ---");
  for (const r of toUpdate) {
    console.log(`  ${r.id.slice(0, 8)} status=${r.status.padEnd(22)} conf=${String(r.match_confidence ?? "-").padStart(3)} method=${String(r.match_method ?? "-").padEnd(12)} ${r.transaction_date} ${r.currency} ${String(r.amount).padStart(8)}  ${r.vendor_name_raw ?? r.subject ?? ""}`);
  }

  if (orphans.length > 0) {
    console.log("\n--- ORPHANS (matched_transaction_id points to a deleted row; NOT touched) ---");
    for (const r of orphans) {
      console.log(`  ${r.id.slice(0, 8)} status=${r.status.padEnd(22)} matched_tx=${r.matched_transaction_id?.slice(0, 8)}  ${r.vendor_name_raw ?? r.subject ?? ""}`);
    }
  }

  if (!APPLY) {
    console.log("\nDry-run complete. Re-run with --apply to commit.");
    return;
  }

  console.log("\nApplying updates...");
  const ids = toUpdate.map((r) => r.id);
  const nowIso = new Date().toISOString();
  // Update in batches of 100 to keep URL length sane.
  const batchSize = 100;
  let updated = 0;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const { error: updErr, count } = await supabase
      .from("email_transactions")
      .update({ status: "matched", matched_at: nowIso }, { count: "exact" })
      .in("id", batch);
    if (updErr) {
      console.error(`Batch ${i / batchSize + 1} failed:`, updErr);
      process.exit(1);
    }
    updated += count ?? batch.length;
    console.log(`  batch ${i / batchSize + 1}: updated ${count ?? batch.length} rows`);
  }
  console.log(`\nDone. Updated ${updated} rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
