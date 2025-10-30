/**
 * AI/ML Cost Calculator and Optimization Tools
 *
 * This module helps estimate and optimize costs for the document processing pipeline.
 * Use this to forecast expenses, set budgets, and implement cost controls.
 */

// ============================================================================
// PRICING CONSTANTS (as of January 2025)
// ============================================================================

export const PRICING = {
  // Anthropic Claude
  claude: {
    'claude-3-5-haiku-20241022': {
      input: 0.25 / 1_000_000, // $ per token
      output: 1.25 / 1_000_000,
      // Vision pricing
      imageInput: 0.003, // per image (avg)
    },
    'claude-3-5-sonnet-20241022': {
      input: 3.0 / 1_000_000,
      output: 15.0 / 1_000_000,
      imageInput: 0.006,
    },
  },

  // OpenAI
  openai: {
    'gpt-4o': {
      input: 2.5 / 1_000_000,
      output: 10.0 / 1_000_000,
      imageInput: 0.005,
    },
    'gpt-4o-mini': {
      input: 0.15 / 1_000_000,
      output: 0.6 / 1_000_000,
      imageInput: 0.002,
    },
    'text-embedding-3-small': {
      usage: 0.02 / 1_000_000, // per token
    },
  },

  // OCR Services
  ocr: {
    tesseract: 0, // Free, local
    googleVision: 1.5 / 1000, // per image
    awsTextract: 1.5 / 1000,
  },

  // Storage (Supabase/S3)
  storage: {
    perGB: 0.021, // per GB per month
    bandwidth: 0.09, // per GB transferred
  },

  // Processing (Vercel/Cloudflare)
  compute: {
    vercelEdge: 0.65 / 1_000_000, // per GB-second
    cloudflareWorkers: 0.5 / 1_000_000,
  },
};

// ============================================================================
// TOKEN ESTIMATION
// ============================================================================

export class TokenEstimator {
  /**
   * Estimate tokens for text (rough approximation)
   * More accurate: use tiktoken library
   */
  static estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate tokens for structured data
   */
  static estimateStructuredTokens(data: any): number {
    const jsonString = JSON.stringify(data);
    return this.estimateTokens(jsonString);
  }

  /**
   * Common prompt sizes
   */
  static PROMPTS = {
    classification: 200, // Base classification prompt
    extraction: 500, // Extraction instructions
    enrichment: 300, // Vendor enrichment prompt
  };

  /**
   * Estimate total tokens for document processing
   */
  static estimateDocumentTokens(ocrTextLength: number): {
    classification: { input: number; output: number };
    extraction: { input: number; output: number };
    enrichment: { input: number; output: number };
  } {
    const ocrTokens = this.estimateTokens('x'.repeat(ocrTextLength));

    return {
      classification: {
        input: this.PROMPTS.classification + 100, // prompt + minimal text
        output: 100, // JSON response
      },
      extraction: {
        input: this.PROMPTS.extraction + ocrTokens,
        output: 300, // Structured transaction data
      },
      enrichment: {
        input: this.PROMPTS.enrichment + 50,
        output: 200, // Vendor enrichment data
      },
    };
  }
}

// ============================================================================
// COST CALCULATOR
// ============================================================================

export interface CostBreakdown {
  classification: number;
  ocr: number;
  extraction: number;
  matching: number;
  enrichment: number;
  storage: number;
  total: number;
}

export class CostCalculator {
  /**
   * Calculate cost for document classification
   */
  static classificationCost(useVision: boolean = true): number {
    if (useVision) {
      // Claude Haiku with vision
      const imageCost = PRICING.claude['claude-3-5-haiku-20241022'].imageInput;
      const tokens = TokenEstimator.PROMPTS.classification + 100;
      const textCost =
        tokens * PRICING.claude['claude-3-5-haiku-20241022'].input +
        100 * PRICING.claude['claude-3-5-haiku-20241022'].output;
      return imageCost + textCost;
    } else {
      // Text-only classification
      const tokens = TokenEstimator.PROMPTS.classification + 500;
      return (
        tokens * PRICING.claude['claude-3-5-haiku-20241022'].input +
        100 * PRICING.claude['claude-3-5-haiku-20241022'].output
      );
    }
  }

