# Free MVP Quick Reference Guide - October 2025

## TL;DR: The Free Stack That Actually Works

```
Receipt Upload → Tesseract OCR → Gemini API → PostgreSQL Matching → Done!
   (100% free)   (free, local)  (250/day free) (free with Supabase)
```

**Total Cost:** $0 forever, or ~$25/month at scale

---

## 1. COMPARISON TABLES

### OCR Solutions Quick Comparison

| Factor | Tesseract | Google Vision | AWS Textract | Ollama |
|--------|-----------|---------------|--------------|--------|
| **Cost** | FREE | 1,000/mo (3mo) | 1,000/mo (3mo) | FREE |
| **Accuracy** | 90-95% | 98% | 97% | 85-90% |
| **Speed** | Fast local | Cloud (slower) | Cloud (slower) | Slow local |
| **Setup** | Easy | Moderate | Moderate | Easy |
| **Best For** | Clean receipts | High quality | Complex forms | Fallback |
| **Scale Limit** | Hardware | Cloud quota | Cloud quota | Hardware |
| **For MVP?** | ✓ YES | Fallback | Fallback | Fallback |

### LLM Extraction Comparison

| Provider | Model | Free/Month | Daily Limit | Accuracy | Best For |
|----------|-------|-----------|------------|----------|----------|
| **Google** | Gemini 2.5 Flash | Unlimited | 250 requests | 95% | PRIMARY ✓ |
| **Google** | Gemini 2.5 Pro | Unlimited | 50 requests | 98% | Complex |
| **OpenAI** | GPT-4o mini | $5 credits | Limited | 90% | If you have credits |
| **Claude** | Sonnet | None | None | 96% | NOT FREE |
| **Self-Hosted** | Ollama neural-chat | Unlimited | Unlimited | 70% | Fallback ✓ |
| **Self-Hosted** | Ollama llama2 | Unlimited | Unlimited | 65% | Fallback |

### Storage & Database Comparison

| Service | Free Tier | Usage | Cost After | Best For |
|---------|-----------|-------|-----------|----------|
| **Supabase Storage** | 1GB | 2,000-5,000 receipts | $0.15/GB | Primary ✓ |
| **Supabase Database** | 500MB | ~50,000 rows | $25/month Pro | Primary ✓ |
| **AWS S3** | 5GB (1 year) | Same as above | $0.023/GB | Alternative |
| **Firebase Storage** | 5GB | Same as above | $0.18/GB | Alternative |
| **PostgreSQL local** | Unlimited | On your server | Hardware | If you host |

### Vendor Enrichment Comparison

| Service | Free Tier | Features | Cost After | Use Case |
|---------|-----------|----------|-----------|----------|
| **RiteKit** | 100 credits/mo | Logos, fallbacks | $99/mo for 16K | ✓ PRIMARY |
| **Brandfetch** | 1M requests/mo | Logos, brand data | $29/mo | If you verify domains |
| **Logo.dev** | Limited | Icon focus | $ | Simple logos only |
| **Clearbit** | SHUTDOWN 12/1 | N/A | N/A | DO NOT USE |

### Job Queue Comparison

| Solution | Free | Persistence | Setup | Best For |
|----------|------|-------------|-------|----------|
| **pg-boss** | ✓ FREE | PostgreSQL | 2 min | PRIMARY ✓ |
| **Bull** | OSS free | Redis | 5 min | If Redis exists |
| **Agenda** | ✓ FREE | MongoDB | 3 min | If MongoDB exists |
| **BullMQ** | OSS free | Redis | 5 min | Better than Bull |
| **Node Queue** | Homemade | Memory | 30 min | Simple only |

---

## 2. DECISION TREES

### Decision Tree 1: Which OCR to Use?

```
Start: Need OCR?
│
├─ If accuracy critical (forms, invoices)
│  └─ Try Google Vision (1,000/mo free)
│     If exceeds → AWS Textract (1,000/mo free)
│     Then → Tesseract + Ollama fallback
│
├─ If accuracy okay (standard receipts)
│  └─ Use Tesseract (100% free)
│     Fallback to Gemini if Tesseract uncertain
│
└─ If data privacy critical
   └─ Use Tesseract + Ollama (both local, free)
      Never send to cloud APIs
```

### Decision Tree 2: Which LLM to Use?

