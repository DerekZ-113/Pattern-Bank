export const CLOUD_OPERATION_TIMEOUT_MS = 15_000;
export const FULL_SYNC_TIMEOUT_MS = 25_000;
export const LEETCODE_ACTIVITY_TIMEOUT_MS = 45_000;

export class SyncTimeoutError extends Error {
  operation: string;
  timeoutMs: number;

  constructor(operation: string, timeoutMs: number) {
    super(`${operation} timed out after ${timeoutMs}ms`);
    this.name = "SyncTimeoutError";
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

export function isSyncTimeoutError(error: unknown): error is SyncTimeoutError {
  return error instanceof SyncTimeoutError || (
    !!error
    && typeof error === "object"
    && (error as { name?: unknown }).name === "SyncTimeoutError"
  );
}

export function isLikelyOfflineError(error: unknown): boolean {
  if (isSyncTimeoutError(error)) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /network|offline|timeout|timed out|connection|fetch/i.test(message);
}

export function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new SyncTimeoutError(operation, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export function withCloudOperationTimeout<T>(
  operation: string,
  promise: PromiseLike<T>,
): Promise<T> {
  return withTimeout(promise, CLOUD_OPERATION_TIMEOUT_MS, operation);
}
