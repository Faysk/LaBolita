"use client";

import { useEffect } from "react";
import {
  setThemePreference,
  setTimePreference,
  type ThemePreference,
  type TimePreference,
} from "@/lib/user-preferences";

export function UserPreferencesHydrator({
  themePreference,
  timePreference,
}: {
  themePreference?: ThemePreference | null;
  timePreference?: TimePreference | null;
}) {
  useEffect(() => {
    if (themePreference) setThemePreference(themePreference);
    if (timePreference) setTimePreference(timePreference);
  }, [themePreference, timePreference]);

  return null;
}
