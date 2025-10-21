#!/usr/bin/env node

/**
 * Verification script - Cross-reference parsed CSV data against PDF references
 * Compares transaction counts by month
 */

const Papa = require('papaparse');
const fs = require('fs');

// Import the parsing logic from test-parse-v2.js
const CURRENCY_CODES = ['USD', 'THB', 'MYR', 'SGD', 'VND', 'EUR', 'GBP', 'JPY', 'KRW', 'CNY', 'PHP', 'IDR'];

function parseTransactionDate(dateString) {
  const datePart = dateString.split(', ').slice(1).join(', ');
  const date = new Date(datePart);
  return date.toISOString().split('T')[0];
}

function correctAnomalousDate(dateStr, description, merchant) {
  if (dateStr === '2004-07-31' && description.includes('Freelance Income') && merchant === 'NJDA') {
    return '2025-08-01';
  }
  if (dateStr === '2001-09-30' && description.includes('Hotel Refund')) {
    return '2021-09-30';
  }
  if (dateStr === '2001-10-31' && description.includes('Website plan refund') && merchant === 'Squarespace') {
    return '2017-10-31';
  }
  return dateStr;
}

function isDateRow(value) {
  return value && typeof value === 'string' &&
    value.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
}

function detectCurrencyColumnsFromHeaders(headers) {
  const currencyColumns = [];
  headers.forEach((header, index) => {
    if (!header) return;
    const headerUpper = header.toUpperCase();
    if (headerUpper.includes('CONVERSION') || headerUpper.includes('SUBTOTAL') ||
        headerUpper === 'DESC' || headerUpper === 'MERCHANT' ||
        headerUpper === 'REIMBURSABLE' || headerUpper === 'BUSINESS EXPENSE' ||
        headerUpper === 'MY BUSINESS EXPENSE' || headerUpper === 'PAYMENT TYPE' ||
        headerUpper === 'ACTUAL SPENT' || headerUpper === 'SOURCE' ||
        headerUpper === 'AMOUNT' || headerUpper === 'REIMBURSEMENT') {
      return;
    }
    for (const code of CURRENCY_CODES) {
      if (headerUpper === code || headerUpper.includes(code)) {
        currencyColumns.push({ index, code });
        break;
      }
    }
  });
  return currencyColumns;
}

function detectCurrencyColumnsFromRow(row) {
  const currencyColumns = [];
  row.forEach((value, index) => {
    if (!value) return;
    const valueUpper = String(value).toUpperCase();
    for (const code of CURRENCY_CODES) {
      if (valueUpper === code || valueUpper.includes(code)) {
        currencyColumns.push({ index, code });
        break;
      }
    }
  });
  return currencyColumns;
}

function extractAmountAndCurrency(row, currencyColumns) {
  for (const { index, code } of currencyColumns) {
    const value = row[index];
    if (value !== null && value !== undefined && value !== '') {
      const amountString = String(value).replace(/[^\d.-]/g, '');
      const amount = parseFloat(amountString);
      if (!isNaN(amount) && amount !== 0) {
        return {
          amount: Math.abs(amount),
          currency: code,
          isNegative: amount < 0
        };
      }
    }
  }
  return null;
}

