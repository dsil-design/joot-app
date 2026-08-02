import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { processPaymentSlip } from '@/lib/payment-slips/slip-processor'
import {
  drainSlips,
  sweepStrandedSlips,
  DEFAULT_BATCH_SIZE,
  DEFAULT_CONCURRENCY,
  DEFAULT_TIME_BUDGET_MS,
} from '@/lib/payment-slips/drain'
import { buildDrainDeps, listUsersWithStrandedSlips } from '@/lib/payment-slips/drain-queries'

export const maxDuration = 300

/**
 * Payment slip sweeper.
 *
 * The drain loop means the browser no longer has to *continue* extraction, but
 * it is still what *starts* it — and a request that never lands leaves slips at
 * `pending` with nothing to re-drive them. That is how 15 of Dennis's 20 June
 * slips sat untouched, and how IMG_1602.JPG sat orphaned at `processing` from
 * April to August. This is the re-drive.
 *
 * Only claims work abandoned long enough that no live drain could still own it
 * (see STALE_PENDING_MS), so it cannot double-extract alongside a user.
 *
 * Runs hourly.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceRoleClient()

    const result = await sweepStrandedSlips({
      listUsersWithStrandedSlips: () => listUsersWithStrandedSlips(supabase),
      drainUser: (userId) =>
        drainSlips(
          buildDrainDeps(supabase, userId, {
            scope: 'stale',
            processSlip: processPaymentSlip,
          }),
          {
            batchSize: DEFAULT_BATCH_SIZE,
            concurrency: DEFAULT_CONCURRENCY,
            timeBudgetMs: DEFAULT_TIME_BUDGET_MS,
          }
        ),
    })

    if (result.processed > 0 || result.failed > 0) {
      console.log(
        `Payment slip sweep: recovered ${result.processed}, failed ${result.failed}, ` +
          `across ${result.usersSwept} user(s), remaining ${result.remaining}`
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Payment slip sweep error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
