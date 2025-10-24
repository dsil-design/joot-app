const fs = require('fs');
const data = JSON.parse(fs.readFileSync(__dirname + '/july-2025-CORRECTED.json', 'utf-8'));

console.log('Transaction count:', data.length);
console.log('');

// Check types
const expenses = data.filter(t => t.type === 'expense');
const income = data.filter(t => t.type === 'income');
console.log('Expenses:', expenses.length);
console.log('Income:', income.length);

// Calculate totals
const expenseTotal = expenses.reduce((sum, t) => sum + t.amount, 0);
const incomeTotal = income.reduce((sum, t) => sum + t.amount, 0);
console.log('');
console.log('Expense total:', expenseTotal.toFixed(2));
console.log('Income total:', incomeTotal.toFixed(2));
console.log('Net (Expense - Income):', (expenseTotal - incomeTotal).toFixed(2));

// Check reimbursements
const reimbursements = data.filter(t => t.tags.includes('Reimbursement'));
console.log('');
console.log('Reimbursements:', reimbursements.length);
console.log('Reimbursement total:', reimbursements.reduce((sum, t) => sum + t.amount, 0).toFixed(2));

// Florida House
const floridaHouse = data.filter(t => t.tags.includes('Florida House'));
console.log('');
console.log('Florida House:', floridaHouse.length);
console.log('Florida House total:', floridaHouse.reduce((sum, t) => sum + t.amount, 0).toFixed(2));

// Expense Tracker only
const expenseTracker = data.filter(t => !t.tags.includes('Florida House') && !t.tags.includes('Savings/Investment') && t.date >= '2025-07-01' && t.date <= '2025-07-31' && (t.type === 'expense' || t.tags.includes('Reimbursement')));
console.log('');
console.log('Expense Tracker transactions:', expenseTracker.length);
const etExpenses = expenseTracker.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
const etIncome = expenseTracker.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
console.log('Expense Tracker expenses:', etExpenses.toFixed(2));
console.log('Expense Tracker income/reimbursements:', etIncome.toFixed(2));
console.log('Expense Tracker NET:', (etExpenses - etIncome).toFixed(2));
