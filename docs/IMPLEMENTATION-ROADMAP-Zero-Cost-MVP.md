# Implementation Roadmap: Zero-Cost MVP
## Quick Start Guide for Document Management System

**Target**: Ship MVP in 4-6 weeks with $0 infrastructure cost

---

## Prerequisites Checklist

```
ACCOUNTS TO CREATE (All Free):
[ ] Supabase account (free tier)
[ ] Vercel account (hobby plan)
[ ] Google AI Studio account (for Gemini API key)
[ ] GitHub account (for version control)

TOOLS TO INSTALL:
[ ] Node.js 18+ (nvm recommended)
[ ] pnpm or npm
[ ] Git
[ ] Supabase CLI (npx supabase)
[ ] Vercel CLI (npx vercel)

KNOWLEDGE REQUIRED:
[ ] Next.js basics
[ ] PostgreSQL basics
[ ] TypeScript basics
[ ] React basics
```

---

## Week 1: Foundation (Days 1-7)

### Day 1-2: Project Setup

```bash
# Initialize Next.js project
npx create-next-app@latest joot-documents \
  --typescript --tailwind --app --src-dir

cd joot-documents

# Install dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install pg-boss
npm install sharp tesseract.js
npm install pdf-parse pdf-lib
npm install @google/generative-ai
npm install swr date-fns
npm install -D @types/pg

# Set up environment variables
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
GOOGLE_GEMINI_API_KEY=your-gemini-key
DATABASE_URL=your-postgres-connection-string
EOF
```

### Day 3: Supabase Setup

```bash
# Initialize Supabase locally
npx supabase init

# Create database migrations
npx supabase migration new add_documents_table
```

**Create file**: `/supabase/migrations/[timestamp]_add_documents_table.sql`

```sql
-- Copy the schema from ZERO-COST-MVP-ARCHITECTURE.md
-- Include:
-- 1. documents table
-- 2. vendor_logos table
-- 3. processing_rate_limits table
-- 4. Indexes and RLS policies
```

```bash
# Apply migrations to local database
npx supabase db reset

# Push to remote Supabase project
npx supabase db push
```

### Day 4-5: Authentication

**Create file**: `/lib/supabase.ts`

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

// Client-side Supabase client
export const supabase = createClientComponentClient();

// Server-side Supabase client (with service role key)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

**Create file**: `/app/auth/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });
      if (error) alert(error.message);
      else alert('Check your email for confirmation link!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) alert(error.message);
      else router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleAuth} className="space-y-4 w-96">
        <h1 className="text-2xl font-bold">
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-blue-600"
        >
          {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
        </button>
      </form>
    </div>
  );
}
```

### Day 6-7: Basic Dashboard

**Create file**: `/app/dashboard/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Transaction } from '@/types';

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
    fetchTransactions();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) router.push('/auth');
  };

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .limit(50);

    setTransactions(data || []);
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Add link to documents page */}
      <a href="/documents" className="text-blue-600 underline mb-4 block">
        Upload Documents →
      </a>

      {/* Transaction list */}
      <div className="space-y-2">
        {transactions.map((txn) => (
          <div key={txn.id} className="border p-4 rounded">
            <div className="font-bold">{txn.description}</div>
            <div className="text-gray-600">
              ${txn.amount} • {txn.transaction_date}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Checkpoint Week 1**: You should have a working Next.js app with Supabase auth and basic transaction view.

---

## Week 2: Document Processing (Days 8-14)

### Day 8-9: File Upload

**Create file**: `/app/documents/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { DocumentUploader } from '@/components/DocumentUploader';
import { ProcessingStatus } from '@/components/ProcessingStatus';

export default function DocumentsPage() {
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);

  const handleUploadComplete = (documentId: string) => {
    setUploadedDocs([...uploadedDocs, documentId]);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Upload Documents</h1>

      <DocumentUploader onComplete={handleUploadComplete} />

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Processing Queue</h2>
        {uploadedDocs.map((docId) => (
          <ProcessingStatus key={docId} documentId={docId} />
        ))}
      </div>
    </div>
  );
}
```

**Create file**: `/components/DocumentUploader.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/lib/supabase';

