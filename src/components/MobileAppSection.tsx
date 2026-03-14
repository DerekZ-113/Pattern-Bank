import qrAppStore from "../assets/qr-appstore.png";

const APP_STORE_URL = "https://apps.apple.com/app/patternbank/id6759760762";

export default function MobileAppSection() {
  return (
    <div>
      <label className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-pb-text-muted">
        Mobile App
      </label>

      {/* Desktop: QR code */}
      <div className="mb-3 hidden flex-col items-center md:flex">
        <div className="mb-2 rounded-xl border border-pb-border bg-white p-3">
          <img
            src={qrAppStore}
            alt="Download PatternBank on the App Store"
            width={148}
            height={148}
            className="block"
          />
        </div>
        <span className="text-xs text-pb-text-dim">
          Scan to download on iOS
        </span>
      </div>

      <p className="mb-2.5 text-xs leading-relaxed text-pb-text-dim">
        Your data syncs automatically when signed in.
      </p>

      {/* Mobile: download button */}
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-pb-border bg-transparent px-3.5 py-2.5 text-[13px] font-medium text-pb-text-muted no-underline transition-all duration-150 hover:border-pb-text-muted hover:text-pb-text md:hidden"
      >
        Download on App Store
      </a>

      {/* Desktop: subtle text link fallback */}
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden text-xs text-pb-text-dim no-underline transition-colors duration-150 hover:text-pb-accent md:inline-flex md:items-center md:gap-1"
      >
        App Store ↗
      </a>
    </div>
  );
}
