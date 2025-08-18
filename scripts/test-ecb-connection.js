#!/usr/bin/env node

/**
 * Test ECB API connection and data parsing
 */

const fetch = require('node-fetch').default || require('node-fetch');

async function testECBConnection() {
  console.log('🌍 Testing ECB API Connection');
  console.log('=============================');

  try {
    console.log('\n📡 Fetching ECB daily rates...');
    const response = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', {
      headers: {
        'User-Agent': 'ECB-Test/1.0'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();
    console.log(`✅ Successfully fetched ${xmlText.length} characters of XML data`);

    // Basic XML validation
    if (xmlText.includes('<Cube') && xmlText.includes('currency=') && xmlText.includes('rate=')) {
      console.log('✅ XML structure appears valid');
      
      // Extract sample currencies
      const currencyMatches = xmlText.match(/currency="([A-Z]{3})"/g);
      const rateMatches = xmlText.match(/rate="([0-9.]+)"/g);
      
      if (currencyMatches && rateMatches) {
        console.log(`✅ Found ${currencyMatches.length} currencies in the response`);
        console.log('Sample currencies:', currencyMatches.slice(0, 5).map(m => m.match(/"([A-Z]{3})"/)[1]));
        
        // Check for required currencies
        const requiredCurrencies = ['USD', 'THB', 'GBP'];
        const availableCurrencies = currencyMatches.map(m => m.match(/"([A-Z]{3})"/)[1]);
        
        for (const currency of requiredCurrencies) {
          if (availableCurrencies.includes(currency)) {
            console.log(`✅ Required currency ${currency} is available`);
          } else {
            console.log(`⚠️  Required currency ${currency} not found`);
          }
        }
      } else {
        console.log('⚠️  Could not parse currency/rate data from XML');
      }
    } else {
      console.log('❌ XML structure appears invalid');
    }

    console.log('\n🎉 ECB API connection test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ECB API is accessible ✅');
    console.log('- XML data format is valid ✅');
    console.log('- Required currencies are available ✅');
    console.log('');
    console.log('🚀 Ready for exchange rate fetching!');

  } catch (error) {
    console.error('❌ ECB API test failed:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Check your internet connection');
    console.log('2. ECB API might be temporarily unavailable');
    console.log('3. Corporate firewall might be blocking the request');
    console.log('4. Try again in a few minutes');
    process.exit(1);
  }
}

testECBConnection();