export function DocumentUploader({ onComplete }: { onComplete: (id: string) => void }) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      await uploadFile(file);
    }
  }, []);

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);

      // Call upload API
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const { document_id } = await response.json();
      onComplete(document_id);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <p>Uploading...</p>
      ) : isDragActive ? (
        <p>Drop files here...</p>
      ) : (
        <div>
          <p className="text-lg mb-2">Drag & drop documents here</p>
          <p className="text-sm text-gray-500">or click to select files</p>
          <p className="text-xs text-gray-400 mt-2">PDF, JPG, PNG (max 10MB)</p>
        </div>
      )}
    </div>
  );
}
```

**Install dependencies**:
```bash
npm install react-dropzone
```

### Day 10-11: Upload API + Storage

**Create file**: `/app/api/documents/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { compressImage, generateThumbnail } from '@/lib/image-compressor';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Generate IDs
    const documentId = uuidv4();
    const fileExt = file.name.split('.').pop();
    const storagePath = `${user.id}/${documentId}.${fileExt}`;
    const thumbnailPath = `${user.id}/${documentId}_thumb.jpg`;

    // Process file
    const buffer = Buffer.from(await file.arrayBuffer());
    let uploadBuffer = buffer;
    let thumbnailBuffer: Buffer | null = null;

    if (file.type.startsWith('image/')) {
      // Compress image
      uploadBuffer = await compressImage(buffer);
      thumbnailBuffer = await generateThumbnail(buffer);
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, uploadBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Upload thumbnail
    if (thumbnailBuffer) {
      await supabaseAdmin.storage
        .from('thumbnails')
        .upload(thumbnailPath, thumbnailBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });
    }

    // Insert document record
    const { error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        id: documentId,
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        thumbnail_path: thumbnailBuffer ? thumbnailPath : null,
        processing_status: 'pending',
      });

    if (dbError) throw dbError;

    // Create pg-boss job
    // TODO: Implement in next step

    return NextResponse.json({
      document_id: documentId,
      status: 'pending',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
```

**Create file**: `/lib/image-compressor.ts`

```typescript
import sharp from 'sharp';

export async function compressImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

export async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(200, 200, { fit: 'cover' })
    .jpeg({ quality: 60, mozjpeg: true })
    .toBuffer();
}
```

### Day 12-13: OCR Service

**Create file**: `/lib/ocr-service.ts`

```typescript
import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  provider: 'tesseract' | 'google-vision';
}

export async function extractTextFromImage(
  imageBuffer: Buffer
): Promise<OCRResult> {
  try {
    // Run Tesseract OCR
    const result = await Tesseract.recognize(imageBuffer, 'eng+tha', {
      logger: (m) => console.log(m),
    });

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      provider: 'tesseract',
    };
  } catch (error) {
    console.error('OCR failed:', error);
    throw error;
  }
}

export async function extractTextFromPDF(
  pdfBuffer: Buffer
): Promise<OCRResult> {
  const pdf = require('pdf-parse');

  try {
    const data = await pdf(pdfBuffer);

    return {
      text: data.text,
      confidence: 100, // Text-based PDFs have high confidence
      provider: 'tesseract',
    };
  } catch (error) {
    // If PDF doesn't have text, treat as image
    console.log('PDF has no text, running OCR...');

    // Convert PDF to images and OCR each page
    // TODO: Implement PDF -> Image -> OCR pipeline
    throw new Error('PDF OCR not implemented yet');
  }
}
```

### Day 14: LLM Parsing Service

**Create file**: `/lib/llm-service.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export interface ParsedDocument {
  vendor: string | null;
  amount: number | null;
  currency: 'USD' | 'THB' | null;
  date: string | null; // YYYY-MM-DD
  confidence: number;
}

export async function parseReceiptText(ocrText: string): Promise<ParsedDocument> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Extract transaction details from this receipt OCR text:

${ocrText}

Return ONLY valid JSON in this exact format:
{
  "vendor": "business name" or null,
  "amount": number or null,
  "currency": "USD" or "THB" or null,
  "date": "YYYY-MM-DD" or null,
  "confidence": number between 0-100
}

Rules:
- Extract the main total amount (not subtotals or items)
- Use the business name as vendor
- Infer currency from context ($ = USD, ฿ or THB = THB)
- If you can't extract a field, use null
- confidence is your confidence in the extraction (0-100)`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 200,
      },
    });

    const responseText = result.response.text();

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      vendor: parsed.vendor,
      amount: parsed.amount,
      currency: parsed.currency,
      date: parsed.date,
      confidence: parsed.confidence,
    };
  } catch (error) {
    console.error('LLM parsing failed:', error);
    throw error;
  }
}
```

**Checkpoint Week 2**: You should be able to upload documents and see them stored in Supabase.

---

## Week 3: Background Processing (Days 15-21)

### Day 15-16: pg-boss Setup

**Create file**: `/lib/job-queue.ts`

