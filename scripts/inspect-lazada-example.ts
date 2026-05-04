import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const userId = "a1c3caff-a5de-4898-be7d-ab4b76247ae6";

async function main() {
  console.log("=== HUNT FOR $56.75 CHASE TRANSACTION (any currency, wider window) ===");
  const { data: txs } = await supabase
    .from("transactions")
    .select(
      "id, description, amount, original_currency, transaction_date, payment_method_id, vendor_id, source_email_transaction_id, source_statement_upload_id, payment_methods:payment_method_id(name), vendors:vendor_id(name)"
    )
    .eq("user_id", userId)
    .gte("transaction_date", "2026-03-15")
    .lte("transaction_date", "2026-04-05")
    .order("transaction_date", { ascending: true });
  const candidate = (txs || []).filter(
    (t) => Math.abs(Number(t.amount) - 56.75) < 0.5
  );
  console.log("Exact-ish 56.75:", JSON.stringify(candidate, null, 2));
  console.log(
    "All Chase transactions in window:",
    JSON.stringify(
      (txs || []).filter((t) =>
        ((t.payment_methods as { name?: string } | null)?.name || "")
          .toLowerCase()
          .includes("chase")
      ),
      null,
      2
    )
  );

  console.log("\n=== INSPECT THE PRECEDENT (March 10 dual-email match) ===");
  const { data: precedent } = await supabase
    .from("transactions")
    .select(
      "id, description, amount, original_currency, transaction_date, payment_method_id, vendor_id, source_email_transaction_id, source_statement_upload_id, payment_methods:payment_method_id(name), vendors:vendor_id(name)"
    )
    .eq("id", "7b185227-770b-4c66-9cb4-c76e4b4037fa");
  console.log(JSON.stringify(precedent, null, 2));

  console.log("\n=== EMAIL_LINKS / MULTI-LINK TABLES (look for any) ===");
  // Try checking activity log
  const { data: activity } = await supabase
    .from("transaction_activities")
    .select("*")
    .eq("transaction_id", "7b185227-770b-4c66-9cb4-c76e4b4037fa")
    .order("created_at", { ascending: false })
    .limit(20);
  console.log("transaction_activities:", JSON.stringify(activity, null, 2));

  console.log("\n=== STATEMENT UPLOADS NEAR MARCH 2026 ===");
  const { data: uploads } = await supabase
    .from("statement_uploads")
    .select("id, account_label, statement_period_start, statement_period_end, processing_status, created_at")
    .eq("user_id", userId)
    .gte("statement_period_end", "2026-03-15")
    .lte("statement_period_start", "2026-04-05")
    .order("created_at", { ascending: false });
  console.log(JSON.stringify(uploads, null, 2));

  console.log("\n=== STATEMENT TRANSACTIONS (raw line items) FOR ~$56.75 ===");
  const { data: stmtTxns } = await supabase
    .from("statement_transactions")
    .select("*")
    .gte("amount", 56)
    .lte("amount", 57.5)
    .gte("transaction_date", "2026-03-15")
    .lte("transaction_date", "2026-04-05");
  console.log(JSON.stringify(stmtTxns, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
