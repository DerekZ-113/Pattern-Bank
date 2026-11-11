import Icon from "./components/Icon";
import { useCallback, useEffect, useRef, useState } from "react";
import qrCode from "./assets/qr-appstore.png";
import LandingProjection from "./components/LandingProjection";
import { tileColor } from "./utils/confidence";
import type { ReactNode, RefObject } from "react";

interface LandingPageProps {
  onOpenApp: () => void;
}

const APP_STORE_URL = "https://apps.apple.com/app/patternbank/id6759760762";

const HERO_PATTERNS = [
  { name: "Arrays", count: 38, confidence: 4.1 },
  { name: "Two Pointers", count: 19, confidence: 4.2 },
  { name: "Sliding Window", count: 14, confidence: 3.5 },
  { name: "Binary Search", count: 15, confidence: 3.3 },
  { name: "Linked List", count: 12, confidence: 4.4 },
  { name: "Stack", count: 16, confidence: 4.0 },
  { name: "Trees", count: 27, confidence: 3.8 },
  { name: "Heap", count: 11, confidence: 2.0 },
  { name: "Graphs", count: 24, confidence: 3.1 },
  { name: "DFS", count: 18, confidence: 3.6 },
  { name: "DP", count: 20, confidence: 1.4 },
  { name: "Sorting", count: 14, confidence: 4.5 },
];

const PROBLEM_CARDS = [
  {
    title: "The practice loop is invisible",
    body: "You solve problems across LeetCode and notes, but the review signal gets lost before it becomes memory.",
  },
  {
    title: "More problems does not mean better recall",
    body: "PatternBank focuses the next review on what is fading, not just what is newly solved.",
  },
  {
    title: "Patterns need their own map",
    body: "Track confidence by technique so weak areas surface before an interview exposes them.",
  },
];

const LEETCODE_STEPS = [
  {
    title: "Connect your username",
    body: "Use a public LeetCode profile. No password, no token, no extension, and no private account access.",
  },
  {
    title: "Solves appear automatically",
    body: "Recent accepted submissions are detected server-side and shown in Today when you open PatternBank.",
  },
  {
    title: "Rate confidence to schedule review",
    body: "A LeetCode solve is activity. You still choose 1-5 stars before it changes your PatternBank confidence.",
  },
];

const HOW_STEPS = [
  {
    title: "Capture the problem",
    body: "Add manually or let LeetCode Activity detect recent accepted submissions from your public profile.",
  },
  {
    title: "Rate the confidence",
    body: "Choose how solid the solve felt. V2 schedules 1, 2, 5, 10, or 30 days from that signal.",
  },
  {
    title: "Review what is fading",
    body: "Today combines due reviews, LeetCode solves, and completed work into one focused daily surface.",
  },
];

const FEATURES = [
  {
    title: "LeetCode Activity",
    body: "Connect a public username and turn accepted submissions into PatternBank review candidates.",
  },
  {
    title: "Smarter SRS",
    body: "Base intervals are 1/2/5/10/30 days, with repeated 5-star reviews graduating up to one year.",
  },
  {
    title: "Pattern Confidence",
    body: "See which algorithmic patterns are sturdy, shaky, or untouched from the Progress tab.",
  },
  {
    title: "Local-first reviews",
    body: "Core problem and review work remains fast locally, with cloud sync as an account-backed layer.",
  },
  {
    title: "Today workflow",
    body: "Pending LeetCode imports, due reviews, and Done today activity stay separated and scannable.",
  },
  {
    title: "No account required to start",
    body: "Use the app locally first. Sign in when you want cloud sync or LeetCode Activity.",
  },
];

const HERO_FACTS = ["3,800+ LeetCode problems", "Public username sync", "Free local-first app"];

const LEETCODE_PREVIEWS = [
  {
    number: 146,
    title: "LRU Cache",
    difficulty: "Medium",
    patterns: ["Hash Table", "Linked List", "Design"],
  },
  {
    number: 200,
    title: "Number of Islands",
    difficulty: "Medium",
    patterns: ["Graph", "DFS", "BFS"],
  },
];

const SECTION_CLASS = "mx-auto max-w-6xl px-5 py-16 sm:px-10 md:py-24";

function useInView(): [RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        observer.disconnect();
      },
      { threshold: 0.12 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}

