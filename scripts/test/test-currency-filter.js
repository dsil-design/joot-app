#!/usr/bin/env node

// Test script to verify currency filtering is working correctly

async function testCurrencyFilter() {
  console.log('🧪 Testing ECB currency filter...\n');

  try {
    // Fetch raw ECB data to see what's available
    const response = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml');
    const xmlText = await response.text();
    
    // Count total currencies in raw XML
    const totalCurrencies = (xmlText.match(/currency='/g) || []).length;
    console.log(`📊 Total currencies in ECB XML: ${totalCurrencies}`);
    
    // Extract all currency codes
    const currencyMatches = xmlText.matchAll(/currency='([A-Z]{3})'/g);
    const allCurrencies = new Set();
    for (const match of currencyMatches) {
      allCurrencies.add(match[1]);
    }
    console.log(`📋 All ECB currencies: ${Array.from(allCurrencies).sort().join(', ')}\n`);

    // Now test our filtered implementation
    const { ecbFetcher } = await import('../src/lib/services/ecb-fetcher.ts');
    
    console.log('🔄 Fetching rates with filter applied...');
    const result = await ecbFetcher.fetchDailyRates();
    
    if (result.success && result.data) {
      const uniqueCurrencies = new Set(result.data.map(r => r.currency));
      console.log(`✅ Filtered currencies: ${Array.from(uniqueCurrencies).sort().join(', ')}`);
      console.log(`📉 Filtered to ${uniqueCurrencies.size} currencies from ${allCurrencies.size} available`);
      console.log(`💾 Storage reduction: ${Math.round((1 - uniqueCurrencies.size / allCurrencies.size) * 100)}%`);
      
      // Verify we only have expected currencies
      const { VALID_ECB_CURRENCIES } = await import('../src/lib/types/exchange-rates.ts');
      const unexpectedCurrencies = Array.from(uniqueCurrencies).filter(c => !VALID_ECB_CURRENCIES.includes(c));
      
      if (unexpectedCurrencies.length > 0) {
        console.error(`❌ Unexpected currencies found: ${unexpectedCurrencies.join(', ')}`);
      } else {
        console.log('✅ All currencies match expected whitelist!');
      }
      
      // Check for missing expected currencies
      const missingCurrencies = VALID_ECB_CURRENCIES.filter(c => !uniqueCurrencies.has(c));
      if (missingCurrencies.length > 0) {
        console.warn(`⚠️  Expected currencies not in ECB data: ${missingCurrencies.join(', ')}`);
      }
      
    } else {
      console.error('❌ Failed to fetch rates:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testCurrencyFilter().catch(console.error);