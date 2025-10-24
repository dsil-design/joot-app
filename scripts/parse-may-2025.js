const fs = require('fs');
const path = require('path');

// Parse CSV file
const csvPath = '/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

// Helper function to parse date in format "Monday, May 1, 2025"
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

// Helper function to parse date in format "5/1/2025"
function parseShortDate(dateStr) {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

// Helper function to parse amount
function parseAmount(amountStr) {
  if (!amountStr || amountStr.trim() === '') return 0;
  // Remove currency symbols and commas, handle parentheses for negative
  let cleaned = amountStr.replace(/[$,]/g, '').trim();
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
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
const duplicates = [];
const redFlags = [];

// Section 1: Expense Tracker (lines 1521-1757)
console.log('Parsing Expense Tracker...');
let currentDate = null;

for (let i = 1520; i < 1757; i++) {
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

  // Currency and amount extraction (CRITICAL)
  let amount = 0;
  let currency = 'USD';

  // Check THB column first (column 6)
  if (row[6] && row[6].includes('THB')) {
    const match = row[6].match(/THB\s*([\d,.-]+)/);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ''));
      currency = 'THB';
    }
  }
  // Then check USD column (column 7)
  else if (row[7] && row[7].trim() !== '') {
    amount = parseAmount(row[7]);
    currency = 'USD';
  }
  // Fallback to subtotal (column 9)
  else if (row[9] && row[9].trim() !== '') {
    amount = parseAmount(row[9]);
    currency = 'USD';
  }

  // Skip if no amount found
  if (amount === 0 || isNaN(amount)) {
    redFlags.push({
      line: i + 1,
      description,
      merchant,
      issue: 'Missing or zero amount',
      severity: 'WARNING',
      phase: 'Parsing',
      status: 'OPEN'
    });
    continue;
  }

  // Determine transaction type and tags
  let transactionType = 'expense';
  const tags = [];

  // Check for reimbursement (description starts with "Reimbursement:")
  if (description.toLowerCase().startsWith('reimbursement:')) {
    transactionType = 'income';
    tags.push('Reimbursement');
    // Make amount positive for income
    amount = Math.abs(amount);
    stats.expenseTracker.reimbursements++;
  }

  // Check for business expense
  if (isBusinessExpense) {
    tags.push('Business Expense');
  }

  // Create transaction
  const transaction = {
    date: currentDate,
    description,
    merchant,
    payment_method: paymentMethod,
    amount,
    currency,
    transaction_type: transactionType,
    tags
  };

  transactions.push(transaction);
  stats.expenseTracker.count++;

  if (transactionType === 'expense') {
    stats.expenseTracker.expenses++;
  } else {
    stats.expenseTracker.income++;
  }

  // Track tags
  tags.forEach(tag => {
    tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
  });
}

console.log(`  Parsed ${stats.expenseTracker.count} transactions from Expense Tracker`);

// Section 2: Gross Income Tracker (lines 1758-1771)
console.log('Parsing Gross Income Tracker...');

for (let i = 1757; i < 1771; i++) {
  const row = parseCSV(lines[i]);

  // Skip header and empty rows
  if (!row[0] || row[0] === 'Date Receieved' || row[0].trim() === '') {
    continue;
  }

  // Skip total rows
  if (row[1] && (row[1].includes('TOTAL') || row[1].includes('Estimated'))) {
    continue;
  }

  // Parse date
  const date = parseFullDate(row[0]);
  if (!date) continue;

  const description = row[1];
  const merchant = row[2] || 'Unknown';
  const amount = parseAmount(row[3]);

  if (!description || amount === 0 || isNaN(amount)) {
    continue;
  }

  const transaction = {
    date,
    description,
    merchant,
    payment_method: 'PNC: Personal',
    amount,
    currency: 'USD',
    transaction_type: 'income',
    tags: []
  };

  transactions.push(transaction);
  stats.grossIncome.count++;
  stats.grossIncome.total += amount;
}

console.log(`  Parsed ${stats.grossIncome.count} transactions from Gross Income Tracker`);

// Section 3: Personal Savings & Investments (lines 1772-1776)
console.log('Parsing Personal Savings & Investments...');

for (let i = 1771; i < 1776; i++) {
  const row = parseCSV(lines[i]);

  // Skip header, total, and empty rows
  if (!row[0] || row[0] === 'Date Made' || row[1] === 'TOTAL' || row[0].trim() === '') {
    continue;
  }

  // Parse date (format: 5/1/2025)
  const date = parseShortDate(row[0]);
  if (!date) continue;

  const description = row[1];
  const merchant = row[2] || 'Unknown';
  const paymentMethod = row[3] || 'Unknown';
  const amount = parseAmount(row[4]);

  if (!description || amount === 0 || isNaN(amount)) {
    continue;
  }

  const transaction = {
    date,
    description,
    merchant,
    payment_method: paymentMethod,
    amount,
    currency: 'USD',
    transaction_type: 'expense',
    tags: ['Savings/Investment']
  };

  transactions.push(transaction);
  stats.savings.count++;
  stats.savings.total += amount;

  // Track tags
  tagDistribution['Savings/Investment'] = (tagDistribution['Savings/Investment'] || 0) + 1;
}

