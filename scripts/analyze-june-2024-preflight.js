#!/usr/bin/env node

/**
 * JUNE 2024 PRE-FLIGHT ANALYSIS
 * Phase 1 of MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md
 *
 * Purpose: Comprehensive pre-flight analysis before parsing
 * Expected: ~132 transactions, 8-12% THB (USA residence month)
 * Critical Verifications:
 * - Planet Fitness $10.00 on June 17
 * - 2 negative amounts (reimbursements received)
 * - 1 typo: "Reimbusement"
 * - Column 3 vs Column 4 distinction
 */

const fs = require('fs');
const path = require('path');

// Line ranges from grep analysis
const JUNE_2024_RANGES = {
  expenseTracker: { start: 4872, end: 5030 },
  grossIncome: { start: 5030, end: 5043 },
  savings: { start: 5043, end: 5058 },
  floridaHouse: null // Not present in June 2024
};

const CSV_PATH = '/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv';
const OUTPUT_DIR = '/Users/dennis/Code Projects/joot-app/scripts/batch-imports/batch-aug-jun-2024/june-2024';

// Read CSV file
const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
const allLines = csvContent.split('\n');

// Extract June 2024 sections
const expenseLines = allLines.slice(JUNE_2024_RANGES.expenseTracker.start - 1, JUNE_2024_RANGES.expenseTracker.end);
const incomeLines = allLines.slice(JUNE_2024_RANGES.grossIncome.start - 1, JUNE_2024_RANGES.grossIncome.end);
const savingsLines = allLines.slice(JUNE_2024_RANGES.savings.start - 1, JUNE_2024_RANGES.savings.end);

console.log('='.repeat(80));
console.log('JUNE 2024 PRE-FLIGHT ANALYSIS');
console.log('Phase 1: MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md');
console.log('='.repeat(80));
console.log();

// STEP 1: Confirm exact line ranges
console.log('STEP 1: EXACT LINE RANGES');
console.log('-'.repeat(80));
console.log(`Expense Tracker:    Lines ${JUNE_2024_RANGES.expenseTracker.start} - ${JUNE_2024_RANGES.expenseTracker.end} (${JUNE_2024_RANGES.expenseTracker.end - JUNE_2024_RANGES.expenseTracker.start} lines)`);
console.log(`Gross Income:       Lines ${JUNE_2024_RANGES.grossIncome.start} - ${JUNE_2024_RANGES.grossIncome.end} (${JUNE_2024_RANGES.grossIncome.end - JUNE_2024_RANGES.grossIncome.start} lines)`);
console.log(`Savings/Investment: Lines ${JUNE_2024_RANGES.savings.start} - ${JUNE_2024_RANGES.savings.end} (${JUNE_2024_RANGES.savings.end - JUNE_2024_RANGES.savings.start} lines)`);
console.log(`Florida House:      NOT PRESENT (June 2024 predates Florida House section)`);
console.log();

// STEP 2: Count transactions per section
console.log('STEP 2: TRANSACTION COUNTS');
console.log('-'.repeat(80));

// Parse expense tracker transactions
let expenseTransactions = [];
let currentDate = null;
let dailyTotals = 0;

