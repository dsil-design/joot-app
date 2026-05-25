/**
 * One-shot cleanup: email_transaction 1e8a5b78... (Grab THB 265, Apr 8) had
 * both `stmt:984828e8...:56` AND `stmt:984828e8...:55` in its manual_pair_keys
 * because the user attached it to suggestion 55 by mistake before re-attaching
 * to the correct suggestion 56. The attach endpoint is purely additive so the
 * stale :55 stuck around — and would block email b147dbfa from pairing with
 * suggestion 55 once the read-path fix lands.
 *
 * Also clears the malformed entry in rejected_pair_keys (it's missing the
 * `stmt:` prefix, so it doesn't match anything anyway).
 *
 * Safe to re-run: it removes specific keys by string match.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const EMAIL_ID = '1e8a5b78-3e4d-4f1e-9111-309d739b9b73'
const STALE_MANUAL_KEY = 'stmt:984828e8-dead-4cde-bca2-9e9ce77f0aaf:55'
const MALFORMED_REJECTED_KEY = '984828e8-dead-4cde-bca2-9e9ce77f0aaf:56'

async function main() {
  const { data: row, error: readErr } = await supabase
    .from('email_transactions')
    .select('id, manual_pair_keys, rejected_pair_keys')
    .eq('id', EMAIL_ID)
    .single()
  if (readErr || !row) {
    console.error('Failed to read row:', readErr)
    process.exit(1)
  }

  const beforeManual = (row.manual_pair_keys ?? []) as string[]
  const beforeRejected = (row.rejected_pair_keys ?? []) as string[]
  const nextManual = beforeManual.filter((k) => k !== STALE_MANUAL_KEY)
  const nextRejected = beforeRejected.filter((k) => k !== MALFORMED_REJECTED_KEY)

  console.log('manual_pair_keys:    ', beforeManual, '->', nextManual)
  console.log('rejected_pair_keys:  ', beforeRejected, '->', nextRejected)

  if (nextManual.length === beforeManual.length && nextRejected.length === beforeRejected.length) {
    console.log('Nothing to clean up — already in target state.')
    return
  }

  const { error: updateErr } = await supabase
    .from('email_transactions')
    .update({ manual_pair_keys: nextManual, rejected_pair_keys: nextRejected })
    .eq('id', EMAIL_ID)
  if (updateErr) {
    console.error('Update failed:', updateErr)
    process.exit(1)
  }
  console.log('Cleanup applied.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
