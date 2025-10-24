#!/usr/bin/env node

/**
 * Parse August 2025 Transactions - Following FINAL_PARSING_RULES.md
 *
 * Source: csv_imports/fullImport_20251017.csv (lines 648-949)
 *
 * This script parses all 4 sections:
 * 1. Expense Tracker (lines 649-905)
 * 2. Gross Income Tracker (lines 907-920)
 * 3. Personal Savings & Investments (lines 921-924)
 * 4. Florida House Expenses (lines 936-949)
 */

const fs = require('fs');
const path = require('path');

// Statistics tracking
const stats = {
  expenseTracker: { count: 0, reimbursements: 0, businessExpenses: 0 },
  grossIncome: { count: 0 },
  savings: { count: 0 },
  floridaHouse: { count: 0 },
  duplicatesRemoved: [],
  dateCorrections: [],
  currencyBreakdown: { USD: 0, THB: 0 },
  warnings: []
};

const transactions = [];

/**
 * Parse date from various formats
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;

  // Format 1: "Monday, September 1, 2025"
  const fullDateMatch = dateStr.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d+),\s+(\d{4})/);
  if (fullDateMatch) {
    const [, , monthName, day, year] = fullDateMatch;
    const monthMap = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04',
      'May': '05', 'June': '06', 'July': '07', 'August': '08',
      'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    const month = monthMap[monthName];
    const paddedDay = day.padStart(2, '0');
    return `${year}-${month}-${paddedDay}`;
  }

  // Format 2: "M/D/YYYY" or "MM/DD/YYYY"
  const slashDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashDateMatch) {
    const [, month, day, year] = slashDateMatch;
    const paddedMonth = month.padStart(2, '0');
    const paddedDay = day.padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
  }

  return null;
}

/**
 * Apply date correction for known anomalies
 */
function correctAnomalousDate(dateStr, description, merchant) {
  // Known issue: Line 909 has year 2004 instead of 2025
  if (dateStr === '2004-08-01' && description === 'Freelance Income - July' && merchant === 'NJDA') {
    stats.dateCorrections.push({
      original: dateStr,
      corrected: '2025-08-01',
      description,
      merchant
    });
    return '2025-08-01';
  }
  return dateStr;
}

/**
 * Parse currency and amount from CSV columns
 */
function parseCurrencyAmount(thbCol, usdCol) {
  // Check THB column first (col 6)
  if (thbCol && thbCol.trim() !== '') {
    const thbMatch = thbCol.match(/THB\s*([\d,.-]+)/);
    if (thbMatch) {
      const amount = Math.abs(parseFloat(thbMatch[1].replace(/,/g, '')));
      const isNegative = thbCol.includes('-');
      return { amount: isNegative ? -amount : amount, currency: 'THB' };
    }
  }

  // Check USD column (col 7)
  if (usdCol && usdCol.trim() !== '') {
    const cleanAmount = usdCol.replace(/[$,()]/g, '').trim();
    if (cleanAmount !== '') {
      const amount = parseFloat(cleanAmount);
      return { amount, currency: 'USD' };
    }
  }

  return { amount: 0, currency: 'USD' };
}

/**
 * Parse Expense Tracker Section
 */
function parseExpenseTracker(lines) {
  console.log('\n=== PARSING EXPENSE TRACKER ===');
  let currentDate = null;
  let inExpenseTracker = false;
  let processedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cols = parseCSVLine(line);

    // Detect section start
    if (line.includes('August 2025: Expense Tracker')) {
      inExpenseTracker = true;
      continue;
    }

    // Detect section end
    if (line.includes('GRAND TOTAL') && inExpenseTracker) {
      console.log(`  Processed ${processedCount} transactions from Expense Tracker`);
      break;
    }

    if (!inExpenseTracker) continue;

    // Skip header rows
    if (line.includes('Desc,Merchant,Reimbursable')) continue;

    // Skip empty rows
    if (cols.every(c => !c || c.trim() === '')) continue;

    // Check for date row
    const possibleDate = parseDate(cols[0]);
    if (possibleDate) {
      currentDate = possibleDate;
      continue;
    }

    // Skip daily total and subtotal rows
    if (cols[1] && (cols[1].includes('Daily Total') || cols[1].includes('Subtotal') || cols[1].includes('Estimated'))) {
      continue;
    }

    // Parse transaction row
    if (cols[1] && cols[1].trim() !== '' && currentDate) {
      const description = cols[1].trim();
      const merchant = cols[2] ? cols[2].trim() : '';
      const reimbursable = cols[3] === 'X' || cols[3] === 'x';
      const businessExpense = cols[4] === 'X' || cols[4] === 'x';
      const paymentMethod = cols[5] ? cols[5].trim() : '';

      // Parse currency and amount
      const { amount, currency } = parseCurrencyAmount(cols[6], cols[7]);

      if (amount === 0) continue; // Skip zero amount rows

      // Determine transaction type and tags
      let transactionType = 'expense';
      const tags = [];

      // Check for reimbursement (income)
      if (description.toLowerCase().startsWith('reimbursement:')) {
        transactionType = 'income';
        tags.push('Reimbursement');
        stats.expenseTracker.reimbursements++;
      }

      // Check for business expense tag
      if (businessExpense) {
        tags.push('Business Expense');
        stats.expenseTracker.businessExpenses++;
      }

      // Store transaction
      const transaction = {
        date: currentDate,
        description,
        merchant: merchant || 'Unknown',
        payment_method: paymentMethod || 'Unknown',
        amount: Math.abs(amount),
        currency,
        transaction_type: transactionType,
        tags,
        section: 'Expense Tracker'
      };

      transactions.push(transaction);
      stats.expenseTracker.count++;
      stats.currencyBreakdown[currency]++;
      processedCount++;
    }
  }
}

