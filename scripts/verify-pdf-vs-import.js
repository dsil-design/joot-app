#!/usr/bin/env node

/**
 * PDF Verification Script
 * Compares all 102 PDF files against the imported CSV data
 * to ensure 1:1 transaction matching
 */

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const Papa = require('papaparse');

// Re-use the parsing functions from test-parse-v2.js
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
              amount: amount,
              currency: 'USD',
              type: 'income',
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
          const merchant = row[currentHeaderIndices['Merchant']] || null;

          const parsedDate = parseTransactionDate(currentDate);
          const correctedDate = correctAnomalousDate(parsedDate, description, merchant);

          transactions.push({
            date: correctedDate,
            description: description.trim(),
            merchant: merchant,
            amount: amount,
            currency: 'USD',
            type: 'expense',
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
        amount: amountResult.amount,
        currency: amountResult.currency,
        type: transactionType,
        isFloridaExpense: false
      });
    }
  }

  return transactions;
}

async function parsePDF(pdfPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });

  try {
    const result = await parser.getText();

    // Count transactions from PDF text
    const text = result.text;

    // Extract month/year from the first date in the PDF
    const firstDateMatch = text.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+\d+,\s+(\d{4})/);
    let monthYear = null;
    if (firstDateMatch) {
      const monthName = firstDateMatch[2];
      const year = firstDateMatch[3];
      const monthNum = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
      monthYear = `${year}-${String(monthNum).padStart(2, '0')}`;
    }

    // Count expense transactions (lines between date rows and "Daily Total")
    const expenseMatches = text.match(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday).*?Daily Total/gms);
    let expenseCount = 0;
    if (expenseMatches) {
      expenseMatches.forEach(match => {
        // Count lines that look like transactions (not daily totals, not headers, not empty)
        const lines = match.split('\n').filter(line => {
          line = line.trim();
          return line &&
                 !line.startsWith('Daily Total') &&
                 !line.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/) &&
                 !line.includes('Desc\tMerchant') &&
                 line.length > 10; // Basic filter for actual data lines
        });
        expenseCount += lines.length;
      });
    }

    // Count income transactions
    const incomeSection = text.match(/Gross Income Tracker(.*?)(?:Deficit\/Surplus|Florida House Expenses|$)/s);
    let incomeCount = 0;
    if (incomeSection && incomeSection[1]) {
      const lines = incomeSection[1].split('\n').filter(line => {
        line = line.trim();
        return line &&
               line.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/) === null &&
               !line.includes('Description\tSource') &&
               !line.includes('GROSS INCOME TOTAL') &&
               !line.includes('Date Received') &&
               line.length > 10 &&
               line.match(/\$\s*[\d,]+\.\d{2}/); // Has a dollar amount
      });
      incomeCount = lines.length;
    }

    // Count Florida House transactions
    const floridaSection = text.match(/Florida House Expenses(.*?)GRAND TOTAL/s);
    let floridaCount = 0;
    if (floridaSection && floridaSection[1]) {
      const lines = floridaSection[1].split('\n').filter(line => {
        line = line.trim();
        return line &&
               !line.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/) &&
               !line.includes('Desc\tMerchant') &&
               !line.includes('GRAND TOTAL') &&
               line.length > 10 &&
               (line.match(/\$[\d,]+\.\d{2}/) || line.includes('Pending'));
      });
      floridaCount = lines.length;
    }

    return {
      monthYear,
      expense: expenseCount,
      income: incomeCount,
      florida: floridaCount,
      total: expenseCount + incomeCount + floridaCount
    };
  } finally {
    await parser.destroy();
  }
}

