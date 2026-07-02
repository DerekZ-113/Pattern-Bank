/**
 * Platform callback hooks (plan: "Adapter contracts").
 * Core never imports posthog/sentry/console; platforms inject these instead.
 */
export interface CoreHooks {
  analytics?: (event: string, props?: Record<string, unknown>) => void;
  /** Web Today-LC snapshot logging. */
  debugLog?: (message: string, data?: unknown) => void;
  /** F-14 corrupt-row warnings. */
  warn?: (message: string, data?: unknown) => void;
  /** Injectable clock for testability. */
  now?: () => Date;
}
