import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const DRY_RUN = process.argv.includes('--dry-run') || !process.argv.includes('--execute');

// Vendor IDs from import reference that should be preserved as primary
const IMPORT_REFERENCE_VENDOR_IDS = new Set([
  '49641ab2-072e-464e-b377-82f199a5d397', // Virgin Active
  '9e3cc4c7-aa1b-4fbf-9a55-3e17354784fe', // Muji
  '854a3101-8fd5-48c5-b87e-7750fc23d67a', // B2S
  '334123a8-7017-4aaf-97d3-f28ae9b5eba6', // Tops
  'd6d6b230-a268-4ffa-88b8-e8098f86b06c', // Xfinity
  '9a1f871e-8458-4627-aabc-36e3724e94b8', // Citizen's Bank
  '423cf0cc-b570-4d1a-98fd-f60cecc221d3', // Anthropic
  'ecce979c-a9d8-44ef-8188-e74cd2918db2', // JetBrains
  '797cb44e-b583-482d-841f-0e0b80af2705', // Lazada
  '6b451d8c-b8db-4475-b19b-6c3cf38b93d0', // GrabFood
  '20af541a-173c-4f7a-9e04-e0c821f7d367', // Grab Taxi
  '58f6f707-3771-41bf-a5eb-12a0b2ef0e3b', // GrabMart
  '8f42f382-dd9a-49c8-8984-eea40169ec20', // Chef Fuji
  '24e01082-dd4f-4292-afd8-5b13c7177cc1', // Leigh's Van Driver
  '1d45930f-7a7d-4c00-a2fb-8e3fff8d1426', // At Nata Resort
  '37ce0024-75dd-45f4-a3ad-3b7f0ddf1df6', // Grab Driver
  '4a5a1340-7613-479f-8d37-f5a85eae85c7', // All Time Pickleball
  'c39ea16b-7df9-4a51-a561-d38e0ead1f59', // Nidnoi
  '9bd673d9-d0c0-4184-99de-bcaffa7cacc4', // Pee Tik
  'dbdaff3f-0a4a-4bbd-8a90-76e61fa70ce5', // ZigarLab
  'f4e14e17-41c4-46bc-b19e-3fc5a25f1fb7', // MK Restaurant
  '8fa29bc3-bc68-4c8d-a0ad-70c2c3d02b5d', // Minimal Coffee
  'c49f435b-18c4-4f6d-8e4b-12b9f721e20d', // Liquor Shop
]);

// Known DIFFERENT vendors that should NOT be merged despite similar names
const DO_NOT_MERGE_PAIRS = [
  ['Amazon', 'Amazon Cafe'], // Amazon e-commerce vs Amazon Cafe (Thai coffee chain)
  ['Amazon', 'Amazon Go'],
  ['Amazon', 'Amazon Prime'],
  ['Artisan', 'Artisan Cafe'],
  ['Apple', 'Apple iTunes'],
  ['Apple', 'Apple Store'],
  ['Apple', 'Apple TV'],
  ['Apple', 'Apple Resort'],
  ['Apple', 'Apple Orchard'],
  ['Home', 'Home Bar'],
  ['Home', 'Home Pro'],
  ['Gravity', 'Gravity Cafe'],
  ['Alchemy', 'Alchemy Vegan'],
  ['7-Eleven', '7 Senses Gelato'],
  ['North Hill', 'North Hills'], // Different golf courses
];

interface Vendor {
  id: string;
  name: string;
  count: number;
}

interface MergeOperation {
  keepVendor: Vendor;
  mergeFromVendors: Vendor[];
  reason: string;
}

