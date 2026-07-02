-- Widen daily_review_goal CHECK from 1..10 to 1..20 to match both app UIs.
-- Fixes finding F-2 (docs/reviews/2026-07-01-cross-repo-review/findings.md):
-- goals of 11-20 saved locally but every cloud preference upsert failed silently.
--
-- Applied to production 2026-07-01 via Supabase migration
-- 20260702031459_widen_daily_review_goal_check_to_20 (first entry in the
-- project's migration history).

ALTER TABLE public.user_preferences
  DROP CONSTRAINT user_preferences_daily_review_goal_check;
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_daily_review_goal_check
  CHECK (daily_review_goal >= 1 AND daily_review_goal <= 20);
