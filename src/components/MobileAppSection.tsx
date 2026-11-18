import { useState } from "react";
import qrAppStore from "../assets/qr-appstore.png";
import Icon from "./Icon";
import { SETTINGS_ROW_CLASS, SettingsGroup } from "./SettingsGroup";

const APP_STORE_URL = "https://apps.apple.com/app/patternbank/id6759760762";

const ROW_CLASS = `${SETTINGS_ROW_CLASS} cursor-pointer border-none bg-transparent text-left text-sm text-pb-text no-underline transition-colors duration-150 hover:bg-pb-surface-hover`;

function AppleLogo() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

// The way to the iPhone app. On a laptop the row opens a QR code to scan with
// the phone; on a phone it is a link straight to the App Store.
export default function MobileAppSection() {
  const [showQr, setShowQr] = useState(false);

  return (
    <SettingsGroup title="iPhone app" footer="Your data syncs automatically when signed in.">
      <button
        type="button"
        onClick={() => setShowQr(!showQr)}
        aria-expanded={showQr}
        className={`${ROW_CLASS} max-md:hidden`}
      >
        <span className="flex items-center gap-2.5">
          <AppleLogo />
          Get PatternBank for iPhone
        </span>
        <Icon
          name="chevronDown"
          className={`h-4 w-4 shrink-0 text-pb-text-dim transition-transform duration-150 ${showQr ? "rotate-0" : "-rotate-90"}`}
        />
      </button>

      {showQr && (
        <div className="hidden flex-col items-center px-4 py-4 md:flex">
          {/* QR codes need a light quiet zone to scan, whatever the theme. */}
          <div className="mb-2 rounded-xl border border-pb-border bg-white p-3">
            <img src={qrAppStore} alt="Download PatternBank on the App Store" width={148} height={148} className="block" />
          </div>
          <span className="text-xs text-pb-text-dim">Scan with your phone's camera</span>
        </div>
      )}

      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${ROW_CLASS} md:hidden`}
      >
        <span className="flex items-center gap-2.5">
          <AppleLogo />
          Get PatternBank for iPhone
        </span>
        <Icon name="external" className="h-4 w-4 shrink-0 text-pb-text-dim" />
      </a>
    </SettingsGroup>
  );
}
