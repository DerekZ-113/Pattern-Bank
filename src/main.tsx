/* eslint-disable react-refresh/only-export-components */
import { StrictMode, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import posthog from "posthog-js";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "./index.css";
import AuthProvider from "./contexts/AuthContext";
import App from "./App";
import PrivacyPolicy from "./PrivacyPolicy";
import LandingPage from "./LandingPage";

Sentry.init({
  dsn: "https://69c043b9d6841043de3e78617b522acf@o4510944607731712.ingest.us.sentry.io/4510944618151936",
  environment: window.location.hostname === "localhost" ? "development" : "production",
  enabled: window.location.hostname !== "localhost",
});

if (window.location.hostname !== "localhost") {
  posthog.init("phc_HX5ZMKOZmhrY0dfWKQGlqF6IylCz0CJyOP1kgV5v2IC", {
    api_host: "https://us.i.posthog.com",
    autocapture: true,
  });
}

if (import.meta.env.DEV) {
  import("./utils/devSeed").then(({ installDevSeedHelpers }) => {
    installDevSeedHelpers();
  });
}

function Root() {
  const [showApp, setShowApp] = useState(
    () => sessionStorage.getItem("patternbank-skip-landing") === "true",
  );
  const isPrivacy = window.location.pathname === "/privacy";
  const isLanding = !showApp
    && window.location.pathname === "/"
    && !localStorage.getItem("patternbank-problems");

  const handleOpenApp = useCallback(() => {
    sessionStorage.setItem("patternbank-skip-landing", "true");
    setShowApp(true);
  }, []);

  if (isPrivacy) return <PrivacyPolicy />;
  if (isLanding) return <LandingPage onOpenApp={handleOpenApp} />;
  return (
    <AuthProvider>
      <App />
      <Analytics />
      <SpeedInsights />
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")!, {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
