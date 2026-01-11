---
name: email-linking
description: Implement the Email-to-Transaction Linking feature for Joot. This skill guides Claude Code through the complete implementation of email syncing, statement parsing, cross-currency matching, and review queue functionality.
---

# Email-to-Transaction Linking Implementation Skill

Build the complete email-to-transaction linking system for Joot, enabling automatic import of transactions from receipt emails and credit card statements with intelligent cross-currency matching.

## When to Use

Invoke this skill when the user:
- Wants to implement email-to-transaction linking
- Asks to work on any Phase 1-4 tasks from the implementation plan
- Wants to build email parsers, statement parsers, or matching algorithms
- Needs to create the import dashboard, review queue, or related UI
- Asks about the email linking feature architecture

## Reference Documents

**CRITICAL**: Before starting any implementation work, read these documents:

1. **Task Lists** (Start here - contains specific implementation tasks):
   - `design-docs/tasks/phase-1-foundation-tasks.md` - Database, navigation, email parsers
   - `design-docs/tasks/phase-2-core-matching-tasks.md` - Upload, parsing, matching, review
   - `design-docs/tasks/phase-3-user-experience-tasks.md` - Mobile, polish, accessibility
   - `design-docs/tasks/phase-4-advanced-features-tasks.md` - Manual linking, history, settings

2. **Design Specifications**:
   - `design-docs/email-transaction-linking-system.md` - Complete feature spec
   - `design-docs/email-transaction-wireframes.md` - UI layouts
   - `design-docs/email-transaction-implementation-roadmap.md` - Architecture overview

3. **Existing Code Patterns**:
   - `src/lib/services/email-sync-service.ts` - Existing email sync implementation
   - `src/lib/services/email-types.ts` - Email type definitions
   - `database/schema.sql` - Database schema patterns

