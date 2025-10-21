#!/usr/bin/env node

/**
 * Phase 2: CSV Deep Analysis with Transaction Fingerprinting
 * Re-parses CSV with detailed tracking and fingerprinting
 */

const Papa = require('papaparse');
const fs = require('fs');
const crypto = require('crypto');

// Copy the exact parsing functions from production-import.js
const CURRENCY_CODES = ['USD', 'THB', 'MYR', 'SGD', 'VND', 'EUR', 'GBP', 'JPY', 'KRW', 'CNY', 'PHP', 'IDR'];

function createFingerprint(transaction) {
  const parts = [
    transaction.date,
    transaction.description.toLowerCase().trim(),
    transaction.amount.toFixed(2),
    transaction.currency,
    transaction.type
  ];
  const data = parts.join('|');
  return crypto.createHash('sha256').update(data).digest('hex');
}

function parseTransactionDate(dateString) {
  // Match the PDF parser's approach to avoid timezone issues
  // "Monday, October 1, 2025" → "2025-10-01"
  const match = dateString.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d+),\s+(\d{4})/);
  if (!match) {
    // Fallback to old method if format doesn't match
    const datePart = dateString.split(', ').slice(1).join(', ');
    const date = new Date(datePart);
    return date.toISOString().split('T')[0];
  }

  const monthName = match[2];
  const day = match[3];
  const year = match[4];

  const monthNum = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
  const monthStr = String(monthNum).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');

  return `${year}-${monthStr}-${dayStr}`;
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

            const transaction = {
              id: `csv_line_${i + 1}`,
              sourceLineNumber: i + 1,
              section: 'income',
              date: correctedDate,
              description: description.trim(),
              merchant: source || null,
              amount: amount,
              currency: 'USD',
              type: 'income',
              source: 'csv'
            };
            transaction.fingerprint = createFingerprint(transaction);
            transactions.push(transaction);
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
          const merchant = row[currentHeaderIndices['Merchant']] || null;

          const parsedDate = parseTransactionDate(currentDate);
          const correctedDate = correctAnomalousDate(parsedDate, description, merchant);

          const transaction = {
            id: `csv_line_${i + 1}`,
            sourceLineNumber: i + 1,
            section: 'florida',
            date: correctedDate,
            description: description.trim(),
            merchant: merchant,
            amount: amount,
            currency: 'USD',
            type: 'expense',
            source: 'csv'
          };
          transaction.fingerprint = createFingerprint(transaction);
          transactions.push(transaction);
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

      let transactionType = 'expense';
      if (amountResult.isNegative ||
          description.toLowerCase().includes('refund') ||
          description.toLowerCase().includes('reimbursement')) {
        transactionType = 'income';
      }

      const parsedDate = parseTransactionDate(currentDate);
      const correctedDate = correctAnomalousDate(parsedDate, description, merchant);

      const transaction = {
        id: `csv_line_${i + 1}`,
        sourceLineNumber: i + 1,
        section: 'expense',
        date: correctedDate,
        description: description.trim(),
        merchant: merchant,
        amount: amountResult.amount,
        currency: amountResult.currency,
        type: transactionType,
        source: 'csv'
      };
      transaction.fingerprint = createFingerprint(transaction);
      transactions.push(transaction);
    }
  }

  return transactions;
}

function detectDuplicates(transactions) {
  console.log('🔍 Detecting duplicates...\n');

  const fingerprintMap = new Map();
  const duplicates = [];

  transactions.forEach(t => {
    if (fingerprintMap.has(t.fingerprint)) {
      const existing = fingerprintMap.get(t.fingerprint);
      if (!duplicates.find(d => d.fingerprint === t.fingerprint)) {
        duplicates.push({
          fingerprint: t.fingerprint,
          transactions: [existing, t]
        });
      } else {
        const dup = duplicates.find(d => d.fingerprint === t.fingerprint);
        dup.transactions.push(t);
      }
    } else {
      fingerprintMap.set(t.fingerprint, t);
    }
  });

  if (duplicates.length > 0) {
    console.log(`⚠️  Found ${duplicates.length} duplicate fingerprints`);
    duplicates.slice(0, 5).forEach((dup, i) => {
      console.log(`   ${i + 1}. ${dup.transactions[0].date} - ${dup.transactions[0].description} (${dup.transactions.length} copies)`);
    });
  } else {
    console.log('✅ No duplicates found');
  }

  console.log('');
  return duplicates;
}

function groupByMonth(transactions) {
  const byMonth = {};

  transactions.forEach(t => {
    const month = t.date.substring(0, 7);
    if (!byMonth[month]) {
      byMonth[month] = { expense: 0, income: 0, total: 0 };
    }
    byMonth[month].total++;
    if (t.type === 'expense') byMonth[month].expense++;
    if (t.type === 'income') byMonth[month].income++;
  });

  return byMonth;
}

function groupBySection(transactions) {
  const bySection = { expense: 0, income: 0, florida: 0 };

  transactions.forEach(t => {
    if (t.section) {
      bySection[t.section]++;
    }
  });

  return bySection;
}

async function main() {
  console.log('='.repeat(80));
  console.log('PHASE 2: CSV DEEP ANALYSIS');
  console.log('='.repeat(80));
  console.log('');

  try {
    const csvPath = 'csv_imports/fullImport_20251017.csv';
    console.log(`📄 Reading CSV: ${csvPath}\n`);

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    console.log('🔍 Parsing CSV with detailed tracking...\n');

    const transactions = parseCSV(csvContent);
    const duplicates = detectDuplicates(transactions);
    const byMonth = groupByMonth(transactions);
    const bySection = groupBySection(transactions);

    // Group by currency
    const byCurrency = transactions.reduce((acc, t) => {
      acc[t.currency] = (acc[t.currency] || 0) + 1;
      return acc;
    }, {});

    // Group by type
    const byType = transactions.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {});

    const output = {
      metadata: {
        analysisDate: new Date().toISOString(),
        csvFile: csvPath,
        totalCount: transactions.length
      },
      summary: {
        byMonth,
        bySection,
        byCurrency,
        byType,
        duplicateCount: duplicates.length
      },
      duplicates,
      transactions
    };

    // Save to file
    const outputPath = 'verification-output/csv-transactions.json';
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log('📊 Summary:');
    console.log(`   Total transactions: ${transactions.length}`);
    console.log(`   Unique months: ${Object.keys(byMonth).length}`);
    console.log(`   Duplicates: ${duplicates.length}`);
    console.log(`   By Section: ${Object.entries(bySection).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    console.log(`   By Type: ${Object.entries(byType).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    console.log(`   By Currency: ${Object.entries(byCurrency).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    console.log('');
    console.log(`✅ Output saved to: ${outputPath}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
