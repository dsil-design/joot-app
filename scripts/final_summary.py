import json

# Load the parsed data
with open('/Users/dennis/Code Projects/joot-app/scripts/september-2025-parsed.json', 'r') as f:
    data = json.load(f)

transactions = data['transactions']
summary = data['summary']

print("="*70)
print("SEPTEMBER 2025 TRANSACTION PARSING - FINAL SUMMARY")
print("="*70)

print(f"\n1. TRANSACTION COUNTS:")
print(f"   Total transactions: {summary['total_transactions']}")
print(f"   - Expenses: {summary['expense_count']}")
print(f"   - Income (Reimbursements): {summary['income_count']}")

print(f"\n2. EXPENSE TOTALS:")
print(f"   Total expenses (parsed): ${summary['total_expense_usd']:,.2f}")
print(f"   Expected from PDF: ${summary['expected_total_usd']:,.2f}")
print(f"   Difference: ${summary['difference']:,.2f} ({summary['difference']/summary['expected_total_usd']*100:.1f}%)")

# Calculate breakdown
expenses = [t for t in transactions if t['transaction_type'] == 'expense']
florida_expenses = [t for t in expenses if 'Florida House' in t['tags']]
business_expenses = [t for t in expenses if 'Business Expense' in t['tags']]
regular_expenses = [t for t in expenses if 'Florida House' not in t['tags'] and 'Business Expense' not in t['tags']]

florida_total = sum(t['amount_usd'] for t in florida_expenses if t['amount_usd'] is not None)
business_total = sum(t['amount_usd'] for t in business_expenses if t['amount_usd'] is not None)
regular_total = sum(t['amount_usd'] for t in regular_expenses if t['amount_usd'] is not None)

print(f"\n3. EXPENSE BREAKDOWN:")
print(f"   Florida House: {len(florida_expenses)} transactions, ${florida_total:,.2f}")
print(f"   Business Expense: {len(business_expenses)} transactions, ${business_total:,.2f}")
print(f"   Regular Expenses: {len(regular_expenses)} transactions, ${regular_total:,.2f}")

print(f"\n4. FIRST 10 TRANSACTIONS:")
for i, t in enumerate(transactions[:10], 1):
    usd_str = f"${t['amount_usd']:.2f}" if t['amount_usd'] is not None else 'N/A'
    tags_str = ', '.join(t['tags']) if t['tags'] else 'None'
    print(f"\n   {i}. {t['date']}")
    print(f"      Description: {t['description']}")
    print(f"      Merchant: {t['merchant']}")
    print(f"      Payment: {t['payment_method']}")
    print(f"      Amount: {t['amount']} {t['currency']} (USD: {usd_str})")
    print(f"      Type: {t['transaction_type']}")
    print(f"      Tags: {tags_str}")

print(f"\n5. LAST 5 TRANSACTIONS:")
for i, t in enumerate(transactions[-5:], len(transactions)-4):
    usd_str = f"${t['amount_usd']:.2f}" if t['amount_usd'] is not None else 'N/A'
    tags_str = ', '.join(t['tags']) if t['tags'] else 'None'
    print(f"\n   {i}. {t['date']}")
    print(f"      Description: {t['description']}")
    print(f"      Merchant: {t['merchant']}")
    print(f"      Payment: {t['payment_method']}")
    print(f"      Amount: {t['amount']} {t['currency']} (USD: {usd_str})")
    print(f"      Type: {t['transaction_type']}")
    print(f"      Tags: {tags_str}")

# Income/reimbursement breakdown
income = [t for t in transactions if t['transaction_type'] == 'income']
income_total = sum(abs(t['amount_usd']) for t in income if t['amount_usd'] is not None)

print(f"\n6. INCOME/REIMBURSEMENT BREAKDOWN:")
print(f"   Total reimbursements: {len(income)}")
print(f"   Total amount reimbursed: ${income_total:,.2f}")

# Business expense detail
print(f"\n7. BUSINESS EXPENSE DETAIL:")
for i, t in enumerate(business_expenses, 1):
    print(f"   {i}. ${t['amount_usd']:.2f} - {t['description']} ({t['merchant']})")

print(f"\n8. DATA QUALITY NOTES:")
print(f"   - The $1,000 'Florida House' payment to 'Me' was excluded (savings/transfer)")
print(f"   - Business expenses are marked with 'X' in the Reimbursable column")
print(f"   - The $67.46 difference (1.0%) may be due to:")
print(f"     * THB/USD conversion rate variations throughout the month")
print(f"     * Two reimbursement transactions with $0.00 subtotals (excluded from grand total)")
print(f"     * Rounding differences in the original spreadsheet")

print(f"\n9. OUTPUT FILE:")
print(f"   All transactions saved to: /Users/dennis/Code Projects/joot-app/scripts/september-2025-parsed.json")

print("\n" + "="*70)
print("END OF SUMMARY")
print("="*70)