/**
 * Parse Gross Income Tracker Section
 */
function parseGrossIncomeTracker(lines) {
  console.log('\n=== PARSING GROSS INCOME TRACKER ===');
  let inSection = false;
  let processedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cols = parseCSVLine(line);

    // Detect section start
    if (line.includes('August 2025: Gross Income Tracker')) {
      inSection = true;
      continue;
    }

    // Detect section end
    if (line.includes('GROSS INCOME TOTAL') || line.includes('August 2025: Personal Savings')) {
      console.log(`  Processed ${processedCount} transactions from Gross Income Tracker`);
      break;
    }

    if (!inSection) continue;

    // Skip header row
    if (line.includes('Date Receieved,Description,Source')) continue;

    // Skip rows with "Estimated" or "TOTAL"
    if (cols[1] && (cols[1].includes('Estimated') || cols[1].includes('TOTAL'))) continue;

    // Skip empty rows
    if (cols.every(c => !c || c.trim() === '')) continue;

    // Parse transaction
    if (cols[0] && cols[1] && cols[2] && cols[3]) {
      let date = parseDate(cols[0]);
      const description = cols[1].trim();
      const merchant = cols[2].trim();
      const amountStr = cols[3].replace(/[$,]/g, '').trim();
      const amount = parseFloat(amountStr);

      if (isNaN(amount) || amount === 0) continue;

      // Apply date correction
      date = correctAnomalousDate(date, description, merchant);

      const transaction = {
        date,
        description,
        merchant,
        payment_method: 'PNC: Personal',
        amount,
        currency: 'USD',
        transaction_type: 'income',
        tags: [],
        section: 'Gross Income Tracker'
      };

      transactions.push(transaction);
      stats.grossIncome.count++;
      stats.currencyBreakdown.USD++;
      processedCount++;
    }
  }
}

/**
 * Parse Personal Savings & Investments Section
 */
function parseSavingsInvestments(lines) {
  console.log('\n=== PARSING PERSONAL SAVINGS & INVESTMENTS ===');
  let inSection = false;
  let processedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cols = parseCSVLine(line);

    // Detect section start
    if (line.includes('August 2025: Personal Savings & Investments')) {
      inSection = true;
      continue;
    }

    // Detect section end
    if (line.includes('TOTAL') && inSection) {
      console.log(`  Processed ${processedCount} transactions from Personal Savings & Investments`);
      break;
    }

    if (!inSection) continue;

    // Skip header row
    if (line.includes('Date Made,Description,Vendor')) continue;

    // Skip empty rows
    if (cols.every(c => !c || c.trim() === '')) continue;

    // Parse transaction
    if (cols[0] && cols[1] && cols[2] && cols[4]) {
      const date = parseDate(cols[0]);
      const description = cols[1].trim();
      const merchant = cols[2].trim();
      const paymentMethod = cols[3] ? cols[3].trim() : 'Unknown';
      const amountStr = cols[4].replace(/[$,]/g, '').trim();
      const amount = parseFloat(amountStr);

      if (!date || isNaN(amount) || amount === 0) continue;

      const transaction = {
        date,
        description,
        merchant,
        payment_method: paymentMethod,
        amount,
        currency: 'USD',
        transaction_type: 'expense',
        tags: ['Savings/Investment'],
        section: 'Personal Savings & Investments'
      };

      transactions.push(transaction);
      stats.savings.count++;
      stats.currencyBreakdown.USD++;
      processedCount++;
    }
  }
}

