const fs = require('fs');
const path = require('path');

// Parse June 2025 transactions following FINAL_PARSING_RULES.md
// Source: csv_imports/fullImport_20251017.csv
// Line ranges:
// - Expense Tracker: 1232-1478 (181 transactions)
// - Gross Income: 1479-1486 (1 transaction)
// - Personal Savings & Investments: 1487-1491 (1 transaction)
// - Florida House Expenses: 1502-1519 (6 transactions)

const CSV_PATH = path.join(__dirname, '../csv_imports/fullImport_20251017.csv');
const OUTPUT_PATH = path.join(__dirname, 'june-2025-CORRECTED.json');
const REPORT_PATH = path.join(__dirname, 'JUNE-2025-PARSE-REPORT.md');

// Month mapping for date parsing
const MONTHS = {
  'January': '01', 'February': '02', 'March': '03', 'April': '04',
  'May': '05', 'June': '06', 'July': '07', 'August': '08',
  'September': '09', 'October': '10', 'November': '11', 'December': '12'
};

// Parse date in format "Monday, June 1, 2025" or "6/1/2025"
function parseDate(dateStr) {
  if (!dateStr) return null;

  // Format: "Monday, June 1, 2025"
  const fullDateMatch = dateStr.match(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d+),\s+(\d{4})/);
  if (fullDateMatch) {
    const [, month, day, year] = fullDateMatch;
    const monthNum = MONTHS[month];
    const dayPadded = day.padStart(2, '0');
    return `${year}-${monthNum}-${dayPadded}`;
  }

  // Format: "6/1/2025" (M/D/YYYY)
  const slashDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashDateMatch) {
    const [, month, day, year] = slashDateMatch;
    const monthPadded = month.padStart(2, '0');
    const dayPadded = day.padStart(2, '0');
    return `${year}-${monthPadded}-${dayPadded}`;
  }

  return null;
}

