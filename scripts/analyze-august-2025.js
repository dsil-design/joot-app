const fs = require('fs');

const csvPath = '/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv';
const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split('\n');

// Find section boundaries
const expenseStart = lines.findIndex(l => l.startsWith('August 2025: Expense Tracker'));
const incomeStart = lines.findIndex(l => l.startsWith('August 2025: Gross Income Tracker'));
const savingsStart = lines.findIndex(l => l.startsWith('August 2025: Personal Savings & Investments'));
const floridaStart = lines.findIndex(l => l.startsWith('August 2025: Florida House Expenses'));
const nextMonthStart = lines.findIndex(l => l.startsWith('July 2025:'));

console.log('\n=== AUGUST 2025 PRE-FLIGHT ANALYSIS ===\n');

// 1. CSV STRUCTURE CHECK
console.log('1. CSV STRUCTURE CHECK');
console.log('   Expense Tracker: Line', expenseStart + 1);
console.log('   Header:', lines[expenseStart + 1]);
console.log('   Gross Income: Line', incomeStart + 1);
console.log('   Header:', lines[incomeStart + 1]);
console.log('   Savings & Investments: Line', savingsStart + 1);
console.log('   Header:', lines[savingsStart + 1]);
console.log('   Florida House: Line', floridaStart + 1);
console.log('   Header:', lines[floridaStart + 1]);

// 2. TRANSACTION COUNT
console.log('\n2. TRANSACTION COUNT');

let expenseTransactions = [];
let incomeTransactions = [];
let savingsTransactions = [];
let floridaTransactions = [];

// Parse Expense Tracker
for (let i = expenseStart + 2; i < incomeStart; i++) {
  const line = lines[i].trim();
  if (!line || line.startsWith('Daily Total') || line.startsWith('GRAND TOTAL')) continue;

  const parts = line.split(',');
  if (parts.length >= 7 && parts[1] && !parts[0].match(/day,/i)) {
    expenseTransactions.push({ line: i + 1, content: line });
  }
}

// Parse Gross Income
for (let i = incomeStart + 2; i < savingsStart; i++) {
  const line = lines[i].trim();
  if (!line || line.includes('GROSS INCOME TOTAL') || line.includes('Estimated')) continue;

  const parts = line.split(',');
  if (parts.length >= 3 && parts[1] && parts[3]) {
    incomeTransactions.push({ line: i + 1, content: line });
  }
}

// Parse Savings
for (let i = savingsStart + 2; i < floridaStart; i++) {
  const line = lines[i].trim();
  if (!line || line.startsWith('TOTAL')) continue;

  const parts = line.split(',');
  if (parts.length >= 4 && parts[1]) {
    savingsTransactions.push({ line: i + 1, content: line });
  }
}

// Parse Florida House
for (let i = floridaStart + 2; i < nextMonthStart; i++) {
  const line = lines[i].trim();
  if (!line || line.startsWith('GRAND TOTAL')) continue;

  const parts = line.split(',');
  if (parts.length >= 5 && parts[1] && parts[5]) {
    floridaTransactions.push({ line: i + 1, content: line });
  }
}

console.log('   Expense Tracker:', expenseTransactions.length, 'transactions');
console.log('   Gross Income:', incomeTransactions.length, 'transactions');
console.log('   Savings & Investments:', savingsTransactions.length, 'transactions');
console.log('   Florida House:', floridaTransactions.length, 'transactions');
console.log('   TOTAL EXPECTED:',
  expenseTransactions.length + incomeTransactions.length +
  savingsTransactions.length + floridaTransactions.length);

// 3. CSV GRAND TOTALS
console.log('\n3. CSV GRAND TOTALS');

const expenseGrandTotal = lines.find((l, i) =>
  i >= expenseStart && i < incomeStart && l.includes('GRAND TOTAL'));
const floridaGrandTotal = lines.find((l, i) =>
  i >= floridaStart && i < nextMonthStart && l.includes('GRAND TOTAL'));
const savingsTotal = lines.find((l, i) =>
  i >= savingsStart && i < floridaStart && l.includes('TOTAL'));

console.log('   Expense Tracker GRAND TOTAL:', expenseGrandTotal?.trim());
console.log('   Florida House GRAND TOTAL:', floridaGrandTotal?.trim());
console.log('   Savings & Investments TOTAL:', savingsTotal?.trim());

// Extract numeric values
const extractAmount = (str) => {
  if (!str) return 0;
  const match = str.match(/\$?\s*([\d,]+\.\d{2})/);
  return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
};

const expenseTotal = extractAmount(expenseGrandTotal);
const floridaTotal = extractAmount(floridaGrandTotal);
const savingsAmount = extractAmount(savingsTotal);

console.log('\n   Numeric Totals:');
console.log('   Expense Tracker: $', expenseTotal.toFixed(2));
console.log('   Florida House: $', floridaTotal.toFixed(2));
console.log('   Savings: $', savingsAmount.toFixed(2));
console.log('   TRUE EXPECTED TOTAL: $', (expenseTotal + floridaTotal + savingsAmount).toFixed(2));

// 4. DUPLICATE DETECTION
console.log('\n4. DUPLICATE DETECTION');

