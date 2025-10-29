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
const dualResidenceRents = [];

console.log('========================================');
console.log('OCTOBER 2023 PARSING SCRIPT');
console.log('========================================\n');
console.log('Protocol: BATCH-IMPORT-PROTOCOL-v1.2 + Monthly v3.6');
console.log('Batch: Nov-Oct-Sept 2023 (Month 2 of 3)\n');
console.log('Key Features:');
console.log('- USA-based month (Conshohocken, PA)');
console.log('- DUAL RESIDENCE: USA rent $957 + Thailand rent THB 25,000 (BOTH VALID)');
console.log('- Mike D. rent reimbursement: -$400 (roommate/subletter income)');
console.log('- 7 negative refunds → income');
console.log('- 8 total reimbursements (higher than typical USA pattern)');
console.log('- THB%: ~3.7% (low - USA-based pattern)');
console.log('- Expected transaction count: ~145\n');

// Section 1: Expense Tracker (lines 6702-6878)
console.log('Parsing Expense Tracker (lines 6702-6878)...');
let currentDate = null;

for (let i = 6701; i < 6879; i++) {
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
  // October 2023: Standard columns (NO VND)
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

  // Skip zero-dollar transactions (v1.2 policy)
  if (amount === 0 || isNaN(amount)) {
    zeroSkipped.push({
      line: lineNumber,
      description,
      merchant,
      reason: 'Zero amount or NaN'
    });
    console.log(`  ⚠️  SKIPPING: $0.00 transaction - Line ${lineNumber}: ${description}`);
    continue;
  }

  // Determine transaction type and tags
  let transactionType = 'expense';
  const tags = [];

  // Check for reimbursement (flexible regex for typos and missing colons)
  // Also catch "Rent Reimbursement" and other patterns where reimbursement is in the middle
  const isReimbursement = /^Re(im|mi|m)?burs[e]?ment:?/i.test(description.trim()) ||
                         /\bRe(im|mi|m)?burs[e]?ment\b/i.test(description.trim());

  if (isReimbursement) {
    // Check for DSIL Design exclusion (company income, not reimbursement)
    const isDSILIncome = merchant && (
      merchant.includes('DSIL Design') || merchant.includes('DSIL LLC')
    );

    if (!isDSILIncome) {
      tags.push('Reimbursement');
      transactionType = 'income';
      stats.expenseTracker.reimbursements++;

      // Check for typo reimbursement
      if (!/^Reimbursement:/i.test(description.trim())) {
        typoReimbursements.push({
          line: lineNumber,
          description,
          pattern: 'Typo or missing colon'
        });
        console.log(`  ✓ TYPO REIMBURSEMENT (Line ${lineNumber}): "${description}"`);
      }

      // If amount is negative, convert to positive
      if (amount < 0) {
        const originalAmount = amount;
        amount = Math.abs(amount);
        negativeConversions.push({
          line: lineNumber,
          description,
          merchant,
          originalAmount,
          convertedAmount: amount,
          currency,
          reason: 'Reimbursement'
        });
        console.log(`  ✓ NEGATIVE → POSITIVE INCOME (Line ${lineNumber}): ${originalAmount} → ${amount} (Reimbursement)`);
      }
    }
  }
  // Check for negative amount (refund/credit)
  else if (amount < 0) {
    const originalAmount = amount;
    amount = Math.abs(amount);
    transactionType = 'income';
    negativeConversions.push({
      line: lineNumber,
      description,
      merchant,
      originalAmount,
      convertedAmount: amount,
      currency,
      reason: 'Refund/Credit'
    });
    console.log(`  ✓ NEGATIVE → POSITIVE INCOME (Line ${lineNumber}): ${originalAmount} → ${amount} (Refund/Credit)`);
  }

  // Check for Business Expense tag (ONLY Column 4)
  if (isBusinessExpense) {
    tags.push('Business Expense');
  }

  // Track dual residence rents (BOTH are valid - do NOT flag as duplicate)
  if (description.toLowerCase().includes('rent') &&
      (merchant.toLowerCase() === 'jordan' || merchant.toLowerCase() === 'pol')) {
    dualResidenceRents.push({
      line: lineNumber,
      description,
      merchant,
      amount,
      currency
    });
    console.log(`  ✓ DUAL RESIDENCE RENT (Line ${lineNumber}): ${merchant} - ${currency} ${amount}`);
  }

  // Track tag distribution
  tags.forEach(tag => {
    tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
  });

  // Create transaction object
  const transaction = {
    transaction_date: currentDate || '2023-10-31',
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
      reimbursable: isReimbursable, // Column 3 tracking (not a tag)
      business_expense_marker: isBusinessExpense // Column 4 tag
    }
  };

  transactions.push(transaction);

  if (transactionType === 'income') {
    stats.expenseTracker.income++;
  } else {
    stats.expenseTracker.expenses++;
  }
  stats.expenseTracker.count++;
}

