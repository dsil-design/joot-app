# AI/ML Architecture for Joot Document Processing

## Executive Summary

This document outlines the AI/ML architecture for Joot's document processing and transaction matching system. The design balances accuracy, cost, privacy, and user experience while leveraging modern LLM capabilities.

## System Architecture Overview

```
┌─────────────────┐
│ Document Upload │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Document Classification        │
│  (Claude 3.5 Haiku - Fast/Cheap)│
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  OCR & Text Extraction          │
│  (Hybrid: Tesseract + Claude)   │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Structured Data Extraction     │
│  (Claude with Function Calling) │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Fuzzy Matching Engine          │
│  (Local: Fuse.js + ML scoring)  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Vendor Enrichment              │
│  (Cached + On-demand)           │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  User Review & Feedback Loop    │
└─────────────────────────────────┘
```

## Core Components

### 1. Document Classification

**Approach**: Vision-enabled LLM for classification
**Primary Tool**: Claude 3.5 Haiku (cost-effective, fast)
**Fallback**: GPT-4o Mini

#### Implementation Strategy

```typescript
// Classification categories
enum DocumentType {
  EMAIL_RECEIPT = 'email_receipt',
  BANK_STATEMENT = 'bank_statement',
  CREDIT_CARD_STATEMENT = 'credit_card_statement',
  INVOICE = 'invoice',
  PAPER_RECEIPT = 'paper_receipt',
  UNKNOWN = 'unknown'
}

// Classification confidence threshold
const MIN_CONFIDENCE = 0.75;
```

**Why Claude over specialized models?**
- No training required
- Handles multi-format documents (PDF, images, email forwards)
- Can explain reasoning for low-confidence cases
- Better at handling edge cases
- Cost: ~$0.01 per classification (acceptable for MVP)

### 2. OCR & Text Extraction Pipeline

**Hybrid Approach**: Local first, cloud fallback

#### Tier 1: Local OCR (Free, Private)
- **Tesseract.js** for web/mobile
- Best for: High-quality scans, digital PDFs
- Languages: English, Thai
- Processing: Client-side (privacy-first)

#### Tier 2: Cloud OCR (High Quality)
- **Google Cloud Vision API** (best price/performance)
- **AWS Textract** for table extraction
- Triggered when:
  - Tesseract confidence < 80%
  - Bank statement with tables detected
  - Handwritten text detected

#### Tier 3: LLM-Enhanced (Complex Documents)
- **Claude 3.5 Sonnet** with vision
- For: Complex layouts, mixed languages, context-dependent extraction
- Most expensive but highest accuracy

#### Cost Optimization
```typescript
interface OCRStrategy {
  // Try local first
  async extractText(image: Buffer): Promise<OCRResult> {
    const localResult = await tesseract.recognize(image);

    if (localResult.confidence > 0.8) {
      return localResult; // Free, fast
    }

    // Fallback to cloud
    const cloudResult = await googleVision.detectText(image);
    return cloudResult;
  }
}
```

**Monthly Cost Estimate (1000 documents)**:
- 70% handled by Tesseract: $0
- 20% Google Vision: $1.50/1000 = $0.30
- 10% Claude Vision: $3/1000 images = $0.30
- **Total: ~$0.60/month for 1000 documents**

### 3. Structured Data Extraction (NER)

**Approach**: LLM with structured outputs (function calling)

**Primary Tool**: Claude 3.5 Haiku with structured prompts
**Alternative**: GPT-4o Mini with JSON mode

#### Extraction Schema

```typescript
interface ExtractedTransaction {
  merchant: {
    name: string;
    confidence: number;
    aliases?: string[]; // e.g., ["AMZN", "Amazon.com", "Amazon"]
  };
  amount: {
    value: number;
    currency: string;
    confidence: number;
    originalText?: string; // For debugging
  };
  date: {
    value: Date;
    confidence: number;
    timezone?: string;
  };
  description?: string;
  paymentMethod?: {
    type: 'credit_card' | 'debit_card' | 'bank_transfer' | 'cash' | 'other';
    lastFour?: string;
  };
  category?: string; // Suggested category
  metadata: {
    documentType: DocumentType;
    extractionMethod: 'ocr' | 'pdf_text' | 'email_parse';
    processingTime: number;
  };
}
```

#### Prompt Engineering Strategy

```typescript
const EXTRACTION_PROMPT = `
You are a financial data extraction specialist. Extract transaction details from this document.

Rules:
1. Merchant name: Use the most recognizable form (e.g., "Amazon" not "AMZN MKT")
2. Amount: Include currency symbol/code. If multiple amounts, identify the final charged amount
3. Date: Parse to ISO 8601 format. If ambiguous, prefer the transaction date over statement date
4. Confidence: Rate 0-1 based on clarity in the document

