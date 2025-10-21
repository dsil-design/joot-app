#!/usr/bin/env node

/**
 * Phase 3: PDF Transaction Extraction
 * Extracts actual transaction data from all 102 PDFs
 */

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const crypto = require('crypto');

// Match CSV parser's currency support
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
  // "Monday, October 1, 2025" → "2025-10-01"
  const match = dateString.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d+),\s+(\d{4})/);
  if (!match) return null;

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

async function extractTransactionsFromPDF(pdfPath, pageNum) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });

  try {
    const result = await parser.getText();
    const text = result.text;

    // Extract month/year from first date
    const firstDateMatch = text.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+\d+,\s+(\d{4})/);
    let monthYear = null;
    if (firstDateMatch) {
      const monthName = firstDateMatch[2];
      const year = firstDateMatch[3];
      const monthNum = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
      monthYear = `${year}-${String(monthNum).padStart(2, '0')}`;
    }

    const transactions = [];

    // Extract Expense Tracker transactions
    const expensePattern = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\w+\s+\d+,\s+\d{4}$(.*?)^Daily Total/gms;
    const expenseMatches = [...text.matchAll(expensePattern)];

    expenseMatches.forEach(match => {
      const dateStr = match[1].trim();
      const fullDate = match[0].split('\n')[0];
      const parsedDate = parseTransactionDate(fullDate);

      if (!parsedDate) return;

      const dayBlock = match[2];
      const lines = dayBlock.split('\n').map(l => l.trim()).filter(l => l);

      lines.forEach(line => {
        // Skip headers, totals, and very short lines
        if (!line || line.includes('Desc\t') || line.includes('Daily Total') || line.includes('Subtotal') || line.length < 10) {
          return;
        }

        // Try to find amount and currency for ALL supported currencies
        let amount = null;
        let currency = 'USD';
        let description = null;
        let merchant = null;

        // Check for EXPLICIT currency codes FIRST (THB, MYR, VND, etc.)
        // This is critical because lines may have BOTH "THB 2782.00" and "$85.69" (conversion)
        let foundExplicitCurrency = false;
        for (const code of CURRENCY_CODES) {
          if (code === 'USD') continue; // Check USD last
          const currencyPattern = new RegExp(`${code}\\s+(-?[\\d,]+\\.\\d{2})`, 'i');
          const match = line.match(currencyPattern);
          if (match) {
            amount = Math.abs(parseFloat(match[1].replace(/,/g, '')));
            currency = code;
            foundExplicitCurrency = true;
            break;
          }
        }

        // If no explicit currency found, look for USD ($)
        if (!foundExplicitCurrency) {
          const dollarMatch = line.match(/\$\s*(-?[\d,]+\.\d{2})/);
          if (dollarMatch) {
            amount = Math.abs(parseFloat(dollarMatch[1].replace(/,/g, '')));
            currency = 'USD';
          }
        }

        if (amount && amount > 0) {
          // Parse transaction line - can be tab or space separated
          const parts = line.split(/\t+/).map(p => p.trim()).filter(p => p);

          if (parts.length >= 1) {
            description = parts[0];
            merchant = parts.length >= 2 && parts[1] !== description ? parts[1] : null;

            // Check for negative amounts (refunds/income)
            let type = 'expense';
            if (line.includes('(') && line.includes(')')) {
              type = 'income';
            }
            if (description.toLowerCase().includes('refund') || description.toLowerCase().includes('reimbursement')) {
              type = 'income';
            }

            const correctedDate = correctAnomalousDate(parsedDate, description, merchant);

            const transaction = {
              id: `pdf_page${pageNum}_${transactions.length + 1}`,
              sourcePDF: `page${pageNum}`,
              sourceMonth: monthYear,
              date: correctedDate,
              description: description,
              merchant: merchant,
              amount: amount,
              currency: currency,
              type: type,
              section: 'expense',
              source: 'pdf'
            };
            transaction.fingerprint = createFingerprint(transaction);
            transactions.push(transaction);
          }
        }
      });
    });

    // Extract Income Tracker transactions
    const incomeSection = text.match(/Gross Income Tracker(.*?)(?:Deficit\/Surplus|Florida House Expenses|$)/s);
    if (incomeSection && incomeSection[1]) {
      const lines = incomeSection[1].split('\n').map(l => l.trim()).filter(l => l);

      let currentDate = null;
      lines.forEach(line => {
        // Check if this is a date line
        const dateMatch = line.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\w+\s+\d+,\s+\d{4}/);
        if (dateMatch) {
          currentDate = parseTransactionDate(line);
          return;
        }

        // Skip headers and totals
        if (!line || line.includes('Description\t') || line.includes('GROSS INCOME') || line.length < 10) {
          return;
        }

        // Look for lines with dollar amounts
        const dollarMatch = line.match(/\$\s*([\d,]+\.\d{2})/);
        if (dollarMatch && currentDate) {
          const amount = parseFloat(dollarMatch[1].replace(/,/g, ''));
          if (amount > 0) {
            const parts = line.split('\t').map(p => p.trim()).filter(p => p && !p.includes('$'));
            const description = parts[0] || 'Income';
            const source = parts[1] || null;

            const transaction = {
              id: `pdf_page${pageNum}_income_${transactions.length + 1}`,
              sourcePDF: `page${pageNum}`,
              sourceMonth: monthYear,
              date: currentDate,
              description: description,
              merchant: source,
              amount: amount,
              currency: 'USD',
              type: 'income',
              section: 'income',
              source: 'pdf'
            };
            transaction.fingerprint = createFingerprint(transaction);
            transactions.push(transaction);
          }
        }
      });
    }

    // Extract Florida House Expenses
    const floridaSection = text.match(/Florida House Expenses(.*?)GRAND TOTAL/s);
    if (floridaSection && floridaSection[1]) {
      const lines = floridaSection[1].split('\n').map(l => l.trim()).filter(l => l);

      let currentDate = null;
      lines.forEach(line => {
        // Check if this is a date line
        const dateMatch = line.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+\w+\s+\d+,\s+\d{4}/);
        if (dateMatch) {
          currentDate = parseTransactionDate(line);
          return;
        }

        // Skip headers
        if (!line || line.includes('Desc\t') || line.includes('GRAND TOTAL') || line.length < 10) {
          return;
        }

        // Look for lines with dollar amounts
        const dollarMatch = line.match(/\$\s*([\d,]+\.\d{2})/);
        if (dollarMatch && currentDate) {
          const amount = parseFloat(dollarMatch[1].replace(/,/g, ''));
          if (amount > 0) {
            const parts = line.split('\t').map(p => p.trim()).filter(p => p && !p.includes('$') && p !== 'Pending');
            const description = parts[0] || 'Florida Expense';
            const merchant = parts[1] || null;

            const transaction = {
              id: `pdf_page${pageNum}_florida_${transactions.length + 1}`,
              sourcePDF: `page${pageNum}`,
              sourceMonth: monthYear,
              date: currentDate,
              description: description,
              merchant: merchant,
              amount: amount,
              currency: 'USD',
              type: 'expense',
              section: 'florida',
              source: 'pdf'
            };
            transaction.fingerprint = createFingerprint(transaction);
            transactions.push(transaction);
          }
        }
      });
    }

    return { monthYear, transactions };

  } finally {
    await parser.destroy();
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('PHASE 3: PDF TRANSACTION EXTRACTION');
  console.log('='.repeat(80));
  console.log('');

  try {
    const pdfDir = 'csv_imports/Master Reference PDFs';
    const pdfFiles = fs.readdirSync(pdfDir)
      .filter(f => f.endsWith('.pdf'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/page(\d+)/)[1]);
        const numB = parseInt(b.match(/page(\d+)/)[1]);
        return numA - numB;
      });

    console.log(`📄 Found ${pdfFiles.length} PDF files\n`);
    console.log('🔍 Extracting transactions from PDFs...\n');

    const allTransactions = [];
    const byMonth = {};
    const byPDF = {};

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      const pageNum = parseInt(file.match(/page(\d+)/)[1]);
      const pdfPath = path.join(pdfDir, file);

      process.stdout.write(`\r   Processing ${i + 1}/${pdfFiles.length}: ${file}...`);

      const { monthYear, transactions } = await extractTransactionsFromPDF(pdfPath, pageNum);

      allTransactions.push(...transactions);

      if (monthYear) {
        if (!byMonth[monthYear]) {
          byMonth[monthYear] = { expense: 0, income: 0, florida: 0, total: 0 };
        }
        transactions.forEach(t => {
          byMonth[monthYear].total++;
          if (t.type === 'expense') byMonth[monthYear].expense++;
          if (t.type === 'income') byMonth[monthYear].income++;
          if (t.section === 'florida') byMonth[monthYear].florida++;
        });
      }

      byPDF[`page${pageNum}`] = transactions.length;
    }

    console.log(`\n\n✅ Extracted ${allTransactions.length} transactions\n`);

    // Detect duplicates
    console.log('🔍 Detecting duplicates...\n');
    const fingerprintMap = new Map();
    const duplicates = [];

    allTransactions.forEach(t => {
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
    } else {
      console.log('✅ No duplicates found');
    }
    console.log('');

    // Group by currency and type
    const byCurrency = allTransactions.reduce((acc, t) => {
      acc[t.currency] = (acc[t.currency] || 0) + 1;
      return acc;
    }, {});

    const byType = allTransactions.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {});

    const output = {
      metadata: {
        analysisDate: new Date().toISOString(),
        pdfCount: pdfFiles.length,
        totalCount: allTransactions.length
      },
      summary: {
        byMonth,
        byPDF,
        byCurrency,
        byType,
        duplicateCount: duplicates.length
      },
      duplicates,
      transactions: allTransactions
    };

    // Save to file
    const outputPath = 'verification-output/pdf-transactions.json';
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log('📊 Summary:');
    console.log(`   Total transactions: ${allTransactions.length}`);
    console.log(`   Unique months: ${Object.keys(byMonth).length}`);
    console.log(`   Duplicates: ${duplicates.length}`);
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
