#!/usr/bin/env node

/**
 * Dry-run test for CSV parsing
 * Tests the parsing logic without inserting into database
 */

const Papa = require('papaparse');
const fs = require('fs');

// All possible currency codes we might encounter
const CURRENCY_CODES = ['USD', 'THB', 'MYR', 'SGD', 'VND', 'EUR', 'GBP', 'JPY', 'KRW', 'CNY', 'PHP', 'IDR'];

function parseTransactionDate(dateString) {
  const datePart = dateString.split(', ').slice(1).join(', ');
  const date = new Date(datePart);
  return date.toISOString().split('T')[0];
}

function detectCurrencyColumns(headers) {
  const currencyColumns = [];

  headers.forEach(header => {
    // Skip conversion columns and other non-currency columns
    if (!header ||
        header.toLowerCase().includes('conversion') ||
        header.toLowerCase().includes('subtotal') ||
        header === 'Desc' ||
        header === 'Merchant' ||
        header === 'Reimbursable' ||
        header === 'Business Expense' ||
        header === 'My Business Expense' ||
        header === 'Payment Type' ||
        header === 'Actual Spent' ||
        header === 'Source' ||
        header === 'Amount' ||
        header === 'Reimbursement' ||
        header === '') {
      return;
    }

    // Check if the header is a known currency code or contains one
    const headerUpper = header.toUpperCase();
    for (const currencyCode of CURRENCY_CODES) {
      if (headerUpper === currencyCode ||
          headerUpper.includes(currencyCode)) {
        currencyColumns.push({ header, code: currencyCode });
        break;
      }
    }
  });

  return currencyColumns;
}

