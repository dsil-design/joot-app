import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * PATCH /api/settings/vendors/duplicates/[id]
 * Update the status of a duplicate suggestion (ignore or restore)
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await context.params

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { status } = body

    // Validate status
    if (!status || !["pending", "ignored"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'pending' or 'ignored'" },
        { status: 400 }
      )
    }

    // Verify the suggestion exists and belongs to this user
    const { data: existingSuggestion, error: fetchError } = await supabase
      .from("vendor_duplicate_suggestions")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingSuggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      )
    }

    // Update the suggestion status
    const { data, error: updateError } = await supabase
      .from("vendor_duplicate_suggestions")
      .update({ status })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating suggestion:", updateError)
      return NextResponse.json(
        { error: "Failed to update suggestion" },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error(
      "Error in PATCH /api/settings/vendors/duplicates/[id]:",
      error
    )
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings/vendors/duplicates/[id]
 * Delete a duplicate suggestion permanently
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await context.params

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete the suggestion
    const { error: deleteError } = await supabase
      .from("vendor_duplicate_suggestions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (deleteError) {
      console.error("Error deleting suggestion:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete suggestion" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(
      "Error in DELETE /api/settings/vendors/duplicates/[id]:",
      error
    )
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
