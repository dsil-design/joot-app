require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Get all August 2024 transactions
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      amount,
      original_currency,
      transaction_type,
      transaction_date,
      vendor:vendors(name),
      transaction_tags(
        tags(name)
      )
    `)
    .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
    .gte('transaction_date', '2024-08-01')
    .lte('transaction_date', '2024-08-31');

  if (txError) {
    console.error('Error:', txError);
    process.exit(1);
  }

  // Count tags
  const tagCounts = {};
  transactions.forEach(t => {
    if (t.transaction_tags && t.transaction_tags.length > 0) {
      t.transaction_tags.forEach(tt => {
        const tagName = tt.tags ? tt.tags.name : 'Unknown';
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      });
    }
  });

  // Currency breakdown
  const currencyCount = {};
  transactions.forEach(t => {
    currencyCount[t.original_currency] = (currencyCount[t.original_currency] || 0) + 1;
  });

  console.log('========================================');
  console.log('AUGUST 2024 IMPORT VERIFICATION - COMPLETE');
  console.log('========================================\n');
  console.log('Total transactions:', transactions.length);
  console.log('Expected: 214');
  console.log('Match:', transactions.length === 214 ? '✅ EXACT MATCH' : '❌ MISMATCH');
  console.log('');
  
  console.log('Tag Distribution:');
  Object.entries(tagCounts).forEach(([tag, count]) => {
    console.log('  ' + tag + ': ' + count);
  });
  console.log('Tagged transactions:', transactions.filter(t => t.transaction_tags.length > 0).length);
  console.log('');

  console.log('Currency Distribution:');
  Object.entries(currencyCount).forEach(([curr, count]) => {
    const pct = ((count / transactions.length) * 100).toFixed(1);
    console.log('  ' + curr + ': ' + count + ' (' + pct + '%)');
  });
  console.log('');

  // Find critical transactions
  const rent = transactions.find(t => t.description && t.description.includes('Rent'));
  const pool = transactions.find(t => t.description === 'Pool');
  const floridaHouse = transactions.find(t => t.description === 'Florida House');
  const vndCoffee = transactions.find(t => 
    t.description === 'Coffee' && 
    t.vendor && t.vendor.name === 'Dabao Concept'
  );

  console.log('Critical Transaction Verification:');
  console.log('');
  console.log('1. Rent (THB 25000):');
  if (rent) {
    console.log('   ✅ Found: Amount=' + rent.amount + ', Currency=' + rent.original_currency);
    console.log('   ' + (rent.amount === 25000 && rent.original_currency === 'THB' ? '✅ CORRECT' : '❌ INCORRECT'));
  } else {
    console.log('   ❌ NOT FOUND');
  }

  console.log('');
  console.log('2. Pool Winnings (THB 100, income):');
  if (pool) {
    console.log('   ✅ Found: Amount=' + pool.amount + ', Currency=' + pool.original_currency + ', Type=' + pool.transaction_type);
    console.log('   ' + (pool.amount === 100 && pool.original_currency === 'THB' && pool.transaction_type === 'income' ? '✅ CORRECT' : '❌ INCORRECT'));
  } else {
    console.log('   ❌ NOT FOUND');
  }

  console.log('');
  console.log('3. Florida House ($1000, comma parsed):');
  if (floridaHouse) {
    console.log('   ✅ Found: Amount=' + floridaHouse.amount + ', Currency=' + floridaHouse.original_currency);
    console.log('   ' + (floridaHouse.amount === 1000 && floridaHouse.original_currency === 'USD' ? '✅ CORRECT' : '❌ INCORRECT'));
  } else {
    console.log('   ❌ NOT FOUND');
  }

  console.log('');
  console.log('4. VND Coffee (VND 55000) - FIRST VND EVER!:');
  if (vndCoffee) {
    console.log('   ✅✅✅ Found: Amount=' + vndCoffee.amount + ', Currency=' + vndCoffee.original_currency);
    console.log('   Vendor: ' + (vndCoffee.vendor ? vndCoffee.vendor.name : 'N/A'));
    console.log('   Date: ' + vndCoffee.transaction_date);
    console.log('   ' + (vndCoffee.amount === 55000 && vndCoffee.original_currency === 'VND' ? '✅✅✅ FIRST VND TRANSACTION IN DATABASE!' : '❌ INCORRECT'));
  } else {
    console.log('   ❌ CRITICAL ERROR: NOT FOUND');
  }

  console.log('');
  console.log('Expected vs Actual Summary:');
  console.log('  Total: ' + (transactions.length === 214 ? '✅' : '❌') + ' 214 expected, ' + transactions.length + ' actual');
  console.log('  VND transactions: ' + (currencyCount.VND === 1 ? '✅✅✅' : '❌') + ' 1 expected, ' + (currencyCount.VND || 0) + ' actual');
  console.log('  Reimbursement tags: ' + ((tagCounts.Reimbursement || 0) === 3 ? '✅' : '❌') + ' 3 expected, ' + (tagCounts.Reimbursement || 0) + ' actual');
  console.log('  Savings/Investment tags: ' + ((tagCounts['Savings/Investment'] || 0) === 1 ? '✅' : '❌') + ' 1 expected, ' + (tagCounts['Savings/Investment'] || 0) + ' actual');
  console.log('  Florida House tags: ' + ((tagCounts['Florida House'] || 0) === 0 ? '✅' : '❌') + ' 0 expected, ' + (tagCounts['Florida House'] || 0) + ' actual');
  console.log('  Business Expense tags: ' + ((tagCounts['Business Expense'] || 0) === 0 ? '✅' : '❌') + ' 0 expected, ' + (tagCounts['Business Expense'] || 0) + ' actual');
  
  console.log('');
  console.log('PHASE 3 STATUS:', 
    transactions.length === 214 &&
    (currencyCount.VND || 0) === 1 &&
    (tagCounts.Reimbursement || 0) === 3 &&
    (tagCounts['Savings/Investment'] || 0) === 1 &&
    rent && rent.amount === 25000 &&
    pool && pool.amount === 100 &&
    floridaHouse && floridaHouse.amount === 1000 &&
    vndCoffee && vndCoffee.amount === 55000
    ? '✅ ALL VERIFICATIONS PASSED' : '⚠️ SOME CHECKS FAILED'
  );
  console.log('========================================');
})();
