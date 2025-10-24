const fs = require('fs');
const path = require('path');

// Read CSV file
const csvPath = path.join(__dirname, '../csv_imports/fullImport_20251017.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

// PDF Grand Totals (from Budget for Import-page7.pdf)
const PDF_TOTALS = {
  expenseTracker: 11035.98,
  grossIncome: 13094.69,
  savings: 341.67,
  floridaHouse: 1293.81
};

// Find April 2025 sections
let sections = {
  expenseTracker: { start: null, end: null, header: null },
  grossIncome: { start: null, end: null, header: null },
  savings: { start: null, end: null, header: null },
  floridaHouse: { start: null, end: null, header: null }
};

// Locate section boundaries
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('April 2025: Expense Tracker')) {
    sections.expenseTracker.start = i;
    sections.expenseTracker.header = i + 1;
  } else if (line.includes('April 2025: Gross Income Tracker')) {
    sections.expenseTracker.end = i - 1;
    sections.grossIncome.start = i;
    sections.grossIncome.header = i + 1;
  } else if (line.includes('April 2025: Personal Savings & Investments')) {
    sections.grossIncome.end = i - 1;
    sections.savings.start = i;
    sections.savings.header = i + 1;
  } else if (line.includes('April 2025: Florida House Expenses')) {
    sections.savings.end = i - 1;
    sections.floridaHouse.start = i;
    sections.floridaHouse.header = i + 1;
  } else if (line.includes('March 2025: Expense Tracker')) {
    sections.floridaHouse.end = i - 1;
  }
}

console.log('='.repeat(80));
console.log('APRIL 2025 PRE-FLIGHT ANALYSIS');
console.log('='.repeat(80));
console.log();

// 1. SECTION LINE NUMBERS
console.log('1. SECTION LINE NUMBERS');
console.log('-'.repeat(80));
console.log(`Expense Tracker: Lines ${sections.expenseTracker.start} - ${sections.expenseTracker.end}`);
console.log(`  Header at line: ${sections.expenseTracker.header}`);
console.log(`Gross Income Tracker: Lines ${sections.grossIncome.start} - ${sections.grossIncome.end}`);
console.log(`  Header at line: ${sections.grossIncome.header}`);
console.log(`Personal Savings & Investments: Lines ${sections.savings.start} - ${sections.savings.end}`);
console.log(`  Header at line: ${sections.savings.header}`);
console.log(`Florida House Expenses: Lines ${sections.floridaHouse.start} - ${sections.floridaHouse.end}`);
console.log(`  Header at line: ${sections.floridaHouse.header}`);
console.log();

// 2. COUNT TRANSACTIONS PER SECTION
console.log('2. RAW TRANSACTION COUNTS (Before Deduplication)');
console.log('-'.repeat(80));