4. **Import Reference** (for email parsing patterns):
   - `.claude/skills/import-transactions/TRANSACTION-IMPORT-REFERENCE.md` - Vendor mappings, patterns

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  iCloud (IMAP)                                                       │
│       │                                                              │
│       ▼                                                              │
│  EmailSyncService (existing: src/lib/services/email-sync-service.ts) │
│       │                                                              │
│       ▼                                                              │
│  Email Extractors (NEW: src/lib/email/extractors/*.ts)               │
│  ├── grab.ts      → GrabFood, GrabCar, GrabMart, GrabExpress        │
│  ├── bolt.ts      → Bolt rides                                       │
│  ├── bangkok-bank.ts → Bualuang payments, transfers                  │
│  ├── kasikorn.ts  → K PLUS notifications                             │
│  └── lazada.ts    → Order confirmations                              │
│       │                                                              │
│       ▼                                                              │
│  email_transactions table (NEW)                                      │
│       │                                                              │
│       ├───────────────────────────┐                                  │
│       │                           │                                  │
│       ▼                           ▼                                  │
│  Statement Upload            Direct Import                           │
│  (THB → USD matching)        (THB bank transactions)                 │
│       │                                                              │
│       ▼                                                              │
│  Statement Parsers (NEW: src/lib/statements/parsers/*.ts)            │
│  ├── chase.ts     → Chase Sapphire Reserve                           │
│  ├── amex.ts      → American Express                                 │
│  ├── bangkok-bank.ts → Bangkok Bank statements                       │
│  └── kasikorn.ts  → Kasikorn statements                              │
│       │                                                              │
│       ▼                                                              │
│  Matching Service (NEW: src/lib/matching/*.ts)                       │
│  ├── amount-matcher.ts    → ±2% tolerance                            │
│  ├── date-matcher.ts      → ±3 days posting delay                    │
│  ├── fuzzy-matcher.ts     → Levenshtein vendor matching              │
│  ├── cross-currency.ts    → THB↔USD using exchange_rates             │
│  └── match-scorer.ts      → Composite scoring (0-100)                │
│       │                                                              │
│       ▼                                                              │
│  Review Queue UI (NEW: src/app/imports/review/*)                     │
│       │                                                              │
│       ▼                                                              │
│  transactions table (existing)                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions (Immutable)

These decisions have been finalized and must be followed:

1. **Never auto-approve** - All matches require user confirmation
2. **±2% exchange rate tolerance** - Uses `exchange_rates` table for historical rates
3. **±3 days date tolerance** - Accounts for CC posting delays
4. **Files kept forever** - No auto-delete of uploaded statements
5. **Top-level navigation** - "Imports" is primary nav item
6. **Daily sync at 18:00 UTC** - Piggybacks on existing cron job

## Implementation Phases

### Phase 1: Foundation (Tasks P1-001 to P1-027)
**Agent Recommendation**: `database-admin` for migrations, `typescript-pro` for services

Key deliverables:
- Database tables: `email_transactions`, `statement_uploads`, `import_activities`
- RLS policies for all new tables
- Navigation updates (sidebar + mobile)
- Email extractors for Grab, Bolt, Bangkok Bank, Kasikorn, Lazada
- Import Dashboard skeleton UI

### Phase 2: Core Matching (Tasks P2-001 to P2-035)
**Agent Recommendation**: `backend-architect` for matching logic, `frontend-developer` for UI

Key deliverables:
- Statement upload with Supabase Storage
- PDF text extraction and parsing
- Matching algorithms (amount, date, vendor, cross-currency)
- Review queue with approve/reject flow
- Batch approve functionality

### Phase 3: User Experience (Tasks P3-001 to P3-032)
**Agent Recommendation**: `mobile-developer` for gestures, `ui-ux-designer` for polish

Key deliverables:
- Mobile swipe gestures (approve/reject)
- Filter bottom sheet for mobile
- Error handling and toast notifications
- Accessibility (ARIA, keyboard shortcuts)
- Loading skeletons and animations

### Phase 4: Advanced Features (Tasks P4-001 to P4-028)
**Agent Recommendation**: `frontend-developer` for UI, `test-automator` for E2E tests

Key deliverables:
- Manual transaction linking
- Import history with CSV export
- Settings page integration
- Full email viewer with edit mode
- Comprehensive testing

---

## Code Patterns

### Database Migration Pattern

```sql
-- File: database/migrations/YYYYMMDDHHMMSS_create_email_transactions.sql

-- Use gen_random_uuid() (not uuid_generate_v4)
CREATE TABLE email_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  -- ... columns
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Always add indexes
CREATE INDEX idx_email_transactions_user_status
  ON email_transactions(user_id, status);

-- Always enable RLS
ALTER TABLE email_transactions ENABLE ROW LEVEL SECURITY;

-- Standard RLS policy pattern
CREATE POLICY "Users can view their own email transactions"
  ON email_transactions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own email transactions"
  ON email_transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own email transactions"
  ON email_transactions FOR UPDATE
  USING (user_id = auth.uid());
```

### Email Extractor Pattern

```typescript
// File: src/lib/email/extractors/grab.ts

import type { ExtractedTransaction } from '../types';

export interface GrabExtractorResult {
  success: boolean;
  data?: ExtractedTransaction;
  confidence: number;
  errors?: string[];
}

/**
 * Extract transaction data from Grab receipt emails
 *
 * Handles: GrabFood, GrabCar, GrabMart, GrabExpress
 * Sender: no-reply@grab.com
 * Subject patterns: "Your Grab E-Receipt", "Your GrabExpress Receipt"
 */
export function extractGrabTransaction(
  emailBody: string,
  emailSubject: string,
  emailDate: Date
): GrabExtractorResult {
  // Detect service type from email content
  const serviceType = detectGrabServiceType(emailBody);

  // Extract amount (THB)
  const amountMatch = emailBody.match(/฿\s*([\d,]+(?:\.\d{2})?)/);
  if (!amountMatch) {
    return { success: false, confidence: 0, errors: ['Amount not found'] };
  }

  // Extract order ID
  const orderIdMatch = emailBody.match(/(?:Order|GF)-[\w-]+/i);

  // Calculate confidence
  let confidence = 40; // Base for having amount
  if (orderIdMatch) confidence += 30;
  if (serviceType !== 'unknown') confidence += 20;

  return {
    success: true,
    confidence,
    data: {
      vendor_name_raw: serviceType === 'food' ? 'GrabFood' : `Grab${serviceType}`,
      amount: parseFloat(amountMatch[1].replace(',', '')),
      currency: 'THB',
      transaction_date: emailDate,
      order_id: orderIdMatch?.[0] || null,
      description: extractDescription(emailBody, serviceType),
    },
  };
}

function detectGrabServiceType(body: string): 'food' | 'car' | 'mart' | 'express' | 'unknown' {
  if (body.includes('GrabFood') || body.includes('Your order from')) return 'food';
  if (body.includes('Hope you enjoyed your ride')) return 'car';
  if (body.includes('GrabMart')) return 'mart';
  if (body.includes('GrabExpress')) return 'express';
  return 'unknown';
}
```

### Matching Algorithm Pattern

```typescript
// File: src/lib/matching/amount-matcher.ts

const EXACT_MATCH_SCORE = 40;
const WITHIN_2_PERCENT_SCORE = 35;
const WITHIN_5_PERCENT_SCORE = 25;
const WITHIN_10_PERCENT_SCORE = 15;

export interface AmountMatchResult {
  score: number;
  variance: number;
  reason: string;
}

/**
 * Compare two amounts with tolerance
 * Returns score contribution (0-40) and explanation
 */
export function matchAmounts(
  emailAmount: number,
  statementAmount: number,
  crossCurrencyConverted: boolean = false
): AmountMatchResult {
  const variance = Math.abs(emailAmount - statementAmount) / statementAmount;

  if (variance === 0) {
    return {
      score: EXACT_MATCH_SCORE,
      variance: 0,
      reason: 'Exact amount match',
    };
  }

  if (variance <= 0.02) {
    return {
      score: WITHIN_2_PERCENT_SCORE,
      variance,
      reason: crossCurrencyConverted
        ? `Amount within 2% after currency conversion (${(variance * 100).toFixed(1)}% variance)`
        : `Amount within 2% (${(variance * 100).toFixed(1)}% variance)`,
    };
  }

  if (variance <= 0.05) {
    return {
      score: WITHIN_5_PERCENT_SCORE,
      variance,
      reason: `Amount within 5% (${(variance * 100).toFixed(1)}% variance)`,
    };
  }

  if (variance <= 0.10) {
    return {
      score: WITHIN_10_PERCENT_SCORE,
      variance,
      reason: `Amount within 10% (${(variance * 100).toFixed(1)}% variance)`,
    };
  }

  return {
    score: 0,
    variance,
    reason: `Amount mismatch (${(variance * 100).toFixed(1)}% variance)`,
  };
}
```

### API Route Pattern

```typescript
// File: src/app/api/imports/approve/route.ts

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emailIds, createTransactions } = await request.json();

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json(
        { error: 'emailIds must be a non-empty array' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Verify ownership of all emails
    const { data: emails, error: fetchError } = await supabase
      .from('email_transactions')
      .select('id, user_id, matched_transaction_id')
      .in('id', emailIds)
      .eq('user_id', user.id);

    if (fetchError) throw fetchError;

    if (emails.length !== emailIds.length) {
      return NextResponse.json(
        { error: 'Some emails not found or not owned by user' },
        { status: 403 }
      );
    }

    // Update status to 'imported'
    const { error: updateError } = await supabase
      .from('email_transactions')
      .update({
        status: 'imported',
        updated_at: new Date().toISOString(),
      })
      .in('id', emailIds);

    if (updateError) throw updateError;

    // Optionally create transactions
    if (createTransactions) {
      // ... transaction creation logic
    }

    // Log activity
    await supabase.from('import_activities').insert({
      user_id: user.id,
      activity_type: 'batch_approve',
      description: `Approved ${emailIds.length} matches`,
      transactions_affected: emailIds.length,
    });

    return NextResponse.json({
      success: true,
      approved: emailIds.length,
    });
  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json(
      { error: 'Failed to approve matches' },
      { status: 500 }
    );
  }
}
```

### React Component Pattern

```typescript
// File: src/components/page-specific/match-card.tsx

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfidenceIndicator } from '@/components/ui/confidence-indicator';
import { Check, X, Link } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchCardProps {
  email: EmailTransaction;
  match?: TransactionMatch;
  variant: 'matched' | 'waiting' | 'ready';
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onLink: (id: string) => void;
}

