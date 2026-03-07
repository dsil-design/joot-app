# Smart Transaction Proposals — Feature Specification

**Feature:** Smart Transaction Proposals
**Status:** Spec — not yet implemented
**Date:** 2026-03-07
**Author:** Engineering

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Feature Overview](#2-feature-overview)
3. [Data Sources & Signals](#3-data-sources--signals)
4. [Proposal Engine Architecture](#4-proposal-engine-architecture)
5. [Database Schema](#5-database-schema)
6. [API Contracts](#6-api-contracts)
7. [Proposal Field Specifications](#7-proposal-field-specifications)
8. [Background Computation](#8-background-computation)
9. [Learning Loop](#9-learning-loop)
10. [AI Journal Integration](#10-ai-journal-integration)
11. [Cost & Performance Considerations](#11-cost--performance-considerations)
12. [Future: Static Parser Templates](#12-future-static-parser-templates)

---

## 1. Problem Statement

The review queue at `/imports/review` shows two types of items:
- **Proposed Matches** — import items matched to existing DB transactions (has smart linking UX)
- **New Transactions** — import items with no match (requires manual creation)

For "New Transactions," the current "Create as New" action opens a dialog with minimal pre-fill — only basic amount/currency/date from the raw import source. The user must manually determine and enter the vendor, payment method, tags, description, and transaction type for every item. This is tedious, especially for recurring transactions where the system has enough historical data to make accurate proposals.

The email detail page (`/imports/emails/[id]`) has a better experience via `CreateFromImportDialog` with `SmartPreFillHints` — but this is limited to parser-key-based payment method mapping and basic vendor fuzzy matching. It doesn't leverage historical transaction patterns, tag associations, or AI reasoning.

**Goal:** Make the review queue the primary, high-throughput interface for processing imports by automatically generating fully pre-filled transaction proposals using all available signals.

---

## 2. Feature Overview

**Smart Transaction Proposals** automatically generates a complete, pre-filled transaction for every import queue item. Proposals are:

1. **Pre-computed in the background** — generated when imports arrive, not when users open the review queue
2. **Stored persistently** — in a `transaction_proposals` table, so they survive page reloads and can be audited
3. **Hybrid-powered** — rule-based heuristics handle high-confidence fields; Claude Haiku handles ambiguous cases
4. **Learning** — user modifications feed back into the system via `ai_feedback`, improving future proposals
5. **Displayed inline** — the review queue card shows a proposal summary; the creation dialog pre-fills all fields

### User Flow

```
Import arrives (statement processed or email extracted)
        |
        v
Background: Proposal engine generates proposals
  - Rule engine: amount, currency, date, payment method, vendor, tags, type
  - LLM enhancement: called when rule confidence < 70%
  - Stored in transaction_proposals table
        |
        v
User opens /imports/review
  - Queue loads with proposals already attached
  - "New Transaction" cards show proposal summary in right panel
  - Overall confidence score displayed
        |
        v
User acts on item:
  - High confidence (>=85%): "Quick Create" — one click, done
  - Medium confidence: "Create as New" — opens pre-filled dialog
  - Low confidence: "Review & Create" — opens dialog, uncertain fields highlighted
        |
        v
User saves transaction (with or without modifications)
  - Transaction created and linked to import source
  - Proposal marked accepted/modified
  - If modified: diff stored, ai_feedback entry created
  - Future proposals learn from corrections
```

---

## 3. Data Sources & Signals

For each import item, the proposal engine considers these signals (in priority order):

### 3.1 Import Source Data (Direct)
- **Statement transactions:** date, description (raw text from PDF), amount, currency, source filename
- **Email extractions:** amount, currency, date, description, vendor_id, vendor_name_raw, order_id, classification, parser_key, extraction_confidence
- **Merged items:** both statement + email data, cross-currency info

### 3.2 Historical Transaction Patterns (SQL Queries)
- Transactions with similar descriptions (fuzzy text match) — what vendor, tags, payment method, type were used
- Transactions for the same vendor — typical tags, description patterns, transaction type distribution
- Transactions for the same payment method + currency combo — common patterns
- Recent transaction frequency for a vendor — helps with confidence scoring

### 3.3 Payment Method Context
- Statement source -> payment method mapping (Chase statement -> Chase CC)
- Email parser key -> payment method mapping (existing `PARSER_PAYMENT_METHOD_MAP`)
- Payment method's `preferred_currency` field

### 3.4 AI Journal Feedback
- `ai_feedback` entries with `feedback_type = 'proposal_correction'` — user corrections on past proposals (**requires schema migration**: the current `ai_feedback.feedback_type` CHECK constraint only allows `'classification_change'`, `'skip_override'`, `'extraction_correction'`, `'undo_skip'`, `'skip_reason'`; additionally, `ai_feedback.email_transaction_id` is currently `NOT NULL` and must be made nullable to support proposal corrections that originate from statement items)
- `ai_feedback` entries with `feedback_type = 'extraction_correction'` — user corrections on email extractions
- `ai_feedback` entries with `feedback_type = 'classification_change'` — email classification overrides
- Vendor normalization insights from `ai_insights` table

### 3.5 LLM Context (When Called)
- Top 10 similar historical transactions (by description similarity)
- Available vendors (top 50 by usage frequency)
- Available payment methods (all, with types)
- Available tags (all, with usage frequency)
- Recent ai_feedback examples (up to 5, few-shot injection)

---

## 4. Proposal Engine Architecture

```
                    Import Item
                        |
                        v
            +------------------------+
            |   Rule-Based Engine    |
            |   (Layer 1 - always)   |
            +------------------------+
            | 1. Direct field mapping |
            | 2. Vendor fuzzy match   |
            | 3. Payment method infer |
            | 4. Tag frequency lookup |
            | 5. Type inference       |
            | 6. Description cleanup  |
            +------------------------+
                        |
                   Confidence
                   Assessment
                        |
              +---------+---------+
              |                   |
        >= 70% avg          < 70% avg
              |                   |
              v                   v
         Store as            +-----------+
         rule_based          | LLM Engine|
                             | (Layer 2) |
                             +-----------+
                             | Claude     |
                             | Haiku call |
                             | w/ context |
                             +-----------+
                                  |
                                  v
                             Merge Results
                             (LLM upgrades
                              low-confidence
                              fields only)
                                  |
                                  v
                             Store as
                             hybrid
```

### Layer 1: Rule-Based Engine

Runs for every item. Fast (<100ms per item), free, deterministic.

**Batch optimization:** When generating proposals for multiple items (e.g., all suggestions from a statement), the engine pre-fetches reference data once:
- All user vendors (with transaction counts)
- All payment methods
- All tags (with per-vendor frequency)
- Recent transactions in the date range (for pattern matching)

### Layer 2: LLM Enhancement

Called only when the rule engine's average confidence across key fields (vendor, description, tags) is below 70%.

**Prompt structure:**
- System prompt: Transaction categorization assistant for personal finance
- Import item data: description, amount, currency, date, source
- Historical context: 10 most similar transactions
- Available options: vendors, payment methods, tags
- Few-shot: Recent ai_feedback corrections
- Output: Structured JSON with field values + confidence + reasoning

**Model:** Claude Haiku (claude-haiku-4-5-20251001) — same model as chat assistant
**Structured output:** JSON response with defined schema
**Cost control:** Only called when rule confidence is insufficient; results cached per item

---

## 5. Database Schema

### Required Schema Migrations for Existing Tables

Before creating the `transaction_proposals` table, two existing tables require migration:

1. **`ai_feedback`**: Add `'proposal_correction'` to the `feedback_type` CHECK constraint. Also, alter `email_transaction_id` to be nullable (currently `NOT NULL`), since proposal corrections from statement-only items will not have an associated email transaction.
2. **`ai_journal`**: Add `'transaction_proposal'` to the recognized `invocation_type` values.

### `transaction_proposals` Table

```sql
CREATE TABLE public.transaction_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Source reference
  source_type TEXT NOT NULL CHECK (source_type IN ('statement', 'email', 'merged')),
  composite_id TEXT NOT NULL,  -- matches QueueItem.id (e.g., "stmt:uuid:0", "email:uuid")
  statement_upload_id UUID REFERENCES public.statement_uploads(id) ON DELETE CASCADE,
  suggestion_index INTEGER,
  email_transaction_id UUID REFERENCES public.email_transactions(id) ON DELETE CASCADE,

  -- Proposed transaction fields
  proposed_description TEXT,
  proposed_amount DECIMAL(12,2),
  proposed_currency currency_type,
  proposed_transaction_type transaction_type,
  proposed_date DATE,
  proposed_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  proposed_vendor_name_suggestion TEXT,  -- suggested name if no vendor match exists
  proposed_payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  proposed_tag_ids UUID[] DEFAULT '{}',

  -- Per-field confidence and reasoning
  field_confidence JSONB NOT NULL DEFAULT '{}',
  -- Structure: {
  --   "description":      { "score": 85, "reasoning": "Cleaned statement text" },
  --   "amount":           { "score": 100, "reasoning": "Direct from statement" },
  --   "currency":         { "score": 100, "reasoning": "Statement currency" },
  --   "transaction_type": { "score": 90, "reasoning": "Expense (positive amount on CC)" },
  --   "date":             { "score": 95, "reasoning": "Statement date" },
  --   "vendor_id":        { "score": 72, "reasoning": "Fuzzy match: 'GRAB*CAR' -> Grab" },
  --   "payment_method_id":{ "score": 95, "reasoning": "Source: chase_feb.pdf -> Chase Visa" },
  --   "tag_ids":          { "score": 65, "reasoning": "Vendor 'Grab' tagged 'Transport' in 42/47 txns" }
  -- }
  -- NOTE: The key name "reasoning" aligns with the ProposedField<T>.reasoning
  -- field in the UI type (see DESIGN_SPEC.md Section 3.1).
  overall_confidence INTEGER NOT NULL DEFAULT 0,  -- weighted average

  -- Engine metadata
  engine TEXT NOT NULL CHECK (engine IN ('rule_based', 'llm', 'hybrid')),
  llm_model TEXT,
  llm_prompt_tokens INTEGER,
  llm_response_tokens INTEGER,
  generation_duration_ms INTEGER,

  -- Status lifecycle
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'modified', 'rejected', 'stale')),
  accepted_at TIMESTAMPTZ,
  created_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,

  -- Learning: what the user changed
  user_modifications JSONB,
  -- Structure: {
  --   "vendor_id": { "from": "uuid-a", "to": "uuid-b" },
  --   "tag_ids": { "from": ["uuid-x"], "to": ["uuid-x", "uuid-y"] }
  -- }

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  -- For 'statement' items: statement_upload_id + suggestion_index required
  -- For 'email' items: email_transaction_id required
  -- For 'merged' items: both statement and email refs will be set (satisfies both OR branches)
  CONSTRAINT proposal_source_check CHECK (
    (statement_upload_id IS NOT NULL AND suggestion_index IS NOT NULL)
    OR email_transaction_id IS NOT NULL
  ),
  UNIQUE(composite_id, user_id)
);

-- Indexes
CREATE INDEX idx_proposals_user_status ON transaction_proposals(user_id, status);
CREATE INDEX idx_proposals_composite ON transaction_proposals(composite_id);
CREATE INDEX idx_proposals_statement ON transaction_proposals(statement_upload_id, suggestion_index)
  WHERE statement_upload_id IS NOT NULL;
CREATE INDEX idx_proposals_email ON transaction_proposals(email_transaction_id)
  WHERE email_transaction_id IS NOT NULL;

-- RLS
ALTER TABLE public.transaction_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proposals"
  ON public.transaction_proposals FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own proposals"
  ON public.transaction_proposals FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role full access"
  ON public.transaction_proposals FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Auto-update timestamp
CREATE TRIGGER update_transaction_proposals_updated_at
  BEFORE UPDATE ON public.transaction_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 6. API Contracts

### POST /api/imports/proposals/generate

Trigger batch proposal generation.

**Request:**
```typescript
{
  // Optional filters -- if none, generates for all pending items without proposals
  compositeIds?: string[]      // specific queue item IDs to generate for
  statementUploadId?: string   // generate for all items in this statement
  emailTransactionIds?: string[]
  regenerateStale?: boolean    // re-generate proposals with status 'stale'
  force?: boolean              // regenerate even if pending proposal exists
}
```

**Response:**
```typescript
{
  generated: number
  skipped: number
  errors: number
  ruleOnly: number
  llmEnhanced: number
  durationMs: number
}
```

### GET /api/imports/proposals

Bulk fetch proposals for queue items.

**Query params:** `compositeIds` (comma-separated QueueItem IDs)

**Response:**
```typescript
{
  proposals: Record<string, TransactionProposal & { isStale: boolean }>  // keyed by composite_id
}
```

### PATCH /api/imports/proposals/[id]

Update proposal status after user action.

**Request:**
```typescript
{
  status: 'accepted' | 'modified' | 'rejected'
  createdTransactionId?: string
  userModifications?: Record<string, { from: any; to: any }>
}
```

---

## 7. Proposal Field Specifications

### 7.1 Amount
- **Source:** Direct from import (statement amount or email extracted amount)
- **Rule confidence:** 95-100
  - 100: Both email and statement sources agree
  - 95: Single source
- **LLM:** Not needed

### 7.2 Currency
- **Source:** Direct from import source
- **Rule confidence:** 95-100 (same logic as amount)
- **LLM:** Not needed

### 7.3 Date
- **Source:** Import source date, normalized
- **Rule confidence:** 90-100
  - 100: Statement date (authoritative)
  - 90: Email-only date (may be off by a day)
- **LLM:** Not needed

### 7.4 Transaction Type
- **Source:** Heuristic inference
- **Rule logic:**
  - Default: `expense` (confidence 80)
  - CC statement positive amount -> `expense` (confidence 95)
  - CC statement negative amount -> `income` (refund, confidence 90)
  - Bank statement deposit/credit -> `income` (confidence 85)
  - Email classification `refund_notification` -> `income` (confidence 90)
  - Bank transfer emails TO user (Bangkok Bank, Kasikorn incoming) -> `income` (confidence 85)
  - Historical: if vendor has >80% income transactions -> `income` (confidence 75)
- **LLM:** Can upgrade confidence when rule is uncertain

### 7.5 Payment Method
- **Source:** Statement source mapping or parser key mapping
- **Rule logic:**
  - Statement: look up `statement_uploads.payment_method_id` (confidence 95)
  - Email: map `parser_key` via `PARSER_PAYMENT_METHOD_MAP` (confidence 85)
  - Merged: prefer statement source
  - Fallback: most-used payment method for this vendor + currency (confidence 60)
- **LLM:** Can suggest when rule finds no match

### 7.6 Vendor
- **Source:** Multi-strategy matching
- **Rule logic (in priority order):**
  1. Email has `vendor_id` set by parser -> use directly (confidence 90)
  2. Fuzzy match import description against `vendors.name` -> confidence based on string similarity
  3. Historical: find transactions with similar descriptions, take most common vendor (confidence 60-80)
  4. Email `vendor_name_raw` -> search vendors table (confidence 70)
- **LLM:** Primary use case for ambiguous descriptions (e.g., "AMZN*123ABC" -> "Amazon")
- **Vendor name suggestion:** When no existing vendor matches, propose a clean name

### 7.7 Tags
- **Source:** Historical tag associations
- **Rule logic:**
  - If vendor matched with confidence >= 70: query tag frequency for that vendor
  - Take tags used in >50% of that vendor's transactions (confidence proportional to frequency)
  - Cap at 3 suggested tags
  - Examples: Grab -> "Transport" (89%), Home Depot -> "Florida House" + "Reimbursement"
- **LLM:** Can suggest tags for unknown vendors based on description + amount patterns

### 7.8 Description
- **Source:** Cleaned import description
- **Rule logic:**
  - Statement: clean raw description (remove card numbers, truncate, title case) -- confidence 75
  - Email: use extraction description if dedicated parser and confidence >= 75% -- confidence 85
  - Merged: prefer email description
  - Historical: if vendor matched, use most recent description for that vendor as template -- confidence 70
- **LLM:** Can generate clean descriptions from cryptic statement text

---

## 8. Background Computation

### Triggers

| Trigger | Scope |
|---------|-------|
| Statement processed (status -> ready_for_review) | All suggestions in that statement |
| Email extracted (new email_transaction) | Single email |
| Rematch API called | Items whose match status changed |
| Manual refresh from UI | User-selected or all pending |
| Daily cron | All items without proposals |

### Staleness

A proposal becomes `stale` when:
- New transactions are added to the DB (potential new vendor matches)
- Rematch changes the item's match status
- User adds new vendors, payment methods, or tags
- More than 7 days have passed since generation

Stale proposals are visually indicated in the UI and can be regenerated on demand.

---

## 9. Learning Loop

### Feedback Collection

When a user creates a transaction from a proposal:

1. **Accepted as-is** (no field changes):
   - Proposal status -> `accepted`
   - Positive signal (implicit)

2. **Modified** (user changed fields):
   - Proposal status -> `modified`
   - `user_modifications` stores the diff
   - New `ai_feedback` entry created with `feedback_type: 'proposal_correction'`
   - Metadata includes full field diff, composite_id, engine used

3. **Rejected** (user skips):
   - Proposal status -> `rejected`

### Feedback Consumption

1. **Few-shot injection** in LLM prompts (existing pattern)
2. **Rule engine overrides**: Corrections for known description patterns applied directly
3. **AI Journal analysis**: Detects correction patterns, suggests rule improvements

### Evolution Path

```
LLM proposals
    -> user corrections
        -> ai_feedback entries
            -> AI Journal insights
                -> static parser templates (future V2)
                    -> zero-cost, deterministic proposals
```

---

## 10. AI Journal Integration

Every LLM proposal call logged to `ai_journal`:
- `invocation_type`: `'transaction_proposal'`
- Import context as metadata
- Token usage, duration, confidence
- Linked to ai_feedback for correction tracking

Periodic analysis extended with:
- Proposal accuracy rate (% accepted without modification)
- Most-modified fields
- LLM call rate (% requiring enhancement)
- Cost per proposal
- Correction patterns suggesting new rules

---

## 11. Cost & Performance Considerations

### LLM Cost Control

- **Threshold gating:** LLM only when rule confidence < 70% (~30-40% of items initially)
- **Model:** Claude Haiku -- ~$0.0003/call
- **Batch optimization:** Shared context across items
- **Daily cap:** Configurable limit (default: 100 calls/day)

### Performance Targets

| Operation | Target |
|-----------|--------|
| Rule engine (per item) | <100ms |
| Rule engine (batch of 50) | <2s |
| LLM call (per item) | 1-3s |
| Proposal fetch (bulk) | <200ms |
| Queue API with proposals | <500ms |

### Storage

~1KB per proposal row. At 100 imports/month: ~100KB/month. Negligible.

---

## 12. Future: Static Parser Templates

**Not in V1.** When AI Journal identifies consistent patterns (5+ items, 90%+ consistency), patterns can be promoted to deterministic templates:

```typescript
{
  pattern: { descriptionMatch: /^GRAB\*CAR/i },
  template: {
    vendor: "Grab",
    tags: ["Transport"],
    transactionType: "expense",
    descriptionTemplate: "Grab ride"
  }
}
```

Templates run before the rule engine (highest priority, fastest, zero cost). Managed via AI Journal UI.

---

## Appendix: Related Documents

- [Design Specification](./DESIGN_SPEC.md) — UX/UI design for the review queue changes
- [Implementation Plan](./IMPLEMENTATION_PLAN.md) — Phased task breakdown with dependencies
