import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { extractionService } from '@/lib/email/extraction-service';
import { emailSyncService } from '@/lib/services/email-sync-service';
import { recordFeedback } from '@/lib/email/ai-feedback-service';
import { determineStatusFromConfidence } from '@/lib/email/confidence-scoring';
import { consolidateEmail } from '@/lib/email/email-consolidation';
import { aiClassificationToCoarse } from '@/lib/types/email-imports';
import type { AiClassification } from '@/lib/types/email-imports';
import type { RawEmailData, EmailTransactionData, AttachmentTextEntry } from '@/lib/email/types';
import { formatLocalDate } from '@/lib/utils/date-helpers';

// Allow time for IMAP fetch + PDF download/extract on top of the AI call.
export const maxDuration = 60;

/**
 * POST /api/emails/[id]/extract
 *
 * Extracts transaction data from a single email by its `emails` table UUID.
 * If an email_transactions row already exists, reprocesses it instead.
 *
 * Returns the extraction result and the created/updated email_transactions row.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: emailId } = await params;

    // Parse optional feedback from request body
    let feedback: {
      emailTransactionId: string;
      originalClassification: string | null;
      originalSkip: boolean | null;
      subject: string | null;
      fromAddress: string | null;
      userHint?: string;
    } | null = null;
    try {
      const body = await request.json();
      if (body?.feedback) {
        feedback = body.feedback;
      }
    } catch {
      // No body or invalid JSON — that's fine, backward compatible
    }

    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch email from emails table
    const { data: email, error: emailError } = await serviceClient
      .from('emails')
      .select('*')
      .eq('id', emailId)
      .eq('user_id', user.id)
      .single();

    if (emailError || !email) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      );
    }

    // Check if email_transactions row already exists for this message_id
    const { data: existingTx } = await serviceClient
      .from('email_transactions')
      .select('id')
      .eq('message_id', email.message_id)
      .eq('user_id', user.id)
      .single();

    // Make sure PDF attachments for this email have been fetched and
    // text-extracted. No-op if already done.
    const attachmentRun = await emailSyncService.ensureAttachmentsForEmail(emailId, user.id);
    console.log(`[Extract] ensureAttachments for email ${emailId}: ${attachmentRun.message}`);

    if (existingTx) {
      // Record feedback if provided (before reprocessing so it's available as a few-shot example)
      let feedbackId: string | null = null;
      if (feedback) {
        // Use extraction_correction when user provides a hint about wrong data,
        // skip_override when they're just unblocking a skipped email
        const feedbackType = feedback.userHint ? 'extraction_correction' : 'skip_override';
        feedbackId = await recordFeedback({
          userId: user.id,
          emailTransactionId: feedback.emailTransactionId,
          feedbackType: feedbackType as 'extraction_correction' | 'skip_override',
          originalAiClassification: feedback.originalClassification,
          originalAiSuggestedSkip: feedback.originalSkip,
          correctedClassification: null,
          correctedSkip: false,
          emailSubject: feedback.subject,
          emailFrom: feedback.fromAddress,
          emailBodyPreview: feedback.userHint || null,
        }, serviceClient);
      }

      // Reprocess existing email transaction (loads attachment text internally)
      const extraction = await extractionService.reprocessEmailTransaction(
        user.id,
        existingTx.id,
        { feedbackId: feedbackId ?? undefined, userHint: feedback?.userHint }
      );

      // Fetch the updated row
      const { data: updatedRow } = await serviceClient
        .from('email_transactions')
        .select('*')
        .eq('id', existingTx.id)
        .single();

      return NextResponse.json({
        action: 'reprocessed',
        extraction,
        emailTransaction: updatedRow,
      });
    }

    // Load any extracted PDF attachments so they're fed to the parsers/AI.
    const { data: attachmentRows } = await serviceClient
      .from('email_attachments')
      .select('id, filename, extracted_text')
      .eq('email_id', email.id)
      .eq('extraction_status', 'extracted')
      .not('extracted_text', 'is', null);

    const attachments: AttachmentTextEntry[] | undefined = (attachmentRows ?? [])
      .filter((a) => a.extracted_text)
      .map((a) => ({
        id: a.id,
        filename: a.filename ?? 'attachment.pdf',
        text: a.extracted_text as string,
      }));

    // Build RawEmailData from stored email
    const rawEmail: RawEmailData = {
      message_id: email.message_id,
      uid: email.uid,
      folder: email.folder,
      subject: email.subject,
      from_address: email.from_address,
      from_name: email.from_name,
      email_date: email.date ? new Date(email.date) : new Date(),
      text_body: email.text_body ?? null,
      html_body: email.html_body ?? null,
      seen: email.seen ?? false,
      has_attachments: email.has_attachments ?? false,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
    };

    // Try regex extraction first, fall back to AI if extraction fails
    const { extraction, aiResult, parserKey } = await extractionService.extractWithAiFallback(rawEmail, user.id);

    // Classify with full context
    const classification = extractionService.classifyEmailWithExtraction(rawEmail, extraction);
    const confidenceBreakdown = extractionService.calculateConfidenceWithBreakdown(extraction);
    const confidence = confidenceBreakdown.totalScore;
    const status = determineStatusFromConfidence(confidence, classification.status);

    // Build extraction notes
    const ruleInfo = classification.matchedRule
      ? `Classified by rule: ${classification.matchedRule.id} (${classification.matchedRule.description})`
      : 'No classification rule matched';
    const paymentInfo = `Payment context: ${classification.paymentContext}`;
    const aiInfo = aiResult
      ? `AI: ${aiResult.ai_classification} (skip: ${aiResult.should_skip})`
      : 'AI: not run';
    const extractionNotes = [
      confidenceBreakdown.summary,
      extraction.notes ? `Parser notes: ${extraction.notes}` : null,
      extraction.errors?.length ? `Errors: ${extraction.errors.join('; ')}` : null,
      `Scoring: ${confidenceBreakdown.components.map(c => `${c.satisfied ? '✓' : '✗'} ${c.name}: ${c.earnedPoints}/${c.maxPoints}`).join(', ')}`,
      ruleInfo,
      paymentInfo,
      aiInfo,
    ].filter(Boolean).join(' | ');

    const coarseClassification = aiResult
      ? aiClassificationToCoarse(aiResult.ai_classification as AiClassification)
      : classification.classification;

    // Prepare insert data
    const transactionData: EmailTransactionData = {
      user_id: user.id,
      message_id: email.message_id,
      uid: email.uid,
      folder: email.folder,
      subject: email.subject,
      from_address: email.from_address,
      from_name: email.from_name,
      email_date: email.date || new Date().toISOString(),
      seen: email.seen ?? false,
      has_attachments: email.has_attachments ?? false,
      status,
      classification: coarseClassification,
      ai_classification: aiResult?.ai_classification as AiClassification ?? null,
      ai_suggested_skip: aiResult?.should_skip ?? false,
      ai_reasoning: aiResult?.reasoning ?? null,
      parser_key: parserKey,
      extraction_confidence: confidence,
      extraction_notes: extractionNotes,
      synced_at: email.synced_at || new Date().toISOString(),
      processed_at: new Date().toISOString(),
    };

    // Add extracted data if successful
    if (extraction.success && extraction.data) {
      transactionData.vendor_name_raw = extraction.data.vendor_name_raw;
      transactionData.vendor_id = extraction.data.vendor_id || null;
      transactionData.amount = extraction.data.amount;
      transactionData.currency = extraction.data.currency;
      transactionData.transaction_date = formatLocalDate(extraction.data.transaction_date);
      transactionData.description = extraction.data.description || null;
      transactionData.order_id = extraction.data.order_id || null;
      transactionData.payment_card_last_four = extraction.data.payment_card_last_four || null;
      transactionData.payment_card_type = extraction.data.payment_card_type || null;
    }

    // Insert into email_transactions
    const { data: newRow, error: insertError } = await serviceClient
      .from('email_transactions')
      .insert(transactionData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting email transaction:', insertError);
      return NextResponse.json(
        { error: `Failed to save extraction: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Run consolidation
    if (newRow) {
      const consolidation = await consolidateEmail({
        userId: user.id,
        emailTransactionId: newRow.id,
        vendorName: extraction.data?.vendor_name_raw,
        amount: extraction.data?.amount,
        currency: extraction.data?.currency,
        transactionDate: extraction.data?.transaction_date,
        orderId: extraction.data?.order_id,
        aiHint: aiResult?.related_transaction_hint,
        supabase: serviceClient,
      });

      if (consolidation) {
        await serviceClient
          .from('email_transactions')
          .update({
            email_group_id: consolidation.emailGroupId,
            is_group_primary: consolidation.isPrimary,
          })
          .eq('id', newRow.id);
      }

      // Auto-match against existing transactions (same as batch processing)
      const shouldAutoMatch = !consolidation || consolidation.isPrimary;
      if (shouldAutoMatch && status !== 'skipped') {
        await extractionService.tryAutoMatch(serviceClient, newRow.id, user.id, extraction);
      }
    }

    // Re-fetch the row to include any updates from auto-match/consolidation
    const { data: finalRow } = await serviceClient
      .from('email_transactions')
      .select('*')
      .eq('id', newRow.id)
      .single();

    return NextResponse.json({
      action: 'created',
      extraction,
      aiClassification: aiResult,
      emailTransaction: finalRow ?? newRow,
    });

  } catch (error) {
    console.error('Error in email extract API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
