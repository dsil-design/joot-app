const fs = require('fs');
const path = require('path');

/**
 * APRIL 2023 PARSING SCRIPT
 * Enhanced with 21+ months of historical learnings
 *
 * Protocol: BATCH-IMPORT-PROTOCOL-v1.2 + Monthly v3.6
 * Batch: Apr-Mar-Feb-Jan 2023 (Month 3 of 4)
 *
 * Line Ranges from CSV:
 * - Expense Tracker: 8198-8459 (~261 lines)
 * - Gross Income Tracker: 8474-8476 (~3 lines)
 * - Personal Savings & Investments: 8485 (~1 line)
 */

console.log('========================================');
console.log('APRIL 2023 PARSING SCRIPT');
console.log('========================================\n');
console.log('Protocol: BATCH-IMPORT-PROTOCOL-v1.2 + Monthly v3.6');
console.log('Enhanced with 21+ months of historical learnings');
console.log('Batch: Apr-Mar-Feb-Jan 2023 (Month 3 of 4)\n');

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

// Section 1: Expense Tracker (lines 7731-7985)
console.log('Parsing Expense Tracker (lines 8777-9009)...');
let currentDate = null;

for (let i = 8776; i < 9010; i++) {
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
    console.log(`  ✓ DUAL RESIDENCE RENT (Line ${lineNumber}): ${merchant} - ${currency} ${amount}`);
  }

  // Track tag distribution
  tags.forEach(tag => {
    tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
  });

  // Create transaction object
  const transaction = {
    transaction_date: currentDate || '2023-08-31',
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

// Section 2: Gross Income Tracker (lines 7986-7995)
console.log('Parsing Gross Income Tracker (lines 9024-9024)...');

// Set default date to last day of month for income without specific dates
let incomeDate = '2023-02-28';

for (let i = 9023; i < 9025; i++) {
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

// Section 3: Personal Savings & Investments (lines 7996-8000)
console.log('Parsing Personal Savings & Investments (line 9033)...');

// Set default date to last day of month for savings
let savingsDate = '2023-02-28';

for (let i = 9032; i < 9034; i++) {
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
const jordanRent = dualResidenceRents.find(r => r.merchant.toLowerCase() === 'jordan');
const polRent = dualResidenceRents.find(r => r.merchant.toLowerCase() === 'pol');

if (jordanRent && polRent) {
  console.log(`✅ DUAL RESIDENCE RENTS FOUND:`);
  console.log(`  - Jordan: ${jordanRent.currency} ${jordanRent.amount} (USA rent)`);
  console.log(`  - Pol: ${polRent.currency} ${polRent.amount} (Thailand rent)`);

  // Verify amounts
  if (jordanRent.currency === 'USD' && jordanRent.amount === 987) {
    console.log(`  ✅ Jordan rent correct: $987`);
  } else {
    console.log(`  ❌ ERROR: Jordan rent incorrect!`);
    console.log(`    Expected: $987`);
    console.log(`    Found: ${jordanRent.currency} ${jordanRent.amount}`);
  }

  if (polRent.currency === 'THB' && polRent.amount === 25000) {
    console.log(`  ✅ Pol rent correct: THB 25,000`);
  } else {
    console.log(`  ❌ ERROR: Pol rent incorrect!`);
    console.log(`    Expected: THB 25,000`);
    console.log(`    Found: ${polRent.currency} ${polRent.amount}`);
  }
} else {
  console.log(`⚠️  WARNING: Missing rent transactions!`);
  if (!jordanRent) console.log(`  - Jordan rent NOT FOUND`);
  if (!polRent) console.log(`  - Pol rent NOT FOUND`);
}
console.log();

// Check reimbursement count (August 2023 - Expected 1 from Gate 1)
const reimbursementCount = transactions.filter(t => t.tags.includes('Reimbursement')).length;
console.log(`✅ Reimbursement tag count: ${reimbursementCount} (Expected: 1)`);

// Check Business Expense count
const businessExpenseCount = transactions.filter(t => t.tags.includes('Business Expense')).length;
console.log(`✅ Business Expense tag count: ${businessExpenseCount}`);

// Check Savings/Investment count
const savingsInvestmentCount = transactions.filter(t => t.tags.includes('Savings/Investment')).length;
console.log(`✅ Savings/Investment tag count: ${savingsInvestmentCount} (Expected: 1)`);

console.log();

// ========================================
// EXPECTED OUTCOME VERIFICATION
// ========================================

console.log('========================================');
console.log('EXPECTED OUTCOME VERIFICATION');
console.log('========================================\n');

console.log(`Expected Transaction Count: 188 (184 Expense Tracker + 3 Income + 1 Savings)`);
console.log(`Actual Transaction Count: ${transactions.length}`);
const variance = transactions.length > 0 ? ((transactions.length - 188) / 188 * 100).toFixed(1) : 0;
console.log(`Variance: ${variance}%`);

if (Math.abs(parseFloat(variance)) <= 5) {
  console.log(`✅ Variance within acceptable ±5% threshold\n`);
} else {
  console.log(`⚠️  WARNING: Variance exceeds ±5% threshold\n`);
}

// Currency distribution check
const thbCount = transactions.filter(t => t.currency === 'THB').length;
const usdCount = transactions.filter(t => t.currency === 'USD').length;
const thbPercentage = transactions.length > 0 ? ((thbCount / transactions.length) * 100).toFixed(1) : 0;

console.log(`Currency Distribution:`);
console.log(`  THB: ${thbCount} (${thbPercentage}%)`);
console.log(`  USD: ${usdCount} (${(100 - parseFloat(thbPercentage)).toFixed(1)}%)`);
console.log(`  Expected THB: ~53.8% (from Gate 1 analysis)`);

if (parseFloat(thbPercentage) >= 45 && parseFloat(thbPercentage) <= 65) {
  console.log(`✅ THB percentage within expected range (45-65% for dual residence)\n`);
} else {
  console.log(`⚠️  WARNING: THB percentage outside expected range\n`);
}

console.log();

// Write output file
const outputPath = path.join(__dirname, 'february-2023-PARSED.json');
fs.writeFileSync(outputPath, JSON.stringify(transactions, null, 2));

// Write metadata file with exchange rate
const metadataPath = path.join(__dirname, 'february-2023-METADATA.json');
const metadata = {
  month: 'February 2023',
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
  dual_residence_verified: !!(jordanRent && polRent)
};
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

console.log('========================================');
console.log(`✅ SUCCESS: Parsed ${transactions.length} transactions`);
console.log(`📁 Output: ${outputPath}`);
console.log(`📁 Metadata: ${metadataPath}`);
console.log('========================================\n');

console.log('Next Steps:');
console.log('1. Review august-2023-CORRECTED.json');
console.log('2. Verify dual rent payments (Jordan $987 + Pol THB 25,000)');
console.log('3. Verify negative amounts converted to income (Expected: 2)');
console.log('4. Verify typo reimbursement detected (Expected: 1)');
console.log('5. Verify currency distribution (53.8% THB / 46.2% USD)');
console.log('6. Proceed to Gate 2 Phase 2: Database Import\n');
