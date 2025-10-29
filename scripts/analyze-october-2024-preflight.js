const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'csv_imports', 'fullImport_20251017.csv');

// Read and parse CSV
const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = csvContent.split('\n');

// Section boundaries
const sections = {
  expenseTracker: { start: null, end: null },
  grossIncome: { start: null, end: null },
  savings: { start: null, end: null },
  floridaHouse: { start: null, end: null }
};

// Find section boundaries
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('October 2024: Expense Tracker')) {
    sections.expenseTracker.start = i + 1;
  } else if (line.includes('October 2024: Gross Income Tracker')) {
    sections.expenseTracker.end = i - 1;
    sections.grossIncome.start = i + 1;
  } else if (line.includes('October 2024: Personal Savings & Investments')) {
    sections.grossIncome.end = i - 1;
    sections.savings.start = i + 1;
  } else if (line.includes('October 2024: Deficit/Surplus')) {
    sections.savings.end = i - 1;
  } else if (line.includes('October 2024: Florida House Expenses')) {
    sections.floridaHouse.start = i + 1;
  } else if (line.includes('October 2024: Chiang Dao Kitty')) {
    sections.floridaHouse.end = i - 1;
  }
}

console.log('=== OCTOBER 2024 SECTION BOUNDARIES ===\n');
console.log(`Expense Tracker: Lines ${sections.expenseTracker.start} - ${sections.expenseTracker.end}`);
console.log(`Gross Income: Lines ${sections.grossIncome.start} - ${sections.grossIncome.end}`);
console.log(`Savings/Investments: Lines ${sections.savings.start} - ${sections.savings.end}`);
console.log(`Florida House: Lines ${sections.floridaHouse.start} - ${sections.floridaHouse.end}`);

// Analyze Expense Tracker
let expenseCount = 0;
let reimbursementCount = 0;
let businessExpenseCount = 0;
let reimbursableCount = 0;
let thbCount = 0;
let usdCount = 0;
let negativeAmounts = [];
let commaAmounts = [];
let typoReimbursements = [];
let missingMerchants = [];
let largeAmounts = [];
let duplicateCandidates = [];

let currentDate = null;

console.log('\n=== EXPENSE TRACKER ANALYSIS ===\n');

for (let i = sections.expenseTracker.start; i <= sections.expenseTracker.end; i++) {
  const line = lines[i];
  if (!line || line.trim() === '') continue;

  const row = parseCSVRow(line);

  // Date row detection
  if (row[0] && row[0].includes('2024') && row[0].includes('October')) {
    currentDate = row[0];
    continue;
  }

  // Skip non-transaction rows
  if (!row[1] || row[1] === 'Desc' || row[1].includes('Daily Total') || row[1].includes('GRAND TOTAL')) {
    continue;
  }

  const desc = row[1];
  const merchant = row[2];
  const reimbursable = row[3];
  const businessExpense = row[4];
  const thb = row[6];
  const usd = row[7];
  const subtotal = row[9];

  expenseCount++;

  // Tag detection
  if (desc && desc.toLowerCase().startsWith('reimbursement')) {
    reimbursementCount++;

    // Check for typo variants
    if (!desc.match(/^Reimbursement:/i)) {
      typoReimbursements.push({ line: i + 1, desc, date: currentDate });
    }
  }

  if (businessExpense === 'X' || businessExpense === 'x') {
    businessExpenseCount++;
  }

  if (reimbursable === 'X' || reimbursable === 'x') {
    reimbursableCount++;
  }

  // Currency detection
  if (thb && thb.includes('THB')) {
    thbCount++;
  } else if (usd && usd.includes('$')) {
    usdCount++;
  }

  // Negative amount detection
  if ((usd && usd.includes('(')) || (usd && usd.includes('-')) || (thb && thb.includes('-'))) {
    negativeAmounts.push({ line: i + 1, desc, merchant, amount: usd || thb, date: currentDate });
  }

  // Comma-formatted amounts
  if (usd && usd.includes(',')) {
    commaAmounts.push({ line: i + 1, desc, merchant, amount: usd, date: currentDate });
  }

  // Missing merchant
  if (!merchant || merchant.trim() === '') {
    missingMerchants.push({ line: i + 1, desc, date: currentDate });
  }

  // Large amounts (>$1000 USD equivalent)
  const amount = parseAmount(subtotal);
  if (amount > 1000) {
    largeAmounts.push({ line: i + 1, desc, merchant, amount, date: currentDate });
  }

  // Potential duplicates (for Florida House comparison)
  if (merchant && amount) {
    duplicateCandidates.push({
      line: i + 1,
      desc,
      merchant,
      amount,
      date: currentDate,
      section: 'Expense Tracker'
    });
  }
}

console.log(`Total transactions: ${expenseCount}`);
console.log(`Reimbursements: ${reimbursementCount}`);
console.log(`Business Expenses (X in col 4): ${businessExpenseCount}`);
console.log(`Reimbursables (X in col 3): ${reimbursableCount}`);
console.log(`THB transactions: ${thbCount} (${(thbCount/expenseCount*100).toFixed(1)}%)`);
console.log(`USD transactions: ${usdCount} (${(usdCount/expenseCount*100).toFixed(1)}%)`);

// Analyze Florida House
let floridaHouseCount = 0;
let floridaHouseDates = [];

console.log('\n=== FLORIDA HOUSE ANALYSIS ===\n');

