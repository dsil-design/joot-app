#!/usr/bin/env node

/**
 * Transaction Cleanup Script for Joot App
 * Helps identify and delete transactions based on various criteria
 *
 * Usage:
 *   node cleanup-transactions.js preview                    - Preview what would be deleted
 *   node cleanup-transactions.js delete-all                 - Delete ALL transactions (careful!)
 *   node cleanup-transactions.js delete-before 2025-01-01   - Delete before specific date
 *   node cleanup-transactions.js delete-after 2025-12-31    - Delete after specific date
 *   node cleanup-transactions.js delete-range 2025-01-01 2025-01-31 - Delete date range
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = 'dennis@dsil.design';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

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

async function getTransactionsToDelete(userId, criteria) {
  let query = supabase
    .from('transactions')
    .select('id, description, amount, original_currency, transaction_date, transaction_type')
    .eq('user_id', userId);

  if (criteria.beforeDate) {
    query = query.lt('transaction_date', criteria.beforeDate);
  }

  if (criteria.afterDate) {
    query = query.gt('transaction_date', criteria.afterDate);
  }

  if (criteria.startDate && criteria.endDate) {
    query = query.gte('transaction_date', criteria.startDate).lte('transaction_date', criteria.endDate);
  }

  const { data, error } = await query.order('transaction_date', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  return data || [];
}

async function deleteTransactions(transactionIds) {
  // First delete related transaction_tags
  const { error: tagsError } = await supabase
    .from('transaction_tags')
    .delete()
    .in('transaction_id', transactionIds);

  if (tagsError) {
    console.warn(`⚠️  Warning: Failed to delete some transaction tags: ${tagsError.message}`);
  }

  // Then delete the transactions
  const { error: transactionsError } = await supabase
    .from('transactions')
    .delete()
    .in('id', transactionIds);

  if (transactionsError) {
    throw new Error(`Failed to delete transactions: ${transactionsError.message}`);
  }
}

function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function previewDeletion(userId, criteria) {
  console.log('🔍 Analyzing transactions...\n');

  const transactions = await getTransactionsToDelete(userId, criteria);

  if (transactions.length === 0) {
    console.log('✅ No transactions found matching the criteria.');
    return;
  }

  console.log(`📊 Found ${transactions.length} transactions that would be deleted:\n`);

  // Group by date
  const byDate = transactions.reduce((acc, t) => {
    if (!acc[t.transaction_date]) {
      acc[t.transaction_date] = [];
    }
    acc[t.transaction_date].push(t);
    return acc;
  }, {});

  // Show summary by date
  console.log('Date Range Summary:');
  Object.keys(byDate).forEach(date => {
    const count = byDate[date].length;
    const total = byDate[date].reduce((sum, t) => sum + t.amount, 0);
    console.log(`  ${date}: ${count} transactions (total: ${total.toFixed(2)})`);
  });

  console.log(`\n📅 Date Range: ${transactions[0].transaction_date} to ${transactions[transactions.length - 1].transaction_date}`);

  // Currency breakdown
  const currencyBreakdown = transactions.reduce((acc, t) => {
    acc[t.original_currency] = (acc[t.original_currency] || 0) + 1;
    return acc;
  }, {});

  console.log('\n💱 Currency Breakdown:');
  Object.entries(currencyBreakdown).forEach(([currency, count]) => {
    console.log(`  ${currency}: ${count} transactions`);
  });

  // Sample of transactions
  console.log('\n📋 Sample Transactions (first 10):');
  transactions.slice(0, 10).forEach(t => {
    console.log(`  ${t.transaction_date} | ${t.description.substring(0, 40).padEnd(40)} | ${t.amount} ${t.original_currency}`);
  });

  if (transactions.length > 10) {
    console.log(`  ... and ${transactions.length - 10} more`);
  }

  console.log('\n⚠️  To delete these transactions, run:');
  if (criteria.beforeDate) {
    console.log(`  node cleanup-transactions.js delete-before ${criteria.beforeDate}`);
  } else if (criteria.afterDate) {
    console.log(`  node cleanup-transactions.js delete-after ${criteria.afterDate}`);
  } else if (criteria.startDate && criteria.endDate) {
    console.log(`  node cleanup-transactions.js delete-range ${criteria.startDate} ${criteria.endDate}`);
  } else {
    console.log(`  node cleanup-transactions.js delete-all`);
  }
}

async function performDeletion(userId, criteria, skipConfirmation = false) {
  console.log('🔍 Finding transactions to delete...\n');

  const transactions = await getTransactionsToDelete(userId, criteria);

  if (transactions.length === 0) {
    console.log('✅ No transactions found matching the criteria.');
    return;
  }

  console.log(`⚠️  About to delete ${transactions.length} transactions!`);
  console.log(`📅 Date Range: ${transactions[0].transaction_date} to ${transactions[transactions.length - 1].transaction_date}\n`);

  // Show sample
  console.log('Sample of transactions to be deleted (first 5):');
  transactions.slice(0, 5).forEach(t => {
    console.log(`  ${t.transaction_date} | ${t.description.substring(0, 40)} | ${t.amount} ${t.original_currency}`);
  });

  if (transactions.length > 5) {
    console.log(`  ... and ${transactions.length - 5} more\n`);
  }

  if (!skipConfirmation) {
    console.log('\n⚠️  THIS ACTION CANNOT BE UNDONE!');
    const confirmed = await askConfirmation('Type "yes" to confirm deletion: ');

    if (!confirmed) {
      console.log('❌ Deletion cancelled.');
      return;
    }
  }

  console.log('\n🗑️  Deleting transactions...');

  // Delete in batches of 100
  const batchSize = 100;
  let deletedCount = 0;

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const batchIds = batch.map(t => t.id);

    try {
      await deleteTransactions(batchIds);
      deletedCount += batch.length;
      console.log(`  Deleted ${deletedCount}/${transactions.length} transactions...`);
    } catch (error) {
      console.error(`❌ Error deleting batch: ${error.message}`);
      console.log(`  Successfully deleted ${deletedCount} transactions before error.`);
      throw error;
    }
  }

  console.log(`\n✅ Successfully deleted ${deletedCount} transactions!`);
}

async function main() {
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];

  if (!command) {
    console.log('❌ Usage:');
    console.log('  node cleanup-transactions.js preview                    - Preview all transactions');
    console.log('  node cleanup-transactions.js delete-all                 - Delete ALL transactions');
    console.log('  node cleanup-transactions.js delete-before 2025-01-01   - Delete before specific date');
    console.log('  node cleanup-transactions.js delete-after 2025-12-31    - Delete after specific date');
    console.log('  node cleanup-transactions.js delete-range 2025-01-01 2025-01-31 - Delete date range');
    console.log('\nExamples:');
    console.log('  node cleanup-transactions.js preview');
    console.log('  node cleanup-transactions.js delete-before 2025-09-01');
    console.log('  node cleanup-transactions.js delete-range 2025-01-01 2025-08-31');
    process.exit(1);
  }

  try {
    const userId = await getUserId(USER_EMAIL);
    console.log(`👤 User: ${USER_EMAIL}\n`);

    let criteria = {};

    switch (command) {
      case 'preview':
        await previewDeletion(userId, criteria);
        break;

      case 'delete-all':
        console.log('⚠️  WARNING: This will delete ALL transactions for your account!\n');
        await performDeletion(userId, criteria);
        break;

      case 'delete-before':
        if (!arg1) {
          console.error('❌ Please specify a date (YYYY-MM-DD)');
          process.exit(1);
        }
        criteria.beforeDate = arg1;
        console.log(`Deleting transactions before ${arg1}...\n`);
        await performDeletion(userId, criteria);
        break;

      case 'delete-after':
        if (!arg1) {
          console.error('❌ Please specify a date (YYYY-MM-DD)');
          process.exit(1);
        }
        criteria.afterDate = arg1;
        console.log(`Deleting transactions after ${arg1}...\n`);
        await performDeletion(userId, criteria);
        break;

      case 'delete-range':
        if (!arg1 || !arg2) {
          console.error('❌ Please specify start and end dates (YYYY-MM-DD)');
          process.exit(1);
        }
        criteria.startDate = arg1;
        criteria.endDate = arg2;
        console.log(`Deleting transactions between ${arg1} and ${arg2}...\n`);
        await performDeletion(userId, criteria);
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run without arguments to see usage.');
        process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Operation failed:', error.message);
    process.exit(1);
  }
}

main();
