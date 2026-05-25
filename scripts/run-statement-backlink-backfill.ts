import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import { updateStatementReviewStatus } from "../src/lib/utils/statement-status";

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
  is_new?: boolean;
}

// Production-write version of the dry-run. Mirrors the runtime logic in
// src/lib/imports/statement-backlink-backfill.ts but scans all statements
// regardless of queue session, with the same idempotency guard.
async function main() {
  const { data: stmts, error } = await supabase
    .from("statement_uploads")
    .select("id, user_id, filename, status, extraction_log")
    .in("status", ["ready_for_review", "in_review", "done"]);

  if (error || !stmts) {
    console.error("fetch error:", error);
    process.exit(1);
  }

  let totalApproved = 0;
  let totalFailed = 0;
  const statementsTouched: string[] = [];

  for (const stmt of stmts) {
    const log = stmt.extraction_log as { suggestions?: Suggestion[]; [k: string]: unknown } | null;
    const suggestions = (log?.suggestions ?? []).slice();
    if (suggestions.length === 0) continue;

    const pending = suggestions
      .map((s, idx) => ({ s, idx }))
      .filter(
        ({ s }) =>
          (!s.status || s.status === "pending") && !!s.matched_transaction_id,
      );
    if (pending.length === 0) continue;

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

    type TxnRow = {
      id: string;
      source_email_transaction_id: string | null;
      source_payment_slip_id: string | null;
      source_statement_upload_id: string | null;
    };
    const byId = new Map<string, TxnRow>();
    for (const t of (txns ?? []) as TxnRow[]) byId.set(t.id, t);

    let stmtApprovedHere = 0;
    for (const { s, idx } of pending) {
      const t = byId.get(s.matched_transaction_id!);
      if (!t) continue;
      if (t.source_statement_upload_id) continue;
      if (!t.source_email_transaction_id && !t.source_payment_slip_id) continue;

      const { data: txnUpdated, error: txnErr } = await supabase
        .from("transactions")
        .update({
          source_statement_upload_id: stmt.id,
          source_statement_suggestion_index: idx,
          source_statement_match_confidence: s.confidence ?? 0,
        })
        .eq("id", t.id)
        .eq("user_id", stmt.user_id)
        .is("source_statement_upload_id", null)
        .select("id")
        .maybeSingle();

      if (txnErr) {
        console.error(
          `failed txn update for ${t.id} (stmt ${stmt.id} idx ${idx}):`,
          txnErr,
        );
        totalFailed++;
        continue;
      }
      if (!txnUpdated) {
        // Lost a race; suggestion stays pending.
        continue;
      }

      suggestions[idx] = { ...s, status: "approved" };
      stmtApprovedHere++;
      totalApproved++;
    }

    if (stmtApprovedHere === 0) continue;

    const { error: stmtErr } = await supabase
      .from("statement_uploads")
      .update({
        extraction_log: { ...log, suggestions },
      })
      .eq("id", stmt.id)
      .eq("user_id", stmt.user_id);

    if (stmtErr) {
      console.error(`failed extraction_log update for stmt ${stmt.id}:`, stmtErr);
      totalFailed++;
      continue;
    }

    await updateStatementReviewStatus(supabase, stmt.id);
    statementsTouched.push(`${stmt.id} (${stmt.filename}): +${stmtApprovedHere} approved`);
  }

  console.log("\n=== Backfill complete ===");
  console.log("suggestions approved:", totalApproved);
  console.log("failures:", totalFailed);
  console.log("\nStatements touched:");
  for (const line of statementsTouched) console.log("  " + line);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
