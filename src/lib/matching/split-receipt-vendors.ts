/**
 * Split-Receipt Vendor Allowlist
 *
 * Some retailers split a single customer order across multiple receipt emails
 * (one per sub-vendor or per parcel) while charging the customer's credit card
 * once for the combined total. The matching pipeline handles these by treating
 * sibling emails from the same allowlisted vendor as a candidate "bundle"
 * whose summed amount is compared against a card transaction.
 *
 * Adding a vendor here is the only switch — it gates bundle scoring in
 * `email-bundler` and bundle grouping in the review queue builder.
 */

interface SplitReceiptVendor {
  /** Recognizer for the email's `from_address`. */
  match: (fromAddress: string) => boolean;
  /** Human-readable label used in UI hints and logs. */
  label: string;
}

// Note: iCloud Hide-My-Email replaces dots in the alias with underscores —
// `noreply@lazada.co.th` arrives as `noreply_at_support_lazada_co_th_*@icloud.com`.
// Match either the literal domain or the iCloud-mangled form so users on
// either delivery path get bundling.
export const SPLIT_RECEIPT_VENDORS: SplitReceiptVendor[] = [
  {
    match: (from) => /lazada[._]co[._]th/i.test(from),
    label: 'Lazada Thailand',
  },
];

export function getSplitReceiptVendor(
  fromAddress: string | null | undefined,
): SplitReceiptVendor | null {
  if (!fromAddress) return null;
  for (const v of SPLIT_RECEIPT_VENDORS) {
    if (v.match(fromAddress)) return v;
  }
  return null;
}

export function isSplitReceiptVendor(fromAddress: string | null | undefined): boolean {
  return getSplitReceiptVendor(fromAddress) !== null;
}
