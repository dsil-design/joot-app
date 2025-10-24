import json

# Load the parsed data
with open('/Users/dennis/Code Projects/joot-app/scripts/september-2025-parsed.json', 'r') as f:
    data = json.load(f)

transactions = data['transactions']

# Florida House section transactions
florida_transactions = [t for t in transactions if 'Florida House' in t['tags']]
florida_total = sum(t['amount_usd'] for t in florida_transactions if t['transaction_type'] == 'expense')
print(f"Florida House section total: ${florida_total:.2f}")
print(f"Florida House count: {len(florida_transactions)}")

# Expense Tracker transactions (excluding Florida section)
expense_tracker = [t for t in transactions if 'Florida House' not in t['tags'] and t['transaction_type'] == 'expense']
expense_tracker_total = sum(t['amount_usd'] for t in expense_tracker if t['amount_usd'] is not None)
print(f"\nExpense Tracker total: ${expense_tracker_total:.2f}")
print(f"Expense Tracker count: {len(expense_tracker)}")

# Combined
combined_total = florida_total + expense_tracker_total
print(f"\nCombined total: ${combined_total:.2f}")
print(f"Expected: $6,804.11")
print(f"Difference: ${abs(6804.11 - combined_total):.2f}")

# Look for specific problematic entries
print("\n\nSearching for potential savings/investment entries that shouldn't be counted:")
for t in expense_tracker:
    desc = t['description'].lower()
    if 'florida house' in desc or 'savings' in desc or 'investment' in desc:
        print(f"  ${t['amount_usd']:.2f} - {t['description']} ({t['date']})")

print("\n\nAll September 1 expenses:")
sept_1_expenses = [t for t in expense_tracker if 'September 1' in t['date']]
for t in sept_1_expenses:
    print(f"  ${t['amount_usd']:.2f} - {t['description']}")