function parseCSV(csvContent) {
  const result = Papa.parse(csvContent, {
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false
  });

  const rows = result.data;
  const transactions = [];

  let inExpenseSection = false;
  let inIncomeSection = false;
  let inFloridaSection = false;
  let currentHeaders = null;
  let currentHeaderIndices = {};
  let currentCurrencyColumns = null;
  let currentDate = null;
  let needsCurrencyRow = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const firstCol = row[0] || '';

    if (firstCol.includes('Expense Tracker')) {
      inExpenseSection = true;
      inIncomeSection = false;
      inFloridaSection = false;
      currentHeaders = null;
      currentCurrencyColumns = null;
      continue;
    }

    if (firstCol.includes('Income Tracker') || firstCol.includes('Gross Income Tracker')) {
      inIncomeSection = true;
      inExpenseSection = false;
      inFloridaSection = false;
      currentHeaders = null;
      currentDate = null;
      continue;
    }

    if (firstCol.includes('Florida House Expenses')) {
      inFloridaSection = true;
      inExpenseSection = false;
      inIncomeSection = false;
      currentHeaders = null;
      currentCurrencyColumns = null;
      currentDate = null;
      continue;
    }

    if ((inExpenseSection || inFloridaSection) && firstCol.includes('GRAND TOTAL')) {
      inExpenseSection = false;
      inFloridaSection = false;
      continue;
    }

    if (inIncomeSection && (firstCol.includes('GROSS INCOME TOTAL') || firstCol.includes('ACTUAL GRAND TOTAL'))) {
      inIncomeSection = false;
      continue;
    }

    if (inIncomeSection) {
      if (firstCol === 'Date Receieved' || firstCol === 'Date Received') {
        currentHeaders = row;
        currentHeaderIndices = {};
        row.forEach((header, index) => {
          if (header) currentHeaderIndices[header] = index;
        });
        continue;
      }

      if (currentHeaders && isDateRow(firstCol)) {
        const description = row[currentHeaderIndices['Description']];
        const source = row[currentHeaderIndices['Source']];
        const amountStr = row[currentHeaderIndices['Amount']] || row[currentHeaderIndices['Reimbursable']];

        if (description && amountStr && !description.includes('Estimated') && !description.includes('Subtotal')) {
          const amount = parseFloat(String(amountStr).replace(/[^\d.-]/g, ''));

          if (!isNaN(amount) && amount > 0) {
            const parsedDate = parseTransactionDate(firstCol);
            const correctedDate = correctAnomalousDate(parsedDate, description, source);

            transactions.push({
              date: correctedDate,
              description: description.trim(),
              merchant: source || null,
              paymentType: null,
              amount: amount,
              currency: 'USD',
              type: 'income',
              isReimbursable: false,
              isBusinessExpense: false,
              isFloridaExpense: false
            });
          }
        }
      }
      continue;
    }

    if (inFloridaSection) {
      if (row[1] === 'Desc' && row[2] === 'Merchant') {
        currentHeaders = row;
        currentHeaderIndices = {};
        row.forEach((header, index) => {
          if (header) currentHeaderIndices[header] = index;
        });
        continue;
      }

      if (isDateRow(firstCol)) {
        currentDate = firstCol;
        continue;
      }

      if (currentHeaders && currentDate) {
        const description = row[currentHeaderIndices['Desc']];
        if (!description) continue;

        const amountStr = row[currentHeaderIndices['Subtotal']] || row[currentHeaderIndices['Payment Type']];

        if (!amountStr || amountStr === 'Subtotal' || amountStr === 'Payment Type') {
          continue;
        }

        const amount = parseFloat(String(amountStr).replace(/[^\d.-]/g, ''));

        if (!isNaN(amount) && amount > 0) {
          const paymentType = row[currentHeaderIndices['Subtotal']] ?
            row[currentHeaderIndices['Payment Type']] :
            row[currentHeaderIndices['Business Expense']];

          const merchant = row[currentHeaderIndices['Merchant']] || null;
          const reimbursable = row[currentHeaderIndices['Reimbursable']] === 'Pending' ||
                              row[currentHeaderIndices['Reimbursable']] === 'X' ||
                              row[currentHeaderIndices['Reimbursement']] === 'Pending';

          const parsedDate = parseTransactionDate(currentDate);
          const correctedDate = correctAnomalousDate(parsedDate, description, merchant);

          transactions.push({
            date: correctedDate,
            description: description.trim(),
            merchant: merchant,
            paymentType: paymentType || null,
            amount: amount,
            currency: 'USD',
            type: 'expense',
            isReimbursable: reimbursable,
            isBusinessExpense: false,
            isFloridaExpense: true
          });
        }
      }
      continue;
    }

    if (!inExpenseSection) {
      continue;
    }

    if (row[1] === 'Desc' && row[2] === 'Merchant') {
      currentHeaders = row;
      currentHeaderIndices = {};

      row.forEach((header, index) => {
        if (header) {
          currentHeaderIndices[header] = index;
        }
      });

      currentCurrencyColumns = detectCurrencyColumnsFromHeaders(row);

      if (currentCurrencyColumns.length === 0) {
        needsCurrencyRow = true;
      }
      continue;
    }

    if (needsCurrencyRow && !firstCol) {
      const detectedCurrencies = detectCurrencyColumnsFromRow(row);
      if (detectedCurrencies.length > 0) {
        currentCurrencyColumns = detectedCurrencies;
        needsCurrencyRow = false;
        continue;
      }
    }

    if (isDateRow(firstCol)) {
      currentDate = firstCol;
      continue;
    }

    if (!row[1] || row[1].includes('Daily Total') || row[1] === 'Desc') {
      continue;
    }

    if (currentDate && currentHeaders && currentCurrencyColumns && currentCurrencyColumns.length > 0) {
      const description = row[currentHeaderIndices['Desc']];

      if (!description) continue;

      const amountResult = extractAmountAndCurrency(row, currentCurrencyColumns);

      if (!amountResult || amountResult.amount === 0) {
        continue;
      }

      const merchant = row[currentHeaderIndices['Merchant']] || null;
      const paymentType = row[currentHeaderIndices['Payment Type']] || null;
      const reimbursable = row[currentHeaderIndices['Reimbursable']] === 'X' || row[currentHeaderIndices['Reimbursable']] === 'x';
      const businessExpense = !!(row[currentHeaderIndices['Business Expense']] || row[currentHeaderIndices['My Business Expense']] || row[currentHeaderIndices['Business Expense?']]);

      let transactionType = 'expense';
      if (amountResult.isNegative ||
          description.toLowerCase().includes('refund') ||
          description.toLowerCase().includes('reimbursement')) {
        transactionType = 'income';
      }

      const parsedDate = parseTransactionDate(currentDate);
      const correctedDate = correctAnomalousDate(parsedDate, description, merchant);

      transactions.push({
        date: correctedDate,
        description: description.trim(),
        merchant: merchant,
        paymentType: paymentType,
        amount: amountResult.amount,
        currency: amountResult.currency,
        type: transactionType,
        isReimbursable: reimbursable,
        isBusinessExpense: businessExpense
      });
    }
  }

  return transactions;
}

