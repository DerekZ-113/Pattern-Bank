import { useCallback, useEffect, useMemo, useState } from "react";
import { INTERVALS, getListSummaries } from "@patternbank/core";
import DifficultyBadge from "./components/DifficultyBadge";
import Icon from "./components/Icon";
import LandingProjection from "./components/LandingProjection";
import { LeetCodeSample, PatternSample, TodaySample } from "./components/LandingSamples";
import PatternTag from "./components/PatternTag";
import StarPicker from "./components/StarPicker";
import TodayGoalMeter from "./components/TodayGoalMeter";
import qrCode from "./assets/qr-appstore.png";
import { buildLandingSample } from "./utils/landingSample";
import type { MouseEvent, ReactNode } from "react";

interface LandingPageProps {
  onOpenApp: () => void;
}

const APP_STORE_URL = "https://apps.apple.com/app/patternbank/id6759760762";

// The page a first-time visitor sees. It says one thing per section, in the
// visitor's words, and every picture of the app is the app's own component
// (see LandingSamples), so the page cannot drift from what it describes.

/** "1, 2, 5, 10 or 30", straight from the scheduler's table. */
function reviewGaps(): string {
  const days = [1, 2, 3, 4, 5].map((star) => INTERVALS[star as 1 | 2 | 3 | 4 | 5]);
  return `${days.slice(0, -1).join(", ")} or ${days[days.length - 1]}`;
}

const SAMPLE_RATING = 3;

const FACTS = [
  {
    title: "No account needed",
    body: "Everything works in your browser. Sign in only when you want your library on another device.",
  },
  {
    title: "Web and iPhone, in sync",
    body: "Sign in on both and your reviews follow you.",
  },
  {
    title: "Notes stay with the problem",
    body: "Write down the step you missed. It is there at the next review.",
  },
  {
    title: "A daily goal you set",
    body: "Choose how many reviews a day. Today counts them off.",
  },
  {
    title: "Your data is yours",
    body: "Export your whole library to a file whenever you like.",
  },
  {
    title: "Free",
    body: "On the web and on iPhone.",
  },
];

const SECTION_CLASS = "mx-auto max-w-6xl px-5 py-12 sm:px-10 md:py-16";

function BrandMark() {
  return <img src="/favicon-32.png" alt="" className="h-7 w-7 rounded-lg" />;
}

function AppleLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

const BUTTON_BASE =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold no-underline transition-colors";
const BUTTON_PRIMARY = `${BUTTON_BASE} border-none bg-pb-accent-solid text-white hover:bg-pb-accent-solid-hover`;
const BUTTON_SECONDARY = `${BUTTON_BASE} border border-pb-border bg-pb-surface text-pb-text hover:bg-pb-surface-hover`;

function OpenAppButton({ onOpenApp, children }: { onOpenApp: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onOpenApp} className={BUTTON_PRIMARY}>
      {children}
    </button>
  );
}

/** True where a QR code helps: a screen you are not holding in your hand. */
function hasFinePointer(): boolean {
  return typeof window.matchMedia === "function"
    && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * A real link to the App Store. On a laptop it opens the QR code instead, so
 * the visitor can pick the app up on their phone; on a phone it just goes.
 */
function IPhoneLink({ onShowQr }: { onShowQr: () => void }) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!hasFinePointer()) return;
    event.preventDefault();
    onShowQr();
  };

  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={BUTTON_SECONDARY}
    >
      <AppleLogo /> Get the iPhone app
    </a>
  );
}

function QrDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <>
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-[999] bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="landing-qr-title"
        className="fixed left-1/2 top-1/2 z-[1000] w-[90%] max-w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-pb-border bg-pb-surface p-8 text-center shadow-2xl"
      >
        <button
          type="button"
          aria-label="Close"
          autoFocus
          onClick={onClose}
          className="absolute right-3 top-3 cursor-pointer rounded-lg border-none bg-transparent p-2 text-pb-text-muted transition-colors hover:text-pb-text"
        >
          <Icon name="close" />
        </button>

        <h2 id="landing-qr-title" className="m-0 mb-5 text-base font-semibold text-pb-text">
          Get PatternBank on iPhone
        </h2>

        {/* The QR code needs a white quiet zone to scan, whatever the theme. */}
        <div className="mx-auto mb-4 flex h-[180px] w-[180px] items-center justify-center rounded-[10px] bg-white p-3">
          <img src={qrCode} alt="App Store QR code" className="h-full w-full object-contain" />
        </div>

        <p className="m-0 mb-5 text-sm text-pb-text-muted">Scan with your phone's camera</p>

        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-pb-accent no-underline transition-colors hover:text-pb-accent-hover"
        >
          Open in the App Store
        </a>
      </div>
    </>
  );
}

