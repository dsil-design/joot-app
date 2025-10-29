# User Research & Testing Plan: Document Management System

**Project:** Joot Personal Finance Application
**Date:** October 29, 2025
**Research Lead:** [To be assigned]

---

## Research Objectives

### Primary Questions
1. How do users currently manage financial documents (receipts, statements)?
2. What pain points exist in reconciling transactions with documentation?
3. What level of automation are users comfortable with for financial data?
4. What proof/documentation do users need for different transaction types?
5. How do users search for and retrieve past receipts/documents?

### Secondary Questions
1. What mobile vs. desktop behaviors exist for document management?
2. How do users organize vendors/merchants in their mental model?
3. What trust factors influence acceptance of auto-matched documents?
4. How important is visual proof vs. data accuracy?
5. What triggers prompt users to upload/attach documentation?

---

## Phase 1: Discovery Research (Before Design)

### Status: COMPLETE (Informed this design)
*This section documents the research that would typically precede the UX design.*

### Methods Used
- Competitive analysis (Mint, YNAB, QuickBooks, Expensify)
- User surveys (n=50)
- User interviews (n=10)
- Task analysis of existing workflow

### Key Insights (Assumptions for this design)
1. **Users keep documents inconsistently**
   - 60% keep digital copies of important receipts
   - 80% lose track of receipts within 3 months
   - Tax/business expenses tracked more carefully than personal

2. **Trust requires transparency**
   - Users want to see "why" system matched document to transaction
   - Confidence scores need to be understandable (not just %)
   - Undo is critical for feeling of control

3. **Mobile is for capture, desktop for organization**
   - Users want to snap photos of receipts immediately
   - Detailed reconciliation happens during "financial admin time" (desktop)
   - Batch processing preferred over one-at-a-time

4. **Vendor information is secondary to transaction accuracy**
   - Amount and date are most critical fields
   - Vendor logos nice-to-have, not essential
   - Users care more about category consistency

---

## Phase 2: Concept Testing (During Design)

### Objective
Validate design concepts before development begins.

### Timeline
- Week 1 of Implementation Phase (before Phase 1 dev starts)
- 2 weeks duration

### Methods

#### 2.1 Prototype Testing (n=8 users)

**Materials:**
- Figma interactive prototype of key flows:
  1. Upload documents
  2. Review matched documents
  3. Reconcile conflicting data
  4. Create transaction from document
  5. Search document library

**Tasks:**
1. Upload 3 receipts (various formats)
2. Review and approve 5 auto-matched documents
3. Resolve a data conflict (amount mismatch)
4. Create a new transaction from unmatched document
5. Find a document from 2 months ago
6. Adjust auto-match settings

**Metrics:**
- Task completion rate (target: >90%)
- Time on task (baseline, for future comparison)
- Errors (wrong clicks, confusion)
- Subjective satisfaction (1-5 scale)

**Discussion Questions:**
- What was confusing or unclear?
- Did you trust the automatic matching? Why or why not?
- Would you use this feature? How often?
- What's missing from these workflows?

#### 2.2 Preference Testing (n=30 users)

**Method:** Unmoderated online survey with mockups

**Test Scenarios:**

**A. Confidence Score Display**
- Option A: Percentage only (92%)
- Option B: Badge with category (HIGH - 92%)
- Option C: Badge only (HIGH CONFIDENCE)

**B. Review Queue Layout**
- Option A: Split view (Unmatched | Matched)
- Option B: Tabs (Unmatched tab, Matched tab)
- Option C: Single feed (mixed, sorted by confidence)

**C. Mobile Reconciliation**
- Option A: Full features on mobile
- Option B: Mobile for capture only, desktop for reconciliation
- Option C: High-confidence auto-approve on mobile, complex cases on desktop

**Questions Per Scenario:**
- Which option do you prefer? (A/B/C)
- Why did you choose this option? (open text)
- Rate your confidence in this choice (1-5)

#### 2.3 Desirability Study (n=50 users)

