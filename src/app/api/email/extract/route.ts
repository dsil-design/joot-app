/**
 * Email Extraction API
 *
 * POST /api/email/extract - Extract transaction data from receipt emails using AI
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  extractTransactionFromEmail,
  batchExtractFromEmails,
  type EmailContent,
  type EmailExtractionResult,
} from '@/lib/services/email-ai-extraction-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/email/extract
 *
 * Extract transaction data from one or more emails
 *
 * Request body:
 * - emailIds: string[] - Array of email message IDs to extract
 * - userId: string - User ID (for authorization)
 *
 * Response:
 * - results: Array of extraction results with email ID and extracted data
 * - errors: Array of any errors that occurred
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailIds, userId } = body;

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json(
        { error: 'emailIds array is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log(`📧 Extracting data from ${emailIds.length} emails for user ${userId}`);

    // Fetch email messages from database
    const { data: emails, error: fetchError } = await supabase
      .from('email_messages')
      .select('id, subject, from_address, text_content, html_content, user_id')
      .in('id', emailIds)
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching emails:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch emails', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json(
        { error: 'No emails found for the provided IDs' },
        { status: 404 }
      );
    }

    console.log(`✅ Found ${emails.length} emails to extract`);

    // Process extractions
    const results: Array<{
      emailId: string;
      success: boolean;
      extraction?: EmailExtractionResult;
      error?: string;
    }> = [];

    const errors: Array<{ emailId: string; error: string }> = [];

    for (const email of emails) {
      try {
        // Update status to processing
        await supabase
          .from('email_messages')
          .update({ extraction_status: 'processing' })
          .eq('id', email.id);

        // Prepare email content for extraction
        const emailContent: EmailContent = {
          subject: email.subject,
          from: email.from_address,
          textContent: email.text_content || '',
          htmlContent: email.html_content || undefined,
        };

        // Extract transaction data
        console.log(`🔍 Extracting from: ${email.subject}`);
        const extraction = await extractTransactionFromEmail(emailContent);

        // Calculate average confidence for the numeric column
        const avgConfidence = Math.round(
          (extraction.confidence.vendor +
            extraction.confidence.amount +
            extraction.confidence.currency +
            extraction.confidence.date) / 4
        );

        // Update database with extracted data
        const { error: updateError } = await supabase
          .from('email_messages')
          .update({
            extracted_vendor: extraction.vendor,
            extracted_amount: extraction.amount,
            extracted_currency: extraction.currency,
            extracted_date: extraction.date?.toISOString(),
            extraction_confidence: avgConfidence, // numeric average
            extraction_metadata: extraction.confidence, // detailed JSONB scores
            extraction_status: 'completed',
            extracted_at: new Date().toISOString(),
          })
          .eq('id', email.id);

        if (updateError) {
          throw new Error(`Failed to update email: ${updateError.message}`);
        }

        results.push({
          emailId: email.id,
          success: true,
          extraction,
        });

        console.log(`✅ Extracted: ${extraction.vendor} - ${extraction.amount} ${extraction.currency}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Extraction failed for email ${email.id}:`, errorMessage);

        // Update status to failed
        await supabase
          .from('email_messages')
          .update({
            extraction_status: 'failed',
            extraction_error: errorMessage,
          })
          .eq('id', email.id);

        errors.push({
          emailId: email.id,
          error: errorMessage,
        });

        results.push({
          emailId: email.id,
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`\n✅ Extraction complete: ${successCount}/${emails.length} successful`);

    return NextResponse.json({
      message: `Extracted ${successCount}/${emails.length} emails`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/email/extract?emailId=xxx
 *
 * Get extraction status and results for a specific email
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');
    const userId = searchParams.get('userId');

    if (!emailId || !userId) {
      return NextResponse.json(
        { error: 'emailId and userId are required' },
        { status: 400 }
      );
    }

    // Fetch email with extraction data
    const { data: email, error } = await supabase
      .from('email_messages')
      .select(
        `
        id,
        subject,
        from_address,
        extracted_vendor,
        extracted_amount,
        extracted_currency,
        extracted_date,
        extraction_confidence,
        extraction_metadata,
        extraction_status,
        extraction_error,
        extracted_at
      `
      )
      .eq('id', emailId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Email not found', details: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json({
      email: {
        id: email.id,
        subject: email.subject,
        from: email.from_address,
        extraction: {
          vendor: email.extracted_vendor,
          amount: email.extracted_amount,
          currency: email.extracted_currency,
          date: email.extracted_date,
          avgConfidence: email.extraction_confidence,
          confidenceDetails: email.extraction_metadata,
          status: email.extraction_status,
          error: email.extraction_error,
          extractedAt: email.extracted_at,
        },
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