For Bangkok Bank statements in Thai:
- "฿" or "THB" indicates Thai Baht
- Date format: DD/MM/YYYY
- Look for "ยอดเงิน" (amount) and "วันที่" (date)

Return JSON with the structure: [provide schema]
If you cannot find a field, set confidence to 0.
`;
```

**Why LLM over traditional NER?**
- Traditional NER (spaCy, Stanford NER) requires training data
- Financial documents vary too much in format
- LLMs understand context (e.g., "Total" vs "Subtotal" vs "Balance")
- Multi-language support out of the box
- Can explain low-confidence extractions

**Cost**: ~$0.02 per extraction (Haiku: $0.25/1M input tokens, ~80k tokens per document)

### 4. Fuzzy Matching Algorithm

**Approach**: Hybrid local + ML scoring

#### Components

1. **Fast Local Matching** (Fuse.js)
   - String similarity for merchant names
   - Handles typos, abbreviations
   - 0ms latency, no API costs

2. **Semantic Matching** (Embeddings)
   - OpenAI text-embedding-3-small
   - Pre-compute embeddings for all vendors
   - Cosine similarity for context matching

3. **Rule-Based Filters**
   - Amount threshold (±5% or ±$1)
   - Date window (±3 days default)
   - Currency matching

#### Implementation

```typescript
interface MatchingConfig {
  // String similarity thresholds
  merchantNameThreshold: 0.7; // Fuse.js score

  // Amount matching
  amountVariancePercent: 5; // ±5%
  amountVarianceFixed: 1.00; // or ±$1, whichever is larger

  // Date matching
  dateWindowDays: 3; // ±3 days

  // Overall confidence
  minMatchConfidence: 0.6; // 60% to suggest
  autoMatchThreshold: 0.9; // 90% to auto-match
}

interface MatchResult {
  transactionId: string;
  confidence: number;
  signals: {
    merchantSimilarity: number; // 0-1
    amountMatch: number; // 0-1 (1 = exact, 0.5 = within threshold)
    dateMatch: number; // 0-1 (1 = exact, decreases with days apart)
    semanticSimilarity?: number; // 0-1 from embeddings
  };
  explanation: string; // For user transparency
}
```

#### Matching Pipeline

```typescript
class TransactionMatcher {
  async findMatches(
    extracted: ExtractedTransaction,
    existingTransactions: Transaction[]
  ): Promise<MatchResult[]> {

    // Step 1: Fast filter by date window
    const dateFiltered = this.filterByDate(
      existingTransactions,
      extracted.date.value,
      3 // days
    );

    // Step 2: Filter by amount range
    const amountFiltered = this.filterByAmount(
      dateFiltered,
      extracted.amount.value,
      extracted.amount.currency
    );

    // Step 3: Fuzzy match merchant names
    const fuzzyMatches = this.fuzzyMatchMerchant(
      amountFiltered,
      extracted.merchant.name
    );

    // Step 4: Semantic matching for low-confidence fuzzy matches
    const needsSemanticMatch = fuzzyMatches.filter(m => m.confidence < 0.8);
    if (needsSemanticMatch.length > 0) {
      await this.enrichWithSemanticScores(needsSemanticMatch, extracted);
    }

    // Step 5: Calculate composite confidence scores
    const scored = this.calculateConfidenceScores(fuzzyMatches);

    // Step 6: Sort by confidence, return top matches
    return scored
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 matches
  }

  private calculateConfidenceScores(matches: MatchResult[]): MatchResult[] {
    return matches.map(match => {
      // Weighted scoring
      const confidence =
        match.signals.merchantSimilarity * 0.4 +
        match.signals.amountMatch * 0.35 +
        match.signals.dateMatch * 0.15 +
        (match.signals.semanticSimilarity || 0) * 0.1;

      return { ...match, confidence };
    });
  }
}
```

**Cost Analysis**:
- Fuse.js: Free (local)
- Embeddings: $0.00002/1000 tokens × 20 tokens = $0.0000004 per merchant
- Pre-compute all vendor embeddings: One-time cost
- **Ongoing cost: Near zero**

### 5. Vendor Enrichment

**Strategy**: Multi-source with aggressive caching

#### Data Sources (Priority Order)

1. **User's Historical Data** (Free, personalized)
   - Learn from user's past categorizations
   - Build vendor profile from transaction history
   - 95% hit rate for recurring vendors

2. **Local Vendor Database** (Free, fast)
   - Pre-seeded common merchants (top 10k)
   - Includes: name variants, categories, logos
   - Update quarterly

3. **OpenAI Function Calling** (On-demand)
   - For unknown vendors
   - Prompt: "What type of business is [merchant]? Return category, description, typical products/services"
   - Cost: ~$0.01 per enrichment
   - Cache result permanently

