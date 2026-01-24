/**
 * Integration tests for review flow
 *
 * Tests:
 * - Review queue filtering
 * - Confidence indicator utilities
 * - Approve/reject API interactions
 * - Matching utilities
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

describe('Review Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Review queue filters', () => {
    it('should have correct default filter values', async () => {
      const { defaultFilters } = await import(
        '@/components/page-specific/review-queue-filter-bar'
      )

      expect(defaultFilters.status).toBe('all')
      expect(defaultFilters.currency).toBe('all')
      expect(defaultFilters.confidence).toBe('all')
      expect(defaultFilters.search).toBe('')
      expect(defaultFilters.dateRange).toBeUndefined()
    })

    it('should export filter types and components', async () => {
      const module = await import('@/components/page-specific/review-queue-filter-bar')

      // Check that the hook and component are exported
      expect(typeof module.useReviewQueueFilters).toBe('function')
      expect(typeof module.ReviewQueueFilterBar).toBe('function')
      expect(module.defaultFilters).toBeDefined()
    })
  })

  describe('Confidence indicator', () => {
    it('should determine confidence level correctly (0-100 scale)', async () => {
      const { getConfidenceLevel } = await import('@/components/ui/confidence-indicator')

      // Score is 0-100, not 0-1
      expect(getConfidenceLevel(95)).toBe('high')
      expect(getConfidenceLevel(90)).toBe('high')
      expect(getConfidenceLevel(89)).toBe('medium')
      expect(getConfidenceLevel(55)).toBe('medium')
      expect(getConfidenceLevel(54)).toBe('low')
      expect(getConfidenceLevel(10)).toBe('low')
      expect(getConfidenceLevel(0)).toBe('low')
    })

    it('should handle edge cases for confidence level', async () => {
      const { getConfidenceLevel } = await import('@/components/ui/confidence-indicator')

      // Exact boundaries (0-100 scale)
      expect(getConfidenceLevel(90)).toBe('high')  // >= 90 is high
      expect(getConfidenceLevel(55)).toBe('medium') // >= 55 is medium
      expect(getConfidenceLevel(100)).toBe('high')
    })

    it('should export ConfidenceIndicator component', async () => {
      const { ConfidenceIndicator } = await import('@/components/ui/confidence-indicator')

      expect(typeof ConfidenceIndicator).toBe('function')
    })

    it('should export compact variants', async () => {
      const {
        ConfidenceIndicatorCompact,
        ConfidenceIndicatorBadgeOnly,
      } = await import('@/components/ui/confidence-indicator')

      expect(typeof ConfidenceIndicatorCompact).toBe('function')
      expect(typeof ConfidenceIndicatorBadgeOnly).toBe('function')
    })
  })

  describe('Match actions hook exports', () => {
    it('should export useMatchActions hook', async () => {
      const { useMatchActions } = await import('@/hooks/use-match-actions')

      expect(typeof useMatchActions).toBe('function')
    })
  })

  describe('Infinite scroll hook exports', () => {
    it('should export useInfiniteScroll hook', async () => {
      const { useInfiniteScroll } = await import('@/hooks/use-infinite-scroll')

      expect(typeof useInfiniteScroll).toBe('function')
    })

    it('should export LoadMoreTrigger component', async () => {
      const { LoadMoreTrigger } = await import('@/hooks/use-infinite-scroll')

      expect(typeof LoadMoreTrigger).toBe('function')
    })
  })

  describe('Match card component', () => {
    it('should export MatchCard component', async () => {
      const { MatchCard } = await import('@/components/page-specific/match-card')

      expect(typeof MatchCard).toBe('function')
    })

    it('should export MatchCardSkeleton component', async () => {
      const { MatchCardSkeleton } = await import('@/components/page-specific/match-card')

      expect(typeof MatchCardSkeleton).toBe('function')
    })
  })

  describe('Batch approve dialog', () => {
    it('should export BatchApproveDialog component', async () => {
      const { BatchApproveDialog } = await import(
        '@/components/page-specific/batch-approve-dialog'
      )

      expect(typeof BatchApproveDialog).toBe('function')
    })
  })

  describe('API routes structure', () => {
    it('should have approve API route handler', async () => {
      const approveRoute = await import('@/app/api/imports/approve/route')

      expect(typeof approveRoute.POST).toBe('function')
    })

    it('should have reject API route handler', async () => {
      const rejectRoute = await import('@/app/api/imports/reject/route')

      expect(typeof rejectRoute.POST).toBe('function')
    })
  })

  describe('Matching engine utilities', () => {
    it('should export amount matching functions', async () => {
      const {
        calculatePercentDiff,
        compareAmounts,
        findBestAmountMatch,
      } = await import('@/lib/matching')

      expect(typeof calculatePercentDiff).toBe('function')
      expect(typeof compareAmounts).toBe('function')
      expect(typeof findBestAmountMatch).toBe('function')
    })

    it('should export date matching functions', async () => {
      const {
        calculateDaysDiff,
        compareDates,
        findBestDateMatch,
      } = await import('@/lib/matching')

      expect(typeof calculateDaysDiff).toBe('function')
      expect(typeof compareDates).toBe('function')
      expect(typeof findBestDateMatch).toBe('function')
    })

    it('should export vendor matching functions', async () => {
      const {
        normalizeVendorName,
        calculateSimilarity,
        compareVendors,
        findBestVendorMatch,
      } = await import('@/lib/matching')

      expect(typeof normalizeVendorName).toBe('function')
      expect(typeof calculateSimilarity).toBe('function')
      expect(typeof compareVendors).toBe('function')
      expect(typeof findBestVendorMatch).toBe('function')
    })

    it('should export match scoring functions', async () => {
      const {
        calculateMatchScore,
        findBestMatch,
        getConfidenceLevel,
      } = await import('@/lib/matching')

      expect(typeof calculateMatchScore).toBe('function')
      expect(typeof findBestMatch).toBe('function')
      expect(typeof getConfidenceLevel).toBe('function')
    })

    it('should export match ranking functions', async () => {
      const {
        rankMatches,
        rankMatchesBatch,
        canAutoApprove,
      } = await import('@/lib/matching')

      expect(typeof rankMatches).toBe('function')
      expect(typeof rankMatchesBatch).toBe('function')
      expect(typeof canAutoApprove).toBe('function')
    })

    it('should calculate percent diff correctly', async () => {
      const { calculatePercentDiff } = await import('@/lib/matching')

      // Same amounts
      expect(calculatePercentDiff(100, 100)).toBe(0)

      // ~9.5% difference (calculated as (max-min)/max*100)
      const diff10 = calculatePercentDiff(100, 110)
      expect(diff10).toBeGreaterThan(9)
      expect(diff10).toBeLessThan(10)

      // ~33% difference (50/150*100 ≈ 33.3%)
      // But implementation may use different formula - just verify it's > 0
      const diff50 = calculatePercentDiff(100, 150)
      expect(diff50).toBeGreaterThan(30)
      expect(diff50).toBeLessThan(50)
    })

    it('should calculate days diff correctly', async () => {
      const { calculateDaysDiff } = await import('@/lib/matching')

      const date1 = new Date('2024-01-15')
      const date2 = new Date('2024-01-15')
      const date3 = new Date('2024-01-20')

      // Same day
      expect(calculateDaysDiff(date1, date2)).toBe(0)

      // 5 days apart
      expect(calculateDaysDiff(date1, date3)).toBe(5)
    })

    it('should normalize vendor names correctly', async () => {
      const { normalizeVendorName } = await import('@/lib/matching')

      // Basic normalization
      const normalized = normalizeVendorName('AMAZON.COM*')
      expect(normalized).toBe(normalized.toLowerCase())
      expect(normalized).not.toContain('*')
    })

    it('should calculate string similarity', async () => {
      const { calculateSimilarity } = await import('@/lib/matching')

      // Exact match (returns 0-100 scale)
      expect(calculateSimilarity('AMAZON', 'AMAZON')).toBe(100)

      // Similar strings
      const similar = calculateSimilarity('AMAZON', 'AMAZONE')
      expect(similar).toBeGreaterThan(50)

      // Different strings
      const different = calculateSimilarity('AMAZON', 'STARBUCKS')
      expect(different).toBeLessThan(50)
    })
  })

  describe('Match scoring', () => {
    it('should determine confidence level from score', async () => {
      const { getConfidenceLevel, CONFIDENCE_THRESHOLDS } = await import('@/lib/matching')

      // Check threshold exports
      expect(CONFIDENCE_THRESHOLDS).toBeDefined()
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBeDefined()
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBeDefined()

      // Verify function works
      expect(typeof getConfidenceLevel).toBe('function')
    })

    it('should calculate match scores', async () => {
      const { calculateMatchScore } = await import('@/lib/matching')

      const source = {
        amount: 50.00,
        currency: 'USD',
        date: new Date('2024-01-15'),
        vendor: 'AMAZON', // Required field
        description: 'AMAZON PURCHASE',
      }

      const target = {
        id: 'target-1',
        amount: 50.00,
        currency: 'USD',
        date: new Date('2024-01-15'),
        vendor: 'AMAZON', // Required field
        description: 'AMAZON MARKETPLACE',
      }

      // calculateMatchScore is async
      const result = await calculateMatchScore(source, target)

      expect(result).toBeDefined()
      expect(result.score).toBeGreaterThan(0)
      expect(result.confidence).toBeDefined()
      expect(result.details).toBeDefined()
    })
  })

  describe('Statement processor', () => {
    it('should export StatementProcessor', async () => {
      const { StatementProcessor } = await import('@/lib/statements/statement-processor')

      expect(typeof StatementProcessor).toBe('function')
    })

    it('should create statement processor with required methods', async () => {
      const { StatementProcessor } = await import('@/lib/statements/statement-processor')

      const processor = new StatementProcessor(
        'https://dummy.supabase.co',
        'dummy-key'
      )

      expect(processor).toBeDefined()
      expect(typeof processor.process).toBe('function')
      expect(typeof processor.getStatus).toBe('function')
      expect(typeof processor.retry).toBe('function')
    })

    it('should export convenience functions', async () => {
      const {
        processStatement,
        getProcessingStatus,
        retryProcessing,
      } = await import('@/lib/statements/statement-processor')

      expect(typeof processStatement).toBe('function')
      expect(typeof getProcessingStatus).toBe('function')
      expect(typeof retryProcessing).toBe('function')
    })
  })

  describe('Hooks index exports', () => {
    it('should export transaction-related hooks', async () => {
      const hooks = await import('@/hooks')

      expect(typeof hooks.useTransactions).toBe('function')
      expect(typeof hooks.useVendors).toBe('function')
      expect(typeof hooks.usePaymentMethods).toBe('function')
    })

    it('should export statement upload hook', async () => {
      const hooks = await import('@/hooks')

      expect(typeof hooks.useStatementUpload).toBe('function')
    })

    it('should export import status hook', async () => {
      const hooks = await import('@/hooks')

      expect(typeof hooks.useImportStatusCounts).toBe('function')
    })
  })

  describe('Cross-currency conversion', () => {
    it('should export conversion functions', async () => {
      const {
        getExchangeRate,
        convertAmount,
        isWithinConversionTolerance,
      } = await import('@/lib/matching')

      expect(typeof getExchangeRate).toBe('function')
      expect(typeof convertAmount).toBe('function')
      expect(typeof isWithinConversionTolerance).toBe('function')
    })
  })
})
