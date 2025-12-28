---
name: import-transactions
description: Bulk import transactions from credit card statements, bank transfers, and receipt emails into Joot. Use when processing Chase statements, K PLUS bank transfers, Grab receipts, or any transaction data that needs to be entered into the database.
---

# Transaction Import Skill

Import transactions from various sources into the Joot database with comprehensive indexing and validation.

## When to Use

Invoke this skill when the user:
- Wants to import transactions for a specific month
- Shares credit card statement screenshots or PDFs
- Provides bank transfer receipt PDFs or emails
- Sends receipt emails (Grab, Bolt, Lazada, etc.)
- Wants to bulk enter transactions
- Asks to process or validate financial documents

## Reference Documents

**IMPORTANT**: Before processing any transactions, read these reference documents:

1. **Transaction Reference**: `.claude/skills/import-transactions/TRANSACTION-IMPORT-REFERENCE.md`
   - Payment method IDs
   - Vendor mappings (statement text → database vendor)
   - Description patterns and categorization rules
   - Recurring transaction patterns
   - User preferences

2. **Index Template**: `transaction-docs/indexes/INDEX-TEMPLATE.md`
   - Structure for monthly transaction indexes
   - Classification decision tree
   - Document processing guidelines

## Core Principle: Thorough Analysis

**Every single document must be evaluated.** Do not skip or batch documents. For each email/PDF:

1. Determine its classification:
   - **Import**: Direct expense to add to database
   - **Reconcile**: Expense that appears in multiple sources (e.g., Grab THB receipt + Chase USD charge)
   - **Watch For**: Future expense (order confirmation, bill notification)
   - **Income**: Money received (refund, reimbursement, payment)
   - **Non-Transaction**: Cancellation, marketing, informational

2. If uncertain, **ask the user** for clarification

3. Learn from each document to identify new patterns

---

## Workflow

### Phase 1: Discovery & Indexing

#### 1.1 Identify Available Documents

For the target month, scan the transaction-docs directory:

```
transaction-docs/
├── bank-statements/
│   ├── Performance_Select_Checking_*.pdf
│   └── Spend_x7331_*.pdf
├── credit-card-statements/
│   ├── chase-sapphire-reserve/*.pdf
│   └── american-express/*.pdf
└── receipt-emails/
    └── {YYYY-MM}/
        └── *.eml, *.pdf
```

#### 1.2 Create Month Index

Create or update: `transaction-docs/indexes/{YYYY-MM}-transaction-index.md`

Begin by cataloging all documents with initial classification.

#### 1.3 Process Each Document

For **every document** in the month folder:

1. **Read the document** (parse email headers, decode body, extract key fields)
2. **Classify** using the decision tree:
   - Payment confirmation → Import or Reconcile
   - Order confirmation → Watch For
   - Bill notification → Watch For (unless payment confirmed)
   - Refund/reimbursement → Income
   - Cancellation/info → Non-Transaction
   - Uncertain → Questions for User

3. **Extract transaction data** (date, amount, vendor, description)
4. **Log in index** with classification and notes

### Phase 2: Vendor Mapping & Enrichment

#### 2.1 Map to Database Entities

Using the reference document:
- Map merchant names to vendor IDs
- Assign correct payment method ID
- Determine transaction descriptions

#### 2.2 Handle Unknown Vendors

**If a vendor doesn't exist**:
1. Ask the user what vendor name to use
2. Create the vendor in the database
3. Add to the reference document for future imports

#### 2.3 Apply Categorization Rules

**Grab charges** (from email body, not amount heuristic):
- Contains "GrabFood" → GrabFood vendor, description pattern: `{MealType}: {Restaurant}`
- Contains "Hope you enjoyed your ride" → Grab Taxi, description: `Taxi to {Destination}`
- Contains "GrabMart" → GrabMart, description: `Groceries - {Store}`
- Contains "GrabExpress" → GrabExpress, description: `Delivery: {Purpose}`

**Bolt charges**: Similar to Grab Taxi - extract destination from dropoff location

**Recurring transactions**: Match against known patterns in reference doc

### Phase 3: Cross-Reference & Reconciliation

#### 3.1 Match THB Receipts to USD Charges

For services charged to Chase but showing THB receipts (Grab, Bolt):
1. Extract THB amount from receipt email
2. Find corresponding USD charge on Chase statement
3. Use USD amount for database entry
4. Note both amounts in index for audit trail

Matching rate: ~34 THB/USD (verify against actual statement)

#### 3.2 Validate Lazada Orders

Lazada order confirmations provide item details but not final charge:
1. Extract order details (items, order number) from confirmation email
2. Find USD charge on Chase statement matching the date range
3. Use USD amount from statement, items from email for description

### Phase 4: Database Validation

#### 4.1 Query Existing Transactions

```javascript
const startDate = // first day of month
const endDate = // last day of month

const { data: existing } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
  .gte('transaction_date', startDate)
  .lte('transaction_date', endDate);
```

#### 4.2 Match Against Index

For each document-derived transaction:
1. Search for matching DB record (date, vendor, amount)
2. If found → Mark as "Validated" in index
3. If not found → Mark as "To Import"

#### 4.3 Identify Unmatched DB Records

Flag any existing DB transactions that don't have a corresponding source document. These may be:
- Manually entered
- From a different source
- Potential errors

### Phase 5: Duplicate Detection

**Matching Criteria** (in order of confidence):

