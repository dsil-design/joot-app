import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STATEMENT_ID = "344bc35b-3571-407e-9e13-136a49ec32dc";

interface Suggestion {
  transaction_date?: string;
  description?: string;
  amount?: number;
  currency?: string;
  matched_transaction_id?: string | null;
  status?: string;
}

async function main() {
  const { data: stmt } = await supabase
    .from("statement_uploads")
    .select("user_id, extraction_log")
    .eq("id", STATEMENT_ID)
    .single();

  if (!stmt) {
    console.error("no statement");
    return;
  }

  const userId = stmt.user_id as string;
  const log = stmt.extraction_log as { suggestions?: Suggestion[] } | null;
  const suggs = log?.suggestions ?? [];
  const pending = suggs.filter((s) => !s.status || s.status === "pending");
  const matchedIds = Array.from(
    new Set(
      pending
        .map((s) => s.matched_transaction_id)
        .filter((id): id is string => !!id)
    )
  );

  // Inspect schema first
  const { data: oneTxn } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", matchedIds[0])
    .single();
  console.log("Sample transaction row columns:", oneTxn ? Object.keys(oneTxn).sort() : "none");
  console.log("First matched Joot transaction (full):");
  console.log(JSON.stringify(oneTxn, null, 2));

  // Now fetch all 30 with a generic select
  const { data: txns } = await supabase
    .from("transactions")
    .select("*")
    .in("id", matchedIds);

  console.log(`\nFetched ${txns?.length ?? 0} of ${matchedIds.length} matched Joot transactions`);

  const map = new Map<string, Record<string, unknown>>();
  for (const t of txns ?? []) map.set(t.id as string, t);

  console.log("\nPer-pending source-fk audit:");
  for (const s of pending) {
    const t = map.get(s.matched_transaction_id!);
    if (!t) {
      console.log(` ! [${s.transaction_date}] ${s.amount} ${s.currency} matched_tx=${s.matched_transaction_id} → NOT FOUND (deleted?)`);
      continue;
    }
    // Look for any column that hints "source"
    const sourceCols = Object.keys(t)
      .filter((k) => k.startsWith("source_") || k.includes("statement") || k.includes("payment_slip") || k.includes("email_transaction"))
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = t[k];
        return acc;
      }, {});
    console.log(
      ` • [${s.transaction_date}] ${s.amount} ${s.currency} matched_tx=${s.matched_transaction_id?.slice(0, 8)} → ${JSON.stringify(sourceCols)}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
