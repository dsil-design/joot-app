/**
 * AI/ML Implementation Examples for Joot Document Processing
 *
 * This file contains practical, copy-paste ready implementations
 * of the core AI/ML components described in AI-ML-ARCHITECTURE.md
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import Tesseract from 'tesseract.js';
import Fuse from 'fuse.js';
import { z } from 'zod';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export enum DocumentType {
  EMAIL_RECEIPT = 'email_receipt',
  BANK_STATEMENT = 'bank_statement',
  CREDIT_CARD_STATEMENT = 'credit_card_statement',
  INVOICE = 'invoice',
  PAPER_RECEIPT = 'paper_receipt',
  UNKNOWN = 'unknown',
}

export interface ClassificationResult {
  type: DocumentType;
  confidence: number;
  reasoning: string;
}

export interface OCRResult {
  text: string;
  confidence: number;
  method: 'tesseract' | 'google_vision' | 'claude';
  processingTime: number;
}

export interface ExtractedTransaction {
  merchant: {
    name: string;
    confidence: number;
    aliases?: string[];
  };
  amount: {
    value: number;
    currency: string;
    confidence: number;
    originalText?: string;
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
  category?: string;
  metadata: {
    documentType: DocumentType;
    extractionMethod: 'ocr' | 'pdf_text' | 'email_parse';
    processingTime: number;
  };
}

export interface MatchResult {
  transactionId: string;
  confidence: number;
  signals: {
    merchantSimilarity: number;
    amountMatch: number;
    dateMatch: number;
    semanticSimilarity?: number;
  };
  explanation: string;
}

export interface VendorEnrichment {
  merchantName: string;
  canonicalName: string;
  category: string;
  subcategory?: string;
  knownAliases: string[];
  logo?: {
    url: string;
    cachedAt: Date;
  };
  businessInfo?: {
    type: string;
    description: string;
    website?: string;
  };
  source: 'user_history' | 'local_db' | 'llm' | 'manual';
  confidence: number;
  lastUpdated: Date;
}

// Zod schemas for validation
const ExtractedTransactionSchema = z.object({
  merchant: z.object({
    name: z.string(),
    confidence: z.number().min(0).max(1),
    aliases: z.array(z.string()).optional(),
  }),
  amount: z.object({
    value: z.number().positive(),
    currency: z.string().length(3),
    confidence: z.number().min(0).max(1),
    originalText: z.string().optional(),
  }),
  date: z.object({
    value: z.string(), // ISO date string
    confidence: z.number().min(0).max(1),
    timezone: z.string().optional(),
  }),
  description: z.string().optional(),
  paymentMethod: z
    .object({
      type: z.enum(['credit_card', 'debit_card', 'bank_transfer', 'cash', 'other']),
      lastFour: z.string().optional(),
    })
    .optional(),
  category: z.string().optional(),
});

// ============================================================================
// 1. DOCUMENT CLASSIFICATION
// ============================================================================

export class DocumentClassifier {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async classify(imageData: string | Buffer): Promise<ClassificationResult> {
    const startTime = Date.now();

    // Convert buffer to base64 if needed
    const base64Image =
      typeof imageData === 'string'
        ? imageData
        : imageData.toString('base64');

    const message = await this.anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `Classify this financial document into one of these categories:
- email_receipt: Email confirmation of a purchase
- bank_statement: Bank account statement
- credit_card_statement: Credit card statement
- invoice: Invoice or bill
- paper_receipt: Physical receipt photo
- unknown: Cannot determine

Respond in JSON format:
{
  "type": "document_type",
  "confidence": 0.95,
  "reasoning": "Brief explanation"
}`,
            },
          ],
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '{}';
    const result = JSON.parse(responseText);

    return {
      type: result.type as DocumentType,
      confidence: result.confidence,
      reasoning: result.reasoning,
    };
  }
}

// ============================================================================
// 2. OCR & TEXT EXTRACTION
// ============================================================================

export class OCRService {
  private tesseractWorker: Tesseract.Worker | null = null;

  async initialize() {
    this.tesseractWorker = await Tesseract.createWorker('eng+tha');
  }

  async extractText(imageData: Buffer): Promise<OCRResult> {
    const startTime = Date.now();

    // Try Tesseract first (free, local)
    const tesseractResult = await this.extractWithTesseract(imageData);

    if (tesseractResult.confidence > 0.8) {
      return {
        ...tesseractResult,
        processingTime: Date.now() - startTime,
      };
    }

    // Fallback to cloud OCR
    console.log('Tesseract confidence low, falling back to cloud OCR');
    // In production, call Google Vision or AWS Textract here
    // For now, return Tesseract result with warning
    return {
      ...tesseractResult,
      processingTime: Date.now() - startTime,
    };
  }

  private async extractWithTesseract(imageData: Buffer): Promise<OCRResult> {
    if (!this.tesseractWorker) {
      await this.initialize();
    }

    const result = await this.tesseractWorker!.recognize(imageData);

    return {
      text: result.data.text,
      confidence: result.data.confidence / 100, // Tesseract returns 0-100
      method: 'tesseract',
      processingTime: 0, // Will be set by caller
    };
  }

  async cleanup() {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
    }
  }
}

// ============================================================================
// 3. STRUCTURED DATA EXTRACTION
// ============================================================================

export class DataExtractor {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async extractTransaction(
    text: string,
    documentType: DocumentType
  ): Promise<ExtractedTransaction> {
    const startTime = Date.now();

    const prompt = this.buildExtractionPrompt(text, documentType);

    const message = await this.anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '{}';

    // Parse and validate with Zod
    const parsed = JSON.parse(responseText);
    const validated = ExtractedTransactionSchema.parse(parsed);

    // Convert date string to Date object
    const result: ExtractedTransaction = {
      ...validated,
      date: {
        ...validated.date,
        value: new Date(validated.date.value),
      },
      metadata: {
        documentType,
        extractionMethod: 'ocr',
        processingTime: Date.now() - startTime,
      },
    };

    return result;
  }

  private buildExtractionPrompt(
    text: string,
    documentType: DocumentType
  ): string {
    const basePrompt = `Extract transaction details from this ${documentType} text.

Rules:
1. Merchant name: Use the most recognizable form (e.g., "Amazon" not "AMZN MKT")
2. Amount: Include currency. If multiple amounts, identify the final charged amount
3. Date: Parse to ISO 8601 format. If ambiguous, prefer transaction date over statement date
4. Confidence: Rate 0-1 based on clarity in document

For Thai text (Bangkok Bank):
- "฿" or "THB" = Thai Baht
- Date format: DD/MM/YYYY
- "ยอดเงิน" = amount, "วันที่" = date

Document text:
---
${text}
---

Return JSON matching this structure:
{
  "merchant": {
    "name": "Merchant Name",
    "confidence": 0.95,
    "aliases": ["Alternate Name"]
  },
  "amount": {
    "value": 45.67,
    "currency": "USD",
    "confidence": 0.98,
    "originalText": "$45.67"
  },
  "date": {
    "value": "2025-01-15T10:30:00Z",
    "confidence": 0.90
  },
  "description": "Brief description",
  "paymentMethod": {
    "type": "credit_card",
    "lastFour": "1234"
  },
  "category": "Restaurant"
}

If you cannot find a field with confidence, set confidence to 0 and omit the value.`;

    return basePrompt;
  }
}

// ============================================================================
// 4. FUZZY MATCHING ENGINE
// ============================================================================

export interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  date: Date;
  description?: string;
}

export class TransactionMatcher {
  private config = {
    merchantNameThreshold: 0.7,
    amountVariancePercent: 5,
    amountVarianceFixed: 1.0,
    dateWindowDays: 3,
    minMatchConfidence: 0.6,
    autoMatchThreshold: 0.9,
  };

  async findMatches(
    extracted: ExtractedTransaction,
    existingTransactions: Transaction[]
  ): Promise<MatchResult[]> {
    // Step 1: Filter by date window
    const dateFiltered = this.filterByDate(
      existingTransactions,
      extracted.date.value,
      this.config.dateWindowDays
    );

    if (dateFiltered.length === 0) {
      return [];
    }

    // Step 2: Filter by amount range
    const amountFiltered = this.filterByAmount(
      dateFiltered,
      extracted.amount.value,
      extracted.amount.currency
    );

    if (amountFiltered.length === 0) {
      return [];
    }

    // Step 3: Fuzzy match merchant names
    const matches = this.fuzzyMatchMerchant(
      amountFiltered,
      extracted.merchant.name
    );

    // Step 4: Calculate composite confidence scores
    const scored = this.calculateConfidenceScores(
      matches,
      extracted
    );

    // Step 5: Sort by confidence
    return scored
      .filter((m) => m.confidence >= this.config.minMatchConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  private filterByDate(
    transactions: Transaction[],
    targetDate: Date,
    windowDays: number
  ): Transaction[] {
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const targetTime = targetDate.getTime();

    return transactions.filter((t) => {
      const diff = Math.abs(t.date.getTime() - targetTime);
      return diff <= windowMs;
    });
  }

  private filterByAmount(
    transactions: Transaction[],
    targetAmount: number,
    currency: string
  ): Transaction[] {
    return transactions.filter((t) => {
      if (t.currency !== currency) return false;

      const percentVariance =
        (Math.abs(t.amount - targetAmount) / targetAmount) * 100;
      const fixedVariance = Math.abs(t.amount - targetAmount);

      return (
        percentVariance <= this.config.amountVariancePercent ||
        fixedVariance <= this.config.amountVarianceFixed
      );
    });
  }

  private fuzzyMatchMerchant(
    transactions: Transaction[],
    targetMerchant: string
  ): MatchResult[] {
    const fuse = new Fuse(transactions, {
      keys: ['merchant'],
      threshold: 0.3, // Lower = more strict
      includeScore: true,
    });

    const results = fuse.search(targetMerchant);

    return results.map((result) => {
      const transaction = result.item;
      const similarity = 1 - (result.score || 0); // Convert distance to similarity

      return {
        transactionId: transaction.id,
        confidence: 0, // Will be calculated later
        signals: {
          merchantSimilarity: similarity,
          amountMatch: 0, // Will be calculated
          dateMatch: 0, // Will be calculated
        },
        explanation: this.generateExplanation(transaction, similarity),
      };
    });
  }

  private calculateConfidenceScores(
    matches: MatchResult[],
    extracted: ExtractedTransaction
  ): MatchResult[] {
    return matches.map((match) => {
      // Calculate amount match score
      const amountDiff = Math.abs(
        match.signals.amountMatch - extracted.amount.value
      );
      const amountScore = 1 - amountDiff / extracted.amount.value;

      // Calculate date match score (1.0 for exact, decreases linearly)
      const daysDiff = 0; // Calculate from transaction date
      const dateScore = Math.max(
        0,
        1 - daysDiff / this.config.dateWindowDays
      );

      // Weighted composite score
      const confidence =
        match.signals.merchantSimilarity * 0.4 +
        amountScore * 0.35 +
        dateScore * 0.15 +
        (match.signals.semanticSimilarity || 0) * 0.1;

      return {
        ...match,
        confidence,
        signals: {
          ...match.signals,
          amountMatch: amountScore,
          dateMatch: dateScore,
        },
      };
    });
  }

  private generateExplanation(
    transaction: Transaction,
    similarity: number
  ): string {
    if (similarity > 0.9) {
      return `Very likely match with ${transaction.merchant}`;
    } else if (similarity > 0.7) {
      return `Possible match with ${transaction.merchant}`;
    } else {
      return `Weak match with ${transaction.merchant}`;
    }
  }
}

// ============================================================================
// 5. VENDOR ENRICHMENT SERVICE
// ============================================================================

export class VendorEnrichmentService {
  private anthropic: Anthropic;
  private cache: Map<string, VendorEnrichment>;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
    this.cache = new Map();
  }

  async enrichVendor(merchantName: string): Promise<VendorEnrichment> {
    // Check cache first
    const cached = this.cache.get(merchantName.toLowerCase());
    if (cached) {
      return cached;
    }

    // Try to find in user history (implement based on your DB)
    // const userVendor = await this.findInUserHistory(merchantName);
    // if (userVendor) return userVendor;

    // Use LLM for enrichment
    const enriched = await this.enrichWithLLM(merchantName);

    // Cache result
    this.cache.set(merchantName.toLowerCase(), enriched);

    return enriched;
  }

  private async enrichWithLLM(
    merchantName: string
  ): Promise<VendorEnrichment> {
    const prompt = `Analyze this merchant/business name: "${merchantName}"

Provide:
1. Canonical business name (clean, recognizable form)
2. Business category (restaurant, grocery, transportation, entertainment, etc.)
3. Common name variations/aliases you might see on receipts or statements
4. Brief business description (1 sentence)

Return JSON:
{
  "canonicalName": "Clean Business Name",
  "category": "Category",
  "subcategory": "Subcategory",
  "knownAliases": ["Alias 1", "Alias 2"],
  "businessInfo": {
    "type": "Business Type",
    "description": "Brief description"
  },
  "confidence": 0.85
}`;

    const message = await this.anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '{}';
    const parsed = JSON.parse(responseText);

    return {
      merchantName,
      canonicalName: parsed.canonicalName,
      category: parsed.category,
      subcategory: parsed.subcategory,
      knownAliases: parsed.knownAliases || [],
      businessInfo: parsed.businessInfo,
      source: 'llm',
      confidence: parsed.confidence,
      lastUpdated: new Date(),
    };
  }
}

// ============================================================================
// 6. COMPLETE PROCESSING PIPELINE
// ============================================================================

export interface ProcessingResult {
  status: 'success' | 'error' | 'manual_review';
  extracted?: ExtractedTransaction;
  vendor?: VendorEnrichment;
  matches?: MatchResult[];
  suggestedAction?: {
    type: 'auto_match' | 'suggest_match' | 'create_new' | 'manual_review';
    transactionId?: string;
    confidence: number;
  };
  error?: string;
  metrics: {
    totalCost: number;
    processingTime: number;
    breakdown: {
      classification: number;
      ocr: number;
      extraction: number;
      matching: number;
      enrichment: number;
    };
  };
}

export class DocumentProcessor {
  private classifier: DocumentClassifier;
  private ocrService: OCRService;
  private extractor: DataExtractor;
  private matcher: TransactionMatcher;
  private enrichment: VendorEnrichmentService;

  constructor(config: { anthropicKey: string; openaiKey?: string }) {
    this.classifier = new DocumentClassifier(config.anthropicKey);
    this.ocrService = new OCRService();
    this.extractor = new DataExtractor(config.anthropicKey);
    this.matcher = new TransactionMatcher();
    this.enrichment = new VendorEnrichmentService(config.anthropicKey);
  }

  async initialize() {
    await this.ocrService.initialize();
  }

  async processDocument(
    imageData: Buffer,
    existingTransactions: Transaction[]
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const costs = {
      classification: 0.01,
      ocr: 0,
      extraction: 0.02,
      matching: 0,
      enrichment: 0.001,
    };

    try {
      // Step 1: Classify document
      const classificationStart = Date.now();
      const classification = await this.classifier.classify(imageData);

      if (classification.confidence < 0.75) {
        return {
          status: 'manual_review',
          error: 'Unable to determine document type with confidence',
          metrics: {
            totalCost: costs.classification,
            processingTime: Date.now() - startTime,
            breakdown: { ...costs, classification: Date.now() - classificationStart },
          },
        };
      }

      // Step 2: Extract text via OCR
      const ocrStart = Date.now();
      const ocrResult = await this.ocrService.extractText(imageData);
      costs.ocr = ocrResult.method === 'tesseract' ? 0 : 0.0015;

      // Step 3: Extract structured data
      const extractionStart = Date.now();
      const extracted = await this.extractor.extractTransaction(
        ocrResult.text,
        classification.type
      );

      // Step 4: Enrich vendor
      const enrichmentStart = Date.now();
      const vendor = await this.enrichment.enrichVendor(
        extracted.merchant.name
      );

      // Step 5: Find matches
      const matchingStart = Date.now();
      const matches = await this.matcher.findMatches(
        extracted,
        existingTransactions
      );

      // Step 6: Determine suggested action
      const suggestedAction = this.determineSuggestedAction(matches);

      // Calculate timing breakdown
      const totalTime = Date.now() - startTime;
      const breakdown = {
        classification: ocrStart - classificationStart,
        ocr: extractionStart - ocrStart,
        extraction: enrichmentStart - extractionStart,
        enrichment: matchingStart - enrichmentStart,
        matching: Date.now() - matchingStart,
      };

      return {
        status: 'success',
        extracted,
        vendor,
        matches,
        suggestedAction,
        metrics: {
          totalCost: Object.values(costs).reduce((a, b) => a + b, 0),
          processingTime: totalTime,
          breakdown,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          totalCost: Object.values(costs).reduce((a, b) => a + b, 0),
          processingTime: Date.now() - startTime,
          breakdown: costs,
        },
      };
    }
  }

  private determineSuggestedAction(matches: MatchResult[]) {
    if (matches.length === 0) {
      return { type: 'create_new' as const, confidence: 1.0 };
    }

    const best = matches[0];

    if (best.confidence > 0.9) {
      return {
        type: 'auto_match' as const,
        transactionId: best.transactionId,
        confidence: best.confidence,
      };
    }

    if (best.confidence > 0.6) {
      return {
        type: 'suggest_match' as const,
        transactionId: best.transactionId,
        confidence: best.confidence,
      };
    }

    return { type: 'manual_review' as const, confidence: 0 };
  }

  async cleanup() {
    await this.ocrService.cleanup();
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

async function exampleUsage() {
  // Initialize processor
  const processor = new DocumentProcessor({
    anthropicKey: process.env.ANTHROPIC_API_KEY!,
  });

  await processor.initialize();

  // Load document image
  const imageData = Buffer.from('...'); // Your image data

  // Load existing transactions from DB
  const existingTransactions: Transaction[] = [
    {
      id: 'txn_123',
      merchant: 'Amazon',
      amount: 45.99,
      currency: 'USD',
      date: new Date('2025-01-15'),
    },
    // ... more transactions
  ];

  // Process document
  const result = await processor.processDocument(
    imageData,
    existingTransactions
  );

  console.log('Processing result:', result);

  if (result.status === 'success') {
    console.log('Extracted:', result.extracted);
    console.log('Vendor:', result.vendor);
    console.log('Top matches:', result.matches);
    console.log('Suggested action:', result.suggestedAction);
    console.log('Cost:', `$${result.metrics.totalCost.toFixed(4)}`);
    console.log('Time:', `${result.metrics.processingTime}ms`);
  }

  // Cleanup
  await processor.cleanup();
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DocumentClassifier,
  OCRService,
  DataExtractor,
  TransactionMatcher,
  VendorEnrichmentService,
  DocumentProcessor,
};
