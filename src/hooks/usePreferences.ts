import { useState, useEffect, useCallback, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { loadPreferences, savePreferences } from "../utils/storage";
import { pushPreferencesToCloud } from "../utils/sync";
import type { Preferences } from "../types";

interface UsePreferencesParams {
  user: User | null;
}

interface UsePreferencesReturn {
  preferences: Preferences;
  handleUpdatePreferences: (updates: Partial<Preferences>) => void;
  replacePreferences: (prefs: Preferences) => void;
  getCurrentPreferences: () => Preferences;
  getPreferenceRevision: () => number;
}

export default function usePreferences({ user }: UsePreferencesParams): UsePreferencesReturn {
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences());
  const preferencesRef = useRef(preferences);
  const preferenceRevisionRef = useRef(0);

  useEffect(() => {
    preferencesRef.current = preferences;
    savePreferences(preferences);
  }, [preferences]);

  const handleUpdatePreferences = useCallback((updates: Partial<Preferences>) => {
    // Stamp user edits so newest-wins preference sync (F-6) can tell a fresh
    // signed-out change apart from a stale cloud snapshot.
    const next = { ...preferencesRef.current, ...updates, updatedAt: new Date().toISOString() };
    preferencesRef.current = next;
    preferenceRevisionRef.current += 1;
    setPreferences(next);
    if (user) pushPreferencesToCloud(user.id, next);
  }, [user]);

  const replacePreferences = useCallback((prefs: Preferences) => {
    preferencesRef.current = prefs;
    setPreferences(prefs);
  }, []);

  const getPreferenceRevision = useCallback(() => preferenceRevisionRef.current, []);
  const getCurrentPreferences = useCallback(() => preferencesRef.current, []);

  return {
    preferences,
    handleUpdatePreferences,
    replacePreferences,
    getCurrentPreferences,
    getPreferenceRevision,
  };
}