| Match Type | Criteria | Action |
|------------|----------|--------|
| **Exact duplicate** | Same date + vendor + amount | Skip, show as "Validated" |
| **Probable duplicate** | ±1 day + same vendor + amount ±1% | Flag for review |
| **Possible duplicate** | Same date + amount, different vendor | Flag for review |
| **New transaction** | No match found | Include as "To Import" |

**Why ±1 day?** Credit card posting dates can differ from transaction dates.

### Phase 6: User Clarification

Before finalizing, ask the user about:
- Unknown vendors (what should they be called?)
- Ambiguous descriptions (what was this purchase for?)
- Flagged duplicates
- Transactions that don't match known patterns
- Self-transfers that might be actual expenses

Collect all questions and present them together for efficiency.

### Phase 7: Present Summary for Approval

Show the complete index with all classifications:

```
## Import Summary: October 2025

### New Transactions to Import (15)
| Date | Vendor | Amount | Currency | Description |
|------|--------|--------|----------|-------------|
| 2025-10-15 | Anthropic | $30.00 | USD | Monthly Subscription |
...

### Validated Against Database (45)
✓ 45 existing transactions matched to source documents

### Expenses to Watch For (3)
| Date | Vendor | Expected | Source |
|------|--------|----------|--------|
| 2025-10-28 | Lazada | ~$15 | Order #1052844351508824 |
...

### Reconciled (THB → USD) (12)
| Date | Vendor | THB | USD | Description |
|------|--------|-----|-----|-------------|
| 2025-10-05 | Grab Taxi | ฿340 | $10.00 | Taxi to Home |
...

### Income/Reimbursements (2)
| Date | Source | Amount | Description |
|------|--------|--------|-------------|
| 2025-10-15 | Michael D | $94.91 | Venmo payment |
...

### Skipped (8)
- 3 cancellation notices
- 2 marketing emails
- 3 self-transfers (TopUp to own wallet)
```

Wait for user approval before inserting.

### Phase 8: Execute Import

#### 8.1 Insert New Transactions

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('transactions')
  .insert(transactions)
  .select();
```

#### 8.2 Update Index

Mark imported transactions with DB IDs and timestamps.

### Phase 9: Learn & Update Reference

After successful import:

1. **Add new vendor mappings** to TRANSACTION-IMPORT-REFERENCE.md
2. **Add new address book entries** for bank transfers
3. **Document new patterns** discovered during import
4. **Note any anomalies** for future reference

---

## Key IDs (Quick Reference)

```
User ID: a1c3caff-a5de-4898-be7d-ab4b76247ae6

Payment Methods:
- Chase Sapphire Reserve: 43937623-48b3-45ea-a59c-7ee9c4a4020b (USD)
- Kasikorn Bank (K PLUS): 0aaeb6c8-6052-47c9-b377-bc27d3231d4f (THB)
- Bangkok Bank (Bualuang): (look up during import) (THB)

Common Vendors: See TRANSACTION-IMPORT-REFERENCE.md
```

---

## Document Type Detection

### By Email Sender

| Sender | Bank | Email Types |
|--------|------|-------------|
| `BualuangmBanking@bangkokbank.com` | Bangkok Bank | Payments, Transfers, PromptPay, TopUp |
| `KPLUS@kasikornbank.com` | Kasikorn Bank | Bill Payment, Funds Transfer, PromptPay |
| `no-reply@grab.com` | - | Grab E-Receipts (Food, Taxi, Mart, Express) |
| `bangkok@bolt.eu` | - | Bolt ride receipts |
| `*@lazada.co.th` | - | Order confirmations, shipping |

### By Subject Line Pattern

| Pattern | Type |
|---------|------|
| `ยืนยันการชำระเงิน / Payments confirmation` | Bangkok Bank payment |
| `ยืนยันการโอนเงิน / Funds transfer confirmation` | Bangkok Bank transfer |
| `ยืนยันรายการโอนเงินไปยังหมายเลขโทรศัพท์` | Bangkok Bank PromptPay mobile |
| `ยืนยันการเติมเงินพร้อมเพย์` | Bangkok Bank PromptPay TopUp |
| `Your Grab E-Receipt` | Grab receipt |
| `Your GrabExpress Receipt` | GrabExpress delivery |
| `Your Bolt ride on` | Bolt taxi receipt |
| `We have received your order` | Lazada order confirmation |

---

## Self-Transfer Detection

**Skip these as non-transactions:**

- TopUp to own TrueMoney Wallet (check recipient matches user's wallet)
- TopUp to own LINE Pay
- Transfer between user's own bank accounts
- Wallet-to-wallet transfers to self

**Do NOT skip:**
- PromptPay transfers to vendors/individuals
- PromptPay TopUp to merchant wallets
- Bill payments to companies

When uncertain, ask the user.

---

## Example Invocations

**User**: "Import transactions for October 2025"
→ Full workflow: scan all docs, create index, validate against DB, present summary, import new transactions

**User**: "I have my Chase statement screenshots, can you import them?"
→ Read screenshots, extract transactions, cross-reference with existing receipt emails, present for approval

**User**: "Validate October's transactions against the documents"
→ Query DB, match against indexed documents, report validation status and discrepancies

---

## Important Notes

- **Be thorough**: Every document gets evaluated, even if it looks like spam
- **Ask when uncertain**: User clarification is better than wrong data
- **Learn continuously**: Update reference doc with new patterns
- **Preserve audit trail**: Index documents provide traceability
- **Cross-reference wisely**: THB receipts often match USD charges
