/**
 * Shared Supabase client mock for unit tests.
 * Creates a chainable mock that mimics the Supabase query builder pattern.
 *
 * Usage:
 *   vi.mock("../../src/utils/supabaseClient", () => ({
 *     supabase: createSupabaseMock({ data: [...], error: null }),
 *   }));
 */

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

  return mock;
}

/**
 * Creates a mock that returns null for supabase (simulates missing credentials).
 */
export function createNullSupabaseMock(): null {
  return null;
}