4. **Web Scraping** (Rare, manual review)
   - Only for high-value unknown vendors
   - Google Places API for business info
   - Requires user consent (privacy)

#### Enrichment Schema

```typescript
interface VendorEnrichment {
  merchantName: string;
  canonicalName: string; // "Amazon" vs "AMZN MKT"
  category: string; // Joot category
  subcategory?: string;
  knownAliases: string[]; // All variations seen
  logo?: {
    url: string;
    cachedAt: Date;
  };
  businessInfo?: {
    type: string; // "Restaurant", "Online Retailer"
    description: string;
    website?: string;
  };
  source: 'user_history' | 'local_db' | 'llm' | 'manual';
  confidence: number;
  lastUpdated: Date;
}
```

#### Implementation

```typescript
class VendorEnrichmentService {
  async enrichVendor(merchantName: string): Promise<VendorEnrichment> {
    // 1. Check user's history
    const userVendor = await this.findInUserHistory(merchantName);
    if (userVendor) return userVendor;

    // 2. Check local database
    const localVendor = await this.findInLocalDB(merchantName);
    if (localVendor) return localVendor;

    // 3. Use LLM for unknown vendor
    const enriched = await this.enrichWithLLM(merchantName);

    // 4. Cache result
    await this.cacheEnrichment(enriched);

    return enriched;
  }

  private async enrichWithLLM(merchantName: string): Promise<VendorEnrichment> {
    const prompt = `
      Analyze this merchant name: "${merchantName}"

      Provide:
      1. Canonical business name (clean, recognizable form)
      2. Business category (restaurant, grocery, transportation, etc.)
      3. Common name variations/aliases
      4. Brief description

      Return structured JSON.
    `;

    const result = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    // Parse and structure result
    return this.parseEnrichmentResult(result);
  }
}
```

**Cost Optimization**:
- Cache enrichments permanently
- 90% hit rate from user history + local DB = $0
- 10% requiring LLM = $0.01 each
- **Average cost: $0.001 per lookup**

### 6. Learning from User Corrections

**Approach**: Supervised learning pipeline

#### Feedback Loop

```typescript
interface UserFeedback {
  documentId: string;
  originalExtraction: ExtractedTransaction;
  userCorrection: {
    field: 'merchant' | 'amount' | 'date' | 'category';
    originalValue: any;
    correctedValue: any;
    timestamp: Date;
  };
  context: {
    matchConfidence: number;
    extractionMethod: string;
  };
}
```

#### Learning Strategies

1. **Merchant Name Mapping** (Immediate)
   ```typescript
   // User corrects "AMZN MKT" -> "Amazon"
   // System learns: Add "AMZN MKT" to Amazon's aliases
   await vendorDB.addAlias('Amazon', 'AMZN MKT');
   ```

2. **Category Preferences** (Pattern-based)
   ```typescript
   // User always categorizes "Starbucks" as "Coffee" not "Restaurant"
   // After 3 consistent corrections, update default
   const corrections = await getUserCorrections(userId, 'Starbucks');
   if (corrections.category.Coffee >= 3) {
     await userPreferences.setDefaultCategory('Starbucks', 'Coffee');
   }
   ```

3. **Confidence Calibration** (Statistical)
   ```typescript
   // Track extraction accuracy vs confidence scores
   // Adjust thresholds based on actual performance
   interface CalibrationData {
     confidenceRange: [number, number]; // e.g., [0.7, 0.8]
     actualAccuracy: number; // e.g., 0.65 (lower than confidence)
     adjustmentFactor: number; // Multiply confidence by 0.9
   }
   ```

4. **Model Fine-tuning** (Long-term)
   - Collect user corrections into training dataset
   - Monthly review for patterns
   - Fine-tune smaller models (e.g., BERT for NER) if cost-effective
   - Currently: Not needed, focus on prompt optimization

#### Metrics to Track

```typescript
interface ExtractionMetrics {
  totalExtractions: number;
  correctionRate: number; // % requiring user correction
  fieldAccuracy: {
    merchant: number;
    amount: number;
    date: number;
    category: number;
  };
  confidenceCalibration: {
    // Is high confidence (0.9) actually 90% accurate?
    predicted: number[];
    actual: number[];
  };
  processingTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  costPerDocument: number;
}
```

## Recommended Technology Stack

### Core AI Services

