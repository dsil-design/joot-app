import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STUCK_IDS = [
  "c5ef0403-f7fd-4a45-8092-0b2e72633e1c",
  "1e8a5b78-3e4d-4f1e-9111-309d739b9b73",
  "b147dbfa-3c20-4882-a8b9-7c22742c06d0",
];

async function main() {
  for (const id of STUCK_IDS) {
    console.log("\n========================================");
    console.log("Email ID:", id);
    console.log("========================================");

    const { data: et, error } = await supabase
      .from("email_transactions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.log("ERROR fetching:", error);
      continue;
    }
    if (!et) {
      console.log("NOT FOUND in email_transactions");
      continue;
    }

    console.log("status:", et.status);
    console.log("source_type:", et.source_type);
    console.log("vendor:", et.vendor_name);
    console.log("subject:", et.subject);
    console.log("email_date:", et.email_date);
    console.log("amount:", et.amount, et.currency);
    console.log("payment_method:", et.payment_method);
    console.log("payment_context:", et.payment_context);
    console.log("classification_reason:", et.classification_reason);
    console.log("matched_transaction_id:", et.matched_transaction_id);
    console.log("paired_statement_id:", et.paired_statement_id);
    console.log("paired_email_id:", et.paired_email_id);
    console.log("paired_payment_slip_id:", et.paired_payment_slip_id);
    console.log("created_at:", et.created_at);
    console.log("updated_at:", et.updated_at);
    console.log("user_id:", et.user_id);

    // Print all columns we may not know about
    console.log("\nAll fields:");
    console.log(JSON.stringify(et, null, 2));

    // Look for candidate statement transactions within +/- 7 days
    if (et.email_date && et.amount) {
      const date = new Date(et.email_date);
      const start = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
      const end = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);

      console.log("\n--- candidate statement_transactions (same user, +/- 7d) ---");
      const { data: stmtCandidates } = await supabase
        .from("statement_transactions")
        .select("id, transaction_date, post_date, amount, currency, description, foreign_amount, foreign_currency, status, paired_email_id, paired_payment_slip_id")
        .eq("user_id", et.user_id)
        .gte("transaction_date", start.toISOString().slice(0, 10))
        .lte("transaction_date", end.toISOString().slice(0, 10))
        .order("transaction_date");
      console.log(JSON.stringify(stmtCandidates, null, 2));

      console.log("\n--- candidate payment_slips (same user, +/- 7d) ---");
      const { data: slipCandidates } = await supabase
        .from("payment_slips")
        .select("id, slip_date, amount, currency, sender, recipient, status, paired_email_id, paired_statement_id")
        .eq("user_id", et.user_id)
        .gte("slip_date", start.toISOString().slice(0, 10))
        .lte("slip_date", end.toISOString().slice(0, 10))
        .order("slip_date");
      console.log(JSON.stringify(slipCandidates, null, 2));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
