#!/usr/bin/env node

/**
 * Full History CSV Import Runner for Joot App
 * Supports multi-currency transactions from June 2017 - Present
 * Usage: node run-import.js path/to/your/file.csv
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Papa = require('papaparse');
const fs = require('fs');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'dennis@dsil.design';

// All possible currency codes we might encounter
const CURRENCY_CODES = ['USD', 'THB', 'MYR', 'SGD', 'VND', 'EUR', 'GBP', 'JPY', 'KRW', 'CNY', 'PHP', 'IDR'];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Helper functions
function parseTransactionDate(dateString) {
  const datePart = dateString.split(', ').slice(1).join(', ');
  const date = new Date(datePart);
  return date.toISOString().split('T')[0];
}

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

  // Match Reimbursable column to "Reimburseable" tag (note spelling difference in system)
  if (transaction.isReimbursable) {
    tags.push('Reimburseable');
  }

  // Match Business Expense column to "Business Expense" tag
  if (transaction.isBusinessExpense) {
    tags.push('Business Expense');
  }

  // Always add Florida Villa tag for transactions from Florida House Expenses section
  if (transaction.isFloridaExpense) {
    tags.push('Florida Villa');
  }
  // Match Florida-related transactions to "Florida Villa" tag
  else if (transaction.description.toLowerCase().includes('florida') ||
      transaction.description.toLowerCase().includes('villa') ||
      (transaction.merchant && transaction.merchant.toLowerCase().includes('florida'))) {
    tags.push('Florida Villa');
  }

  return tags;
}

/**
 * Detects which columns in a row contain actual currency amounts
 * Returns array of column names that are currency columns (not conversion columns)
 */
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

/**
 * Extracts amount and currency from a transaction row
 * Checks all detected currency columns to find which one has a value
 */
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

  // If no currency columns found, try old column names for backward compatibility
  // Check "Actual Spent" column (could be THB or other currencies in older formats)
  if (row['Actual Spent']) {
    const value = String(row['Actual Spent']);
    // If it contains a currency code, extract it
    for (const code of CURRENCY_CODES) {
      if (value.includes(code)) {
        const amountString = value.replace(/[^\d.-]/g, '');
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
  }

  return null;
}

function parseIncomeSection(parsedData) {
  const transactions = [];
  let inIncomeSection = false;

  parsedData.forEach((row) => {
    const firstCol = row[""];

    // Look for income section header row (Date Receieved/Received in first column)
    if (firstCol === 'Date Receieved' || firstCol === 'Date Received') {
      inIncomeSection = true;
      return;
    }

    // Exit income section when we hit GROSS INCOME TOTAL or GRAND TOTAL
    if (inIncomeSection && firstCol && typeof firstCol === 'string' &&
        (firstCol.includes('GROSS INCOME TOTAL') || firstCol.includes('GRAND TOTAL'))) {
      inIncomeSection = false;
      return;
    }

    // Process income transaction rows
    // In the income section, columns are mapped as:
    // "" = Date, "Desc" = Description, "Merchant" = Source, "Reimbursable" or "Amount" = Amount
    if (inIncomeSection) {
      const dateStr = firstCol;
      const description = row.Desc;
      const source = row.Merchant;
      const amountStr = row.Reimbursable || row.Amount || row.Source;

      // Skip empty rows, header rows, or estimated/subtotal rows
      if (!description || !amountStr ||
          description === 'Description' ||
          description.includes('Estimated') ||
          description.includes('Subtotal')) {
        return;
      }

      // Parse date
      if (dateStr && typeof dateStr === 'string' &&
          dateStr.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/)) {
        const transactionDate = parseTransactionDate(dateStr);

        // Parse amount
        const amount = parseFloat(String(amountStr).replace(/[^\d.-]/g, ''));

        if (!isNaN(amount) && amount > 0) {
          transactions.push({
            date: transactionDate,
            description: description.trim(),
            merchant: source || null,
            paymentType: null,
            amount: amount,
            currency: 'USD', // Income is typically in USD
            isReimbursable: false,
            isBusinessExpense: false,
            transactionType: 'income',
            isFloridaExpense: false
          });
        }
      }
    }
  });

  return transactions;
}

