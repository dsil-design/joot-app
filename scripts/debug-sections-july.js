const fs = require('fs');
const data = JSON.parse(fs.readFileSync(__dirname + '/july-2025-CORRECTED.json', 'utf-8'));

console.log('Total transactions:', data.length);
console.log('');

// Check for overlaps
const floridaHouse = data.filter(t => t.tags.includes('Florida House'));
const savings = data.filter(t => t.tags.includes('Savings/Investment'));
const reimbursements = data.filter(t => t.tags.includes('Reimbursement'));

console.log('Florida House:', floridaHouse.length);
console.log('Savings/Investment:', savings.length);
console.log('Reimbursement:', reimbursements.length);
console.log('');

// Income without reimbursement tag
const grossIncomeCandidate = data.filter(t =>
  t.type === 'income' &&
  !t.tags.includes('Reimbursement')
);

console.log('Income without Reimbursement tag:', grossIncomeCandidate.length);
grossIncomeCandidate.forEach(t => {
  console.log('  -', t.date + ':', t.description, '- $' + t.amount, '- tags: [' + t.tags.join(', ') + ']');
});
