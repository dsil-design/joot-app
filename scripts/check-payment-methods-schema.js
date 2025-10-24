const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://uwjmgjqongcrsamprvjr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns'
)

async function checkSchema() {
  // Try to select the preferred_currency column
  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, name, preferred_currency')
    .limit(1)

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Success! Schema includes preferred_currency')
    console.log('Sample data:', data)
  }
}

checkSchema()
