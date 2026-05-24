/**
 * Backfill: email_transactions where ai_classification = 'upcoming_charge_notice'
 * and status = 'waiting_for_statement'. These can never match a statement (they
 * describe a future debit that hasn't happened yet), so they should be routed
 * to pending_review per the new upcoming_charge_notice_review classifier rule.
 *
 * Usage:
 *   npx tsx scripts/backfill-upcoming-charge-notices.ts          # dry-run
 *   npx tsx scripts/backfill-upcoming-charge-notices.ts --apply  # commit
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

  const { data, error } = await supabase
    .from("email_transactions")
    .select("id, status, vendor_name_raw, subject, amount, currency, transaction_date, matched_transaction_id")
    .eq("ai_classification", "upcoming_charge_notice")
    .eq("status", "waiting_for_statement");

  if (error) {
    console.error(error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("Nothing to backfill.");
    return;
  }

  console.log(`\nFound ${data.length} rows to flip to pending_review:`);
  for (const r of data) {
    const matched = r.matched_transaction_id ? " (has matched_tx, will SKIP)" : "";
    console.log(`  ${r.id.slice(0, 8)} ${r.transaction_date ?? "----------"} ${r.currency ?? "-"} ${String(r.amount ?? "-").padStart(8)}  ${r.vendor_name_raw ?? r.subject ?? ""}${matched}`);
  }

  // Don't touch rows that already have a matched_transaction_id — those are
  // handled by a separate backfill. Here we only fix the truly-stuck ones.
  const toUpdate = data.filter((r) => !r.matched_transaction_id);
  if (toUpdate.length !== data.length) {
    console.log(`\n  (Skipping ${data.length - toUpdate.length} with matched_transaction_id — separate backfill)`);
  }

  if (!APPLY) {
    console.log("\nDry-run complete. Re-run with --apply to commit.");
    return;
  }

  if (toUpdate.length === 0) {
    console.log("\nNothing to update.");
    return;
  }

  const { error: updErr, count } = await supabase
    .from("email_transactions")
    .update({ status: "pending_review" }, { count: "exact" })
    .in("id", toUpdate.map((r) => r.id));

  if (updErr) {
    console.error(updErr);
    process.exit(1);
  }
  console.log(`\nUpdated ${count ?? toUpdate.length} rows.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
