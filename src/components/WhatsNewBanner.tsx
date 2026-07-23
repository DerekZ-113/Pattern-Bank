import posthog from "posthog-js";
import { WHATS_NEW } from "../utils/whatsNew";

interface Props {
  signedIn: boolean;
  showLeetCodeCta: boolean;
  onOpenSettings?: () => void;
  onDismiss?: () => void;
}

// Release announcement card, shown once per WHATS_NEW.id. Unconnected users
// keep the LeetCode set-up CTA; connected users just read and dismiss.
export default function WhatsNewBanner({ signedIn, showLeetCodeCta, onOpenSettings, onDismiss }: Props) {
  const handleCtaClick = () => {
    posthog.capture("whats_new_cta_clicked", {
      release_id: WHATS_NEW.id,
      signed_in: signedIn,
      platform: "web",
    });
    onOpenSettings?.();
  };

  const handleDismiss = () => {
    posthog.capture("whats_new_dismissed", {
      release_id: WHATS_NEW.id,
      platform: "web",
    });
    onDismiss?.();
  };

  return (
    <section
      aria-labelledby="whats-new-title"
      className="relative mb-6 overflow-hidden rounded-[10px] border border-pb-border bg-pb-surface px-4 py-4"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-pb-accent" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-pb-accent/35 bg-pb-accent-subtle text-[11px] font-bold text-pb-accent"
            >
              ✦
            </span>
            <h2 id="whats-new-title" className="text-[15px] font-semibold text-pb-text">
              {WHATS_NEW.title}
            </h2>
          </div>
          <ul className="mt-2.5 flex flex-col gap-1.5 text-[13px] leading-relaxed text-pb-text-muted">
            {WHATS_NEW.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2">
                <span aria-hidden="true" className="text-pb-accent">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          {showLeetCodeCta && (
            <button
              onClick={handleCtaClick}
              className="mt-3.5 cursor-pointer rounded-lg border border-pb-accent/40 bg-pb-accent-subtle px-4 py-2 text-[13px] font-semibold text-pb-accent transition-all duration-150 hover:bg-pb-accent hover:text-white"
            >
              {signedIn ? "Set up LeetCode Activity" : "Sign in to set up LeetCode"}
            </button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss what's new"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-pb-border bg-transparent text-lg leading-none text-pb-text-dim transition-colors duration-150 hover:border-pb-text-muted hover:text-pb-text"
        >
          ×
        </button>
      </div>
    </section>
  );
}
