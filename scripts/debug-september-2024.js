const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/dennis/Code Projects/joot-app/.env.local' });
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SEPTEMBER_2024_START = '2024-09-01';
const SEPTEMBER_2024_END = '2024-09-30';
const USER_ID = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

async function debug() {
  console.log('=== DEBUGGING SEPTEMBER 2024 IMPORT ===\n');

  // Query all September 2024 transactions
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', USER_ID)
    .gte('transaction_date', SEPTEMBER_2024_START)
    .lte('transaction_date', SEPTEMBER_2024_END)
    .order('transaction_date', { ascending: true });

  if (error) {
    console.error('Query error:', error);
    return;
  }

  console.log('Total transactions: ' + transactions.length + '\n');

  // Search for rent-related transactions
  console.log('=== SEARCHING FOR RENT TRANSACTION ===');
  const rentKeywords = ['Rent', 'rent', 'monthly', 'Pol', 'pol'];
  const rentMatches = transactions.filter(t =>
    rentKeywords.some(kw => t.description && t.description.includes(kw))
  );
  console.log('Found ' + rentMatches.length + ' rent-related transactions:');
  rentMatches.forEach(t => {
    console.log('  ' + t.transaction_date + ' | ' + t.description + ' | ' + t.amount + ' ' + t.original_currency + ' | ' + t.transaction_type);
  });

  // List all transactions for Sept 1-10
  console.log('\n=== ALL TRANSACTIONS FOR SEPT 1-10 ===');
  const earlyMonth = transactions.filter(t => {
    const d = new Date(t.transaction_date);
    return d.getDate() <= 10;
  });
  console.log('Found ' + earlyMonth.length + ' transactions:');
  earlyMonth.forEach(t => {
    console.log('  ' + t.transaction_date + ' | ' + t.description.substring(0, 30) + ' | ' + t.amount + ' ' + t.original_currency + ' | ' + t.transaction_type);
  });

  // Check income transactions
  console.log('\n=== ALL INCOME TRANSACTIONS ===');
  const income = transactions.filter(t => t.transaction_type === 'income');
  console.log('Found ' + income.length + ' income transactions:');
  let incomeTotal = 0;
  income.forEach(t => {
    const amount = parseFloat(t.amount) || 0;
    const usdAmount = t.original_currency === 'USD' ? amount : amount * 0.0295;
    incomeTotal += usdAmount;
    console.log('  ' + t.transaction_date + ' | ' + t.description.substring(0, 30) + ' | ' + t.amount + ' ' + t.original_currency + ' | USD: $' + usdAmount.toFixed(2));
  });
  console.log('Total Income (USD): $' + incomeTotal.toFixed(2));
  console.log('Expected Income: $6,724.05');
  console.log('Variance: $' + Math.abs(incomeTotal - 6724.05).toFixed(2));

  // Check all amounts over $100
  console.log('\n=== LARGE TRANSACTIONS (>$100 USD) ===');
  const large = transactions.filter(t => {
    const amount = parseFloat(t.amount) || 0;
    const usdAmount = t.original_currency === 'USD' ? amount : amount * 0.0295;
    return usdAmount > 100;
  });
  console.log('Found ' + large.length + ' large transactions:');
  large.forEach(t => {
    const amount = parseFloat(t.amount) || 0;
    const usdAmount = t.original_currency === 'USD' ? amount : amount * 0.0295;
    console.log('  ' + t.transaction_date + ' | ' + t.description.substring(0, 30) + ' | ' + t.amount + ' ' + t.original_currency + ' | USD: $' + usdAmount.toFixed(2));
  });

  // Calculate expense totals (excluding tags)
  console.log('\n=== EXPENSE TOTALS BREAKDOWN ===');
  const expenses = transactions.filter(t => t.transaction_type === 'expense');
  let totalExpenses = 0;
  expenses.forEach(t => {
    const amount = parseFloat(t.amount) || 0;
    const usdAmount = t.original_currency === 'USD' ? amount : amount * 0.0295;
    totalExpenses += usdAmount;
  });
  console.log('Total Expenses (USD): $' + totalExpenses.toFixed(2));
  console.log('Expected Expense Tracker NET: $6,562.96');
  console.log('Expected Florida House: $195.16');
  console.log('Expected Savings/Investment: $341.67');
  console.log('Expected Total: $' + (6562.96 + 195.16 + 341.67).toFixed(2));
  console.log('Actual Total: $' + totalExpenses.toFixed(2));
  console.log('Variance: $' + Math.abs(totalExpenses - (6562.96 + 195.16 + 341.67)).toFixed(2));
}

debug();
