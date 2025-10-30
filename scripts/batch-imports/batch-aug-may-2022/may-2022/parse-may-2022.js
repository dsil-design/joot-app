const fs = require('fs');
const path = require('path');

/**
 * MAY 2022 PARSING SCRIPT
 * Enhanced with 25+ months of historical learnings
 *
 * Protocol: MASTER-IMPORT-PROTOCOL v3.0 + Protocol v2.0
 * Batch: Aug-Jul-Jun-May 2022 (Month 4 of 4)
 *
 * Line Ranges from CSV:
 * - Expense Tracker: 11217-11391 (~175 lines)
 * - Gross Income Tracker: 11392-11402 (~11 lines)
 * - Personal Savings & Investments: 11404-11408 (~5 lines)
 */

console.log('========================================');
console.log('MAY 2022 PARSING SCRIPT');
console.log('========================================\n');
console.log('Protocol: MASTER-IMPORT-PROTOCOL v3.0');
console.log('Enhanced with 25+ months of historical learnings');
console.log('Batch: Aug-Jul-Jun-May 2022 (Month 4 of 4)\n');

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
    let parsedYear = year;

    // Date sanity check: Ensure year matches expected month
    if (monthName === 'May' && year !== '2022') {
      console.log(`  ⚠️  DATE TYPO DETECTED: ${dateStr} - Expected May 2022`);
      parsedYear = '2022';
      console.log(`  ✓ DATE TYPO CORRECTED: ${dateStr} → May ${day}, 2022`);
    }

    return `${parsedYear}-${month}-${day.padStart(2, '0')}`;
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
  savings: { count: 0, total: 0 }
};
const tagDistribution = {};
const redFlags = [];
const corrections = [];
const negativeConversions = [];
const typoReimbursements = [];
const commaFormattedAmounts = [];
const zeroSkipped = [];
const dualResidenceRents = [];

// Section 1: Expense Tracker (lines 11217-11391)
console.log('Parsing Expense Tracker (lines 11217-11391)...');
let currentDate = null;

