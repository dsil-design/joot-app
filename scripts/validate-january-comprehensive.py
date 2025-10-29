#!/usr/bin/env python3
import json
import os
import sys
from datetime import datetime
from collections import defaultdict
import subprocess

def run_node_query():
    """Execute Node.js database query and return results"""
    query_script = """
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/dennis/Code Projects/joot-app/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('transaction_date', '2025-01-01')
    .lte('transaction_date', '2025-01-31')
    .order('transaction_date', { ascending: true });

  if (error) {
    console.error(JSON.stringify({error: error.message}));
    process.exit(1);
  }

  // Query tags
  const { data: allTags, error: tagsError } = await supabase
    .from('transaction_tags')
    .select('tag:tags(name), transaction_id');

  if (tagsError) {
    console.log(JSON.stringify({transactions, tags: []}));
  } else {
    console.log(JSON.stringify({transactions, tags: allTags}));
  }
}

main();
"""

    # Write temp script
    temp_script = '/tmp/temp_query.js'
    with open(temp_script, 'w') as f:
        f.write(query_script)

    # Run it from the app directory
    result = subprocess.run(
        ['node', temp_script],
        capture_output=True,
        text=True,
        cwd='/Users/dennis/Code Projects/joot-app'
    )

    if result.returncode != 0:
        print(f"Error running query: {result.stderr}")
        return None

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        print(f"Output: {result.stdout}")
        return None

def calculate_exchange_rate(rent1_amount_thb, rent1_amount_usd):
    """Calculate exchange rate from rent transaction"""
    if rent1_amount_thb and rent1_amount_usd:
        return rent1_amount_usd / rent1_amount_thb
    return 0.0286  # Approximate rate

def format_currency(amount, currency):
    """Format currency value"""
    if currency == 'USD':
        return f"${amount:.2f}"
    else:
        return f"{amount:,.0f} {currency}"

