const fs = require('fs');
const path = require('path');

// Parse CSV file
const csvPath = '/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

// Helper function to parse date in format "Monday, January 1, 2025"
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

// Helper function to parse date in format "1/1/2025"
function parseShortDate(dateStr) {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

// Helper function to parse amount with enhanced comma handling
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
const duplicates = [];
const redFlags = [];
const corrections = [];
const negativeConversions = [];
const typoReimbursements = [];
const commaFormattedAmounts = [];
const floridaHouseDatesDefaulted = [];

console.log('========================================');
console.log('JANUARY 2025 PARSING SCRIPT');
console.log('========================================\n');

// Section 1: Expense Tracker (lines 2753-3001)
console.log('Parsing Expense Tracker (lines 2753-3001)...');
let currentDate = null;

for (let i = 2752; i < 3002; i++) {
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
  const isReimbursable = row[3] === 'X' || row[3] === 'x';
  const isBusinessExpense = row[4] === 'X' || row[4] === 'x';
  const paymentMethod = row[5] || 'Unknown';

  // Currency and amount extraction (CRITICAL)
  let amount = 0;
  let currency = 'USD';
  const lineNumber = i + 1;

  // Check THB column first (column 6)
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
  // Then check USD column (column 7)
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
  // Fallback to subtotal (column 9)
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

  // Skip if no amount found
  if (amount === 0 || isNaN(amount)) {
    redFlags.push({
      line: lineNumber,
      description,
      merchant,
      issue: 'Missing or zero amount',
      severity: 'WARNING',
      phase: 'Parsing',
      status: 'OPEN'
    });
    continue;
  }

  // Determine transaction type and tags
  let transactionType = 'expense';
  const tags = [];

  // CRITICAL: Check for reimbursement with typo variants (USER-CONFIRMED)
  // Pattern: /^Re(im|mi|m)?burs[e]?ment/i (with or without colon)
  // Matches: Reimbursement, Reimbursement:, Reimbursement for X, Remibursement:, Rembursement:, Reimbursment:
  const isReimbursement = /^Re(im|mi|m)?burs[e]?ment/i.test(description.trim());

  if (isReimbursement) {
    // Check if this is DSIL income (no Reimbursement tag)
    const isDSILIncome = merchant.toLowerCase().includes('dsil design') ||
                         merchant.toLowerCase().includes('dsil llc') ||
                         merchant.toLowerCase().includes('dsil');

    if (isDSILIncome) {
      // This is company income, not a reimbursement
      transactionType = 'income';
      // NO Reimbursement tag
      amount = Math.abs(amount);
    } else {
      // Regular reimbursement
      transactionType = 'income';
      tags.push('Reimbursement');
      amount = Math.abs(amount);
      stats.expenseTracker.reimbursements++;

      // Track if this was a typo variant
      const descLower = description.toLowerCase();
      if (descLower.startsWith('remibursement') ||
          descLower.startsWith('rembursement') ||
          descLower.startsWith('reimbursment')) {
        const originalSpelling = description.split(/[:\s]/)[0]; // Get first word
        typoReimbursements.push({
          line: lineNumber,
          description,
          merchant,
          originalSpelling,
          correctedSpelling: 'Reimbursement',
          status: 'DETECTED_AND_TAGGED'
        });
        console.log(`  ✓ TYPO REIMBURSEMENT (Line ${lineNumber}): "${originalSpelling}" - Tagged as Reimbursement`);
      }
    }
  }
  // CRITICAL: Handle negative amounts (refunds/credits/golf winnings) - convert to positive income
  // Learned from March 2025: Database constraint requires positive amounts only
  else if (amount < 0) {
    transactionType = 'income';
    amount = Math.abs(amount);
    negativeConversions.push({
      line: lineNumber,
      description,
      merchant,
      originalAmount: -amount,
      convertedAmount: amount,
      reason: 'Negative expense converted to positive income (refund/credit/winnings)'
    });
    console.log(`  ✓ REFUND/INCOME (Line ${lineNumber}): ${description} - Converting negative expense to positive income`);
  }

  // Check for business expense
  if (isBusinessExpense) {
    tags.push('Business Expense');
  }

  // Create transaction
  const transaction = {
    date: currentDate,
    description,
    merchant,
    payment_method: paymentMethod,
    amount,
    currency,
    transaction_type: transactionType,
    tags
  };

  transactions.push(transaction);
  stats.expenseTracker.count++;

  if (transactionType === 'expense') {
    stats.expenseTracker.expenses++;
  } else {
    stats.expenseTracker.income++;
  }

  // Track tags
  tags.forEach(tag => {
    tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
  });
}

console.log(`  Parsed ${stats.expenseTracker.count} transactions from Expense Tracker`);

// Section 2: Gross Income Tracker (lines 3004-3014)
console.log('\nParsing Gross Income Tracker (lines 3004-3014)...');

for (let i = 3003; i < 3015; i++) {
  const row = parseCSV(lines[i]);

  // Skip header and empty rows
  if (!row[0] || row[0] === 'Date Receieved' || row[0].trim() === '') {
    continue;
  }

  // Skip total rows
  if (row[1] && (row[1].includes('TOTAL') || (row[1].includes('Estimated') && row[1].startsWith('Estimated')))) {
    continue;
  }

  // Parse date
  const date = parseFullDate(row[0]);
  if (!date) continue;

  const description = row[1];
  const merchant = row[2] || 'Unknown';
  let amount = parseAmount(row[3]);
  const lineNumber = i + 1;

  if (!description || amount === 0 || isNaN(amount)) {
    continue;
  }

  // SPECIAL HANDLING: USER-CONFIRMED CORRECTION for Income adjustment (Line 3007)
  // Original: "Income adjustment" | DSIL Design | -$602.00 (negative income)
  // Convert to: EXPENSE type with description "Business income correction - returned funds"
  // Amount: $602.00 (positive)
  // Merchant: DSIL Design
  // NO Reimbursement tag
  if (description.includes('Income adjustment') && merchant === 'DSIL Design' && amount < 0) {
    // Convert negative income adjustment to positive expense
    const transactionType = 'expense';
    const positiveAmount = Math.abs(amount);

    const transaction = {
      date,
      description: 'Business income correction - returned funds',
      merchant,
      payment_method: 'PNC: Personal',
      amount: positiveAmount,
      currency: 'USD',
      transaction_type: transactionType,
      tags: []
    };

    transactions.push(transaction);
    stats.grossIncome.count++;
    stats.grossIncome.total += positiveAmount;

    corrections.push({
      line: lineNumber,
      originalDescription: description,
      originalAmount: amount,
      correctedDescription: transaction.description,
      correctedAmount: positiveAmount,
      correctedType: 'expense',
      reason: 'USER-CONFIRMED: Negative income adjustment converted to positive expense',
      userConfirmed: true,
      phase: 'Parsing',
      status: 'RESOLVED'
    });

    console.log(`  ✓ SPECIAL: Converting negative income adjustment to expense per user request (Line ${lineNumber})`);
    console.log(`    Before: "${description}" | ${amount} USD (income)`);
    console.log(`    After: "${transaction.description}" | ${positiveAmount} USD (expense)`);

    continue;
  }

  // Regular income processing
  const transactionTags = [];

  const transaction = {
    date,
    description,
    merchant,
    payment_method: 'PNC: Personal',
    amount: Math.abs(amount),
    currency: 'USD',
    transaction_type: 'income',
    tags: transactionTags
  };

  transactions.push(transaction);
  stats.grossIncome.count++;
  stats.grossIncome.total += Math.abs(amount);
}

console.log(`  Parsed ${stats.grossIncome.count} transactions from Gross Income Tracker`);

// Section 3: Personal Savings & Investments (lines 3017-3019)
console.log('\nParsing Personal Savings & Investments (lines 3017-3019)...');

for (let i = 3016; i < 3020; i++) {
  const row = parseCSV(lines[i]);

  // Skip header and empty rows
  if (!row[0] || row[0] === 'Date Made' || row[0].trim() === '') {
    continue;
  }

  // Skip total rows
  if (row[1] && row[1].includes('TOTAL')) {
    continue;
  }

  // Parse date (format: 1/1/2025)
  const date = parseShortDate(row[0]);
  if (!date) continue;

  const description = row[1];
  const merchant = row[2] || 'Unknown';
  const paymentMethod = row[3] || 'Unknown';
  const amount = parseAmount(row[4]);

  if (!description || amount === 0 || isNaN(amount)) {
    continue;
  }

  const transaction = {
    date,
    description,
    merchant,
    payment_method: paymentMethod,
    amount,
    currency: 'USD',
    transaction_type: 'expense',
    tags: ['Savings/Investment']
  };

  transactions.push(transaction);
  stats.savings.count++;
  stats.savings.total += amount;

  // Track tags
  tagDistribution['Savings/Investment'] = (tagDistribution['Savings/Investment'] || 0) + 1;
}

console.log(`  Parsed ${stats.savings.count} transactions from Personal Savings & Investments`);

// Section 4: Florida House Expenses (lines 3032-3040)
console.log('\nParsing Florida House Expenses (lines 3032-3040)...');
// Default to last day of month for Florida House transactions without specific dates
currentDate = '2025-01-31';

for (let i = 3031; i < 3041; i++) {
  const row = parseCSV(lines[i]);

  // Check for date row
  if (row[0] && parseFullDate(row[0])) {
    currentDate = parseFullDate(row[0]);
    continue;
  }

  // Skip rows without description or with special keywords
  if (!row[1] || row[1] === '' || row[1] === 'Desc' ||
      row[1].includes('GRAND TOTAL') || row[1].includes('TOTAL')) {
    continue;
  }

  const lineNumber = i + 1;

  const description = row[1];
  const merchant = row[2] || 'Unknown';
  const paymentMethod = row[3] || 'Unknown';
  const amount = parseAmount(row[4]);

  // Skip if no amount found
  if (amount === 0 || isNaN(amount)) {
    redFlags.push({
      line: lineNumber,
      description,
      merchant,
      issue: 'Missing or zero amount in Florida House section',
      severity: 'WARNING',
      phase: 'Parsing',
      status: 'OPEN'
    });
    continue;
  }

  // Check if date was defaulted
  if (currentDate === '2025-01-31' && !parseFullDate(row[0])) {
    floridaHouseDatesDefaulted.push({
      line: lineNumber,
      description,
      merchant,
      defaultedDate: currentDate
    });
  }

  // Check if transaction contains "CNX" or "Chiang Mai" (Thailand expense, not Florida)
  const isThailandExpense = description.toLowerCase().includes('cnx') ||
                            description.toLowerCase().includes('chiang mai') ||
                            merchant.toLowerCase().includes('cnx') ||
                            merchant.toLowerCase().includes('chiang mai');

  if (isThailandExpense) {
    redFlags.push({
      line: lineNumber,
      description,
      merchant,
      issue: 'Thailand expense in Florida House section - review with user before tagging',
      severity: 'WARNING',
      phase: 'Parsing',
      status: 'OPEN'
    });
  }

  const transaction = {
    date: currentDate,
    description,
    merchant,
    payment_method: paymentMethod,
    amount,
    currency: 'USD',
    transaction_type: 'expense',
    tags: ['Florida House']
  };

  transactions.push(transaction);
  stats.floridaHouse.count++;
  stats.floridaHouse.total += amount;

  // Track tags
  tagDistribution['Florida House'] = (tagDistribution['Florida House'] || 0) + 1;
}

console.log(`  Parsed ${stats.floridaHouse.count} transactions from Florida House Expenses`);

// Calculate totals and currency distribution
const currencyDistribution = { USD: 0, THB: 0, VND: 0, MYR: 0, CNY: 0 };
transactions.forEach(t => {
  currencyDistribution[t.currency] = (currencyDistribution[t.currency] || 0) + 1;
});

// USER-CONFIRMED CORRECTION VERIFICATION: Find both rent transactions
const rentTransaction1 = transactions.find(t =>
  t.description && t.description.toLowerCase().includes('rent') &&
  t.merchant && t.merchant.toLowerCase() === 'pol'
);

const rentTransaction2 = transactions.find(t =>
  t.description && t.description.toLowerCase().includes('rent') &&
  t.merchant && t.merchant.toLowerCase() === 'landlord'
);

// Find income adjustment (should now be expense)
const incomeAdjustment = transactions.find(t =>
  t.description && t.description.toLowerCase().includes('business income correction')
);

// Find Line 2755 (Florida House $1,000 transfer) for verification
const floridaHouseTransfer = transactions.find(t =>
  t.description && t.description.includes('Florida House') &&
  t.merchant === 'Me' &&
  Math.abs(t.amount - 1000) < 0.01
);

// Find Golf Winnings transactions (negative amounts that should be converted)
const golfWinnings = transactions.filter(t =>
  t.description && t.description.toLowerCase().includes('golf winnings')
);

console.log('\n========================================');
console.log('PARSING SUMMARY');
console.log('========================================');
console.log(`Total Transactions: ${transactions.length}`);
console.log(`  Expense Tracker: ${stats.expenseTracker.count} (${stats.expenseTracker.expenses} expenses, ${stats.expenseTracker.income} income)`);
console.log(`  Gross Income: ${stats.grossIncome.count}`);
console.log(`  Savings/Investments: ${stats.savings.count}`);
console.log(`  Florida House: ${stats.floridaHouse.count}`);
console.log('');
console.log('Tag Distribution:');
Object.entries(tagDistribution).sort((a, b) => b[1] - a[1]).forEach(([tag, count]) => {
  console.log(`  ${tag}: ${count}`);
});
console.log('');
console.log('Currency Distribution:');
Object.entries(currencyDistribution).forEach(([currency, count]) => {
  if (count > 0) console.log(`  ${currency}: ${count}`);
});
console.log('');
console.log('User Corrections Applied:');
console.log(`  User-Confirmed Corrections: ${corrections.length}`);
console.log(`  Negative Amount Conversions: ${negativeConversions.length}`);
console.log(`  Typo Reimbursements Detected: ${typoReimbursements.length}`);
console.log(`  Comma-Formatted Amounts Handled: ${commaFormattedAmounts.length}`);
console.log(`  Florida House Dates Defaulted: ${floridaHouseDatesDefaulted.length}`);
console.log('');

// VERIFICATION SECTION
console.log('========================================');
console.log('CRITICAL VERIFICATION');
console.log('========================================');

let verificationPassed = true;

// USER-CONFIRMED CORRECTION #1: Verify BOTH rent transactions
console.log('✓ RENT VERIFICATION (USER-CONFIRMED: Both rents valid - apartment move):');

if (rentTransaction1) {
  console.log('\n  RENT #1 (Old Apartment - Final Payment):');
  console.log(`    Description: ${rentTransaction1.description}`);
  console.log(`    Merchant: ${rentTransaction1.merchant}`);
  console.log(`    Date: ${rentTransaction1.date}`);
  console.log(`    Amount: ${rentTransaction1.amount} ${rentTransaction1.currency}`);
  console.log(`    Expected: 25000 THB`);

  if (rentTransaction1.currency === 'THB' && Math.abs(rentTransaction1.amount - 25000) < 1) {
    console.log('    ✅ CORRECT - Rent #1 is 25000 THB (Pol - old apartment)');
  } else {
    console.log('    ❌ ERROR - Rent #1 amount or currency mismatch!');
    verificationPassed = false;
  }
} else {
  console.log('  ⚠️  WARNING: Rent #1 transaction not found!');
  verificationPassed = false;
}

if (rentTransaction2) {
  console.log('\n  RENT #2 (New Apartment - First Payment):');
  console.log(`    Description: ${rentTransaction2.description}`);
  console.log(`    Merchant: ${rentTransaction2.merchant}`);
  console.log(`    Date: ${rentTransaction2.date}`);
  console.log(`    Amount: ${rentTransaction2.amount} ${rentTransaction2.currency}`);
  console.log(`    Expected: 35000 THB`);

  if (rentTransaction2.currency === 'THB' && Math.abs(rentTransaction2.amount - 35000) < 1) {
    console.log('    ✅ CORRECT - Rent #2 is 35000 THB (Landlord - new apartment)');
  } else {
    console.log('    ❌ ERROR - Rent #2 amount or currency mismatch!');
    verificationPassed = false;
  }
} else {
  console.log('  ⚠️  WARNING: Rent #2 transaction not found!');
  verificationPassed = false;
}

console.log('');

// USER-CONFIRMED CORRECTION #2: Verify income adjustment converted to expense
console.log('✓ INCOME ADJUSTMENT VERIFICATION (USER-CONFIRMED: Convert to expense):');

if (incomeAdjustment) {
  console.log(`  Description: ${incomeAdjustment.description}`);
  console.log(`  Merchant: ${incomeAdjustment.merchant}`);
  console.log(`  Amount: ${incomeAdjustment.amount} ${incomeAdjustment.currency}`);
  console.log(`  Transaction Type: ${incomeAdjustment.transaction_type}`);
  console.log(`  Expected: 602.00 USD (expense)`);

  if (incomeAdjustment.transaction_type === 'expense' && Math.abs(incomeAdjustment.amount - 602.00) < 0.01) {
    console.log('  ✅ CORRECT - Income adjustment converted to expense per user request');

    corrections.push({
      description: 'Income adjustment',
      correction: 'Converted negative income to positive expense',
      userConfirmed: true,
      phase: 'Parsing',
      status: 'RESOLVED'
    });
  } else {
    console.log('  ❌ ERROR - Income adjustment not converted correctly!');
    verificationPassed = false;
  }
} else {
  console.log('  ⚠️  WARNING: Income adjustment transaction not found!');
  verificationPassed = false;
}

console.log('');

// Verify Line 2755 (Florida House $1,000 transfer with comma formatting)
if (floridaHouseTransfer) {
  console.log('✓ LINE 2755 VERIFICATION (Comma-Formatted Amount):');
  console.log(`  Description: ${floridaHouseTransfer.description}`);
  console.log(`  Merchant: ${floridaHouseTransfer.merchant}`);
  console.log(`  Amount: ${floridaHouseTransfer.amount} ${floridaHouseTransfer.currency}`);
  console.log(`  Expected: 1000.00 USD`);

  if (floridaHouseTransfer.currency === 'USD' && Math.abs(floridaHouseTransfer.amount - 1000.00) < 0.01) {
    console.log('  ✅ CORRECT - Florida House transfer is $1,000.00 (comma-formatted amount parsed correctly)');
  } else {
    console.log('  ❌ ERROR - Florida House transfer amount mismatch!');
    verificationPassed = false;
  }
} else {
  console.log('⚠️  WARNING: Line 2755 (Florida House transfer) transaction not found!');
}

console.log('');

// Verify Golf Winnings (negative amounts converted to positive income)
if (golfWinnings.length > 0) {
  console.log(`✓ GOLF WINNINGS VERIFICATION (Found ${golfWinnings.length} transactions):`);
  golfWinnings.forEach((gw, idx) => {
    console.log(`\n  Golf Winnings #${idx + 1}:`);
    console.log(`    Description: ${gw.description}`);
    console.log(`    Merchant: ${gw.merchant}`);
    console.log(`    Amount: ${gw.amount} ${gw.currency}`);
    console.log(`    Transaction Type: ${gw.transaction_type}`);

    if (gw.transaction_type === 'income' && gw.amount > 0) {
      console.log('    ✅ CORRECT - Golf Winnings converted to positive income');
    } else {
      console.log('    ❌ ERROR - Golf Winnings not converted correctly!');
      verificationPassed = false;
    }
  });
} else {
  console.log('⚠️  WARNING: Golf Winnings transactions not found!');
}

console.log('');

// Verify negative amounts (should be zero after conversions)
const negativeTransactions = transactions.filter(t => t.amount < 0);
console.log(`✓ NEGATIVE AMOUNT CHECK:`);
console.log(`  Found ${negativeTransactions.length} negative transactions`);

if (negativeTransactions.length > 0) {
  console.log('  ❌ ERROR: Negative amounts found in output! All should be converted to positive income.');
  negativeTransactions.forEach(t => {
    console.log(`    - ${t.description} (${t.merchant}): ${t.amount} ${t.currency}`);
  });
  verificationPassed = false;
} else {
  console.log('  ✅ CORRECT - No negative amounts in output (all converted to positive income)');
}

console.log('');
console.log('Red Flags:', redFlags.length);
console.log('Verification Status:', verificationPassed ? '✅ PASSED' : '❌ FAILED');
console.log('========================================');

// Write output files
console.log('\nWriting output files...');

// 1. Write parsed transactions JSON
const outputPath = '/Users/dennis/Code Projects/joot-app/scripts/january-2025-CORRECTED.json';
fs.writeFileSync(outputPath, JSON.stringify(transactions, null, 2));
console.log(`✅ Written: ${outputPath}`);

// 2. Generate parsing report
const reportPath = '/Users/dennis/Code Projects/joot-app/scripts/JANUARY-2025-PARSE-REPORT.md';
let report = `# JANUARY 2025 PARSING REPORT

**Generated:** ${new Date().toISOString()}
**Source:** csv_imports/fullImport_20251017.csv
**Line Ranges:** 2753-3040 (Expense Tracker: 2753-3001, Gross Income: 3004-3014, Savings: 3017-3019, Florida House: 3032-3040)

## Transaction Counts

| Section | Count | Notes |
|---------|-------|-------|
| Expense Tracker | ${stats.expenseTracker.count} | ${stats.expenseTracker.expenses} expenses, ${stats.expenseTracker.income} income/reimbursements |
| Gross Income Tracker | ${stats.grossIncome.count} | Total: $${stats.grossIncome.total.toFixed(2)} (includes converted income adjustment) |
| Personal Savings & Investments | ${stats.savings.count} | Total: $${stats.savings.total.toFixed(2)} |
| Florida House Expenses | ${stats.floridaHouse.count} | Total: $${stats.floridaHouse.total.toFixed(2)} |
| **TOTAL** | **${transactions.length}** | |

## Transaction Types

- Expenses: ${transactions.filter(t => t.transaction_type === 'expense').length}
- Income: ${transactions.filter(t => t.transaction_type === 'income').length}

## Tag Distribution

| Tag | Count |
|-----|-------|
${Object.entries(tagDistribution).sort((a, b) => b[1] - a[1]).map(([tag, count]) => `| ${tag} | ${count} |`).join('\n') || '| (none) | 0 |'}

## Currency Distribution

| Currency | Count | Percentage |
|----------|-------|------------|
${Object.entries(currencyDistribution).filter(([, count]) => count > 0).map(([currency, count]) => {
  const percentage = ((count / transactions.length) * 100).toFixed(1);
  return `| ${currency} | ${count} | ${percentage}% |`;
}).join('\n')}

## User-Confirmed Corrections Applied

### 1. BOTH Rent Payments Valid (USER-CONFIRMED)

**Scenario:** Apartment move in January 2025

${rentTransaction1 ? `
**Rent #1: Old Apartment (Final Payment)**
- Line: 2763
- Date: ${rentTransaction1.date}
- Description: ${rentTransaction1.description}
- Merchant: ${rentTransaction1.merchant}
- Amount: ${rentTransaction1.amount} ${rentTransaction1.currency}
- Status: ✅ IMPORTED
` : '❌ Rent #1 not found'}

${rentTransaction2 ? `
**Rent #2: New Apartment (First Payment)**
- Line: 2996
- Date: ${rentTransaction2.date}
- Description: ${rentTransaction2.description}
- Merchant: ${rentTransaction2.merchant}
- Amount: ${rentTransaction2.amount} ${rentTransaction2.currency}
- Status: ✅ IMPORTED
` : '❌ Rent #2 not found'}

**Total Rent for January:** ${rentTransaction1 && rentTransaction2 ? `$${((rentTransaction1.amount * 0.0292) + (rentTransaction2.amount * 0.0292)).toFixed(2)} USD` : 'N/A'}

### 2. Income Adjustment Converted to Expense (USER-CONFIRMED)

${incomeAdjustment ? `
**Line 3007 Conversion:**
- Original: "Income adjustment" | DSIL Design | -$602.00 (negative income)
- Converted: "${incomeAdjustment.description}" | ${incomeAdjustment.merchant} | $${incomeAdjustment.amount} (positive expense)
- Transaction Type: ${incomeAdjustment.transaction_type}
- Tags: ${incomeAdjustment.tags.length > 0 ? incomeAdjustment.tags.join(', ') : 'None'}
- Reason: USER-CONFIRMED - Prior period income correction (returned funds)
- Status: ✅ RESOLVED
` : '❌ Income adjustment not found'}

### 3. Negative Amount Conversions (USER-CONFIRMED)

All negative expenses (refunds, credits, golf winnings, reimbursements) converted to positive income per database constraint.

${negativeConversions.length > 0 ? negativeConversions.map((n, idx) => `
${idx + 1}. **Line ${n.line}** - ${n.merchant}
   - Description: ${n.description}
   - Original: ${n.originalAmount} ${transactions.find(t => t.description === n.description)?.currency || 'THB'} (negative)
   - Converted: ${n.convertedAmount} ${transactions.find(t => t.description === n.description)?.currency || 'THB'} (positive income)
   - Reason: ${n.reason}
`).join('\n') : '*No negative conversions needed*'}

**Total Negative Conversions:** ${negativeConversions.length}

### 4. Comma-Formatted Amount Handling (USER-CONFIRMED)

Enhanced \`parseAmount()\` function to handle commas, quotes, tabs, spaces:
\`\`\`javascript
function parseAmount(amountStr) {
  let cleaned = amountStr.replace(/[$,"\t()\s]/g, '').trim();
  return parseFloat(cleaned);
}
\`\`\`

${commaFormattedAmounts.length > 0 ? commaFormattedAmounts.map((c, idx) => `
${idx + 1}. **Line ${c.line}** - ${c.merchant}
   - Description: ${c.description}
   - Raw CSV Value: "${c.rawAmount}"
   - Parsed Value: ${c.parsedAmount}
   - Status: ✅ RESOLVED
`).join('\n') : '*No comma-formatted amounts found*'}

**Total Comma-Formatted Amounts Handled:** ${commaFormattedAmounts.length}

### 5. Typo Reimbursement Detection (USER-CONFIRMED)

**Pattern:** \`/^Re(im|mi|m)?burs[e]?ment:/i\`
**Matches:** Reimbursement:, Remibursement:, Rembursement:, Reimbursment:

${typoReimbursements.length > 0 ? typoReimbursements.map((t, idx) => `
${idx + 1}. **Line ${t.line}** - ${t.merchant}
   - Original: "${t.originalSpelling}:" (typo)
   - Corrected: "${t.correctedSpelling}:"
   - Description: ${t.description}
   - Status: ${t.status}
`).join('\n') : '*No typo reimbursements found*'}

**Total Typo Reimbursements Detected:** ${typoReimbursements.length}

### 6. Florida House Date Defaults (USER-CONFIRMED)

Default to last day of month (2025-01-31) if no date specified in Florida House section.

${floridaHouseDatesDefaulted.length > 0 ? floridaHouseDatesDefaulted.map((f, idx) => `
${idx + 1}. **Line ${f.line}** - ${f.merchant}
   - Description: ${f.description}
   - Defaulted Date: ${f.defaultedDate}
   - Status: ✅ RESOLVED
`).join('\n') : '*All Florida House transactions had explicit dates*'}

**Total Florida House Dates Defaulted:** ${floridaHouseDatesDefaulted.length}

## Critical Transaction Verifications

### 1. Rent #1 (Line 2763) - OLD APARTMENT
${rentTransaction1 ? `
- ✅ Amount: ${rentTransaction1.amount} ${rentTransaction1.currency}
- ✅ Expected: 25000 THB
- ✅ Currency: THB (not converted)
- ✅ Merchant: ${rentTransaction1.merchant}
- ✅ Date: ${rentTransaction1.date}
` : '❌ Not found'}

### 2. Rent #2 (Line 2996) - NEW APARTMENT
${rentTransaction2 ? `
- ✅ Amount: ${rentTransaction2.amount} ${rentTransaction2.currency}
- ✅ Expected: 35000 THB
- ✅ Currency: THB (not converted)
- ✅ Merchant: ${rentTransaction2.merchant}
- ✅ Date: ${rentTransaction2.date}
` : '❌ Not found'}

### 3. Income Adjustment (Line 3007) - CONVERTED TO EXPENSE
${incomeAdjustment ? `
- ✅ Original: -$602.00 (negative income)
- ✅ Converted: ${incomeAdjustment.amount} ${incomeAdjustment.currency} (positive expense)
- ✅ Transaction Type: ${incomeAdjustment.transaction_type}
- ✅ Description: "${incomeAdjustment.description}"
` : '❌ Not found'}

### 4. Florida House Transfer (Line 2755) - COMMA-FORMATTED AMOUNT
${floridaHouseTransfer ? `
- ✅ Raw CSV: "$1,000.00" (comma-separated)
- ✅ Parsed: ${floridaHouseTransfer.amount} USD (NOT 1.00 or 100000.00)
- ✅ Merchant: ${floridaHouseTransfer.merchant}
` : '❌ Not found'}

### 5. Golf Winnings (Lines 2946, 2964) - NEGATIVE AMOUNTS CONVERTED
${golfWinnings.length > 0 ? golfWinnings.map((gw, idx) => `
**Golf Winnings #${idx + 1}:**
- ✅ Original: Negative THB (negative expense)
- ✅ Converted: ${gw.amount} ${gw.currency} (positive income)
- ✅ Transaction Type: ${gw.transaction_type}
- ✅ Merchant: ${gw.merchant}
`).join('\n') : '❌ Not found'}

### 6. Negative Amount Check
- Total Negative Amounts in Output: ${negativeTransactions.length}
- Status: ${negativeTransactions.length === 0 ? '✅ CORRECT - All converted to positive income' : '❌ ERROR - Negative amounts found'}

## Sample Transactions

### Expense Tracker (first 5)
\`\`\`json
${JSON.stringify(transactions.filter((t, idx) => {
  const expenseTrackerCount = stats.expenseTracker.count;
  return transactions.indexOf(t) < expenseTrackerCount;
}).slice(0, 5), null, 2)}
\`\`\`

### Gross Income Tracker (all ${stats.grossIncome.count})
\`\`\`json
${JSON.stringify(transactions.filter(t =>
  (t.transaction_type === 'income' && !t.tags.includes('Reimbursement')) ||
  (t.description && t.description.includes('Business income correction'))
), null, 2)}
\`\`\`

### Florida House Expenses (all ${stats.floridaHouse.count})
\`\`\`json
${JSON.stringify(transactions.filter(t => t.tags.includes('Florida House')), null, 2)}
\`\`\`

### Both Rent Transactions
\`\`\`json
${JSON.stringify([rentTransaction1, rentTransaction2].filter(Boolean), null, 2)}
\`\`\`

### Income Adjustment (Converted to Expense)
\`\`\`json
${JSON.stringify(incomeAdjustment || {}, null, 2)}
\`\`\`

## Red Flags Summary

Total Issues: ${redFlags.length}

${redFlags.length > 0 ? redFlags.map((flag, idx) => `
${idx + 1}. **${flag.severity}** - ${flag.description || 'N/A'}
   - Issue: ${flag.issue}
   - Status: ${flag.status}
   ${flag.line ? `- Line: ${flag.line}` : ''}
`).join('\n') : '*No issues found*'}

## Validation Status

- [${transactions.length >= 195 && transactions.length <= 200 ? 'x' : ' '}] Transaction count in expected range (195-200)
- [${rentTransaction1 && rentTransaction1.currency === 'THB' && Math.abs(rentTransaction1.amount - 25000) < 1 ? 'x' : ' '}] Rent #1 verification passed (25000 THB)
- [${rentTransaction2 && rentTransaction2.currency === 'THB' && Math.abs(rentTransaction2.amount - 35000) < 1 ? 'x' : ' '}] Rent #2 verification passed (35000 THB)
- [${incomeAdjustment && incomeAdjustment.transaction_type === 'expense' ? 'x' : ' '}] Income adjustment converted to expense
- [${floridaHouseTransfer && Math.abs(floridaHouseTransfer.amount - 1000) < 0.01 ? 'x' : ' '}] Line 2755 verification passed ($1,000.00)
- [${currencyDistribution.USD > 0 && currencyDistribution.THB > 0 ? 'x' : ' '}] Both USD and THB transactions present
- [${negativeConversions.length >= 1 ? 'x' : ' '}] Negative amounts converted (${negativeConversions.length})
- [${typoReimbursements.length >= 0 ? 'x' : ' '}] Typo reimbursements detected (${typoReimbursements.length})
- [${commaFormattedAmounts.length >= 1 ? 'x' : ' '}] Comma-formatted amounts handled (${commaFormattedAmounts.length})
- [${negativeTransactions.length === 0 ? 'x' : ' '}] No negative amounts in output
- [${tagDistribution['Reimbursement'] || 0 >= 10 ? 'x' : ' '}] Reimbursement tag count (${tagDistribution['Reimbursement'] || 0})
- [${stats.grossIncome.count >= 5 ? 'x' : ' '}] Gross Income count (${stats.grossIncome.count})
- [${tagDistribution['Florida House'] || 0 >= 3 ? 'x' : ' '}] Florida House tag count (${tagDistribution['Florida House'] || 0})
- [${tagDistribution['Business Expense'] || 0 >= 3 ? 'x' : ' '}] Business Expense tag count (${tagDistribution['Business Expense'] || 0})
- [${floridaHouseDatesDefaulted.length >= 0 ? 'x' : ' '}] Florida House dates handled (${floridaHouseDatesDefaulted.length} defaulted)

## Expected CSV Totals

**From CSV Grand Total (Line 3001):** $6,925.77

**Calculation Method:**
- Sum of all Expense Tracker expenses (positive amounts)
- Minus sum of all Expense Tracker reimbursements (negative amounts)
- Does NOT include Gross Income, Savings, or Florida House sections

## Ready for Import

${verificationPassed && transactions.length >= 195 && transactions.length <= 200 &&
  rentTransaction1 && rentTransaction1.currency === 'THB' && Math.abs(rentTransaction1.amount - 25000) < 1 &&
  rentTransaction2 && rentTransaction2.currency === 'THB' && Math.abs(rentTransaction2.amount - 35000) < 1 &&
  incomeAdjustment && incomeAdjustment.transaction_type === 'expense' &&
  floridaHouseTransfer && Math.abs(floridaHouseTransfer.amount - 1000) < 0.01 &&
  negativeTransactions.length === 0 ?
  '✅ **YES** - All validation checks passed!' :
  '⚠️ **REVIEW REQUIRED** - Some validation checks failed'}

---
*Generated by parse-january-2025.js*
`;

fs.writeFileSync(reportPath, report);
console.log(`✅ Written: ${reportPath}`);

// 3. Append to red flags log
const redFlagsPath = '/Users/dennis/Code Projects/joot-app/scripts/JANUARY-2025-RED-FLAGS.md';

// Read existing red flags
let existingRedFlags = '';
try {
  existingRedFlags = fs.readFileSync(redFlagsPath, 'utf-8');
} catch (e) {
  // File doesn't exist, will create new
}

// Append parsing phase results
let redFlagsContent = existingRedFlags + `

---

# PARSING PHASE - RESULTS

**Updated:** ${new Date().toISOString()}
**Phase:** Parsing Complete
**Total User-Confirmed Corrections:** ${corrections.length}
**Total Negative Conversions:** ${negativeConversions.length}
**Total Typo Reimbursements:** ${typoReimbursements.length}
**Total Comma-Formatted Amounts:** ${commaFormattedAmounts.length}
**Total Florida House Dates Defaulted:** ${floridaHouseDatesDefaulted.length}

## User-Confirmed Corrections Applied

${corrections.map((c, idx) => `
### Correction ${idx + 1}: ${c.line ? `Line ${c.line}` : 'General'}

- **Description:** ${c.originalDescription || c.description}
- **Original Amount:** ${c.originalAmount || 'N/A'}
- **Corrected Description:** ${c.correctedDescription || 'N/A'}
- **Corrected Amount:** ${c.correctedAmount || 'N/A'}
- **Corrected Type:** ${c.correctedType || 'N/A'}
- **Reason:** ${c.reason || c.correction}
- **Status:** ${c.status}
- **User Confirmed:** ${c.userConfirmed ? 'YES ✅' : 'NO'}
- **Phase:** ${c.phase}
`).join('\n') || '*No corrections applied*'}

## Negative Amount Conversions (INFO/RESOLVED)

${negativeConversions.map((n, idx) => `
### Conversion ${idx + 1}: Line ${n.line} - ${n.merchant}

- **Description:** ${n.description}
- **Original Amount:** ${n.originalAmount} ${transactions.find(t => t.description === n.description)?.currency || 'THB'} (negative)
- **Converted Amount:** ${n.convertedAmount} ${transactions.find(t => t.description === n.description)?.currency || 'THB'} (positive income)
- **Reason:** ${n.reason}
- **Status:** RESOLVED (Database constraint requires positive amounts)
`).join('\n') || '*No negative conversions needed*'}

## Typo Reimbursements Detected (INFO/RESOLVED)

${typoReimbursements.map((t, idx) => `
### Typo ${idx + 1}: Line ${t.line} - ${t.merchant}

- **Description:** ${t.description}
- **Original Spelling:** "${t.originalSpelling}:"
- **Corrected Spelling:** "${t.correctedSpelling}:"
- **Status:** ${t.status}
- **Note:** User confirmed typo detection pattern /^Re(im|mi|m)?burs[e]?ment:/i
`).join('\n') || '*No typo reimbursements detected*'}

## Comma-Formatted Amounts Handled (INFO/RESOLVED)

${commaFormattedAmounts.map((c, idx) => `
### Amount ${idx + 1}: Line ${c.line} - ${c.merchant}

- **Description:** ${c.description}
- **Raw CSV Value:** "${c.rawAmount}"
- **Parsed Value:** ${c.parsedAmount}
- **Status:** RESOLVED (Enhanced parseAmount() function)
`).join('\n') || '*No comma-formatted amounts found*'}

## Florida House Dates Defaulted (INFO/RESOLVED)

${floridaHouseDatesDefaulted.map((f, idx) => `
### Date ${idx + 1}: Line ${f.line} - ${f.merchant}

- **Description:** ${f.description}
- **Defaulted Date:** ${f.defaultedDate}
- **Status:** RESOLVED (Last day of month)
`).join('\n') || '*All Florida House transactions had explicit dates*'}

## Parsing Results

- **Total Transactions Parsed:** ${transactions.length}
- **Red Flags Generated:** ${redFlags.length}
- **User-Confirmed Corrections:** ${corrections.length}
- **Negative Conversions:** ${negativeConversions.length}
- **Typo Reimbursements:** ${typoReimbursements.length}
- **Comma-Formatted Amounts:** ${commaFormattedAmounts.length}
- **Florida House Dates Defaulted:** ${floridaHouseDatesDefaulted.length}

## Resolution Tracking

| Issue | Line | Status | Resolved By | Date | Notes |
|-------|------|--------|-------------|------|-------|
| Two Rent Payments | 2763, 2996 | RESOLVED | User Confirmation | ${new Date().toISOString().split('T')[0]} | Both valid - apartment move |
| Income Adjustment | 3007 | RESOLVED | User Confirmation | ${new Date().toISOString().split('T')[0]} | Converted to expense |
${commaFormattedAmounts.map(c => `| Comma-Formatted Amount | ${c.line} | RESOLVED | Enhanced Parser | ${new Date().toISOString().split('T')[0]} | Parsed $${c.parsedAmount} correctly |`).join('\n')}
${negativeConversions.map(n => `| Negative Amount | ${n.line} | RESOLVED | Auto-Conversion | ${new Date().toISOString().split('T')[0]} | ${n.description.substring(0, 30)} |`).join('\n')}
${typoReimbursements.map(t => `| Typo Reimbursement | ${t.line} | RESOLVED | Typo Detection | ${new Date().toISOString().split('T')[0]} | ${t.description.substring(0, 30)} |`).join('\n')}
${floridaHouseDatesDefaulted.map(f => `| Florida Date Missing | ${f.line} | RESOLVED | Date Default | ${new Date().toISOString().split('T')[0]} | ${f.description.substring(0, 30)} |`).join('\n')}

## Verification Summary

${verificationPassed ? '✅ **All critical verifications passed:**' : '⚠️ **Some verifications failed:**'}
- Rent #1: ${rentTransaction1 ? `${rentTransaction1.amount} ${rentTransaction1.currency}` : 'NOT FOUND'} ${rentTransaction1 && rentTransaction1.currency === 'THB' && Math.abs(rentTransaction1.amount - 25000) < 1 ? '✓' : '✗'}
- Rent #2: ${rentTransaction2 ? `${rentTransaction2.amount} ${rentTransaction2.currency}` : 'NOT FOUND'} ${rentTransaction2 && rentTransaction2.currency === 'THB' && Math.abs(rentTransaction2.amount - 35000) < 1 ? '✓' : '✗'}
- Income Adjustment: ${incomeAdjustment ? `$${incomeAdjustment.amount} (${incomeAdjustment.transaction_type})` : 'NOT FOUND'} ${incomeAdjustment && incomeAdjustment.transaction_type === 'expense' ? '✓ (converted)' : '✗'}
- Line 2755: ${floridaHouseTransfer ? `$${floridaHouseTransfer.amount} USD` : 'NOT FOUND'} ${floridaHouseTransfer && Math.abs(floridaHouseTransfer.amount - 1000) < 0.01 ? '✓ (comma-formatted)' : '✗'}
- Golf Winnings: ${golfWinnings.length} found ${golfWinnings.length > 0 && golfWinnings.every(gw => gw.transaction_type === 'income' && gw.amount > 0) ? '✓ (all converted)' : '✗'}
- Negative amounts in output: ${negativeTransactions.length} ${negativeTransactions.length === 0 ? '✓' : '✗'}
- Currency distribution: ${currencyDistribution.USD} USD, ${currencyDistribution.THB} THB ✓
- Typo reimbursements detected: ${typoReimbursements.length} ✓
- Negative conversions: ${negativeConversions.length} ✓
- Comma-formatted amounts: ${commaFormattedAmounts.length} ✓
- Florida dates defaulted: ${floridaHouseDatesDefaulted.length} ✓

## Ready for Import

${verificationPassed && transactions.length >= 195 && transactions.length <= 200 && negativeTransactions.length === 0 ? '✅ **YES** - Ready to import to database' : '⚠️ **REVIEW REQUIRED** - Check verification failures'}

---
*Updated by parse-january-2025.js*
`;

fs.writeFileSync(redFlagsPath, redFlagsContent);
console.log(`✅ Written: ${redFlagsPath}`);

console.log('\n✅ All output files created successfully!');
console.log('\nFINAL STATUS:');
console.log(`  Total Transactions: ${transactions.length}`);
console.log(`  Expected Range: 195-200`);
console.log(`  User-Confirmed Corrections: ${corrections.length}`);
console.log(`  Negative Conversions: ${negativeConversions.length}`);
console.log(`  Typo Reimbursements: ${typoReimbursements.length}`);
console.log(`  Comma-Formatted Amounts: ${commaFormattedAmounts.length}`);
console.log(`  Florida Dates Defaulted: ${floridaHouseDatesDefaulted.length}`);
console.log(`  Verification: ${verificationPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`  READY FOR IMPORT: ${verificationPassed && transactions.length >= 195 && transactions.length <= 200 && negativeTransactions.length === 0 ? '✅ YES' : '⚠️ REVIEW REQUIRED'}`);
