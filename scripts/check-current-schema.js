#!/usr/bin/env node

/**
 * Check the current database schema to understand what exists
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkCurrentSchema() {
  console.log('🔍 Checking Current Database Schema');
  console.log('===================================');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
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
    // Try to query the exchange_rates table directly to see if it exists
    console.log('\n📋 Testing if exchange_rates table exists...');
    const { data: testData, error: testError } = await supabase
      .from('exchange_rates')
      .select('*')
      .limit(1);

    if (testError) {
      if (testError.message.includes('relation "public.exchange_rates" does not exist')) {
        console.log('❌ exchange_rates table does not exist');
        console.log('\n💡 Solution: We need to create the complete table from scratch');
        
        // Check if we have any migrations
        console.log('\n📋 Checking existing migrations...');
        const { data: migrations, error: migError } = await supabase
          .from('supabase_migrations.schema_migrations')
          .select('*')
          .catch(() => ({ data: [], error: { message: 'No migrations table found' } }));
        
        if (migError) {
          console.log('⚠️  No migrations found:', migError.message);
        } else {
          console.log(`Found ${migrations.length} existing migrations`);
          migrations.forEach(mig => console.log(`  - ${mig.version}: ${mig.name || 'unnamed'}`));
        }
        return;
      } else {
        console.log('❌ Error querying table:', testError.message);
        return;
      }
    }

    console.log('✅ exchange_rates table exists');
    
    if (testData.length === 0) {
      console.log('📊 Table is empty');
      
      // Try to describe the table structure by attempting to insert a test record
      console.log('\n📋 Discovering table structure...');
      const { error: insertError } = await supabase
        .from('exchange_rates')
        .insert({
          from_currency: 'USD',
          to_currency: 'EUR', 
          rate: 0.85,
          date: '2024-01-01'
        });
        
      if (insertError) {
        console.log('Table structure test failed:', insertError.message);
        
        // Try with basic structure
        const { error: basicError } = await supabase
          .from('exchange_rates')
          .insert({
            currency_from: 'USD',
            currency_to: 'EUR',
            exchange_rate: 0.85,
            rate_date: '2024-01-01'
          });
          
        if (basicError) {
          console.log('Basic structure test also failed:', basicError.message);
        } else {
          console.log('✅ Basic structure works - table has currency_from, currency_to, exchange_rate, rate_date columns');
          // Clean up
          await supabase.from('exchange_rates').delete().eq('currency_from', 'USD');
        }
      } else {
        console.log('✅ Enhanced structure works - table has from_currency, to_currency, rate, date columns');
        // Clean up
        await supabase.from('exchange_rates').delete().eq('from_currency', 'USD');
      }
    } else {
      console.log('Sample record structure:');
      console.log(JSON.stringify(testData[0], null, 2));
    }

  } catch (error) {
    console.error('💥 Schema check failed:', error.message);
    process.exit(1);
  }
}

checkCurrentSchema();