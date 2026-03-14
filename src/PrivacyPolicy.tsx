export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-pb-bg text-pb-text">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <a
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-pb-text-muted transition-colors hover:text-pb-accent"
        >
          ← Back to PatternBank
        </a>

        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mb-10 text-sm text-pb-text-muted">
          Last updated: February 24, 2026
        </p>

        <div className="space-y-8 text-[15px] leading-relaxed text-pb-text-muted">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-pb-text">
              What PatternBank Does
            </h2>
            <p>
              PatternBank is a free tool for tracking LeetCode problems and
              reviewing them with spaced repetition. It's available as a web app
              and an iOS app.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-pb-text">
              Data We Collect
            </h2>
            <p className="mb-3">
              When you use PatternBank without signing in, no personal data is
              collected. All your data stays on your device.
            </p>
            <p className="mb-3">
              When you sign in with Google or GitHub, we collect:
            </p>
            <ul className="ml-1 list-inside list-disc space-y-1.5">
              <li>
                Your email address and display name (from your OAuth provider)
              </li>
              <li>
                LeetCode problem data you create (titles, notes, confidence
                ratings, pattern tags)
              </li>
              <li>Review history and streak data</li>
              <li>App preferences (daily review goal, notification settings)</li>
              <li>Feedback submissions (if you choose to leave feedback)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-pb-text">
              How We Store Your Data
            </h2>
            <p>
              Your data is stored in a Supabase database (PostgreSQL hosted on
              Amazon Web Services). Row-level security ensures that only you can
              access your own data. Data is also stored locally on your device
              for offline access.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-pb-text">
              Analytics
            </h2>
            <p>
              The web app uses Vercel Analytics to collect anonymous,
              aggregated usage data (page views, visitor counts). No cookies
              are used and no personally identifiable information is tracked.
              The mobile app does not include any analytics.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-pb-text">
              What We Don't Do
            </h2>
            <ul className="ml-1 list-inside list-disc space-y-1.5">
              <li>We don't sell your data to third parties</li>
              <li>We don't use your data for advertising</li>
              <li>We don't use tracking cookies</li>
              <li>We don't share your data with anyone</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-pb-text">
              Data Deletion
            </h2>
            <p>
              You can delete your local data at any time from the Settings menu.
              To request deletion of your cloud data, contact us at the email
              below. We will delete all data associated with your account within
              30 days.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-pb-text">
              Contact
            </h2>
            <p>
              If you have questions about this privacy policy or want to request
              data deletion, email:{" "}
              <a
                href="mailto:patternbank.app@gmail.com"
                className="text-pb-accent hover:underline"
              >
                patternbank.app@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-pb-border pt-6 text-center text-xs text-pb-text-dim">
          © 2026 PatternBank
        </div>
      </div>
    </div>
  );
}
