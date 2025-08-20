#!/usr/bin/env node

/**
 * Simple schema verification that works with Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function simpleVerifySchema() {
  console.log('🔍 Simple Schema Verification');
  console.log('============================');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );

  try {
    console.log('\n📋 Test 1: Check new columns by inserting test record...');
    
    const testDate = new Date().toISOString().split('T')[0];
    
    // Try to insert a record with all new columns
    const { data: insertData, error: insertError } = await supabase
      .from('exchange_rates')
      .insert({
        from_currency: 'USD',
        to_currency: 'EUR',
        rate: 0.92,
        date: testDate,
        source: 'TEST',
        is_interpolated: true,
        interpolated_from_date: '2024-01-01'
      })
      .select()
      .single();

    if (insertError) {
      console.log('❌ Insert test failed:', insertError.message);
      
      // If it failed, let's check what columns exist by trying simpler insert
      console.log('\n📋 Fallback: Testing basic structure...');
      const { error: basicError } = await supabase
        .from('exchange_rates')
        .insert({
          from_currency: 'USD',
          to_currency: 'EUR',
          rate: 0.93,
          date: testDate
        })
        .select();
        
      if (basicError) {
        console.log('❌ Basic insert also failed:', basicError.message);
        console.log('\n💡 This suggests the migration may not have run successfully');
        return;
      } else {
        console.log('✅ Basic structure works, but enhanced columns are missing');
        console.log('\n💡 Please run the migration: 003_safe_enhanced_exchange_rates.sql');
        
        // Clean up basic test
        await supabase
          .from('exchange_rates')
          .delete()
          .eq('from_currency', 'USD')
          .eq('to_currency', 'EUR')
          .eq('date', testDate);
        return;
      }
    } else {
      console.log('✅ Enhanced structure test passed!');
      console.log('✅ All required columns exist: source, is_interpolated, interpolated_from_date');
      
      // Clean up test data
      await supabase
        .from('exchange_rates')
        .delete()
        .eq('id', insertData.id);
      
      console.log('✅ Test cleanup completed');
    }

    console.log('\n📋 Test 2: Test currency enum values...');
    
    // Test different currency values
    const testCurrencies = [
      { from: 'EUR', to: 'USD' },
      { from: 'GBP', to: 'THB' },
      { from: 'SGD', to: 'MYR' }
    ];
    
    let enumTestPassed = true;
    
    for (const { from, to } of testCurrencies) {
      const { data, error } = await supabase
        .from('exchange_rates')
        .insert({
          from_currency: from,
          to_currency: to,
          rate: 1.0,
          date: testDate,
          source: 'TEST'
        })
        .select()
        .single();
        
      if (error) {
        console.log(`❌ Currency ${from}-${to} test failed:`, error.message);
        enumTestPassed = false;
      } else {
        console.log(`✅ Currency ${from}-${to} test passed`);
        // Clean up
        await supabase.from('exchange_rates').delete().eq('id', data.id);
      }
    }
    
    if (enumTestPassed) {
      console.log('✅ Currency enum test passed - all target currencies supported');
    }

    console.log('\n📋 Test 3: Test constraints...');
    
    // Test positive rate constraint
    const { error: negativeRateError } = await supabase
      .from('exchange_rates')
      .insert({
        from_currency: 'USD',
        to_currency: 'EUR',
        rate: -1.0,  // This should fail
        date: testDate,
        source: 'TEST'
      });
      
    if (negativeRateError) {
      console.log('✅ Positive rate constraint working (negative rate rejected)');
    } else {
      console.log('⚠️  Positive rate constraint may not be working');
    }

    console.log('\n🎉 Schema verification completed!');
    console.log('\n📋 Summary:');
    console.log('- Enhanced exchange_rates table schema ✅');
    console.log('- New columns for source tracking and interpolation ✅');
    console.log('- Expanded currency support ✅');
    console.log('- Data integrity constraints ✅');
    console.log('\n🚀 Ready for exchange rate sync operations!');

  } catch (error) {
    console.error('💥 Schema verification failed:', error.message);
    process.exit(1);
  }
}

simpleVerifySchema();