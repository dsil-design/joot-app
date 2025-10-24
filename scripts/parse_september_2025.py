import csv
import json
import re
from datetime import datetime
from typing import List, Dict, Optional

def parse_amount(amount_str: str) -> Optional[float]:
    """Parse amount string to float, handling negative values and formatting."""
    if not amount_str or amount_str.strip() == '':
        return None

    # Remove currency symbols, commas, and spaces
    cleaned = amount_str.replace('$', '').replace(',', '').replace(' ', '').strip()

    # Handle parentheses as negative
    if cleaned.startswith('(') and cleaned.endswith(')'):
        cleaned = '-' + cleaned[1:-1]

    try:
        return float(cleaned)
    except ValueError:
        return None

def parse_thb_amount(thb_str: str) -> Optional[float]:
    """Parse THB amount string to float."""
    if not thb_str or thb_str.strip() == '':
        return None

    # Remove 'THB' prefix and any formatting
    cleaned = thb_str.replace('THB', '').replace(',', '').strip()

    # Handle negative values
    if cleaned.startswith('-'):
        try:
            return float(cleaned)
        except ValueError:
            return None

    try:
        return float(cleaned)
    except ValueError:
        return None

def should_skip_row(row: List[str]) -> bool:
    """Determine if a row should be skipped."""
    if not row or len(row) < 2:
        return True

    first_col = row[0].strip() if row[0] else ''
    second_col = row[1].strip() if len(row) > 1 and row[1] else ''

    # Skip empty rows
    if not first_col and not second_col:
        return True

    # Skip headers
    if 'Desc' in second_col and 'Merchant' in (row[2] if len(row) > 2 else ''):
        return True

    # Skip daily totals and grand totals
    if 'Daily Total' in second_col or 'GRAND TOTAL' in first_col:
        return True

    # Skip subtotals and estimated
    if 'Subtotal' in first_col or 'Estimated' in first_col:
        return True

    return False

def is_date_row(text: str) -> bool:
    """Check if a row is a date row."""
    if not text:
        return False

    # Look for day names
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return any(day in text for day in days)

def parse_csv_section(csv_path: str, start_line: int, end_line: int) -> List[Dict]:
    """Parse a section of the CSV file."""
    transactions = []
    current_date = None

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)

        for line_num, row in enumerate(reader, start=1):
            # Skip until we reach the start line
            if line_num < start_line:
                continue

            # Stop at the end line
            if line_num >= end_line:
                break

            # Skip rows that should be ignored
            if should_skip_row(row):
                continue

            first_col = row[0].strip() if row[0] else ''

            # Check if this is a date row
            if is_date_row(first_col):
                # Extract date from format like "Monday, September 1, 2025"
                current_date = first_col
                continue

            # Parse transaction row
            if current_date and len(row) >= 6:
                desc = row[1].strip() if len(row) > 1 and row[1] else ''
                merchant = row[2].strip() if len(row) > 2 and row[2] else ''

                # Skip if no description
                if not desc:
                    continue

                # Skip Florida House savings transfer (appears in expense tracker but is actually savings)
                if desc.strip() == "Florida House" and merchant.strip() == "Me":
                    continue

                # Determine the structure based on number of columns
                # Expense Tracker format: Date, Desc, Merchant, Reimbursable, Business Expense, Payment Type, Actual Spent (THB), Actual Spent (USD), Conversion, Subtotal
                # NOTE: In this CSV, business expenses are marked with "X" in the Reimbursable column (column 3), not Business Expense column (column 4)

                reimbursable = row[3].strip() if len(row) > 3 and row[3] else ''
                business_expense = row[4].strip() if len(row) > 4 and row[4] else ''
                payment_type = row[5].strip() if len(row) > 5 and row[5] else ''

                # Check if this is a business expense (marked in Reimbursable column)
                is_business_expense = reimbursable.strip().upper() == 'X'

                # Parse amounts
                thb_amount = None
                usd_amount = None
                amount = 0.0
                currency = 'USD'

                if len(row) > 6 and row[6]:
                    thb_str = row[6].strip()
                    thb_amount = parse_thb_amount(thb_str)

                if len(row) > 7 and row[7]:
                    usd_str = row[7].strip()
                    usd_amount = parse_amount(usd_str)

                # Determine final amount and currency
                if thb_amount is not None and thb_amount != 0:
                    amount = thb_amount
                    currency = 'THB'
                elif usd_amount is not None:
                    amount = usd_amount
                    currency = 'USD'

                # Get subtotal (final USD amount)
                subtotal_usd = None
                if len(row) > 9 and row[9]:
                    subtotal_usd = parse_amount(row[9])

                # Determine transaction type
                transaction_type = 'income' if desc.startswith('Reimbursement:') else 'expense'

                # Build tags
                tags = []
                if desc.startswith('Reimbursement:'):
                    tags.append('Reimbursement')
                if is_business_expense:
                    tags.append('Business Expense')

                transaction = {
                    'date': current_date,
                    'description': desc,
                    'merchant': merchant,
                    'payment_method': payment_type,
                    'amount': amount,
                    'currency': currency,
                    'amount_usd': subtotal_usd if subtotal_usd is not None else (amount if currency == 'USD' else None),
                    'transaction_type': transaction_type,
                    'business_expense': is_business_expense,
                    'tags': tags
                }

                transactions.append(transaction)

    return transactions

