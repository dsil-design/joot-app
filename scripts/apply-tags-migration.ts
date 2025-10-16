import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public',
  },
})

async function applyMigration() {
  try {
    console.log('Reading migration file...')
    const migrationPath = join(process.cwd(), 'database/migrations/20251016000000_add_transaction_tags.sql')
    const sqlContent = readFileSync(migrationPath, 'utf-8')

    console.log('Applying migration via Supabase Management API...')

    // Use the Supabase Management API to execute raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ sql: sqlContent })
    })

    if (!response.ok) {
      // If the exec_sql function doesn't exist, we'll need to use a different method
      console.log('exec_sql RPC not available. Trying alternative method...')

      // Split SQL into statements and log them for manual execution
      console.log('\n=== PLEASE RUN THIS SQL MANUALLY IN SUPABASE DASHBOARD ===\n')
      console.log('Dashboard URL: https://supabase.com/dashboard/project/uwjmgjqongcrsamprvjr/sql/new\n')
      console.log(sqlContent)
      console.log('\n=== END SQL ===\n')

      console.log('⚠️  Please run the SQL above in the Supabase Dashboard SQL Editor')
      console.log('Then press Ctrl+C to exit this script')

      // Keep process alive so user can copy the SQL
      await new Promise(() => {})
    } else {
      const result = await response.json()
      console.log('✅ Migration applied successfully!')
      console.log('Result:', result)
    }

  } catch (error) {
    console.error('❌ Failed to apply migration:', error)

    // Fallback: print SQL for manual execution
    console.log('\n=== FALLBACK: MANUAL EXECUTION REQUIRED ===\n')
    const migrationPath = join(process.cwd(), 'database/migrations/20251016000000_add_transaction_tags.sql')
    const sqlContent = readFileSync(migrationPath, 'utf-8')
    console.log('Dashboard URL: https://supabase.com/dashboard/project/uwjmgjqongcrsamprvjr/sql/new\n')
    console.log(sqlContent)
    process.exit(1)
  }
}

applyMigration()
