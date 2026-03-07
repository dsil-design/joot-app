/**
 * AI Analysis Service
 *
 * SQL-first pattern detection engine that analyzes ai_journal entries
 * to surface actionable insights. All pattern queries are standard
 * SQL aggregations (zero AI cost). An optional single Claude call
 * produces a human-readable summary (~$0.01 per run).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '../supabase/server';
import { callAi, isAiAvailable } from './ai-client';
import { getJournalEntriesSince } from './ai-journal-service';

// ============================================================================
// TYPES
// ============================================================================

interface InsightData {
  insight_type: string;
  severity: 'info' | 'suggestion' | 'action_needed';
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  target_sender?: string;
  email_count?: number;
  format_consistency_pct?: number;
}

interface AnalysisResult {
  runId: string;
  entriesAnalyzed: number;
  insights: InsightData[];
  summary: Record<string, unknown>;
  patterns: Record<string, unknown>;
  durationMs: number;
  aiCallsMade: number;
}

interface RegexCandidate {
  from_address: string;
  email_count: number;
  top_vendor: string;
  vendor_pct: number;
  top_currency: string;
  currency_pct: number;
}

interface VendorCorrection {
  ai_vendor: string;
  from_address: string;
  correction_count: number;
}

interface SkipPattern {
  from_address: string;
  skip_count: number;
  total_count: number;
  skip_pct: number;
}

interface CostMetrics {
  total_calls: number;
  total_prompt_tokens: number;
  total_response_tokens: number;
  avg_duration_ms: number;
  calls_with_regex: number;
  calls_without_regex: number;
  estimated_cost_usd: number;
}

// Minimum new journal entries before batch analysis runs
const MIN_ENTRIES_FOR_BATCH = 5;

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Run analysis on journal entries since the last run.
 *
 * @param userId - User to analyze
 * @param runType - 'batch' (automatic) or 'manual' (user-triggered)
 * @param skipMinimumCheck - If true, bypass the MIN_ENTRIES_FOR_BATCH check
 */
