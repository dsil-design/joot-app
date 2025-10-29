const fs = require('fs');

const csvContent = fs.readFileSync('/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv', 'utf-8');
const lines = csvContent.split('\n');

function countMonthTransactions(startLine, endLine, monthName) {
  let expenseCount = 0;
  let incomeCount = 0;
  let inExpenseSection = false;
  let inIncomeSection = false;

  for (let i = startLine; i < endLine; i++) {
    const line = lines[i];

    if (line.includes('Expense Tracker')) {
      inExpenseSection = true;
      inIncomeSection = false;
      continue;
    }
    if (line.includes('Gross Income Tracker')) {
      inExpenseSection = false;
      inIncomeSection = true;
      continue;
    }
    if (line.includes('Personal Savings') || line.includes('Deficit/Surplus')) {
      inExpenseSection = false;
      inIncomeSection = false;
      continue;
    }

    const columns = line.split(',');

    // Skip headers, totals, empty lines, date headers
    if (line.includes('Desc,Merchant') ||
        line.includes('Daily Total') ||
        line.includes('GRAND TOTAL') ||
        line.includes('Date Receieved') ||
        line.includes('Date Made') ||
        line.includes('Estimated') ||
        line.includes('GROSS INCOME') ||
        line.trim() === '' ||
        columns.length < 3 ||
        columns[1]?.trim() === '') {
      continue;
    }

    // Check if it's a date header (e.g., "Monday, February 1, 2024")
    if (columns[0] && columns[0].includes('2024') || columns[0].includes('2023')) {
      continue;
    }

    if (inExpenseSection && columns[1] && columns[1].trim() !== '') {
      expenseCount++;
    }

    if (inIncomeSection && columns[1] && columns[1].trim() !== '' && !columns[1].includes('Subtotal')) {
      incomeCount++;
    }
  }

  return { month: monthName, expenses: expenseCount, income: incomeCount, total: expenseCount + incomeCount };
}

const february = countMonthTransactions(5784, 6094, 'February 2024');
const january = countMonthTransactions(6094, 6355, 'January 2024');
const december = countMonthTransactions(6355, 6535, 'December 2023');

console.log('\n=== Transaction Counts ===\n');
console.log(`February 2024: ${february.expenses} expenses + ${february.income} income = ${february.total} total`);
console.log(`January 2024:  ${january.expenses} expenses + ${january.income} income = ${january.total} total`);
console.log(`December 2023: ${december.expenses} expenses + ${december.income} income = ${december.total} total`);
console.log(`\nBatch Total:   ${february.total + january.total + december.total} transactions\n`);
