import json

# Load the parsed data
with open('/Users/dennis/Code Projects/joot-app/scripts/september-2025-parsed.json', 'r') as f:
    data = json.load(f)

transactions = data['transactions']

# Check for reimbursements that might have been miscategorized
print("Reimbursement transactions:")
reimbursements = [t for t in transactions if t['transaction_type'] == 'income']
for t in reimbursements:
    print(f"  ${t['amount_usd']:.2f} - {t['description']} - Amount: {t['amount']} {t['currency']}")

print(f"\nTotal reimbursements: {len(reimbursements)}")
total_reimbursed = sum(t['amount_usd'] for t in reimbursements if t['amount_usd'] is not None)
print(f"Total reimbursed amount: ${abs(total_reimbursed):.2f}")

# Check reimbursements with zero amount (THB column but no USD conversion)
print("\n\nReimbursements with 0 USD amount:")
zero_reimbursements = [t for t in reimbursements if t['amount_usd'] == 0 or t['amount'] == 0]
for t in zero_reimbursements:
    print(f"  {t['description']} - THB: {t['amount']}, USD: ${t['amount_usd']}")
