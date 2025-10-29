#!/usr/bin/env node

/**
 * Gate 2 Phase 4: Batch PDF Verification
 *
 * Verifies all 3 months (Nov, Oct, Sept 2023) against PDF data
 * - Critical transaction verification
 * - Dual residence rent validation
 * - Reimbursement validation
 * - Currency distribution checks
 * - Cross-month consistency
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const USER_EMAIL = 'dennis@dsil.design';

// PDF-verified critical transactions
const CRITICAL_TRANSACTIONS = {
  'november-2023': {
    month: '2023-11',
    expectedCount: 75,
    thbPercentage: { min: 2.5, max: 3.0 },
    criticalChecks: [
      { description: /This Month’s Rent.*Conshy/i, amount: 957, currency: 'USD', type: 'expense' },
      { description: /^This Month’s Rent$/i, amount: 25000, currency: 'THB', type: 'expense' }
    ]
  },
  'october-2023': {
    month: '2023-10',
    expectedCount: 114,
    thbPercentage: { min: 3.0, max: 4.0 },
    criticalChecks: [
      { description: /This Month’s Rent.*Conshy/i, amount: 957, currency: 'USD', type: 'expense' },
      { description: /^This Month’s Rent$/i, amount: 25000, currency: 'THB', type: 'expense' },
      { description: /Rent Reimbursement/i, amount: 400, currency: 'USD', type: 'income' }
    ]
  },
  'september-2023': {
    month: '2023-09',
    expectedCount: 178,
    thbPercentage: { min: 40, max: 43 },
    criticalChecks: [
      { description: /This Month’s Rent.*Conshy/i, amount: 987, currency: 'USD', type: 'expense' },
      { description: /^This Month’s Rent$/i, amount: 25000, currency: 'THB', type: 'expense' },
      { description: /Flight.*BKK.*PHL|BKK to PHL/i, amount: 1242.05, currency: 'USD', type: 'expense' },
      { description: /Apple.*Studio Display/i, amount: 2127.42, currency: 'USD', type: 'expense' },
      { description: /Reimbursement/i, hasTag: 'Reimbursement', count: 2 },
      { description: /Savings/i, hasTag: 'Savings/Investment', count: 1 }
    ]
  }
};

async function verifyMonth(monthKey) {
  const config = CRITICAL_TRANSACTIONS[monthKey];
  const [year, month] = config.month.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 VERIFYING ${monthKey.toUpperCase()} AGAINST PDF`);
  console.log(`${'='.repeat(60)}\n`);

  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  if (userError || !user) {
    throw new Error(`User ${USER_EMAIL} not found`);
  }

  // Get all transactions for the month
  const { data: transactions, error: txnError } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      amount,
      original_currency,
      transaction_type,
      transaction_date,
      vendors(name),
      payment_methods(name),
      transaction_tags(tags(name))
    `)
    .eq('user_id', user.id)
    .gte('transaction_date', `${config.month}-01`)
    .lte('transaction_date', `${config.month}-${String(lastDay).padStart(2, '0')}`)
    .order('transaction_date', { ascending: true });

  if (txnError) {
    throw new Error(`Error fetching transactions: ${txnError.message}`);
  }

  const results = {
    monthKey,
    month: config.month,
    passed: [],
    failed: [],
    warnings: []
  };

  // Check 1: Transaction count
  console.log(`📊 Transaction Count Check:`);
  if (transactions.length === config.expectedCount) {
    console.log(`   ✅ ${transactions.length}/${config.expectedCount} transactions`);
    results.passed.push(`Transaction count: ${transactions.length}`);
  } else {
    console.log(`   ❌ ${transactions.length}/${config.expectedCount} transactions (MISMATCH)`);
    results.failed.push(`Transaction count mismatch: got ${transactions.length}, expected ${config.expectedCount}`);
  }

  // Check 2: THB percentage
  const thbCount = transactions.filter(t => t.original_currency === 'THB').length;
  const thbPercent = (thbCount / transactions.length) * 100;
  console.log(`\n💱 Currency Distribution:`);
  if (thbPercent >= config.thbPercentage.min && thbPercent <= config.thbPercentage.max) {
    console.log(`   ✅ THB%: ${thbPercent.toFixed(1)}% (expected: ${config.thbPercentage.min}-${config.thbPercentage.max}%)`);
    results.passed.push(`THB percentage: ${thbPercent.toFixed(1)}%`);
  } else {
    console.log(`   ⚠️  THB%: ${thbPercent.toFixed(1)}% (expected: ${config.thbPercentage.min}-${config.thbPercentage.max}%)`);
    results.warnings.push(`THB percentage out of range: ${thbPercent.toFixed(1)}%`);
  }

  // Check 3: Critical transactions
  console.log(`\n🔍 Critical Transaction Verification:`);
  for (const check of config.criticalChecks) {
    if (check.count) {
      // Count-based check (e.g., reimbursement tags)
      const matching = transactions.filter(t => {
        const hasMatchingDesc = check.description instanceof RegExp
          ? check.description.test(t.description)
          : t.description.includes(check.description);
        const hasMatchingTag = check.hasTag
          ? t.transaction_tags?.some(tt => tt.tags.name === check.hasTag)
          : true;
        return hasMatchingDesc && hasMatchingTag;
      });

      if (matching.length === check.count) {
        console.log(`   ✅ ${check.description} tags: ${matching.length}/${check.count}`);
        results.passed.push(`${check.description} tag count: ${check.count}`);
      } else {
        console.log(`   ❌ ${check.description} tags: ${matching.length}/${check.count} (MISMATCH)`);
        results.failed.push(`${check.description} tag count mismatch: got ${matching.length}, expected ${check.count}`);
      }
    } else {
      // Single transaction check
      const matching = transactions.filter(t => {
        const descMatch = check.description instanceof RegExp
          ? check.description.test(t.description)
          : t.description.includes(check.description);

        if (!descMatch) return false;

        if (check.amountRange) {
          const amount = parseFloat(t.amount);
          return amount >= check.amountRange[0] && amount <= check.amountRange[1];
        }

        if (check.amount !== undefined) {
          return Math.abs(parseFloat(t.amount) - check.amount) < 0.01;
        }

        return true;
      });

      if (matching.length === 0) {
        console.log(`   ❌ NOT FOUND: ${check.description} (${check.amount || check.amountRange?.join('-')} ${check.currency})`);
        results.failed.push(`Missing critical transaction: ${check.description}`);
      } else if (matching.length === 1) {
        const txn = matching[0];
        const amount = parseFloat(txn.amount);
        const expectedAmount = check.amount || `${check.amountRange[0]}-${check.amountRange[1]}`;

        // Verify currency
        if (check.currency && txn.original_currency !== check.currency) {
          console.log(`   ⚠️  ${check.description}: $${amount} (expected ${check.currency}, got ${txn.original_currency})`);
          results.warnings.push(`${check.description}: currency mismatch`);
        } else if (check.type && txn.transaction_type !== check.type) {
          console.log(`   ⚠️  ${check.description}: $${amount} (expected ${check.type}, got ${txn.transaction_type})`);
          results.warnings.push(`${check.description}: type mismatch`);
        } else if (check.hasTag) {
          const hasTag = txn.transaction_tags?.some(tt => tt.tags.name === check.hasTag);
          if (!hasTag) {
            console.log(`   ⚠️  ${check.description}: $${amount} (missing ${check.hasTag} tag)`);
            results.warnings.push(`${check.description}: missing ${check.hasTag} tag`);
          } else {
            console.log(`   ✅ ${check.description}: $${amount} ${check.currency} (${check.type}${check.hasTag ? `, ${check.hasTag}` : ''})`);
            results.passed.push(`${check.description}: verified`);
          }
        } else {
          console.log(`   ✅ ${check.description}: $${amount} ${check.currency} (${check.type})`);
          results.passed.push(`${check.description}: verified`);
        }
      } else {
        console.log(`   ⚠️  ${check.description}: Found ${matching.length} matches (expected 1)`);
        results.warnings.push(`${check.description}: multiple matches found`);
      }
    }
  }

  return results;
}

async function generateReport(allResults) {
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`📋 BATCH PDF VERIFICATION SUMMARY`);
  console.log(`${'='.repeat(60)}\n`);

  let totalPassed = 0;
  let totalFailed = 0;
  let totalWarnings = 0;

  for (const result of allResults) {
    console.log(`\n${result.monthKey.toUpperCase()} (${result.month}):`);
    console.log(`  ✅ Passed: ${result.passed.length}`);
    console.log(`  ❌ Failed: ${result.failed.length}`);
    console.log(`  ⚠️  Warnings: ${result.warnings.length}`);

    if (result.failed.length > 0) {
      console.log(`\n  Failed checks:`);
      result.failed.forEach(f => console.log(`    - ${f}`));
    }

    if (result.warnings.length > 0) {
      console.log(`\n  Warnings:`);
      result.warnings.forEach(w => console.log(`    - ${w}`));
    }

    totalPassed += result.passed.length;
    totalFailed += result.failed.length;
    totalWarnings += result.warnings.length;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`OVERALL RESULTS:`);
  console.log(`  ✅ Total Passed: ${totalPassed}`);
  console.log(`  ❌ Total Failed: ${totalFailed}`);
  console.log(`  ⚠️  Total Warnings: ${totalWarnings}`);
  console.log(`${'='.repeat(60)}\n`);

  if (totalFailed === 0) {
    console.log(`✅ ALL CRITICAL VERIFICATIONS PASSED!`);
    console.log(`   Ready to proceed to Gate 3 (100% PDF verification)\n`);
    return true;
  } else {
    console.log(`❌ VERIFICATION FAILED - ${totalFailed} critical checks failed\n`);
    return false;
  }
}

async function main() {
  try {
    console.log(`\n🔍 Gate 2 Phase 4: Batch PDF Verification`);
    console.log(`   Verifying November, October, September 2023 against PDFs\n`);

    const results = [];

    // Verify each month
    for (const monthKey of ['november-2023', 'october-2023', 'september-2023']) {
      const result = await verifyMonth(monthKey);
      results.push(result);
    }

    // Generate final report
    const success = await generateReport(results);

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

main();