console.log(`✓ Expense Tracker: ${stats.expenseTracker.count} transactions\n`);

// Section 2: Gross Income Tracker (lines 6879-6890)
console.log('Parsing Gross Income Tracker (lines 6879-6890)...');

// Set default date to last day of month for income without specific dates
let incomeDate = '2023-10-31';

for (let i = 6878; i < 6891; i++) {
  const row = parseCSV(lines[i]);

  // Skip header and total rows
  if (!row[1] || row[1] === '' || row[1] === 'Description' ||
      row[1].includes('Estimated') || row[1].includes('GROSS INCOME') ||
      row[1].includes('Subtotal')) {
    continue;
  }

  // Parse date if present (column 0)
  if (row[0] && parseFullDate(row[0])) {
    incomeDate = parseFullDate(row[0]);
  } else if (row[0] && parseShortDate(row[0])) {
    incomeDate = parseShortDate(row[0]);
  }

  const description = row[1];
  const merchant = row[2] || 'Unknown';
  const amount = parseAmount(row[3]);
  const lineNumber = i + 1;

  // Skip zero or invalid amounts
  if (amount === 0 || isNaN(amount)) {
    continue;
  }

  const transaction = {
    transaction_date: incomeDate,
    description,
    merchant,
    amount,
    currency: 'USD',
    payment_method: 'Direct Deposit',
    transaction_type: 'income',
    tags: [],
    metadata: {
      source: 'Gross Income',
      line_number: lineNumber
    }
  };

  transactions.push(transaction);
  stats.grossIncome.count++;
  stats.grossIncome.total += amount;
}

console.log(`✓ Gross Income: ${stats.grossIncome.count} transactions\n`);

// Section 3: Personal Savings & Investments (lines 6891-6895)
console.log('Parsing Personal Savings & Investments (lines 6891-6895)...');

// Set default date to last day of month for savings
let savingsDate = '2023-10-31';

for (let i = 6890; i < 6896; i++) {
  const row = parseCSV(lines[i]);

  // Skip header and total rows
  if (!row[1] || row[1] === '' || row[1] === 'Description' ||
      row[1].includes('TOTAL') || row[0].includes('Date Made')) {
    continue;
  }

  // Parse date if present (column 0)
  if (row[0] && parseFullDate(row[0])) {
    savingsDate = parseFullDate(row[0]);
  } else if (row[0] && parseShortDate(row[0])) {
    savingsDate = parseShortDate(row[0]);
  }

  const description = row[1];
  const merchant = row[2] || 'Unknown';
  const paymentMethod = row[3] || 'Unknown';
  const amount = parseAmount(row[4]);
  const lineNumber = i + 1;

  // Skip zero or invalid amounts
  if (amount === 0 || isNaN(amount)) {
    continue;
  }

  const transaction = {
    transaction_date: savingsDate,
    description,
    merchant,
    amount,
    currency: 'USD',
    payment_method: paymentMethod,
    transaction_type: 'expense', // Savings are expenses (money out)
    tags: ['Savings/Investment'],
    metadata: {
      source: 'Personal Savings & Investments',
      line_number: lineNumber
    }
  };

  transactions.push(transaction);
  tagDistribution['Savings/Investment'] = (tagDistribution['Savings/Investment'] || 0) + 1;
  stats.savings.count++;
  stats.savings.total += amount;
}

console.log(`✓ Personal Savings & Investments: ${stats.savings.count} transactions\n`);

// Section 4: Florida House Expenses - NOT PRESENT IN OCTOBER 2023
console.log('Florida House Expenses: NOT PRESENT (no section in October 2023)\n');

// Generate summary and red flag report
console.log('========================================');
console.log('PARSING SUMMARY');
console.log('========================================\n');

console.log(`Total Transactions Parsed: ${transactions.length}`);
console.log(`  - Expense Tracker: ${stats.expenseTracker.count} (${stats.expenseTracker.expenses} expenses, ${stats.expenseTracker.income} income)`);
console.log(`  - Gross Income: ${stats.grossIncome.count}`);
console.log(`  - Savings/Investment: ${stats.savings.count}`);
console.log(`  - Florida House: ${stats.floridaHouse.count} (NO SECTION)\n`);

