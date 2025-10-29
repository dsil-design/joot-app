# Cost Calculator: Zero-Cost MVP to Scale

## Interactive Cost Estimator

Use this guide to estimate when you need to upgrade and how much it will cost.

---

## Free Tier Capacity Calculator

### Input Your Expected Usage

```
USER INPUTS:
- Number of active users: ___
- Documents per user per month: ___
- Average document size (KB): ___
- Transactions per user per month: ___

CALCULATED OUTPUTS:
- Total documents/month: users × docs/user
- Total storage needed (MB): total_docs × avg_size / 1024
- LLM requests/month: total_docs
- Database size (MB): users × 10 MB (baseline) + transactions × 0.01 MB
```

### Example Scenarios

#### Scenario A: Personal Use (1 user)
```
Input:
- Active users: 1
- Documents/user/month: 50
- Avg document size: 500 KB
- Transactions/user/month: 100

Output:
- Total documents: 50/month
- Storage needed: 25 MB/month (cumulative: 300 MB/year)
- LLM requests: 50/month (3% of daily limit)
- Database size: ~15 MB

Verdict: FREE FOREVER ✓
```

#### Scenario B: Small Team (10 users)
```
Input:
- Active users: 10
- Documents/user/month: 20
- Avg document size: 500 KB
- Transactions/user/month: 50

Output:
- Total documents: 200/month
- Storage needed: 100 MB/month (cumulative: 1.2 GB/year) ⚠️
- LLM requests: 200/month (13% of daily limit)
- Database size: ~150 MB

Verdict: FREE FOR 6-8 MONTHS, then need cleanup or upgrade
Storage will hit 1GB limit after ~10 months
```

#### Scenario C: Freelancer Accountant (50 clients)
```
Input:
- Active users: 50
- Documents/user/month: 10
- Avg document size: 500 KB
- Transactions/user/month: 30

Output:
- Total documents: 500/month
- Storage needed: 250 MB/month (hits 1GB in 4 months) ⚠️
- LLM requests: 500/month (33% of daily limit)
- Database size: ~400 MB (80% of limit) ⚠️

Verdict: FREE FOR 3-4 MONTHS, then must upgrade
First bottleneck: File storage (1GB)
Second bottleneck: Database storage (500MB)

Recommended upgrade: Supabase Pro ($25/month)
```

#### Scenario D: Small Business (100 users)
```
Input:
- Active users: 100
- Documents/user/month: 15
- Avg document size: 500 KB
- Transactions/user/month: 40

Output:
- Total documents: 1,500/month
- Storage needed: 750 MB/month (exceeds 1GB in month 2) ⚠️
- LLM requests: 1,500/month (100% of daily limit) ⚠️
- Database size: ~1 GB (exceeds limit immediately) ⚠️

Verdict: CANNOT USE FREE TIER
Must start with paid plan immediately

Recommended stack:
- Supabase Pro: $25/month
- Gemini Pay-as-you-go: ~$5/month
- Total: $30/month
```

---

## Detailed Cost Breakdown by Tier

### Tier 0: Free Forever (MVP)

```
SERVICES:
- Supabase Free: $0
  * 500 MB database
  * 1 GB file storage
  * 2 GB bandwidth (DB)
  * 50k auth users

- Vercel Hobby: $0
  * 100 GB bandwidth
  * 100 serverless function hours
  * Unlimited deployments

- Tesseract.js: $0
  * Unlimited OCR (self-hosted)

- Google Gemini Free: $0
  * 1,500 requests/day
  * 15 requests/minute

- DuckDuckGo/Google: $0
  * Unlimited logo fetches

TOTAL: $0/month

CAPACITY:
- Users: 10-50 (depending on usage)
- Documents: 100-500/month
- Transactions: 1,000-5,000/month
- Storage: 1 GB (cumulative)
- Processing: 50 docs/day max

LIMITATIONS:
- Must implement aggressive cleanup
- Slow processing (1 doc/minute)
- No backups
- No priority support
- Limited to 500MB DB

WHEN TO UPGRADE:
- Database > 400 MB (80% full)
- Storage > 800 MB (80% full)
- LLM requests > 1,200/day (80% of limit)
- User complaints about slow processing
```

### Tier 1: Bootstrap Startup ($25-50/month)