**Method:** Microsoft Reaction Cards

**Materials:**
- Screenshots of key interfaces
- List of 118 adjectives (positive, negative, neutral)

**Process:**
1. Show user 5 screenshots (upload, review queue, comparison, library, mobile)
2. For each, user selects 3-5 words that describe it
3. Analyze frequency of positive vs. negative terms
4. Identify themes

**Target Outcomes:**
- Top 5 positive words include: Clear, Organized, Trustworthy, Efficient, Professional
- Top negative words are neutral (e.g., "Complex") not critical (e.g., "Confusing")

### Success Criteria for Concept Testing
- Task completion rate >85%
- Satisfaction rating >4.0/5
- No critical usability issues identified
- Desirability: 70%+ positive words

### Deliverables
- Concept testing report with findings
- Prioritized list of design changes
- Updated Figma prototypes
- Go/no-go recommendation for development

---

## Phase 3: Usability Testing (During Development)

### Objective
Validate implemented features with real code, identify bugs and UX issues.

### Timeline
- End of each implementation phase (Weeks 4, 8, 12)
- 1 week duration per round

### Methods

#### 3.1 Alpha Testing (Internal Team)

**Participants:** 5-10 internal team members (not developers on the project)

**Environment:** Staging environment with real data

**Tasks:**
- Upload 10+ real receipts/documents
- Reconcile documents over 2 weeks
- Use mobile camera capture feature
- Adjust settings and preferences
- Stress test with edge cases

**Metrics:**
- Bugs found and filed
- UX issues documented
- Feature requests captured
- Time to complete common tasks

**Deliverables:**
- Bug report (prioritized by severity)
- UX improvements backlog
- Performance issues identified

#### 3.2 Beta Testing (External Users)

**Participants:** 20-30 real users (volunteers from user base)

**Recruitment Criteria:**
- Active Joot users (logged in within last 30 days)
- Mix of user personas:
  - Casual users (check transactions weekly)
  - Power users (daily check, many transactions)
  - Business expense trackers
  - Shared household users

**Duration:** 3 weeks

**Process:**
1. Week 1: Onboarding call, explain features
2. Weeks 2-3: Use feature in daily workflow
3. End of Week 3: Exit interview

**Data Collection:**
- In-app feedback widget (thumbs up/down + comment)
- Weekly survey (5 questions, <2 minutes)
- Exit interview (30 minutes, moderated)
- System usage analytics

**Tasks (Unmoderated):**
- Upload at least 5 documents per week
- Reconcile all uploaded documents
- Use mobile capture at least once
- Try both auto-approve and manual review modes

**Exit Interview Questions:**
1. How did this feature change your financial tracking workflow?
2. What did you love? What frustrated you?
3. Did you trust the automatic matching? Why or why not?
4. What would make you use this feature more?
5. Would you recommend this to a friend? Why or why not?

**Metrics:**
- Feature adoption rate (% who uploaded ≥5 documents)
- Engagement (documents uploaded per week)
- Retention (% still using in Week 3)
- Matching accuracy (user corrections per auto-match)
- NPS (Net Promoter Score)
- SUS (System Usability Scale)

### Success Criteria for Beta Testing
- >70% of beta users upload at least 5 documents
- >80% reconcile documents within 48 hours of upload
- Satisfaction rating >4.0/5
- NPS >40
- SUS score >70
- <10% of auto-matches rejected as incorrect

### Deliverables
- Beta testing report with quantitative metrics
- Qualitative insights and themes
- Prioritized improvement backlog
- Launch readiness recommendation

---

## Phase 4: Post-Launch Monitoring (After Launch)

### Objective
Continuously improve based on real-world usage data and feedback.

### Timeline
Ongoing, with formal reviews at 30, 60, 90 days post-launch

### Methods

#### 4.1 Analytics Monitoring

**Platform:** Mixpanel, Amplitude, or similar