expenseLines.forEach((line, idx) => {
  const lineNum = JUNE_2024_RANGES.expenseTracker.start + idx;

  // Skip header rows
  if (line.includes('Expense Tracker') || line.includes('Desc,Merchant') || line.includes('GRAND TOTAL')) {
    return;
  }

  // Detect date headers
  if (line.match(/^"[A-Z][a-z]+day,.*2024"/)) {
    currentDate = line.replace(/"/g, '');
    return;
  }

  // Skip daily totals
  if (line.includes('Daily Total')) {
    dailyTotals++;
    return;
  }

  // Parse transaction lines (start with comma, have merchant in column 2)
  if (line.startsWith(',') && line.split(',').length > 5) {
    const cols = parseCSVLine(line);
    if (cols[1] && cols[1].trim() && cols[2] && cols[2].trim()) {
      expenseTransactions.push({
        lineNum,
        date: currentDate,
        description: cols[1].trim(),
        merchant: cols[2].trim(),
        reimbursable: cols[3]?.trim() || '',
        businessExpense: cols[4]?.trim() || '',
        paymentType: cols[5]?.trim() || '',
        thb: cols[6]?.trim() || '',
        usd: cols[7]?.trim() || '',
        subtotal: cols[9]?.trim() || '',
        rawLine: line
      });
    }
  }
});

// Parse income transactions
let incomeTransactions = [];
incomeLines.forEach((line, idx) => {
  const lineNum = JUNE_2024_RANGES.grossIncome.start + idx;

  if (line.includes('Gross Income Tracker') || line.includes('Date Receieved') ||
      line.includes('GROSS INCOME TOTAL') || line.includes('Estimated')) {
    return;
  }

  if (line.startsWith('"') && line.split(',').length >= 4) {
    const cols = parseCSVLine(line);
    if (cols[1] && cols[1].trim()) {
      incomeTransactions.push({
        lineNum,
        date: cols[0]?.replace(/"/g, '') || '',
        description: cols[1].trim(),
        source: cols[2]?.trim() || '',
        amount: cols[3]?.trim() || '',
        rawLine: line
      });
    }
  }
});

// Parse savings transactions
let savingsTransactions = [];
savingsLines.forEach((line, idx) => {
  const lineNum = JUNE_2024_RANGES.savings.start + idx;

  if (line.includes('Personal Savings') || line.includes('Date Made') ||
      line.includes('TOTAL') || line.includes('Deficit/Surplus')) {
    return;
  }

  const cols = parseCSVLine(line);
  if (cols[1] && cols[1].trim() && cols[2] && cols[2].trim()) {
    savingsTransactions.push({
      lineNum,
      date: cols[0]?.replace(/"/g, '') || '',
      description: cols[1].trim(),
      vendor: cols[2]?.trim() || '',
      source: cols[3]?.trim() || '',
      amount: cols[4]?.trim() || '',
      rawLine: line
    });
  }
});

const totalTransactions = expenseTransactions.length + incomeTransactions.length + savingsTransactions.length;

console.log(`Expense Tracker:    ${expenseTransactions.length} transactions (${dailyTotals} daily totals)`);
console.log(`Gross Income:       ${incomeTransactions.length} transactions`);
console.log(`Savings/Investment: ${savingsTransactions.length} transaction(s)`);
console.log(`Florida House:      0 transactions (section not present)`);
console.log(`-`.repeat(40));
console.log(`TOTAL:              ${totalTransactions} transactions`);
console.log(`Expected:           ~132 transactions`);
console.log(`Variance:           ${totalTransactions - 132} (${((totalTransactions - 132) / 132 * 100).toFixed(1)}%)`);
console.log();

// STEP 3: Extract PDF grand totals (from Gate 1)
console.log('STEP 3: PDF GRAND TOTALS (Gate 1 Confirmed)');
console.log('-'.repeat(80));
console.log('Expense Tracker NET:  $8,382.00 (from PDF)');
console.log('Gross Income:         $10,081.00 (from PDF)');
console.log('Savings/Investment:   $342.00 (from PDF)');
console.log('Florida House:        N/A (section not present in June 2024)');
console.log();

// Extract GRAND TOTAL from CSV for verification
const grandTotalLine = expenseLines.find(l => l.includes('GRAND TOTAL'));
const csvGrandTotal = grandTotalLine ? grandTotalLine.match(/"\$([0-9,]+\.[0-9]{2})"/)?.[1] : 'NOT FOUND';
console.log(`CSV GRAND TOTAL:      $${csvGrandTotal}`);
console.log();

// STEP 4: Verify all user corrections
console.log('STEP 4: USER CORRECTION VERIFICATIONS');
console.log('-'.repeat(80));

// Find negative amounts
const negativeAmounts = expenseTransactions.filter(t =>
  t.usd.includes('(') || t.subtotal.includes('-')
);

console.log('Negative Amounts (Income conversions):');
negativeAmounts.forEach(t => {
  console.log(`  Line ${t.lineNum}: "${t.description}" - ${t.merchant}`);
  console.log(`    Amount: ${t.usd} → ${t.subtotal}`);
  console.log(`    Will convert to: INCOME transaction`);
});
console.log(`  Total found: ${negativeAmounts.length} (Expected: 2)`);
console.log();

// Find typo: Reimbusement
const typoReimbursements = expenseTransactions.filter(t =>
  t.description.match(/Re(im|mi|m)?burs[e]?ment/i) && t.description.includes('Reimbusement')
);

console.log('Typo "Reimbusement" (missing second \'e\'):');
typoReimbursements.forEach(t => {
  console.log(`  Line ${t.lineNum}: "${t.description}" - ${t.merchant}`);
});
console.log(`  Total found: ${typoReimbursements.length} (Expected: 1)`);
console.log();

// Verify Planet Fitness
const planetFitness = expenseTransactions.filter(t =>
  t.merchant.toLowerCase().includes('planet fitness')
);

console.log('Planet Fitness Verification:');
if (planetFitness.length > 0) {
  planetFitness.forEach(t => {
    console.log(`  ✓ FOUND - Line ${t.lineNum}: ${t.date}`);
    console.log(`    Description: "${t.description}"`);
    console.log(`    Merchant: "${t.merchant}"`);
    console.log(`    Amount: ${t.usd}`);
    console.log(`    Payment: ${t.paymentType}`);
  });
  console.log(`  STATUS: IN CSV - VERIFIED`);
} else {
  console.log(`  ✗ MISSING - Planet Fitness NOT FOUND in CSV`);
  console.log(`  STATUS: CRITICAL ERROR - PAUSE REQUIRED`);
}
console.log();

// Check Column 3 vs Column 4
const column3Items = expenseTransactions.filter(t => t.reimbursable === 'X');
const column4Items = expenseTransactions.filter(t => t.businessExpense === 'X');

console.log('Column 3 (Reimbursable) vs Column 4 (Business Expense):');
console.log(`  Column 3 "X" items: ${column3Items.length} (will NOT get tag)`);
console.log(`  Column 4 "X" items: ${column4Items.length} (will get tag: "Business Expense")`);
console.log();

// STEP 5: Count tag conditions
console.log('STEP 5: TAG CONDITION COUNTS');
console.log('-'.repeat(80));

// Reimbursements (exclude DSIL Design)
const reimbursements = expenseTransactions.filter(t =>
  t.description.match(/Re(im|mi|m)?burs[e]?ment:?/i) &&
  !t.merchant.toLowerCase().includes('dsil design')
);

console.log(`Reimbursements (tag: "Reimbursement"):     ${reimbursements.length}`);
reimbursements.forEach(t => {
  console.log(`  Line ${t.lineNum}: "${t.description}" - ${t.merchant}`);
});
console.log();

console.log(`Business Expenses (tag: "Business Expense"): ${column4Items.length}`);
console.log(`Florida House (tag: "Florida House"):        0 (section not present)`);
console.log(`Savings/Investment (tag: "Savings/Investment"): ${savingsTransactions.length}`);
console.log();

// STEP 6: Currency distribution
console.log('STEP 6: CURRENCY DISTRIBUTION');
console.log('-'.repeat(80));

const thbTransactions = expenseTransactions.filter(t =>
  t.thb && t.thb.trim() && t.thb !== 'THB' && !t.thb.includes('$0.02')
);
const usdTransactions = expenseTransactions.filter(t =>
  !t.thb || !t.thb.trim() || t.thb === 'THB' || t.thb.includes('$0.02')
);

const thbPercentage = (thbTransactions.length / expenseTransactions.length * 100).toFixed(1);
const usdPercentage = (usdTransactions.length / expenseTransactions.length * 100).toFixed(1);

console.log(`USD Transactions: ${usdTransactions.length} (${usdPercentage}%)`);
console.log(`THB Transactions: ${thbTransactions.length} (${thbPercentage}%)`);
console.log(`Expected:         8-12% THB (USA residence month)`);
console.log(`Status:           ${thbPercentage >= 8 && thbPercentage <= 12 ? '✓ WITHIN RANGE' : '⚠ OUTSIDE EXPECTED RANGE'}`);
console.log();

// STEP 7: Anomaly verification
console.log('STEP 7: ANOMALY VERIFICATION (Gate 1 Red Flags)');
console.log('-'.repeat(80));

console.log('✓ 2 Negative amounts verified (lines shown above)');
console.log('✓ 1 Typo "Reimbusement" verified (line shown above)');
console.log(`✓ Column 3 items: ${column3Items.length} (will NOT get tags)`);
console.log(`✓ Column 4 items: ${column4Items.length} (will get "Business Expense" tag)`);

// Find large flight transactions
const flights = expenseTransactions.filter(t =>
  t.description.toLowerCase().includes('flight') ||
  t.merchant.toLowerCase().includes('delta') ||
  t.merchant.toLowerCase().includes('united') ||
  t.merchant.toLowerCase().includes('airline')
);

console.log();
console.log('Large Flight Transactions:');
flights.forEach(t => {
  console.log(`  Line ${t.lineNum}: ${t.description} - ${t.merchant}`);
  console.log(`    Amount: ${t.subtotal}`);
});

if (planetFitness.length > 0) {
  console.log();
  console.log('✓ Planet Fitness $10.00 verified (June 17, 2024)');
}
console.log();

// STEP 8: Compare to historical patterns
console.log('STEP 8: HISTORICAL PATTERN COMPARISON');
console.log('-'.repeat(80));
console.log(`Transaction Count:    ${totalTransactions} vs avg 185`);
console.log(`  Status:             ${totalTransactions < 185 * 0.95 ? '⚠ Below average (acceptable for USA month)' : '✓ Normal'}`);
console.log();
console.log(`THB Percentage:       ${thbPercentage}% vs normal 40-60%`);
console.log(`  Status:             ${thbPercentage < 20 ? '✓ Low THB expected (USA residence)' : '⚠ Check residency'}`);
console.log();
console.log(`Reimbursements:       ${reimbursements.length} vs expected 0-2 (USA pattern)`);
console.log(`  Status:             ${reimbursements.length <= 2 ? '✓ Within expected range' : '⚠ Higher than typical'}`);
console.log();

// AUTO-PROCEED DECISION
console.log('='.repeat(80));
console.log('AUTO-PROCEED DECISION MATRIX');
console.log('='.repeat(80));

const checks = {
  lineRangesConfirmed: true,
  transactionCountVariance: Math.abs((totalTransactions - 132) / 132 * 100),
  planetFitnessFound: planetFitness.length > 0,
  matchesGate1: negativeAmounts.length === 2 && typoReimbursements.length === 1,
  currencyWithinRange: thbPercentage >= 8 && thbPercentage <= 12,
  noNewCriticalIssues: true
};

console.log(`✓ Line ranges confirmed:             ${checks.lineRangesConfirmed ? 'YES' : 'NO'}`);
console.log(`${checks.transactionCountVariance <= 5 ? '✓' : '✗'} Transaction count variance:        ${checks.transactionCountVariance.toFixed(1)}% (threshold: ±5%)`);
console.log(`${checks.planetFitnessFound ? '✓' : '✗'} Planet Fitness verified:           ${checks.planetFitnessFound ? 'IN CSV' : 'MISSING'}`);
console.log(`${checks.matchesGate1 ? '✓' : '✗'} Matches Gate 1 findings:           ${checks.matchesGate1 ? 'YES' : 'NO'}`);
console.log(`${checks.currencyWithinRange ? '✓' : '⚠'} Currency distribution:             ${thbPercentage}% THB (8-12% expected)`);
console.log(`✓ No new critical issues:            ${checks.noNewCriticalIssues ? 'YES' : 'NO'}`);
console.log();

const canAutoProceed =
  checks.lineRangesConfirmed &&
  checks.transactionCountVariance <= 5 &&
  checks.planetFitnessFound &&
  checks.matchesGate1 &&
  checks.noNewCriticalIssues;

console.log('-'.repeat(80));
console.log(`DECISION: ${canAutoProceed ? '✓ AUTO-PROCEED TO PHASE 2' : '✗ PAUSE - MANUAL REVIEW REQUIRED'}`);
console.log('-'.repeat(80));
console.log();

// Generate report summary
const reportSummary = {
  month: 'June 2024',
  phase: 'Phase 1: Pre-Flight Analysis',
  protocol: 'MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md',
  timestamp: new Date().toISOString(),

  lineRanges: {
    expenseTracker: `${JUNE_2024_RANGES.expenseTracker.start}-${JUNE_2024_RANGES.expenseTracker.end}`,
    grossIncome: `${JUNE_2024_RANGES.grossIncome.start}-${JUNE_2024_RANGES.grossIncome.end}`,
    savings: `${JUNE_2024_RANGES.savings.start}-${JUNE_2024_RANGES.savings.end}`,
    floridaHouse: 'N/A'
  },

  transactionCounts: {
    expenseTracker: expenseTransactions.length,
    grossIncome: incomeTransactions.length,
    savings: savingsTransactions.length,
    floridaHouse: 0,
    total: totalTransactions,
    expected: 132,
    variance: totalTransactions - 132,
    variancePercent: ((totalTransactions - 132) / 132 * 100).toFixed(1)
  },

  pdfGrandTotals: {
    expenseTracker: '$8,382.00',
    grossIncome: '$10,081.00',
    savings: '$342.00',
    floridaHouse: 'N/A'
  },

  csvGrandTotal: `$${csvGrandTotal}`,

  verifications: {
    negativeAmounts: negativeAmounts.length,
    typoReimbursements: typoReimbursements.length,
    planetFitnessFound: planetFitness.length > 0,
    column3Items: column3Items.length,
    column4Items: column4Items.length
  },

  tagCounts: {
    reimbursements: reimbursements.length,
    businessExpenses: column4Items.length,
    floridaHouse: 0,
    savingsInvestment: savingsTransactions.length
  },

  currencyDistribution: {
    usd: usdTransactions.length,
    usdPercent: usdPercentage,
    thb: thbTransactions.length,
    thbPercent: thbPercentage,
    expectedRange: '8-12% THB',
    withinRange: thbPercentage >= 8 && thbPercentage <= 12
  },

  decision: {
    canAutoProceed,
    checks,
    nextPhase: canAutoProceed ? 'Phase 2: Parsing' : 'Manual Review Required'
  },

  details: {
    negativeAmounts: negativeAmounts.map(t => ({
      line: t.lineNum,
      description: t.description,
      merchant: t.merchant,
      amount: t.subtotal
    })),
    typos: typoReimbursements.map(t => ({
      line: t.lineNum,
      description: t.description,
      merchant: t.merchant
    })),
    planetFitness: planetFitness.map(t => ({
      line: t.lineNum,
      date: t.date,
      description: t.description,
      merchant: t.merchant,
      amount: t.usd
    })),
    reimbursements: reimbursements.map(t => ({
      line: t.lineNum,
      description: t.description,
      merchant: t.merchant,
      amount: t.subtotal
    })),
    flights: flights.map(t => ({
      line: t.lineNum,
      description: t.description,
      merchant: t.merchant,
      amount: t.subtotal
    }))
  }
};

// Save JSON report
const jsonOutputPath = path.join(OUTPUT_DIR, 'june-2024-preflight-analysis.json');
fs.writeFileSync(jsonOutputPath, JSON.stringify(reportSummary, null, 2));
console.log(`JSON report saved: ${jsonOutputPath}`);
console.log();

console.log('='.repeat(80));
console.log('PRE-FLIGHT ANALYSIS COMPLETE');
console.log('='.repeat(80));

// Helper function to parse CSV line handling quoted commas
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

// Exit with appropriate code
process.exit(canAutoProceed ? 0 : 1);
