# UAE Service Compliance Engine

Prototype compliance monitoring system for the UAE Government Services Sector. Receives citizen feedback, uses AI to classify complaints, matches them against the Emirates Code for Government Services (134 rules), and manages the full compliance lifecycle.

## Prerequisites

- **Node.js** 18+ (recommended: 20.x)
- **npm** 9+

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/ppastram/uae-compliance-engine.git
cd uae-compliance-engine

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local

# 4. Start the dev server
npm run dev

# 5. Seed the database (open in browser or run via curl)
curl http://localhost:3000/api/seed
```

Then open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create a `.env.local` file in the project root:

```
ANTHROPIC_API_KEY=your_key_here
```

> **The app works without an API key.** When `ANTHROPIC_API_KEY` is not set, the AI engine runs in mock mode with pre-computed analysis results. Set the key to enable live Claude API classification.

## Seeding the Database

The database (SQLite) is created automatically on first run. To populate it with demo data:

- **Browser:** Visit `http://localhost:3000/api/seed`
- **Terminal:** `curl http://localhost:3000/api/seed`

This loads 1,000 feedback records, 96 pre-analyzed complaints, and 5 sample cases.

## Demo Roles

Use the floating role switcher (bottom-right corner) to switch between:

| Role | Default Page | What it does |
|------|-------------|--------------|
| **Government Reviewer** | `/dashboard` | Analytics dashboard, review inbox, case verification |
| **Citizen** | `/submit-feedback` | Submit feedback about government services |
| **Entity Representative** | `/entity` | View notifications, submit evidence |

## Demo Flow

1. **Dashboard** → See populated analytics from seeded data
2. **Citizen** → Submit a complaint → AI processes it → appears in dashboard
3. **Reviewer** → See flagged complaint → Expand analysis → Confirm & send notification
4. **Entity** → Receive notification with deadline → Submit evidence
5. **Reviewer** → Verify evidence → Close case
6. Check the penalty case (deadline expired)

## Tech Stack

- Next.js 14 (App Router)
- TailwindCSS + shadcn/ui
- SQLite (better-sqlite3)
- Claude API (claude-sonnet-4-5-20250929) with mock fallback
- Recharts, Lucide React, Sonner
