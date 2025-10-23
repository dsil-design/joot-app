# All Transactions Page - Pagination & Performance Testing Plan

## Overview
This document outlines the testing plan for the new cursor-based pagination system implemented for the All Transactions page.

## Changes Summary

### 1. Default Filter Fix
- **Changed**: Default filter from `'this-month'` to `'all-time'`
- **Location**: `src/app/transactions/page.tsx:873-875`
- **Impact**: Users now see ALL transactions by default instead of only current month

### 2. Server-Side Pagination API
- **New File**: `src/app/api/transactions/route.ts`
- **Features**:
  - Cursor-based pagination (30 items per page)
  - Server-side filtering (date range, transaction type, vendor, payment method, search)
  - Returns total count and next cursor
  - Optimized database queries

### 3. Infinite Scroll Hook
- **New File**: `src/hooks/use-paginated-transactions.ts`
- **Features**:
  - React Query integration
  - Automatic page flattening
  - 30-second stale time
  - 5-minute garbage collection

### 4. Enhanced Loading States
- **New File**: `src/components/ui/transaction-list-skeleton.tsx`
- **Features**:
  - Skeleton loaders for both card and table views
  - "Loading more" indicator for infinite scroll
  - Matches actual content structure

### 5. Database Indexes
- **New File**: `database/migrations/20251023000000_add_transactions_pagination_index.sql`
- **Indexes Added**:
  - `idx_transactions_pagination`: Composite index (user_id, transaction_date DESC, id DESC)
  - `idx_transactions_type_user`: Transaction type filtering
  - `idx_transactions_vendor_user`: Vendor filtering
  - `idx_transactions_payment_method_user`: Payment method filtering

## Testing Checklist

### Phase 1: Basic Functionality ✅

#### Initial Page Load
- [ ] Page loads with "All Time" filter selected by default
- [ ] First 30 transactions display immediately
- [ ] Skeleton loader shows during initial load
- [ ] No console errors in browser dev tools
- [ ] Loading spinner appears in correct location

#### Infinite Scroll
- [ ] Scrolling to bottom triggers automatic loading of next page
- [ ] "Loading more transactions..." indicator appears
- [ ] New transactions append to existing list
- [ ] No duplicate transactions appear
- [ ] Scroll position maintains after new data loads
- [ ] Infinite scroll stops when all transactions are loaded

#### All Time Filter
- [ ] Transactions from all dates are accessible
- [ ] Can scroll through entire transaction history
- [ ] Transaction count matches database total
- [ ] Oldest transactions eventually appear when scrolling

### Phase 2: Filter Testing

#### Date Range Filters
- [ ] "This Month" filter shows only current month transactions
- [ ] "Last Month" filter shows only previous month
- [ ] "This Quarter" filter shows correct 3-month range
- [ ] "This Year" filter shows year-to-date transactions
- [ ] "Last Year" filter shows previous year only
- [ ] "All Time" filter shows all transactions (default)
- [ ] Custom date range picker works correctly
- [ ] Changing filters resets scroll position
- [ ] Changing filters shows loading skeleton

#### Transaction Type Filters
- [ ] "All" shows both expenses and income
- [ ] "Expenses" shows only expense transactions
- [ ] "Income" shows only income transactions
- [ ] Filter count matches displayed results

#### Vendor Filters
- [ ] Single vendor selection works
- [ ] Multiple vendor selection works
- [ ] Clear vendors filter resets to all
- [ ] Vendor filter persists during scroll

#### Payment Method Filters
- [ ] Single payment method selection works
- [ ] Multiple payment method selection works
- [ ] "None" option shows transactions without payment method
- [ ] Clear payment methods filter resets to all

#### Search Functionality
- [ ] Search by description works
- [ ] Search by vendor name works (if visible in data)
- [ ] Search by payment method name works (if visible in data)
- [ ] Search updates results immediately
- [ ] Clear search resets to full list

#### Combined Filters
- [ ] Date range + transaction type works
- [ ] Date range + vendor works
- [ ] Transaction type + search works
- [ ] All filters combined work together
- [ ] Clearing filters returns to "All Time" default

### Phase 3: Performance Testing

#### Initial Load Performance
- [ ] First paint occurs within 300ms
- [ ] Skeleton loader visible within 100ms
- [ ] First 30 transactions load within 500ms
- [ ] No layout shift during load (CLS < 0.1)
- [ ] Network request size < 50KB for first page

#### Pagination Performance
- [ ] Next page loads within 200ms
- [ ] Database query time < 50ms (check server logs)
- [ ] No memory leaks during extended scrolling
- [ ] Browser remains responsive during loading

#### Large Dataset Performance
- [ ] Test with 1,000+ transactions
- [ ] Test with 10,000+ transactions
- [ ] Scroll performance remains smooth (60fps)
- [ ] Memory usage stays under 100MB

### Phase 4: View Mode Testing

#### Cards View
- [ ] Cards display correctly with pagination
- [ ] Infinite scroll works in cards view
- [ ] Skeleton loader matches card layout
- [ ] All card features work (vendor, amount, date, tags)

#### Table View
- [ ] Table displays correctly with pagination
- [ ] Infinite scroll works in table view
- [ ] Skeleton loader matches table layout
- [ ] All table features work (sorting, columns)
- [ ] Horizontal scroll works if needed

#### View Mode Switching
- [ ] Switching from cards to table preserves data
- [ ] Switching from table to cards preserves data
- [ ] Scroll position resets appropriately
- [ ] Loading state shows during switch if needed

### Phase 5: Existing Features

