#!/usr/bin/env node

/**
 * Production Import Script - Full History CSV Import for Joot App
 * Imports all transactions from June 2017 - October 2025
 * Usage: node production-import.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Papa = require('papaparse');
const fs = require('fs');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'dennis@dsil.design';
const CSV_FILE_PATH = 'csv_imports/fullImport_20251017.csv';

const CURRENCY_CODES = ['USD', 'THB', 'MYR', 'SGD', 'VND', 'EUR', 'GBP', 'JPY', 'KRW', 'CNY', 'PHP', 'IDR'];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ============= PARSING FUNCTIONS (from test-parse-v2.js) =============

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
        isBusinessExpense: businessExpense,
        isFloridaExpense: false
      });
    }
  }

  return transactions;
}

// ============= DATABASE FUNCTIONS (from run-import.js) =============

function extractPaymentMethodName(paymentType) {
  if (paymentType.includes(':')) {
    return paymentType.split(':')[1].trim();
  }
  return paymentType.trim();
}

async function getUserId(email) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (error || !user) {
    throw new Error(`User not found: ${email}`);
  }
  return user.id;
}

async function getOrCreateVendor(name, userId, vendorMap) {
  if (vendorMap.has(name)) {
    return vendorMap.get(name);
  }

  const { data: existingVendor } = await supabase
    .from('vendors')
    .select('id')
    .eq('name', name)
    .eq('user_id', userId)
    .single();

  if (existingVendor) {
    vendorMap.set(name, existingVendor.id);
    return existingVendor.id;
  }

  const { data: newVendor, error } = await supabase
    .from('vendors')
    .insert({ name, user_id: userId })
    .select('id')
    .single();

  if (error || !newVendor) {
    throw new Error(`Failed to create vendor: ${name}`);
  }

  vendorMap.set(name, newVendor.id);
  return newVendor.id;
}

async function getOrCreatePaymentMethod(name, userId, paymentMap) {
  if (paymentMap.has(name)) {
    return paymentMap.get(name);
  }

  const { data: existingMethod } = await supabase
    .from('payment_methods')
    .select('id')
    .eq('name', name)
    .eq('user_id', userId)
    .single();

  if (existingMethod) {
    paymentMap.set(name, existingMethod.id);
    return existingMethod.id;
  }

  const { data: newMethod, error } = await supabase
    .from('payment_methods')
    .insert({ name, user_id: userId })
    .select('id')
    .single();

  if (error || !newMethod) {
    throw new Error(`Failed to create payment method: ${name}`);
  }

  paymentMap.set(name, newMethod.id);
  return newMethod.id;
}

async function getExistingTag(name, userId, tagMap) {
  if (tagMap.has(name)) {
    return tagMap.get(name);
  }

  const { data: existingTag } = await supabase
    .from('tags')
    .select('id')
    .eq('name', name)
    .eq('user_id', userId)
    .single();

  if (existingTag) {
    tagMap.set(name, existingTag.id);
    return existingTag.id;
  }

  return null;
}

function determineTransactionTags(transaction) {
  const tags = [];

  if (transaction.isReimbursable) {
    tags.push('Reimburseable');
  }

  if (transaction.isBusinessExpense) {
    tags.push('Business Expense');
  }

  if (transaction.isFloridaExpense) {
    tags.push('Florida Villa');
  }

  return tags;
}

async function createTransactionWithTags(transaction, dbIds, progressCallback) {
  // Get vendor ID if merchant exists
  let vendorId = null;
  if (transaction.merchant) {
    vendorId = await getOrCreateVendor(transaction.merchant, dbIds.userId, dbIds.vendors);
  }

  // Get payment method ID if payment type exists
  let paymentMethodId = null;
  if (transaction.paymentType) {
    const paymentMethodName = extractPaymentMethodName(transaction.paymentType);
    paymentMethodId = await getOrCreatePaymentMethod(paymentMethodName, dbIds.userId, dbIds.paymentMethods);
  }

  // Create transaction
  const { data: newTransaction, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: dbIds.userId,
      description: transaction.description,
      vendor_id: vendorId,
      payment_method_id: paymentMethodId,
      amount: transaction.amount,
      original_currency: transaction.currency,
      transaction_type: transaction.type,
      transaction_date: transaction.date
    })
    .select('id')
    .single();

  if (transactionError || !newTransaction) {
    throw new Error(`Failed to create transaction: ${transaction.description} - ${transactionError?.message}`);
  }

  // Determine which tags to apply
  const tagNamesToApply = determineTransactionTags(transaction);
  const tagIds = [];

  // Get existing tag IDs
  for (const tagName of tagNamesToApply) {
    const tagId = await getExistingTag(tagName, dbIds.userId, dbIds.tags);
    if (tagId) {
      tagIds.push(tagId);
    }
  }

  // Insert transaction tags
  if (tagIds.length > 0) {
    const tagInserts = tagIds.map(tagId => ({
      transaction_id: newTransaction.id,
      tag_id: tagId
    }));

    const { error: tagError } = await supabase
      .from('transaction_tags')
      .insert(tagInserts);

    if (tagError) {
      console.warn(`⚠️  Failed to apply tags to transaction ${newTransaction.id}:`, tagError.message);
    }
  }

  // Progress callback
  if (progressCallback) {
    const appliedTags = tagNamesToApply.filter(tagName => dbIds.tags.has(tagName));
    progressCallback(transaction, appliedTags);
  }
}

// ============= MAIN EXECUTION =============

async function main() {
  console.log('🚀 Starting Production Import for Joot App\n');
  console.log('📁 File: csv_imports/fullImport_20251017.csv');
  console.log('👤 User: dennis@dsil.design\n');

  try {
    // Check if file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`File not found: ${CSV_FILE_PATH}`);
    }

    // Read and parse CSV
    console.log('📄 Reading CSV file...');
    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');

    console.log('🔍 Parsing transactions...');
    const transactions = parseCSV(csvContent);

    console.log(`✅ Parsed ${transactions.length} transactions\n`);

    // Show summary stats
    const currencyStats = transactions.reduce((acc, t) => {
      acc[t.currency] = (acc[t.currency] || 0) + 1;
      return acc;
    }, {});

    const typeStats = transactions.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Pre-Import Summary:');
    console.log(`   By Type: Expenses (${typeStats.expense}), Income (${typeStats.income})`);
    console.log(`   By Currency: ${Object.entries(currencyStats).map(([c, n]) => `${c} (${n})`).join(', ')}\n`);

    // Get user ID
    console.log('👤 Looking up user...');
    const userId = await getUserId(USER_EMAIL);
    console.log(`✅ Found user: ${USER_EMAIL}\n`);

    // Initialize database ID maps
    const dbIds = {
      userId,
      vendors: new Map(),
      paymentMethods: new Map(),
      tags: new Map()
    };

    // Import transactions with progress tracking
    console.log('💾 Importing transactions to database...\n');
    let successCount = 0;
    let failCount = 0;
    const startTime = Date.now();

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];

      try {
        await createTransactionWithTags(transaction, dbIds, (txn, tags) => {
          successCount++;

          // Show progress every 100 transactions
          if (successCount % 100 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = (successCount / (Date.now() - startTime) * 1000).toFixed(1);
            console.log(`   Progress: ${successCount}/${transactions.length} (${rate}/sec, ${elapsed}s elapsed)`);
          }
        });
      } catch (error) {
        failCount++;
        console.error(`   ❌ Failed: ${transaction.description} (${transaction.date}) - ${error.message}`);
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgRate = (successCount / (Date.now() - startTime) * 1000).toFixed(1);

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 Import Complete!');
    console.log(`${'='.repeat(60)}\n`);
    console.log(`✅ Successfully imported: ${successCount}/${transactions.length} transactions`);

    if (failCount > 0) {
      console.log(`⚠️  Failed imports: ${failCount}`);
    }

    console.log(`⏱️  Total time: ${totalTime}s (${avgRate} transactions/sec)`);
    console.log(`📦 Vendors created: ${dbIds.vendors.size}`);
    console.log(`💳 Payment methods created: ${dbIds.paymentMethods.size}`);
    console.log(`🏷️  Tags found: ${dbIds.tags.size}`);

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
