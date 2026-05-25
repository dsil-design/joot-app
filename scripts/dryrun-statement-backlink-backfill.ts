import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface Suggestion {
  transaction_date?: string;
  description?: string;
  amount?: number;
  currency?: string;
  matched_transaction_id?: string | null;
  status?: string;
  confidence?: number;
}

// Mirror the backfill's selection: any user, any pending statement suggestion
// whose matched Joot transaction is sourced from a slip/email but has no
// statement back-link yet. Report what *would* change, no writes.
async function main() {
  const { data: stmts, error } = await supabase
    .from("statement_uploads")
    .select("id, user_id, filename, status, extraction_log")
    .in("status", ["ready_for_review", "in_review", "done"]);

  if (error || !stmts) {
    console.error(error);
    return;
  }

  let totalCandidates = 0;
  let wouldApprove = 0;
  let skippedAlreadyLinkedElsewhere = 0;
  let skippedNoSourceFkOnTxn = 0;
  let skippedMissingTxn = 0;
  let perStatement = new Map<string, number>();

  for (const stmt of stmts) {
    const log = stmt.extraction_log as { suggestions?: Suggestion[] } | null;
    const suggs = log?.suggestions ?? [];

    const pending = suggs
      .map((s, idx) => ({ s, idx }))
      .filter(
        ({ s }) =>
          (!s.status || s.status === "pending") && !!s.matched_transaction_id,
      );

    if (pending.length === 0) continue;
    totalCandidates += pending.length;

    const matchedIds = Array.from(
      new Set(pending.map(({ s }) => s.matched_transaction_id!)),
    );
    const { data: txns } = await supabase
      .from("transactions")
      .select(
        "id, source_email_transaction_id, source_payment_slip_id, source_statement_upload_id",
      )
      .eq("user_id", stmt.user_id)
      .in("id", matchedIds);

    const byId = new Map<string, { id: string; source_email_transaction_id: string | null; source_payment_slip_id: string | null; source_statement_upload_id: string | null }>();
    for (const t of txns ?? []) byId.set(t.id, t);

    let stmtCount = 0;
    for (const { s, idx } of pending) {
      const t = byId.get(s.matched_transaction_id!);
      if (!t) {
        skippedMissingTxn++;
        continue;
      }
      if (t.source_statement_upload_id) {
        skippedAlreadyLinkedElsewhere++;
        continue;
      }
      if (!t.source_email_transaction_id && !t.source_payment_slip_id) {
        skippedNoSourceFkOnTxn++;
        continue;
      }
      wouldApprove++;
      stmtCount++;
      console.log(
        `WOULD APPROVE: stmt=${stmt.id.slice(0, 8)} (${stmt.filename}) idx=${idx} tx=${t.id.slice(0, 8)} via ${t.source_payment_slip_id ? "slip" : "email"}`,
      );
    }
    if (stmtCount > 0) perStatement.set(stmt.id, stmtCount);
  }

  console.log("\n=== Dry-run summary ===");
  console.log("statements scanned:", stmts.length);
  console.log("pending suggestions w/ matched_transaction_id:", totalCandidates);
  console.log("WOULD APPROVE:", wouldApprove);
  console.log("skipped (already linked to a statement):", skippedAlreadyLinkedElsewhere);
  console.log("skipped (matched txn has no slip/email source):", skippedNoSourceFkOnTxn);
  console.log("skipped (matched txn not found):", skippedMissingTxn);
  console.log("\nAffected statements:");
  for (const [id, n] of perStatement) console.log(`  ${id}: ${n}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
