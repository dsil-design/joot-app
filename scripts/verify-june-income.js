const data = require('./june-2025-CORRECTED.json');

const income = data.filter(t => t.transaction_type === 'income');
console.log('=== INCOME BREAKDOWN ===');
console.log('Total Income Transactions:', income.length);
console.log('\nBreakdown by Source:');

const reimbursements = income.filter(t => t.tags.includes('Reimbursement'));
const grossIncome = income.filter(t => !t.tags.includes('Reimbursement'));

console.log('- Reimbursements (from Expense Tracker):', reimbursements.length);
console.log('- Gross Income (from Gross Income section):', grossIncome.length);

console.log('\nReimbursement Currency Breakdown:');
const thbReimbursements = reimbursements.filter(t => t.currency === 'THB');
const usdReimbursements = reimbursements.filter(t => t.currency === 'USD');

console.log('- THB Reimbursements:', thbReimbursements.length);
console.log('- USD Reimbursements:', usdReimbursements.length);

console.log('\nOther Income (no Reimbursement tag):');
grossIncome.forEach((t, i) => {
  console.log(`${i + 1}. ${t.date} - ${t.description} - ${t.merchant} - ${t.currency} ${t.amount}`);
});
