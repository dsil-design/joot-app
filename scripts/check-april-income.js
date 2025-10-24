const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scripts/april-2025-CORRECTED.json', 'utf8'));

const income = data.filter(t => t.transaction_type === 'income');
const reimbursements = income.filter(t => t.tags && t.tags.includes('Reimbursement'));
const nonReimbursements = income.filter(t => !t.tags || !t.tags.includes('Reimbursement'));

console.log('\nNON-REIMBURSEMENT INCOME (from corrected JSON):');
console.log('Count:', nonReimbursements.length);
let total = 0;
nonReimbursements.forEach(t => {
  console.log(`  ${t.date} - ${t.description}: ${t.currency} ${t.amount} (tags: ${t.tags ? t.tags.join(', ') : 'none'})`);
  total += t.amount;
});
console.log('Total (USD):', total.toFixed(2));

console.log('\nREIMBURSEMENTS (from corrected JSON):');
console.log('Count:', reimbursements.length);