  /**
   * Calculate OCR cost based on strategy
   */
  static ocrCost(
    strategy: 'tesseract' | 'google_vision' | 'claude' = 'tesseract'
  ): number {
    switch (strategy) {
      case 'tesseract':
        return 0;
      case 'google_vision':
        return PRICING.ocr.googleVision;
      case 'claude':
        return PRICING.claude['claude-3-5-haiku-20241022'].imageInput;
      default:
        return 0;
    }
  }

  /**
   * Calculate extraction cost
   */
  static extractionCost(ocrTextLength: number): number {
    const tokens = TokenEstimator.estimateDocumentTokens(ocrTextLength);
    const inputCost =
      tokens.extraction.input *
      PRICING.claude['claude-3-5-haiku-20241022'].input;
    const outputCost =
      tokens.extraction.output *
      PRICING.claude['claude-3-5-haiku-20241022'].output;
    return inputCost + outputCost;
  }

  /**
   * Calculate vendor enrichment cost
   */
  static enrichmentCost(cached: boolean = false): number {
    if (cached) return 0;

    const tokens = TokenEstimator.estimateDocumentTokens(0);
    const inputCost =
      tokens.enrichment.input *
      PRICING.claude['claude-3-5-haiku-20241022'].input;
    const outputCost =
      tokens.enrichment.output *
      PRICING.claude['claude-3-5-haiku-20241022'].output;
    return inputCost + outputCost;
  }

  /**
   * Calculate embedding cost (for semantic matching)
   */
  static embeddingCost(textLength: number): number {
    const tokens = TokenEstimator.estimateTokens('x'.repeat(textLength));
    return tokens * PRICING.openai['text-embedding-3-small'].usage;
  }

  /**
   * Calculate total cost per document
   */
  static perDocumentCost(options: {
    ocrStrategy: 'tesseract' | 'google_vision' | 'claude';
    ocrTextLength: number;
    vendorCached: boolean;
    useEmbeddings: boolean;
  }): CostBreakdown {
    const costs: CostBreakdown = {
      classification: this.classificationCost(true),
      ocr: this.ocrCost(options.ocrStrategy),
      extraction: this.extractionCost(options.ocrTextLength),
      matching: 0, // Local, free
      enrichment: this.enrichmentCost(options.vendorCached),
      storage: 0.001, // ~1MB per document
      total: 0,
    };

    if (options.useEmbeddings) {
      costs.matching = this.embeddingCost(50); // ~50 chars merchant name
    }

    costs.total = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
    return costs;
  }

  /**
   * Project monthly costs
   */
  static monthlyCosts(params: {
    documentsPerMonth: number;
    tesseractSuccessRate: number; // 0-1
    vendorCacheHitRate: number; // 0-1
    useEmbeddings: boolean;
  }): {
    breakdown: CostBreakdown;
    totalMonthly: number;
    costPerDocument: number;
  } {
    const avgOCRTextLength = 2000; // Average receipt text length

    // Calculate weighted OCR cost
    const tesseractCost = this.ocrCost('tesseract');
    const cloudCost = this.ocrCost('google_vision');
    const avgOCRCost =
      tesseractCost * params.tesseractSuccessRate +
      cloudCost * (1 - params.tesseractSuccessRate);

    // Calculate per-document cost
    const costs = this.perDocumentCost({
      ocrStrategy: 'tesseract', // Will be weighted below
      ocrTextLength: avgOCRTextLength,
      vendorCached: false, // Will be weighted below
      useEmbeddings: params.useEmbeddings,
    });

    // Adjust for cache hit rates
    costs.ocr = avgOCRCost;
    costs.enrichment =
      this.enrichmentCost(false) * (1 - params.vendorCacheHitRate);

    // Recalculate total
    costs.total = Object.values(costs).reduce((sum, cost) => sum + cost, 0);

    return {
      breakdown: costs,
      totalMonthly: costs.total * params.documentsPerMonth,
      costPerDocument: costs.total,
    };
  }
}

// ============================================================================
// COST OPTIMIZATION STRATEGIES
// ============================================================================

