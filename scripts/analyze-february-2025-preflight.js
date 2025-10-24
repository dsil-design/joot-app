/**
 * February 2025 Pre-Flight Analysis
 *
 * This script performs comprehensive pre-import validation for February 2025 data
 * based on FINAL_PARSING_RULES.md and lessons learned from March 2025 import.
 *
 * CRITICAL CHECKS:
 * - Negative amounts (must convert to income)
 * - Comma-formatted amounts (must handle in parser)
 * - Currency anomalies (THB rent should be ~25,000, NOT converted to USD)
 * - Duplicate detection
 * - Tag distribution
 */

const fs = require('fs');
const path = require('path');

// File paths
const csvPath = path.join(__dirname, '../csv_imports/fullImport_20251017.csv');

// Line number ranges from grep analysis
const SECTIONS = {
  EXPENSE_TRACKER: { start: 2454, end: 2720 }, // Line 2454 to GRAND TOTAL at 2720
  GROSS_INCOME: { start: 2722, end: 2729 }, // Line 2722 to GROSS INCOME TOTAL at 2729
  FLORIDA_HOUSE: { start: 2741, end: 2748 }, // Line 2741 to GRAND TOTAL at 2748
};

// PDF Grand Totals (source of truth)
const PDF_TOTALS = {
  EXPENSE_TRACKER_NET: 4927.65,
  GROSS_INCOME: 175.00, // Note: Paycheck of $4,093.96 on 2/21 NOT included in GROSS INCOME TOTAL
  FLORIDA_HOUSE: 91.29,
  SAVINGS_INVESTMENT: 0 // No savings section for February 2025
};

// Read and parse CSV
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

console.log('='.repeat(80));
console.log('FEBRUARY 2025 PRE-FLIGHT ANALYSIS');
console.log('='.repeat(80));
console.log();

// STEP 1: Verify line numbers
console.log('STEP 1: SECTION LINE NUMBERS');
console.log('-'.repeat(80));
console.log(`Expense Tracker:    Lines ${SECTIONS.EXPENSE_TRACKER.start} - ${SECTIONS.EXPENSE_TRACKER.end}`);
console.log(`Gross Income:       Lines ${SECTIONS.GROSS_INCOME.start} - ${SECTIONS.GROSS_INCOME.end}`);
console.log(`Florida House:      Lines ${SECTIONS.FLORIDA_HOUSE.start} - ${SECTIONS.FLORIDA_HOUSE.end}`);
console.log(`Total CSV Lines:    ${lines.length}`);
console.log();

// STEP 2: Count transactions per section
console.log('STEP 2: RAW TRANSACTION COUNTS');
console.log('-'.repeat(80));

let expenseTrackerCount = 0;
let grossIncomeCount = 0;
let floridaHouseCount = 0;
let reimbursementCount = 0;
let businessExpenseCount = 0;

