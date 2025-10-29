const fs = require('fs');
const path = require('path');

/**
 * GATE 1: PRE-FLIGHT ANALYSIS
 * Batch 1: August-July-June-May 2023
 *
 * Enhanced with learnings from 21+ months of historical imports
 *
 * This script performs comprehensive pre-flight analysis:
 * 1. CSV line range identification
 * 2. Transaction count estimation
 * 3. Red flag identification
 * 4. Currency distribution analysis
 * 5. Critical transaction spotting
 */

console.log('='.repeat(70));
console.log('GATE 1: PRE-FLIGHT ANALYSIS - BATCH 1');
console.log('Months: August, July, June, May 2023');
console.log('Enhanced with 21+ months of historical learnings');
console.log('='.repeat(70));
console.log();

// Parse CSV file
const csvPath = '/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

console.log(`Loaded CSV: ${lines.length} total lines`);
console.log();

// Helper function to parse amount
function parseAmount(amountStr) {
  if (!amountStr || amountStr.trim() === '') return 0;
  // Remove $, commas, quotes, tabs, parentheses, spaces
  let cleaned = amountStr.replace(/[$,"\t()\s]/g, '').trim();

  // Handle parentheses for negative
  const isNegative = amountStr.includes('(') && amountStr.includes(')');
  if (isNegative) {
    cleaned = '-' + cleaned.replace(/-/g, '');
  }

  return parseFloat(cleaned) || 0;
}

// Parse CSV row
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

// Check if description is reimbursement (with typo detection)
function isReimbursement(description) {
  return /^Re(im|mi|m)?burs[e]?ment:?/i.test(description);
}

// Month configurations based on CSV analysis
const months = [
  {
    name: 'August 2023',
    start: 7177,
    end: 7453,  // Before September starts
    sections: {
      expenseTracker: { start: 7177, end: 7423 },
      grossIncome: null,  // TBD during scan
      savings: null,      // TBD during scan
      floridaHouse: null  // TBD during scan
    }
  },
  {
    name: 'July 2023',
    start: 7453,
    end: 7734,  // Before June starts
    sections: {
      expenseTracker: { start: 7453, end: 7700 },
      grossIncome: null,
      savings: null,
      floridaHouse: null
    }
  },
  {
    name: 'June 2023',
    start: 7734,
    end: 8014,  // Before May starts
    sections: {
      expenseTracker: { start: 7734, end: 7980 },
      grossIncome: null,
      savings: null,
      floridaHouse: null
    }
  },
  {
    name: 'May 2023',
    start: 8014,
    end: 8295,  // Approximate end
    sections: {
      expenseTracker: { start: 8014, end: 8260 },
      grossIncome: null,
      savings: null,
      floridaHouse: null
    }
  }
];

console.log('MONTH LINE RANGES IDENTIFIED:');
console.log('='.repeat(70));
months.forEach(month => {
  console.log(`${month.name}:`);
  console.log(`  Total Range: lines ${month.start}-${month.end} (${month.end - month.start} lines)`);
  console.log(`  Expense Tracker: lines ${month.sections.expenseTracker.start}-${month.sections.expenseTracker.end}`);
  console.log();
});

// Analyze each month
const results = [];

for (const month of months) {
  console.log('='.repeat(70));
  console.log(`ANALYZING: ${month.name.toUpperCase()}`);
  console.log('='.repeat(70));
  console.log();

  const analysis = {
    month: month.name,
    lineRange: `${month.start}-${month.end}`,
    transactions: [],
    stats: {
      total: 0,
      expenses: 0,
      income: 0,
      thb: 0,
      usd: 0
    },
    redFlags: {
      negativeAmounts: [],
      commaFormatted: [],
      typoReimbursements: [],
      largeExpenses: [],
      missingData: [],
      duplicates: []
    },
    criticalTransactions: {
      usaRent: null,
      thailandRent: null,
      reimbursements: [],
      floridaHouse: []
    }
  };

  let currentDate = null;
  let transactionCount = 0;

  // Parse Expense Tracker section
  for (let i = month.sections.expenseTracker.start - 1; i < month.sections.expenseTracker.end; i++) {
    const row = parseCSV(lines[i]);

    // Check for date row
    if (row[0] && row[0].includes(',') && row[0].includes('2023')) {
      currentDate = row[0];
      continue;
    }

    // Skip special rows
    if (!row[1] || row[1] === '' || row[1] === 'Desc' ||
        row[1].includes('Daily Total') || row[1].includes('GRAND TOTAL') ||
        row[1].includes('Estimated') || row[1].includes('Subtotal')) {
      continue;
    }

    const description = row[1];
    const merchant = row[2] || 'Unknown';
    const paymentMethod = row[5] || 'Unknown';

    // Currency and amount extraction (CRITICAL: Column 6 = THB, Column 7 = USD, NEVER Column 8!)
    let amount = 0;
    let currency = 'USD';

    // Check THB column (column 6) - format: "THB 228.00" or "-THB 228.00"
    if (row[6] && row[6].includes('THB')) {
      const match = row[6].match(/-?THB\s*([\d,.-]+)/);
      if (match) {
        const isNegativeTHB = row[6].trim().startsWith('-');
        amount = parseFloat(match[1].replace(/,/g, ''));
        if (isNegativeTHB) {
          amount = -amount;
        }
        currency = 'THB';
      }
    }
    // Check USD column (column 7) - format: "$	6.36" or "$987.00"
    else if (row[7] && row[7].trim() !== '') {
      amount = parseAmount(row[7]);
      currency = 'USD';
    }
    // Check subtotal (column 9) as fallback
    else if (row[9] && row[9].trim() !== '') {
      amount = parseAmount(row[9]);
      currency = 'USD';
    }

    if (amount === 0 || isNaN(amount)) continue; // Skip zero amounts

    transactionCount++;

    // RED FLAG: Negative amounts
    if (amount < 0) {
      analysis.redFlags.negativeAmounts.push({
        description,
        amount,
        currency,
        line: i + 1
      });
    }

    // RED FLAG: Comma-formatted amounts
    const amountStr = row[currency === 'THB' ? 6 : 7];
    if (amountStr && amountStr.includes(',')) {
      analysis.redFlags.commaFormatted.push({
        description,
        amount: amountStr,
        line: i + 1
      });
    }

    // RED FLAG: Typo reimbursements
    if (isReimbursement(description)) {
      analysis.redFlags.typoReimbursements.push({
        description,
        amount,
        line: i + 1
      });
      analysis.criticalTransactions.reimbursements.push({
        description,
        amount,
        currency
      });
    }

    // RED FLAG: Large expenses (>$1,000 or >30,000 THB)
    if ((currency === 'USD' && Math.abs(amount) > 1000) ||
        (currency === 'THB' && Math.abs(amount) > 30000)) {
      analysis.redFlags.largeExpenses.push({
        description,
        amount,
        currency,
        line: i + 1
      });
    }

    // CRITICAL: Identify rents
    if (description.toLowerCase().includes('rent')) {
      if (currency === 'THB' && Math.abs(amount) >= 20000 && Math.abs(amount) <= 40000) {
        analysis.criticalTransactions.thailandRent = {
          description,
          amount: Math.abs(amount),
          currency
        };
      } else if (currency === 'USD' && Math.abs(amount) >= 900 && Math.abs(amount) <= 1000) {
        analysis.criticalTransactions.usaRent = {
          description,
          amount: Math.abs(amount),
          currency
        };
      }
    }

    // Track currency distribution
    if (currency === 'THB') {
      analysis.stats.thb++;
    } else {
      analysis.stats.usd++;
    }

    // Track income vs expense
    if (amount < 0 || description.toLowerCase().includes('income') ||
        description.toLowerCase().includes('salary')) {
      analysis.stats.income++;
    } else {
      analysis.stats.expenses++;
    }
  }

  analysis.stats.total = transactionCount;

  // Calculate percentages
  const thbPercent = analysis.stats.total > 0
    ? ((analysis.stats.thb / analysis.stats.total) * 100).toFixed(1)
    : 0;

  console.log(`Transaction Count: ${analysis.stats.total}`);
  console.log(`  Expenses: ${analysis.stats.expenses}`);
  console.log(`  Income: ${analysis.stats.income}`);
  console.log(`  THB: ${analysis.stats.thb} (${thbPercent}%)`);
  console.log(`  USD: ${analysis.stats.usd} (${(100 - thbPercent).toFixed(1)}%)`);
  console.log();

  console.log('RED FLAGS DETECTED:');
  console.log(`  Negative amounts: ${analysis.redFlags.negativeAmounts.length}`);
  console.log(`  Comma-formatted: ${analysis.redFlags.commaFormatted.length}`);
  console.log(`  Typo reimbursements: ${analysis.redFlags.typoReimbursements.length}`);
  console.log(`  Large expenses (>$1K): ${analysis.redFlags.largeExpenses.length}`);
  console.log();

  console.log('CRITICAL TRANSACTIONS:');
  console.log(`  USA Rent: ${analysis.criticalTransactions.usaRent ? 'FOUND ✅' : 'NOT FOUND ⚠️'}`);
  if (analysis.criticalTransactions.usaRent) {
    console.log(`    ${analysis.criticalTransactions.usaRent.description} - $${analysis.criticalTransactions.usaRent.amount}`);
  }
  console.log(`  Thailand Rent: ${analysis.criticalTransactions.thailandRent ? 'FOUND ✅' : 'NOT FOUND ⚠️'}`);
  if (analysis.criticalTransactions.thailandRent) {
    console.log(`    ${analysis.criticalTransactions.thailandRent.description} - ${analysis.criticalTransactions.thailandRent.amount} THB`);
  }
  console.log(`  Reimbursements: ${analysis.criticalTransactions.reimbursements.length}`);
  console.log();

  results.push(analysis);
}

// Generate summary report
console.log('='.repeat(70));
console.log('BATCH 1 SUMMARY');
console.log('='.repeat(70));
console.log();

const totalTransactions = results.reduce((sum, r) => sum + r.stats.total, 0);
const totalRedFlags = results.reduce((sum, r) =>
  sum + r.redFlags.negativeAmounts.length + r.redFlags.commaFormatted.length +
  r.redFlags.typoReimbursements.length + r.redFlags.largeExpenses.length, 0);

console.log(`Total Transactions: ${totalTransactions}`);
console.log(`Total Red Flags: ${totalRedFlags}`);
console.log();

console.log('PER-MONTH BREAKDOWN:');
results.forEach(r => {
  console.log(`  ${r.month}: ${r.stats.total} transactions, ${r.redFlags.negativeAmounts.length + r.redFlags.commaFormatted.length + r.redFlags.typoReimbursements.length} red flags`);
});
console.log();

// Critical checks
console.log('CRITICAL CHECKS:');
const allRentsFound = results.every(r => r.criticalTransactions.usaRent && r.criticalTransactions.thailandRent);
console.log(`  All dual rents found: ${allRentsFound ? '✅ YES' : '⚠️  NO - INVESTIGATE'}`);
console.log();

// Expected patterns
console.log('EXPECTED PATTERNS (From 21+ months):');
console.log('  ✓ Negative amounts: 3-7 per month (normal)');
console.log('  ✓ Comma amounts: 2-3 per month (normal)');
console.log('  ✓ Typo reimbursements: 1-2 per month (30% of months)');
console.log('  ✓ THB distribution: 45-55% (Thailand-based months)');
console.log('  ✓ Dual rents: Both USA + Thailand expected each month');
console.log();

// Save results
const outputPath = path.join(__dirname, 'GATE1-PREFLIGHT-ANALYSIS.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`Results saved to: ${outputPath}`);

console.log();
console.log('='.repeat(70));
console.log('GATE 1 PRE-FLIGHT ANALYSIS COMPLETE');
console.log('='.repeat(70));
console.log();
console.log('NEXT STEPS:');
console.log('1. Review red flags and critical transactions');
console.log('2. Proceed to Gate 2 Phase 1: Parse August 2023');
console.log('3. Follow reverse chronological order: Aug → Jul → Jun → May');
console.log();