def main():
    print("=" * 70)
    print("JANUARY 2025 COMPREHENSIVE VALIDATION REPORT")
    print("=" * 70)
    print()

    # Get database data
    print("Querying database...")
    db_data = run_node_query()

    if not db_data:
        print("ERROR: Could not retrieve database data")
        sys.exit(1)

    transactions = db_data.get('transactions', [])
    tags_data = db_data.get('tags', [])

    print(f"Retrieved {len(transactions)} transactions")
    print()

    # LEVEL 3: Transaction Count
    print("=" * 70)
    print("LEVEL 3: TRANSACTION COUNT VERIFICATION")
    print("=" * 70)

    expenses = [t for t in transactions if t['transaction_type'] == 'expense']
    income = [t for t in transactions if t['transaction_type'] == 'income']
    usd = [t for t in transactions if t['original_currency'] == 'USD']
    thb = [t for t in transactions if t['original_currency'] == 'THB']

    print(f"Total: {len(transactions)} (Expected: 195) - {'PASS' if len(transactions) == 195 else 'FAIL'}")
    print(f"  Expenses: {len(expenses)} (Expected: 172)")
    print(f"  Income: {len(income)} (Expected: 23)")
    print(f"  USD: {len(usd)} (Expected: 92)")
    print(f"  THB: {len(thb)} (Expected: 103)")
    print()

    # LEVEL 4: Tags
    print("=" * 70)
    print("LEVEL 4: TAG DISTRIBUTION VERIFICATION")
    print("=" * 70)

    # Count tags for January
    jan_transaction_ids = set(t['id'] for t in transactions)
    tag_counts = defaultdict(int)
    for tag_entry in tags_data:
        if tag_entry.get('transaction_id') in jan_transaction_ids:
            if tag_entry.get('tag'):
                tag_name = tag_entry['tag'].get('name', '')
                if tag_name:
                    tag_counts[tag_name] += 1

    print(f"Tag Distribution:")
    for tag_name in sorted(tag_counts.keys()):
        count = tag_counts[tag_name]
        expected = {'Reimbursement': 15, 'Business Expense': 3, 'Florida House': 3}.get(tag_name, 0)
        status = 'PASS' if count == expected else 'FAIL'
        print(f"  {tag_name}: {count} (Expected: {expected}) - {status}")

    total_tags = sum(tag_counts.values())
    print(f"Total tags: {total_tags} (Expected: 21) - {'PASS' if total_tags == 21 else 'FAIL'}")
    print()

    # LEVEL 5: Critical Transactions
    print("=" * 70)
    print("LEVEL 5: CRITICAL TRANSACTION SPOT CHECKS")
    print("=" * 70)

    # Find critical transactions
    rent1 = next((t for t in transactions if
                 t['transaction_date'] == '2025-01-02' and
                 t['description'] == 'This Month\'s Rent'), None)

    rent2 = next((t for t in transactions if
                 t['transaction_date'] == '2025-01-31' and
                 t['description'] == 'First Month\'s Rent'), None)

    income_adj = next((t for t in transactions if
                      t['description'] == 'Business income correction - returned funds'), None)

    print("\nRent Transactions:")
    if rent1:
        print(f"  Rent #1 (Jan 2): FOUND")
        print(f"    Amount: {format_currency(rent1['amount'], rent1['original_currency'])}")
        print(f"    Type: {rent1['transaction_type']}")
    else:
        print(f"  Rent #1 (Jan 2): NOT FOUND - FAIL")

    if rent2:
        print(f"  Rent #2 (Jan 31): FOUND")
        print(f"    Amount: {format_currency(rent2['amount'], rent2['original_currency'])}")
        print(f"    Type: {rent2['transaction_type']}")
    else:
        print(f"  Rent #2 (Jan 31): NOT FOUND - FAIL")

    print("\nIncome Adjustment:")
    if income_adj:
        print(f"  Status: FOUND")
        print(f"  Amount: {format_currency(income_adj['amount'], income_adj['original_currency'])}")
        print(f"  Type: {income_adj['transaction_type']} (Expected: expense) - {'PASS' if income_adj['transaction_type'] == 'expense' else 'FAIL'}")
        print(f"  Date: {income_adj['transaction_date']}")
    else:
        print(f"  Status: NOT FOUND - FAIL")

    print("\nFlorida House Transactions:")
    florida_house_ids = set()
    for tag_entry in tags_data:
        if tag_entry.get('transaction_id') in jan_transaction_ids:
            if tag_entry.get('tag', {}).get('name') == 'Florida House':
                florida_house_ids.add(tag_entry['transaction_id'])

    florida_house = [t for t in transactions if t['id'] in florida_house_ids]
    print(f"  Count: {len(florida_house)} (Expected: 3) - {'PASS' if len(florida_house) == 3 else 'FAIL'}")
    for fh in sorted(florida_house, key=lambda t: t['transaction_date'])[:3]:
        print(f"    - {fh['transaction_date']}: {fh['description']} - {format_currency(fh['amount'], fh['original_currency'])}")

    print()

    # Sample transactions
    print("=" * 70)
    print("SAMPLE TRANSACTIONS")
    print("=" * 70)

    sorted_txns = sorted(transactions, key=lambda t: t['amount'], reverse=True)
    print("\nLargest 10 transactions:")
    for i, t in enumerate(sorted_txns[:10], 1):
        desc = t['description'][:35].ljust(35)
        print(f"{i:2}. {t['transaction_date']} | {desc} | {format_currency(t['amount'], t['original_currency']):>15}")

    print("\nFirst 5 transactions of month:")
    for i, t in enumerate(sorted(transactions, key=lambda t: t['transaction_date'])[:5], 1):
        desc = t['description'][:35].ljust(35)
        print(f"{i}. {t['transaction_date']} | {desc} | {format_currency(t['amount'], t['original_currency']):>15}")

    print()
    print("=" * 70)
    print("VALIDATION COMPLETE")
    print("=" * 70)

if __name__ == '__main__':
    main()
