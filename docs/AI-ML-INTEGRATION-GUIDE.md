# AI/ML Integration Guide for Joot Next.js App

This guide shows how to integrate the document processing system into your existing Joot codebase.

## File Structure

```
joot-app/
├── lib/
│   ├── ai/
│   │   ├── client.ts              # API clients (Anthropic, OpenAI)
│   │   ├── classifier.ts          # Document classification
│   │   ├── ocr.ts                 # OCR service
│   │   ├── extractor.ts           # Data extraction
│   │   ├── matcher.ts             # Transaction matching
│   │   ├── enrichment.ts          # Vendor enrichment
│   │   ├── processor.ts           # Main processor
│   │   ├── types.ts               # TypeScript types
│   │   └── utils/
│   │       ├── budget.ts          # Budget management
│   │       ├── cache.ts           # Caching layer
│   │       └── metrics.ts         # Cost/performance tracking
│   └── supabase/
│       └── schema.sql             # Database schema for AI data
├── app/
│   ├── api/
│   │   ├── receipts/
│   │   │   ├── upload/route.ts    # Upload endpoint
│   │   │   └── process/route.ts   # Processing endpoint
│   │   └── vendors/
│   │       └── enrich/route.ts    # Vendor enrichment endpoint
│   └── (dashboard)/
│       └── receipts/
│           ├── upload/page.tsx    # Upload UI
│           └── review/page.tsx    # Review/match UI
└── components/
    └── receipts/
        ├── UploadZone.tsx         # Drag-drop upload
        ├── ExtractionPreview.tsx  # Show extracted data
        ├── MatchSuggestions.tsx   # Match UI
        └── ConfidenceBadge.tsx    # Confidence indicator
```

## Step 1: Environment Setup

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_CLOUD_VISION_KEY=...  # Optional

# Budget limits
AI_MAX_COST_PER_DOCUMENT=0.10
AI_MAX_DAILY_COST=50
AI_MAX_MONTHLY_COST=1000

# Feature flags
AI_ENABLE_CLOUD_OCR=true
AI_ENABLE_EMBEDDINGS=false
AI_ENABLE_VENDOR_ENRICHMENT=true
```

## Step 2: Database Schema

Add these tables to your Supabase database:

```sql
-- lib/supabase/migrations/add_ai_tables.sql

-- Store document processing results
CREATE TABLE document_processing_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  document_url TEXT NOT NULL,
  classification JSONB,
  extraction JSONB,
  vendor_enrichment JSONB,
  matches JSONB,
  suggested_action JSONB,
  final_transaction_id UUID REFERENCES transactions(id),
  user_action TEXT, -- 'auto_matched', 'manual_matched', 'created_new', 'rejected'
  processing_metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX idx_processing_results_user ON document_processing_results(user_id, created_at DESC);
CREATE INDEX idx_processing_results_transaction ON document_processing_results(final_transaction_id);

-- Store vendor enrichments (cached)
CREATE TABLE vendor_enrichments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_name TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  known_aliases TEXT[],
  logo_url TEXT,
  business_info JSONB,
  source TEXT, -- 'user_history', 'local_db', 'llm', 'manual'
  confidence DECIMAL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE UNIQUE INDEX idx_vendor_merchant_name ON vendor_enrichments(LOWER(merchant_name));
CREATE INDEX idx_vendor_canonical ON vendor_enrichments(LOWER(canonical_name));

-- Store user feedback for learning
CREATE TABLE ai_user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  processing_result_id UUID REFERENCES document_processing_results(id),
  field TEXT, -- 'merchant', 'amount', 'date', 'category'
  original_value TEXT,
  corrected_value TEXT,
  extraction_confidence DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for learning queries
CREATE INDEX idx_feedback_user ON ai_user_feedback(user_id);
CREATE INDEX idx_feedback_field ON ai_user_feedback(field);

-- Store AI cost metrics
CREATE TABLE ai_cost_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  documents_processed INTEGER DEFAULT 0,
  total_cost DECIMAL DEFAULT 0,
  cost_breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cost tracking
CREATE UNIQUE INDEX idx_cost_metrics_user_date ON ai_cost_metrics(user_id, date);

-- Row Level Security
ALTER TABLE document_processing_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_enrichments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cost_metrics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own processing results"
  ON document_processing_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processing results"
  ON document_processing_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view vendor enrichments"
  ON vendor_enrichments FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own feedback"
  ON ai_user_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
  ON ai_user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own cost metrics"
  ON ai_cost_metrics FOR SELECT
  USING (auth.uid() = user_id);
```

## Step 3: Core AI Module

```typescript
// lib/ai/processor.ts
import { createClient } from '@supabase/supabase-js';
import { DocumentProcessor } from './implementation';
import { budgetManager } from './utils/budget';
import { cacheManager } from './utils/cache';

export class JootDocumentProcessor {
  private processor: DocumentProcessor;
  private supabase;