function parseCSVLine(line) {
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

function isTransactionRow(cols, sectionType) {
  if (sectionType === 'expenseTracker') {
    // Skip headers, date rows, daily totals, grand totals, empty rows
    if (!cols[1] || cols[1] === 'Desc') return false;
    if (cols[1].includes('Daily Total')) return false;
    if (cols[1].includes('GRAND TOTAL')) return false;
    if (cols[0] && cols[0].match(/day,.*\d{4}/i)) return false; // Date rows
    if (cols[1] === '' && cols[2] === '') return false; // Empty rows
    return true;
  } else if (sectionType === 'grossIncome') {
    if (!cols[1] || cols[1] === 'Description') return false;
    if (cols[1].includes('Estimated')) return false;
    if (cols[1].includes('TOTAL')) return false;
    if (cols[0] && cols[0].match(/day,.*\d{4}/i) && !cols[1]) return false;
    return cols[1] && cols[1].trim() !== '';
  } else if (sectionType === 'savings') {
    if (!cols[1] || cols[1] === 'Description') return false;
    if (cols[1].includes('TOTAL')) return false;
    return cols[1] && cols[1].trim() !== '';
  } else if (sectionType === 'floridaHouse') {
    if (!cols[1] || cols[1] === 'Desc') return false;
    if (cols[1].includes('GRAND TOTAL')) return false;
    if (cols[0] && cols[0].match(/day,.*\d{4}/i)) return false;
    if (cols[1] === '' && cols[2] === '') return false;
    return true;
  }
  return false;
}

let expenseTrackerTxns = [];
let grossIncomeTxns = [];
let savingsTxns = [];
let floridaHouseTxns = [];

// Parse Expense Tracker
for (let i = sections.expenseTracker.header + 2; i <= sections.expenseTracker.end; i++) {
  const cols = parseCSVLine(lines[i]);
  if (isTransactionRow(cols, 'expenseTracker')) {
    expenseTrackerTxns.push({ line: i, cols, date: cols[0] || 'inherited' });
  }
}

// Parse Gross Income
for (let i = sections.grossIncome.header + 1; i <= sections.grossIncome.end; i++) {
  const cols = parseCSVLine(lines[i]);
  if (isTransactionRow(cols, 'grossIncome')) {
    grossIncomeTxns.push({ line: i, cols });
  }
}

// Parse Savings
for (let i = sections.savings.header + 1; i <= sections.savings.end; i++) {
  const cols = parseCSVLine(lines[i]);
  if (isTransactionRow(cols, 'savings')) {
    savingsTxns.push({ line: i, cols });
  }
}

// Parse Florida House
for (let i = sections.floridaHouse.header + 2; i <= sections.floridaHouse.end; i++) {
  const cols = parseCSVLine(lines[i]);
  if (isTransactionRow(cols, 'floridaHouse')) {
    floridaHouseTxns.push({ line: i, cols });
  }
}

console.log(`Expense Tracker: ${expenseTrackerTxns.length} transactions`);
console.log(`Gross Income: ${grossIncomeTxns.length} transactions`);
console.log(`Savings/Investments: ${savingsTxns.length} transactions`);
console.log(`Florida House: ${floridaHouseTxns.length} transactions`);
console.log(`TOTAL: ${expenseTrackerTxns.length + grossIncomeTxns.length + savingsTxns.length + floridaHouseTxns.length} transactions (before deduplication)`);
console.log();

// 3. PDF GRAND TOTALS
console.log('3. PDF GRAND TOTALS (Source of Truth)');
console.log('-'.repeat(80));
console.log(`Expense Tracker NET: $${PDF_TOTALS.expenseTracker.toFixed(2)}`);
console.log(`Gross Income: $${PDF_TOTALS.grossIncome.toFixed(2)}`);
console.log(`Savings/Investment: $${PDF_TOTALS.savings.toFixed(2)}`);
console.log(`Florida House: $${PDF_TOTALS.floridaHouse.toFixed(2)}`);
console.log();

// 4. EXPECTED TOTAL CALCULATION
console.log('4. EXPECTED TOTAL CALCULATION');
console.log('-'.repeat(80));
const expectedTotal = PDF_TOTALS.expenseTracker + PDF_TOTALS.floridaHouse + PDF_TOTALS.savings;
console.log(`Formula: Expense Tracker NET + Florida House + Savings`);
console.log(`Expected Total: $${PDF_TOTALS.expenseTracker.toFixed(2)} + $${PDF_TOTALS.floridaHouse.toFixed(2)} + $${PDF_TOTALS.savings.toFixed(2)} = $${expectedTotal.toFixed(2)}`);
console.log();

// 5. DUPLICATE DETECTION
console.log('5. POTENTIAL DUPLICATES BETWEEN SECTIONS');
console.log('-'.repeat(80));

let duplicates = [];
for (const etTxn of expenseTrackerTxns) {
  const etMerchant = etTxn.cols[2]?.toLowerCase().trim();
  const etAmount = etTxn.cols[9]?.replace(/[$,]/g, '');

  for (const fhTxn of floridaHouseTxns) {
    const fhMerchant = fhTxn.cols[2]?.toLowerCase().trim();
    const fhAmount = fhTxn.cols[5]?.replace(/[$,]/g, '');

    if (etMerchant && fhMerchant && etMerchant === fhMerchant &&
        etAmount && fhAmount && Math.abs(parseFloat(etAmount) - parseFloat(fhAmount)) < 0.01) {
      duplicates.push({
        merchant: etTxn.cols[2],
        amount: etAmount,
        etLine: etTxn.line,
        etDesc: etTxn.cols[1],
        fhLine: fhTxn.line,
        fhDesc: fhTxn.cols[1]
      });
    }
  }
}

if (duplicates.length === 0) {
  console.log('✓ No duplicates detected between Expense Tracker and Florida House');
} else {
  console.log(`⚠ Found ${duplicates.length} potential duplicate(s):`);
  duplicates.forEach((dup, idx) => {
    console.log(`\n${idx + 1}. ${dup.merchant} - $${dup.amount}`);
    console.log(`   Line ${dup.etLine} (Expense Tracker): "${dup.etDesc}" ✅ KEEP`);
    console.log(`   Line ${dup.fhLine} (Florida House): "${dup.fhDesc}" ❌ REMOVE`);
  });
}
console.log();

// 6. TAG CONDITIONS
console.log('6. TAG CONDITION COUNTS');
console.log('-'.repeat(80));

let reimbursements = expenseTrackerTxns.filter(t =>
  t.cols[1]?.toLowerCase().startsWith('reimbursement:')
);
let businessExpenses = expenseTrackerTxns.filter(t =>
  t.cols[4]?.toUpperCase() === 'X'
);
let reimbursables = expenseTrackerTxns.filter(t =>
  t.cols[3]?.toUpperCase() === 'X'
);

console.log(`Reimbursements (income, with tag): ${reimbursements.length} transactions`);
console.log(`  - Description starts with "Reimbursement:"`);
console.log(`Business Expenses (expense, with tag): ${businessExpenses.length} transactions`);
console.log(`  - Column 4 has "X"`);
console.log(`Reimbursables (tracking only, NO tag): ${reimbursables.length} transactions`);
console.log(`  - Column 3 has "X"`);
console.log(`Florida House (expense, with tag): ${floridaHouseTxns.length} transactions`);
console.log(`Savings/Investment (expense, with tag): ${savingsTxns.length} transactions`);
console.log();

// 7. CURRENCY DISTRIBUTION
console.log('7. CURRENCY DISTRIBUTION');
console.log('-'.repeat(80));

let thbCount = 0;
let usdCount = 0;
let mixedCount = 0;
let anomalies = [];

expenseTrackerTxns.forEach(t => {
  const thbCol = t.cols[6] || '';
  const usdCol = t.cols[7] || '';

  const hasThb = thbCol.includes('THB');
  const hasUsd = usdCol.includes('$') || (usdCol && !hasThb);

  if (hasThb && hasUsd) {
    mixedCount++;
  } else if (hasThb) {
    thbCount++;
  } else if (hasUsd) {
    usdCount++;
  } else {
    // Check if it's a reimbursement with negative THB
    if (thbCol.includes('-THB') || thbCol.startsWith('-THB')) {
      thbCount++;
    } else if (!t.cols[1]?.includes('Total')) {
      anomalies.push({
        line: t.line,
        desc: t.cols[1],
        col6: thbCol,
        col7: usdCol
      });
    }
  }
});

console.log(`THB Transactions: ${thbCount}`);
console.log(`USD Transactions: ${usdCount}`);
console.log(`Mixed/Other: ${mixedCount}`);
if (anomalies.length > 0) {
  console.log(`\n⚠ Anomalies (missing currency): ${anomalies.length}`);
  anomalies.slice(0, 5).forEach(a => {
    console.log(`  Line ${a.line}: "${a.desc}" - Col6: "${a.col6}", Col7: "${a.col7}"`);
  });
  if (anomalies.length > 5) {
    console.log(`  ... and ${anomalies.length - 5} more`);
  }
}
console.log();

// 8. PARSING SCRIPT VERIFICATION
console.log('8. PARSING SCRIPT VERIFICATION');
console.log('-'.repeat(80));

const scriptPath = path.join(__dirname, 'parse-april-2025.js');
const scriptExists = fs.existsSync(scriptPath);

if (scriptExists) {
  console.log('✓ parse-april-2025.js EXISTS');
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');

  // Check if it uses Column 6 for THB
  const usesCol6ForThb = scriptContent.includes('row[6]') &&
                          scriptContent.includes('THB');

  // Check if it uses Column 8 (should NOT)
  const usesCol8 = scriptContent.includes('row[8]') &&
                    !scriptContent.includes('// IGNORE') &&
                    !scriptContent.includes('DO NOT USE');

  if (usesCol6ForThb) {
    console.log('  ✓ Uses Column 6 for THB amounts');
  } else {
    console.log('  ❌ DOES NOT use Column 6 for THB amounts - NEEDS CORRECTION');
  }

  if (usesCol8) {
    console.log('  ❌ Uses Column 8 (conversion column) - NEEDS CORRECTION');
  } else {
    console.log('  ✓ Does NOT use Column 8 (correct)');
  }
} else {
  console.log('❌ parse-april-2025.js DOES NOT EXIST');
  console.log('  ACTION REQUIRED: Create parsing script following parse-may-2025.js pattern');
  console.log('  CRITICAL: Use Column 6 for THB, Column 7/9 for USD, IGNORE Column 8');
}
console.log();

// 9. COMPARE TO PREVIOUS MONTHS
console.log('9. COMPARISON TO PREVIOUS MONTHS');
console.log('-'.repeat(80));
const totalAprilTxns = expenseTrackerTxns.length + grossIncomeTxns.length +
                       savingsTxns.length + floridaHouseTxns.length;

console.log('Historical Data:');
console.log('  September 2025: 159 transactions, 23 reimbursements, ~70 THB');
console.log('  August 2025:    194 transactions, 32 reimbursements, 82 THB');
console.log('  July 2025:      176 transactions, 26 reimbursements, ~90 THB');
console.log('  June 2025:      190 transactions, 27 reimbursements, 85 THB');
console.log('  May 2025:       174 transactions, 16 reimbursements, 89 THB');
console.log();
console.log(`April 2025:     ${totalAprilTxns} transactions, ${reimbursements.length} reimbursements, ${thbCount} THB`);
console.log();

// Check for significant differences
let flags = [];
if (totalAprilTxns < 150 || totalAprilTxns > 220) {
  flags.push(`Transaction count (${totalAprilTxns}) outside normal range (150-220)`);
}
if (reimbursements.length < 10 || reimbursements.length > 40) {
  flags.push(`Reimbursement count (${reimbursements.length}) outside normal range (10-40)`);
}
if (thbCount < 60 || thbCount > 100) {
  flags.push(`THB transaction count (${thbCount}) outside normal range (60-100)`);
}

if (flags.length > 0) {
  console.log('⚠ STRUCTURAL DIFFERENCES DETECTED:');
  flags.forEach(f => console.log(`  - ${f}`));
} else {
  console.log('✓ April 2025 structure appears consistent with previous months');
}
console.log();

// 10. ANOMALY DETECTION
console.log('10. ANOMALY DETECTION');
console.log('-'.repeat(80));

let redFlags = [];

// Check for rent transaction
const rentTxn = expenseTrackerTxns.find(t =>
  t.cols[1]?.toLowerCase().includes('rent') &&
  t.cols[2]?.toLowerCase().includes('landlord')
);

if (rentTxn) {
  const rentThb = rentTxn.cols[6];
  const rentUsd = rentTxn.cols[9];
  console.log(`✓ Rent transaction found at line ${rentTxn.line}`);
  console.log(`  THB: ${rentThb}, USD: ${rentUsd}`);

  if (rentThb && rentThb.includes('THB 35000')) {
    console.log(`  ✓ Rent is THB 35,000.00 (CORRECT)`);
  } else {
    redFlags.push({
      line: rentTxn.line,
      desc: rentTxn.cols[1],
      issue: `Rent amount unexpected: ${rentThb}`,
      severity: 'CRITICAL',
      expected: 'THB 35000.00'
    });
  }
} else {
  redFlags.push({
    line: 'N/A',
    desc: 'Rent transaction',
    issue: 'Rent transaction not found',
    severity: 'CRITICAL',
    expected: 'THB 35,000.00 rent payment'
  });
}

// Check Monthly Cleaning anomaly (line 1868 has unusual USD format)
const cleaningTxn = expenseTrackerTxns.find(t =>
  t.line === 1868
);

if (cleaningTxn) {
  const cleaningAmount = cleaningTxn.cols[6];
  console.log(`\nMonthly Cleaning at line ${cleaningTxn.line}:`);
  console.log(`  Amount in Col 6: "${cleaningAmount}"`);

  if (cleaningAmount && cleaningAmount.includes('$') && cleaningAmount.includes('2,782')) {
    redFlags.push({
      line: cleaningTxn.line,
      desc: cleaningTxn.cols[1],
      issue: 'USD amount in THB column (Col 6)',
      severity: 'CRITICAL',
      notes: 'Should be THB amount, not USD'
    });
    console.log(`  ❌ CRITICAL: USD amount in THB column!`);
  }
}

// Check for negative amounts in wrong column
expenseTrackerTxns.forEach(t => {
  const desc = t.cols[1] || '';
  const madameKohTxn = desc.includes('Madame Koh');

  if (madameKohTxn) {
    const thbCol = t.cols[6];
    if (thbCol && thbCol.startsWith('-THB')) {
      console.log(`\n⚠ Line ${t.line}: "${desc}"`);
      console.log(`  Negative THB amount: ${thbCol}`);
      console.log(`  This appears to be a refund or error in data entry`);

      redFlags.push({
        line: t.line,
        desc: desc,
        issue: `Negative expense (not reimbursement): ${thbCol}`,
        severity: 'WARNING',
        notes: 'Verify if this is a refund or data entry error'
      });
    }
  }
});

// Check for missing amounts
expenseTrackerTxns.forEach(t => {
  const hasAmount = t.cols[6] || t.cols[7] || t.cols[9];
  if (!hasAmount && !t.cols[1]?.includes('$0.00')) {
    redFlags.push({
      line: t.line,
      desc: t.cols[1],
      issue: 'Missing amount in all currency columns',
      severity: 'WARNING'
    });
  }
});

console.log(`\n${'='.repeat(80)}`);
console.log(`ANOMALIES SUMMARY: ${redFlags.length} issue(s) found`);
if (redFlags.length > 0) {
  console.log('See APRIL-2025-RED-FLAGS.md for detailed red flag report');
}

// Save red flags to file
const redFlagsReport = {
  month: 'April 2025',
  totalIssues: redFlags.length,
  duplicates: duplicates.length,
  flags: redFlags,
  duplicatesList: duplicates
};

fs.writeFileSync(
  path.join(__dirname, 'april-2025-red-flags.json'),
  JSON.stringify(redFlagsReport, null, 2)
);

console.log('\n✓ Analysis complete');
console.log('✓ Red flags saved to: scripts/april-2025-red-flags.json');
