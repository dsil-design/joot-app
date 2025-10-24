# Clean Slate Transaction Import Project - Optimized Prompt

## Context & Background

I'm the owner of a Next.js expense tracking app (Joot) that stores transaction data in Supabase. I recently discovered significant discrepancies between my master expense data and what's imported into the database. For September 2025, the database only has 31 transactions (showing $1,551.56 in expenses), but my master data shows ~200+ transactions with ~$6,804.11 in expenses. This indicates the previous import was incomplete and potentially has similar issues across all months.

## Project Objective

Perform a **complete clean slate re-import** of all transaction data from my master CSV, validated against PDF reference files, importing **one month at a time** with manual review and approval at each step.

## Data Sources

### 1. Master CSV File
**Location**: `csv_imports/fullImport_20251017.csv`
- Contains transaction data from June 2017 - October 2025
- Has three main sections: "Expense Tracker", "Gross Income Tracker", "Florida House Expenses"
- Each section has different column structures

### 2. PDF Reference Files (Source of Truth)
**Location**: `csv_imports/Master Reference PDFs/Budget for Import-page*.pdf` (102 files)
- These are the TRUE exports from my master spreadsheet
- Use these to validate the CSV data and your import logic
- Structure: Date rows (e.g., "Monday, October 1, 2025"), followed by that day's transactions, with "Daily Total" subtotals and "GRAND TOTAL" summary rows
- **Important**: Subtotal and Grand Total rows are for reference only - DO NOT import these as transactions

### 3. Existing Import Script
**Location**: `scripts/production-import.js`
- Has parsing logic that was used previously
- Can be referenced but needs validation against requirements below

## Critical Data Understanding

### Transaction Data Structure

Each transaction should capture:
1. **Date**: The transaction date (from date row, e.g., "Monday, October 1, 2025")
2. **Description**: Transaction description (from "Desc" column)
3. **Vendor/Merchant**: The merchant/vendor name
4. **Payment Method**: How it was paid (from "Payment Type" column)
5. **Amount**: The actual amount in the original currency used
6. **Currency**: Single currency used for the transaction (USD, THB, EUR, etc.)
7. **Transaction Type**: Either "expense" or "income"
8. **Tags**: Based on columns/context:
   - **"Florida House"** tag: For transactions in "Florida House Expenses" section
   - **"Reimbursement"** tag: When description contains "Reimbursement:" prefix
   - **"Business Expense"** tag: When "Business Expense" column is marked (usually with "X")

### Critical Rules

1. **Currency Handling**:
   - Each transaction has ONLY ONE currency
   - In the CSV, you may see conversion columns (e.g., "Conversion (THB to USD)", "Subtotal") - **IGNORE THESE**
   - Only record the "Actual Spent" amount with its corresponding currency
   - Example: If "Actual Spent" shows "THB 2782.00", record amount=2782.00, currency=THB

2. **Transaction Type Detection**:
   - Expenses: Transactions in "Expense Tracker" and "Florida House Expenses" sections
   - Income: Transactions in "Gross Income Tracker" section
   - Reimbursements are INCOME (they represent money received back)