// Main verification
const csvFilePath = 'csv_imports/fullImport_20251017.csv';
const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
const transactions = parseCSV(csvContent);

// Group by month
const monthlyBreakdown = {};
transactions.forEach(t => {
  const month = t.date.substring(0, 7); // YYYY-MM
  if (!monthlyBreakdown[month]) {
    monthlyBreakdown[month] = {
      expense: 0,
      income: 0,
      florida: 0,
      total: 0
    };
  }
  monthlyBreakdown[month].total++;
  if (t.type === 'expense') monthlyBreakdown[month].expense++;
  if (t.type === 'income') monthlyBreakdown[month].income++;
  if (t.isFloridaExpense) monthlyBreakdown[month].florida++;
});

// Sort months
const sortedMonths = Object.keys(monthlyBreakdown).sort().reverse();

console.log('📊 Monthly Transaction Breakdown\n');
console.log('Month      | Expenses | Income | Florida | Total');
console.log('-----------|----------|--------|---------|-------');

sortedMonths.forEach(month => {
  const stats = monthlyBreakdown[month];
  console.log(`${month} |     ${String(stats.expense).padStart(4)} |   ${String(stats.income).padStart(4)} |    ${String(stats.florida).padStart(4)} |  ${String(stats.total).padStart(4)}`);
});

console.log('\n📋 Summary:');
console.log(`Total months with data: ${sortedMonths.length}`);
console.log(`Expected PDFs: 102`);
console.log(`Match: ${sortedMonths.length === 102 ? '✅' : '❌'}`);

console.log('\n\n✅ Verification script complete!');
console.log('\nNext step: Manually review PDFs for months with unusual counts.');
