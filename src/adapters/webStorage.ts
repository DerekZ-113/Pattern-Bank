import type { StorageAdapter } from "@patternbank/core";

/** localStorage behind Promises — core's injected StorageAdapter for web. */
export const webStorage: StorageAdapter = {
  getItem(key: string): Promise<string | null> {
    return Promise.resolve(localStorage.getItem(key));
  },
  setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
    return Promise.resolve();
  },
};
