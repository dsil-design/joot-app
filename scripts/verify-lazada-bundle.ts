/**
 * End-to-end verification of the Lazada bundle pipeline against production data.
 *
 *  - Fetch the two known Lazada emails (72140ee8…, 9024e8ea…)
 *  - Build the bundle via `buildBundleForEmail`
 *  - Score it against a synthetic Chase Sapphire $56.75 target
 *  - Score it against actual nearby USD transactions in the user's account
 *  - Print a human-readable summary
 *
 * Run: `npx tsx scripts/verify-lazada-bundle.ts`
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

import { buildBundleForEmail } from "../src/lib/matching/email-bundler";
import {
  scoreBundleAgainstTarget,
  scoreBundleAgainstTargets,
} from "../src/lib/matching/bundle-scorer";
import type { TargetTransaction } from "../src/lib/matching/match-scorer";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const USER_ID = "a1c3caff-a5de-4898-be7d-ab4b76247ae6";
const FOCAL_EMAIL_ID = "9024e8ea-08c4-43e0-9507-3dbea14ae319"; // primary (THB 1,430.04)

async function main() {
  console.log("\n=== STEP 0: Raw inspection of candidate query ===");
  const { data: focalRow } = await supabase
    .from("email_transactions")
    .select("id, from_address, email_date, currency, status")
    .eq("id", FOCAL_EMAIL_ID)
    .single();
  console.log("focal:", JSON.stringify(focalRow, null, 2));
  if (focalRow?.email_date) {
    const focalTime = new Date(focalRow.email_date).getTime();
    const fromIso = new Date(focalTime - 30 * 60 * 1000).toISOString();
    const toIso = new Date(focalTime + 30 * 60 * 1000).toISOString();
    console.log(`window: ${fromIso} → ${toIso}`);
    const { data: cands } = await supabase
      .from("email_transactions")
      .select("id, from_address, email_date, currency, status")
      .eq("user_id", USER_ID)
      .eq("currency", focalRow.currency!)
      .gte("email_date", fromIso)
      .lte("email_date", toIso)
      .in("status", ["pending_review", "waiting_for_statement", "ready_to_import"])
      .neq("id", focalRow.id);
    console.log(`candidates: ${cands?.length || 0}`);
    console.log(JSON.stringify(cands, null, 2));
  }

  console.log("\n=== STEP 1: Build bundle from focal email ===");
  const bundle = await buildBundleForEmail(supabase as any, FOCAL_EMAIL_ID, USER_ID);
  if (!bundle) {
    console.error("FAIL: bundle is null. Expected at least one sibling.");
    process.exit(1);
  }
  console.log(`Bundle for ${bundle.vendorLabel}: ${bundle.members.length} members`);
  for (const m of bundle.members) {
    console.log(`  - ${m.id}  ${m.currency} ${m.amount.toFixed(2)}  order=${m.order_id}  date=${m.transaction_date}  email=${m.email_date}`);
  }
  const total = bundle.members.reduce((s, m) => s + m.amount, 0);
  console.log(`  TOTAL: ${bundle.members[0].currency} ${total.toFixed(2)}`);

  console.log("\n=== STEP 2: Score against synthetic Chase $56.75 target ===");
  const synthetic: TargetTransaction = {
    id: "synthetic-chase-56-75",
    amount: 56.75,
    currency: "USD",
    date: "2026-03-26",
    vendor: "Lazada",
  };
  const synthScore = await scoreBundleAgainstTarget(bundle, synthetic, supabase as any);
  console.log(`Score:        ${synthScore.score}/100 (${synthScore.confidence})`);
  console.log(`Match:        ${synthScore.isMatch}`);
  console.log(`Native total: ${synthScore.nativeCurrency} ${synthScore.totalNativeAmount.toFixed(2)}`);
  console.log(`Converted:    USD ${synthScore.convertedAmount.toFixed(2)}`);
  console.log(`Target:       USD 56.75`);
  console.log(`Delta:        ${(((synthScore.convertedAmount - 56.75) / 56.75) * 100).toFixed(3)}%`);
  console.log(`Rate quality: ${synthScore.rateQuality}/100`);
  console.log("Reasons:");
  for (const r of synthScore.reasons) console.log(`  - ${r}`);

  console.log("\n=== STEP 3: Score against actual nearby USD transactions ===");
  const { data: realCandidates } = await supabase
    .from("transactions")
    .select("id, description, amount, original_currency, transaction_date, vendors:vendor_id(name)")
    .eq("user_id", USER_ID)
    .eq("original_currency", "USD")
    .gte("transaction_date", "2026-03-19")
    .lte("transaction_date", "2026-04-02")
    .order("transaction_date", { ascending: true });
  const targets: TargetTransaction[] = (realCandidates || []).map((t: any) => ({
    id: t.id,
    amount: Number(t.amount),
    currency: t.original_currency,
    date: t.transaction_date,
    vendor: (t.vendors as { name?: string } | null)?.name || t.description || "",
    description: t.description || undefined,
  }));
  console.log(`Scoring against ${targets.length} real USD transactions in window…`);

  const ranked = await scoreBundleAgainstTargets(bundle, targets, supabase as any);
  const top = ranked.slice(0, 5);
  for (const r of top) {
    const tgt = targets.find((t) => t.id === r.targetId)!;
    console.log(
      `  ${r.score}/100 [${r.confidence}]  ${tgt.date}  ${tgt.currency} ${tgt.amount.toFixed(2)}  ${tgt.vendor || "(no vendor)"}`
    );
  }

  console.log("\n=== STEP 4: Verdict ===");
  // Threshold is the existing MEDIUM bar (55) — anything above this surfaces
  // in the review queue, which is the user-confirmed behavior. We expect well
  // above this for the production example.
  if (synthScore.score >= 70 && synthScore.isMatch) {
    console.log(`✓ Bundle wins ${synthScore.score}/100 (${synthScore.confidence}). Pipeline is wired correctly.`);
    console.log(
      "  This bundle suggestion will surface in the review queue once the $56.75 Chase charge is imported."
    );
  } else {
    console.log("✗ Synthetic score below expectation — investigate.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
