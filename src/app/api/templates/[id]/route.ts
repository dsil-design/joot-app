/**
 * Templates API - Single Template Operations
 *
 * GET    /api/templates/[id] - Get a single template
 * PATCH  /api/templates/[id] - Update a template
 * DELETE /api/templates/[id] - Delete a template (soft delete)
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createTemplateService } from '@/lib/services/template-service'
import { UpdateTemplateSchema } from '@/lib/validations/recurring-transactions'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/templates/[id]
 * Get a single template by ID
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // Get template using service
    const templateService = await createTemplateService()
    const { data, error } = await templateService.getTemplateById(id, user.id)

    if (error) {
      if (error.includes('not found')) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error in GET /api/templates/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/templates/[id]
 * Update a template
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // Parse and validate request body
    const body = await request.json()
    const validation = UpdateTemplateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // Update template using service
    const templateService = await createTemplateService()
    const { data, error } = await templateService.updateTemplate(
      id,
      validation.data,
      user.id
    )

    if (error) {
      if (error.includes('not found')) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({
      data,
      message: 'Template updated successfully',
    })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/templates/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/templates/[id]
 * Delete a template (soft delete - sets is_active = false)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // Delete template using service (soft delete)
    const templateService = await createTemplateService()
    const { data, error } = await templateService.deleteTemplate(id, user.id)

    if (error) {
      if (error.includes('not found')) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({
      data: { success: true },
      message: 'Template deleted successfully',
    })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/templates/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
