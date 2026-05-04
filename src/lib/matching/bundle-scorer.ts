/**
 * Bundle Match Scorer
 *
 * Scores an `EmailBundle` (multiple sibling email_transactions) against a
 * single candidate target transaction. Each member email's amount is
 * converted to the target currency using its own `transaction_date` rate, the
 * converted amounts are summed, and the sum is compared against the target.
 * Date and vendor scoring use the focal email so the result aligns with the
 * card transaction's day.
 *
 * The output shape mirrors `MatchResult` so downstream UI/ranking code can
 * consume bundle results with the same primitives. Extra fields surface the
 * bundle-specific math (member ids, totals, conversion details).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { compareAmounts } from './amount-matcher';
import { compareDates } from './date-matcher';
import { compareVendors } from './vendor-matcher';
import { convertAmount, getRateQualityScore } from './cross-currency';
import type { EmailBundle } from './email-bundler';
import {
  CONFIDENCE_THRESHOLDS,
  SCORE_WEIGHTS,
  getConfidenceLevel,
  type ConfidenceLevel,
  type TargetTransaction,
} from './match-scorer';

export interface BundleConversionDetail {
  emailId: string;
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  rate: number;
  rateDate: string;
  rateDaysDiff: number;
  isExactRate: boolean;
}

export interface BundleMatchResult {
  /** Same target id semantics as `MatchResult.targetId`. */
  targetId: string;
  /** Email IDs included in this bundle, in the same order as `bundle.members`. */
  memberIds: string[];
  /** Sum of native amounts (all members are same currency). */
  totalNativeAmount: number;
  nativeCurrency: string;
  /** Sum of converted amounts (already in target.currency). */
  convertedAmount: number;
  /** Worst rate quality across members (100 = exact for all). */
  rateQuality: number;
  /** Per-member breakdown for UI / debugging. */
  conversions: BundleConversionDetail[];
  score: number;
  confidence: ConfidenceLevel;
  isMatch: boolean;
  reasons: string[];
  appliedCaps: number[];
  isCrossCurrency: boolean;
  vendorLabel: string;
}

export interface ScoreBundleOptions {
  minMatchScore?: number;
}

/**
 * Score an entire bundle against a single target transaction.
 *
 * Returns a result whose score field uses the same 0-100 scale as `MatchResult`
 * so it can be rendered alongside single-email suggestions.
 */
