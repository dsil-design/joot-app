const data = require('./march-2025-CORRECTED.json');

console.log('Sample Transactions from Each Section:');
console.log('');

console.log('1. EXPENSE TRACKER - First 3 transactions:');
data.filter(t => !t.tags.includes('Florida House')).slice(0, 3).forEach((t, i) => {
  console.log(`   ${i+1}. ${t.date} | ${t.description} | ${t.amount} ${t.currency} | Tags: [${t.tags.join(', ')}]`);
});

console.log('');
console.log('2. GROSS INCOME - All 7 transactions:');
const income = data.filter(t => t.transaction_type === 'income' && !t.tags.includes('Reimbursement'));
income.forEach((t, i) => {
  console.log(`   ${i+1}. ${t.date} | ${t.description} | ${t.amount} ${t.currency} | ${t.merchant}`);
});

console.log('');
console.log('3. REIMBURSEMENTS - First 5:');
data.filter(t => t.tags.includes('Reimbursement')).slice(0, 5).forEach((t, i) => {
  console.log(`   ${i+1}. ${t.date} | ${t.description} | ${t.amount} ${t.currency}`);
});

console.log('');
console.log('4. FLORIDA HOUSE - All 4 transactions (3 section + 1 tagged):');
data.filter(t => t.tags.includes('Florida House')).forEach((t, i) => {
  console.log(`   ${i+1}. ${t.date} | ${t.description} | ${t.merchant} | ${t.amount} ${t.currency}`);
});

console.log('');
console.log('5. BUSINESS EXPENSES - All 2:');
data.filter(t => t.tags.includes('Business Expense')).forEach((t, i) => {
  console.log(`   ${i+1}. ${t.date} | ${t.description} | ${t.amount} ${t.currency}`);
});