| Component | Primary | Alternative | Cost | Notes |
|-----------|---------|-------------|------|-------|
| Classification | Claude 3.5 Haiku | GPT-4o Mini | $0.01/doc | Vision + text |
| OCR (Local) | Tesseract.js | - | Free | 70% of cases |
| OCR (Cloud) | Google Vision | AWS Textract | $1.50/1000 | Tables, handwriting |
| Data Extraction | Claude 3.5 Haiku | GPT-4o | $0.02/doc | Structured output |
| Embeddings | text-embedding-3-small | - | $0.00002/1k tokens | Semantic matching |
| Vendor Enrichment | Claude 3.5 Haiku | GPT-4o Mini | $0.01/lookup | Cached |

### Supporting Libraries

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "openai": "^4.20.0",
    "tesseract.js": "^5.0.0",
    "@google-cloud/vision": "^4.0.0",
    "fuse.js": "^7.0.0",
    "date-fns": "^3.0.0",
    "currency.js": "^2.0.4",
    "zod": "^3.22.0"
  }
}
```

### Infrastructure

- **Storage**: Supabase (existing)
  - Document images: Supabase Storage
  - Extracted data: PostgreSQL
  - Embeddings: pgvector extension

- **Processing**: Serverless functions
  - Vercel Edge Functions (client-facing)
  - Cloudflare Workers (batch processing)

- **Caching**: Redis/Upstash
  - OCR results (temporary)
  - Vendor enrichments (permanent)
  - Embeddings (permanent)

## Complete Processing Pipeline

### Step-by-Step Flow

```typescript
async function processDocument(
  file: File,
  userId: string
): Promise<ProcessingResult> {

  // 1. CLASSIFY (Claude Haiku + Vision)
  const classification = await classifyDocument(file);
  // Cost: $0.01
  // Time: 2s

  if (classification.confidence < 0.75) {
    return { status: 'manual_review', reason: 'Unclear document type' };
  }

  // 2. EXTRACT TEXT (Tesseract -> Cloud fallback)
  const ocrResult = await extractText(file);
  // Cost: $0 (Tesseract) or $0.0015 (Cloud)
  // Time: 5s (local) or 3s (cloud)

  if (ocrResult.confidence < 0.6) {
    // Escalate to Claude Vision
    ocrResult = await extractTextWithClaude(file);
    // Cost: +$0.003
  }

  // 3. EXTRACT STRUCTURED DATA (Claude Haiku)
  const extracted = await extractTransactionData(
    ocrResult.text,
    classification.type
  );
  // Cost: $0.02
  // Time: 3s

  // 4. ENRICH VENDOR (Cached or LLM)
  const vendor = await enrichVendor(extracted.merchant.name);
  // Cost: $0.001 (avg)
  // Time: 0.1s (cached) or 2s (LLM)

  // 5. MATCH EXISTING TRANSACTIONS (Local)
  const matches = await findMatches(extracted, userId);
  // Cost: $0
  // Time: 0.1s

  // 6. PREPARE RESULT
  const result: ProcessingResult = {
    status: 'success',
    extracted,
    vendor,
    matches: matches.slice(0, 5), // Top 5
    suggestedAction: determineSuggestedAction(matches),
    totalCost: 0.032, // Average
    processingTime: 10.2, // seconds
  };

  // 7. STORE FOR LEARNING
  await storeProcessingResult(result);

  return result;
}

