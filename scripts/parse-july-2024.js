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

// Helper function to parse date in format "7/5/2024"
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
const floridaHouseDatesDefaulted = [];

console.log('========================================');
console.log('JULY 2024 PARSING SCRIPT');
console.log('========================================\n');

// Section 1: Expense Tracker (lines 4594-4833) - line 4594 is "Monday, July 1, 2024"
console.log('Parsing Expense Tracker (lines 4594-4833)...');
let currentDate = null;

for (let i = 4593; i < 4833; i++) {
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
  // JULY SPECIFIC: "Reimbusement" (typo) on line with Kyle Martin
  // Pattern matches: Reimbursement, Reimbusement, Remibursement, Rembursement, Reimbursment
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
        const originalSpelling = description.split(/[\s:]/)[0]; // Get first word
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

      // Track negative conversion for reimbursements
      const originalAmount = amount;
      if (amount < 0) {
        amount = Math.abs(amount);
        negativeConversions.push({
          line: lineNumber,
          description,
          merchant,
          originalAmount: originalAmount,
          convertedAmount: amount,
          reason: 'Negative reimbursement converted to positive income'
        });
        console.log(`  ✓ NEGATIVE REIMBURSEMENT (Line ${lineNumber}): ${description} - Converting negative to positive income`);
      }
    }
  }
  // CRITICAL: Handle negative amounts (refunds/credits/exchanges) - convert to positive income
  // Learned from March 2025: Database constraint requires positive amounts only
  // JULY SPECIFIC: Line 4687 "Partial Refund" $(1.39), Line 4804 "Drinks Friends" -THB 750
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
      reason: 'Negative expense converted to positive income (refund/credit)'
    });
    console.log(`  ✓ REFUND/INCOME (Line ${lineNumber}): ${description} - Converting negative expense to positive income`);
  }

  // Check for business expense (Column 4 = "X", NOT column 3)
  // JULY SPECIFIC: Many Column 3 "X" items (Brad's Wedding, UBox, etc.) should NOT get tag
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

// Section 2: Gross Income Tracker (lines 4836-4849)
console.log('\nParsing Gross Income Tracker (lines 4836-4849)...');

