#!/usr/bin/env node

/**
 * Apply sync configuration migration
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function applySyncMigration() {
  console.log('📦 Applying sync_configuration migration...\n')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../database/migrations/20250821_add_sync_configuration.sql')

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath)
      process.exit(1)
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('📄 Running migration SQL...')

    // Execute the migration SQL using rpc to raw SQL
    // Note: Supabase JS client doesn't support raw SQL execution directly
    // We need to use the REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: migrationSQL })
    })

    if (!response.ok) {
      // If exec_sql doesn't exist, we need to apply via SQL editor
      console.log('⚠️  Cannot execute SQL directly via API')
      console.log('\n📋 Please apply this migration manually:')
      console.log('\n1. Go to: https://supabase.com/dashboard/project/uwjmgjqongcrsamprvjr/editor')
      console.log('2. Open SQL Editor')
      console.log('3. Paste and run the contents of:')
      console.log(`   ${migrationPath}`)
      console.log('\n💡 Or copy this path to open the file:')
      console.log(`   ${migrationPath}`)

      // Also offer to print the SQL
      console.log('\n❓ Would you like me to print the SQL here? (This script will exit)')
      process.exit(0)
    }

    console.log('✅ Migration applied successfully!')

    // Verify the table was created
    const { data, error } = await supabase
      .from('sync_configuration')
      .select('*')
      .single()

    if (error) {
      console.error('⚠️  Could not verify table creation:', error.message)
    } else {
      console.log('\n✅ sync_configuration table verified!')
      console.log('Configuration:')
      console.log(`   Start Date: ${data.start_date}`)
      console.log(`   Auto Sync: ${data.auto_sync_enabled ? 'Enabled' : 'Disabled'}`)
      console.log(`   Sync Time: ${data.sync_time}`)
    }

  } catch (err) {
    console.error('❌ Error:', err.message)
    console.log('\n📋 Please apply the migration manually via Supabase SQL Editor')
    console.log('Migration file: database/migrations/20250821_add_sync_configuration.sql')
    process.exit(1)
  }
}

applySyncMigration().catch(console.error)
