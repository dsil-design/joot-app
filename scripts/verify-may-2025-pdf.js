#!/usr/bin/env node

/**
 * May 2025 PDF Verification Script
 *
 * Verifies parsed data against source PDF reference document
 * PDF: Budget for Import-page6.pdf (May 2025)
 */

const fs = require('fs');
const path = require('path');

// Load parsed data
const parsedDataPath = path.join(__dirname, 'may-2025-CORRECTED.json');
const parsedData = JSON.parse(fs.readFileSync(parsedDataPath, 'utf8'));

// PDF Reference Totals (from Budget for Import-page6.pdf)
const PDF_REFERENCE = {
  expenseTrackerGrandTotal: 6067.30,
  grossIncomeTotal: 10409.29,
  savingsTotal: 341.67,
  floridaHouseGrandTotal: 166.83, // PDF shows this, but includes Xfinity duplicate
  floridaHouseAdjusted: 93.83, // After removing Xfinity duplicate ($166.83 - $73.00)

  // Expected transaction counts from PDF
  grossIncomeCount: 4,
  savingsCount: 1,

  // Known zero-amount transactions to verify exclusion
  zeroAmountTransactions: [
    { date: '2025-05-07', description: 'Groceries', merchant: 'Tops', note: 'Missing $ sign, amount 16.62' },
    { date: '2025-05-19', description: 'Flight for Leigh', merchant: 'AirAsia', note: '$0.00 - should be excluded' },
    { date: '2025-05-06', description: 'Doorcam', merchant: 'RING', note: 'No amount - Florida House' },
    { date: '2025-05-14', description: 'Electricity Bill', merchant: 'FPL', note: 'No amount - Florida House' }
  ]
};

// First 5 transactions from PDF Expense Tracker
const FIRST_5_PDF = [
  { date: '2025-05-01', description: 'Work Email', merchant: 'Google', amount: 6.36 },
  { date: '2025-05-01', description: 'Florida House', merchant: 'Me', amount: 1000.00 },
  { date: '2025-05-01', description: 'Semi-weekly: Gym Membership', merchant: 'Virgin Active', amount: 18.65 },
  { date: '2025-05-01', description: 'Meal Plan', merchant: 'Chef Fuji', amount: 29.90, originalAmount: 1000, originalCurrency: 'THB' },
  { date: '2025-05-01', description: 'Wooden Sign (Desposit)', merchant: 'Teak Wood Shop', amount: 14.95, originalAmount: 500, originalCurrency: 'THB' }
];

// Last 5 transactions from PDF Expense Tracker
const LAST_5_PDF = [
  { date: '2025-05-31', description: 'Greens Fee', merchant: 'Pimanthip', amount: 30.70, originalAmount: 1000, originalCurrency: 'THB' },
  { date: '2025-05-31', description: 'Drinks', merchant: 'Pimanthip', amount: 13.57, originalAmount: 442, originalCurrency: 'THB' },
  { date: '2025-05-31', description: 'Caddy Tip', merchant: 'Pimanthip', amount: 12.28, originalAmount: 400, originalCurrency: 'THB' },
  { date: '2025-05-31', description: 'Taxi', merchant: 'Bolt', amount: 4.75 },
  { date: '2025-05-31', description: 'Dessert: Dairy Queen', merchant: 'Grab', amount: 3.95 }
];

// Sample THB transactions to verify conversion
const SAMPLE_THB = [
  { date: '2025-05-01', merchant: 'Chef Fuji', originalAmount: 1000, usdAmount: 29.90 },
  { date: '2025-05-05', merchant: 'Landlord', originalAmount: 35000, usdAmount: 1057.00 },
  { date: '2025-05-27', merchant: 'PEA', originalAmount: 5389.03, usdAmount: 165.44 },
  { date: '2025-05-31', merchant: 'Pimanthip', originalAmount: 1000, usdAmount: 30.70 },
  { date: '2025-05-31', merchant: 'Pimanthip', originalAmount: 442, usdAmount: 13.57 }
];

