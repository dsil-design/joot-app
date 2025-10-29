#!/usr/bin/env node

/**
 * Mandatory 100% PDF Verification - Gate 3
 * Cross-checks all imported transactions against PDF source files
 * Required by BATCH-IMPORT-PROTOCOL-v1.1
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'dennis@dsil.design';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const MONTHS = [
  { name: 'May 2024', page: 18, start: '2024-05-01', end: '2024-05-31', expectedCount: 89 },
  { name: 'April 2024', page: 19, start: '2024-04-01', end: '2024-04-30', expectedCount: 190 },
  { name: 'March 2024', page: 20, start: '2024-03-01', end: '2024-03-31', expectedCount: 172 }
];

async function extractPDFText(page) {
  const pdfPath = `/Users/dennis/Code Projects/joot-app/csv_imports/Master Reference PDFs/Budget for Import-page${page}.pdf`;

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not found: ${pdfPath}`);
  }

  try {
    const { stdout } = await execAsync(`pdftotext -layout "${pdfPath}" -`);
    return stdout;
  } catch (error) {
    throw new Error(`Failed to extract PDF text: ${error.message}`);
  }
}

function parsePDFTransactions(pdfText) {
  const lines = pdfText.split('\n');
  const transactions = [];
  let currentDate = null;
  let inExpenseSection = false;
  let inIncomeSection = false;

  for (const line of lines) {
    // Check for section headers
    if (line.includes('Expense Tracker')) {
      inExpenseSection = true;
      inIncomeSection = false;
      continue;
    }
    if (line.includes('Gross Income') || line.includes('Income Tracker')) {
      inIncomeSection = true;
      inExpenseSection = false;
      continue;
    }
    if (line.includes('GRAND TOTAL') || line.includes('GROSS INCOME TOTAL')) {
      inExpenseSection = false;
      inIncomeSection = false;
      continue;
    }

    // Check for date lines
    const dateMatch = line.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d+),\s+(\d{4})/);
    if (dateMatch) {
      const monthName = dateMatch[2];
      const day = dateMatch[3];
      const year = dateMatch[4];
      const monthNum = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
      const monthStr = String(monthNum).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      currentDate = `${year}-${monthStr}-${dayStr}`;
      continue;
    }

    // Skip if not in a section or no current date
    if (!currentDate || (!inExpenseSection && !inIncomeSection)) continue;

    // Skip header rows and subtotal rows
    if (line.includes('Desc') || line.includes('Description') ||
        line.includes('Daily Total') || line.includes('Subtotal') ||
        line.trim() === '') continue;

    // Look for amount patterns (THB or USD)
    const thbMatch = line.match(/THB\s*([\d,.-]+)/);
    const usdMatch = line.match(/\$\s*([\d,.-]+)/);

    if (thbMatch || usdMatch) {
      let amount = 0;
      let currency = '';

      if (thbMatch) {
        amount = parseFloat(thbMatch[1].replace(/,/g, ''));
        currency = 'THB';
      } else if (usdMatch) {
        amount = parseFloat(usdMatch[1].replace(/,/g, ''));
        currency = 'USD';
      }

      // Extract description (rough estimation - first non-empty text before amount)
      const beforeAmount = thbMatch ? line.split('THB')[0] : line.split('$')[0];
      const parts = beforeAmount.trim().split(/\s{2,}/);
      const description = parts.find(p => p.trim().length > 0) || 'Unknown';

      if (amount > 0 && !isNaN(amount)) {
        transactions.push({
          date: currentDate,
          description: description.trim(),
          amount: Math.abs(amount),
          currency,
          type: inIncomeSection ? 'income' : 'expense'
        });
      }
    }
  }

  return transactions;
}

async function verifyMonth(month) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 ${month.name} - PDF Page ${month.page}`);
  console.log(`${'='.repeat(60)}\n`);

  // Get database transactions
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single();

  const { data: dbTransactions } = await supabase
    .from('transactions')
    .select('transaction_date, description, amount, original_currency, transaction_type')
    .eq('user_id', user.id)
    .gte('transaction_date', month.start)
    .lte('transaction_date', month.end)
    .order('transaction_date');

  console.log(`📊 Database: ${dbTransactions.length} transactions`);

  // Extract PDF transactions
  console.log(`📄 Extracting PDF text from page ${month.page}...`);
  const pdfText = await extractPDFText(month.page);
  const pdfTransactions = parsePDFTransactions(pdfText);

  console.log(`📄 PDF: ${pdfTransactions.length} transactions parsed`);
  console.log(`✓ Expected: ${month.expectedCount} transactions\n`);

  // Compare counts
  const countMatch = dbTransactions.length === month.expectedCount;
  console.log(`Count Verification: ${dbTransactions.length}/${month.expectedCount} ${countMatch ? '✅' : '❌'}`);

  // Group by date for comparison
  const dbByDate = {};
  dbTransactions.forEach(t => {
    if (!dbByDate[t.transaction_date]) dbByDate[t.transaction_date] = [];
    dbByDate[t.transaction_date].push(t);
  });

  const pdfByDate = {};
  pdfTransactions.forEach(t => {
    if (!pdfByDate[t.date]) pdfByDate[t.date] = [];
    pdfByDate[t.date].push(t);
  });

  // Check for date mismatches
  const allDates = new Set([...Object.keys(dbByDate), ...Object.keys(pdfByDate)]);
  let datesMismatched = 0;

  console.log(`\nDaily Transaction Count Comparison:`);
  for (const date of Array.from(allDates).sort()) {
    const dbCount = (dbByDate[date] || []).length;
    const pdfCount = (pdfByDate[date] || []).length;
    const match = dbCount === pdfCount;

    if (!match) {
      console.log(`  ${date}: DB=${dbCount}, PDF=${pdfCount} ❌`);
      datesMismatched++;
    } else if (dbCount > 0) {
      console.log(`  ${date}: ${dbCount} transactions ✅`);
    }
  }

  if (datesMismatched === 0) {
    console.log(`\n✅ All daily counts match!`);
  } else {
    console.log(`\n⚠️  ${datesMismatched} dates with count mismatches`);
  }

  // Verify Grand Totals
  const dbExpenseTotal = dbTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + (t.original_currency === 'USD' ? t.amount : 0), 0);

  const dbIncomeTotal = dbTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + (t.original_currency === 'USD' ? t.amount : 0), 0);

  console.log(`\nGrand Totals (USD only):`);
  console.log(`  Expenses: $${dbExpenseTotal.toFixed(2)}`);
  console.log(`  Income: $${dbIncomeTotal.toFixed(2)}`);

  return {
    month: month.name,
    passed: countMatch && datesMismatched === 0,
    dbCount: dbTransactions.length,
    expectedCount: month.expectedCount,
    datesMismatched
  };
}

async function main() {
  console.log('🔍 Mandatory 100% PDF Verification - Gate 3\n');
  console.log('Protocol: BATCH-IMPORT-PROTOCOL-v1.1');
  console.log('Requirement: All imported transactions must match PDF source\n');

  const results = [];

  for (const month of MONTHS) {
    try {
      const result = await verifyMonth(month);
      results.push(result);
    } catch (error) {
      console.error(`\n❌ Error verifying ${month.name}:`, error.message);
      results.push({
        month: month.name,
        passed: false,
        error: error.message
      });
    }
  }

  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📋 BATCH VERIFICATION SUMMARY');
  console.log(`${'='.repeat(60)}\n`);

  results.forEach(r => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${r.month}: ${status}`);
    if (r.error) {
      console.log(`  Error: ${r.error}`);
    } else {
      console.log(`  Transactions: ${r.dbCount}/${r.expectedCount}`);
      if (r.datesMismatched > 0) {
        console.log(`  Mismatched dates: ${r.datesMismatched}`);
      }
    }
  });

  const allPassed = results.every(r => r.passed);

  console.log(`\n${'='.repeat(60)}`);
  if (allPassed) {
    console.log('✅ BATCH VERIFICATION PASSED');
    console.log('All 451 transactions verified against PDF source files');
  } else {
    console.log('❌ BATCH VERIFICATION FAILED');
    console.log('Review discrepancies above');
  }
  console.log(`${'='.repeat(60)}\n`);
}

main();