3. **Rows to Skip**:
   - Header rows
   - Date rows (these establish context but aren't transactions)
   - "Daily Total" rows
   - "GRAND TOTAL" rows
   - Any row with "Estimated" or "Subtotal" in description
   - Empty rows

4. **PDF Validation**:
   - Use subtotals and grand totals from PDFs as validation checkpoints
   - After importing each month, compare your totals to the PDF's grand total
   - Generally, I convert all figures to USD for high-level understanding, but the DATABASE must store original currency amounts

## Existing Scripts & Resources

### Available Scripts
- `scripts/production-import.js` - Previous import logic (reference)
- `scripts/db/reset-transaction-data.js` - Can clear transactions, vendors, payment methods
- `scripts/2-csv-deep-analyzer.js` - CSV analysis tool
- `scripts/3-pdf-transaction-extractor.js` - PDF parsing tool
- `scripts/VERIFICATION_PLAN.md` - Verification strategy document

### Database Schema
- Table: `transactions`
- Fields: `transaction_date`, `description`, `amount`, `original_currency`, `transaction_type`, `vendor_id`, `payment_method_id`, `user_id`
- Supporting tables: `vendors`, `payment_methods`, `tags`, `transaction_tags`
- User email: `dennis@dsil.design`

## Project Requirements

### Phase 1: Setup & Validation (CURRENT PHASE)
1. **Create Emergency Rollback Point**
   - Database backup strategy
   - Document current state (transaction counts, etc.)
   - Ensure we can restore if needed

2. **Analyze Data Sources**
   - Parse entire CSV to understand structure
   - Review PDF reference files (especially for September 2025 as our test case)
   - Document all field mappings (CSV → Database)
   - Identify all tag conditions

3. **Build Validation Framework**
   - Script to compare imported data against PDF totals
   - Transaction fingerprinting for duplicate detection
   - Month-by-month summary reports

### Phase 2: Clean Slate
1. **Clear Existing Transaction Data**
   - Delete all transactions for `dennis@dsil.design`
   - Clear orphaned vendors
   - Clear orphaned payment methods
   - Preserve: users, exchange_rates, and other system data

### Phase 3: Month-by-Month Import
1. **For Each Month** (starting with September 2025 as test):
   - Parse transactions from CSV for that month only
   - Display summary: transaction count, total expenses, total income
   - Show first 5 and last 5 transactions for review
   - **ASK FOR APPROVAL** before importing to database
   - Import to database with proper tags
   - Validate against PDF reference file
   - Generate validation report (counts, totals, discrepancies)
   - **Wait for user confirmation** before moving to next month

2. **Import Order**:
   - Start: September 2025 (our known discrepancy for testing)
   - Then: October 2025
   - Then: Work backwards through 2025, 2024, etc.

### Phase 4: Final Validation
1. Cross-reference all three sources (Database, CSV, PDFs)
2. Duplicate detection report
3. Month-by-month summary comparison
4. Generate comprehensive verification report

## Your Approach

1. **Ask Clarifying Questions**: Before importing ANY data, ask me questions about anything unclear
2. **Show Your Work**: For each month, show me what you found in the CSV and how you're interpreting it
3. **Validate Continuously**: Compare your parsed data against the PDF reference files
4. **One Month at a Time**: Never bulk import - always get approval first
5. **Use Agents**: Leverage specialized agents (data-engineer, python-pro, etc.) for parsing complex CSV/PDF data

## Success Criteria

- Database matches CSV transaction counts exactly (within expected exclusions)
- CSV matches PDF transaction counts exactly
- All subtotals and grand totals align with PDF reference files
- Zero unexplained duplicates
- All tags correctly applied (Florida House, Reimbursement, Business Expense)
- September 2025 shows ~$6,804 in expenses (matching PDF), not $1,551

## Questions to Answer Before Starting

Before you begin any import work, please answer these:

1. What is the structure of the September 2025 CSV data? (Show me column headers and first 10 transaction rows)
2. How many total transactions do you find in the CSV for September 2025?
3. What is the grand total for September 2025 expenses in the PDF reference file?
4. What tag conditions did you identify from the CSV structure?
5. What is your proposed database backup/rollback strategy?
6. Show me your parsing logic for one sample transaction (include all field mappings and tag assignments)

## Additional Context Files

If you need more context:
- Previous chat discussion is in this current session
- Review `src/lib/utils/monthly-summary.ts` to understand how data is displayed in the app
- Review `src/app/home/components/TrendChartSection.tsx` to understand chart calculations

## Let's Start

Please begin by:
1. Reading the September 2025 CSV data (`csv_imports/202509.csv`)
2. Reading the September 2025 PDF reference files
3. Answering the 6 questions above
4. Proposing your import plan for my review

Remember: **Accuracy over speed**. I need this data to be perfect, not fast.