// Reimbursements from PDF
const PDF_REIMBURSEMENTS = [
  { date: '2025-05-01', merchant: 'Nidnoi', description: 'Reimbursement: Groceries', amount: 5.38, originalAmount: 180 },
  { date: '2025-05-01', merchant: 'Nidnoi', description: 'Reimbursement: Rent & Electricity', amount: 272.48, originalAmount: 9113 },
  { date: '2025-05-03', merchant: 'Nidnoi', description: 'Reimbursement: Dinner', amount: 9.33, originalAmount: 313 },
  { date: '2025-05-04', merchant: 'Nidnoi', description: 'Reimbursement: Dinner', amount: 47.68, originalAmount: 1600 },
  { date: '2025-05-04', merchant: 'Nidnoi', description: 'Reimbursement: Groceries', amount: 19.28, originalAmount: 647 },
  { date: '2025-05-13', merchant: 'Nidnoi', description: 'Reimbursement: Dinner', amount: 14.95, originalAmount: 500 },
  { date: '2025-05-25', merchant: 'Nidnoi', description: 'Reimbursement: Dinner', amount: 6.48, originalAmount: 213 },
  { date: '2025-05-25', merchant: 'Nidnoi', description: 'Reimbursement: Groceries', amount: 24.87, originalAmount: 818 },
  { date: '2025-05-28', merchant: 'Nidnoi', description: 'Reimbursement: Lunch', amount: 7.47, originalAmount: 244 },
  { date: '2025-05-29', merchant: 'Nidnoi', description: 'Reimbursement: Groceries', amount: 2.20, originalAmount: 72 },
  { date: '2025-05-29', merchant: 'Nidnoi', description: 'Reimbursement: Rent', amount: 244.00, originalAmount: 8000 },
  { date: '2025-05-30', merchant: 'Nidnoi', description: 'Reimbursement: Electricity & Water', amount: 45.25, originalAmount: 1474 },
  { date: '2025-05-30', merchant: 'Nidnoi', description: 'Reimbursement: Dinner', amount: 15.37, originalAmount: 500.75 },
  { date: '2025-05-19', merchant: 'Leigh', description: 'Reimbursement: Flight', amount: 80.67, originalAmount: 2680 },
  { date: '2025-05-19', merchant: 'Leigh', description: 'Reimbursement: Hotel', amount: 75.25, originalAmount: 2500 },
  { date: '2025-05-30', merchant: 'Leigh', description: 'Reimbursement: Hotel', amount: 76.75, originalAmount: 2500 }
];

// Florida House transactions from PDF
const PDF_FLORIDA_HOUSE = [
  { date: '2025-05-06', description: 'Water Bill', merchant: 'Englewood Water', amount: 57.24 },
  { date: '2025-05-14', description: 'Gas Bill', merchant: 'TECO', amount: 36.59 },
  // Zero amount - should be excluded:
  // { date: '2025-05-06', description: 'Doorcam', merchant: 'RING', amount: 0 },
  // { date: '2025-05-14', description: 'Electricity Bill', merchant: 'FPL', amount: 0 }
];

console.log('='.repeat(80));
console.log('MAY 2025 PDF VERIFICATION REPORT');
console.log('='.repeat(80));
console.log();
console.log('PDF Reference: Budget for Import-page6.pdf (May 2025)');
console.log('Parsed Data: scripts/may-2025-CORRECTED.json');
console.log('Generated:', new Date().toISOString());
console.log();

// Separate transactions by section
const expenseTrackerTxns = parsedData.filter(t =>
  !t.tags.includes('Savings/Investment') &&
  !t.tags.includes('Florida House')
);

const grossIncomeTxns = parsedData.filter(t =>
  t.transaction_type === 'income' &&
  !t.tags.includes('Reimbursement') &&
  !t.tags.includes('Florida House')
);

const savingsTxns = parsedData.filter(t =>
  t.tags.includes('Savings/Investment')
);

const floridaHouseTxns = parsedData.filter(t =>
  t.tags.includes('Florida House')
);

const reimbursementTxns = expenseTrackerTxns.filter(t =>
  t.tags.includes('Reimbursement')
);

const expensesOnly = expenseTrackerTxns.filter(t =>
  t.transaction_type === 'expense'
);

console.log('='.repeat(80));
console.log('1. GRAND TOTAL COMPARISONS');
console.log('='.repeat(80));
console.log();

