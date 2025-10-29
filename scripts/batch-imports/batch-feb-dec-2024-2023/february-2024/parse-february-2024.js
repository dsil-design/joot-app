const fs = require('fs');

console.log('\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║          FEBRUARY 2024 TRANSACTION PARSER                         ║');
console.log('║          Protocol: BATCH-IMPORT-PROTOCOL v1.2                     ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

// Proper CSV parser that handles quoted fields (from existing proven parsers)
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

const CSV_PATH = '/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv';
const OUTPUT_PATH = '/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-feb-dec-2024-2023/february-2024/february-2024-CORRECTED.json';

// CSV Line range for February 2024
const START_LINE = 5785;
const END_LINE = 6094;

// Read and parse CSV
console.log('📂 Reading CSV...');
const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = csvContent.split('\n');

const transactions = [];
let currentDate = null;
let inExpenseSection = false;
let inIncomeSection = false;
let inSavingsSection = false;

let stats = {
  totalParsed: 0,
  expenses: 0,
  income: 0,
  savings: 0,
  thb: 0,
  usd: 0,
  negativeConverted: 0,
  zeroSkipped: 0,
  reimbursements: 0,
  errors: []
};

console.log(`📊 Processing lines ${START_LINE} to ${END_LINE}...\n`);

for (let i = START_LINE; i < END_LINE; i++) {
  const line = lines[i - 1]; // CSV line numbers are 1-indexed, array is 0-indexed

  // Section detection - must be exact to avoid false matches
  if (line.includes(': Expense Tracker')) {
    inExpenseSection = true;
    inIncomeSection = false;
    inSavingsSection = false;
    console.log('📍 Entered: Expense Tracker');
    continue;
  }
  if (line.includes(': Gross Income Tracker')) {
    inExpenseSection = false;
    inIncomeSection = true;
    inSavingsSection = false;
    console.log('📍 Entered: Gross Income Tracker');
    continue;
  }
  if (line.includes(': Personal Savings')) {
    inExpenseSection = false;
    inIncomeSection = false;
    inSavingsSection = true;
    console.log('📍 Entered: Personal Savings & Investments');
    continue;
  }
  if (line.includes('Deficit/Surplus') || line.includes('Personal Take Home')) {
    break; // End of transaction sections
  }

  const columns = parseCSV(line);

  // Skip headers, totals, empty lines
  if (line.includes('Desc,Merchant') ||
      line.includes('Daily Total') ||
      line.includes('GRAND TOTAL') ||
      line.includes('Date Receieved') ||
      line.includes('Date Made') ||
      line.includes('Estimated') ||
      line.includes('GROSS INCOME') ||
      line.includes('TOTAL') ||
      line.includes('Description,Source,Amount') || // Income section header
      line.includes('Description,Vendor,Source') || // Savings section header
      line.trim() === '' ||
      columns.length < 3) {
    continue;
  }

  // Date header detection (e.g., "Thursday, February 1, 2024")
  if (columns[0] && (columns[0].includes('2024') || columns[0].includes('February'))) {
    const dateMatch = columns[0].match(/(\w+,\s+)?(\w+\s+\d+,\s+\d{4})/);
    if (dateMatch) {
      currentDate = dateMatch[2]; // "February 1, 2024"
      continue;
    }
  }

  // Parse transaction
  try {
    // Expense section
    if (inExpenseSection && columns[1] && columns[1].trim() !== '') {
      const transaction = parseExpenseTransaction(columns, currentDate);
      if (transaction) {
        transactions.push(transaction);
        stats.totalParsed++;
        stats.expenses++;
        if (transaction.currency === 'THB') stats.thb++;
        else stats.usd++;

        if (transaction.tags && transaction.tags.includes('Reimbursement')) {
          stats.reimbursements++;
        }
      }
    }

    // Income section
    if (inIncomeSection && columns[1] && columns[1].trim() !== '' && !columns[1].includes('Subtotal')) {
      const transaction = parseIncomeTransaction(columns, currentDate);
      if (transaction) {
        transactions.push(transaction);
        stats.totalParsed++;
        stats.income++;
      }
    }

    // Savings section
    if (inSavingsSection && columns[1] && columns[1].trim() !== '') {
      const transaction = parseSavingsTransaction(columns, currentDate);
      if (transaction) {
        transactions.push(transaction);
        stats.totalParsed++;
        stats.savings++;
      }
    }
  } catch (error) {
    stats.errors.push({ line: i, error: error.message, data: columns.slice(0, 3).join(',') });
  }
}

// Helper Functions

function parseExpenseTransaction(row, currentDate) {
  const description = row[1]?.trim() || '';
  const merchant = row[2]?.trim() || 'Unknown';
  const paymentMethod = row[5]?.trim() || 'Unknown';

  // Extract amount and currency (HARD RULE: No conversions)
  let amount = 0;
  let currency = 'USD';

  // Check Column 6 for THB amounts
  if (row[6] && row[6].includes('THB')) {
    const match = row[6].match(/THB\s*([\d,.-]+)/);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ''));
      currency = 'THB';
    }
  }
  // Check Column 7 or 9 for USD amounts
  else if (row[7] || row[9]) {
    let usdStr = (row[7] || row[9]).trim();

    // Check if amount is negative (parentheses format or minus sign)
    const isNegative = usdStr.includes('(') || usdStr.startsWith('-');

    // Clean the string
    usdStr = usdStr.replace(/[$,"\t()\s]/g, '').replace(/-/g, '').trim();
    amount = parseFloat(usdStr);

    // Apply negative sign if needed
    if (isNegative && amount > 0) {
      amount = -amount;
    }

    currency = 'USD';
  }

  // NEVER use Column 8 (conversion column)

  // Zero-dollar exclusion
  if (amount === 0 || isNaN(amount)) {
    stats.zeroSkipped++;
    return null;
  }

  let transactionType = 'expense';
  const tags = [];

  // Negative amount handling (convert to positive income)
  if (amount < 0) {
    transactionType = 'income';
    amount = Math.abs(amount);
    stats.negativeConverted++;
  }

  // Reimbursement detection (typo-tolerant)
  const isReimbursement = /^Re(im|mi|m)?burs[e]?ment:?/i.test(description);
  const isDSILIncome = merchant && (merchant.includes('DSIL Design') || merchant.includes('DSIL LLC'));

  if (isReimbursement && !isDSILIncome) {
    tags.push('Reimbursement');
    transactionType = 'income';
    amount = Math.abs(amount);
  }

  // Business Expense detection
  if (row[4] && row[4].trim().toLowerCase() === 'x') {
    tags.push('Business Expense');
  }

  // Parse date
  const transactionDate = parseDate(currentDate);

  return {
    description,
    merchant,
    payment_method: paymentMethod,
    amount,
    currency,
    transaction_type: transactionType,
    transaction_date: transactionDate,
    tags
  };
}

function parseIncomeTransaction(row, currentDate) {
  // With proper CSV parsing, quoted dates stay in one field
  // Format: "Friday, February 2, 2024",Description,Source,Amount
  // After parseCSV: ["Friday, February 2, 2024", "Description", "Source", "Amount"]

  const description = row[1]?.trim() || '';
  const source = row[2]?.trim() || 'Unknown';

  // Amount from Column 3
  const amountStr = (row[3] || '').replace(/[$,"\t()\s]/g, '').trim();
  let amount = parseFloat(amountStr);

  if (amount === 0 || isNaN(amount)) {
    return null;
  }

  // Income amounts should always be positive
  amount = Math.abs(amount);

  // Check if row[0] has a date (income section includes dates in column 0)
  let dateToUse = currentDate;
  if (row[0] && row[0].includes('2024')) {
    dateToUse = row[0];
  }

  const transactionDate = parseDate(dateToUse);

  return {
    description,
    merchant: source,
    payment_method: 'Income',
    amount,
    currency: 'USD',
    transaction_type: 'income',
    transaction_date: transactionDate,
    tags: []
  };
}

function parseSavingsTransaction(row, currentDate) {
  const description = row[1]?.trim() || '';
  const vendor = row[2]?.trim() || 'Unknown';
  const source = row[3]?.trim() || 'Unknown';

  // Amount from Column 4
  const amountStr = (row[4] || '').replace(/[$,"\t()\s]/g, '').trim();
  let amount = parseFloat(amountStr);

  if (amount === 0 || isNaN(amount)) {
    return null;
  }

  amount = Math.abs(amount);

  const transactionDate = parseDate(currentDate);

  return {
    description,
    merchant: vendor,
    payment_method: source,
    amount,
    currency: 'USD',
    transaction_type: 'expense',
    transaction_date: transactionDate,
    tags: ['Savings/Investment']
  };
}

function parseDate(dateStr) {
  if (!dateStr) return '2024-02-28'; // Default to last day of month

  try {
    // Parse "February 1, 2024" format
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return '2024-02-28';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    return '2024-02-28';
  }
}

// Generate deduplication keys
const deduplicationMap = new Map();
const duplicates = [];

transactions.forEach((tx, index) => {
  const key = `${tx.transaction_date}_${tx.description}_${tx.amount}_${tx.currency}_${tx.merchant || 'NO_MERCHANT'}`;

  if (deduplicationMap.has(key)) {
    duplicates.push({
      index1: deduplicationMap.get(key),
      index2: index,
      key,
      transaction: tx
    });
  } else {
    deduplicationMap.set(key, index);
  }
});

// Write output
console.log('\n💾 Writing parsed transactions to file...');
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(transactions, null, 2));

// Print summary
console.log('\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║          PARSING COMPLETE                                         ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

console.log('📊 PARSING STATISTICS:\n');
console.log(`   Total Transactions: ${stats.totalParsed}`);
console.log(`   ├─ Expenses:        ${stats.expenses}`);
console.log(`   ├─ Income:          ${stats.income}`);
console.log(`   └─ Savings:         ${stats.savings}\n`);

console.log(`💱 Currency Distribution:\n`);
console.log(`   ├─ THB:             ${stats.thb} (${((stats.thb / stats.totalParsed) * 100).toFixed(1)}%)`);
console.log(`   └─ USD:             ${stats.usd} (${((stats.usd / stats.totalParsed) * 100).toFixed(1)}%)\n`);

console.log(`🔧 Transformations:\n`);
console.log(`   ├─ Negative → Income: ${stats.negativeConverted}`);
console.log(`   ├─ Zero Skipped:      ${stats.zeroSkipped}`);
console.log(`   └─ Reimbursements:    ${stats.reimbursements}\n`);

if (duplicates.length > 0) {
  console.log(`⚠️  POTENTIAL DUPLICATES DETECTED: ${duplicates.length}\n`);
  duplicates.slice(0, 5).forEach(dup => {
    console.log(`   • ${dup.transaction.transaction_date} - ${dup.transaction.description} - ${dup.transaction.amount} ${dup.transaction.currency}`);
  });
  if (duplicates.length > 5) {
    console.log(`   ... and ${duplicates.length - 5} more`);
  }
  console.log(`\n   Note: Deduplication key includes merchant, so these may be legitimate.`);
  console.log(`   Review before import or allow import script to handle.\n`);
}

if (stats.errors.length > 0) {
  console.log(`❌ ERRORS ENCOUNTERED: ${stats.errors.length}\n`);
  stats.errors.slice(0, 5).forEach(err => {
    console.log(`   Line ${err.line}: ${err.error}`);
    console.log(`   Data: ${err.data}\n`);
  });
}

console.log(`\n✅ Output written to:`);
console.log(`   ${OUTPUT_PATH}\n`);

console.log(`📋 Expected vs Actual:\n`);
console.log(`   Expected: 253-255 transactions`);
console.log(`   Actual:   ${stats.totalParsed} transactions`);
const variance = ((stats.totalParsed - 255) / 255 * 100).toFixed(1);
console.log(`   Variance: ${variance}%\n`);

if (Math.abs(parseFloat(variance)) > 5) {
  console.log(`⚠️  WARNING: Variance exceeds ±5% threshold`);
  console.log(`   Review parsed data before proceeding to import.\n`);
} else {
  console.log(`✅ Variance within acceptable range (±5%)\n`);
  console.log(`🎯 READY FOR PHASE 3: Database Import\n`);
}
