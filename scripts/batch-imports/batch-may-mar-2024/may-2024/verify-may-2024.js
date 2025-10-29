#!/usr/bin/env node

/**
 * May 2024 Tag Verification - Phase 4
 * Verifies that all tags from parsed JSON match database
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'dennis@dsil.design';
const JSON_FILE = path.join(__dirname, 'may-2024-CORRECTED.json');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🔍 May 2024 Tag Verification - Phase 4\n');

  // Load parsed JSON
  const parsedTransactions = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
  console.log(`📄 Loaded ${parsedTransactions.length} parsed transactions`);

  // Get user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  // Get all May 2024 transactions from database
  const { data: dbTransactions } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      transaction_date,
      amount,
      original_currency,
      transaction_type,
      vendor:vendors(name),
      payment_method:payment_methods(name),
      transaction_tags(
        tag:tags(name)
      )
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', '2024-05-01')
    .lte('transaction_date', '2024-05-31')
    .order('transaction_date');

  console.log(`💾 Found ${dbTransactions.length} transactions in database\n`);

  // Analyze tags
  const parsedTagStats = {};
  parsedTransactions.forEach(t => {
    if (t.tags && t.tags.length > 0) {
      t.tags.forEach(tag => {
        parsedTagStats[tag] = (parsedTagStats[tag] || 0) + 1;
      });
    }
  });

  const dbTagStats = {};
  dbTransactions.forEach(t => {
    if (t.transaction_tags && t.transaction_tags.length > 0) {
      t.transaction_tags.forEach(tt => {
        const tagName = tt.tag.name;
        dbTagStats[tagName] = (dbTagStats[tagName] || 0) + 1;
      });
    }
  });

  console.log('📊 Tag Comparison:\n');
  console.log('Expected (from JSON):');
  Object.entries(parsedTagStats).forEach(([tag, count]) => {
    console.log(`  - ${tag}: ${count}`);
  });

  console.log('\nActual (from Database):');
  Object.entries(dbTagStats).forEach(([tag, count]) => {
    console.log(`  - ${tag}: ${count}`);
  });

  // Check for discrepancies
  const allTags = new Set([...Object.keys(parsedTagStats), ...Object.keys(dbTagStats)]);
  let hasDiscrepancies = false;

  console.log('\n🔍 Verification Results:\n');
  for (const tag of allTags) {
    const expected = parsedTagStats[tag] || 0;
    const actual = dbTagStats[tag] || 0;

    if (expected === actual) {
      console.log(`✅ ${tag}: ${actual}/${expected} match`);
    } else {
      console.log(`❌ ${tag}: ${actual}/${expected} MISMATCH`);
      hasDiscrepancies = true;
    }
  }

  // Check transaction counts
  console.log('\n📊 Transaction Count Verification:\n');
  const expectedExpenses = parsedTransactions.filter(t => t.transaction_type === 'expense').length;
  const expectedIncome = parsedTransactions.filter(t => t.transaction_type === 'income').length;
  const actualExpenses = dbTransactions.filter(t => t.transaction_type === 'expense').length;
  const actualIncome = dbTransactions.filter(t => t.transaction_type === 'income').length;

  console.log(`Expenses: ${actualExpenses}/${expectedExpenses} ${actualExpenses === expectedExpenses ? '✅' : '❌'}`);
  console.log(`Income: ${actualIncome}/${expectedIncome} ${actualIncome === expectedIncome ? '✅' : '❌'}`);
  console.log(`Total: ${dbTransactions.length}/${parsedTransactions.length} ${dbTransactions.length === parsedTransactions.length ? '✅' : '❌'}`);

  // Verify specific expected transactions
  console.log('\n🎯 Key Transaction Verification:\n');

  const checks = [
    { desc: 'This Month\'s Rent', date: '2024-05-05', amount: 25000, currency: 'THB' },
    { desc: 'Reimbursement: Dinner', date: '2024-05-23', tag: 'Reimbursement' },
    { desc: 'Emergency Savings', date: '2024-05-31', tag: 'Savings/Investment' },
    { desc: 'Flights: SEA - TPE', date: '2024-05-08', amount: 1240.3 }
  ];

  for (const check of checks) {
    const found = dbTransactions.find(t =>
      t.description === check.desc &&
      t.transaction_date === check.date
    );

    if (!found) {
      console.log(`❌ Missing: ${check.desc} (${check.date})`);
      hasDiscrepancies = true;
    } else {
      let matchDetails = `✅ ${check.desc} (${check.date})`;

      if (check.amount && found.amount !== check.amount) {
        matchDetails += ` - Amount mismatch: ${found.amount} vs ${check.amount}`;
        hasDiscrepancies = true;
      }

      if (check.currency && found.original_currency !== check.currency) {
        matchDetails += ` - Currency mismatch: ${found.original_currency} vs ${check.currency}`;
        hasDiscrepancies = true;
      }

      if (check.tag) {
        const hasTag = found.transaction_tags.some(tt => tt.tag.name === check.tag);
        if (!hasTag) {
          matchDetails += ` - Missing tag: ${check.tag}`;
          hasDiscrepancies = true;
        }
      }

      console.log(matchDetails);
    }
  }

  // Final result
  console.log('\n' + '='.repeat(60));
  if (!hasDiscrepancies) {
    console.log('✅ May 2024 Verification PASSED');
    console.log('='.repeat(60));
    console.log('\nAll transactions imported correctly with proper tags.');
    console.log('Ready to proceed to April 2024 import.\n');
  } else {
    console.log('⚠️  May 2024 Verification FAILED');
    console.log('='.repeat(60));
    console.log('\nDiscrepancies found. Review the output above.\n');
  }
}

main();
