/**
 * Hybrid Engine Orchestrator
 *
 * Runs rule engine first, then LLM if average confidence is below threshold.
 * Merges results: LLM upgrades low-confidence fields only.
 */

import { generateRuleProposal } from './rule-engine'
import { generateLLMProposal } from './llm-engine'
import { isAiAvailable } from '@/lib/email/ai-client'
import type {
  ProposalInput,
  ProposalEngineResult,
  FieldConfidenceMap,
  RuleEngineContext,
} from './types'

const LLM_CONFIDENCE_THRESHOLD = 70

/**
 * Generate a proposal using both rule engine and LLM when needed.
 */
export async function generateHybridProposal(
  item: ProposalInput,
  context: RuleEngineContext
): Promise<ProposalEngineResult> {
  const startTime = Date.now()

  // Step 1: Always run rule engine
  const ruleResult = generateRuleProposal(item, context)

  // Step 2: Check if LLM is needed
  const avgKeyConfidence = calculateKeyFieldAverage(ruleResult.fieldConfidence)
  const hasRejectionFeedback = item.rejectionFeedback && item.rejectionFeedback.length > 0

  // Force LLM when the user rejected a previous proposal — the rule engine alone wasn't good enough
  if (avgKeyConfidence >= LLM_CONFIDENCE_THRESHOLD && !hasRejectionFeedback || !isAiAvailable()) {
    return ruleResult
  }

  // Step 3: Call LLM for enhancement
  try {
    const llmResult = await generateLLMProposal(item, context)

    // Step 4: Merge — LLM upgrades low-confidence fields only
    const merged = mergeResults(ruleResult, llmResult)
    merged.durationMs = Date.now() - startTime

    return merged
  } catch (error) {
    // Graceful degradation: if LLM fails, use rule-based result
    console.error('LLM proposal failed, falling back to rule-based:', error)
    return ruleResult
  }
}

/**
 * Calculate average confidence of key fields (vendor, description, tags).
 */
function calculateKeyFieldAverage(fc: FieldConfidenceMap): number {
  const keyFields = ['vendor_id', 'description', 'tag_ids']
  let total = 0
  let count = 0

  for (const field of keyFields) {
    if (fc[field]) {
      total += fc[field].score
      count++
    }
  }

  return count > 0 ? total / count : 0
}

/**
 * Merge rule and LLM results. LLM only upgrades fields where it has
 * higher confidence than the rule engine.
 */
function mergeResults(
  rule: ProposalEngineResult,
  llm: ProposalEngineResult
): ProposalEngineResult {
  const mergedFields = { ...rule.fields }
  const mergedConfidence = { ...rule.fieldConfidence }
  let usedLlm = false

  // For each field in LLM result, check if it upgrades the rule result
  for (const [field, llmConf] of Object.entries(llm.fieldConfidence)) {
    const ruleConf = rule.fieldConfidence[field]
    if (!ruleConf || llmConf.score > ruleConf.score) {
      // LLM has higher confidence — use its value
      mergedConfidence[field] = llmConf
      usedLlm = true

      // Copy the corresponding field value
      const fieldMap: Record<string, string> = {
        vendor_id: 'vendorId',
        description: 'description',
        tag_ids: 'tagIds',
        transaction_type: 'transactionType',
        payment_method_id: 'paymentMethodId',
      }
      const propKey = fieldMap[field]
      if (propKey && propKey in llm.fields) {
        (mergedFields as Record<string, unknown>)[propKey] =
          (llm.fields as Record<string, unknown>)[propKey]
      }
    }
  }

  // Recalculate overall confidence
  const weights: Record<string, number> = {
    vendor_id: 3, description: 2, tag_ids: 2,
    payment_method_id: 2, transaction_type: 1,
    amount: 1, currency: 1, date: 1,
  }
  let totalWeight = 0
  let weightedSum = 0
  for (const [field, weight] of Object.entries(weights)) {
    if (mergedConfidence[field]) {
      totalWeight += weight
      weightedSum += mergedConfidence[field].score * weight
    }
  }

  return {
    fields: mergedFields,
    fieldConfidence: mergedConfidence,
    overallConfidence: totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0,
    engine: usedLlm ? 'hybrid' : 'rule_based',
    llmModel: usedLlm ? llm.llmModel : undefined,
    llmPromptTokens: usedLlm ? llm.llmPromptTokens : undefined,
    llmResponseTokens: usedLlm ? llm.llmResponseTokens : undefined,
    durationMs: 0, // set by caller
  }
}