```
SERVICES:
- Supabase Pro: $25/month
  * 8 GB database (16x more)
  * 50 GB file storage (50x more)
  * 250 GB bandwidth (125x more)
  * Daily backups
  * 7-day point-in-time recovery

- Vercel Hobby: $0 (still free)
  * 100 GB bandwidth
  * Enough for this tier

- Tesseract.js: $0 (still free)

- Google Gemini Pay-as-you-go: ~$10-20/month
  * No rate limits
  * ~$0.00035 per request
  * 30,000 requests = $10.50
  * 50,000 requests = $17.50

- Logos: $0 (still free)

TOTAL: $35-45/month

CAPACITY:
- Users: 50-200
- Documents: 500-2,000/month
- Transactions: 5,000-20,000/month
- Storage: 50 GB (cumulative)
- Processing: Unlimited (pay-as-you-go)

IMPROVEMENTS:
- 16x more database capacity
- 50x more file storage
- Automated daily backups
- No LLM rate limits
- Faster processing possible

WHEN TO UPGRADE:
- Users > 200
- Database > 6 GB (75% full)
- Bandwidth > 80 GB/month
- Need better support
```

### Tier 2: Growing Business ($100-200/month)

```
SERVICES:
- Supabase Pro: $25/month (same)

- Vercel Pro: $20/month
  * 1 TB bandwidth (10x more)
  * 1M serverless function hours
  * Advanced analytics
  * Password protection
  * Better performance

- Cloudflare R2: ~$15-30/month
  * Store old documents in cheaper storage
  * $0.015/GB storage (30% cheaper than Supabase)
  * Free egress bandwidth
  * 1,000 GB = $15/month
  * 2,000 GB = $30/month

- Google Gemini: ~$50-100/month
  * 150,000-300,000 requests/month
  * $0.00035 per request
  * 150k = $52.50
  * 300k = $105

- Cloudflare Pro: $20/month
  * Better CDN
  * DDoS protection
  * Image optimization
  * Cache everything

- SendGrid Essentials: $20/month
  * 50k emails/month
  * Professional notifications

TOTAL: $150-215/month

CAPACITY:
- Users: 200-1,000
- Documents: 2,000-10,000/month
- Transactions: 20,000-100,000/month
- Storage: Unlimited (pay-as-you-go)
- Processing: Fast, unlimited

IMPROVEMENTS:
- Much faster performance
- Professional email
- Better caching & CDN
- Cheaper long-term storage
- Better analytics

WHEN TO UPGRADE:
- Users > 1,000
- Need better reliability
- Want team features
- Need compliance (SOC2, etc.)
```

### Tier 3: Scale ($500-2,000/month)

```
SERVICES:
- Supabase Team: $599/month
  * 100 GB database
  * Point-in-time recovery (28 days)
  * Read replicas
  * Dedicated support
  * SOC2 compliance

  OR: Self-hosted PostgreSQL
  * DigitalOcean: $240/month (8CPU, 16GB)
  * AWS RDS: $300-500/month

- Vercel Pro/Enterprise: $20-500/month
  * Depends on traffic
  * Enterprise: Custom pricing

- Cloudflare R2: ~$30-100/month
  * 2-6 TB storage
  * Free bandwidth

- OpenAI Batch API: ~$100-500/month
  * Switch from Gemini for better quality
  * Or self-host Llama 3.2 (free but need GPU)

- Cloudflare Pro: $20/month

- SendGrid Pro: $90/month
  * 100k emails/month

- Sentry: $26/month
  * Error tracking
  * Performance monitoring

- PagerDuty: $21/month
  * On-call alerts
  * Incident management

TOTAL: $700-1,800/month

CAPACITY:
- Users: 1,000-10,000
- Documents: 10,000-100,000/month
- Transactions: 100,000-1,000,000/month
- Storage: Unlimited
- Processing: Very fast, unlimited

IMPROVEMENTS:
- Enterprise-grade reliability
- 99.9% uptime SLA
- Dedicated support
- Compliance certifications
- Advanced monitoring
```

---

## Upgrade Decision Tree

```
START HERE
    |
    v
[How many active users?]
    |
    ├─ < 50 users
    |   └─> Stay FREE ✓
    |
    ├─ 50-200 users
    |   └─> Upgrade to Tier 1 ($35/month)
    |
    ├─ 200-1,000 users
    |   └─> Upgrade to Tier 2 ($150/month)
    |
    └─ > 1,000 users
        └─> Upgrade to Tier 3 ($700/month)


ALTERNATIVE PATH: BY CONSTRAINT

[What's your bottleneck?]
    |
    ├─ Database storage (500MB full)
    |   └─> Upgrade Supabase to Pro ($25/month)
    |
    ├─ File storage (1GB full)
    |   ├─> Upgrade Supabase to Pro ($25/month)
    |   └─> OR: Add Cloudflare R2 ($15/month)
    |
    ├─ LLM rate limits (1,500/day exceeded)
    |   └─> Upgrade to Gemini pay-as-you-go (~$10/month)
    |
    ├─ Bandwidth (100GB Vercel exceeded)
    |   └─> Upgrade to Vercel Pro ($20/month)
    |
    └─ Processing too slow
        └─> Upgrade to Gemini pay-as-you-go (remove limits)
```

