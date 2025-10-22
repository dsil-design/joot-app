-- Script to check vendor and transaction integrity
-- This helps identify orphaned vendors and verify no transactions were lost

-- 1. Count all transactions
SELECT
    'Total Transactions' as metric,
    COUNT(*) as count
FROM public.transactions;

-- 2. Find vendors with 0 transactions
SELECT
    'Vendors with 0 Transactions' as metric,
    v.id,
    v.name,
    v.user_id,
    v.created_at,
    v.updated_at,
    COUNT(t.id) as transaction_count
FROM public.vendors v
LEFT JOIN public.transactions t ON t.vendor_id = v.id
GROUP BY v.id, v.name, v.user_id, v.created_at, v.updated_at
HAVING COUNT(t.id) = 0
ORDER BY v.created_at DESC;

-- 3. Count vendors by transaction count
SELECT
    'Vendor Distribution by Transaction Count' as metric,
    CASE
        WHEN txn_count = 0 THEN '0 transactions'
        WHEN txn_count = 1 THEN '1 transaction'
        WHEN txn_count BETWEEN 2 AND 5 THEN '2-5 transactions'
        WHEN txn_count BETWEEN 6 AND 10 THEN '6-10 transactions'
        WHEN txn_count > 10 THEN '10+ transactions'
    END as range,
    COUNT(*) as vendor_count
FROM (
    SELECT
        v.id,
        COUNT(t.id) as txn_count
    FROM public.vendors v
    LEFT JOIN public.transactions t ON t.vendor_id = v.id
    GROUP BY v.id
) vendor_txn_counts
GROUP BY range
ORDER BY
    CASE
        WHEN range = '0 transactions' THEN 1
        WHEN range = '1 transaction' THEN 2
        WHEN range = '2-5 transactions' THEN 3
        WHEN range = '6-10 transactions' THEN 4
        WHEN range = '10+ transactions' THEN 5
    END;

-- 4. Check for transactions with invalid vendor_id (orphaned transactions)
SELECT
    'Orphaned Transactions (invalid vendor_id)' as metric,
    t.id,
    t.vendor_id,
    t.description,
    t.transaction_date,
    t.user_id
FROM public.transactions t
WHERE t.vendor_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.vendors v WHERE v.id = t.vendor_id
)
ORDER BY t.transaction_date DESC
LIMIT 20;

-- 5. Total counts summary
SELECT
    'Summary' as info,
    (SELECT COUNT(*) FROM public.vendors) as total_vendors,
    (SELECT COUNT(*) FROM public.transactions) as total_transactions,
    (SELECT COUNT(*) FROM public.transactions WHERE vendor_id IS NOT NULL) as transactions_with_vendor,
    (SELECT COUNT(*) FROM public.transactions WHERE vendor_id IS NULL) as transactions_without_vendor,
    (SELECT COUNT(*) FROM public.vendors v WHERE NOT EXISTS (SELECT 1 FROM public.transactions t WHERE t.vendor_id = v.id)) as vendors_with_zero_transactions;

-- 6. Recent vendor duplicate suggestion merges
SELECT
    'Recent Vendor Merges (from suggestions)' as metric,
    vds.id,
    vds.status,
    vds.confidence_score,
    vds.resolved_at,
    vds.created_at
FROM public.vendor_duplicate_suggestions vds
WHERE vds.status = 'merged'
ORDER BY vds.resolved_at DESC NULLS LAST
LIMIT 10;
