/**
 * Sanity-check the .overlaps() query that the queue route now uses to fetch
 * emails/slips with manual_pair_keys pointing into a specific statement. If
 * this comes back without the expected email row, the fix in route.ts isn't
 * surfacing manually-attached items.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const USER_ID = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6'
const STATEMENT_ID = '984828e8-dead-4cde-bca2-9e9ce77f0aaf'

async function main() {
  // First load suggestion count to build the full key array.
  const { data: stmt } = await supabase
    .from('statement_uploads')
    .select('extraction_log')
    .eq('id', STATEMENT_ID)
    .single()
  const suggsCount = ((stmt?.extraction_log as { suggestions?: unknown[] } | null)?.suggestions ?? []).length
  console.log(`statement has ${suggsCount} suggestions`)

  const overlapKeys = Array.from({ length: suggsCount }, (_, i) => `stmt:${STATEMENT_ID}:${i}`)
  console.log(`overlap key sample: ${overlapKeys[0]} ... ${overlapKeys[suggsCount - 1]}`)

  const { data, error } = await supabase
    .from('email_transactions')
    .select('id, status, manual_pair_keys, transaction_date, amount, currency')
    .eq('user_id', USER_ID)
    .in('status', ['pending_review', 'ready_to_import', 'waiting_for_statement', 'waiting_for_email', 'waiting_for_slip', 'matched', 'imported', 'skipped'])
    .overlaps('manual_pair_keys', overlapKeys)

  if (error) {
    console.error('Query error:', error)
    return
  }

  console.log(`\n${data?.length ?? 0} emails returned by .overlaps():\n`)
  for (const row of data ?? []) {
    console.log(`  ${row.id}  status=${row.status}  date=${row.transaction_date}  ${row.amount} ${row.currency}  keys=${JSON.stringify(row.manual_pair_keys)}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