export class CostOptimizer {
  /**
   * Recommend OCR strategy based on document characteristics
   */
  static recommendOCRStrategy(document: {
    quality: 'high' | 'medium' | 'low';
    hasTable: boolean;
    hasHandwriting: boolean;
  }): 'tesseract' | 'google_vision' | 'claude' {
    // Always try Tesseract first for high quality
    if (document.quality === 'high' && !document.hasHandwriting) {
      return 'tesseract';
    }

    // Use Google Vision for tables
    if (document.hasTable) {
      return 'google_vision';
    }

    // Use Claude for complex cases
    if (document.hasHandwriting || document.quality === 'low') {
      return 'claude';
    }

    return 'tesseract';
  }

  /**
   * Calculate savings from caching
   */
  static cachingSavings(params: {
    documentsPerMonth: number;
    currentCacheHitRate: number;
    targetCacheHitRate: number;
  }): {
    currentCost: number;
    optimizedCost: number;
    savings: number;
    savingsPercent: number;
  } {
    const enrichmentCost = CostCalculator.enrichmentCost(false);

    const currentCost =
      params.documentsPerMonth *
      enrichmentCost *
      (1 - params.currentCacheHitRate);

    const optimizedCost =
      params.documentsPerMonth *
      enrichmentCost *
      (1 - params.targetCacheHitRate);

    const savings = currentCost - optimizedCost;

    return {
      currentCost,
      optimizedCost,
      savings,
      savingsPercent: (savings / currentCost) * 100,
    };
  }

  /**
   * Recommend batch processing vs real-time
   */
  static recommendProcessingMode(params: {
    documentsCount: number;
    userWaiting: boolean;
    urgency: 'immediate' | 'normal' | 'low';
  }): 'real-time' | 'batch' {
    if (params.userWaiting || params.urgency === 'immediate') {
      return 'real-time';
    }

    if (params.documentsCount > 10 || params.urgency === 'low') {
      return 'batch';
    }

    return 'real-time';
  }

  /**
   * Calculate ROI for fine-tuning
   */
  static fineTuningROI(params: {
    trainingExamples: number;
    currentCostPerDocument: number;
    expectedCostReduction: number; // 0-1 (e.g., 0.3 = 30% reduction)
    documentsPerMonth: number;
    months: number;
  }): {
    trainingCost: number;
    currentTotalCost: number;
    optimizedTotalCost: number;
    savings: number;
    breakEvenMonths: number;
    worthIt: boolean;
  } {
    // Rough estimate: $10-50 per 1000 training examples
    const trainingCost = (params.trainingExamples / 1000) * 30;

    const monthlyCurrentCost =
      params.documentsPerMonth * params.currentCostPerDocument;
    const monthlyOptimizedCost =
      monthlyCurrentCost * (1 - params.expectedCostReduction);

    const monthlySavings = monthlyCurrentCost - monthlyOptimizedCost;

    const currentTotalCost = monthlyCurrentCost * params.months;
    const optimizedTotalCost =
      trainingCost + monthlyOptimizedCost * params.months;

    const savings = currentTotalCost - optimizedTotalCost;
    const breakEvenMonths = trainingCost / monthlySavings;

    return {
      trainingCost,
      currentTotalCost,
      optimizedTotalCost,
      savings,
      breakEvenMonths,
      worthIt: breakEvenMonths < params.months && savings > 0,
    };
  }
}

// ============================================================================
// BUDGET MANAGEMENT
// ============================================================================

export interface BudgetLimits {
  maxCostPerDocument: number;
  maxDailyCost: number;
  maxMonthlyCost: number;
  alertThreshold: number; // 0-1 (e.g., 0.8 = 80%)
}

export class BudgetManager {
  private currentSpend: {
    daily: number;
    monthly: number;
  };

  constructor(private limits: BudgetLimits) {
    this.currentSpend = {
      daily: 0,
      monthly: 0,
    };
  }

