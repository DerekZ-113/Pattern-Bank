/**
 * Shared Supabase client mock for unit tests.
 * Creates a chainable mock that mimics the Supabase query builder pattern.
 *
 * Usage (core factories take an injected client — no module mocking needed):
 *   const mock = createSupabaseMock({ data: [...], error: null });
 *   const cloud = createCloudData({ supabase: asClient(mock) });
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface MockResult {
  data?: unknown;
  error?: unknown;
}

export interface SupabaseMock {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  functions: { invoke: ReturnType<typeof vi.fn> };
}

export function createSupabaseMock(result: MockResult = { data: null, error: null }): SupabaseMock {
  const resolvedResult = { data: result.data ?? null, error: result.error ?? null };

  const mock: SupabaseMock = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    in: vi.fn(),
    upsert: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    order: vi.fn(),
    range: vi.fn().mockResolvedValue(resolvedResult),
    single: vi.fn().mockResolvedValue(resolvedResult),
    maybeSingle: vi.fn().mockResolvedValue(resolvedResult),
    limit: vi.fn().mockResolvedValue(resolvedResult),
    functions: { invoke: vi.fn().mockResolvedValue(resolvedResult) },
  };

  // All chainable methods return the mock itself
  mock.from.mockReturnValue(mock);
  mock.select.mockReturnValue(mock);
  mock.eq.mockReturnValue(mock);
  mock.gte.mockReturnValue(mock);
  mock.in.mockReturnValue(mock);
  mock.upsert.mockReturnValue(mock);
  mock.insert.mockReturnValue(mock);
  mock.delete.mockReturnValue(mock);
  mock.order.mockReturnValue(mock);
  mock.limit.mockResolvedValue(resolvedResult);

  return mock;
}

/**
 * Creates a mock that returns null for supabase (simulates missing credentials).
 */
export function createNullSupabaseMock(): null {
  return null;
}

/** Casts the chainable mock (or null) to the client type the core factories accept. */
export function asClient(mock: SupabaseMock | null): SupabaseClient | null {
  return mock as unknown as SupabaseClient | null;
}
