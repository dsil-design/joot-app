# Exchange Rate Sync Strategy

## Overview

The exchange rate sync system uses a **day-based strategy** to optimize performance and prevent timeouts while ensuring data integrity.

## Problem Fixed

**Previous Issue:**
- Daily sync was running BOTH full historical sync AND daily sync on every run
- Full sync was taking 4+ minutes and timing out at 270 seconds
- USD cross-rates (USD/THB, USD/EUR, etc.) stopped updating after Oct 15, 2025
- All syncs failing with "Sync timeout exceeded (270s)"

## New Strategy

### Monday - Friday (Weekdays)
**Fast Daily Sync** (~10-30 seconds)
- ✅ Fetches **today's** ECB rates (same-day data!)
- ✅ Calculates all cross-rates (EUR, USD, GBP, etc.)
- ✅ Fills gaps for the last 7 days if needed
- ✅ Completes well under the 5-minute Vercel timeout
- ⚡ **Expected duration: 10-30 seconds**

**Note:** ECB publishes rates around 14:00-15:00 UTC. Our cron runs at 18:00 UTC, providing a 3-4 hour buffer to ensure rates are available.

### Sunday
**Full Maintenance Sync** (~4-5 minutes)
- 📊 Downloads complete ECB historical XML (since 2016)
- 🔍 Compares all rates against database
- 🔄 Updates, inserts, or deletes rates as needed
- ✅ Verifies data integrity across all currency pairs
- 🔧 Catches any issues from the week
- ⏱️ **Expected duration: 4-5 minutes** (within 5-minute limit)

### Saturday
**Skipped**
- ECB does not publish rates on weekends
- No sync needed
- Sunday maintenance will handle any weekend gaps

## Technical Details

### Daily Sync Flow (Weekdays)
1. Fetch ECB daily XML (~5KB, 30-50 rates)
2. Parse and validate rates
3. Calculate EUR direct pairs (EUR/USD, EUR/THB, etc.)
4. Calculate USD cross-rates (USD/THB, USD/GBP, etc.)
5. Calculate other cross-rates (GBP/THB, SGD/THB, etc.)
6. Insert all rates to database (~6-18 pairs × 2 directions = 12-36 rates)
7. Fill any gaps from the last 7 days

### Full Sync Flow (Sunday)
1. Download full ECB historical XML (~3-5MB, 45k+ rates)
2. Parse all historical rates
3. Filter by configured date range and currencies
4. Compare each rate against database (diff calculation)
5. Batch insert new rates
6. Update changed rates
7. Delete obsolete rates
8. Clean up old data outside configured range

## Cron Schedule

Configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-all-rates",
      "schedule": "0 18 * * *"  // 18:00 UTC daily
    }
  ]
}
```

- **18:00 UTC** = 6:00 PM UTC
- **ECB publishes** around 16:00 CET (14:00-15:00 UTC)
- This gives 3-4 hours buffer after ECB publishes

## Benefits

### Performance
- ✅ Daily syncs complete in seconds (was timing out at 270s)
- ✅ No more timeout errors
- ✅ Faster data availability for users

### Reliability
- ✅ Weekday syncs never timeout (too fast)
- ✅ Sunday maintenance has full 5 minutes
- ✅ Automatic gap filling catches any issues

### Data Integrity
- ✅ Weekly full sync verifies all data
- ✅ Daily syncs keep rates up-to-date
- ✅ Gap filling handles ECB holidays/outages

## Monitoring

### Check Sync Status
```bash
node scripts/db/check-exchange-rates.js
```

### View Recent Syncs
```sql
SELECT
  started_at,
  status,
  sync_type,
  duration_ms,
  new_rates_inserted,
  error_message
FROM sync_history
ORDER BY started_at DESC
LIMIT 10;
```

### Expected Patterns
- **Mon-Fri**: `status='completed'`, `duration_ms < 30000`, `new_rates_inserted ~30`
- **Sunday**: `status='completed'`, `duration_ms < 300000`, varies based on changes
- **Saturday**: No new sync records (skipped)

## Manual Testing

Test the weekday fast sync:
```bash
node scripts/test-daily-sync.js
```

Trigger manual sync (admin endpoint):
```bash
curl -X POST http://localhost:3000/api/admin/sync/trigger \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json"
```

## Files Modified

- `src/app/api/cron/sync-all-rates/route.ts` - Implements day-based logic
- `docs/sync-strategy.md` - This documentation

## Rollback Plan

If issues occur, revert by:
1. Remove day-based conditional logic
2. Restore original sync-all-rates/route.ts from git
3. Or disable auto-sync in database:
   ```sql
   UPDATE sync_configuration SET auto_sync_enabled = false;
   ```

## Future Improvements

Potential optimizations for Sunday full sync:
1. **Optimize diff calculation**: Batch database queries instead of per-date
2. **Incremental sync**: Only sync last 60-90 days on Sunday, quarterly full sync
3. **Progress checkpointing**: Save progress and resume if timeout occurs
4. **Parallel processing**: Process currency pairs in parallel

## Related Documentation

- [ECB Data Source](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel Function Timeouts](https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration)