export async function runAnalysis(
  userId: string,
  runType: 'batch' | 'manual' = 'manual',
  skipMinimumCheck = false
): Promise<AnalysisResult | null> {
  const supabase = createServiceRoleClient();
  const startTime = Date.now();

  // Get the last completed run to determine incremental window
  const { data: lastRun } = await supabase
    .from('ai_analysis_runs')
    .select('id, journal_to')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  const journalFrom = lastRun?.journal_to ? new Date(lastRun.journal_to) : null;

  // Check minimum entries threshold for batch runs
  if (!skipMinimumCheck) {
    const newEntryCount = await getJournalEntriesSince(userId, journalFrom, supabase);
    if (newEntryCount < MIN_ENTRIES_FOR_BATCH) {
      return null; // Not enough new entries
    }
  }

  // Create the analysis run record
  const { data: run, error: runError } = await supabase
    .from('ai_analysis_runs')
    .insert({
      user_id: userId,
      run_type: runType,
      status: 'running',
      previous_run_id: lastRun?.id || null,
      journal_from: journalFrom?.toISOString() || null,
    })
    .select('id')
    .single();

  if (runError || !run) {
    console.error('Failed to create analysis run:', runError?.message);
    return null;
  }

  try {
    // Run all pattern detection queries in parallel
    const [
      regexCandidates,
      vendorCorrections,
      skipPatterns,
      costMetrics,
      entriesAnalyzed,
    ] = await Promise.all([
      findRegexParserCandidates(userId, journalFrom, supabase),
      findVendorCorrections(userId, journalFrom, supabase),
      findSkipPatterns(userId, journalFrom, supabase),
      getCostMetrics(userId, journalFrom, supabase),
      countEntries(userId, journalFrom, supabase),
    ]);

    // Build insights from patterns
    const insights: InsightData[] = [];

    // Regex parser candidate insights
    for (const candidate of regexCandidates) {
      insights.push({
        insight_type: 'regex_parser_candidate',
        severity: candidate.vendor_pct >= 95 ? 'action_needed' : 'suggestion',
        title: `Regex parser candidate: ${candidate.from_address}`,
        description: `This sender has ${candidate.email_count} AI-processed emails with ${candidate.vendor_pct}% format consistency. A dedicated regex parser could eliminate AI calls for these emails.`,
        evidence: {
          email_count: candidate.email_count,
          top_vendor: candidate.top_vendor,
          vendor_consistency: candidate.vendor_pct,
          top_currency: candidate.top_currency,
          currency_consistency: candidate.currency_pct,
        },
        target_sender: candidate.from_address,
        email_count: candidate.email_count,
        format_consistency_pct: candidate.vendor_pct,
      });
    }

    // Vendor normalization insights
    for (const correction of vendorCorrections) {
      insights.push({
        insight_type: 'vendor_normalization',
        severity: 'suggestion',
        title: `Vendor name correction: "${correction.ai_vendor}"`,
        description: `The AI consistently extracts "${correction.ai_vendor}" from ${correction.from_address} but users correct it. Consider adding a vendor name mapping.`,
        evidence: {
          ai_extracted_vendor: correction.ai_vendor,
          from_address: correction.from_address,
          correction_count: correction.correction_count,
        },
        target_sender: correction.from_address,
        email_count: correction.correction_count,
      });
    }

    // Skip pattern insights
    for (const pattern of skipPatterns) {
      if (pattern.skip_pct >= 90) {
        insights.push({
          insight_type: 'skip_pattern',
          severity: pattern.skip_pct === 100 ? 'action_needed' : 'suggestion',
          title: `Auto-skip candidate: ${pattern.from_address}`,
          description: `${pattern.skip_pct}% of emails from this sender are skipped (${pattern.skip_count}/${pattern.total_count}). Consider adding an auto-skip rule.`,
          evidence: {
            skip_count: pattern.skip_count,
            total_count: pattern.total_count,
            skip_percentage: pattern.skip_pct,
          },
          target_sender: pattern.from_address,
          email_count: pattern.total_count,
        });
      }
    }

    // Cost savings insight
    if (costMetrics.calls_with_regex > 0 && costMetrics.total_calls > 10) {
      const regexPct = Math.round((costMetrics.calls_with_regex / costMetrics.total_calls) * 100);
      const potentialSavings = regexCandidates.reduce((sum, c) => sum + c.email_count, 0);

      if (potentialSavings > 0) {
        insights.push({
          insight_type: 'cost_savings',
          severity: 'info',
          title: `Potential AI cost reduction`,
          description: `${regexPct}% of AI calls are classification-only (regex handled extraction). ${potentialSavings} additional emails could use regex parsers, saving ~$${((potentialSavings * costMetrics.estimated_cost_usd) / costMetrics.total_calls).toFixed(3)}/batch.`,
          evidence: {
            total_calls: costMetrics.total_calls,
            classification_only_calls: costMetrics.calls_with_regex,
            potential_regex_emails: potentialSavings,
            current_estimated_cost: costMetrics.estimated_cost_usd,
            avg_duration_ms: costMetrics.avg_duration_ms,
          },
        });
      }
    }

    // Build patterns and summary objects
    const patterns = {
      regex_candidates: regexCandidates,
      vendor_corrections: vendorCorrections,
      skip_patterns: skipPatterns,
    };

    const summary = {
      entries_analyzed: entriesAnalyzed,
      total_insights: insights.length,
      cost_metrics: costMetrics,
      by_type: insights.reduce(
        (acc, i) => {
          acc[i.insight_type] = (acc[i.insight_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };

    // Optional: Generate human-readable summary with a single AI call
    let aiCallsMade = 0;
    if (isAiAvailable() && insights.length > 0) {
      try {
        const aiSummary = await generateAiSummary(insights, costMetrics);
        if (aiSummary) {
          (summary as Record<string, unknown>).ai_summary = aiSummary;
          aiCallsMade = 1;
        }
      } catch (error) {
        console.error('AI summary generation failed (non-fatal):', error);
      }
    }

    // Insert insights
    if (insights.length > 0) {
      const insightRows = insights.map((i) => ({
        user_id: userId,
        analysis_run_id: run.id,
        insight_type: i.insight_type,
        severity: i.severity,
        title: i.title,
        description: i.description,
        evidence: i.evidence,
        target_sender: i.target_sender || null,
        email_count: i.email_count || null,
        format_consistency_pct: i.format_consistency_pct || null,
      }));

      await supabase.from('ai_insights').insert(insightRows);
    }

    const durationMs = Date.now() - startTime;

    // Update the run record
    await supabase
      .from('ai_analysis_runs')
      .update({
        status: 'completed',
        journal_entries_analyzed: entriesAnalyzed,
        journal_to: new Date().toISOString(),
        summary,
        patterns,
        recommendations: { insights: insights.map((i) => ({ type: i.insight_type, title: i.title, severity: i.severity })) },
        duration_ms: durationMs,
        ai_calls_made: aiCallsMade,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    return {
      runId: run.id,
      entriesAnalyzed,
      insights,
      summary,
      patterns,
      durationMs,
      aiCallsMade,
    };
  } catch (error) {
    // Mark run as failed
    await supabase
      .from('ai_analysis_runs')
      .update({
        status: 'failed',
        summary: { error: error instanceof Error ? error.message : String(error) },
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      })
      .eq('id', run.id);

    console.error('Analysis run failed:', error);
    return null;
  }
}

// ============================================================================
// SQL PATTERN QUERIES
// ============================================================================

/**
 * Find senders where AI extracted 5+ emails with consistent format.
 * These are prime candidates for new regex parsers.
 */
async function findRegexParserCandidates(
  userId: string,
  since: Date | null,
  supabase: SupabaseClient
): Promise<RegexCandidate[]> {
  // Use raw SQL via RPC or build with the query builder
  // We need aggregations that Supabase JS doesn't natively support,
  // so we query the raw data and aggregate in JS.
  let query = supabase
    .from('ai_journal')
    .select('from_address, ai_extracted_vendor, ai_extracted_currency')
    .eq('user_id', userId)
    .eq('invocation_type', 'combined_extraction')
    .not('ai_extracted_vendor', 'is', null);

  if (since) {
    query = query.gt('created_at', since.toISOString());
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Group by sender
  const bySender = new Map<string, { vendors: string[]; currencies: string[] }>();
  for (const row of data) {
    if (!row.from_address) continue;
    const entry = bySender.get(row.from_address) || { vendors: [], currencies: [] };
    if (row.ai_extracted_vendor) entry.vendors.push(row.ai_extracted_vendor);
    if (row.ai_extracted_currency) entry.currencies.push(row.ai_extracted_currency);
    bySender.set(row.from_address, entry);
  }

  const candidates: RegexCandidate[] = [];
  for (const [from_address, { vendors, currencies }] of bySender) {
    if (vendors.length < 5) continue;

    // Find most common vendor
    const vendorCounts = countOccurrences(vendors);
    const topVendor = vendorCounts[0];
    const vendorPct = Math.round((topVendor.count / vendors.length) * 100);

    // Find most common currency
    const currencyCounts = countOccurrences(currencies);
    const topCurrency = currencyCounts[0];
    const currencyPct = Math.round((topCurrency.count / currencies.length) * 100);

    if (vendorPct >= 90) {
      candidates.push({
        from_address,
        email_count: vendors.length,
        top_vendor: topVendor.value,
        vendor_pct: vendorPct,
        top_currency: topCurrency?.value || 'unknown',
        currency_pct: currencyPct,
      });
    }
  }

  return candidates.sort((a, b) => b.email_count - a.email_count);
}

/**
 * Find vendor names the AI extracts that are always manually corrected.
 */
async function findVendorCorrections(
  userId: string,
  since: Date | null,
  supabase: SupabaseClient
): Promise<VendorCorrection[]> {
  // Join ai_journal with ai_feedback to find patterns
  let query = supabase
    .from('ai_journal')
    .select('ai_extracted_vendor, from_address, feedback_id')
    .eq('user_id', userId)
    .not('feedback_id', 'is', null)
    .not('ai_extracted_vendor', 'is', null);

  if (since) {
    query = query.gt('created_at', since.toISOString());
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Group by vendor name + sender
  const byKey = new Map<string, number>();
  for (const row of data) {
    if (!row.ai_extracted_vendor || !row.from_address) continue;
    const key = `${row.ai_extracted_vendor}||${row.from_address}`;
    byKey.set(key, (byKey.get(key) || 0) + 1);
  }

  return Array.from(byKey.entries())
    .filter(([, count]) => count >= 2)
    .map(([key, count]) => {
      const [ai_vendor, from_address] = key.split('||');
      return { ai_vendor, from_address, correction_count: count };
    })
    .sort((a, b) => b.correction_count - a.correction_count);
}

/**
 * Find senders whose emails are always skipped.
 */
async function findSkipPatterns(
  userId: string,
  since: Date | null,
  supabase: SupabaseClient
): Promise<SkipPattern[]> {
  let query = supabase
    .from('ai_journal')
    .select('from_address, final_status')
    .eq('user_id', userId)
    .not('from_address', 'is', null);

  if (since) {
    query = query.gt('created_at', since.toISOString());
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Group by sender
  const bySender = new Map<string, { total: number; skipped: number }>();
  for (const row of data) {
    if (!row.from_address) continue;
    const entry = bySender.get(row.from_address) || { total: 0, skipped: 0 };
    entry.total++;
    if (row.final_status === 'skipped') entry.skipped++;
    bySender.set(row.from_address, entry);
  }

  return Array.from(bySender.entries())
    .filter(([, { total }]) => total >= 3) // Need at least 3 to be meaningful
    .map(([from_address, { total, skipped }]) => ({
      from_address,
      skip_count: skipped,
      total_count: total,
      skip_pct: Math.round((skipped / total) * 100),
    }))
    .filter((p) => p.skip_pct >= 80)
    .sort((a, b) => b.skip_pct - a.skip_pct);
}

/**
 * Get cost and performance metrics.
 */
async function getCostMetrics(
  userId: string,
  since: Date | null,
  supabase: SupabaseClient
): Promise<CostMetrics> {
  let query = supabase
    .from('ai_journal')
    .select('invocation_type, duration_ms, prompt_tokens, response_tokens')
    .eq('user_id', userId);

  if (since) {
    query = query.gt('created_at', since.toISOString());
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    return {
      total_calls: 0,
      total_prompt_tokens: 0,
      total_response_tokens: 0,
      avg_duration_ms: 0,
      calls_with_regex: 0,
      calls_without_regex: 0,
      estimated_cost_usd: 0,
    };
  }

  let totalPromptTokens = 0;
  let totalResponseTokens = 0;
  let totalDuration = 0;
  let durationCount = 0;
  let callsWithRegex = 0;
  let callsWithoutRegex = 0;

  for (const row of data) {
    totalPromptTokens += row.prompt_tokens || 0;
    totalResponseTokens += row.response_tokens || 0;
    if (row.duration_ms) {
      totalDuration += row.duration_ms;
      durationCount++;
    }
    if (row.invocation_type === 'classification_only') {
      callsWithRegex++;
    } else {
      callsWithoutRegex++;
    }
  }

  // Claude Haiku 4.5 pricing: $1.00/1M input, $5.00/1M output
  const estimatedCost =
    (totalPromptTokens * 1.0) / 1_000_000 + (totalResponseTokens * 5.0) / 1_000_000;

  return {
    total_calls: data.length,
    total_prompt_tokens: totalPromptTokens,
    total_response_tokens: totalResponseTokens,
    avg_duration_ms: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    calls_with_regex: callsWithRegex,
    calls_without_regex: callsWithoutRegex,
    estimated_cost_usd: Math.round(estimatedCost * 10000) / 10000, // 4 decimal places
  };
}

/**
 * Count journal entries in the analysis window.
 */
async function countEntries(
  userId: string,
  since: Date | null,
  supabase: SupabaseClient
): Promise<number> {
  return getJournalEntriesSince(userId, since, supabase);
}

// ============================================================================
// AI SUMMARY (Optional, single call)
// ============================================================================

async function generateAiSummary(
  insights: InsightData[],
  costMetrics: CostMetrics
): Promise<string | null> {
  if (insights.length === 0) return null;

  const insightSummary = insights
    .map((i) => `- [${i.severity}] ${i.title}: ${i.description}`)
    .join('\n');

  const prompt = `Summarize these AI processing insights for a personal finance app in 2-3 sentences. Be concise and actionable.

Cost metrics: ${costMetrics.total_calls} AI calls, ~$${costMetrics.estimated_cost_usd} estimated cost, ${costMetrics.avg_duration_ms}ms avg response time.

Insights found:
${insightSummary}

Respond with a JSON object: {"summary": "your 2-3 sentence summary"}`;

  try {
    const { data } = await callAi<{ summary: string }>(prompt);
    return data.summary;
  } catch {
    return null;
  }
}

// ============================================================================
// BATCH ANALYSIS TRIGGER
// ============================================================================

/**
 * Trigger a batch analysis if enough new journal entries exist.
 * Called at the end of processNewEmails() — fire-and-forget.
 */
export async function triggerBatchAnalysis(userId: string): Promise<void> {
  try {
    await runAnalysis(userId, 'batch');
  } catch (error) {
    console.error('Batch analysis trigger failed (non-fatal):', error);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function countOccurrences(arr: string[]): { value: string; count: number }[] {
  const map = new Map<string, number>();
  for (const val of arr) {
    map.set(val, (map.get(val) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}
