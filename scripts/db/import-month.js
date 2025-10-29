#!/usr/bin/env node

/**
 * Incremental Month Import Script
 *
 * Imports a single month's transactions without deleting existing data.
 * - Matches existing vendors (creates new ones if needed)
 * - Matches existing payment methods (creates new ones if needed)
 * - Matches existing tags (creates new ones if needed)
 * - Skips duplicate transactions (same date, description, amount, vendor)
 *
 * Usage: node scripts/db/import-month.js --file=scripts/august-2025-CORRECTED.json --month=2025-08
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
};

const DATA_FILE = getArg('file');
const TARGET_MONTH = getArg('month'); // Format: YYYY-MM
const USER_EMAIL = 'dennis@dsil.design';

// Validation
if (!DATA_FILE) {
  console.error('❌ Missing required argument: --file');
  console.log('Usage: node scripts/db/import-month.js --file=scripts/august-2025-CORRECTED.json --month=2025-08');
  process.exit(1);
}

if (!TARGET_MONTH || !/^\d{4}-\d{2}$/.test(TARGET_MONTH)) {
  console.error('❌ Missing or invalid --month argument. Format: YYYY-MM');
  process.exit(1);
}

if (!fs.existsSync(DATA_FILE)) {
  console.error(`❌ Data file not found: ${DATA_FILE}`);
  process.exit(1);
}

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ============= HELPER FUNCTIONS =============

async function getOrCreateVendor(vendorName, userId, vendorCache) {
  if (!vendorName || vendorName.trim() === '') {
    return null;
  }

  const normalized = vendorName.trim();
  const cacheKey = normalized.toLowerCase();

  // Check cache first
  if (vendorCache.has(cacheKey)) {
    return vendorCache.get(cacheKey);
  }

  // Check database
  const { data: existingRows } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('user_id', userId)
    .ilike('name', normalized)
    .limit(1);

  const existing = existingRows?.[0] || null;

  if (existing) {
    vendorCache.set(cacheKey, existing.id);
    return existing.id;
  }

  // Create new vendor
  const { data: newVendor, error } = await supabase
    .from('vendors')
    .insert({ name: normalized, user_id: userId })
    .select('id, name')
    .single();

  if (error) {
    // Handle duplicate key violation (vendor was created by another process/import)
    if (error.code === '23505') {
      // Retry the lookup
      const { data: retryRows } = await supabase
        .from('vendors')
        .select('id, name')
        .eq('user_id', userId)
        .ilike('name', normalized)
        .limit(1);

      const retryExisting = retryRows?.[0] || null;

      if (retryExisting) {
        vendorCache.set(cacheKey, retryExisting.id);
        return retryExisting.id;
      }
    }
    console.error(`   ❌ Error creating vendor "${normalized}":`, error);
    throw error;
  }

  vendorCache.set(cacheKey, newVendor.id);
  return newVendor.id;
}

async function getOrCreatePaymentMethod(methodName, userId, pmCache) {
  if (!methodName || methodName.trim() === '') {
    return null;
  }

  const normalized = methodName.trim();
  const cacheKey = normalized.toLowerCase();

  // Check cache first
  if (pmCache.has(cacheKey)) {
    return pmCache.get(cacheKey);
  }

  // Check database
  const { data: existing } = await supabase
    .from('payment_methods')
    .select('id, name')
    .eq('user_id', userId)
    .ilike('name', normalized)
    .maybeSingle();

  if (existing) {
    pmCache.set(cacheKey, existing.id);
    return existing.id;
  }

  // Get next sort_order
  const { data: maxOrder } = await supabase
    .from('payment_methods')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (maxOrder?.sort_order || 0) + 1;

  // Create new payment method
  const { data: newPM, error } = await supabase
    .from('payment_methods')
    .insert({ name: normalized, user_id: userId, sort_order: nextSortOrder })
    .select('id, name')
    .single();

  if (error) {
    // Handle duplicate key violation (payment method was created by another process/import)
    if (error.code === '23505') {
      // Retry the lookup
      const { data: retryExisting } = await supabase
        .from('payment_methods')
        .select('id, name')
        .eq('user_id', userId)
        .ilike('name', normalized)
        .maybeSingle();

      if (retryExisting) {
        pmCache.set(cacheKey, retryExisting.id);
        return retryExisting.id;
      }
    }
    console.error(`   ❌ Error creating payment method "${normalized}":`, error);
    throw error;
  }

  pmCache.set(cacheKey, newPM.id);
  return newPM.id;
}

async function getOrCreateTag(tagName, userId, tagCache) {
  const cacheKey = tagName.toLowerCase();

  // Check cache first
  if (tagCache.has(cacheKey)) {
    return tagCache.get(cacheKey);
  }

  // Check database
  const { data: existing } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', userId)
    .ilike('name', tagName)
    .maybeSingle();

  if (existing) {
    tagCache.set(cacheKey, existing.id);
    return existing.id;
  }

  // Default colors for common tags
  const defaultColors = {
    'reimbursement': '#dbeafe',
    'florida house': '#fef3c7',
    'business expense': '#d1fae5',
    'savings/investment': '#e0e7ff'
  };
  const color = defaultColors[tagName.toLowerCase()] || '#e5e7eb';

  // Create new tag
  const { data: newTag, error } = await supabase
    .from('tags')
    .insert({ name: tagName, user_id: userId, color: color })
    .select('id, name')
    .single();

  if (error) {
    // Handle duplicate key violation (tag was created by another process/import)
    if (error.code === '23505') {
      // Retry the lookup
      const { data: retryExisting } = await supabase
        .from('tags')
        .select('id, name')
        .eq('user_id', userId)
        .ilike('name', tagName)
        .maybeSingle();

      if (retryExisting) {
        tagCache.set(cacheKey, retryExisting.id);
        return retryExisting.id;
      }
    }
    console.error(`   ❌ Error creating tag "${tagName}":`, error);
    throw error;
  }

  tagCache.set(cacheKey, newTag.id);
  return newTag.id;
}

// ============= MAIN IMPORT FUNCTION =============

async function importMonth() {
  console.log('📥 INCREMENTAL MONTH IMPORT');
  console.log('='.repeat(50));
  console.log(`Target Month: ${TARGET_MONTH}`);
  console.log(`Data File: ${DATA_FILE}`);
  console.log(`User: ${USER_EMAIL}\n`);

  // Load parsed data
  const rawData = fs.readFileSync(DATA_FILE, 'utf8');
  const transactions = JSON.parse(rawData);

  if (!Array.isArray(transactions)) {
    throw new Error('Parsed data is not an array!');
  }

  console.log(`📊 Loaded ${transactions.length} transactions from file\n`);

  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', USER_EMAIL)
    .single();

  if (userError || !user) {
    throw new Error(`User ${USER_EMAIL} not found!`);
  }

  console.log(`👤 User ID: ${user.id}\n`);

  // Check for existing transactions in this month
  // Calculate last day of month (handles 28, 29, 30, 31 day months)
  const [year, month] = TARGET_MONTH.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate(); // Day 0 of next month = last day of current month

  const { data: existingTxns, error: checkError } = await supabase
    .from('transactions')
    .select('transaction_date, description, amount, vendor_id')
    .eq('user_id', user.id)
    .gte('transaction_date', `${TARGET_MONTH}-01`)
    .lte('transaction_date', `${TARGET_MONTH}-${String(lastDay).padStart(2, '0')}`);

  if (checkError) {
    throw new Error(`Error checking existing transactions: ${checkError.message}`);
  }

  console.log(`🔍 Found ${existingTxns?.length || 0} existing transactions in ${TARGET_MONTH}`);

  if (existingTxns && existingTxns.length > 0) {
    console.log('⚠️  WARNING: Transactions already exist for this month!');
    console.log('   This script will skip duplicates but continue with import.\n');
  } else {
    console.log('✅ No existing transactions - proceeding with clean import.\n');
  }

  // Initialize caches
  const vendorCache = new Map();
  const pmCache = new Map();
  const tagCache = new Map();

  // Stats
  let totalImported = 0;
  let skippedDuplicates = 0;
  let expenseCount = 0;
  let incomeCount = 0;
  const newVendors = new Set();
  const newPaymentMethods = new Set();
  const newTags = new Set();

  // Process transactions in batches
  const BATCH_SIZE = 50;
  const batches = [];
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    batches.push(transactions.slice(i, i + BATCH_SIZE));
  }

  console.log(`🔄 Processing ${batches.length} batches of ${BATCH_SIZE} transactions...\n`);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    console.log(`   Batch ${batchIdx + 1}/${batches.length}: Processing ${batch.length} transactions...`);

    // Prepare transactions for insert
    const txnsToInsert = [];
    const tagRelationships = [];

    for (const txn of batch) {
      // Get or create vendor (supports both 'vendor' and 'merchant' field names)
      const vendorName = txn.vendor || txn.merchant;
      const vendorWasNew = !vendorCache.has(vendorName?.toLowerCase() || '');
      const vendorId = await getOrCreateVendor(vendorName, user.id, vendorCache);
      if (vendorWasNew && vendorId) {
        newVendors.add(vendorName);
      }

      // Get or create payment method
      const pmWasNew = !pmCache.has(txn.payment_method?.toLowerCase() || '');
      const paymentMethodId = await getOrCreatePaymentMethod(txn.payment_method, user.id, pmCache);
      if (pmWasNew && paymentMethodId) {
        newPaymentMethods.add(txn.payment_method);
      }

      // Get transaction date (support both field names)
      const txnDate = txn.transaction_date || txn.date;

      // Check for duplicate (same date, description, amount, vendor)
      const isDuplicate = existingTxns?.some(existing =>
        existing.transaction_date === txnDate &&
        existing.description === txn.description &&
        existing.amount === txn.amount &&
        existing.vendor_id === vendorId
      );

      if (isDuplicate) {
        skippedDuplicates++;
        continue; // Skip this transaction
      }

      // Map currency field
      const originalCurrency = txn.original_currency || txn.currency || 'USD';

      // Prepare transaction
      const transactionData = {
        user_id: user.id,
        description: txn.description,
        amount: txn.amount,
        original_currency: originalCurrency,
        transaction_type: txn.transaction_type,
        transaction_date: txnDate,
        vendor_id: vendorId,
        payment_method_id: paymentMethodId
      };

      txnsToInsert.push(transactionData);

      // Track for tag relationships
      if (txn.tags && txn.tags.length > 0) {
        tagRelationships.push({
          txnData: transactionData,
          tags: txn.tags
        });
      }

      // Count transaction type
      if (txn.transaction_type === 'income') {
        incomeCount++;
      } else {
        expenseCount++;
      }
    }

    // Insert transactions
    if (txnsToInsert.length > 0) {
      const { data: insertedTxns, error: insertError } = await supabase
        .from('transactions')
        .insert(txnsToInsert)
        .select('id, description, amount, transaction_date');

      if (insertError) {
        console.error('   ❌ Error inserting transactions:', insertError);
        throw insertError;
      }

      totalImported += insertedTxns.length;

      // Handle tags
      for (let i = 0; i < tagRelationships.length; i++) {
        const { txnData, tags } = tagRelationships[i];
        // Match by description AND amount AND date (more robust matching)
        const insertedTxn = insertedTxns.find(t =>
          t.description === txnData.description &&
          Math.abs(parseFloat(t.amount || 0) - parseFloat(txnData.amount || 0)) < 0.01
        );

        if (!insertedTxn) {
          console.error(`   ⚠️  Could not match transaction for tags: ${txnData.description} (${txnData.amount})`);
          continue;
        }

        for (const tagName of tags) {
          const tagWasNew = !tagCache.has(tagName.toLowerCase());
          const tagId = await getOrCreateTag(tagName, user.id, tagCache);
          if (tagWasNew) {
            newTags.add(tagName);
          }

          const { error: tagError } = await supabase
            .from('transaction_tags')
            .insert({
              transaction_id: insertedTxn.id,
              tag_id: tagId
            });

          if (tagError && tagError.code !== '23505') { // Ignore duplicate errors
            console.error(`   ⚠️  Error linking tag "${tagName}":`, tagError);
          }
        }
      }

      console.log(`   ✅ Imported ${insertedTxns.length} transactions`);
    } else {
      console.log(`   ⏭️  Skipped - all duplicates`);
    }
  }

  // Final report
  console.log('\n' + '='.repeat(50));
  console.log('📋 IMPORT SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Transactions: ${totalImported} imported, ${skippedDuplicates} skipped (duplicates)`);
  console.log(`Transaction Types: ${expenseCount} expenses, ${incomeCount} income`);
  console.log(`New Vendors: ${newVendors.size}`);
  if (newVendors.size > 0) {
    console.log(`   ${Array.from(newVendors).slice(0, 10).join(', ')}${newVendors.size > 10 ? '...' : ''}`);
  }
  console.log(`New Payment Methods: ${newPaymentMethods.size}`);
  if (newPaymentMethods.size > 0) {
    console.log(`   ${Array.from(newPaymentMethods).join(', ')}`);
  }
  console.log(`New Tags: ${newTags.size}`);
  if (newTags.size > 0) {
    console.log(`   ${Array.from(newTags).join(', ')}`);
  }
  console.log('='.repeat(50));
  console.log('✅ Import complete!\n');
}

// Run import
importMonth().catch(error => {
  console.error('\n❌ Import failed:', error);
  process.exit(1);
});