/**
 * Parse Florida House Expenses Section
 */
function parseFloridaHouseExpenses(lines) {
  console.log('\n=== PARSING FLORIDA HOUSE EXPENSES ===');
  let inSection = false;
  let currentDate = null;
  let processedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cols = parseCSVLine(line);

    // Detect section start
    if (line.includes('August 2025: Florida House Expenses')) {
      inSection = true;
      continue;
    }

    // Detect section end
    if (line.includes('GRAND TOTAL') && inSection) {
      console.log(`  Processed ${processedCount} transactions from Florida House Expenses`);
      break;
    }

    if (!inSection) continue;

    // Skip header rows
    if (line.includes('Desc,Merchant,Reimbursement')) continue;

    // Skip empty rows
    if (cols.every(c => !c || c.trim() === '')) continue;

    // Check for date row
    const possibleDate = parseDate(cols[0]);
    if (possibleDate) {
      currentDate = possibleDate;
      continue;
    }

    // Parse transaction row
    if (cols[1] && cols[1].trim() !== '' && cols[5] && currentDate) {
      const description = cols[1].trim();
      const merchant = cols[2] ? cols[2].trim() : '';
      const paymentMethod = cols[4] ? cols[4].trim() : '';
      const amountStr = cols[5].replace(/[$,]/g, '').trim();
      const amount = parseFloat(amountStr);

      if (isNaN(amount) || amount === 0) continue;

      const transaction = {
        date: currentDate,
        description,
        merchant: merchant || 'Unknown',
        payment_method: paymentMethod || 'Unknown',
        amount,
        currency: 'USD',
        transaction_type: 'expense',
        tags: ['Florida House'],
        section: 'Florida House Expenses'
      };

      transactions.push(transaction);
      stats.floridaHouse.count++;
      stats.currencyBreakdown.USD++;
      processedCount++;
    }
  }
}

/**
 * Detect and remove duplicates
 */
function removeDuplicates() {
  console.log('\n=== DUPLICATE DETECTION ===');

  const duplicateIndices = [];

  // Known duplicate: Xfinity $73.00
  // Line 802 (Expense Tracker) vs Line 946 (Florida House)
  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const t1 = transactions[i];
      const t2 = transactions[j];

      // Check if they match duplicate criteria
      if (
        t1.merchant.toLowerCase() === t2.merchant.toLowerCase() &&
        Math.abs(t1.amount - t2.amount) < 0.01 &&
        t1.currency === t2.currency &&
        Math.abs(new Date(t1.date) - new Date(t2.date)) <= 3 * 24 * 60 * 60 * 1000
      ) {
        // Duplicate found - keep Expense Tracker version, remove Florida House version
        if (t1.section === 'Expense Tracker' && t2.section === 'Florida House Expenses') {
          duplicateIndices.push(j);
          stats.duplicatesRemoved.push({
            merchant: t1.merchant,
            amount: t1.amount,
            date: t1.date,
            kept: `${t1.section}: "${t1.description}"`,
            removed: `${t2.section}: "${t2.description}"`
          });
        } else if (t1.section === 'Florida House Expenses' && t2.section === 'Expense Tracker') {
          duplicateIndices.push(i);
          stats.duplicatesRemoved.push({
            merchant: t2.merchant,
            amount: t2.amount,
            date: t2.date,
            kept: `${t2.section}: "${t2.description}"`,
            removed: `${t1.section}: "${t1.description}"`
          });
        }
      }
    }
  }

  // Remove duplicates (in reverse order to maintain indices)
  const uniqueIndices = [...new Set(duplicateIndices)].sort((a, b) => b - a);
  for (const idx of uniqueIndices) {
    transactions.splice(idx, 1);
  }

  console.log(`  Found and removed ${stats.duplicatesRemoved.length} duplicate(s)`);
  if (stats.duplicatesRemoved.length > 0) {
    stats.duplicatesRemoved.forEach((dup, i) => {
      console.log(`  ${i + 1}. ${dup.merchant} - $${dup.amount.toFixed(2)} on ${dup.date}`);
      console.log(`     ✓ KEPT: ${dup.kept}`);
      console.log(`     ✗ REMOVED: ${dup.removed}`);
    });
  }
}

/**
 * Simple CSV line parser (handles quoted fields with commas)
 */
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

/**
 * Generate validation report
 */
