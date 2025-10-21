import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// User email
const USER_EMAIL = 'dennis@dsil.design'

// Migration mapping: current payment method names → target payment method name
const MIGRATION_MAP: Record<string, string> = {
  // Chase Sapphire Reserve consolidation
  'Chase Sapphire Reserve': 'Credit Card: Chase Sapphire Reserve',
  'Credit Card - Chase Sapphire Reserve': 'Credit Card: Chase Sapphire Reserve',
  'Chase': 'Credit Card: Chase Sapphire Reserve',
  'Credit Card (Chase)': 'Credit Card: Chase Sapphire Reserve',

  // Cash consolidation
  'Cash': 'Cash',
  'Cah': 'Cash', // typo fix

  // PNC: Personal consolidation
  'Personal': 'PNC: Personal',
  'PNC Bank Account': 'PNC: Personal',
  'Bank Account': 'PNC: Personal',

  // PNC: FL House consolidation
  'FL House': 'PNC: FL House',
  'Bank Account - PNC': 'PNC: FL House',
  'House Account': 'PNC: FL House',

  // Bangkok Bank Account (keep as is)
  'Bangkok Bank Account': 'Bangkok Bank Account',

  // Wise consolidation
  'Wise': 'Wise',
  'TransferWise': 'Wise',

  // Venmo (keep as is)
  'Venmo': 'Venmo',

  // American Express consolidation
  'American Express': 'American Express',
  'Credit Card - American Express': 'American Express',
  'Credit Card (Amex)': 'American Express',

  // United MileagePlus consolidation
  'United MileagePlus (Chase)': 'Credit Card: United MileagePlus (Chase)',
  'Credit Card - United': 'Credit Card: United MileagePlus (Chase)',

  // Kohl's Credit Card (both duplicates - handles both apostrophe types)
  'Kohl\'s Credit Card': 'Kohl\'s Credit Card',      // straight apostrophe (')
  'Kohl\u2019s Credit Card': 'Kohl\'s Credit Card',  // curly apostrophe (')
}

