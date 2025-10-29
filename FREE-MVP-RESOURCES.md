# Complete Resource Links and Setup Guide

---

## QUICK LINKS SUMMARY

### Core Services (Must Set Up)
1. **Supabase** - PostgreSQL database + storage
2. **Google Gemini API** - LLM for data extraction
3. **Tesseract.js** - OCR (npm package)
4. **Render.com** - Free Node.js hosting

### Optional Services
5. **Ollama** - Self-hosted LLM (fallback)
6. **RiteKit** - Logo enrichment

---

## 1. SETUP CHECKLIST WITH DIRECT LINKS

### Step 1: Create Supabase Project (3 minutes)
**Link:** https://supabase.com

```
1. Click "Start your project"
2. Sign up with GitHub or email
3. Create new project
4. Wait for database provisioning (~2 min)
5. Go to Settings → Database to get connection URL
```

**What you'll get:**
- PostgreSQL database (free 500MB)
- Storage bucket (free 1GB)
- Auth system (free)
- API keys

**Copy these to .env:**
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxx...
DATABASE_URL=postgresql://postgres:xxxxx@db.xxxxx.supabase.co:5432/postgres
```

---

### Step 2: Get Google Gemini API Key (2 minutes)
**Link:** https://ai.google.dev

```
1. Click "Get API key" button (top right)
2. Click "Create API key in new Google Cloud project"
3. Wait for project creation
4. Copy API key
5. Paste into .env
```

**What you'll get:**
- Unlimited free API key
- 250 requests/day to Gemini 2.5 Flash
- Full documentation

**Copy to .env:**
```
GOOGLE_API_KEY=AIzaSyDxxxx...
```

---

### Step 3: Set Up Node.js Hosting (3 minutes)
**Link:** https://render.com

```
1. Sign up with GitHub account
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Set name to "document-processing-mvp"
5. Set start command to "npm start"
6. Add environment variables from .env
7. Click "Create Web Service"
```

**What you'll get:**
- Free Tier: 750 hours/month (always on is limited)
- Custom domain
- Automatic deploys on push

**Alternative Hosts:**
- Vercel: https://vercel.com (better for Next.js)
- Fly.io: https://fly.io (good for full apps)
- Railway: https://railway.app (generous free tier)

---

### Step 4: Install Tesseract Locally (5 minutes)
**Link:** https://github.com/UB-Mannheim/tesseract/wiki

**macOS:**
```bash
brew install tesseract
```

**Ubuntu/Debian:**
```bash
sudo apt-get install tesseract-ocr
```

**Windows:**
Download installer: https://github.com/UB-Mannheim/tesseract/wiki/Downloads

**Verify installation:**
```bash
tesseract --version
```

---

### Step 5 (OPTIONAL): Install Ollama for Fallback (5 minutes)
**Link:** https://ollama.ai

```
1. Download from https://ollama.ai/download
2. Install (follow platform-specific instructions)
3. Run: ollama serve
4. In new terminal: ollama pull neural-chat
5. Test: curl -X POST http://localhost:11434/api/generate -d '{"model":"neural-chat","prompt":"Hello"}'
```

**Download Links:**
- macOS: https://ollama.ai/download/Ollama-darwin.zip
- Linux: https://ollama.ai/install/linux
- Windows: https://ollama.ai/download/OllamaSetup.exe

---

### Step 6 (OPTIONAL): RiteKit Logo API (1 minute)
**Link:** https://ritekit.com/app/dashboard

```
1. Sign up free at ritekit.com
2. Go to Dashboard → API
3. Copy Client ID
4. Paste into .env as RITEKIT_CLIENT_ID
```

**Get:** 100 free credits/month = ~17 logo requests

---

## 2. DOCUMENTATION LINKS BY TECHNOLOGY

### OCR & Document Processing
- **Tesseract.js Docs:** https://github.com/naptha/tesseract.js
- **Sharp Image Processing:** https://sharp.pixelplumbing.com/
- **Google Cloud Vision:** https://cloud.google.com/vision/docs
- **AWS Textract:** https://docs.aws.amazon.com/textract/
- **PDF.js Extraction:** https://github.com/mozilla/pdf.js

### LLM APIs
- **Google Gemini API:** https://ai.google.dev/tutorials
- **Gemini API Reference:** https://ai.google.dev/api/rest
- **Ollama Documentation:** https://ollama.ai/library
- **OpenAI API:** https://platform.openai.com/docs
- **Claude API:** https://docs.anthropic.com

### Database & Storage
- **Supabase Docs:** https://supabase.com/docs
- **Supabase Storage:** https://supabase.com/docs/guides/storage
- **PostgreSQL Full Text Search:** https://www.postgresql.org/docs/current/textsearch.html
- **pg-boss Documentation:** https://github.com/timgit/pg-boss
- **Supabase SQL Reference:** https://supabase.com/docs/reference/sql

### Deployment
- **Render Deployment:** https://render.com/docs
- **Vercel Deployment:** https://vercel.com/docs
- **Fly.io Deployment:** https://fly.io/docs/
- **Docker Basics:** https://docs.docker.com/get-started/

### Node.js Libraries
- **Express.js:** https://expressjs.com/
- **Axios HTTP Client:** https://axios-http.com/
- **Multer File Upload:** https://github.com/expressjs/multer
- **dotenv:** https://github.com/motdotla/dotenv
- **Levenshtein Distance:** https://github.com/fastest-levenshtein/fastest-levenshtein

---

## 3. COMPARISON RESOURCES

### OCR Comparison
- **2025 OCR Benchmark:** https://research.aimultiple.com/ocr-accuracy/
- **klearstack OCR Comparison:** https://klearstack.com/ocr-software-comparison
- **Tesseract vs Cloud Services:** https://ricciuti-federico.medium.com/how-to-compare-ocr-tools
- **Invoice Processing Benchmark:** https://www.businesswaretech.com/blog/research-best-ai-services-for-automatic-invoice-processing

### LLM Comparison
- **Free LLM Resources:** https://github.com/cheahjs/free-llm-api-resources
- **LLM Cost Analysis 2025:** https://ashah007.medium.com/navigating-the-llm-cost-maze-a-q2-2025-pricing-and-limits-analysis-80e9c832ef39
- **Free AI APIs Guide:** https://madappgang.com/blog/best-free-ai-apis-for-2025-build-with-llms-without/
- **Hugging Face Models:** https://huggingface.co/models

### Job Queue Comparison
- **pg-boss vs Bull vs Agenda:** https://npm-compare.com/agenda,bull,kue,pg-boss
- **pg-boss GitHub Issues:** https://github.com/timgit/pg-boss/issues/94
- **Job Queue Comparison:** https://talent500.com/blog/nodejs-job-queue-postgresql-pg-boss/

### Transaction Matching
- **Fuzzy Matching Overview:** https://www.koncile.ai/en/ressources/fuzzy-matching-definition-uses
- **Midday Reconciliation Engine:** https://midday.ai/updates/automatic-reconciliation-engine/
- **Transaction Matching Platforms:** https://reconcileos.com/blog/transaction-matching-platform-uae-guide

### PostgreSQL vs Elasticsearch
- **ParadeDB Comparison:** https://www.paradedb.com/blog/elasticsearch_vs_postgres
- **Neon Full Text Search:** https://neon.com/blog/postgres-full-text-search-vs-elasticsearch
- **Blog Post:** https://blog.blockost.com/why-we-replaced-elasticsearch-with-postgres-full-text-search

---

## 4. USEFUL GITHUB REPOS

### OCR & Receipt Processing
- **Receipt OCR NER:** https://github.com/pilarcode/receipt-ocr
- **ICDAR 2019 Receipt OCR:** https://github.com/chawla201/Custom-Named-Entity-Recognition
- **PDF.js Extract:** https://github.com/ffalt/pdf.js-extract
- **unpdf:** https://github.com/unjs/unpdf
- **pdf2json:** https://github.com/modesty/pdf2json

### NLP & Entity Extraction
- **spaCy NLP:** https://github.com/explosion/spaCy
- **Hugging Face Transformers:** https://github.com/huggingface/transformers
- **Stanford NLP:** https://github.com/stanfordnlp/CoreNLP
- **NLTK:** https://github.com/nltk/nltk

### Data Matching
- **Dedupe Library:** https://github.com/dedupeio/dedupe
- **Data Matching Software List:** https://github.com/J535D165/data-matching-software
- **Splink (Record Linkage):** https://github.com/moj-analytical-services/splink

### Job Queues
- **pg-boss:** https://github.com/timgit/pg-boss
- **BullMQ:** https://github.com/taskforcesh/bullmq
- **Agenda:** https://github.com/agenda/agenda

### Open Source Alternatives
- **Ollama:** https://github.com/ollama/ollama
- **Open WebUI:** https://github.com/open-webui/open-webui
- **LM Studio:** https://github.com/lmstudio-ai/lmstudio
- **AnythingLLM:** https://github.com/Mintplex-Labs/anything-llm

---

## 5. COMMUNITY & SUPPORT

### Official Communities
- **Supabase Discord:** https://discord.supabase.com
- **Ollama Discord:** https://discord.gg/ollama
- **Tesseract Issues:** https://github.com/naptha/tesseract.js/issues
- **pg-boss Issues:** https://github.com/timgit/pg-boss/issues
- **Express.js Discussions:** https://github.com/expressjs/express/discussions

### Q&A Sites
- **Stack Overflow Tags:**
  - `tesseract.js`: https://stackoverflow.com/questions/tagged/tesseract.js
  - `supabase`: https://stackoverflow.com/questions/tagged/supabase
  - `postgresql`: https://stackoverflow.com/questions/tagged/postgresql
  - `node.js`: https://stackoverflow.com/questions/tagged/node.js

- **Reddit Communities:**
  - r/node: https://reddit.com/r/node/
  - r/PostgreSQL: https://reddit.com/r/PostgreSQL/
  - r/MachineLearning: https://reddit.com/r/MachineLearning/

### Blogs & Tutorials
- **n8n Blog:** https://blog.n8n.io/ (automation & LLM tutorials)
- **Neon Blog:** https://neon.com/blog/ (PostgreSQL tutorials)
- **Strapi Blog:** https://strapi.io/blog/ (Node.js tutorials)
- **Dev.to:** https://dev.to/ (community tutorials)

---

## 6. PRICING PAGES (FOR REFERENCE)

### Always-Free Services
- **Supabase Pricing:** https://supabase.com/pricing
- **Render Pricing:** https://render.com/pricing
- **Vercel Pricing:** https://vercel.com/pricing
- **Google Gemini API Pricing:** https://ai.google.dev/pricing
- **Ollama:** Free (self-hosted)
- **Tesseract:** Free (open source)

### Time-Limited Free Tiers
- **Google Cloud Vision:** https://cloud.google.com/vision/pricing
- **AWS Textract:** https://aws.amazon.com/textract/pricing/
- **Azure Computer Vision:** https://azure.microsoft.com/en-us/pricing/details/cognitive-services/computer-vision/

### Optional Paid Services
- **RiteKit Pricing:** https://ritekit.com/pricing
- **Brandfetch Pricing:** https://brandfetch.com/pricing
- **OpenAI Pricing:** https://openai.com/pricing
- **Claude API Pricing:** https://www.anthropic.com/pricing

---

## 7. TROUBLESHOOTING RESOURCES

### Common Issues

#### Tesseract Issues
- **Installation troubleshooting:** https://github.com/naptha/tesseract.js/wiki
- **macOS M1/M2 issues:** https://stackoverflow.com/questions/tagged/tesseract.js+m1
- **Low accuracy:** https://github.com/naptha/tesseract.js/issues/496

#### Supabase Issues
- **Connection errors:** https://supabase.com/docs/guides/database/connecting-to-postgres
- **RLS problems:** https://supabase.com/docs/guides/auth/row-level-security
- **Storage limits:** https://supabase.com/docs/guides/storage/uploads/file-limits

#### Gemini API Issues
- **Rate limit handling:** https://ai.google.dev/tutorials/rate_limit
- **Error codes:** https://ai.google.dev/tutorials/rest_quickstart
- **Quota exceeded:** https://ai.google.dev/tutorials/quota_guide

#### Ollama Issues
- **Download problems:** https://github.com/ollama/ollama/issues
- **CUDA setup:** https://github.com/ollama/ollama/blob/main/docs/gpu.md
- **Memory issues:** https://github.com/ollama/ollama/issues/1234

### Performance Tuning
- **PostgreSQL Optimization:** https://www.postgresql.org/docs/current/performance.html
- **Node.js Performance:** https://nodejs.org/en/docs/guides/nodejs-performance-hooks/
- **Image Optimization:** https://sharp.pixelplumbing.com/api-output

---

## 8. CHEAT SHEETS & QUICK REFS

### Command Line Cheat Sheets
```bash
# npm commands
npm init -y                    # Initialize project
npm install [package]          # Install package
npm update                     # Update dependencies
npm run [script]               # Run script from package.json

