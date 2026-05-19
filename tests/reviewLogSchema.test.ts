import sql from "../docs/supabase/review-log-dedupe-key.sql?raw";

describe("review_log Supabase schema", () => {
  it("adds the LeetCode review replacement dedupe key", () => {
    expect(sql).toContain("add column if not exists dedupe_key text");
    expect(sql).toContain("add constraint review_log_dedupe_key_key unique (dedupe_key)");
  });

  it("allows authenticated browser clients to replace their own review log rows", () => {
    expect(sql).toContain("grant select, insert, update, delete on public.review_log to authenticated");
    expect(sql).toContain('create policy "Users can read own review log"');
    expect(sql).toContain('create policy "Users can insert own review log"');
    expect(sql).toContain('create policy "Users can update own review log"');
    expect(sql).toContain('create policy "Users can delete own review log"');
    expect(sql).toContain("for update");
    expect(sql).toContain("using ((select auth.uid()) = user_id)");
    expect(sql).toContain("with check ((select auth.uid()) = user_id)");
  });
});
