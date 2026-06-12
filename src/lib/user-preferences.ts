"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  AUTO_TIME_PREFERENCE,
  formatGmtOffset,
  isValidTimeZone,
  normalizeThemePreference,
  normalizeTimePreference,
  type EffectiveTheme,
  type ThemePreference,
  type TimePreference,
} from "@/lib/user-preference-values";
export {
  AUTO_TIME_PREFERENCE,
  formatGmtOffset,
  GMT_OFFSET_OPTIONS,
  normalizeThemePreference,
  normalizeTimePreference,
  TIME_ZONE_OPTIONS,
  type EffectiveTheme,
  type ThemePreference,
  type TimePreference,
} from "@/lib/user-preference-values";

const THEME_KEY = "labolita-theme";
const TIME_KEY = "labolita-time-preference";
const CHANGE_EVENT = "labolita-preferences-change";
const THEME_CHANGE_EVENT = "labolita-theme-change";
let cachedTimePreferenceRaw: string | null | undefined;
let cachedTimePreference: TimePreference = AUTO_TIME_PREFERENCE;

export function useThemePreference() {
  const preference = useSyncExternalStore(
    subscribePreferences,
    getThemePreference,
    () => "system" as ThemePreference,
  );
  const effectiveTheme = getEffectiveTheme(preference);

  useEffect(() => {
    applyThemePreference(preference);
  }, [preference]);

  return {
    preference,
    effectiveTheme,
    setPreference: setThemePreference,
  };
}

export function useTimePreference() {
  const preference = useSyncExternalStore(
    subscribePreferences,
    getTimePreference,
    () => AUTO_TIME_PREFERENCE,
  );

  return {
    preference,
    setPreference: setTimePreference,
  };
}

export function getThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(THEME_KEY);
  return normalizeThemePreference(stored) ?? "system";
}

export function setThemePreference(preference: ThemePreference) {
  if (typeof window === "undefined") return;
  if (preference === "system") {
    localStorage.removeItem(THEME_KEY);
  } else {
    localStorage.setItem(THEME_KEY, preference);
  }
  applyThemePreference(preference);
  dispatchPreferenceChange();
}

export function applyThemePreference(preference = getThemePreference()) {
  if (typeof document === "undefined") return;
  if (preference === "system") {
    document.documentElement.removeAttribute("data-theme");
    return;
  }
  document.documentElement.dataset.theme = preference;
}

export function getEffectiveTheme(preference = getThemePreference()): EffectiveTheme {
  if (preference === "light" || preference === "dark") return preference;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getTimePreference(): TimePreference {
  if (typeof window === "undefined") return AUTO_TIME_PREFERENCE;
  const rawValue = localStorage.getItem(TIME_KEY);
  if (rawValue === cachedTimePreferenceRaw) return cachedTimePreference;

  cachedTimePreferenceRaw = rawValue;
  cachedTimePreference = parseTimePreference(rawValue);
  return cachedTimePreference;
}

function parseTimePreference(rawValue: string | null): TimePreference {
  if (!rawValue) return AUTO_TIME_PREFERENCE;
  try {
    const parsed = JSON.parse(rawValue) as {
      mode?: unknown;
      timeZone?: unknown;
      offsetMinutes?: unknown;
    };
    return normalizeTimePreference(parsed.mode, parsed.timeZone, parsed.offsetMinutes)
      ?? AUTO_TIME_PREFERENCE;
  } catch {
    return AUTO_TIME_PREFERENCE;
  }
}

export function setTimePreference(preference: TimePreference) {
  if (typeof window === "undefined") return;
  if (preference.mode === "auto") {
    localStorage.removeItem(TIME_KEY);
  } else {
    localStorage.setItem(TIME_KEY, JSON.stringify(preference));
  }
  dispatchPreferenceChange();
}

export function formatPreferredDateTime(
  scheduledAt: string | undefined,
  includeZone: boolean,
  preference: TimePreference,
) {
  if (!scheduledAt) return null;
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return null;

  if (preference.mode === "offset") {
    return formatWithFixedOffset(date, includeZone, preference.offsetMinutes);
  }

  const timeZone =
    preference.mode === "zone"
      ? preference.timeZone
      : typeof window === "undefined"
        ? null
        : Intl.DateTimeFormat().resolvedOptions().timeZone;

  return timeZone ? formatWithTimeZone(date, includeZone, timeZone) : null;
}

export function detectCurrentOffsetMinutes() {
  if (typeof window === "undefined") return 0;
  return -new Date().getTimezoneOffset();
}

function subscribePreferences(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

function dispatchPreferenceChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function formatWithTimeZone(date: Date, includeZone: boolean, timeZone: string) {
  const parts = dateTimeFormatter(timeZone, includeZone ? "shortOffset" : undefined)
    .formatToParts(date);
  return partsToLabel(parts, includeZone);
}

function formatWithFixedOffset(date: Date, includeZone: boolean, offsetMinutes: number) {
  const shiftedDate = new Date(date.getTime() + offsetMinutes * 60_000);
  const parts = dateTimeFormatter("UTC").formatToParts(shiftedDate);
  const label = partsToLabel(parts, false);
  return includeZone ? `${label} · ${formatGmtOffset(offsetMinutes)}` : label;
}

function dateTimeFormatter(
  timeZone: string,
  timeZoneName?: Intl.DateTimeFormatOptions["timeZoneName"],
) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
      timeZoneName,
    });
  } catch {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: isValidTimeZone(timeZone) ? timeZone : "UTC",
      timeZoneName: timeZoneName ? "short" : undefined,
    });
  }
}

function partsToLabel(parts: Intl.DateTimeFormatPart[], includeZone: boolean) {
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value.replace(".", "") ?? "";
  const zone = includeZone ? value("timeZoneName") : "";
  return `${value("day")} ${value("month")} · ${value("hour")}:${value("minute")}${zone ? ` · ${zone}` : ""}`;
}
