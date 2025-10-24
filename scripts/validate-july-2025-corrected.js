#!/usr/bin/env node

/**
 * Validation Script for July 2025 (Corrected Import)
 *
 * Verifies that THB transactions are stored with original values,
 * not USD conversions.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const USER_EMAIL = 'dennis@dsil.design';
const MONTH = '2025-07';

// Exchange rate from PDF (July 2025)
const THB_TO_USD_RATE = 32.47; // 1 USD = 32.47 THB (approx)

async function validateJuly2025() {
  console.log('='.repeat(70));
  console.log('JULY 2025 VALIDATION REPORT (CORRECTED IMPORT)');
  console.log('='.repeat(70));
  console.log(`Month: ${MONTH}`);
  console.log(`User: ${USER_EMAIL}\n`);

  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  if (!user) {
    console.error('❌ User not found');
    process.exit(1);
  }

  // Get all transactions for July 2025
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, description, amount, original_currency, transaction_type, transaction_date')
    .eq('user_id', user.id)
    .gte('transaction_date', `${MONTH}-01`)
    .lt('transaction_date', '2025-08-01')
    .order('transaction_date', { ascending: true });

  if (error) {
    console.error('❌ Error fetching transactions:', error);
    process.exit(1);
  }

  console.log(`📊 Total Transactions: ${transactions.length}\n`);

  // Group by currency
  const byCurrency = transactions.reduce((acc, t) => {
    if (!acc[t.original_currency]) acc[t.original_currency] = [];
    acc[t.original_currency].push(t);
    return acc;
  }, {});

  console.log('💱 Currency Breakdown:');
  Object.keys(byCurrency).sort().forEach(currency => {
    const txns = byCurrency[currency];
    const total = txns.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    console.log(`   ${currency}: ${txns.length} transactions, Total: ${total.toFixed(2)}`);
  });

  // Critical Validation: Check rent transaction
  console.log('\n🏠 CRITICAL: Rent Transaction Validation');
  const rentTxn = transactions.find(t => t.description && t.description.toLowerCase().includes("this month") && t.description.toLowerCase().includes("rent"));

  if (!rentTxn) {
    console.error('   ❌ FAIL: Rent transaction not found!');
    console.log('   Available rent-related transactions:');
    transactions.filter(t => t.description && t.description.toLowerCase().includes('rent')).forEach(t => {
      console.log(`      - "${t.description}": ${t.amount} ${t.original_currency}`);
    });
  } else {
    console.log(`   Description: ${rentTxn.description}`);
    console.log(`   Amount: ${rentTxn.amount}`);
    console.log(`   Currency: ${rentTxn.original_currency}`);
    console.log(`   Date: ${rentTxn.transaction_date}`);

    if (rentTxn.original_currency === 'THB' && parseFloat(rentTxn.amount) === 35000) {
      console.log('   ✅ PASS: Rent is correctly stored as 35000 THB');
    } else if (rentTxn.original_currency === 'USD' || parseFloat(rentTxn.amount) < 10000) {
      console.error('   ❌ FAIL: Rent appears to be stored with USD conversion!');
      console.error(`      Expected: 35000 THB`);
      console.error(`      Got: ${rentTxn.amount} ${rentTxn.original_currency}`);
    } else {
      console.warn(`   ⚠️  WARNING: Rent amount is ${rentTxn.amount} ${rentTxn.original_currency} (expected 35000 THB)`);
    }
  }

  // Check THB transactions
  if (byCurrency.THB) {
    console.log('\n📊 THB Transactions Analysis:');
    const thbTxns = byCurrency.THB;
    const amounts = thbTxns.map(t => parseFloat(t.amount));
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    console.log(`   Count: ${thbTxns.length}`);
    console.log(`   Min: ${min.toFixed(2)} THB`);
    console.log(`   Max: ${max.toFixed(2)} THB`);
    console.log(`   Avg: ${avg.toFixed(2)} THB`);

    // Check if any THB amounts look suspiciously like USD conversions
    const suspiciouslyLow = thbTxns.filter(t => {
      const amt = parseFloat(t.amount);
      return amt > 100 && amt < 3000 && !t.description.toLowerCase().includes('taxi') && !t.description.toLowerCase().includes('grab');
    });

    if (suspiciouslyLow.length > 0) {
      console.log(`\n   ⚠️  Found ${suspiciouslyLow.length} THB transactions that might be USD conversions:`);
      suspiciouslyLow.slice(0, 5).forEach(t => {
        console.log(`      - ${t.description}: ${t.amount} THB`);
      });
    } else {
      console.log('   ✅ No suspicious THB amounts detected');
    }

    // Sample THB transactions
    console.log('\n   Sample THB Transactions (first 5):');
    thbTxns.slice(0, 5).forEach(t => {
      console.log(`      - ${t.description}: ${parseFloat(t.amount).toFixed(2)} THB`);
    });
  }

  // Calculate totals with proper currency conversion
  console.log('\n💰 Financial Totals (USD Equivalent):');

  let totalExpensesUSD = 0;
  let totalIncomeUSD = 0;

  transactions.forEach(t => {
    const amount = parseFloat(t.amount);
    const amountUSD = t.original_currency === 'THB' ? amount / THB_TO_USD_RATE : amount;

    if (t.transaction_type === 'expense') {
      totalExpensesUSD += amountUSD;
    } else {
      totalIncomeUSD += amountUSD;
    }
  });

  const netUSD = totalExpensesUSD - totalIncomeUSD;

  console.log(`   Total Expenses: $${totalExpensesUSD.toFixed(2)}`);
  console.log(`   Total Income: $${totalIncomeUSD.toFixed(2)}`);
  console.log(`   Net (Expense - Income): $${netUSD.toFixed(2)}`);

  // Compare to expected (from PDF)
  const expectedNet = 6972.97; // From CSV Grand Total
  const variance = Math.abs(netUSD - expectedNet);
  const variancePercent = (variance / expectedNet) * 100;

  console.log(`\n   Expected Net (from PDF): $${expectedNet.toFixed(2)}`);
  console.log(`   Variance: $${variance.toFixed(2)} (${variancePercent.toFixed(2)}%)`);

  if (variancePercent <= 3) {
    console.log(`   ✅ PASS: Variance within acceptable range (≤3%)`);
  } else {
    console.log(`   ⚠️  WARNING: Variance exceeds 3% threshold`);
  }

  // Transaction type breakdown
  console.log('\n📈 Transaction Type Breakdown:');
  const expenses = transactions.filter(t => t.transaction_type === 'expense');
  const income = transactions.filter(t => t.transaction_type === 'income');
  console.log(`   Expenses: ${expenses.length}`);
  console.log(`   Income: ${income.length}`);

  // Final validation status
  console.log('\n' + '='.repeat(70));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(70));

  const checks = [
    { name: 'Transaction count', pass: transactions.length === 177, expected: 177, actual: transactions.length },
    { name: 'Rent stored as 35000 THB', pass: rentTxn && rentTxn.original_currency === 'THB' && parseFloat(rentTxn.amount) === 35000 },
    { name: 'THB transaction count', pass: byCurrency.THB?.length === 68, expected: 68, actual: byCurrency.THB?.length },
    { name: 'USD transaction count', pass: byCurrency.USD?.length === 109, expected: 109, actual: byCurrency.USD?.length },
    { name: 'Net total variance ≤3%', pass: variancePercent <= 3 }
  ];

  checks.forEach(check => {
    const status = check.pass ? '✅ PASS' : '❌ FAIL';
    const details = check.expected !== undefined ? ` (expected: ${check.expected}, actual: ${check.actual})` : '';
    console.log(`${status}: ${check.name}${details}`);
  });

  const allPassed = checks.every(c => c.pass);
  console.log('\n' + '='.repeat(70));
  if (allPassed) {
    console.log('✅ ALL VALIDATION CHECKS PASSED');
  } else {
    console.log('❌ SOME VALIDATION CHECKS FAILED');
  }
  console.log('='.repeat(70));

  process.exit(allPassed ? 0 : 1);
}

validateJuly2025().catch(error => {
  console.error('❌ Validation error:', error);
  process.exit(1);
});
