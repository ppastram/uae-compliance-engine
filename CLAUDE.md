# UAE Service Compliance Engine — Prototype

## Project Overview
A prototype compliance monitoring system for the UAE Government Services Sector. This system:
1. Receives citizen feedback about government services
2. Uses AI to classify feedback and detect complaints
3. Matches complaints against the Emirates Code for Government Services (350+ rules)
4. Flags violations for human review by UAE government officials
5. Enables formal notifications to non-compliant entities
6. Tracks entity responses and evidence of compliance

**This is a demo prototype for a live Zoom presentation to a UAE government client.**

---

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS (UAE government color palette)
- **UI Components**: shadcn/ui (adapted to UAE colors)
- **Database**: SQLite via better-sqlite3
- **AI Engine**: Claude API (claude-sonnet-4-5-20250929) with mock fallback
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: Sonner (toast)
- **State**: React Context (for role switching)

---

## UAE DESIGN SYSTEM — CRITICAL

### Color Palette
```css
--uae-gold:     #CA9A2C;  /* Primary accent, buttons, highlights */
--uae-green:    #006B48;  /* Success states, compliance indicators */
--uae-red:      #C8102E;  /* Violations, alerts, urgent items */
--uae-black:    #232528;  /* Text, headers */
--uae-white:    #FFFFFF;
--uae-gray-50:  #F2F2F2;
--uae-gray-100: #E5E5E5;
--uae-gray-200: #CCCCCC;
```

### Design Rules
- Typography: Clean, modern sans-serif. Use Inter or system fonts.
- Layout: Generous whitespace, premium feel, authoritative tone
- Reference: u.ae and Dubai government website aesthetic
- NO playful elements, NO casual tone — this is for senior government officials
- Arabic text must render RTL when displayed
- All charts use the UAE color palette

### Disclaimer Banner (REQUIRED on every page)
```
⚠️ Prototype Demo — For reference purposes only. Not an official UAE Government system.
```
Small text, light gray background, centered, top of every page.

### Role Switcher
Floating widget (bottom-right corner), semi-transparent dev tool style.
Three roles:
1. **Citizen** — Can submit feedback
2. **Government Reviewer** — Dashboard + reviewer tools
3. **Entity Representative** — Entity portal

---

## DATA FILES (in /data/)

### `data/emirates_code_rules.json`
134 structured rules from the Emirates Code across Pillars 1, 2, and 8. Each rule has:
- `code`: e.g., "1.1.1"
- `pillar_id`, `pillar_name_en`
- `category_number`, `category_en`
- `description_en`, `description_ar`
- `requirements[]`: each with `text_en` and `monitoring`
- `impact_level`: "high" | "medium" | "low"
- `keywords_en[]`: for AI matching

### `data/feedback_sample.json`
1,000 real citizen feedback records with:
- `feedback_id`, `entity_name_en`, `entity_name_ar`
- `service_center_en`, `feedback_date`, `feedback_type`
- `dislike_traits[]`, `dislike_comment`, `general_comment`
- Comments are in Arabic and English mix

### `data/pre_analyzed_seed.json`
96 pre-analyzed complaints with AI classification results for database seeding.
These have pre-computed code violation matches so the dashboard has data immediately.

---

## MODULES TO BUILD

### Module 0: Feedback Submission (`/submit-feedback`)
- **Quick Submit** (default): Entity dropdown, Channel dropdown, Satisfaction toggle, Comment textarea, Submit
- **Full Form** toggle: adds dislike trait checkboxes, service name
- On submit → save to DB → trigger AI analysis → show confirmation with feedback ID
- Entities: load from the feedback_sample.json unique entity list

### Module 1: Intelligence Dashboard (`/dashboard`)
- Summary cards: Total Feedback, Complaints Detected, Code Violations Flagged, Compliance Rate
- Sentiment donut chart
- Feedback volume over time (line chart)
- Entity breakdown table: name, total, complaints, violations, compliance score (clickable)
- Top complaint categories (horizontal bar chart)
- Top violated codes (table with code number, description, count)
- Recent flagged items list

### Module 2: AI Engine (Backend only — `/lib/`)

**Step 1: Feedback Classification** (`lib/feedback-classifier.ts`)
```
System: You are an AI analyst for UAE government service feedback.
Classify this feedback:
- sentiment: "positive" | "negative" | "neutral"
- is_complaint: boolean
- severity: "low" | "medium" | "high" | "critical"
- category: one of ["service_quality", "employee_conduct", "process_complexity", "accessibility", "waiting_time", "communication", "fees", "digital_experience", "information_clarity", "complaint_handling", "other"]
- summary: one-sentence English summary

Handle Arabic and English input. Return JSON only.
```

**Step 2: Code Violation Matching** (`lib/code-matcher.ts`)
Only if is_complaint=true AND severity >= "medium":
```
System: You are an expert on the Emirates Code for Government Services.
Given this complaint, determine which rules are violated.

Complaint: {text}
Entity: {entity}
Channel: {channel}
Dislike traits: {traits}

Available rules: {relevant_rules_json}

Return JSON array of:
- code: rule number
- confidence: "high" | "medium" | "low"  
- explanation: 2-3 sentences

Be conservative — only flag genuine evidence of non-compliance.
Return empty array if none.
```

