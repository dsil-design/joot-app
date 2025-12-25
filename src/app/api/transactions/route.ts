import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface TransactionFilters {
  datePreset?: string
  dateFrom?: string
  dateTo?: string
  searchKeyword?: string
  vendorIds?: string[]
  paymentMethodIds?: string[]
  transactionType?: "all" | "expense" | "income"
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query parameters with validation
    const searchParams = request.nextUrl.searchParams

    // Validate and limit page size (1-100)
    const rawPageSize = parseInt(searchParams.get("pageSize") || "30")
    const pageSize = Math.min(Math.max(isNaN(rawPageSize) ? 30 : rawPageSize, 1), 100)

    const cursor = searchParams.get("cursor") // Format: "date,id"
    const sortField = searchParams.get("sortField") || "date"

    // Validate sort direction
    const rawSortDirection = searchParams.get("sortDirection") || "desc"
    const sortDirection = ["asc", "desc"].includes(rawSortDirection) ? rawSortDirection : "desc"

    // Parse filters with validation
    const filters: TransactionFilters = {
      datePreset: searchParams.get("datePreset") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      // Limit search keyword length to prevent abuse
      searchKeyword: searchParams.get("searchKeyword")?.slice(0, 200) || undefined,
      // Limit number of filter IDs to prevent DOS
      vendorIds: searchParams.get("vendorIds")?.split(",").filter(Boolean).slice(0, 50),
      paymentMethodIds: searchParams.get("paymentMethodIds")?.split(",").filter(Boolean).slice(0, 50),
      transactionType: (searchParams.get("transactionType") as "all" | "expense" | "income") || "all",
    }

    // Build base query (without tags for now)
    let query = supabase
      .from("transactions")
      .select(`
        *,
        vendors!transactions_vendor_id_fkey (id, name),
        payment_methods!transactions_payment_method_id_fkey (id, name)
      `, { count: 'exact' })
      .eq("user_id", user.id)

    // Apply sorting based on sortField
    const isAscending = sortDirection === "asc"
    switch (sortField) {
      case "date":
        query = query.order("transaction_date", { ascending: isAscending })
        query = query.order("id", { ascending: isAscending }) // Secondary sort for consistency
        break
      case "description":
        query = query.order("description", { ascending: isAscending })
        query = query.order("id", { ascending: isAscending })
        break
      case "amount":
        query = query.order("amount", { ascending: isAscending })
        query = query.order("id", { ascending: isAscending })
        break
      case "vendor":
        // Note: Sorting by joined table is complex in Supabase, will need client-side fallback
        query = query.order("vendor_id", { ascending: isAscending })
        query = query.order("id", { ascending: isAscending })
        break
      default:
        // Default to date DESC
        query = query.order("transaction_date", { ascending: false })
        query = query.order("id", { ascending: false })
    }

    // Apply cursor pagination
    if (cursor) {
      const cursorParts = cursor.split(",")

      // Validate cursor format
      if (cursorParts.length >= 2) {
        const cursorId = cursorParts[cursorParts.length - 1] // ID is always last

        if (sortField === "date") {
          const cursorDate = cursorParts[0]
          if (isAscending) {
            query = query.or(`transaction_date.gt.${cursorDate},and(transaction_date.eq.${cursorDate},id.gt.${cursorId})`)
          } else {
            query = query.or(`transaction_date.lt.${cursorDate},and(transaction_date.eq.${cursorDate},id.lt.${cursorId})`)
          }
        } else {
          // For other sort fields, use ID-only pagination as fallback
          // This is less efficient but ensures pagination works
          if (isAscending) {
            query = query.gt("id", cursorId)
          } else {
            query = query.lt("id", cursorId)
          }
        }
      }
    }

    // Apply transaction type filter
    if (filters.transactionType && filters.transactionType !== "all") {
      query = query.eq("transaction_type", filters.transactionType)
    }

    // Apply date range filter (only if not "all-time")
    if (filters.dateFrom && filters.datePreset !== "all-time") {
      query = query.gte("transaction_date", filters.dateFrom)
    }
    if (filters.dateTo && filters.datePreset !== "all-time") {
      query = query.lte("transaction_date", filters.dateTo)
    }

    // Apply vendor filter
    if (filters.vendorIds && filters.vendorIds.length > 0) {
      query = query.in("vendor_id", filters.vendorIds)
    }

    // Apply payment method filter
    if (filters.paymentMethodIds && filters.paymentMethodIds.length > 0) {
      // Check if "none" is in the filter (transactions without payment method)
      const hasNone = filters.paymentMethodIds.includes("none")
      const otherIds = filters.paymentMethodIds.filter(id => id !== "none")

      if (hasNone && otherIds.length > 0) {
        // Both "none" and specific IDs: use OR logic
        query = query.or(`payment_method_id.is.null,payment_method_id.in.(${otherIds.join(",")})`)
      } else if (hasNone) {
        // Only "none": transactions without payment method
        query = query.is("payment_method_id", null)
      } else {
        // Only specific IDs
        query = query.in("payment_method_id", otherIds)
      }
    }

    // Apply search keyword filter (description only - vendor/payment method search not supported in joined queries)
    // For better search, consider using PostgreSQL full-text search
    if (filters.searchKeyword) {
      query = query.ilike("description", `%${filters.searchKeyword}%`)
    }

    // Fetch one extra to determine if there's a next page
    query = query.limit(pageSize + 1)

    const { data: transactions, error, count } = await query

    if (error) {
      console.error("Error fetching transactions:", error)
      return NextResponse.json({ error: "Failed to fetch transactions. Please try again." }, { status: 500 })
    }

    // Fetch tags by re-querying transactions with tag data only
    // This works with RLS because we're querying from transactions table
    const transactionIds = transactions.map((t: any) => t.id)
    const { data: transactionsWithTags, error: tagsError } = await supabase
      .from('transactions')
      .select(`
        id,
        transaction_tags!transaction_tags_transaction_id_fkey (
          tags!transaction_tags_tag_id_fkey (id, name, color)
        )
      `)
      .in('id', transactionIds)
      .eq('user_id', user.id)

    if (tagsError) {
      console.error('Error fetching tags:', tagsError)
    }

    // Build a map of transaction_id -> tags[]
    const tagsMap = new Map<string, any[]>()
    if (transactionsWithTags) {
      transactionsWithTags.forEach((t: any) => {
        const tags = t.transaction_tags?.map((tt: any) => tt.tags).filter(Boolean) || []
        tagsMap.set(t.id, tags)
      })
    }

    // Calculate totals for the entire filtered dataset (without pagination)
    let totalsQuery = supabase
      .from("transactions")
      .select("transaction_type, amount, original_currency")
      .eq("user_id", user.id)

    // Apply the same filters as the main query (excluding cursor pagination)
    if (filters.transactionType && filters.transactionType !== "all") {
      totalsQuery = totalsQuery.eq("transaction_type", filters.transactionType)
    }
    if (filters.dateFrom && filters.datePreset !== "all-time") {
      totalsQuery = totalsQuery.gte("transaction_date", filters.dateFrom)
    }
    if (filters.dateTo && filters.datePreset !== "all-time") {
      totalsQuery = totalsQuery.lte("transaction_date", filters.dateTo)
    }
    if (filters.vendorIds && filters.vendorIds.length > 0) {
      totalsQuery = totalsQuery.in("vendor_id", filters.vendorIds)
    }
    if (filters.paymentMethodIds && filters.paymentMethodIds.length > 0) {
      // Check if "none" is in the filter (transactions without payment method)
      const hasNone = filters.paymentMethodIds.includes("none")
      const otherIds = filters.paymentMethodIds.filter(id => id !== "none")

      if (hasNone && otherIds.length > 0) {
        // Both "none" and specific IDs: use OR logic
        totalsQuery = totalsQuery.or(`payment_method_id.is.null,payment_method_id.in.(${otherIds.join(",")})`)
      } else if (hasNone) {
        // Only "none": transactions without payment method
        totalsQuery = totalsQuery.is("payment_method_id", null)
      } else {
        // Only specific IDs
        totalsQuery = totalsQuery.in("payment_method_id", otherIds)
      }
    }
    if (filters.searchKeyword) {
      totalsQuery = totalsQuery.ilike("description", `%${filters.searchKeyword}%`)
    }

    const { data: totalsData, error: totalsError } = await totalsQuery

    // Calculate aggregated totals by currency and transaction type
    const totals = {
      expenses: { USD: 0, THB: 0, VND: 0, MYR: 0, CNY: 0 },
      income: { USD: 0, THB: 0, VND: 0, MYR: 0, CNY: 0 }
    }

    if (!totalsError && totalsData) {
      totalsData.forEach((transaction: any) => {
        const currency = transaction.original_currency as 'USD' | 'THB' | 'VND' | 'MYR' | 'CNY'
        const type = transaction.transaction_type as 'expense' | 'income'

        if (type === 'expense') {
          totals.expenses[currency] = (totals.expenses[currency] || 0) + transaction.amount
        } else if (type === 'income') {
          totals.income[currency] = (totals.income[currency] || 0) + transaction.amount
        }
      })
    }

    // Determine if there's a next page
    const hasNextPage = transactions.length > pageSize
    const rawItems = hasNextPage ? transactions.slice(0, pageSize) : transactions

    // Transform the data to include tags array and rename joined tables
    const items = rawItems.map((transaction: any) => ({
      ...transaction,
      vendor: transaction.vendors,  // Rename vendors (plural) to vendor (singular)
      payment_method: transaction.payment_methods,  // Rename payment_methods (plural) to payment_method (singular)
      tags: tagsMap.get(transaction.id) || []
    }))

    // Generate next cursor from last item
    let nextCursor: string | null = null
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1]
      nextCursor = `${lastItem.transaction_date},${lastItem.id}`
    }

    return NextResponse.json({
      items,
      nextCursor,
      hasNextPage,
      totalCount: count || 0,
      pageSize: items.length,
      totals, // Include aggregated totals for the entire filtered dataset
    })
  } catch (error) {
    console.error("Unexpected error in transactions API:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    )
  }
}
