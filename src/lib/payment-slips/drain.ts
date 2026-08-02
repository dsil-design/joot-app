/**
 * Payment slip drain loop.
 *
 * Extraction used to advance one batch per HTTP request, with the browser
 * responsible for calling back until the queue emptied. A June upload of 20
 * slips processed exactly 5: the first batch returned `remaining: 15` and the
 * follow-up call never arrived, because the loop lived in a fire-and-forget
 * IIFE in the upload modal — a modal that reports success and offers a
 * "View All" button the moment uploads finish, while ~2 minutes of extraction
 * still needs the page to stay open. Nothing server-side re-drove the leftovers
 * and both failure branches were silent, so 15 slips sat at `pending`
 * indefinitely, invisible to every month-filtered view (the month comes from
 * `transaction_date`, which only extraction populates).
 *
 * The queue is drained here instead, inside one invocation, so completion no
 * longer depends on the browser surviving.
 */

/** Slips extracted per round. */
export const DEFAULT_BATCH_SIZE = 5

/** Concurrent vision extractions. Deliberately low: a bulk drop that outran
 *  the Anthropic rate limit once turned 45 slips into dead `failed` rows. */
export const DEFAULT_CONCURRENCY = 2

/**
 * Wall-clock budget for one drain. Sized against the route's `maxDuration` of
 * 300s with headroom, so the loop stops on its own terms and reports an honest
 * `remaining` rather than being killed mid-batch with the count lost.
 */
export const DEFAULT_TIME_BUDGET_MS = 240_000

/**
 * A slip left in `processing` for longer than this was orphaned by an
 * invocation that died mid-extraction. Such rows match neither the `pending`
 * scope nor the `failed-retryable` scope, so without reclaiming them they are
 * stranded exactly the way the 15 June slips were.
 */
export const STALE_PROCESSING_MS = 10 * 60_000

/**
 * How long a slip must sit at `pending` before the sweeper treats it as
 * abandoned rather than merely queued.
 *
 * MUST stay comfortably above DEFAULT_TIME_BUDGET_MS: a user-initiated drain
 * holds its queue at `pending` for up to one time budget, and a sweeper that
 * undercut that would extract the same slips concurrently and bill twice.
 * Asserted in the drain tests.
 */
export const STALE_PENDING_MS = 15 * 60_000

export type DrainStopReason = 'drained' | 'time_budget' | 'no_progress'

export interface DrainResult {
  processed: number
  failed: number
  /** Slips still awaiting extraction when the loop stopped. */
  remaining: number
  /** Batches actually run — 0 means the queue was already empty. */
  batches: number
  stopReason: DrainStopReason
}

export interface DrainDeps {
  /**
   * Returns up to `limit` slip ids awaiting extraction, oldest first,
   * excluding any id in `exclude`.
   */
  claimCandidates: (limit: number, exclude: Set<string>) => Promise<string[]>
  /** Number of slips still awaiting extraction, for an accurate `remaining`. */
  countRemaining: (exclude: Set<string>) => Promise<number>
  /** Resets rows to a clean `pending` state before reprocessing. */
  resetBatch: (ids: string[]) => Promise<void>
  /** Extracts one slip. Rejecting means the row was already marked `failed`. */
  processSlip: (id: string) => Promise<unknown>
  /** Injectable for tests. */
  now?: () => number
}

export interface DrainOptions {
  batchSize?: number
  concurrency?: number
  timeBudgetMs?: number
}

/**
 * Drain the slip queue until it is empty or the time budget is spent.
 *
 * Every id attempted in this call is remembered and never offered again, so a
 * slip that somehow fails to leave the `pending` state cannot spin the loop
 * into re-extracting it (and re-billing it) until the budget runs out.
 */
export async function drainSlips(
  deps: DrainDeps,
  options: DrainOptions = {}
): Promise<DrainResult> {
  const batchSize = Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE)
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY)
  const timeBudgetMs = Math.max(0, options.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS)
  const now = deps.now ?? Date.now
  const startedAt = now()

  const attempted = new Set<string>()
  let processed = 0
  let failed = 0
  let batches = 0
  let stopReason: DrainStopReason = 'drained'

  for (;;) {
    if (now() - startedAt >= timeBudgetMs) {
      stopReason = 'time_budget'
      break
    }

    const batch = await deps.claimCandidates(batchSize, attempted)
    if (batch.length === 0) {
      stopReason = 'drained'
      break
    }

    // A round that returns only ids we have already tried means the queue is
    // not draining; stop rather than burn the remaining budget on retries.
    const fresh = batch.filter((id) => !attempted.has(id))
    if (fresh.length === 0) {
      stopReason = 'no_progress'
      break
    }
    for (const id of fresh) attempted.add(id)

    // Reset before processing so a reprocessed slip starts clean.
    await deps.resetBatch(fresh)

    let cursor = 0
    const worker = async () => {
      while (cursor < fresh.length) {
        const id = fresh[cursor++]
        try {
          await deps.processSlip(id)
          processed++
        } catch {
          // processSlip already recorded the failure on the row.
          failed++
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(concurrency, fresh.length) }, worker)
    )
    batches++
  }

  const remaining = await deps.countRemaining(attempted)

  return { processed, failed, remaining, batches, stopReason }
}

export interface SweepResult {
  /** Users that had stranded slips and were drained. */
  usersSwept: number
  processed: number
  failed: number
  /** Slips still stranded when the sweep stopped. */
  remaining: number
  stopReason: 'complete' | 'time_budget'
}

export interface SweepDeps {
  /** User ids owning at least one abandoned slip. */
  listUsersWithStrandedSlips: () => Promise<string[]>
  /** Drains one user's stranded queue. */
  drainUser: (userId: string) => Promise<DrainResult>
  now?: () => number
}

/**
 * Sweep abandoned slips across all users.
 *
 * The drain loop removed the need for the browser to *continue* extraction,
 * but the browser is still what *starts* it. A request that never lands —
 * a dropped connection, an expired token, a 502 — leaves slips at `pending`
 * with nothing to re-drive them. This is that missing re-drive.
 *
 * A user whose drain throws does not abort the sweep; the next user still
 * gets processed and the failure is reflected in the result.
 */
export async function sweepStrandedSlips(
  deps: SweepDeps,
  options: { timeBudgetMs?: number } = {}
): Promise<SweepResult> {
  const timeBudgetMs = Math.max(0, options.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS)
  const now = deps.now ?? Date.now
  const startedAt = now()

  const userIds = await deps.listUsersWithStrandedSlips()

  let usersSwept = 0
  let processed = 0
  let failed = 0
  let remaining = 0
  let stopReason: SweepResult['stopReason'] = 'complete'

  for (const userId of userIds) {
    if (now() - startedAt >= timeBudgetMs) {
      stopReason = 'time_budget'
      break
    }

    try {
      const result = await deps.drainUser(userId)
      processed += result.processed
      failed += result.failed
      remaining += result.remaining
    } catch {
      // One user's queue must not strand everyone else's.
      failed++
    }
    usersSwept++
  }

  return { usersSwept, processed, failed, remaining, stopReason }
}
