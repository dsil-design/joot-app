/**
 * When the hybrid engine escalates to the LLM.
 *
 * The gate used to be a plain average over vendor/description/tags, so a
 * confident vendor could average away the rule engine's own admission that it
 * could not describe something. That is exactly backwards: the field the
 * rules gave up on is the one the LLM layer exists for.
 */

import { generateHybridProposal } from '@/lib/proposals/hybrid-engine'
import { generateLLMProposal } from '@/lib/proposals/llm-engine'
import { isAiAvailable } from '@/lib/email/ai-client'
import type { ProposalInput, RuleEngineContext, ProposalEngineResult } from '@/lib/proposals/types'

jest.mock('@/lib/proposals/llm-engine', () => ({
  generateLLMProposal: jest.fn(),
}))
jest.mock('@/lib/email/ai-client', () => ({
  isAiAvailable: jest.fn(() => true),
  callAi: jest.fn(),
  AI_MODEL: 'test-model',
}))

const mockLLM = generateLLMProposal as jest.MockedFunction<typeof generateLLMProposal>
const mockAiAvailable = isAiAvailable as jest.MockedFunction<typeof isAiAvailable>

const AMAZON = 'v-amazon'
const CHASE = 'pm-chase'

function makeContext(): RuleEngineContext {
  return {
    vendors: [{ id: AMAZON, name: 'Amazon', transactionCount: 40 }],
    paymentMethods: [{ id: CHASE, name: 'Chase Sapphire Reserve', type: 'credit_card' }],
    tags: [{ id: 't-shopping', name: 'Shopping', usageCount: 20 }],
    recentTransactions: [],
    vendorTagFrequency: [
      { vendorId: AMAZON, tagId: 't-shopping', tagName: 'Shopping', frequency: 0.9, count: 36 },
    ],
    vendorDescriptionPatterns: [],
    pastCorrections: [],
    vendorRecipientMappings: [],
    statementDescriptionMappings: [],
    autoTagRules: [],
  }
}

function llmResult(): ProposalEngineResult {
  return {
    fields: { description: 'Workout Tank Tops' },
    fieldConfidence: { description: { score: 88, reasoning: 'AI summary of the order items' } },
    overallConfidence: 88,
    enrichmentConfidence: 88,
    engine: 'llm',
    durationMs: 1,
  }
}

const LISTING_TITLE =
  'TACVASEN Workout Shirts for Men Muscle Tank Top Mens Sleeveless Shirts Gym Top Dry Fit UPF 50+ Gym Tee Mulled Teal XL'

function amazonItem(overrides: Partial<ProposalInput> = {}): ProposalInput {
  return {
    compositeId: 'merged:e1+stmt:s1:0',
    sourceType: 'merged',
    description: LISTING_TITLE,
    amount: 20.31,
    currency: 'USD',
    date: '2026-05-09',
    parserKey: 'amazon',
    vendorNameRaw: 'Amazon.com',
    paymentMethodId: CHASE,
    ...overrides,
  }
}

beforeEach(() => {
  mockLLM.mockReset()
  mockLLM.mockResolvedValue(llmResult())
  mockAiAvailable.mockReturnValue(true)
})

