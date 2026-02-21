# PatternBank

![React](https://img.shields.io/badge/React-61DAFB) ![React Native](https://img.shields.io/badge/React_Native-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6) ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4) ![Vercel](https://img.shields.io/badge/Vercel-000000)

**Spaced repetition for LeetCode interview prep**

PatternBank is a cross-platform app that solves the retention problem in technical interview preparation. You log problems, tag them by algorithmic pattern, rate your confidence, and the app tells you when to review. No more forgetting solutions two weeks after solving them.

**Web:** [pattern-bank.vercel.app](https://pattern-bank.vercel.app)

---

## The Problem

Everyone preparing for technical interviews tracks which problems they've solved. Nobody retains what they've learned. I interviewed three people actively doing LeetCode prep and heard the same story from all of them — one had solved 150 problems but felt confident on maybe 40. Another failed an interview on a problem they had previously solved because they couldn't remember the approach.

The gap isn't tracking. It's retention. PatternBank fills that gap with spaced repetition built into the core loop.

---

## Features

- **Spaced Repetition** — SM-2 algorithm calculates review intervals based on your confidence rating (1-5 stars). Low confidence = review tomorrow. High confidence = review in two weeks.
- **Pattern Organization** — 18 algorithmic categories from Two Pointers to Dynamic Programming. Tag problems by pattern and see where your gaps are.
- **Confidence Heatmap** — Visual grid showing average confidence per pattern. Red = weak, green = strong. Click any cell to filter problems by that pattern.
- **Smart Daily Cap** — Set a daily review goal (1-10). The priority algorithm surfaces your weakest, most overdue problems first. Never says "overdue" or "behind."
- **LeetCode Database** — 3,846 problems with instant search by number or title. Auto-fills title, difficulty, and URL.
- **Bulk Add** — Paste LeetCode problem numbers, validated in real-time. Review dates staggered by difficulty to prevent queue overwhelm.
- **Cross-Platform** — React web app + React Native mobile app with shared Supabase backend.
- **Cloud Sync** — Sign in with Google or GitHub. Data syncs across devices with timestamp-based conflict resolution.
- **Offline-First** — Works without an account. localStorage (web) and AsyncStorage (mobile) persist everything locally. Cloud sync is additive, never required.
- **Push Notifications** — Daily review reminders on mobile with configurable time.

---

## Architecture

PatternBank follows a **localStorage-first** design. Every action writes locally first (instant UI), then syncs to the cloud in the background. Three seamless modes:

- **No account** → Pure local storage, fully functional
- **Signed in** → Local storage + background Supabase sync
- **Offline** → Local storage, syncs when connection returns

```
┌─────────────────────────────────────────────┐
│              Client (Web / Mobile)          │
│                                             │
│   React State ──→ localStorage/AsyncStorage │
│        │                                    │
│        └──→ Supabase (fire-and-forget)      │
└─────────────────────────────────────────────┘
                    │
         ┌──────────┴──────────┐
         │     Supabase        │
         │  ┌──────────────┐   │
         │  │  PostgreSQL  │   │
         │  │  (RLS)       │   │
         │  └──────────────┘   │
         │  ┌──────────────┐   │
         │  │  Auth        │   │
         │  │  (OAuth)     │   │
         │  └──────────────┘   │
         └─────────────────────┘
```

### Key Design Decisions

- **Text primary keys** instead of UUIDs — matches existing localStorage IDs, zero migration friction when users sign in for the first time
- **Fire-and-forget sync** — cloud writes are non-blocking; if one fails, next sign-in reconciles everything
- **Timestamp-based conflict resolution** — most recent edit wins, backward-compatible with pre-timestamp data
- **Daily cap with priority queue** — three-tier sort (lowest confidence → most overdue → stable random tiebreaker) prevents the unbounded queue anxiety that kills spaced repetition apps

---

## Tech Stack

| Layer | Web | Mobile |
|-------|-----|--------|
| Framework | React 19 + Vite | React Native 0.81 + Expo SDK 54 |
| Styling | Tailwind CSS v4 | NativeWind v4.1 |
| Data (local) | localStorage | AsyncStorage |
| Data (cloud) | Supabase PostgreSQL | Supabase PostgreSQL (shared) |
| Auth | Supabase Auth (Google + GitHub) | Supabase Auth (browser OAuth) |
| Notifications | — | expo-notifications |
| Hosting | Vercel | EAS Build (pending) |
| Testing | Playwright MCP | Manual |

---

## Quick Start

```bash
git clone https://github.com/DerekZ-113/Pattern-Bank.git
cd Pattern-Bank
npm install
npm run dev
```

The app runs fully functional without any Supabase configuration — all data persists in localStorage. To enable cloud sync and auth, create a `.env` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Spaced Repetition Algorithm

Simplified SM-2 with confidence-based intervals:

| Confidence | Interval | Meaning |
|-----------|----------|---------|
| 1 star | 1 day | No recall |
| 2 stars | 1 day | Struggled |
| 3 stars | 3 days | With effort |
| 4 stars | 7 days | Comfortable |
| 5 stars | 14 days | Automatic |

When more problems are due than the daily goal allows, a three-tier priority sort determines which surface first:

1. **Lowest confidence** — weakest problems always come first
2. **Most days overdue** — among equal confidence, longest-waiting wins
3. **Stable daily random** — deterministic hash prevents the same subset repeating

---

## Project Structure

```
src/
├── components/          20 components
│   ├── PatternHeatmap   Radial gradient confidence grid
│   ├── BulkAddSection   Chip input with LC database validation
│   ├── ReviewCard       Active recall flow (notes hidden by default)
│   ├── DashboardView    Stats, review queue, heatmap
│   └── ...
├── utils/               8 modules
│   ├── spacedRepetition SM-2 intervals + priority algorithm
│   ├── leetcodeProblems 3,846 problems with instant search
│   ├── sync             Bidirectional merge + fire-and-forget push
│   ├── supabaseData     7 CRUD functions with field mapping
│   └── ...
├── contexts/            AuthContext (Google + GitHub OAuth)
└── hooks/               useAuth
```

---

## Mobile App

The companion React Native app lives in a [separate repository](https://github.com/DerekZ-113/patternbank-mobile) and shares the same Supabase backend. Same features, same data, native feel.

---

## Development

Built in 5 sprints over 3 days:

| Sprint | Focus | Time |
|--------|-------|------|
| 1 | Extract from prototype, deploy to Vercel | ~30 min |
| 2 | Daily cap, priority algorithm, settings | ~2 hours |
| 3 | Supabase backend, OAuth, cloud sync | ~2 hours |
| 4 | React Native mobile app | ~5 hours |
| 5 | Heatmap, bulk add, accessibility, performance testing | ~5.5 hours |

Each sprint was planned before coding — numbered task lists, discovery questions, architectural decisions made upfront. The 90/10 planning rule (90% planning, 10% coding) drove the velocity.

---

## Author

**Derek Zhang**
MS Computer Science, Northeastern University
[LinkedIn](https://linkedin.com/in/derekz113) · [GitHub](https://github.com/DerekZ-113)

*Built because I solved 347 LeetCode problems and kept forgetting them.*

Copyright (c) 2026 Derek Zhang. All rights reserved.