console.log(`  Parsed ${stats.savings.count} transactions from Personal Savings & Investments`);

// Section 4: Florida House Expenses (lines 1787-1801)
console.log('Parsing Florida House Expenses...');
currentDate = null;

for (let i = 1786; i < 1801; i++) {
  const row = parseCSV(lines[i]);

  // Check for date row
  if (row[0] && parseFullDate(row[0])) {
    currentDate = parseFullDate(row[0]);
    continue;
  }

  // Skip rows without description or with special keywords
  if (!row[1] || row[1] === '' || row[1] === 'Desc' ||
      row[1].includes('GRAND TOTAL') || row[1].includes('TOTAL')) {
    continue;
  }

  const description = row[1];
  const merchant = row[2] || 'Unknown';
  const paymentMethod = row[4] || 'Unknown';
  const amount = parseAmount(row[5]);

  // Skip if no amount found
  if (amount === 0 || isNaN(amount)) {
    redFlags.push({
      line: i + 1,
      description,
      merchant,
      issue: 'Missing or zero amount in Florida House section',
      severity: 'WARNING',
      phase: 'Parsing',
      status: 'OPEN'
    });
    continue;
  }

  const transaction = {
    date: currentDate,
    description,
    merchant,
    payment_method: paymentMethod,
    amount,
    currency: 'USD',
    transaction_type: 'expense',
    tags: ['Florida House']
  };

  transactions.push(transaction);
  stats.floridaHouse.count++;
  stats.floridaHouse.total += amount;

  // Track tags
  tagDistribution['Florida House'] = (tagDistribution['Florida House'] || 0) + 1;
}

console.log(`  Parsed ${stats.floridaHouse.count} transactions from Florida House Expenses`);

// Duplicate Detection
console.log('\nDetecting duplicates...');
const expenseTrackerTransactions = transactions.filter((t, idx) => idx < stats.expenseTracker.count);
const floridaHouseTransactions = transactions.filter(t => t.tags.includes('Florida House'));

floridaHouseTransactions.forEach((fh, idx) => {
  const duplicate = expenseTrackerTransactions.find(et => {
    // Same merchant, amount, and within 3 days
    if (et.merchant.toLowerCase() !== fh.merchant.toLowerCase()) return false;
    if (Math.abs(et.amount - fh.amount) > 0.01) return false;

    // Check date proximity
    const etDate = new Date(et.date);
    const fhDate = new Date(fh.date);
    const daysDiff = Math.abs((etDate - fhDate) / (1000 * 60 * 60 * 24));

    return daysDiff <= 3;
  });

  if (duplicate) {
    duplicates.push({
      merchant: fh.merchant,
      amount: fh.amount,
      date: fh.date,
      expenseTracker: duplicate.description,
      floridaHouse: fh.description,
      action: 'REMOVE Florida House version'
    });

    // Mark for removal
    fh._remove = true;

    // Log as red flag (resolved)
    redFlags.push({
      description: `${fh.merchant} - $${fh.amount}`,
      issue: `Duplicate between Expense Tracker and Florida House - keeping Expense Tracker version`,
      severity: 'INFO',
      phase: 'Parsing',
      status: 'RESOLVED',
      notes: `Expense Tracker: "${duplicate.description}" vs Florida House: "${fh.description}"`
    });
  }
});

// Remove duplicates
const finalTransactions = transactions.filter(t => !t._remove);
console.log(`  Found ${duplicates.length} duplicate(s), removed from Florida House`);

// Update stats after deduplication
stats.floridaHouse.count = finalTransactions.filter(t => t.tags.includes('Florida House')).length;
tagDistribution['Florida House'] = stats.floridaHouse.count;

// Calculate totals and currency distribution
const currencyDistribution = { USD: 0, THB: 0, VND: 0, MYR: 0, CNY: 0 };
finalTransactions.forEach(t => {
  currencyDistribution[t.currency] = (currencyDistribution[t.currency] || 0) + 1;
});

// Find rent transaction for verification
const rentTransaction = finalTransactions.find(t =>
  t.description && t.description.toLowerCase().includes('rent') &&
  t.merchant && t.merchant.toLowerCase().includes('landlord')
);

