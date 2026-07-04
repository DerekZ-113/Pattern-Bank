# PatternBank

![CI](https://github.com/DerekZ-113/Pattern-Bank/actions/workflows/ci.yml/badge.svg) [![npm](https://img.shields.io/npm/v/@patternbank/core?label=%40patternbank%2Fcore)](https://www.npmjs.com/package/@patternbank/core) ![React](https://img.shields.io/badge/React-61DAFB) ![React Native](https://img.shields.io/badge/React_Native-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6) ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4) ![Vercel](https://img.shields.io/badge/Vercel-000000)

[![App Store](https://img.shields.io/badge/App_Store-0D96F6?logo=apple&logoColor=white)](https://apps.apple.com/app/patternbank/id6759760762)

**Spaced repetition for LeetCode interview prep**

PatternBank is a cross-platform app that solves the retention problem in technical interview preparation. You log problems, tag them by algorithmic pattern, rate your confidence, and the app tells you when to review. The schedule starts at 1, 2, 5, 10, and 30 days, then repeated 5-star reviews graduate to longer intervals.

**Web:** [pattern-bank.vercel.app](https://pattern-bank.vercel.app)
**iOS:** [App Store](https://apps.apple.com/app/patternbank/id6759760762)
**Shared engine:** [@patternbank/core on npm](https://www.npmjs.com/package/@patternbank/core)

---

## The Problem

Everyone preparing for technical interviews tracks which problems they've solved. Nobody retains what they've learned. I interviewed three people actively doing LeetCode prep and heard the same story from all of them — one had solved 150 problems but felt confident on maybe 40. Another failed an interview on a problem they had previously solved because they couldn't remember the approach.

The gap isn't tracking. It's retention. PatternBank fills that gap with spaced repetition built into the core loop.

---

## Features

**The review loop**
- **Spaced repetition** — confidence ratings schedule reviews at 1, 2, 5, 10, or 30 days; repeated 5-star reviews graduate to 60, 120, 240, then 365 days
- **Smart daily cap** — set a daily goal (1–20); the priority algorithm surfaces your weakest, most overdue problems first. Never says "overdue" or "behind"
- **Today workflow** — action-focused queue: reviews due, LeetCode activity, pending imports, Done today
- **Active recall** — notes hidden by default; optional "hide patterns during review" to test pattern recognition

**LeetCode integration**
- **LeetCode Activity sync** — detects your accepted submissions from public profile data (no OAuth or cookies), dedupes imports, and links solves to existing problems for one-tap rating
- **3,800+ problem database** — instant search by number or title, auto-fills title/difficulty/URL
- **Bulk add + curated lists** — paste problem numbers or import NeetCode 75/150/250, Grind 75/169, LeetCode Hot 100

**Insight**
- **Confidence heatmap** — average confidence across 24 algorithmic patterns (18 core + 6 opt-in advanced); click any cell to filter
- **Progress analytics** — review activity, confidence trend, 30-day projection, confidence spread, top patterns
- **Review history** — per-problem timeline with confidence progression

**Platform**
- **Offline-first** — fully functional without an account; localStorage (web) / AsyncStorage (iOS) are the source of truth
- **Cloud sync** — sign in with Google, GitHub, or Apple; background sync with timestamp-based conflict resolution
- **Cross-platform** — React web + React Native iOS sharing one published domain engine and one Supabase backend

---

## Architecture

PatternBank is a small monorepo: the web app plus **[@patternbank/core](packages/core)**, a published npm package holding all shared domain logic. The web app consumes core **as source** (changes ship instantly); the private iOS repo consumes the **exact-pinned npm release**. One implementation of the domain — scheduling, sync merging, import transforms, the LeetCode database — tested once, running in both production apps.

```
┌──────────────────  this repo  ──────────────────┐      ┌───── private repo ─────┐
│  Web app (React 19 + Vite)                      │      │  iOS app (RN + Expo)   │
│   localStorage ←── source of truth              │      │   AsyncStorage ←── SoT │
│        │                                        │      │        │               │
│        ▼            consumes as source          │      │        ▼  npm install  │
│  packages/core  ────────────────────────────────┼──────┼──▶ @patternbank/core   │
│  (@patternbank/core → published to npm)         │      │    (exact-pinned)      │
└───────────────────────┬─────────────────────────┘      └───────────┬────────────┘
                        │        fire-and-forget sync                │
                        ▼                                            ▼
                ┌──────────────────────────────────────────────────────┐
                │  Supabase — PostgreSQL (RLS) · Auth (OAuth) · Edge   │
                │  Function (LeetCode Activity)                        │
                └──────────────────────────────────────────────────────┘
```

Every action writes locally first (instant UI), then syncs to the cloud in the background. Three seamless modes: no account (pure local), signed in (local + background sync), offline (local, reconciles when the connection returns).

### Key design decisions

- **Text primary keys** instead of UUIDs — matches existing localStorage IDs, zero migration friction on first sign-in
- **Fire-and-forget sync** — cloud writes never block the UI; sign-in runs a full fail-closed reconcile (`performFullSync`): any error returns the untouched local snapshot
- **Timestamp-based conflict resolution** — newest `updatedAt` wins for problems, tombstones (last-write-wins deletes), and preferences
- **Daily cap with priority queue** — three-tier sort (lowest confidence → most overdue → stable daily random) prevents the unbounded-queue anxiety that kills spaced repetition apps

### The core extraction

The shared engine wasn't designed up front — it was extracted from two divergent codebases in July 2026, test-first: a 53-finding cross-repo audit ([docs/reviews/2026-07-01-cross-repo-review](docs/reviews/2026-07-01-cross-repo-review)) mapped every duplicated module and behavioral divergence; byte-shared parity fixtures and failing acceptance tests were written before any code moved; six extraction phases then fixed 12 sync/data-integrity findings *by construction*. The package ships dual ESM+CJS with injected storage/DB adapters — see the [package README](packages/core/README.md).

---

## Tech Stack

| Layer | Web | iOS |
|-------|-----|-----|
| Framework | React 19 + Vite | React Native 0.81 + Expo SDK 54 |
| Domain engine | `packages/core` (as source) | `@patternbank/core` (npm, exact-pinned) |
| Language | TypeScript (strict) | TypeScript |
| Styling | Tailwind CSS v4 | NativeWind v4.1 |
| Data (local) | localStorage | AsyncStorage |
| Data (cloud) | Supabase PostgreSQL | Supabase PostgreSQL (shared) |
| Auth | Supabase Auth (Google, GitHub, Apple) | Supabase Auth (Google, GitHub, Apple) |
| Notifications | — | expo-notifications |
| Hosting | Vercel | App Store (EAS Build) |
| Testing | Vitest (790 unit, incl. core) + Playwright (e2e) | Jest (219 tests) |
| Monitoring | Sentry, PostHog, Vercel Analytics | Sentry, PostHog |

---

## Spaced Repetition Algorithm

V2 confidence-based intervals with 5-star graduation:

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
packages/core/           @patternbank/core — the shared domain engine
├── src/
│   ├── spacedRepetition, problemTransforms, todayView, projectionEngine
│   ├── sync/            merge helpers + performFullSync (fail-closed)
│   ├── supabase/        field mapping + createCloudData factory (injected client)
│   ├── leetcode/        3,846-problem static DB, import transforms, resolvers
│   └── storage/         StorageAdapter interface + pure storage logic
└── tests/               consolidated domain suites + cross-platform parity fixtures

src/                     the web app
├── components/          36 components (TodayView, ProgressView, PatternHeatmap,
│                        AllProblemsView, SettingsModal, ProblemModal, …)
├── hooks/               useProblems (coordinator), usePreferences, useCloudSync,
│                        useAuth, useUI, useLeetCodeActivity
├── contexts/            AuthContext (Google, GitHub, Apple OAuth)
└── utils/               platform glue + permanent shims re-exporting core
                         (storage, sync assembly, Supabase client binding)

supabase/functions/      sync-leetcode-activity Edge Function
tests/                   web unit tests (jsdom)   e2e/  Playwright specs
```

`App.tsx` composes the hooks; pure business logic lives in `@patternbank/core`.

### V2 LeetCode Activity Setup

LeetCode Activity uses public profile data, not OAuth, cookies, or private account access. Before testing or deploying V2 LeetCode flows against Supabase:

1. Apply `docs/supabase/leetcode-activity.sql`.
2. Deploy the Edge Function:
   ```bash
   supabase functions deploy sync-leetcode-activity
   ```
3. Confirm the service role key is configured only in the Edge Function environment and is never exposed through a `VITE_` client variable.

---

## Development

```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # typecheck + production build (CI runs build:core first)
npm run build:core   # tsup build of packages/core (dist used only for npm publish)
npm test             # Vitest — web tests/ AND packages/core/tests
npm run test:e2e     # Playwright
npm run typecheck    # web; typecheck:core for the package
npm run lint
```

The workspace note that matters: **the web app never imports core's `dist/`** — tsconfig paths + a Vite alias point at `packages/core/src`, so core changes are live in dev immediately. `dist/` exists only for `npm publish`.

Testing spans four layers: 790 unit tests (web + core, including a two-device sync simulation suite and byte-shared cross-platform parity fixtures that the iOS repo runs against the same JSON), Playwright e2e, CI on every push, and release-time sync matrices run against production infrastructure.

---

## Mobile App

The companion iOS app lives in a separate private repository and consumes the same `@patternbank/core` and Supabase backend. Same review loop, same data, native feel — [App Store](https://apps.apple.com/app/patternbank/id6759760762).

---

## Development History

Built iteratively, planned-before-coded, across sprints:

| Sprint | Focus |
|--------|-------|
| 1–3 | Prototype → Vercel deploy; daily cap + priority algorithm; Supabase backend, OAuth, cloud sync |
| 4–6 | React Native app; heatmap, bulk add, a11y; TypeScript strict migration + Vitest/Playwright infra |
| V1.1–V1.2 | Reddit launch, review history; exclude-from-review, CI/CD pipeline |
| V1.3–V1.4 | Extra pattern categories, landing page, danger zone; Progress dashboard, Quick Start onboarding |
| V2.0 | LeetCode Activity sync (Edge Function + public profile data), Today workflow, 5-star graduation |
| V2.1 | **The core extraction** — 53-finding cross-repo audit, `@patternbank/core` published to npm, both apps migrated; iOS 2.1.0 shipped from the shared engine |

---

## Author

**Derek Zhang**
MS Computer Science, Northeastern University
[LinkedIn](https://linkedin.com/in/derekz113) · [GitHub](https://github.com/DerekZ-113)

*Built because I solved 347 LeetCode problems and kept forgetting them.*

Licensed under the [GNU General Public License v3.0](LICENSE).