```typescript
import PgBoss from 'pg-boss';

let boss: PgBoss | null = null;

export async function getJobQueue(): Promise<PgBoss> {
  if (boss) return boss;

  boss = new PgBoss({
    connectionString: process.env.DATABASE_URL,
    schema: 'pgboss',
  });

  await boss.start();
  return boss;
}

export async function queueDocumentProcessing(documentId: string): Promise<void> {
  const boss = await getJobQueue();

  await boss.send('process-document', {
    documentId,
  }, {
    retryLimit: 3,
    retryDelay: 60, // seconds
    retryBackoff: true,
    expireInSeconds: 3600,
  });
}

export async function processDocumentJobs(): Promise<void> {
  const boss = await getJobQueue();

  // Process one job at a time (stay under rate limits)
  await boss.work('process-document', {
    teamSize: 1,
    teamConcurrency: 1,
  }, async (job) => {
    const { documentId } = job.data;
    await processDocument(documentId);
  });
}

async function processDocument(documentId: string): Promise<void> {
  // TODO: Implement full processing pipeline
  console.log('Processing document:', documentId);
}
```

### Day 17-18: Processing Pipeline

**Create file**: `/app/api/documents/process/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTextFromImage, extractTextFromPDF } from '@/lib/ocr-service';
import { parseReceiptText } from '@/lib/llm-service';

export async function POST(request: Request) {
  try {
    const { document_id } = await request.json();

    // Get document from database
    const { data: document } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Update status to processing
    await supabaseAdmin
      .from('documents')
      .update({ processing_status: 'processing' })
      .eq('id', document_id);

    // Download file from storage
    const { data: fileData } = await supabaseAdmin.storage
      .from('documents')
      .download(document.storage_path);

    if (!fileData) throw new Error('Failed to download file');

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Step 1: OCR
    let ocrResult;
    if (document.file_type === 'application/pdf') {
      ocrResult = await extractTextFromPDF(buffer);
    } else {
      ocrResult = await extractTextFromImage(buffer);
    }

    // Save OCR result
    await supabaseAdmin
      .from('documents')
      .update({
        ocr_text: ocrResult.text,
        ocr_confidence: ocrResult.confidence,
        ocr_provider: ocrResult.provider,
      })
      .eq('id', document_id);

    // Step 2: LLM Parsing
    const parsedResult = await parseReceiptText(ocrResult.text);

    // Save parsed result
    await supabaseAdmin
      .from('documents')
      .update({
        parsed_vendor: parsedResult.vendor,
        parsed_amount: parsedResult.amount,
        parsed_currency: parsedResult.currency,
        parsed_date: parsedResult.date,
        parsed_confidence: parsedResult.confidence,
        processing_status: 'completed',
      })
      .eq('id', document_id);

    return NextResponse.json({
      success: true,
      parsed: parsedResult,
    });
  } catch (error) {
    console.error('Processing error:', error);

    // Mark as failed
    await supabaseAdmin
      .from('documents')
      .update({
        processing_status: 'failed',
        processing_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', document_id);

    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}
```

### Day 19: Vercel Cron Job

**Create file**: `/app/api/cron/process-documents/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  // Verify cron secret (security)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get one pending document
    const { data: documents } = await supabaseAdmin
      .from('documents')
      .select('id')
      .eq('processing_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (!documents || documents.length === 0) {
      return NextResponse.json({ message: 'No pending documents' });
    }

    const document = documents[0];

    // Trigger processing
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/documents/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: document.id }),
    });

    return NextResponse.json({
      message: 'Processing started',
      document_id: document.id,
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: 'Cron failed' },
      { status: 500 }
    );
  }
}
```

**Create file**: `/vercel.json`

```json
{
  "crons": [{
    "path": "/api/cron/process-documents",
    "schedule": "* * * * *"
  }]
}
```

### Day 20-21: Processing Status UI