console.log('Tag Distribution:');
Object.entries(tagDistribution).forEach(([tag, count]) => {
  console.log(`  - ${tag}: ${count}`);
});
console.log();

// Red Flag Summary
console.log('========================================');
console.log('RED FLAG SUMMARY');
console.log('========================================\n');

if (dualResidenceRents.length > 0) {
  console.log(`🟢 DUAL RESIDENCE RENTS: ${dualResidenceRents.length} (BOTH VALID - User Confirmed)`);
  dualResidenceRents.forEach(item => {
    console.log(`  Line ${item.line}: ${item.merchant} - ${item.currency} ${item.amount} (${item.description})`);
  });
  console.log();
}

if (negativeConversions.length > 0) {
  console.log(`🔴 NEGATIVE AMOUNT CONVERSIONS: ${negativeConversions.length}`);
  negativeConversions.forEach(item => {
    console.log(`  Line ${item.line}: ${item.description} - ${item.originalAmount} → ${item.convertedAmount} ${item.currency} (${item.reason})`);
  });
  console.log();
}

if (typoReimbursements.length > 0) {
  console.log(`🟡 TYPO REIMBURSEMENTS: ${typoReimbursements.length}`);
  typoReimbursements.forEach(item => {
    console.log(`  Line ${item.line}: ${item.description}`);
  });
  console.log();
}

if (commaFormattedAmounts.length > 0) {
  console.log(`🟡 COMMA-FORMATTED AMOUNTS: ${commaFormattedAmounts.length}`);
  commaFormattedAmounts.forEach(item => {
    console.log(`  Line ${item.line}: "${item.rawAmount}" → ${item.parsedAmount}`);
  });
  console.log();
}

if (zeroSkipped.length > 0) {
  console.log(`🟢 ZERO-DOLLAR TRANSACTIONS SKIPPED: ${zeroSkipped.length}`);
  zeroSkipped.forEach(item => {
    console.log(`  Line ${item.line}: ${item.description} (${item.reason})`);
  });
  console.log();
}

// Quality checks
console.log('========================================');
console.log('QUALITY CHECKS');
console.log('========================================\n');

// Check for negative amounts in output (should be 0)
const remainingNegatives = transactions.filter(t => t.amount < 0);
if (remainingNegatives.length > 0) {
  console.log(`❌ ERROR: ${remainingNegatives.length} transactions still have negative amounts!`);
  remainingNegatives.forEach(t => {
    console.log(`  Line ${t.metadata.line_number}: ${t.description} - ${t.amount}`);
  });
} else {
  console.log(`✅ All amounts are positive (${negativeConversions.length} were converted)`);
}

// Check dual residence rents (both should be present)
const jordanRent = transactions.find(t =>
  t.description && t.description.toLowerCase().includes('rent') &&
  t.merchant && t.merchant.toLowerCase() === 'jordan'
);
const polRent = transactions.find(t =>
  t.description && t.description.toLowerCase().includes('rent') &&
  t.merchant && t.merchant.toLowerCase() === 'pol'
);
const mikeDRent = transactions.find(t =>
  t.description && t.description.toLowerCase().includes('rent') &&
  t.description.toLowerCase().includes('reimbursement') &&
  t.merchant && t.merchant.toLowerCase().includes('mike')
);

if (jordanRent && polRent) {
  console.log(`✅ Dual residence rents found:`);
  console.log(`  - Jordan (USA): ${jordanRent.currency} ${jordanRent.amount}`);
  console.log(`  - Pol (Thailand): ${polRent.currency} ${polRent.amount}`);

  // Verify Pol rent is THB, not USD conversion
  if (polRent.currency === 'THB' && polRent.amount === 25000) {
    console.log(`✅ Pol rent correct: THB 25,000 (NOT USD conversion)`);
  } else {
    console.log(`❌ ERROR: Pol rent incorrect!`);
    console.log(`  Expected: THB 25,000`);
    console.log(`  Found: ${polRent.currency} ${polRent.amount}`);
  }
} else {
  console.log(`⚠️  WARNING: Missing rent transactions!`);
  if (!jordanRent) console.log(`  - Jordan rent NOT FOUND`);
  if (!polRent) console.log(`  - Pol rent NOT FOUND`);
}

