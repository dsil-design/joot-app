#!/usr/bin/env node

/**
 * August 2021 Import Script
 * Imports 145 transactions from august-2021-CORRECTED.json
 * Part of Aug-May 2021 Batch Import (Batch 8, Month 1)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'dennis@dsil.design';
const JSON_FILE = path.join(__dirname, 'august-2021-CORRECTED.json');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ============= HELPER FUNCTIONS =============

function extractPaymentMethodName(paymentType) {
  // Return the full payment method string as-is
  // The database stores full names like "Credit Card: Chase Sapphire Reserve"
  if (!paymentType) return null;
  return paymentType.trim();
}

async function getUserId(email) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (error || !user) {
    throw new Error(`User not found: ${email}`);
  }
  return user.id;
}

async function getOrCreateVendor(name, userId, vendorMap) {
  if (vendorMap.has(name)) {
    return vendorMap.get(name);
  }

  const { data: existingVendor } = await supabase
    .from('vendors')
    .select('id')
    .eq('name', name)
    .eq('user_id', userId)
    .single();

  if (existingVendor) {
    vendorMap.set(name, existingVendor.id);
    return existingVendor.id;
  }

  const { data: newVendor, error } = await supabase
    .from('vendors')
    .insert({ name, user_id: userId })
    .select('id')
    .single();

  if (error || !newVendor) {
    throw new Error(`Failed to create vendor: ${name}`);
  }

  vendorMap.set(name, newVendor.id);
  return newVendor.id;
}

async function getOrCreatePaymentMethod(name, userId, paymentMap) {
  if (paymentMap.has(name)) {
    return paymentMap.get(name);
  }

  const { data: existingMethod } = await supabase
    .from('payment_methods')
    .select('id')
    .eq('name', name)
    .eq('user_id', userId)
    .single();

  if (existingMethod) {
    paymentMap.set(name, existingMethod.id);
    return existingMethod.id;
  }

  // Get current max sort_order to avoid conflicts
  const { data: maxSortData } = await supabase
    .from('payment_methods')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextSortOrder = maxSortData ? maxSortData.sort_order + 1 : 0;

  const { data: newMethod, error } = await supabase
    .from('payment_methods')
    .insert({
      name,
      user_id: userId,
      sort_order: nextSortOrder
    })
    .select('id')
    .single();

  if (error || !newMethod) {
    throw new Error(`Failed to create payment method: ${name} - ${error?.message}`);
  }

  paymentMap.set(name, newMethod.id);
  return newMethod.id;
}

async function getExistingTag(name, userId, tagMap) {
  if (tagMap.has(name)) {
    return tagMap.get(name);
  }

  const { data: existingTag } = await supabase
    .from('tags')
    .select('id')
    .eq('name', name)
    .eq('user_id', userId)
    .single();

  if (existingTag) {
    tagMap.set(name, existingTag.id);
    return existingTag.id;
  }

  return null;
}

async function createTransactionWithTags(transaction, dbIds) {
  // Get vendor ID if merchant exists
  let vendorId = null;
  if (transaction.merchant) {
    vendorId = await getOrCreateVendor(transaction.merchant, dbIds.userId, dbIds.vendors);
  }

  // Get payment method ID
  let paymentMethodId = null;
  if (transaction.payment_method) {
    const paymentMethodName = extractPaymentMethodName(transaction.payment_method);
    if (paymentMethodName) {
      paymentMethodId = await getOrCreatePaymentMethod(paymentMethodName, dbIds.userId, dbIds.paymentMethods);
    }
  }

  // Create transaction
  const { data: newTransaction, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: dbIds.userId,
      description: transaction.description,
      vendor_id: vendorId,
      payment_method_id: paymentMethodId,
      amount: transaction.amount,
      original_currency: transaction.currency,
      transaction_type: transaction.transaction_type,
      transaction_date: transaction.transaction_date
    })
    .select('id')
    .single();

  if (transactionError || !newTransaction) {
    throw new Error(`Failed to create transaction: ${transaction.description} - ${transactionError?.message}`);
  }

  // Apply tags if any
  if (transaction.tags && transaction.tags.length > 0) {
    const tagIds = [];

    for (const tagName of transaction.tags) {
      const tagId = await getExistingTag(tagName, dbIds.userId, dbIds.tags);
      if (tagId) {
        tagIds.push(tagId);
      } else {
        console.warn(`⚠️  Tag not found: "${tagName}"`);
      }
    }

    if (tagIds.length > 0) {
      const tagInserts = tagIds.map(tagId => ({
        transaction_id: newTransaction.id,
        tag_id: tagId
      }));

      const { error: tagError } = await supabase
        .from('transaction_tags')
        .insert(tagInserts);

      if (tagError) {
        console.warn(`⚠️  Failed to apply tags to transaction ${newTransaction.id}:`, tagError.message);
      }
    }
  }

  return newTransaction.id;
}

// ============= MAIN EXECUTION =============

async function main() {
  console.log('🚀 April 2024 Import - Phase 3\n');
  console.log('📁 File: april-2024-CORRECTED.json');
  console.log('👤 User: dennis@dsil.design\n');

  try {
    // Check if file exists
    if (!fs.existsSync(JSON_FILE)) {
      throw new Error(`File not found: ${JSON_FILE}`);
    }

    // Read JSON
    console.log('📄 Reading JSON file...');
    const transactions = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
    console.log(`✅ Loaded ${transactions.length} transactions\n`);

    // Show summary stats
    const currencyStats = transactions.reduce((acc, t) => {
      acc[t.currency] = (acc[t.currency] || 0) + 1;
      return acc;
    }, {});

    const typeStats = transactions.reduce((acc, t) => {
      acc[t.transaction_type] = (acc[t.transaction_type] || 0) + 1;
      return acc;
    }, {});

    const tagStats = transactions.reduce((acc, t) => {
      if (t.tags && t.tags.length > 0) {
        t.tags.forEach(tag => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
      }
      return acc;
    }, {});

    console.log('📊 Pre-Import Summary:');
    console.log(`   Total Transactions: ${transactions.length}`);
    console.log(`   By Type: Expenses (${typeStats.expense || 0}), Income (${typeStats.income || 0})`);
    console.log(`   By Currency: ${Object.entries(currencyStats).map(([c, n]) => `${c} (${n})`).join(', ')}`);
    if (Object.keys(tagStats).length > 0) {
      console.log(`   Tags: ${Object.entries(tagStats).map(([t, n]) => `${t} (${n})`).join(', ')}`);
    }
    console.log();

    // Get user ID
    console.log('👤 Looking up user...');
    const userId = await getUserId(USER_EMAIL);
    console.log(`✅ Found user: ${USER_EMAIL}\n`);

    // Initialize database ID maps
    const dbIds = {
      userId,
      vendors: new Map(),
      paymentMethods: new Map(),
      tags: new Map()
    };

    // Import transactions
    console.log('💾 Importing transactions to database...\n');
    let successCount = 0;
    let failCount = 0;
    const startTime = Date.now();
    const errors = [];

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];

      try {
        await createTransactionWithTags(transaction, dbIds);
        successCount++;

        // Show progress every 25 transactions
        if (successCount % 25 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (successCount / (Date.now() - startTime) * 1000).toFixed(1);
          console.log(`   Progress: ${successCount}/${transactions.length} (${rate}/sec, ${elapsed}s elapsed)`);
        }
      } catch (error) {
        failCount++;
        errors.push({
          transaction: `${transaction.description} (${transaction.transaction_date})`,
          error: error.message
        });
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgRate = (successCount / (Date.now() - startTime) * 1000).toFixed(1);

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ April 2024 Import Complete!');
    console.log(`${'='.repeat(60)}\n`);
    console.log(`✅ Successfully imported: ${successCount}/${transactions.length} transactions`);

    if (failCount > 0) {
      console.log(`⚠️  Failed imports: ${failCount}`);
      console.log('\nError Details:');
      errors.forEach(e => {
        console.log(`   ❌ ${e.transaction} - ${e.error}`);
      });
    }

    console.log(`\n⏱️  Total time: ${totalTime}s (${avgRate} transactions/sec)`);
    console.log(`📦 Vendors created/reused: ${dbIds.vendors.size}`);
    console.log(`💳 Payment methods created/reused: ${dbIds.paymentMethods.size}`);
    console.log(`🏷️  Tags found: ${dbIds.tags.size}`);

    console.log('\n✅ Ready for Phase 4: Tag Verification\n');

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
