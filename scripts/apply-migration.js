const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
  'https://uwjmgjqongcrsamprvjr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3am1nanFvbmdjcnNhbXBydmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5NjMyMiwiZXhwIjoyMDY5ODcyMzIyfQ.BZ7dxe3P_I7sUA0L8KSODMiAHG0mwHu8M6UqpfZs6Ns'
)

async function applyMigration() {
  const migrationPath = path.join(__dirname, '../database/supabase/migrations/20251024000000_add_payment_method_preferred_currency.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

  console.log('Applying migration...')
  console.log(migrationSQL)
  console.log('\n---\n')

  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

  if (error) {
    console.error('Error applying migration:', error)
  } else {
    console.log('Migration applied successfully!')
  }
}

applyMigration()