  constructor() {
    this.processor = new DocumentProcessor({
      anthropicKey: process.env.ANTHROPIC_API_KEY!,
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async initialize() {
    await this.processor.initialize();
  }

  async processDocument(params: {
    userId: string;
    imageUrl: string;
    imageBuffer: Buffer;
  }) {
    // Check budget
    const estimatedCost = 0.05; // Conservative estimate
    const { allowed, reason } = budgetManager.canProcess(estimatedCost);

    if (!allowed) {
      throw new Error(`Budget limit reached: ${reason}`);
    }

    // Get user's existing transactions
    const { data: transactions } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', params.userId)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: false });

    // Process document
    const result = await this.processor.processDocument(
      params.imageBuffer,
      transactions || []
    );

    // Record actual cost
    budgetManager.recordSpend(result.metrics.totalCost);

    // Save to database
    const { data: processingResult } = await this.supabase
      .from('document_processing_results')
      .insert({
        user_id: params.userId,
        document_url: params.imageUrl,
        classification: result.extracted?.metadata,
        extraction: result.extracted,
        vendor_enrichment: result.vendor,
        matches: result.matches,
        suggested_action: result.suggestedAction,
        processing_metrics: result.metrics,
      })
      .select()
      .single();

    // Track daily costs
    await this.trackCost(params.userId, result.metrics);

    return {
      ...result,
      processingResultId: processingResult?.id,
    };
  }

  async recordUserAction(params: {
    processingResultId: string;
    action: 'auto_matched' | 'manual_matched' | 'created_new' | 'rejected';
    transactionId?: string;
    corrections?: {
      field: string;
      originalValue: any;
      correctedValue: any;
    }[];
  }) {
    // Update processing result
    await this.supabase
      .from('document_processing_results')
      .update({
        user_action: params.action,
        final_transaction_id: params.transactionId,
      })
      .eq('id', params.processingResultId);

    // Record corrections for learning
    if (params.corrections) {
      const { data: processingResult } = await this.supabase
        .from('document_processing_results')
        .select('user_id, extraction')
        .eq('id', params.processingResultId)
        .single();

      for (const correction of params.corrections) {
        await this.supabase.from('ai_user_feedback').insert({
          user_id: processingResult.user_id,
          processing_result_id: params.processingResultId,
          field: correction.field,
          original_value: JSON.stringify(correction.originalValue),
          corrected_value: JSON.stringify(correction.correctedValue),
          extraction_confidence: processingResult.extraction?.[correction.field]?.confidence || 0,
        });
      }
    }
  }

  private async trackCost(userId: string, metrics: any) {
    const today = new Date().toISOString().split('T')[0];

    await this.supabase.rpc('increment_ai_cost', {
      p_user_id: userId,
      p_date: today,
      p_cost: metrics.totalCost,
      p_breakdown: metrics.breakdown,
    });
  }
}

// Singleton instance
export const documentProcessor = new JootDocumentProcessor();
```

## Step 4: API Routes

```typescript
// app/api/receipts/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { documentProcessor } from '@/lib/ai/processor';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get file from form data
    const formData = await request.formData();
    const file = formData.get('receipt') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${user.id}/${Date.now()}-${file.name}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName);

    // Process document with AI
    await documentProcessor.initialize();
    const result = await documentProcessor.processDocument({
      userId: user.id,
      imageUrl: publicUrl,
      imageBuffer: fileBuffer,
    });

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      ...result,
    });
  } catch (error) {
    console.error('Receipt upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process receipt' },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/receipts/confirm-match/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { documentProcessor } from '@/lib/ai/processor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { processingResultId, action, transactionId, corrections } = body;

    await documentProcessor.recordUserAction({
      processingResultId,
      action,
      transactionId,
      corrections,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Confirm match error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm match' },
      { status: 500 }
    );
  }
}
```

## Step 5: UI Components

```typescript
// components/receipts/UploadZone.tsx
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

