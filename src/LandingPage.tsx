import { useCallback, useEffect, useRef, useState } from "react";
import qrCode from "./assets/qr-appstore.png";
import LandingProjection from "./components/LandingProjection";
import { getProgressHeatmapTint } from "./utils/progressVisuals";
import type { CSSProperties, ReactNode, RefObject } from "react";

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
  { name: "Heap", count: 11, confidence: 3.0 },
  { name: "Graphs", count: 24, confidence: 3.1 },
  { name: "DFS", count: 18, confidence: 3.6 },
  { name: "DP", count: 20, confidence: 2.9 },
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
    number: "01",
    title: "Capture the problem",
    body: "Add manually or let LeetCode Activity detect recent accepted submissions from your public profile.",
  },
  {
    number: "02",
    title: "Rate the confidence",
    body: "Choose how solid the solve felt. V2 schedules 1, 2, 5, 10, or 30 days from that signal.",
  },
  {
    number: "03",
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
        transform: inView ? "translateY(0)" : "translateY(18px)",
        transition: `opacity 560ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 560ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function BrandMark() {
  return (
    <img src="/favicon-32.png" alt="" className="h-7 w-7 rounded-lg" />
  );
}

function AppleLogo({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#7c6bf5]/25 bg-[#7c6bf5]/10 px-3 py-1.5 text-[11px] font-semibold uppercase text-[#a69bff]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
      {children}
    </div>
  );
}

function LandingButton({
  children,
  variant = "primary",
  onClick,
  href,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  href?: string;
}) {
  const className =
    variant === "primary"
      ? "inline-flex h-12 items-center justify-center rounded-[10px] bg-[#7c6bf5] px-6 text-sm font-semibold text-white transition hover:bg-[#8f82ff] focus:outline-none focus:ring-2 focus:ring-[#7c6bf5]/70"
      : variant === "secondary"
        ? "inline-flex h-12 items-center justify-center rounded-[10px] border border-[#2d2d3c] bg-[#15151e] px-6 text-sm font-semibold text-[#ededf2] transition hover:border-[#5e5e6e] focus:outline-none focus:ring-2 focus:ring-[#7c6bf5]/60"
        : "inline-flex h-12 items-center justify-center rounded-[10px] border border-[#23232f] px-5 text-sm font-semibold text-[#a4a4b5] transition hover:border-[#5e5e6e] hover:text-[#ededf2] focus:outline-none focus:ring-2 focus:ring-[#7c6bf5]/60";

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

function SectionHeader({
  eyebrow,
  title,
  copy,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  copy: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto mb-10 max-w-[700px] text-center" : "mb-10 max-w-[720px]"}>
      {eyebrow && (
        <div className="mb-3 text-[11px] font-semibold uppercase text-[#7c6bf5]">
          {eyebrow}
        </div>
      )}
      <h2 className="m-0 text-[32px] font-bold leading-tight text-[#ededf2] md:text-[44px]">
        {title}
      </h2>
      <p className="mt-3 text-[15px] leading-7 text-[#8a8a99] md:text-base">{copy}</p>
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
        className="fixed inset-0 z-[999] cursor-default bg-black/65 backdrop-blur"
      />
      <div className="fixed left-1/2 top-1/2 z-[1000] w-[90%] max-w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#2d2d3c] bg-[#12121a] p-8 text-center shadow-2xl">
        <button
          type="button"
          aria-label="Close App Store QR code"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-2 text-lg leading-none text-[#8a8a99] transition hover:text-[#ededf2] focus:outline-none focus:ring-2 focus:ring-[#7c6bf5]/60"
        >
          ×
        </button>

        <div className="mb-5 text-sm font-semibold text-[#ededf2]">Get PatternBank on iOS</div>

        <div className="mx-auto mb-4 flex h-[180px] w-[180px] items-center justify-center rounded-xl bg-white p-3">
          <img src={qrCode} alt="App Store QR Code" className="h-full w-full object-contain" />
        </div>

        <div className="mb-5 text-xs text-[#8a8a99]">Scan with your phone's camera</div>

        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#a69bff] no-underline"
        >
          Open in App Store
        </a>
      </div>
    </>
  );
}

function HeroConfidenceCard() {
  return (
    <div className="relative overflow-hidden rounded-[18px] border border-[#23232f] bg-[#12121a] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase text-[#8a8a99]">Pattern Confidence</div>
          <div className="mt-1 text-sm text-[#5e5e6e]">Live library snapshot</div>
        </div>
        <div className="rounded-full border border-[#2d2d3c] px-3 py-1 text-xs font-semibold text-[#a69bff]">
          156 problems
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {HERO_PATTERNS.map((pattern) => {
          const tint = getProgressHeatmapTint(pattern.confidence, pattern.count);
          return (
            <div
              key={pattern.name}
              className="min-h-[78px] rounded-lg border p-3"
              style={{
                backgroundColor: tint.background,
                borderColor: tint.border,
              }}
            >
              <div className="truncate text-[13px] font-semibold text-[#ededf2]">{pattern.name}</div>
              <div className="mt-4 flex items-end justify-between gap-2">
                <span className="text-xs text-[#a4a4b5]">{pattern.count} problems</span>
                <span className="font-mono text-sm font-semibold" style={{ color: tint.text }}>
                  {pattern.confidence.toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[#23232f] pt-4 text-sm">
        <span className="text-[#8a8a99]">Average confidence</span>
        <span className="font-semibold text-[#ededf2]">3.7 / 5</span>
      </div>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[14px] border border-[#23232f] bg-[#12121a] p-6">
      <h3 className="m-0 text-lg font-semibold text-[#ededf2]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#8a8a99]">{body}</p>
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
    <div className="relative overflow-hidden rounded-xl border border-[#2d2d3c] bg-[#12121a] px-5 py-4">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-[#7c6bf5]" />
      <button
        type="button"
        aria-label={`Dismiss ${problem.title}`}
        className="absolute right-4 top-4 text-lg leading-none text-[#5e5e6e]"
      >
        ×
      </button>

      <div className="pr-8">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[15px] font-bold text-[#5e5e6e]">#{problem.number}</span>
          <span className="text-[15px] font-bold text-[#ededf2]">{problem.title}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-md bg-[#3a2a14] px-2.5 py-1 text-xs font-bold uppercase text-[#ffd35f]">
            {problem.difficulty}
          </span>
          {problem.patterns.map((pattern) => (
            <span
              key={pattern}
              className="rounded-full border border-[#7c6bf5]/30 bg-[#7c6bf5]/12 px-3 py-1 text-xs font-medium text-[#b9b1ff]"
            >
              {pattern}
            </span>
          ))}
        </div>
      </div>

      <div className="my-4 border-t border-dashed border-[#2d2d3c]" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-[#8a8a99]">
          Rate confidence to add <span className="text-[#5e5e6e]">1 shaky · 5 solid</span>
        </div>
        <div className="flex gap-1.5" aria-label={`Rate ${problem.title} confidence`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`Import ${problem.title} with ${star}-star confidence`}
              className="text-[23px] leading-none text-[#3c3c4a] transition hover:text-[#ffd35f] focus:outline-none focus:ring-2 focus:ring-[#7c6bf5]/60"
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
    <div className="rounded-[18px] border border-[#23232f] bg-[#15151e] p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[#ededf2]">From LeetCode</div>
          <div className="mt-1 text-xs text-[#5e5e6e]">Solved on LC, not yet in your library</div>
        </div>
        <div className="rounded-full border border-[#7c6bf5]/40 bg-[#7c6bf5]/15 px-3 py-1 text-xs font-semibold text-[#b9b1ff]">
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

function StepRow({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="grid grid-cols-[48px_1fr] gap-4 rounded-[14px] border border-[#23232f] bg-[#12121a] p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#7c6bf5]/40 bg-[#7c6bf5]/12 font-mono text-xs font-semibold text-[#a69bff]">
        {number}
      </div>
      <div>
        <h3 className="m-0 text-base font-semibold text-[#ededf2]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#8a8a99]">{body}</p>
      </div>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[14px] border border-[#23232f] bg-[#12121a] p-5">
      <div className="mb-4 h-1 w-10 rounded-full bg-[#7c6bf5]" />
      <h3 className="m-0 text-base font-semibold text-[#ededf2]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#8a8a99]">{body}</p>
    </div>
  );
}

function FinalCTA({ onOpenApp, onAppStore }: { onOpenApp: () => void; onAppStore: () => void }) {
  return (
    <section className="mx-auto max-w-[1280px] px-5 py-16 sm:px-10 md:py-24">
      <div className="rounded-[22px] border border-[#23232f] bg-[#12121a] p-8 md:p-12">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="m-0 text-[34px] font-bold leading-tight text-[#ededf2] md:text-[48px]">
              Start remembering what you already solved.
            </h2>
            <p className="mt-4 max-w-[620px] text-base leading-7 text-[#8a8a99]">
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

export default function LandingPage({ onOpenApp }: LandingPageProps) {
  const [iosOpen, setIosOpen] = useState(false);
  const openIos = useCallback(() => setIosOpen(true), []);

  const sectionStyle: CSSProperties = {
    backgroundColor: "#0a0a0f",
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0a0f] text-[#ededf2]" style={sectionStyle}>
      <IOSPopover open={iosOpen} onClose={() => setIosOpen(false)} />

      <nav className="sticky top-0 z-50 border-b border-[#23232f]/80 bg-[#0a0a0f]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between px-5 sm:px-10">
          <a href="#top" className="flex items-center gap-3 text-[#ededf2] no-underline">
            <BrandMark />
            <span className="text-lg font-bold">PatternBank</span>
          </a>
          <div className="flex items-center gap-2">
            <a href="#how" className="hidden px-3 py-2 text-sm text-[#8a8a99] no-underline transition hover:text-[#ededf2] md:inline-flex">
              How it works
            </a>
            <a href="#leetcode-sync" className="hidden px-3 py-2 text-sm text-[#8a8a99] no-underline transition hover:text-[#ededf2] md:inline-flex">
              LeetCode sync
            </a>
            <a href="#features" className="hidden px-3 py-2 text-sm text-[#8a8a99] no-underline transition hover:text-[#ededf2] md:inline-flex">
              Features
            </a>
            <LandingButton onClick={onOpenApp}>Open app</LandingButton>
          </div>
        </div>
      </nav>

      <main id="top">
        <section className="mx-auto grid max-w-[1280px] gap-12 px-5 py-16 sm:px-10 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <FadeIn className="flex min-w-0 flex-col justify-center">
            <div className="mb-7">
              <Eyebrow>Now with LeetCode Sync</Eyebrow>
            </div>
            <h1 className="m-0 text-[44px] font-bold leading-[0.95] text-[#ededf2] md:text-[60px] xl:text-[76px]">
              <span>Remember what</span>
              <br />
              <span className="text-[#5e5e6e]">you practiced.</span>
            </h1>
            <p className="mt-7 max-w-[600px] text-[17px] leading-8 text-[#8a8a99] md:text-xl">
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
            <p className="mt-4 text-sm text-[#5e5e6e]">No account required to start. Sign in when you want sync.</p>
            <div className="mt-10 grid max-w-[640px] grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ["3,800+", "LeetCode problems"],
                ["Public", "username sync"],
                ["Free", "local-first app"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-[#23232f] bg-[#12121a] px-4 py-3">
                  <div className="text-lg font-bold text-[#ededf2]">{value}</div>
                  <div className="mt-1 text-xs text-[#8a8a99]">{label}</div>
                </div>
              ))}
            </div>
          </FadeIn>
          <FadeIn delay={120} className="lg:pt-8">
            <HeroConfidenceCard />
          </FadeIn>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-14 sm:px-10 md:py-20">
          <SectionHeader
            eyebrow="The problem"
            title="Solving is not the same as retaining."
            copy="PatternBank is built for the gap between yesterday's accepted submission and next month's interview recall."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {PROBLEM_CARDS.map((card) => (
              <FadeIn key={card.title}>
                <InfoCard title={card.title} body={card.body} />
              </FadeIn>
            ))}
          </div>
        </section>

        <section id="leetcode-sync" className="mx-auto max-w-[1280px] px-5 py-14 sm:px-10 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <div>
              <SectionHeader
                eyebrow="LeetCode Sync"
                title="Paste your username. Watch it fill."
                copy="PatternBank uses public LeetCode profile activity to detect recent accepted submissions. It is not OAuth, does not use cookies, and never asks for a password."
              />
              <div className="space-y-3">
                {LEETCODE_STEPS.map((step, index) => (
                  <StepRow
                    key={step.title}
                    number={`0${index + 1}`}
                    title={step.title}
                    body={step.body}
                  />
                ))}
              </div>
            </div>
            <FadeIn delay={120}>
              <LeetCodePreviewPanel />
            </FadeIn>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-[1280px] px-5 py-14 sm:px-10 md:py-20">
          <SectionHeader
            eyebrow="How it works"
            title="Three steps. No ceremony."
            copy="PatternBank keeps the workflow close to how you already practice: solve, rate, review."
            align="center"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {HOW_STEPS.map((step) => (
              <FadeIn key={step.title}>
                <StepRow number={step.number} title={step.title} body={step.body} />
              </FadeIn>
            ))}
          </div>
        </section>

        <section id="projection" className="mx-auto max-w-[1280px] px-5 py-14 sm:px-10 md:py-20">
          <SectionHeader
            eyebrow="See the Math"
            title="Spaced repetition compounds."
            copy="Adjust the sliders and watch 30 days of consistent review reshape a library. The columns use the same confidence tint language as Progress."
          />
          <FadeIn delay={120}>
            <LandingProjection />
          </FadeIn>
        </section>

        <section id="features" className="mx-auto max-w-[1280px] px-5 py-14 sm:px-10 md:py-20">
          <SectionHeader
            eyebrow="Features"
            title="Everything you need. Nothing you don't."
            copy="A focused tracker for algorithm practice retention, without turning practice into another dashboard chore."
            align="center"
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <FadeIn key={feature.title}>
                <FeatureCard title={feature.title} body={feature.body} />
              </FadeIn>
            ))}
          </div>
        </section>

        <FinalCTA onOpenApp={onOpenApp} onAppStore={openIos} />
      </main>

      <footer className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 border-t border-[#23232f] px-5 py-8 text-xs text-[#5e5e6e] sm:px-10">
        <div className="flex items-center gap-2">
          <BrandMark />
          <span>PatternBank</span>
        </div>
        <div className="flex gap-4">
          <a className="text-[#5e5e6e] no-underline transition hover:text-[#ededf2]" href="https://github.com/DerekZ-113" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a className="text-[#5e5e6e] no-underline transition hover:text-[#ededf2]" href="https://linkedin.com/in/derekz113" target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
          <a className="text-[#5e5e6e] no-underline transition hover:text-[#ededf2]" href="/privacy">
            Privacy
          </a>
        </div>
      </footer>
    </div>
  );
}
