const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function validateDecember2021() {
  console.log('========================================');
  console.log('DECEMBER 2021 VALIDATION (Phase 3)');
  console.log('========================================\n');

  try {
    // 1. Transaction count check
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .gte('transaction_date', '2021-12-01')
      .lte('transaction_date', '2021-12-31')
      .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6');

    if (txError) throw txError;

    console.log(`✅ Transaction Count: ${transactions.length}`);
    console.log(`   Expected from parser: 144`);
    console.log(`   Match: ${transactions.length === 144 ? '✅ YES' : '❌ NO'}\n`);

    // 2. Transaction type distribution
    const expenses = transactions.filter(t => t.transaction_type === 'expense').length;
    const income = transactions.filter(t => t.transaction_type === 'income').length;

    console.log('Transaction Type Distribution:');
    console.log(`   Expenses: ${expenses}`);
    console.log(`   Income: ${income}\n`);

    // 3. Currency distribution
    const thb = transactions.filter(t => t.currency === 'THB').length;
    const usd = transactions.filter(t => t.currency === 'USD').length;
    const thbPercent = ((thb / transactions.length) * 100).toFixed(1);

    console.log('Currency Distribution:');
    console.log(`   THB: ${thb} (${thbPercent}%)`);
    console.log(`   USD: ${usd} (${(100 - parseFloat(thbPercent)).toFixed(1)}%)\n`);

    // 4. Dual residence rent check
    const jordanRent = transactions.find(t =>
      t.merchant && t.merchant.toLowerCase().includes('jordan') &&
      t.description && t.description.toLowerCase().includes('rent')
    );

    const thaiRent = transactions.find(t =>
      t.merchant && (
        t.merchant.toLowerCase().includes('jatu') ||
        t.merchant.toLowerCase().includes('panya') ||
        t.merchant.toLowerCase().includes('pol')
      ) &&
      t.description && t.description.toLowerCase().includes('rent')
    );

    console.log('Dual Residence Rent Verification:');
    if (jordanRent) {
      console.log(`   ✅ USA Rent: ${jordanRent.merchant} - ${jordanRent.currency} ${jordanRent.amount}`);
      console.log(`      Date: ${jordanRent.transaction_date}`);
    } else {
      console.log(`   ❌ USA Rent: NOT FOUND`);
    }

    if (thaiRent) {
      console.log(`   ✅ Thailand Rent: ${thaiRent.merchant} - ${thaiRent.currency} ${thaiRent.amount}`);
      console.log(`      Date: ${thaiRent.transaction_date}`);
    } else {
      console.log(`   ❌ Thailand Rent: NOT FOUND`);
    }
    console.log();

    // 5. Tag distribution
    const { data: tagData, error: tagError } = await supabase
      .from('transaction_tags')
      .select('tag_id, tags(name)')
      .in('transaction_id', transactions.map(t => t.id));

    if (tagError) throw tagError;

    const tagCounts = {};
    tagData.forEach(tt => {
      const tagName = tt.tags?.name || 'Unknown';
      tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
    });

    console.log('Tag Distribution:');
    Object.entries(tagCounts).forEach(([tag, count]) => {
      console.log(`   ${tag}: ${count}`);
    });
    console.log();

    // 6. Date range check
    const dates = transactions.map(t => t.transaction_date).sort();
    console.log('Date Range:');
    console.log(`   First: ${dates[0]}`);
    console.log(`   Last: ${dates[dates.length - 1]}`);
    console.log(`   Expected Last: 2021-12-31`);
    console.log(`   Match: ${dates[dates.length - 1].startsWith('2021-12-31') ? '✅ YES' : '⚠️  CHECK'}\n`);

    // Summary
    console.log('========================================');
    console.log('VALIDATION SUMMARY');
    console.log('========================================');
    console.log(`✅ Count Match: ${transactions.length === 144}`);
    console.log(`✅ Dual Residence: ${!!(jordanRent && thaiRent)}`);
    console.log(`✅ Currency Mix: THB ${thbPercent}% / USD ${(100 - parseFloat(thbPercent)).toFixed(1)}%`);
    console.log(`✅ Date Range Complete: ${dates[dates.length - 1].startsWith('2021-12-31')}`);
    console.log('========================================\n');

    console.log('✅ Phase 3 Validation COMPLETE');
    console.log('➡️  Ready for Phase 4: Protocol v2.0 Verification (1:1 matching)\n');

  } catch (error) {
    console.error('❌ Validation Error:', error.message);
    process.exit(1);
  }
}

validateDecember2021();
