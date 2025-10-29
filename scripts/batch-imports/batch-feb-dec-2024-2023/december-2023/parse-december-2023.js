const fs = require('fs');
const path = require('path');

// Parse CSV file
const csvPath = '/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

// Helper function to parse date in format "Monday, July 1, 2024"
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

// Helper function to parse date in format "3/15/2024"
function parseShortDate(dateStr) {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

// Helper function to parse amount with enhanced comma handling (CRITICAL for comma-formatted amounts)
function parseAmount(amountStr) {
  if (!amountStr || amountStr.trim() === '') return 0;
  // Remove $, commas, quotes, tabs, parentheses, spaces - CRITICAL for comma-formatted amounts
  let cleaned = amountStr.replace(/[$,"\t()\s]/g, '').trim();

  // Handle parentheses for negative (but after removing them above)
  const isNegative = amountStr.includes('(') && amountStr.includes(')');
  if (isNegative) {
    cleaned = '-' + cleaned.replace(/-/g, '');
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
const redFlags = [];
const corrections = [];
const negativeConversions = [];
const typoReimbursements = [];
const commaFormattedAmounts = [];
const zeroSkipped = [];

console.log('========================================');
console.log('DECEMBER 2023 PARSING SCRIPT');
console.log('========================================\n');
console.log('Protocol: BATCH-IMPORT-PROTOCOL-v1.2 + Monthly v3.6');
console.log('Batch: Feb-Jan-Dec 2024-2023 (Month 3 of 3)\n');
console.log('Key Features:');
console.log('- NO VND column (standard THB/USD only)');
console.log('- No negative refunds expected');
console.log('- Column 4 for Business Expense (ignore Column 3)');
console.log('- No Florida House section');
console.log('- TRANSITION MONTH: USA → Thailand (2-5% THB)');
console.log('- Dual rent payments expected (USA $957 + Thailand THB 25,000)');
console.log('- CRITICAL: Thailand rent has erroneous conversion ($0.71) - MUST use raw THB\n');

// Section 1: Expense Tracker (lines 6356-6508 approximately)
console.log('Parsing Expense Tracker (lines 6356-6508)...');
let currentDate = null;

for (let i = 6355; i < 6509; i++) {
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
  const merchant = row[2] || 'Unknown';
  const isReimbursable = row[3] === 'X' || row[3] === 'x'; // Column 3 - tracking only, NOT a tag
  const isBusinessExpense = row[4] === 'X' || row[4] === 'x'; // Column 4 - actual Business Expense tag
  const paymentMethod = row[5] || 'Unknown';

  // Currency and amount extraction
  // December 2023: Standard columns (NO VND)
  // Col 6 = THB, Col 7 = USD, Col 8 = THB-USD conversion (NEVER use!)
  let amount = 0;
  let currency = 'USD';
  const lineNumber = i + 1;

  // Check THB column (column 6)
  if (row[6] && row[6].includes('THB')) {
    const match = row[6].match(/-?THB\s*([\d,.-]+)/);
    if (match) {
      // Check if the original string has a negative sign before THB
      const isNegativeTHB = row[6].trim().startsWith('-');
      amount = parseFloat(match[1].replace(/,/g, ''));
      if (isNegativeTHB) {
        amount = -amount;
      }
      currency = 'THB';
    }
  }
  // Check USD column (column 7)
  else if (row[7] && row[7].trim() !== '') {
    const rawAmount = row[7];
    amount = parseAmount(row[7]);
    currency = 'USD';

    // Track if this was comma-formatted
    if (rawAmount.includes(',')) {
      commaFormattedAmounts.push({
        line: lineNumber,
        description,
        merchant,
        rawAmount,
        parsedAmount: amount
      });
      console.log(`  ✓ COMMA-FORMATTED AMOUNT (Line ${lineNumber}): "${rawAmount}" → ${amount}`);
    }
  }
  // Check subtotal (column 9)
  else if (row[9] && row[9].trim() !== '') {
    const rawAmount = row[9];
    amount = parseAmount(row[9]);
    currency = 'USD';

    // Track if this was comma-formatted
    if (rawAmount.includes(',')) {
      commaFormattedAmounts.push({
        line: lineNumber,
        description,
        merchant,
        rawAmount,
        parsedAmount: amount
      });
      console.log(`  ✓ COMMA-FORMATTED AMOUNT (Line ${lineNumber}): "${rawAmount}" → ${amount}`);
    }
  }

  // Skip $0.00 transactions
  if (amount === 0) {
    zeroSkipped.push({ line: lineNumber, description, merchant, currency });
    continue;
  }

  // Set transaction date (use currentDate or fallback to last day of month)
  const transactionDate = currentDate || '2023-12-31';

  // Determine transaction type and tags
  let transactionType = 'expense';
  const tags = [];

  // Handle negative amounts - convert to income
  if (amount < 0) {
    transactionType = 'income';
    amount = Math.abs(amount);
    negativeConversions.push({
      line: lineNumber,
      description,
      originalAmount: -amount,
      convertedAmount: amount,
      currency
    });
    console.log(`  ⚠️  NEGATIVE AMOUNT CONVERTED (Line ${lineNumber}): ${description} - ${-amount} → ${amount} (income)`);
  }

  // Check for reimbursement (typo-tolerant)
  const reimbursementRegex = /re[ie]mb[ou]rs[ea]ment/i;
  if (description.match(reimbursementRegex)) {
    tags.push('Reimbursement');
    stats.expenseTracker.reimbursements++;

    // Track if this used a typo-tolerant match
    const standardSpelling = 'reimbursement';
    if (description.toLowerCase().includes(standardSpelling) === false) {
      typoReimbursements.push({ line: lineNumber, description });
    }
  }

  // Add Business Expense tag if Column 4 has X
  if (isBusinessExpense) {
    tags.push('Business Expense');
  }

  // Track tags
  tags.forEach(tag => {
    tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
  });

  // Create transaction object with deduplication key
  const transaction = {
    transaction_date: transactionDate,
    description,
    merchant,
    amount,
    currency,
    payment_method: paymentMethod,
    transaction_type: transactionType,
    tags,
    metadata: {
      source: 'Expense Tracker',
      line_number: lineNumber,
      reimbursable: isReimbursable, // Tracked but not a tag
      business_expense: isBusinessExpense
    }
  };

  transactions.push(transaction);
  stats.expenseTracker.count++;

  if (transactionType === 'expense') {
    stats.expenseTracker.expenses++;
  } else {
    stats.expenseTracker.income++;
  }
}

console.log(`✅ Expense Tracker: ${stats.expenseTracker.count} transactions`);
console.log(`   Expenses: ${stats.expenseTracker.expenses}`);
console.log(`   Income (converted negatives): ${stats.expenseTracker.income}`);
console.log(`   Reimbursements: ${stats.expenseTracker.reimbursements}\n`);

// Section 2: Gross Income Tracker (lines 6509-6520 approximately)
console.log('Parsing Gross Income Tracker (lines 6509-6520)...');

for (let i = 6508; i < 6521; i++) {
  const row = parseCSV(lines[i]);

  // Skip header and empty rows
  if (!row[1] || row[1] === '' || row[1] === 'Description' || row[1] === 'TOTAL') {
    continue;
  }

  const dateStr = row[0] || '';
  const description = row[1];
  const vendor = row[2] || 'Unknown';
  const source = row[3] || '';
  const amountStr = row[4] || '';

  // Parse amount
  const amount = parseAmount(amountStr);

  // Skip $0.00
  if (amount === 0) {
    zeroSkipped.push({ line: i + 1, description, merchant: vendor, currency: 'USD' });
    continue;
  }

  // Parse date
  let transactionDate = '2023-12-31'; // Default to last day of month
  if (dateStr) {
    const parsed = parseShortDate(dateStr) || parseFullDate(dateStr);
    if (parsed) {
      transactionDate = parsed;
    }
  }

  // Create transaction
  const transaction = {
    transaction_date: transactionDate,
    description,
    merchant: vendor,
    amount,
    currency: 'USD',
    payment_method: source || 'Unknown',
    transaction_type: 'income',
    tags: [],
    metadata: {
      source: 'Gross Income',
      line_number: i + 1
    }
  };

  transactions.push(transaction);
  stats.grossIncome.count++;
  stats.grossIncome.total += amount;
}

console.log(`✅ Gross Income: ${stats.grossIncome.count} transactions\n`);

// Section 3: Personal Savings & Investments (lines 6521-6524 approximately)
console.log('Parsing Personal Savings & Investments (lines 6521-6524)...');

for (let i = 6520; i < 6525; i++) {
  const row = parseCSV(lines[i]);

  // Skip header and TOTAL rows
  if (!row[1] || row[1] === '' || row[1] === 'Description' || row[1] === 'TOTAL') {
    continue;
  }

  const dateStr = row[0] || '';
  const description = row[1];
  const vendor = row[2] || 'Vanguard';
  const source = row[3] || '';
  const amountStr = row[4] || '';

  // Parse amount
  const amount = parseAmount(amountStr);

  // Skip $0.00 transactions (database has positive_amount constraint)
  if (amount === 0) {
    zeroSkipped.push({ line: i + 1, description, merchant: vendor, currency: 'USD' });
    continue;
  }

  // Parse date
  let transactionDate = '2023-12-31'; // Default to last day of month
  if (dateStr) {
    const parsed = parseShortDate(dateStr) || parseFullDate(dateStr);
    if (parsed) {
      transactionDate = parsed;
    }
  }

  // Create transaction with Savings/Investment tag
  const transaction = {
    transaction_date: transactionDate,
    description,
    merchant: vendor,
    amount,
    currency: 'USD',
    payment_method: source || 'Unknown',
    transaction_type: 'expense',
    tags: ['Savings/Investment'],
    metadata: {
      source: 'Savings & Investments',
      line_number: i + 1
    }
  };

  transactions.push(transaction);
  stats.savings.count++;
  stats.savings.total += amount;

  // Track tag
  tagDistribution['Savings/Investment'] = (tagDistribution['Savings/Investment'] || 0) + 1;
}

console.log(`✅ Savings & Investments: ${stats.savings.count} transactions\n`);

// Summary
console.log('========================================');
console.log('PARSING COMPLETE');
console.log('========================================\n');

console.log(`Total Transactions: ${transactions.length}`);
console.log(`  Expense Tracker: ${stats.expenseTracker.count}`);
console.log(`  Gross Income: ${stats.grossIncome.count}`);
console.log(`  Savings: ${stats.savings.count}\n`);

// Transaction Type Distribution
const typeStats = transactions.reduce((acc, t) => {
  acc[t.transaction_type] = (acc[t.transaction_type] || 0) + 1;
  return acc;
}, {});

console.log('Transaction Types:');
Object.entries(typeStats).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});
console.log();

// Tag Distribution
if (Object.keys(tagDistribution).length > 0) {
  console.log('Tag Distribution:');
  Object.entries(tagDistribution).forEach(([tag, count]) => {
    console.log(`  ${tag}: ${count}`);
  });
  console.log();
}

// Currency Distribution
const currencyStats = transactions.reduce((acc, t) => {
  acc[t.currency] = (acc[t.currency] || 0) + 1;
  return acc;
}, {});

console.log('Currency Distribution:');
Object.entries(currencyStats).forEach(([currency, count]) => {
  const percentage = ((count / transactions.length) * 100).toFixed(1);
  console.log(`  ${currency}: ${count} (${percentage}%)`);
});

// Expected THB range check
const thbCount = currencyStats['THB'] || 0;
const thbPercentage = (thbCount / transactions.length) * 100;
const expectedThbRange = [2, 5]; // 2-5% for transition month
console.log(`  Expected THB: ~2-5% (transition month)`);
if (thbPercentage >= expectedThbRange[0] && thbPercentage <= expectedThbRange[1]) {
  console.log(`✅ THB percentage within expected range (${expectedThbRange[0]}-${expectedThbRange[1]}%)`);
} else {
  console.log(`⚠️  THB percentage outside expected range (${expectedThbRange[0]}-${expectedThbRange[1]}%): ${thbPercentage.toFixed(1)}%`);
}
console.log();

// Additional reporting
if (negativeConversions.length > 0) {
  console.log(`Negative Amounts Converted to Income: ${negativeConversions.length}`);
  negativeConversions.forEach(conv => {
    console.log(`  Line ${conv.line}: ${conv.description} - ${conv.originalAmount} → ${conv.convertedAmount} ${conv.currency}`);
  });
  console.log();
}

if (commaFormattedAmounts.length > 0) {
  console.log(`Comma-Formatted Amounts Handled: ${commaFormattedAmounts.length}`);
  console.log();
}

if (zeroSkipped.length > 0) {
  console.log(`Zero Amount Transactions Skipped: ${zeroSkipped.length}`);
  console.log();
}

// Write output
const outputPath = path.join(__dirname, 'december-2023-CORRECTED.json');
fs.writeFileSync(outputPath, JSON.stringify(transactions, null, 2));

console.log('\n========================================');
console.log(`✅ SUCCESS: Parsed ${transactions.length} transactions`);
console.log(`📁 Output: ${outputPath}`);
console.log('========================================\n');

console.log('Next Steps:');
console.log('1. Review december-2023-CORRECTED.json');
console.log('2. Verify dual rent payments (USA $957 + Thailand THB 25,000)');
console.log('3. Verify Thailand rent uses raw THB amount (NOT $0.71 conversion)');
console.log('4. Verify major flight booking ($1,334.30 EWR → CNX)');
console.log('5. Proceed to Phase 3: Database Import');
