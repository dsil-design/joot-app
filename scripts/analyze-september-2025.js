#!/usr/bin/env node

/**
 * September 2025 Analysis Script
 * Parses CSV data for September 2025 and provides detailed analysis
 * to answer the 6 key questions before import
 */

const Papa = require('papaparse');
const fs = require('fs');

const CSV_FILE_PATH = 'csv_imports/fullImport_20251017.csv';

// Currency codes for detection
const CURRENCY_CODES = ['USD', 'THB', 'MYR', 'SGD', 'VND', 'EUR', 'GBP', 'JPY', 'KRW', 'CNY', 'PHP', 'IDR'];

// Helper: Check if row is a date row
function isDateRow(value) {
  return value && typeof value === 'string' &&
    value.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
}

// Helper: Parse transaction date
function parseTransactionDate(dateString) {
  const match = dateString.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d+),\s+(\d{4})/);
  if (!match) return null;

  const monthName = match[2];
  const day = match[3];
  const year = match[4];

  const monthNum = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
  const monthStr = String(monthNum).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');

  return `${year}-${monthStr}-${dayStr}`;
}

// Helper: Check if row should be skipped
function shouldSkipRow(row, headers) {
  const desc = row[headers.indexOf('Desc')] || '';
  const descStr = String(desc).toLowerCase();

  // Skip header rows, empty rows, daily totals, grand totals, etc.
  if (!desc || desc === 'Desc') return true;
  if (descStr.includes('daily total')) return true;
  if (descStr.includes('grand total')) return true;
  if (descStr.includes('estimated')) return true;
  if (descStr.includes('subtotal')) return true;
  if (isDateRow(desc)) return true;

  return false;
}

// Helper: Extract currency and amount from "Actual Spent" columns
function extractCurrencyAndAmount(row, headers) {
  // Find "Actual Spent" column index
  const actualSpentIndex = headers.findIndex(h => h && h.includes('Actual Spent'));

  if (actualSpentIndex === -1) return null;

  // The next two columns after "Actual Spent" are THB and USD
  const thbValue = row[actualSpentIndex + 1];
  const usdValue = row[actualSpentIndex + 2];

  // Check THB column first
  if (thbValue && thbValue.toString().trim() && thbValue.toString().includes('THB')) {
    const amountMatch = thbValue.toString().match(/THB\s*([\d,.-]+)/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      return { currency: 'THB', amount };
    }
  }

  // Check USD column
  if (usdValue && usdValue.toString().trim()) {
    const cleanValue = usdValue.toString().replace(/[$,]/g, '').trim();
    if (cleanValue && !isNaN(cleanValue)) {
      const amount = parseFloat(cleanValue);
      return { currency: 'USD', amount };
    }
  }

  return null;
}

// Helper: Determine tags for transaction
function determineTags(row, headers, section) {
  const tags = [];

  // Florida House tag
  if (section === 'Florida House Expenses') {
    tags.push('Florida House');
  }

  // Reimbursement tag (check description)
  const descIndex = headers.indexOf('Desc');
  const desc = row[descIndex] || '';
  if (desc.toString().toLowerCase().includes('reimbursement:')) {
    tags.push('Reimbursement');
  }

  // Business Expense tag
  const businessExpenseIndex = headers.findIndex(h =>
    h && (h.includes('Business Expense') || h.includes('My Business Expense'))
  );
  if (businessExpenseIndex !== -1) {
    const businessValue = row[businessExpenseIndex];
    if (businessValue && (businessValue.toString().trim() === 'X' || businessValue.toString().trim().toLowerCase() === 'x')) {
      tags.push('Business Expense');
    }
  }

  return tags;
}

// Helper: Determine transaction type
function determineTransactionType(section, description) {
  if (section === 'Gross Income Tracker') return 'income';
  if (description.toLowerCase().includes('reimbursement:')) return 'income';
  return 'expense';
}

