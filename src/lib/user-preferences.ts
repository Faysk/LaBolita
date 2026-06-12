"use client";

import { useEffect, useSyncExternalStore } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type EffectiveTheme = "light" | "dark";

export type TimePreference =
  | { mode: "auto" }
  | { mode: "zone"; timeZone: string }
  | { mode: "offset"; offsetMinutes: number };

export const TIME_ZONE_OPTIONS = [
  { value: "America/Sao_Paulo", label: "São Paulo / Buenos Aires" },
  { value: "Europe/Lisbon", label: "Lisboa" },
  { value: "Europe/London", label: "Londres" },
  { value: "America/Mexico_City", label: "México - Cidade do México" },
  { value: "America/New_York", label: "EUA - Nova York" },
  { value: "America/Los_Angeles", label: "EUA - Los Angeles" },
  { value: "UTC", label: "UTC" },
] as const;

const OFFSET_CITY_LABELS: Record<number, string> = {
  [-8 * 60]: "Los Angeles",
  [-6 * 60]: "Cidade do México",
  [-5 * 60]: "Nova York",
  [-3 * 60]: "São Paulo / Buenos Aires",
  0: "UTC",
  [1 * 60]: "Lisboa / Londres",
  [2 * 60]: "Madri / Berlim",
  [3 * 60]: "Doha / Riade",
  [4 * 60]: "Dubai",
  [9 * 60]: "Tóquio",
  [10 * 60]: "Sydney",
};

export const GMT_OFFSET_OPTIONS = Array.from(
  { length: 14 - -12 + 1 },
  (_, index) => {
    const value = (-12 + index) * 60;
    const cityLabel = OFFSET_CITY_LABELS[value];
    return {
      value,
      label: cityLabel ? `${formatGmtOffset(value)} (${cityLabel})` : formatGmtOffset(value),
    };
  },
);

const THEME_KEY = "labolita-theme";
const TIME_KEY = "labolita-time-preference";
const CHANGE_EVENT = "labolita-preferences-change";
const THEME_CHANGE_EVENT = "labolita-theme-change";
const AUTO_TIME_PREFERENCE: TimePreference = { mode: "auto" };
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
  return stored === "light" || stored === "dark" ? stored : "system";
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
    const parsed = JSON.parse(rawValue) as Partial<TimePreference>;
    if (parsed.mode === "zone" && typeof parsed.timeZone === "string") {
      return isValidTimeZone(parsed.timeZone)
        ? { mode: "zone", timeZone: parsed.timeZone }
        : AUTO_TIME_PREFERENCE;
    }
    if (parsed.mode === "offset" && typeof parsed.offsetMinutes === "number") {
      const offsetMinutes = Math.trunc(parsed.offsetMinutes);
      return isValidOffset(offsetMinutes)
        ? { mode: "offset", offsetMinutes }
        : AUTO_TIME_PREFERENCE;
    }
  } catch {
    return AUTO_TIME_PREFERENCE;
  }

  return AUTO_TIME_PREFERENCE;
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

export function formatGmtOffset(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  return `GMT${sign}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
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

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function isValidOffset(offsetMinutes: number) {
  return (
    Number.isInteger(offsetMinutes) &&
    offsetMinutes >= -12 * 60 &&
    offsetMinutes <= 14 * 60 &&
    offsetMinutes % 60 === 0
  );
}
