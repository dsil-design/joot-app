# Ready-to-Use Code Examples for Free MVP Stack

All code is production-ready, just fill in your API keys and database URLs.

---

## 1. EXPRESS SERVER SETUP

### Minimal Express Server with All Integrations

```javascript
// index.js - Main server file
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const PgBoss = require('pg-boss');
const Levenshtein = require('fast-levenshtein');

// Initialize
const app = express();
const upload = multer({ dest: 'uploads/' });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

let boss;

// Middleware
app.use(express.json());
app.use(cors());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    services: {
      tesseract: 'ready',
      gemini: !!process.env.GOOGLE_API_KEY,
      supabase: !!process.env.SUPABASE_URL
    }
  });
});

// Initialize pg-boss
async function initializeQueue() {
  boss = new PgBoss(process.env.DATABASE_URL);

  boss.on('error', err => console.error('pg-boss error:', err));

  await boss.start();

  // Subscribe to receipt processing jobs
  await boss.subscribe('process-receipt', processReceiptJob);

  console.log('Job queue initialized');
}

initializeQueue().catch(err => {
  console.error('Failed to initialize queue:', err);
  process.exit(1);
});

// ============================================================
// API ENDPOINTS
// ============================================================

// Upload receipt and queue for processing
app.post('/api/upload-receipt', upload.single('receipt'), async (req, res) => {
  try {
    const { userId } = req.body;
    const file = req.file;

    if (!userId || !file) {
      return res.status(400).json({
        error: 'userId and receipt file required'
      });
    }

    // 1. Compress image
    console.log(`Compressing ${file.filename}...`);
    const uploadDir = path.join(__dirname, 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const compressedPath = path.join(uploadDir, `compressed-${file.filename}.jpg`);
    await sharp(file.path)
      .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75, progressive: true })
      .toFile(compressedPath);

    const compressedBuffer = await fs.readFile(compressedPath);

    // 2. Upload to Supabase Storage
    const storagePath = `${userId}/${Date.now()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(storagePath, compressedBuffer, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 3. Queue processing job
    const jobId = await boss.publish('process-receipt', {
      userId,
      filePath: compressedPath,
      storagePath: uploadData.path,
      originalFileName: file.originalname
    });

    // Clean up local temp file
    await fs.unlink(file.path);

    return res.status(202).json({
      jobId,
      status: 'processing',
      message: 'Receipt queued for processing',
      storageUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/receipts/${storagePath}`
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: error.message,
      hint: 'Check file size (<50MB) and format (JPG, PNG, PDF)'
    });
  }
});

// Get processing status
app.get('/api/job/:jobId', async (req, res) => {
  try {
    const job = await boss.getJobById(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.json({
      jobId: job.id,
      status: job.state,
      progress: job.completedOn ? 100 : 0,
      result: job.output,
      error: job.failAttempt
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all receipts for user
app.get('/api/receipts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transaction matches for receipt
app.get('/api/matches/:receiptId', async (req, res) => {
  try {
    const { receiptId } = req.params;

    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (receiptError) throw receiptError;

    const { data: candidates, error: candidatesError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', receipt.user_id)
      .gte('transaction_date', new Date(receipt.transaction_date).toISOString().split('T')[0])
      .lte('amount', receipt.amount * 1.1)
      .gte('amount', receipt.amount * 0.9);

    if (candidatesError) throw candidatesError;

    // Score and rank matches
    const scored = candidates.map(t => ({
      transaction: t,
      score: calculateMatchScore(
        receipt.extracted_data,
        t
      )
    })).sort((a, b) => b.score - a.score);

    return res.json({
      receipt,
      matches: scored.slice(0, 5), // Top 5
      bestMatch: scored[0] || null
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manually confirm a match
app.post('/api/confirm-match', async (req, res) => {
  try {
    const { receiptId, transactionId, confidence } = req.body;

    const { data, error } = await supabase
      .from('receipts')
      .update({
        matched_transaction_id: transactionId,
        match_confidence: confidence
      })
      .eq('id', receiptId);

    if (error) throw error;

    return res.json({ success: true, receipt: data[0] });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get queue statistics
app.get('/api/queue-stats', async (req, res) => {
  try {
    const stats = await boss.getQueueSize('process-receipt');
    const completed = await boss.countStates('completed', 'process-receipt');

    return res.json({
      queue: {
        pending: stats,
        completed: completed
      },
      apiUsage: await getApiUsageStats()
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// BACKGROUND JOB
// ============================================================

async function processReceiptJob(job) {
  const { userId, filePath, storagePath } = job.data;

  console.log(`[${job.id}] Starting receipt processing...`);

  try {
    // 1. OCR Extraction
    console.log(`[${job.id}] Running OCR...`);
    const ocrText = await extractTextWithTesseract(filePath);

    if (!ocrText || ocrText.trim().length < 10) {
      throw new Error('OCR extraction failed or document is blank');
    }

    console.log(`[${job.id}] OCR Result (first 100 chars): ${ocrText.substring(0, 100)}`);

    // 2. Data Extraction with Gemini
    console.log(`[${job.id}] Extracting structured data with Gemini...`);
    let extracted;

    try {
      extracted = await extractReceiptData(ocrText);
    } catch (err) {
      console.log(`[${job.id}] Gemini failed, using Ollama...`);
      extracted = await extractReceiptDataOllama(ocrText);
    }

    console.log(`[${job.id}] Extracted:`, extracted);

    // 3. Log API usage
    await logApiCall('gemini', userId);

    // 4. Get transactions for matching
    const { data: candidates } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('transaction_date', new Date(extracted.date).toISOString().split('T')[0])
      .lte('amount', extracted.total * 1.05)
      .gte('amount', extracted.total * 0.95);

    // 5. Find best match
    const match = findBestMatch(extracted, candidates || []);

    console.log(`[${job.id}] Match found:`, match);

    // 6. Save receipt record
    const { data: saved, error: saveError } = await supabase
      .from('receipts')
      .insert({
        user_id: userId,
        image_url: storagePath,
        ocr_text: ocrText,
        extracted_data: extracted,
        merchant: extracted.merchant,
        amount: extracted.total,
        currency: extracted.currency || 'USD',
        transaction_date: extracted.date,
        matched_transaction_id: match?.id,
        match_confidence: match?.confidence || null,
        processing_status: 'completed'
      })
      .select();

    if (saveError) throw saveError;

    console.log(`[${job.id}] Saved receipt:`, saved[0].id);

    return {
      success: true,
      receiptId: saved[0].id,
      matched: match !== null,
      confidence: match?.confidence || null,
      extracted
    };

  } catch (error) {
    console.error(`[${job.id}] Job failed:`, error);

    // Save failed receipt record
    await supabase
      .from('receipts')
      .insert({
        user_id: userId,
        image_url: storagePath,
        processing_status: 'failed',
        extracted_data: { error: error.message }
      })
      .catch(err => console.error('Failed to save error record:', err));

    throw error; // Triggers retry
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function extractTextWithTesseract(imagePath) {
  console.log('Tesseract: Starting OCR...');

  const { createWorker } = Tesseract;
  const worker = await createWorker();

  try {
    const result = await worker.recognize(imagePath);
    const text = result.data.text;

    console.log(`Tesseract: Extracted ${text.length} characters`);

    return text;
  } finally {
    await worker.terminate();
  }
}

async function extractReceiptData(ocrText) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a receipt processing AI. Extract key information from this receipt OCR text.

IMPORTANT: Return ONLY valid JSON, no other text.

Return a JSON object with these exact fields:
{
  "merchant": "Store/merchant name",
  "date": "YYYY-MM-DD format, today if unknown",
  "total": number (just the number, no currency symbol),
  "currency": "USD" or other code,
  "items": [
    {"name": "item description", "price": number}
  ],
  "subtotal": number,
  "tax": number,
  "confidence": number between 0 and 100
}

If values are unclear, make your best guess. Return a complete object even if some values are estimated.

OCR TEXT:
${ocrText}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.merchant || !parsed.date || !parsed.total) {
      throw new Error('Missing required fields: merchant, date, or total');
    }

    return parsed;

  } catch (error) {
    console.error('Gemini extraction error:', error.message);
    throw error;
  }
}

async function extractReceiptDataOllama(ocrText) {
  // Fallback using local Ollama (requires Ollama running on localhost:11434)
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'neural-chat',
        prompt: `Extract merchant name, date (YYYY-MM-DD), total amount, and items from this receipt:

${ocrText}

Return as JSON: {"merchant": "...", "date": "...", "total": number, "items": [...], "currency": "USD", "confidence": 50}`,
        stream: false
      })
    });

    const data = await response.json();
    const jsonMatch = data.response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) throw new Error('No JSON in Ollama response');

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error('Ollama fallback failed:', error);
    throw error;
  }
}

function calculateMatchScore(receipt, transaction) {
  let score = 0;

  // Amount match (40%)
  const amountDiff = Math.abs(transaction.amount - receipt.total);
  if (amountDiff === 0) {
    score += 40;
  } else {
    const tolerance = receipt.total * 0.05; // 5% tolerance
    if (amountDiff < tolerance) {
      score += Math.max(30, 40 - (amountDiff / tolerance) * 10);
    }
  }

  // Date match (30%)
  const dateDiff = Math.abs(
    new Date(transaction.transaction_date) - new Date(receipt.transaction_date)
  ) / (1000 * 60 * 60 * 24);

  if (dateDiff === 0) score += 30;
  else if (dateDiff <= 1) score += 25;
  else if (dateDiff <= 2) score += 20;
  else if (dateDiff <= 3) score += 10;

  // Merchant name match (30%)
  const similarity = fuzzyMatchScore(
    receipt.merchant.toLowerCase(),
    transaction.merchant_name.toLowerCase()
  );
  score += similarity * 30;

  return Math.min(100, score);
}

function findBestMatch(receipt, candidates) {
  if (candidates.length === 0) return null;

  const scored = candidates
    .map(t => ({
      ...t,
      score: calculateMatchScore(receipt, t)
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];

  // Only return match if confidence > 70%
  if (best && best.score > 70) {
    return {
      ...best,
      confidence: (best.score / 100).toFixed(2)
    };
  }

  return null;
}

function fuzzyMatchScore(str1, str2) {
  if (!str1 || !str2) return 0;

  const distance = Levenshtein.get(str1, str2);
  const longer = Math.max(str1.length, str2.length);
  const similarity = 1 - (distance / longer);

  return Math.max(0, similarity);
}

async function logApiCall(service, userId) {
  // Log for quota tracking
  const { error } = await supabase
    .from('api_calls')
    .insert({
      user_id: userId,
      service: service,
      created_at: new Date()
    });

  if (error) console.error('Failed to log API call:', error);
}

async function getApiUsageStats() {
  const { data, error } = await supabase
    .from('api_calls')
    .select('service', { count: 'exact' })
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (error) return { error: error.message };

  const geminiCalls = data?.filter(d => d.service === 'gemini').length || 0;

  return {
    gemini: {
      used: geminiCalls,
      limit: 250,
      remaining: Math.max(0, 250 - geminiCalls)
    }
  };
}

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST   /api/upload-receipt');
  console.log('  GET    /api/job/:jobId');
  console.log('  GET    /api/receipts/:userId');
  console.log('  GET    /api/matches/:receiptId');
  console.log('  POST   /api/confirm-match');
  console.log('  GET    /api/queue-stats');
  console.log('  GET    /health');
});
```

---

## 2. DATABASE SCHEMA SETUP

```sql
-- Copy-paste this into Supabase SQL Editor

-- Receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_url TEXT,
  ocr_text TEXT,
  extracted_data JSONB,
  merchant TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  transaction_date DATE NOT NULL,
  matched_transaction_id UUID,
  match_confidence DECIMAL(3, 2),
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Transactions table (from bank/card)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  merchant_name TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  transaction_date DATE NOT NULL,
  bank_description TEXT,
  category TEXT,
  receipt_id UUID REFERENCES receipts(id),
  matched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- API call logging (for quota tracking)
CREATE TABLE IF NOT EXISTS api_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service TEXT NOT NULL,
  endpoint TEXT,
  status INT,
  tokens_used INT,
  created_at TIMESTAMP DEFAULT now()
);

-- Merchant enrichment cache
CREATE TABLE IF NOT EXISTS merchant_enrichment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_name TEXT NOT NULL UNIQUE,
  category TEXT,
  logo_url TEXT,
  website TEXT,
  confidence DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_receipts_user ON receipts(user_id);
CREATE INDEX idx_receipts_date ON receipts(transaction_date DESC);
CREATE INDEX idx_receipts_merchant ON receipts(merchant);
CREATE INDEX idx_receipts_status ON receipts(processing_status);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_merchant ON transactions(merchant_name);
CREATE INDEX idx_api_calls_date ON api_calls(created_at DESC);
CREATE INDEX idx_api_calls_service ON api_calls(service);

-- Full-text search index
CREATE INDEX idx_merchant_search ON transactions
  USING GIN(to_tsvector('english', merchant_name));
CREATE INDEX idx_receipt_search ON receipts
  USING GIN(to_tsvector('english', merchant || ' ' || COALESCE(ocr_text, '')));

-- Row Level Security (optional but recommended)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_see_own_receipts"
  ON receipts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_receipts"
  ON receipts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_see_own_transactions"
  ON transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_transactions"
  ON transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## 3. ENV FILE TEMPLATE

```bash
# .env - Fill in your actual values

# Node.js
NODE_ENV=development
PORT=3000

# Google Gemini API
# Get from: https://ai.google.dev
GOOGLE_API_KEY=your-gemini-api-key-here

# Supabase
# Get from: https://supabase.com/dashboard
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE=your-service-role-key-here

# PostgreSQL (same as Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# RiteKit API (optional)
# Get from: https://ritekit.com/app/dashboard
RITEKIT_CLIENT_ID=your-ritekit-id-here

# Ollama (for local LLM fallback)
OLLAMA_HOST=http://localhost:11434

# JWT Secret (if using custom auth)
JWT_SECRET=your-secret-key-here

# File upload settings
MAX_FILE_SIZE=52428800  # 50MB in bytes
UPLOAD_DIR=./uploads

# Feature flags
USE_TESSERACT=true
USE_GEMINI=true
USE_OLLAMA_FALLBACK=true
USE_LOCAL_QUEUE=true

# Logging
LOG_LEVEL=info
```

---

## 4. PACKAGE.JSON

```json
{
  "name": "document-processing-mvp",
  "version": "1.0.0",
  "description": "Free document processing and transaction matching MVP",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "setup:db": "node scripts/setup-db.js",
    "test": "jest",
    "lint": "eslint ."
  },
  "keywords": [
    "ocr",
    "receipt",
    "transaction",
    "matching"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.32.6",
    "tesseract.js": "^5.0.2",
    "@google/generative-ai": "^0.3.0",
    "@supabase/supabase-js": "^2.37.0",
    "pg-boss": "^8.4.4",
    "fast-levenshtein": "^2.0.6",
    "axios": "^1.5.0",
    "joi": "^17.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0",
    "eslint": "^8.50.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

---

## 5. SETUP SCRIPT

```javascript
// scripts/setup-db.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function setupDatabase() {
  console.log('Setting up database...');

  try {
    // Read SQL schema
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    const { data, error } = await supabase.sql`${schema}`;

    if (error) {
      console.error('Database setup failed:', error);
      process.exit(1);
    }

    console.log('✓ Database setup complete');

    // Create storage bucket
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      console.error('Failed to list buckets:', bucketsError);
    } else {
      const hasReceiptsBucket = buckets.some(b => b.name === 'receipts');

      if (!hasReceiptsBucket) {
        const { error: createError } = await supabase
          .storage
          .createBucket('receipts', {
            public: false,
            fileSizeLimit: 52428800 // 50MB
          });

        if (createError) {
          console.error('Failed to create storage bucket:', createError);
        } else {
          console.log('✓ Storage bucket created');
        }
      } else {
        console.log('✓ Storage bucket already exists');
      }
    }

    console.log('\nSetup complete! Next steps:');
    console.log('1. Update .env with your API keys');
    console.log('2. Run: npm start');
    console.log('3. Test: curl http://localhost:3000/health');

  } catch (error) {
    console.error('Setup error:', error);
    process.exit(1);
  }
}

setupDatabase();
```

---

## 6. TESTING CLIENT

```javascript
// client.js - Test your API
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000';
const TEST_USER_ID = 'test-user-123';

async function testUploadReceipt() {
  console.log('\n=== Testing Receipt Upload ===');

  try {
    const form = new FormData();
    form.append('receipt', fs.createReadStream('test-receipt.jpg'));
    form.append('userId', TEST_USER_ID);

    const response = await axios.post(
      `${API_URL}/api/upload-receipt`,
      form,
      { headers: form.getHeaders() }
    );

    console.log('Upload Response:', response.data);
    return response.data.jobId;

  } catch (error) {
    console.error('Upload failed:', error.response?.data || error.message);
  }
}

async function testGetJobStatus(jobId) {
  console.log(`\n=== Checking Job Status (${jobId}) ===`);

  try {
    const response = await axios.get(`${API_URL}/api/job/${jobId}`);
    console.log('Job Status:', response.data);
    return response.data.status;

  } catch (error) {
    console.error('Status check failed:', error.response?.data || error.message);
  }
}

async function testGetReceipts() {
  console.log(`\n=== Getting Receipts for ${TEST_USER_ID} ===`);

  try {
    const response = await axios.get(`${API_URL}/api/receipts/${TEST_USER_ID}`);
    console.log(`Found ${response.data.length} receipts`);
    console.log('Receipts:', response.data);

  } catch (error) {
    console.error('Get receipts failed:', error.response?.data || error.message);
  }
}

async function testGetMatches(receiptId) {
  console.log(`\n=== Finding Matches for Receipt ${receiptId} ===`);

  try {
    const response = await axios.get(`${API_URL}/api/matches/${receiptId}`);
    console.log('Matches:', response.data);

  } catch (error) {
    console.error('Get matches failed:', error.response?.data || error.message);
  }
}

async function testQueueStats() {
  console.log('\n=== Queue Statistics ===');

  try {
    const response = await axios.get(`${API_URL}/api/queue-stats`);
    console.log('Queue Stats:', response.data);

  } catch (error) {
    console.error('Stats failed:', error.response?.data || error.message);
  }
}

async function testHealth() {
  console.log('\n=== Health Check ===');

  try {
    const response = await axios.get(`${API_URL}/health`);
    console.log('Health:', response.data);

  } catch (error) {
    console.error('Health check failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('Starting API tests...\n');

  // 1. Health check
  await testHealth();

  // 2. Queue stats
  await testQueueStats();

  // 3. Get existing receipts
  await testGetReceipts();

  // Note: To test upload, you need a test-receipt.jpg file
  // const jobId = await testUploadReceipt();
  // if (jobId) {
  //   await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds
  //   const status = await testGetJobStatus(jobId);
  //   if (status === 'completed') {
  //     await testGetReceipts();
  //   }
  // }
}

runTests().catch(console.error);

// Export for use in other modules
module.exports = {
  testUploadReceipt,
  testGetJobStatus,
  testGetReceipts,
  testGetMatches,
  testQueueStats,
  testHealth
};
```

---

## 7. DEPLOY TO RENDER.COM (FREE)

```bash
#!/bin/bash
# deploy.sh

echo "Deploying to Render..."

# 1. Create Render account at https://render.com

# 2. Connect GitHub repo (or use this git approach)
git init
git add .
git commit -m "Initial MVP deployment"

# 3. Create render.yaml
cat > render.yaml << 'EOF'
services:
  - type: web
    name: document-processing-mvp
    runtime: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
        # Add other env vars in Render dashboard
    disk:
      name: data
      mountPath: /data
      sizeGB: 10
EOF

# 4. Push to Render
git remote add render [YOUR_RENDER_GIT_URL]
git push render main

echo "✓ Deployed to Render!"
echo "Your API is available at: https://[your-app-name].onrender.com"
```

---

## 8. DOCKER SETUP (OPTIONAL)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install system dependencies for Tesseract
RUN apk add --no-cache \
  tesseract-ocr \
  leptonica-dev \
  postgresql-client

# Copy package files
COPY package*.json ./

# Install node dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - ollama

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    command: serve

volumes:
  ollama_data:
```

---

**All code is ready to use! Just:**

1. Fill in your `.env` file with API keys
2. Install dependencies: `npm install`
3. Set up database: `npm run setup:db`
4. Start server: `npm start`
5. Test: `curl http://localhost:3000/health`

