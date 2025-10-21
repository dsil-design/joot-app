import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkKohls() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'dennis@dsil.design')
    .single()

  if (!user) return

  const { data: paymentMethods } = await supabase
    .from('payment_methods')
    .select('id, name')
    .eq('user_id', user.id)
    .like('name', '%Kohl%')

  console.log('Kohl\'s payment methods:')
  paymentMethods?.forEach(pm => {
    console.log(`ID: ${pm.id}`)
    console.log(`Name: "${pm.name}"`)
    console.log(`Char codes: ${[...pm.name].map(c => `${c}(${c.charCodeAt(0)})`).join(' ')}`)
    console.log()
  })
}

checkKohls()
