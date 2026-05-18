# PatternBank

![CI](https://github.com/DerekZ-113/Pattern-Bank/actions/workflows/ci.yml/badge.svg) ![React](https://img.shields.io/badge/React-61DAFB) ![React Native](https://img.shields.io/badge/React_Native-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6) ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4) ![Vercel](https://img.shields.io/badge/Vercel-000000)

[![App Store](https://img.shields.io/badge/App_Store-0D96F6?logo=apple&logoColor=white)](https://apps.apple.com/app/patternbank/id6759760762)

**Spaced repetition for LeetCode interview prep**

PatternBank is a cross-platform app that solves the retention problem in technical interview preparation. You log problems, tag them by algorithmic pattern, rate your confidence, and the app tells you when to review. The schedule starts at 1, 2, 5, 10, and 30 days, then repeated 5-star reviews graduate to longer intervals.

**Web:** [pattern-bank.vercel.app](https://pattern-bank.vercel.app)
**iOS:** [App Store](https://apps.apple.com/app/patternbank/id6759760762)

---

## The Problem

Everyone preparing for technical interviews tracks which problems they've solved. Nobody retains what they've learned. I interviewed three people actively doing LeetCode prep and heard the same story from all of them — one had solved 150 problems but felt confident on maybe 40. Another failed an interview on a problem they had previously solved because they couldn't remember the approach.

The gap isn't tracking. It's retention. PatternBank fills that gap with spaced repetition built into the core loop.

---

## Features

- **Spaced Repetition** — Confidence ratings schedule reviews at 1, 2, 5, 10, or 30 days. Repeated 5-star reviews graduate to 60, 120, 240, then 365 days.
- **Pattern Organization** — 24 algorithmic categories — 18 core (Two Pointers through DP) plus 6 opt-in advanced patterns (Intervals, Mono Stack, Prefix Sum, Bit, System Design, OOD). Tag problems by pattern and see where your gaps are.
- **Confidence Heatmap** — Visual grid showing average confidence per pattern. Red = weak, green = strong. Click any cell to filter problems by that pattern.
- **Curated Problem Lists** — 6 built-in lists: NeetCode 75, NeetCode 150, NeetCode 250, Grind 75, Grind 169, and LeetCode Hot 100.
- **Smart Daily Cap** — Set a daily review goal (1-20). The priority algorithm surfaces your weakest, most overdue problems first. Never says "overdue" or "behind."
- **LeetCode Database** — 3,800+ problems with instant search by number or title. Auto-fills title, difficulty, and URL.
- **Bulk Add** — Paste LeetCode problem numbers, validated in real-time. Review dates staggered by difficulty to prevent queue overwhelm.
- **Review History** — Per-problem timeline of past reviews with confidence progression (signed-in users).
- **Exclude from Review** — Toggle problems out of the daily review queue while keeping them in your library.
- **Cross-Platform** — React web app + React Native mobile app with shared Supabase backend.
- **Cloud Sync** — Sign in with Google, GitHub, or Apple. Data syncs across devices with timestamp-based conflict resolution.
- **Offline-First** — Works without an account. localStorage (web) and AsyncStorage (mobile) persist everything locally. Cloud sync is additive, never required.
- **Extra Pattern Categories** — 6 opt-in advanced patterns with individual toggles in Settings. Enable the ones relevant to your prep.
- **Hide Patterns During Review** — Toggle in Settings to hide pattern tags on review cards. Test your pattern recognition before revealing the answer.
- **Danger Zone** — Set all problems due today or clear all data from Settings.
- **Landing Page** — New visitors see an animated marketing page with pattern heatmap demo. Returning users go straight to the app.
- **Today Workflow** — Action-focused review queue with LeetCode activity, pending imports, Done today, and explicit Rate actions for solves that still need a PatternBank rating.
- **Progress Analytics** — Review activity, pattern confidence, confidence trend, 30-day projection, confidence spread, and top patterns breakdown live in the Progress tab.
- **Quick Start Onboarding** — New users see an interactive guide with action paths, interval reference table, tips, and a mock review timeline.
- **Collapsible Settings** — Infrequently-used settings sections collapse by default to reduce visual clutter.
- **Pull-to-Refresh** — Manual refresh on Today and Progress screens (mobile).
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
| Language | TypeScript (strict) | TypeScript |
| Styling | Tailwind CSS v4 | NativeWind v4.1 |
| Data (local) | localStorage | AsyncStorage |
| Data (cloud) | Supabase PostgreSQL | Supabase PostgreSQL (shared) |
| Auth | Supabase Auth (Google, GitHub, Apple) | Supabase Auth (Google, GitHub, Apple) |
| Notifications | — | expo-notifications |
| Hosting | Vercel | App Store (live via EAS Build) |
| Testing | Vitest (307 unit) + Playwright (e2e) | Jest (192 tests) |
| Monitoring | Sentry, PostHog, Vercel Analytics + Speed Insights | Sentry, PostHog |

---

## Spaced Repetition Algorithm

Simplified SM-2 with confidence-based intervals:

| Confidence | Interval | Meaning |
|-----------|----------|---------|
| 1 star | 1 day | No recall |
| 2 stars | 2 days | Struggled |
| 3 stars | 5 days | With effort |
| 4 stars | 10 days | Comfortable |
| 5 stars | 30 days | Automatic |

Repeated 5-star reviews graduate to longer intervals: 30, 60, 120, 240, then 365 days.

When more problems are due than the daily goal allows, a three-tier priority sort determines which surface first:

1. **Lowest confidence** — weakest problems always come first
2. **Most days overdue** — among equal confidence, longest-waiting wins
3. **Stable daily random** — deterministic hash prevents the same subset repeating

---

## Project Structure

```
src/
├── components/          36 components
│   ├── PatternHeatmap   Radial gradient confidence grid
│   ├── BulkAddSection   Chip input with LC database validation
│   ├── ReviewCard       Active recall flow (notes hidden by default)
│   ├── TodayView        Reviews due, LeetCode imports, Done today
│   ├── ProgressView     Pattern confidence, review activity, trend analytics
│   ├── AllProblemsView  Search, filters, sorting, compact library cards
│   ├── SettingsModal    → AccountSection, DailyGoalSection, DataSection,
│   │                      FeedbackSection, MobileAppSection
│   ├── ProblemModal     → ModeToggle, ProblemInfo, PatternSelector,
│   │                      NotesEditor, ConfidenceInfo
│   └── ...
├── LandingPage          Animated hero, heatmap demo, iOS QR popover
├── utils/               Business logic and data mapping modules
│   ├── spacedRepetition SM-2 intervals + priority algorithm
│   ├── problemTransforms Pure business logic (bulk add, import merge, review progress)
│   ├── progressUtils    Streak, heatmap, confidence trend, pattern stats
│   ├── leetcodeProblems 3,800+ problems with instant search
│   ├── sync             Bidirectional merge + fire-and-forget push
│   ├── supabaseData     7 CRUD functions with field mapping
│   └── ...
├── contexts/            AuthContext (Google, GitHub, Apple OAuth)
└── hooks/               useProblems (coordinator), useUI (UI state),
                         usePreferences (prefs + persistence),
                         useCloudSync (sign-in sync + status), useAuth,
                         useLeetCodeActivity
```

App.tsx composes the hooks; pure business logic lives in `problemTransforms.ts`.

### V2 LeetCode Activity Setup

LeetCode Activity uses public profile data, not OAuth, cookies, or private account access. Before testing or deploying V2 LeetCode flows against Supabase:

1. Apply `docs/supabase/leetcode-activity.sql`.
2. Deploy the Edge Function:
   ```bash
   supabase functions deploy sync-leetcode-activity
   ```
3. Confirm the service role key is configured only in the Edge Function environment and is never exposed through a `VITE_` client variable.

---

## Mobile App

The companion React Native app lives in a [separate repository](https://github.com/DerekZ-113/patternbank-mobile) and shares the same Supabase backend. Same features, same data, native feel.

---

## Development

Built iteratively across 6+ sprints plus post-launch sessions:

| Sprint | Focus |
|--------|-------|
| 1 | Extract from prototype, deploy to Vercel |
| 2 | Daily cap, priority algorithm, settings |
| 3 | Supabase backend, OAuth, cloud sync |
| 4 | React Native mobile app |
| 5 | Heatmap, bulk add, accessibility, performance testing |
| 6+ | TypeScript migration (strict mode), ESLint, Vitest + Playwright test infrastructure (278 unit + 24 e2e tests) |
| V1.1 | Reddit launch, review history, bulk add improvements |
| V1.2 | TypeScript strict mode, exclude from review, 301 tests, CI/CD pipeline |
| V1.3 | 6 extra pattern categories, hide patterns during review, stale closure fixes, daily cap 20, landing page, danger zone |
| V1.4 | Progress dashboard (heatmap, confidence trend, streak tracking), landing page, Quick Start onboarding, collapsible settings, pull-to-refresh, clear-all-data sync fix, OG image |

Each sprint was planned before coding — numbered task lists, discovery questions, architectural decisions made upfront.

---

## Author

**Derek Zhang**
MS Computer Science, Northeastern University
[LinkedIn](https://linkedin.com/in/derekz113) · [GitHub](https://github.com/DerekZ-113)

*Built because I solved 347 LeetCode problems and kept forgetting them.*

Licensed under the [GNU General Public License v3.0](LICENSE).
