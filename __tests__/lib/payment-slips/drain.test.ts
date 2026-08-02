/**
 * Payment slip drain loop.
 *
 * The audit case: 20 slips uploaded on 2026-08-02 produced exactly 5
 * `ready_for_review` rows. The batch endpoint advanced one batch per request
 * and returned `remaining: 15`; the follow-up request never arrived because
 * the loop ran in a fire-and-forget IIFE in the upload modal. The other 15 sat
 * at `pending` — no error, nothing server-side to re-drive them, and invisible
 * in any month view because `transaction_date` is only set by extraction.
 */

import {
  drainSlips,
  sweepStrandedSlips,
  DEFAULT_BATCH_SIZE,
  DEFAULT_TIME_BUDGET_MS,
  STALE_PENDING_MS,
  STALE_PROCESSING_MS,
  type DrainDeps,
  type DrainResult,
} from '@/lib/payment-slips/drain'

/**
 * Fake queue standing in for `payment_slip_uploads`. Slips leave the queue
 * when processed, the way a row leaves `status = 'pending'`.
 */
function makeQueue(
  ids: string[],
  options: { failOn?: Set<string>; stuckOn?: Set<string>; msPerSlip?: number } = {}
) {
  const pending = new Set(ids)
  const attempts: string[] = []
  const resets: string[][] = []
  let clock = 0

  const deps: DrainDeps = {
    claimCandidates: async (limit, exclude) =>
      [...pending].filter((id) => !exclude.has(id)).slice(0, limit),
    countRemaining: async (exclude) =>
      [...pending].filter((id) => !exclude.has(id)).length,
    resetBatch: async (ids) => {
      resets.push([...ids])
    },
    processSlip: async (id) => {
      attempts.push(id)
      clock += options.msPerSlip ?? 0
      if (options.failOn?.has(id)) {
        // The processor marks the row `failed` before rethrowing, so the slip
        // leaves the pending queue either way.
        pending.delete(id)
        throw new Error(`extraction failed: ${id}`)
      }
      // A "stuck" slip mimics a row that never leaves `pending` — the shape
      // that could spin the loop into re-billing the same extraction.
      if (!options.stuckOn?.has(id)) pending.delete(id)
    },
    now: () => clock,
  }

  return {
    deps,
    attempts,
    resets,
    pending,
    advance: (ms: number) => {
      clock += ms
    },
  }
}

const twentySlips = Array.from({ length: 20 }, (_, i) => `slip-${i + 1}`)

describe('drainSlips', () => {
  it('drains all 20 slips in one call — the June regression', async () => {
    const q = makeQueue(twentySlips)

    const result = await drainSlips(q.deps, { batchSize: DEFAULT_BATCH_SIZE })

    expect(result.processed).toBe(20)
    expect(result.failed).toBe(0)
    expect(result.remaining).toBe(0)
    expect(result.stopReason).toBe('drained')
    // 20 slips at 5 per round — the old code stopped after the first.
    expect(result.batches).toBe(4)
    expect(q.pending.size).toBe(0)
  })

  it('reports 0 remaining, so no caller is told to stop while work is left', async () => {
    const q = makeQueue(twentySlips)
    const result = await drainSlips(q.deps, { batchSize: DEFAULT_BATCH_SIZE })
    // The old endpoint's `remaining: 15` was the value the dead client loop
    // was supposed to act on. Nothing outside should have to act on it now.
    expect(result.remaining).toBe(0)
  })

  it('attempts every slip exactly once', async () => {
    const q = makeQueue(twentySlips)
    await drainSlips(q.deps, { batchSize: DEFAULT_BATCH_SIZE })

    expect(q.attempts.sort()).toEqual([...twentySlips].sort())
    expect(new Set(q.attempts).size).toBe(20)
  })

  it('resets each batch before processing it', async () => {
    const q = makeQueue(twentySlips)
    await drainSlips(q.deps, { batchSize: DEFAULT_BATCH_SIZE })

    expect(q.resets).toHaveLength(4)
    expect(q.resets.flat().sort()).toEqual([...twentySlips].sort())
  })

  it('keeps draining past a slip that fails', async () => {
    const q = makeQueue(twentySlips, { failOn: new Set(['slip-3', 'slip-11']) })

    const result = await drainSlips(q.deps, { batchSize: DEFAULT_BATCH_SIZE })

    expect(result.processed).toBe(18)
    expect(result.failed).toBe(2)
    expect(result.remaining).toBe(0)
    expect(result.stopReason).toBe('drained')
  })

  it('stops on the time budget and reports what is genuinely left', async () => {
    // 10s per slip, 5 per round, concurrency 1 → 50s a round.
    const q = makeQueue(twentySlips, { msPerSlip: 10_000 })

    const result = await drainSlips(q.deps, {
      batchSize: DEFAULT_BATCH_SIZE,
      concurrency: 1,
      timeBudgetMs: 120_000,
    })

    expect(result.stopReason).toBe('time_budget')
    expect(result.batches).toBe(3)
    expect(result.processed).toBe(15)
    // Honest count — a caller can resume from here.
    expect(result.remaining).toBe(5)
  })

  it('resumes cleanly on a second call after a budget cutoff', async () => {
    const q = makeQueue(twentySlips, { msPerSlip: 10_000 })
    const opts = { batchSize: DEFAULT_BATCH_SIZE, concurrency: 1, timeBudgetMs: 120_000 }

    const first = await drainSlips(q.deps, opts)
    q.advance(-first.processed * 10_000) // fresh invocation, fresh budget
    const second = await drainSlips(q.deps, opts)

    expect(first.processed + second.processed).toBe(20)
    expect(second.remaining).toBe(0)
    expect(q.attempts).toHaveLength(20)
    expect(new Set(q.attempts).size).toBe(20)
  })

  it('does not re-extract a slip that fails to leave the pending state', async () => {
    // Without the attempted-set guard this spins, re-billing the same
    // extraction until the time budget runs out.
    const q = makeQueue(['slip-1', 'slip-2'], { stuckOn: new Set(['slip-1', 'slip-2']) })

    const result = await drainSlips(q.deps, { batchSize: 5, timeBudgetMs: 60_000 })

    expect(q.attempts).toEqual(['slip-1', 'slip-2'])
    expect(result.stopReason).toBe('drained')
    // Reported as 0 even though both rows are technically still pending:
    // ids already tried in this call are excluded from the count so a caller
    // looping on `remaining` cannot be sent round forever. A later call sees
    // them again with a fresh attempted-set.
    expect(result.remaining).toBe(0)
  })

  it('handles an empty queue without running a batch', async () => {
    const q = makeQueue([])

    const result = await drainSlips(q.deps)

    expect(result).toMatchObject({
      processed: 0,
      failed: 0,
      remaining: 0,
      batches: 0,
      stopReason: 'drained',
    })
    expect(q.resets).toHaveLength(0)
  })

  it('honours the concurrency ceiling that protects the AI rate limit', async () => {
    let inFlight = 0
    let peak = 0
    const q = makeQueue(twentySlips)
    const inner = q.deps.processSlip
    q.deps.processSlip = async (id) => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await Promise.resolve()
      inFlight--
      return inner(id)
    }

    await drainSlips(q.deps, { batchSize: DEFAULT_BATCH_SIZE, concurrency: 2 })

    expect(peak).toBeLessThanOrEqual(2)
  })
})