  /**
   * Check if processing is allowed within budget
   */
  canProcess(estimatedCost: number): {
    allowed: boolean;
    reason?: string;
  } {
    // Check per-document limit
    if (estimatedCost > this.limits.maxCostPerDocument) {
      return {
        allowed: false,
        reason: `Cost $${estimatedCost.toFixed(4)} exceeds per-document limit of $${this.limits.maxCostPerDocument}`,
      };
    }

    // Check daily limit
    if (this.currentSpend.daily + estimatedCost > this.limits.maxDailyCost) {
      return {
        allowed: false,
        reason: `Daily budget exhausted ($${this.currentSpend.daily.toFixed(2)}/$${this.limits.maxDailyCost})`,
      };
    }

    // Check monthly limit
    if (
      this.currentSpend.monthly + estimatedCost >
      this.limits.maxMonthlyCost
    ) {
      return {
        allowed: false,
        reason: `Monthly budget exhausted ($${this.currentSpend.monthly.toFixed(2)}/$${this.limits.maxMonthlyCost})`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record spend
   */
  recordSpend(cost: number) {
    this.currentSpend.daily += cost;
    this.currentSpend.monthly += cost;
  }

  /**
   * Check if approaching limits (for alerts)
   */
  shouldAlert(): {
    alert: boolean;
    message?: string;
  } {
    const dailyPercent =
      this.currentSpend.daily / this.limits.maxDailyCost;
    const monthlyPercent =
      this.currentSpend.monthly / this.limits.maxMonthlyCost;

    if (dailyPercent > this.limits.alertThreshold) {
      return {
        alert: true,
        message: `Daily budget at ${(dailyPercent * 100).toFixed(0)}%`,
      };
    }

    if (monthlyPercent > this.limits.alertThreshold) {
      return {
        alert: true,
        message: `Monthly budget at ${(monthlyPercent * 100).toFixed(0)}%`,
      };
    }

    return { alert: false };
  }

  /**
   * Reset daily counter (call at midnight)
   */
  resetDaily() {
    this.currentSpend.daily = 0;
  }

  /**
   * Reset monthly counter (call at month start)
   */
  resetMonthly() {
    this.currentSpend.monthly = 0;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      daily: {
        spent: this.currentSpend.daily,
        limit: this.limits.maxDailyCost,
        remaining: this.limits.maxDailyCost - this.currentSpend.daily,
        percentUsed: (this.currentSpend.daily / this.limits.maxDailyCost) * 100,
      },
      monthly: {
        spent: this.currentSpend.monthly,
        limit: this.limits.maxMonthlyCost,
        remaining: this.limits.maxMonthlyCost - this.currentSpend.monthly,
        percentUsed:
          (this.currentSpend.monthly / this.limits.maxMonthlyCost) * 100,
      },
    };
  }
}

// ============================================================================
// USAGE EXAMPLES & SCENARIOS
// ============================================================================

export function demonstrateCostCalculations() {
  console.log('=== AI/ML Cost Calculator Demonstration ===\n');

  // Scenario 1: Single document processing
  console.log('📄 Scenario 1: Process a single receipt');
  const singleDocCost = CostCalculator.perDocumentCost({
    ocrStrategy: 'tesseract',
    ocrTextLength: 2000,
    vendorCached: false,
    useEmbeddings: false,
  });
  console.log('Breakdown:', singleDocCost);
  console.log(`Total: $${singleDocCost.total.toFixed(4)}\n`);

  // Scenario 2: Monthly costs for typical user
  console.log('📊 Scenario 2: Monthly costs for typical user (20 docs/month)');
  const monthlyCosts = CostCalculator.monthlyCosts({
    documentsPerMonth: 20,
    tesseractSuccessRate: 0.7, // 70% success with free Tesseract
    vendorCacheHitRate: 0.85, // 85% vendors already cached
    useEmbeddings: false,
  });
  console.log('Per document:', `$${monthlyCosts.costPerDocument.toFixed(4)}`);
  console.log('Monthly total:', `$${monthlyCosts.totalMonthly.toFixed(2)}`);
  console.log('Breakdown:', monthlyCosts.breakdown);
  console.log('');

  // Scenario 3: Scaling to 10,000 users
  console.log('🚀 Scenario 3: Scale to 10,000 users (200k docs/month)');
  const scaleCosts = CostCalculator.monthlyCosts({
    documentsPerMonth: 200_000,
    tesseractSuccessRate: 0.75,
    vendorCacheHitRate: 0.92, // Better cache hit rate at scale
    useEmbeddings: true, // Enable semantic matching
  });
  console.log('Total monthly cost:', `$${scaleCosts.totalMonthly.toFixed(2)}`);
  console.log('Cost per document:', `$${scaleCosts.costPerDocument.toFixed(4)}`);
  console.log('');

  // Scenario 4: Caching savings
  console.log('💰 Scenario 4: Savings from improved caching');
  const cachingSavings = CostOptimizer.cachingSavings({
    documentsPerMonth: 10_000,
    currentCacheHitRate: 0.7,
    targetCacheHitRate: 0.9,
  });
  console.log(`Current cost: $${cachingSavings.currentCost.toFixed(2)}`);
  console.log(`Optimized cost: $${cachingSavings.optimizedCost.toFixed(2)}`);
  console.log(`Savings: $${cachingSavings.savings.toFixed(2)} (${cachingSavings.savingsPercent.toFixed(1)}%)`);
  console.log('');

  // Scenario 5: Fine-tuning ROI
  console.log('🎯 Scenario 5: Fine-tuning ROI analysis');
  const finetuningROI = CostOptimizer.fineTuningROI({
    trainingExamples: 2000,
    currentCostPerDocument: 0.032,
    expectedCostReduction: 0.3, // 30% cost reduction
    documentsPerMonth: 50_000,
    months: 12,
  });
  console.log(`Training cost: $${finetuningROI.trainingCost.toFixed(2)}`);
  console.log(`12-month savings: $${finetuningROI.savings.toFixed(2)}`);
  console.log(`Break-even: ${finetuningROI.breakEvenMonths.toFixed(1)} months`);
  console.log(`Worth it: ${finetuningROI.worthIt ? 'YES ✅' : 'NO ❌'}`);
  console.log('');

  // Scenario 6: Budget management
  console.log('💸 Scenario 6: Budget management');
  const budgetManager = new BudgetManager({
    maxCostPerDocument: 0.10,
    maxDailyCost: 50,
    maxMonthlyCost: 1000,
    alertThreshold: 0.8,
  });

  // Simulate processing
  for (let i = 0; i < 100; i++) {
    const estimatedCost = 0.032;
    const canProcess = budgetManager.canProcess(estimatedCost);

    if (canProcess.allowed) {
      budgetManager.recordSpend(estimatedCost);
    } else {
      console.log(`Processing blocked: ${canProcess.reason}`);
      break;
    }
  }

  const status = budgetManager.getStatus();
  console.log('Daily budget:', `$${status.daily.spent.toFixed(2)}/$${status.daily.limit} (${status.daily.percentUsed.toFixed(1)}%)`);
  console.log('Monthly budget:', `$${status.monthly.spent.toFixed(2)}/$${status.monthly.limit} (${status.monthly.percentUsed.toFixed(1)}%)`);
}

// ============================================================================
// PRICING CALCULATOR HELPERS
// ============================================================================

export class PricingTierCalculator {
  /**
   * Calculate profitable pricing tiers
   */
  static calculateTiers(params: {
    averageCostPerDocument: number;
    targetGrossMargin: number; // 0-1 (e.g., 0.7 = 70%)
    documentsPerTier: number[];
  }) {
    return params.documentsPerTier.map((docs) => {
      const monthlyCost = docs * params.averageCostPerDocument;
      const targetRevenue = monthlyCost / (1 - params.targetGrossMargin);
      const suggestedPrice = Math.ceil(targetRevenue);

      return {
        documents: docs,
        monthlyCost: monthlyCost.toFixed(2),
        suggestedPrice: suggestedPrice,
        grossMargin: (
          ((suggestedPrice - monthlyCost) / suggestedPrice) *
          100
        ).toFixed(1),
        profit: (suggestedPrice - monthlyCost).toFixed(2),
      };
    });
  }

  /**
   * Example tier recommendations
   */
  static recommendedTiers() {
    return this.calculateTiers({
      averageCostPerDocument: 0.032,
      targetGrossMargin: 0.7,
      documentsPerTier: [5, 20, 50, 100, 200],
    });
  }
}

// Run demonstration if executed directly
if (require.main === module) {
  demonstrateCostCalculations();

  console.log('\n=== Recommended Pricing Tiers ===\n');
  const tiers = PricingTierCalculator.recommendedTiers();
  console.table(tiers);
}

// ============================================================================
// EXPORTS
// ============================================================================

// Note: All classes are already exported inline above
// TokenEstimator (line 69)
// CostCalculator (line 137)
// CostOptimizer (line 293)
// BudgetManager (line 430)
// PricingTierCalculator (line 654)