```
Start: Need data extraction?
│
├─ If < 100 requests/day
│  └─ Use Google Gemini (250/day free) ✓
│
├─ If 100-250 requests/day
│  └─ Use Gemini + Ollama fallback
│     Gemini for complex → Ollama for simple
│
├─ If > 250 requests/day AND budget exists
│  └─ Upgrade Gemini to paid ($0.0000425/request)
│     Cost: 1,000/day = $0.43/day = $12/month
│
└─ If > 1,000 requests/day
   └─ Hybrid approach:
      - Simple extraction → Ollama (local, free)
      - Complex extraction → Gemini API (paid)
      - Total cost: ~$50/month for Gemini
```

### Decision Tree 3: Storage Strategy

```
Start: How many receipts/month?
│
├─ If < 200 (< 100MB stored)
│  └─ Use Supabase Storage free (1GB) ✓
│     Just compress images moderately
│
├─ If 200-5,000 (100MB-1GB estimated)
│  └─ Use Supabase Storage free + compression
│     - Compress to 75% quality JPEG
│     - Store 200KB per image average
│     - Supports 5,000 receipts in 1GB
│
├─ If 5,000-50,000 (1GB-10GB)
│  └─ Upgrade to Supabase Pro ($25/month)
│     Includes 100GB storage
│
└─ If > 50,000 (>10GB)
   └─ Need Supabase Team ($599/month)
      + dedicated storage plan
```

---

## 3. QUICK SETUP CHECKLIST (Day 1)

### 15-Minute Setup
- [ ] Create Supabase project (3 min)
- [ ] Get Google Gemini API key (2 min)
- [ ] Set up Render.com account for Node.js (3 min)
- [ ] Install Tesseract locally (5 min)
- [ ] Deploy basic API (2 min)

**Time:** ~15 min | **Cost:** $0

### 1-Hour Setup (Add Core Features)
- [ ] Create database schema in Supabase (10 min)
- [ ] Implement receipt upload endpoint (15 min)
- [ ] Wire up Tesseract OCR (15 min)
- [ ] Wire up Gemini extraction (15 min)
- [ ] Test end-to-end (5 min)

**Time:** ~1 hour | **Cost:** $0

### 4-Hour Setup (Full MVP)
- [ ] Add image compression (sharp library) (10 min)
- [ ] Add transaction matching algorithm (30 min)
- [ ] Set up pg-boss job queue (20 min)
- [ ] Add RiteKit logo enrichment (10 min)
- [ ] Set up error handling & retries (30 min)
- [ ] Create monitoring dashboard (20 min)
- [ ] Deploy and test (30 min)

**Time:** ~3-4 hours | **Cost:** $0

---

## 4. COPY-PASTE SETUP SCRIPTS

### Install Everything at Once

```bash
#!/bin/bash

# Create project directory
mkdir document-processing-mvp && cd document-processing-mvp

# Initialize Node.js project
npm init -y

# Install all free dependencies
npm install \
  express \
  dotenv \
  @google/generative-ai \
  @supabase/supabase-js \
  tesseract.js \
  sharp \
  fast-levenshtein \
  pg-boss \
  axios \
  cors

# Create .env file
cat > .env << EOF
GOOGLE_API_KEY=your-key-here
SUPABASE_URL=your-url-here
SUPABASE_ANON_KEY=your-key-here
DATABASE_URL=your-db-url-here
RITEKIT_CLIENT_ID=your-id-here
PORT=3000
EOF

# Create basic file structure
mkdir -p api services jobs public/uploads

# Create main server file
cat > index.js << 'EOF'
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Routes will go here
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

echo "✓ Setup complete! Now:"
echo "1. Update .env with your actual API keys"
echo "2. Run 'node index.js' to start"
echo "3. Create database tables (see README)"
```

### Database Schema Creation

```bash
# Run this in Supabase SQL Editor

CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_url TEXT,
  ocr_text TEXT,
  extracted_data JSONB,
  merchant TEXT,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  transaction_date DATE,
  matched_transaction_id UUID,
  match_confidence DECIMAL(3,2),
  processing_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  merchant_name TEXT,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  transaction_date DATE,
  bank_description TEXT,
  receipt_id UUID REFERENCES receipts(id),
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_receipts_date ON receipts(transaction_date);
CREATE INDEX idx_receipts_user ON receipts(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_merchant_search ON transactions
  USING GIN(to_tsvector('english', merchant_name));
```

---

## 5. API LIMITS CHEAT SHEET

### Daily Limits That Will Affect You