function extractAmountAndCurrency(row, currencyColumns, headers) {
  // Check each currency column to find which one has a value
  for (const { header, code } of currencyColumns) {
    const value = row[header];

    if (value !== null && value !== undefined && value !== '') {
      // Parse the amount, removing currency symbols and commas
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

function parseCSVTransactions(csvContent) {
  const parsedData = Papa.parse(csvContent, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true
  });

  const transactions = [];
  let currentDate = null;
  let inMainSection = true;
  let currentCurrencyColumns = null;
  let currentHeaders = null;
  let foundJune2017 = false;
  let needsCurrencyRow = false; // Flag to check next row for currency codes

  let rowsProcessed = 0;
  parsedData.data.forEach((row, index) => {
    const firstCol = row[""] || row[Object.keys(row)[0]];

    // Detect if we've reached an Expense Tracker section (skip Income/Florida/etc)
    if (!foundJune2017 && firstCol && typeof firstCol === 'string') {
      if (firstCol.includes('Expense Tracker')) {
        foundJune2017 = true;
        console.log(`📍 Found first Expense Tracker: ${firstCol}`);
      }
    }

    if (!foundJune2017) {
      return;
    }

    rowsProcessed++;
    if (rowsProcessed <= 20) {
      console.log(`Row ${rowsProcessed}: firstCol="${firstCol}", Desc="${row.Desc}", Merchant="${row.Merchant}"`);
    }

    // Exit main section when we hit the first GRAND TOTAL
    if (firstCol && typeof firstCol === 'string' && firstCol.includes('GRAND TOTAL')) {
      inMainSection = false;
      return;
    }

    if (!inMainSection) {
      return;
    }

    // Detect header rows
    if (row.Desc === 'Desc' && row.Merchant === 'Merchant') {
      currentHeaders = Object.keys(row);
      currentCurrencyColumns = detectCurrencyColumns(currentHeaders);
      console.log(`\n📋 Header row found. All columns: ${currentHeaders.join(', ')}`);

      // If no currency columns detected, the next row might have currency codes (2017 format)
      if (currentCurrencyColumns.length === 0) {
        needsCurrencyRow = true;
        console.log(`🔍 No currency columns in header, waiting for currency row...`);
      } else {
        console.log(`🔍 Detected currency columns: ${currentCurrencyColumns.map(c => `${c.header}=${c.code}`).join(', ')}`);
      }
      return;
    }

    // Check if this row contains currency codes (for 2017 format)
    if (needsCurrencyRow && !firstCol) {
      // Check all column values to see if they contain currency codes
      const allValues = Object.values(row).map(v => String(v || '').toUpperCase());
      const foundCurrencies = CURRENCY_CODES.filter(code =>
        allValues.some(val => val === code || val.includes(code))
      );

      if (foundCurrencies.length > 0) {
        // Map the currency codes to their column names
        currentCurrencyColumns = [];
        Object.entries(row).forEach(([colName, colValue]) => {
          const valueUpper = String(colValue || '').toUpperCase();
          const currencyCode = CURRENCY_CODES.find(code =>
            valueUpper === code || valueUpper.includes(code)
          );
          if (currencyCode) {
            currentCurrencyColumns.push({ header: colName, code: currencyCode });
          }
        });

        console.log(`🔍 Detected currency codes from row: ${currentCurrencyColumns.map(c => c.code).join(', ')}`);
        needsCurrencyRow = false;
        return;
      }
    }

    // Check if this row is a date header
    if (firstCol && typeof firstCol === 'string' &&
        firstCol.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/)) {
      currentDate = firstCol;
      return;
    }

    // Skip daily total rows and empty rows
    if (!row.Desc ||
        row.Desc.includes('Daily Total') ||
        row.Desc === 'Desc' ||
        row.Desc.includes('Estimated') ||
        row.Desc.includes('Subtotal')) {
      return;
    }

    // Process transaction rows
    if (row.Desc && currentDate && currentCurrencyColumns && currentCurrencyColumns.length > 0) {
      const result = extractAmountAndCurrency(row, currentCurrencyColumns, currentHeaders);

      if (!result || result.amount === 0) {
        return;
      }

      const transactionDate = parseTransactionDate(currentDate);

      let transactionType = 'expense';
      if (result.isNegative ||
          row.Desc.toLowerCase().includes('refund') ||
          row.Desc.toLowerCase().includes('reimbursement')) {
        transactionType = 'income';
      }

      transactions.push({
        date: transactionDate,
        description: row.Desc.trim(),
        merchant: row.Merchant || null,
        paymentType: row['Payment Type'] || null,
        amount: result.amount,
        currency: result.currency,
        type: transactionType
      });
    }
  });

  return transactions;
}

const csvFilePath = process.argv[2] || 'csv_imports/fullImport_20251017.csv';

if (!fs.existsSync(csvFilePath)) {
  console.error(`❌ File not found: ${csvFilePath}`);
  process.exit(1);
}

console.log('🧪 Testing CSV parsing (dry-run mode)...\n');

const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
const transactions = parseCSVTransactions(csvContent);

console.log(`\n📊 Parsed ${transactions.length} transactions\n`);

// Show first 20 transactions
console.log('First 20 transactions:');
transactions.slice(0, 20).forEach((t, i) => {
  console.log(`${i + 1}. ${t.date} | ${t.description.substring(0, 40).padEnd(40)} | ${String(t.amount).padStart(10)} ${t.currency} | ${t.type}`);
});

// Show sample from middle
console.log('\n\nSample from middle (around transaction 500):');
transactions.slice(500, 510).forEach((t, i) => {
  console.log(`${i + 501}. ${t.date} | ${t.description.substring(0, 40).padEnd(40)} | ${String(t.amount).padStart(10)} ${t.currency} | ${t.type}`);
});

// Show last 20 transactions
console.log('\n\nLast 20 transactions:');
transactions.slice(-20).forEach((t, i) => {
  const index = transactions.length - 20 + i + 1;
  console.log(`${index}. ${t.date} | ${t.description.substring(0, 40).padEnd(40)} | ${String(t.amount).padStart(10)} ${t.currency} | ${t.type}`);
});

// Summary stats
const currencyStats = transactions.reduce((acc, t) => {
  acc[t.currency] = (acc[t.currency] || 0) + 1;
  return acc;
}, {});

const typeStats = transactions.reduce((acc, t) => {
  acc[t.type] = (acc[t.type] || 0) + 1;
  return acc;
}, {});

console.log(`\n\n📈 Statistics:`);
console.log(`\nBy Currency:`);
Object.entries(currencyStats).forEach(([currency, count]) => {
  console.log(`   ${currency}: ${count} transactions`);
});

console.log(`\nBy Type:`);
Object.entries(typeStats).forEach(([type, count]) => {
  console.log(`   ${type}: ${count} transactions`);
});

console.log(`\n✅ Dry-run complete!`);
