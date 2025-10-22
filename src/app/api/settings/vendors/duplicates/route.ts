import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  findDuplicateVendors,
  type VendorWithTransactions,
  type DuplicateSuggestion,
} from "@/lib/utils/vendor-duplicate-detection"

export const dynamic = "force-dynamic"

/**
 * GET /api/settings/vendors/duplicates
 * Returns pre-computed duplicate suggestions for the current user
 * (Suggestions are computed by a background cron job)
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch all current suggestions (pending and ignored) from database
    const { data: allSuggestions, error: allSuggestionsError } = await supabase
      .from("vendor_duplicate_suggestions")
      .select(
        `
        id,
        confidence_score,
        status,
        reasons,
        created_at,
        updated_at,
        source_vendor:vendors!vendor_duplicate_suggestions_source_vendor_id_fkey(id, name),
        target_vendor:vendors!vendor_duplicate_suggestions_target_vendor_id_fkey(id, name)
      `
      )
      .eq("user_id", user.id)
      .in("status", ["pending", "ignored"])
      .order("confidence_score", { ascending: false })

    if (allSuggestionsError) {
      console.error("Error fetching all suggestions:", allSuggestionsError)
      return NextResponse.json(
        { error: "Failed to fetch suggestions" },
        { status: 500 }
      )
    }

    // If no suggestions exist, trigger initial analysis
    if (!allSuggestions || allSuggestions.length === 0) {
      console.log("No suggestions found, triggering initial analysis for user:", user.id)

      // Check if user has vendors first
      const { count: vendorCount } = await supabase
        .from("vendors")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      if (vendorCount && vendorCount > 0) {
        // Trigger POST to generate suggestions, then return the results
        return POST()
      }

      // No vendors, return empty
      return NextResponse.json({
        suggestions: [],
        ignored: [],
      })
    }

    // Fetch transaction counts for each vendor in suggestions
    const enrichedSuggestions = await Promise.all(
      (allSuggestions || []).map(async (suggestion) => {
        const sourceVendor = Array.isArray(suggestion.source_vendor)
          ? suggestion.source_vendor[0]
          : suggestion.source_vendor
        const targetVendor = Array.isArray(suggestion.target_vendor)
          ? suggestion.target_vendor[0]
          : suggestion.target_vendor

        if (!sourceVendor || !targetVendor) {
          return null
        }

        // Fetch transaction counts
        const [sourceResult, targetResult] = await Promise.all([
          supabase
            .from("transactions")
            .select("*", { count: "exact", head: true })
            .eq("vendor_id", sourceVendor.id)
            .eq("user_id", user.id),
          supabase
            .from("transactions")
            .select("*", { count: "exact", head: true })
            .eq("vendor_id", targetVendor.id)
            .eq("user_id", user.id),
        ])

        return {
          id: suggestion.id,
          sourceVendor: {
            ...sourceVendor,
            transactionCount: sourceResult.count || 0,
          },
          targetVendor: {
            ...targetVendor,
            transactionCount: targetResult.count || 0,
          },
          confidence: suggestion.confidence_score,
          reasons: suggestion.reasons,
          status: suggestion.status,
          createdAt: suggestion.created_at,
          updatedAt: suggestion.updated_at,
        }
      })
    )

    // Filter out null results and separate by status
    const validSuggestions = enrichedSuggestions.filter(
      (s): s is NonNullable<typeof s> => s !== null
    )
    const pendingSuggestions = validSuggestions.filter((s) => s.status === "pending")
    const ignoredSuggestions = validSuggestions.filter((s) => s.status === "ignored")

    return NextResponse.json({
      suggestions: pendingSuggestions,
      ignored: ignoredSuggestions,
    })
  } catch (error) {
    console.error("Error in GET /api/settings/vendors/duplicates:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/vendors/duplicates
 * Regenerate duplicate suggestions for the current user
 * This will find new potential duplicates and create suggestions in the database
 */
export async function POST() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete all existing pending suggestions for this user
    const { error: deleteError } = await supabase
      .from("vendor_duplicate_suggestions")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "pending")

    if (deleteError) {
      console.error("Error deleting old suggestions:", deleteError)
    }

    // Fetch all vendors with transaction data for this user
    const { data: vendors, error: vendorsError } = await supabase
      .from("vendors")
      .select("id, name, created_at, updated_at")
      .eq("user_id", user.id)
      .order("name")

    if (vendorsError || !vendors || vendors.length === 0) {
      // No vendors to analyze, return empty results
      return NextResponse.json({
        suggestions: [],
        ignored: [],
      })
    }

    // Fetch transaction counts and details for each vendor
    const vendorsWithTransactions: VendorWithTransactions[] = await Promise.all(
      vendors.map(async (vendor) => {
        const { count, error: countError } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("vendor_id", vendor.id)
          .eq("user_id", user.id)

        // Fetch transaction date ranges
        const { data: transactions, error: transactionsError } = await supabase
          .from("transactions")
          .select("transaction_date, amount")
          .eq("vendor_id", vendor.id)
          .eq("user_id", user.id)
          .order("transaction_date", { ascending: true })

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

    // Generate duplicate suggestions
    const newSuggestions = findDuplicateVendors(vendorsWithTransactions, {
      minConfidence: 40,
      maxSuggestions: 200,
    })

    // Save new suggestions to database
    if (newSuggestions.length > 0) {
      const suggestionInserts = newSuggestions.map((suggestion) => ({
        user_id: user.id,
        source_vendor_id: suggestion.sourceVendor.id,
        target_vendor_id: suggestion.targetVendor.id,
        confidence_score: suggestion.confidence,
        reasons: suggestion.reasons,
        status: "pending" as const,
      }))

      const { error: insertError } = await supabase
        .from("vendor_duplicate_suggestions")
        .insert(suggestionInserts)

      if (insertError) {
        console.error("Error inserting suggestions:", insertError)
        return NextResponse.json(
          { error: "Failed to save suggestions" },
          { status: 500 }
        )
      }
    }

    // Now fetch and return the results
    return GET()
  } catch (error) {
    console.error("Error in POST /api/settings/vendors/duplicates:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
