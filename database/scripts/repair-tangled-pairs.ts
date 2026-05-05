#!/usr/bin/env tsx
/**
 * One-off repair for two tangled (upload, idx) pairs identified during the
 * 2026-05-04 drift investigation. See discussion notes for the full story.
 *
 *   Taxi pair (Chase upload edf5c209-a858-48f9-9d28-e9e75e6fd6cc):
 *     - tx d3423a3b "Taxi to Golf" $4.51 was wrongly linked to idx=34
 *       (the $4.44 Bolt entry). Its real entry is idx=28 (exact $4.51 match).
 *       suggestion[28] already cross-links to d3423a3b correctly.
 *     - tx 7c8a05c0 "Taxi to Airport" still holds an orphaned
 *       source_email_transaction_id = 50c539b5; the email (Tuesday Ride to
 *       Golf) actually belongs to d3423a3b per its own matched_transaction_id.
 *
 *   Meal Plan pair (KBANK upload c8dfacf9-a2bb-4a8c-89b4-33178ec755d9):
 *     - tx 9792c214 "Meal Plan" 2025-10-17 was wrongly auto-matched to
 *       idx=134 (2025-10-31). The real 2025-10-17 entry (idx=70) was later
 *       approved with createTransactions=true and produced tx 915fb6b3 — a
 *       duplicate. Strip 9792c214's stale stmt link; whether to delete
 *       9792c214 vs 915fb6b3 as the duplicate is a separate decision.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

const TAXI_GOLF_TX = 'd3423a3b-ea91-40a6-83d6-1fd66731c9a0'
const TAXI_AIRPORT_TX = '7c8a05c0-2a00-47df-8e6a-f6cd1c52dd42'
const MEAL_PLAN_OLD_TX = '9792c214-82d3-449b-a683-ab20ed21bf63'

async function step(label: string, fn: () => Promise<void>) {
  process.stdout.write(`  ${label} ... `)
  try {
    await fn()
    console.log('OK')
  } catch (e) {
    console.log('FAIL')
    throw e
  }
}

async function main() {
  console.log('Taxi pair:')

  await step(`d3423a3b → idx 28 (was 34), confidence 90`, async () => {
    const { error } = await sb
      .from('transactions')
      .update({
        source_statement_suggestion_index: 28,
        source_statement_match_confidence: 90,
      })
      .eq('id', TAXI_GOLF_TX)
    if (error) throw error
  })

  await step(`7c8a05c0 source_email_transaction_id → null`, async () => {
    const { error } = await sb
      .from('transactions')
      .update({ source_email_transaction_id: null })
      .eq('id', TAXI_AIRPORT_TX)
    if (error) throw error
  })

  console.log('\nMeal Plan pair:')

  await step(`9792c214 stmt link → null`, async () => {
    const { error } = await sb
      .from('transactions')
      .update({
        source_statement_upload_id: null,
        source_statement_suggestion_index: null,
        source_statement_match_confidence: null,
      })
      .eq('id', MEAL_PLAN_OLD_TX)
    if (error) throw error
  })

  console.log('\nDone. Run repair-statement-suggestion-drift.ts --fix-all next to reconcile suggestion-side back-links.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
