const fs = require('fs');

// Parse CSV file
const csvPath = '/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

// Helper function to parse CSV line
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

// Helper function to parse amount
function parseAmount(amountStr) {
  if (!amountStr || amountStr.trim() === '') return 0;
  let cleaned = amountStr.replace(/[$,"\t()\s]/g, '').trim();
  const isNegative = amountStr.includes('(') && amountStr.includes(')');
  if (isNegative) {
    cleaned = '-' + cleaned.replace(/-/g, '');
  }
  return parseFloat(cleaned);
}

// Helper function to check if row is date
function isDateRow(row) {
  return row[0] && row[0].match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/);
}

// Helper function to check if row is transaction
function isTransactionRow(row) {
  return row[1] && row[1].length > 0 &&
         !row[1].toLowerCase().includes('total') &&
         !row[1].toLowerCase().includes('estimated') &&
         !row[1].toLowerCase().includes('subtotal');
}

const stats = {
  expenseTracker: { rawCount: 0, transactions: [] },
  grossIncome: { rawCount: 0, transactions: [] },
  savings: { rawCount: 0, transactions: [] },
  floridaHouse: { rawCount: 0, transactions: [] }
};

const redFlags = [];
const negativeAmounts = [];
const commaFormattedAmounts = [];
const typoReimbursements = [];
const dsilReimbursements = [];
const unusualTransactions = [];
const zeroAmounts = [];
const currencyBreakdown = { usd: 0, thb: 0, mixed: 0 };

console.log('========================================');
console.log('SEPTEMBER 2024 PRE-FLIGHT ANALYSIS');
console.log('========================================\n');

// SECTION 1: EXPENSE TRACKER (lines 3978-4251)
console.log('Analyzing Expense Tracker (lines 3978-4251)...');
let currentDate = null;

for (let i = 3977; i < 4252; i++) {
  const row = parseCSV(lines[i]);
  const lineNum = i + 1;

  // Check for date row
  if (isDateRow(row)) {
    currentDate = row[0];
    continue;
  }

  // Check for transaction row
  if (isTransactionRow(row)) {
    stats.expenseTracker.rawCount++;

    const desc = row[1];
    const merchant = row[2];
    const reimbursableFlag = row[3];
    const businessExpenseFlag = row[4];
    const paymentMethod = row[5];
    const thbCol = row[6];
    const usdCol = row[7];
    const subtotal = row[9];

    // Detect negative amounts
    if (usdCol && (usdCol.includes('(') || usdCol.includes('-'))) {
      negativeAmounts.push({
        line: lineNum,
        date: currentDate,
        description: desc,
        merchant: merchant,
        amount: usdCol,
        section: 'Expense Tracker'
      });
    }
    if (thbCol && (thbCol.includes('(') || thbCol.includes('-'))) {
      negativeAmounts.push({
        line: lineNum,
        date: currentDate,
        description: desc,
        merchant: merchant,
        amount: thbCol,
        section: 'Expense Tracker'
      });
    }

    // Detect comma-formatted amounts
    if ((usdCol && usdCol.includes(',')) || (thbCol && thbCol.includes(',')) || (subtotal && subtotal.includes(','))) {
      commaFormattedAmounts.push({
        line: lineNum,
        date: currentDate,
        description: desc,
        merchant: merchant,
        thb: thbCol,
        usd: usdCol,
        subtotal: subtotal,
        section: 'Expense Tracker'
      });
    }

    // Detect typo reimbursements
    const reimbRegex = /^Re(im|mi|m)?burs[e]?ment:?/i;
    if (desc && reimbRegex.test(desc) && !desc.match(/^Reimbursement:/i)) {
      typoReimbursements.push({
        line: lineNum,
        date: currentDate,
        description: desc,
        merchant: merchant,
        section: 'Expense Tracker'
      });
    }

    // Detect DSIL Design reimbursements
    if (desc && /reimbursement/i.test(desc) && merchant && /dsil|design|llc/i.test(merchant)) {
      dsilReimbursements.push({
        line: lineNum,
        date: currentDate,
        description: desc,
        merchant: merchant,
        section: 'Expense Tracker'
      });
    }

    // Detect unusual transactions (>$1000)
    const amount = parseAmount(usdCol || subtotal);
    if (amount > 1000) {
      unusualTransactions.push({
        line: lineNum,
        date: currentDate,
        description: desc,
        merchant: merchant,
        amount: amount,
        section: 'Expense Tracker'
      });
    }

    // Detect zero amounts
    if (amount === 0 && parseAmount(thbCol) === 0) {
      zeroAmounts.push({
        line: lineNum,
        date: currentDate,
        description: desc,
        merchant: merchant,
        section: 'Expense Tracker'
      });
    }

    // Currency breakdown
    if (thbCol && thbCol.includes('THB')) {
      currencyBreakdown.thb++;
    } else if (usdCol && parseAmount(usdCol) > 0) {
      currencyBreakdown.usd++;
    } else {
      currencyBreakdown.mixed++;
    }

    stats.expenseTracker.transactions.push({
      line: lineNum,
      date: currentDate,
      description: desc,
      merchant: merchant,
      reimbursable: reimbursableFlag,
      businessExpense: businessExpenseFlag,
      thb: thbCol,
      usd: usdCol,
      subtotal: subtotal
    });
  }
}

console.log(`✓ Found ${stats.expenseTracker.rawCount} transactions in Expense Tracker\n`);

// SECTION 2: GROSS INCOME TRACKER (lines 4253-4262)
console.log('Analyzing Gross Income Tracker (lines 4253-4262)...');

for (let i = 4253; i < 4263; i++) {
  const row = parseCSV(lines[i]);
  const lineNum = i + 1;

  // Skip header and summary rows
  if (row[0] && row[0].match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/) && row[1] && row[3]) {
    stats.grossIncome.rawCount++;

    const date = row[0];
    const desc = row[1];
    const merchant = row[2];
    const amount = row[3];

    // Detect comma-formatted amounts
    if (amount && amount.includes(',')) {
      commaFormattedAmounts.push({
        line: lineNum,
        date: date,
        description: desc,
        merchant: merchant,
        amount: amount,
        section: 'Gross Income'
      });
    }

    stats.grossIncome.transactions.push({
      line: lineNum,
      date: date,
      description: desc,
      merchant: merchant,
      amount: amount
    });
  }
}