// Calculate totals
const expenseTotal = expensesOnly.reduce((sum, t) => sum + t.amount, 0);
const reimbursementTotal = reimbursementTxns.reduce((sum, t) => sum + t.amount, 0);
const expenseTrackerNet = expenseTotal - reimbursementTotal;

const grossIncomeTotal = grossIncomeTxns.reduce((sum, t) => sum + t.amount, 0);
const savingsTotal = savingsTxns.reduce((sum, t) => sum + t.amount, 0);
const floridaHouseTotal = floridaHouseTxns.reduce((sum, t) => sum + t.amount, 0);

function compareTotal(label, parsed, pdfExpected, tolerance = 1.50) {
  const variance = Math.abs(parsed - pdfExpected);
  const variancePct = (variance / pdfExpected) * 100;
  const status = variancePct <= tolerance ? '✅ PASS' : '❌ FAIL';

  console.log(`${label}:`);
  console.log(`  Parsed:     $${parsed.toFixed(2)}`);
  console.log(`  PDF:        $${pdfExpected.toFixed(2)}`);
  console.log(`  Variance:   $${variance.toFixed(2)} (${variancePct.toFixed(2)}%)`);
  console.log(`  Status:     ${status}`);
  console.log();

  return variancePct <= tolerance;
}

const expenseTrackerPass = compareTotal(
  'Expense Tracker NET (Expenses - Reimbursements)',
  expenseTrackerNet,
  PDF_REFERENCE.expenseTrackerGrandTotal
);

const grossIncomePass = compareTotal(
  'Gross Income TOTAL',
  grossIncomeTotal,
  PDF_REFERENCE.grossIncomeTotal
);

const savingsPass = compareTotal(
  'Personal Savings & Investments TOTAL',
  savingsTotal,
  PDF_REFERENCE.savingsTotal
);

console.log('Florida House Expenses TOTAL:');
console.log(`  Parsed:     $${floridaHouseTotal.toFixed(2)}`);
console.log(`  PDF:        $${PDF_REFERENCE.floridaHouseGrandTotal.toFixed(2)} (includes Xfinity duplicate)`);
console.log(`  Adjusted:   $${PDF_REFERENCE.floridaHouseAdjusted.toFixed(2)} (after removing Xfinity duplicate)`);
const floridaHouseVariance = Math.abs(floridaHouseTotal - PDF_REFERENCE.floridaHouseAdjusted);
const floridaHouseVariancePct = (floridaHouseVariance / PDF_REFERENCE.floridaHouseAdjusted) * 100;
console.log(`  Variance:   $${floridaHouseVariance.toFixed(2)} (${floridaHouseVariancePct.toFixed(2)}%)`);
const floridaHousePass = floridaHouseVariancePct <= 1.50;
console.log(`  Status:     ${floridaHousePass ? '✅ PASS' : '❌ FAIL'}`);
console.log();

console.log('='.repeat(80));
console.log('2. TRANSACTION COUNT VERIFICATION');
console.log('='.repeat(80));
console.log();

console.log(`Total Parsed Transactions: ${parsedData.length}`);
console.log(`  - Expense Tracker: ${expenseTrackerTxns.length} (${expensesOnly.length} expenses + ${reimbursementTxns.length} reimbursements)`);
console.log(`  - Gross Income: ${grossIncomeTxns.length} (expected: ${PDF_REFERENCE.grossIncomeCount}) ${grossIncomeTxns.length === PDF_REFERENCE.grossIncomeCount ? '✅' : '❌'}`);
console.log(`  - Savings: ${savingsTxns.length} (expected: ${PDF_REFERENCE.savingsCount}) ${savingsTxns.length === PDF_REFERENCE.savingsCount ? '✅' : '❌'}`);
console.log(`  - Florida House: ${floridaHouseTxns.length} (expected: 2 after removing zeros) ${floridaHouseTxns.length === 2 ? '✅' : '❌'}`);
console.log();

console.log('='.repeat(80));
console.log('3. SPOT CHECK: FIRST 5 TRANSACTIONS');
console.log('='.repeat(80));
console.log();

