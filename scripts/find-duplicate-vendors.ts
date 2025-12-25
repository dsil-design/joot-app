import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface Vendor {
  id: string;
  name: string;
  count: number;
  total: number;
  firstDate: string | null;
  lastDate: string | null;
}

interface DuplicateGroup {
  primaryVendor: Vendor;
  duplicates: Vendor[];
  reason: string;
}

// Normalize vendor names for comparison
function normalizeVendorName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Remove possessives
  normalized = normalized.replace(/'s$/, '');
  normalized = normalized.replace(/s'$/, 's');

  // Remove common suffixes
  const suffixes = ['inc', 'llc', 'ltd', 'corp', 'corporation', 'company', 'co', 'bar', 'restaurant', 'cafe', 'coffee'];
  suffixes.forEach(suffix => {
    const regex = new RegExp(`\\s+${suffix}\\.?$`, 'i');
    normalized = normalized.replace(regex, '');
  });

  // Remove all non-alphanumeric characters
  normalized = normalized.replace(/[^a-z0-9]/g, '');

  return normalized;
}

// Calculate Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[len1][len2];
}

// Calculate similarity percentage
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 100;
  return ((maxLength - distance) / maxLength) * 100;
}

async function main() {
  const userId = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

  // Get all vendors
  const { data: vendors, error: vendorsError } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('user_id', userId)
    .order('name');

  if (vendorsError) {
    console.error('Error fetching vendors:', vendorsError);
    return;
  }

  // Get transaction counts
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('vendor_id, amount, transaction_date')
    .eq('user_id', userId);

  if (txError) {
    console.error('Error fetching transactions:', txError);
    return;
  }

  // Calculate stats per vendor
  const vendorStats = new Map<string, { count: number; total: number; firstDate: string | null; lastDate: string | null }>();

  for (const tx of transactions || []) {
    if (!tx.vendor_id) continue;
    const existing = vendorStats.get(tx.vendor_id) || { count: 0, total: 0, firstDate: null, lastDate: null };
    existing.count++;
    existing.total += parseFloat(tx.amount);
    if (!existing.firstDate || tx.transaction_date < existing.firstDate) existing.firstDate = tx.transaction_date;
    if (!existing.lastDate || tx.transaction_date > existing.lastDate) existing.lastDate = tx.transaction_date;
    vendorStats.set(tx.vendor_id, existing);
  }

  // Create vendor list with stats
  const vendorList: Vendor[] = (vendors || []).map(v => {
    const stats = vendorStats.get(v.id) || { count: 0, total: 0, firstDate: null, lastDate: null };
    return {
      id: v.id,
      name: v.name,
      count: stats.count,
      total: Math.round(stats.total * 100) / 100,
      firstDate: stats.firstDate,
      lastDate: stats.lastDate
    };
  });

  // Group vendors by normalized name
  const normalizedGroups = new Map<string, Vendor[]>();
  for (const vendor of vendorList) {
    const normalized = normalizeVendorName(vendor.name);
    if (!normalized) continue; // Skip empty names

    const group = normalizedGroups.get(normalized) || [];
    group.push(vendor);
    normalizedGroups.set(normalized, group);
  }

  // Find groups with duplicates
  const duplicateGroups: DuplicateGroup[] = [];
  const processedVendorIds = new Set<string>();

  for (const [normalized, group] of normalizedGroups) {
    if (group.length > 1) {
      // Sort by transaction count (highest first)
      group.sort((a, b) => b.count - a.count);

      const primary = group[0];
      const duplicates = group.slice(1);

      // Skip if all are already processed
      if (group.every(v => processedVendorIds.has(v.id))) continue;

      duplicateGroups.push({
        primaryVendor: primary,
        duplicates,
        reason: `Same normalized name: "${normalized}"`
      });

      group.forEach(v => processedVendorIds.add(v.id));
    }
  }

  // Find similar names that didn't match exactly
  const unprocessed = vendorList.filter(v => !processedVendorIds.has(v.id));

  for (let i = 0; i < unprocessed.length; i++) {
    for (let j = i + 1; j < unprocessed.length; j++) {
      const v1 = unprocessed[i];
      const v2 = unprocessed[j];

      if (processedVendorIds.has(v1.id) || processedVendorIds.has(v2.id)) continue;

      const norm1 = normalizeVendorName(v1.name);
      const norm2 = normalizeVendorName(v2.name);

      // Skip if one is a substring of the other (not similar enough)
      if (norm1.length < 3 || norm2.length < 3) continue;

      const similarity = calculateSimilarity(norm1, norm2);

      if (similarity >= 85) {
        const [primary, duplicate] = v1.count >= v2.count ? [v1, v2] : [v2, v1];

        duplicateGroups.push({
          primaryVendor: primary,
          duplicates: [duplicate],
          reason: `Similar names (${Math.round(similarity)}%): "${norm1}" ↔ "${norm2}"`
        });

        processedVendorIds.add(v1.id);
        processedVendorIds.add(v2.id);
      }
    }
  }

  // Sort by total transactions affected
  duplicateGroups.sort((a, b) => {
    const aTotal = a.primaryVendor.count + a.duplicates.reduce((sum, d) => sum + d.count, 0);
    const bTotal = b.primaryVendor.count + b.duplicates.reduce((sum, d) => sum + d.count, 0);
    return bTotal - aTotal;
  });

  // Output results
  console.log('# Vendor Duplicate Analysis\n');
  console.log(`Total vendors: ${vendorList.length}`);
  console.log(`Duplicate groups found: ${duplicateGroups.length}`);
  console.log(`Vendors involved in duplicates: ${processedVendorIds.size}`);
  console.log(`Vendors that can be removed: ${duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0)}\n`);

  console.log('## Duplicate Groups (sorted by transaction count)\n');

  for (const group of duplicateGroups) {
    const totalTxns = group.primaryVendor.count + group.duplicates.reduce((sum, d) => sum + d.count, 0);
    if (totalTxns === 0) continue; // Skip groups with no transactions

    console.log(`### ${group.primaryVendor.name} (${group.primaryVendor.count} txns) ← KEEP`);
    console.log(`Reason: ${group.reason}`);
    console.log('Merge from:');
    for (const dup of group.duplicates) {
      console.log(`  - "${dup.name}" (${dup.count} txns) [${dup.id}]`);
    }
    console.log(`Primary ID: ${group.primaryVendor.id}`);
    console.log('');
  }

  // Output as JSON for programmatic use
  console.log('\n## JSON Output for Merging\n');
  const mergeInstructions = duplicateGroups
    .filter(g => g.primaryVendor.count > 0 || g.duplicates.some(d => d.count > 0))
    .map(g => ({
      keepVendor: { id: g.primaryVendor.id, name: g.primaryVendor.name, count: g.primaryVendor.count },
      mergeFromVendors: g.duplicates.map(d => ({ id: d.id, name: d.name, count: d.count })),
      reason: g.reason
    }));

  console.log(JSON.stringify(mergeInstructions, null, 2));
}

main();
