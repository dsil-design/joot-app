#!/usr/bin/env node

/**
 * Improved CSV parser - handles multi-section structure
 */

const Papa = require('papaparse');
const fs = require('fs');

const CURRENCY_CODES = ['USD', 'THB', 'MYR', 'SGD', 'VND', 'EUR', 'GBP', 'JPY', 'KRW', 'CNY', 'PHP', 'IDR'];

function parseTransactionDate(dateString) {
  const datePart = dateString.split(', ').slice(1).join(', ');
  const date = new Date(datePart);
  return date.toISOString().split('T')[0];
}

function correctAnomalousDate(dateStr, description, merchant) {
  // Fix specific known date errors

  // 2004-07-31 NJDA income should be 2025-08-01
  if (dateStr === '2004-07-31' && description.includes('Freelance Income') && merchant === 'NJDA') {
    return '2025-08-01';
  }

  // 2001-09-30 Hotel refund should be 2021-09-30
  if (dateStr === '2001-09-30' && description.includes('Hotel Refund')) {
    return '2021-09-30';
  }

  // 2001-10-31 Squarespace refunds should be 2017-10-31
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

    // Skip conversion and metadata columns
    if (headerUpper.includes('CONVERSION') ||
        headerUpper.includes('SUBTOTAL') ||
        headerUpper === 'DESC' ||
        headerUpper === 'MERCHANT' ||
        headerUpper === 'REIMBURSABLE' ||
        headerUpper === 'BUSINESS EXPENSE' ||
        headerUpper === 'MY BUSINESS EXPENSE' ||
        headerUpper === 'PAYMENT TYPE' ||
        headerUpper === 'ACTUAL SPENT' ||
        headerUpper === 'SOURCE' ||
        headerUpper === 'AMOUNT' ||
        headerUpper === 'REIMBURSEMENT') {
      return;
    }

    // Check if it's a currency code
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
  // Parse without header mode to get raw rows
  const result = Papa.parse(csvContent, {
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false // Keep empty lines to maintain structure
  });

  const rows = result.data;
  const transactions = [];

  let inExpenseSection = false;
  let inIncomeSection = false;
  let inFloridaSection = false;
  let currentHeaders = null;
  let currentHeaderIndices = {}; // Map column names to indices
  let currentCurrencyColumns = null;
  let currentDate = null;
  let needsCurrencyRow = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const firstCol = row[0] || '';

    // Detect expense tracker section
    if (firstCol.includes('Expense Tracker')) {
      inExpenseSection = true;
      inIncomeSection = false;
      inFloridaSection = false;
      console.log(`\n📍 Found section: ${firstCol}`);
      currentHeaders = null;
      currentCurrencyColumns = null;
      continue;
    }

    // Detect income tracker section
    if (firstCol.includes('Income Tracker') || firstCol.includes('Gross Income Tracker')) {
      inIncomeSection = true;
      inExpenseSection = false;
      inFloridaSection = false;
      console.log(`\n💰 Found income section: ${firstCol}`);
      currentHeaders = null;
      currentDate = null;
      continue;
    }

    // Detect Florida House Expenses section
    if (firstCol.includes('Florida House Expenses')) {
      inFloridaSection = true;
      inExpenseSection = false;
      inIncomeSection = false;
      console.log(`\n🏠 Found Florida section: ${firstCol}`);
      currentHeaders = null;
      currentCurrencyColumns = null;
      currentDate = null;
      continue;
    }

    // Exit sections when we hit GRAND TOTAL or GROSS INCOME TOTAL
    if ((inExpenseSection || inFloridaSection) && firstCol.includes('GRAND TOTAL')) {
      inExpenseSection = false;
      inFloridaSection = false;
      console.log(`   ✅ Section ended at GRAND TOTAL`);
      continue;
    }

    if (inIncomeSection && (firstCol.includes('GROSS INCOME TOTAL') || firstCol.includes('ACTUAL GRAND TOTAL'))) {
      inIncomeSection = false;
      console.log(`   ✅ Income section ended`);
      continue;
    }

    // Process income section
    if (inIncomeSection) {
      // Income header: Date Receieved, Description, Source, Amount
      if (firstCol === 'Date Receieved' || firstCol === 'Date Received') {
        currentHeaders = row;
        currentHeaderIndices = {};
        row.forEach((header, index) => {
          if (header) currentHeaderIndices[header] = index;
        });
        continue;
      }

      // Process income transaction
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
              currency: 'USD', // Income typically in USD
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

    // Process Florida section
    if (inFloridaSection) {
      // Florida header detection
      if (row[1] === 'Desc' && row[2] === 'Merchant') {
        currentHeaders = row;
        currentHeaderIndices = {};
        row.forEach((header, index) => {
          if (header) currentHeaderIndices[header] = index;
        });
        continue;
      }

      // Check for date row
      if (isDateRow(firstCol)) {
        currentDate = firstCol;
        continue;
      }

      // Process Florida transaction
      if (currentHeaders && currentDate) {
        const description = row[currentHeaderIndices['Desc']];
        if (!description) continue;

        // Amount is in "Subtotal" column (newer) or "Payment Type" column (older)
        const amountStr = row[currentHeaderIndices['Subtotal']] || row[currentHeaderIndices['Payment Type']];

        if (!amountStr || amountStr === 'Subtotal' || amountStr === 'Payment Type') {
          continue;
        }

        const amount = parseFloat(String(amountStr).replace(/[^\d.-]/g, ''));

        if (!isNaN(amount) && amount > 0) {
          // Payment method is in "Payment Type" (newer) or "Business Expense" column (older)
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
            currency: 'USD', // Florida expenses always in USD
            type: 'expense',
            isReimbursable: reimbursable,
            isBusinessExpense: false,
            isFloridaExpense: true
          });
        }
      }
      continue;
    }

    // Process expense section (existing logic)
    if (!inExpenseSection) {
      continue;
    }

    // Detect header row: typically has "Desc", "Merchant" in columns
    if (row[1] === 'Desc' && row[2] === 'Merchant') {
      currentHeaders = row;
      currentHeaderIndices = {};

      // Map header names to column indices
      row.forEach((header, index) => {
        if (header) {
          currentHeaderIndices[header] = index;
        }
      });

      // Try to detect currency columns from header
      currentCurrencyColumns = detectCurrencyColumnsFromHeaders(row);

      if (currentCurrencyColumns.length === 0) {
        needsCurrencyRow = true;
        console.log(`   📋 Header row found, waiting for currency row...`);
      } else {
        console.log(`   📋 Header with currencies: ${currentCurrencyColumns.map(c => c.code).join(', ')}`);
      }
      continue;
    }

    // Check for currency code row (2017 format)
    if (needsCurrencyRow && !firstCol) {
      const detectedCurrencies = detectCurrencyColumnsFromRow(row);
      if (detectedCurrencies.length > 0) {
        currentCurrencyColumns = detectedCurrencies;
        needsCurrencyRow = false;
        console.log(`   💱 Currency row: ${currentCurrencyColumns.map(c => c.code).join(', ')}`);
        continue;
      }
    }

    // Check for date row
    if (isDateRow(firstCol)) {
      currentDate = firstCol;
      continue;
    }

    // Skip daily totals and empty description rows
    if (!row[1] || row[1].includes('Daily Total') || row[1] === 'Desc') {
      continue;
    }

    // Process transaction row
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

