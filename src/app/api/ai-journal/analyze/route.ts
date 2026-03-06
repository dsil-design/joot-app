import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runAnalysis } from '@/lib/email/ai-analysis-service';

/**
 * POST /api/ai-journal/analyze
 *
 * Trigger a manual analysis run.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runAnalysis(user.id, 'manual', true);

    if (!result) {
      return NextResponse.json({
        success: false,
        message: 'Analysis could not be completed',
      });
    }

    return NextResponse.json({
      success: true,
      run_id: result.runId,
      entries_analyzed: result.entriesAnalyzed,
      insights_found: result.insights.length,
      duration_ms: result.durationMs,
      ai_calls_made: result.aiCallsMade,
    });
  } catch (error) {
    console.error('Error in analyze API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