describe('generateHybridProposal — escalation', () => {
  it('escalates a retail listing title even when vendor and tags are confident', () => {
    // Vendor 95 + tags 90 + description 45 averages to 76 — above the old
    // threshold, which is how the raw listing title used to ship as-is.
    return generateHybridProposal(amazonItem(), makeContext()).then((result) => {
      expect(mockLLM).toHaveBeenCalled()
      expect(result.fields.description).toBe('Workout Tank Tops')
    })
  })

  it('passes the rule-resolved vendor to the LLM so it can see that vendor\'s style', async () => {
    await generateHybridProposal(amazonItem(), makeContext())

    expect(mockLLM).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ vendorId: AMAZON })
    )
  })

  it('does not escalate when every field the rules attempted is strong', async () => {
    const item = amazonItem({
      // A short parser description needs no rewriting.
      description: 'Golf Tees',
      sourceType: 'email',
      extractionConfidence: 100,
    })

    await generateHybridProposal(item, makeContext())

    expect(mockLLM).not.toHaveBeenCalled()
  })

  it('keeps the deterministic condensation when no LLM is available', async () => {
    mockAiAvailable.mockReturnValue(false)

    const result = await generateHybridProposal(amazonItem(), makeContext())

    expect(mockLLM).not.toHaveBeenCalled()
    expect(result.engine).toBe('rule_based')
    expect(result.fields.description).toBe('TACVASEN Workout Shirts')
  })

  it('falls back to the rule result when the LLM call fails', async () => {
    mockLLM.mockRejectedValue(new Error('rate limited'))

    const result = await generateHybridProposal(amazonItem(), makeContext())

    expect(result.engine).toBe('rule_based')
    expect(result.fields.description).toBe('TACVASEN Workout Shirts')
  })
})

describe('the LLM may not name goods no source mentions', () => {
  const AMAZON_HISTORY = new Map([
    [AMAZON, [
      { description: 'Magnesium, Tote Bag', amount: 71.78, currency: 'USD', date: '2026-05-06' },
      { description: 'Wine Saver with Bottle Stoppers', amount: 19.25, currency: 'USD', date: '2026-05-10' },
    ]],
  ])

  function statementOnlyItem(): ProposalInput {
    return {
      compositeId: 'stmt:s1:59',
      sourceType: 'statement',
      description: 'AMAZON MKTPL*BF2BM2GD2 Amzn.com/bill WA',
      statementDescription: 'AMAZON MKTPL*BF2BM2GD2 Amzn.com/bill WA',
      // Same amount as a past order — the coincidence the model fell for.
      amount: 71.78,
      currency: 'USD',
      date: '2026-05-07',
      paymentMethodId: CHASE,
    }
  }

  it('replaces a past description reused on a row with no receipt', async () => {
    const { generateLLMProposal: real } = jest.requireActual('@/lib/proposals/llm-engine')
    const context = { ...makeContext(), vendorDescriptionSamples: AMAZON_HISTORY }

    // The model returns the historical description verbatim.
    const { callAi } = jest.requireMock('@/lib/email/ai-client')
    callAi.mockResolvedValue({
      data: {
        vendor_id: AMAZON,
        description: 'Magnesium, Tote Bag',
        confidence: { vendor: 95, description: 95 },
        reasoning: { description: 'Amount matches a prior transaction exactly' },
      },
      tokenUsage: { promptTokens: 1, responseTokens: 1 },
    })

    const result = await real(statementOnlyItem(), context, { vendorId: AMAZON })

    expect(result.fields.description).toBe('Amazon Order')
    expect(result.fieldConfidence.description.reasoning).toMatch(/reused/i)
  })

  it('leaves the description alone when a receipt names the goods', async () => {
    const { generateLLMProposal: real } = jest.requireActual('@/lib/proposals/llm-engine')
    const context = { ...makeContext(), vendorDescriptionSamples: AMAZON_HISTORY }

    const { callAi } = jest.requireMock('@/lib/email/ai-client')
    callAi.mockResolvedValue({
      data: {
        vendor_id: AMAZON,
        description: 'Magnesium, Tote Bag',
        confidence: { vendor: 95, description: 95 },
        reasoning: { description: 'The receipt lists magnesium and a tote bag' },
      },
      tokenUsage: { promptTokens: 1, responseTokens: 1 },
    })

    const withReceipt: ProposalInput = {
      ...statementOnlyItem(),
      sourceType: 'merged',
      emailTransactionId: 'email-1',
      retailOrderItems: [
        { name: 'Magnesium L Threonate, Magtein', quantity: 1, amount: 59 },
        { name: 'Canvas Tote Bag', quantity: 1, amount: 12 },
      ],
    }

    const result = await real(withReceipt, context, { vendorId: AMAZON })

    expect(result.fields.description).toBe('Magnesium, Tote Bag')
  })
})