function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(12px)",
        transition: `opacity 480ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 480ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function BrandMark() {
  return <img src="/favicon-32.png" alt="" className="h-7 w-7 rounded-lg" />;
}

function AppleLogo({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

const BUTTON_BASE =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold no-underline transition-colors";

const BUTTON_VARIANTS = {
  primary: "bg-pb-accent-solid text-white hover:bg-pb-accent-solid-hover",
  secondary: "border border-pb-border bg-pb-surface text-pb-text hover:bg-pb-surface-hover",
  ghost: "text-pb-text-muted hover:bg-pb-surface-hover hover:text-pb-text",
} as const;

function LandingButton({
  children,
  variant = "primary",
  onClick,
  href,
}: {
  children: ReactNode;
  variant?: keyof typeof BUTTON_VARIANTS;
  onClick?: () => void;
  href?: string;
}) {
  const className = `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]}`;

  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function SectionHeader({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="mb-10 max-w-prose md:mb-12">
      <h2 className="m-0 text-[28px] font-bold leading-tight tracking-tight text-pb-text md:text-[36px]">
        {title}
      </h2>
      <p className="mt-3 text-base leading-7 text-pb-text-muted">{copy}</p>
    </div>
  );
}

function IOSPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-[999] cursor-default bg-black/60"
      />
      <div className="fixed left-1/2 top-1/2 z-[1000] w-[90%] max-w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-pb-border bg-pb-surface p-8 text-center shadow-2xl">
        <button
          type="button"
          aria-label="Close App Store QR code"
          onClick={onClose}
          className="absolute right-3 top-3 cursor-pointer rounded-lg border-none bg-transparent p-2 text-pb-text-muted transition-colors hover:text-pb-text"
        >
          <Icon name="close" />
        </button>

        <div className="mb-5 text-base font-semibold text-pb-text">Get PatternBank on iOS</div>

        {/* The QR code needs a white quiet zone to scan, whatever the theme. */}
        <div className="mx-auto mb-4 flex h-[180px] w-[180px] items-center justify-center rounded-[10px] bg-white p-3">
          <img src={qrCode} alt="App Store QR Code" className="h-full w-full object-contain" />
        </div>

        <div className="mb-5 text-sm text-pb-text-muted">Scan with your phone's camera</div>

        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-pb-accent no-underline transition-colors hover:text-pb-accent-hover"
        >
          Open in App Store
        </a>
      </div>
    </>
  );
}

function HeroConfidenceCard() {
  return (
    <div className="rounded-xl border border-pb-border-light bg-pb-surface p-5">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-pb-text">Pattern Confidence</div>
          <div className="mt-0.5 text-sm text-pb-text-muted">Live library snapshot</div>
        </div>
        <div className="text-sm tabular-nums text-pb-text-muted">156 problems</div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {HERO_PATTERNS.map((pattern) => (
          <div
            key={pattern.name}
            className="flex min-h-[76px] flex-col justify-between rounded-[10px] p-3 text-pb-tile-ink"
            style={{ backgroundColor: tileColor(pattern.confidence) }}
          >
            <div className="truncate text-[13px] font-bold">{pattern.name}</div>
            <div className="flex items-end justify-between gap-2">
              <span className="text-xs tabular-nums opacity-75">{pattern.count} problems</span>
              <span className="text-[17px] font-bold leading-none tabular-nums">
                {pattern.confidence.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-pb-border-light pt-4 text-sm">
        <span className="text-pb-text-muted">Average confidence</span>
        <span className="font-semibold tabular-nums text-pb-text">3.5 / 5</span>
      </div>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-pb-border pt-5">
      <h3 className="m-0 text-base font-semibold text-pb-text">{title}</h3>
      <p className="mt-2 max-w-prose text-sm leading-6 text-pb-text-muted">{body}</p>
    </div>
  );
}

function LeetCodePreviewCard({
  problem,
}: {
  problem: {
    number: number;
    title: string;
    difficulty: string;
    patterns: string[];
  };
}) {
  return (
    <div className="relative rounded-[10px] border border-pb-border-light bg-pb-surface-2 px-5 py-4">
      <button
        type="button"
        aria-label={`Dismiss ${problem.title}`}
        className="absolute right-3 top-3 rounded-lg border-none bg-transparent p-1 text-pb-text-dim transition-colors hover:text-pb-text"
      >
        <Icon name="close" />
      </button>

      <div className="pr-8">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[15px] font-semibold tabular-nums text-pb-text-dim">#{problem.number}</span>
          <span className="text-[15px] font-semibold text-pb-text">{problem.title}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold text-pb-medium">{problem.difficulty}</span>
          {problem.patterns.map((pattern) => (
            <span
              key={pattern}
              className="rounded-md bg-pb-surface-hover px-2 py-1 text-xs font-medium leading-none text-pb-text-muted"
            >
              {pattern}
            </span>
          ))}
        </div>
      </div>

      <div className="my-4 border-t border-pb-border-light" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-pb-text-muted">
          Rate confidence to add <span className="text-pb-text-dim">1 shaky · 5 solid</span>
        </div>
        <div className="flex gap-1" aria-label={`Rate ${problem.title} confidence`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`Import ${problem.title} with ${star}-star confidence`}
              className="rounded text-[22px] leading-none text-pb-star-empty transition-colors hover:text-pb-star"
            >
              ★
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeetCodePreviewPanel() {
  return (
    <div className="rounded-xl border border-pb-border-light bg-pb-surface p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-pb-text">From LeetCode</div>
          <div className="mt-0.5 text-sm text-pb-text-muted">Solved on LC, not yet in your library</div>
        </div>
        <div className="min-w-7 rounded-md bg-pb-accent-subtle px-2 py-1 text-center text-xs font-semibold tabular-nums text-pb-accent">
          2
        </div>
      </div>
      <div className="space-y-3">
        {LEETCODE_PREVIEWS.map((problem) => (
          <LeetCodePreviewCard key={problem.number} problem={problem} />
        ))}
      </div>
    </div>
  );
}

function StepRow({ number, title, body }: { number: number; title: string; body: string }) {
  return (
    <div className="grid grid-cols-[1.75rem_1fr] gap-x-2">
      <div className="text-base font-semibold tabular-nums text-pb-text-dim">{number}</div>
      <div>
        <h3 className="m-0 text-base font-semibold text-pb-text">{title}</h3>
        <p className="mt-1.5 max-w-prose text-sm leading-6 text-pb-text-muted">{body}</p>
      </div>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-pb-border-light pt-5">
      <h3 className="m-0 text-base font-semibold text-pb-text">{title}</h3>
      <p className="mt-2 max-w-prose text-sm leading-6 text-pb-text-muted">{body}</p>
    </div>
  );
}

function FinalCTA({ onOpenApp, onAppStore }: { onOpenApp: () => void; onAppStore: () => void }) {
  return (
    <section className={SECTION_CLASS}>
      <div className="rounded-xl border border-pb-border-light bg-pb-surface p-8 md:p-12">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="m-0 max-w-[18ch] text-[30px] font-bold leading-tight tracking-tight text-pb-text md:text-[40px]">
              Start remembering what you already solved.
            </h2>
            <p className="mt-4 max-w-prose text-base leading-7 text-pb-text-muted">
              Open PatternBank, add a few problems, connect LeetCode Activity when you are ready,
              and let Today keep the next review obvious.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <LandingButton onClick={onOpenApp}>Open app</LandingButton>
            <LandingButton variant="secondary" onClick={onAppStore}>
              <AppleLogo /> App Store
            </LandingButton>
          </div>
        </div>
      </div>
    </section>
  );
}

const NAV_LINK_CLASS =
  "hidden rounded-lg px-3 py-2 text-sm text-pb-text-muted no-underline transition-colors hover:text-pb-text md:inline-flex";

const FOOTER_LINK_CLASS = "text-pb-text-muted no-underline transition-colors hover:text-pb-text";

export default function LandingPage({ onOpenApp }: LandingPageProps) {
  const [iosOpen, setIosOpen] = useState(false);
  const openIos = useCallback(() => setIosOpen(true), []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-pb-bg text-pb-text">
      <IOSPopover open={iosOpen} onClose={() => setIosOpen(false)} />

      <nav className="sticky top-0 z-50 border-b border-pb-border-light bg-pb-bg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-10">
          <a href="#top" className="flex items-center gap-2.5 rounded-lg text-pb-text no-underline">
            <BrandMark />
            <span className="text-lg font-bold tracking-tight">PatternBank</span>
          </a>
          <div className="flex items-center gap-1">
            <a href="#how" className={NAV_LINK_CLASS}>
              How it works
            </a>
            <a href="#leetcode-sync" className={NAV_LINK_CLASS}>
              LeetCode sync
            </a>
            <a href="#features" className={`${NAV_LINK_CLASS} mr-2`}>
              Features
            </a>
            <LandingButton onClick={onOpenApp}>Open app</LandingButton>
          </div>
        </div>
      </nav>

      <main id="top">
        <section className="mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-14 sm:px-10 md:pb-24 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <FadeIn className="flex min-w-0 flex-col justify-center">
            <p className="m-0 mb-5 text-sm font-medium text-pb-accent">Now with LeetCode Sync</p>
            <h1 className="m-0 text-[42px] font-bold leading-[1.02] tracking-tight text-pb-text md:text-[56px] xl:text-[64px]">
              <span>Remember what</span>
              <br />
              <span>you practiced.</span>
            </h1>
            <p className="mt-6 max-w-prose text-lg leading-8 text-pb-text-muted">
              PatternBank syncs with your public LeetCode activity, schedules reviews from
              confidence, and keeps the next problem to revisit clear.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LandingButton onClick={onOpenApp}>Open the app</LandingButton>
              <LandingButton variant="secondary" href="#how">
                See how it works
              </LandingButton>
              <LandingButton variant="ghost" onClick={openIos}>
                <AppleLogo /> App Store
              </LandingButton>
            </div>
            <p className="mt-4 text-sm text-pb-text-dim">No account required to start. Sign in when you want sync.</p>
            <ul className="m-0 mt-10 flex list-none flex-wrap gap-x-7 gap-y-1 border-t border-pb-border-light p-0 pt-5 text-sm text-pb-text-muted">
              {HERO_FACTS.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </FadeIn>
          <FadeIn delay={120} className="lg:pt-6">
            <HeroConfidenceCard />
          </FadeIn>
        </section>

        <section className={SECTION_CLASS}>
          <SectionHeader
            title="Solving is not the same as retaining."
            copy="PatternBank is built for the gap between yesterday's accepted submission and next month's interview recall."
          />
          <div className="grid gap-8 md:grid-cols-3">
            {PROBLEM_CARDS.map((card) => (
              <FadeIn key={card.title}>
                <InfoCard title={card.title} body={card.body} />
              </FadeIn>
            ))}
          </div>
        </section>

        <section id="leetcode-sync" className={SECTION_CLASS}>
          <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <div>
              <SectionHeader
                title="Paste your username. Watch it fill."
                copy="PatternBank uses public LeetCode profile activity to detect recent accepted submissions. It is not OAuth, does not use cookies, and never asks for a password."
              />
              <div className="space-y-6">
                {LEETCODE_STEPS.map((step, index) => (
                  <StepRow key={step.title} number={index + 1} title={step.title} body={step.body} />
                ))}
              </div>
            </div>
            <FadeIn delay={120}>
              <LeetCodePreviewPanel />
            </FadeIn>
          </div>
        </section>

        <section id="how" className={SECTION_CLASS}>
          <SectionHeader
            title="Three steps. No ceremony."
            copy="PatternBank keeps the workflow close to how you already practice: solve, rate, review."
          />
          <div className="grid gap-8 md:grid-cols-3">
            {HOW_STEPS.map((step, index) => (
              <FadeIn key={step.title} className="border-t border-pb-border pt-5">
                <StepRow number={index + 1} title={step.title} body={step.body} />
              </FadeIn>
            ))}
          </div>
        </section>

        <section id="projection" className={SECTION_CLASS}>
          <SectionHeader
            title="Spaced repetition compounds."
            copy="Adjust the sliders and watch 30 days of consistent review reshape a library. The columns use the same confidence tint language as Progress."
          />
          <FadeIn delay={120}>
            <LandingProjection />
          </FadeIn>
        </section>

        <section id="features" className={SECTION_CLASS}>
          <SectionHeader
            title="Everything you need. Nothing you don't."
            copy="A focused tracker for algorithm practice retention, without turning practice into another dashboard chore."
          />
          <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <FadeIn key={feature.title}>
                <FeatureCard title={feature.title} body={feature.body} />
              </FadeIn>
            ))}
          </div>
        </section>

        <FinalCTA onOpenApp={onOpenApp} onAppStore={openIos} />
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-pb-border-light px-5 py-8 text-sm text-pb-text-muted sm:px-10">
        <div className="flex items-center gap-2">
          <BrandMark />
          <span>PatternBank</span>
        </div>
        <div className="flex gap-5">
          <a className={FOOTER_LINK_CLASS} href="https://github.com/DerekZ-113" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a className={FOOTER_LINK_CLASS} href="https://linkedin.com/in/derekz113" target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
          <a className={FOOTER_LINK_CLASS} href="/privacy">
            Privacy
          </a>
        </div>
      </footer>
    </div>
  );
}