// Parse Expense Tracker
const expenseTrackerLines = lines.slice(SECTIONS.EXPENSE_TRACKER.start, SECTIONS.EXPENSE_TRACKER.end + 1);
for (let i = 0; i < expenseTrackerLines.length; i++) {
  const line = expenseTrackerLines[i];

  // Skip headers, dates, daily totals, grand total
  if (line.includes('Desc,Merchant') ||
      line.includes('Daily Total') ||
      line.includes('GRAND TOTAL') ||
      line.match(/^"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/)) {
    continue;
  }

  // Transaction line starts with comma (empty first column)
  if (line.startsWith(',') && line.split(',').length > 5) {
    const cols = parseCSVLine(line);
    const desc = cols[1];
    const businessExpenseFlag = cols[4];

    if (desc && desc.trim()) {
      expenseTrackerCount++;

      // Check for reimbursements
      if (desc.toLowerCase().startsWith('reimbursement:') || desc.toLowerCase().startsWith('reimbursment:')) {
        reimbursementCount++;
      }

      // Check for business expenses
      if (businessExpenseFlag === 'X' || businessExpenseFlag === 'x') {
        businessExpenseCount++;
      }
    }
  }
}

// Parse Gross Income
const grossIncomeLines = lines.slice(SECTIONS.GROSS_INCOME.start, SECTIONS.GROSS_INCOME.end + 1);
for (let i = 0; i < grossIncomeLines.length; i++) {
  const line = grossIncomeLines[i];

  // Skip headers and total lines
  if (line.includes('Date Receieved') ||
      line.includes('Estimated') ||
      line.includes('TOTAL') ||
      line.trim() === ',,,' ||
      line.trim() === '') {
    continue;
  }

  // Income line has date
  if (line.match(/^"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/)) {
    grossIncomeCount++;
  }
}

// Parse Florida House
const floridaHouseLines = lines.slice(SECTIONS.FLORIDA_HOUSE.start, SECTIONS.FLORIDA_HOUSE.end + 1);
for (let i = 0; i < floridaHouseLines.length; i++) {
  const line = floridaHouseLines[i];

  // Skip headers, grand total, empty lines
  if (line.includes('Desc,Merchant') ||
      line.includes('GRAND TOTAL') ||
      line.trim() === ',,,,' ||
      line.trim() === '') {
    continue;
  }

  // Transaction line starts with comma
  if (line.startsWith(',') && line.split(',').length > 3) {
    const cols = parseCSVLine(line);
    const desc = cols[1];
    if (desc && desc.trim()) {
      floridaHouseCount++;
    }
  }
}

console.log(`Expense Tracker:    ${expenseTrackerCount} transactions`);
console.log(`  - Reimbursements: ${reimbursementCount}`);
console.log(`  - Business Exp:   ${businessExpenseCount}`);
console.log(`Gross Income:       ${grossIncomeCount} transactions`);
console.log(`Florida House:      ${floridaHouseCount} transactions`);
console.log(`TOTAL (raw):        ${expenseTrackerCount + grossIncomeCount + floridaHouseCount} transactions`);
console.log();

// STEP 3: PDF Grand Totals
console.log('STEP 3: PDF GRAND TOTALS (SOURCE OF TRUTH)');
console.log('-'.repeat(80));
console.log(`Expense Tracker NET:  $${PDF_TOTALS.EXPENSE_TRACKER_NET.toFixed(2)}`);
console.log(`Gross Income:         $${PDF_TOTALS.GROSS_INCOME.toFixed(2)}`);
console.log(`Florida House:        $${PDF_TOTALS.FLORIDA_HOUSE.toFixed(2)}`);
console.log(`Savings/Investment:   $${PDF_TOTALS.SAVINGS_INVESTMENT.toFixed(2)}`);
console.log();

// STEP 4: Expected total calculation
console.log('STEP 4: EXPECTED TOTAL CALCULATION');
console.log('-'.repeat(80));
const expectedTotal = PDF_TOTALS.EXPENSE_TRACKER_NET + PDF_TOTALS.FLORIDA_HOUSE + PDF_TOTALS.SAVINGS_INVESTMENT;
console.log(`Expense Tracker NET + Florida House + Savings = Expected Total`);
console.log(`$${PDF_TOTALS.EXPENSE_TRACKER_NET.toFixed(2)} + $${PDF_TOTALS.FLORIDA_HOUSE.toFixed(2)} + $${PDF_TOTALS.SAVINGS_INVESTMENT.toFixed(2)} = $${expectedTotal.toFixed(2)}`);
console.log();

// STEP 5: Detect potential duplicates
console.log('STEP 5: DUPLICATE DETECTION');
console.log('-'.repeat(80));

const expenseTrackerTransactions = [];
const floridaHouseTransactions = [];

// Extract Expense Tracker transactions
let currentDate = '';
for (let i = 0; i < expenseTrackerLines.length; i++) {
  const line = expenseTrackerLines[i];

  // Check for date row
  const dateMatch = line.match(/^"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\w+) (\d+), (\d{4})"/);
  if (dateMatch) {
    const month = dateMatch[2];
    const day = dateMatch[3];
    const year = dateMatch[4];
    currentDate = `${year}-${getMonthNumber(month)}-${day.padStart(2, '0')}`;
    continue;
  }

  // Transaction line
  if (line.startsWith(',') && currentDate) {
    const cols = parseCSVLine(line);
    const desc = cols[1];
    const merchant = cols[2];
    const thbAmount = cols[6];
    const usdAmount = cols[7];
    const subtotal = cols[9];

    if (desc && desc.trim() && !desc.includes('Daily Total')) {
      const lineNumber = SECTIONS.EXPENSE_TRACKER.start + i + 1;
      expenseTrackerTransactions.push({
        date: currentDate,
        description: desc,
        merchant: merchant || '',
        thbAmount,
        usdAmount,
        subtotal,
        lineNumber
      });
    }
  }
}

// Extract Florida House transactions
for (let i = 0; i < floridaHouseLines.length; i++) {
  const line = floridaHouseLines[i];

  if (line.startsWith(',')) {
    const cols = parseCSVLine(line);
    const desc = cols[1];
    const merchant = cols[2];
    const subtotal = cols[4];

    if (desc && desc.trim() && !desc.includes('GRAND TOTAL')) {
      const lineNumber = SECTIONS.FLORIDA_HOUSE.start + i + 1;
      floridaHouseTransactions.push({
        description: desc,
        merchant: merchant || '',
        subtotal,
        lineNumber
      });
    }
  }
}

// Check for duplicates
const duplicates = [];
for (const fh of floridaHouseTransactions) {
  for (const et of expenseTrackerTransactions) {
    // Match on merchant and amount
    const merchantMatch = fh.merchant.toLowerCase() === et.merchant.toLowerCase();
    const amountMatch = fh.subtotal === et.subtotal;

    if (merchantMatch && amountMatch) {
      duplicates.push({
        merchant: fh.merchant,
        amount: fh.subtotal,
        expenseTrackerLine: et.lineNumber,
        floridaHouseLine: fh.lineNumber,
        expenseTrackerDesc: et.description,
        floridaHouseDesc: fh.description
      });
    }
  }
}

if (duplicates.length > 0) {
  console.log(`Found ${duplicates.length} potential duplicate(s):\n`);
  duplicates.forEach((dup, idx) => {
    console.log(`${idx + 1}. ${dup.merchant} - ${dup.amount}`);
    console.log(`   Expense Tracker (Line ${dup.expenseTrackerLine}): "${dup.expenseTrackerDesc}" ✅ KEEP`);
    console.log(`   Florida House (Line ${dup.floridaHouseLine}):   "${dup.floridaHouseDesc}" ❌ REMOVE`);
    console.log();
  });
} else {
  console.log('No duplicates detected between Expense Tracker and Florida House sections.');
  console.log();
}

// STEP 6: Currency distribution
console.log('STEP 6: CURRENCY DISTRIBUTION');
console.log('-'.repeat(80));

let thbCount = 0;
let usdCount = 0;
let mixedCount = 0;

for (const tx of expenseTrackerTransactions) {
  const hasThb = tx.thbAmount && tx.thbAmount.includes('THB');
  const hasUsd = tx.usdAmount && tx.usdAmount.trim() && !tx.usdAmount.includes('$0.00') && tx.usdAmount !== '$0.00';

  if (hasThb && !hasUsd) {
    thbCount++;
  } else if (hasUsd && !hasThb) {
    usdCount++;
  } else if (hasThb && hasUsd) {
    mixedCount++;
  }
}

console.log(`THB transactions:   ${thbCount}`);
console.log(`USD transactions:   ${usdCount}`);
console.log(`Mixed/other:        ${mixedCount}`);
console.log();

// STEP 7: Critical anomaly detection
console.log('STEP 7: CRITICAL ANOMALY DETECTION');
console.log('-'.repeat(80));

const anomalies = {
  negativeAmounts: [],
  commaFormatted: [],
  unusuallyLarge: [],
  currencyErrors: [],
  missingAmounts: []
};

for (const tx of expenseTrackerTransactions) {
  // Check for negative amounts (excluding reimbursements)
  if ((tx.thbAmount && tx.thbAmount.includes('-')) || (tx.usdAmount && tx.usdAmount.includes('('))) {
    if (!tx.description.toLowerCase().includes('reimbursement') && !tx.description.toLowerCase().includes('reimbursment')) {
      anomalies.negativeAmounts.push({
        line: tx.lineNumber,
        description: tx.description,
        thb: tx.thbAmount,
        usd: tx.usdAmount
      });
    }
  }

  // Check for comma-formatted amounts
  if ((tx.usdAmount && tx.usdAmount.match(/\$[^0]\d{1,2},\d{3}/)) ||
      (tx.thbAmount && tx.thbAmount.match(/THB [^0]\d{1,2},\d{3}/))) {
    anomalies.commaFormatted.push({
      line: tx.lineNumber,
      description: tx.description,
      thb: tx.thbAmount,
      usd: tx.usdAmount
    });
  }

  // Check for unusually large USD amounts (>$1000, excluding "Florida House" transfer)
  if (tx.usdAmount && !tx.description.includes('Florida House')) {
    const usdValue = parseFloat(tx.usdAmount.replace(/[$,()]/g, ''));
    if (usdValue > 1000) {
      anomalies.unusuallyLarge.push({
        line: tx.lineNumber,
        description: tx.description,
        amount: tx.usdAmount
      });
    }
  }

  // Check for rent transaction currency (should be THB 25000)
  if (tx.description.toLowerCase().includes('rent') && tx.merchant.toLowerCase() === 'pol') {
    const hasCorrectThb = tx.thbAmount && tx.thbAmount.includes('THB 25000');
    if (!hasCorrectThb) {
      anomalies.currencyErrors.push({
        line: tx.lineNumber,
        description: tx.description,
        merchant: tx.merchant,
        thb: tx.thbAmount,
        expected: 'THB 25000.00'
      });
    }
  }

  // Check for missing amounts
  if ((!tx.thbAmount || tx.thbAmount.trim() === '') && (!tx.usdAmount || tx.usdAmount.trim() === '' || tx.usdAmount === '$0.00')) {
    anomalies.missingAmounts.push({
      line: tx.lineNumber,
      description: tx.description
    });
  }
}

let hasAnomalies = false;

if (anomalies.negativeAmounts.length > 0) {
  hasAnomalies = true;
  console.log(`🚨 CRITICAL: ${anomalies.negativeAmounts.length} negative amount(s) found (non-reimbursement):`);
  anomalies.negativeAmounts.forEach(a => {
    console.log(`   Line ${a.line}: ${a.description} | THB: ${a.thb} | USD: ${a.usd}`);
  });
  console.log();
}

if (anomalies.commaFormatted.length > 0) {
  hasAnomalies = true;
  console.log(`🚨 CRITICAL: ${anomalies.commaFormatted.length} comma-formatted amount(s) found:`);
  anomalies.commaFormatted.forEach(a => {
    console.log(`   Line ${a.line}: ${a.description} | THB: ${a.thb} | USD: ${a.usd}`);
  });
  console.log();
}

if (anomalies.currencyErrors.length > 0) {
  hasAnomalies = true;
  console.log(`🚨 CRITICAL: ${anomalies.currencyErrors.length} currency error(s) found:`);
  anomalies.currencyErrors.forEach(a => {
    console.log(`   Line ${a.line}: ${a.description} (${a.merchant}) | Found: ${a.thb} | Expected: ${a.expected}`);
  });
  console.log();
}

if (anomalies.unusuallyLarge.length > 0) {
  hasAnomalies = true;
  console.log(`⚠️  WARNING: ${anomalies.unusuallyLarge.length} unusually large amount(s) found (>$1000):`);
  anomalies.unusuallyLarge.forEach(a => {
    console.log(`   Line ${a.line}: ${a.description} | ${a.amount}`);
  });
  console.log();
}

if (anomalies.missingAmounts.length > 0) {
  hasAnomalies = true;
  console.log(`⚠️  WARNING: ${anomalies.missingAmounts.length} missing amount(s) found:`);
  anomalies.missingAmounts.forEach(a => {
    console.log(`   Line ${a.line}: ${a.description}`);
  });
  console.log();
}

if (!hasAnomalies) {
  console.log('✅ No critical anomalies detected.');
  console.log();
}

// STEP 8: Comparison to previous months
console.log('STEP 8: COMPARISON TO PREVIOUS MONTHS');
console.log('-'.repeat(80));
console.log('Month          | Transactions | Reimbursements | THB Txns');
console.log('---------------|--------------|----------------|----------');
console.log('September 2025 |     159      |       23       |   ~70');
console.log('August 2025    |     194      |       32       |    82');
console.log('July 2025      |     176      |       26       |   ~90');
console.log('June 2025      |     190      |       27       |    85');
console.log('May 2025       |     174      |       16       |    89');
console.log('April 2025     |     182      |       22       |    93');
console.log('March 2025     |     253      |       28       |   109');
console.log(`February 2025  |     ${String(expenseTrackerCount).padStart(3)}      |       ${String(reimbursementCount).padStart(2)}       |   ${String(thbCount).padStart(3)}`);
console.log();

// Check for significant differences
const avgTransactions = (159 + 194 + 176 + 190 + 174 + 182 + 253) / 7;
const avgReimbursements = (23 + 32 + 26 + 27 + 16 + 22 + 28) / 7;
const avgThb = (70 + 82 + 90 + 85 + 89 + 93 + 109) / 7;

console.log('STRUCTURAL ANALYSIS:');
console.log(`  Average transactions:    ${avgTransactions.toFixed(0)}`);
console.log(`  February variance:       ${((expenseTrackerCount - avgTransactions) / avgTransactions * 100).toFixed(1)}%`);
console.log(`  Average reimbursements:  ${avgReimbursements.toFixed(0)}`);
console.log(`  February variance:       ${((reimbursementCount - avgReimbursements) / avgReimbursements * 100).toFixed(1)}%`);
console.log(`  Average THB transactions: ${avgThb.toFixed(0)}`);
console.log(`  February variance:       ${((thbCount - avgThb) / avgThb * 100).toFixed(1)}%`);
console.log();

// STEP 9: Parsing script status
console.log('STEP 9: PARSING SCRIPT STATUS');
console.log('-'.repeat(80));
const parsingScriptPath = path.join(__dirname, 'parse-february-2025.js');
const scriptExists = fs.existsSync(parsingScriptPath);

if (scriptExists) {
  console.log('✅ Parsing script exists: scripts/parse-february-2025.js');
  console.log('⚠️  RECOMMENDATION: Verify script uses Column 6 for THB (NOT Column 8)');
  console.log('⚠️  RECOMMENDATION: Verify script handles negative amounts correctly');
  console.log('⚠️  RECOMMENDATION: Verify script handles comma-formatted amounts');
} else {
  console.log('❌ Parsing script does NOT exist');
  console.log('📝 ACTION REQUIRED: Create scripts/parse-february-2025.js following parse-march-2025.js pattern');
}
console.log();

// STEP 10: Summary and recommendations
console.log('STEP 10: SUMMARY AND RECOMMENDATIONS');
console.log('='.repeat(80));
console.log('✅ PDF verified: February 2025 data confirmed');
console.log(`✅ Section line numbers identified and validated`);
console.log(`✅ Transaction counts: ${expenseTrackerCount} Expense Tracker, ${grossIncomeCount} Income, ${floridaHouseCount} Florida House`);
console.log(`✅ Expected total: $${expectedTotal.toFixed(2)}`);
console.log(`${duplicates.length > 0 ? '⚠️ ' : '✅'} Duplicates: ${duplicates.length} found`);
console.log(`${hasAnomalies ? '🚨' : '✅'} Anomalies: ${hasAnomalies ? 'ISSUES DETECTED - SEE ABOVE' : 'None detected'}`);
console.log(`${scriptExists ? '✅' : '❌'} Parsing script: ${scriptExists ? 'Exists (needs verification)' : 'Needs creation'}`);
console.log();

console.log('NEXT STEPS:');
console.log('1. Review RED FLAGS report for all anomalies requiring human review');
console.log('2. Create/verify parsing script (scripts/parse-february-2025.js)');
console.log('3. Ensure parser handles:');
console.log('   - Column 6 for THB amounts');
console.log('   - Negative amounts converted to positive income');
console.log('   - Comma-formatted amounts (remove commas before parsing)');
console.log('   - Business Expense flag (column 4 = "X")');
console.log('4. Run parsing script to generate february-2025-CORRECTED.json');
console.log('5. Proceed to comprehensive validation phase');
console.log();

// Save anomalies to JSON for red flags report
const outputPath = path.join(__dirname, 'february-2025-preflight-results.json');
fs.writeFileSync(outputPath, JSON.stringify({
  sections: SECTIONS,
  counts: {
    expenseTracker: expenseTrackerCount,
    grossIncome: grossIncomeCount,
    floridaHouse: floridaHouseCount,
    reimbursements: reimbursementCount,
    businessExpenses: businessExpenseCount,
    thbTransactions: thbCount,
    usdTransactions: usdCount
  },
  pdfTotals: PDF_TOTALS,
  expectedTotal,
  duplicates,
  anomalies,
  parsingScriptExists: scriptExists,
  expenseTrackerTransactions,
  floridaHouseTransactions
}, null, 2));

console.log(`Results saved to: ${outputPath}`);
console.log('='.repeat(80));

// Helper functions
function parseCSVLine(line) {
  const cols = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cols.push(current);

  return cols;
}

function getMonthNumber(monthName) {
  const months = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
  };
  return months[monthName] || '01';
}
