import { Client } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyMigration() {
  const client = new Client({
    host: 'aws-0-us-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.cuwmhvjtjqulqcvjhdmg',
    password: process.env.SUPABASE_DB_PASSWORD || 'NkWsbieKWodIMkjF',
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    console.log('Connecting to database...')
    await client.connect()
    console.log('✅ Connected!')

    console.log('Reading migration file...')
    const migrationPath = join(process.cwd(), 'database/migrations/20251016000000_add_transaction_tags.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('Executing migration...')
    await client.query(sql)

    console.log('✅ Migration applied successfully!')

    // Verify tables exist
    const { rows } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('tags', 'transaction_tags')
      ORDER BY table_name
    `)

    console.log('\nVerified tables:', rows.map(r => r.table_name))

  } catch (error) {
    console.error('❌ Failed to apply migration:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\nDatabase connection closed.')
  }
}

applyMigration()