function determineSuggestedAction(matches: MatchResult[]): Action {
  if (matches.length === 0) {
    return { type: 'create_new', confidence: 1.0 };
  }

  const best = matches[0];

  if (best.confidence > 0.9) {
    return {
      type: 'auto_match',
      transactionId: best.transactionId,
      confidence: best.confidence
    };
  }

  if (best.confidence > 0.6) {
    return {
      type: 'suggest_match',
      options: matches.slice(0, 3),
      confidence: best.confidence
    };
  }

  return { type: 'manual_review', confidence: 0 };
}
```

## Cost Analysis

### Per-Document Costs (Average)

| Stage | Cost | Notes |
|-------|------|-------|
| Classification | $0.010 | Claude Haiku w/ vision |
| OCR | $0.001 | 70% free (Tesseract), 30% paid |
| Data Extraction | $0.020 | Claude Haiku |
| Embeddings | $0.000 | Pre-computed, cached |
| Vendor Enrichment | $0.001 | 90% cached |
| Matching | $0.000 | Local computation |
| **Total** | **$0.032** | ~3 cents per document |

### Monthly Projections

| Users | Docs/Month | Total Cost | Cost/User |
|-------|------------|------------|-----------|
| 100 | 500 | $16 | $0.16 |
| 1,000 | 5,000 | $160 | $0.16 |
| 10,000 | 50,000 | $1,600 | $0.16 |

### Cost Optimization Strategies

1. **Aggressive Caching** (50% cost reduction)
   - Cache vendor enrichments permanently
   - Cache embeddings for common merchants
   - Cache OCR results for 24 hours (re-uploads)

2. **Tiered Processing** (30% cost reduction)
   - Free local OCR first
   - Only use cloud APIs when confidence < threshold
   - Batch process non-urgent documents

3. **User Tiers** (Revenue optimization)
   - Free: 5 documents/month
   - Pro ($5/month): 50 documents/month
   - Business ($20/month): Unlimited
   - Cost per user is ~$0.16-$0.32, profitable at all tiers

4. **Model Selection** (Ongoing optimization)
   - Monitor Claude vs GPT pricing
   - Test new models (Gemini Flash, etc.)
   - Evaluate open-source alternatives (Llama 3.1)

## Accuracy Improvement Strategies

### Phase 1: Launch (Target: 75% accuracy)

1. **Robust Prompts**
   - Clear extraction instructions
   - Examples for edge cases
   - Multi-language support

2. **Confidence Thresholds**
   - Only auto-process high-confidence (>0.9)
   - Human review for 0.6-0.9 range
   - Reject < 0.6

3. **Validation Rules**
   - Amount must be positive
   - Date must be recent (< 1 year)
   - Merchant name not empty

### Phase 2: Optimize (Target: 85% accuracy)

1. **Feedback Loop**
   - Track user corrections
   - Update merchant aliases daily
   - Calibrate confidence scores weekly

2. **Domain-Specific Prompts**
   - Separate prompts for each document type
   - Bank-specific rules (Bangkok Bank, Chase, etc.)
   - Receipt vs statement vs invoice logic

3. **Ensemble Validation**
   - Extract with 2 models, compare results
   - Use agreement as confidence signal
   - Manual review on disagreement

### Phase 3: Advanced (Target: 90%+ accuracy)

1. **Fine-tuned Models**
   - Collect 1000+ labeled examples
   - Fine-tune smaller models (GPT-3.5, Claude Haiku)
   - Faster, cheaper, more accurate for domain

2. **Active Learning**
   - Prioritize user review of uncertain cases
   - Learn from corrections in real-time
   - A/B test prompt variations

3. **Context Awareness**
   - Use user's transaction history
   - Time-based patterns (commute, lunch)
   - Location data (if permitted)

## Privacy and Security

### Data Handling Principles

1. **Minimize Cloud Processing**
   - OCR locally when possible (Tesseract)
   - Only send text to LLMs, not raw images (when possible)
   - Never store documents longer than necessary

2. **Data Retention**
   - Original documents: 30 days (user can delete anytime)
   - Extracted text: 90 days (for dispute resolution)
   - Processed data: Permanent (no PII in structured form)

3. **API Provider Security**
   - Anthropic: No training on API data
   - OpenAI: Opt-out of training (set in API key settings)
   - Google Vision: Process only, no retention

4. **User Controls**
   ```typescript
   interface PrivacySettings {
     allowCloudOCR: boolean; // Default: true
     allowVendorEnrichment: boolean; // Default: true
     retainDocuments: boolean; // Default: true, 30 days
     shareAnonymizedData: boolean; // Default: false, for improving models
   }
   ```

5. **Encryption**
   - Documents at rest: AES-256 (Supabase Storage)
   - In transit: TLS 1.3
   - API keys: Environment variables, not committed

6. **Compliance**
   - GDPR: Right to deletion, data export
   - CCPA: Opt-out of data sharing
   - SOC 2: If needed for enterprise

### Security Best Practices

```typescript
// Never log sensitive data
logger.info('Processing document', {
  documentId: doc.id,
  userId: userId, // OK
  // merchantName: extracted.merchant.name, // NO
  // amount: extracted.amount.value, // NO
});

// Sanitize before sending to LLMs
function sanitize(text: string): string {
  // Remove credit card numbers
  text = text.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]');

  // Remove SSNs
  text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');

  return text;
}