function parseFloridaExpensesSection(parsedData) {
  const transactions = [];
  let inFloridaSection = false;
  let currentDate = null;
  let floridaHeaders = null;

  parsedData.forEach((row) => {
    const firstCol = row[""];

    // Detect Florida expenses section header row
    // Look for header with "Desc", "Merchant", and either "Reimbursement" or "Payment Type"
    if (row.Desc === 'Desc' && row.Merchant === 'Merchant' && !inFloridaSection) {
      // Check if this is a Florida section (has Reimbursement column or comes after "Florida House Expenses")
      if (row.Reimbursable === 'Reimbursement' || row['Payment Type'] === 'Payment Type') {
        inFloridaSection = true;
        floridaHeaders = Object.keys(row);
        return;
      }
    }

    // Exit section when we hit GRAND TOTAL
    if (inFloridaSection && firstCol && typeof firstCol === 'string' &&
        firstCol.includes('GRAND TOTAL')) {
      inFloridaSection = false;
      floridaHeaders = null;
      return;
    }

    if (inFloridaSection && floridaHeaders) {
      // Check if this row is a date header
      if (firstCol && typeof firstCol === 'string' &&
          firstCol.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/)) {
        currentDate = firstCol;
        return;
      }

      // Process transaction rows
      if (row.Desc && currentDate) {
        // Florida expenses: the amount is in "Subtotal" column (newer) or "Payment Type" column (older)
        const amountStr = row['Subtotal'] || row['Payment Type'];

        if (!amountStr || amountStr === 'Subtotal' || amountStr === 'Payment Type') {
          return;
        }

        // Parse amount
        const amount = parseFloat(String(amountStr).replace(/[^\d.-]/g, ''));

        if (!isNaN(amount) && amount > 0) {
          const transactionDate = parseTransactionDate(currentDate);

          // Payment method is in "Payment Type" column (newer) or "Business Expense" column (older)
          const paymentType = row['Subtotal'] ? row['Payment Type'] : row['Business Expense'];

          transactions.push({
            date: transactionDate,
            description: row.Desc.trim(),
            merchant: row.Merchant || null,
            paymentType: paymentType || null,
            amount: amount,
            currency: 'USD', // Florida expenses are always in USD
            isReimbursable: row.Reimbursable === 'Pending' || row.Reimbursable === 'X' || row.Reimbursement === 'Pending',
            isBusinessExpense: false,
            transactionType: 'expense',
            isFloridaExpense: true
          });
        }
      }
    }
  });

  return transactions;
}

function parseCSVTransactions(csvContent) {
  const parsedData = Papa.parse(csvContent, {
    header: true,
    dynamicTyping: false, // Keep as strings to preserve currency formatting
    skipEmptyLines: true
  });

  const transactions = [];
  let currentDate = null;
  let inMainSection = true;
  let currentCurrencyColumns = null;
  let currentHeaders = null;

  // Track which section we're in to skip pre-June 2017 data
  let foundJune2017 = false;

  // Parse main expense section
  parsedData.data.forEach((row, index) => {
    const firstCol = row[""] || row[Object.keys(row)[0]];

    // Detect if we've reached June 2017 or later
    if (!foundJune2017 && firstCol && typeof firstCol === 'string') {
      if (firstCol.includes('June 2017') ||
          firstCol.includes('July 2017') ||
          firstCol.match(/^(January|February|March|April|May|June|July|August|September|October|November|December) 20(17|18|19|20|21|22|23|24|25)/)) {
        foundJune2017 = true;
      }
    }

    // Skip all data before June 2017
    if (!foundJune2017) {
      return;
    }

    // Exit main section when we hit the first GRAND TOTAL
    if (firstCol && typeof firstCol === 'string' && firstCol.includes('GRAND TOTAL')) {
      inMainSection = false;
      return;
    }

    if (!inMainSection) {
      return;
    }

    // Detect header rows - these define the currency columns for following transactions
    if (row.Desc === 'Desc' && row.Merchant === 'Merchant') {
      currentHeaders = Object.keys(row);
      currentCurrencyColumns = detectCurrencyColumns(currentHeaders);
      return;
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
    if (row.Desc && currentDate && currentCurrencyColumns) {
      // Extract amount and currency from detected currency columns
      const result = extractAmountAndCurrency(row, currentCurrencyColumns, currentHeaders);

      if (!result || result.amount === 0) {
        // Skip zero-amount or unparseable transactions
        return;
      }

      const transactionDate = parseTransactionDate(currentDate);

      // Determine transaction type based on description and amount
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
        isReimbursable: row.Reimbursable === 'X' || row.Reimbursable === 'x',
        isBusinessExpense: !!(row['Business Expense'] || row['My Business Expense']),
        transactionType: transactionType,
        isFloridaExpense: false
      });
    }
  });

  // Parse income section
  const incomeTransactions = parseIncomeSection(parsedData.data);
  console.log(`📥 Found ${incomeTransactions.length} income transactions`);
  transactions.push(...incomeTransactions);

  // Parse Florida expenses section
  const floridaTransactions = parseFloridaExpensesSection(parsedData.data);
  console.log(`🏠 Found ${floridaTransactions.length} Florida house expenses`);
  transactions.push(...floridaTransactions);

  return transactions;
}