let first5Pass = true;
FIRST_5_PDF.forEach((pdfTxn, idx) => {
  const parsed = parsedData.find(t =>
    t.date === pdfTxn.date &&
    t.merchant === pdfTxn.merchant &&
    Math.abs(t.amount - pdfTxn.amount) < 0.01
  );

  const match = parsed ? '✅' : '❌';
  if (!parsed) first5Pass = false;

  console.log(`${idx + 1}. ${pdfTxn.date} - ${pdfTxn.description} (${pdfTxn.merchant}) - $${pdfTxn.amount}`);
  console.log(`   Status: ${match}`);

  if (pdfTxn.originalAmount && parsed) {
    const currencyMatch = parsed.original_amount === pdfTxn.originalAmount && parsed.original_currency === pdfTxn.originalCurrency ? '✅' : '❌';
    console.log(`   THB: ${pdfTxn.originalAmount} -> $${pdfTxn.amount} ${currencyMatch}`);
  }
  console.log();
});

console.log('='.repeat(80));
console.log('4. SPOT CHECK: LAST 5 TRANSACTIONS');
console.log('='.repeat(80));
console.log();

let last5Pass = true;
LAST_5_PDF.forEach((pdfTxn, idx) => {
  const parsed = parsedData.find(t =>
    t.date === pdfTxn.date &&
    t.merchant === pdfTxn.merchant &&
    Math.abs(t.amount - pdfTxn.amount) < 0.01
  );

  const match = parsed ? '✅' : '❌';
  if (!parsed) last5Pass = false;

  console.log(`${idx + 1}. ${pdfTxn.date} - ${pdfTxn.description} (${pdfTxn.merchant}) - $${pdfTxn.amount}`);
  console.log(`   Status: ${match}`);

  if (pdfTxn.originalAmount && parsed) {
    const currencyMatch = parsed.original_amount === pdfTxn.originalAmount && parsed.original_currency === pdfTxn.originalCurrency ? '✅' : '❌';
    console.log(`   THB: ${pdfTxn.originalAmount} -> $${pdfTxn.amount} ${currencyMatch}`);
  }
  console.log();
});

console.log('='.repeat(80));
console.log('5. REIMBURSEMENT VERIFICATION');
console.log('='.repeat(80));
console.log();

console.log(`PDF Reimbursements Count: ${PDF_REIMBURSEMENTS.length}`);
console.log(`Parsed Reimbursements Count: ${reimbursementTxns.length}`);
console.log(`Match: ${PDF_REIMBURSEMENTS.length === reimbursementTxns.length ? '✅ PASS' : '❌ FAIL'}`);
console.log();

let reimbursementPass = PDF_REIMBURSEMENTS.length === reimbursementTxns.length;

console.log('Checking all reimbursements are marked as income with positive amounts:');
const allIncomeType = reimbursementTxns.every(t => t.transaction_type === 'income');
const allPositiveAmounts = reimbursementTxns.every(t => t.amount > 0);
console.log(`  All marked as 'income': ${allIncomeType ? '✅' : '❌'}`);
console.log(`  All positive amounts: ${allPositiveAmounts ? '✅' : '❌'}`);
console.log();

console.log('Sample reimbursement verification (first 5):');
PDF_REIMBURSEMENTS.slice(0, 5).forEach(pdfReimb => {
  const parsed = reimbursementTxns.find(t =>
    t.date === pdfReimb.date &&
    t.merchant === pdfReimb.merchant &&
    Math.abs(t.amount - pdfReimb.amount) < 0.01
  );

  const match = parsed ? '✅' : '❌';
  console.log(`  ${pdfReimb.date} - ${pdfReimb.description} - $${pdfReimb.amount} ${match}`);
});
console.log();

console.log('='.repeat(80));
console.log('6. FLORIDA HOUSE VERIFICATION');
console.log('='.repeat(80));
console.log();

console.log(`PDF Florida House Count: ${PDF_FLORIDA_HOUSE.length} (after zero-amount exclusions)`);
console.log(`Parsed Florida House Count: ${floridaHouseTxns.length}`);
console.log(`Match: ${PDF_FLORIDA_HOUSE.length === floridaHouseTxns.length ? '✅ PASS' : '❌ FAIL'}`);
console.log();

let floridaHouseCountPass = PDF_FLORIDA_HOUSE.length === floridaHouseTxns.length;