// Rate limiting
const rateLimiter = {
  maxDocumentsPerHour: 20,
  maxDocumentsPerDay: 100,
  maxAPICallsPerMinute: 60,
};
```

## Implementation Roadmap

### Phase 1: MVP (4 weeks)

**Week 1-2: Core Infrastructure**
- [ ] Set up Anthropic SDK
- [ ] Implement document classification
- [ ] Basic OCR with Tesseract.js
- [ ] Simple data extraction prompt

**Week 3: Matching Engine**
- [ ] Implement Fuse.js fuzzy matching
- [ ] Build confidence scoring
- [ ] Create matching UI component

**Week 4: Integration**
- [ ] Connect to existing transaction flow
- [ ] User review interface
- [ ] Basic error handling

**MVP Metrics**: 70% accuracy, $0.05/doc, 15s processing

### Phase 2: Optimization (4 weeks)

**Week 5-6: Advanced OCR**
- [ ] Integrate Google Cloud Vision
- [ ] Implement tiered OCR strategy
- [ ] Add table extraction for bank statements

**Week 7: Vendor Enrichment**
- [ ] Build vendor database
- [ ] Implement LLM enrichment
- [ ] Add caching layer

**Week 8: Feedback Loop**
- [ ] Track user corrections
- [ ] Build merchant alias learning
- [ ] Implement confidence calibration

**Phase 2 Metrics**: 80% accuracy, $0.03/doc, 10s processing

### Phase 3: Scale (4 weeks)

**Week 9-10: Performance**
- [ ] Batch processing for bulk uploads
- [ ] Optimize API calls
- [ ] Implement Redis caching

**Week 11: Advanced Matching**
- [ ] Add embeddings for semantic matching
- [ ] Implement category-aware matching
- [ ] Multi-currency support

**Week 12: Polish**
- [ ] A/B test prompt variations
- [ ] Build admin dashboard for monitoring
- [ ] Documentation and user guides

**Phase 3 Metrics**: 85% accuracy, $0.02/doc, 5s processing

## Monitoring and Observability

### Key Metrics Dashboard

```typescript
interface SystemMetrics {
  // Accuracy
  extractionAccuracy: number; // % correct without user correction
  autoMatchRate: number; // % confidently matched automatically
  manualReviewRate: number; // % requiring user review

  // Performance
  avgProcessingTime: number; // seconds
  p95ProcessingTime: number;
  apiErrorRate: number;

  // Cost
  costPerDocument: number;
  costPerUser: number;
  monthlyBurn: number;

  // Usage
  documentsProcessed: number;
  documentsPerUser: number;
  peakHourlyRate: number;
}
```

### Alerting Rules

```typescript
const alerts = {
  // Accuracy degradation
  extractionAccuracy: { threshold: 0.7, severity: 'high' },

  // Performance issues
  avgProcessingTime: { threshold: 30, severity: 'medium' }, // seconds
  apiErrorRate: { threshold: 0.05, severity: 'high' },

  // Cost overrun
  dailyCost: { threshold: 100, severity: 'high' },
  costPerDocument: { threshold: 0.10, severity: 'medium' },

  // Rate limiting
  apiCallsPerMinute: { threshold: 50, severity: 'low' },
};
```

### Logging Strategy

```typescript
// Use structured logging
import { logger } from './logger';

logger.info('document_processed', {
  documentId: doc.id,
  userId: userId,
  processingTime: elapsed,
  cost: totalCost,
  classification: result.classification,
  extractionConfidence: result.extracted.confidence,
  matchesFound: result.matches.length,
  outcome: result.suggestedAction.type,
});

// Aggregate in analytics (PostHog, Amplitude)
analytics.track('Document Processed', {
  document_type: result.classification,
  processing_time_bucket: bucketize(elapsed),
  confidence_bucket: bucketize(result.extracted.confidence),
  matches_found_bucket: bucketize(result.matches.length),
  outcome: result.suggestedAction.type,
});
```

## Testing Strategy

### Unit Tests

```typescript
describe('TransactionExtraction', () => {
  it('should extract amount with currency', async () => {
    const text = 'Total: $45.67';
    const result = await extractAmount(text);
    expect(result.value).toBe(45.67);
    expect(result.currency).toBe('USD');
  });

  it('should handle Thai Baht', async () => {
    const text = 'ยอดเงิน: ฿1,234.56';
    const result = await extractAmount(text);
    expect(result.value).toBe(1234.56);
    expect(result.currency).toBe('THB');
  });
});

