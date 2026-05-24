/**
 * Smoke test: confirm the new upcoming_charge_notice_review rule fires for
 * an ai-fallback email when the AI flags it as upcoming_charge_notice.
 *
 * Reproduces the T-Mobile c5ef0403 case: no PARSER_PATTERN sender match,
 * AI says "upcoming_charge_notice" — should land in pending_review, not
 * waiting_for_statement.
 */
import { classifyEmailWithContext, getStatusFromRules } from "@/lib/email/classifier";
import { EMAIL_CLASSIFICATION, EMAIL_TRANSACTION_STATUS } from "@/lib/types/email-imports";

function header(s: string) {
  console.log("\n=== " + s + " ===");
}

// 1) End-to-end via classifyEmailWithContext: T-Mobile-shaped raw email + AI verdict
header("T-Mobile shaped email + ai_classification=upcoming_charge_notice");
const tMobileLike = {
  message_id: "<test>",
  uid: 0,
  folder: "Personal/Bills and Receipts",
  subject: "Your bill—your savings. Check it out.",
  from_address: "donotreply_at_system_t-mobile_com_tcp244f577w450_a3wp7245@icloud.com",
  from_name: "T-Mobile",
  email_date: new Date(),
  text_body: "",
  html_body: "",
  seen: true,
  has_attachments: false,
};
const r1 = classifyEmailWithContext(tMobileLike, { currency: "USD" }, "upcoming_charge_notice");
console.log("  status        :", r1.status, r1.status === EMAIL_TRANSACTION_STATUS.PENDING_REVIEW ? "✓" : "✗ EXPECTED pending_review");
console.log("  matchedRule   :", r1.matchedRule?.id ?? "(none)");
console.log("  classification:", r1.classification);
console.log("  parserKey     :", r1.parserKey);

// 2) Direct rule evaluation: confirm the new rule fires standalone
header("getStatusFromRules with aiClassification=upcoming_charge_notice");
const status2 = getStatusFromRules({
  parserKey: null,
  classification: EMAIL_CLASSIFICATION.UNKNOWN,
  paymentContext: "unknown",
  currency: "USD",
  aiClassification: "upcoming_charge_notice",
});
console.log("  status:", status2, status2 === EMAIL_TRANSACTION_STATUS.PENDING_REVIEW ? "✓" : "✗");

// 3) Negative case: same context without aiClassification should still hit fallback
header("Without aiClassification (should hit fallback → pending_review)");
const status3 = getStatusFromRules({
  parserKey: null,
  classification: EMAIL_CLASSIFICATION.UNKNOWN,
  paymentContext: "unknown",
  currency: "USD",
});
console.log("  status:", status3);

// 4) Make sure the rule doesn't accidentally override a Grab THB receipt
header("Grab THB receipt with aiClassification=transaction_receipt (should still be waiting_for_statement)");
const status4 = getStatusFromRules({
  parserKey: "grab",
  classification: EMAIL_CLASSIFICATION.RECEIPT,
  paymentContext: "credit_card",
  currency: "THB",
  aiClassification: "transaction_receipt",
});
console.log("  status:", status4, status4 === EMAIL_TRANSACTION_STATUS.WAITING_FOR_STATEMENT ? "✓" : "✗ EXPECTED waiting_for_statement");
