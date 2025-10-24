import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: '/Users/dennis/Code Projects/joot-app/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const { data: user } = await supabase.from('users').select('id').eq('email', 'dennis@dsil.design').single();

// Get some sample transactions
const { data: txs } = await supabase
  .from('transactions')
  .select('id, description, amount, transaction_type, original_currency')
  .eq('user_id', user.id)
  .gte('transaction_date', '2025-05-01')
  .lte('transaction_date', '2025-05-31')
  .order('transaction_type');

console.log('\n=== Sample May 2025 Transactions ===\n');

const expenses = txs.filter(t => t.transaction_type === 'expense');
const income = txs.filter(t => t.transaction_type === 'income');

console.log('First 5 EXPENSES:');
expenses.slice(0, 5).forEach(t => {
  const desc = t.description ? t.description.substring(0, 30) : 'N/A';
  console.log(`  ${desc} | Amount: ${t.amount} | Currency: ${t.original_currency}`);
});

console.log('\nFirst 5 INCOME:');
income.slice(0, 5).forEach(t => {
  const desc = t.description ? t.description.substring(0, 30) : 'N/A';
  console.log(`  ${desc} | Amount: ${t.amount} | Currency: ${t.original_currency}`);
});

console.log('\nLast 5 INCOME:');
income.slice(-5).forEach(t => {
  const desc = t.description ? t.description.substring(0, 30) : 'N/A';
  console.log(`  ${desc} | Amount: ${t.amount} | Currency: ${t.original_currency}`);
});

console.log('\nIncome breakdown:');
const usdIncome = income.filter(t => t.original_currency === 'USD');
const thbIncome = income.filter(t => t.original_currency === 'THB');
const usdSum = usdIncome.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
const thbSum = thbIncome.reduce((s, t) => s + parseFloat(t.amount || 0), 0);

console.log(`  USD Income (${usdIncome.length}): $${usdSum.toFixed(2)}`);
console.log(`  THB Income (${thbIncome.length}): $${thbSum.toFixed(2)}`);
console.log(`  Total Income: $${(usdSum + thbSum).toFixed(2)}`);

process.exit(0);