async function createTransactionWithTags(transaction, dbIds) {
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
      transaction_type: transaction.transactionType,
      transaction_date: transaction.date
    })
    .select('id')
    .single();

  if (transactionError || !newTransaction) {
    throw new Error(`Failed to create transaction: ${transaction.description} - ${transactionError?.message}`);
  }

  // Determine which tags to apply using existing tag system
  const tagNamesToApply = determineTransactionTags(transaction);
  const tagIds = [];

  // Get existing tag IDs (only use tags that exist in system)
  for (const tagName of tagNamesToApply) {
    const tagId = await getExistingTag(tagName, dbIds.userId, dbIds.tags);
    if (tagId) {
      tagIds.push(tagId);
    } else {
      console.warn(`⚠️  Tag "${tagName}" not found in system, skipping`);
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

  // Enhanced logging with tag info
  const appliedTags = tagNamesToApply.filter(tagName =>
    dbIds.tags.has(tagName)
  );
  const tagDisplay = appliedTags.length > 0 ? ` | Tags: ${appliedTags.join(', ')}` : '';

  console.log(`✅ ${transaction.description} | ${transaction.amount} ${transaction.currency} | ${transaction.transactionType}${tagDisplay}`);
}

async function main() {
  const csvFilePath = process.argv[2];

  if (!csvFilePath) {
    console.error('❌ Usage: node run-import.js <csv-file-path>');
    console.error('   Example: node run-import.js "csv_imports/fullImport_20251017.csv"');
    process.exit(1);
  }

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File not found: ${csvFilePath}`);
    process.exit(1);
  }

  console.log('🚀 Starting CSV import for Joot App (June 2017 - Present)...\n');

  try {
    // Read and parse CSV
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    console.log('📄 CSV file loaded');

    const transactions = parseCSVTransactions(csvContent);
    console.log(`📊 Parsed ${transactions.length} transactions\n`);

    if (transactions.length === 0) {
      console.log('⚠️  No transactions found in CSV file');
      return;
    }

    // Get user ID
    const userId = await getUserId(USER_EMAIL);
    console.log(`👤 Found user: ${USER_EMAIL}\n`);

    // Initialize database ID maps
    const dbIds = {
      userId,
      vendors: new Map(),
      paymentMethods: new Map(),
      tags: new Map()
    };

    // Import transactions
    console.log('💾 Importing transactions...\n');
    let successCount = 0;

    for (const transaction of transactions) {
      try {
        await createTransactionWithTags(transaction, dbIds);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to import: ${transaction.description} - ${error.message}`);
      }
    }

    console.log(`\n🎉 Import completed!`);
    console.log(`   ✅ Successfully imported: ${successCount}/${transactions.length} transactions`);

    if (successCount < transactions.length) {
      console.log(`   ⚠️  Failed imports: ${transactions.length - successCount}`);
    }

    // Summary stats
    const currencyStats = transactions.reduce((acc, t) => {
      acc[t.currency] = (acc[t.currency] || 0) + 1;
      return acc;
    }, {});

    console.log(`\n📊 Summary:`);
    Object.entries(currencyStats).forEach(([currency, count]) => {
      console.log(`   ${currency}: ${count} transactions`);
    });

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

main();
