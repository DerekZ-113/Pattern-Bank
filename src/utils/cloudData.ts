import { createCloudData, createLeetCodeActivityData, type CoreHooks } from "@patternbank/core";
import { supabase } from "./supabaseClient";

// The cloud-data factories are constructed exactly once with the web Supabase
// client; supabaseData.ts and leetcodeActivityData.ts re-export the bound
// functions so existing import sites (and vi.mock targets) stay stable.

const hooks: CoreHooks = {
  warn: (message, data) => {
    if (data === undefined) console.warn(message);
    else console.warn(message, data);
  },
};

export const cloudData = createCloudData({ supabase, hooks });

export const leetcodeActivityData = createLeetCodeActivityData({ supabase });