async function migratePaymentMethods(dryRun = true) {
  console.log('='.repeat(60))
  console.log(`PAYMENT METHODS MIGRATION ${dryRun ? '(DRY RUN)' : '(LIVE)'}`)
  console.log('='.repeat(60))
  console.log()

  // Get user ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', USER_EMAIL)
    .single()

  if (userError || !user) {
    console.error('Error finding user:', userError)
    return
  }

  const userId = user.id
  console.log(`User: ${USER_EMAIL}`)
  console.log(`User ID: ${userId}`)
  console.log()

  // Get all current payment methods
  const { data: currentPaymentMethods, error: pmError } = await supabase
    .from('payment_methods')
    .select('id, name')
    .eq('user_id', userId)
    .order('name')

  if (pmError || !currentPaymentMethods) {
    console.error('Error fetching payment methods:', pmError)
    return
  }

  console.log(`Found ${currentPaymentMethods.length} existing payment methods`)
  console.log()

  // Build migration plan
  const targetPaymentMethods = new Set<string>()
  const migrationPlan: Array<{
    sourceId: string
    sourceName: string
    targetName: string
    transactionCount: number
  }> = []

  // First pass: gather all target names and transaction counts
  for (const pm of currentPaymentMethods) {
    const targetName = MIGRATION_MAP[pm.name]

    if (!targetName) {
      console.warn(`⚠️  WARNING: No mapping found for "${pm.name}"`)
      continue
    }

    targetPaymentMethods.add(targetName)

    // Get transaction count
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('payment_method_id', pm.id)

    migrationPlan.push({
      sourceId: pm.id,
      sourceName: pm.name,
      targetName,
      transactionCount: count || 0,
    })
  }

  // Add "None" to target payment methods
  targetPaymentMethods.add('None')

  // Display migration plan
  console.log('MIGRATION PLAN:')
  console.log('-'.repeat(60))

  const grouped = new Map<string, typeof migrationPlan>()
  for (const item of migrationPlan) {
    if (!grouped.has(item.targetName)) {
      grouped.set(item.targetName, [])
    }
    grouped.get(item.targetName)!.push(item)
  }

  let totalTransactionsAffected = 0
  for (const [targetName, items] of grouped) {
    const totalCount = items.reduce((sum, item) => sum + item.transactionCount, 0)
    totalTransactionsAffected += totalCount

    console.log(`\n→ "${targetName}" (${totalCount} transactions)`)
    for (const item of items) {
      if (item.sourceName === targetName) {
        console.log(`  ✓ "${item.sourceName}" [KEEP] (${item.transactionCount} transactions)`)
      } else {
        console.log(`  ← "${item.sourceName}" [MERGE] (${item.transactionCount} transactions)`)
      }
    }
  }

  // Check for NULL payment methods
  const { count: nullCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('payment_method_id', null)

  if (nullCount && nullCount > 0) {
    console.log(`\n→ "None" (${nullCount} transactions)`)
    console.log(`  ← [NULL payment methods] (${nullCount} transactions)`)
    totalTransactionsAffected += nullCount
  }

  console.log()
  console.log('-'.repeat(60))
  console.log(`Total transactions to be updated: ${totalTransactionsAffected}`)
  console.log(`Target payment methods: ${targetPaymentMethods.size}`)
  console.log()

  if (dryRun) {
    console.log('✋ DRY RUN - No changes made')
    console.log('Run with --execute flag to apply changes')
    return
  }

  // Execute migration
  console.log('EXECUTING MIGRATION...')
  console.log('-'.repeat(60))

  const targetPaymentMethodIds = new Map<string, string>()

  // Step 1: Create or find target payment methods
  console.log('\n1. Creating/finding target payment methods...')
  for (const targetName of targetPaymentMethods) {
    // Check if it already exists
    const existing = currentPaymentMethods.find(pm => pm.name === targetName)

    if (existing) {
      targetPaymentMethodIds.set(targetName, existing.id)
      console.log(`  ✓ Found existing: "${targetName}" (${existing.id})`)
    } else {
      // Create new payment method
      const { data: newPm, error: createError } = await supabase
        .from('payment_methods')
        .insert({ name: targetName, user_id: userId })
        .select('id')
        .single()

      if (createError) {
        console.error(`  ✗ Error creating "${targetName}":`, createError)
        return
      }

      targetPaymentMethodIds.set(targetName, newPm.id)
      console.log(`  + Created new: "${targetName}" (${newPm.id})`)
    }
  }

  // Step 2: Migrate transactions
  console.log('\n2. Migrating transactions...')
  let updatedCount = 0

  for (const item of migrationPlan) {
    const targetId = targetPaymentMethodIds.get(item.targetName)!

    // Skip if source and target are the same
    if (item.sourceId === targetId) {
      console.log(`  ⊘ Skipping "${item.sourceName}" (already target)`)
      continue
    }

    // Update transactions
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ payment_method_id: targetId })
      .eq('user_id', userId)
      .eq('payment_method_id', item.sourceId)

    if (updateError) {
      console.error(`  ✗ Error updating transactions for "${item.sourceName}":`, updateError)
      return
    }

    updatedCount += item.transactionCount
    console.log(`  ✓ Updated ${item.transactionCount} transactions: "${item.sourceName}" → "${item.targetName}"`)
  }

  // Step 3: Update NULL payment methods to "None"
  if (nullCount && nullCount > 0) {
    const noneId = targetPaymentMethodIds.get('None')!
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ payment_method_id: noneId })
      .eq('user_id', userId)
      .is('payment_method_id', null)

    if (updateError) {
      console.error('  ✗ Error updating NULL payment methods:', updateError)
      return
    }

    updatedCount += nullCount
    console.log(`  ✓ Updated ${nullCount} transactions: [NULL] → "None"`)
  }

  // Step 4: Delete old payment methods
  console.log('\n3. Cleaning up old payment methods...')
  const toDelete = migrationPlan
    .filter(item => item.sourceId !== targetPaymentMethodIds.get(item.targetName))
    .map(item => item.sourceId)

  for (const id of toDelete) {
    const item = migrationPlan.find(i => i.sourceId === id)!

    const { error: deleteError } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) {
      console.error(`  ✗ Error deleting "${item.sourceName}":`, deleteError)
      return
    }

    console.log(`  ✓ Deleted: "${item.sourceName}" (${id})`)
  }

  console.log()
  console.log('='.repeat(60))
  console.log('✅ MIGRATION COMPLETE')
  console.log('='.repeat(60))
  console.log(`Total transactions updated: ${updatedCount}`)
  console.log(`Payment methods deleted: ${toDelete.length}`)
  console.log(`Payment methods remaining: ${targetPaymentMethods.size}`)
  console.log()
}

// Check for --execute flag
const isExecute = process.argv.includes('--execute')
migratePaymentMethods(!isExecute)
