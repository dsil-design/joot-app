# Email-to-Transaction Linking — Task Master Index

**Feature:** Email-to-Transaction Linking System
**Status:** `draft` — All phases pending approval
**Created:** 2025-01-02
**Total Phases:** 4
**Total Tasks:** 122

---

## Overview

This directory contains the complete task breakdown for implementing the Email-to-Transaction Linking feature in Joot. The work is divided into 4 phases, each with its own detailed task list.

### Related Documents

| Document | Path | Purpose |
|----------|------|---------|
| Main Spec | `design-docs/email-transaction-linking-system.md` | Complete feature specification |
| Wireframes | `design-docs/email-transaction-wireframes.md` | UI layouts and interactions |
| Roadmap | `design-docs/email-transaction-implementation-roadmap.md` | 8-week implementation plan |
| Design Decisions | `design-docs/README.md` | Finalized design decisions |

---

## Phase Summary

| Phase | Name | Tasks | Estimated Duration | Status |
|-------|------|-------|-------------------|--------|
| 1 | Foundation | 27 | 2 weeks | `draft` |
| 2 | Core Matching | 35 | 2 weeks | `draft` |
| 3 | User Experience | 32 | 2 weeks | `draft` |
| 4 | Advanced Features | 28 | 2 weeks | `draft` |
| **Total** | | **122** | **8 weeks** | |

---

## Phase Details

### Phase 1: Foundation
**File:** `phase-1-foundation-tasks.md`
**Prerequisites:** None

**Key Deliverables:**
- Database schema (`email_transactions`, `statement_uploads`, `import_activities`)
- Navigation (top-level "Imports" menu item)
- Email parsers (Grab, Bolt, Bangkok Bank, Kasikorn, Lazada)
- Import Dashboard skeleton UI
- Basic API routes

**Task Breakdown by Group:**
- Database: 5 tasks
- Navigation: 3 tasks
- Email: 9 tasks
- UI: 5 tasks
- API: 2 tasks
- Testing: 3 tasks

---

### Phase 2: Core Matching
**File:** `phase-2-core-matching-tasks.md`
**Prerequisites:** Phase 1 complete

**Key Deliverables:**
- Statement upload flow (drag-and-drop, validation, storage)
- Statement parsers (Chase, Amex, Bangkok Bank, Kasikorn)
- PDF extraction and OCR
- Matching algorithms (amount, date, vendor, cross-currency)
- Review queue with approve/reject flow
- Batch approve functionality

**Task Breakdown by Group:**
- Upload: 7 tasks
- Parsing: 7 tasks
- Matching: 6 tasks
- Review: 8 tasks
- UI: 4 tasks
- Testing: 3 tasks

---

### Phase 3: User Experience
**File:** `phase-3-user-experience-tasks.md`
**Prerequisites:** Phase 2 complete

**Key Deliverables:**
- Mobile-optimized layouts
- Swipe gestures for approve/reject
- Bottom sheet for mobile filters
- Error handling and retry logic
- Toast notifications
- Accessibility improvements
- Polish and animations

**Task Breakdown by Group:**
- Mobile: 9 tasks
- Dashboard: 3 tasks
- Error: 5 tasks
- UX: 2 tasks
- Components: 4 tasks
- Accessibility: 4 tasks
- Polish: 3 tasks
- Testing: 2 tasks

---

### Phase 4: Advanced Features
**File:** `phase-4-advanced-features-tasks.md`
**Prerequisites:** Phase 3 complete

**Key Deliverables:**
- Manual transaction linking
- Import history with export
- Settings integration
- Email detail editing
- Comprehensive testing
- Documentation

**Task Breakdown by Group:**
- Manual Link: 5 tasks
- History: 5 tasks
- Settings: 4 tasks
- Jobs: 3 tasks
- Email Detail: 4 tasks
- Final: 7 tasks

---

## Cross-Phase Dependencies

```
Phase 1: Foundation
    ├─► Database schema (required by all)
    ├─► Email parsers (required by Phase 2 matching)
    └─► Navigation/UI skeleton (required by Phase 3 polish)

Phase 2: Core Matching
    ├─► Upload flow (independent after Phase 1)
    ├─► Matching algorithms (depends on Phase 1 email parsers)
    └─► Review queue (required by Phase 3 mobile optimization)

Phase 3: User Experience
    ├─► Mobile optimization (depends on Phase 2 review queue)
    ├─► Error handling (can run parallel)
    └─► Polish (required by Phase 4 final testing)

Phase 4: Advanced Features
    ├─► Manual linking (depends on Phase 2 matching)
    ├─► History (depends on Phase 2 activity logging)
    └─► Final testing (depends on all previous phases)
```

---

## Task ID Convention

Task IDs follow the pattern: `P{phase}-{number}`

- `P1-001` through `P1-027`: Phase 1 tasks
- `P2-001` through `P2-035`: Phase 2 tasks
- `P3-001` through `P3-032`: Phase 3 tasks
- `P4-001` through `P4-028`: Phase 4 tasks

**Rules:**
- IDs are immutable after phase is approved
- New tasks are appended (never renumber)
- Split tasks get new IDs with "Split from" note
- Merged tasks marked "removed" with "Merged into" note

---

## Status Tracking

Each task file includes:
- **Task Index:** Checkboxes for quick status view
- **Per-task sections:** Detailed status, completion log
- **Dependency map:** Visual representation of task order

### Status Values

| Status | Meaning |
|--------|---------|
| `open` | Not started |
| `in_progress` | Currently being worked on |
| `blocked` | Waiting on dependency or decision |
| `done` | Completed and verified |
| `removed` | Merged or cancelled |

---

## How to Use These Task Lists

### For Planning
1. Review phase files in order
2. Identify parallel work opportunities
3. Note dependencies that must complete first

### For Implementation
1. Open the relevant phase file
2. Find the next task to work on (check dependencies)
3. Update task status as you work:
   - Add note to Completion Log when starting
   - Flip checkbox and change status when done
   - Add completion entry with timestamp

### For Tracking Progress
1. Check Task Index in each phase file
2. Count completed vs total tasks
3. Review Completion Logs for details

---

## Approval Workflow

1. **Draft Phase:** Tasks can be modified, reordered, split, merged
2. **Approval:** You review and approve each phase before implementation
3. **Approved Phase:** Task IDs frozen; only status updates allowed
4. **Implementation:** AI updates status as tasks are completed

**Current Status:** All 4 phases are in `draft` status awaiting your approval.

---

## Next Steps

1. **Review Phase 1 tasks** — Foundation work
2. **Approve or request changes** — Modify task scope if needed
3. **Begin implementation** — Start with P1-001

Would you like to approve all phases, or review each phase individually?