#### Bulk Operations
- [ ] Select all works (only selects visible transactions)
- [ ] Select individual transactions works
- [ ] Bulk delete works
- [ ] Bulk edit vendor works
- [ ] Bulk edit date works
- [ ] Bulk edit payment method works
- [ ] Bulk edit description works
- [ ] Selection persists during scroll

#### Individual Transaction Operations
- [ ] Edit transaction modal opens
- [ ] Edit transaction saves correctly
- [ ] Delete transaction works
- [ ] Add transaction works
- [ ] Transaction tags work
- [ ] Changes reflect immediately in list

#### Currency & Exchange Rates
- [ ] "Recorded Cost" view shows original currencies
- [ ] "All USD" conversion works
- [ ] "All THB" conversion works
- [ ] Exchange rate toggle works
- [ ] Exchange rates display correctly

#### Sorting
- [ ] Sort by date (asc/desc) works
- [ ] Sort by description works
- [ ] Sort by vendor works
- [ ] Sort by amount works
- [ ] Sort persists during pagination

### Phase 6: Edge Cases & Error Handling

#### Empty States
- [ ] No transactions message shows when filters return zero results
- [ ] Empty state shows appropriate message
- [ ] Empty state provides clear action (clear filters)

#### Error Handling
- [ ] Network error shows error message
- [ ] Error message provides retry button
- [ ] Retry button refetches data
- [ ] Database error handled gracefully
- [ ] Auth error redirects to login

#### Boundary Conditions
- [ ] Single transaction displays correctly
- [ ] Exactly 30 transactions (one page) works
- [ ] 31 transactions (pagination boundary) works
- [ ] Very long transaction descriptions don't break layout
- [ ] Very large amounts format correctly

#### Browser Compatibility
- [ ] Chrome/Edge: All features work
- [ ] Firefox: All features work
- [ ] Safari: All features work
- [ ] Mobile Safari (iOS): All features work
- [ ] Chrome Mobile (Android): All features work

### Phase 7: Accessibility

#### Keyboard Navigation
- [ ] Tab navigation works through all filters
- [ ] Enter key activates buttons
- [ ] Space bar selects checkboxes
- [ ] Arrow keys work in dropdowns
- [ ] Escape closes modals

#### Screen Reader Support
- [ ] Loading states announced
- [ ] Error states announced
- [ ] Filter changes announced
- [ ] New transactions loading announced
- [ ] ARIA labels present and correct

### Phase 8: Regression Testing

#### Features That Should Still Work
- [ ] URL routing works
- [ ] Back/forward browser buttons work
- [ ] Page refresh preserves filters (if implemented)
- [ ] Mobile responsive design works
- [ ] Touch gestures work on mobile
- [ ] Pull-to-refresh works (if implemented)

## Performance Benchmarks

### Target Metrics
- **Initial Load**: < 500ms (First Contentful Paint)
- **Time to Interactive**: < 1000ms
- **Subsequent Page Load**: < 200ms
- **Lighthouse Performance Score**: > 90
- **Lighthouse Accessibility Score**: > 95

### Database Query Performance
- **First Page Query**: < 50ms
- **Subsequent Page Queries**: < 30ms
- **Filter Query**: < 100ms
- **Total Query Count**: < 5 per page load

## Test Data Requirements

### Minimum Test Dataset
- At least 100 transactions spanning multiple months
- Mix of expenses and income
- Multiple vendors (10+)
- Multiple payment methods (5+)
- Various transaction amounts
- Some transactions with tags, some without

### Comprehensive Test Dataset
- 1,000+ transactions
- Date range spanning 2+ years
- 50+ unique vendors
- 10+ payment methods
- Edge cases:
  - Very large amounts (millions)
  - Very small amounts (cents)
  - Transactions on same date/time
  - Long descriptions (500+ characters)

## Known Limitations

1. **Search Functionality**: Currently limited to server-side search. Vendor and payment method name search works only if included in the query string format.

2. **Real-time Updates**: New transactions added by other devices won't appear until page refresh or refetch.

3. **Selection Persistence**: Selecting "all" only selects visible transactions, not all transactions in database.

4. **Sort + Pagination**: Changing sort order may affect pagination cursors, requiring refetch.

## Rollback Plan

If critical issues are found:

1. **Immediate Rollback** (< 5 minutes):
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Database Rollback** (if needed):
   ```sql
   DROP INDEX idx_transactions_pagination;
   DROP INDEX idx_transactions_type_user;
   DROP INDEX idx_transactions_vendor_user;
   DROP INDEX idx_transactions_payment_method_user;
   ```

3. **Feature Flag** (recommended for gradual rollout):
   - Add environment variable: `ENABLE_PAGINATION=false`
   - Conditionally use old hook vs new hook
   - Deploy to 5% → 25% → 100% of users

## Success Criteria

✅ All Phase 1-5 tests pass
✅ Performance benchmarks met
✅ No regression in existing features
✅ Accessibility score remains high
✅ Zero critical bugs in production

## Post-Launch Monitoring

Monitor for 7 days after launch:
- Server response times (should be < 100ms average)
- Error rates (should be < 0.1%)
- User engagement (page views, session duration)
- Performance metrics (Lighthouse scores)
- User feedback (support tickets, bug reports)

## Next Steps After Testing

1. ✅ Fix any critical bugs found
2. ✅ Optimize any slow queries
3. ⏳ Implement feature flag for gradual rollout
4. ⏳ Set up monitoring and alerts
5. ⏳ Create user documentation/announcement
6. ⏳ Deploy to production
7. ⏳ Monitor for 7 days
8. ⏳ Collect user feedback
9. ⏳ Iterate based on feedback