---

## Revenue Model Calculator

### Freemium Model

```
PRICING TIERS:
1. Free: 10 documents/month
   - Perfect for trying the product
   - Stays within free tier costs

2. Starter: $5/month for 100 documents
   - Most hobbyists and freelancers
   - Covers infrastructure costs

3. Pro: $15/month for unlimited documents
   - Small businesses
   - Generates profit margin

4. Business: $50/month for team features
   - Multiple users, API access
   - High profit margin
```

### Break-Even Analysis

```
SCENARIO A: 100 Users
--------------------
Free tier: 60 users × $0 = $0
Starter: 30 users × $5 = $150
Pro: 10 users × $15 = $150
Total revenue: $300/month

Infrastructure costs:
- Supabase Pro: $25
- Gemini API: $30
- Vercel: $0 (still free)
Total costs: $55/month

Profit: $245/month ✓
Profit margin: 82%


SCENARIO B: 500 Users
---------------------
Free tier: 250 users × $0 = $0
Starter: 150 users × $5 = $750
Pro: 80 users × $15 = $1,200
Business: 20 users × $50 = $1,000
Total revenue: $2,950/month

Infrastructure costs:
- Supabase Pro: $25
- Vercel Pro: $20
- Gemini API: $100
- Cloudflare R2: $30
- SendGrid: $20
Total costs: $195/month

Profit: $2,755/month ✓
Profit margin: 93%


SCENARIO C: 2,000 Users
-----------------------
Free tier: 800 users × $0 = $0
Starter: 600 users × $5 = $3,000
Pro: 400 users × $15 = $6,000
Business: 200 users × $50 = $10,000
Total revenue: $19,000/month

Infrastructure costs:
- Supabase Team: $599
- Vercel Pro: $50
- Gemini API: $500
- Cloudflare R2: $100
- SendGrid Pro: $90
- Sentry: $26
Total costs: $1,365/month

Profit: $17,635/month ✓
Profit margin: 93%

Annual recurring revenue: $228k
```

### Conversion Rate Assumptions

```
TYPICAL SAAS CONVERSION RATES:

Free → Paid: 2-5%
- If you have 1,000 free users
- Expect 20-50 to convert to paid

Starter → Pro: 10-20%
- If you have 100 Starter users
- Expect 10-20 to upgrade to Pro

Pro → Business: 5-10%
- If you have 50 Pro users
- Expect 2-5 to upgrade to Business
```

### Customer Lifetime Value (LTV)

```
AVERAGE CUSTOMER:

Starter ($5/month):
- Average retention: 12 months
- LTV = $5 × 12 = $60
- Cost to acquire: < $30 (50% margin)

Pro ($15/month):
- Average retention: 18 months
- LTV = $15 × 18 = $270
- Cost to acquire: < $100 (63% margin)

Business ($50/month):
- Average retention: 24 months
- LTV = $50 × 24 = $1,200
- Cost to acquire: < $400 (67% margin)
```

---

## Cost Optimization Strategies

### Strategy 1: Smart Storage Tiering

```
IMPLEMENTATION:
- Recent files (< 30 days): Supabase Storage (fast access)
- Old files (30-365 days): Cloudflare R2 (cheap, slower)
- Archived (> 1 year): Glacier (very cheap, very slow)

COST SAVINGS:
- Supabase Storage: $0.021/GB/month
- Cloudflare R2: $0.015/GB/month (29% cheaper)
- AWS Glacier: $0.004/GB/month (81% cheaper)

Example: 1TB of data
- All in Supabase: $21/month
- Tiered (30d/11m): $5 + $12 = $17/month (19% savings)
- Tiered with Glacier: $5 + $8 + $4 = $17/month (43% savings)
```

### Strategy 2: Batch Processing

```
IMPLEMENTATION:
- Don't process documents immediately
- Batch process during off-peak hours
- Use OpenAI Batch API (50% cheaper)

COST SAVINGS:
- Real-time: $0.00035/request
- Batch: $0.000175/request (50% savings)

Example: 10,000 requests/month
- Real-time: $3.50/month
- Batch: $1.75/month
- Savings: $1.75/month (50%)
```

### Strategy 3: Aggressive Compression

