require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const startDate = '2024-08-01';
  const endDate = '2024-08-31';

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      id,
      description,
      merchant,
      amount,
      transaction_type,
      transaction_date,
      transaction_tags (
        tags (
          id,
          name
        )
      )
    `)
    .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  const tagCounts = {};
  transactions.forEach(t => {
    if (t.transaction_tags && t.transaction_tags.length > 0) {
      t.transaction_tags.forEach(tt => {
        const tagName = tt.tags ? tt.tags.name : 'Unknown';
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      });
    }
  });

  console.log('========================================');
  console.log('AUGUST 2024 IMPORT VERIFICATION');
  console.log('========================================');
  console.log('Total transactions:', transactions.length);
  console.log('Tagged transactions:', transactions.filter(t => t.transaction_tags && t.transaction_tags.length > 0).length);
  console.log('');
  console.log('Tag Distribution:');
  Object.entries(tagCounts).forEach(([tag, count]) => {
    console.log('  ' + tag + ': ' + count);
  });
  console.log('');

  // Find critical transactions
  const rent = transactions.find(t => t.description && t.description.includes('Rent'));
  const pool = transactions.find(t => t.description === 'Pool');
  const floridaHouse = transactions.find(t => t.description === 'Florida House');
  const coffee = transactions.find(t => t.description === 'Coffee' && t.merchant === 'Dabao Concept');

  console.log('Critical Transactions:');
  console.log('  Rent:', rent ? 'Found (Amount: ' + rent.amount + ')' : 'NOT FOUND');
  console.log('  Pool (winnings):', pool ? 'Found (Amount: ' + pool.amount + ', Type: ' + pool.transaction_type + ')' : 'NOT FOUND');
  console.log('  Florida House:', floridaHouse ? 'Found (Amount: ' + floridaHouse.amount + ')' : 'NOT FOUND');
  console.log('  Coffee (Dabao):', coffee ? 'Found (Amount: ' + coffee.amount + ') NOTE: VND transaction!' : 'NOT FOUND');
  
  console.log('');
  console.log('Expected vs Actual:');
  console.log('  Total: 214 expected, ' + transactions.length + ' actual ' + (transactions.length === 214 ? '✅' : '❌'));
  console.log('  Reimbursement tags: 3 expected, ' + (tagCounts['Reimbursement'] || 0) + ' actual ' + ((tagCounts['Reimbursement'] || 0) === 3 ? '✅' : '❌'));
  console.log('  Savings/Investment tags: 1 expected, ' + (tagCounts['Savings/Investment'] || 0) + ' actual ' + ((tagCounts['Savings/Investment'] || 0) === 1 ? '✅' : '❌'));
  console.log('  Florida House tags: 0 expected, ' + (tagCounts['Florida House'] || 0) + ' actual ' + ((tagCounts['Florida House'] || 0) === 0 ? '✅' : '❌'));
  console.log('  Business Expense tags: 0 expected, ' + (tagCounts['Business Expense'] || 0) + ' actual ' + ((tagCounts['Business Expense'] || 0) === 0 ? '✅' : '❌'));
  
  console.log('');
  console.log('  Rent (THB 25000): ' + (rent && rent.amount === 25000 ? '✅ Correct' : '❌ Incorrect'));
  console.log('  Pool winnings (THB 100, income): ' + (pool && pool.amount === 100 && pool.transaction_type === 'income' ? '✅ Correct' : '❌ Incorrect'));
  console.log('  Florida House ($1000): ' + (floridaHouse && floridaHouse.amount === 1000 ? '✅ Correct' : '❌ Incorrect'));
  console.log('  Coffee VND 55000: ' + (coffee && coffee.amount === 55000 ? '✅✅✅ FIRST VND EVER!' : '❌ Incorrect'));
  console.log('========================================');
})();
