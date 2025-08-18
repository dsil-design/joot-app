#!/usr/bin/env node

/**
 * Check what currency values are currently supported
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkEnumValues() {
  console.log('🔍 Checking Current Currency Enum Values');
  console.log('=========================================');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );

  // First, let's see what currencies work by testing existing data
  console.log('\n📋 Checking existing exchange_rates data...');
  
  const { data: existingData, error: existingError } = await supabase
    .from('exchange_rates')
    .select('from_currency, to_currency')
    .limit(5);

  if (existingError) {
    console.log('❌ Error fetching existing data:', existingError.message);
  } else {
    console.log('✅ Current data uses these currencies:');
    existingData.forEach(record => {
      console.log(`  ${record.from_currency} -> ${record.to_currency}`);
    });
    
    // Extract unique currencies from existing data
    const currencies = new Set();
    existingData.forEach(record => {
      currencies.add(record.from_currency);
      currencies.add(record.to_currency);
    });
    
    console.log('\nUnique currencies in database:', Array.from(currencies).join(', '));
  }

  // Test individual currencies to see which ones work
  console.log('\n📋 Testing individual currencies...');
  const testCurrencies = ['USD', 'THB', 'EUR', 'GBP', 'SGD', 'VND', 'MYR', 'BTC'];
  const workingCurrencies = [];
  const failingCurrencies = [];
  
  for (const currency of testCurrencies) {
    const { error } = await supabase
      .from('exchange_rates')
      .insert({
        from_currency: currency,
        to_currency: 'USD', // Use USD as target since we know it works
        rate: 1.0,
        date: '2024-01-01'
      })
      .select();
      
    if (error) {
      if (error.message.includes('invalid input value for enum')) {
        failingCurrencies.push(currency);
        console.log(`❌ ${currency} - not supported`);
      } else {
        console.log(`⚠️  ${currency} - other error:`, error.message);
      }
    } else {
      workingCurrencies.push(currency);
      console.log(`✅ ${currency} - supported`);
      
      // Clean up test record
      await supabase
        .from('exchange_rates')
        .delete()
        .eq('from_currency', currency)
        .eq('to_currency', 'USD')
        .eq('date', '2024-01-01');
    }
  }
  
  console.log('\n📋 Summary:');
  console.log(`✅ Working currencies: ${workingCurrencies.join(', ')}`);
  console.log(`❌ Missing currencies: ${failingCurrencies.join(', ')}`);
  
  if (failingCurrencies.length > 0) {
    console.log('\n💡 Solution: Need to add missing currencies to the enum');
    console.log('Run this SQL in Supabase:');
    console.log('');
    
    failingCurrencies.forEach(currency => {
      console.log(`ALTER TYPE currency_type ADD VALUE '${currency}';`);
    });
  }
}

checkEnumValues().catch(console.error);