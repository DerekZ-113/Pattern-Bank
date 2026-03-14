import { useState, useEffect, useCallback } from "react";
import { loadPreferences, savePreferences } from "../utils/storage";
import { pushPreferencesToCloud } from "../utils/sync";

export default function usePreferences({ user }) {
  const [preferences, setPreferences] = useState(() => loadPreferences());

  useEffect(() => { savePreferences(preferences); }, [preferences]);

  const handleUpdatePreferences = useCallback((updates) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };
      if (user) pushPreferencesToCloud(user.id, next);
      return next;
    });
  }, [user]);

  const replacePreferences = useCallback((prefs) => {
    setPreferences(prefs);
  }, []);

  return { preferences, handleUpdatePreferences, replacePreferences };
}
