import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkExchangeRates() {
  try {
    console.log('Checking exchange rates for Oct 14-16, 2025...\n')

    // Check for rates around Oct 14-16
    const { data: rates, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .gte('date', '2025-10-14')
      .lte('date', '2025-10-16')
      .order('date', { ascending: false })
      .order('from_currency', { ascending: true })

    if (error) {
      console.error('❌ Error querying exchange_rates:', error.message)
      return
    }

    if (!rates || rates.length === 0) {
      console.log('⚠️  No exchange rates found for Oct 14-16, 2025')
      return
    }

    console.log(`✅ Found ${rates.length} exchange rates:\n`)

    // Group by date
    const byDate: Record<string, any[]> = {}
    rates.forEach(rate => {
      if (!byDate[rate.date]) {
        byDate[rate.date] = []
      }
      byDate[rate.date].push(rate)
    })

    Object.keys(byDate).sort().reverse().forEach(date => {
      console.log(`📅 ${date} (${byDate[date].length} rates):`)
      byDate[date].forEach(rate => {
        console.log(`   ${rate.from_currency}/${rate.to_currency}: ${rate.rate}`)
      })
      console.log()
    })

  } catch (error) {
    console.error('Failed to check exchange rates:', error)
    process.exit(1)
  }
}

checkExchangeRates()
