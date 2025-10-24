const fs = require('fs');
const data = JSON.parse(fs.readFileSync(__dirname + '/july-2025-CORRECTED.json', 'utf-8'));

// Section 1: Expense Tracker (no special tags except Reimbursement and Business Expense)
const expenseTracker = data.filter(t =>
  !t.tags.includes('Florida House') &&
  !t.tags.includes('Savings/Investment') &&
  (t.tags.includes('Reimbursement') || t.tags.includes('Business Expense') || t.tags.length === 0)
);

// Section 2: Gross Income (no tags, income type, not reimbursements)
const grossIncome = data.filter(t =>
  t.type === 'income' &&
  t.tags.length === 0 &&
  !t.description.toLowerCase().startsWith('reimbursement')
);

// Section 3: Savings
const savings = data.filter(t => t.tags.includes('Savings/Investment'));

// Section 4: Florida House
const floridaHouse = data.filter(t => t.tags.includes('Florida House'));

console.log('Expense Tracker:', expenseTracker.length);
console.log('  - Expenses:', expenseTracker.filter(t => t.type === 'expense').length);
console.log('  - Income (reimbursements):', expenseTracker.filter(t => t.type === 'income').length);

console.log('Gross Income:', grossIncome.length);
console.log('Savings:', savings.length);
console.log('Florida House:', floridaHouse.length);
console.log('Total:', expenseTracker.length + grossIncome.length + savings.length + floridaHouse.length);
console.log('');

// Calculate financial totals for Expense Tracker only
const etExpenses = expenseTracker.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
const etIncome = expenseTracker.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
console.log('Expense Tracker Expenses:', etExpenses.toFixed(2));
console.log('Expense Tracker Income:', etIncome.toFixed(2));
console.log('Expense Tracker NET:', (etExpenses - etIncome).toFixed(2));
console.log('CSV Expected:', '6,972.97');
console.log('Variance:', Math.abs(etExpenses - etIncome - 6972.97).toFixed(2));
