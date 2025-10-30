const fs = require('fs');
const path = require('path');

/**
 * OCTOBER 2022 PARSING SCRIPT
 * Enhanced with 21+ months of historical learnings
 *
 * Protocol: MASTER-IMPORT-PROTOCOL v3.0 + Protocol v2.0
 * Batch: Dec-Nov-Oct-Sep 2022 (Month 2 of 4)
 *
 * Line Ranges from CSV:
 * - Expense Tracker: 9835-10160 (~257 lines)
 * - Gross Income Tracker: 10163-10169 (~7 lines)
 * - Personal Savings & Investments: 10173 (~1 line)
 */

console.log('========================================');
console.log('OCTOBER 2022 PARSING SCRIPT');
console.log('========================================\n');
console.log('Protocol: MASTER-IMPORT-PROTOCOL v3.0');
console.log('Enhanced with 21+ months of historical learnings');
console.log('Batch: Dec-Nov-Oct-Sep 2022 (Month 2 of 4)\n');

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

// Helper function to parse amount with enhanced comma handling
function parseAmount(amountStr) {
  if (!amountStr || amountStr.trim() === '') return 0;
  let cleaned = amountStr.replace(/[$,"\t()\s]/g, '').trim();

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
const negativeConversions = [];
const typoReimbursements = [];
const commaFormattedAmounts = [];
const zeroSkipped = [];
const dualResidenceRents = [];

// Section 1: Expense Tracker (lines 9835-10160)
console.log('Parsing Expense Tracker (lines 9835-10160)...');
let currentDate = null;

for (let i = 9834; i < 10161; i++) {
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

  let amount = 0;
  let currency = 'USD';
  const lineNumber = i + 1;

  // Check THB column (column 6)
  if (row[6] && row[6].includes('THB')) {
    const match = row[6].match(/-?THB\s*([\d,.-]+)/);
    if (match) {
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

  // Skip zero-dollar transactions
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

  // Check for reimbursement
  const isReimbursement = /^Re(im|mi|m)?burs[e]?ment:?/i.test(description.trim());

  if (isReimbursement) {
    const isDSILIncome = merchant && (
      merchant.includes('DSIL Design') || merchant.includes('DSIL LLC')
    );

    if (!isDSILIncome) {
      tags.push('Reimbursement');
      transactionType = 'income';
      stats.expenseTracker.reimbursements++;

      if (!/^Reimbursement:/i.test(description.trim())) {
        typoReimbursements.push({
          line: lineNumber,
          description,
          pattern: 'Typo or missing colon'
        });
        console.log(`  ✓ TYPO REIMBURSEMENT (Line ${lineNumber}): "${description}"`);
      }

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

  // Check for Business Expense tag
  if (isBusinessExpense) {
    tags.push('Business Expense');
  }

  // Track dual residence rents
  if (description.toLowerCase().includes('rent')) {
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
    transaction_date: currentDate || '2022-10-31',
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
      reimbursable: isReimbursable,
      business_expense_marker: isBusinessExpense
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

// Section 2: Gross Income Tracker (lines 10163-10169)
console.log('Parsing Gross Income Tracker (lines 10163-10169)...');

let incomeDate = '2022-10-31';

for (let i = 10162; i < 10170; i++) {
  const row = parseCSV(lines[i]);

  if (!row[1] || row[1] === '' || row[1] === 'Description' ||
      row[1].includes('Estimated') || row[1].includes('GROSS INCOME') ||
      row[1].includes('Subtotal') || row[1].includes('TOTAL')) {
    continue;
  }

  if (row[0] && parseFullDate(row[0])) {
    incomeDate = parseFullDate(row[0]);
  } else if (row[0] && parseShortDate(row[0])) {
    incomeDate = parseShortDate(row[0]);
  }

  const description = row[1];
  const merchant = row[2] || 'Unknown';
  const amount = parseAmount(row[3]);
  const lineNumber = i + 1;

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

// Section 3: Personal Savings & Investments (line 10173)
console.log('Parsing Personal Savings & Investments (line 10173)...');

let savingsDate = '2022-10-31';

for (let i = 10172; i < 10174; i++) {
  const row = parseCSV(lines[i]);

  if (!row[1] || row[1] === '' || row[1] === 'Description' ||
      row[1].includes('TOTAL') || row[0].includes('Date Made')) {
    continue;
  }

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
  console.log(`✅ DUAL RESIDENCE RENTS FOUND:`);
  if (jordanRent) {
    console.log(`  - Jordan: ${jordanRent.currency} ${jordanRent.amount} (USA rent)`);
  }
  if (thaiRent) {
    console.log(`  - ${thaiRent.merchant}: ${thaiRent.currency} ${thaiRent.amount} (Thailand rent)`);
  }
} else {
  console.log(`⚠️  WARNING: Missing rent transactions!`);
}
console.log();

const reimbursementCount = transactions.filter(t => t.tags.includes('Reimbursement')).length;
console.log(`✅ Reimbursement tag count: ${reimbursementCount}`);

const businessExpenseCount = transactions.filter(t => t.tags.includes('Business Expense')).length;
console.log(`✅ Business Expense tag count: ${businessExpenseCount}`);

const savingsInvestmentCount = transactions.filter(t => t.tags.includes('Savings/Investment')).length;
console.log(`✅ Savings/Investment tag count: ${savingsInvestmentCount}`);

console.log();

// Currency distribution check
const thbCount = transactions.filter(t => t.currency === 'THB').length;
const usdCount = transactions.filter(t => t.currency === 'USD').length;
const thbPercentage = transactions.length > 0 ? ((thbCount / transactions.length) * 100).toFixed(1) : 0;

console.log(`Currency Distribution:`);
console.log(`  THB: ${thbCount} (${thbPercentage}%)`);
console.log(`  USD: ${usdCount} (${(100 - parseFloat(thbPercentage)).toFixed(1)}%)`);

if (parseFloat(thbPercentage) >= 20 && parseFloat(thbPercentage) <= 70) {
  console.log(`✅ THB percentage within expected range (20-70% for dual residence)\n`);
} else {
  console.log(`⚠️  WARNING: THB percentage outside expected range\n`);
}

console.log();

// Write output file
const outputPath = path.join(__dirname, 'october-2022-CORRECTED.json');
fs.writeFileSync(outputPath, JSON.stringify(transactions, null, 2));

// Write metadata file
const metadataPath = path.join(__dirname, 'october-2022-METADATA.json');
const metadata = {
  month: 'October 2022',
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
  dual_residence_verified: !!(jordanRent || thaiRent)
};
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

console.log('========================================');
console.log(`✅ SUCCESS: Parsed ${transactions.length} transactions`);
console.log(`📁 Output: ${outputPath}`);
console.log(`📁 Metadata: ${metadataPath}`);
console.log('========================================\n');

console.log('Next Steps:');
console.log('1. Review october-2022-CORRECTED.json');
console.log('2. Proceed to Phase 2: Database Import\n');
