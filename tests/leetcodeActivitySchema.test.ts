import sql from "../docs/supabase/leetcode-activity.sql?raw";

describe("LeetCode activity Supabase schema", () => {
  it("keeps browser users read-only for LeetCode activity rows", () => {
    expect(sql).toContain('create policy "Users can read own LeetCode connection"');
    expect(sql).toContain('create policy "Users can read own LeetCode submissions"');
    expect(sql).toContain('create policy "Users can read own ignored LeetCode imports"');
    expect(sql).not.toMatch(/create policy "Users can (insert|update|delete) own LeetCode/);
    expect(sql).not.toMatch(/create policy "Users can (insert|update|delete) own ignored LeetCode imports/);
  });

  it("drops any previous browser write policies so Edge Functions own writes", () => {
    expect(sql).toContain('drop policy if exists "Users can insert own LeetCode connection"');
    expect(sql).toContain('drop policy if exists "Users can update own LeetCode connection"');
    expect(sql).toContain('drop policy if exists "Users can delete own LeetCode connection"');
    expect(sql).toContain('drop policy if exists "Users can insert own LeetCode submissions"');
    expect(sql).toContain('drop policy if exists "Users can update own LeetCode submissions"');
    expect(sql).toContain('drop policy if exists "Users can delete own LeetCode submissions"');
    expect(sql).toContain('drop policy if exists "Users can insert own ignored LeetCode imports"');
    expect(sql).toContain('drop policy if exists "Users can update own ignored LeetCode imports"');
    expect(sql).toContain('drop policy if exists "Users can delete own ignored LeetCode imports"');
  });
});