| Service | Limit | Implication | When It Matters |
|---------|-------|-------------|-----------------|
| **Gemini** | 250 req/day | ~250 receipts max/day | Day 1+ of launch |
| **Google Vision** | 1,000/month | ~33/day for 3 months | Free trial period |
| **RiteKit** | 100 credits/month | 17 logo lookups | Only if doing merchant enrichment |
| **Supabase Storage** | 1GB | 2,000-5,000 receipts | ~1-2 months of use |
| **Supabase Bandwidth** | 5GB | ~10,000 small file downloads | ~50 users actively using |
| **Ollama** | Unlimited | None | Only hardware limits |
| **Tesseract** | Unlimited | None | Only hardware limits |

### Before Hitting Limits (How to Prepare)

```javascript
// Add this to your app - monitor quota

async function checkAndReportQuota() {
  const geminiUsage = await db.query(
    'SELECT COUNT(*) FROM api_calls WHERE service = "gemini" AND created_at > NOW() - INTERVAL "1 day"'
  );

  console.log(`Gemini usage today: ${geminiUsage.count}/250`);

  if (geminiUsage.count > 200) {
    console.warn('WARNING: Approaching Gemini daily limit!');
    console.log('Switching to Ollama fallback for remaining requests');
    process.env.USE_OLLAMA_FALLBACK = 'true';
  }
}

// Call this every hour or on every API request
setInterval(checkAndReportQuota, 60 * 60 * 1000);
```

---

## 6. COST CALCULATOR

### How to Estimate Your Monthly Cost

**Formula:**
```
Monthly Cost =
  (Receipts - 250*3) * $0.0000425   [Gemini overage]
  + (Requests - 100) * $0.015       [RiteKit overage]
  + (Storage GB - 1) * $0.15        [Supabase storage]
  + ($25 if Database > 500MB)       [Supabase Pro]
  + (Bandwidth GB - 5) * $0.02      [Supabase bandwidth]
```

### Cost at Different Scales

```
100 receipts/month:   $0
500 receipts/month:   $0.02
1,000 receipts/month: $0.43 (Gemini) + $0 storage = $0.43
2,000 receipts/month: $3.40 (Gemini) + $25 (Pro) = $28.40
5,000 receipts/month: $10.59 (Gemini) + $25 (Pro) = $35.59
10,000 receipts/month: $21.19 (Gemini) + $25 (Pro) + $50 (Vision) = $96+
```

---

## 7. COMMON ISSUES & FIXES

### Issue: Gemini quota exceeded mid-day

**Solution:**
```javascript
// Automatically switch to Ollama
async function extractWithFallback(ocrText) {
  try {
    return await extractWithGemini(ocrText);
  } catch (err) {
    if (err.message.includes('quota')) {
      console.log('Gemini quota hit, using Ollama...');
      return await extractWithOllama(ocrText);
    }
    throw err;
  }
}
```

### Issue: Storage approaching 1GB limit

**Solution:**
```javascript
// Archive old receipts
async function archiveOldReceipts() {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const oldReceipts = await db.query(
    'SELECT * FROM receipts WHERE created_at < $1',
    [oneMonthAgo]
  );

  // Delete image (keep OCR text and extracted data)
  for (const receipt of oldReceipts) {
    await supabase.storage
      .from('receipts')
      .remove([receipt.image_url]);

    await db.query(
      'UPDATE receipts SET image_url = NULL WHERE id = $1',
      [receipt.id]
    );
  }

  console.log(`Archived ${oldReceipts.length} old receipts`);
}
```

### Issue: Tesseract accuracy poor on photo receipts

**Solution:**
```javascript
// Pre-process image before OCR
async function preprocessImage(imagePath) {
  await sharp(imagePath)
    // Resize for better quality
    .resize(1920, 2560, { fit: 'inside', withoutEnlargement: true })
    // Increase contrast
    .normalize()
    // Sharpen
    .sharpen()
    // Convert to high contrast B&W
    .threshold(128)
    .toFile(`${imagePath}-processed.jpg`);

  return `${imagePath}-processed.jpg`;
}
```

### Issue: Matching accuracy below 90%

