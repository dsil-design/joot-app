import csv

with open('/Users/dennis/Code Projects/joot-app/csv_imports/fullImport_20251017.csv', 'r') as f:
    reader = csv.reader(f)
    for i, row in enumerate(reader, 1):
        if i == 393:
            print(f"Header row ({len(row)} columns):")
            for idx, col in enumerate(row):
                print(f"  [{idx}] = '{col}'")
        if i == 402:
            print(f"\nRow 402 ({len(row)} columns) - Cosmetic Cream:")
            for idx, col in enumerate(row):
                print(f"  [{idx}] = '{col}'")
        if i == 430:
            print(f"\nRow 430 ({len(row)} columns) - Gas:")
            for idx, col in enumerate(row):
                print(f"  [{idx}] = '{col}'")
        if i > 430:
            break
