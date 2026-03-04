import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractionService } from '@/lib/email/extraction-service';

/**
 * Track active processing operations to prevent concurrent runs per user.
 */
const activeProcessing = new Set<string>();

/**
 * POST /api/emails/process
 *
 * Processes unprocessed emails through extraction + AI classification.
 * This is separate from sync — sync only fetches emails from IMAP,
 * this endpoint runs the AI pipeline on them.
 *
 * Returns:
 * - 200: Processing completed successfully
 * - 401: Unauthorized
 * - 409: Processing already in progress
 * - 500: Internal server error
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Prevent concurrent processing
    if (activeProcessing.has(user.id)) {
      return NextResponse.json(
        { error: 'Processing already in progress' },
        { status: 409 }
      );
    }

    activeProcessing.add(user.id);

    try {
      console.log(`Email processing (AI extraction) triggered for user ${user.id}`);

      const result = await extractionService.processNewEmails(user.id);

      return NextResponse.json({
        success: true,
        processed: result.processed,
        extracted: result.extracted,
        failed: result.failed,
        skipped: result.skipped,
        message: `Processed ${result.processed} emails: ${result.extracted} extracted, ${result.failed} failed, ${result.skipped} skipped`,
      });
    } finally {
      activeProcessing.delete(user.id);
    }

  } catch (error) {
    console.error('Email processing failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
