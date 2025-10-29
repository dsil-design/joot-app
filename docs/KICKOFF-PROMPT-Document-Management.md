# Document Management System - Kickoff Prompt

Copy and paste this prompt into a **new Claude Code tab** to begin implementation.

---

## 🚀 KICKOFF PROMPT

```
I want to implement a document management and transaction reconciliation system for Joot, my personal finance app. I have complete planning documentation ready.

IMPORTANT: This work should be done in a NEW BRANCH called `feature/document-management` separate from main development.

## Context

I have comprehensive planning documents at:
- `/Users/dennis/Code Projects/joot-app/docs/ZERO-COST-MVP-MASTER-PLAN.md` (Master plan - READ THIS FIRST)
- `/Users/dennis/Code Projects/joot-app/docs/FREE-MVP-CODE-EXAMPLES.md` (Production-ready code)
- `/Users/dennis/Code Projects/joot-app/docs/ZERO-COST-MVP-ARCHITECTURE.md` (Architecture details)
- `/Users/dennis/Code Projects/joot-app/docs/FREE-MVP-RESOURCES.md` (Setup guides)

## What You Need to Do

1. **Read the planning documents** to understand the full scope (especially ZERO-COST-MVP-MASTER-PLAN.md)

2. **Create feature branch**: `git checkout -b feature/document-management`

3. **Follow the 4-week implementation timeline** from the master plan:
   - Week 1: Database schema + Upload UI
   - Week 2: OCR (Tesseract.js) + AI Extraction (Gemini 1.5 Flash)
   - Week 3: Matching algorithm + Job queue (pg-boss)
   - Week 4: Review UI + Polish

4. **Use the free tech stack**:
   - Tesseract.js for OCR (unlimited, free)
   - Google Gemini 1.5 Flash for data extraction (1,500/day free)
   - pg-boss for job queue (uses PostgreSQL, free)
   - DuckDuckGo Favicons for vendor logos (unlimited, free)
   - Existing Supabase (database + storage)

5. **Start with Week 1, Day 1**: Database schema
   - Create migration file for 8 new tables
   - The complete SQL is in FREE-MVP-CODE-EXAMPLES.md
   - Test migration on development database

## Key Requirements

- Build on existing Next.js 13+ App Router architecture
- Use TypeScript throughout
- Follow existing patterns (RLS policies, API routes, component structure)
- Desktop-first UI (drag-drop bulk uploads)
- Auto-approve 95%+ confidence matches with undo capability
- All infrastructure must be free tier (no paid services for MVP)

## Current Codebase Structure

```
/Users/dennis/Code Projects/joot-app/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   ├── lib/             # Utilities and services
│   ├── hooks/           # Custom React hooks
│   └── types/           # TypeScript types
├── supabase/
│   └── migrations/      # Database migrations
└── docs/                # Planning documentation
```

## Expected Deliverables (Week 1)

By end of Week 1, I should have:
- [x] Feature branch created
- [x] Database migration completed (8 tables)
- [x] Supabase Storage buckets configured
- [x] Basic upload UI (drag-drop component)
- [x] API endpoint: POST /api/documents/upload
- [x] Document library view (empty state + list)

## Important Notes

- Ask me questions if anything in the planning docs is unclear
- Use the code examples from FREE-MVP-CODE-EXAMPLES.md as reference
- Test each component thoroughly before moving to the next
- Keep me updated on progress and any blockers
- Let me know when you need API keys (Gemini, etc.)

## Questions for Me (Answer Before Starting)

1. Do you have a Google Gemini API key already? (Get free at https://aistudio.google.com/)
2. Should I create the Supabase Storage buckets, or will you do that manually?
3. Any specific naming conventions you want for the new database tables?
4. Do you want me to set up the pg-boss job queue immediately, or wait until Week 3?

Let's start with creating the feature branch and reading the planning documentation. Once you've reviewed the docs, let me know and we'll begin with Week 1, Day 1: Database schema migration.
```

---

## Additional Context for Claude

After pasting the above prompt, you may want to provide:

1. **API Keys** (when needed in Week 2):
   ```bash
   # Add to .env.local
   GOOGLE_GEMINI_API_KEY=your_key_here
   ```

2. **Storage Bucket Configuration** (when needed in Week 1):
   - documents (private)
   - thumbnails (public)
   - vendor-logos (public)

3. **Development Database URL** (for pg-boss):
   - Already in your .env.local as DATABASE_URL

---

## Tips for Working with Claude Code

- **Let Claude read the docs**: Don't summarize - let it read ZERO-COST-MVP-MASTER-PLAN.md fully
- **Ask for incremental progress**: "Complete Day 1, then wait for my approval before Day 2"
- **Review code before proceeding**: Check each component works before moving on
- **Use todos**: Claude will use TodoWrite to track progress through the 4 weeks
- **Test frequently**: Run migrations, test uploads, verify API endpoints work

---

## Estimated Timeline

- **Week 1**: ~20 hours (5 days × 4 hours)
- **Week 2**: ~20 hours
- **Week 3**: ~20 hours
- **Week 4**: ~20 hours
- **Total**: ~80 hours over 4 weeks

## Success Criteria

You'll know it's working when:
1. You can drag-drop a PDF receipt
2. Tesseract extracts text from it
3. Gemini extracts merchant/amount/date
4. System auto-matches to an existing transaction (95%+ confidence)
5. You can see the matched document on the transaction detail page
6. You can undo the match if incorrect

---

Ready to paste into a new Claude Code tab and start building! 🚀
