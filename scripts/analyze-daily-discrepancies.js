#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const EXCHANGE_RATE = 0.0291;

function convertToUSD(amount, currency) {
  return currency === 'THB' ? amount * EXCHANGE_RATE : amount;
}

(async () => {
  const { data: txns } = await supabase
    .from('transactions')
    .select('*, vendors(name)')
    .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
    .in('transaction_date', ['2024-12-07', '2024-12-10'])
    .order('transaction_date')
    .order('id');

  const { data: txnTags } = await supabase
    .from('transaction_tags')
    .select('transaction_id, tags(name)')
    .in('transaction_id', txns.map(t => t.id));

  const tagMap = {};
  (txnTags || []).forEach(tt => {
    if (!tagMap[tt.transaction_id]) tagMap[tt.transaction_id] = [];
    tagMap[tt.transaction_id].push(tt.tags.name);
  });

  const enriched = txns.map(t => ({
    ...t,
    merchant: t.vendors?.name,
    currency: t.original_currency,
    tags: tagMap[t.id] || []
  }));

  // Group by date
  ['2024-12-07', '2024-12-10'].forEach(date => {
    console.log(`\n=== ${date} ===`);
    const dateTxns = enriched.filter(t => t.transaction_date === date);
    let total = 0;

    dateTxns.forEach(t => {
      const hasFloridaHouse = t.tags.includes('Florida House');
      const hasSavings = t.tags.includes('Savings') || t.tags.includes('Investment');
      const isGrossIncome = t.transaction_type === 'income' && (t.merchant === 'DSIL Design' || t.merchant === 'NJDA');

      if (hasFloridaHouse || hasSavings || isGrossIncome) {
        console.log(`  [EXCLUDED] ${t.description} - ${t.merchant} - ${t.amount} ${t.currency} (type: ${t.transaction_type}, tags: ${t.tags.join(', ')})`);
        return;
      }

      const usdAmount = convertToUSD(t.amount, t.currency);
      const contrib = t.transaction_type === 'expense' ? usdAmount : -usdAmount;
      total += contrib;

      console.log(`  ${t.description} - ${t.merchant} - ${t.amount} ${t.currency} = ${contrib.toFixed(2)} USD (type: ${t.transaction_type})`);
    });

    console.log(`  TOTAL: $${total.toFixed(2)}`);
  });
})();
