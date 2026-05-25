import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Suggestion {
  transaction_date?: string;
  description?: string;
  amount?: number;
  currency?: string;
  matched_transaction_id?: string | null;
  original_matched_transaction_id?: string | null;
  confidence?: number;
  is_new?: boolean;
  status?: string;
  reasons?: string[];
  foreign_transaction?: unknown;
}

async function main() {
  // 1. Find candidate Kasikorn statement uploads that touch April 2026
  const { data: stmts, error } = await supabase
    .from("statement_uploads")
    .select(
      "id, user_id, filename, status, statement_period_start, statement_period_end, transactions_extracted, transactions_matched, transactions_new, extraction_error, extraction_started_at, extraction_completed_at, payment_method_id, payment_methods ( name, type ), extraction_log"
    )
    .or(
      "filename.ilike.%kasikorn%,filename.ilike.%kbank%,filename.ilike.%k-bank%,filename.ilike.%kplus%,filename.ilike.%k plus%"
    )
    .order("extraction_started_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }

  if (!stmts || stmts.length === 0) {
    console.log("No Kasikorn-named statement uploads found by filename. Falling back to payment_method.name ilike kasikorn...");

    const { data: pm } = await supabase
      .from("payment_methods")
      .select("id, name")
      .or("name.ilike.%kasikorn%,name.ilike.%kbank%,name.ilike.%k-bank%,name.ilike.%k plus%,name.ilike.%kplus%");

    console.log("Matching payment methods:", pm);
    if (pm && pm.length > 0) {
      const { data: stmts2 } = await supabase
        .from("statement_uploads")
        .select(
          "id, user_id, filename, status, statement_period_start, statement_period_end, transactions_extracted, transactions_matched, transactions_new, extraction_error, extraction_started_at, extraction_completed_at, payment_method_id, extraction_log"
        )
        .in("payment_method_id", pm.map((p) => p.id))
        .order("extraction_started_at", { ascending: false })
        .limit(20);
      console.log(`Found ${stmts2?.length ?? 0} uploads via payment_method`);
      stmts2?.forEach((s) => printStatement(s));
    }
    return;
  }

  console.log(`Found ${stmts.length} candidate Kasikorn statement uploads.\n`);
  for (const s of stmts) {
    printStatement(s);
  }
}

function printStatement(s: Record<string, unknown>) {
  console.log("─".repeat(80));
  console.log("statement_upload.id:", s.id);
  console.log("filename:", s.filename);
  console.log("status:", s.status);
  console.log("period_start:", s.statement_period_start, "period_end:", s.statement_period_end);
  console.log("payment_method:", (s as { payment_methods?: { name?: string; type?: string } }).payment_methods);
  console.log("payment_method_id:", s.payment_method_id);
  console.log(
    "transactions_extracted:", s.transactions_extracted,
    "matched:", s.transactions_matched,
    "new:", s.transactions_new
  );
  console.log("extraction_started:", s.extraction_started_at, "completed:", s.extraction_completed_at);
  if (s.extraction_error) console.log("ERROR:", s.extraction_error);

  const log = s.extraction_log as { suggestions?: Suggestion[]; transactions?: unknown[]; parser_used?: string; warnings?: string[] } | null;
  console.log("parser_used:", log?.parser_used);
  console.log("warnings:", log?.warnings);
  const txns = log?.transactions ?? [];
  const suggs = log?.suggestions ?? [];
  console.log("extraction_log.transactions.length:", txns.length);
  console.log("extraction_log.suggestions.length:", suggs.length);

  if (suggs.length === 0 && txns.length > 0) {
    console.log("⚠️  WARNING: transactions extracted but suggestions array is EMPTY.");
  }

  // Per-suggestion summary for items in April 2026 (or all if none in April).
  const april = suggs.filter((x) => (x.transaction_date ?? "").startsWith("2026-04"));
  const sample = april.length > 0 ? april : suggs.slice(0, 10);
  console.log(`\nSuggestion sample (${april.length > 0 ? "April 2026 only" : "first 10"}): ${sample.length} of ${suggs.length}`);

  const byStatus = new Map<string, number>();
  for (const s2 of suggs) {
    const k = s2.status ?? "(unset)";
    byStatus.set(k, (byStatus.get(k) ?? 0) + 1);
  }
  console.log("Status distribution across ALL suggestions:");
  for (const [k, v] of byStatus) console.log(`  ${k}: ${v}`);

  for (const x of sample) {
    console.log(
      "  -",
      x.transaction_date,
      `${x.amount} ${x.currency}`,
      "status=" + (x.status ?? "(unset)"),
      "matched_tx=" + (x.matched_transaction_id ?? "(null)"),
      "is_new=" + x.is_new,
      "conf=" + x.confidence,
      "| " + (x.description ?? "").slice(0, 60)
    );
  }
  console.log();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