**Mock Fallback**: When ANTHROPIC_API_KEY is not set, return pre-defined results from `pre_analyzed_seed.json` so the demo works without API calls.

### Module 3: Reviewer Inbox (`/reviewer/inbox`)
- Cards sorted by severity: feedback excerpt, entity, matched codes, AI confidence, timestamp
- Expand: full text, AI analysis, matched rules with explanations
- "Confirm & Notify Entity" → opens notification composer with pre-filled formal letter
- "Dismiss Flag" → removes from inbox
- "Send Notification" → creates case with 20-day deadline → shows simulated email modal

### Module 4: Entity Portal (`/entity`)
- Dashboard: Active notifications, Pending responses, Resolved cases
- Case cards: case number, violated codes, deadline countdown, status
- Click case → full notification text, violated rules explained
- Response: text area + file upload → submit changes status to "evidence_submitted"
- Visual urgency: amber at 10 days remaining, red at 5 days

### Module 5: Evidence Verification (`/reviewer/verify/[caseId]`)
- Full timeline: complaint → AI analysis → notification → entity response → verification
- Evidence viewer: text + files
- "Accept — Close Case" or "Reject — Specify Reason"
- Expired deadline → auto-flag "Penalty Applicable"

---

## DATABASE SCHEMA (SQLite)

```sql
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feedback_id INTEGER UNIQUE,
  entity_name_en TEXT NOT NULL,
  entity_name_ar TEXT,
  service_center_en TEXT,
  feedback_date DATETIME,
  feedback_type TEXT,
  dislike_traits TEXT,       -- JSON array
  dislike_comment TEXT,
  general_comment TEXT,
  device_type TEXT,
  ai_sentiment TEXT,
  ai_category TEXT,
  ai_is_complaint BOOLEAN DEFAULT 0,
  ai_severity TEXT,
  ai_summary TEXT,
  ai_code_violations TEXT,   -- JSON array of matched violations
  processed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_number TEXT UNIQUE,
  feedback_id INTEGER REFERENCES feedback(id),
  entity_name_en TEXT NOT NULL,
  violated_codes TEXT NOT NULL,   -- JSON array
  violation_summary TEXT NOT NULL,
  notification_text TEXT,
  status TEXT DEFAULT 'flagged',  -- flagged | notified | evidence_submitted | compliant | non_compliant | penalty
  notified_at DATETIME,
  deadline DATETIME,
  evidence_text TEXT,
  evidence_files TEXT,
  evidence_submitted_at DATETIME,
  reviewer_notes TEXT,
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## SEEDING

On first run or via `/api/seed`:
1. Load all 1,000 feedback records from `feedback_sample.json`
2. Apply pre-analyzed results from `pre_analyzed_seed.json` to matching feedback
3. Create 5 sample cases at various stages:
   - 2 × "flagged" (in reviewer inbox)
   - 1 × "notified" (entity has 20-day deadline running)
   - 1 × "evidence_submitted" (ready for review)
   - 1 × "penalty" (deadline expired, no response)

---

## DIRECTORY STRUCTURE

```
uae-compliance-engine/
├── CLAUDE.md
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── submit-feedback/page.tsx
│   ├── dashboard/page.tsx
│   ├── reviewer/
│   │   ├── page.tsx
│   │   ├── inbox/page.tsx
│   │   └── verify/[caseId]/page.tsx
│   ├── entity/
│   │   ├── page.tsx
│   │   └── respond/[caseId]/page.tsx
│   └── api/
│       ├── seed/route.ts
│       ├── feedback/route.ts
│       ├── analyze/route.ts
│       ├── cases/route.ts
│       ├── cases/[id]/notify/route.ts
│       ├── cases/[id]/verify/route.ts
│       └── cases/[id]/evidence/route.ts
├── components/
│   ├── layout/ (Header, Sidebar, RoleSwitcher, DisclaimerBanner)
│   ├── dashboard/ (charts, tables, cards)
│   ├── reviewer/ (FlaggedCard, CodeViolationBadge, NotificationComposer)
│   ├── entity/ (CaseCard, EvidenceUploader, DeadlineCountdown)
│   └── shared/ (FeedbackForm, StatusBadge, EmailSimulator)
├── lib/
│   ├── db.ts
│   ├── ai-engine.ts
│   ├── code-matcher.ts
│   ├── feedback-classifier.ts
│   └── seed.ts
├── data/
│   ├── emirates_code_rules.json
│   ├── feedback_sample.json
│   └── pre_analyzed_seed.json
└── public/assets/
```

---

## WHAT NOT TO BUILD
- No real authentication/login
- No real email sending (simulate with modals)
- No real file storage (simulate uploads locally)
- No real-time updates/websockets
- No PDF generation
- No mobile responsiveness (desktop-optimized for Zoom demo)
- No Arabic-first UI (English primary for prototype)

Mark these as `// TODO: Production Feature` in code comments.

---

## DEMO FLOW (what must work end-to-end)
1. Dashboard shows populated analytics from seeded data
2. Citizen submits a complaint → AI processes it → appears in dashboard
3. Reviewer sees flagged complaint → expands analysis → confirms & sends notification
4. Entity receives notification with deadline → submits evidence
5. Reviewer verifies evidence → closes case
6. Show one penalty case (deadline expired)