PDF_FLORIDA_HOUSE.forEach(pdfFL => {
  const parsed = floridaHouseTxns.find(t =>
    t.date === pdfFL.date &&
    t.merchant === pdfFL.merchant &&
    Math.abs(t.amount - pdfFL.amount) < 0.01
  );

  const match = parsed ? '✅' : '❌';
  console.log(`${pdfFL.date} - ${pdfFL.description} (${pdfFL.merchant}) - $${pdfFL.amount} ${match}`);
});
console.log();

console.log('Verifying Xfinity duplicate was handled correctly:');
const xfinityInExpenseTracker = expenseTrackerTxns.find(t =>
  t.merchant === 'Xfinity' && t.date === '2025-05-19'
);
const xfinityInFloridaHouse = floridaHouseTxns.find(t =>
  t.merchant === 'Xfinity' && t.date === '2025-05-19'
);
console.log(`  Xfinity in Expense Tracker: ${xfinityInExpenseTracker ? '✅ Found (kept)' : '❌ Not found'}`);
console.log(`  Xfinity in Florida House: ${xfinityInFloridaHouse ? '❌ Found (should be removed)' : '✅ Not found (correctly removed)'}`);
const xfinityPass = xfinityInExpenseTracker && !xfinityInFloridaHouse;
console.log(`  Duplicate handling: ${xfinityPass ? '✅ PASS' : '❌ FAIL'}`);
console.log();

console.log('='.repeat(80));
console.log('7. ZERO-AMOUNT EXCLUSION VERIFICATION');
console.log('='.repeat(80));
console.log();

console.log('Verifying zero-amount transactions were correctly excluded:');
console.log();

// May 7 Groceries - actually has amount 16.62 (just missing $ sign)
const may7Groceries = parsedData.find(t =>
  t.date === '2025-05-07' &&
  t.merchant === 'Tops' &&
  Math.abs(t.amount - 16.62) < 0.01
);
console.log(`1. May 7 Groceries (Tops) - Had amount 16.62, missing $ sign:`);
console.log(`   Should be INCLUDED: ${may7Groceries ? '✅ PASS' : '❌ FAIL'}`);
console.log();

// Flight for Leigh - $0.00
const leighFlight = parsedData.find(t =>
  t.date === '2025-05-19' &&
  t.merchant === 'AirAsia' &&
  t.description.includes('Flight for Leigh')
);
console.log(`2. May 19 Flight for Leigh (AirAsia) - $0.00:`);
console.log(`   Should be EXCLUDED: ${!leighFlight ? '✅ PASS' : '❌ FAIL'}`);
console.log();

// Doorcam RING - no amount
const doorcam = parsedData.find(t =>
  t.merchant === 'RING' &&
  t.description.includes('Doorcam')
);
console.log(`3. Doorcam (RING) - No amount:`);
console.log(`   Should be EXCLUDED: ${!doorcam ? '✅ PASS' : '❌ FAIL'}`);
console.log();

// Electricity Bill FPL - no amount
const fplElectricity = parsedData.find(t =>
  t.merchant === 'FPL' &&
  t.description.includes('Electricity')
);
console.log(`4. Electricity Bill (FPL) - No amount:`);
console.log(`   Should be EXCLUDED: ${!fplElectricity ? '✅ PASS' : '❌ FAIL'}`);
console.log();

const zeroAmountPass = may7Groceries && !leighFlight && !doorcam && !fplElectricity;

console.log('='.repeat(80));
console.log('8. CURRENCY DISTRIBUTION VERIFICATION');
console.log('='.repeat(80));
console.log();

const thbTransactions = parsedData.filter(t => t.original_currency === 'THB');
const usdOnlyTransactions = parsedData.filter(t => !t.original_currency);

console.log(`Total Transactions: ${parsedData.length}`);
console.log(`  USD Only: ${usdOnlyTransactions.length}`);
console.log(`  THB Converted: ${thbTransactions.length}`);
console.log();

console.log('THB Currency Validation:');
const allThbHaveOriginal = thbTransactions.every(t =>
  t.original_amount && t.original_currency === 'THB'
);
console.log(`  All THB transactions have original_amount: ${allThbHaveOriginal ? '✅' : '❌'}`);
console.log(`  All THB transactions have original_currency="THB": ${allThbHaveOriginal ? '✅' : '❌'}`);
console.log();