console.log('\n========================================');
console.log('PARSING SUMMARY');
console.log('========================================');
console.log(`Total Transactions: ${finalTransactions.length}`);
console.log(`  Expense Tracker: ${stats.expenseTracker.count} (${stats.expenseTracker.expenses} expenses, ${stats.expenseTracker.income} income)`);
console.log(`  Gross Income: ${stats.grossIncome.count}`);
console.log(`  Savings/Investments: ${stats.savings.count}`);
console.log(`  Florida House: ${stats.floridaHouse.count} (after dedup)`);
console.log('');
console.log('Tag Distribution:');
Object.entries(tagDistribution).sort((a, b) => b[1] - a[1]).forEach(([tag, count]) => {
  console.log(`  ${tag}: ${count}`);
});
console.log('');
console.log('Currency Distribution:');
Object.entries(currencyDistribution).forEach(([currency, count]) => {
  if (count > 0) console.log(`  ${currency}: ${count}`);
});
console.log('');
console.log('Duplicates Removed:', duplicates.length);
console.log('');

if (rentTransaction) {
  console.log('✅ RENT VERIFICATION:');
  console.log(`   Description: ${rentTransaction.description}`);
  console.log(`   Merchant: ${rentTransaction.merchant}`);
  console.log(`   Amount: ${rentTransaction.amount} ${rentTransaction.currency}`);
  console.log(`   Expected: 35000 THB`);

  if (rentTransaction.currency === 'THB' && Math.abs(rentTransaction.amount - 35000) < 1) {
    console.log('   ✅ CORRECT - Rent is 35000 THB');
  } else {
    console.log('   ❌ ERROR - Rent amount or currency mismatch!');
    redFlags.push({
      description: 'Rent transaction',
      issue: `Rent should be 35000 THB but found ${rentTransaction.amount} ${rentTransaction.currency}`,
      severity: 'CRITICAL',
      phase: 'Parsing',
      status: 'OPEN'
    });
  }
} else {
  console.log('⚠️  WARNING: Rent transaction not found!');
  redFlags.push({
    description: 'Rent transaction',
    issue: 'Rent transaction not found in parsed data',
    severity: 'CRITICAL',
    phase: 'Parsing',
    status: 'OPEN'
  });
}

console.log('');
console.log('Red Flags:', redFlags.length);
console.log('========================================');

// Write output files
console.log('\nWriting output files...');

// 1. Write parsed transactions JSON
const outputPath = '/Users/dennis/Code Projects/joot-app/scripts/may-2025-CORRECTED.json';
fs.writeFileSync(outputPath, JSON.stringify(finalTransactions, null, 2));
console.log(`✅ Written: ${outputPath}`);

// 2. Generate parsing report
const reportPath = '/Users/dennis/Code Projects/joot-app/scripts/MAY-2025-PARSE-REPORT.md';
let report = `# MAY 2025 PARSING REPORT

**Generated:** ${new Date().toISOString()}
**Source:** csv_imports/fullImport_20251017.csv

## Transaction Counts

| Section | Count | Notes |
|---------|-------|-------|
| Expense Tracker | ${stats.expenseTracker.count} | ${stats.expenseTracker.expenses} expenses, ${stats.expenseTracker.income} income/reimbursements |
| Gross Income Tracker | ${stats.grossIncome.count} | Total: $${stats.grossIncome.total.toFixed(2)} |
| Personal Savings & Investments | ${stats.savings.count} | Total: $${stats.savings.total.toFixed(2)} |
| Florida House Expenses | ${stats.floridaHouse.count} | After deduplication |
| **TOTAL** | **${finalTransactions.length}** | |

## Transaction Types

- Expenses: ${finalTransactions.filter(t => t.transaction_type === 'expense').length}
- Income: ${finalTransactions.filter(t => t.transaction_type === 'income').length}

## Tag Distribution

| Tag | Count |
|-----|-------|
${Object.entries(tagDistribution).sort((a, b) => b[1] - a[1]).map(([tag, count]) => `| ${tag} | ${count} |`).join('\n')}

## Currency Distribution

| Currency | Count |
|----------|-------|
${Object.entries(currencyDistribution).filter(([, count]) => count > 0).map(([currency, count]) => `| ${currency} | ${count} |`).join('\n')}

## Duplicate Detection

Found ${duplicates.length} duplicate(s):

${duplicates.length > 0 ? duplicates.map((d, idx) => `
${idx + 1}. **${d.merchant}** - $${d.amount.toFixed(2)} on ${d.date}
   - Expense Tracker: "${d.expenseTracker}" ✅ KEPT
   - Florida House: "${d.floridaHouse}" ❌ REMOVED