export function ReceiptUploadZone() {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setProcessing(true);

    try {
      const formData = new FormData();
      formData.append('receipt', file);

      const response = await fetch('/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setProcessing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  if (result) {
    return <ExtractionPreview result={result} />;
  }

  return (
    <div
      {...getRootProps()}
      className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-gray-400"
    >
      <input {...getInputProps()} />
      {processing ? (
        <div>Processing receipt...</div>
      ) : isDragActive ? (
        <div>Drop receipt here...</div>
      ) : (
        <div>
          <p className="text-lg font-medium">Upload Receipt</p>
          <p className="text-sm text-gray-500 mt-2">
            Drag & drop or click to select
          </p>
        </div>
      )}
    </div>
  );
}
```

```typescript
// components/receipts/ExtractionPreview.tsx
'use client';

import { ConfidenceBadge } from './ConfidenceBadge';
import { MatchSuggestions } from './MatchSuggestions';

export function ExtractionPreview({ result }: { result: any }) {
  const { extracted, vendor, matches, suggestedAction } = result;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Extracted Information</h3>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Merchant</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{extracted.merchant.name}</span>
              <ConfidenceBadge confidence={extracted.merchant.confidence} />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Amount</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {extracted.amount.currency} {extracted.amount.value.toFixed(2)}
              </span>
              <ConfidenceBadge confidence={extracted.amount.confidence} />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Date</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {new Date(extracted.date.value).toLocaleDateString()}
              </span>
              <ConfidenceBadge confidence={extracted.date.confidence} />
            </div>
          </div>

          {vendor && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Category</span>
              <span className="font-medium">{vendor.category}</span>
            </div>
          )}
        </div>
      </div>

      {matches && matches.length > 0 && (
        <MatchSuggestions
          matches={matches}
          suggestedAction={suggestedAction}
          processingResultId={result.processingResultId}
        />
      )}
    </div>
  );
}
```

```typescript
// components/receipts/ConfidenceBadge.tsx
export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const getColor = (conf: number) => {
    if (conf >= 0.9) return 'bg-green-100 text-green-800';
    if (conf >= 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${getColor(confidence)}`}>
      {(confidence * 100).toFixed(0)}%
    </span>
  );
}
```

## Step 6: Testing

```typescript
// __tests__/ai/processor.test.ts
import { JootDocumentProcessor } from '@/lib/ai/processor';
import fs from 'fs';

describe('Document Processing', () => {
  let processor: JootDocumentProcessor;

  beforeAll(async () => {
    processor = new JootDocumentProcessor();
    await processor.initialize();
  });

  it('should process Amazon receipt', async () => {
    const imageBuffer = fs.readFileSync('__fixtures__/amazon-receipt.jpg');

    const result = await processor.processDocument({
      userId: 'test-user',
      imageUrl: 'https://example.com/receipt.jpg',
      imageBuffer,
    });

    expect(result.status).toBe('success');
    expect(result.extracted.merchant.name).toContain('Amazon');
    expect(result.metrics.totalCost).toBeLessThan(0.10);
  });
});
```

## Step 7: Monitoring Dashboard

Add a simple admin page to monitor AI usage:

```typescript
// app/(dashboard)/admin/ai-metrics/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function AIMetricsPage() {
  const supabase = createClient();

  const { data: metrics } = await supabase
    .from('ai_cost_metrics')
    .select('*')
    .order('date', { ascending: false })
    .limit(30);

  const totalCost = metrics?.reduce((sum, m) => sum + Number(m.total_cost), 0) || 0;
  const totalDocs = metrics?.reduce((sum, m) => sum + m.documents_processed, 0) || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">AI Metrics</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Total Cost (30d)</div>
          <div className="text-3xl font-bold">${totalCost.toFixed(2)}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Documents Processed</div>
          <div className="text-3xl font-bold">{totalDocs}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Avg Cost/Doc</div>
          <div className="text-3xl font-bold">
            ${totalDocs > 0 ? (totalCost / totalDocs).toFixed(4) : '0.00'}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">Date</th>
              <th className="text-right p-4">Documents</th>
              <th className="text-right p-4">Cost</th>
              <th className="text-right p-4">Avg</th>
            </tr>
          </thead>
          <tbody>
            {metrics?.map((m) => (
              <tr key={m.id} className="border-b">
                <td className="p-4">{m.date}</td>
                <td className="text-right p-4">{m.documents_processed}</td>
                <td className="text-right p-4">${Number(m.total_cost).toFixed(2)}</td>
                <td className="text-right p-4">
                  ${m.documents_processed > 0
                    ? (Number(m.total_cost) / m.documents_processed).toFixed(4)
                    : '0.00'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## Integration Checklist

- [ ] Add environment variables (.env.local)
- [ ] Run database migrations (Supabase)
- [ ] Install npm dependencies
- [ ] Create lib/ai/ directory structure
- [ ] Copy implementation code from examples
- [ ] Create API routes
- [ ] Build UI components
- [ ] Add upload page
- [ ] Test with sample receipts
- [ ] Set up monitoring dashboard
- [ ] Configure budget limits
- [ ] Enable caching (Redis/Upstash)
- [ ] Deploy to staging
- [ ] Beta test with users
- [ ] Monitor costs daily
- [ ] Iterate on accuracy

## Performance Tips

1. **Lazy load AI processor**: Only initialize when needed
2. **Use Edge Functions**: For classification (fast, low latency)
3. **Background jobs**: For batch processing
4. **Cache aggressively**: Vendor enrichments, embeddings
5. **Optimize images**: Compress before upload
6. **Stream results**: Show progress to users
7. **Fallbacks**: Multiple AI providers

## Cost Control

1. Set hard limits in environment variables
2. Alert at 80% of budget
3. Throttle at 95% of budget
4. Monitor daily via dashboard
5. Review monthly for optimization opportunities

## Next Steps

1. Start with upload endpoint
2. Add UI for review
3. Implement matching confirmation
4. Add feedback collection
5. Build monitoring dashboard
6. Optimize costs based on real usage

This integration provides a complete, production-ready document processing system that fits seamlessly into your existing Joot architecture.