export function MatchCard({
  email,
  match,
  variant,
  onApprove,
  onReject,
  onLink,
}: MatchCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await onApprove(email.id);
    } finally {
      setIsLoading(false);
    }
  };

  const borderColor = {
    matched: 'border-green-500',
    waiting: 'border-blue-500',
    ready: 'border-purple-500',
  }[variant];

  return (
    <Card className={cn('border-l-4', borderColor)}>
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{email.vendor_name_raw}</h3>
            <p className="text-sm text-muted-foreground">
              {email.amount} {email.currency} • {formatDate(email.transaction_date)}
            </p>
          </div>
          {match && <ConfidenceIndicator value={match.confidence} />}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {/* Match details */}
          {match && (
            <div className="space-y-2 mb-4">
              <p className="text-sm">
                <strong>Matched to:</strong> {match.transaction.description}
              </p>
              <p className="text-sm">
                <strong>Reasons:</strong> {match.reasons.join(', ')}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {variant === 'matched' && (
              <>
                <Button onClick={handleApprove} disabled={isLoading} size="sm">
                  <Check className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button variant="outline" onClick={() => onReject(email.id)} size="sm">
                  <X className="w-4 h-4 mr-1" /> Reject
                </Button>
              </>
            )}
            {variant === 'waiting' && (
              <Button variant="outline" onClick={() => onLink(email.id)} size="sm">
                <Link className="w-4 h-4 mr-1" /> Link Manually
              </Button>
            )}
            {variant === 'ready' && (
              <Button onClick={handleApprove} disabled={isLoading} size="sm">
                <Check className="w-4 h-4 mr-1" /> Import
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
```

---

## Task Execution Protocol

When implementing any task:

1. **Read the task file first** - Get the full context from the phase task document
2. **Check dependencies** - Ensure prerequisite tasks are complete
3. **Follow the pattern** - Use code patterns from this skill and existing codebase
4. **Update task status** - Mark as `in_progress` when starting, `done` when complete
5. **Add completion log** - Record timestamp and notes in the task document

### Task Status Updates

```markdown
<!-- Before starting -->
**Status:** in_progress
**Completion Log:**
- started: 2025-01-11T10:30:00Z · by: claude

<!-- After completing -->
**Status:** done
**Completion Log:**
- started: 2025-01-11T10:30:00Z · by: claude
- done: 2025-01-11T11:45:00Z · by: claude · notes: Created migration with all indexes
```

---

## Key IDs and Constants

```typescript
// User ID (single-user app)
const USER_ID = 'a1c3caff-a5de-4898-be7d-ab4b76247ae6';

// Payment Methods
const PAYMENT_METHODS = {
  CHASE_SAPPHIRE: '43937623-48b3-45ea-a59c-7ee9c4a4020b', // USD
  KASIKORN_KPLUS: '0aaeb6c8-6052-47c9-b377-bc27d3231d4f', // THB
  // Bangkok Bank - look up during implementation
};

// Match Confidence Thresholds
const CONFIDENCE = {
  HIGH: 90,    // >= 90: High confidence
  MEDIUM: 55,  // 55-89: Medium confidence
  LOW: 55,     // < 55: Low confidence / no match
};

// Score Weights
const SCORE_WEIGHTS = {
  AMOUNT: 40,  // Max 40 points
  DATE: 30,    // Max 30 points
  VENDOR: 30,  // Max 30 points (combined from spec's 20+10)
};

// Tolerances
const TOLERANCES = {
  AMOUNT_PERCENT: 0.02,  // ±2%
  DATE_DAYS: 3,          // ±3 days for posting delay
};
```

---

## Common Pitfalls to Avoid

1. **Don't use `uuid_generate_v4()`** - Use `gen_random_uuid()` for Supabase
2. **Don't auto-approve** - Always require user confirmation
3. **Don't skip RLS policies** - Every new table needs RLS
4. **Don't hardcode exchange rates** - Use `exchange_rates` table
5. **Don't forget mobile** - All UI must be responsive
6. **Don't skip type generation** - Run `npx supabase gen types typescript --linked` after migrations

---

## Testing Commands

```bash
# Run unit tests
npm run test:unit

# Run specific test file
npm test -- __tests__/lib/email/extractors/grab.test.ts

# Type check
npm run verify:types

# Lint
npm run lint

# Build (validates everything)
npm run build
```

---

## Example Invocations

**User**: "Implement Phase 1 database tasks"
→ Execute P1-001 through P1-005 in order, creating migrations and RLS policies

**User**: "Build the Grab email parser"
→ Execute P1-011, following the extractor pattern above

**User**: "Create the review queue page"
→ Execute P2-023 through P2-030, building components and assembling the page

**User**: "Add mobile swipe gestures"
→ Execute P3-003 through P3-007, implementing gesture handling

---

## Important Notes

- **Read task documents carefully** - Each task has specific acceptance criteria
- **Follow existing patterns** - Check similar code in the codebase first
- **Test incrementally** - Verify each task works before moving to the next
- **Update documentation** - Mark tasks complete as you go
- **Ask when uncertain** - If requirements are ambiguous, ask for clarification
