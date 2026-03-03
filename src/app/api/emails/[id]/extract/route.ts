import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { extractionService } from '@/lib/email/extraction-service';
import { determineStatusFromConfidence } from '@/lib/email/confidence-scoring';
import type { RawEmailData, EmailTransactionData } from '@/lib/email/types';

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

    if (existingTx) {
      // Reprocess existing email transaction
      const extraction = await extractionService.reprocessEmailTransaction(user.id, existingTx.id);

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
    };

    // Run extraction pipeline
    const extraction = await extractionService.extractFromEmail(rawEmail);
    const classification = extractionService.classifyEmailWithExtraction(rawEmail, extraction);
    const confidenceBreakdown = extractionService.calculateConfidenceWithBreakdown(extraction);
    const confidence = confidenceBreakdown.totalScore;
    const status = determineStatusFromConfidence(confidence, classification.status);

    // Build extraction notes
    const ruleInfo = classification.matchedRule
      ? `Classified by rule: ${classification.matchedRule.id} (${classification.matchedRule.description})`
      : 'No classification rule matched';
    const paymentInfo = `Payment context: ${classification.paymentContext}`;
    const extractionNotes = [
      confidenceBreakdown.summary,
      extraction.notes ? `Parser notes: ${extraction.notes}` : null,
      extraction.errors?.length ? `Errors: ${extraction.errors.join('; ')}` : null,
      `Scoring: ${confidenceBreakdown.components.map(c => `${c.satisfied ? '✓' : '✗'} ${c.name}: ${c.earnedPoints}/${c.maxPoints}`).join(', ')}`,
      ruleInfo,
      paymentInfo,
    ].filter(Boolean).join(' | ');

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
      classification: classification.classification,
      extraction_confidence: confidence,
      extraction_notes: extractionNotes,
      synced_at: email.synced_at || new Date().toISOString(),
      processed_at: new Date().toISOString(),
    };

    // Add extracted data if successful
    if (extraction.success && extraction.data) {
      transactionData.vendor_name_raw = extraction.data.vendor_name_raw;
      transactionData.amount = extraction.data.amount;
      transactionData.currency = extraction.data.currency;
      transactionData.transaction_date = extraction.data.transaction_date.toISOString().split('T')[0];
      transactionData.description = extraction.data.description || null;
      transactionData.order_id = extraction.data.order_id || null;
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

    return NextResponse.json({
      action: 'created',
      extraction,
      emailTransaction: newRow,
    });

  } catch (error) {
    console.error('Error in email extract API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