describe('FuzzyMatching', () => {
  it('should match common abbreviations', () => {
    const existing = [{ merchant: 'Amazon' }];
    const extracted = { merchant: 'AMZN MKT' };
    const matches = fuzzyMatch(extracted, existing);
    expect(matches[0].confidence).toBeGreaterThan(0.8);
  });
});
```

### Integration Tests

```typescript
describe('End-to-End Processing', () => {
  it('should process Amazon receipt correctly', async () => {
    const file = loadTestFile('amazon-receipt.pdf');
    const result = await processDocument(file, testUserId);

    expect(result.status).toBe('success');
    expect(result.extracted.merchant.name).toContain('Amazon');
    expect(result.vendor.category).toBe('Online Shopping');
    expect(result.matches.length).toBeGreaterThan(0);
  });

  it('should handle Bangkok Bank statement', async () => {
    const file = loadTestFile('bangkok-bank-thai.pdf');
    const result = await processDocument(file, testUserId);

    expect(result.status).toBe('success');
    expect(result.extracted.amount.currency).toBe('THB');
  });
});
```

### Manual Test Cases

Create a test suite with real-world examples:

1. **Document Types**
   - Email receipt (Gmail, Outlook)
   - Bank statement (Chase, Bangkok Bank)
   - Credit card statement (Amex, Visa)
   - Paper receipt (Starbucks, Target)
   - Invoice (Utility, Freelance)

2. **Edge Cases**
   - Blurry images
   - Mixed languages
   - Multiple transactions in one document
   - Handwritten amounts
   - Missing fields

3. **Matching Scenarios**
   - Exact match
   - Fuzzy match (typo)
   - Amount mismatch (tip added)
   - Date mismatch (posting delay)
   - No match (new transaction)

## Answers to Your Questions

### 1. Pre-trained vs. Fine-tuned Models?

**Recommendation: Start with pre-trained, fine-tune later**

**Phase 1 (MVP)**: Use pre-trained models (Claude, GPT-4o)
- Faster to market (no training data needed)
- Good accuracy (75-80%) out of the box
- Flexible (handles edge cases well)
- Cost: $0.03-0.05 per document

**Phase 2 (6+ months)**: Consider fine-tuning if:
- You have 1000+ labeled examples
- Accuracy plateaus below 85%
- Cost becomes prohibitive (>$0.10/doc)
- Latency is an issue (>30s processing)

**Best candidates for fine-tuning**:
- Smaller models (GPT-3.5, Claude Haiku) for specific tasks
- NER models (BERT, RoBERTa) for entity extraction
- Classification models (DistilBERT) for document types

**Don't fine-tune**:
- Large models (GPT-4, Claude Opus) - expensive, not needed
- OCR - use existing solutions
- Matching - better with embeddings + rules

### 2. On-device vs. Cloud Processing?

**Recommendation: Hybrid approach**

**On-device (Local)**:
- OCR with Tesseract.js (70% of cases)
- Fuzzy matching with Fuse.js (always)
- Embedding similarity (pre-computed)
- Benefits: Free, private, instant
- Limitations: Lower accuracy, no context

**Cloud Processing**:
- Document classification (needs vision + context)
- Complex OCR (tables, handwriting)
- Data extraction (needs understanding)
- Vendor enrichment (needs world knowledge)
- Benefits: High accuracy, handles edge cases
- Limitations: Cost, latency, privacy concerns

**Privacy-First Flow**:
1. Try local OCR first
2. If confidence < 80%, ask user: "Use cloud OCR for better accuracy?"
3. User can opt-out of cloud processing in settings
4. Never send raw images without user consent

### 3. How to Handle Low-Confidence Extractions?

**Recommendation: Transparent confidence with user review**

**Confidence Ranges**:
- **0.9-1.0**: Auto-process, notify user after
- **0.6-0.9**: Suggest, require user confirmation
- **0.3-0.6**: Manual review, pre-fill fields
- **0.0-0.3**: Blank form, show original document

**UI Strategy**:
```typescript
interface ConfidenceUI {
  high: { // 0.9+
    action: 'auto_match',
    ui: 'Toast notification: "Receipt matched with Amazon purchase"',
    userAction: 'None required, can undo',
  },
  medium: { // 0.6-0.9
    action: 'suggest_match',
    ui: 'Card with top 3 matches, confidence badges',
    userAction: 'Select match or create new',
  },
  low: { // 0.3-0.6
    action: 'manual_review',
    ui: 'Form pre-filled, fields highlighted in yellow',
    userAction: 'Review and confirm each field',
  },
  veryLow: { // <0.3
    action: 'blank_form',
    ui: 'Empty form, original document shown side-by-side',
    userAction: 'Manual entry',
  },
}
```

**Improvement Loop**:
- Track which fields have low confidence
- Improve prompts for those fields
- Add validation rules
- Consider alternative extraction methods

### 4. Real-time vs. Batch Processing?

**Recommendation: Real-time for user uploads, batch for bulk**

**Real-time Processing** (User-initiated):
- Use case: User uploads receipt, wants immediate result
- Target: <10s total processing time
- Implementation: Serverless functions (Vercel, Cloudflare)
- Cost: $0.03 per document
- Priority: User experience

**Batch Processing** (Bulk imports):
- Use case: Import email inbox, monthly bank statements
- Target: Process overnight, 100+ documents
- Implementation: Background jobs (Inngest, BullMQ)
- Cost: $0.02 per document (can use slower, cheaper APIs)
- Priority: Cost optimization

**Hybrid Approach**:
```typescript
async function processDocument(file: File, options: ProcessingOptions) {
  if (options.priority === 'immediate') {
    // Real-time: Fast but more expensive
    return await processImmediately(file);
  } else {
    // Batch: Queue for processing
    await queue.add('process_document', { fileId: file.id });
    return { status: 'queued', estimatedTime: '5-10 minutes' };
  }
}
```

**Performance Optimization**:
- Parallel processing: Classification + OCR simultaneously
- Streaming: Show results as they arrive (classification -> extraction -> matching)
- Caching: Pre-compute embeddings, cache vendor enrichments
- CDN: Serve images from edge locations

### 5. Budget Considerations?

**Recommendation: Tiered pricing with cost limits**

**Cost Structure**:

| Tier | Price | Documents | Cost/Doc | Profit |
|------|-------|-----------|----------|--------|
| Free | $0 | 5/month | $0.03 | -$0.15/mo |
| Pro | $5/mo | 50/month | $0.03 | +$3.50/mo |
| Business | $20/mo | 200/month | $0.025 | +$15/mo |

**Budget Safeguards**:
```typescript
interface CostLimits {
  // Per document
  maxCostPerDocument: 0.10, // Abort if exceeds
  targetCostPerDocument: 0.03,

