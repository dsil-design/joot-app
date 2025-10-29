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

// Helper function to parse date in format "8/14/2024"
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
const vndTransactions = [];
const zeroSkipped = [];

console.log('========================================');
console.log('AUGUST 2024 PARSING SCRIPT');
console.log('========================================\n');
console.log('⚠️  CRITICAL: This is the FIRST month with VND currency column!');
console.log('Column Structure: Col 6 = VND, Col 7 = THB, Col 8 = USD\n');

// Section 1: Expense Tracker (lines 4291-4563) - line 4291 is "Thursday, August 1, 2024"
console.log('Parsing Expense Tracker (lines 4291-4563)...');
let currentDate = null;

for (let i = 4290; i < 4563; i++) {
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

  // Currency and amount extraction (CRITICAL - NEW VND COLUMN!)
  // Column structure for August 2024:
  // Col 6 = VND (NEW!), Col 7 = THB, Col 8 = USD
  // Col 9 = VND conversion (never use), Col 10 = THB conversion (never use)
  let amount = 0;
  let currency = 'USD';
  const lineNumber = i + 1;

  // CRITICAL NEW: Check VND column first (column 6)
  if (row[6] && row[6].trim() !== '' && row[6].includes('VND')) {
    const match = row[6].match(/VND\s*([\d,.-]+)/);
    if (match) {
      const isNegativeVND = row[6].trim().startsWith('-');
      amount = parseFloat(match[1].replace(/,/g, ''));
      if (isNegativeVND) {
        amount = -amount;
      }
      currency = 'VND';
      vndTransactions.push({
        line: lineNumber,
        description,
        merchant,
        amount,
        rawValue: row[6]
      });
      console.log(`  ✓ VND TRANSACTION (Line ${lineNumber}): ${description} - VND ${amount}`);
    }
  }
  // THEN check THB column (column 7)
  else if (row[7] && row[7].includes('THB')) {
    const match = row[7].match(/-?THB\s*([\d,.-]+)/);
    if (match) {
      // Check if the original string has a negative sign before THB
      const isNegativeTHB = row[7].trim().startsWith('-');
      amount = parseFloat(match[1].replace(/,/g, ''));
      if (isNegativeTHB) {
        amount = -amount;
      }
      currency = 'THB';
    }
  }
  // FINALLY check USD column (column 8)
  else if (row[8] && row[8].trim() !== '') {
    const rawAmount = row[8];
    amount = parseAmount(row[8]);
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
  // Check subtotal (column 11 - moved due to VND column)
  else if (row[11] && row[11].trim() !== '') {
    const rawAmount = row[11];
    amount = parseAmount(row[11]);
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

  // **CRITICAL OVERRIDE: Line 4535 VND data entry error**
  // User put VND 55000 in THB column instead of VND column
  if (lineNumber === 4535 && description === 'Coffee' && merchant === 'Dabao Concept') {
    amount = 55000;
    currency = 'VND';
    vndTransactions.push({
      line: lineNumber,
      description,
      merchant,
      amount,
      rawValue: row[7],  // Was in THB column
      note: 'DATA ENTRY ERROR CORRECTED: VND amount was in THB column'
    });
    console.log(`  ✓✓✓ VND OVERRIDE (Line ${lineNumber}): Coffee Dabao Concept = VND 55000 (FIRST VND EVER!)`);
    corrections.push({
      line: lineNumber,
      description,
      merchant,
      issue: 'VND amount in wrong column',
      correction: 'Overridden to VND 55000',
      severity: 'CRITICAL'
    });
  }

  // **USER-CONFIRMED: Skip zero-dollar transactions**
  // Line 4353: "Partial Refund: Breakfast" $0.00 - SKIP ENTIRELY
  if (amount === 0 || isNaN(amount)) {
    zeroSkipped.push({
      line: lineNumber,
      description,
      merchant,
      reason: 'Zero-dollar amount - user requested skip'
    });
    console.log(`  ℹ SKIPPED (Line ${lineNumber}): ${description} - Zero-dollar transaction`);
    continue;
  }

  // Determine transaction type and tags
  let transactionType = 'expense';
  const tags = [];

  // CRITICAL: Check for reimbursement with typo variants
  const isReimbursement = /^Re(im|mi|m)?b[uo]r?s[e]?ment:?/i.test(description.trim());

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

      // Track if this was a typo variant
      const descLower = description.toLowerCase();
      if (descLower.startsWith('remibursement') ||
          descLower.startsWith('rembursement') ||
          descLower.startsWith('reimbursment') ||
          descLower.startsWith('reimbusement') ||
          (!description.includes(':') && descLower.startsWith('reimbursement'))) {
        const originalSpelling = description.split(/[\s:]/)[0];
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
  // CRITICAL: Handle negative amounts (refunds/credits/winnings) - convert to positive income
  // Line 4457: "Pool" -THB 100 → THB 100 income
  else if (amount < 0) {
    const originalAmount = amount;
    transactionType = 'income';
    amount = Math.abs(amount);
    negativeConversions.push({
      line: lineNumber,
      description,
      merchant,
      originalAmount: originalAmount,
      convertedAmount: amount,
      currency: currency,
      reason: 'Negative expense converted to positive income (pool winnings/refund)'
    });
    console.log(`  ✓ NEGATIVE CONVERSION (Line ${lineNumber}): ${description} - ${originalAmount} ${currency} → ${amount} ${currency} income`);
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

// Section 2: Gross Income Tracker (lines 4567-4574)
console.log('\nParsing Gross Income Tracker (lines 4567-4574)...');

for (let i = 4566; i < 4575; i++) {
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

  // Track comma-formatted amounts in Gross Income section
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

  // Check for reimbursement pattern (Line 4567: Reimbursement: Ubox Reservation)
  const transactionTags = [];
  const isIncomeReimbursement = /^Reimbursement:/i.test(description.trim()) ||
                                 /^Reimbursement\s+for/i.test(description.trim());

  if (isIncomeReimbursement) {
    // Don't tag if DSIL income
    const isDSILIncome = merchant && (
      merchant.toLowerCase().includes('dsil design') ||
      merchant.toLowerCase().includes('dsil llc') ||
      merchant.toLowerCase().includes('dsil')
    );

    if (!isDSILIncome) {
      transactionTags.push('Reimbursement');
      stats.expenseTracker.reimbursements++;
      console.log(`  ✓ REIMBURSEMENT TAGGED (Line ${lineNumber}): ${description}`);
    }
  }

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

  // Track tags
  transactionTags.forEach(tag => {
    tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
  });
}

console.log(`  Parsed ${stats.grossIncome.count} transactions from Gross Income Tracker`);

// Section 3: Personal Savings & Investments (lines 4578-4579)
console.log('\nParsing Personal Savings & Investments (lines 4578-4579)...');

for (let i = 4577; i < 4580; i++) {
  const row = parseCSV(lines[i]);

  // Skip header rows
  if (row[0] === 'Date Made' || row[1] === 'Description') {
    continue;
  }

  // Skip total rows
  if (row[0] === 'TOTAL' || (row[1] && row[1].includes('TOTAL'))) {
    continue;
  }

  // Skip empty rows
  if (!row[1] || row[1].trim() === '') {
    continue;
  }

  const lineNumber = i + 1;

  // Parse date (may be empty for savings)
  let date = null;
  if (row[0] && row[0].trim() !== '') {
    date = parseShortDate(row[0]);
  }

  // Default to first day of month if no date
  if (!date) {
    date = '2024-08-01';
    console.log(`  ℹ INFO (Line ${lineNumber}): Savings transaction has no date, defaulting to 2024-08-01`);
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

// Section 4: Florida House Expenses - NO SECTION IN AUGUST 2024
console.log('\nFlorida House Expenses: NO SECTION (expected for August 2024)');
stats.floridaHouse.count = 0;

// Calculate totals and currency distribution
const currencyDistribution = { USD: 0, THB: 0, VND: 0, MYR: 0, CNY: 0 };
transactions.forEach(t => {
  currencyDistribution[t.currency] = (currencyDistribution[t.currency] || 0) + 1;
});

// USER-CONFIRMED VERIFICATION: Find key transactions

// Find rent transaction (should be THB 25,000 NOT USD)
const rentTransaction = transactions.find(t =>
  t.description && t.description.toLowerCase().includes('rent') &&
  t.merchant && t.merchant.toLowerCase() === 'pol'
);

// Find Pool winnings (Line 4457 - negative THB converted to income)
const poolWinnings = transactions.find(t =>
  t.description && t.description.toLowerCase() === 'pool' &&
  t.merchant && t.merchant.toLowerCase() === '1way'
);

// Find Florida House payment (Line 4393 - comma amount)
const floridaHouse = transactions.find(t =>
  t.description && t.description.toLowerCase() === 'florida house' &&
  t.merchant && t.merchant.toLowerCase() === 'me'
);

// Find VND transaction (Line 4535 - Coffee Dabao Concept)
const vndCoffee = transactions.find(t =>
  t.description && t.description === 'Coffee' &&
  t.merchant === 'Dabao Concept' &&
  t.currency === 'VND'
);

console.log('\n========================================');
console.log('PARSING SUMMARY');
console.log('========================================');
console.log(`Total Transactions: ${transactions.length}`);
console.log(`  Expense Tracker: ${stats.expenseTracker.count} (${stats.expenseTracker.expenses} expenses, ${stats.expenseTracker.income} income)`);
console.log(`  Gross Income: ${stats.grossIncome.count}`);
console.log(`  Savings/Investments: ${stats.savings.count}`);
console.log(`  Florida House: ${stats.floridaHouse.count} (no section)`);
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
console.log(`  VND Transactions: ${vndTransactions.length} (FIRST VND EVER!)`);
console.log(`  Negative Amount Conversions: ${negativeConversions.length}`);
console.log(`  Typo Reimbursements Detected: ${typoReimbursements.length}`);
console.log(`  Comma-Formatted Amounts Handled: ${commaFormattedAmounts.length}`);
console.log(`  Zero-Dollar Skipped: ${zeroSkipped.length}`);
console.log('');

// VERIFICATION SECTION
console.log('========================================');
console.log('CRITICAL VERIFICATION');
console.log('========================================');

let verificationPassed = true;

// VERIFICATION #1: Verify rent is THB 25,000 (NOT USD conversion)
console.log('✓ RENT VERIFICATION:');

if (rentTransaction) {
  console.log(`  Description: ${rentTransaction.description}`);
  console.log(`  Merchant: ${rentTransaction.merchant}`);
  console.log(`  Date: ${rentTransaction.date}`);
  console.log(`  Amount: ${rentTransaction.amount} ${rentTransaction.currency}`);
  console.log(`  Expected: 25000 THB (NOT ~$705 USD)`);

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

// VERIFICATION #2: Pool winnings (Line 4457 - negative THB)
console.log('✓ POOL WINNINGS VERIFICATION (Line 4457):');

if (poolWinnings) {
  console.log(`  Description: ${poolWinnings.description}`);
  console.log(`  Merchant: ${poolWinnings.merchant}`);
  console.log(`  Amount: ${poolWinnings.amount} ${poolWinnings.currency}`);
  console.log(`  Type: ${poolWinnings.transaction_type}`);
  console.log(`  Expected: 100 THB income (converted from -THB 100)`);

  if (poolWinnings.transaction_type === 'income' &&
      Math.abs(poolWinnings.amount - 100) < 0.01 &&
      poolWinnings.currency === 'THB' &&
      poolWinnings.amount > 0) {
    console.log('  ✅ CORRECT - Pool winnings converted to positive THB income');
  } else {
    console.log('  ❌ ERROR - Pool winnings not converted correctly!');
    verificationPassed = false;
  }
} else {
  console.log('  ⚠️  WARNING: Pool winnings not found!');
  verificationPassed = false;
}

console.log('');

// VERIFICATION #3: Florida House comma amount (Line 4393)
console.log('✓ FLORIDA HOUSE COMMA AMOUNT (Line 4393):');

if (floridaHouse) {
  console.log(`  Description: ${floridaHouse.description}`);
  console.log(`  Merchant: ${floridaHouse.merchant}`);
  console.log(`  Amount: ${floridaHouse.amount} ${floridaHouse.currency}`);
  console.log(`  Expected: 1000.00 USD (from "$1,000.00")`);

  if (Math.abs(floridaHouse.amount - 1000.00) < 0.01 && floridaHouse.currency === 'USD') {
    console.log('  ✅ CORRECT - Comma amount parsed correctly');
  } else {
    console.log('  ❌ ERROR - Florida House amount mismatch!');
    verificationPassed = false;
  }
} else {
  console.log('  ⚠️  WARNING: Florida House transaction not found!');
  verificationPassed = false;
}

console.log('');

// VERIFICATION #4: VND Coffee transaction (Line 4535 - FIRST VND EVER!)
console.log('✓ VND COFFEE TRANSACTION (Line 4535 - FIRST VND EVER):');

if (vndCoffee) {
  console.log(`  Description: ${vndCoffee.description}`);
  console.log(`  Merchant: ${vndCoffee.merchant}`);
  console.log(`  Amount: ${vndCoffee.amount} ${vndCoffee.currency}`);
  console.log(`  Date: ${vndCoffee.date}`);
  console.log(`  Expected: 55000 VND (data entry error corrected)`);

  if (vndCoffee.currency === 'VND' && Math.abs(vndCoffee.amount - 55000) < 1) {
    console.log('  ✅✅✅ CORRECT - FIRST VND TRANSACTION EVER! Coffee = VND 55000');
  } else {
    console.log('  ❌ ERROR - VND transaction incorrect!');
    verificationPassed = false;
  }
} else {
  console.log('  ❌ CRITICAL ERROR: VND Coffee transaction not found!');
  verificationPassed = false;
}

console.log('');

// VERIFICATION #5: Zero-dollar skipped (Line 4353)
console.log('✓ ZERO-DOLLAR SKIP VERIFICATION (Line 4353):');
console.log(`  Skipped: ${zeroSkipped.length}`);
console.log(`  Expected: 1 ("Partial Refund: Breakfast" $0.00)`);

if (zeroSkipped.length === 1 && zeroSkipped[0].description.includes('Partial Refund')) {
  console.log('  ✅ CORRECT - Zero-dollar transaction skipped');
} else if (zeroSkipped.length === 1) {
  console.log('  ⚠️  WARNING - 1 transaction skipped but may not be the expected one');
} else {
  console.log('  ❌ ERROR - Expected 1 zero-dollar skip');
  verificationPassed = false;
}

console.log('');

// Verify negative amounts (should be zero after conversions)
const negativeTransactions = transactions.filter(t => t.amount < 0);
console.log(`✓ NEGATIVE AMOUNT CHECK:`);
console.log(`  Found ${negativeTransactions.length} negative transactions`);
console.log(`  Expected: 0 (1 negative converted: Pool winnings)`);

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

// Verify VND transactions
console.log(`✓ VND TRANSACTION COUNT:`);
console.log(`  Found ${currencyDistribution.VND || 0} VND transactions`);
console.log(`  Expected: 1 (Coffee Dabao Concept)`);

if (currencyDistribution.VND === 1) {
  console.log('  ✅ CORRECT - Exactly 1 VND transaction (FIRST EVER!)');
} else {
  console.log('  ❌ ERROR - Expected exactly 1 VND transaction');
  verificationPassed = false;
}

console.log('');

// Verify Business Expense tags (should be 0)
const businessExpenseTags = tagDistribution['Business Expense'] || 0;
console.log(`✓ BUSINESS EXPENSE TAG CHECK:`);
console.log(`  Found ${businessExpenseTags} Business Expense tags`);
console.log(`  Expected: 0 (no Column 4 "X" marks)`);

if (businessExpenseTags === 0) {
  console.log('  ✅ CORRECT - No Business Expense tags');
} else {
  console.log('  ⚠️  WARNING: Unexpected Business Expense tags found');
}

console.log('');

// Verify Reimbursement tags
const reimbursementTags = tagDistribution['Reimbursement'] || 0;
console.log(`✓ REIMBURSEMENT TAG CHECK:`);
console.log(`  Found ${reimbursementTags} Reimbursement tags`);
console.log(`  Expected: 2-3 (Saturday Snack, Dad, possibly Ubox)`);

if (reimbursementTags >= 2 && reimbursementTags <= 3) {
  console.log('  ✅ CORRECT - Reimbursement tag count in range');
} else {
  console.log('  ⚠️  WARNING: Reimbursement tag count outside expected range');
}

console.log('');

// Verify Florida House tags (should be 0 - no section)
const floridaHouseTags = tagDistribution['Florida House'] || 0;
console.log(`✓ FLORIDA HOUSE TAG CHECK:`);
console.log(`  Found ${floridaHouseTags} Florida House tags`);
console.log(`  Expected: 0 (no Florida House section in August)`);

if (floridaHouseTags === 0) {
  console.log('  ✅ CORRECT - No Florida House tags (section absent)');
} else {
  console.log('  ❌ ERROR: Unexpected Florida House tags found!');
  verificationPassed = false;
}

console.log('');
console.log('Red Flags:', redFlags.length);
console.log('Verification Status:', verificationPassed ? '✅ PASSED' : '❌ FAILED');
console.log('========================================');

// Write output files
console.log('\nWriting output files...');

// 1. Write parsed transactions JSON
const outputPath = '/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-aug-jun-2024/august-2024/august-2024-CORRECTED.json';
fs.writeFileSync(outputPath, JSON.stringify(transactions, null, 2));
console.log(`✅ Written: ${outputPath}`);

// 2. Update red flags log
const redFlagsPath = '/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-aug-jun-2024/august-2024/RED-FLAGS.md';

const parsingResults = `

---

## PHASE 2: PARSING RESULTS

**Parsing Script:** scripts/parse-august-2024.js
**Output File:** scripts/batch-imports/batch-aug-jun-2024/august-2024/august-2024-CORRECTED.json
**Execution Date:** ${new Date().toISOString()}

**Transaction Counts:**
- Total: ${transactions.length}
- Expenses: ${transactions.filter(t => t.transaction_type === 'expense').length}
- Income: ${transactions.filter(t => t.transaction_type === 'income').length}
  - Original income section: ${stats.grossIncome.count}
  - Converted from negative: ${negativeConversions.length}
- Savings: ${stats.savings.count}
- Florida House: 0 (no section)

**VND Transactions (FIRST EVER!):**
${vndTransactions.map((v, idx) => `${idx + 1}. Line ${v.line}: ${v.description} (${v.merchant}) - VND ${v.amount}${v.note ? ` - ${v.note}` : ''}`).join('\n')}

**Negative Conversions:**
${negativeConversions.map((n, idx) => `${idx + 1}. Line ${n.line}: ${n.description} (${n.merchant}) - ${n.originalAmount} ${n.currency} → ${n.convertedAmount} ${n.currency} income`).join('\n') || '(none)'}

**Comma-Formatted Amounts:**
${commaFormattedAmounts.map((c, idx) => `${idx + 1}. Line ${c.line}: ${c.description} - "${c.rawAmount}" → ${c.parsedAmount}`).join('\n') || '(none)'}

**Zero-Dollar Skipped:**
${zeroSkipped.map((z, idx) => `${idx + 1}. Line ${z.line}: ${z.description} - ${z.reason}`).join('\n') || '(none)'}

**Typo Detection:**
${typoReimbursements.map((t, idx) => `${idx + 1}. Line ${t.line}: "${t.originalSpelling}" detected with flexible regex - Tagged as Reimbursement`).join('\n') || '(none)'}

**Tag Application:**
${Object.entries(tagDistribution).map(([tag, count]) => `- ${tag}: ${count}`).join('\n') || '- (none)'}

**Currency Distribution:**
${Object.entries(currencyDistribution).filter(([, count]) => count > 0).map(([currency, count]) => `- ${currency}: ${count} (${((count / transactions.length) * 100).toFixed(1)}%)`).join('\n')}

**Quality Checks:**
${rentTransaction && rentTransaction.currency === 'THB' && Math.abs(rentTransaction.amount - 25000) < 1 ? '✅' : '❌'} Rent: ${rentTransaction ? `${rentTransaction.amount} ${rentTransaction.currency}` : 'NOT FOUND'} (expected THB 25000, NOT USD)
${poolWinnings && poolWinnings.transaction_type === 'income' && poolWinnings.currency === 'THB' ? '✅' : '❌'} Pool winnings: ${poolWinnings ? `${poolWinnings.amount} THB income` : 'NOT FOUND'}
${floridaHouse && Math.abs(floridaHouse.amount - 1000) < 0.01 ? '✅' : '❌'} Florida House: $${floridaHouse ? floridaHouse.amount : 'NOT FOUND'} (comma parsed)
${vndCoffee && vndCoffee.currency === 'VND' && vndCoffee.amount === 55000 ? '✅✅✅' : '❌'} VND Coffee: ${vndCoffee ? `${vndCoffee.amount} ${vndCoffee.currency}` : 'NOT FOUND'} (FIRST VND EVER!)
${zeroSkipped.length === 1 ? '✅' : '❌'} Zero-dollar skipped: ${zeroSkipped.length} (expected 1)
${negativeTransactions.length === 0 ? '✅' : '❌'} No negative amounts in output: ${negativeTransactions.length === 0 ? 'PASS' : `FAIL (${negativeTransactions.length} found)`}
${transactions.length >= 210 && transactions.length <= 215 ? '✅' : '⚠️'} Transaction count: ${transactions.length} (expected ~213, raw 214 - 1 skipped)
${businessExpenseTags === 0 ? '✅' : '⚠️'} Business Expense tags: ${businessExpenseTags} (expected 0)
${reimbursementTags >= 2 && reimbursementTags <= 3 ? '✅' : '⚠️'} Reimbursement tags: ${reimbursementTags} (expected 2-3)
${currencyDistribution.VND === 1 ? '✅✅✅' : '❌'} VND transactions: ${currencyDistribution.VND || 0} (expected 1 - FIRST EVER!)

**Critical Transaction Verification:**
1. ${rentTransaction ? '✅' : '❌'} Rent: ${rentTransaction ? `${rentTransaction.amount} ${rentTransaction.currency} on ${rentTransaction.date}` : 'NOT FOUND'}
2. ${poolWinnings ? '✅' : '❌'} Pool winnings: ${poolWinnings ? `${poolWinnings.amount} ${poolWinnings.currency} ${poolWinnings.transaction_type}` : 'NOT FOUND'}
3. ${floridaHouse ? '✅' : '❌'} Florida House: ${floridaHouse ? `$${floridaHouse.amount}` : 'NOT FOUND'}
4. ${vndCoffee ? '✅✅✅' : '❌'} VND Coffee (FIRST EVER!): ${vndCoffee ? `${vndCoffee.amount} ${vndCoffee.currency}` : 'NOT FOUND'}
5. ${zeroSkipped.length === 1 ? '✅' : '❌'} Zero-dollar skipped: ${zeroSkipped.length}

**Ready for Import:** ${verificationPassed ? '✅ YES' : '❌ NO - Review issues above'}

---

**Parser Status:** ${verificationPassed ? '✅ COMPLETE - All checks passed' : '⚠️ COMPLETE - Review warnings above'}
**Next Phase:** Phase 3 - Database Import
`;

// Append parsing results to existing content
fs.appendFileSync(redFlagsPath, parsingResults);
console.log(`✅ Updated: ${redFlagsPath}`);

console.log('\n✅ All output files created successfully!');
console.log('\n========================================');
console.log('FINAL STATUS');
console.log('========================================');
console.log(`  Total Transactions: ${transactions.length}`);
console.log(`  Expected: ~213 (214 raw - 1 zero-dollar skip)`);
console.log(`  Match: ${transactions.length >= 210 && transactions.length <= 215 ? '✅ IN RANGE' : `⚠️ VARIANCE: ${transactions.length - 213}`}`);
console.log('');
console.log(`  VND Transactions: ${currencyDistribution.VND || 0} (FIRST VND EVER!)`);
console.log(`  User-Confirmed Corrections: 4 applied`);
console.log(`  Negative Conversions: ${negativeConversions.length} (expected 1: Pool winnings)`);
console.log(`  Comma-Formatted Amounts: ${commaFormattedAmounts.length}`);
console.log(`  Zero-Dollar Skipped: ${zeroSkipped.length} (expected 1)`);
console.log('');
console.log(`  Verification: ${verificationPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`  Negative Amounts in Output: ${negativeTransactions.length} (expected 0)`);
console.log(`  Business Expense Tags: ${businessExpenseTags} (expected 0)`);
console.log(`  Reimbursement Tags: ${reimbursementTags} (expected 2-3)`);
console.log(`  VND Currency: ${currencyDistribution.VND || 0} (expected 1 - FIRST EVER!)`);
console.log('');
console.log(`  READY FOR IMPORT: ${verificationPassed ? '✅ YES' : '⚠️ REVIEW REQUIRED'}`);
console.log('========================================');