function generateReport() {
  const totalTransactions = transactions.length;
  const totalBeforeDedup = stats.expenseTracker.count + stats.grossIncome.count +
                           stats.savings.count + stats.floridaHouse.count;

  let report = `# August 2025 Transaction Parse Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Source:** csv_imports/fullImport_20251017.csv (lines 648-949)\n`;
  report += `**Parsing Rules:** scripts/FINAL_PARSING_RULES.md\n\n`;
  report += `---\n\n`;

  report += `## Summary\n\n`;
  report += `- **Total Transactions (before dedup):** ${totalBeforeDedup}\n`;
  report += `- **Total Transactions (after dedup):** ${totalTransactions}\n`;
  report += `- **Duplicates Removed:** ${stats.duplicatesRemoved.length}\n`;
  report += `- **Date Corrections Applied:** ${stats.dateCorrections.length}\n\n`;

  report += `---\n\n`;

  report += `## Transaction Counts by Section\n\n`;
  report += `| Section | Count |\n`;
  report += `|---------|-------|\n`;
  report += `| Expense Tracker | ${stats.expenseTracker.count} |\n`;
  report += `| Gross Income Tracker | ${stats.grossIncome.count} |\n`;
  report += `| Personal Savings & Investments | ${stats.savings.count} |\n`;
  report += `| Florida House Expenses | ${stats.floridaHouse.count} |\n`;
  report += `| **Total (before dedup)** | **${totalBeforeDedup}** |\n`;
  report += `| **Total (after dedup)** | **${totalTransactions}** |\n\n`;

  report += `---\n\n`;

  report += `## Tag Distribution\n\n`;
  const tagCounts = {};
  transactions.forEach(t => {
    t.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  report += `| Tag | Count |\n`;
  report += `|-----|-------|\n`;
  Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).forEach(([tag, count]) => {
    report += `| ${tag} | ${count} |\n`;
  });
  if (Object.keys(tagCounts).length === 0) {
    report += `| *(No tags)* | 0 |\n`;
  }
  report += `\n`;

  report += `**Reimbursements (from Expense Tracker):** ${stats.expenseTracker.reimbursements}\n\n`;

  report += `---\n\n`;

  report += `## Currency Breakdown\n\n`;
  report += `| Currency | Count |\n`;
  report += `|----------|-------|\n`;
  report += `| USD | ${stats.currencyBreakdown.USD} |\n`;
  report += `| THB | ${stats.currencyBreakdown.THB} |\n\n`;

  report += `---\n\n`;

  report += `## Duplicate Detection Report\n\n`;
  if (stats.duplicatesRemoved.length > 0) {
    report += `Found **${stats.duplicatesRemoved.length}** potential duplicate(s):\n\n`;
    stats.duplicatesRemoved.forEach((dup, i) => {
      report += `### ${i + 1}. ${dup.merchant} - $${dup.amount.toFixed(2)} on ${dup.date}\n`;
      report += `- **KEPT:** ${dup.kept}\n`;
      report += `- **REMOVED:** ${dup.removed}\n\n`;
    });
  } else {
    report += `No duplicates detected.\n\n`;
  }

  report += `---\n\n`;

  report += `## Date Corrections Applied\n\n`;
  if (stats.dateCorrections.length > 0) {
    stats.dateCorrections.forEach((correction, i) => {
      report += `### ${i + 1}. ${correction.description} - ${correction.merchant}\n`;
      report += `- **Original Date:** ${correction.original}\n`;
      report += `- **Corrected Date:** ${correction.corrected}\n\n`;
    });
  } else {
    report += `No date corrections needed.\n\n`;
  }

  report += `---\n\n`;

  report += `## Financial Validation\n\n`;

  // Calculate totals
  const expenseTotal = transactions
    .filter(t => t.transaction_type === 'expense' && t.section === 'Expense Tracker' && t.currency === 'USD')
    .reduce((sum, t) => sum + t.amount, 0);

  const incomeTotal = transactions
    .filter(t => t.transaction_type === 'income' && t.section === 'Expense Tracker' && t.currency === 'USD')
    .reduce((sum, t) => sum + t.amount, 0);

  const thbExpenseTotal = transactions
    .filter(t => t.transaction_type === 'expense' && t.section === 'Expense Tracker' && t.currency === 'THB')
    .reduce((sum, t) => sum + t.amount, 0);

  const thbIncomeTotal = transactions
    .filter(t => t.transaction_type === 'income' && t.section === 'Expense Tracker' && t.currency === 'THB')
    .reduce((sum, t) => sum + t.amount, 0);

  const netExpenseTracker = expenseTotal - incomeTotal;

  report += `### Expense Tracker Summary\n\n`;
  report += `- **USD Expenses:** $${expenseTotal.toFixed(2)}\n`;
  report += `- **USD Income/Reimbursements:** $${incomeTotal.toFixed(2)}\n`;
  report += `- **THB Expenses:** THB ${thbExpenseTotal.toFixed(2)}\n`;
  report += `- **THB Income/Reimbursements:** THB ${thbIncomeTotal.toFixed(2)}\n`;
  report += `- **Net (USD Expenses - USD Income):** $${netExpenseTracker.toFixed(2)}\n\n`;

  report += `### Expected vs Actual\n\n`;
  const expectedGrandTotal = 8025.57; // From CSV line 905
  const variance = Math.abs(expectedGrandTotal - netExpenseTracker);
  const percentVariance = ((variance / expectedGrandTotal) * 100).toFixed(2);

  report += `- **Expected Grand Total (from CSV):** $${expectedGrandTotal.toFixed(2)}\n`;
  report += `- **Calculated Net Total:** $${netExpenseTracker.toFixed(2)}\n`;
  report += `- **Variance:** $${variance.toFixed(2)} (${percentVariance}%)\n\n`;

  if (parseFloat(percentVariance) <= 1.5) {
    report += `✅ **Status:** PASS (within 1.5% tolerance)\n\n`;
  } else {
    report += `⚠️  **Status:** WARNING (exceeds 1.5% tolerance)\n\n`;
  }

  report += `---\n\n`;

  report += `## Warnings and Issues\n\n`;
  if (stats.warnings.length > 0) {
    stats.warnings.forEach((warning, i) => {
      report += `${i + 1}. ${warning}\n`;
    });
  } else {
    report += `No warnings or issues detected.\n`;
  }

  report += `\n---\n\n`;
  report += `## Next Steps\n\n`;
  report += `1. Review this report for accuracy\n`;
  report += `2. Verify transaction counts match expectations\n`;
  report += `3. Check financial validation results\n`;
  report += `4. Proceed to Phase 3: Database import using clean-slate-and-import.js\n\n`;
  report += `---\n\n`;
  report += `**Status:** ✅ Ready for database import\n`;

  return report;
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   August 2025 Transaction Parser                          ║');
  console.log('║   Following FINAL_PARSING_RULES.md                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Read CSV file
  const csvPath = path.join(__dirname, '../csv_imports/fullImport_20251017.csv');
  console.log(`\nReading CSV: ${csvPath}`);

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const allLines = csvContent.split('\n');

  // Extract August 2025 section (lines 648-949)
  const augustLines = allLines.slice(647, 949); // 0-indexed, so 647 = line 648

  console.log(`Extracted ${augustLines.length} lines for August 2025 (lines 648-949)`);

  // Parse each section
  parseExpenseTracker(augustLines);
  parseGrossIncomeTracker(augustLines);
  parseSavingsInvestments(augustLines);
  parseFloridaHouseExpenses(augustLines);

  // Remove duplicates
  removeDuplicates();

  console.log('\n=== FINAL STATISTICS ===');
  console.log(`Total transactions: ${transactions.length}`);
  console.log(`  - Expense Tracker: ${stats.expenseTracker.count}`);
  console.log(`  - Gross Income: ${stats.grossIncome.count}`);
  console.log(`  - Savings/Investment: ${stats.savings.count}`);
  console.log(`  - Florida House: ${stats.floridaHouse.count}`);
  console.log(`  - Reimbursements: ${stats.expenseTracker.reimbursements}`);
  console.log(`  - Duplicates removed: ${stats.duplicatesRemoved.length}`);
  console.log(`  - Date corrections: ${stats.dateCorrections.length}`);
  console.log(`Currency breakdown: USD=${stats.currencyBreakdown.USD}, THB=${stats.currencyBreakdown.THB}`);

  // Save parsed transactions
  const outputPath = path.join(__dirname, 'august-2025-CORRECTED.json');
  fs.writeFileSync(outputPath, JSON.stringify(transactions, null, 2));
  console.log(`\n✓ Saved parsed transactions to: ${outputPath}`);

  // Generate and save report
  const report = generateReport();
  const reportPath = path.join(__dirname, 'AUGUST-2025-PARSE-REPORT.md');
  fs.writeFileSync(reportPath, report);
  console.log(`✓ Generated parse report: ${reportPath}`);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   ✓ PARSING COMPLETE                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

// Run the parser
main().catch(error => {
  console.error('ERROR:', error);
  process.exit(1);
});
