import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://uwjmgjqongcrsamprvjr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns'
)

async function setDefaultPreferredCurrencies() {
  console.log('Setting default preferred currencies for dennis@dsil.design...')

  // 1. Get user ID for dennis@dsil.design
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', 'dennis@dsil.design')
    .single()

  if (userError || !users) {
    console.error('User not found:', userError)
    return
  }

  console.log('✓ Found user:', users.email, users.id)

  // 2. Get payment methods for this user
  const { data: paymentMethods, error: pmError } = await supabase
    .from('payment_methods')
    .select('id, name, preferred_currency')
    .eq('user_id', users.id)

  if (pmError) {
    console.error('Error fetching payment methods:', pmError)
    return
  }

  console.log(`✓ Found ${paymentMethods?.length || 0} payment methods`)

  // 3. Update specific payment methods
  const updates = [
    { name: 'Credit Card: Chase Sapphire Reserve', currency: 'USD' },
    { name: 'Bangkok Bank Account', currency: 'THB' },
  ]

  for (const update of updates) {
    const paymentMethod = paymentMethods?.find(pm => pm.name === update.name)

    if (!paymentMethod) {
      console.log(`⚠ Payment method "${update.name}" not found`)
      continue
    }

    console.log(`\nUpdating "${paymentMethod.name}"...`)
    console.log(`  Current preferred_currency: ${paymentMethod.preferred_currency || 'null'}`)
    console.log(`  New preferred_currency: ${update.currency}`)

    const { error: updateError } = await supabase
      .from('payment_methods')
      .update({ preferred_currency: update.currency })
      .eq('id', paymentMethod.id)

    if (updateError) {
      console.error(`  ✗ Error updating:`, updateError)
    } else {
      console.log(`  ✓ Updated successfully`)
    }
  }

  // 4. Verify the updates
  console.log('\n--- Verification ---')
  const { data: updated } = await supabase
    .from('payment_methods')
    .select('name, preferred_currency')
    .eq('user_id', users.id)
    .order('name')

  console.log('\nAll payment methods:')
  updated?.forEach(pm => {
    console.log(`  ${pm.name}: ${pm.preferred_currency || '(none)'}`)
  })

  console.log('\n✓ Done!')
}

setDefaultPreferredCurrencies()
