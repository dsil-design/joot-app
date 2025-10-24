#!/usr/bin/env node

/**
 * July 2025 Import Validation Script
 *
 * Validates the July 2025 import against expected totals from the parse report.
 * Checks transaction counts, financial totals, tag distribution, and data integrity.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Expected values from parse report
const EXPECTED = {
  totalTransactions: 177,
  expenses: 160,
  income: 17,
  reimbursementTags: 13,
  floridaHouseTags: 5,
  savingsInvestmentTags: 1,
  thbTransactions: 68,
  usdTransactions: 109,
  csvGrandTotal: 9924.28, // From CSV (before exchange rate conversion)
  parsedNet: 9568.04 // From parse report (Total Expenses - Total Income)
};

async function validateJuly2025() {
  console.log('='.repeat(80));
  console.log('JULY 2025 IMPORT VALIDATION');
  console.log('='.repeat(80));
  console.log();

  const results = {
    timestamp: new Date().toISOString(),
    checks: [],
    summary: {},
    status: 'PASS'
  };

  try {
    // Get user ID for dennis@dsil.design
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'dennis@dsil.design')
      .single();

    if (userError) throw userError;
    const userId = user.id;
    console.log(`User: ${user.email} (${userId})`);
    console.log();

    // 1. Query all July 2025 transactions
    console.log('1. QUERYING JULY 2025 TRANSACTIONS');
    console.log('-'.repeat(80));

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select(`
        id,
        transaction_date,
        description,
        amount,
        original_currency,
        transaction_type,
        transaction_tags (
          tags (
            id,
            name
          )
        )
      `)
      .eq('user_id', userId)
      .gte('transaction_date', '2025-07-01')
      .lte('transaction_date', '2025-07-31')
      .order('transaction_date', { ascending: true });

    if (txError) throw txError;

    const transactionCount = transactions.length;
    const countCheck = transactionCount === EXPECTED.totalTransactions;
    results.checks.push({
      name: 'Transaction Count',
      expected: EXPECTED.totalTransactions,
      actual: transactionCount,
      status: countCheck ? 'PASS' : 'FAIL'
    });

    console.log(`Total transactions: ${transactionCount} (Expected: ${EXPECTED.totalTransactions})`);
    console.log(`Status: ${countCheck ? '✅ PASS' : '❌ FAIL'}`);
    console.log();

    if (!countCheck) results.status = 'FAIL';

    // 2. Transaction type breakdown
    console.log('2. TRANSACTION TYPE VERIFICATION');
    console.log('-'.repeat(80));

    const expenseCount = transactions.filter(t => t.transaction_type === 'expense').length;
    const incomeCount = transactions.filter(t => t.transaction_type === 'income').length;

    const expenseCheck = expenseCount === EXPECTED.expenses;
    const incomeCheck = incomeCount === EXPECTED.income;

    results.checks.push({
      name: 'Expense Transactions',
      expected: EXPECTED.expenses,
      actual: expenseCount,
      status: expenseCheck ? 'PASS' : 'FAIL'
    });

    results.checks.push({
      name: 'Income Transactions',
      expected: EXPECTED.income,
      actual: incomeCount,
      status: incomeCheck ? 'PASS' : 'FAIL'
    });

    console.log(`Expenses: ${expenseCount} (Expected: ${EXPECTED.expenses}) ${expenseCheck ? '✅' : '❌'}`);
    console.log(`Income: ${incomeCount} (Expected: ${EXPECTED.income}) ${incomeCheck ? '✅' : '❌'}`);
    console.log();

    if (!expenseCheck || !incomeCheck) results.status = 'FAIL';

    // 3. Currency distribution
    console.log('3. CURRENCY DISTRIBUTION');
    console.log('-'.repeat(80));

    const thbCount = transactions.filter(t => t.original_currency === 'THB').length;
    const usdCount = transactions.filter(t => t.original_currency === 'USD').length;

    const thbCheck = thbCount === EXPECTED.thbTransactions;
    const usdCheck = usdCount === EXPECTED.usdTransactions;

    results.checks.push({
      name: 'THB Transactions',
      expected: EXPECTED.thbTransactions,
      actual: thbCount,
      status: thbCheck ? 'PASS' : 'FAIL'
    });

    results.checks.push({
      name: 'USD Transactions',
      expected: EXPECTED.usdTransactions,
      actual: usdCount,
      status: usdCheck ? 'PASS' : 'FAIL'
    });

    console.log(`THB: ${thbCount} (Expected: ${EXPECTED.thbTransactions}) ${thbCheck ? '✅' : '❌'}`);
    console.log(`USD: ${usdCount} (Expected: ${EXPECTED.usdTransactions}) ${usdCheck ? '✅' : '❌'}`);
    console.log();

    if (!thbCheck || !usdCheck) results.status = 'FAIL';

    // 4. Get average THB exchange rate for July 2025
    console.log('4. EXCHANGE RATE LOOKUP');
    console.log('-'.repeat(80));

    const { data: rates, error: rateError } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', 'THB')
      .eq('to_currency', 'USD')
      .gte('date', '2025-07-01')
      .lte('date', '2025-07-31')
      .order('date', { ascending: true });

    if (rateError) throw rateError;

    const avgRate = rates.length > 0
      ? rates.reduce((sum, r) => sum + r.rate, 0) / rates.length
      : 0.028; // Fallback rate

    console.log(`Average THB→USD rate for July 2025: ${avgRate.toFixed(6)}`);
    console.log(`Based on ${rates.length} daily rates`);
    console.log();

    // 5. Calculate financial totals
    console.log('5. FINANCIAL TOTALS CALCULATION');
    console.log('-'.repeat(80));

    // Note: Amounts are stored in USD (already converted from THB during import)
    // We just need to sum them up, but we'll also show the breakdown by original currency
    let totalExpenses = 0;
    let totalIncome = 0;
    let usdExpenseCount = 0;
    let thbExpenseCount = 0;
    let usdIncomeCount = 0;
    let thbIncomeCount = 0;

    transactions.forEach(tx => {
      const amount = Math.abs(parseFloat(tx.amount));
      if (tx.transaction_type === 'expense') {
        totalExpenses += amount;
        if (tx.original_currency === 'USD') usdExpenseCount++;
        else if (tx.original_currency === 'THB') thbExpenseCount++;
      } else if (tx.transaction_type === 'income') {
        totalIncome += amount;
        if (tx.original_currency === 'USD') usdIncomeCount++;
        else if (tx.original_currency === 'THB') thbIncomeCount++;
      }
    });

    const netUsd = totalExpenses - totalIncome;

    console.log('EXPENSES:');
    console.log(`  Originally USD: ${usdExpenseCount} transactions`);
    console.log(`  Originally THB: ${thbExpenseCount} transactions (converted to USD at import)`);
    console.log(`  Total Expenses (USD): $${totalExpenses.toFixed(2)}`);
    console.log();
    console.log('INCOME:');
    console.log(`  Originally USD: ${usdIncomeCount} transactions`);
    console.log(`  Originally THB: ${thbIncomeCount} transactions (converted to USD at import)`);
    console.log(`  Total Income (USD): $${totalIncome.toFixed(2)}`);
    console.log();
    console.log(`NET (Expenses - Income): $${netUsd.toFixed(2)}`);
    console.log();
    console.log(`Note: THB amounts were converted to USD during import using the exchange rate at parse time.`);
    console.log(`      Average THB→USD rate for July 2025 in database: ${avgRate.toFixed(6)}`);
    console.log();

    results.summary.expenses = {
      total: totalExpenses,
      usdCount: usdExpenseCount,
      thbCount: thbExpenseCount
    };

    results.summary.income = {
      total: totalIncome,
      usdCount: usdIncomeCount,
      thbCount: thbIncomeCount
    };

    results.summary.net = netUsd;

    // 6. Variance analysis
    console.log('6. VARIANCE ANALYSIS');
    console.log('-'.repeat(80));

    // Calculate NET (Total Expenses - Total Income)
    const actualNet = totalExpenses - totalIncome;

    // Compare to parsed totals (using exchange rates applied during import)
    const varianceParsed = actualNet - EXPECTED.parsedNet;
    const variancePercentParsed = (varianceParsed / EXPECTED.parsedNet) * 100;
    const varianceCheckParsed = Math.abs(variancePercentParsed) <= 3.0;

    // Also compare to CSV grand total (for reference)
    const varianceCsv = actualNet - EXPECTED.csvGrandTotal;
    const variancePercentCsv = (varianceCsv / EXPECTED.csvGrandTotal) * 100;

    results.summary.variance = {
      expectedParsed: EXPECTED.parsedNet,
      expectedCsv: EXPECTED.csvGrandTotal,
      actual: actualNet,
      differenceParsed: varianceParsed,
      percentDifferenceParsed: variancePercentParsed,
      differenceCsv: varianceCsv,
      percentDifferenceCsv: variancePercentCsv,
      status: varianceCheckParsed ? 'PASS' : 'FAIL'
    };

    console.log('Comparison to Parsed Total (with exchange rates):');
    console.log(`  Expected (Parsed NET): $${EXPECTED.parsedNet.toFixed(2)}`);
    console.log(`  Actual (Database NET): $${actualNet.toFixed(2)}`);
    console.log(`  Variance: $${varianceParsed.toFixed(2)} (${variancePercentParsed.toFixed(2)}%)`);
    console.log(`  Status: ${varianceCheckParsed ? '✅ PASS (≤3%)' : '❌ FAIL (>3%)'}`);
    console.log();
    console.log('Comparison to CSV Grand Total (reference):');
    console.log(`  CSV Grand Total: $${EXPECTED.csvGrandTotal.toFixed(2)}`);
    console.log(`  Variance from CSV: $${varianceCsv.toFixed(2)} (${variancePercentCsv.toFixed(2)}%)`);
    console.log(`  Note: Variance from CSV expected due to exchange rate differences`);
    console.log();

    if (!varianceCheckParsed) results.status = 'FAIL';

    // 7. Tag distribution verification
    console.log('7. TAG DISTRIBUTION VERIFICATION');
    console.log('-'.repeat(80));

    let reimbursementCount = 0;
    let floridaHouseCount = 0;
    let savingsInvestmentCount = 0;

    transactions.forEach(tx => {
      if (tx.transaction_tags && tx.transaction_tags.length > 0) {
        tx.transaction_tags.forEach(tagRelation => {
          const tag = tagRelation.tags;
          if (tag.name === 'Reimbursement') reimbursementCount++;
          if (tag.name === 'Florida House') floridaHouseCount++;
          // Check for Savings or Investment tags (case-insensitive)
          if (tag.name.toLowerCase().includes('saving') || tag.name.toLowerCase().includes('investment')) {
            savingsInvestmentCount++;
          }
        });
      }
    });

    const reimbursementCheck = reimbursementCount === EXPECTED.reimbursementTags;
    const floridaHouseCheck = floridaHouseCount === EXPECTED.floridaHouseTags;
    const savingsCheck = savingsInvestmentCount === EXPECTED.savingsInvestmentTags;

    results.checks.push({
      name: 'Reimbursement Tags',
      expected: EXPECTED.reimbursementTags,
      actual: reimbursementCount,
      status: reimbursementCheck ? 'PASS' : 'FAIL'
    });

    results.checks.push({
      name: 'Florida House Tags',
      expected: EXPECTED.floridaHouseTags,
      actual: floridaHouseCount,
      status: floridaHouseCheck ? 'PASS' : 'FAIL'
    });

    results.checks.push({
      name: 'Savings/Investment Tags',
      expected: EXPECTED.savingsInvestmentTags,
      actual: savingsInvestmentCount,
      status: savingsCheck ? 'PASS' : 'FAIL'
    });

    console.log(`Reimbursement: ${reimbursementCount} (Expected: ${EXPECTED.reimbursementTags}) ${reimbursementCheck ? '✅' : '❌'}`);
    console.log(`Florida House: ${floridaHouseCount} (Expected: ${EXPECTED.floridaHouseTags}) ${floridaHouseCheck ? '✅' : '❌'}`);
    console.log(`Savings/Investment: ${savingsInvestmentCount} (Expected: ${EXPECTED.savingsInvestmentTags}) ${savingsCheck ? '✅' : '❌'}`);
    console.log();

    if (!reimbursementCheck || !floridaHouseCheck || !savingsCheck) results.status = 'FAIL';

    // 8. Data integrity checks
    console.log('8. DATA INTEGRITY CHECKS');
    console.log('-'.repeat(80));

    const invalidDates = transactions.filter(t => {
      const date = new Date(t.transaction_date);
      return date < new Date('2025-07-01') || date > new Date('2025-07-31');
    });

    const nullFields = transactions.filter(t =>
      !t.transaction_date || !t.description || t.amount === null || !t.original_currency || !t.transaction_type
    );

    const dateCheck = invalidDates.length === 0;
    const nullCheck = nullFields.length === 0;

    results.checks.push({
      name: 'Date Range Validity',
      expected: 0,
      actual: invalidDates.length,
      status: dateCheck ? 'PASS' : 'FAIL'
    });

    results.checks.push({
      name: 'Null Required Fields',
      expected: 0,
      actual: nullFields.length,
      status: nullCheck ? 'PASS' : 'FAIL'
    });

    console.log(`Invalid dates: ${invalidDates.length} ${dateCheck ? '✅' : '❌'}`);
    console.log(`Null required fields: ${nullFields.length} ${nullCheck ? '✅' : '❌'}`);
    console.log();

    if (!dateCheck || !nullCheck) results.status = 'FAIL';

    // Final summary
    console.log('='.repeat(80));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log();

    const passCount = results.checks.filter(c => c.status === 'PASS').length;
    const failCount = results.checks.filter(c => c.status === 'FAIL').length;

    console.log(`Total Checks: ${results.checks.length}`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);
    console.log();
    console.log(`Variance: ${variancePercentParsed.toFixed(2)}% (Acceptable: ≤3%)`);
    console.log();
    console.log(`OVERALL STATUS: ${results.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    console.log('='.repeat(80));

    return results;

  } catch (error) {
    console.error('Error during validation:', error);
    results.status = 'ERROR';
    results.error = error.message;
    return results;
  }
}

// Generate markdown report
function generateMarkdownReport(results) {
  const lines = [];

  lines.push('# July 2025 Import Validation Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date(results.timestamp).toLocaleString()}`);
  lines.push(`**Status:** ${results.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
  lines.push('');

  lines.push('---');
  lines.push('');

  lines.push('## Executive Summary');
  lines.push('');

  if (results.summary.variance) {
    const v = results.summary.variance;
    lines.push(`- **Expected (Parsed NET):** $${v.expectedParsed.toFixed(2)}`);
    lines.push(`- **Actual (Database NET):** $${v.actual.toFixed(2)}`);
    lines.push(`- **Variance:** $${v.differenceParsed.toFixed(2)} (${v.percentDifferenceParsed.toFixed(2)}%)`);
    lines.push(`- **Variance Status:** ${v.status === 'PASS' ? '✅ PASS (≤3%)' : '❌ FAIL (>3%)'}`);
    lines.push(`- **CSV Grand Total (Reference):** $${v.expectedCsv.toFixed(2)}`);
    lines.push(`- **Variance from CSV:** $${v.differenceCsv.toFixed(2)} (${v.percentDifferenceCsv.toFixed(2)}%)`);
  }
  lines.push('');

  const passCount = results.checks.filter(c => c.status === 'PASS').length;
  const failCount = results.checks.filter(c => c.status === 'FAIL').length;
  lines.push(`- **Total Checks:** ${results.checks.length}`);
  lines.push(`- **Passed:** ${passCount}`);
  lines.push(`- **Failed:** ${failCount}`);
  lines.push('');

  lines.push('---');
  lines.push('');

  lines.push('## Validation Checks');
  lines.push('');
  lines.push('| Check | Expected | Actual | Status |');
  lines.push('|-------|----------|--------|--------|');

  results.checks.forEach(check => {
    const status = check.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    lines.push(`| ${check.name} | ${check.expected} | ${check.actual} | ${status} |`);
  });

  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## Financial Breakdown');
  lines.push('');

  if (results.summary.expenses) {
    lines.push('### Expenses');
    lines.push('');
    lines.push(`- **Total (USD):** $${results.summary.expenses.total.toFixed(2)}`);
    lines.push(`- **Originally USD:** ${results.summary.expenses.usdCount} transactions`);
    lines.push(`- **Originally THB:** ${results.summary.expenses.thbCount} transactions (converted at import)`);
    lines.push('');
  }

  if (results.summary.income) {
    lines.push('### Income');
    lines.push('');
    lines.push(`- **Total (USD):** $${results.summary.income.total.toFixed(2)}`);
    lines.push(`- **Originally USD:** ${results.summary.income.usdCount} transactions`);
    lines.push(`- **Originally THB:** ${results.summary.income.thbCount} transactions (converted at import)`);
    lines.push('');
  }

  if (results.summary.net !== undefined) {
    lines.push('### Net');
    lines.push('');
    lines.push(`- **Net (USD):** $${results.summary.net.toFixed(2)}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  lines.push('## Acceptance Criteria');
  lines.push('');

  const variancePass = results.summary.variance?.status === 'PASS';
  const txCountPass = results.checks.find(c => c.name === 'Transaction Count')?.status === 'PASS';
  const reimbursementPass = results.checks.find(c => c.name === 'Reimbursement Tags')?.status === 'PASS';
  const floridaPass = results.checks.find(c => c.name === 'Florida House Tags')?.status === 'PASS';
  const savingsPass = results.checks.find(c => c.name === 'Savings/Investment Tags')?.status === 'PASS';
  const integrityPass = results.checks.find(c => c.name === 'Date Range Validity')?.status === 'PASS' &&
                         results.checks.find(c => c.name === 'Null Required Fields')?.status === 'PASS';

  lines.push(`- ${variancePass ? '✅' : '❌'} Variance ≤ 3% from parsed total ($${EXPECTED.parsedNet.toFixed(2)})`);
  lines.push(`- ${txCountPass ? '✅' : '❌'} All 177 transactions imported`);
  lines.push(`- ${reimbursementPass && floridaPass && savingsPass ? '✅' : '❌'} Tag counts match expectations (13, 5, 1)`);
  lines.push(`- ${integrityPass ? '✅' : '❌'} No data integrity issues`);
  lines.push('');

  lines.push('---');
  lines.push('');

  lines.push('## Notes');
  lines.push('');
  lines.push('Minor variances (1.5-3%) are acceptable due to:');
  lines.push('- Exchange rate rounding differences');
  lines.push('- CSV subtotal calculation methods');
  lines.push('- Different precision in source vs. database');
  lines.push('');

  if (results.error) {
    lines.push('---');
    lines.push('');
    lines.push('## Errors');
    lines.push('');
    lines.push('```');
    lines.push(results.error);
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}

// Run validation
const results = await validateJuly2025();

// Generate and save report
const reportPath = join(__dirname, 'JULY-2025-VALIDATION-REPORT.md');
const report = generateMarkdownReport(results);
await fs.writeFile(reportPath, report);

console.log();
console.log(`Report saved to: ${reportPath}`);
console.log();

process.exit(results.status === 'PASS' ? 0 : 1);