function normalizeVendorName(name: string): string {
  let normalized = name.toLowerCase().trim();
  normalized = normalized.replace(/'s$/, '');
  normalized = normalized.replace(/s'$/, 's');
  normalized = normalized.replace(/[`']/g, '');
  const suffixes = ['inc', 'llc', 'ltd', 'corp', 'corporation', 'company', 'co'];
  suffixes.forEach(suffix => {
    const regex = new RegExp(`\\s+${suffix}\\.?$`, 'i');
    normalized = normalized.replace(regex, '');
  });
  normalized = normalized.replace(/[^a-z0-9]/g, '');
  return normalized;
}

function shouldNotMerge(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase();
  const n2 = name2.toLowerCase();

  for (const [a, b] of DO_NOT_MERGE_PAIRS) {
    const la = a.toLowerCase();
    const lb = b.toLowerCase();
    if ((n1 === la && n2 === lb) || (n1 === lb && n2 === la)) {
      return true;
    }
  }
  return false;
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (use --execute to apply changes)' : 'EXECUTING CHANGES'}\n`);

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
    .select('vendor_id')
    .eq('user_id', userId);

  if (txError) {
    console.error('Error fetching transactions:', txError);
    return;
  }

  // Count transactions per vendor
  const vendorCounts = new Map<string, number>();
  for (const tx of transactions || []) {
    if (tx.vendor_id) {
      vendorCounts.set(tx.vendor_id, (vendorCounts.get(tx.vendor_id) || 0) + 1);
    }
  }

  // Build vendor list
  const vendorList: Vendor[] = (vendors || []).map(v => ({
    id: v.id,
    name: v.name,
    count: vendorCounts.get(v.id) || 0
  }));

  // Group by normalized name
  const normalizedGroups = new Map<string, Vendor[]>();
  for (const vendor of vendorList) {
    const normalized = normalizeVendorName(vendor.name);
    if (!normalized) continue;
    const group = normalizedGroups.get(normalized) || [];
    group.push(vendor);
    normalizedGroups.set(normalized, group);
  }

  // Build merge operations
  const mergeOperations: MergeOperation[] = [];

  for (const [normalized, group] of normalizedGroups) {
    if (group.length <= 1) continue;

    // Filter out pairs that should not be merged
    const eligibleForMerge: Vendor[] = [];
    const excluded: Vendor[] = [];

    for (const vendor of group) {
      let shouldExclude = false;
      for (const other of group) {
        if (other.id !== vendor.id && shouldNotMerge(vendor.name, other.name)) {
          shouldExclude = true;
          break;
        }
      }
      if (shouldExclude) {
        excluded.push(vendor);
      } else {
        eligibleForMerge.push(vendor);
      }
    }

    if (eligibleForMerge.length <= 1) continue;

    // Sort: prefer import reference vendors, then by transaction count
    eligibleForMerge.sort((a, b) => {
      const aIsRef = IMPORT_REFERENCE_VENDOR_IDS.has(a.id);
      const bIsRef = IMPORT_REFERENCE_VENDOR_IDS.has(b.id);
      if (aIsRef && !bIsRef) return -1;
      if (!aIsRef && bIsRef) return 1;
      return b.count - a.count;
    });

    const primary = eligibleForMerge[0];
    const duplicates = eligibleForMerge.slice(1);

    // Skip if no actual duplicates to merge
    if (duplicates.length === 0) continue;

    mergeOperations.push({
      keepVendor: primary,
      mergeFromVendors: duplicates,
      reason: `Same normalized name: "${normalized}"`
    });
  }

  // Sort by total transactions affected
  mergeOperations.sort((a, b) => {
    const aTotal = a.keepVendor.count + a.mergeFromVendors.reduce((sum, d) => sum + d.count, 0);
    const bTotal = b.keepVendor.count + b.mergeFromVendors.reduce((sum, d) => sum + d.count, 0);
    return bTotal - aTotal;
  });

  // Report
  console.log('# Vendor Consolidation Plan\n');
  console.log(`Total merge operations: ${mergeOperations.length}`);
  console.log(`Vendors to be merged away: ${mergeOperations.reduce((sum, op) => sum + op.mergeFromVendors.length, 0)}`);
  console.log('');

  for (const op of mergeOperations) {
    const totalTxns = op.keepVendor.count + op.mergeFromVendors.reduce((sum, d) => sum + d.count, 0);
    console.log(`\n### Keep: "${op.keepVendor.name}" (${op.keepVendor.count} txns)`);
    console.log(`ID: ${op.keepVendor.id}`);
    if (IMPORT_REFERENCE_VENDOR_IDS.has(op.keepVendor.id)) {
      console.log('⚠️  Referenced in import docs - ID must be preserved');
    }
    console.log('Merge from:');
    for (const dup of op.mergeFromVendors) {
      console.log(`  - "${dup.name}" (${dup.count} txns) [${dup.id}]`);
    }
  }

  // Execute merges if not dry run
  if (!DRY_RUN) {
    console.log('\n\n# Executing merges...\n');

    let totalUpdated = 0;
    let totalDeleted = 0;

    for (const op of mergeOperations) {
      const duplicateIds = op.mergeFromVendors.map(v => v.id);

      // Update transactions to point to the primary vendor
      const { data: updated, error: updateError } = await supabase
        .from('transactions')
        .update({ vendor_id: op.keepVendor.id })
        .in('vendor_id', duplicateIds)
        .eq('user_id', userId)
        .select('id');

      if (updateError) {
        console.error(`Error updating transactions for ${op.keepVendor.name}:`, updateError);
        continue;
      }

      const updatedCount = updated?.length || 0;
      totalUpdated += updatedCount;

      // Delete the duplicate vendors
      const { error: deleteError } = await supabase
        .from('vendors')
        .delete()
        .in('id', duplicateIds);

      if (deleteError) {
        console.error(`Error deleting vendors for ${op.keepVendor.name}:`, deleteError);
        continue;
      }

      totalDeleted += duplicateIds.length;

      console.log(`✓ Merged ${op.mergeFromVendors.length} vendors into "${op.keepVendor.name}" (${updatedCount} txns updated)`);
    }

    console.log(`\n\nSummary:`);
    console.log(`  Transactions updated: ${totalUpdated}`);
    console.log(`  Vendors deleted: ${totalDeleted}`);
  } else {
    console.log('\n\n⚠️  DRY RUN - No changes made. Run with --execute to apply changes.');
  }
}

main().catch(console.error);
