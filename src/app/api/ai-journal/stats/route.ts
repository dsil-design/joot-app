import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/ai-journal/stats
 *
 * Aggregate stats for the AI Journal dashboard.
 * Returns total calls, estimated cost, avg response time, active insights count,
 * and last analysis timestamp.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get 30-day window
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString();

    // Parallel queries
    const [journalResult, insightsResult, lastRunResult] = await Promise.all([
      // Journal entries in last 30 days
      supabase
        .from('ai_journal')
        .select('duration_ms, prompt_tokens, response_tokens, invocation_type')
        .eq('user_id', user.id)
        .gte('created_at', cutoff),

      // Active insights count
      supabase
        .from('ai_insights')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active'),

      // Last analysis run
      supabase
        .from('ai_analysis_runs')
        .select('completed_at, summary')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    const entries = journalResult.data || [];

    // Compute metrics
    let totalPromptTokens = 0;
    let totalResponseTokens = 0;
    let totalDuration = 0;
    let durationCount = 0;
    const byType: Record<string, number> = {};

    for (const entry of entries) {
      totalPromptTokens += entry.prompt_tokens || 0;
      totalResponseTokens += entry.response_tokens || 0;
      if (entry.duration_ms) {
        totalDuration += entry.duration_ms;
        durationCount++;
      }
      const t = entry.invocation_type || 'unknown';
      byType[t] = (byType[t] || 0) + 1;
    }

    // Claude Haiku 4.5 pricing: $1.00/1M input, $5.00/1M output
    const estimatedCost =
      (totalPromptTokens * 1.0) / 1_000_000 +
      (totalResponseTokens * 5.0) / 1_000_000;

    return NextResponse.json({
      total_calls_30d: entries.length,
      estimated_cost_30d: Math.round(estimatedCost * 10000) / 10000,
      avg_response_ms: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
      active_insights: insightsResult.count || 0,
      last_analysis_at: lastRunResult.data?.completed_at || null,
      last_analysis_summary: lastRunResult.data?.summary || null,
      calls_by_type: byType,
      total_tokens: {
        prompt: totalPromptTokens,
        response: totalResponseTokens,
      },
    });
  } catch (error) {
    console.error('Error in ai-journal stats API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
