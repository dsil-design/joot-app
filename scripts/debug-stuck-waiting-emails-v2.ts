import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const USER_ID = "a1c3caff-a5de-4898-be7d-ab4b76247ae6";

// (email_id, email_date, amount, currency)
const STUCK = [
  { id: "c5ef0403-f7fd-4a45-8092-0b2e72633e1c", date: "2026-04-11", amount: 75, currency: "USD", desc: "T-Mobile bill" },
  { id: "1e8a5b78-3e4d-4f1e-9111-309d739b9b73", date: "2026-04-08", amount: 265, currency: "THB", desc: "Grab #2", rejPairKey: "984828e8-dead-4cde-bca2-9e9ce77f0aaf:56" },
  { id: "b147dbfa-3c20-4882-a8b9-7c22742c06d0", date: "2026-04-07", amount: 267, currency: "THB", desc: "Grab #3", matchedTx: "eb7d0d98-6840-4c5f-82da-a5c0a3f793dc" },
];

async function main() {
  // 1. Look up the matched transaction for email #3
  console.log("\n=== matched transaction eb7d0d98 (email #3 matched_transaction_id) ===");
  const { data: matched } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", "eb7d0d98-6840-4c5f-82da-a5c0a3f793dc")
    .maybeSingle();
  console.log(JSON.stringify(matched, null, 2));

  // 2. Look up the rejected pair key statement upload for email #2
  console.log("\n=== rejected pair key statement upload 984828e8 (email #2) ===");
  const { data: rejStmt } = await supabase
    .from("statement_uploads")
    .select("id, filename, status, statement_period_start, statement_period_end, payment_method_id, transactions_extracted")
    .eq("id", "984828e8-dead-4cde-bca2-9e9ce77f0aaf")
    .maybeSingle();
  console.log(JSON.stringify(rejStmt, null, 2));

  if (rejStmt) {
    const { data: rejStmtFull } = await supabase
      .from("statement_uploads")
      .select("extraction_log")
      .eq("id", "984828e8-dead-4cde-bca2-9e9ce77f0aaf")
      .single();
    const sugg = (rejStmtFull?.extraction_log as { suggestions?: Array<Record<string, unknown>> } | null)?.suggestions ?? [];
    console.log("suggestion #56 (the rejected one):");
    console.log(JSON.stringify(sugg[56], null, 2));
  }

  // 3. For each stuck email, list ALL statement_uploads for the user with extraction_log around the email date
  console.log("\n=== all statement_uploads for user (status ready_for_review/in_review/done) ===");
  const { data: allStmts } = await supabase
    .from("statement_uploads")
    .select("id, filename, status, statement_period_start, statement_period_end, payment_method_id, transactions_extracted")
    .eq("user_id", USER_ID)
    .in("status", ["ready_for_review", "in_review", "done"])
    .order("statement_period_start", { ascending: false });
  console.log(JSON.stringify(allStmts, null, 2));

  // 4. For each Grab email, scan all those statements' extraction_log.suggestions for any
  //    suggestion that COULD match (close amount around the email date, after FX conversion ~$7.5 USD = 265 THB)
  for (const stuck of STUCK) {
    if (stuck.currency !== "THB") continue;
    const usdEstimate = stuck.amount / 35; // rough THB→USD
    console.log(`\n--- Candidate statement suggestions for email ${stuck.id} (${stuck.desc}, ${stuck.amount} THB ≈ $${usdEstimate.toFixed(2)}) ---`);

    for (const stmt of allStmts ?? []) {
      const { data: full } = await supabase
        .from("statement_uploads")
        .select("extraction_log")
        .eq("id", stmt.id)
        .single();
      const suggestions = ((full?.extraction_log as { suggestions?: Array<Record<string, unknown>> } | null)?.suggestions) ?? [];
      const stuckDate = new Date(stuck.date);
      const matches = suggestions
        .map((s, i) => ({ ...s, _idx: i }))
        .filter((s) => {
          const desc = String(s.description || s.merchant || "").toLowerCase();
          const amount = Number(s.amount ?? 0);
          const date = s.date ? new Date(String(s.date)) : null;
          const dayDiff = date ? Math.abs((date.getTime() - stuckDate.getTime()) / (1000 * 60 * 60 * 24)) : 99;
          // candidate = within 7 days AND (mentions Grab OR amount within $3 of estimate)
          const isGrabLike = desc.includes("grab");
          const amountClose = Math.abs(amount - usdEstimate) < 3;
          return dayDiff < 7 && (isGrabLike || amountClose);
        });
      if (matches.length > 0) {
        console.log(`  Statement ${stmt.id} (${stmt.filename}, ${stmt.statement_period_start}..${stmt.statement_period_end}):`);
        for (const m of matches) {
          console.log(`    [#${m._idx}] amount=${m.amount} date=${m.date} desc=${m.description ?? m.merchant} foreign=${m.foreign_amount ?? "-"} ${m.foreign_currency ?? ""} status=${m.status ?? "-"} matched_tx=${m.matched_transaction_id ?? "-"} paired_email=${m.paired_email_id ?? "-"}`);
        }
      }
    }
  }

  // 5. For the T-Mobile email, look for transactions or statement entries around $75
  console.log("\n--- USD $75 candidates around 2026-04-11 (T-Mobile email) ---");
  for (const stmt of allStmts ?? []) {
    const { data: full } = await supabase
      .from("statement_uploads")
      .select("extraction_log")
      .eq("id", stmt.id)
      .single();
    const suggestions = ((full?.extraction_log as { suggestions?: Array<Record<string, unknown>> } | null)?.suggestions) ?? [];
    const matches = suggestions
      .map((s, i) => ({ ...s, _idx: i }))
      .filter((s) => {
        const desc = String(s.description || s.merchant || "").toLowerCase();
        const amount = Number(s.amount ?? 0);
        return desc.includes("t-mobile") || desc.includes("tmobile") || Math.abs(amount - 75) < 0.5;
      });
    if (matches.length > 0) {
      console.log(`  Statement ${stmt.id} (${stmt.filename}):`);
      for (const m of matches) {
        console.log(`    [#${m._idx}] amount=${m.amount} date=${m.date} desc=${m.description ?? m.merchant} status=${m.status ?? "-"}`);
      }
    }
  }

  // 6. Also look at the regular `transactions` table around these dates
  console.log("\n=== transactions table search around April 2026 ===");
  const { data: txs } = await supabase
    .from("transactions")
    .select("id, transaction_date, amount, original_amount, original_currency, vendor_id, description")
    .eq("user_id", USER_ID)
    .gte("transaction_date", "2026-04-01")
    .lte("transaction_date", "2026-04-30")
    .order("transaction_date");
  console.log(`Total transactions in April 2026: ${txs?.length}`);
  // print Grab/T-Mobile ones
  const interesting = (txs ?? []).filter(t =>
    /grab|t.?mobile/i.test(t.description ?? "") ||
    Math.abs(Number(t.original_amount ?? 0) - 265) < 5 ||
    Math.abs(Number(t.original_amount ?? 0) - 267) < 5 ||
    Math.abs(Number(t.original_amount ?? 0) - 75) < 1
  );
  console.log("Interesting (Grab/T-Mobile or matching amount):");
  console.log(JSON.stringify(interesting, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