def parse_florida_section(csv_path: str, start_line: int) -> List[Dict]:
    """Parse the Florida House Expenses section."""
    transactions = []
    current_date = None

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)

        for line_num, row in enumerate(reader, start=1):
            # Skip until we reach the start line
            if line_num < start_line:
                continue

            # Stop when we hit the next section (look for "GRAND TOTAL" or next month)
            first_col = row[0].strip() if row and row[0] else ''
            if line_num > start_line and ('GRAND TOTAL' in first_col or 'August 2025' in first_col):
                break

            # Skip rows that should be ignored
            if should_skip_row(row):
                continue

            # Check if this is a date row
            if is_date_row(first_col):
                current_date = first_col
                continue

            # Parse transaction row for Florida format
            # Format: Date, Desc, Merchant, Reimbursement, Payment Type, Subtotal
            if current_date and len(row) >= 5:
                desc = row[1].strip() if len(row) > 1 and row[1] else ''
                merchant = row[2].strip() if len(row) > 2 and row[2] else ''

                # Skip if no description
                if not desc:
                    continue

                reimbursement = row[3].strip() if len(row) > 3 and row[3] else ''
                payment_type = row[4].strip() if len(row) > 4 and row[4] else ''
                subtotal = row[5].strip() if len(row) > 5 and row[5] else ''

                # Parse amount
                amount_usd = parse_amount(subtotal)
                if amount_usd is None:
                    continue

                # Build tags
                tags = ['Florida House']

                transaction = {
                    'date': current_date,
                    'description': desc,
                    'merchant': merchant,
                    'payment_method': payment_type,
                    'amount': amount_usd,
                    'currency': 'USD',
                    'amount_usd': amount_usd,
                    'transaction_type': 'expense',
                    'business_expense': False,
                    'tags': tags,
                    'reimbursement_status': reimbursement
                }

                transactions.append(transaction)

    return transactions

def main():
    csv_path = '/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv'

    # Parse the Expense Tracker section (lines 392-608)
    print("Parsing September 2025: Expense Tracker section...")
    expense_transactions = parse_csv_section(csv_path, 392, 609)

    # Parse the Florida House section (starts at line 632)
    print("Parsing September 2025: Florida House Expenses section...")
    florida_transactions = parse_florida_section(csv_path, 632)

    # Combine all transactions
    all_transactions = expense_transactions + florida_transactions

    # Calculate statistics
    expense_count = sum(1 for t in all_transactions if t['transaction_type'] == 'expense')
    income_count = sum(1 for t in all_transactions if t['transaction_type'] == 'income')

    # Calculate total expense in USD (approximate)
    total_expense_usd = 0.0
    thb_to_usd_rate = 0.031  # Approximate conversion rate

    for t in all_transactions:
        if t['transaction_type'] == 'expense':
            if t['amount_usd'] is not None:
                total_expense_usd += t['amount_usd']
            elif t['currency'] == 'THB':
                total_expense_usd += t['amount'] * thb_to_usd_rate

    # Print summary
    print("\n" + "="*60)
    print("SEPTEMBER 2025 TRANSACTION PARSING SUMMARY")
    print("="*60)
    print(f"Total transactions found: {len(all_transactions)}")
    print(f"  - Expenses: {expense_count}")
    print(f"  - Income (Reimbursements): {income_count}")
    print(f"\nTotal expense amount (approximate USD): ${total_expense_usd:,.2f}")
    print(f"Expected amount from PDF: $6,804.11")
    print(f"Difference: ${abs(6804.11 - total_expense_usd):,.2f}")

    # Print first 10 transactions
    print("\n" + "="*60)
    print("FIRST 10 TRANSACTIONS")
    print("="*60)
    for i, t in enumerate(all_transactions[:10], 1):
        print(f"\n{i}. {t['date']}")
        print(f"   Description: {t['description']}")
        print(f"   Merchant: {t['merchant']}")
        print(f"   Payment: {t['payment_method']}")
        usd_str = f"${t['amount_usd']:.2f}" if t['amount_usd'] is not None else 'N/A'
        print(f"   Amount: {t['amount']} {t['currency']} (USD: {usd_str})")
        print(f"   Type: {t['transaction_type']}")
        print(f"   Tags: {', '.join(t['tags']) if t['tags'] else 'None'}")

    # Print last 5 transactions
    print("\n" + "="*60)
    print("LAST 5 TRANSACTIONS")
    print("="*60)
    for i, t in enumerate(all_transactions[-5:], len(all_transactions)-4):
        print(f"\n{i}. {t['date']}")
        print(f"   Description: {t['description']}")
        print(f"   Merchant: {t['merchant']}")
        print(f"   Payment: {t['payment_method']}")
        usd_str = f"${t['amount_usd']:.2f}" if t['amount_usd'] is not None else 'N/A'
        print(f"   Amount: {t['amount']} {t['currency']} (USD: {usd_str})")
        print(f"   Type: {t['transaction_type']}")
        print(f"   Tags: {', '.join(t['tags']) if t['tags'] else 'None'}")

    # Save to JSON file
    output_path = '/Users/dennis/Code Projects/joot-app/scripts/september-2025-parsed.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total_transactions': len(all_transactions),
                'expense_count': expense_count,
                'income_count': income_count,
                'total_expense_usd': total_expense_usd,
                'expected_total_usd': 6804.11,
                'difference': abs(6804.11 - total_expense_usd)
            },
            'transactions': all_transactions
        }, f, indent=2, ensure_ascii=False)

    print(f"\n\nAll transactions saved to: {output_path}")

if __name__ == '__main__':
    main()