currentDate = null;
for (let i = sections.floridaHouse.start; i <= sections.floridaHouse.end; i++) {
  const line = lines[i];
  if (!line || line.trim() === '') continue;

  const row = parseCSVRow(line);

  // Date row detection
  if (row[0] && row[0].includes('2024')) {
    currentDate = row[0];
    floridaHouseDates.push(currentDate);
    continue;
  }

  // Skip non-transaction rows
  if (!row[1] || row[1] === 'Desc' || row[1].includes('GRAND TOTAL')) {
    continue;
  }

  const desc = row[1];
  const merchant = row[2];
  const subtotal = row[4];
  const amount = parseAmount(subtotal);

  floridaHouseCount++;

  // Add to duplicate candidates
  if (merchant && amount) {
    duplicateCandidates.push({
      line: i + 1,
      desc,
      merchant,
      amount,
      date: currentDate,
      section: 'Florida House'
    });
  }
}

console.log(`Total Florida House transactions: ${floridaHouseCount}`);
console.log(`Dates with transactions: ${floridaHouseDates.length}`);

// Gross Income
let incomeCount = 0;
console.log('\n=== GROSS INCOME ANALYSIS ===\n');

for (let i = sections.grossIncome.start; i <= sections.grossIncome.end; i++) {
  const line = lines[i];
  if (!line || line.trim() === '') continue;

  const row = parseCSVRow(line);

  // Skip header and total rows
  if (row[0] === 'Date Receieved' || row[1]?.includes('Subtotal') || row[1]?.includes('TOTAL')) {
    continue;
  }

  if (row[0] && row[0].includes('2024') && row[1] && row[3]) {
    incomeCount++;
  }
}

console.log(`Total income transactions: ${incomeCount}`);

// Savings
let savingsCount = 0;
console.log('\n=== SAVINGS/INVESTMENTS ANALYSIS ===\n');

for (let i = sections.savings.start; i <= sections.savings.end; i++) {
  const line = lines[i];
  if (!line || line.trim() === '') continue;

  const row = parseCSVRow(line);

  // Skip header and total rows
  if (row[0] === 'Date Made' || row[1]?.includes('TOTAL')) {
    continue;
  }

  if (row[1] && row[4]) {
    const amount = parseAmount(row[4]);
    if (amount > 0) {
      savingsCount++;
    }
  }
}

console.log(`Total savings/investment transactions: ${savingsCount}`);

// Duplicate detection
console.log('\n=== DUPLICATE DETECTION ===\n');

const duplicates = [];
for (let i = 0; i < duplicateCandidates.length; i++) {
  for (let j = i + 1; j < duplicateCandidates.length; j++) {
    const a = duplicateCandidates[i];
    const b = duplicateCandidates[j];

    if (a.section !== b.section &&
        a.merchant.toLowerCase().trim() === b.merchant.toLowerCase().trim() &&
        Math.abs(a.amount - b.amount) < 0.01) {
      duplicates.push({ a, b });
    }
  }
}

console.log(`Found ${duplicates.length} potential duplicates between sections:`);
duplicates.forEach((dup, idx) => {
  console.log(`\n${idx + 1}. ${dup.a.merchant} - $${dup.a.amount.toFixed(2)}`);
  console.log(`   Line ${dup.a.line} (${dup.a.section}): "${dup.a.desc}"`);
  console.log(`   Line ${dup.b.line} (${dup.b.section}): "${dup.b.desc}"`);
  console.log(`   ACTION: Keep Expense Tracker, Remove Florida House`);
});

// Red flags
console.log('\n=== RED FLAGS ===\n');

if (negativeAmounts.length > 0) {
  console.log(`\nNEGATIVE AMOUNTS (${negativeAmounts.length}):`);
  negativeAmounts.forEach(item => {
    console.log(`  Line ${item.line}: ${item.desc} | ${item.merchant} | ${item.amount} | ${item.date}`);
  });
}

if (commaAmounts.length > 0) {
  console.log(`\nCOMMA-FORMATTED AMOUNTS (${commaAmounts.length}):`);
  commaAmounts.forEach(item => {
    console.log(`  Line ${item.line}: ${item.desc} | ${item.merchant} | ${item.amount}`);
  });
}

if (typoReimbursements.length > 0) {
  console.log(`\nTYPO REIMBURSEMENTS (${typoReimbursements.length}):`);
  typoReimbursements.forEach(item => {
    console.log(`  Line ${item.line}: "${item.desc}"`);
  });
}

if (missingMerchants.length > 0) {
  console.log(`\nMISSING MERCHANTS (${missingMerchants.length}):`);
  missingMerchants.slice(0, 10).forEach(item => {
    console.log(`  Line ${item.line}: ${item.desc} | ${item.date}`);
  });
  if (missingMerchants.length > 10) {
    console.log(`  ... and ${missingMerchants.length - 10} more`);
  }
}

if (largeAmounts.length > 0) {
  console.log(`\nLARGE AMOUNTS (>${1000}) - ${largeAmounts.length} transactions:`);
  largeAmounts.forEach(item => {
    console.log(`  Line ${item.line}: ${item.desc} | ${item.merchant} | $${item.amount.toFixed(2)} | ${item.date}`);
  });
}

// Low THB percentage check
const thbPercentage = (thbCount / expenseCount * 100);
if (thbPercentage < 10) {
  console.log(`\nLOW THB PERCENTAGE: ${thbPercentage.toFixed(1)}% (may indicate USA travel month)`);
}

console.log('\n=== SUMMARY ===\n');
console.log(`Total expected transactions: ${expenseCount + floridaHouseCount + incomeCount + savingsCount}`);
console.log(`After duplicate removal: ${expenseCount + floridaHouseCount + incomeCount + savingsCount - duplicates.length}`);

// Helper functions
function parseCSVRow(line) {
  const row = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  row.push(current);

  return row;
}

function parseAmount(str) {
  if (!str) return 0;
  const cleaned = str.replace(/[$,()]/g, '').replace(/\s/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}
