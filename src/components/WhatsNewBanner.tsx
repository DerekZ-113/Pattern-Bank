import posthog from "posthog-js";
import Icon from "./Icon";
import { buttonClass, iconButtonClass } from "../utils/buttonStyles";
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
      className="rounded-xl border border-pb-border-light bg-pb-surface px-4 py-4 sm:px-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="whats-new-title" className="m-0 text-[15px] font-semibold text-pb-text">
            {WHATS_NEW.title}
          </h2>
          <ul className="m-0 mt-2 flex list-disc flex-col gap-1 pl-5 text-[13px] leading-relaxed text-pb-text-muted marker:text-pb-text-dim">
            {WHATS_NEW.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          {showLeetCodeCta && (
            <button type="button" onClick={handleCtaClick} className={`${buttonClass("soft")} mt-3.5`}>
              {signedIn ? "Set up LeetCode Activity" : "Sign in to set up LeetCode"}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss what's new"
          className={`${iconButtonClass("sm")} -mr-1.5 -mt-1`}
        >
          <Icon name="close" />
        </button>
      </div>
    </section>
  );
}
