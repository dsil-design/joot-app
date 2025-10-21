#!/usr/bin/env node

/**
 * Verification Script for CSV Import
 * Checks that transactions were imported correctly into Joot database
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

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

async function verifyImport() {
  console.log('🔍 Verifying CSV import results...\n');

  try {
    // Get user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', USER_EMAIL)
      .single();

    if (userError || !user) {
      console.error(`❌ User not found: ${USER_EMAIL}`);
      return;
    }

    console.log(`👤 User: ${user.email} (${user.id})\n`);

    // Check total transactions
    const { count: totalTransactions, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('❌ Error counting transactions:', countError.message);
      return;
    }

    console.log(`📊 Total Transactions: ${totalTransactions}\n`);

    if (totalTransactions === 0) {
      console.log('⚠️  No transactions found. Import may have failed.');
      return;
    }

    // Currency breakdown
    const { data: currencyStats, error: currencyError } = await supabase
      .from('transactions')
      .select('original_currency')
      .eq('user_id', user.id);

    if (!currencyError && currencyStats) {
      const breakdown = currencyStats.reduce((acc, t) => {
        acc[t.original_currency] = (acc[t.original_currency] || 0) + 1;
        return acc;
      }, {});

      console.log('💱 Currency Breakdown:');
      Object.entries(breakdown).forEach(([currency, count]) => {
        console.log(`   ${currency}: ${count} transactions`);
      });
      console.log();
    }

    // Transaction type breakdown
    const { data: typeStats, error: typeError } = await supabase
      .from('transactions')
      .select('transaction_type')
      .eq('user_id', user.id);

    if (!typeError && typeStats) {
      const typeBreakdown = typeStats.reduce((acc, t) => {
        acc[t.transaction_type] = (acc[t.transaction_type] || 0) + 1;
        return acc;
      }, {});

      console.log('📋 Transaction Type Breakdown:');
      Object.entries(typeBreakdown).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} transactions`);
      });
      console.log();
    }

    // Vendors created
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select('name')
      .eq('user_id', user.id)
      .order('name');

    if (!vendorError && vendors) {
      console.log(`🏪 Vendors Created (${vendors.length}):`);
      vendors.slice(0, 10).forEach(v => console.log(`   - ${v.name}`));
      if (vendors.length > 10) {
        console.log(`   ... and ${vendors.length - 10} more`);
      }
      console.log();
    }

    // Payment methods created
    const { data: paymentMethods, error: paymentError } = await supabase
      .from('payment_methods')
      .select('name')
      .eq('user_id', user.id)
      .order('name');

    if (!paymentError && paymentMethods) {
      console.log(`💳 Payment Methods Created (${paymentMethods.length}):`);
      paymentMethods.forEach(pm => console.log(`   - ${pm.name}`));
      console.log();
    }

    // Tags applied
    const { data: tagsWithCounts, error: tagError } = await supabase
      .from('tags')
      .select('name, color')
      .eq('user_id', user.id);

    if (!tagError && tagsWithCounts) {
      console.log(`🏷️  Available Tags (${tagsWithCounts.length}):`);
      for (const tag of tagsWithCounts) {
        // Get usage count for each tag
        const { count: tagUsageCount } = await supabase
          .rpc('count_tag_usage', { tag_name: tag.name, user_uuid: user.id })
          .catch(async () => {
            // Fallback method if RPC doesn't exist
            const tagId = (await supabase
              .from('tags')
              .select('id')
              .eq('name', tag.name)
              .eq('user_id', user.id)
              .single()).data?.id;

            return await supabase
              .from('transaction_tags')
              .select('*', { count: 'exact', head: true })
              .eq('tag_id', tagId);
          });

        console.log(`   - ${tag.name} (${tag.color}): ${tagUsageCount || 0} uses`);
      }
      console.log();
    }

    // Check for specific expected tags for dennis@dsil.design
    if (user.email === 'dennis@dsil.design') {
      console.log('🎯 Expected Tags for dennis@dsil.design:');
      const expectedTags = ['Reimburseable', 'Business Expense', 'Florida Villa'];
      for (const expectedTag of expectedTags) {
        const found = tagsWithCounts?.find(t => t.name === expectedTag);
        if (found) {
          console.log(`   ✅ ${expectedTag} - Found`);
        } else {
          console.log(`   ❌ ${expectedTag} - Missing (import may not work correctly)`);
        }
      }
      console.log();
    }

    // Recent transactions sample
    const { data: recentTransactions, error: recentError } = await supabase
      .from('transactions')
      .select(`
        description,
        amount,
        original_currency,
        transaction_type,
        transaction_date,
        vendors(name),
        payment_methods(name)
      `)
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(5);

    if (!recentError && recentTransactions) {
      console.log('🔄 Recent Transactions Sample:');
      recentTransactions.forEach(t => {
        const vendor = t.vendors?.name || 'No vendor';
        const payment = t.payment_methods?.name || 'No payment method';
        console.log(`   ${t.transaction_date} | ${t.description} | ${t.amount} ${t.original_currency} | ${t.transaction_type} | ${vendor} | ${payment}`);
      });
      console.log();
    }

    // Date range check
    const { data: dateRange, error: dateError } = await supabase
      .from('transactions')
      .select('transaction_date')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: true });

    if (!dateError && dateRange && dateRange.length > 0) {
      const firstDate = dateRange[0].transaction_date;
      const lastDate = dateRange[dateRange.length - 1].transaction_date;
      console.log(`📅 Date Range: ${firstDate} to ${lastDate}\n`);
    }

    // Data integrity checks
    console.log('🔍 Data Integrity Checks:');

    // Check for transactions without amounts
    const { count: noAmountCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .or('amount.is.null,amount.eq.0');

    console.log(`   Transactions with zero/null amounts: ${noAmountCount || 0}`);

    // Check for transactions without descriptions
    const { count: noDescCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .or('description.is.null,description.eq.');

    console.log(`   Transactions without descriptions: ${noDescCount || 0}`);

    // Check for transactions with invalid dates
    const { count: invalidDateCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('transaction_date', null);

    console.log(`   Transactions with invalid dates: ${invalidDateCount || 0}`);

    console.log('\n✅ Verification completed successfully!');

    if ((noAmountCount || 0) + (noDescCount || 0) + (invalidDateCount || 0) === 0) {
      console.log('🎉 All data integrity checks passed!');
    } else {
      console.log('⚠️  Some data integrity issues found. Review the transactions above.');
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
  }
}

async function showQuickStats() {
  try {
    // Quick database health check
    const { data: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { data: transactionCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    console.log('📊 Database Quick Stats:');
    console.log(`   Total Users: ${userCount || 0}`);
    console.log(`   Total Transactions: ${transactionCount || 0}`);
    console.log();

  } catch (error) {
    console.error('❌ Could not fetch quick stats:', error.message);
  }
}

async function main() {
  const command = process.argv[2];

  if (command === 'stats') {
    await showQuickStats();
  } else {
    await verifyImport();
  }
}

if (require.main === module) {
  main();
}