# git commands
git init                       # Initialize repo
git add .                      # Stage all files
git commit -m "message"        # Commit with message
git push origin main           # Push to main branch

# PostgreSQL
psql -U postgres -d [dbname]  # Connect to database
\dt                           # List tables
\d [table]                    # Describe table
SELECT * FROM [table];        # Query table
```

### API Request Examples
```bash
# Test API health
curl http://localhost:3000/health

# Upload receipt
curl -X POST http://localhost:3000/api/upload-receipt \
  -F "receipt=@receipt.jpg" \
  -F "userId=user-123"

# Check job status
curl http://localhost:3000/api/job/[jobId]

# Get receipts
curl http://localhost:3000/api/receipts/user-123

# Get matches
curl http://localhost:3000/api/matches/receipt-id
```

### SQL Snippets
```sql
-- Check table sizes
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Count API calls today
SELECT service, COUNT(*) as count
FROM api_calls
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY service;

-- Find unmatched receipts
SELECT id, merchant, amount, created_at
FROM receipts
WHERE matched_transaction_id IS NULL
  AND processing_status = 'completed'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 9. TIME ESTIMATES

| Task | Time | Links |
|------|------|-------|
| Create Supabase account | 3 min | https://supabase.com |
| Get Gemini API key | 2 min | https://ai.google.dev |
| Set up Render hosting | 3 min | https://render.com |
| Install Tesseract | 5 min | https://github.com/UB-Mannheim/tesseract/wiki |
| Install Ollama (optional) | 5 min | https://ollama.ai |
| Deploy first API | 10 min | https://render.com/docs |
| Set up database schema | 10 min | See DB setup section |
| Implement OCR integration | 20 min | See code examples |
| Implement Gemini extraction | 15 min | See code examples |
| Implement transaction matching | 30 min | See code examples |
| Testing & debugging | 30 min | - |
| **TOTAL MVP** | **~2 hours** | - |