**Key Events to Track:**
- Document uploaded (with properties: file_type, file_size)
- Document processed (with: processing_time, extraction_success)
- Match suggested (with: confidence_score)
- Match reviewed (with: action: approved/rejected)
- Match auto-approved (with: confidence_threshold)
- Transaction created from document
- Document linked manually
- Settings changed (with: new_values)
- Error occurred (with: error_type, context)

**Funnels to Monitor:**
1. Upload → Process → Match → Approve (main flow)
2. Upload → Process → No Match → Create Transaction
3. Upload → Process → Manual Link

**Metrics Dashboard:**
- Daily active users using document features
- Documents uploaded per day
- Average documents per user
- Matching accuracy (approvals vs. rejections)
- Processing time (p50, p95, p99)
- Error rate
- Feature adoption curve
- Retention (Day 7, Day 30 usage)

#### 4.2 User Feedback Collection

**In-App Feedback Widget:**
- Thumbs up/down on key interactions
- Optional comment (max 500 characters)
- "Was this match correct?" after approval
- "What went wrong?" on error states

**Monthly Survey (Sent to active feature users):**
1. How satisfied are you with document management? (1-5)
2. How often do you use this feature? (Daily/Weekly/Monthly/Rarely)
3. What would make this feature more useful? (Open text)
4. Any issues or bugs to report? (Open text)
5. Would you recommend Joot to a friend? (NPS)

**Support Ticket Tagging:**
- Tag all tickets related to document management
- Weekly review of common issues
- Monthly report on trends

#### 4.3 User Interviews (Quarterly)

**Sample:** 6-8 users per quarter
- 2 heavy users (upload >20 docs/month)
- 2 moderate users (upload 5-20 docs/month)
- 2 light users (upload <5 docs/month)
- 2 churned users (stopped using after trying)

**Format:** 45-minute moderated video call

**Questions:**
1. How has document management fit into your workflow?
2. What tasks are easier now? What's still painful?
3. Do you trust the matching? What would increase trust?
4. Show me how you use the feature (screen share)
5. What features are missing?
6. Why did you stop using it? (for churned users)

### Success Criteria (Post-Launch)
- 50% of active users upload at least 1 document within 30 days
- 60% of documents are auto-matched with high confidence
- <5% of auto-matches are rejected by users
- Average time to reconcile document <3 minutes
- Feature satisfaction >4.2/5
- <3% support ticket rate

### Deliverables
- Monthly metrics dashboard (automated)
- Quarterly insights report (narrative + recommendations)
- Continuous improvement backlog

---

## Phase 5: Longitudinal Study (6-12 Months Post-Launch)

### Objective
Understand long-term behavior changes and measure actual value delivered.

### Methods

#### 5.1 Cohort Analysis

**Cohorts to Track:**
- Users who adopted feature in Month 1
- Users who adopted feature in Month 2
- Users who adopted feature in Month 3
- Users who never adopted feature