console.log(`✓ Found ${stats.grossIncome.rawCount} transactions in Gross Income\n`);

// SECTION 3: PERSONAL SAVINGS & INVESTMENTS (lines 4264-4267)
console.log('Analyzing Personal Savings & Investments (lines 4264-4267)...');

for (let i = 4264; i < 4268; i++) {
  const row = parseCSV(lines[i]);
  const lineNum = i + 1;

  // Check for transaction (has description and amount)
  if (row[1] && row[4] && !row[1].toLowerCase().includes('total')) {
    stats.savings.rawCount++;

    const desc = row[1];
    const vendor = row[2];
    const source = row[3];
    const amount = row[4];

    // Detect comma-formatted amounts
    if (amount && amount.includes(',')) {
      commaFormattedAmounts.push({
        line: lineNum,
        description: desc,
        vendor: vendor,
        amount: amount,
        section: 'Savings/Investment'
      });
    }

    stats.savings.transactions.push({
      line: lineNum,
      description: desc,
      vendor: vendor,
      source: source,
      amount: amount
    });
  }
}

console.log(`✓ Found ${stats.savings.rawCount} transactions in Savings/Investment\n`);

// SECTION 4: FLORIDA HOUSE EXPENSES (lines 4279-4286)
console.log('Analyzing Florida House Expenses (lines 4279-4286)...');
let fhCurrentDate = null;

for (let i = 4279; i < 4287; i++) {
  const row = parseCSV(lines[i]);
  const lineNum = i + 1;

  // Check for date row
  if (isDateRow(row)) {
    fhCurrentDate = row[0];
    continue;
  }

  // Check for transaction row (column structure: ,Desc,Merchant,Payment Type,Subtotal)
  if (row[1] && row[4] && !row[1].toLowerCase().includes('total')) {
    stats.floridaHouse.rawCount++;

    const desc = row[1];
    const merchant = row[2];
    const paymentMethod = row[3];
    const amount = row[4];

    stats.floridaHouse.transactions.push({
      line: lineNum,
      date: fhCurrentDate,
      description: desc,
      merchant: merchant,
      paymentMethod: paymentMethod,
      amount: amount
    });
  }
}

console.log(`✓ Found ${stats.floridaHouse.rawCount} transactions in Florida House\n`);

// DUPLICATE DETECTION
console.log('Detecting potential duplicates between Expense Tracker and Florida House...');
const duplicates = [];

for (const fhTx of stats.floridaHouse.transactions) {
  for (const etTx of stats.expenseTracker.transactions) {
    // Check if same merchant, same amount, similar date
    if (fhTx.merchant && etTx.merchant &&
        fhTx.merchant.toLowerCase() === etTx.merchant.toLowerCase() &&
        parseAmount(fhTx.amount) === parseAmount(etTx.subtotal)) {
      duplicates.push({
        expenseTrackerLine: etTx.line,
        floridaHouseLine: fhTx.line,
        merchant: fhTx.merchant,
        amount: fhTx.amount,
        etDescription: etTx.description,
        fhDescription: fhTx.description
      });
    }
  }
}

console.log(`✓ Found ${duplicates.length} potential duplicate(s)\n`);

// TAG DISTRIBUTION
console.log('Analyzing tag distribution...');
const tagCounts = {
  reimbursement: 0,
  businessExpense: 0,
  reimbursable: 0,
  floridaHouse: stats.floridaHouse.rawCount,
  savingsInvestment: stats.savings.rawCount
};