const csvFilePath = process.argv[2] || 'csv_imports/fullImport_20251017.csv';

if (!fs.existsSync(csvFilePath)) {
  console.error(`❌ File not found: ${csvFilePath}`);
  process.exit(1);
}

console.log('🧪 Testing improved CSV parsing...\n');

const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
const transactions = parseCSV(csvContent);

console.log(`\n\n📊 Total parsed: ${transactions.length} transactions\n`);

// Show first 20
console.log('First 20 transactions:');
transactions.slice(0, 20).forEach((t, i) => {
  const tags = [];
  if (t.isReimbursable) tags.push('R');
  if (t.isBusinessExpense) tags.push('B');
  const tagStr = tags.length > 0 ? ` [${tags.join(',')}]` : '';

  console.log(`${String(i + 1).padStart(3)}. ${t.date} | ${t.description.substring(0, 35).padEnd(35)} | ${String(t.amount).padStart(10)} ${t.currency} | ${t.type}${tagStr}`);
});

// Show sample from different points
console.log('\n\nTransactions 500-510:');
transactions.slice(500, 510).forEach((t, i) => {
  console.log(`${String(i + 501).padStart(3)}. ${t.date} | ${t.description.substring(0, 35).padEnd(35)} | ${String(t.amount).padStart(10)} ${t.currency} | ${t.type}`);
});

