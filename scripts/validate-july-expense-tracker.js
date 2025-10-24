const fs = require('fs');

// Read the parsed July JSON
const data = JSON.parse(fs.readFileSync('scripts/july-2025-CORRECTED.json', 'utf-8'));

// Exchange rate from PDF (35000 THB = 1078 USD)
const rate = 1078 / 35000;

// Filter to only Expense Tracker transactions
// Exclude: Florida House, Gross Income, Savings/Investment
const expenseTracker = data.filter(t => {
  // Exclude transactions with Florida House tag
  if (t.tags && t.tags.includes('Florida House')) return false;
  // Exclude Savings/Investment
  if (t.tags && t.tags.includes('Savings/Investment')) return false;
  // Exclude if description suggests it's from Gross Income section (but keep reimbursements)
  if (t.description && (
    t.description.includes('Paycheck') ||
    (t.description.includes('Freelance Income') && !t.description.includes('Reimbursement')) ||
    t.description.includes('Tax Return') ||
    t.description.includes('Local Tax Return')
  )) return false;

  return true;
});

console.log('July 2025 - Expense Tracker Validation');
console.log('='.repeat(70));
console.log('Total transactions in JSON:', data.length);
console.log('Expense Tracker transactions:', expenseTracker.length);
console.log('Excluded:', data.length - expenseTracker.length);
console.log('');

// Group by date
const byDate = {};
expenseTracker.forEach(t => {
  if (!byDate[t.date]) byDate[t.date] = [];
  byDate[t.date].push(t);
});

// Calculate daily totals
console.log('Daily Totals Comparison:');
console.log('='.repeat(70));

const dates = Object.keys(byDate).sort();
let grandTotal = 0;

dates.forEach(date => {
  const transactions = byDate[date];
  let dayTotal = 0;

  transactions.forEach(t => {
    if (t.currency === 'THB') {
      dayTotal += t.amount * rate;
    } else {
      dayTotal += t.amount;
    }
  });

  grandTotal += dayTotal;

  console.log(date, ':', transactions.length, 'transactions', '| $' + dayTotal.toFixed(2));
});

console.log('');
console.log('='.repeat(70));
console.log('GRAND TOTAL (calculated from Expense Tracker):');
console.log('  $' + grandTotal.toFixed(2), 'USD');
console.log('');
console.log('PDF GRAND TOTAL: $6,972.97');
console.log('Difference: $' + (grandTotal - 6972.97).toFixed(2));
console.log('');

if (Math.abs(grandTotal - 6972.97) < 1.0) {
  console.log('✅ MATCH - Difference is within $1.00 (rounding)');
} else {
  console.log('❌ MISMATCH - Difference exceeds $1.00');
  console.log('');
  console.log('Breakdown:');
  const usdExpenses = expenseTracker.filter(t => t.currency === 'USD').reduce((sum, t) => sum + t.amount, 0);
  const thbExpenses = expenseTracker.filter(t => t.currency === 'THB').reduce((sum, t) => sum + t.amount, 0);
  console.log('  USD transactions:', '$' + usdExpenses.toFixed(2));
  console.log('  THB transactions:', thbExpenses.toFixed(2), 'THB', '($' + (thbExpenses * rate).toFixed(2), 'USD)');
}
