const fs = require('fs');
const path = require('path');

// Parse CSV file
const csvPath = '/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

// Helper function to parse date in format "Monday, September 1, 2025"
function parseFullDate(dateStr) {
  const match = dateStr.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d+),\s+(\d{4})/);
  if (match) {
    const [, , monthName, day, year] = match;
    const monthMap = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04',
      'May': '05', 'June': '06', 'July': '07', 'August': '08',
      'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    const month = monthMap[monthName];
    return `${year}-${month}-${day.padStart(2, '0')}`;
  }
  return null;
}

// Helper function to parse date in format "9/1/2025"
function parseShortDate(dateStr) {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

// Helper function to parse amount
function parseAmount(amountStr) {
  if (!amountStr || amountStr.trim() === '') return 0;
  // Remove currency symbols and commas, handle parentheses for negative
  let cleaned = amountStr.replace(/[$,]/g, '').trim();
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }
  return parseFloat(cleaned);
}

// Parse CSV into array of arrays
function parseCSV(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

const transactions = [];
const stats = {
  expenseTracker: { count: 0, expenses: 0, income: 0, reimbursements: 0 },
  grossIncome: { count: 0, total: 0 },
  savings: { count: 0, total: 0 },
  floridaHouse: { count: 0, total: 0 }
};
const tagDistribution = {};
const duplicates = [];

// Section 1: Expense Tracker (lines 392-607)
console.log('Parsing Expense Tracker...');
let currentDate = null;

for (let i = 391; i < 607; i++) {
  const row = parseCSV(lines[i]);

  // Check for date row
  if (row[0] && parseFullDate(row[0])) {
    currentDate = parseFullDate(row[0]);
    continue;
  }

  // Skip rows without description or with special keywords
  if (!row[1] || row[1] === '' || row[1] === 'Desc' ||
      row[1].includes('Daily Total') || row[1].includes('GRAND TOTAL') ||
      row[1].includes('Estimated') || row[1].includes('Subtotal')) {
    continue;
  }

  // Parse transaction
  const description = row[1];
  const vendor = row[2] || 'Unknown';
  const reimbursableFlag = row[3]; // X means reimbursable, but NO TAG
  const businessExpenseFlag = row[4]; // X means Business Expense TAG
  const paymentMethod = row[5] || 'Unknown';

  // Parse amount and currency
  let amount = 0;
  let currency = 'USD';
  let usdEquivalent = 0;

  // Check THB column first (col 6)
  if (row[6] && row[6].includes('THB')) {
    const match = row[6].match(/THB\s*([\d,.-]+)/);
    if (match) {
      const thbAmount = parseFloat(match[1].replace(/,/g, ''));
      amount = thbAmount;
      currency = 'THB';
      // Get USD equivalent from subtotal column (col 9)
      usdEquivalent = parseAmount(row[9]);
    }
  } else if (row[7]) {
    // USD column (col 7)
    amount = parseAmount(row[7]);
    currency = 'USD';
    usdEquivalent = amount;
  }

  // Skip if no amount
  if (amount === 0 && !description.toLowerCase().includes('reimbursement')) {
    continue;
  }

  // Determine transaction type and tags
  let transactionType = 'expense';
  const tags = [];

  // Check for reimbursement (negative amount or description)
  if (description.toLowerCase().startsWith('reimbursement:') || usdEquivalent < 0) {
    transactionType = 'income';
    tags.push('Reimbursement');
    amount = Math.abs(amount); // Convert to positive
    usdEquivalent = Math.abs(usdEquivalent);
    stats.expenseTracker.reimbursements += usdEquivalent;
  } else {
    // Check for business expense flag (column 4)
    if (businessExpenseFlag === 'X' || businessExpenseFlag === 'x') {
      tags.push('Business Expense');
    }
    stats.expenseTracker.expenses += usdEquivalent;
  }

  // Create transaction
  const transaction = {
    date: currentDate,
    description,
    merchant: vendor,
    payment_method: paymentMethod,
    amount,
    currency,
    transaction_type: transactionType,
    tags,
    source: 'Expense Tracker'
  };

  transactions.push(transaction);
  stats.expenseTracker.count++;
  if (transactionType === 'income') {
    stats.expenseTracker.income += usdEquivalent;
  }

  // Update tag distribution
  tags.forEach(tag => {
    tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
  });
}

console.log(`Expense Tracker: ${stats.expenseTracker.count} transactions parsed`);

// Section 2: Gross Income Tracker (lines 609-615)
console.log('\nParsing Gross Income Tracker...');

for (let i = 609; i < 615; i++) {
  const row = parseCSV(lines[i]);

  // Skip header and total rows
  if (!row[0] || row[0] === 'Date Receieved' || row[1] === '' ||
      row[1].includes('Estimated') || row[1].includes('TOTAL')) {
    continue;
  }

  const date = parseFullDate(row[0]);
  const description = row[1];
  const vendor = row[2];
  const amount = parseAmount(row[3]);

  if (date && description && amount > 0) {
    const transaction = {
      date,
      description,
      merchant: vendor,
      payment_method: 'PNC: Personal',
      amount,
      currency: 'USD',
      transaction_type: 'income',
      tags: [],
      source: 'Gross Income'
    };

    transactions.push(transaction);
    stats.grossIncome.count++;
    stats.grossIncome.total += amount;
  }
}

console.log(`Gross Income: ${stats.grossIncome.count} transactions parsed`);

// Section 3: Personal Savings & Investments (lines 617-620)
console.log('\nParsing Personal Savings & Investments...');

for (let i = 617; i < 620; i++) {
  const row = parseCSV(lines[i]);

  // Skip header and total rows
  if (!row[0] || row[0] === 'Date Made' || row[1] === 'TOTAL' || row[1] === '') {
    continue;
  }

  const date = parseShortDate(row[0]);
  const description = row[1];
  const vendor = row[2];
  const paymentMethod = row[3];
  const amount = parseAmount(row[4]);

  if (date && description && amount > 0) {
    const transaction = {
      date,
      description,
      merchant: vendor,
      payment_method: paymentMethod,
      amount,
      currency: 'USD',
      transaction_type: 'expense',
      tags: ['Savings/Investment'],
      source: 'Savings & Investments'
    };

    transactions.push(transaction);
    stats.savings.count++;
    stats.savings.total += amount;
    tagDistribution['Savings/Investment'] = (tagDistribution['Savings/Investment'] || 0) + 1;
  }
}

console.log(`Savings & Investments: ${stats.savings.count} transactions parsed`);

// Section 4: Florida House Expenses (lines 632-642)
console.log('\nParsing Florida House Expenses...');
currentDate = null;

for (let i = 632; i < 647; i++) {
  const row = parseCSV(lines[i]);

  // Check for date row
  if (row[0] && parseFullDate(row[0])) {
    currentDate = parseFullDate(row[0]);
    continue;
  }

  // Skip rows without description or with special keywords
  if (!row[1] || row[1] === '' || row[1] === 'Desc' ||
      row[1].includes('GRAND TOTAL')) {
    continue;
  }

  const description = row[1];
  const vendor = row[2] || 'Unknown';
  const paymentMethod = row[4] || 'Unknown';
  const amount = parseAmount(row[5]);

  if (amount > 0 && currentDate) {
    const transaction = {
      date: currentDate,
      description,
      merchant: vendor,
      payment_method: paymentMethod,
      amount,
      currency: 'USD',
      transaction_type: 'expense',
      tags: ['Florida House'],
      source: 'Florida House'
    };

    transactions.push(transaction);
    stats.floridaHouse.count++;
    stats.floridaHouse.total += amount;
    tagDistribution['Florida House'] = (tagDistribution['Florida House'] || 0) + 1;
  }
}

console.log(`Florida House: ${stats.floridaHouse.count} transactions parsed`);

// Duplicate Detection
console.log('\n===========================================');
console.log('🔍 DUPLICATE DETECTION REPORT');
console.log('===========================================');

const expenseTrackerTxns = transactions.filter(t => t.source === 'Expense Tracker');
const floridaHouseTxns = transactions.filter(t => t.source === 'Florida House');

floridaHouseTxns.forEach((fhTxn, fhIdx) => {
  expenseTrackerTxns.forEach((etTxn, etIdx) => {
    // Check if they match
    if (fhTxn.merchant.toLowerCase() === etTxn.merchant.toLowerCase() &&
        fhTxn.amount === etTxn.amount &&
        Math.abs(new Date(fhTxn.date) - new Date(etTxn.date)) <= 3 * 24 * 60 * 60 * 1000) {
      duplicates.push({
        merchant: fhTxn.merchant,
        amount: fhTxn.amount,
        date: fhTxn.date,
        expenseTrackerDesc: etTxn.description,
        floridaHouseDesc: fhTxn.description,
        floridaHouseIndex: floridaHouseTxns.indexOf(fhTxn)
      });
    }
  });
});

if (duplicates.length > 0) {
  console.log(`Found ${duplicates.length} potential duplicate(s):\n`);
  duplicates.forEach((dup, idx) => {
    console.log(`${idx + 1}. ${dup.merchant} - $${dup.amount.toFixed(2)} on ${dup.date}`);
    console.log(`   - Expense Tracker: "${dup.expenseTrackerDesc}" ✅ KEEPING`);
    console.log(`   - Florida House: "${dup.floridaHouseDesc}" ❌ REMOVING\n`);
  });

  // Remove duplicates from transactions array
  duplicates.forEach(dup => {
    const dupIndex = transactions.findIndex(t =>
      t.source === 'Florida House' &&
      t.merchant === dup.merchant &&
      t.amount === dup.amount &&
      t.date === dup.date
    );
    if (dupIndex !== -1) {
      transactions.splice(dupIndex, 1);
      stats.floridaHouse.count--;
      stats.floridaHouse.total -= dup.amount;
      tagDistribution['Florida House']--;
    }
  });
} else {
  console.log('No duplicates found.');
}

// Calculate net total for validation
const expenseTrackerNet = stats.expenseTracker.expenses - stats.expenseTracker.reimbursements;
const csvGrandTotal = 6804.11;
const variance = Math.abs(expenseTrackerNet - csvGrandTotal);
const variancePercent = (variance / csvGrandTotal) * 100;

console.log('\n===========================================');
console.log('📊 VALIDATION REPORT');
console.log('===========================================');
console.log(`Total transactions: ${transactions.length}`);
console.log(`\nBreakdown by section:`);
console.log(`  - Expense Tracker: ${stats.expenseTracker.count} transactions`);
console.log(`  - Gross Income: ${stats.grossIncome.count} transactions`);
console.log(`  - Savings & Investments: ${stats.savings.count} transactions`);
console.log(`  - Florida House: ${stats.floridaHouse.count} transactions (after duplicate removal)`);

console.log(`\nBreakdown by type:`);
const expenseCount = transactions.filter(t => t.transaction_type === 'expense').length;
const incomeCount = transactions.filter(t => t.transaction_type === 'income').length;
console.log(`  - Expenses: ${expenseCount} transactions`);
console.log(`  - Income: ${incomeCount} transactions`);

console.log(`\nTag distribution:`);
Object.entries(tagDistribution).sort((a, b) => b[1] - a[1]).forEach(([tag, count]) => {
  console.log(`  - ${tag}: ${count} transactions`);
});

console.log(`\nNET TOTAL VALIDATION:`);
console.log(`  - Expense Tracker Expenses: $${stats.expenseTracker.expenses.toFixed(2)}`);
console.log(`  - Expense Tracker Reimbursements: $${stats.expenseTracker.reimbursements.toFixed(2)}`);
console.log(`  - NET (Expenses - Reimbursements): $${expenseTrackerNet.toFixed(2)}`);
console.log(`  - CSV Grand Total: $${csvGrandTotal.toFixed(2)}`);
console.log(`  - Variance: $${variance.toFixed(2)} (${variancePercent.toFixed(2)}%)`);
console.log(`  - Status: ${variancePercent <= 1.5 ? '✅ PASS' : '❌ FAIL'} (≤1.5% threshold)`);

console.log(`\n===========================================`);
console.log('📋 SAMPLE TRANSACTIONS');
console.log('===========================================');
console.log('\nFirst 10 transactions:');
transactions.slice(0, 10).forEach((t, idx) => {
  console.log(`\n${idx + 1}. ${t.date} | ${t.description}`);
  console.log(`   Merchant: ${t.merchant} | Amount: ${t.currency} ${t.amount.toFixed(2)}`);
  console.log(`   Type: ${t.transaction_type} | Payment: ${t.payment_method}`);
  console.log(`   Tags: [${t.tags.join(', ')}] | Source: ${t.source}`);
});

console.log('\n\nLast 5 transactions:');
transactions.slice(-5).forEach((t, idx) => {
  console.log(`\n${transactions.length - 5 + idx + 1}. ${t.date} | ${t.description}`);
  console.log(`   Merchant: ${t.merchant} | Amount: ${t.currency} ${t.amount.toFixed(2)}`);
  console.log(`   Type: ${t.transaction_type} | Payment: ${t.payment_method}`);
  console.log(`   Tags: [${t.tags.join(', ')}] | Source: ${t.source}`);
});

// Save to JSON
const outputPath = '/Users/dennis/Code Projects/joot-app/scripts/september-2025-CORRECTED.json';
fs.writeFileSync(outputPath, JSON.stringify(transactions, null, 2));
console.log(`\n\n✅ Saved ${transactions.length} transactions to: ${outputPath}`);