for (const tx of stats.expenseTracker.transactions) {
  // Check for reimbursement (typo-aware)
  const reimbRegex = /^Re(im|mi|m)?burs[e]?ment:?/i;
  if (tx.description && reimbRegex.test(tx.description)) {
    // Exclude DSIL Design/LLC
    if (!tx.merchant || !/(dsil|design|llc)/i.test(tx.merchant)) {
      tagCounts.reimbursement++;
    }
  }

  // Check for business expense
  if (tx.businessExpense === 'X' || tx.businessExpense === 'x') {
    tagCounts.businessExpense++;
  }

  // Check for reimbursable (tracking only, no tag)
  if (tx.reimbursable === 'X' || tx.reimbursable === 'x') {
    tagCounts.reimbursable++;
  }
}

console.log(`✓ Tag distribution calculated\n`);

// GENERATE REPORTS
console.log('========================================');
console.log('SUMMARY REPORT');
console.log('========================================\n');

console.log('TRANSACTION COUNTS:');
console.log(`  Expense Tracker: ${stats.expenseTracker.rawCount} transactions`);
console.log(`  Gross Income: ${stats.grossIncome.rawCount} transactions`);
console.log(`  Savings/Investment: ${stats.savings.rawCount} transactions`);
console.log(`  Florida House: ${stats.floridaHouse.rawCount} transactions`);
console.log(`  TOTAL (before deduplication): ${stats.expenseTracker.rawCount + stats.grossIncome.rawCount + stats.savings.rawCount + stats.floridaHouse.rawCount}\n`);

console.log('CURRENCY BREAKDOWN:');
console.log(`  USD transactions: ${currencyBreakdown.usd}`);
console.log(`  THB transactions: ${currencyBreakdown.thb}`);
console.log(`  Mixed/Other: ${currencyBreakdown.mixed}`);
console.log(`  THB percentage: ${((currencyBreakdown.thb / stats.expenseTracker.rawCount) * 100).toFixed(1)}%\n`);

console.log('TAG DISTRIBUTION:');
console.log(`  Reimbursement: ${tagCounts.reimbursement} (income transactions)`);
console.log(`  Business Expense: ${tagCounts.businessExpense} (expense with tag)`);
console.log(`  Reimbursable: ${tagCounts.reimbursable} (tracking only, NO tag)`);
console.log(`  Florida House: ${tagCounts.floridaHouse} (expense with tag)`);
console.log(`  Savings/Investment: ${tagCounts.savingsInvestment} (expense with tag)\n`);

console.log('DUPLICATE DETECTION:');
if (duplicates.length > 0) {
  console.log(`  ⚠ Found ${duplicates.length} potential duplicate(s):`);
  duplicates.forEach((dup, idx) => {
    console.log(`    ${idx + 1}. ${dup.merchant} - ${dup.amount}`);
    console.log(`       Expense Tracker (line ${dup.expenseTrackerLine}): "${dup.etDescription}"`);
    console.log(`       Florida House (line ${dup.floridaHouseLine}): "${dup.fhDescription}"`);
  });
} else {
  console.log(`  ✓ No duplicates found`);
}
console.log('');

console.log('RED FLAGS:');
console.log(`  Negative amounts: ${negativeAmounts.length}`);
console.log(`  Comma-formatted amounts: ${commaFormattedAmounts.length}`);
console.log(`  Typo reimbursements: ${typoReimbursements.length}`);
console.log(`  DSIL Design reimbursements: ${dsilReimbursements.length}`);
console.log(`  Unusual transactions (>$1000): ${unusualTransactions.length}`);
console.log(`  Zero-dollar transactions: ${zeroAmounts.length}\n`);

// Save detailed findings to JSON
const report = {
  metadata: {
    month: 'September 2024',
    csvFile: 'fullImport_20251017.csv',
    analysisDate: new Date().toISOString(),
    lineRanges: {
      expenseTracker: '3978-4251',
      grossIncome: '4253-4262',
      savings: '4264-4267',
      floridaHouse: '4279-4286'
    }
  },
  stats: {
    transactionCounts: {
      expenseTracker: stats.expenseTracker.rawCount,
      grossIncome: stats.grossIncome.rawCount,
      savings: stats.savings.rawCount,
      floridaHouse: stats.floridaHouse.rawCount,
      totalBeforeDedup: stats.expenseTracker.rawCount + stats.grossIncome.rawCount + stats.savings.rawCount + stats.floridaHouse.rawCount
    },
    currencyBreakdown,
    tagCounts
  },
  duplicates,
  redFlags: {
    negativeAmounts,
    commaFormattedAmounts,
    typoReimbursements,
    dsilReimbursements,
    unusualTransactions,
    zeroAmounts
  }
};

fs.writeFileSync(
  '/Users/dennis/Code Projects/joot-app/scripts/september-2024-preflight-analysis.json',
  JSON.stringify(report, null, 2)
);

console.log('✓ Detailed analysis saved to september-2024-preflight-analysis.json');
console.log('========================================');
