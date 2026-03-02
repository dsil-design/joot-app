/**
 * iCloud Private Relay Address Normalizer
 *
 * iCloud's Hide My Email / Private Relay rewrites sender addresses:
 *   kplus@kasikornbank.com → KPLUS_at_kasikornbank_com_abc123def@icloud.com
 *
 * Pattern: {local}_at_{domain_with_underscores}_{hash}@icloud.com
 *
 * This module converts relay addresses back to their originals so that
 * parser canParse() and classifier pattern matching work correctly.
 */

/**
 * Known TLD patterns in order of specificity (longest first).
 * The underscore-separated form is what appears in relay addresses.
 */
const TLD_PATTERNS = [
  { suffix: '_co_th', tld: '.co.th' },
  { suffix: '_or_th', tld: '.or.th' },
  { suffix: '_ac_th', tld: '.ac.th' },
  { suffix: '_co_uk', tld: '.co.uk' },
  { suffix: '_com_au', tld: '.com.au' },
  { suffix: '_com_sg', tld: '.com.sg' },
  { suffix: '_com', tld: '.com' },
  { suffix: '_eu', tld: '.eu' },
  { suffix: '_net', tld: '.net' },
  { suffix: '_org', tld: '.org' },
  { suffix: '_io', tld: '.io' },
  { suffix: '_me', tld: '.me' },
  { suffix: '_th', tld: '.th' },
];

/**
 * Check if an email address is an iCloud Private Relay address
 */
export function isICloudRelayAddress(address: string): boolean {
  if (!address) return false;
  const lower = address.toLowerCase().trim();
  return lower.endsWith('@icloud.com') && lower.includes('_at_');
}

/**
 * Normalize an iCloud Private Relay address back to the original sender address.
 *
 * Input:  KPLUS_at_kasikornbank_com_abc123@icloud.com
 * Output: kplus@kasikornbank.com
 *
 * Returns the original address unchanged if it's not a relay address.
 */
export function normalizeICloudRelay(address: string): string {
  if (!address) return address;

  const lower = address.toLowerCase().trim();

  if (!isICloudRelayAddress(lower)) {
    return address;
  }

  // Extract the local part before @icloud.com
  const localPart = lower.split('@')[0];

  // Split on _at_ to get original local and domain+hash
  const atIndex = localPart.indexOf('_at_');
  if (atIndex === -1) return address;

  const originalLocal = localPart.substring(0, atIndex);
  const domainAndHash = localPart.substring(atIndex + 4); // skip '_at_'

  // Find the TLD boundary to separate domain from hash
  for (const { suffix, tld } of TLD_PATTERNS) {
    const tldIndex = domainAndHash.indexOf(suffix);
    if (tldIndex === -1) continue;

    // The domain is everything before and including the TLD
    const domainPart = domainAndHash.substring(0, tldIndex);

    // Convert underscores back to dots for the domain
    const domain = domainPart.replace(/_/g, '.') + tld;

    return `${originalLocal}@${domain}`;
  }

  // Fallback: couldn't find a known TLD, return original
  return address;
}