for (let i = 11216; i < 11392; i++) {
  const row = parseCSV(lines[i]);

  // Check for date row
  if (row[0] && parseFullDate(row[0])) {
    currentDate = parseFullDate(row[0]);
    continue;
  }

  // Skip rows without description or with special keywords
  if (!row[1] || row[1] === '' || row[1] === 'Desc' ||
      row[1].includes('Daily Total') || row[1].includes('GRAND TOTAL') ||
      row[1].includes('Estimated') || row[1].includes('Subtotal') ||
      row[1].includes('May 2022:')) {
    continue;
  }

  // Parse transaction
  const description = row[1];
  const merchant = row[2] || 'Unknown';
  const isReimbursable = row[3] === 'X' || row[3] === 'x'; // Column 3 - tracking only, NOT a tag
  const isBusinessExpense = row[4] === 'X' || row[4] === 'x'; // Column 4 - actual Business Expense tag
  const paymentMethod = row[5] || 'Unknown';

  // Currency and amount extraction (CRITICAL: Col 6 = THB, Col 7 = USD, NEVER Col 8!)
  let amount = 0;
  let currency = 'USD';
  const lineNumber = i + 1;

  // Check THB column (column 6) - format: "THB 228.00" or "-THB 228.00"
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
  // Check USD column (column 7) - format: "$	6.36" or "$987.00"
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
  // Check subtotal (column 9) as fallback
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
  const isReimbursement = /^Re(im|mi|m)?burs[e]?ment:?/i.test(description.trim());

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
  if (description.toLowerCase().includes('rent')) {
    dualResidenceRents.push({
      line: lineNumber,
      description,
      merchant,
      amount,
      currency
    });
    console.log(`  ✓ RENT TRANSACTION (Line ${lineNumber}): ${merchant} - ${currency} ${amount}`);
  }

  // Track tag distribution
  tags.forEach(tag => {
    tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
  });

  // Create transaction object
  const transaction = {
    transaction_date: currentDate || '2022-05-30',
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

// Section 2: Gross Income Tracker (lines 11392-11402)
console.log('Parsing Gross Income Tracker (lines 11392-11402)...');

// Set default date to last day of month for income without specific dates
let incomeDate = '2022-05-30';

for (let i = 11392; i < 11403; i++) {
  const row = parseCSV(lines[i]);

  // Skip header and total rows
  if (!row[1] || row[1] === '' || row[1] === 'Description' ||
      row[1].includes('Estimated') || row[1].includes('GROSS INCOME') ||
      row[1].includes('Subtotal') || row[1].includes('TOTAL')) {
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

// Section 3: Personal Savings & Investments (lines 11404-11408)
console.log('Parsing Personal Savings & Investments (lines 11404-11408)...');

// Set default date to last day of month for savings
let savingsDate = '2022-05-30';

for (let i = 11404; i < 11409; i++) {
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
    transaction_type: 'expense',
    tags: ['Savings/Investment'],
    metadata: {
      source: 'Personal Savings & Investments',
      line_number: lineNumber
    }
  };

  transactions.push(transaction);
  stats.savings.count++;
  stats.savings.total += amount;
}

console.log(`✓ Personal Savings: ${stats.savings.count} transactions\n`);

// ========================================
// SUMMARY REPORT
// ========================================

console.log('========================================');
console.log('PARSING SUMMARY');
console.log('========================================\n');

console.log(`Total Transactions Parsed: ${transactions.length}`);
console.log(`  Expense Tracker: ${stats.expenseTracker.count}`);
console.log(`    - Expenses: ${stats.expenseTracker.expenses}`);
console.log(`    - Income: ${stats.expenseTracker.income}`);
console.log(`    - Reimbursements: ${stats.expenseTracker.reimbursements}`);
console.log(`  Gross Income: ${stats.grossIncome.count} (Total: $${stats.grossIncome.total.toFixed(2)})`);
console.log(`  Savings: ${stats.savings.count} (Total: $${stats.savings.total.toFixed(2)})`);
console.log();

console.log('RED FLAGS PROCESSED:');
console.log(`  Negative Conversions: ${negativeConversions.length}`);
console.log(`  Typo Reimbursements: ${typoReimbursements.length}`);
console.log(`  Comma-Formatted Amounts: ${commaFormattedAmounts.length}`);
console.log(`  Zero/NaN Skipped: ${zeroSkipped.length}`);
console.log();

console.log('CRITICAL VERIFICATIONS:');

// Check dual residence rents
const jordanRent = dualResidenceRents.find(r => r.merchant.toLowerCase().includes('jordan'));
const thaiRent = dualResidenceRents.find(r =>
  r.merchant.toLowerCase().includes('pol') ||
  r.merchant.toLowerCase().includes('panya') ||
  (r.description.toLowerCase().includes('rent') && r.currency === 'THB')
);

if (jordanRent || thaiRent) {
  console.log(`✅ RENT TRANSACTION(S) FOUND:`);
  if (jordanRent) {
    console.log(`  - Jordan: ${jordanRent.currency} ${jordanRent.amount} (USA rent)`);
  }
  if (thaiRent) {
    console.log(`  - ${thaiRent.merchant}: ${thaiRent.currency} ${thaiRent.amount} (Thailand rent)`);
  }
} else {
  console.log(`⚠️  WARNING: No rent transactions found!`);
}
console.log();

// Check reimbursement count
const reimbursementCount = transactions.filter(t => t.tags.includes('Reimbursement')).length;
console.log(`✅ Reimbursement tag count: ${reimbursementCount}`);

// Check Business Expense count
const businessExpenseCount = transactions.filter(t => t.tags.includes('Business Expense')).length;
console.log(`✅ Business Expense tag count: ${businessExpenseCount}`);

// Check Savings/Investment count
const savingsInvestmentCount = transactions.filter(t => t.tags.includes('Savings/Investment')).length;
console.log(`✅ Savings/Investment tag count: ${savingsInvestmentCount}`);

console.log();

// ========================================
// EXPECTED OUTCOME VERIFICATION
// ========================================

console.log('========================================');
console.log('EXPECTED OUTCOME VERIFICATION');
console.log('========================================\n');

const expectedCount = 125; // Estimated from line ranges (120-130 target)
console.log(`Expected Transaction Count: ${expectedCount} (±15 variance acceptable)`);
console.log(`Actual Transaction Count: ${transactions.length}`);
const variance = transactions.length > 0 ? ((transactions.length - expectedCount) / expectedCount * 100).toFixed(1) : 0;
console.log(`Variance: ${variance}%`);

if (Math.abs(parseFloat(variance)) <= 20) {
  console.log(`✅ Variance within acceptable ±20% threshold\n`);
} else {
  console.log(`⚠️  WARNING: Variance exceeds ±20% threshold\n`);
}

// Currency distribution check
const thbCount = transactions.filter(t => t.currency === 'THB').length;
const usdCount = transactions.filter(t => t.currency === 'USD').length;
const thbPercentage = transactions.length > 0 ? ((thbCount / transactions.length) * 100).toFixed(1) : 0;

console.log(`Currency Distribution:`);
console.log(`  THB: ${thbCount} (${thbPercentage}%)`);
console.log(`  USD: ${usdCount} (${(100 - parseFloat(thbPercentage)).toFixed(1)}%)`);
console.log(`  Expected: Likely high USD% (USA period) or dual residence`);

console.log();

// Write output file
const outputPath = path.join(__dirname, 'may-2022-CORRECTED.json');
fs.writeFileSync(outputPath, JSON.stringify(transactions, null, 2));

// Write metadata file
const metadataPath = path.join(__dirname, 'may-2022-METADATA.json');
const metadata = {
  month: 'May 2022',
  parsing_date: new Date().toISOString(),
  total_transactions: transactions.length,
  currency_distribution: {
    thb: thbCount,
    usd: usdCount,
    thb_percentage: parseFloat(thbPercentage)
  },
  red_flags: {
    negative_conversions: negativeConversions.length,
    typo_reimbursements: typoReimbursements.length,
    comma_formatted: commaFormattedAmounts.length,
    zero_skipped: zeroSkipped.length
  },
  tag_distribution: tagDistribution,
  dual_residence_verified: !!(jordanRent || thaiRent),
  corrections: corrections
};
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

console.log('========================================');
console.log(`✅ SUCCESS: Parsed ${transactions.length} transactions`);
console.log(`📁 Output: ${outputPath}`);
console.log(`📁 Metadata: ${metadataPath}`);
console.log('========================================\n');

console.log('Next Steps:');
console.log('1. Review may-2022-CORRECTED.json');
console.log('2. Verify rent transactions (if expected)');
console.log('3. Verify negative amounts converted to income');
console.log('4. Verify currency distribution');
console.log('5. Proceed to Phase 2: Database Import\n');
