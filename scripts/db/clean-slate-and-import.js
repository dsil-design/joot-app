#!/usr/bin/env node

/**
 * Clean Slate and Import Script
 * 1. Creates backup
 * 2. Clears all transaction data for dennis@dsil.design
 * 3. Clears all vendors
 * 4. Imports September 2025 data
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'dennis@dsil.design';
const SEPTEMBER_DATA_FILE = 'scripts/september-2025-CORRECTED.json';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ============= BACKUP FUNCTIONS =============

async function createBackup() {
  console.log('📦 Creating backup of current state...\n');

  const { data: user } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', USER_EMAIL)
    .single();

  if (!user) {
    console.log('ℹ️  User not found in database (first time setup?)');
    return null;
  }

  // Get all transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id);

  // Get all vendors
  const { data: vendors } = await supabase
    .from('vendors')
    .select('*')
    .eq('user_id', user.id);

  // Get all payment methods
  const { data: paymentMethods } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('user_id', user.id);

  const backup = {
    timestamp: new Date().toISOString(),
    user: user,
    transaction_count: transactions?.length || 0,
    vendor_count: vendors?.length || 0,
    payment_method_count: paymentMethods?.length || 0,
    transactions: transactions || [],
    vendors: vendors || [],
    payment_methods: paymentMethods || []
  };

  const backupDir = 'backups/pre-clean-slate';
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filename = `${backupDir}/backup-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2));

  console.log('✅ Backup created successfully!');
  console.log(`   File: ${filename}`);
  console.log(`   Transactions: ${backup.transaction_count}`);
  console.log(`   Vendors: ${backup.vendor_count}`);
  console.log(`   Payment Methods: ${backup.payment_method_count}\n`);

  return filename;
}

// ============= CLEANUP FUNCTIONS =============

async function cleanSlate() {
  console.log('🧹 Starting clean slate process...\n');

  const { data: user } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', USER_EMAIL)
    .single();

  if (!user) {
    console.log('ℹ️  No user data to clean.');
    return;
  }

  console.log(`👤 User: ${user.email} (ID: ${user.id})\n`);

  // Step 1: Delete transaction_tags relationships
  console.log('1️⃣  Deleting transaction_tags relationships...');
  const { data: transactionIds } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', user.id);

  if (transactionIds && transactionIds.length > 0) {
    const ids = transactionIds.map(t => t.id);
    const { error: tagError } = await supabase
      .from('transaction_tags')
      .delete()
      .in('transaction_id', ids);

    if (tagError) {
      console.error('   ❌ Error deleting transaction_tags:', tagError);
    } else {
      console.log('   ✅ Transaction tags deleted');
    }
  } else {
    console.log('   ℹ️  No transaction tags to delete');
  }

  // Step 2: Delete all transactions
  console.log('\n2️⃣  Deleting all transactions...');
  const { data: deletedTransactions, error: txError } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', user.id)
    .select('id');

  if (txError) {
    console.error('   ❌ Error deleting transactions:', txError);
    throw txError;
  }

  console.log(`   ✅ Deleted ${deletedTransactions?.length || 0} transactions`);

  // Step 3: Delete all vendors
  console.log('\n3️⃣  Deleting all vendors...');
  const { data: deletedVendors, error: vendorError } = await supabase
    .from('vendors')
    .delete()
    .eq('user_id', user.id)
    .select('id');

  if (vendorError) {
    console.error('   ❌ Error deleting vendors:', vendorError);
    throw vendorError;
  }

  console.log(`   ✅ Deleted ${deletedVendors?.length || 0} vendors`);

  // Step 4: Delete all payment methods
  console.log('\n4️⃣  Deleting all payment methods...');
  const { data: deletedPaymentMethods, error: pmError } = await supabase
    .from('payment_methods')
    .delete()
    .eq('user_id', user.id)
    .select('id');

  if (pmError) {
    console.error('   ❌ Error deleting payment methods:', pmError);
    throw pmError;
  }

  console.log(`   ✅ Deleted ${deletedPaymentMethods?.length || 0} payment methods`);

  // Step 5: Verify clean slate
  console.log('\n5️⃣  Verifying clean slate...');
  const { count: txCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { count: vendorCount } = await supabase
    .from('vendors')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  console.log(`   Remaining transactions: ${txCount} (should be 0)`);
  console.log(`   Remaining vendors: ${vendorCount} (should be 0)`);

  if (txCount === 0 && vendorCount === 0) {
    console.log('   ✅ Clean slate verified!\n');
  } else {
    throw new Error('❌ Clean slate verification failed!');
  }
}

// ============= IMPORT FUNCTIONS =============

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
  const { data: existing } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('user_id', userId)
    .ilike('name', normalized)
    .maybeSingle();

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
    console.error(`   ❌ Error creating tag "${tagName}":`, error);
    throw error;
  }

  tagCache.set(cacheKey, newTag.id);
  return newTag.id;
}

async function importSeptember2025() {
  console.log('📥 Importing September 2025...\n');

  // Load parsed data
  const rawData = fs.readFileSync(SEPTEMBER_DATA_FILE, 'utf8');
  const transactions = JSON.parse(rawData);

  if (!Array.isArray(transactions)) {
    throw new Error('Parsed data is not an array!');
  }

  console.log(`   Found ${transactions.length} transactions to import\n`);

  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', USER_EMAIL)
    .single();

  if (!user) {
    throw new Error('User not found!');
  }

  // Initialize caches
  const vendorCache = new Map();
  const pmCache = new Map();
  const tagCache = new Map();

  // Process transactions in batches
  const BATCH_SIZE = 50;
  const batches = [];
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    batches.push(transactions.slice(i, i + BATCH_SIZE));
  }

  let totalImported = 0;
  let expenseCount = 0;
  let incomeCount = 0;

  console.log(`   Processing ${batches.length} batches of ${BATCH_SIZE} transactions...\n`);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    console.log(`   Batch ${batchIdx + 1}/${batches.length}: Processing ${batch.length} transactions...`);

    // Prepare transactions for insert
    const txnsToInsert = [];
    const tagRelationships = [];

    for (const txn of batch) {
      // Get or create vendor
      const vendorId = await getOrCreateVendor(txn.merchant, user.id, vendorCache);

      // Get or create payment method
      const paymentMethodId = await getOrCreatePaymentMethod(txn.payment_method, user.id, pmCache);

      // Prepare transaction
      const transaction = {
        user_id: user.id,
        transaction_date: txn.date,
        description: txn.description,
        amount: txn.amount,
        original_currency: txn.currency,
        transaction_type: txn.transaction_type,
        vendor_id: vendorId,
        payment_method_id: paymentMethodId
      };

      txnsToInsert.push({ original: txn, prepared: transaction });

      // Track counts
      if (txn.transaction_type === 'expense') {
        expenseCount++;
      } else if (txn.transaction_type === 'income') {
        incomeCount++;
      }
    }

    // Insert transactions
    const { data: insertedTxns, error: insertError } = await supabase
      .from('transactions')
      .insert(txnsToInsert.map(t => t.prepared))
      .select('id');

    if (insertError) {
      console.error('   ❌ Error inserting transactions:', insertError);
      throw insertError;
    }

    // Handle tags
    for (let i = 0; i < insertedTxns.length; i++) {
      const txnId = insertedTxns[i].id;
      const originalTxn = txnsToInsert[i].original;

      if (originalTxn.tags && originalTxn.tags.length > 0) {
        for (const tagName of originalTxn.tags) {
          const tagId = await getOrCreateTag(tagName, user.id, tagCache);
          tagRelationships.push({
            transaction_id: txnId,
            tag_id: tagId
          });
        }
      }
    }

    // Insert tag relationships
    if (tagRelationships.length > 0) {
      const { error: tagError } = await supabase
        .from('transaction_tags')
        .insert(tagRelationships);

      if (tagError) {
        console.error('   ❌ Error inserting transaction tags:', tagError);
        throw tagError;
      }
    }

    totalImported += insertedTxns.length;
    console.log(`   ✅ Batch ${batchIdx + 1} complete (${insertedTxns.length} transactions, ${tagRelationships.length} tags)\n`);
  }

  console.log('✅ Import complete!\n');
  console.log('📊 Import Summary:');
  console.log(`   Total transactions: ${totalImported}`);
  console.log(`   Expenses: ${expenseCount}`);
  console.log(`   Income: ${incomeCount}`);
  console.log(`   Unique vendors: ${vendorCache.size}`);
  console.log(`   Unique payment methods: ${pmCache.size}`);
  console.log(`   Unique tags: ${tagCache.size}\n`);

  return {
    totalImported,
    expenseCount,
    incomeCount,
    vendorCount: vendorCache.size,
    paymentMethodCount: pmCache.size,
    tagCount: tagCache.size
  };
}

// ============= VALIDATION FUNCTIONS =============

async function validateImport() {
  console.log('🔍 Validating import...\n');

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  // Count transactions
  const { count: txCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  console.log(`   Total transactions in database: ${txCount}`);

  // Count by type
  const { count: expenseCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('transaction_type', 'expense');

  const { count: incomeCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('transaction_type', 'income');

  console.log(`   Expenses: ${expenseCount}`);
  console.log(`   Income: ${incomeCount}`);

  // Get all transactions for September 2025
  const { data: septTransactions } = await supabase
    .from('transactions')
    .select('amount, original_currency, transaction_type')
    .eq('user_id', user.id)
    .gte('transaction_date', '2025-09-01')
    .lt('transaction_date', '2025-10-01');

  // Calculate totals (simplified - all as USD)
  let totalExpenses = 0;
  let totalIncome = 0;

  septTransactions.forEach(txn => {
    const amount = parseFloat(txn.amount);
    if (txn.transaction_type === 'expense') {
      totalExpenses += amount;
    } else if (txn.transaction_type === 'income') {
      totalIncome += amount;
    }
  });

  const netTotal = totalExpenses - totalIncome;

  console.log(`\n   Total Expenses: $${totalExpenses.toFixed(2)}`);
  console.log(`   Total Income: $${totalIncome.toFixed(2)}`);
  console.log(`   NET Total: $${netTotal.toFixed(2)}`);
  console.log(`   Expected (CSV): $6,804.11`);
  console.log(`   Variance: $${Math.abs(netTotal - 6804.11).toFixed(2)}`);

  const variancePercent = Math.abs(netTotal - 6804.11) / 6804.11 * 100;
  console.log(`   Variance %: ${variancePercent.toFixed(2)}%`);

  if (variancePercent <= 1.5) {
    console.log('   ✅ Validation PASSED (within 1.5% threshold)\n');
  } else {
    console.log('   ⚠️  Variance exceeds 1.5% threshold\n');
  }

  // Tag distribution
  const { data: tagData } = await supabase
    .from('transaction_tags')
    .select('tag_id, tags(name)')
    .in('transaction_id', septTransactions.map((_, idx) => idx)); // Simplified

  console.log('');
}

// ============= MAIN EXECUTION =============

async function main() {
  console.log('═'.repeat(80));
  console.log('🚀 CLEAN SLATE AND IMPORT - SEPTEMBER 2025');
  console.log('═'.repeat(80));
  console.log('');

  try {
    // Step 1: Create backup
    const backupFile = await createBackup();

    // Step 2: Clean slate
    await cleanSlate();

    // Step 3: Import September 2025
    const importStats = await importSeptember2025();

    // Step 4: Validate
    await validateImport();

    console.log('═'.repeat(80));
    console.log('✅ ALL OPERATIONS COMPLETE!');
    console.log('═'.repeat(80));
    console.log('');
    console.log('Summary:');
    if (backupFile) {
      console.log(`  📦 Backup saved: ${backupFile}`);
    }
    console.log(`  🧹 Database cleaned`);
    console.log(`  📥 Imported ${importStats.totalImported} transactions`);
    console.log(`  🏪 Created ${importStats.vendorCount} vendors`);
    console.log(`  💳 Created ${importStats.paymentMethodCount} payment methods`);
    console.log(`  🏷️  Created ${importStats.tagCount} tags`);
    console.log('');

  } catch (error) {
    console.error('');
    console.error('═'.repeat(80));
    console.error('❌ ERROR OCCURRED');
    console.error('═'.repeat(80));
    console.error('');
    console.error(error);
    console.error('');
    console.error('⚠️  Database may be in an inconsistent state.');
    console.error('   Consider restoring from backup if needed.');
    process.exit(1);
  }
}

// Run the script
main();
