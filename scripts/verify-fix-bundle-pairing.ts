/**
 * Verifies the fix end-to-end against production data:
 *  1. Run fetchEmailQueueItems → confirm the two Lazada emails collapse into a
 *     single bundle item with summed THB amount and one extraEmailIds.
 *  2. Run fetchStatementQueueItems for the relevant Chase statement.
 *  3. Run aggregateQueueItems → confirm a 'merged' (email+stmt) item is emitted
 *     for line 24 of statement 984828e8… with confidence ~99.
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

import { fetchEmailQueueItems } from "../src/lib/imports/email-queue-builder";
import { fetchStatementQueueItems } from "../src/lib/imports/statement-queue-builder";
import { aggregateQueueItems } from "../src/lib/imports/queue-aggregator";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const USER_ID = "a1c3caff-a5de-4898-be7d-ab4b76247ae6";
const STMT_ID = "984828e8-dead-4cde-bca2-9e9ce77f0aaf";
const FOCAL_EMAIL_ID = "9024e8ea-08c4-43e0-9507-3dbea14ae319";
const SIBLING_EMAIL_ID = "72140ee8-71a6-4097-b52c-fbeaf7c69751";

function bool(b: boolean): string { return b ? "✓" : "✗"; }

async function main() {
  console.log("=== STEP 1: fetchEmailQueueItems → Lazada bundling ===");
  const emailItems = await fetchEmailQueueItems(supabase as never, USER_ID, {});
  const bundlePrimary = emailItems.find(
    (i) => i.id === `email:${FOCAL_EMAIL_ID}` || (i.extraEmailIds || []).includes(SIBLING_EMAIL_ID),
  );
  const sibling = emailItems.find((i) => i.id === `email:${SIBLING_EMAIL_ID}`);

  console.log(`Total email items returned: ${emailItems.length}`);
  console.log(`${bool(!!bundlePrimary)} Bundle primary present`);
  console.log(`${bool(!sibling)} Sibling collapsed (sibling NOT a separate item)`);
  if (bundlePrimary) {
    console.log(`  - id: ${bundlePrimary.id}`);
    console.log(`  - displayed amount: ${bundlePrimary.statementTransaction.currency} ${bundlePrimary.statementTransaction.amount}`);
    console.log(`  - extraEmailIds: ${JSON.stringify(bundlePrimary.extraEmailIds)}`);
    console.log(`  - reasons: ${JSON.stringify(bundlePrimary.reasons)}`);
    console.log(`  - status: ${bundlePrimary.status}, waitingForStatement: ${bundlePrimary.waitingForStatement}`);
  }

  console.log("\n=== STEP 2: fetchStatementQueueItems for Chase stmt ===");
  const stmtItems = await fetchStatementQueueItems(supabase as never, USER_ID, {
    statementUploadId: STMT_ID,
  });
  console.log(`Total stmt items: ${stmtItems.length}`);
  const line24 = stmtItems.find(
    (i) => i.id === `stmt:${STMT_ID}:24`,
  );
  console.log(`${bool(!!line24)} Line 24 present`);
  if (line24) {
    console.log(`  - amount: ${line24.statementTransaction.currency} ${line24.statementTransaction.amount}`);
    console.log(`  - foreignAmount: ${line24.statementTransaction.foreignCurrency} ${line24.statementTransaction.foreignAmount}`);
    console.log(`  - status: ${line24.status}, isNew: ${line24.isNew}`);
  }

  console.log("\n=== STEP 3: aggregateQueueItems → merged item? ===");
  const result = await aggregateQueueItems(supabase as never, stmtItems, emailItems, {
    statusFilter: "all",
    currencyFilter: "all",
    confidenceFilter: "all",
    sourceFilter: "all",
    searchQuery: "",
  });

  const merged = result.items.filter((i) => i.source === "merged");
  console.log(`Total merged items: ${merged.length}`);
  const target = merged.find((m) => m.id.includes(STMT_ID) && m.id.includes(FOCAL_EMAIL_ID));
  console.log(`${bool(!!target)} Expected merged item present (Lazada bundle ↔ stmt line 24)`);
  if (target) {
    console.log(`  - id: ${target.id}`);
    console.log(`  - confidence: ${target.confidence} (${target.confidenceLevel})`);
    console.log(`  - statement: ${target.statementTransaction.currency} ${target.statementTransaction.amount} on ${target.statementTransaction.date}`);
    console.log(`  - email side: ${target.mergedEmailData?.currency} ${target.mergedEmailData?.amount}`);
    console.log(`  - extraEmailIds: ${JSON.stringify(target.extraEmailIds)}`);
    console.log(`  - isNew: ${target.isNew}`);
    console.log(`  - reasons:`);
    for (const r of target.reasons) console.log(`     - ${r}`);
  } else {
    console.log("\nAll merged items emitted:");
    for (const m of merged) {
      console.log(`  - ${m.id}  conf=${m.confidence}`);
    }
  }

  console.log("\n=== VERDICT ===");
  const success =
    !!bundlePrimary &&
    !sibling &&
    !!target &&
    (target?.extraEmailIds || []).includes(SIBLING_EMAIL_ID) &&
    (target?.confidence ?? 0) >= 90;
  console.log(success ? "✓ FIX VERIFIED" : "✗ FIX FAILED — see above");
  process.exit(success ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