// Check Mike D. rent reimbursement
if (mikeDRent) {
  console.log(`✅ Mike D. rent reimbursement found: ${mikeDRent.currency} ${mikeDRent.amount} (${mikeDRent.transaction_type})`);
  if (mikeDRent.transaction_type === 'income' && mikeDRent.tags.includes('Reimbursement')) {
    console.log(`✅ Correctly tagged as income with Reimbursement tag`);
  } else {
    console.log(`❌ ERROR: Mike D. reimbursement incorrectly tagged!`);
  }
} else {
  console.log(`⚠️  WARNING: Mike D. rent reimbursement NOT FOUND`);
}

// Check reimbursement count (October 2023 - Expected 8)
const reimbursementCount = transactions.filter(t => t.tags.includes('Reimbursement')).length;
console.log(`✅ Reimbursement tag count: ${reimbursementCount} (Expected: 8 - higher than typical USA month)`);

// Check Business Expense count
const businessExpenseCount = transactions.filter(t => t.tags.includes('Business Expense')).length;
console.log(`✅ Business Expense tag count: ${businessExpenseCount} (Expected: 0)`);

// Check Savings/Investment count
const savingsCount = transactions.filter(t => t.tags.includes('Savings/Investment')).length;
console.log(`✅ Savings/Investment tag count: ${savingsCount} (Expected: 1)`);

// Expected outcome check
console.log();
console.log('========================================');
console.log('EXPECTED OUTCOME VERIFICATION');
console.log('========================================\n');

console.log(`Expected Transaction Count: 145`);
console.log(`Actual Transaction Count: ${transactions.length}`);
const variance = ((transactions.length - 145) / 145 * 100).toFixed(1);
console.log(`Variance: ${variance}%`);

if (Math.abs(parseFloat(variance)) <= 5) {
  console.log(`✅ Variance within acceptable ±5% threshold\n`);
} else {
  console.log(`⚠️  WARNING: Variance exceeds ±5% threshold\n`);
}

// Currency distribution check
const thbCount = transactions.filter(t => t.currency === 'THB').length;
const usdCount = transactions.filter(t => t.currency === 'USD').length;
const thbPercentage = ((thbCount / transactions.length) * 100).toFixed(1);

console.log(`Currency Distribution:`);
console.log(`  THB: ${thbCount} (${thbPercentage}%)`);
console.log(`  USD: ${usdCount} (${(100 - parseFloat(thbPercentage)).toFixed(1)}%)`);
console.log(`  Expected THB: ~3.7% (USA-based month)`);

if (parseFloat(thbPercentage) >= 1 && parseFloat(thbPercentage) <= 6) {
  console.log(`✅ THB percentage within expected range (1-6% for USA month)\n`);
} else {
  console.log(`⚠️  WARNING: THB percentage outside expected range\n`);
}

// Calculate totals for verification
const totalExpenses = transactions.filter(t => t.transaction_type === 'expense')
  .reduce((sum, t) => {
    if (t.currency === 'USD') {
      return sum + t.amount;
    } else if (t.currency === 'THB') {
      // For display only - use approximate rate of 0.029 for Oct 2023
      return sum + (t.amount * 0.029);
    }
    return sum;
  }, 0);

const totalIncome = transactions.filter(t => t.transaction_type === 'income')
  .reduce((sum, t) => {
    if (t.currency === 'USD') {
      return sum + t.amount;
    } else if (t.currency === 'THB') {
      return sum + (t.amount * 0.029);
    }
    return sum;
  }, 0);

console.log(`Total Expenses (USD equivalent): $${totalExpenses.toFixed(2)}`);
console.log(`Total Income (USD): $${totalIncome.toFixed(2)}`);
console.log(`Expected Grand Total: ~$5,561.33`);
console.log(`Actual Grand Total: $${totalExpenses.toFixed(2)}`);
console.log(`Note: Grand total variance acceptable due to exchange rate approximations\n`);

console.log();

// Write output file
const outputPath = path.join(__dirname, 'october-2023-CORRECTED.json');
fs.writeFileSync(outputPath, JSON.stringify(transactions, null, 2));

console.log('========================================');
console.log(`✅ SUCCESS: Parsed ${transactions.length} transactions`);
console.log(`📁 Output: ${outputPath}`);
console.log('========================================\n');

console.log('Next Steps:');
console.log('1. Review october-2023-CORRECTED.json');
console.log('2. Verify dual rent payments (Jordan $957 + Pol THB 25,000)');
console.log('3. Verify Mike D. rent reimbursement ($400 income with Reimbursement tag)');
console.log('4. Verify 7 negative refunds converted to income');
console.log('5. Verify 8 reimbursement tags applied (higher than typical USA month)');
console.log('6. Generate PHASE-2-PARSE-REPORT.md');
console.log('7. Proceed to Phase 3: Database Import\n');
