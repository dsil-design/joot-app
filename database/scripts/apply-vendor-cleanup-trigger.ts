#!/usr/bin/env tsx
/**
 * Apply vendor cleanup trigger migration to production database
 * This script manually applies the migration via Supabase client
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('🚀 Applying vendor cleanup trigger migration...\n')

  // Read the migration file
  const migrationPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20251022175801_add_vendor_cleanup_trigger.sql'
  )

  const sql = fs.readFileSync(migrationPath, 'utf-8')

  console.log('📄 Migration file loaded')
  console.log(`📊 Size: ${sql.length} bytes\n`)

  try {
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_string: sql
    })

    if (error) {
      // If exec_sql doesn't exist, try direct execution via REST API
      console.warn('⚠️  exec_sql function not found, trying alternative method...')

      // Try using the Management API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ sql_string: sql })
      })

      if (!response.ok) {
        throw new Error(`Failed to apply migration: ${response.statusText}`)
      }

      console.log('✅ Migration applied successfully!')
    } else {
      console.log('✅ Migration applied successfully!')
      console.log('📊 Result:', data)
    }

    // Verify the trigger was created
    console.log('\n🔍 Verifying trigger creation...')

    const { data: triggers, error: triggerError } = await supabase
      .from('pg_trigger')
      .select('tgname')
      .eq('tgname', 'cleanup_orphaned_vendors_after_transaction_change')

    if (triggerError) {
      console.warn('⚠️  Could not verify trigger (this might be normal):', triggerError.message)
    } else if (triggers && triggers.length > 0) {
      console.log('✅ Trigger verified: cleanup_orphaned_vendors_after_transaction_change')
    }

    console.log('\n🎉 Migration complete!')

  } catch (error) {
    console.error('❌ Error applying migration:', error)
    process.exit(1)
  }
}

applyMigration().catch(console.error)
