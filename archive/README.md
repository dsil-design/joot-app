# Historical Import Files Archive
**Created:** October 27, 2025
**Purpose:** Organized archive of all historical transaction import files

---

## 📁 Directory Structure

```
archive/
├── README.md (this file)
└── historical-imports/
    ├── prompts/              # Import prompts used for each month
    ├── protocols/            # Protocol documents and guides
    ├── validation-reports/   # Validation summaries and reports
    ├── summaries/            # Executive summaries and progress tracking
    └── miscellaneous/        # Other import-related files
```

---

## 📚 What's in Each Directory

### prompts/
Contains the original import prompts used to execute each month's import.

**Files:** 17 import prompts
- SEPTEMBER-2024-IMPORT-PROMPT.md
- OCTOBER-2024-IMPORT-PROMPT.md (+ FULL version)
- NOVEMBER-2024-IMPORT-PROMPT.md (+ FULL version)
- DECEMBER-2024-IMPORT-PROMPT.md
- JANUARY-2025-IMPORT-PROMPT.md
- FEBRUARY-2025-IMPORT-PROMPT.md
- MARCH-2025-IMPORT-PROMPT.md
- APRIL-2025-IMPORT-PROMPT.md
- MAY-2025-IMPORT-PROMPT.md (+ MAY_2025 version)
- JUNE-2025-IMPORT-PROMPT.md (+ COMPREHENSIVE version)
- JULY_2025_IMPORT_PROMPT.md
- SEPTEMBER_2025_IMPORT_SUCCESS.md
- SEPTEMBER-2024-IMPORT-PROMPT-SHORT.md.backup

**Use:** Reference when troubleshooting similar months or understanding historical context

---

### protocols/
Contains protocol documents that guided import processes.

**Files:** 5 protocol documents
- APRIL-2025-IMPORT-PROTOCOL.md
- MAY-2025-IMPORT-PROTOCOL.md
- JUNE-2025-IMPORT-PROTOCOL.md
- MARCH-2025-IMPORT-PROTOCOL.md
- COMPREHENSIVE-VALIDATION-PROTOCOL.md

**Use:** See how protocols evolved over time

**Note:** Current active protocols are in `/scripts/`:
- MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md (single month)
- BATCH-IMPORT-PROTOCOL-v1.0.md (3+ months)

---

### validation-reports/
Contains validation summaries and cross-month reports.

**Files:** 10 validation files
- APRIL-2025-FINAL-VALIDATION-SUMMARY.md
- FEBRUARY-2025-RED-FLAGS.md
- JUNE-2025-VALIDATION-COMPLETE.md
- JUNE-2025-VALIDATION-INDEX.md
- JUNE-2025-VALIDATION-REPORT.md
- JULY-2025-VALIDATION-SUMMARY.md
- MAY-2025-VALIDATION-SUMMARY.md
- VALIDATION-EXECUTION-SUMMARY.md
- VALIDATION-FILES-INDEX.txt
- VALIDATION-QUICK-REFERENCE.txt

**Use:** Reference validation approaches and results

**Note:** Month-specific validation files are in `/scripts/archive/monthly-imports/{month}/`

---

### summaries/
Contains executive summaries and import progress tracking.

**Files:** 5 summary documents
- FEBRUARY-2025-EXECUTIVE-SUMMARY.md
- HISTORICAL-IMPORT-PROGRESS.md
- JUNE-2025-IMPORT-COMPLETE.md
- JULY-2025-CORRECTED-IMPORT-COMPLETE.md
- JULY-2025-PDF-VERIFICATION-COMPLETE.md

**Use:** Quick overview of import progress and key milestones

---

### miscellaneous/
Contains other import-related files that don't fit above categories.

**Files:** 4 miscellaneous files
- IMPORT_PLAN.md
- CORRECTED-IMPORT-PROMPT.md
- APRIL-2025-QUICK-REFERENCE.txt
- MARCH-2025-QUICK-START.md

**Use:** Historical reference and early planning documents

---

## 📂 Monthly Import Files (in scripts/archive/)

Monthly-specific files (preflight reports, red flags, validation reports, etc.) are organized in:

```
scripts/archive/monthly-imports/
├── september-2024/
├── october-2024/
├── november-2024/
├── december-2024/
├── january-2025/
├── february-2025/
├── march-2025/
├── april-2025/
├── may-2025/
├── june-2025/
├── july-2025/
├── august-2025/
└── september-2025/
```

Each monthly directory contains:
- PREFLIGHT-REPORT.md
- RED-FLAGS.md
- VALIDATION-REPORT.md
- COMPREHENSIVE-VALIDATION.md
- PARSE-REPORT.md
- {month}-CORRECTED.json
- Various supporting .json files

---

## 🎯 Current Active Files (Not in Archive)

The following files remain in active use and are NOT archived:

### Root Directory:
- **KNOWLEDGE-EXTRACTION-COMPLETE-ANALYSIS.md** - Master knowledge base (59KB, 1,725 lines)
- **PDF-MONTH-MAPPING.md** - PDF page calculation reference

### Scripts Directory:
- **MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md** - Single month import protocol
- **BATCH-IMPORT-PROTOCOL-v1.0.md** - Batch import protocol
- **MASTER-KNOWLEDGE-BASE-INDEX.md** - Knowledge base navigation
- **FINAL_PARSING_RULES.md** - CSV parsing rules (needs update to v2.0)
- **PROTOCOL-EVOLUTION-NOTES.md** - Protocol change history
- **batch-imports/** - Active batch import directory

### Scripts Archive:
- **scripts/archive/monthly-imports/** - Month-specific files
- **scripts/organize-import-files.sh** - This organization script

---

## 📊 Archive Statistics

**Total Files Moved:** ~200+ files
**Months Covered:** 15 (September 2024 - October 2025)
**Organizational Date:** October 27, 2025
**Files Deleted:** 0 (all files preserved)

---

## 🔍 Finding Specific Information

**Looking for:**

- **Lessons from a specific month?**
  → Check `/scripts/archive/monthly-imports/{month}/RED-FLAGS.md`

- **How a month was imported?**
  → Check `archive/historical-imports/prompts/{MONTH}-IMPORT-PROMPT.md`

- **Validation results for a month?**
  → Check `/scripts/archive/monthly-imports/{month}/VALIDATION-REPORT.md`

- **Complete knowledge from all months?**
  → Check `/KNOWLEDGE-EXTRACTION-COMPLETE-ANALYSIS.md` (root, not in archive)

- **Current import procedures?**
  → Check `/scripts/MONTHLY-TRANSACTION-IMPORT-PROTOCOL-v3.6.md`
  → Or `/scripts/BATCH-IMPORT-PROTOCOL-v1.0.md` for batch imports

---

## 🔧 Maintenance

**This archive should be:**
- Kept intact (do not delete files)
- Referenced for historical context
- Updated when new organizational needs arise

**Do NOT:**
- Delete files from this archive
- Move current active files here
- Use archived protocols for new imports (use current versions instead)

---

## 📝 Version History

**v1.0 (October 27, 2025)**
- Initial organization of 15 months of import files
- Created structured archive directories
- Moved 200+ files from root and scripts to organized locations
- Preserved all historical data

---

**Status:** ✅ COMPLETE & ORGANIZED
**All historical files preserved and accessible**
