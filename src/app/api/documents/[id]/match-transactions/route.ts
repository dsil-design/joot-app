/**
 * Transaction Matching API Endpoint
 *
 * POST /api/documents/[id]/match-transactions
 *
 * Matches extracted document data to existing transactions
 * - Retrieves extracted data from document_extractions
 * - Runs matching algorithm
 * - Creates match records in transaction_document_matches
 * - Enriches vendor with logo
 * - Adds to reconciliation queue if needed
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  findMatchingTransactions,
  isAutoMatchCandidate,
} from '@/lib/services/matching-service'
import { enrichVendor } from '@/lib/services/vendor-enrichment-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds for matching

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/documents/[id]/match-transactions
 *
 * Match document to transactions
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = await createClient()
    const { id: documentId } = await context.params

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get extraction data
    const { data: extraction, error: extractionError } = await supabase
      .from('document_extractions')
      .select('*')
      .eq('document_id', documentId)
      .single()

    if (extractionError || !extraction) {
      return NextResponse.json(
        { error: 'Extraction data not found. Run extraction first.' },
        { status: 404 }
      )
    }

    // Check if already matched
    const { data: existingMatches } = await supabase
      .from('transaction_document_matches')
      .select('*')
      .eq('document_id', documentId)

    if (existingMatches && existingMatches.length > 0) {
      return NextResponse.json(
        { error: 'Document already matched' },
        { status: 400 }
      )
    }

    try {
      // Run matching algorithm
      const matchResult = await findMatchingTransactions(
        {
          vendorName: extraction.vendor_name,
          amount: extraction.amount,
          currency: extraction.currency,
          transactionDate: extraction.transaction_date,
        },
        user.id,
        50, // Min confidence: 50%
        5 // Max results: 5
      )

      if (!matchResult.success) {
        throw new Error(matchResult.error || 'Matching failed')
      }

      // Enrich vendor if vendor name exists
      let vendorEnrichment = null
      if (extraction.vendor_name) {
        vendorEnrichment = await enrichVendor(extraction.vendor_name, user.id)
      }

      // Save match records
      const matchRecords = matchResult.matches.map((match) => ({
        document_id: documentId,
        transaction_id: match.transaction.id,
        confidence_score: match.confidence,
        match_type: isAutoMatchCandidate(match) ? 'automatic' : 'suggested',
        matched_at: new Date().toISOString(),
        matched_by: 'system',
        metadata: {
          scores: match.scores,
          match_reasons: match.matchReasons,
        },
      }))

      if (matchRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('transaction_document_matches')
          .insert(matchRecords)

        if (insertError) {
          console.error('Failed to save match records:', insertError)
          throw new Error('Failed to save matches')
        }
      }

      // Determine if needs manual review
      const needsReview = !matchResult.bestMatch || !isAutoMatchCandidate(matchResult.bestMatch)

      // Add to reconciliation queue if needs review
      if (needsReview) {
        await supabase.from('reconciliation_queue').insert({
          document_id: documentId,
          priority: matchResult.matches.length > 0 ? 'normal' : 'high',
          status: 'pending_review',
          assigned_to: null,
          metadata: {
            match_count: matchResult.matches.length,
            best_match_confidence: matchResult.bestMatch?.confidence || 0,
          },
        })
      }

      // Update document status
      await supabase
        .from('documents')
        .update({
          processing_status: 'completed',
        })
        .eq('id', documentId)

      // Return success
      return NextResponse.json({
        success: true,
        matching: {
          matchCount: matchResult.matches.length,
          bestMatch: matchResult.bestMatch
            ? {
                transactionId: matchResult.bestMatch.transaction.id,
                confidence: matchResult.bestMatch.confidence,
                matchReasons: matchResult.bestMatch.matchReasons,
                isAutoMatch: isAutoMatchCandidate(matchResult.bestMatch),
              }
            : null,
          needsReview,
        },
        vendor: vendorEnrichment
          ? {
              normalizedName: vendorEnrichment.normalizedName,
              logoUrl: vendorEnrichment.logoUrl,
              domain: vendorEnrichment.domain,
            }
          : null,
      })
    } catch (processingError) {
      console.error('Matching error:', processingError)

      // Update status to failed
      await supabase
        .from('documents')
        .update({
          processing_status: 'failed',
        })
        .eq('id', documentId)

      return NextResponse.json(
        {
          error: 'Matching failed',
          message:
            processingError instanceof Error
              ? processingError.message
              : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Unexpected error in matching API:', error)
    return NextResponse.json(
      { error: 'Matching failed', message: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
