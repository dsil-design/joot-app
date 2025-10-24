const fs = require('fs');
const path = require('path');

// Read the CSV file
const csvPath = path.join(__dirname, '..', 'csv_imports', 'fullImport_20251017.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

console.log('='.repeat(80));
console.log('MARCH 2025 COMPREHENSIVE PRE-FLIGHT ANALYSIS');
console.log('='.repeat(80));
console.log();

// Find March 2025 sections
let expenseStart = -1;
let expenseEnd = -1;
let incomeStart = -1;
let incomeEnd = -1;
let savingsStart = -1;
let savingsEnd = -1;
let floridaStart = -1;
let floridaEnd = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Find Expense Tracker start
  if (line.includes('Saturday, March 1, 2025')) {
    expenseStart = i;
  }

  // Find Expense Tracker end (GRAND TOTAL)
  if (expenseStart > 0 && expenseEnd === -1 && line.includes('GRAND TOTAL') && i > expenseStart + 100) {
    expenseEnd = i;
  }

  // Find Income Tracker
  if (line.includes('March 2025: Personal Income Tracker')) {
    incomeStart = i;
  }

  if (incomeStart > 0 && incomeEnd === -1 && line.includes('GROSS INCOME TOTAL')) {
    incomeEnd = i;
  }

  // Find Savings section
  if (line.includes('March 2025: Personal Savings & Investments')) {
    savingsStart = i;
  }

  if (savingsStart > 0 && savingsEnd === -1 && line.includes('March 2025: Deficit/Surplus')) {
    savingsEnd = i - 1;
  }

  // Find Florida House
  if (line.includes('March 2025: Florida House Expenses')) {
    floridaStart = i;
  }

  if (floridaStart > 0 && floridaEnd === -1 && line.includes('February 2025: Expense Tracker')) {
    floridaEnd = i - 1;
  }
}

console.log('📍 SECTION LINE RANGES');
console.log('-'.repeat(80));
console.log(`Expense Tracker:            Lines ${expenseStart} - ${expenseEnd}`);
console.log(`Gross Income Tracker:       Lines ${incomeStart} - ${incomeEnd}`);
console.log(`Personal Savings:           Lines ${savingsStart} - ${savingsEnd}`);
console.log(`Florida House Expenses:     Lines ${floridaStart} - ${floridaEnd}`);
console.log();

// Parse Expense Tracker
let currentDate = '';
let expenseTransactions = [];
let reimbursements = [];
let thbTransactions = [];
let usdTransactions = [];
let businessExpenses = [];
let reimbursables = [];
let negativeAmounts = [];
let largeAmounts = [];

