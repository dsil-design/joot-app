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
  is_new?: boolean;
  confidence?: number;
}

async function main() {
  const { data: stmt, error } = await supabase
    .from("statement_uploads")
    .select("user_id, extraction_log")
    .eq("id", STATEMENT_ID)
    .single();

  if (error || !stmt) {
    console.error("Statement not found:", error);
    process.exit(1);
  }

  const userId = stmt.user_id as string;
  const log = stmt.extraction_log as { suggestions?: Suggestion[] } | null;
  const suggs = log?.suggestions ?? [];

  // Take all "pending" (status unset, not rejected/ignored/approved) suggestions
  const pending = suggs.filter((s) => !s.status || s.status === "pending");
  console.log(`Pending suggestions: ${pending.length}`);

  const matchedIds = Array.from(
    new Set(
      pending
        .map((s) => s.matched_transaction_id)
        .filter((id): id is string => !!id)
    )
  );
  const pendingWithoutMatch = pending.filter((s) => !s.matched_transaction_id);

  console.log(`Pending with matched_transaction_id: ${matchedIds.length}`);
  console.log(`Pending WITHOUT matched_transaction_id (is_new etc): ${pendingWithoutMatch.length}`);

  // For each matched_transaction_id, check if there's an email_transaction
  // pointing to the same Joot transaction. The aggregator's
  // matched-transaction dedup (queue-aggregator.ts:700+) will merge them.
  // If the email is already approved, the merged item is marked approved
  // and disappears from the pending view.

  const { data: emails } = await supabase
    .from("email_transactions")
    .select(
      "id, status, matched_transaction_id, vendor_name, amount, currency, email_date, from_address"
    )
    .eq("user_id", userId)
    .in("matched_transaction_id", matchedIds);

  const emailsByTxn = new Map<string, typeof emails>();
  for (const e of emails ?? []) {
    const list = emailsByTxn.get(e.matched_transaction_id!) ?? [];
    list.push(e);
    emailsByTxn.set(e.matched_transaction_id!, list);
  }

  // Same for payment_slips
  const { data: slips } = await supabase
    .from("payment_slip_uploads")
    .select("id, review_status, matched_transaction_id, status")
    .eq("user_id", userId)
    .in("matched_transaction_id", matchedIds);

  const slipsByTxn = new Map<string, typeof slips>();
  for (const s of slips ?? []) {
    const list = slipsByTxn.get(s.matched_transaction_id!) ?? [];
    list.push(s);
    slipsByTxn.set(s.matched_transaction_id!, list);
  }

  // Cross-tab: for each pending suggestion, do we have an email
  // (or slip) pointing to the same Joot txn? What status?
  let dedupedAwayByApprovedEmail = 0;
  let dedupedAwayByApprovedSlip = 0;
  let stillVisibleAsPending = 0;
  let mergedButStillPending = 0;

  console.log("\nPer-pending-suggestion analysis:");
  for (const s of pending) {
    const mid = s.matched_transaction_id;
    if (!mid) {
      stillVisibleAsPending++;
      continue;
    }
    const matchingEmails = emailsByTxn.get(mid) ?? [];
    const matchingSlips = slipsByTxn.get(mid) ?? [];
    const anyApprovedEmail = matchingEmails.some((e) =>
      ["matched", "imported"].includes(e.status as string)
    );
    const anyApprovedSlip = matchingSlips.some(
      (sl) => sl.review_status === "approved"
    );

    const has = matchingEmails.length + matchingSlips.length;
    if (anyApprovedEmail) {
      dedupedAwayByApprovedEmail++;
    } else if (anyApprovedSlip) {
      dedupedAwayByApprovedSlip++;
    } else if (has > 0) {
      mergedButStillPending++;
    } else {
      stillVisibleAsPending++;
    }

    if (has > 0) {
      console.log(
        ` • [${s.transaction_date}] ${s.amount} ${s.currency} matched_tx=${mid.slice(0, 8)} | emails=${matchingEmails.length} statuses=[${matchingEmails.map((e) => e.status).join(",")}] | slips=${matchingSlips.length}`
      );
    }
  }

  console.log("\nSummary:");
  console.log(` Pending suggestions: ${pending.length}`);
  console.log(` → deduped & marked approved (email matched/imported): ${dedupedAwayByApprovedEmail}`);
  console.log(` → deduped & marked approved (slip approved):          ${dedupedAwayByApprovedSlip}`);
  console.log(` → merged with companion but still pending:             ${mergedButStillPending}`);
  console.log(` → standalone, should still appear pending:             ${stillVisibleAsPending}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