**Solution:**
```javascript
// Use multi-factor matching
async function smartMatch(receipt, candidates) {
  const matches = [];

  for (const candidate of candidates) {
    let score = 0;

    // Amount match (weight: 40%)
    if (Math.abs(candidate.amount - receipt.total) < 0.01) {
      score += 40;
    } else if (Math.abs(candidate.amount - receipt.total) / receipt.total < 0.05) {
      score += 30;
    }

    // Date match (weight: 30%)
    const dayDiff = Math.abs(
      new Date(candidate.date) - new Date(receipt.date)
    ) / (1000 * 60 * 60 * 24);
    if (dayDiff === 0) score += 30;
    else if (dayDiff <= 1) score += 20;
    else if (dayDiff <= 3) score += 10;

    // Merchant match (weight: 30%)
    const similarity = fuzzyScore(candidate.merchant, receipt.merchant);
    score += similarity * 30;

    matches.push({ candidate, score });
  }

  const best = matches.sort((a, b) => b.score - a.score)[0];
  return best && best.score > 75 ? best.candidate : null;
}
```

---

## 8. SCALING PATH (If Successful)

### Month 1: All Free
- Tesseract OCR
- Gemini extraction (250/day limit)
- Supabase Storage (1GB)
- Supabase Database (free tier)
- No vendor enrichment

### Month 2-3: Add Paid Tier
- Keep Tesseract + Gemini
- Add Supabase Pro ($25/month)
  - Database: 8GB
  - Storage: 100GB
  - Better performance
- Add RiteKit paid ($99/month) - *only if logo enrichment critical*

### Month 4+: Scale Infrastructure
- AWS S3 or CloudFront for storage ($0.02/GB bandwidth)
- Upgrade to Claude API if needed ($0.003/1K tokens)
- Add ElasticSearch if search critical ($500+/month)
- Set up dedicated ML for matching (~$200-500/month)

---

## 9. ONE-PAGE ARCHITECTURE DIAGRAM

```
┌──────────────────────────────────────────────────────────────┐
│                     REACT FRONTEND                           │
│                  (Vercel/Netlify FREE)                       │
└─────────────────────────────┬─────────────────────────────────┘
                              │
                              ↓
┌──────────────────────────────────────────────────────────────┐
│              Node.js Express API (Render.com FREE)          │
│  /api/upload     /api/upload      /api/transactions         │
└──────────┬──────────────┬──────────────┬─────────────────────┘
           │              │              │
           ↓              ↓              ↓
    ┌─────────────┐ ┌──────────────┐ ┌──────────────┐
    │   COMPRESS  │ │   OCR        │ │   MATCHING   │
    │  (sharp)    │ │(Tesseract)   │ │(PostgreSQL)  │
    │    FREE     │ │    FREE      │ │    FREE      │
    └────┬────────┘ └──────┬───────┘ └──────┬───────┘
         │                 │                 │
         └─────────┬───────┴─────────┬───────┘
                   ↓                 ↓
          ┌──────────────────────────────────┐
          │    SUPABASE PostgreSQL (FREE)    │
          │  - Database (500MB)              │
          │  - Storage (1GB)                 │
          │  - Auth                          │
          └──────────────────────────────────┘
                   │
         ┌─────────┴──────────┐
         ↓                    ↓
    ┌─────────────────┐  ┌──────────────────┐
    │  EXTRACTION     │  │  JOB QUEUE       │
    │ (Gemini API)    │  │  (pg-boss)       │
    │ 250/day FREE    │  │  FREE            │
    └─────────────────┘  └──────────────────┘
         │
         ↓
    ┌─────────────────┐
    │  ENRICHMENT     │
    │ (RiteKit API)   │
    │ 100/mo FREE     │
    └─────────────────┘
```

---

## 10. SUCCESS CRITERIA FOR LAUNCH

- [ ] End-to-end receipt processing works (OCR → extraction → matching)
- [ ] Average accuracy > 85% on 50 test receipts
- [ ] Processing time < 30 seconds per receipt
- [ ] Zero cost per receipt when under free tier limits
- [ ] Graceful fallback when APIs exhausted
- [ ] Database schema optimized with proper indexes
- [ ] Error handling for network failures
- [ ] Monitoring for free tier usage
- [ ] User documentation on limits
- [ ] Upgrade path clearly documented

---

## Recommended Order of Implementation

1. **Day 1:** Tesseract + Supabase setup
2. **Day 2:** Gemini integration
3. **Day 3:** Transaction matching
4. **Day 4:** Image compression
5. **Day 5:** Job queue (pg-boss)
6. **Day 6:** Logo enrichment (RiteKit)
7. **Day 7:** Error handling + testing

**Total:** 1 week to MVP, $0 cost, unlimited potential

