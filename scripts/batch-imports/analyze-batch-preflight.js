const fs = require('fs');
const path = require('path');

// Read CSV file
const csvPath = path.join(__dirname, '../../csv_imports/fullImport_20251017.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

console.log('='.repeat(80));
console.log('BATCH PRE-FLIGHT ANALYSIS: August 2024, July 2024, June 2024');
console.log('='.repeat(80));
console.log();

// Helper function to parse amount
function parseAmount(str) {
  if (!str) return 0;
  // Remove $, commas, quotes, tabs, parentheses, spaces
  const cleaned = str.replace(/[$,"\t()\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Helper function to check if line has negative amount
function hasNegativeAmount(line) {
  return /\$\s*\([\d,]+\.[\d]+\)|\-\s*\$[\d,]+\.[\d]+|\-THB\s*[\d,]+/.test(line);
}

// Helper function to check for comma-formatted amounts
function hasCommaAmount(line) {
  return /\$\s*[\d,]+,[\d,]+\.[\d]+/.test(line);
}

// Helper function to check for reimbursement typos
function hasReimbursementTypo(line) {
  return /remibursement|rembursement|reimbursment/i.test(line);
}

// Analyze each month
const months = [
  { name: 'August 2024', searchStart: 'Thursday, August 1, 2024', searchEnd: 'Monday, July 1, 2024' },
  { name: 'July 2024', searchStart: 'Monday, July 1, 2024', searchEnd: 'Saturday, June 1, 2024' },
  { name: 'June 2024', searchStart: 'Saturday, June 1, 2024', searchEnd: 'Friday, May 31, 2024' }
];

for (const month of months) {
  console.log('━'.repeat(80));
  console.log(`MONTH: ${month.name}`);
  console.log('━'.repeat(80));

  // Find line range
  let startLine = -1;
  let endLine = lines.length;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(month.searchStart)) {
      startLine = i;
    }
    if (month.searchEnd && lines[i].includes(month.searchEnd)) {
      endLine = i;
      break;
    }
  }

  console.log(`\nCSV LINE RANGE: ${startLine} to ${endLine} (approx ${endLine - startLine} lines)`);

  // Find section markers
  let expenseTrackerStart = -1;
  let grossIncomeStart = -1;
  let savingsStart = -1;
  let floridaHouseStart = -1;

  for (let i = startLine; i < endLine; i++) {
    if (lines[i].includes(`${month.name}: Expense Tracker`)) {
      expenseTrackerStart = i;
    }
    if (lines[i].includes(`${month.name}: Gross Income Tracker`)) {
      grossIncomeStart = i;
    }
    if (lines[i].includes(`${month.name}: Personal Savings & Investments`)) {
      savingsStart = i;
    }
    if (lines[i].includes(`${month.name}: Florida House Expenses`)) {
      floridaHouseStart = i;
    }
  }

  console.log(`\nSECTION MARKERS:`);
  console.log(`  Expense Tracker: Line ${expenseTrackerStart}`);
  console.log(`  Gross Income: Line ${grossIncomeStart}`);
  console.log(`  Savings/Investment: Line ${savingsStart}`);
  console.log(`  Florida House: Line ${floridaHouseStart}`);

  // Count transactions and analyze patterns
  let txCount = 0;
  let thbCount = 0;
  let usdCount = 0;
  let reimbCount = 0;
  let businessExpCount = 0;
  let negativeAmounts = [];
  let commaAmounts = [];
  let typoReimbs = [];
  let largeAmounts = [];
  let missingMerchants = [];

  for (let i = expenseTrackerStart; i < (grossIncomeStart > 0 ? grossIncomeStart : endLine); i++) {
    const line = lines[i];
    const cols = line.split(',');

    // Skip headers, totals, empty lines
    if (!line || line.includes('GRAND TOTAL') || line.includes('Daily Total') ||
        line.includes('Expense Tracker') || line.includes('Desc,Merchant')) {
      continue;
    }

    // Check if transaction row (has description and amount)
    if (cols.length > 7 && cols[1] && (cols[6] || cols[7])) {
      // Check for date row pattern
      if (cols[0] && (cols[0].includes('day,') || cols[0].includes('202'))) {
        continue;
      }

      txCount++;

      // Currency detection
      if (cols[6] && cols[6].includes('THB')) {
        thbCount++;
      } else if (cols[7] || cols[9]) {
        usdCount++;
      }

      // Reimbursement detection (flexible regex)
      if (cols[1] && /^Re(im|mi|m)?burs[e]?ment:?/i.test(cols[1].trim())) {
        reimbCount++;

        // Check for typos
        if (hasReimbursementTypo(cols[1])) {
          typoReimbs.push({ line: i + 1, desc: cols[1].trim() });
        }
      }

      // Business expense detection
      if (cols[4] && (cols[4].trim() === 'X' || cols[4].trim() === 'x')) {
        businessExpCount++;
      }

      // Negative amounts
      if (hasNegativeAmount(line)) {
        const desc = cols[1] ? cols[1].trim() : '';
        negativeAmounts.push({ line: i + 1, desc, rawLine: line });
      }

      // Comma-formatted amounts
      if (hasCommaAmount(line)) {
        const desc = cols[1] ? cols[1].trim() : '';
        commaAmounts.push({ line: i + 1, desc, rawLine: line });
      }

      // Large amounts (>$1000)
      const amt = parseAmount(cols[7] || cols[9] || '0');
      if (amt > 1000) {
        largeAmounts.push({ line: i + 1, desc: cols[1] ? cols[1].trim() : '', amount: amt });
      }

      // Missing merchants
      if (cols[2] && !cols[2].trim()) {
        missingMerchants.push({ line: i + 1, desc: cols[1] ? cols[1].trim() : '' });
      }
    }
  }

  console.log(`\nTRANSACTION COUNTS (Expense Tracker preliminary):`);
  console.log(`  Total transactions: ~${txCount}`);
  console.log(`  THB transactions: ~${thbCount} (${((thbCount/txCount)*100).toFixed(1)}%)`);
  console.log(`  USD transactions: ~${usdCount} (${((usdCount/txCount)*100).toFixed(1)}%)`);
  console.log(`  Reimbursements: ${reimbCount}`);
  console.log(`  Business Expenses: ${businessExpCount}`);

  console.log(`\nANOMALIES DETECTED:`);
  console.log(`  🔴 Negative amounts: ${negativeAmounts.length}`);
  if (negativeAmounts.length > 0) {
    negativeAmounts.slice(0, 5).forEach(item => {
      console.log(`      Line ${item.line}: ${item.desc}`);
    });
    if (negativeAmounts.length > 5) console.log(`      ... and ${negativeAmounts.length - 5} more`);
  }

  console.log(`  🔴 Comma-formatted amounts: ${commaAmounts.length}`);
  if (commaAmounts.length > 0) {
    commaAmounts.slice(0, 3).forEach(item => {
      console.log(`      Line ${item.line}: ${item.desc}`);
    });
    if (commaAmounts.length > 3) console.log(`      ... and ${commaAmounts.length - 3} more`);
  }

  console.log(`  🟡 Typo reimbursements: ${typoReimbs.length}`);
  if (typoReimbs.length > 0) {
    typoReimbs.forEach(item => {
      console.log(`      Line ${item.line}: ${item.desc}`);
    });
  }

  console.log(`  🟡 Large amounts (>$1000): ${largeAmounts.length}`);
  if (largeAmounts.length > 0) {
    largeAmounts.forEach(item => {
      console.log(`      Line ${item.line}: ${item.desc} - $${item.amount.toFixed(2)}`);
    });
  }

  console.log(`  🟢 Missing merchants: ${missingMerchants.length}`);

  console.log();
}

console.log('='.repeat(80));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(80));
