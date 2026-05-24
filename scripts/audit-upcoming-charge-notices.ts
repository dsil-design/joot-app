import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data } = await supabase
    .from("email_transactions")
    .select("id, status, vendor_name_raw, subject, amount, currency, transaction_date, parser_key, ai_classification, classification, matched_transaction_id")
    .eq("ai_classification", "upcoming_charge_notice")
    .order("transaction_date", { ascending: false });

  console.log(`Total upcoming_charge_notice emails: ${data?.length ?? 0}\n`);

  const byStatus = new Map<string, number>();
  for (const e of data ?? []) {
    byStatus.set(e.status, (byStatus.get(e.status) ?? 0) + 1);
  }
  console.log("By status:");
  for (const [s, c] of byStatus) console.log(`  ${s.padEnd(25)} ${c}`);

  console.log("\nDetail (sorted by status, then date):");
  const sorted = [...(data ?? [])].sort((a, b) => {
    if (a.status !== b.status) return a.status.localeCompare(b.status);
    return (b.transaction_date ?? "").localeCompare(a.transaction_date ?? "");
  });
  for (const e of sorted) {
    const matched = e.matched_transaction_id ? "★matched" : "";
    console.log(`  ${e.id.slice(0, 8)} ${e.status.padEnd(22)} ${e.transaction_date ?? "------"}  ${(e.currency ?? "-").padEnd(3)} ${String(e.amount ?? "-").padStart(8)}  ${(e.vendor_name_raw ?? e.subject ?? "").slice(0, 45).padEnd(45)} ${matched}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
