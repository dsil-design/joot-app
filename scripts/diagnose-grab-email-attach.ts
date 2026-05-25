import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const EMAILS = [
  "1e8a5b78-3e4d-4f1e-9111-309d739b9b73", // $8.17 (THB 265)
  "b147dbfa-3c20-4882-a8b9-7c22742c06d0", // $8.23 (THB 267)
];

async function main() {
  console.log("=== email_transactions rows ===");
  const { data: emails, error } = await supabase
    .from("email_transactions")
    .select(
      "id, user_id, status, matched_transaction_id, manual_pair_keys, rejected_pair_keys, transaction_date, amount, currency, message_id",
    )
    .in("id", EMAILS);
  if (error) {
    console.error("email fetch error:", error);
    return;
  }
  for (const e of emails ?? []) {
    console.log(JSON.stringify(e, null, 2));
  }

  if (!emails || emails.length === 0) {
    console.log("(no email_transactions found for those IDs)");
    return;
  }

  // For each manual_pair_keys entry that's stmt:..., look up the referenced statement.
  const stmtRefs = new Set<string>();
  for (const e of emails) {
    for (const k of (e.manual_pair_keys ?? []) as string[]) {
      if (k.startsWith("stmt:")) stmtRefs.add(k);
    }
  }
  console.log("\n=== referenced statement keys ===");
  console.log(Array.from(stmtRefs));

  const stmtIdToIndices = new Map<string, number[]>();
  for (const key of stmtRefs) {
    const [, sid, idxStr] = key.split(":");
    const idx = Number(idxStr);
    if (!stmtIdToIndices.has(sid)) stmtIdToIndices.set(sid, []);
    stmtIdToIndices.get(sid)!.push(idx);
  }

  for (const [stmtId, indices] of stmtIdToIndices) {
    console.log(`\n--- statement_uploads ${stmtId} ---`);
    const { data: stmt, error: sErr } = await supabase
      .from("statement_uploads")
      .select("id, user_id, filename, status, payment_method_id, statement_period_start, statement_period_end, extraction_log")
      .eq("id", stmtId)
      .single();
    if (sErr || !stmt) {
      console.log("  ERROR fetching:", sErr);
      continue;
    }
    console.log(`  filename: ${stmt.filename}`);
    console.log(`  status: ${stmt.status}`);
    console.log(`  period: ${stmt.statement_period_start} -> ${stmt.statement_period_end}`);
    console.log(`  payment_method_id: ${stmt.payment_method_id}`);
    const log = stmt.extraction_log as { suggestions?: Array<Record<string, unknown>> } | null;
    const suggs = log?.suggestions ?? [];
    console.log(`  total suggestions: ${suggs.length}`);
    for (const idx of indices) {
      const s = suggs[idx];
      console.log(`  --- suggestion[${idx}] ---`);
      if (!s) {
        console.log("    (MISSING — index out of range!)");
        continue;
      }
      console.log("   ", JSON.stringify(s, null, 2));
    }
  }

  // Also: any transactions back-linked to these statements/suggestions?
  console.log("\n=== transactions back-linked to those statement suggestions ===");
  for (const [stmtId, indices] of stmtIdToIndices) {
    const { data: txns, error: tErr } = await supabase
      .from("transactions")
      .select("id, amount, currency, transaction_date, vendor_id, source_statement_upload_id, source_statement_suggestion_index, source_email_transaction_id, source_payment_slip_upload_id")
      .eq("source_statement_upload_id", stmtId)
      .in("source_statement_suggestion_index", indices);
    if (tErr) {
      console.log("  query error:", tErr);
      continue;
    }
    console.log(`  ${stmtId} ->`, JSON.stringify(txns, null, 2));
  }

  // Also: is there any transaction whose source_email_transaction_id is one of these emails?
  console.log("\n=== transactions sourced from these emails ===");
  const { data: byEmail } = await supabase
    .from("transactions")
    .select("id, amount, currency, transaction_date, vendor_id, source_statement_upload_id, source_statement_suggestion_index, source_email_transaction_id")
    .in("source_email_transaction_id", EMAILS);
  console.log(JSON.stringify(byEmail, null, 2));

  // Finally: any transaction_proposals for these composite ids?
  console.log("\n=== transaction_proposals referencing those emails ===");
  for (const e of emails) {
    const { data: props } = await supabase
      .from("transaction_proposals")
      .select("id, composite_id, status, created_at")
      .or(`composite_id.eq.email:${e.id},composite_id.like.%${e.id}%`);
    console.log(`  email ${e.id}:`, JSON.stringify(props, null, 2));
  }
  for (const [stmtId, indices] of stmtIdToIndices) {
    for (const idx of indices) {
      const cid = `stmt:${stmtId}:${idx}`;
      const { data: props } = await supabase
        .from("transaction_proposals")
        .select("id, composite_id, status, created_at")
        .eq("composite_id", cid);
      console.log(`  ${cid}:`, JSON.stringify(props, null, 2));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