// Main parsing function
function analyzeSeptember2025() {
  console.log('📊 September 2025 CSV Analysis\n');
  console.log('='.repeat(80));

  // Read the CSV file
  const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
  const lines = csvContent.split('\n');

  // Find September 2025 sections
  let expenseTrackerStart = -1;
  let expenseTrackerEnd = -1;
  let grossIncomeStart = -1;
  let grossIncomeEnd = -1;
  let floridaHouseStart = -1;
  let floridaHouseEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('September 2025: Expense Tracker')) {
      expenseTrackerStart = i;
    } else if (lines[i].startsWith('September 2025: Gross Income Tracker')) {
      expenseTrackerEnd = i - 1;
      grossIncomeStart = i;
    } else if (lines[i].startsWith('September 2025: Personal Savings')) {
      grossIncomeEnd = i - 1;
    } else if (lines[i].startsWith('September 2025: Florida House Expenses')) {
      floridaHouseStart = i;
    } else if (lines[i].startsWith('October 2025: Expense Tracker')) {
      floridaHouseEnd = i - 1;
      break;
    }
  }

  console.log('\n📍 Section Boundaries:');
  console.log(`   Expense Tracker: lines ${expenseTrackerStart}-${expenseTrackerEnd}`);
  console.log(`   Gross Income: lines ${grossIncomeStart}-${grossIncomeEnd}`);
  console.log(`   Florida House: lines ${floridaHouseStart}-${floridaHouseEnd}`);

  // Parse each section
  const allTransactions = [];

  // Parse Expense Tracker
  if (expenseTrackerStart !== -1) {
    const sectionLines = lines.slice(expenseTrackerStart, expenseTrackerEnd + 1).join('\n');
    const parsed = Papa.parse(sectionLines, { header: true });

    console.log('\n📋 EXPENSE TRACKER SECTION');
    console.log('   Column Headers:', parsed.meta.fields.slice(0, 10).join(', '));

    let currentDate = null;
    let transactionCount = 0;

    parsed.data.forEach((row, idx) => {
      const firstCol = row['September 2025: Expense Tracker'] || row[''] || Object.values(row)[0];

      // Check if this is a date row
      if (isDateRow(firstCol)) {
        currentDate = parseTransactionDate(firstCol);
        return;
      }

      // Check if we should skip this row
      if (shouldSkipRow(Object.values(row), parsed.meta.fields)) {
        return;
      }

      // Extract transaction data
      const desc = row['Desc'] || '';
      const merchant = row['Merchant'] || '';
      const paymentType = row['Payment Type'] || '';

      if (!desc || !currentDate) return;

      // Extract currency and amount
      const currencyData = extractCurrencyAndAmount(Object.values(row), parsed.meta.fields);
      if (!currencyData) return;

      // Determine tags
      const tags = determineTags(Object.values(row), parsed.meta.fields, 'Expense Tracker');

      // Determine transaction type
      const transactionType = determineTransactionType('Expense Tracker', desc);

      const transaction = {
        date: currentDate,
        description: desc,
        merchant: merchant,
        paymentMethod: paymentType,
        amount: currencyData.amount,
        currency: currencyData.currency,
        transactionType: transactionType,
        tags: tags
      };

      allTransactions.push(transaction);
      transactionCount++;

      // Show first 10 transactions
      if (transactionCount <= 10) {
        console.log(`\n   Transaction #${transactionCount}:`);
        console.log(`      Date: ${transaction.date}`);
        console.log(`      Description: ${transaction.description}`);
        console.log(`      Merchant: ${transaction.merchant}`);
        console.log(`      Amount: ${transaction.amount} ${transaction.currency}`);
        console.log(`      Payment: ${transaction.paymentMethod}`);
        console.log(`      Type: ${transaction.transactionType}`);
        console.log(`      Tags: ${transaction.tags.join(', ') || 'none'}`);
      }
    });

    console.log(`\n   ✅ Found ${transactionCount} transactions in Expense Tracker`);
  }

  // Parse Florida House Expenses
  if (floridaHouseStart !== -1) {
    const sectionLines = lines.slice(floridaHouseStart, floridaHouseEnd + 1).join('\n');
    const parsed = Papa.parse(sectionLines, { header: true });

    console.log('\n📋 FLORIDA HOUSE EXPENSES SECTION');
    console.log('   Column Headers:', parsed.meta.fields.slice(0, 10).join(', '));

    let currentDate = null;
    let transactionCount = 0;

    parsed.data.forEach((row) => {
      const firstCol = row['September 2025: Florida House Expenses'] || row[''] || Object.values(row)[0];

      // Check if this is a date row
      if (isDateRow(firstCol)) {
        currentDate = parseTransactionDate(firstCol);
        return;
      }

      // Check if we should skip this row
      if (shouldSkipRow(Object.values(row), parsed.meta.fields)) {
        return;
      }

      const desc = row['Desc'] || '';
      const merchant = row['Merchant'] || '';
      const paymentType = row['Payment Type'] || '';
      const subtotal = row['Subtotal'] || '';

      if (!desc || !currentDate || !subtotal) return;

      // Parse amount from subtotal
      const cleanAmount = subtotal.toString().replace(/[$,]/g, '').trim();
      if (!cleanAmount || isNaN(cleanAmount)) return;

      const amount = parseFloat(cleanAmount);

      const transaction = {
        date: currentDate,
        description: desc,
        merchant: merchant,
        paymentMethod: paymentType,
        amount: amount,
        currency: 'USD',
        transactionType: 'expense',
        tags: ['Florida House']
      };

      allTransactions.push(transaction);
      transactionCount++;
    });

    console.log(`\n   ✅ Found ${transactionCount} transactions in Florida House Expenses`);
  }

  // Calculate totals
  console.log('\n' + '='.repeat(80));
  console.log('📊 SEPTEMBER 2025 SUMMARY');
  console.log('='.repeat(80));

  console.log(`\n✅ Total Transactions Found: ${allTransactions.length}`);

  // Calculate expenses vs income
  const expenses = allTransactions.filter(t => t.transactionType === 'expense');
  const income = allTransactions.filter(t => t.transactionType === 'income');

  console.log(`   - Expenses: ${expenses.length}`);
  console.log(`   - Income: ${income.length}`);

  // Calculate total amounts (convert all to USD for summary)
  let totalExpenses = 0;
  let totalIncome = 0;

  expenses.forEach(t => {
    if (t.currency === 'USD') {
      totalExpenses += t.amount;
    } else if (t.currency === 'THB') {
      // Using approximate rate from CSV (1 THB ≈ 0.031 USD)
      totalExpenses += t.amount * 0.031;
    }
  });

  income.forEach(t => {
    if (t.currency === 'USD') {
      totalIncome += Math.abs(t.amount);
    } else if (t.currency === 'THB') {
      totalIncome += Math.abs(t.amount) * 0.031;
    }
  });

  console.log(`\n💰 Total Expenses (approx USD): $${totalExpenses.toFixed(2)}`);
  console.log(`💰 Total Income (approx USD): $${totalIncome.toFixed(2)}`);

  // Tag analysis
  const tagCounts = {};
  allTransactions.forEach(t => {
    t.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  console.log('\n🏷️  Tag Distribution:');
  Object.entries(tagCounts).forEach(([tag, count]) => {
    console.log(`   - ${tag}: ${count} transactions`);
  });

  // Currency distribution
  const currencyCounts = {};
  allTransactions.forEach(t => {
    currencyCounts[t.currency] = (currencyCounts[t.currency] || 0) + 1;
  });

  console.log('\n💱 Currency Distribution:');
  Object.entries(currencyCounts).forEach(([currency, count]) => {
    console.log(`   - ${currency}: ${count} transactions`);
  });

  // Show first 5 and last 5 transactions
  console.log('\n' + '='.repeat(80));
  console.log('🔍 FIRST 5 TRANSACTIONS:');
  console.log('='.repeat(80));
  allTransactions.slice(0, 5).forEach((t, idx) => {
    console.log(`\n${idx + 1}. ${t.date} | ${t.description}`);
    console.log(`   Merchant: ${t.merchant}`);
    console.log(`   Amount: ${t.amount} ${t.currency} | Payment: ${t.paymentMethod}`);
    console.log(`   Type: ${t.transactionType} | Tags: ${t.tags.join(', ') || 'none'}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('🔍 LAST 5 TRANSACTIONS:');
  console.log('='.repeat(80));
  allTransactions.slice(-5).forEach((t, idx) => {
    console.log(`\n${allTransactions.length - 4 + idx}. ${t.date} | ${t.description}`);
    console.log(`   Merchant: ${t.merchant}`);
    console.log(`   Amount: ${t.amount} ${t.currency} | Payment: ${t.paymentMethod}`);
    console.log(`   Type: ${t.transactionType} | Tags: ${t.tags.join(', ') || 'none'}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ Analysis Complete!');
  console.log('='.repeat(80));

  // Save to JSON for reference
  fs.writeFileSync(
    'scripts/september-2025-transactions.json',
    JSON.stringify(allTransactions, null, 2)
  );
  console.log('\n💾 Saved transaction data to: scripts/september-2025-transactions.json');
}

// Run the analysis
try {
  analyzeSeptember2025();
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