  // Per user
  freeTierLimit: 5, // documents/month
  alertThreshold: 0.90, // of limit

  // System-wide
  dailyBudget: 100, // USD
  monthlyBudget: 2000,
  alertOn: 0.80, // of budget
}
```

**Cost Optimization Tactics**:
1. **Cache aggressively** (50% savings)
   - Vendor enrichments: Permanent
   - Embeddings: Permanent
   - OCR results: 24 hours

2. **Use cheaper models when possible** (30% savings)
   - Classification: Haiku instead of Sonnet
   - Extraction: Haiku for simple receipts, Sonnet for complex
   - Enrichment: GPT-4o Mini instead of GPT-4o

3. **Batch API calls** (20% savings)
   - Process multiple documents in one API call
   - Anthropic: Batch messages API (50% discount)
   - OpenAI: Batch API (50% discount)

4. **Monitor and alert** (Prevent overruns)
   - Daily cost tracking
   - Alert at 80% of budget
   - Automatically throttle at 95%

**ROI Calculation**:
- Cost to acquire user: $10 (ads, marketing)
- Cost to serve user (Pro): $1.50/mo (50 docs × $0.03)
- Revenue: $5/mo
- Gross profit: $3.50/mo
- Break-even: 3 months
- LTV (12 months): $42

**Pricing Recommendations**:
- Free tier: 5 docs/month (for trial, low churn)
- Pro: $5/month for 50 docs (most users)
- Business: $20/month for 200 docs (power users)
- Enterprise: Custom pricing (1000+ docs, dedicated support)

## Next Steps

### Immediate Actions (This Week)

1. **Set up API accounts**
   ```bash
   # Add to .env
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=sk-...
   GOOGLE_CLOUD_VISION_KEY=...
   ```

2. **Install dependencies**
   ```bash
   npm install @anthropic-ai/sdk openai tesseract.js fuse.js
   ```

3. **Create proof of concept**
   - Upload receipt image
   - Extract with Claude
   - Display structured result

### Short-term (Next 2 Weeks)

1. **Build core pipeline**
   - Document classification
   - OCR with Tesseract
   - Basic extraction with Claude

2. **Create UI components**
   - Document upload
   - Extraction results review
   - Match confirmation

3. **Implement matching**
   - Fuzzy matching with Fuse.js
   - Confidence scoring
   - Top matches display

### Medium-term (Next Month)

1. **Add advanced features**
   - Cloud OCR fallback
   - Vendor enrichment
   - Batch processing

2. **Implement feedback loop**
   - Track corrections
   - Learn merchant aliases
   - Improve prompts

3. **Optimize costs**
   - Add caching layer
   - Implement tiered processing
   - Monitor metrics

### Long-term (Next Quarter)

1. **Scale infrastructure**
   - Background job processing
   - Redis caching
   - CDN for images

2. **Advanced ML**
   - Embeddings for semantic matching
   - Fine-tuned models (if needed)
   - A/B test prompt variations

3. **Enterprise features**
   - Bulk import
   - Custom categories
   - API for integrations

## Conclusion

This AI/ML architecture balances:
- **Accuracy**: 75-85% with room to improve
- **Cost**: $0.03 per document, profitable at $5/mo
- **Privacy**: Local-first with cloud fallback
- **Speed**: <10s real-time processing
- **Scalability**: Serverless, pay-as-you-grow

**Key Decisions**:
1. Use pre-trained LLMs (Claude/GPT) - faster to market
2. Hybrid local/cloud processing - balance privacy and accuracy
3. Transparent confidence scoring - user trust
4. Real-time + batch modes - flexibility
5. Tiered pricing - profitable at scale

**Success Metrics**:
- 75% extraction accuracy at launch
- 85% accuracy after 3 months of feedback
- $0.03 average cost per document
- <10s processing time
- 4.5+ star user rating for accuracy

This is a solid foundation that can scale from MVP to enterprise while maintaining profitability and user trust.