console.log('Sample THB Conversion Verification:');
let thbConversionPass = true;
SAMPLE_THB.forEach(sample => {
  const parsed = thbTransactions.find(t =>
    t.date === sample.date &&
    t.merchant === sample.merchant &&
    t.original_amount === sample.originalAmount
  );

  if (parsed) {
    const amountMatch = Math.abs(parsed.amount - sample.usdAmount) < 0.01;
    const match = amountMatch ? '✅' : '❌';
    if (!amountMatch) thbConversionPass = false;

    console.log(`  ${sample.date} - ${sample.merchant}: THB ${sample.originalAmount} -> $${sample.usdAmount} ${match}`);
    if (parsed.amount !== sample.usdAmount) {
      console.log(`    (Parsed: $${parsed.amount.toFixed(2)})`);
    }
  } else {
    console.log(`  ${sample.date} - ${sample.merchant}: ❌ NOT FOUND`);
    thbConversionPass = false;
  }
});
console.log();

console.log('='.repeat(80));
console.log('9. OVERALL VERIFICATION SUMMARY');
console.log('='.repeat(80));
console.log();

const allChecks = {
  'Expense Tracker NET Total': expenseTrackerPass,
  'Gross Income Total': grossIncomePass,
  'Savings Total': savingsPass,
  'Florida House Total': floridaHousePass,
  'Transaction Counts': grossIncomeTxns.length === 4 && savingsTxns.length === 1 && floridaHouseTxns.length === 2,
  'First 5 Transactions': first5Pass,
  'Last 5 Transactions': last5Pass,
  'Reimbursement Count': reimbursementPass && allIncomeType && allPositiveAmounts,
  'Florida House Count': floridaHouseCountPass && xfinityPass,
  'Zero-Amount Exclusions': zeroAmountPass,
  'THB Currency Handling': allThbHaveOriginal && thbConversionPass
};

Object.entries(allChecks).forEach(([check, passed]) => {
  console.log(`${passed ? '✅' : '❌'} ${check}`);
});
console.log();

const allPassed = Object.values(allChecks).every(v => v);

console.log('='.repeat(80));
console.log(`FINAL VERDICT: ${allPassed ? '✅ PASS - All Verifications Successful' : '⚠️  REVIEW REQUIRED - Some Checks Failed'}`);
console.log('='.repeat(80));
console.log();

