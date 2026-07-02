/**
 * Platform storage abstraction (plan: "Adapter contracts").
 * Web wraps localStorage in Promises; mobile passes AsyncStorage directly.
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  /** AsyncStorage-native batch removal; web loops removeItem instead. */
  multiRemove?(keys: string[]): Promise<void>;
}
