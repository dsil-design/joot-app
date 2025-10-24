#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', 'csv_imports', 'fullImport_20251017.csv');

// Helper function to parse CSV line (handles quoted fields with commas)
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

// Parse amount from various formats
function parseAmount(str) {
  if (!str) return null;
  // Remove $, commas, and THB prefix
  const cleaned = str.replace(/[$,THB\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Extract currency from string
function extractCurrency(thbCol, usdCol) {
  if (thbCol && thbCol.includes('THB')) return 'THB';
  if (usdCol && usdCol.includes('$')) return 'USD';
  return null;
}

// Check if it's a date row
function isDateRow(row) {
  if (!row[0]) return false;
  const datePattern = /^"?(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+,\s+\d{4}/i;
  return datePattern.test(row[0]);
}

// Check if it's a transaction row (has description and amount)
function isTransactionRow(row, sectionType) {
  if (!row || row.length === 0) return false;

  // Skip header rows, totals, empty rows
  if (!row[1] || row[1].includes('TOTAL') || row[1].includes('Desc') ||
      row[1].includes('Estimated') || row[1].includes('Subtotal')) {
    return false;
  }

  switch (sectionType) {
    case 'expense_tracker':
      // Must have description (col 1) and amount (col 6 or 7)
      return row[1] && (row[6] || row[7]);
    case 'gross_income':
      // Must have description (col 1) and amount (col 3)
      return row[1] && row[3];
    case 'savings':
      // Must have description (col 1) and amount (col 4)
      return row[1] && row[4];
    case 'florida_house':
      // Must have description (col 1) and amount (col 5)
      return row[1] && row[5];
    default:
      return false;
  }
}

// Detect duplicates
function findDuplicates(expenseTransactions, floridaTransactions) {
  const duplicates = [];

  for (const florida of floridaTransactions) {
    for (const expense of expenseTransactions) {
      // Same merchant (case-insensitive) and same amount
      if (expense.merchant.toLowerCase() === florida.merchant.toLowerCase() &&
          Math.abs(expense.amount - florida.amount) < 0.01) {
        duplicates.push({
          merchant: expense.merchant,
          amount: expense.amount,
          expenseLine: expense.line,
          expenseDesc: expense.description,
          floridaLine: florida.line,
          floridaDesc: florida.description,
          expenseDate: expense.date,
          floridaDate: florida.date
        });
      }
    }
  }

  return duplicates;
}

// Main analysis
async function analyzeAugust2025() {
  console.log('='.repeat(80));
  console.log('AUGUST 2025 PRE-FLIGHT VALIDATION REPORT');
  console.log('='.repeat(80));
  console.log();

  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  const lines = content.split('\n');

  console.log(`Total lines in CSV: ${lines.length.toLocaleString()}`);
  console.log();

  // Find section boundaries
  const sections = {
    expense_tracker: { start: null, end: null },
    gross_income: { start: null, end: null },
    savings: { start: null, end: null },
    florida_house: { start: null, end: null }
  };

  // Scan for August 2025 sections
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('August 2025: Expense Tracker')) {
      sections.expense_tracker.start = i;
    } else if (line.includes('August 2025: Gross Income Tracker')) {
      sections.expense_tracker.end = i - 1;
      sections.gross_income.start = i;
    } else if (line.includes('August 2025: Personal Savings & Investments')) {
      sections.gross_income.end = i - 1;
      sections.savings.start = i;
    } else if (line.includes('August 2025: Deficit/Surplus')) {
      sections.savings.end = i - 1;
    } else if (line.includes('August 2025: Florida House Expenses')) {
      sections.florida_house.start = i;
    } else if (sections.florida_house.start && line.includes('July 2025: Expense Tracker')) {
      sections.florida_house.end = i - 1;
    }
  }

  console.log('SECTION BOUNDARIES');
  console.log('-'.repeat(80));
  for (const [name, bounds] of Object.entries(sections)) {
    if (bounds.start !== null) {
      console.log(`${name.padEnd(20)}: Lines ${bounds.start} - ${bounds.end || 'EOF'}`);
    } else {
      console.log(`${name.padEnd(20)}: NOT FOUND`);
    }
  }
  console.log();

  // Analyze Expense Tracker
  console.log('SECTION 1: EXPENSE TRACKER');
  console.log('-'.repeat(80));

  const expenseTransactions = [];
  let expenseGrandTotal = null;
  let reimbursementCount = 0;
  let businessExpenseCount = 0;
  let reimbursableCount = 0;
  let currentDate = null;
  const currencyDistribution = { USD: 0, THB: 0, OTHER: 0 };

  if (sections.expense_tracker.start) {
    for (let i = sections.expense_tracker.start; i <= sections.expense_tracker.end; i++) {
      const row = parseCSVLine(lines[i]);

      // Check for date rows
      if (isDateRow(row)) {
        currentDate = row[0];
        continue;
      }

      // Check for GRAND TOTAL (could be in column 0 or 1)
      if ((row[0] && row[0].includes('GRAND TOTAL')) || (row[1] && row[1].includes('GRAND TOTAL'))) {
        const totalStr = row[9] || row[7] || row[6];
        // Handle quoted amounts like "$8,025.57"
        const cleanStr = totalStr ? totalStr.replace(/["\s]/g, '') : null;
        expenseGrandTotal = parseAmount(cleanStr);
        continue;
      }

      if (isTransactionRow(row, 'expense_tracker')) {
        const description = row[1];
        const merchant = row[2];
        const reimbursable = (row[3] === 'X' || row[3] === 'x');
        const businessExpense = (row[4] === 'X' || row[4] === 'x');
        const thbAmount = row[6];
        const usdAmount = row[7];

        let amount = null;
        let currency = null;

        if (thbAmount && thbAmount.includes('THB')) {
          amount = parseAmount(thbAmount);
          currency = 'THB';
          currencyDistribution.THB++;
        } else if (usdAmount) {
          amount = parseAmount(usdAmount);
          currency = 'USD';
          currencyDistribution.USD++;
        }

        if (amount !== null) {
          expenseTransactions.push({
            line: i + 1,
            date: currentDate,
            description,
            merchant,
            amount,
            currency,
            reimbursable,
            businessExpense
          });

          if (description.toLowerCase().startsWith('reimbursement:')) {
            reimbursementCount++;
          }
          if (businessExpense) {
            businessExpenseCount++;
          }
          if (reimbursable) {
            reimbursableCount++;
          }
        }
      }
    }
  }

  console.log(`Transactions found: ${expenseTransactions.length}`);
  console.log(`GRAND TOTAL from CSV: $${expenseGrandTotal ? expenseGrandTotal.toFixed(2) : 'NOT FOUND'}`);
  console.log(`Reimbursements (income): ${reimbursementCount}`);
  console.log(`Business Expenses (tagged): ${businessExpenseCount}`);
  console.log(`Reimbursables (tracking only, no tag): ${reimbursableCount}`);
  console.log();

  // Analyze Gross Income Tracker
  console.log('SECTION 2: GROSS INCOME TRACKER');
  console.log('-'.repeat(80));

  const incomeTransactions = [];

  if (sections.gross_income.start) {
    for (let i = sections.gross_income.start; i <= sections.gross_income.end; i++) {
      const row = parseCSVLine(lines[i]);

      if (isTransactionRow(row, 'gross_income')) {
        const date = row[0];
        const description = row[1];
        const merchant = row[2];
        const amount = parseAmount(row[3]);

        if (amount !== null) {
          incomeTransactions.push({
            line: i + 1,
            date,
            description,
            merchant,
            amount
          });
        }
      }
    }
  }

  console.log(`Income transactions found: ${incomeTransactions.length}`);
  if (incomeTransactions.length > 0) {
    incomeTransactions.forEach(t => {
      console.log(`  Line ${t.line}: ${t.description} - ${t.merchant} - $${t.amount.toFixed(2)}`);
    });
  }
  console.log();

  // Analyze Personal Savings & Investments
  console.log('SECTION 3: PERSONAL SAVINGS & INVESTMENTS');
  console.log('-'.repeat(80));

  const savingsTransactions = [];

  if (sections.savings.start) {
    for (let i = sections.savings.start; i <= sections.savings.end; i++) {
      const row = parseCSVLine(lines[i]);

      if (isTransactionRow(row, 'savings')) {
        const date = row[0];
        const description = row[1];
        const merchant = row[2];
        const amount = parseAmount(row[4]);

        if (amount !== null) {
          savingsTransactions.push({
            line: i + 1,
            date,
            description,
            merchant,
            amount
          });
        }
      }
    }
  }

  console.log(`Savings transactions found: ${savingsTransactions.length}`);
  if (savingsTransactions.length > 0) {
    savingsTransactions.forEach(t => {
      console.log(`  Line ${t.line}: ${t.description} - ${t.merchant} - $${t.amount.toFixed(2)}`);
    });
  }
  console.log();

  // Analyze Florida House Expenses
  console.log('SECTION 4: FLORIDA HOUSE EXPENSES');
  console.log('-'.repeat(80));

  const floridaTransactions = [];
  let floridaGrandTotal = null;
  currentDate = null;

  if (sections.florida_house.start) {
    for (let i = sections.florida_house.start; i <= sections.florida_house.end; i++) {
      const row = parseCSVLine(lines[i]);

      // Check for date rows
      if (isDateRow(row)) {
        currentDate = row[0];
        continue;
      }

      // Check for GRAND TOTAL (could be in column 0 or 1)
      if ((row[0] && row[0].includes('GRAND TOTAL')) || (row[1] && row[1].includes('GRAND TOTAL'))) {
        floridaGrandTotal = parseAmount(row[5]);
        continue;
      }

      if (isTransactionRow(row, 'florida_house')) {
        const description = row[1];
        const merchant = row[2];
        const amount = parseAmount(row[5]);

        if (amount !== null) {
          floridaTransactions.push({
            line: i + 1,
            date: currentDate,
            description,
            merchant,
            amount
          });
        }
      }
    }
  }

  console.log(`Florida House transactions found: ${floridaTransactions.length}`);
  console.log(`GRAND TOTAL from CSV: $${floridaGrandTotal ? floridaGrandTotal.toFixed(2) : 'NOT FOUND'}`);
  console.log();

  // Duplicate Detection
  console.log('DUPLICATE DETECTION');
  console.log('-'.repeat(80));

  const duplicates = findDuplicates(expenseTransactions, floridaTransactions);

  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} potential duplicate(s):\n`);
    duplicates.forEach((dup, idx) => {
      console.log(`${idx + 1}. ${dup.merchant} - $${dup.amount.toFixed(2)}`);
      console.log(`   Expense Tracker (Line ${dup.expenseLine}): "${dup.expenseDesc}" [KEEPING]`);
      console.log(`   Florida House (Line ${dup.floridaLine}): "${dup.floridaDesc}" [REMOVING]`);
      console.log();
    });
  } else {
    console.log('No duplicates detected between Expense Tracker and Florida House.');
    console.log();
  }

  // Summary Statistics
  console.log('TRANSACTION SUMMARY');
  console.log('-'.repeat(80));
  const totalBeforeDupes = expenseTransactions.length + incomeTransactions.length +
                           savingsTransactions.length + floridaTransactions.length;
  const totalAfterDupes = totalBeforeDupes - duplicates.length;

  console.log(`Expense Tracker: ${expenseTransactions.length} transactions`);
  console.log(`Gross Income: ${incomeTransactions.length} transactions`);
  console.log(`Savings/Investments: ${savingsTransactions.length} transactions`);
  console.log(`Florida House: ${floridaTransactions.length} transactions`);
  console.log(`${'TOTAL (before deduplication)'.padEnd(30)}: ${totalBeforeDupes} transactions`);
  console.log(`${'Duplicates to remove'.padEnd(30)}: ${duplicates.length} transactions`);
  console.log(`${'TOTAL (after deduplication)'.padEnd(30)}: ${totalAfterDupes} transactions`);
  console.log();

  // Currency Distribution
  console.log('CURRENCY DISTRIBUTION (Expense Tracker)');
  console.log('-'.repeat(80));
  console.log(`USD transactions: ${currencyDistribution.USD}`);
  console.log(`THB transactions: ${currencyDistribution.THB}`);
  console.log(`Other/Unknown: ${currencyDistribution.OTHER}`);
  console.log();

  // Expected Total Calculation
  console.log('FINANCIAL VALIDATION');
  console.log('-'.repeat(80));

  if (expenseGrandTotal !== null) {
    console.log(`Expense Tracker NET (from CSV): $${expenseGrandTotal.toFixed(2)}`);

    if (floridaGrandTotal !== null) {
      const expectedTotal = expenseGrandTotal + floridaGrandTotal;
      console.log(`Florida House TOTAL (from CSV): $${floridaGrandTotal.toFixed(2)}`);
      console.log(`Expected Combined Total: $${expectedTotal.toFixed(2)}`);
      console.log();
      console.log(`Note: Savings/Investments are separate (already paid from income)`);
    }
  } else {
    console.log('WARNING: Could not extract GRAND TOTAL from Expense Tracker section!');
  }
  console.log();

  // Tag Distribution Preview
  console.log('TAG DISTRIBUTION PREVIEW');
  console.log('-'.repeat(80));
  console.log(`"Reimbursement" tag: ${reimbursementCount} transactions`);
  console.log(`"Business Expense" tag: ${businessExpenseCount} transactions`);
  console.log(`"Savings/Investment" tag: ${savingsTransactions.length} transactions`);
  console.log(`"Florida House" tag: ${floridaTransactions.length - duplicates.length} transactions (after dedup)`);
  console.log();

  // Comparison with September 2025 Baseline
  console.log('COMPARISON WITH SEPTEMBER 2025 BASELINE');
  console.log('-'.repeat(80));
  console.log(`September 2025: 159 transactions total`);
  console.log(`August 2025: ${totalAfterDupes} transactions total`);
  const variance = ((totalAfterDupes - 159) / 159 * 100).toFixed(2);
  console.log(`Variance: ${variance}%`);

  if (Math.abs(parseFloat(variance)) <= 5) {
    console.log(`Status: Within acceptable range (<5%)`);
  } else {
    console.log(`WARNING: Variance exceeds 5% - review recommended`);
  }
  console.log();

  // Anomalous Date Detection
  console.log('ANOMALOUS DATE DETECTION');
  console.log('-'.repeat(80));

  const anomalies = [];

  // Check for dates with wrong year or month (not August 2025)
  [...expenseTransactions, ...incomeTransactions, ...savingsTransactions, ...floridaTransactions]
    .forEach(t => {
      if (t.date) {
        // Extract year from date string
        const yearMatch = t.date.match(/\d{4}/);
        const year = yearMatch ? yearMatch[0] : null;

        // Check if year is not 2025
        if (year && year !== '2025') {
          anomalies.push({
            line: t.line,
            date: t.date,
            description: t.description,
            merchant: t.merchant
          });
        } else if (!t.date.includes('August') && !t.date.match(/^8\/\d+\/2025$/)) {
          // Also flag if month is not August (but allow 8/DD/2025 format)
          anomalies.push({
            line: t.line,
            date: t.date,
            description: t.description,
            merchant: t.merchant
          });
        }
      }
    });

  if (anomalies.length > 0) {
    console.log(`Found ${anomalies.length} anomalous date(s) requiring correction:\n`);
    anomalies.forEach(a => {
      console.log(`  Line ${a.line}: "${a.date}"`);
      console.log(`    ${a.description} - ${a.merchant}`);
      console.log(`    ACTION REQUIRED: Correct to August 2025 during parsing\n`);
    });
  } else {
    console.log('No anomalous dates detected - all dates are in August 2025.');
  }
  console.log();

  // Red Flags & Structural Issues
  console.log('RED FLAGS & STRUCTURAL ISSUES');
  console.log('-'.repeat(80));

  const redFlags = [];

  if (!sections.expense_tracker.start) {
    redFlags.push('CRITICAL: Expense Tracker section not found!');
  }
  if (!sections.gross_income.start) {
    redFlags.push('WARNING: Gross Income Tracker section not found');
  }
  if (!sections.savings.start) {
    redFlags.push('WARNING: Personal Savings & Investments section not found');
  }
  if (!sections.florida_house.start) {
    redFlags.push('WARNING: Florida House Expenses section not found');
  }
  if (expenseGrandTotal === null) {
    redFlags.push('ERROR: Could not extract GRAND TOTAL from Expense Tracker');
  }
  if (expenseTransactions.length === 0) {
    redFlags.push('CRITICAL: No transactions found in Expense Tracker!');
  }
  if (Math.abs(parseFloat(variance)) > 30) {
    redFlags.push(`CRITICAL: Transaction count variance (${variance}%) is extremely high`);
  } else if (Math.abs(parseFloat(variance)) > 20) {
    redFlags.push(`WARNING: Transaction count variance (${variance}%) is unusually high (expected for August)`);
  }
  if (duplicates.length > 10) {
    redFlags.push(`WARNING: High number of duplicates detected (${duplicates.length})`);
  }

  if (redFlags.length > 0) {
    redFlags.forEach(flag => console.log(`  ${flag}`));
  } else {
    console.log('  No red flags detected - data structure looks good!');
  }
  console.log();

  console.log('='.repeat(80));
  console.log('PRE-FLIGHT VALIDATION COMPLETE');
  console.log('='.repeat(80));
  console.log();
  console.log('Next steps:');
  console.log('  1. Review any red flags or warnings above');
  console.log('  2. Verify GRAND TOTAL amounts match your expectations');
  console.log('  3. Confirm duplicate detection results');
  console.log('  4. If everything looks good, proceed with parsing & import');
  console.log();
}

// Run the analysis
analyzeAugust2025().catch(err => {
  console.error('Error during analysis:', err);
  process.exit(1);
});