const drained = (over: Partial<DrainResult> = {}): DrainResult => ({
  processed: 0,
  failed: 0,
  remaining: 0,
  batches: 0,
  stopReason: 'drained',
  ...over,
})

describe('sweep staleness thresholds', () => {
  it('waits longer than any drain can hold slips at pending', () => {
    // The sweeper claims `pending` rows a user's own drain may still own. If
    // this margin ever inverts, the cron and the user extract the same slips
    // concurrently and every bulk upload gets billed twice.
    expect(STALE_PENDING_MS).toBeGreaterThan(DEFAULT_TIME_BUDGET_MS)
  })

  it('waits longer than a single slip extraction before reclaiming processing', () => {
    // Real extractions measured ~5-14s wall clock; 10 minutes is far past any
    // live one, so reclaiming cannot interrupt work in progress.
    expect(STALE_PROCESSING_MS).toBeGreaterThan(60_000)
  })
})

describe('sweepStrandedSlips', () => {
  it('drains every user that has stranded slips', async () => {
    const seen: string[] = []
    const result = await sweepStrandedSlips({
      listUsersWithStrandedSlips: async () => ['user-a', 'user-b', 'user-c'],
      drainUser: async (id) => {
        seen.push(id)
        return drained({ processed: 5 })
      },
    })

    expect(seen).toEqual(['user-a', 'user-b', 'user-c'])
    expect(result).toMatchObject({
      usersSwept: 3,
      processed: 15,
      failed: 0,
      remaining: 0,
      stopReason: 'complete',
    })
  })

  it('does nothing when no slips are stranded', async () => {
    const drainUser = jest.fn()
    const result = await sweepStrandedSlips({
      listUsersWithStrandedSlips: async () => [],
      drainUser,
    })

    expect(drainUser).not.toHaveBeenCalled()
    expect(result).toMatchObject({ usersSwept: 0, processed: 0, stopReason: 'complete' })
  })

  it("keeps sweeping when one user's drain throws", async () => {
    const result = await sweepStrandedSlips({
      listUsersWithStrandedSlips: async () => ['user-a', 'user-b', 'user-c'],
      drainUser: async (id) => {
        if (id === 'user-b') throw new Error('storage unavailable')
        return drained({ processed: 2 })
      },
    })

    // user-c must still be recovered — one bad queue cannot strand everyone.
    expect(result.usersSwept).toBe(3)
    expect(result.processed).toBe(4)
    expect(result.failed).toBe(1)
  })

  it('stops on the global budget rather than overrunning maxDuration', async () => {
    let clock = 0
    const result = await sweepStrandedSlips(
      {
        listUsersWithStrandedSlips: async () => ['a', 'b', 'c', 'd'],
        drainUser: async () => {
          clock += 100_000
          return drained({ processed: 1, remaining: 3 })
        },
        now: () => clock,
      },
      { timeBudgetMs: 250_000 }
    )

    expect(result.usersSwept).toBe(3)
    expect(result.stopReason).toBe('time_budget')
    // Unfinished work is reported, so the next hourly tick resumes it.
    expect(result.remaining).toBe(9)
  })

  it("carries each user's leftover count into the total", async () => {
    const result = await sweepStrandedSlips({
      listUsersWithStrandedSlips: async () => ['a', 'b'],
      drainUser: async () => drained({ processed: 50, remaining: 7 }),
    })

    expect(result.processed).toBe(100)
    expect(result.remaining).toBe(14)
  })
})
