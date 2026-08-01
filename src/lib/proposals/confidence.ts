/**
 * Enrichment confidence — the score for the fields the engine actually
 * guesses: vendor, description, tags.
 *
 * The composite overall_confidence weights in amount, currency, and date,
 * which score 95-100 by construction ("Direct from import source",
 * "Statement date (authoritative)"). Those three facts were never in doubt,
 * so they dominate the composite and dilute the guessed fields — which is
 * how a sign-inverted proposal scored 82 while a fully-correct one scored
 * 91. Enrichment confidence is computed from the guessed fields alone and
 * must never be merged back into a blended number.
 *
 * Match confidence (do independent sources agree on date and amount?) lives
 * on the queue item, not here, and is the only signal bulk approval may
 * gate on.
 */

import type { FieldConfidenceMap } from './types'

const ENRICHMENT_WEIGHTS: Record<string, number> = {
  vendor_id: 3,
  description: 2,
  tag_ids: 2,
}

export function calculateEnrichmentConfidence(fc: FieldConfidenceMap): number {
  let totalWeight = 0
  let weightedSum = 0

  for (const [field, weight] of Object.entries(ENRICHMENT_WEIGHTS)) {
    if (fc[field]) {
      totalWeight += weight
      weightedSum += fc[field].score * weight
    }
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
}
