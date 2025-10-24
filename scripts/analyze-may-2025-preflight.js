#!/usr/bin/env node

/**
 * MAY 2025 PREFLIGHT ANALYSIS
 *
 * Comprehensive pre-import validation for May 2025 data
 * Analyzes structure, counts, totals, duplicates, tags, and currencies
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../csv_imports/fullImport_20251017.csv');
const OUTPUT_PATH = path.join(__dirname, 'MAY-2025-PREFLIGHT-REPORT.txt');

// Section markers
const SECTIONS = {
  EXPENSE_TRACKER: 'May 2025: Expense Tracker',
  GROSS_INCOME: 'May 2025: Gross Income Tracker',
  SAVINGS: 'May 2025: Personal Savings & Investments',
  FLORIDA_HOUSE: 'May 2025: Florida House Expenses',
  TAKE_HOME: 'May 2025: Personal Take Home',
  DEFICIT: 'May 2025: Deficit/Surplus'
};

// Date regex patterns
const DATE_PATTERNS = {
  FULL_DAY: /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d+),\s+(\d{4})$/,
  SHORT_DATE: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
};

// Parse month name to number
const MONTH_MAP = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12
};

// Track anomalies
const anomalies = [];
const warnings = [];
const currencyDistribution = { USD: 0, THB: 0, VND: 0, MYR: 0, CNY: 0, OTHER: [] };

// Parse CSV
function parseCSV(content) {
  const lines = content.split('\n');
  const rows = lines.map(line => {
    // Simple CSV parser that handles quoted fields
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
  });

  return { lines, rows };
}

// Find section boundaries
function findSectionBoundaries(rows) {
  const boundaries = {};

  for (let i = 0; i < rows.length; i++) {
    const firstCol = (rows[i][0] || '').trim();

    if (firstCol === SECTIONS.EXPENSE_TRACKER) {
      boundaries.expenseStart = i;
    } else if (firstCol === SECTIONS.GROSS_INCOME) {
      if (boundaries.expenseStart !== undefined) {
        boundaries.expenseEnd = i - 1;
      }
      boundaries.incomeStart = i;
    } else if (firstCol === SECTIONS.SAVINGS) {
      if (boundaries.incomeStart !== undefined) {
        boundaries.incomeEnd = i - 1;
      }
      boundaries.savingsStart = i;
    } else if (firstCol === SECTIONS.DEFICIT || firstCol === SECTIONS.TAKE_HOME) {
      // These sections mark the end of Savings (if we haven't seen Florida House yet)
      if (boundaries.savingsStart !== undefined && boundaries.savingsEnd === undefined) {
        boundaries.savingsEnd = i - 1;
      }
    } else if (firstCol === SECTIONS.FLORIDA_HOUSE) {
      // If we haven't closed savings yet, close it now
      if (boundaries.savingsStart !== undefined && boundaries.savingsEnd === undefined) {
        boundaries.savingsEnd = i - 1;
      }
      boundaries.floridaStart = i;
    }
  }

  // Close any open sections
  if (boundaries.floridaStart && !boundaries.floridaEnd) {
    // Find the next section after Florida House or use end of file
    for (let i = boundaries.floridaStart + 1; i < rows.length; i++) {
      const firstCol = (rows[i][0] || '').trim();
      if (firstCol.startsWith('June 2025:') || firstCol.startsWith('April 2025:') ||
          firstCol.startsWith('January 2025:') || firstCol.startsWith('February 2025:') ||
          firstCol.startsWith('March 2025:') || firstCol.startsWith('July 2025:') ||
          firstCol.startsWith('August 2025:') || firstCol.startsWith('September 2025:') ||
          firstCol.startsWith('October 2025:') || firstCol.startsWith('November 2025:') ||
          firstCol.startsWith('December 2025:')) {
        boundaries.floridaEnd = i - 1;
        break;
      }
    }
    if (!boundaries.floridaEnd) {
      boundaries.floridaEnd = rows.length - 1;
    }
  }

  return boundaries;
}

// Parse date from various formats
function parseDate(dateStr) {
  const fullDayMatch = dateStr.match(DATE_PATTERNS.FULL_DAY);
  if (fullDayMatch) {
    const [, , monthName, day, year] = fullDayMatch;
    const month = MONTH_MAP[monthName];
    if (month) {
      return { year: parseInt(year), month, day: parseInt(day) };
    }
  }

  const shortMatch = dateStr.match(DATE_PATTERNS.SHORT_DATE);
  if (shortMatch) {
    const [month, day, year] = dateStr.split('/').map(n => parseInt(n));
    return { year, month, day };
  }

  return null;
}

// Check for date anomalies
function checkDateAnomaly(dateStr, lineNum) {
  const parsed = parseDate(dateStr);
  if (!parsed) return;

  // Check for wrong year
  if (parsed.year !== 2025) {
    anomalies.push({
      type: 'DATE_ANOMALY',
      line: lineNum,
      message: `Wrong year detected: ${dateStr} (expected 2025)`,
      severity: 'ERROR'
    });
  }

  // Check for wrong month
  if (parsed.month !== 5) {
    anomalies.push({
      type: 'DATE_ANOMALY',
      line: lineNum,
      message: `Wrong month detected: ${dateStr} (expected May)`,
      severity: 'WARNING'
    });
  }
}

// Analyze Expense Tracker section
function analyzeExpenseTracker(rows, start, end) {
  const section = {
    name: 'Expense Tracker',
    start,
    end,
    transactions: 0,
    reimbursements: 0,
    businessExpenses: 0,
    reimbursables: 0,
    grandTotal: null,
    netTotal: 0,
    currencies: { USD: 0, THB: 0, VND: 0, MYR: 0, CNY: 0, OTHER: [] },
    transactions_list: [],
    reimbursement_samples: [],
    business_expense_samples: []
  };

  let currentDate = null;

  for (let i = start + 1; i <= end; i++) {
    const row = rows[i];
    const firstCol = (row[0] || '').trim();
    const desc = (row[1] || '').trim();
    const merchant = (row[2] || '').trim();
    const reimbursable = (row[3] || '').trim();
    const businessExpense = (row[4] || '').trim();
    const thbCol = (row[6] || '').trim();
    const usdCol = (row[7] || '').trim();
    const subtotal = (row[9] || '').trim();

    // Check if this is a date row
    if (firstCol && DATE_PATTERNS.FULL_DAY.test(firstCol)) {
      currentDate = firstCol;
      checkDateAnomaly(firstCol, i + 1);
      continue;
    }

    // Check for GRAND TOTAL (can be in first column or desc column)
    if ((firstCol === 'GRAND TOTAL' || desc === 'GRAND TOTAL') && subtotal) {
      const totalMatch = subtotal.match(/[\$-]?([\d,]+\.\d{2})/);
      if (totalMatch) {
        section.grandTotal = parseFloat(totalMatch[1].replace(/,/g, ''));
      }
    }

    // Skip header, total, and empty rows
    if (!desc || desc.includes('Daily Total') || desc.includes('GRAND TOTAL') ||
        desc === 'Desc' || desc.includes('Estimated') || desc.includes('Subtotal') ||
        firstCol === 'GRAND TOTAL') {
      continue;
    }

    // Valid transaction
    section.transactions++;

    // Check for reimbursement
    if (desc.toLowerCase().startsWith('reimbursement:')) {
      section.reimbursements++;
      if (section.reimbursement_samples.length < 5) {
        section.reimbursement_samples.push({ line: i + 1, desc, merchant });
      }
    }

    // Check for business expense
    if (businessExpense === 'X' || businessExpense === 'x') {
      section.businessExpenses++;
      if (section.business_expense_samples.length < 5) {
        section.business_expense_samples.push({ line: i + 1, desc, merchant });
      }
    }

    // Check for reimbursable (column 3)
    if (reimbursable === 'X' || reimbursable === 'x') {
      section.reimbursables++;
    }

    // Detect currency
    let currency = null;
    let amount = null;

    // Check THB column first
    if (thbCol) {
      if (thbCol.includes('THB')) {
        currency = 'THB';
        section.currencies.THB++;
        currencyDistribution.THB++;
        const match = thbCol.match(/THB\s*([\d,.-]+)/);
        if (match) {
          amount = parseFloat(match[1].replace(/,/g, ''));
        }
      } else if (thbCol.includes('VND')) {
        currency = 'VND';
        section.currencies.VND++;
        currencyDistribution.VND++;
      } else if (thbCol.includes('MYR')) {
        currency = 'MYR';
        section.currencies.MYR++;
        currencyDistribution.MYR++;
      } else if (thbCol.includes('CNY')) {
        currency = 'CNY';
        section.currencies.CNY++;
        currencyDistribution.CNY++;
      } else {
        // Unknown currency in THB column
        const unknownMatch = thbCol.match(/([A-Z]{3})\s*([\d,.-]+)/);
        if (unknownMatch) {
          const unknownCurrency = unknownMatch[1];
          if (!section.currencies.OTHER.includes(unknownCurrency)) {
            section.currencies.OTHER.push(unknownCurrency);
          }
          if (!currencyDistribution.OTHER.includes(unknownCurrency)) {
            currencyDistribution.OTHER.push(unknownCurrency);
          }
          warnings.push({
            type: 'UNKNOWN_CURRENCY',
            line: i + 1,
            message: `Unknown currency detected: ${unknownCurrency}`,
            severity: 'WARNING'
          });
        }
      }
    }

    // Check USD column
    if (!currency && usdCol) {
      currency = 'USD';
      section.currencies.USD++;
      currencyDistribution.USD++;
      const match = usdCol.match(/[\$]?([\d,.-]+)/);
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ''));
      }
    }

    // Calculate net total from subtotal
    if (subtotal) {
      const subtotalMatch = subtotal.match(/[\$-]?([\d,.-]+)/);
      if (subtotalMatch) {
        const subtotalAmount = parseFloat(subtotalMatch[1].replace(/,/g, ''));
        if (subtotal.includes('-') || subtotal.includes('(')) {
          section.netTotal -= subtotalAmount;
        } else {
          section.netTotal += subtotalAmount;
        }
      }
    }

    // Store transaction for duplicate detection
    if (merchant && amount) {
      section.transactions_list.push({
        line: i + 1,
        date: currentDate,
        merchant,
        amount,
        description: desc
      });
    }
  }

  return section;
}

// Analyze Gross Income Tracker section
function analyzeGrossIncome(rows, start, end) {
  const section = {
    name: 'Gross Income Tracker',
    start,
    end,
    transactions: 0
  };

  for (let i = start + 1; i <= end; i++) {
    const row = rows[i];
    const date = (row[0] || '').trim();
    const desc = (row[1] || '').trim();
    const amount = (row[3] || '').trim();

    // Skip header and total rows
    if (!date || date === 'Date Receieved' || desc.includes('TOTAL') ||
        desc.includes('Estimated') || desc.includes('ACTUAL GRAND TOTAL') ||
        date.includes('Estimated') || date.includes('TOTAL')) {
      continue;
    }

    // Check date
    if (DATE_PATTERNS.FULL_DAY.test(date)) {
      checkDateAnomaly(date, i + 1);
    }

    // Valid transaction if has amount
    if (amount && amount.includes('$')) {
      section.transactions++;
    }
  }

  return section;
}

// Analyze Personal Savings & Investments section
function analyzeSavings(rows, start, end) {
  const section = {
    name: 'Personal Savings & Investments',
    start,
    end,
    transactions: 0
  };

  for (let i = start + 1; i <= end; i++) {
    const row = rows[i];
    const date = (row[0] || '').trim();
    const desc = (row[1] || '').trim();
    const amount = (row[4] || '').trim();

    // Skip header and total rows
    if (!date || date === 'Date Made' || date === 'TOTAL' || desc.includes('TOTAL')) {
      continue;
    }

    // Valid transaction if has amount
    if (amount && amount.includes('$')) {
      section.transactions++;
    }
  }

  return section;
}

// Analyze Florida House Expenses section
function analyzeFloridaHouse(rows, start, end) {
  const section = {
    name: 'Florida House Expenses',
    start,
    end,
    transactions: 0,
    grandTotal: null,
    transactions_list: []
  };

  let currentDate = null;

  for (let i = start + 1; i <= end; i++) {
    const row = rows[i];
    const firstCol = (row[0] || '').trim();
    const desc = (row[1] || '').trim();
    const merchant = (row[2] || '').trim();
    const subtotal = (row[5] || '').trim();

    // Check if this is a date row
    if (firstCol && DATE_PATTERNS.FULL_DAY.test(firstCol)) {
      currentDate = firstCol;
      checkDateAnomaly(firstCol, i + 1);
      continue;
    }

    // Check for GRAND TOTAL (can be in first column or desc column)
    if ((firstCol === 'GRAND TOTAL' || desc === 'GRAND TOTAL') && subtotal) {
      const totalMatch = subtotal.match(/[\$]?([\d,]+\.\d{2})/);
      if (totalMatch) {
        section.grandTotal = parseFloat(totalMatch[1].replace(/,/g, ''));
      }
    }

    // Skip header and total rows
    if (!desc || desc === 'Desc' || desc.includes('GRAND TOTAL') || firstCol === 'GRAND TOTAL') {
      continue;
    }

    // Valid transaction
    section.transactions++;

    // Store for duplicate detection
    if (merchant && subtotal) {
      const amountMatch = subtotal.match(/[\$]?([\d,.-]+)/);
      if (amountMatch) {
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        section.transactions_list.push({
          line: i + 1,
          date: currentDate,
          merchant,
          amount,
          description: desc
        });
      }
    }
  }

  return section;
}

// Detect duplicates between Expense Tracker and Florida House
function detectDuplicates(expenseTracker, floridaHouse) {
  const duplicates = [];

  for (const floridaTxn of floridaHouse.transactions_list) {
    for (const expenseTxn of expenseTracker.transactions_list) {
      // Check if merchants match (case-insensitive)
      if (floridaTxn.merchant.toLowerCase() === expenseTxn.merchant.toLowerCase()) {
        // Check if amounts match
        if (Math.abs(floridaTxn.amount - expenseTxn.amount) < 0.01) {
          duplicates.push({
            merchant: floridaTxn.merchant,
            amount: floridaTxn.amount,
            expenseLine: expenseTxn.line,
            expenseDesc: expenseTxn.description,
            floridaLine: floridaTxn.line,
            floridaDesc: floridaTxn.description
          });
        }
      }
    }
  }

  return duplicates;
}

// Generate report
function generateReport(sections, duplicates, boundaries) {
  const lines = [];

  lines.push('='.repeat(80));
  lines.push('MAY 2025 PREFLIGHT ANALYSIS REPORT');
  lines.push('='.repeat(80));
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`CSV File: csv_imports/fullImport_20251017.csv`);
  lines.push('');

  // Section boundaries
  lines.push('SECTION BOUNDARIES');
  lines.push('-'.repeat(80));
  lines.push(`Expense Tracker:                Lines ${boundaries.expenseStart + 1} - ${boundaries.expenseEnd + 1}`);
  lines.push(`Gross Income Tracker:           Lines ${boundaries.incomeStart + 1} - ${boundaries.incomeEnd + 1}`);
  lines.push(`Personal Savings & Investments: Lines ${boundaries.savingsStart + 1} - ${boundaries.savingsEnd + 1}`);
  lines.push(`Florida House Expenses:         Lines ${boundaries.floridaStart + 1} - ${boundaries.floridaEnd + 1}`);
  lines.push('');

  // Transaction counts
  const expenseTracker = sections.find(s => s.name === 'Expense Tracker');
  const grossIncome = sections.find(s => s.name === 'Gross Income Tracker');
  const savings = sections.find(s => s.name === 'Personal Savings & Investments');
  const floridaHouse = sections.find(s => s.name === 'Florida House Expenses');

  const totalTransactions = expenseTracker.transactions + grossIncome.transactions +
                           savings.transactions + floridaHouse.transactions;
  const adjustedTotal = totalTransactions - duplicates.length;

  lines.push('TRANSACTION COUNTS');
  lines.push('-'.repeat(80));
  lines.push(`Expense Tracker:                ${expenseTracker.transactions} transactions`);
  lines.push(`Gross Income Tracker:           ${grossIncome.transactions} transactions`);
  lines.push(`Personal Savings & Investments: ${savings.transactions} transactions`);
  lines.push(`Florida House Expenses:         ${floridaHouse.transactions} transactions`);
  lines.push('');
  lines.push(`TOTAL (before duplicate removal): ${totalTransactions} transactions`);
  lines.push(`TOTAL (after duplicate removal):  ${adjustedTotal} transactions`);
  lines.push('');

  // Grand totals
  lines.push('GRAND TOTALS FROM CSV');
  lines.push('-'.repeat(80));
  if (expenseTracker.grandTotal !== null) {
    lines.push(`Expense Tracker NET:            $${expenseTracker.grandTotal.toFixed(2)}`);
  } else {
    lines.push(`Expense Tracker NET:            NOT FOUND`);
  }
  if (floridaHouse.grandTotal !== null) {
    lines.push(`Florida House Total:            $${floridaHouse.grandTotal.toFixed(2)}`);
  } else {
    lines.push(`Florida House Total:            NOT FOUND`);
  }

  // Expected total calculation
  if (expenseTracker.grandTotal !== null && floridaHouse.grandTotal !== null) {
    const expectedTotal = expenseTracker.grandTotal + floridaHouse.grandTotal;
    lines.push(`Expected Combined Total:        $${expectedTotal.toFixed(2)}`);
  }
  lines.push('');

  // Tag distribution
  lines.push('TAG DISTRIBUTION PREVIEW');
  lines.push('-'.repeat(80));
  lines.push(`Reimbursements:                 ${expenseTracker.reimbursements} transactions`);
  if (expenseTracker.reimbursement_samples.length > 0) {
    lines.push(`  Sample reimbursements:`);
    expenseTracker.reimbursement_samples.forEach(s => {
      lines.push(`    Line ${s.line}: ${s.desc} | ${s.merchant}`);
    });
  }
  lines.push(`Business Expenses:              ${expenseTracker.businessExpenses} transactions`);
  if (expenseTracker.business_expense_samples.length > 0) {
    lines.push(`  Sample business expenses:`);
    expenseTracker.business_expense_samples.forEach(s => {
      lines.push(`    Line ${s.line}: ${s.desc} | ${s.merchant}`);
    });
  }
  lines.push(`Reimbursables (tracking only):  ${expenseTracker.reimbursables} transactions`);
  lines.push(`Florida House:                  ${floridaHouse.transactions - duplicates.length} transactions (after dedup)`);
  lines.push(`Savings/Investment:             ${savings.transactions} transactions`);
  lines.push('');

  // Currency distribution
  lines.push('CURRENCY DISTRIBUTION');
  lines.push('-'.repeat(80));
  lines.push(`USD transactions:               ${expenseTracker.currencies.USD}`);
  lines.push(`THB transactions:               ${expenseTracker.currencies.THB}`);
  lines.push(`VND transactions:               ${expenseTracker.currencies.VND}`);
  lines.push(`MYR transactions:               ${expenseTracker.currencies.MYR}`);
  lines.push(`CNY transactions:               ${expenseTracker.currencies.CNY}`);
  if (expenseTracker.currencies.OTHER.length > 0) {
    lines.push(`OTHER currencies:               ${expenseTracker.currencies.OTHER.join(', ')}`);
  }
  lines.push('');

  // Duplicate detection
  lines.push('DUPLICATE DETECTION');
  lines.push('-'.repeat(80));
  if (duplicates.length > 0) {
    lines.push(`Found ${duplicates.length} potential duplicate(s):`);
    lines.push('');
    duplicates.forEach((dup, idx) => {
      lines.push(`${idx + 1}. ${dup.merchant} - $${dup.amount.toFixed(2)}`);
      lines.push(`   Line ${dup.expenseLine} (Expense Tracker): "${dup.expenseDesc}" ✅ KEEP`);
      lines.push(`   Line ${dup.floridaLine} (Florida House):   "${dup.floridaDesc}" ❌ REMOVE`);
      lines.push('');
    });
  } else {
    lines.push('No duplicates detected.');
    lines.push('');
  }

  // Anomalies
  if (anomalies.length > 0 || warnings.length > 0) {
    lines.push('ANOMALIES AND WARNINGS');
    lines.push('-'.repeat(80));

    if (anomalies.length > 0) {
      lines.push(`❌ ERRORS (${anomalies.length}):`);
      anomalies.forEach(a => {
        lines.push(`   Line ${a.line}: ${a.message}`);
      });
      lines.push('');
    }

    if (warnings.length > 0) {
      lines.push(`⚠️  WARNINGS (${warnings.length}):`);
      warnings.forEach(w => {
        lines.push(`   Line ${w.line}: ${w.message}`);
      });
      lines.push('');
    }
  } else {
    lines.push('ANOMALIES AND WARNINGS');
    lines.push('-'.repeat(80));
    lines.push('✅ No anomalies detected.');
    lines.push('');
  }

  // Comparison with baselines
  lines.push('COMPARISON WITH BASELINE MONTHS');
  lines.push('-'.repeat(80));
  lines.push('                        Transactions  Reimbursements  THB Txns  Variance');
  lines.push('June 2025 (baseline):        190            25           85      0.00%');
  lines.push('July 2025:                   177            13           68      0.00%');
  lines.push('August 2025:                 194            32           82      2.24%');
  lines.push('September 2025:              159            23           25     -2.24%');
  lines.push(`May 2025 (current):          ${adjustedTotal.toString().padEnd(3)}            ${expenseTracker.reimbursements.toString().padEnd(2)}           ${expenseTracker.currencies.THB.toString().padEnd(2)}      TBD`);
  lines.push('');

  // Structural differences
  lines.push('STRUCTURAL ANALYSIS');
  lines.push('-'.repeat(80));

  const structuralIssues = [];

  // Check for expected sections
  if (!expenseTracker || expenseTracker.transactions === 0) {
    structuralIssues.push('❌ Expense Tracker section is empty or missing');
  }
  if (!grossIncome) {
    structuralIssues.push('❌ Gross Income Tracker section is missing');
  }
  if (!savings) {
    structuralIssues.push('❌ Personal Savings & Investments section is missing');
  }
  if (!floridaHouse) {
    structuralIssues.push('❌ Florida House Expenses section is missing');
  }

  // Check transaction count reasonableness
  if (adjustedTotal < 100) {
    structuralIssues.push('⚠️  Transaction count seems low compared to other months');
  } else if (adjustedTotal > 250) {
    structuralIssues.push('⚠️  Transaction count seems high compared to other months');
  }

  // Check THB count
  if (expenseTracker.currencies.THB < 20) {
    structuralIssues.push('⚠️  THB transaction count seems low');
  }

  if (structuralIssues.length > 0) {
    structuralIssues.forEach(issue => lines.push(issue));
  } else {
    lines.push('✅ Structure matches expected format from previous months');
  }
  lines.push('');

  // Summary
  lines.push('PREFLIGHT SUMMARY');
  lines.push('-'.repeat(80));
  lines.push(`Total Transactions:             ${adjustedTotal} (after duplicate removal)`);
  lines.push(`Total Reimbursements:           ${expenseTracker.reimbursements}`);
  lines.push(`Total Business Expenses:        ${expenseTracker.businessExpenses}`);
  lines.push(`Total THB Transactions:         ${expenseTracker.currencies.THB}`);
  lines.push(`Total Duplicates Found:         ${duplicates.length}`);
  lines.push(`Total Anomalies:                ${anomalies.length}`);
  lines.push(`Total Warnings:                 ${warnings.length}`);
  lines.push('');

  if (anomalies.length === 0 && warnings.length === 0 && structuralIssues.length === 0) {
    lines.push('✅ PREFLIGHT CHECK: PASSED');
    lines.push('   Ready to proceed with parsing and import.');
  } else if (anomalies.length > 0) {
    lines.push('❌ PREFLIGHT CHECK: FAILED');
    lines.push('   Critical issues detected. Review and fix before import.');
  } else {
    lines.push('⚠️  PREFLIGHT CHECK: PASSED WITH WARNINGS');
    lines.push('   Minor issues detected. Review recommended before import.');
  }

  lines.push('');
  lines.push('='.repeat(80));
  lines.push('END OF REPORT');
  lines.push('='.repeat(80));

  return lines.join('\n');
}

// Main execution
function main() {
  console.log('🔍 Starting May 2025 Preflight Analysis...\n');

  // Read CSV file
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const { rows } = parseCSV(content);

  console.log(`✓ Loaded CSV with ${rows.length} rows\n`);

  // Find section boundaries
  const boundaries = findSectionBoundaries(rows);
  console.log('✓ Found section boundaries');
  console.log(`  - Expense Tracker: Lines ${boundaries.expenseStart + 1} - ${boundaries.expenseEnd + 1}`);
  console.log(`  - Gross Income: Lines ${boundaries.incomeStart + 1} - ${boundaries.incomeEnd + 1}`);
  console.log(`  - Savings: Lines ${boundaries.savingsStart + 1} - ${boundaries.savingsEnd + 1}`);
  console.log(`  - Florida House: Lines ${boundaries.floridaStart + 1} - ${boundaries.floridaEnd + 1}\n`);

  // Analyze each section
  const sections = [];

  console.log('🔍 Analyzing Expense Tracker...');
  const expenseTracker = analyzeExpenseTracker(rows, boundaries.expenseStart, boundaries.expenseEnd);
  sections.push(expenseTracker);
  console.log(`  ✓ ${expenseTracker.transactions} transactions, ${expenseTracker.reimbursements} reimbursements, ${expenseTracker.currencies.THB} THB\n`);

  console.log('🔍 Analyzing Gross Income Tracker...');
  const grossIncome = analyzeGrossIncome(rows, boundaries.incomeStart, boundaries.incomeEnd);
  sections.push(grossIncome);
  console.log(`  ✓ ${grossIncome.transactions} transactions\n`);

  console.log('🔍 Analyzing Personal Savings & Investments...');
  const savings = analyzeSavings(rows, boundaries.savingsStart, boundaries.savingsEnd);
  sections.push(savings);
  console.log(`  ✓ ${savings.transactions} transactions\n`);

  console.log('🔍 Analyzing Florida House Expenses...');
  const floridaHouse = analyzeFloridaHouse(rows, boundaries.floridaStart, boundaries.floridaEnd);
  sections.push(floridaHouse);
  console.log(`  ✓ ${floridaHouse.transactions} transactions\n`);

  // Detect duplicates
  console.log('🔍 Detecting duplicates...');
  const duplicates = detectDuplicates(expenseTracker, floridaHouse);
  console.log(`  ✓ Found ${duplicates.length} potential duplicates\n`);

  // Generate report
  console.log('📝 Generating report...');
  const report = generateReport(sections, duplicates, boundaries);

  // Write report to file
  fs.writeFileSync(OUTPUT_PATH, report);
  console.log(`✓ Report written to: ${OUTPUT_PATH}\n`);

  // Print summary to console
  console.log('='.repeat(60));
  console.log('QUICK SUMMARY');
  console.log('='.repeat(60));
  const totalTxns = expenseTracker.transactions + grossIncome.transactions +
                    savings.transactions + floridaHouse.transactions - duplicates.length;
  console.log(`Total Transactions:  ${totalTxns}`);
  console.log(`Reimbursements:      ${expenseTracker.reimbursements}`);
  console.log(`Business Expenses:   ${expenseTracker.businessExpenses}`);
  console.log(`THB Transactions:    ${expenseTracker.currencies.THB}`);
  console.log(`Duplicates Found:    ${duplicates.length}`);
  console.log(`Anomalies:           ${anomalies.length}`);
  console.log(`Warnings:            ${warnings.length}`);
  console.log('='.repeat(60));

  if (anomalies.length > 0) {
    console.log('\n❌ CRITICAL ISSUES DETECTED - Review report before proceeding');
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS DETECTED - Review recommended');
  } else {
    console.log('\n✅ PREFLIGHT CHECK PASSED - Ready for import');
  }
}

main();
