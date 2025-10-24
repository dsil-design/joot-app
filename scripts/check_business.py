import json

data = json.load(open('/Users/dennis/Code Projects/joot-app/scripts/september-2025-parsed.json'))
expenses = [t for t in data['transactions'] if t['transaction_type'] == 'expense']
business_flagged = [t for t in expenses if t['business_expense'] == True]

print(f"Business expense transactions: {len(business_flagged)}")
for t in business_flagged:
    print(f"  ${t['amount_usd']:.2f} - {t['description']}")