---

## 10. MONTHLY COST CALCULATOR

Use this to estimate your actual costs:

```
Monthly Cost =
  IF (receipts > 250*3) THEN (receipts - 750) * $0.0000425 ELSE 0
  + IF (storage > 1GB) THEN (storage_gb - 1) * $0.15 ELSE 0
  + IF (database > 500MB) THEN $25 ELSE 0
  + IF (logo_requests > 100) THEN (logo_requests - 100) / 6 * $99 / 16666 ELSE 0
```

**Examples:**
```
100 receipts/month:    $0
500 receipts/month:    $0.02
1,000 receipts/month:  $0.43
2,000 receipts/month:  $28.40 (Supabase Pro)
5,000 receipts/month:  $35.59
10,000 receipts/month: $96.19 + hosting
```

---

## 11. FINAL CHECKLIST BEFORE LAUNCH

- [ ] All environment variables set in .env
- [ ] Supabase project created and DB schema applied
- [ ] Tesseract installed and tested locally
- [ ] Gemini API key working and quota verified
- [ ] Render.com project connected to GitHub
- [ ] Database connection string tested
- [ ] Storage bucket created in Supabase
- [ ] Image compression working (sharp)
- [ ] OCR endpoint tested
- [ ] Extraction endpoint tested
- [ ] Matching algorithm implemented
- [ ] Job queue initialized and tested
- [ ] Error handling in place
- [ ] API rate limiting monitored
- [ ] Monitoring/logging in place
- [ ] Documentation complete

---

## QUICK START (Copy-Paste)

```bash
# 1. Clone or create project
git clone [your-repo] && cd document-processing-mvp

# 2. Install dependencies
npm install

# 3. Create .env (fill in your values from links above)
echo "GOOGLE_API_KEY=..." > .env
echo "SUPABASE_URL=..." >> .env
echo "SUPABASE_ANON_KEY=..." >> .env
echo "DATABASE_URL=..." >> .env

# 4. Set up database
npm run setup:db

# 5. Start server
npm start

# 6. Test
curl http://localhost:3000/health

# 7. Deploy to Render
git push render main
```

---

**Everything you need is linked above. Start with Step 1 and follow the checklist!**