for (let i = expenseStart; i <= expenseEnd; i++) {
  const line = lines[i];
  const parts = line.split(',');

  // Detect date rows
  if (parts[0] && parts[0].match(/^\"\w+, March \d+, 2025\"/)) {
    currentDate = parts[0].replace(/"/g, '');
    continue;
  }

  // Skip non-transaction rows
  if (!parts[1] || parts[1].includes('Daily Total') || parts[1].includes('GRAND TOTAL') ||
      parts[1].includes('Desc') || parts[1] === '') {
    continue;
  }

  const desc = parts[1];
  const merchant = parts[2];
  const reimbursable = parts[3];
  const businessExpense = parts[4];
  const paymentMethod = parts[5];
  const thbCol = parts[6];
  const usdCol = parts[7];
  const subtotal = parts[9];

  // Parse amount and currency
  let amount = 0;
  let currency = '';

  if (thbCol && thbCol.includes('THB')) {
    const match = thbCol.match(/THB\s*([-\d,]+\.?\d*)/);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ''));
      currency = 'THB';
      thbTransactions.push({ line: i, desc, merchant, amount, date: currentDate });
    }
  } else if (usdCol && usdCol.trim()) {
    const cleaned = usdCol.replace(/[$,"()]/g, '').trim();
    // Check for parentheses indicating negative
    const isNegative = usdCol.includes('(');
    amount = parseFloat(cleaned);
    if (isNegative) amount = -amount;
    currency = 'USD';
    usdTransactions.push({ line: i, desc, merchant, amount, date: currentDate });
  }

  // Detect negative amounts (refunds, etc)
  if (amount < 0 || usdCol.includes('(')) {
    negativeAmounts.push({ line: i, desc, merchant, amount, currency, date: currentDate });
  }

  // Detect large amounts (>$500 USD equivalent)
  const usdEquiv = currency === 'THB' ? amount * 0.0292 : amount;
  if (usdEquiv > 500 && !desc.includes('Reimbursement')) {
    largeAmounts.push({ line: i, desc, merchant, amount, currency, date: currentDate });
  }

  // Check for reimbursements
  if (desc.toLowerCase().includes('reimbursement:')) {
    reimbursements.push({ line: i, desc, merchant, amount, currency, date: currentDate });
  }

  // Check for business expenses
  if (businessExpense && (businessExpense.includes('X') || businessExpense.includes('x'))) {
    businessExpenses.push({ line: i, desc, merchant, amount, currency, date: currentDate });
  }

  // Check for reimbursables (tracking only, no tag)
  if (reimbursable && (reimbursable.includes('X') || reimbursable.includes('x'))) {
    reimbursables.push({ line: i, desc, merchant, amount, currency, date: currentDate });
  }

  expenseTransactions.push({
    line: i,
    desc,
    merchant,
    amount,
    currency,
    date: currentDate,
    reimbursable,
    businessExpense
  });
}

console.log('📊 EXPENSE TRACKER STATISTICS');
console.log('-'.repeat(80));
console.log(`Total Transactions:         ${expenseTransactions.length}`);
console.log(`  - USD Transactions:       ${usdTransactions.length}`);
console.log(`  - THB Transactions:       ${thbTransactions.length}`);
console.log(`Reimbursements:             ${reimbursements.length}`);
console.log(`Business Expenses:          ${businessExpenses.length}`);
console.log(`Reimbursables (tracking):   ${reimbursables.length}`);
console.log(`Negative Amounts:           ${negativeAmounts.length}`);
console.log(`Large Amounts (>$500):      ${largeAmounts.length}`);
console.log();

// Parse Income Tracker
let incomeTransactions = [];
for (let i = incomeStart; i <= incomeEnd; i++) {
  const line = lines[i];
  const parts = line.split(',');

  if (!parts[1] || parts[1].includes('Description') || parts[1].includes('Estimated') ||
      parts[1].includes('GROSS INCOME') || parts[1] === '') {
    continue;
  }

  const date = parts[0].replace(/"/g, '');
  const desc = parts[1];
  const source = parts[2];
  const amount = parts[3];

  if (date && desc && amount) {
    incomeTransactions.push({ line: i, date, desc, source, amount });
  }
}

console.log('💰 GROSS INCOME TRACKER STATISTICS');
console.log('-'.repeat(80));
console.log(`Total Income Entries:       ${incomeTransactions.length}`);
console.log();

// Parse Savings
let savingsTransactions = [];
for (let i = savingsStart; i <= savingsEnd; i++) {
  const line = lines[i];
  const parts = line.split(',');

  if (!parts[1] || parts[1].includes('Description') || parts[1].includes('TOTAL') || parts[1] === '') {
    continue;
  }

  const date = parts[0];
  const desc = parts[1];
  const vendor = parts[2];
  const source = parts[3];
  const amount = parts[4];

  if (desc && vendor) {
    savingsTransactions.push({ line: i, date, desc, vendor, source, amount });
  }
}

console.log('💎 SAVINGS & INVESTMENTS STATISTICS');
console.log('-'.repeat(80));
console.log(`Total Savings Entries:      ${savingsTransactions.length}`);
console.log();

// Parse Florida House
let floridaTransactions = [];
currentDate = '';
for (let i = floridaStart; i <= floridaEnd; i++) {
  const line = lines[i];
  const parts = line.split(',');

  // Detect date rows
  if (parts[0] && parts[0].match(/^\"\w+, March \d+, 2025\"/)) {
    currentDate = parts[0].replace(/"/g, '');
    continue;
  }

  if (!parts[1] || parts[1].includes('Desc') || parts[1].includes('GRAND TOTAL') || parts[1] === '') {
    continue;
  }

  const desc = parts[1];
  const merchant = parts[2];
  const reimbursement = parts[3];
  const paymentType = parts[4];
  const subtotal = parts[5];

  if (desc && merchant) {
    floridaTransactions.push({
      line: i,
      desc,
      merchant,
      amount: subtotal,
      date: currentDate,
      reimbursement,
      paymentType
    });
  }
}

console.log('🏠 FLORIDA HOUSE EXPENSES STATISTICS');
console.log('-'.repeat(80));
console.log(`Total Florida Entries:      ${floridaTransactions.length}`);
console.log();

// DUPLICATE DETECTION
console.log('🔍 DUPLICATE DETECTION');
console.log('-'.repeat(80));

const duplicates = [];

// Check for Xfinity (known from user decisions)
const xfinityExpense = expenseTransactions.find(t =>
  t.merchant && t.merchant.toLowerCase().includes('xfinity')
);
const xfinityFlorida = floridaTransactions.find(t =>
  t.merchant && t.merchant.toLowerCase().includes('xfinity')
);

if (xfinityExpense && xfinityFlorida) {
  console.log('✅ CONFIRMED DUPLICATE: Xfinity Internet');
  console.log(`   Expense Tracker (Line ${xfinityExpense.line}): ${xfinityExpense.desc} - ${xfinityExpense.merchant} - $73.00`);
  console.log(`   Florida House (Line ${xfinityFlorida.line}): ${xfinityFlorida.desc} - ${xfinityFlorida.merchant} - $73.00`);
  console.log('   ✓ User Decision: Keep Expense Tracker version, SKIP Florida House version');
  duplicates.push({
    merchant: 'Xfinity',
    expenseLine: xfinityExpense.line,
    floridaLine: xfinityFlorida.line,
    amount: '$73.00',
    resolution: 'Keep Expense Tracker'
  });
}

// Check for Pest Control (may also be duplicate)
const pestExpense = expenseTransactions.find(t =>
  t.merchant && t.merchant.toLowerCase().includes('pest')
);
const pestFlorida = floridaTransactions.find(t =>
  t.merchant && t.merchant.toLowerCase().includes('pest')
);

if (pestExpense && pestFlorida) {
  console.log();
  console.log('⚠️  POTENTIAL DUPLICATE: Pest Control');
  console.log(`   Expense Tracker (Line ${pestExpense.line}): ${pestExpense.desc} - ${pestExpense.merchant} - $110.00`);
  console.log(`   Florida House (Line ${pestFlorida.line}): ${pestFlorida.desc} - ${pestFlorida.merchant} - $110.00`);
  console.log('   📝 NEEDS DECISION: Based on April lessons, check if both needed for totals to match');
  duplicates.push({
    merchant: 'Pest Control',
    expenseLine: pestExpense.line,
    floridaLine: pestFlorida.line,
    amount: '$110.00',
    resolution: 'PENDING - Needs user decision'
  });
}

console.log();
console.log(`Total Duplicates Found:     ${duplicates.length}`);
console.log();

// NEGATIVE AMOUNTS REPORT
console.log('⚠️  NEGATIVE AMOUNTS DETECTED');
console.log('-'.repeat(80));
negativeAmounts.forEach(item => {
  console.log(`Line ${item.line}: ${item.desc} | ${item.merchant} | ${item.amount} ${item.currency} | ${item.date}`);
});
console.log();

// LARGE AMOUNTS REPORT
console.log('💵 LARGE AMOUNTS (>$500 USD)');
console.log('-'.repeat(80));
largeAmounts.forEach(item => {
  const usdEquiv = item.currency === 'THB' ? item.amount * 0.0292 : item.amount;
  console.log(`Line ${item.line}: ${item.desc} | ${item.merchant} | ${item.amount} ${item.currency} (~$${usdEquiv.toFixed(2)}) | ${item.date}`);
});
console.log();

// COMPARISON TO PREVIOUS MONTHS
console.log('📈 COMPARISON TO PREVIOUS MONTHS');
console.log('-'.repeat(80));
const previousMonths = [
  { month: 'September 2025', transactions: 159, reimbursements: 23, thb: 70 },
  { month: 'August 2025', transactions: 194, reimbursements: 32, thb: 82 },
  { month: 'July 2025', transactions: 176, reimbursements: 26, thb: 90 },
  { month: 'June 2025', transactions: 190, reimbursements: 27, thb: 85 },
  { month: 'May 2025', transactions: 174, reimbursements: 16, thb: 89 },
  { month: 'April 2025', transactions: 182, reimbursements: 22, thb: 93 }
];

console.log(`March 2025:     ${expenseTransactions.length} transactions, ${reimbursements.length} reimbursements, ${thbTransactions.length} THB`);
previousMonths.forEach(m => {
  console.log(`${m.month}:     ${m.transactions} transactions, ${m.reimbursements} reimbursements, ~${m.thb} THB`);
});
console.log();

const avgTransactions = previousMonths.reduce((sum, m) => sum + m.transactions, 0) / previousMonths.length;
const avgReimbursements = previousMonths.reduce((sum, m) => sum + m.reimbursements, 0) / previousMonths.length;
const avgThb = previousMonths.reduce((sum, m) => sum + m.thb, 0) / previousMonths.length;

console.log(`Average:        ${avgTransactions.toFixed(0)} transactions, ${avgReimbursements.toFixed(0)} reimbursements, ${avgThb.toFixed(0)} THB`);
console.log();

const transDiff = ((expenseTransactions.length - avgTransactions) / avgTransactions * 100).toFixed(1);
const reimbDiff = ((reimbursements.length - avgReimbursements) / avgReimbursements * 100).toFixed(1);
const thbDiff = ((thbTransactions.length - avgThb) / avgThb * 100).toFixed(1);

console.log(`Variance:       ${transDiff}% transactions, ${reimbDiff}% reimbursements, ${thbDiff}% THB`);
console.log();

// PARSING SCRIPT CHECK
console.log('🔧 PARSING SCRIPT STATUS');
console.log('-'.repeat(80));
const parseScriptPath = path.join(__dirname, 'parse-march-2025.js');
if (fs.existsSync(parseScriptPath)) {
  console.log('❌ parse-march-2025.js EXISTS but needs verification');
  console.log('   TODO: Verify it uses Column 6 for THB (NOT Column 8)');
  console.log('   TODO: Verify it uses Column 7/9 for USD (NOT Column 8)');
} else {
  console.log('❌ parse-march-2025.js DOES NOT EXIST');
  console.log('   TODO: Create script following parse-april-2025.js or parse-may-2025.js pattern');
}
console.log();

// PDF TOTALS (from PDF verification)
console.log('📄 PDF GRAND TOTALS (Source of Truth)');
console.log('-'.repeat(80));
console.log('Expense Tracker NET:        $12,204.52');
console.log('Gross Income:               $23,252.96');
console.log('Savings/Investment:         $0.00');
console.log('Florida House:              $312.76');
console.log();
console.log('Expected Total Expenses:    $12,204.52 + $312.76 = $12,517.28');
console.log('(Expense Tracker NET + Florida House)');
console.log();

// CRITICAL VERIFICATION
console.log('✅ CRITICAL VERIFICATIONS');
console.log('-'.repeat(80));
const rentTransaction = expenseTransactions.find(t =>
  t.desc && t.desc.toLowerCase().includes('rent') && t.currency === 'THB'
);
if (rentTransaction) {
  console.log(`✅ Rent Transaction: THB ${rentTransaction.amount.toLocaleString()} (Line ${rentTransaction.line})`);
  if (rentTransaction.amount === 35000) {
    console.log('   ✓ CORRECT: THB 35,000.00');
  } else {
    console.log(`   ❌ ERROR: Expected THB 35,000.00, found THB ${rentTransaction.amount}`);
  }
} else {
  console.log('❌ Rent transaction not found or not in THB');
}
console.log();

// Save detailed results
const results = {
  sections: {
    expenseTracker: { start: expenseStart, end: expenseEnd, count: expenseTransactions.length },
    grossIncome: { start: incomeStart, end: incomeEnd, count: incomeTransactions.length },
    savings: { start: savingsStart, end: savingsEnd, count: savingsTransactions.length },
    floridaHouse: { start: floridaStart, end: floridaEnd, count: floridaTransactions.length }
  },
  statistics: {
    totalTransactions: expenseTransactions.length,
    usdCount: usdTransactions.length,
    thbCount: thbTransactions.length,
    reimbursementCount: reimbursements.length,
    businessExpenseCount: businessExpenses.length,
    reimbursableCount: reimbursables.length,
    negativeAmountCount: negativeAmounts.length,
    largeAmountCount: largeAmounts.length
  },
  duplicates,
  negativeAmounts,
  largeAmounts,
  pdfTotals: {
    expenseTrackerNet: 12204.52,
    grossIncome: 23252.96,
    savings: 0,
    floridaHouse: 312.76,
    expectedTotal: 12517.28
  }
};

const outputPath = path.join(__dirname, 'march-2025-comprehensive-results.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`Results saved to: ${outputPath}`);
console.log();
console.log('='.repeat(80));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(80));