console.log('\n\nTransactions 1000-1010:');
transactions.slice(1000, 1010).forEach((t, i) => {
  console.log(`${String(i + 1001).padStart(3)}. ${t.date} | ${t.description.substring(0, 35).padEnd(35)} | ${String(t.amount).padStart(10)} ${t.currency} | ${t.type}`);
});

// Show last 20
console.log('\n\nLast 20 transactions:');
transactions.slice(-20).forEach((t, i) => {
  const index = transactions.length - 20 + i + 1;
  console.log(`${String(index).padStart(3)}. ${t.date} | ${t.description.substring(0, 35).padEnd(35)} | ${String(t.amount).padStart(10)} ${t.currency} | ${t.type}`);
});

// Statistics
const currencyStats = transactions.reduce((acc, t) => {
  acc[t.currency] = (acc[t.currency] || 0) + 1;
  return acc;
}, {});

const typeStats = transactions.reduce((acc, t) => {
  acc[t.type] = (acc[t.type] || 0) + 1;
  return acc;
}, {});

const yearStats = transactions.reduce((acc, t) => {
  const year = t.date.substring(0, 4);
  acc[year] = (acc[year] || 0) + 1;
  return acc;
}, {});

console.log(`\n\n📈 Statistics:`);

console.log(`\nBy Currency:`);
Object.entries(currencyStats).sort().forEach(([currency, count]) => {
  console.log(`   ${currency}: ${count} transactions`);
});

console.log(`\nBy Type:`);
Object.entries(typeStats).forEach(([type, count]) => {
  console.log(`   ${type}: ${count} transactions`);
});

console.log(`\nBy Year:`);
Object.entries(yearStats).sort().forEach(([year, count]) => {
  console.log(`   ${year}: ${count} transactions`);
});

const reimbursableCount = transactions.filter(t => t.isReimbursable).length;
const businessCount = transactions.filter(t => t.isBusinessExpense).length;
const floridaCount = transactions.filter(t => t.isFloridaExpense).length;

console.log(`\nBy Tags:`);
console.log(`   Reimbursable: ${reimbursableCount} transactions`);
console.log(`   Business Expense: ${businessCount} transactions`);
console.log(`   Florida Villa: ${floridaCount} transactions`);

// Show sample Florida transactions
const floridaTransactions = transactions.filter(t => t.isFloridaExpense);
if (floridaTransactions.length > 0) {
  console.log(`\n🏠 Sample Florida Villa transactions (first 10):`);
  floridaTransactions.slice(0, 10).forEach(t => {
    const tags = [];
    if (t.isReimbursable) tags.push('Reimbursable');
    const tagStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
    console.log(`   ${t.date} | ${t.description.substring(0, 40).padEnd(40)} | ${String(t.amount).padStart(8)} ${t.currency} | ${t.merchant || 'no merchant'}${tagStr}`);
  });
}

// Show anomalous year transactions
const anomalousYears = ['2001', '2004', '2003', '2005', '2006', '2007', '2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016'];
const anomalousTransactions = transactions.filter(t => anomalousYears.includes(t.date.substring(0, 4)));

if (anomalousTransactions.length > 0) {
  console.log(`\n⚠️  Anomalous year transactions (pre-2017):`);
  anomalousTransactions.forEach(t => {
    console.log(`   ${t.date} | ${t.description.substring(0, 50).padEnd(50)} | ${String(t.amount).padStart(10)} ${t.currency} | ${t.merchant || 'no merchant'}`);
  });
}

console.log(`\n✅ Parsing complete!`);
