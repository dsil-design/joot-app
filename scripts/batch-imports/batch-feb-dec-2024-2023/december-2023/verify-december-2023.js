#!/usr/bin/env node

/**
 * December 2023 Tag Verification - Phase 4
 * Verifies that all tags from parsed JSON match database
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'dennis@dsil.design';
const JSON_FILE = path.join(__dirname, 'december-2023-CORRECTED.json');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🔍 December 2023 Tag Verification - Phase 4\n');

  // Load parsed JSON
  const parsedTransactions = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
  console.log(`📄 Loaded ${parsedTransactions.length} parsed transactions`);

  // Get user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  // Get all December 2023 transactions from database
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
        tag:tags(id, name)
      )
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', '2023-12-01')
    .lte('transaction_date', '2023-12-31')
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
  const dbTagIds = {};
  dbTransactions.forEach(t => {
    if (t.transaction_tags && t.transaction_tags.length > 0) {
      t.transaction_tags.forEach(tt => {
        const tagName = tt.tag.name;
        const tagId = tt.tag.id;
        dbTagStats[tagName] = (dbTagStats[tagName] || 0) + 1;
        dbTagIds[tagName] = tagId;
      });
    }
  });

  console.log('📊 Tag Comparison:\n');
  console.log('Expected (from JSON):');
  if (Object.keys(parsedTagStats).length === 0) {
    console.log('  (No tags expected)');
  } else {
    Object.entries(parsedTagStats).forEach(([tag, count]) => {
      console.log(`  - ${tag}: ${count}`);
    });
  }

  console.log('\nActual (from Database):');
  if (Object.keys(dbTagStats).length === 0) {
    console.log('  (No tags found)');
  } else {
    Object.entries(dbTagStats).forEach(([tag, count]) => {
      console.log(`  - ${tag}: ${count} (ID: ${dbTagIds[tag]})`);
    });
  }

  // Check for discrepancies
  const allTags = new Set([...Object.keys(parsedTagStats), ...Object.keys(dbTagStats)]);
  let hasDiscrepancies = false;

  console.log('\n🔍 Verification Results:\n');

  if (allTags.size === 0) {
    console.log('✅ No tags expected, no tags found');
  } else {
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
  }

  // Verify expected tag IDs
  console.log('\n🔑 Tag ID Verification:\n');
  const expectedTagIds = {
    'Savings/Investment': 'c0928dfe-1544-4569-bbad-77fea7d7e5aa',
    'Reimbursement': '205d99a2-cf0a-44e0-92f3-e2b9eae1bf72',
    'Business Expense': '973433bd-bf9f-469f-9b9f-20128def8726',
    'Florida House': '178739fd-1712-4356-b21a-8936b6d0a461'
  };

  for (const [tagName, expectedId] of Object.entries(expectedTagIds)) {
    if (dbTagIds[tagName]) {
      if (dbTagIds[tagName] === expectedId) {
        console.log(`✅ ${tagName}: ID matches (${expectedId})`);
      } else {
        console.log(`❌ ${tagName}: ID mismatch - Expected ${expectedId}, got ${dbTagIds[tagName]}`);
        hasDiscrepancies = true;
      }
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

  if (actualExpenses !== expectedExpenses || actualIncome !== expectedIncome || dbTransactions.length !== parsedTransactions.length) {
    hasDiscrepancies = true;
  }

  // Currency distribution
  console.log('\n💱 Currency Distribution:\n');
  const expectedCurrency = parsedTransactions.reduce((acc, t) => {
    acc[t.currency] = (acc[t.currency] || 0) + 1;
    return acc;
  }, {});
  const actualCurrency = dbTransactions.reduce((acc, t) => {
    acc[t.original_currency] = (acc[t.original_currency] || 0) + 1;
    return acc;
  }, {});

  for (const [currency, count] of Object.entries(expectedCurrency)) {
    const dbCount = actualCurrency[currency] || 0;
    console.log(`${currency}: ${dbCount}/${count} ${dbCount === count ? '✅' : '❌'}`);
    if (dbCount !== count) hasDiscrepancies = true;
  }

  // Verify specific expected transactions
  console.log('\n🎯 Key Transaction Verification:\n');

  const checks = [
    // Dual rent payments (transition month)
    { desc: 'This Month\u2019s Rent, Storage, Internet, PECO (Conshy)', date: '2023-12-01', amount: 957, currency: 'USD' },
    { desc: 'This Month\u2019s Rent', date: '2023-12-05', amount: 25000, currency: 'THB', vendor: 'Pol' },

    // Refunds/Reimbursements (converted to income)
    { desc: 'Refund: Sonic Game', amount: 66, currency: 'USD', type: 'income' },
    { desc: 'Reimbursement Dinner', amount: 45, currency: 'USD', type: 'income', tag: 'Reimbursement' },
    { desc: 'Poker Winnings', amount: 6.3, currency: 'USD', type: 'income' },

    // Major flight (relocation to Thailand)
    { desc: 'Flight: EWR to CNX', amount: 1334.3, currency: 'USD', vendor: 'Singapore Airlines' },
    { desc: 'Flight: CNX - DAD', amount: 57.36, currency: 'USD', vendor: 'AirAsia' },

    // Key subscriptions
    { desc: 'Work Email', date: '2023-12-01', amount: 6.36, currency: 'USD', vendor: 'Google' },
    { desc: 'Monthly Subscription: iPhone Payment', amount: 54.08, currency: 'USD' },
    { desc: 'Monthly Subscription: Netflix', amount: 24.37, currency: 'USD' },
    { desc: 'Monthly Subscription: YouTube Premium', amount: 20.13, currency: 'USD' }
  ];

  for (const check of checks) {
    const found = dbTransactions.find(t => {
      if (check.date) {
        return t.description === check.desc && t.transaction_date === check.date;
      } else {
        // For transactions without specific date, just match description
        return t.description === check.desc;
      }
    });

    if (!found) {
      console.log(`❌ Missing: ${check.desc}${check.date ? ` (${check.date})` : ''}`);
      hasDiscrepancies = true;
    } else {
      let matchDetails = `✅ ${check.desc}${check.date ? ` (${check.date})` : ''}`;
      let itemHasIssue = false;

      if (check.amount && Math.abs(found.amount - check.amount) > 0.01) {
        matchDetails += ` - Amount mismatch: ${found.amount} vs ${check.amount}`;
        itemHasIssue = true;
      }

      if (check.currency && found.original_currency !== check.currency) {
        matchDetails += ` - Currency mismatch: ${found.original_currency} vs ${check.currency}`;
        itemHasIssue = true;
      }

      if (check.type && found.transaction_type !== check.type) {
        matchDetails += ` - Type mismatch: ${found.transaction_type} vs ${check.type}`;
        itemHasIssue = true;
      }

      if (check.vendor && found.vendor && found.vendor.name !== check.vendor) {
        matchDetails += ` - Vendor mismatch: ${found.vendor.name} vs ${check.vendor}`;
        itemHasIssue = true;
      }

      if (check.tag) {
        const hasTag = found.transaction_tags.some(tt => tt.tag.name === check.tag);
        if (!hasTag) {
          matchDetails += ` - Missing tag: ${check.tag}`;
          itemHasIssue = true;
        }
      }

      if (itemHasIssue) {
        matchDetails = matchDetails.replace('✅', '❌');
        hasDiscrepancies = true;
      }

      console.log(matchDetails);
    }
  }

  // Check for negative amounts (should be 0)
  console.log('\n🔍 Negative Amount Check:\n');
  const negativeAmounts = dbTransactions.filter(t => t.amount < 0);
  if (negativeAmounts.length === 0) {
    console.log('✅ No negative amounts found (all refunds properly converted)');
  } else {
    console.log(`❌ Found ${negativeAmounts.length} transactions with negative amounts:`);
    negativeAmounts.forEach(t => {
      console.log(`   - ${t.description} (${t.transaction_date}): ${t.amount}`);
    });
    hasDiscrepancies = true;
  }

  // Final result
  console.log('\n' + '='.repeat(60));
  if (!hasDiscrepancies) {
    console.log('✅ December 2023 Verification PASSED');
    console.log('='.repeat(60));
    console.log('\nAll transactions imported correctly with proper tags.');
    console.log('✅ Phase 4 Complete - December 2023 Validated');
    console.log('\n🎉 BATCH COMPLETE: Feb-Jan-Dec 2024-2023 (All 3 months validated)\n');
  } else {
    console.log('⚠️  December 2023 Verification FAILED');
    console.log('='.repeat(60));
    console.log('\nDiscrepancies found. Review the output above.\n');
    process.exit(1);
  }
}

main();