`).join('\n') : '*No duplicates found*'}

## Rent Verification

${rentTransaction ? `
- Description: ${rentTransaction.description}
- Merchant: ${rentTransaction.merchant}
- Amount: ${rentTransaction.amount} ${rentTransaction.currency}
- Expected: 35000 THB
- Status: ${rentTransaction.currency === 'THB' && Math.abs(rentTransaction.amount - 35000) < 1 ? '✅ CORRECT' : '❌ MISMATCH'}
` : '⚠️ Rent transaction not found!'}

## Sample Transactions

### Expense Tracker (first 5)
\`\`\`json
${JSON.stringify(finalTransactions.filter((t, idx) => idx < stats.expenseTracker.count).slice(0, 5), null, 2)}
\`\`\`

### Gross Income Tracker (all ${stats.grossIncome.count})
\`\`\`json
${JSON.stringify(finalTransactions.filter(t => t.transaction_type === 'income' && !t.tags.includes('Reimbursement')), null, 2)}
\`\`\`

### Personal Savings & Investments (all ${stats.savings.count})
\`\`\`json
${JSON.stringify(finalTransactions.filter(t => t.tags.includes('Savings/Investment')), null, 2)}
\`\`\`

### Florida House Expenses (all ${stats.floridaHouse.count})
\`\`\`json
${JSON.stringify(finalTransactions.filter(t => t.tags.includes('Florida House')), null, 2)}
\`\`\`

## Red Flags Summary

Total Issues: ${redFlags.length}

${redFlags.length > 0 ? redFlags.map((flag, idx) => `
${idx + 1}. **${flag.severity}** - ${flag.description || 'N/A'}
   - Issue: ${flag.issue}
   - Status: ${flag.status}
   ${flag.notes ? `- Notes: ${flag.notes}` : ''}
`).join('\n') : '*No issues found*'}

## Validation Status

- [${finalTransactions.length === 177 ? 'x' : ' '}] Transaction count matches expected (177)
- [${rentTransaction && rentTransaction.currency === 'THB' && Math.abs(rentTransaction.amount - 35000) < 1 ? 'x' : ' '}] Rent verification passed (35000 THB)
- [${currencyDistribution.USD > 0 && currencyDistribution.THB > 0 ? 'x' : ' '}] Both USD and THB transactions present
- [${duplicates.length === 1 ? 'x' : ' '}] Expected duplicates removed (1)
- [${tagDistribution['Reimbursement'] === 16 ? 'x' : ' '}] Reimbursement tag count matches (16)
- [${tagDistribution['Florida House'] === 4 ? 'x' : ' '}] Florida House tag count matches (4 after dedup)
- [${tagDistribution['Savings/Investment'] === 1 ? 'x' : ' '}] Savings/Investment tag count matches (1)

## Ready for Import

${finalTransactions.length === 177 && rentTransaction && rentTransaction.currency === 'THB' && Math.abs(rentTransaction.amount - 35000) < 1 && duplicates.length === 1 ? '✅ **YES** - All validation checks passed!' : '⚠️ **REVIEW REQUIRED** - Some validation checks failed'}

---
*Generated by parse-may-2025.js*
`;

fs.writeFileSync(reportPath, report);
console.log(`✅ Written: ${reportPath}`);

// 3. Append to red flags log
const redFlagsPath = '/Users/dennis/Code Projects/joot-app/scripts/MAY-2025-RED-FLAGS.md';
let redFlagsContent = '';

// Check if file exists
if (fs.existsSync(redFlagsPath)) {
  redFlagsContent = fs.readFileSync(redFlagsPath, 'utf-8');
  redFlagsContent += '\n\n';
}

redFlagsContent += `# MAY 2025 PARSING RED FLAGS

**Updated:** ${new Date().toISOString()}
**Phase:** Parsing
**Total Issues:** ${redFlags.length}

${redFlags.length > 0 ? redFlags.map((flag, idx) => `
## Issue ${idx + 1}: ${flag.description || 'N/A'}

- **Severity:** ${flag.severity}
- **Issue:** ${flag.issue}
- **Phase:** ${flag.phase}
- **Status:** ${flag.status}
${flag.line ? `- **Line Number:** ${flag.line}` : ''}
${flag.notes ? `- **Notes:** ${flag.notes}` : ''}
${flag.merchant ? `- **Merchant:** ${flag.merchant}` : ''}
`).join('\n---\n') : '*No issues found during parsing*'}

---
*Generated by parse-may-2025.js*
`;

fs.writeFileSync(redFlagsPath, redFlagsContent);
console.log(`✅ Written: ${redFlagsPath}`);

console.log('\n✅ All output files created successfully!');
console.log('\nREADY FOR IMPORT:', finalTransactions.length === 177 && rentTransaction && rentTransaction.currency === 'THB' && Math.abs(rentTransaction.amount - 35000) < 1);