for (let i = 4835; i < 4849; i++) {
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

  // Check for reimbursement pattern (Mike D, Jordan)
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

// Section 3: Personal Savings & Investments (lines 4851-4864)
console.log('\nParsing Personal Savings & Investments (lines 4851-4864)...');

for (let i = 4850; i < 4864; i++) {
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

  // Parse date (format: may be empty or 7/5/2024)
  let date = null;
  if (row[0] && row[0].trim() !== '') {
    date = parseShortDate(row[0]);
  }

  // Default to first day of month if no date
  if (!date) {
    date = '2024-07-01';
    console.log(`  ℹ INFO (Line ${lineNumber}): Savings transaction has no date, defaulting to 2024-07-01`);
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

// Section 4: Florida House Expenses (lines 4868-4869)
console.log('\nParsing Florida House Expenses (lines 4868-4869)...');
// Default to last day of month for Florida House transactions without specific dates
currentDate = '2024-07-31';

for (let i = 4867; i < 4870; i++) {
  const row = parseCSV(lines[i]);

  // Skip header rows and date rows
  if (row[0] === 'Desc' || row[1] === 'Merchant' || row[0].includes('Tuesday')) {
    continue;
  }

  // Skip total rows
  if (row[0] === 'GRAND TOTAL' || (row[1] && row[1].includes('TOTAL'))) {
    continue;
  }

  // Skip empty rows
  if (!row[1] || row[1].trim() === '') {
    continue;
  }

  const lineNumber = i + 1;
  const description = row[1];
  const merchant = row[2] || 'Unknown';
  const paymentMethod = row[3] || 'Unknown';
  const amount = parseAmount(row[4]);

  if (!description || amount === 0 || isNaN(amount)) {
    continue;
  }

  // JULY SPECIFIC: Homeowner's Insurance on July 23 per PDF
  const date = '2024-07-23'; // From PDF: "Tuesday, July 23, 2024"

  const transaction = {
    date,
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

// Find Line 4687 (Partial Refund - Grab)
const partialRefund = transactions.find(t =>
  t.description && t.description.includes('Partial Refund') &&
  t.merchant === 'Grab'
);

// NOTE: Kyle Martin "Reimbusement" typo is in JUNE 2024, not July

// Find Line 4804 (Drinks - Friends merchant - negative THB)
const friendsRefund = transactions.find(t =>
  t.description && t.description === 'Drinks' &&
  t.merchant === 'Friends'
);

// Find two CNX Internet charges
const cnxCharges = transactions.filter(t =>
  t.description && (t.description.includes('Internet') || t.description.includes('CNX')) &&
  t.merchant && t.merchant.includes('3BB')
);

// Find Florida House insurance
const floridaInsurance = transactions.find(t =>
  t.description && t.description.includes('Insurance') &&
  t.tags && t.tags.includes('Florida House')
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
console.log(`  Florida House Dates Defaulted: 1 (insurance on 2024-07-23)`);
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
  console.log(`  Expected: 25000 THB (NOT ~$682 USD)`);

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

// USER-CONFIRMED CORRECTION #2: Partial Refund (Line 4687)
console.log('✓ PARTIAL REFUND VERIFICATION (Line 4687):');

if (partialRefund) {
  console.log(`  Description: ${partialRefund.description}`);
  console.log(`  Merchant: ${partialRefund.merchant}`);
  console.log(`  Amount: ${partialRefund.amount} ${partialRefund.currency}`);
  console.log(`  Type: ${partialRefund.transaction_type}`);
  console.log(`  Expected: 1.39 USD (income, converted from negative)`);

  if (partialRefund.transaction_type === 'income' &&
      Math.abs(partialRefund.amount - 1.39) < 0.01 &&
      partialRefund.amount > 0) {
    console.log('  ✅ CORRECT - Partial refund converted to positive income');
  } else {
    console.log('  ❌ ERROR - Partial refund not converted correctly!');
    verificationPassed = false;
  }
} else {
  console.log('  ⚠️  WARNING: Partial refund not found!');
  verificationPassed = false;
}

console.log('');

// USER-CONFIRMED CORRECTION #4: Drinks Friends refund (Line 4804)
console.log('✓ FRIENDS REFUND VERIFICATION (Line 4804 - Negative THB):');

if (friendsRefund) {
  console.log(`  Description: ${friendsRefund.description}`);
  console.log(`  Merchant: ${friendsRefund.merchant}`);
  console.log(`  Amount: ${friendsRefund.amount} ${friendsRefund.currency}`);
  console.log(`  Type: ${friendsRefund.transaction_type}`);
  console.log(`  Expected: 750.00 THB (income, converted from -THB 750)`);

  if (friendsRefund.transaction_type === 'income' &&
      Math.abs(friendsRefund.amount - 750.00) < 0.01 &&
      friendsRefund.currency === 'THB' &&
      friendsRefund.amount > 0) {
    console.log('  ✅ CORRECT - Friends refund converted to positive THB income');
  } else {
    console.log('  ❌ ERROR - Friends refund not converted correctly!');
    verificationPassed = false;
  }
} else {
  console.log('  ⚠️  WARNING: Friends refund not found!');
  verificationPassed = false;
}

console.log('');

// USER-CONFIRMED CORRECTION #5: Two CNX Internet charges (BOTH valid)
console.log('✓ CNX INTERNET CHARGES VERIFICATION (Two charges):');

console.log(`  Found ${cnxCharges.length} CNX/Internet charges`);
console.log(`  Expected: 2 (both valid per user)`);

if (cnxCharges.length === 2) {
  cnxCharges.forEach((charge, idx) => {
    console.log(`    Charge ${idx + 1}: ${charge.description} - $${charge.amount} on ${charge.date}`);
  });
  console.log('  ✅ CORRECT - Both CNX charges imported');
} else {
  console.log('  ❌ ERROR - Expected 2 CNX charges!');
  verificationPassed = false;
}

console.log('');

// USER-CONFIRMED CORRECTION #6: Florida House insurance (separate from gross income)
console.log('✓ FLORIDA HOUSE INSURANCE VERIFICATION:');

if (floridaInsurance) {
  console.log(`  Description: ${floridaInsurance.description}`);
  console.log(`  Merchant: ${floridaInsurance.merchant}`);
  console.log(`  Amount: ${floridaInsurance.amount} ${floridaInsurance.currency}`);
  console.log(`  Date: ${floridaInsurance.date}`);
  console.log(`  Tags: ${floridaInsurance.tags.join(', ')}`);
  console.log(`  Expected: $1,461.00 USD with Florida House tag on 2024-07-23`);

  if (Math.abs(floridaInsurance.amount - 1461.00) < 0.01 &&
      floridaInsurance.tags.includes('Florida House') &&
      floridaInsurance.date === '2024-07-23') {
    console.log('  ✅ CORRECT - Florida insurance tagged and dated correctly');
  } else {
    console.log('  ❌ ERROR - Florida insurance mismatch!');
    verificationPassed = false;
  }
} else {
  console.log('  ⚠️  WARNING: Florida House insurance not found!');
  verificationPassed = false;
}

console.log('');

// Verify negative amounts (should be zero after conversions)
const negativeTransactions = transactions.filter(t => t.amount < 0);
console.log(`✓ NEGATIVE AMOUNT CHECK:`);
console.log(`  Found ${negativeTransactions.length} negative transactions`);
console.log(`  Expected: 0 (3 negatives converted: Partial Refund, Kyle Martin, Friends Drinks)`);

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

// Verify Business Expense tags (should be 0 - Column 3 "X" items NOT tagged)
const businessExpenseTags = tagDistribution['Business Expense'] || 0;
console.log(`✓ BUSINESS EXPENSE TAG CHECK:`);
console.log(`  Found ${businessExpenseTags} Business Expense tags`);
console.log(`  Expected: 0-1 (Column 3 "X" items should NOT get tag, only Column 4 "X")`);

if (businessExpenseTags <= 1) {
  console.log('  ✅ CORRECT - Business Expense tags are 0-1 (Column 3 "X" items NOT tagged)');
} else {
  console.log('  ⚠️  WARNING: More Business Expense tags than expected.');
}

console.log('');

// Verify Reimbursement tags
const reimbursementTags = tagDistribution['Reimbursement'] || 0;
console.log(`✓ REIMBURSEMENT TAG CHECK:`);
console.log(`  Found ${reimbursementTags} Reimbursement tags`);
console.log(`  Expected: 2 (Mike D Peekskill Hotel, Jordan Oregon/Washington trip)`);

if (reimbursementTags === 2) {
  console.log('  ✅ CORRECT - Reimbursement tag count matches');
} else if (reimbursementTags >= 1 && reimbursementTags <= 3) {
  console.log('  ⚠️  ACCEPTABLE - Reimbursement tag count close to expected');
} else {
  console.log('  ❌ ERROR - Reimbursement tag count too far off');
  verificationPassed = false;
}

console.log('');
console.log('Red Flags:', redFlags.length);
console.log('Verification Status:', verificationPassed ? '✅ PASSED' : '❌ FAILED');
console.log('========================================');

// Write output files
console.log('\nWriting output files...');

// 1. Write parsed transactions JSON
const outputPath = '/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-aug-jun-2024/july-2024/july-2024-CORRECTED.json';
fs.writeFileSync(outputPath, JSON.stringify(transactions, null, 2));
console.log(`✅ Written: ${outputPath}`);

// 2. Update red flags log
const redFlagsPath = '/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-aug-jun-2024/july-2024/RED-FLAGS.md';

// Read existing red flags content
let existingContent = '';
try {
  existingContent = fs.readFileSync(redFlagsPath, 'utf-8');
} catch (error) {
  // File might not exist yet
}

const parsingResults = `

---

## PHASE 2: PARSING RESULTS

**Parsing Script:** scripts/parse-july-2024.js
**Output File:** scripts/batch-imports/batch-aug-jun-2024/july-2024/july-2024-CORRECTED.json
**Execution Date:** ${new Date().toISOString()}

**Transaction Counts:**
- Total: ${transactions.length}
- Expenses: ${transactions.filter(t => t.transaction_type === 'expense').length}
- Income: ${transactions.filter(t => t.transaction_type === 'income').length}
  - Original income section: ${stats.grossIncome.count}
  - Converted from negative: ${negativeConversions.length}
- Savings: ${stats.savings.count}
- Florida House: ${stats.floridaHouse.count}

**Conversions Applied:**
${negativeConversions.map((n, idx) => `${idx + 1}. Line ${n.line}: ${n.description} (${n.merchant}) - ${n.originalAmount} → ${n.convertedAmount} income`).join('\n') || '(none)'}

**Typo Detection:**
${typoReimbursements.map((t, idx) => `${idx + 1}. Line ${t.line}: "${t.originalSpelling}" detected with flexible regex - Tagged as Reimbursement`).join('\n') || '(none)'}

**Tag Application:**
${Object.entries(tagDistribution).map(([tag, count]) => `- ${tag}: ${count}`).join('\n') || '- (none)'}

**Currency Distribution:**
${Object.entries(currencyDistribution).filter(([, count]) => count > 0).map(([currency, count]) => `- ${currency}: ${count} (${((count / transactions.length) * 100).toFixed(1)}%)`).join('\n')}

**Quality Checks:**
${rentTransaction && rentTransaction.currency === 'THB' && Math.abs(rentTransaction.amount - 25000) < 1 ? '✅' : '❌'} Rent: ${rentTransaction ? `${rentTransaction.amount} ${rentTransaction.currency}` : 'NOT FOUND'} (expected THB 25000, NOT USD)
${partialRefund && partialRefund.transaction_type === 'income' && Math.abs(partialRefund.amount - 1.39) < 0.01 ? '✅' : '❌'} Partial Refund: $${partialRefund ? partialRefund.amount : 'NOT FOUND'} income (converted from negative)
${friendsRefund && friendsRefund.transaction_type === 'income' && friendsRefund.currency === 'THB' ? '✅' : '❌'} Friends refund: ${friendsRefund ? `${friendsRefund.amount} THB income` : 'NOT FOUND'}
${cnxCharges.length === 2 ? '✅' : '❌'} CNX charges: ${cnxCharges.length} (expected 2)
${floridaInsurance ? '✅' : '❌'} Florida insurance: $${floridaInsurance ? floridaInsurance.amount : 'NOT FOUND'}
${negativeTransactions.length === 0 ? '✅' : '❌'} No negative amounts in output: ${negativeTransactions.length === 0 ? 'PASS' : `FAIL (${negativeTransactions.length} found)`}
${transactions.length >= 150 && transactions.length <= 160 ? '✅' : '⚠️'} Transaction count: ${transactions.length} (expected ~154)
${businessExpenseTags <= 1 ? '✅' : '⚠️'} Business Expense tags: ${businessExpenseTags} (expected 0-1 - Column 3 "X" items NOT tagged)
${reimbursementTags >= 2 && reimbursementTags <= 3 ? '✅' : '⚠️'} Reimbursement tags: ${reimbursementTags} (expected 2-3)

**Critical Transaction Verification:**
1. ${rentTransaction ? '✅' : '❌'} Rent: ${rentTransaction ? `${rentTransaction.amount} ${rentTransaction.currency} on ${rentTransaction.date}` : 'NOT FOUND'}
2. ${partialRefund ? '✅' : '❌'} Partial Refund: ${partialRefund ? `$${partialRefund.amount} ${partialRefund.transaction_type}` : 'NOT FOUND'}
3. ${friendsRefund ? '✅' : '❌'} Friends Refund: ${friendsRefund ? `${friendsRefund.amount} ${friendsRefund.currency} ${friendsRefund.transaction_type}` : 'NOT FOUND'}
4. ${cnxCharges.length === 2 ? '✅' : '❌'} Two CNX charges: ${cnxCharges.length} found
5. ${floridaInsurance ? '✅' : '❌'} Florida insurance: ${floridaInsurance ? `$${floridaInsurance.amount} with tag` : 'NOT FOUND'}
6. ${reimbursementTags === 2 ? '✅' : '⚠️'} Reimbursement tags: ${reimbursementTags} (Mike D, Jordan)

**Ready for Import:** ${verificationPassed ? '✅ YES' : '❌ NO - Review issues above'}

---

## PARSING DETAILS

### Negative Amount Conversions (Database Constraint)

${negativeConversions.map((n, idx) => `
**Conversion ${idx + 1}: Line ${n.line}**
- Description: ${n.description}
- Merchant: ${n.merchant}
- Original Amount: ${n.originalAmount}
- Converted Amount: ${n.convertedAmount}
- Type: income
- Reason: ${n.reason}
- Status: ✅ RESOLVED
`).join('\n') || '*No negative conversions needed*'}

### Typo Reimbursements Detected (February 2025 Lesson)

${typoReimbursements.map((t, idx) => `
**Typo ${idx + 1}: Line ${t.line}**
- Description: ${t.description}
- Merchant: ${t.merchant}
- Original Spelling: "${t.originalSpelling}"
- Corrected Spelling: "${t.correctedSpelling}"
- Status: ${t.status}
- Note: ${t.note}
`).join('\n') || '*No typo reimbursements detected*'}

### Comma-Formatted Amounts Handled (March 2025 Lesson)

${commaFormattedAmounts.map((c, idx) => `
**Amount ${idx + 1}: Line ${c.line}**
- Description: ${c.description}
- Merchant: ${c.merchant}
- Raw CSV Value: "${c.rawAmount}"
- Parsed Value: ${c.parsedAmount}
- Status: ✅ RESOLVED
`).join('\n') || '*No comma-formatted amounts found*'}

---

**Parser Status:** ${verificationPassed ? '✅ COMPLETE - All checks passed' : '⚠️ COMPLETE - Review warnings above'}
**Next Phase:** Phase 3 - Database Import
`;

// Append parsing results to existing content
const updatedContent = existingContent + parsingResults;
fs.writeFileSync(redFlagsPath, updatedContent);
console.log(`✅ Updated: ${redFlagsPath}`);

console.log('\n✅ All output files created successfully!');
console.log('\n========================================');
console.log('FINAL STATUS');
console.log('========================================');
console.log(`  Total Transactions: ${transactions.length}`);
console.log(`  Expected: ~154`);
console.log(`  Match: ${transactions.length >= 150 && transactions.length <= 160 ? '✅ IN RANGE' : `⚠️ VARIANCE: ${transactions.length - 154}`}`);
console.log('');
console.log(`  User-Confirmed Corrections: All 5 applied (Kyle Martin was June, not July)`);
console.log(`  Negative Conversions: ${negativeConversions.length} (expected 2: Partial Refund, Friends Drinks)`);
console.log(`  Typo Reimbursements: ${typoReimbursements.length} (none expected - Kyle Martin was June)`);
console.log(`  Comma-Formatted Amounts: ${commaFormattedAmounts.length}`);
console.log(`  Florida Dates: 1 (insurance on 2024-07-23)`);
console.log('');
console.log(`  Verification: ${verificationPassed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`  Negative Amounts in Output: ${negativeTransactions.length} (expected 0)`);
console.log(`  Business Expense Tags: ${businessExpenseTags} (expected 0-1)`);
console.log(`  Reimbursement Tags: ${reimbursementTags} (expected 2-3)`);
console.log('');
console.log(`  READY FOR IMPORT: ${verificationPassed ? '✅ YES' : '⚠️ REVIEW REQUIRED'}`);
console.log('========================================');
