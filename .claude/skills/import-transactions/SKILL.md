---
name: import-transactions
description: Bulk import transactions from credit card statements, bank transfers, and receipt emails into Joot. Use when processing Chase statements, K PLUS bank transfers, Grab receipts, or any transaction data that needs to be entered into the database.
---

# Transaction Import Skill

Import transactions from various sources into the Joot database.

## When to Use

Invoke this skill when the user:
- Shares credit card statement screenshots
- Provides bank transfer receipt PDFs
- Sends receipt emails (Grab, Lazada, etc.)
- Wants to bulk enter transactions
- Asks to process financial documents

## Reference Document

**IMPORTANT**: Before processing any transactions, read the reference document:
`.claude/skills/import-transactions/TRANSACTION-IMPORT-REFERENCE.md`

This contains:
- Payment method IDs
- Vendor mappings (statement text → database vendor)
- Description patterns
- Categorization rules (especially for Grab)
- User preferences

## Workflow

### 1. Collect & Read Inputs

Accept any combination of:
- Credit card statement screenshots (Chase app)
- Bank transfer PDFs (K PLUS "Bill Payment Success" / "Funds Transfer Success")
- Receipt emails (Grab, Lazada, etc.)

Read all provided files to extract transaction data.

### 2. Extract Transaction Data

For each transaction, identify:
- **Date**: Transaction date (format as YYYY-MM-DD)
- **Amount**: Dollar/Baht amount
- **Merchant**: Raw merchant name from statement
- **Currency**: USD for Chase, THB for Kasikorn

### 3. Map to Database Entities

Using the reference document:
- Map merchant names to vendor IDs
- Assign correct payment method ID
- Determine transaction descriptions

**If a vendor doesn't exist**:
1. Ask the user what vendor name to use
2. Create the vendor in the database
3. Add to the reference document for future imports

### 4. Check for Duplicates

**CRITICAL**: Before presenting transactions for approval, query the database to identify potential duplicates.

```javascript
// Query existing transactions in the date range
const startDate = // earliest transaction date from import
const endDate = // latest transaction date from import

const { data: existing } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', 'a1c3caff-a5de-4898-be7d-ab4b76247ae6')
  .eq('payment_method_id', paymentMethodId)
  .gte('transaction_date', startDate)
  .lte('transaction_date', endDate);
```

**Matching Criteria** (in order of confidence):

| Match Type | Criteria | Action |
|------------|----------|--------|
| **Exact duplicate** | Same date + vendor + amount | Skip (default), show as ⛔ |
| **Probable duplicate** | ±1 day + same vendor + amount ±1% | Flag as ⚠️, ask user |
| **Possible duplicate** | Same date + amount, different vendor | Flag as ❓, show for review |
| **New transaction** | No match found | Include as ✅ |

**Why ±1 day?** Credit card posting dates can differ from transaction dates. A charge made on the 31st may post on the 1st.

**Why ±1% amount?** Currency conversion rounding or minor fee variations.

### 5. Apply Categorization Rules

**Grab charges**:
- < $8 → Grab Taxi, description "Ride"
- > $15 → GrabFood, description "Food Delivery"
- $8-15 → Ask user or use context

**Recurring transactions**:
- Virgin Active → "Semi-Monthly: Gym Membership"
- Xfinity → "Monthly: Internet"
- Citizen's Bank → "Monthly: iPhone Payment"

### 7. Clarify Ambiguities

Before inserting, ask the user about:
- Unknown vendors (what should they be called?)
- Ambiguous descriptions (what was this purchase for?)
- Any transactions that don't match known patterns
- Potential duplicates flagged in step 4

### 8. Present Summary for Approval

Show a complete table with duplicate status:
```
| Status | Date | Vendor | Amount | Currency | Description |
|--------|------|--------|--------|----------|-------------|
| ✅ | 2025-12-25 | GrabFood | $13.98 | USD | Food Delivery |
| ⚠️ | 2025-12-24 | Tops | $45.00 | USD | Groceries |
| ⛔ | 2025-12-23 | Netflix | $24.99 | USD | Monthly Subscription |
```

**Legend**:
- ✅ New - will be imported
- ⚠️ Possible duplicate - needs confirmation (show existing record)
- ⛔ Duplicate - will be skipped (unless user overrides)

For flagged items, show the existing database record:
```
⚠️ POSSIBLE DUPLICATE:
   New:      2025-12-24 | Tops | $45.00 | Groceries
   Existing: 2025-12-23 | Tops | $45.00 | Groceries (ID: abc123)
   → Import anyway? [Yes/No]
```

Include totals by payment method/currency (excluding duplicates).

Wait for user approval before inserting.

### 9. Insert Transactions

Use Supabase to bulk insert all approved transactions:

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const transactions = [...]; // Array of transaction objects

const { data, error } = await supabase
  .from('transactions')
  .insert(transactions)
  .select();
```

### 10. Update Reference Document

After successful import:
- Add any new vendor mappings
- Note any new patterns discovered
- Update description templates if user provided new ones

## Key IDs (Quick Reference)

```
User ID: a1c3caff-a5de-4898-be7d-ab4b76247ae6

Payment Methods:
- Chase Sapphire Reserve: 43937623-48b3-45ea-a59c-7ee9c4a4020b (USD)
- Kasikorn Bank: 0aaeb6c8-6052-47c9-b377-bc27d3231d4f (THB)

Common Vendors:
- GrabFood: 6b451d8c-b8db-4475-b19b-6c3cf38b93d0
- Grab Taxi: 20af541a-173c-4f7a-9e04-e0c821f7d367
- Virgin Active: 49641ab2-072e-464e-b377-82f199a5d397
- Tops: 334123a8-7017-4aaf-97d3-f28ae9b5eba6
- Xfinity: d6d6b230-a268-4ffa-88b8-e8098f86b06c
- Anthropic: 423cf0cc-b570-4d1a-98fd-f60cecc221d3
```

## Example Invocations

**User**: "I have my Chase statement screenshots, can you import them?"
→ Read screenshots, extract transactions, map vendors, present for approval, insert

**User**: "Process these K PLUS transfer receipts"
→ Read PDFs, identify recipients, map to vendors, clarify unknowns, insert as THB

**User**: "Import these Grab receipts and match them to my credit card"
→ Read THB receipts, find matching USD charges on statement, reconcile and insert

## Important Notes

- Always present transactions for approval before inserting
- Keep the reference document updated with new learnings
- THB receipts may correspond to USD credit card charges (use ~34 THB/USD for matching)
- Bank transfers are common in Thailand - treat them as normal transactions
- Create new vendors when mappings don't exist (after asking user)
