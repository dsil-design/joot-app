#!/usr/bin/env node

/**
 * Trigger a manual exchange rate sync
 * This will download historical rates from ECB and populate the database
 */

require('dotenv').config({ path: '.env.local' })

const VERCEL_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET

async function triggerSync() {
  console.log('🚀 Triggering manual exchange rate sync...\n')

  // Check if we're running locally or need to use production URL
  const isLocal = VERCEL_URL.includes('localhost')

  if (!isLocal && !CRON_SECRET) {
    console.error('❌ CRON_SECRET is required for production sync')
    console.log('\n💡 To sync production:')
    console.log('   1. Get CRON_SECRET from Vercel environment variables')
    console.log('   2. Add it to your .env.local file')
    console.log('   3. Run this script again')
    process.exit(1)
  }

  // Remove trailing slash from URL to avoid double slashes
  const baseUrl = VERCEL_URL.replace(/\/$/, '')
  const syncUrl = `${baseUrl}/api/cron/sync-all-rates`

  console.log(`📡 Sync URL: ${syncUrl}`)
  console.log(`🔐 Using ${isLocal ? 'local development' : 'production'} mode`)
  console.log('\n⏳ This may take 1-2 minutes to download and process ECB data...\n')

  try {
    const headers = {
      'Content-Type': 'application/json'
    }

    // Add authorization header if we have CRON_SECRET
    if (CRON_SECRET) {
      headers['Authorization'] = `Bearer ${CRON_SECRET}`
    }

    const response = await fetch(syncUrl, {
      method: 'POST',
      headers
    })

    // Get response text first to handle both JSON and error responses
    const responseText = await response.text()

    if (!response.ok) {
      console.error('❌ Sync request failed:', response.status, response.statusText)
      console.error('Response:', responseText)

      // Check if it's an auth error
      if (response.status === 401 || response.status === 403) {
        console.log('\n🔐 Authentication failed. Please check:')
        console.log('   1. CRON_SECRET is set in .env.local')
        console.log('   2. CRON_SECRET matches the value in Vercel')
      }

      process.exit(1)
    }

    // Try to parse JSON response
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('❌ Failed to parse response as JSON')
      console.error('Response:', responseText)
      process.exit(1)
    }

    console.log('✅ Sync completed!\n')
    console.log('📊 Results:')
    console.log(JSON.stringify(data, null, 2))

    // Summary
    if (data.results?.ecbFullSync?.success) {
      const stats = data.results.ecbFullSync.data?.statistics
      if (stats) {
        console.log('\n📈 Exchange Rate Statistics:')
        console.log(`   New rates inserted: ${stats.newRatesInserted || 0}`)
        console.log(`   Rates updated: ${stats.ratesUpdated || 0}`)
        console.log(`   Rates unchanged: ${stats.ratesUnchanged || 0}`)
      }
    }

    if (data.results?.dailySync?.data) {
      const daily = data.results.dailySync.data
      console.log('\n📅 Daily Sync:')
      console.log(`   Target date: ${daily.targetDate || 'N/A'}`)
      console.log(`   Gaps filled: ${daily.gapsFilled || 0}`)
    }

    console.log(`\n⏱️  Total duration: ${(data.duration / 1000).toFixed(1)}s`)
    console.log('\n🎉 Your exchange rates are now up to date!')

  } catch (error) {
    console.error('❌ Sync failed:', error.message)

    // Show full error details for debugging
    if (error.cause) {
      console.error('Cause:', error.cause)
    }

    console.error('\nFull error:', error)

    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure your development server is running:')
      console.log('   npm run dev')
    } else if (error.message.includes('fetch failed')) {
      console.log('\n💡 Network connection failed. Possible causes:')
      console.log('   1. Check your internet connection')
      console.log('   2. Verify the URL is correct:', syncUrl)
      console.log('   3. The Vercel deployment might be down')
      console.log('   4. Try running locally: npm run dev')
    }

    process.exit(1)
  }
}

triggerSync().catch(console.error)
