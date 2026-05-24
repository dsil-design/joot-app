import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const USER_ID = "a1c3caff-a5de-4898-be7d-ab4b76247ae6";

async function main() {
  // For each relevant statement, list ALL suggestions in full
  const stmtIds = [
    "ea05f21d-9eb7-4e3f-a239-2d747efdc860", // 2026-05_Personal_Checking - has T-Mobile $75
    "01e194e8-a47f-4605-ae9b-30a2776c7fcc", // 2026-04_Personal_Checking - has T-Mobile $75 (rejected)
    "984828e8-dead-4cde-bca2-9e9ce77f0aaf", // Has the rejected Grab pair (#56)
    "42279c85-c638-49ab-b813-cf54bd288d65", // 2026-05 cc 0599 statement (later period)
    "344bc35b-3571-407e-9e13-136a49ec32dc", // 2026-04 cc statement
  ];

  for (const sid of stmtIds) {
    const { data: full } = await supabase
      .from("statement_uploads")
      .select("id, filename, statement_period_start, statement_period_end, extraction_log")
      .eq("id", sid)
      .single();
    const suggestions = ((full?.extraction_log as { suggestions?: Array<Record<string, unknown>> } | null)?.suggestions) ?? [];
    console.log(`\n=== Statement ${sid} (${full?.filename}, ${full?.statement_period_start}..${full?.statement_period_end}) ===`);
    console.log(`Total suggestions: ${suggestions.length}`);

    // Show entries that look like Grab, T-Mobile, or are near $7-9 USD or $75
    suggestions.forEach((s, i) => {
      const desc = String(s.description || s.merchant || "").toLowerCase();
      const amount = Number(s.amount ?? 0);
      const isGrab = desc.includes("grab");
      const isTMobile = desc.includes("t-mobile") || desc.includes("tmobile");
      const isAmount75 = Math.abs(amount - 75) < 0.5;
      const isSmallUsd = amount >= 7 && amount <= 9;
      if (isGrab || isTMobile || (isAmount75) || isSmallUsd) {
        console.log(`  [#${i}] status=${s.status ?? "(pending)"} amount=${s.amount} ${s.currency} date=${s.transaction_date} desc="${s.description ?? s.merchant}" foreign=${JSON.stringify(s.foreign_transaction ?? null)} matched=${s.matched_transaction_id ?? "-"}`);
      }
    });
  }

  // ALSO: Check ALL emails for the user with status=waiting_for_statement to see how many are similarly stuck
  console.log("\n\n=== ALL waiting_for_statement emails for the user ===");
  const { data: allWaiting } = await supabase
    .from("email_transactions")
    .select("id, vendor_name_raw, subject, amount, currency, transaction_date, matched_transaction_id, match_confidence, rejected_pair_keys, parser_key, classification, ai_classification")
    .eq("user_id", USER_ID)
    .eq("status", "waiting_for_statement")
    .order("transaction_date", { ascending: false });
  console.log(`Total waiting: ${allWaiting?.length ?? 0}`);
  for (const e of allWaiting ?? []) {
    const hasRej = (e.rejected_pair_keys?.length ?? 0) > 0;
    const hasMatch = !!e.matched_transaction_id;
    const flag = hasMatch ? "★MATCHED-BUT-STILL-WAITING" : hasRej ? "⚠REJECTED-PAIRS" : "";
    console.log(`  ${e.id.slice(0, 8)} ${e.transaction_date} ${e.currency} ${String(e.amount).padStart(8)} ${String(e.parser_key ?? "-").padEnd(12)} ${String(e.vendor_name_raw ?? "-").padEnd(20)} ${flag}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
