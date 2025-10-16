import { readFileSync } from 'fs'
import { join } from 'path'

async function applyMigration() {
  try {
    console.log('Reading migration file...')
    const migrationPath = join(process.cwd(), 'database/migrations/20251016000000_add_transaction_tags.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('\n=== MIGRATION SQL ===\n')
    console.log(sql)
    console.log('\n=== END MIGRATION SQL ===\n')

    console.log('\nPlease run this SQL in the Supabase Dashboard SQL Editor:')
    console.log('https://supabase.com/dashboard/project/uwjmgjqongcrsamprvjr/sql/new')
  } catch (error) {
    console.error('Failed to read migration:', error)
    process.exit(1)
  }
}

applyMigration()
