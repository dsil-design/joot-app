import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  findDuplicateVendors,
  type VendorWithTransactions,
} from '@/lib/utils/vendor-duplicate-detection'

/**
 * Analyze Vendor Duplicates Cron Job
 * Runs periodically to detect and store potential duplicate vendors
 * This allows the UI to show instant results without computing on page load
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log('🔍 Starting vendor duplicate analysis job at', new Date().toISOString())

  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // For cron jobs, we'll process all users
    // Verify cron authentication if in production
    const authHeader = request.headers.get('authorization')
    const isAuthorized =
      process.env.NODE_ENV === 'development' ||
      authHeader === `Bearer ${process.env.CRON_SECRET}`

    if (!isAuthorized && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all users (or specific user if authenticated)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')

    if (usersError || !users) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    let totalSuggestionsCreated = 0
    const userResults: any[] = []

    // Process each user
    for (const userRecord of users) {
      const userId = userRecord.id
      console.log(`  Processing user: ${userId}`)

      // Fetch all vendors with transaction data for this user
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select('id, name, created_at, updated_at')
        .eq('user_id', userId)
        .order('name')

      if (vendorsError || !vendors || vendors.length === 0) {
        console.log(`    No vendors found for user ${userId}`)
        continue
      }

      // Fetch transaction counts and details for each vendor
      const vendorsWithTransactions: VendorWithTransactions[] = await Promise.all(
        vendors.map(async (vendor) => {
          const { count, error: countError } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('vendor_id', vendor.id)
            .eq('user_id', userId)

          // Fetch transaction date ranges
          const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select('transaction_date, amount')
            .eq('vendor_id', vendor.id)
            .eq('user_id', userId)
            .order('transaction_date', { ascending: true })

          if (countError || transactionsError || !transactions) {
            return {
              id: vendor.id,
              name: vendor.name,
              transactionCount: 0,
            }
          }

          const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
          const firstDate = transactions[0]?.transaction_date
          const lastDate = transactions[transactions.length - 1]?.transaction_date

          return {
            id: vendor.id,
            name: vendor.name,
            transactionCount: count || 0,
            totalAmount,
            firstTransactionDate: firstDate,
            lastTransactionDate: lastDate,
          }
        })
      )

      // Fetch existing suggestions to avoid duplicates
      const { data: existingSuggestions, error: suggestionsError } = await supabase
        .from('vendor_duplicate_suggestions')
        .select('*')
        .eq('user_id', userId)

      const excludePairs = new Set<string>()
      if (existingSuggestions) {
        existingSuggestions.forEach((suggestion) => {
          const pairId1 = `${suggestion.source_vendor_id}:${suggestion.target_vendor_id}`
          const pairId2 = `${suggestion.target_vendor_id}:${suggestion.source_vendor_id}`
          excludePairs.add(pairId1)
          excludePairs.add(pairId2)
        })
      }

      // Generate duplicate suggestions
      const newSuggestions = findDuplicateVendors(vendorsWithTransactions, {
        minConfidence: 40,
        maxSuggestions: 200,
        excludePairs,
      })

      console.log(`    Found ${newSuggestions.length} new duplicate suggestions`)

      // Save new suggestions to database
      if (newSuggestions.length > 0) {
        const suggestionInserts = newSuggestions.map((suggestion) => ({
          user_id: userId,
          source_vendor_id: suggestion.sourceVendor.id,
          target_vendor_id: suggestion.targetVendor.id,
          confidence_score: suggestion.confidence,
          reasons: suggestion.reasons,
          status: 'pending' as const,
        }))

        const { data: inserted, error: insertError } = await supabase
          .from('vendor_duplicate_suggestions')
          .insert(suggestionInserts)
          .select()

        if (insertError) {
          console.error(`    Error inserting suggestions for user ${userId}:`, insertError.message)
        } else {
          totalSuggestionsCreated += inserted?.length || 0
          console.log(`    ✅ Inserted ${inserted?.length || 0} suggestions`)
        }
      }

      userResults.push({
        userId,
        vendorCount: vendors.length,
        suggestionsFound: newSuggestions.length,
        suggestionsInserted: newSuggestions.length,
      })
    }

    const duration = Date.now() - startTime
    console.log(`✨ Analysis completed: ${totalSuggestionsCreated} suggestions created in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: `Analyzed ${users.length} user(s), created ${totalSuggestionsCreated} suggestions`,
      usersProcessed: users.length,
      totalSuggestionsCreated,
      userResults,
      duration,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('💥 Analysis job failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Support POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request)
}
