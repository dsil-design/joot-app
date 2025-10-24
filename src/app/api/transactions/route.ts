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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const pageSize = parseInt(searchParams.get("pageSize") || "30")
    const cursor = searchParams.get("cursor") // Format: "date,id"
    const sortField = searchParams.get("sortField") || "date"
    const sortDirection = searchParams.get("sortDirection") || "desc"

    // Parse filters
    const filters: TransactionFilters = {
      datePreset: searchParams.get("datePreset") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      searchKeyword: searchParams.get("searchKeyword") || undefined,
      vendorIds: searchParams.get("vendorIds")?.split(",").filter(Boolean),
      paymentMethodIds: searchParams.get("paymentMethodIds")?.split(",").filter(Boolean),
      transactionType: (searchParams.get("transactionType") as "all" | "expense" | "income") || "all",
    }

    // Build base query
    let query = supabase
      .from("transactions")
      .select(`
        *,
        vendors (id, name),
        payment_methods (id, name),
        transaction_tags (
          tag_id,
          tags (id, name, color)
        )
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
    if (cursor && sortField === "date") {
      const [cursorDate, cursorId] = cursor.split(",")
      if (isAscending) {
        // For ascending: get records GREATER than cursor
        query = query.or(`transaction_date.gt.${cursorDate},and(transaction_date.eq.${cursorDate},id.gt.${cursorId})`)
      } else {
        // For descending: get records LESS than cursor
        query = query.or(`transaction_date.lt.${cursorDate},and(transaction_date.eq.${cursorDate},id.lt.${cursorId})`)
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
      query = query.in("payment_method_id", filters.paymentMethodIds)
    }

    // Apply search keyword filter (note: this is still server-side, but limited)
    // For better search, consider using PostgreSQL full-text search
    if (filters.searchKeyword) {
      query = query.or(
        `description.ilike.%${filters.searchKeyword}%,` +
        `vendors.name.ilike.%${filters.searchKeyword}%,` +
        `payment_methods.name.ilike.%${filters.searchKeyword}%`
      )
    }

    // Fetch one extra to determine if there's a next page
    query = query.limit(pageSize + 1)

    const { data: transactions, error, count } = await query

    if (error) {
      console.error("Error fetching transactions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Determine if there's a next page
    const hasNextPage = transactions.length > pageSize
    const rawItems = hasNextPage ? transactions.slice(0, pageSize) : transactions

    // Transform the data to include tags array
    const items = rawItems.map((transaction: any) => ({
      ...transaction,
      tags: transaction.transaction_tags?.map((tt: any) => tt.tags).filter(Boolean) || []
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
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