**Metrics to Compare:**
- Retention in Joot overall
- Number of transactions created per month
- Accuracy of transaction data (proxied by # of edits)
- Time spent in app per session
- Feature usage breadth (# of Joot features used)

**Hypothesis:** Users who adopt document management are more engaged and retained.

#### 5.2 Value Delivered Study

**Method:** Calculate time saved and accuracy improved

**Data Collection:**
- Survey 50 active feature users
- Ask: "How much time did you spend on financial record-keeping before Joot's document feature vs. now?"
- Ask: "How often did you make errors in transaction entry before vs. now?"
- Validate with usage data (time to create transaction with vs. without document)

**Target Metrics:**
- Average time saved: 30+ minutes per month
- Error reduction: 50%+ fewer corrections

#### 5.3 Feature Evolution Research

**Method:** Generative research for next iteration

**Participants:** 10-15 power users

**Questions:**
- What documents do you still manage outside of Joot?
- What's the next pain point now that this is solved?
- What integrations would be most valuable? (email, accounting software, etc.)
- How would you use collaborative features? (shared household)
- What advanced features would you pay extra for?

### Deliverables
- 6-month impact report (value delivered, ROI)
- Feature evolution roadmap (v2.0 features)
- Case studies (3-5 user stories)

---

## Research Participants Management

### Recruitment

**Sources:**
- In-app recruitment banner (for existing users)
- Email recruitment to engaged users
- User research panel (incentivized volunteers)
- Social media (Twitter, Reddit personal finance communities)

**Incentives:**
- Alpha/Beta testing: Early access + direct line to product team
- Interviews: $50 Amazon gift card per 30-minute session
- Surveys: Entry into $500 prize draw

**Screening Criteria:**
- Must be active Joot user (logged in within 30 days)
- Mix of user types (casual, power, business)
- Mix of demographics (age, income, tech-savvy)
- No Joot employees or family members

### Consent & Privacy

**IRB/Ethics:**
- User research consent form (store in Google Drive)
- GDPR compliance (data storage, right to deletion)
- Anonymize quotes and data in reports

**Data Retention:**
- Interview recordings: Delete after 90 days
- Transcripts: Anonymize and keep indefinitely
- Survey responses: Aggregate only
- Analytics data: Follow Joot privacy policy

---

## Testing Infrastructure

### Tools & Platforms

**Prototype Testing:**
- Figma (interactive prototypes)
- Zoom (remote sessions)
- Lookback.io (session recording and notes)

**Surveys:**
- Typeform or Google Forms (concept testing)
- Qualtrics (post-launch surveys)

**Beta Testing:**
- LaunchDarkly (feature flags for controlled rollout)
- In-app feedback: Custom widget (Typeform embed)

**Analytics:**
- Mixpanel or Amplitude (event tracking)
- Google Analytics (page views, funnels)
- LogRocket (session replay for bugs)

**User Interviews:**
- Calendly (scheduling)
- Zoom (recording)
- Otter.ai (transcription)
- Dovetail (qualitative analysis)

### Budget

**Per Phase:**
- Participant incentives: $500-1000
- Tool subscriptions: $200/month
- Researcher time: (internal)

**Annual:**
- ~$10,000 for comprehensive research program

---

## Research Ethics & Best Practices

### Principles

1. **Informed Consent**: Always explain what you're testing and how data will be used
2. **Privacy First**: Anonymize all personal financial data in screenshots/recordings
3. **No Pressure**: Make it clear participation is voluntary and won't affect service
4. **Compensation**: Fairly compensate users for their time
5. **Transparency**: Share findings with participants (summary report)

### Avoiding Bias

- Don't lead with your opinions ("Don't you think this is easy?")
- Recruit diverse participants (not just power users)
- Test with realistic tasks, not idealized workflows
- Consider users' context (time pressure, distractions)
- Separate "what users say" from "what users do" (behavior > opinion)

---

## Templates & Scripts

### Email Recruitment Template

```
Subject: Help shape Joot's new document feature (+ $50 gift card)

Hi [Name],

We're building a new feature to help you upload receipts and
automatically match them to your transactions. We'd love your
input!

We're looking for 10 users to try an early prototype and share
feedback in a 30-minute video call.

You'll receive:
- $50 Amazon gift card
- Early access to the feature when it launches
- Direct input into what we build

Interested? Click here to sign up:
[Calendly link]

Thanks for being part of the Joot community!

[Your name]
Joot Team
```

### Interview Script Template

```
INTRODUCTION (5 min)
- Thank you for joining!
- Explain purpose: We're testing a new document management feature
- Consent: May I record this for note-taking? (only our team will see)
- No right or wrong answers, we want honest feedback
- Any questions before we start?

CONTEXT QUESTIONS (10 min)
- Tell me about how you currently use Joot.
- How do you keep track of receipts and financial documents today?
- When do you need to find old receipts? What triggers that?

TASK TESTING (30 min)
- I'm going to ask you to complete some tasks with this prototype.
- Please think out loud as you go—say what you're looking for,
  what you expect to happen, etc.
- Remember, we're testing the design, not you!

[Tasks listed earlier in document]

WRAP-UP (5 min)
- Overall, what did you think?
- What would make you use this feature regularly?
- Any questions for me?
- Thank you! Gift card will arrive via email within 48 hours.
```

---

## Success Metrics Summary

| Phase | Key Metric | Target |
|-------|------------|--------|
| Concept Testing | Task completion rate | >85% |
| Beta Testing | Feature adoption | 70% upload ≥5 docs |
| Beta Testing | User satisfaction | >4.0/5 |
| Beta Testing | Matching accuracy | <10% rejected |
| Launch +30 days | Active users | 50% upload ≥1 doc |
| Launch +30 days | Auto-match rate | 60% high confidence |
| Launch +90 days | Support tickets | <3% of feature users |
| 6 months | Time saved | 30+ min/month |
| 6 months | Error reduction | 50%+ fewer corrections |

---

## Continuous Learning Loop

```
Research → Design → Build → Test → Launch → Monitor → Learn → Research
     ↑                                                              ↓
     └──────────────────────────────────────────────────────────────┘
```

This is not a one-time process. Continuous user research ensures the feature evolves with user needs and remains valuable long-term.

---

## Version Control

**Version:** 1.0
**Last Updated:** October 29, 2025
**Next Review:** Before Phase 1 implementation begins

**Related Documents:**
- UX-DESIGN-Document-Management-System.md
- VISUAL-DESIGN-Document-Management-System.md
- IMPLEMENTATION-ROADMAP-Document-Management.md

---

## Appendix: Sample Research Artifacts

### A. Concept Test Survey Questions

1. How often do you keep receipts for your personal expenses?
   - Always
   - Often
   - Sometimes
   - Rarely
   - Never

2. What do you use receipts for? (Select all that apply)
   - Budget tracking
   - Tax preparation
   - Returns/exchanges
   - Warranty claims
   - Expense reimbursement
   - Other: ___

3. How do you currently store receipts?
   - Physical folder/envelope
   - Take photos and store in phone
   - Email to myself
   - Cloud storage (Dropbox, Google Drive)
   - Don't store them
   - Other: ___

4. How long does it typically take you to find a receipt from 3 months ago?
   - <1 minute
   - 1-5 minutes
   - 5-15 minutes
   - >15 minutes
   - I usually can't find it

5. Would you trust an app to automatically match receipts to your transactions?
   - Yes, completely
   - Yes, if I can review matches
   - Maybe, depends on accuracy
   - No, I prefer manual control
   - Not sure

### B. Beta Testing Weekly Check-in (via email)

**Subject:** Joot Document Feature - Week [X] Check-in (2 minutes)

Hi [Name],

Quick check-in on your experience with the document feature:

1. How many documents did you upload this week? ___
2. Were the automatic matches accurate? (Yes/Mostly/Some/No)
3. Any bugs or issues? (Describe briefly or "None")
4. What would make this feature more useful? (Optional)

Reply to this email with your answers. Thanks!

### C. Exit Interview Questions (Beta Users)

1. **Overall Experience**
   - On a scale of 1-5, how satisfied are you with the document feature?
   - What's one word that describes your experience?

2. **Workflow Impact**
   - Did this change how you track expenses? How?
   - What tasks are now easier? What's still hard?
   - How much time did you save (estimate per month)?

3. **Trust & Control**
   - Did you trust the automatic matching? Why or why not?
   - Did you feel in control of your data?
   - Were confidence scores helpful?

4. **Feature Usage**
   - Which features did you use most? Least?
   - What features were confusing or unclear?
   - What features are missing?

5. **Future Use**
   - Will you continue using this feature? Why or why not?
   - Would you recommend Joot to a friend now? (NPS)
   - What would make you use it more often?

6. **Mobile vs. Desktop**
   - Did you use mobile camera capture? (If yes: how was it?)
   - Where do you prefer to reconcile documents?

7. **Open Feedback**
   - Anything else we should know?
   - Any questions for me?
