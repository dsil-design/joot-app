#!/usr/bin/env node

/**
 * Phase 1: Database Transaction Analyzer
 * Extracts all transactions from database and creates fingerprints
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'dennis@dsil.design';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function createFingerprint(transaction) {
  // Create a consistent fingerprint for matching
  const parts = [
    transaction.date,
    transaction.description.toLowerCase().trim(),
    transaction.amount.toFixed(2),
    transaction.currency,
    transaction.type
  ];
  const data = parts.join('|');
  return crypto.createHash('sha256').update(data).digest('hex');
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

async function getAllTransactions(userId) {
  console.log('📊 Fetching all transactions from database...\n');

  let allTransactions = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        description,
        amount,
        original_currency,
        transaction_type,
        transaction_date,
        vendor_id,
        payment_method_id,
        vendors (name),
        payment_methods (name),
        transaction_tags (
          tags (name)
        )
      `)
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .range(from, from + batchSize - 1);

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    if (transactions.length === 0) {
      hasMore = false;
    } else {
      allTransactions = allTransactions.concat(transactions);
      from += batchSize;
      process.stdout.write(`\r   Fetched ${allTransactions.length} transactions...`);
    }
  }

  console.log(`\n✅ Fetched ${allTransactions.length} transactions total\n`);

  const transactions = allTransactions;

  // Transform and fingerprint
  const processed = transactions.map(t => {
    const tags = (t.transaction_tags || []).map(tt => tt.tags.name);

    return {
      id: `db_${t.id}`,
      dbId: t.id,
      fingerprint: null, // Will be set below
      date: t.transaction_date,
      description: t.description,
      merchant: t.vendors ? t.vendors.name : null,
      paymentMethod: t.payment_methods ? t.payment_methods.name : null,
      amount: parseFloat(t.amount),
      currency: t.original_currency,
      type: t.transaction_type,
      tags: tags,
      source: 'database'
    };
  });

  // Create fingerprints
  processed.forEach(t => {
    t.fingerprint = createFingerprint(t);
  });

  return processed;
}

function detectDuplicates(transactions) {
  console.log('🔍 Detecting duplicates...\n');

  const fingerprintMap = new Map();
  const duplicates = [];

  transactions.forEach(t => {
    if (fingerprintMap.has(t.fingerprint)) {
      const existing = fingerprintMap.get(t.fingerprint);
      duplicates.push({
        fingerprint: t.fingerprint,
        transactions: [existing, t]
      });
    } else {
      fingerprintMap.set(t.fingerprint, t);
    }
  });

  if (duplicates.length > 0) {
    console.log(`⚠️  Found ${duplicates.length} duplicate fingerprints`);
    duplicates.slice(0, 5).forEach((dup, i) => {
      console.log(`   ${i + 1}. ${dup.transactions[0].date} - ${dup.transactions[0].description}`);
    });
  } else {
    console.log('✅ No duplicates found');
  }

  console.log('');
  return duplicates;
}

function groupByMonth(transactions) {
  const byMonth = {};

  transactions.forEach(t => {
    const month = t.date.substring(0, 7);
    if (!byMonth[month]) {
      byMonth[month] = { expense: 0, income: 0, total: 0 };
    }
    byMonth[month].total++;
    if (t.type === 'expense') byMonth[month].expense++;
    if (t.type === 'income') byMonth[month].income++;
  });

  return byMonth;
}

function analyzeByTags(transactions) {
  const byTag = {};

  transactions.forEach(t => {
    t.tags.forEach(tag => {
      if (!byTag[tag]) byTag[tag] = 0;
      byTag[tag]++;
    });
  });

  return byTag;
}

async function main() {
  console.log('=' .repeat(80));
  console.log('PHASE 1: DATABASE TRANSACTION ANALYSIS');
  console.log('='.repeat(80));
  console.log('');

  try {
    const userId = await getUserId(USER_EMAIL);
    const transactions = await getAllTransactions(userId);
    const duplicates = detectDuplicates(transactions);
    const byMonth = groupByMonth(transactions);
    const byTag = analyzeByTags(transactions);

    // Group by currency
    const byCurrency = transactions.reduce((acc, t) => {
      acc[t.currency] = (acc[t.currency] || 0) + 1;
      return acc;
    }, {});

    // Group by type
    const byType = transactions.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {});

    const output = {
      metadata: {
        analysisDate: new Date().toISOString(),
        userEmail: USER_EMAIL,
        totalCount: transactions.length
      },
      summary: {
        byMonth,
        byCurrency,
        byType,
        byTag,
        duplicateCount: duplicates.length
      },
      duplicates,
      transactions
    };

    // Save to file
    const outputPath = 'verification-output/database-transactions.json';
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log('📊 Summary:');
    console.log(`   Total transactions: ${transactions.length}`);
    console.log(`   Unique months: ${Object.keys(byMonth).length}`);
    console.log(`   Duplicates: ${duplicates.length}`);
    console.log(`   By Type: ${Object.entries(byType).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    console.log(`   By Currency: ${Object.entries(byCurrency).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    console.log('');
    console.log(`✅ Output saved to: ${outputPath}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
