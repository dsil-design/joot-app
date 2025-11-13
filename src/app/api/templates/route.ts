/**
 * Templates API - List and Create
 *
 * GET  /api/templates - Get all templates with optional filters
 * POST /api/templates - Create a new template
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createTemplateService } from '@/lib/services/template-service'
import { CreateTemplateSchema } from '@/lib/validations/recurring-transactions'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

/**
 * GET /api/templates
 * Get all templates for the authenticated user with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const filters: {
      is_active?: boolean
      frequency?: string
      transaction_type?: 'expense' | 'income'
    } = {}

    // is_active filter
    const isActiveParam = searchParams.get('is_active')
    if (isActiveParam !== null) {
      filters.is_active = isActiveParam === 'true'
    }

    // frequency filter
    const frequency = searchParams.get('frequency')
    if (frequency) {
      filters.frequency = frequency
    }

    // transaction_type filter
    const transactionType = searchParams.get('transaction_type')
    if (transactionType && ['expense', 'income'].includes(transactionType)) {
      filters.transaction_type = transactionType as 'expense' | 'income'
    }

    // Get templates using service
    const templateService = await createTemplateService()
    const { data, error } = await templateService.getTemplates(user.id, filters)

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error in GET /api/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates
 * Create a new transaction template
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = CreateTemplateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // Create template using service
    const templateService = await createTemplateService()
    const { data, error } = await templateService.createTemplate(
      validation.data,
      user.id
    )

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json(
      { data, message: 'Template created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in POST /api/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
