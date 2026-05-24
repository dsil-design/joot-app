/**
 * Smoke test: simulate what the GET handler does for the Grab #2 stuck email
 * (1e8a5b78), confirming the rejected suggestion is looked up correctly.
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EMAIL_ID = "1e8a5b78-3e4d-4f1e-9111-309d739b9b73";

interface SuggestionShape {
  transaction_date?: string;
  description?: string;
  amount?: number;
  currency?: string;
  status?: string;
  foreign_transaction?: { originalAmount?: number; originalCurrency?: string };
}

async function main() {
  const { data: row } = await supabase
    .from("email_transactions")
    .select("id, rejected_pair_keys, user_id")
    .eq("id", EMAIL_ID)
    .maybeSingle();

  if (!row) {
    console.log("Email not found");
    return;
  }
  console.log("rejected_pair_keys:", row.rejected_pair_keys);

  const keys: string[] = row.rejected_pair_keys ?? [];
  const parsed = keys.map((k) => {
    const [stmtId, idxStr] = k.split(":");
    return { pairKey: k, statementUploadId: stmtId, suggestionIndex: Number.parseInt(idxStr, 10) };
  });

  const stmtIds = Array.from(new Set(parsed.map((p) => p.statementUploadId)));
  const { data: stmts } = await supabase
    .from("statement_uploads")
    .select("id, filename, extraction_log")
    .eq("user_id", row.user_id)
    .in("id", stmtIds);

  const stmtMap = new Map<string, { filename: string; suggestions: SuggestionShape[] }>();
  for (const s of stmts ?? []) {
    const suggestions = ((s.extraction_log as { suggestions?: SuggestionShape[] } | null)?.suggestions) ?? [];
    stmtMap.set(s.id, { filename: s.filename, suggestions });
  }

  const pairs = parsed.map((p) => {
    const stmt = stmtMap.get(p.statementUploadId);
    return {
      pairKey: p.pairKey,
      statementUploadId: p.statementUploadId,
      suggestionIndex: p.suggestionIndex,
      statementFilename: stmt?.filename ?? null,
      suggestion: stmt?.suggestions[p.suggestionIndex] ?? null,
    };
  });

  console.log("\nresolved pairs:");
  for (const p of pairs) {
    console.log(`  ${p.pairKey}`);
    console.log(`    file: ${p.statementFilename}`);
    if (p.suggestion) {
      console.log(`    desc: ${p.suggestion.description}`);
      console.log(`    amt:  ${p.suggestion.currency} ${p.suggestion.amount}`);
      console.log(`    date: ${p.suggestion.transaction_date}`);
      if (p.suggestion.foreign_transaction) {
        console.log(`    fx:   ${p.suggestion.foreign_transaction.originalCurrency} ${p.suggestion.foreign_transaction.originalAmount}`);
      }
    } else {
      console.log("    suggestion: NOT FOUND (likely re-processed statement)");
    }
  }

  // Validate pairKey shape (matches the API's regex)
  const RE = /^[0-9a-f-]{36}:\d+$/;
  for (const k of keys) {
    console.log(`\npairKey "${k}" matches /^[0-9a-f-]{36}:\\d+$/: ${RE.test(k)}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
