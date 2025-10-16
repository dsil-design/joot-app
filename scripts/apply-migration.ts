import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  try {
    console.log('Reading migration file...')
    const migrationPath = join(process.cwd(), 'database/migrations/20251016000000_add_transaction_tags.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('Applying migration...')
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // If exec_sql doesn't exist, try direct SQL execution
      console.log('Trying direct SQL execution...')

      // Split the SQL into individual statements and execute them
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        const { error: stmtError } = await supabase.rpc('exec', { sql: statement + ';' })
        if (stmtError) {
          console.error('Error executing statement:', statement.substring(0, 100) + '...')
          console.error('Error:', stmtError)
          throw stmtError
        }
      }

      console.log('Migration applied successfully!')
    } else {
      console.log('Migration applied successfully!')
      console.log('Result:', data)
    }
  } catch (error) {
    console.error('Failed to apply migration:', error)
    process.exit(1)
  }
}

applyMigration()