```
IMPLEMENTATION:
- Compress images to 80% quality
- Generate tiny thumbnails (50KB each)
- Delete originals after 90 days

STORAGE SAVINGS:
- Original: 500 KB
- Compressed: 200 KB (60% reduction)
- Thumbnail: 50 KB (90% reduction)

Example: 1,000 documents
- Original: 500 MB
- With compression: 200 MB (60% savings)
- After cleanup (thumbnails only): 50 MB (90% savings)
```

### Strategy 4: Lazy Loading

```
IMPLEMENTATION:
- Don't fetch logos until needed
- Don't run OCR until user confirms
- Cache everything forever

API CALL REDUCTION:
- Eager: 100% of potential calls
- Lazy: ~30% of potential calls (70% reduction)

Example: 1,000 documents uploaded
- Eager: 1,000 LLM calls ($0.35)
- Lazy: 300 LLM calls ($0.11) - 69% savings
```

### Strategy 5: Multi-Tenancy

```
IMPLEMENTATION:
- Share infrastructure across users
- Use PostgreSQL row-level security
- Single deployment for all users

COST SAVINGS:
- Per-user infrastructure: $10/user/month
- Shared infrastructure: $0.50/user/month (95% savings)

Example: 100 users
- Isolated: $1,000/month
- Shared: $50/month
- Savings: $950/month (95%)
```

---

## Monthly Cost Tracking Template

```
COPY THIS TEMPLATE TO SPREADSHEET:

Month: ___________
Date: ___________

USAGE METRICS:
[ ] Active users: ___
[ ] New documents: ___
[ ] Total storage (GB): ___
[ ] Database size (MB): ___
[ ] LLM requests: ___
[ ] Bandwidth (GB): ___

COSTS:
[ ] Supabase: $___
[ ] Vercel: $___
[ ] Gemini API: $___
[ ] Cloudflare: $___
[ ] Other: $___
Total: $___

REVENUE:
[ ] Free users: ___
[ ] Starter users: ___ × $5 = $___
[ ] Pro users: ___ × $15 = $___
[ ] Business users: ___ × $50 = $___
Total: $___

PROFIT:
Revenue - Costs = $___
Profit margin: ___%

CAPACITY WARNINGS:
[ ] Database > 80%: ___
[ ] Storage > 80%: ___
[ ] LLM > 80%: ___
[ ] Bandwidth > 80%: ___

ACTIONS NEEDED:
[ ] Upgrade database?
[ ] Enable cleanup?
[ ] Increase prices?
[ ] Add new tier?
```

---

## Quick Reference: When to Upgrade

```
UPGRADE TRIGGERS:

Database Storage (500MB limit):
⚠️ 400 MB (80%) = Start planning
🔴 450 MB (90%) = Upgrade within 7 days
🚨 490 MB (98%) = Upgrade immediately

File Storage (1GB limit):
⚠️ 800 MB (80%) = Enable cleanup
🔴 900 MB (90%) = Upgrade within 7 days
🚨 990 MB (99%) = Upgrade immediately

LLM Requests (1,500/day limit):
⚠️ 1,200/day (80%) = Enable queuing
🔴 1,350/day (90%) = Upgrade within 24 hours
🚨 1,500/day (100%) = Upgrade immediately

Bandwidth (100GB/month limit):
⚠️ 80 GB (80%) = Enable caching
🔴 90 GB (90%) = Upgrade next month
🚨 95 GB (95%) = Upgrade immediately
```

---

## Summary: Total Cost of Ownership

```
FIRST YEAR PROJECTION:

Months 1-3 (MVP Phase):
- Cost: $0/month
- Users: 1-20
- Focus: Build & validate

Months 4-6 (Growth Phase):
- Cost: $35/month (Supabase Pro + Gemini)
- Users: 20-100
- Focus: Acquire users, improve product

Months 7-9 (Scale Phase):
- Cost: $150/month (Add Vercel Pro, R2, etc.)
- Users: 100-500
- Revenue: $1,000-2,000/month
- Profit: $850-1,850/month

Months 10-12 (Optimization Phase):
- Cost: $200/month (Optimize infrastructure)
- Users: 500-1,000
- Revenue: $2,500-5,000/month
- Profit: $2,300-4,800/month

FIRST YEAR TOTAL:
- Total costs: ~$1,500
- Total revenue: ~$25,000 (if monetized)
- Net profit: ~$23,500
- ROI: 1,567%

BREAK-EVEN POINT:
With just 20 paying users ($5 Starter tier),
you cover all infrastructure costs.
```

**Use this calculator to plan your infrastructure budget and pricing strategy!**