function SectionHeader({ title, copy }: { title: string; copy?: string }) {
  return (
    <div className="mb-9 max-w-prose md:mb-11">
      <h2 className="m-0 text-[28px] font-bold leading-tight tracking-tight text-pb-text md:text-[34px]">
        {title}
      </h2>
      {copy && <p className="m-0 mt-3 text-base leading-7 text-pb-text-muted">{copy}</p>}
    </div>
  );
}

/** One step of the loop: what you do, then a small piece of the app that shows it. */
function Step({
  number,
  title,
  body,
  children,
}: {
  number: number;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-col border-t border-pb-border pt-5">
      <div className="flex items-baseline gap-2.5">
        <span aria-hidden="true" className="text-base font-semibold tabular-nums text-pb-text-dim">
          {number}
        </span>
        <h3 className="m-0 text-[17px] font-semibold text-pb-text">{title}</h3>
      </div>
      <p className="m-0 mt-2 max-w-prose flex-1 text-sm leading-6 text-pb-text-muted">{body}</p>
      <div className="mt-5 flex min-h-[88px] items-center rounded-xl border border-pb-border-light bg-pb-surface px-4 py-3.5">
        {children}
      </div>
    </li>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="m-0 text-[19px] font-semibold tracking-tight text-pb-text">{children}</h3>;
}

const NAV_LINK_CLASS =
  "hidden rounded-lg px-3 py-2 text-sm text-pb-text-muted no-underline transition-colors hover:text-pb-text md:inline-flex";

const FOOTER_LINK_CLASS = "text-pb-text-muted no-underline transition-colors hover:text-pb-text";

export default function LandingPage({ onOpenApp }: LandingPageProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const showQr = useCallback(() => setQrOpen(true), []);
  const hideQr = useCallback(() => setQrOpen(false), []);

  const sample = useMemo(() => buildLandingSample(), []);
  const lists = useMemo(() => getListSummaries(new Set()), []);
  const sampleGap = INTERVALS[SAMPLE_RATING];

  return (
    <div className="min-h-screen overflow-x-hidden bg-pb-bg text-pb-text">
      {qrOpen && <QrDialog onClose={hideQr} />}

      <nav className="sticky top-0 z-50 border-b border-pb-border-light bg-pb-bg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-10">
          <a href="#top" className="flex items-center gap-2.5 rounded-lg text-pb-text no-underline">
            <BrandMark />
            <span className="text-lg font-bold tracking-tight">PatternBank</span>
          </a>
          <div data-landing-actions className="flex items-center gap-1">
            <a href="#how" className={NAV_LINK_CLASS}>
              How it works
            </a>
            <a href="#start" className={NAV_LINK_CLASS}>
              Getting started
            </a>
            <a href="#progress" className={`${NAV_LINK_CLASS} mr-2`}>
              Progress
            </a>
            <OpenAppButton onOpenApp={onOpenApp}>Open app</OpenAppButton>
          </div>
        </div>
      </nav>

      <main id="top">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-12 sm:px-10 md:pb-20 md:pt-16 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-14">
          <div className="min-w-0">
            <h1 className="m-0 text-[42px] font-bold leading-[1.02] tracking-tight text-pb-text md:text-[56px] xl:text-[62px]">
              <span>Remember what</span>
              <br />
              <span>you practiced.</span>
            </h1>
            <p className="m-0 mt-6 max-w-[34rem] text-lg leading-8 text-pb-text-muted">
              PatternBank brings each LeetCode problem back just before you would forget it. Rate a
              solve from one to five stars and the next review is scheduled for you.
            </p>
            <div data-landing-actions className="mt-8 flex flex-wrap gap-3">
              <OpenAppButton onOpenApp={onOpenApp}>Open the app</OpenAppButton>
              <IPhoneLink onShowQr={showQr} />
            </div>
            <p data-landing-actions className="m-0 mt-4 text-sm text-pb-text-dim">
              Free. No account needed to start.
            </p>
          </div>
          <TodaySample sample={sample} />
        </section>

        <section id="how" className={`${SECTION_CLASS} scroll-mt-16`}>
          <SectionHeader
            title="How it works"
            copy="Solving a problem once does not mean you can solve it again next month. PatternBank runs one simple loop."
          />
          <ol className="m-0 grid list-none gap-8 p-0 md:grid-cols-3">
            <Step
              number={1}
              title="Add what you have solved"
              body="Search 3,800+ LeetCode problems, import a list, or connect your LeetCode username. Difficulty and patterns fill in for you."
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-[15px] font-semibold leading-snug text-pb-text">Two Sum</span>
                  <span className="font-mono text-[13px] text-pb-text-dim">#1</span>
                  <DifficultyBadge difficulty="Easy" />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <PatternTag name="Array" />
                  <PatternTag name="Hash Table" />
                </div>
              </div>
            </Step>
            <Step
              number={2}
              title="Rate how it went"
              body={`One star for shaky, five for solid. The rating sets the next review: ${reviewGaps()} days away.`}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <StarPicker
                  mode="display"
                  size="xl"
                  value={SAMPLE_RATING}
                  label={`Sample rating: ${SAMPLE_RATING} out of 5 stars`}
                />
                <span className="text-sm text-pb-text-muted">Next review in {sampleGap} days</span>
              </div>
            </Step>
            <Step
              number={3}
              title="Review what is due"
              body="Today lists what is due, weakest first, up to your daily goal. Problems you know cold move out as far as a year."
            >
              <TodayGoalMeter {...sample.goal} />
            </Step>
          </ol>
        </section>

        <section id="start" className={`${SECTION_CLASS} scroll-mt-16`}>
          <SectionHeader title="Start with what you have already done" />
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-14">
            <div className="min-w-0">
              <SubHeading>Import a list</SubHeading>
              <p className="m-0 mt-2 max-w-prose text-sm leading-6 text-pb-text-muted">
                The popular study lists are built in and already tagged by pattern. Pick a list,
                then tick the problems you have solved.
              </p>
              <ul className="m-0 mt-5 grid list-none grid-cols-2 gap-2 p-0">
                {lists.map((list) => (
                  <li
                    key={list.id}
                    className="flex flex-col gap-1 rounded-[10px] border border-pb-border-light bg-pb-surface px-3.5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
                  >
                    <span className="text-sm font-semibold text-pb-text">{list.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-pb-text-dim">
                      {list.total} problems
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0">
              <SubHeading>Connect LeetCode</SubHeading>
              <p className="m-0 mt-2 max-w-prose text-sm leading-6 text-pb-text-muted">
                Sign in and add your public LeetCode username. New accepted solves show up on Today
                for you to rate. No password, no browser extension.
              </p>
              <div className="mt-5">
                <LeetCodeSample sample={sample} />
              </div>
            </div>
          </div>
        </section>

        <section id="progress" className={`${SECTION_CLASS} scroll-mt-16`}>
          <SectionHeader
            title="See which patterns need work"
            copy="Progress shows your confidence in every pattern, from Array to DP, so the weak ones are easy to find."
          />
          <PatternSample sample={sample} />

          <div className="mt-14 md:mt-16">
            <SubHeading>Try it: 30 days of reviews</SubHeading>
            <p className="m-0 mb-6 mt-2 max-w-prose text-sm leading-6 text-pb-text-muted">
              Move the sliders to see how a library changes after 30 days of reviews.
            </p>
            <LandingProjection />
          </div>
        </section>

        <section className={SECTION_CLASS}>
          <SectionHeader title="Good to know" />
          <div className="grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {FACTS.map((fact) => (
              <div key={fact.title} className="border-t border-pb-border-light pt-5">
                <h3 className="m-0 text-base font-semibold text-pb-text">{fact.title}</h3>
                <p className="m-0 mt-2 max-w-prose text-sm leading-6 text-pb-text-muted">{fact.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={SECTION_CLASS}>
          <div className="rounded-xl border border-pb-border-light bg-pb-surface p-8 md:p-12">
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="m-0 max-w-[18ch] text-[30px] font-bold leading-tight tracking-tight text-pb-text md:text-[40px]">
                  Start remembering what you already solved.
                </h2>
                <p className="m-0 mt-4 max-w-prose text-base leading-7 text-pb-text-muted">
                  Open the app, import a list or add a few problems, and tomorrow's reviews will be
                  waiting on Today.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <OpenAppButton onOpenApp={onOpenApp}>Open the app</OpenAppButton>
                <IPhoneLink onShowQr={showQr} />
              </div>
            </div>
          </div>
        </section>
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
