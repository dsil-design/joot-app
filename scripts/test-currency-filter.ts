#!/usr/bin/env tsx

// Test script to verify currency filtering is working correctly

import { ecbFetcher } from '../src/lib/services/ecb-fetcher';
import { VALID_ECB_CURRENCIES } from '../src/lib/types/exchange-rates';

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
    const allCurrencies = new Set<string>();
    for (const match of currencyMatches) {
      allCurrencies.add(match[1]);
    }
    console.log(`📋 All ECB currencies: ${Array.from(allCurrencies).sort().join(', ')}\n`);

    // Now test our filtered implementation
    console.log('🔄 Fetching rates with filter applied...');
    const result = await ecbFetcher.fetchDailyRates();
    
    if (result.success && result.data) {
      const uniqueCurrencies = new Set(result.data.map(r => r.currency));
      console.log(`✅ Filtered currencies: ${Array.from(uniqueCurrencies).sort().join(', ')}`);
      console.log(`📉 Filtered to ${uniqueCurrencies.size} currencies from ${allCurrencies.size} available`);
      console.log(`💾 Storage reduction: ${Math.round((1 - uniqueCurrencies.size / allCurrencies.size) * 100)}%`);
      
      // Verify we only have expected currencies
      const unexpectedCurrencies = Array.from(uniqueCurrencies).filter(c => !VALID_ECB_CURRENCIES.includes(c as any));
      
      if (unexpectedCurrencies.length > 0) {
        console.error(`❌ Unexpected currencies found: ${unexpectedCurrencies.join(', ')}`);
        process.exit(1);
      } else {
        console.log('✅ All currencies match expected whitelist!');
      }
      
      // Check for missing expected currencies
      const missingCurrencies = VALID_ECB_CURRENCIES.filter(c => !uniqueCurrencies.has(c));
      if (missingCurrencies.length > 0) {
        console.warn(`⚠️  Expected currencies not in ECB data: ${missingCurrencies.join(', ')}`);
      }
      
      // Assert expected filtering performance
      if (uniqueCurrencies.size > 6) {
        console.error(`❌ Too many currencies after filtering: ${uniqueCurrencies.size} (expected ≤6)`);
        process.exit(1);
      }
      
      if (uniqueCurrencies.size === 0) {
        console.error('❌ No currencies after filtering - system may be broken');
        process.exit(1);
      }
      
      // Verify EUR is not in the filtered results (it should be base currency only)
      if (uniqueCurrencies.has('EUR')) {
        console.error('❌ EUR should not be in ECB filtered results (it is the base currency)');
        process.exit(1);
      }
      
      // Show performance metrics
      const metrics = ecbFetcher.getMetrics();
      console.log(`\n📈 Performance metrics:`);
      console.log(`   - Rates processed: ${metrics.ratesProcessed}`);
      console.log(`   - Duration: ${metrics.duration}ms`);
      
    } else {
      console.error('❌ Failed to fetch rates:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testCurrencyFilter().catch(console.error);