export async function scoreBundleAgainstTarget(
  bundle: EmailBundle,
  target: TargetTransaction,
  supabase: SupabaseClient,
  options: ScoreBundleOptions = {},
): Promise<BundleMatchResult> {
  const minMatchScore = options.minMatchScore ?? CONFIDENCE_THRESHOLDS.MEDIUM;
  const reasons: string[] = [];
  const appliedCaps: number[] = [];

  const focal = bundle.members[0];
  const nativeCurrency = focal.currency;
  const targetCurrency = target.currency.toUpperCase();
  const isCrossCurrency = nativeCurrency.toUpperCase() !== targetCurrency;

  let totalNative = 0;
  let totalConverted = 0;
  let worstRateQuality = 100;
  let allConverted = true;
  const conversions: BundleConversionDetail[] = [];

  for (const m of bundle.members) {
    totalNative += m.amount;
    if (!isCrossCurrency) {
      totalConverted += m.amount;
      conversions.push({
        emailId: m.id,
        originalAmount: m.amount,
        originalCurrency: m.currency,
        convertedAmount: m.amount,
        rate: 1,
        rateDate: m.transaction_date,
        rateDaysDiff: 0,
        isExactRate: true,
      });
      continue;
    }
    const conv = await convertAmount(
      supabase,
      m.amount,
      m.currency,
      target.currency,
      m.transaction_date,
    );
    if (!conv) {
      allConverted = false;
      reasons.push(`No exchange rate for ${m.currency}→${target.currency} on ${m.transaction_date}`);
      conversions.push({
        emailId: m.id,
        originalAmount: m.amount,
        originalCurrency: m.currency,
        convertedAmount: 0,
        rate: 0,
        rateDate: m.transaction_date,
        rateDaysDiff: 0,
        isExactRate: false,
      });
      continue;
    }
    totalConverted += conv.convertedAmount;
    const quality = conv.isExactRate ? 100 : getRateQualityScore(conv.rateDaysDiff);
    if (quality < worstRateQuality) worstRateQuality = quality;
    conversions.push({
      emailId: m.id,
      originalAmount: conv.originalAmount,
      originalCurrency: conv.fromCurrency,
      convertedAmount: conv.convertedAmount,
      rate: conv.rate,
      rateDate: conv.rateDate,
      rateDaysDiff: conv.rateDaysDiff,
      isExactRate: conv.isExactRate,
    });
  }

  // Amount comparison
  let amountResult = compareAmounts(totalConverted, target.amount);
  if (!allConverted) {
    amountResult = {
      score: 0,
      percentDiff: 100,
      isMatch: false,
      confidenceCap: 50,
      reason: `Cannot convert all bundle members to ${target.currency}`,
    };
  } else if (isCrossCurrency && worstRateQuality < 100) {
    const factor = worstRateQuality / 100;
    amountResult = {
      ...amountResult,
      score: Math.round(amountResult.score * factor),
      reason: `${amountResult.reason} (worst rate quality: ${worstRateQuality}%)`,
    };
  }
  reasons.push(`Bundle amount: ${amountResult.reason}`);
  if (amountResult.confidenceCap) appliedCaps.push(amountResult.confidenceCap);

  // Date scoring uses the focal email's transaction_date
  const dateResult = compareDates(focal.transaction_date, target.date);
  reasons.push(`Date: ${dateResult.reason}`);
  if (dateResult.confidenceCap) appliedCaps.push(dateResult.confidenceCap);

  // Vendor scoring uses the focal email's vendor name
  const vendorResult = compareVendors(focal.vendor, target.vendor);
  reasons.push(`Vendor: ${vendorResult.reason}`);

  // Composite score using the same weights as the single-match scorer
  const amountContribution = (amountResult.score / 40) * SCORE_WEIGHTS.AMOUNT;
  const dateContribution = (dateResult.score / 30) * SCORE_WEIGHTS.DATE;
  const vendorContribution = (vendorResult.score / 30) * SCORE_WEIGHTS.VENDOR;
  let raw = Math.round(amountContribution + dateContribution + vendorContribution);
  if (appliedCaps.length > 0) raw = Math.min(raw, ...appliedCaps);

  reasons.unshift(
    `Combined ${bundle.members.length} ${bundle.vendorLabel} emails: ${nativeCurrency} ${totalNative.toFixed(2)} → ${targetCurrency} ${totalConverted.toFixed(2)} vs ${targetCurrency} ${target.amount.toFixed(2)}`,
  );

  return {
    targetId: target.id,
    memberIds: bundle.members.map((m) => m.id),
    totalNativeAmount: totalNative,
    nativeCurrency,
    convertedAmount: totalConverted,
    rateQuality: worstRateQuality,
    conversions,
    score: raw,
    confidence: getConfidenceLevel(raw),
    isMatch: raw >= minMatchScore && allConverted,
    reasons,
    appliedCaps,
    isCrossCurrency,
    vendorLabel: bundle.vendorLabel,
  };
}

/**
 * Score a bundle against multiple targets. Returns results sorted by score
 * descending, mirroring `calculateMatchScores`.
 */
export async function scoreBundleAgainstTargets(
  bundle: EmailBundle,
  targets: TargetTransaction[],
  supabase: SupabaseClient,
  options: ScoreBundleOptions = {},
): Promise<BundleMatchResult[]> {
  const results: BundleMatchResult[] = [];
  for (const t of targets) {
    results.push(await scoreBundleAgainstTarget(bundle, t, supabase, options));
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}