const expenseMerchants = expenseTransactions.map(t => {
  const parts = t.content.split(',');
  return {
    merchant: parts[2]?.trim().toLowerCase(),
    amount: extractAmount(parts[6] || parts[7] || parts[8]),
    line: t.line
  };
}).filter(m => m.merchant && m.amount);

const floridaMerchants = floridaTransactions.map(t => {
  const parts = t.content.split(',');
  return {
    merchant: parts[2]?.trim().toLowerCase(),
    amount: extractAmount(parts[5]),
    line: t.line
  };
}).filter(m => m.merchant && m.amount);

const duplicates = [];
floridaMerchants.forEach(fm => {
  const match = expenseMerchants.find(em =>
    em.merchant === fm.merchant && Math.abs(em.amount - fm.amount) < 0.01
  );
  if (match) {
    duplicates.push({
      merchant: fm.merchant,
      amount: fm.amount,
      expenseLine: match.line,
      floridaLine: fm.line
    });
  }
});

if (duplicates.length > 0) {
  console.log('   ⚠️  POTENTIAL DUPLICATES FOUND:', duplicates.length);
  duplicates.forEach(d => {
    console.log('   -', d.merchant, '$' + d.amount.toFixed(2));
    console.log('     Expense line:', d.expenseLine, '| Florida line:', d.floridaLine);
  });
} else {
  console.log('   ✅ No exact merchant/amount duplicates found');
}

// 5. CURRENCY DISTRIBUTION
console.log('\n5. CURRENCY DISTRIBUTION');

let usdCount = 0;
let thbCount = 0;
let otherCurrencies = new Set();

expenseTransactions.forEach(t => {
  if (t.content.includes('THB')) thbCount++;
  else if (t.content.includes('$')) usdCount++;
  else {
    // Check for other currencies
    const currencyMatch = t.content.match(/[A-Z]{3}\s+[\d,]+/);
    if (currencyMatch) otherCurrencies.add(currencyMatch[0].split(' ')[0]);
  }
});

console.log('   USD transactions:', usdCount);
console.log('   THB transactions:', thbCount);
if (otherCurrencies.size > 0) {
  console.log('   ⚠️  OTHER CURRENCIES:', Array.from(otherCurrencies).join(', '));
} else {
  console.log('   Other currencies: None');
}

// 6. TAG CONDITIONS
console.log('\n6. TAG CONDITIONS');

let reimbursementCount = 0;
let businessExpenseCount = 0;
let reimbursableCount = 0;

expenseTransactions.forEach(t => {
  if (t.content.includes('Reimbursement:')) reimbursementCount++;

  const parts = t.content.split(',');
  // Column 4 is Business Expense (index 4)
  if (parts[4]?.trim() === 'X') businessExpenseCount++;
  // Column 3 is Reimbursable (index 3)
  if (parts[3]?.trim() === 'X') reimbursableCount++;
});

console.log('   "Reimbursement:" descriptions:', reimbursementCount, '(should be income, type_income)');
console.log('   "X" in Column 4 (Business Expense):', businessExpenseCount, '(gets "Business Expense" tag)');
console.log('   "X" in Column 3 (Reimbursable):', reimbursableCount, '(NO TAG, just tracking)');
console.log('   Florida House transactions:', floridaTransactions.length, '(gets "Florida House" tag)');
console.log('   Savings transactions:', savingsTransactions.length, '(gets "Savings/Investment" tag)');

// 7. RED FLAGS / ANOMALIES
console.log('\n7. RED FLAGS & ANOMALIES');

const issues = [];

// Check for structural differences
const expenseHeader = lines[expenseStart + 1];
const expectedExpenseHeader = ',Desc,Merchant,Reimbursable,Business Expense,Payment Type,Actual Spent,,Conversion (THB to USD),Subtotal';
if (expenseHeader !== expectedExpenseHeader) {
  issues.push('⚠️  Expense Tracker header structure differs from September');
  console.log('   Expected:', expectedExpenseHeader);
  console.log('   Found:', expenseHeader);
}

// Check for unusual patterns
const emptyAmounts = expenseTransactions.filter(t => {
  const parts = t.content.split(',');
  const subtotal = parts[parts.length - 1];
  return !subtotal || subtotal.trim() === '$0.00';
});

if (emptyAmounts.length > 0) {
  issues.push(`⚠️  Found ${emptyAmounts.length} transactions with $0.00 or empty amounts`);
}

// Check for date format
const firstTransaction = expenseTransactions[0];
if (firstTransaction) {
  const dateMatch = firstTransaction.content.match(/"([^"]+)"/);
  if (dateMatch) {
    console.log('   Date format example:', dateMatch[1]);
  }
}

// Check for missing Florida House amounts
const floridaEmpty = floridaTransactions.filter(t => {
  const parts = t.content.split(',');
  return !parts[5] || parts[5].trim() === '';
});

if (floridaEmpty.length > 0) {
  issues.push(`⚠️  Found ${floridaEmpty.length} Florida House transactions with missing amounts`);
  floridaEmpty.forEach(t => {
    console.log('   Line', t.line + ':', t.content);
  });
}

if (issues.length === 0) {
  console.log('   ✅ No major red flags detected');
} else {
  console.log('   Issues found:');
  issues.forEach(issue => console.log('   ', issue));
}

console.log('\n=== END PRE-FLIGHT ANALYSIS ===\n');
