# AI/ML Quick Start Guide

Quick guide to implementing the document processing system in Joot.

## Prerequisites

1. **API Keys** (get from respective providers):
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=sk-...
   GOOGLE_CLOUD_VISION_KEY=...  # Optional, for advanced OCR
   ```

2. **Install Dependencies**:
   ```bash
   npm install @anthropic-ai/sdk openai tesseract.js fuse.js zod date-fns
   ```

## 5-Minute MVP

### Step 1: Set up API client

```typescript
// lib/ai/client.ts
import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### Step 2: Create basic document processor

```typescript
// lib/ai/process-receipt.ts
import { anthropic } from './client';
import Tesseract from 'tesseract.js';

export async function processReceipt(imageBuffer: Buffer) {
  // 1. OCR with Tesseract
  const worker = await Tesseract.createWorker('eng');
  const { data: { text } } = await worker.recognize(imageBuffer);
  await worker.terminate();

  // 2. Extract structured data with Claude
  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Extract transaction details from this receipt text as JSON:

${text}

Return format:
{
  "merchant": "Merchant Name",
  "amount": 45.67,
  "currency": "USD",
  "date": "2025-01-15",
  "confidence": 0.95
}`
    }]
  });

  const extracted = JSON.parse(response.content[0].text);
  return extracted;
}
```

### Step 3: Use in your app

```typescript
// app/api/upload-receipt/route.ts
import { processReceipt } from '@/lib/ai/process-receipt';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('receipt') as File;
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await processReceipt(buffer);

  return Response.json(result);
}
```

## 30-Minute Production Setup

Use the complete implementation from `ai-ml-implementation-examples.ts`:

```typescript
// lib/ai/processor.ts
import { DocumentProcessor } from './implementation';

const processor = new DocumentProcessor({
  anthropicKey: process.env.ANTHROPIC_API_KEY!,
});

await processor.initialize();

// Process a document
const result = await processor.processDocument(imageBuffer, existingTransactions);

// result includes:
// - extracted: ExtractedTransaction
// - vendor: VendorEnrichment
// - matches: MatchResult[]
// - suggestedAction: What to do next
// - metrics: Cost and timing
```

## Cost Monitoring

Add budget tracking to avoid surprises:

```typescript
// lib/ai/budget.ts
import { BudgetManager } from './cost-calculator';

export const budgetManager = new BudgetManager({
  maxCostPerDocument: 0.10,
  maxDailyCost: 50,
  maxMonthlyCost: 1000,
  alertThreshold: 0.8,
});

// Before processing
const estimatedCost = 0.032;
const { allowed, reason } = budgetManager.canProcess(estimatedCost);

if (!allowed) {
  throw new Error(`Budget limit reached: ${reason}`);
}

// After processing
budgetManager.recordSpend(actualCost);
```

## Testing

Create test cases with sample documents:

```typescript
// __tests__/ai/processor.test.ts
import { DocumentProcessor } from '@/lib/ai/processor';
import fs from 'fs';

describe('Document Processing', () => {
  it('should extract data from Amazon receipt', async () => {
    const imageBuffer = fs.readFileSync('__fixtures__/amazon-receipt.jpg');

    const result = await processor.processDocument(imageBuffer, []);

    expect(result.status).toBe('success');
    expect(result.extracted.merchant.name).toContain('Amazon');
    expect(result.extracted.amount.currency).toBe('USD');
  });
});
```

## Common Issues & Solutions

### Issue: Tesseract not recognizing text
**Solution**: Image quality too low, fallback to cloud OCR:
```typescript
if (ocrResult.confidence < 0.8) {
  // Use Google Vision or Claude with vision
}
```

### Issue: Wrong merchant name extracted
**Solution**: Build merchant alias mapping:
```typescript
const aliases = {
  'AMZN MKT': 'Amazon',
  'SQ *COFFEE SHOP': 'Coffee Shop',
  // ...
};
```

### Issue: Costs too high
**Solution**: Implement caching:
```typescript
// Cache vendor enrichments
const cachedVendor = await redis.get(`vendor:${merchantName}`);
if (cachedVendor) return cachedVendor;
```

### Issue: Low accuracy on complex receipts
**Solution**: Upgrade to Claude Sonnet for complex cases:
```typescript
if (documentType === 'bank_statement' || hasTable) {
  model = 'claude-3-5-sonnet-20241022';
}
```

## Optimization Checklist

- [ ] Use Tesseract for 70%+ of documents (free)
- [ ] Cache vendor enrichments permanently
- [ ] Pre-compute embeddings for common merchants
- [ ] Batch process non-urgent documents
- [ ] Monitor costs daily with alerts
- [ ] Track accuracy with user feedback
- [ ] A/B test different prompts
- [ ] Implement confidence-based fallbacks

## Next Steps

1. **Week 1**: Implement MVP (OCR + extraction)
2. **Week 2**: Add fuzzy matching
3. **Week 3**: Implement vendor enrichment
4. **Week 4**: Build feedback loop
5. **Month 2**: Optimize costs and accuracy
6. **Month 3**: Scale to production

## Resources

- **Architecture**: See `AI-ML-ARCHITECTURE.md` for full system design
- **Implementation**: See `ai-ml-implementation-examples.ts` for code
- **Costs**: See `ai-ml-cost-calculator.ts` for budgeting
- **Anthropic Docs**: https://docs.anthropic.com
- **OpenAI Docs**: https://platform.openai.com/docs

## Support

For issues or questions:
1. Check the architecture docs
2. Review the implementation examples
3. Test with the cost calculator
4. Consult API provider documentation

## Estimated Timeline to Production

- **MVP** (basic extraction): 1 week
- **Production-ready** (matching, caching): 1 month
- **Optimized** (85%+ accuracy): 3 months

## Expected Metrics at Launch

- **Accuracy**: 75% (no user correction needed)
- **Cost**: $0.03-0.05 per document
- **Speed**: 10-15 seconds per document
- **User satisfaction**: 4+ stars

## Pricing Recommendation

Based on $0.032 average cost per document:

| Tier | Price | Documents | Margin |
|------|-------|-----------|--------|
| Free | $0 | 5/month | Loss leader |
| Pro | $5/month | 50/month | 68% |
| Business | $20/month | 200/month | 72% |

This pricing is profitable at scale while remaining competitive.
