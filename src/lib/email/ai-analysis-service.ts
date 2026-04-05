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
import { getDecisionCountSince } from '../services/decision-learning';

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

interface UnmappedDescription {
  statement_description: string;
  occurrence_count: number;
  source_types: string[];
}

interface RejectionPattern {
  statement_description: string;
  rejection_count: number;
  avg_confidence: number;
}

interface MatchAccuracy {
  confidence_band: string;
  total_decisions: number;
  approvals: number;
  rejections: number;
  approval_rate: number;
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
  // Count both AI journal entries AND user decision log entries
  if (!skipMinimumCheck) {
    const [newJournalCount, newDecisionCount] = await Promise.all([
      getJournalEntriesSince(userId, journalFrom, supabase),
      getDecisionCountSince(supabase, userId, journalFrom),
    ]);
    if (newJournalCount + newDecisionCount < MIN_ENTRIES_FOR_BATCH) {
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
    // Email-based patterns (from ai_journal)
    // + Decision-based patterns (from user_decision_log)
    const [
      regexCandidates,
      vendorCorrections,
      skipPatterns,
      costMetrics,
      entriesAnalyzed,
      unmappedDescriptions,
      rejectionPatterns,
      matchAccuracy,
    ] = await Promise.all([
      findRegexParserCandidates(userId, journalFrom, supabase),
      findVendorCorrections(userId, journalFrom, supabase),
      findSkipPatterns(userId, journalFrom, supabase),
      getCostMetrics(userId, journalFrom, supabase),
      countEntries(userId, journalFrom, supabase),
      findUnmappedStatementDescriptions(userId, supabase),
      findRejectionPatterns(userId, journalFrom, supabase),
      getMatchAccuracyByConfidence(userId, journalFrom, supabase),
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

    // Unmapped statement description insights
    for (const desc of unmappedDescriptions) {
      insights.push({
        insight_type: 'unmapped_description',
        severity: desc.occurrence_count >= 5 ? 'action_needed' : 'suggestion',
        title: `Unmapped statement description: "${desc.statement_description}"`,
        description: `This description appears in ${desc.occurrence_count} approved items but has no vendor mapping. Assigning a vendor will enable automatic matching in future imports.`,
        evidence: {
          statement_description: desc.statement_description,
          occurrence_count: desc.occurrence_count,
          source_types: desc.source_types,
        },
        email_count: desc.occurrence_count,
      });
    }

    // Rejection pattern insights
    for (const pattern of rejectionPatterns) {
      insights.push({
        insight_type: 'rejection_pattern',
        severity: pattern.rejection_count >= 5 ? 'action_needed' : 'suggestion',
        title: `Frequently rejected: "${pattern.statement_description}"`,
        description: `This description has been rejected ${pattern.rejection_count} times (avg confidence: ${pattern.avg_confidence}%). The matching algorithm may need tuning for this type of transaction.`,
        evidence: {
          statement_description: pattern.statement_description,
          rejection_count: pattern.rejection_count,
          avg_confidence: pattern.avg_confidence,
        },
        email_count: pattern.rejection_count,
      });
    }

    // Match accuracy insight
    if (matchAccuracy.length > 0) {
      const lowBands = matchAccuracy.filter(b => b.approval_rate < 70 && b.total_decisions >= 3);
      for (const band of lowBands) {
        insights.push({
          insight_type: 'match_accuracy',
          severity: 'info',
          title: `Low approval rate for ${band.confidence_band} confidence matches`,
          description: `Only ${band.approval_rate}% of ${band.confidence_band} confidence matches are approved (${band.approvals}/${band.total_decisions}). Consider adjusting the confidence threshold.`,
          evidence: {
            confidence_band: band.confidence_band,
            total_decisions: band.total_decisions,
            approvals: band.approvals,
            rejections: band.rejections,
            approval_rate: band.approval_rate,
          },
        });
      }
    }

    // Build patterns and summary objects
    const patterns = {
      regex_candidates: regexCandidates,
      vendor_corrections: vendorCorrections,
      skip_patterns: skipPatterns,
      unmapped_descriptions: unmappedDescriptions,
      rejection_patterns: rejectionPatterns,
      match_accuracy: matchAccuracy,
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
// DECISION-BASED PATTERN QUERIES (from user_decision_log)
// ============================================================================

/**
 * Find statement descriptions that appear frequently in approvals but have
 * no vendor assigned. These are candidates for vendor mapping.
 */
async function findUnmappedStatementDescriptions(
  userId: string,
  supabase: SupabaseClient
): Promise<UnmappedDescription[]> {
  // Find descriptions from approved items that have no vendor
  const { data, error } = await supabase
    .from('user_decision_log')
    .select('statement_description, source_type')
    .eq('user_id', userId)
    .in('decision_type', ['approve_match', 'approve_create', 'link'])
    .not('statement_description', 'is', null)
    .is('vendor_id', null);

  if (error || !data || data.length === 0) return [];

  // Group by description and count occurrences
  const descMap = new Map<string, { count: number; sourceTypes: Set<string> }>();
  for (const row of data) {
    const desc = row.statement_description as string;
    const existing = descMap.get(desc) || { count: 0, sourceTypes: new Set<string>() };
    existing.count++;
    existing.sourceTypes.add(row.source_type);
    descMap.set(desc, existing);
  }

  return Array.from(descMap.entries())
    .filter(([, v]) => v.count >= 3) // At least 3 occurrences
    .map(([desc, v]) => ({
      statement_description: desc,
      occurrence_count: v.count,
      source_types: Array.from(v.sourceTypes),
    }))
    .sort((a, b) => b.occurrence_count - a.occurrence_count)
    .slice(0, 10); // Top 10
}

/**
 * Find statement descriptions that get rejected frequently.
 * These suggest the matching algorithm isn't working well for those items.
 */
async function findRejectionPatterns(
  userId: string,
  since: Date | null,
  supabase: SupabaseClient
): Promise<RejectionPattern[]> {
  let query = supabase
    .from('user_decision_log')
    .select('statement_description, match_confidence')
    .eq('user_id', userId)
    .eq('decision_type', 'reject')
    .not('statement_description', 'is', null);

  if (since) {
    query = query.gt('created_at', since.toISOString());
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) return [];

  // Group by description
  const descMap = new Map<string, { count: number; confidences: number[] }>();
  for (const row of data) {
    const desc = row.statement_description as string;
    const existing = descMap.get(desc) || { count: 0, confidences: [] };
    existing.count++;
    if (row.match_confidence != null) {
      existing.confidences.push(row.match_confidence);
    }
    descMap.set(desc, existing);
  }

  return Array.from(descMap.entries())
    .filter(([, v]) => v.count >= 3) // At least 3 rejections
    .map(([desc, v]) => ({
      statement_description: desc,
      rejection_count: v.count,
      avg_confidence: v.confidences.length > 0
        ? Math.round(v.confidences.reduce((a, b) => a + b, 0) / v.confidences.length)
        : 0,
    }))
    .sort((a, b) => b.rejection_count - a.rejection_count)
    .slice(0, 10);
}

/**
 * Calculate match accuracy by confidence band.
 * Shows what % of auto-matched items the user actually approves.
 */
async function getMatchAccuracyByConfidence(
  userId: string,
  since: Date | null,
  supabase: SupabaseClient
): Promise<MatchAccuracy[]> {
  let query = supabase
    .from('user_decision_log')
    .select('decision_type, match_confidence')
    .eq('user_id', userId)
    .in('decision_type', ['approve_match', 'reject'])
    .not('match_confidence', 'is', null);

  if (since) {
    query = query.gt('created_at', since.toISOString());
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) return [];

  // Group into confidence bands
  const bands = new Map<string, { approvals: number; rejections: number }>();
  for (const row of data) {
    const conf = row.match_confidence as number;
    let band: string;
    if (conf >= 90) band = '90-100';
    else if (conf >= 70) band = '70-89';
    else if (conf >= 50) band = '50-69';
    else band = '0-49';

    const existing = bands.get(band) || { approvals: 0, rejections: 0 };
    if (row.decision_type === 'approve_match') {
      existing.approvals++;
    } else {
      existing.rejections++;
    }
    bands.set(band, existing);
  }

  return Array.from(bands.entries())
    .map(([band, v]) => ({
      confidence_band: band,
      total_decisions: v.approvals + v.rejections,
      approvals: v.approvals,
      rejections: v.rejections,
      approval_rate: Math.round((v.approvals / (v.approvals + v.rejections)) * 100),
    }))
    .sort((a, b) => {
      const bandOrder = ['0-49', '50-69', '70-89', '90-100'];
      return bandOrder.indexOf(a.confidence_band) - bandOrder.indexOf(b.confidence_band);
    });
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
 * Trigger a batch analysis if enough new entries exist.
 * Called at the end of processNewEmails() and from decision learning — fire-and-forget.
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