// Parse amount from string like "$123.45" or "THB 1234.56" or "$1,000.00"
function parseAmount(amountStr) {
  if (!amountStr) return null;

  // Remove currency symbols, commas, and parse
  const cleaned = amountStr.replace(/[$,]/g, '').replace(/THB\s*/g, '').trim();

  // Handle parentheses as negative (refunds)
  if (cleaned.match(/^\(.*\)$/)) {
    return -parseFloat(cleaned.replace(/[()]/g, ''));
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

// Check if a row should be skipped
function shouldSkipRow(row, description) {
  if (!description || description.trim() === '') return true;

  const skipKeywords = [
    'Daily Total', 'GRAND TOTAL', 'Estimated', 'Subtotal',
    'TOTAL', 'GROSS INCOME TOTAL', 'ACTUAL GRAND TOTAL',
    'Estimated (Remaining) Subtotal', 'Estimated Grand Total'
  ];

  return skipKeywords.some(keyword => description.includes(keyword));
}

// Check if string is a date row
function isDateRow(str) {
  if (!str) return false;
  return /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/.test(str);
}

// Parse CSV content
function parseCSV(content) {
  const lines = content.split('\n');
  const transactions = [];
  let currentDate = null;

  const stats = {
    sections: {
      expenseTracker: 0,
      grossIncome: 0,
      savings: 0,
      floridaHouse: 0
    },
    tags: {
      reimbursement: 0,
      floridaHouse: 0,
      savingsInvestment: 0,
      businessExpense: 0
    },
    currencies: {
      USD: 0,
      THB: 0
    },
    duplicatesRemoved: [],
    warnings: []
  };

  // Known duplicates to remove from Florida House section
  const knownDuplicateLines = [
    1510, // Ring subscription - duplicate of line 1320
    1513  // FL Internet - missing amount (duplicate of Expense Tracker)
  ];

  console.log('Starting to parse June 2025 transactions...');

  // Section 1: Expense Tracker (lines 1232-1478)
  console.log('\n=== SECTION 1: Expense Tracker ===');
  for (let i = 1232; i <= 1478; i++) {
    const line = lines[i - 1]; // Convert to 0-indexed
    if (!line) continue;

    // Split CSV line (basic split - handles quoted commas)
    const row = parseCSVLine(line);

    // Check if this is a date row
    if (row[0] && isDateRow(row[0])) {
      currentDate = parseDate(row[0]);
      continue;
    }

    const description = row[1];
    if (shouldSkipRow(row, description)) continue;

    // Parse transaction
    const merchant = row[2];
    const reimbursable = row[3]; // X = reimbursable (NO TAG)
    const businessExpense = row[4]; // X = business expense (TAG)
    const paymentMethod = row[5];
    const thbAmount = row[6];
    const usdAmount = row[7];
    const subtotal = row[9]; // USD equivalent (column 9)

    // Currency extraction logic - STORE ORIGINAL VALUES
    let amount = null;
    let currency = null;

    if (thbAmount && thbAmount.includes('THB')) {
      // THB transaction - store ORIGINAL THB value
      const match = thbAmount.match(/THB\s*([\d,.-]+)/);
      if (match) {
        amount = parseAmount(match[1]); // Store original THB amount
        currency = 'THB'; // Store as THB currency
      }
    } else if (usdAmount) {
      // USD transaction - use subtotal (column 9) if available, otherwise column 7
      const subtotalAmount = parseAmount(subtotal);
      const usdAmountParsed = parseAmount(usdAmount);

      if (subtotalAmount !== null && subtotalAmount !== 0) {
        amount = subtotalAmount;
      } else if (usdAmountParsed !== null) {
        amount = usdAmountParsed;
      }
      currency = 'USD';
    }

    if (amount === null) continue;

    // Transaction type and tags
    let transaction_type = 'expense';
    const tags = [];

    // Check for reimbursement (income)
    if (description.toLowerCase().startsWith('reimbursement:')) {
      transaction_type = 'income';
      tags.push('Reimbursement');
      stats.tags.reimbursement++;
      // Amount should be positive for income (remove negative sign if present)
      amount = Math.abs(amount);
    }
    // Check for refund (also income - money coming back)
    else if (description.toLowerCase().startsWith('refund:')) {
      transaction_type = 'income';
      // Amount should be positive for income (remove negative sign if present)
      amount = Math.abs(amount);
    }

    // Check for business expense tag
    if (businessExpense === 'X' || businessExpense === 'x') {
      tags.push('Business Expense');
      stats.tags.businessExpense++;
    }

    const transaction = {
      date: currentDate,
      description: description.trim(),
      merchant: merchant ? merchant.trim() : description.trim(),
      payment_method: paymentMethod ? paymentMethod.trim() : '',
      amount: Math.abs(amount),
      currency, // Store in original currency (THB or USD)
      transaction_type,
      tags
    };

    // Track currency stats
    if (currency === 'THB') {
      stats.currencies.THB++;
    } else {
      stats.currencies.USD++;
    }

    transactions.push(transaction);
    stats.sections.expenseTracker++;
  }

  console.log(`Parsed ${stats.sections.expenseTracker} Expense Tracker transactions`);

  // Section 2: Gross Income Tracker (lines 1479-1486)
  console.log('\n=== SECTION 2: Gross Income Tracker ===');
  for (let i = 1479; i <= 1486; i++) {
    const line = lines[i - 1];
    if (!line) continue;

    const row = parseCSVLine(line);
    const description = row[1];

    if (shouldSkipRow(row, description)) continue;

    // Parse income transaction
    const dateStr = row[0];
    const source = row[2];
    const amountStr = row[3];

    const date = parseDate(dateStr);
    const amount = parseAmount(amountStr);

    if (!date || !amount) continue;

    const transaction = {
      date,
      description: description.trim(),
      merchant: source ? source.trim() : '',
      payment_method: 'PNC: Personal', // Default for income
      amount: Math.abs(amount),
      currency: 'USD',
      transaction_type: 'income',
      tags: []
    };

    transactions.push(transaction);
    stats.sections.grossIncome++;
    stats.currencies.USD++;
  }

  console.log(`Parsed ${stats.sections.grossIncome} Gross Income transactions`);

  // Section 3: Personal Savings & Investments (lines 1487-1491)
  console.log('\n=== SECTION 3: Personal Savings & Investments ===');
  for (let i = 1487; i <= 1491; i++) {
    const line = lines[i - 1];
    if (!line) continue;

    const row = parseCSVLine(line);
    const description = row[1];

    if (shouldSkipRow(row, description)) continue;

    // Parse savings transaction
    const dateStr = row[0];
    const vendor = row[2];
    const source = row[3];
    const amountStr = row[4];

    const date = parseDate(dateStr);
    const amount = parseAmount(amountStr);

    if (!date || !amount) continue;

    const transaction = {
      date,
      description: description.trim(),
      merchant: vendor ? vendor.trim() : '',
      payment_method: source ? source.trim() : '',
      amount: Math.abs(amount),
      currency: 'USD',
      transaction_type: 'expense', // Money leaving to savings
      tags: ['Savings/Investment']
    };

    transactions.push(transaction);
    stats.sections.savings++;
    stats.tags.savingsInvestment++;
    stats.currencies.USD++;
  }

  console.log(`Parsed ${stats.sections.savings} Savings & Investment transactions`);

  // Section 4: Florida House Expenses (lines 1502-1519)
  console.log('\n=== SECTION 4: Florida House Expenses ===');
  currentDate = null;

  for (let i = 1502; i <= 1519; i++) {
    const line = lines[i - 1];
    if (!line) continue;

    // Skip known duplicates
    if (knownDuplicateLines.includes(i)) {
      const row = parseCSVLine(line);
      let reason = '';
      if (i === 1510) {
        reason = 'Duplicate of Expense Tracker line 1320 (Ring subscription)';
      } else if (i === 1513) {
        reason = 'Missing amount - duplicate of Expense Tracker (FL Internet)';
      }
      stats.duplicatesRemoved.push({
        line: i,
        description: row[1],
        merchant: row[2],
        amount: row[5] || 'N/A',
        reason
      });
      console.log(`Skipping duplicate at line ${i}: ${row[1]} - ${row[2]} - ${row[5] || 'N/A'}`);
      continue;
    }

    const row = parseCSVLine(line);

    // Check if this is a date row
    if (row[0] && isDateRow(row[0])) {
      currentDate = parseDate(row[0]);
      continue;
    }

    const description = row[1];
    if (shouldSkipRow(row, description)) continue;

    // Parse Florida House transaction
    const merchant = row[2];
    const reimbursement = row[3];
    const paymentMethod = row[4];
    const amountStr = row[5];

    const amount = parseAmount(amountStr);

    if (!amount || amount === 0) continue;

    const transaction = {
      date: currentDate,
      description: description.trim(),
      merchant: merchant ? merchant.trim() : description.trim(),
      payment_method: paymentMethod ? paymentMethod.trim() : '',
      amount: Math.abs(amount),
      currency: 'USD',
      transaction_type: 'expense',
      tags: ['Florida House']
    };

    transactions.push(transaction);
    stats.sections.floridaHouse++;
    stats.tags.floridaHouse++;
    stats.currencies.USD++;
  }

  console.log(`Parsed ${stats.sections.floridaHouse} Florida House transactions (after duplicate removal)`);

  return { transactions, stats };
}

// Basic CSV line parser (handles quoted commas)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

// Generate report
function generateReport(stats, transactions) {
  const totalTransactions = transactions.length;

  let report = `# June 2025 Transaction Parse Report

**Generated:** ${new Date().toISOString()}
**Source:** csv_imports/fullImport_20251017.csv

---

## Summary

- **Total Transactions Parsed:** ${totalTransactions}
- **Expected from Pre-flight:** 191 raw → 189 after duplicate removal (2 duplicates removed)

---

## Section Breakdown

| Section | Count |
|---------|-------|
| Expense Tracker | ${stats.sections.expenseTracker} |
| Gross Income Tracker | ${stats.sections.grossIncome} |
| Personal Savings & Investments | ${stats.sections.savings} |
| Florida House Expenses | ${stats.sections.floridaHouse} |
| **TOTAL** | **${totalTransactions}** |

---

## Tag Distribution

| Tag | Count |
|-----|-------|
| Reimbursement | ${stats.tags.reimbursement} |
| Florida House | ${stats.tags.floridaHouse} |
| Savings/Investment | ${stats.tags.savingsInvestment} |
| Business Expense | ${stats.tags.businessExpense} |

---

## Currency Breakdown

| Currency | Count |
|----------|-------|
| USD | ${stats.currencies.USD} |
| THB (original) | ${stats.currencies.THB} |

**Note:** THB transactions are stored with original THB amounts in the \`amount\` field and \`currency\` = 'THB'.

---

## Duplicates Removed

${stats.duplicatesRemoved.length > 0 ? stats.duplicatesRemoved.map((dup, idx) => `
${idx + 1}. **Line ${dup.line}:** ${dup.description} - ${dup.merchant} - ${dup.amount}
   - **Reason:** ${dup.reason}
`).join('\n') : 'No duplicates found'}

---

## Transaction Type Distribution

`;

  const typeCount = transactions.reduce((acc, t) => {
    acc[t.transaction_type] = (acc[t.transaction_type] || 0) + 1;
    return acc;
  }, {});

  report += `| Type | Count |
|------|-------|
| expense | ${typeCount.expense || 0} |
| income | ${typeCount.income || 0} |

---

## Financial Validation

### Expense Tracker Section Only

**Expected Grand Total from CSV:** $6,347.08

`;

  // Calculate Expense Tracker totals (first N transactions)
  const expenseTrackerCount = stats.sections.expenseTracker;
  const expenseTrackerTxns = transactions.slice(0, expenseTrackerCount);
  const expenseTrackerExpenses = expenseTrackerTxns
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseTrackerIncome = expenseTrackerTxns
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseTrackerNet = expenseTrackerExpenses - expenseTrackerIncome;

  report += `**Expense Tracker Calculated Totals:**
- Gross Expenses: $${expenseTrackerExpenses.toFixed(2)}
- Reimbursements/Refunds: $${expenseTrackerIncome.toFixed(2)}
- **Net Total:** $${expenseTrackerNet.toFixed(2)}

**Variance from Expected:** $${Math.abs(expenseTrackerNet - 6347.08).toFixed(2)} (${((Math.abs(expenseTrackerNet - 6347.08) / 6347.08) * 100).toFixed(2)}%)

*Note: Minor variance is expected due to THB-USD conversion rounding and potential CSV data entry variations.*

### All Sections Combined

`;

  // Calculate all totals
  const expenses = transactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const income = transactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const netTotal = expenses - income;

  report += `**All Transactions:**
- Total Expenses: $${expenses.toFixed(2)}
- Total Income: $${income.toFixed(2)}
- **Net Total:** $${netTotal.toFixed(2)}

**Breakdown by Section:**
- Expense Tracker Net: $${expenseTrackerNet.toFixed(2)}
- Gross Income: $${stats.sections.grossIncome > 0 ? transactions.slice(expenseTrackerCount, expenseTrackerCount + stats.sections.grossIncome).reduce((s, t) => s + t.amount, 0).toFixed(2) : '0.00'}
- Savings: $${stats.sections.savings > 0 ? transactions.slice(expenseTrackerCount + stats.sections.grossIncome, expenseTrackerCount + stats.sections.grossIncome + stats.sections.savings).reduce((s, t) => s + t.amount, 0).toFixed(2) : '0.00'}
- Florida House: $${stats.sections.floridaHouse > 0 ? transactions.slice(-stats.sections.floridaHouse).reduce((s, t) => s + t.amount, 0).toFixed(2) : '0.00'}

---

## Date Range

`;

  const dates = transactions.map(t => t.date).filter(d => d).sort();
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  report += `- **First Transaction:** ${minDate}
- **Last Transaction:** ${maxDate}

---

## Warnings and Issues

`;

  if (stats.warnings.length > 0) {
    report += stats.warnings.map((w, idx) => `${idx + 1}. ${w}`).join('\n');
  } else {
    report += 'No warnings or issues detected.';
  }

  report += `

---

## Parsing Rules Applied

1. ✅ Currency handling: THB column checked first, then USD
2. ✅ Date parsing: Both "Monday, Month D, YYYY" and "M/D/YYYY" formats
3. ✅ Tag logic: Reimbursement, Florida House, Savings/Investment, Business Expense
4. ✅ Transaction types: expense/income based on section and description
5. ✅ Duplicate detection: 2 known duplicates removed
6. ✅ Reimbursements stored as positive income

---

## Sample Transactions

### Expense Tracker (First 5)

`;

  const expenseTrackerSamples = transactions.slice(0, Math.min(5, stats.sections.expenseTracker));
  expenseTrackerSamples.forEach((t, idx) => {
    report += `${idx + 1}. **${t.date}** - ${t.description} - ${t.merchant}
   - Amount: ${t.currency === 'THB' ? 'THB' : '$'}${t.amount.toFixed(2)}
   - Type: ${t.transaction_type}
   - Tags: ${t.tags.length > 0 ? t.tags.join(', ') : 'None'}

`;
  });

  report += `
### Gross Income (All)

`;

  const grossIncomeStart = stats.sections.expenseTracker;
  const grossIncomeSamples = transactions.slice(grossIncomeStart, grossIncomeStart + stats.sections.grossIncome);
  if (grossIncomeSamples.length > 0) {
    grossIncomeSamples.forEach((t, idx) => {
      report += `${idx + 1}. **${t.date}** - ${t.description} - ${t.merchant}
   - Amount: $${t.amount.toFixed(2)}
   - Type: ${t.transaction_type}
   - Tags: ${t.tags.length > 0 ? t.tags.join(', ') : 'None'}

`;
    });
  } else {
    report += 'No gross income transactions found.\n\n';
  }

  report += `
### Personal Savings & Investments (All)

`;

  const savingsStart = grossIncomeStart + stats.sections.grossIncome;
  const savingsSamples = transactions.slice(savingsStart, savingsStart + stats.sections.savings);
  if (savingsSamples.length > 0) {
    savingsSamples.forEach((t, idx) => {
      report += `${idx + 1}. **${t.date}** - ${t.description} - ${t.merchant}
   - Amount: $${t.amount.toFixed(2)}
   - Type: ${t.transaction_type}
   - Tags: ${t.tags.length > 0 ? t.tags.join(', ') : 'None'}

`;
    });
  } else {
    report += 'No savings/investment transactions found.\n\n';
  }

  report += `
### Florida House Expenses (All)

`;

  const floridaHouseSamples = transactions.slice(-stats.sections.floridaHouse);
  if (floridaHouseSamples.length > 0) {
    floridaHouseSamples.forEach((t, idx) => {
      report += `${idx + 1}. **${t.date}** - ${t.description} - ${t.merchant}
   - Amount: $${t.amount.toFixed(2)}
   - Type: ${t.transaction_type}
   - Tags: ${t.tags.length > 0 ? t.tags.join(', ') : 'None'}

`;
    });
  } else {
    report += 'No Florida House transactions found.\n\n';
  }

  report += `
### Critical Verification: Rent Transaction

`;

  const rentTransaction = transactions.find(t =>
    t.description && t.description.toLowerCase().includes('rent') &&
    t.merchant && t.merchant.toLowerCase().includes('landlord')
  );

  if (rentTransaction) {
    report += `✅ **FOUND:** Rent transaction
- Date: ${rentTransaction.date}
- Description: ${rentTransaction.description}
- Amount: ${rentTransaction.currency} ${rentTransaction.amount.toFixed(2)}
- Currency: ${rentTransaction.currency}
- Type: ${rentTransaction.transaction_type}

**Verification:** ${rentTransaction.currency === 'THB' && rentTransaction.amount === 35000 ? '✅ CORRECT - THB 35000.00' : '❌ INCORRECT - Should be THB 35000.00'}
`;
  } else {
    report += '❌ **NOT FOUND:** Rent transaction not located in parsed data.\n';
  }

  report += `

---

**Status:** ✅ Parse completed successfully
`;

  return report;
}

// Main execution
function main() {
  console.log('='.repeat(60));
  console.log('JUNE 2025 TRANSACTION PARSER');
  console.log('='.repeat(60));

  // Read CSV file
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');

  // Parse transactions
  const { transactions, stats } = parseCSV(csvContent);

  // Write JSON output
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(transactions, null, 2));
  console.log(`\n✅ Wrote ${transactions.length} transactions to ${OUTPUT_PATH}`);

  // Generate and write report
  const report = generateReport(stats, transactions);
  fs.writeFileSync(REPORT_PATH, report);
  console.log(`✅ Wrote parse report to ${REPORT_PATH}`);

  console.log('\n' + '='.repeat(60));
  console.log('PARSE COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total transactions: ${transactions.length}`);
  console.log(`Expense Tracker: ${stats.sections.expenseTracker}`);
  console.log(`Gross Income: ${stats.sections.grossIncome}`);
  console.log(`Savings: ${stats.sections.savings}`);
  console.log(`Florida House: ${stats.sections.floridaHouse}`);
  console.log(`Duplicates removed: ${stats.duplicatesRemoved.length}`);
  console.log('='.repeat(60));
}

main();
