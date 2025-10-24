# PDF Month Mapping Reference

**CRITICAL**: This file documents the PDF naming pattern for monthly imports. All import protocols MUST reference this file.

## 📁 PDF File Naming Pattern

The master budget spreadsheet exports each month to a separate PDF page. The pattern follows **reverse chronological order**:

```
October 2025  → Budget for Import-page1.pdf
September 2025 → Budget for Import-page2.pdf
August 2025    → Budget for Import-page3.pdf
July 2025      → Budget for Import-page4.pdf
June 2025      → Budget for Import-page5.pdf
May 2025       → Budget for Import-page6.pdf
April 2025     → Budget for Import-page7.pdf
March 2025     → Budget for Import-page8.pdf
February 2025  → Budget for Import-page9.pdf
January 2025   → Budget for Import-page10.pdf
December 2024  → Budget for Import-page11.pdf
November 2024  → Budget for Import-page12.pdf
```

**Formula**: `page_number = (October's page) + (months_back_from_October)`

Example:
- October 2025 = page 1
- March 2025 = 7 months back from October = page 8 ✅
- January 2025 = 9 months back from October = page 10

## 🔍 PDF Verification Logic

### Method 1: Use Date Pattern (RECOMMENDED)
Every PDF contains date rows in the format:
- `"Thursday, March 1, 2025"`
- `"Friday, March 2, 2025"`
- etc.

**Verification Steps**:
1. Read the PDF file
2. Look for first date string (usually appears early in "Expense Tracker" section)
3. Extract month and year from date string
4. Compare to target import month
5. If mismatch → STOP and ask user for correct PDF path

### Method 2: Use Page Number Calculation
Given target month (e.g., "March 2025"):
1. Calculate months back from October 2025
2. Calculate expected page number: `1 + months_back`
3. Construct expected filename: `Budget for Import-page{N}.pdf`
4. Verify file exists
5. Read PDF and confirm with Method 1

## 🚨 What to Do If PDF Doesn't Match

If agent detects wrong month in PDF:

```
❌ PDF VERIFICATION FAILED
Expected: March 2025
Found: May 2025 (Budget for Import-page6.pdf)

Correct PDF path should be: csv_imports/Master Reference PDFs/Budget for Import-page8.pdf

Please confirm this path before continuing, or provide the correct PDF path.
```

## 📋 Quick Reference Table

| Month | Page # | Months from Oct 2025 |
|-------|--------|---------------------|
| October 2025 | 1 | 0 |
| September 2025 | 2 | 1 |
| August 2025 | 3 | 2 |
| July 2025 | 4 | 3 |
| June 2025 | 5 | 4 |
| May 2025 | 6 | 5 |
| April 2025 | 7 | 6 |
| **March 2025** | **8** | **7** |
| February 2025 | 9 | 8 |
| January 2025 | 10 | 9 |
| December 2024 | 11 | 10 |
| November 2024 | 12 | 11 |

## 🔧 Implementation for Future Protocols

When creating a new monthly import protocol (e.g., `FEBRUARY-2025-IMPORT-PROTOCOL.md`), the protocol creator should:

1. **Calculate page number** using the formula above
2. **Set PDF path** in the protocol: `Budget for Import-page9.pdf` (for February)
3. **Add verification step** to Phase 1 Pre-Flight prompt:
   ```
   STEP 0 - CRITICAL PDF VERIFICATION:
   1. Read: csv_imports/Master Reference PDFs/Budget for Import-page9.pdf
   2. Verify first date shows "February 2025" (e.g., "Saturday, February 1, 2025")
   3. If wrong month detected, STOP and report mismatch
   ```

## 📝 Agent Instructions

When an agent is asked to create a new import protocol:

1. **Identify target month** (e.g., "February 2025")
2. **Calculate page number**:
   - October 2025 = baseline (page 1)
   - Count months backward from October to target month
   - Page number = 1 + months_back
3. **Set PDF path** in protocol
4. **Add verification step** to Phase 1
5. **Include fallback**: If calculated page doesn't exist, ask user for correct path

## 🎯 Example: Creating Protocol for February 2025

```javascript
// Calculate page number
const targetMonth = "February 2025";
const octoberPage = 1;
const monthsBack = 8; // October → September (1) → August (2) → ... → February (8)
const expectedPage = octoberPage + monthsBack; // = 9

// PDF path
const pdfPath = `csv_imports/Master Reference PDFs/Budget for Import-page${expectedPage}.pdf`;

// Verification in Phase 1
const verificationStep = `
STEP 0 - CRITICAL PDF VERIFICATION:
1. Read: ${pdfPath}
2. Verify first date shows "${targetMonth}" (e.g., "Saturday, February 1, 2025")
3. If wrong month detected, STOP and report mismatch to user
`;
```

---

**Last Updated**: October 24, 2025
**Status**: APPROVED FOR ALL FUTURE IMPORTS
**Referenced By**: All monthly import protocols (March 2025 onwards)
