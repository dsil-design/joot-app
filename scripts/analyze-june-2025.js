#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse CSV line handling quoted fields with commas
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

// Check if row is a date row
function isDateRow(row) {
  if (!row[0]) return false;
  const datePattern = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\w+\s+\d+,\s+\d{4}/;
  return datePattern.test(row[0]);
}

// Check if row is a short date format (MM/DD/YYYY)
function isShortDateRow(row) {
  if (!row[0]) return false;
  return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(row[0]);
}

// Parse amount from string
function parseAmount(str) {
  if (!str) return null;
  const cleaned = str.replace(/[$,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Extract currency from THB column
function extractCurrency(thbColumn) {
  if (!thbColumn) return null;

  // Check for THB
  if (thbColumn.includes('THB')) {
    const match = thbColumn.match(/THB\s*([\d,.-]+)/);
    if (match) {
      return { amount: parseFloat(match[1].replace(/,/g, '')), currency: 'THB' };
    }
  }

  // Check for VND
  if (thbColumn.includes('VND') || thbColumn.includes('₫')) {
    const match = thbColumn.match(/VND\s*([\d,.-]+)/) || thbColumn.match(/₫\s*([\d,.-]+)/);
    if (match) {
      return { amount: parseFloat(match[1].replace(/,/g, '')), currency: 'VND' };
    }
  }

  // Check for MYR
  if (thbColumn.includes('MYR') || thbColumn.includes('RM')) {
    const match = thbColumn.match(/MYR\s*([\d,.-]+)/) || thbColumn.match(/RM\s*([\d,.-]+)/);
    if (match) {
      return { amount: parseFloat(match[1].replace(/,/g, '')), currency: 'MYR' };
    }
  }

  // Check for CNY
  if (thbColumn.includes('CNY') || thbColumn.includes('¥')) {
    const match = thbColumn.match(/CNY\s*([\d,.-]+)/) || thbColumn.match(/¥\s*([\d,.-]+)/);
    if (match) {
      return { amount: parseFloat(match[1].replace(/,/g, '')), currency: 'CNY' };
    }
  }

  return null;
}

// Parse date from various formats
function parseDate(dateStr) {
  // Format: "Monday, June 1, 2025"
  const longMatch = dateStr.match(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d+),\s+(\d{4})/);
  if (longMatch) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames.indexOf(longMatch[1]) + 1;
    const day = parseInt(longMatch[2]);
    const year = parseInt(longMatch[3]);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Format: "6/1/2025"
  const shortMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (shortMatch) {
    const month = parseInt(shortMatch[1]);
    const day = parseInt(shortMatch[2]);
    const year = parseInt(shortMatch[3]);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

// Main analysis function
function analyzeJune2025() {
  const csvPath = path.join(__dirname, '../csv_imports/fullImport_20251017.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');

  const report = {
    sections: {},
    transactions: {
      expenseTracker: [],
      grossIncome: [],
      savings: [],
      floridaHouse: []
    },
    stats: {
      totalTransactions: 0,
      reimbursements: 0,
      businessExpenses: 0,
      reimbursables: 0,
      currencies: {
        USD: 0,
        THB: 0,
        VND: 0,
        MYR: 0,
        CNY: 0,
        other: []
      },
      dateAnomalies: []
    },
    duplicates: [],
    redFlags: []
  };

  let currentSection = null;
  let currentDate = null;
  let lineNum = 0;

  // Find June 2025 data by looking for section headers
  let juneStartLine = null;
  let juneEndLine = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    lineNum = i + 1;

    // Look for "June 2025: Expense Tracker" to mark start
    if (line === 'June 2025: Expense Tracker') {
      juneStartLine = lineNum;
      console.log(`Found June 2025 start at line ${lineNum}`);
    }

    // Look for next month's expense tracker to mark end
    if (juneStartLine && (line === 'May 2025: Expense Tracker' || line === 'APRIL 2025')) {
      juneEndLine = lineNum - 1;
      console.log(`June 2025 ends at line ${juneEndLine}`);
      break;
    }
  }

  if (!juneStartLine) {
    console.error('ERROR: Could not find June 2025 data in CSV');
    return null;
  }

  // Process June 2025 section
  currentSection = null;

  for (let i = juneStartLine - 1; i < (juneEndLine || lines.length); i++) {
    const line = lines[i].trim();
    if (!line) continue;

    lineNum = i + 1;
    const row = parseCSVLine(line);

    // Detect sections
    if (line === 'June 2025: Expense Tracker' || line.includes('Expense Tracker')) {
      currentSection = 'expenseTracker';
      if (!report.sections.expenseTracker) {
        report.sections.expenseTracker = { start: lineNum, end: null, count: 0, grandTotal: null };
      }
      continue;
    }

    if (line === 'June 2025: Gross Income Tracker' || line.includes('Gross Income Tracker')) {
      if (currentSection === 'expenseTracker') {
        report.sections.expenseTracker.end = lineNum - 1;
      }
      currentSection = 'grossIncome';
      if (!report.sections.grossIncome) {
        report.sections.grossIncome = { start: lineNum, end: null, count: 0, grandTotal: null };
      }
      continue;
    }

    if (line === 'June 2025: Personal Savings & Investments' || line.includes('Personal Savings & Investments')) {
      if (currentSection === 'grossIncome') {
        report.sections.grossIncome.end = lineNum - 1;
      }
      currentSection = 'savings';
      if (!report.sections.savings) {
        report.sections.savings = { start: lineNum, end: null, count: 0, grandTotal: null };
      }
      continue;
    }

    if (line === 'June 2025: Florida House Expenses' || line.includes('Florida House Expenses')) {
      if (currentSection === 'savings') {
        report.sections.savings.end = lineNum - 1;
      }
      currentSection = 'floridaHouse';
      if (!report.sections.floridaHouse) {
        report.sections.floridaHouse = { start: lineNum, end: null, count: 0, grandTotal: null };
      }
      continue;
    }

    if (line === 'June 2025: Personal Take Home' || line === 'June 2025: Deficit/Surplus' ||
        line.includes('Personal Take Home') || line.includes('Deficit/Surplus')) {
      if (currentSection === 'floridaHouse') {
        report.sections.floridaHouse.end = lineNum - 1;
      }
      currentSection = null;
      continue;
    }

    // Skip header rows and non-data rows
    if (line.includes('Desc,Merchant') || line.includes('Date Receieved') ||
        line.includes('Date Made,Description') || line === '') {
      continue;
    }

    // Extract GRAND TOTAL
    if (line.includes('GRAND TOTAL')) {
      const match = line.match(/\$?([\d,]+\.\d{2})/);
      if (match && currentSection && report.sections[currentSection]) {
        report.sections[currentSection].grandTotal = parseFloat(match[1].replace(/,/g, ''));
      }
      continue;
    }

    // Skip other non-transaction rows
    if (line.includes('Daily Total') || line.includes('TOTAL') ||
        line.includes('Estimated') || line.includes('Subtotal')) {
      continue;
    }

    // Process transactions based on section
    if (currentSection === 'expenseTracker') {
      // Check for date row
      if (isDateRow(row)) {
        currentDate = parseDate(row[0]);

        // Check for date anomalies
        if (currentDate) {
          const year = parseInt(currentDate.split('-')[0]);
          const month = parseInt(currentDate.split('-')[1]);
          if (year !== 2025 || month !== 6) {
            report.stats.dateAnomalies.push({
              line: lineNum,
              date: currentDate,
              rawDate: row[0],
              issue: `Wrong year/month (expected June 2025)`
            });
          }
        }
        continue;
      }

      // Transaction row: has description and amount
      if (row[1] && (row[6] || row[7])) {
        const description = row[1];
        const merchant = row[2] || '';
        const reimbursable = row[3] === 'X' || row[3] === 'x';
        const businessExpense = row[4] === 'X' || row[4] === 'x';

        // Parse currency and amount
        let amount = null;
        let currency = 'USD';

        const foreignCurrency = extractCurrency(row[6]);
        if (foreignCurrency) {
          amount = foreignCurrency.amount;
          currency = foreignCurrency.currency;
          report.stats.currencies[currency] = (report.stats.currencies[currency] || 0) + 1;

          // Track unknown currencies
          if (!['USD', 'THB', 'VND', 'MYR', 'CNY'].includes(currency)) {
            if (!report.stats.currencies.other.includes(currency)) {
              report.stats.currencies.other.push(currency);
            }
          }
        } else if (row[7]) {
          amount = parseAmount(row[7]);
          report.stats.currencies.USD++;
        }

        if (amount !== null) {
          report.sections.expenseTracker.count++;
          report.stats.totalTransactions++;

          report.transactions.expenseTracker.push({
            line: lineNum,
            date: currentDate,
            description,
            merchant,
            amount,
            currency,
            reimbursable,
            businessExpense
          });

          // Count special types
          if (description.toLowerCase().startsWith('reimbursement:')) {
            report.stats.reimbursements++;
          }
          if (businessExpense) {
            report.stats.businessExpenses++;
          }
          if (reimbursable) {
            report.stats.reimbursables++;
          }
        }
      }
    } else if (currentSection === 'grossIncome') {
      // Income row: has date and amount
      if (isDateRow(row) && row[3]) {
        const date = parseDate(row[0]);
        const description = row[1] || '';
        const merchant = row[2] || '';
        const amount = parseAmount(row[3]);

        if (amount !== null) {
          report.sections.grossIncome.count++;
          report.stats.totalTransactions++;
          report.stats.currencies.USD++;

          report.transactions.grossIncome.push({
            line: lineNum,
            date,
            description,
            merchant,
            amount,
            currency: 'USD'
          });
        }
      }
    } else if (currentSection === 'savings') {
      // Savings row: has short date format
      if (isShortDateRow(row) && row[4]) {
        const date = parseDate(row[0]);
        const description = row[1] || '';
        const merchant = row[2] || '';
        const amount = parseAmount(row[4]);

        if (amount !== null) {
          report.sections.savings.count++;
          report.stats.totalTransactions++;
          report.stats.currencies.USD++;

          report.transactions.savings.push({
            line: lineNum,
            date,
            description,
            merchant,
            amount,
            currency: 'USD'
          });
        }
      }
    } else if (currentSection === 'floridaHouse') {
      // Check for date row
      if (isDateRow(row)) {
        currentDate = parseDate(row[0]);
        continue;
      }

      // Florida House transaction
      if (row[1] && row[5]) {
        const description = row[1];
        const merchant = row[2] || '';
        const amount = parseAmount(row[5]);

        if (amount !== null) {
          report.sections.floridaHouse.count++;
          report.stats.totalTransactions++;
          report.stats.currencies.USD++;

          report.transactions.floridaHouse.push({
            line: lineNum,
            date: currentDate,
            description,
            merchant,
            amount,
            currency: 'USD'
          });
        }
      }
    }
  }

  // Detect duplicates between Expense Tracker and Florida House
  for (const etTxn of report.transactions.expenseTracker) {
    for (const fhTxn of report.transactions.floridaHouse) {
      if (etTxn.merchant && fhTxn.merchant &&
          etTxn.merchant.toLowerCase() === fhTxn.merchant.toLowerCase() &&
          Math.abs(etTxn.amount - fhTxn.amount) < 0.01) {
        report.duplicates.push({
          merchant: etTxn.merchant,
          amount: etTxn.amount,
          expenseTrackerLine: etTxn.line,
          expenseTrackerDesc: etTxn.description,
          floridaHouseLine: fhTxn.line,
          floridaHouseDesc: fhTxn.description
        });
      }
    }
  }

  // Calculate expected totals
  const expenseTrackerNet = report.sections.expenseTracker?.grandTotal || 0;
  const floridaHouseTotal = report.sections.floridaHouse?.grandTotal || 0;
  const savingsTotal = report.sections.savings?.grandTotal || 0;

  report.expectedTotal = expenseTrackerNet + floridaHouseTotal + savingsTotal;

  // Check for structural differences
  if (!report.sections.expenseTracker) {
    report.redFlags.push('Missing Expense Tracker section');
  }
  if (!report.sections.grossIncome) {
    report.redFlags.push('Missing Gross Income Tracker section');
  }
  if (!report.sections.savings) {
    report.redFlags.push('Missing Personal Savings & Investments section');
  }
  if (!report.sections.floridaHouse) {
    report.redFlags.push('Missing Florida House Expenses section');
  }

  return report;
}

// Generate report
const report = analyzeJune2025();

if (!report) {
  console.error('Analysis failed!');
  process.exit(1);
}

// Format report
let output = `
================================================================================
                    JUNE 2025 PRE-FLIGHT REPORT
================================================================================
Generated: ${new Date().toISOString()}
Data Source: csv_imports/fullImport_20251017.csv

================================================================================
SECTION LINE RANGES
================================================================================
`;

for (const [section, data] of Object.entries(report.sections)) {
  const sectionName = section === 'expenseTracker' ? 'Expense Tracker' :
                     section === 'grossIncome' ? 'Gross Income Tracker' :
                     section === 'savings' ? 'Personal Savings & Investments' :
                     'Florida House Expenses';

  output += `\n${sectionName}:\n`;
  output += `  Lines: ${data.start} - ${data.end || 'EOF'}\n`;
  output += `  Transactions: ${data.count}\n`;
  if (data.grandTotal !== null) {
    output += `  Grand Total: $${data.grandTotal.toFixed(2)}\n`;
  }
}

output += `\n
================================================================================
TRANSACTION COUNTS
================================================================================
Total Transactions: ${report.stats.totalTransactions}

By Section:
  - Expense Tracker: ${report.sections.expenseTracker?.count || 0}
  - Gross Income Tracker: ${report.sections.grossIncome?.count || 0}
  - Personal Savings & Investments: ${report.sections.savings?.count || 0}
  - Florida House Expenses: ${report.sections.floridaHouse?.count || 0}

================================================================================
FINANCIAL TOTALS
================================================================================
`;

if (report.sections.expenseTracker?.grandTotal !== null) {
  output += `Expense Tracker NET: $${report.sections.expenseTracker.grandTotal.toFixed(2)}\n`;
}
if (report.sections.floridaHouse?.grandTotal !== null) {
  output += `Florida House Total: $${report.sections.floridaHouse.grandTotal.toFixed(2)}\n`;
}
if (report.sections.savings?.grandTotal !== null) {
  output += `Savings Total: $${report.sections.savings.grandTotal.toFixed(2)}\n`;
}
if (report.sections.grossIncome?.grandTotal !== null) {
  output += `Gross Income Total: $${report.sections.grossIncome.grandTotal.toFixed(2)}\n`;
}

output += `\nExpected Total (Expense Tracker NET + Florida House + Savings): $${report.expectedTotal.toFixed(2)}\n`;

output += `\n
================================================================================
TAG DISTRIBUTION PREVIEW
================================================================================
Reimbursements (description starts with "Reimbursement:"): ${report.stats.reimbursements}
Business Expenses (column 4 has "X"): ${report.stats.businessExpenses}
Reimbursables (column 3 - tracking only, no tag): ${report.stats.reimbursables}
Florida House (section): ${report.sections.floridaHouse?.count || 0}
Savings/Investment (section): ${report.sections.savings?.count || 0}

================================================================================
CURRENCY DISTRIBUTION
================================================================================
USD: ${report.stats.currencies.USD} transactions
THB: ${report.stats.currencies.THB} transactions
VND: ${report.stats.currencies.VND} transactions
MYR: ${report.stats.currencies.MYR} transactions
CNY: ${report.stats.currencies.CNY} transactions
`;

if (report.stats.currencies.other.length > 0) {
  output += `\n⚠️  NEW/UNKNOWN CURRENCIES DETECTED:\n`;
  report.stats.currencies.other.forEach(curr => {
    output += `   - ${curr}\n`;
  });
}

output += `\n
================================================================================
DUPLICATE DETECTION
================================================================================
`;

if (report.duplicates.length > 0) {
  output += `Found ${report.duplicates.length} potential duplicate(s):\n\n`;
  report.duplicates.forEach((dup, idx) => {
    output += `${idx + 1}. ${dup.merchant} - $${dup.amount.toFixed(2)}\n`;
    output += `   Line ${dup.expenseTrackerLine} (Expense Tracker): "${dup.expenseTrackerDesc}" ✅ KEEP\n`;
    output += `   Line ${dup.floridaHouseLine} (Florida House): "${dup.floridaHouseDesc}" ❌ REMOVE\n\n`;
  });
} else {
  output += `✓ No duplicates detected between Expense Tracker and Florida House\n`;
}

output += `\n
================================================================================
DATE ANOMALIES
================================================================================
`;

if (report.stats.dateAnomalies.length > 0) {
  output += `⚠️  Found ${report.stats.dateAnomalies.length} date anomaly(ies):\n\n`;
  report.stats.dateAnomalies.forEach((anom, idx) => {
    output += `${idx + 1}. Line ${anom.line}: ${anom.rawDate}\n`;
    output += `   Parsed as: ${anom.date}\n`;
    output += `   Issue: ${anom.issue}\n\n`;
  });
} else {
  output += `✓ No date anomalies detected - all dates are in June 2025\n`;
}

output += `\n
================================================================================
RED FLAGS & STRUCTURAL DIFFERENCES
================================================================================
`;

if (report.redFlags.length > 0) {
  report.redFlags.forEach(flag => {
    output += `⚠️  ${flag}\n`;
  });
} else {
  output += `✓ No structural issues detected\n`;
}

output += `\n
================================================================================
COMPARISON WITH BASELINE MONTHS
================================================================================

June 2025 vs. Previous Months:
  - September 2025: 159 transactions, 23 reimbursements, 25 THB
  - August 2025: 194 transactions, 32 reimbursements, 82 THB
  - July 2025: 177 transactions, 13 reimbursements, 68 THB

June 2025 Metrics:
  - Total Transactions: ${report.stats.totalTransactions}
  - Reimbursements: ${report.stats.reimbursements}
  - THB Transactions: ${report.stats.currencies.THB}
  - VND Transactions: ${report.stats.currencies.VND}
  - MYR Transactions: ${report.stats.currencies.MYR}
  - CNY Transactions: ${report.stats.currencies.CNY}

Transaction Count Variance from Average (176.67):
  ${((report.stats.totalTransactions - 176.67) / 176.67 * 100).toFixed(2)}%

================================================================================
RECOMMENDATIONS
================================================================================
`;

if (report.stats.totalTransactions === 0) {
  output += `❌ CRITICAL: No transactions found! Check if June 2025 data exists.\n`;
} else if (report.stats.totalTransactions < 100) {
  output += `⚠️  WARNING: Low transaction count (${report.stats.totalTransactions}). Expected ~150-200.\n`;
} else {
  output += `✓ Transaction count within expected range\n`;
}

if (report.stats.dateAnomalies.length > 0) {
  output += `⚠️  Review and correct ${report.stats.dateAnomalies.length} date anomalies before import\n`;
}

if (report.duplicates.length > 0) {
  output += `⚠️  Plan to remove ${report.duplicates.length} duplicate(s) during import\n`;
}

if (report.stats.currencies.other.length > 0) {
  output += `⚠️  Add support for new currencies: ${report.stats.currencies.other.join(', ')}\n`;
}

if (report.redFlags.length === 0 && report.stats.dateAnomalies.length === 0 &&
    report.stats.totalTransactions > 0) {
  output += `\n✅ DATA LOOKS GOOD - READY FOR PARSING\n`;
}

output += `\n
================================================================================
END OF REPORT
================================================================================
`;

// Save report
const reportPath = path.join(__dirname, 'JUNE-2025-PREFLIGHT-REPORT.txt');
fs.writeFileSync(reportPath, output);

console.log(output);
console.log(`\n✅ Report saved to: ${reportPath}`);