// Write detailed report
const reportPath = path.join(__dirname, 'MAY-2025-PDF-VERIFICATION.md');
const report = `# May 2025 PDF Verification Report

**Generated:** ${new Date().toISOString()}
**PDF Reference:** Budget for Import-page6.pdf (May 2025)
**Parsed Data:** scripts/may-2025-CORRECTED.json
**Status:** ${allPassed ? '✅ PASS' : '⚠️ REVIEW REQUIRED'}

---

## 1. Grand Total Comparisons

| Section | Parsed | PDF Expected | Variance | Status |
|---------|--------|--------------|----------|--------|
| Expense Tracker NET | $${expenseTrackerNet.toFixed(2)} | $${PDF_REFERENCE.expenseTrackerGrandTotal.toFixed(2)} | $${Math.abs(expenseTrackerNet - PDF_REFERENCE.expenseTrackerGrandTotal).toFixed(2)} (${((Math.abs(expenseTrackerNet - PDF_REFERENCE.expenseTrackerGrandTotal) / PDF_REFERENCE.expenseTrackerGrandTotal) * 100).toFixed(2)}%) | ${expenseTrackerPass ? '✅ PASS' : '❌ FAIL'} |
| Gross Income | $${grossIncomeTotal.toFixed(2)} | $${PDF_REFERENCE.grossIncomeTotal.toFixed(2)} | $${Math.abs(grossIncomeTotal - PDF_REFERENCE.grossIncomeTotal).toFixed(2)} (${((Math.abs(grossIncomeTotal - PDF_REFERENCE.grossIncomeTotal) / PDF_REFERENCE.grossIncomeTotal) * 100).toFixed(2)}%) | ${grossIncomePass ? '✅ PASS' : '❌ FAIL'} |
| Personal Savings | $${savingsTotal.toFixed(2)} | $${PDF_REFERENCE.savingsTotal.toFixed(2)} | $${Math.abs(savingsTotal - PDF_REFERENCE.savingsTotal).toFixed(2)} (${((Math.abs(savingsTotal - PDF_REFERENCE.savingsTotal) / PDF_REFERENCE.savingsTotal) * 100).toFixed(2)}%) | ${savingsPass ? '✅ PASS' : '❌ FAIL'} |
| Florida House | $${floridaHouseTotal.toFixed(2)} | $${PDF_REFERENCE.floridaHouseAdjusted.toFixed(2)}* | $${Math.abs(floridaHouseTotal - PDF_REFERENCE.floridaHouseAdjusted).toFixed(2)} (${((Math.abs(floridaHouseTotal - PDF_REFERENCE.floridaHouseAdjusted) / PDF_REFERENCE.floridaHouseAdjusted) * 100).toFixed(2)}%) | ${floridaHousePass ? '✅ PASS' : '❌ FAIL'} |

*\*PDF shows $${PDF_REFERENCE.floridaHouseGrandTotal.toFixed(2)}, but this includes Xfinity duplicate ($73.00). Adjusted amount is $${PDF_REFERENCE.floridaHouseAdjusted.toFixed(2)} after deduplication.*

### Expense Tracker Breakdown
- **Expenses:** $${expenseTotal.toFixed(2)} (${expensesOnly.length} transactions)
- **Reimbursements:** $${reimbursementTotal.toFixed(2)} (${reimbursementTxns.length} transactions)
- **NET:** $${expenseTrackerNet.toFixed(2)}

---

## 2. Transaction Count Verification

| Section | Parsed | Expected | Status |
|---------|--------|----------|--------|
| Total Transactions | ${parsedData.length} | ~174 | ${parsedData.length === 174 ? '✅' : 'ℹ️'} |
| Expense Tracker | ${expenseTrackerTxns.length} | N/A | ℹ️ |
| Gross Income | ${grossIncomeTxns.length} | 4 | ${grossIncomeTxns.length === 4 ? '✅' : '❌'} |
| Savings | ${savingsTxns.length} | 1 | ${savingsTxns.length === 1 ? '✅' : '❌'} |
| Florida House | ${floridaHouseTxns.length} | 2 | ${floridaHouseTxns.length === 2 ? '✅' : '❌'} |
| Reimbursements | ${reimbursementTxns.length} | 16 | ${reimbursementTxns.length === 16 ? '✅' : '❌'} |

---

## 3. First 5 Transactions Verification

${FIRST_5_PDF.map((t, i) => {
  const parsed = parsedData.find(p =>
    p.date === t.date && p.merchant === t.merchant && Math.abs(p.amount - t.amount) < 0.01
  );
  return `${i + 1}. **${t.date}** - ${t.description} (${t.merchant}) - $${t.amount} ${parsed ? '✅' : '❌'}`;
}).join('\n')}

---

## 4. Last 5 Transactions Verification

${LAST_5_PDF.map((t, i) => {
  const parsed = parsedData.find(p =>
    p.date === t.date && p.merchant === t.merchant && Math.abs(p.amount - t.amount) < 0.01
  );
  return `${i + 1}. **${t.date}** - ${t.description} (${t.merchant}) - $${t.amount} ${parsed ? '✅' : '❌'}`;
}).join('\n')}

---

## 5. Reimbursement Verification

**Total Reimbursements:** ${reimbursementTxns.length} (Expected: 16) ${reimbursementTxns.length === 16 ? '✅' : '❌'}

**All marked as income:** ${allIncomeType ? '✅' : '❌'}
**All positive amounts:** ${allPositiveAmounts ? '✅' : '❌'}

### Breakdown by Source
- **Nidnoi:** ${reimbursementTxns.filter(t => t.merchant === 'Nidnoi').length} reimbursements
- **Leigh:** ${reimbursementTxns.filter(t => t.merchant === 'Leigh').length} reimbursements

### Sample Verification (First 5)
${PDF_REIMBURSEMENTS.slice(0, 5).map(r => {
  const parsed = reimbursementTxns.find(t =>
    t.date === r.date && t.merchant === r.merchant && Math.abs(t.amount - r.amount) < 0.01
  );
  return `- **${r.date}** - ${r.description} - $${r.amount} ${parsed ? '✅' : '❌'}`;
}).join('\n')}

---

## 6. Florida House Verification

**Total Florida House Transactions:** ${floridaHouseTxns.length} (Expected: 2) ${floridaHouseTxns.length === 2 ? '✅' : '❌'}

### Transactions
${PDF_FLORIDA_HOUSE.map(fl => {
  const parsed = floridaHouseTxns.find(t =>
    t.date === fl.date && t.merchant === fl.merchant && Math.abs(t.amount - fl.amount) < 0.01
  );
  return `- **${fl.date}** - ${fl.description} (${fl.merchant}) - $${fl.amount} ${parsed ? '✅' : '❌'}`;
}).join('\n')}

### Duplicate Handling (Xfinity)
- In Expense Tracker: ${xfinityInExpenseTracker ? '✅ Found (kept)' : '❌ Not found'}
- In Florida House: ${xfinityInFloridaHouse ? '❌ Found (should be removed)' : '✅ Not found (correctly removed)'}
- **Status:** ${xfinityPass ? '✅ PASS' : '❌ FAIL'}

---

## 7. Zero-Amount Exclusion Verification

| Transaction | Date | Merchant | Status |
|-------------|------|----------|--------|
| Groceries (had 16.62) | 2025-05-07 | Tops | ${may7Groceries ? '✅ Included (correct)' : '❌ Missing'} |
| Flight for Leigh ($0.00) | 2025-05-19 | AirAsia | ${!leighFlight ? '✅ Excluded (correct)' : '❌ Incorrectly included'} |
| Doorcam (no amount) | 2025-05-06 | RING | ${!doorcam ? '✅ Excluded (correct)' : '❌ Incorrectly included'} |
| Electricity Bill (no amount) | 2025-05-14 | FPL | ${!fplElectricity ? '✅ Excluded (correct)' : '❌ Incorrectly included'} |

**Overall:** ${zeroAmountPass ? '✅ PASS' : '❌ FAIL'}

---

## 8. Currency Distribution Verification

**Total Transactions:** ${parsedData.length}
- **USD Only:** ${usdOnlyTransactions.length}
- **THB Converted:** ${thbTransactions.length}

### THB Transaction Validation
- All have \`original_amount\`: ${allThbHaveOriginal ? '✅' : '❌'}
- All have \`original_currency="THB"\`: ${allThbHaveOriginal ? '✅' : '❌'}

### Sample THB Conversions
${SAMPLE_THB.map(sample => {
  const parsed = thbTransactions.find(t =>
    t.date === sample.date && t.merchant === sample.merchant && t.original_amount === sample.originalAmount
  );
  const match = parsed && Math.abs(parsed.amount - sample.usdAmount) < 0.01;
  return `- **${sample.date}** - ${sample.merchant}: THB ${sample.originalAmount} → $${sample.usdAmount} ${match ? '✅' : '❌'}`;
}).join('\n')}

---

## 9. Overall Summary

${Object.entries(allChecks).map(([check, passed]) => `- ${passed ? '✅' : '❌'} ${check}`).join('\n')}

---

## Final Verdict

**Status:** ${allPassed ? '✅ PASS - All Verifications Successful' : '⚠️ REVIEW REQUIRED - Some Checks Failed'}

${allPassed ?
`The parsed data accurately reflects the source PDF. All grand totals match within acceptable variance (<1.5%), all transaction counts are correct, and all data quality checks pass. The data is ready for database import.` :
`Some verification checks failed. Please review the detailed findings above and address any discrepancies before proceeding with database import.`}

---

**Report Generated:** ${new Date().toISOString()}
**Next Step:** ${allPassed ? 'Proceed with database import using \`node scripts/db/import-month.js may-2025\`' : 'Review and fix issues before importing'}
`;

fs.writeFileSync(reportPath, report);
console.log(`Detailed report written to: ${reportPath}`);
console.log();

process.exit(allPassed ? 0 : 1);
