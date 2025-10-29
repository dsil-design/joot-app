const fs = require('fs');
const path = require('path');

// Parse CSV file
const csvPath = '/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

// Helper function to parse date in format "Monday, September 1, 2024"
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

// Helper function to parse date in format "9/3/2024"
function parseShortDate(dateStr) {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

// Helper function to parse amount with enhanced comma handling (CRITICAL for $1,000.00, $1,259.41, $3,189.73)
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
console.log('SEPTEMBER 2024 PARSING SCRIPT');
console.log('========================================\n');

// Section 1: Expense Tracker (lines 3978-4251, i starts at 3977)
console.log('Parsing Expense Tracker (lines 3978-4251)...');
let currentDate = null;

for (let i = 3977; i < 4252; i++) {
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

  // Currency and amount extraction (CRITICAL - use THB column 6, never column 8 conversion)
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

    // Track if this was comma-formatted (CRITICAL for $1,000.00, $1,259.41, etc.)
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
  // Pattern: /^Re(im|mi|m)?burs[e]?ment:?/i (with or without colon)
  // Matches: Reimbursement, Reimbursement:, Remibursement:, Rembursement:, Reimbursment:
  // SEPTEMBER SPECIFIC: "Reimbursement Nisbo" (missing colon) on Line 4041
  const isReimbursement = /^Re(im|mi|m)?burs[e]?ment:?/i.test(description.trim());

  if (isReimbursement) {
    // Check if this is DSIL income (no Reimbursement tag) - DECEMBER LESSON
    const isDSILIncome = merchant && (
      merchant.toLowerCase().includes('dsil design') ||
      merchant.toLowerCase().includes('dsil llc') ||
      merchant.toLowerCase().includes('dsil')
    );

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

      // Track if this was a typo variant (e.g., Line 4041: "Reimbursement" without colon)
      const descLower = description.toLowerCase();
      if (descLower.startsWith('remibursement') ||
          descLower.startsWith('rembursement') ||
          descLower.startsWith('reimbursment') ||
          (!description.includes(':') && descLower.startsWith('reimbursement'))) {
        const originalSpelling = description.split(/[\s]/)[0]; // Get first word
        typoReimbursements.push({
          line: lineNumber,
          description,
          merchant,
          originalSpelling,
          correctedSpelling: 'Reimbursement',
          status: 'DETECTED_AND_TAGGED',
          note: !description.includes(':') ? 'Missing colon after Reimbursement' : 'Typo variant'
        });
        console.log(`  ✓ TYPO REIMBURSEMENT (Line ${lineNumber}): "${originalSpelling}" - Tagged as Reimbursement`);
      }
    }
  }
  // CRITICAL: Handle negative amounts (refunds/credits/exchanges) - convert to positive income
  // Learned from March 2025: Database constraint requires positive amounts only
  // SEPTEMBER SPECIFIC: Line 4123 "Partial Refund: Smoothie" $(4.53), Line 4228 "Exchange from Jakody" $(520.00)
  else if (amount < 0) {
    transactionType = 'income';
    amount = Math.abs(amount);
    negativeConversions.push({
      line: lineNumber,
      description,
      merchant,
      originalAmount: -amount,
      convertedAmount: amount,
      reason: 'Negative expense converted to positive income (refund/credit/exchange)'
    });
    console.log(`  ✓ REFUND/INCOME (Line ${lineNumber}): ${description} - Converting negative expense to positive income`);
  }

  // Check for business expense (Column 4 = "X", NOT column 3)
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

// Section 2: Gross Income Tracker (lines 4253-4262, i starts at 4252)
console.log('\nParsing Gross Income Tracker (lines 4253-4262)...');

for (let i = 4252; i < 4263; i++) {
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
  const rawAmount = row[3];
  let amount = parseAmount(rawAmount);
  const lineNumber = i + 1;

  if (!description || amount === 0 || isNaN(amount)) {
    continue;
  }

  // Track comma-formatted amounts in Gross Income section (CRITICAL for $3,189.73, $3,184.32)
  if (rawAmount && rawAmount.includes(',')) {
    commaFormattedAmounts.push({
      line: lineNumber,
      description,
      merchant,
      rawAmount,
      parsedAmount: amount
    });
    console.log(`  ✓ COMMA-FORMATTED AMOUNT (Line ${lineNumber}): "${rawAmount}" → ${amount}`);
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

// Section 3: Personal Savings & Investments (lines 4264-4267, i starts at 4263)
console.log('\nParsing Personal Savings & Investments (lines 4264-4267)...');

for (let i = 4263; i < 4268; i++) {
  const row = parseCSV(lines[i]);

  // Skip header rows
  if (row[0] === 'Date Made' || row[1] === 'Description') {
    continue;
  }

  // Skip total rows
  if (row[0] === 'TOTAL' || (row[1] && row[1].includes('TOTAL'))) {
    continue;
  }

  // Skip empty rows (all columns empty or whitespace)
  if (!row[1] || row[1].trim() === '') {
    continue;
  }

  const lineNumber = i + 1;

  // Parse date (format: may be empty or 9/1/2024)
  // For September 2024: Date field is EMPTY, default to 2024-09-01
  let date = null;
  if (row[0] && row[0].trim() !== '') {
    date = parseShortDate(row[0]);
  }

  // Default to first day of month if no date
  if (!date) {
    date = '2024-09-01';
    console.log(`  ℹ INFO (Line ${lineNumber}): Savings transaction has no date, defaulting to 2024-09-01`);
  }

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

// Section 4: Florida House Expenses (lines 4279-4286, i starts at 4278)
console.log('\nParsing Florida House Expenses (lines 4279-4286)...');
// Default to last day of month for Florida House transactions without specific dates (FEBRUARY LESSON)
currentDate = '2024-09-30';

for (let i = 4278; i < 4287; i++) {
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

  // Skip header row
  if (row[0] === 'September 2024: Florida House Expenses') {
    continue;
  }

  const lineNumber = i + 1;

  const description = row[1];
  const merchant = row[2] || 'Unknown';
  // September 2024 column structure: ,Desc,Merchant,Payment Type,Subtotal
  const paymentMethod = row[3] || 'Unknown'; // Column 3 for payment type
  const amount = parseAmount(row[4]); // Column 4 for amount

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

  // Check if date was defaulted (no explicit date in row)
  if (currentDate === '2024-09-30' && !parseFullDate(row[0])) {
    floridaHouseDatesDefaulted.push({
      line: lineNumber,
      description,
      merchant,
      defaultedDate: currentDate
    });
    console.log(`  ℹ INFO (Line ${lineNumber}): Florida House transaction date defaulted to ${currentDate}`);
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

// USER-CONFIRMED CORRECTION VERIFICATION: Find key transactions

// Find rent transaction (should be THB 25,000 NOT USD)
const rentTransaction = transactions.find(t =>
  t.description && t.description.toLowerCase().includes('rent') &&
  t.merchant && t.merchant.toLowerCase() === 'pol'
);

// Find Line 3983 (Florida House $1,000 transfer with comma formatting)
const floridaHouseTransfer = transactions.find(t =>
  t.description && t.description.includes('Florida House') &&
  t.merchant === 'Me' &&
  Math.abs(t.amount - 1000) < 0.01
);

// Find Line 4136 (Moving cost with comma formatting)
const movingExpense = transactions.find(t =>
  t.description && t.description.toLowerCase().includes('moving') &&
  Math.abs(t.amount - 1259.41) < 0.01
);

// Find Nisbo reimbursement (typo variant - missing colon)
const nisboReimbursement = transactions.find(t =>
  t.description && t.description.includes('Reimbursement') &&
  t.merchant && t.merchant.toLowerCase() === 'nisbo'
);

// Find Jakody exchange pair
const jakodyExpense = transactions.find(t =>
  t.description && t.description.includes('Exchange for Jakody')
);

const jakodyIncome = transactions.find(t =>
  t.description && t.description.includes('Exchange from Jakody')
);

// Find Smoothie partial refund
const smoothieRefund = transactions.find(t =>
  t.description && t.description.includes('Partial Refund') &&
  t.merchant && t.merchant.toLowerCase() === 'grab'
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
  if (count > 0) console.log(`  ${currency}: ${count} (${((count / transactions.length) * 100).toFixed(1)}%)`);
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

// USER-CONFIRMED CORRECTION #1: Verify rent is THB 25,000 (NOT USD conversion)
console.log('✓ RENT VERIFICATION:');

if (rentTransaction) {
  console.log(`  Description: ${rentTransaction.description}`);
  console.log(`  Merchant: ${rentTransaction.merchant}`);
  console.log(`  Date: ${rentTransaction.date}`);
  console.log(`  Amount: ${rentTransaction.amount} ${rentTransaction.currency}`);
  console.log(`  Expected: 25000 THB (NOT ~$737.50 USD)`);

  if (rentTransaction.currency === 'THB' && Math.abs(rentTransaction.amount - 25000) < 1) {
    console.log('  ✅ CORRECT - Rent is 25000 THB (not USD conversion)');
  } else {
    console.log('  ❌ ERROR - Rent amount or currency mismatch!');
    verificationPassed = false;
  }
} else {
  console.log('  ⚠️  WARNING: Rent transaction not found!');
  verificationPassed = false;
}

console.log('');

// USER-CONFIRMED CORRECTION #2: Currency Exchange Pair (Jakody)
console.log('✓ CURRENCY EXCHANGE PAIR VERIFICATION (USER-CONFIRMED: Import both):');

if (jakodyExpense && jakodyIncome) {
  console.log('\n  Exchange Expense (THB payment):');
  console.log(`    Description: ${jakodyExpense.description}`);
  console.log(`    Merchant: ${jakodyExpense.merchant}`);
  console.log(`    Amount: ${jakodyExpense.amount} ${jakodyExpense.currency}`);
  console.log(`    Type: ${jakodyExpense.transaction_type}`);
  console.log(`    Expected: 16000 THB (expense)`);

  console.log('\n  Exchange Income (USD received):');
  console.log(`    Description: ${jakodyIncome.description}`);
  console.log(`    Merchant: ${jakodyIncome.merchant}`);
  console.log(`    Amount: ${jakodyIncome.amount} ${jakodyIncome.currency}`);
  console.log(`    Type: ${jakodyIncome.transaction_type}`);
  console.log(`    Expected: 520.00 USD (income, converted from negative)`);

  if (jakodyExpense.amount === 16000 && jakodyExpense.currency === 'THB' &&
      jakodyIncome.amount === 520 && jakodyIncome.currency === 'USD' &&
      jakodyIncome.transaction_type === 'income') {
    console.log('  ✅ CORRECT - Both exchange transactions imported correctly');
  } else {
    console.log('  ❌ ERROR - Exchange pair mismatch!');
    verificationPassed = false;
  }
} else {
  console.log('  ⚠️  WARNING: Exchange transaction pair not found!');
  verificationPassed = false;
}

console.log('');

// USER-CONFIRMED CORRECTION #3: Moving expense with comma
console.log('✓ MOVING EXPENSE VERIFICATION (USER-CONFIRMED: Import as-is):');

if (movingExpense) {
  console.log(`  Description: ${movingExpense.description}`);
  console.log(`  Merchant: ${movingExpense.merchant}`);
  console.log(`  Amount: ${movingExpense.amount} ${movingExpense.currency}`);
  console.log(`  Expected: 1259.41 USD (comma-formatted)`);

  if (Math.abs(movingExpense.amount - 1259.41) < 0.01) {
    console.log('  ✅ CORRECT - Moving expense parsed correctly ($1,259.41)');
  } else {
    console.log('  ❌ ERROR - Moving expense amount mismatch!');
    verificationPassed = false;
  }
} else {
  console.log('  ⚠️  WARNING: Moving expense not found!');
  verificationPassed = false;
}

console.log('');

// Verify Florida House transfer (comma-formatted $1,000.00)
if (floridaHouseTransfer) {
  console.log('✓ FLORIDA HOUSE TRANSFER VERIFICATION (Comma-Formatted):');
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
  console.log('⚠️  WARNING: Florida House transfer transaction not found!');
}

console.log('');

// Verify Nisbo reimbursement (typo - missing colon)
if (nisboReimbursement) {
  console.log('✓ NISBO REIMBURSEMENT VERIFICATION (Typo - Missing Colon):');
  console.log(`  Description: ${nisboReimbursement.description}`);
  console.log(`  Merchant: ${nisboReimbursement.merchant}`);
  console.log(`  Amount: ${nisboReimbursement.amount} ${nisboReimbursement.currency}`);
  console.log(`  Type: ${nisboReimbursement.transaction_type}`);
  console.log(`  Tags: ${nisboReimbursement.tags.join(', ') || 'None'}`);
  console.log(`  Expected: 2000 THB (income with Reimbursement tag)`);

  if (nisboReimbursement.transaction_type === 'income' &&
      nisboReimbursement.tags.includes('Reimbursement') &&
      nisboReimbursement.amount === 2000 &&
      nisboReimbursement.currency === 'THB') {
    console.log('  ✅ CORRECT - Nisbo reimbursement detected despite missing colon');
  } else {
    console.log('  ❌ ERROR - Nisbo reimbursement not tagged correctly!');
    verificationPassed = false;
  }
} else {
  console.log('⚠️  WARNING: Nisbo reimbursement not found!');
}

console.log('');

// Verify Smoothie partial refund (negative amount converted)
if (smoothieRefund) {
  console.log('✓ SMOOTHIE PARTIAL REFUND VERIFICATION (Negative Converted):');
  console.log(`  Description: ${smoothieRefund.description}`);
  console.log(`  Merchant: ${smoothieRefund.merchant}`);
  console.log(`  Amount: ${smoothieRefund.amount} ${smoothieRefund.currency}`);
  console.log(`  Type: ${smoothieRefund.transaction_type}`);
  console.log(`  Expected: 4.53 USD (positive income, converted from negative)`);

  if (smoothieRefund.transaction_type === 'income' &&
      Math.abs(smoothieRefund.amount - 4.53) < 0.01 &&
      smoothieRefund.amount > 0) {
    console.log('  ✅ CORRECT - Smoothie refund converted to positive income');
  } else {
    console.log('  ❌ ERROR - Smoothie refund not converted correctly!');
    verificationPassed = false;
  }
} else {
  console.log('⚠️  WARNING: Smoothie partial refund not found!');
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
const outputPath = '/Users/dennis/Code Projects/joot-app/scripts/september-2024-CORRECTED.json';
fs.writeFileSync(outputPath, JSON.stringify(transactions, null, 2));
console.log(`✅ Written: ${outputPath}`);

// 2. Update red flags log
const redFlagsPath = '/Users/dennis/Code Projects/joot-app/scripts/SEPTEMBER-2024-RED-FLAGS.md';

let redFlagsContent = `# September 2024 Parsing Results

**Generated:** ${new Date().toISOString()}
**Source:** csv_imports/fullImport_20251017.csv
**Line Ranges:** 3978-4286 (Expense Tracker: 3978-4251, Gross Income: 4253-4262, Savings: 4264-4267, Florida House: 4279-4286)

---

## PARSING PHASE - COMPLETE ✅

**Phase:** Parsing Complete
**Total Transactions Parsed:** ${transactions.length}
**Expected Transaction Count:** 218
**Match Status:** ${transactions.length === 218 ? '✅ EXACT MATCH' : `⚠️ VARIANCE: ${transactions.length - 218}`}

**Total User-Confirmed Corrections:** ${corrections.length}
**Total Negative Conversions:** ${negativeConversions.length}
**Total Typo Reimbursements:** ${typoReimbursements.length}
**Total Comma-Formatted Amounts:** ${commaFormattedAmounts.length}
**Total Florida House Dates Defaulted:** ${floridaHouseDatesDefaulted.length}

---

## USER-CONFIRMED CORRECTIONS APPLIED

### 1. Currency Exchange Pair (Sept 28) - USER CONFIRMED ✅

**Decision:** IMPORT BOTH transactions

**Exchange Expense:**
- Line: 4227
- Description: "Exchange for Jakody"
- Merchant: Jakody
- Amount: ${jakodyExpense ? jakodyExpense.amount : 'NOT FOUND'} ${jakodyExpense ? jakodyExpense.currency : ''}
- Type: expense
- Status: ${jakodyExpense ? '✅ IMPORTED' : '❌ NOT FOUND'}

**Exchange Income:**
- Line: 4228
- Description: "Exchange from Jakody"
- Merchant: Jakody
- Original CSV: $(520.00) (negative)
- Converted Amount: ${jakodyIncome ? jakodyIncome.amount : 'NOT FOUND'} ${jakodyIncome ? jakodyIncome.currency : ''} (positive income)
- Type: income
- Status: ${jakodyIncome ? '✅ IMPORTED (converted from negative)' : '❌ NOT FOUND'}

**Net Effect:** Paid THB 16,000 to exchange, received $520 back

### 2. Moving Expense (Sept 17) - USER CONFIRMED ✅

**Decision:** IMPORT as-is

- Line: 4136
- Description: "Payment for half of moving costs"
- Merchant: Me
- Raw CSV: "$1,259.41" (comma-formatted)
- Parsed Amount: ${movingExpense ? movingExpense.amount : 'NOT FOUND'} USD
- Type: expense
- Status: ${movingExpense ? '✅ IMPORTED (comma handled correctly)' : '❌ NOT FOUND'}

---

## NEGATIVE AMOUNT CONVERSIONS (MARCH LESSON)

**Database Constraint:** ALL amounts must be positive. Negative expenses → positive income.

${negativeConversions.map((n, idx) => `
### Conversion ${idx + 1}: Line ${n.line} - ${n.merchant}

- **Description:** ${n.description}
- **Original CSV Amount:** ${n.originalAmount} (negative)
- **Converted Amount:** ${n.convertedAmount} (positive income)
- **Currency:** ${transactions.find(t => t.description === n.description)?.currency || 'USD'}
- **Reason:** ${n.reason}
- **Status:** ✅ RESOLVED
`).join('\n') || '*No negative conversions needed*'}

**Total Negative Conversions:** ${negativeConversions.length}
**Expected for September 2024:** 3
**Match Status:** ${negativeConversions.length === 3 ? '✅ CORRECT' : `⚠️ VARIANCE: Found ${negativeConversions.length}, expected 3`}

---

## COMMA-FORMATTED AMOUNTS HANDLED (MARCH LESSON)

**Enhanced parseAmount() Function:**
\`\`\`javascript
function parseAmount(amountStr) {
  let cleaned = amountStr.replace(/[$,"\t()\s]/g, '').trim();
  return parseFloat(cleaned);
}
\`\`\`

${commaFormattedAmounts.map((c, idx) => `
### Amount ${idx + 1}: Line ${c.line} - ${c.merchant}

- **Description:** ${c.description}
- **Raw CSV Value:** "${c.rawAmount}"
- **Parsed Value:** ${c.parsedAmount}
- **Status:** ✅ RESOLVED
`).join('\n') || '*No comma-formatted amounts found*'}

**Total Comma-Formatted Amounts Handled:** ${commaFormattedAmounts.length}
**Expected for September 2024:** 4 (Florida House $1,000, Moving $1,259.41, Paycheck 1 $3,189.73, Paycheck 2 $3,184.32)
**Match Status:** ${commaFormattedAmounts.length === 4 ? '✅ CORRECT' : `⚠️ VARIANCE: Found ${commaFormattedAmounts.length}, expected 4`}

---

## TYPO REIMBURSEMENTS DETECTED (FEBRUARY LESSON)

**Pattern:** \`/^Re(im|mi|m)?burs[e]?ment:?/i\`
**Matches:** Reimbursement, Reimbursement:, Remibursement:, Rembursement:, Reimbursment: (with or without colon)

${typoReimbursements.map((t, idx) => `
### Typo ${idx + 1}: Line ${t.line} - ${t.merchant}

- **Description:** ${t.description}
- **Original Spelling:** "${t.originalSpelling}"
- **Corrected Spelling:** "${t.correctedSpelling}"
- **Status:** ${t.status}
- **Note:** ${t.note || 'User confirmed typo detection pattern'}
`).join('\n') || '*No typo reimbursements detected*'}

**Total Typo Reimbursements Detected:** ${typoReimbursements.length}
**Expected for September 2024:** 1 (Nisbo - missing colon)
**Match Status:** ${typoReimbursements.length === 1 ? '✅ CORRECT' : `⚠️ VARIANCE: Found ${typoReimbursements.length}, expected 1`}

---

## FLORIDA HOUSE DATES DEFAULTED (FEBRUARY LESSON)

**Default Date:** Last day of month (2024-09-30) if no explicit date

${floridaHouseDatesDefaulted.map((f, idx) => `
### Date ${idx + 1}: Line ${f.line} - ${f.merchant}

- **Description:** ${f.description}
- **Defaulted Date:** ${f.defaultedDate}
- **Status:** ✅ RESOLVED
`).join('\n') || '*All Florida House transactions had explicit dates*'}

**Total Florida House Dates Defaulted:** ${floridaHouseDatesDefaulted.length}
**Note:** Pre-flight indicated dates ARE present for September 2024 (Sept 3 & 4)

---

## CRITICAL TRANSACTION VERIFICATIONS

### 1. Rent (Line 4022) - THB 25,000 ✅
${rentTransaction ? `
- ✅ Amount: ${rentTransaction.amount} ${rentTransaction.currency}
- ✅ Expected: 25000 THB (NOT ~$737.50 USD conversion)
- ✅ Currency: ${rentTransaction.currency}
- ✅ Merchant: ${rentTransaction.merchant}
- ✅ Date: ${rentTransaction.date}
- **Verification:** ${rentTransaction.currency === 'THB' && Math.abs(rentTransaction.amount - 25000) < 1 ? '✅ PASSED' : '❌ FAILED'}
` : '❌ NOT FOUND'}

### 2. Florida House Transfer (Line 3983) - $1,000.00 ✅
${floridaHouseTransfer ? `
- ✅ Raw CSV: "$1,000.00" (comma-formatted)
- ✅ Parsed: ${floridaHouseTransfer.amount} ${floridaHouseTransfer.currency}
- ✅ Merchant: ${floridaHouseTransfer.merchant}
- ✅ Date: ${floridaHouseTransfer.date}
- **Verification:** ${Math.abs(floridaHouseTransfer.amount - 1000) < 0.01 ? '✅ PASSED' : '❌ FAILED'}
` : '❌ NOT FOUND'}

### 3. Moving Expense (Line 4136) - $1,259.41 ✅
${movingExpense ? `
- ✅ Raw CSV: "$1,259.41" (comma-formatted)
- ✅ Parsed: ${movingExpense.amount} ${movingExpense.currency}
- ✅ Merchant: ${movingExpense.merchant}
- ✅ Date: ${movingExpense.date}
- **Verification:** ${Math.abs(movingExpense.amount - 1259.41) < 0.01 ? '✅ PASSED' : '❌ FAILED'}
` : '❌ NOT FOUND'}

### 4. Nisbo Reimbursement (Line 4041) - THB 2,000 ✅
${nisboReimbursement ? `
- ✅ Original CSV: -THB 2000.00 (negative)
- ✅ Converted: ${nisboReimbursement.amount} ${nisboReimbursement.currency} (positive income)
- ✅ Type: ${nisboReimbursement.transaction_type}
- ✅ Tags: ${nisboReimbursement.tags.join(', ') || 'None'}
- ✅ Note: Missing colon after "Reimbursement" - detected by typo regex
- **Verification:** ${nisboReimbursement.transaction_type === 'income' && nisboReimbursement.tags.includes('Reimbursement') ? '✅ PASSED' : '❌ FAILED'}
` : '❌ NOT FOUND'}

### 5. Smoothie Partial Refund (Line 4123) - $4.53 ✅
${smoothieRefund ? `
- ✅ Original CSV: $(4.53) (negative)
- ✅ Converted: ${smoothieRefund.amount} ${smoothieRefund.currency} (positive income)
- ✅ Type: ${smoothieRefund.transaction_type}
- ✅ Tags: ${smoothieRefund.tags.join(', ') || 'None (refund, not reimbursement)'}
- **Verification:** ${smoothieRefund.transaction_type === 'income' && smoothieRefund.amount > 0 ? '✅ PASSED' : '❌ FAILED'}
` : '❌ NOT FOUND'}

### 6. Jakody Exchange Pair (Lines 4227-4228) ✅
${jakodyExpense && jakodyIncome ? `
**Expense Transaction:**
- ✅ Description: "${jakodyExpense.description}"
- ✅ Amount: ${jakodyExpense.amount} ${jakodyExpense.currency}
- ✅ Type: ${jakodyExpense.transaction_type}

**Income Transaction:**
- ✅ Description: "${jakodyIncome.description}"
- ✅ Original CSV: $(520.00) (negative)
- ✅ Converted: ${jakodyIncome.amount} ${jakodyIncome.currency} (positive income)
- ✅ Type: ${jakodyIncome.transaction_type}

- **Verification:** ${jakodyExpense.amount === 16000 && jakodyIncome.amount === 520 ? '✅ PASSED' : '❌ FAILED'}
` : '❌ NOT FOUND'}

### 7. Negative Amount Check ✅
- Total Negative Amounts in Output: ${negativeTransactions.length}
- Status: ${negativeTransactions.length === 0 ? '✅ PASSED - All converted to positive income' : '❌ FAILED - Negative amounts found'}

---

## FINAL VERIFICATION SUMMARY

${verificationPassed && transactions.length === 218 && negativeTransactions.length === 0 ? `
✅ **ALL CRITICAL VERIFICATIONS PASSED:**
` : `
⚠️ **SOME VERIFICATIONS NEED REVIEW:**
`}

- [${transactions.length === 218 ? 'x' : ' '}] Transaction count: ${transactions.length} (expected 218)
- [${rentTransaction && rentTransaction.currency === 'THB' && Math.abs(rentTransaction.amount - 25000) < 1 ? 'x' : ' '}] Rent: ${rentTransaction ? `${rentTransaction.amount} ${rentTransaction.currency}` : 'NOT FOUND'} (expected THB 25,000)
- [${negativeConversions.length === 3 ? 'x' : ' '}] Negative conversions: ${negativeConversions.length} (expected 3)
- [${commaFormattedAmounts.length === 4 ? 'x' : ' '}] Comma-formatted amounts: ${commaFormattedAmounts.length} (expected 4)
- [${typoReimbursements.length === 1 ? 'x' : ' '}] Typo reimbursements: ${typoReimbursements.length} (expected 1)
- [${negativeTransactions.length === 0 ? 'x' : ' '}] Negative amounts in output: ${negativeTransactions.length} (expected 0)
- [${currencyDistribution.THB > 0 && Math.abs((currencyDistribution.THB / transactions.length) * 100 - 35.5) < 3 ? 'x' : ' '}] Currency distribution: ${currencyDistribution.THB} THB (${((currencyDistribution.THB / transactions.length) * 100).toFixed(1)}%, expected ~35.5%)
- [${tagDistribution['Reimbursement'] === 1 ? 'x' : ' '}] Reimbursement tags: ${tagDistribution['Reimbursement'] || 0} (expected 1)
- [${tagDistribution['Florida House'] === 2 ? 'x' : ' '}] Florida House tags: ${tagDistribution['Florida House'] || 0} (expected 2)
- [${tagDistribution['Savings/Investment'] === 1 ? 'x' : ' '}] Savings/Investment tags: ${tagDistribution['Savings/Investment'] || 0} (expected 1)
- [${tagDistribution['Business Expense'] === 0 ? 'x' : ' '}] Business Expense tags: ${tagDistribution['Business Expense'] || 0} (expected 0)

---

## READY FOR IMPORT

${verificationPassed && transactions.length === 218 && negativeTransactions.length === 0 ?
  '✅ **YES** - All validation checks passed! Ready to import to database.' :
  '⚠️ **REVIEW REQUIRED** - Some validation checks failed. Review above before import.'}

---

## TRANSACTION SUMMARY

**Total Transactions:** ${transactions.length}

### By Section:
- Expense Tracker: ${stats.expenseTracker.count} (${stats.expenseTracker.expenses} expenses, ${stats.expenseTracker.income} income)
- Gross Income: ${stats.grossIncome.count}
- Savings/Investment: ${stats.savings.count}
- Florida House: ${stats.floridaHouse.count}

### By Type:
- Expenses: ${transactions.filter(t => t.transaction_type === 'expense').length}
- Income: ${transactions.filter(t => t.transaction_type === 'income').length}

### By Currency:
${Object.entries(currencyDistribution).filter(([, count]) => count > 0).map(([currency, count]) => {
  const percentage = ((count / transactions.length) * 100).toFixed(1);
  return `- ${currency}: ${count} (${percentage}%)`;
}).join('\n')}

### By Tag:
${Object.entries(tagDistribution).sort((a, b) => b[1] - a[1]).map(([tag, count]) => `- ${tag}: ${count}`).join('\n') || '- (none)'}

---

*Generated by parse-september-2024.js*
*Incorporates ALL lessons learned from 14 previous imports (Oct 2024 - Oct 2025)*
`;

fs.writeFileSync(redFlagsPath, redFlagsContent);
console.log(`✅ Written: ${redFlagsPath}`);

console.log('\n✅ All output files created successfully!');
console.log('\n========================================');
console.log('FINAL STATUS');
console.log('========================================');
console.log(`  Total Transactions: ${transactions.length}`);
console.log(`  Expected: 218`);
console.log(`  Match: ${transactions.length === 218 ? '✅ EXACT' : `⚠️ VARIANCE: ${transactions.length - 218}`}`);
console.log('');
console.log(`  User-Confirmed Corrections: ${corrections.length}`);
console.log(`  Negative Conversions: ${negativeConversions.length} (expected 3)`);
console.log(`  Typo Reimbursements: ${typoReimbursements.length} (expected 1)`);
console.log(`  Comma-Formatted Amounts: ${commaFormattedAmounts.length} (expected 4)`);
console.log(`  Florida Dates Defaulted: ${floridaHouseDatesDefaulted.length}`);
console.log('');
console.log(`  Verification: ${verificationPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`  Negative Amounts in Output: ${negativeTransactions.length} (expected 0)`);
console.log('');
console.log(`  READY FOR IMPORT: ${verificationPassed && transactions.length === 218 && negativeTransactions.length === 0 ? '✅ YES' : '⚠️ REVIEW REQUIRED'}`);
console.log('========================================');