**Create file**: `/components/ProcessingStatus.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function ProcessingStatus({ documentId }: { documentId: string }) {
  const [status, setStatus] = useState('pending');
  const [parsed, setParsed] = useState<any>(null);

  useEffect(() => {
    fetchStatus();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`document:${documentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `id=eq.${documentId}`,
        },
        (payload) => {
          setStatus(payload.new.processing_status);
          if (payload.new.processing_status === 'completed') {
            setParsed({
              vendor: payload.new.parsed_vendor,
              amount: payload.new.parsed_amount,
              currency: payload.new.parsed_currency,
              date: payload.new.parsed_date,
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [documentId]);

  const fetchStatus = async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (data) {
      setStatus(data.processing_status);
      if (data.processing_status === 'completed') {
        setParsed({
          vendor: data.parsed_vendor,
          amount: data.parsed_amount,
          currency: data.parsed_currency,
          date: data.parsed_date,
        });
      }
    }
  };

  return (
    <div className="border rounded p-4 mb-2">
      <div className="flex items-center gap-2">
        {status === 'pending' && (
          <>
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Queued for processing...</span>
          </>
        )}
        {status === 'processing' && (
          <>
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </>
        )}
        {status === 'completed' && (
          <>
            <div className="w-4 h-4 bg-green-500 rounded-full" />
            <span>Completed</span>
          </>
        )}
        {status === 'failed' && (
          <>
            <div className="w-4 h-4 bg-red-500 rounded-full" />
            <span>Failed</span>
          </>
        )}
      </div>

      {parsed && (
        <div className="mt-2 text-sm text-gray-600">
          <div>Vendor: {parsed.vendor || 'N/A'}</div>
          <div>Amount: {parsed.currency} {parsed.amount || 'N/A'}</div>
          <div>Date: {parsed.date || 'N/A'}</div>
        </div>
      )}
    </div>
  );
}
```

**Checkpoint Week 3**: You should have a working document processing pipeline with real-time status updates.

---

## Week 4: Polish & Launch (Days 22-28)

### Day 22-23: Reconciliation UI

**Create file**: `/app/reconcile/page.tsx`

```typescript
// Implement matching UI similar to current transaction matching
// Show unmatched documents alongside bank transactions
// Allow drag-and-drop or click to match
```

### Day 24: Vendor Logo Enrichment

**Create file**: `/lib/logo-fetcher.ts`

```typescript
export async function fetchVendorLogo(domain: string): Promise<string> {
  // Try DuckDuckGo first
  const ddgUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  const ddgResponse = await fetch(ddgUrl);
  if (ddgResponse.ok) return ddgUrl;

  // Fallback to Google
  const googleUrl = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
  return googleUrl;
}
```

### Day 25-26: Cleanup Jobs & Rate Limiting

**Create file**: `/app/api/cron/cleanup/route.ts`

```typescript
// Implement 90-day file deletion
// Keep thumbnails + metadata
```

**Create file**: `/lib/rate-limiter.ts`

```typescript
// Implement user and global rate limits
// Track usage in processing_rate_limits table
```

### Day 27: Testing & Bug Fixes

- Test full flow end-to-end
- Fix any bugs
- Optimize performance
- Test on mobile

### Day 28: Deploy & Document

```bash
# Deploy to Vercel
npx vercel --prod

# Set environment variables in Vercel dashboard
# Add cron secret: CRON_SECRET=random-secret-here

# Test in production
```

---

## Post-Launch Checklist

```
WEEK 5: MONITORING
[ ] Set up Supabase usage alerts (80% storage warning)
[ ] Monitor free tier limits daily
[ ] Track user feedback
[ ] Fix critical bugs

WEEK 6: OPTIMIZATION
[ ] Implement aggressive caching
[ ] Optimize image compression
[ ] Add error logging
[ ] Improve UX based on feedback

WEEK 7: MONETIZATION PREP
[ ] Add pricing page (even if just "Coming Soon")
[ ] Implement usage tracking per user
[ ] Design upgrade prompts
[ ] Prepare Stripe integration (don't activate yet)
```

---

## Success Metrics

```
MVP IS SUCCESSFUL IF:
- 10+ active users
- 100+ documents processed
- <5% error rate
- Staying within free tier limits
- Users report value from the tool

TIME TO UPGRADE IF:
- 50+ active users
- Database > 400MB
- Storage > 800MB
- LLM requests > 1,000/day
- Users willing to pay
```

---

## Common Issues & Solutions

```
ISSUE: "Database storage full"
SOLUTION: Run cleanup job, delete old originals, upgrade to Pro

ISSUE: "Rate limit exceeded" (Gemini)
SOLUTION: Implement queue with backoff, process slower

ISSUE: "OCR confidence too low"
SOLUTION: Fallback to Google Vision API (1,000/month free)

ISSUE: "Vercel function timeout"
SOLUTION: Split large PDFs into smaller jobs

ISSUE: "Upload fails on mobile"
SOLUTION: Add better error messages, reduce max file size
```

---

## Next Steps After MVP

1. Launch to 10-20 beta users
2. Gather feedback for 2 weeks
3. Fix bugs and optimize
4. Add pricing tier ($5/month for power users)
5. Upgrade to Supabase Pro when hitting limits
6. Scale to 100+ users
7. Consider raising seed funding

**Good luck with your zero-cost MVP!**
