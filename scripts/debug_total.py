import json

# Load the parsed data
with open('/Users/dennis/Code Projects/joot-app/scripts/september-2025-parsed.json', 'r') as f:
    data = json.load(f)

transactions = data['transactions']

# Calculate expenses only (excluding income/reimbursements)
expenses_only = [t for t in transactions if t['transaction_type'] == 'expense']

print(f"Total expense transactions: {len(expenses_only)}")

# Sum up the USD amounts
total_from_usd_field = sum(t['amount_usd'] for t in expenses_only if t['amount_usd'] is not None)

print(f"\nTotal from amount_usd field: ${total_from_usd_field:,.2f}")
print(f"Expected from PDF: $6,804.11")
print(f"Difference: ${abs(6804.11 - total_from_usd_field):,.2f}")

# Find large expenses
large_expenses = sorted([t for t in expenses_only if t['amount_usd'] and t['amount_usd'] > 100],
                       key=lambda x: x['amount_usd'], reverse=True)

print("\n\nTop 15 largest expenses:")
for i, t in enumerate(large_expenses[:15], 1):
    print(f"{i}. ${t['amount_usd']:,.2f} - {t['description']} ({t['merchant']})")

# Check Florida House section total
florida_expenses = [t for t in expenses_only if 'Florida House' in t['tags']]
florida_total = sum(t['amount_usd'] for t in florida_expenses if t['amount_usd'] is not None)
print(f"\n\nFlorida House expenses total: ${florida_total:,.2f} (Expected: $367.74)")

# Calculate expense tracker total (excluding Florida)
expense_tracker = [t for t in expenses_only if 'Florida House' not in t['tags']]
expense_tracker_total = sum(t['amount_usd'] for t in expense_tracker if t['amount_usd'] is not None)
print(f"Expense Tracker total: ${expense_tracker_total:,.2f}")

# Total should be
print(f"\nExpected total: $6,804.11")
print(f"Florida section: $367.74")
print(f"Expense tracker should be: ${6804.11 - 367.74:.2f}")
