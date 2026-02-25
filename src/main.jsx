import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import AuthProvider from "./contexts/AuthContext.jsx";
import App from "./App.jsx";
import PrivacyPolicy from "./PrivacyPolicy.jsx";

Sentry.init({
  dsn: "https://69c043b9d6841043de3e78617b522acf@o4510944607731712.ingest.us.sentry.io/4510944618151936",
  environment: window.location.hostname === "localhost" ? "development" : "production",
  enabled: window.location.hostname !== "localhost",
});

const isPrivacy = window.location.pathname === "/privacy";

createRoot(document.getElementById("root"), {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    {isPrivacy ? (
      <PrivacyPolicy />
    ) : (
      <AuthProvider>
        <App />
        <Analytics />
      </AuthProvider>
    )}
  </StrictMode>
);
