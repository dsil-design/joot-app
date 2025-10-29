const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/dennis/Code Projects/joot-app/.env.local' });
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JANUARY_2025_START = '2025-01-01';
const JANUARY_2025_END = '2025-01-31';

async function queryDatabase() {
  console.log('Querying January 2025 transactions from database...\n');

  // Query all January 2025 transactions
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('transaction_date', JANUARY_2025_START)
    .lte('transaction_date', JANUARY_2025_END)
    .order('transaction_date', { ascending: true });

  if (error) {
    console.error('Database query error:', error);
    return null;
  }

  console.log('=== LEVEL 3: TRANSACTION COUNT VERIFICATION ===');
  console.log('Total transactions in database: ' + transactions.length);
  console.log('Expected from parse report: 195');
  console.log('Match: ' + (transactions.length === 195 ? 'YES' : 'NO'));

  // Separate by type
  const expenses = transactions.filter(t => t.transaction_type === 'expense');
  const income = transactions.filter(t => t.transaction_type === 'income');

  console.log('\nBreakdown by type:');
  console.log('- Expenses: ' + expenses.length);
  console.log('- Income: ' + income.length);

  // Count by currency
  const usd = transactions.filter(t => t.original_currency === 'USD');
  const thb = transactions.filter(t => t.original_currency === 'THB');
  console.log('\nBreakdown by currency:');
  console.log('- USD: ' + usd.length);
  console.log('- THB: ' + thb.length);

  // Find critical transactions
  console.log('\n=== LEVEL 5: CRITICAL TRANSACTION SPOT CHECKS ===');

  // Rent #1
  const rent1 = transactions.find(t =>
    t.transaction_date === '2025-01-02' && t.description === 'This Month\'s Rent'
  );
  console.log('Rent #1 (Jan 2): ' + (rent1 ? 'FOUND' : 'NOT FOUND'));
  if (rent1) {
    console.log('  Amount: ' + rent1.amount + ' ' + rent1.original_currency);
    console.log('  Type: ' + rent1.transaction_type);
  }

  // Rent #2
  const rent2 = transactions.find(t =>
    t.transaction_date === '2025-01-31' && t.description === 'First Month\'s Rent'
  );
  console.log('Rent #2 (Jan 31): ' + (rent2 ? 'FOUND' : 'NOT FOUND'));
  if (rent2) {
    console.log('  Amount: ' + rent2.amount + ' ' + rent2.original_currency);
    console.log('  Type: ' + rent2.transaction_type);
  }

  // Income adjustment
  const incomeAdj = transactions.find(t =>
    t.description === 'Business income correction - returned funds'
  );
  console.log('Income Adjustment (Expense): ' + (incomeAdj ? 'FOUND' : 'NOT FOUND'));
  if (incomeAdj) {
    console.log('  Amount: ' + incomeAdj.amount + ' ' + incomeAdj.original_currency);
    console.log('  Type: ' + incomeAdj.transaction_type);
    console.log('  Date: ' + incomeAdj.transaction_date);
  }

  // Show sample largest transactions
  console.log('\nLargest 5 transactions:');
  const sorted = [...transactions].sort((a, b) => b.amount - a.amount);
  sorted.slice(0, 5).forEach((t, i) => {
    console.log((i + 1) + '. ' + t.transaction_date + ' | ' + t.description.substring(0, 30) + ' | ' + t.amount + ' ' + t.original_currency);
  });

  return {
    transactions,
    expenses,
    income,
    usd,
    thb,
    rent1,
    rent2,
    incomeAdj,
    transactionCount: transactions.length
  };
}

async function main() {
  try {
    const result = await queryDatabase();
    console.log('\nValidation data collected. Ready for comprehensive analysis.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