async function main() {
  console.log('📋 PDF vs Import Verification\n');
  console.log('Reading CSV data...');

  // Parse CSV
  const csvPath = 'csv_imports/fullImport_20251017.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const csvTransactions = parseCSV(csvContent);

  // Group CSV transactions by month
  const csvByMonth = {};
  csvTransactions.forEach(t => {
    const month = t.date.substring(0, 7);
    if (!csvByMonth[month]) {
      csvByMonth[month] = { expense: 0, income: 0, florida: 0, total: 0 };
    }
    csvByMonth[month].total++;
    if (t.type === 'expense') csvByMonth[month].expense++;
    if (t.type === 'income') csvByMonth[month].income++;
    if (t.isFloridaExpense) csvByMonth[month].florida++;
  });

  console.log(`✅ CSV parsed: ${csvTransactions.length} transactions\n`);

  // Get all PDF files
  const pdfDir = 'csv_imports/Master Reference PDFs';
  const pdfFiles = fs.readdirSync(pdfDir)
    .filter(f => f.endsWith('.pdf'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/page(\d+)/)[1]);
      const numB = parseInt(b.match(/page(\d+)/)[1]);
      return numA - numB;
    });

  console.log(`Found ${pdfFiles.length} PDF files\n`);
  console.log('Parsing PDFs... (this may take a few minutes)\n');

  const pdfByMonth = {};

  // Parse each PDF
  for (let i = 0; i < pdfFiles.length; i++) {
    const file = pdfFiles[i];
    const pdfPath = path.join(pdfDir, file);

    process.stdout.write(`\rProcessing ${i + 1}/${pdfFiles.length}: ${file}...`);

    const counts = await parsePDF(pdfPath);

    if (counts.monthYear) {
      pdfByMonth[counts.monthYear] = counts;
    }
  }

  console.log('\n\n✅ All PDFs parsed\n');
  console.log('='.repeat(80));
  console.log('\nComparison Results:\n');

  // Compare results
  const allMonths = new Set([...Object.keys(csvByMonth), ...Object.keys(pdfByMonth)]);
  const sortedMonths = Array.from(allMonths).sort().reverse();

  console.log('Month      | CSV Total | PDF Total | Δ      | CSV Exp | PDF Exp | CSV Inc | PDF Inc | CSV FL | PDF FL');
  console.log('-----------|-----------|-----------|--------|---------|---------|---------|---------|--------|-------');

  let totalDiscrepancies = 0;
  const discrepancies = [];

  sortedMonths.forEach(month => {
    const csvData = csvByMonth[month] || { expense: 0, income: 0, florida: 0, total: 0 };
    const pdfData = pdfByMonth[month] || { expense: 0, income: 0, florida: 0, total: 0 };

    const diff = csvData.total - pdfData.total;
    const match = diff === 0 ? '✅' : '❌';

    if (diff !== 0) {
      totalDiscrepancies++;
      discrepancies.push({
        month,
        csvTotal: csvData.total,
        pdfTotal: pdfData.total,
        diff
      });
    }

    console.log(
      `${month} | ` +
      `${String(csvData.total).padStart(9)} | ` +
      `${String(pdfData.total).padStart(9)} | ` +
      `${String(diff).padStart(6)} | ` +
      `${String(csvData.expense).padStart(7)} | ` +
      `${String(pdfData.expense).padStart(7)} | ` +
      `${String(csvData.income).padStart(7)} | ` +
      `${String(pdfData.income).padStart(7)} | ` +
      `${String(csvData.florida).padStart(6)} | ` +
      `${String(pdfData.florida).padStart(6)} ${match}`
    );
  });

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   Total months: ${sortedMonths.length}`);
  console.log(`   Months with discrepancies: ${totalDiscrepancies}`);
  console.log(`   CSV total transactions: ${csvTransactions.length}`);
  console.log(`   PDF total transactions: ${Object.values(pdfByMonth).reduce((sum, m) => sum + m.total, 0)}`);

  if (discrepancies.length > 0) {
    console.log(`\n⚠️  Discrepancies found:\n`);
    discrepancies.forEach(d => {
      console.log(`   ${d.month}: CSV=${d.csvTotal}, PDF=${d.pdfTotal}, Diff=${d.diff}`);
    });
    console.log(`\n   Note: PDF text parsing may not be 100% accurate`);
    console.log(`   Recommend manual spot-checking of flagged months\n`);
  } else {
    console.log(`\n✅ All months match! CSV and PDF data are in sync.\n`);
  }
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
