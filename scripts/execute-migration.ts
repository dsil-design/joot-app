#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uwjmgjqongcrsamprvjr.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
})

async function executeMigration() {
  console.log('🚀 Starting migration...\n')

  try {
    // Step 1: Add the new amount column
    console.log('Step 1: Adding amount column...')
    const { error: addColumnError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS amount DECIMAL(12, 2);'
    })

    // If RPC doesn't work, we'll need to use the SQL editor
    if (addColumnError) {
      console.log('⚠️  Direct SQL execution not available via API.')
      console.log('Please run the migration manually via Supabase Dashboard > SQL Editor')
      console.log('\nOr copy this to your clipboard and run it there:\n')

      const migrationPath = path.join(__dirname, '../database/migration-refactor-transaction-amounts.sql')
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
      console.log(migrationSQL)
      return
    }

    // Continue with remaining steps...
    console.log('✓ Amount column added\n')

    // Step 2: Populate amount
    console.log('Step 2: Populating amount from existing data...')
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `UPDATE public.transactions
            SET amount = CASE
              WHEN original_currency = 'USD' THEN amount_usd
              WHEN original_currency = 'THB' THEN amount_thb
              ELSE amount_usd
            END
            WHERE amount IS NULL;`
    })

    if (updateError) throw updateError
    console.log('✓ Amount populated\n')

    // Step 3: Make amount NOT NULL
    console.log('Step 3: Setting NOT NULL constraint...')
    const { error: notNullError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.transactions ALTER COLUMN amount SET NOT NULL;'
    })

    if (notNullError) throw notNullError
    console.log('✓ NOT NULL constraint set\n')

    // Step 4: Drop old constraint
    console.log('Step 4: Dropping old constraints...')
    const { error: dropConstraintError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS positive_amounts;'
    })

    if (dropConstraintError) throw dropConstraintError
    console.log('✓ Old constraint dropped\n')

    // Step 5: Add new constraint
    console.log('Step 5: Adding new constraint...')
    const { error: addConstraintError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.transactions ADD CONSTRAINT positive_amount CHECK (amount > 0);'
    })

    if (addConstraintError) throw addConstraintError
    console.log('✓ New constraint added\n')

    // Step 6: Drop old columns
    console.log('Step 6: Dropping old amount columns...')
    const { error: dropColumnsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.transactions DROP COLUMN IF EXISTS amount_usd, DROP COLUMN IF EXISTS amount_thb;'
    })

    if (dropColumnsError) throw dropColumnsError
    console.log('✓ Old columns dropped\n')

    console.log('✅ Migration completed successfully!\n')

    // Verify
    const { data: sample } = await supabase
      .from('transactions')
      .select('*')
      .limit(1)
      .single()

    if (sample) {
      console.log('Sample transaction after migration:')
      console.log(JSON.stringify(sample, null, 2))
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

executeMigration()
