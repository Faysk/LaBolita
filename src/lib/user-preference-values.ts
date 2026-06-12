export type ThemePreference = "system" | "light" | "dark";
export type EffectiveTheme = "light" | "dark";

export type TimePreference =
  | { mode: "auto" }
  | { mode: "zone"; timeZone: string }
  | { mode: "offset"; offsetMinutes: number };

export const AUTO_TIME_PREFERENCE: TimePreference = { mode: "auto" };

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

export function normalizeThemePreference(value: unknown): ThemePreference | null {
  return value === "system" || value === "light" || value === "dark" ? value : null;
}

export function normalizeTimePreference(
  mode: unknown,
  timeZone: unknown,
  offsetMinutes: unknown,
): TimePreference | null {
  if (mode === "auto") return AUTO_TIME_PREFERENCE;
  if (mode === "zone" && typeof timeZone === "string" && isValidTimeZone(timeZone)) {
    return { mode: "zone", timeZone };
  }
  if (mode === "offset" && typeof offsetMinutes === "number") {
    const normalizedOffset = Math.trunc(offsetMinutes);
    return isValidOffset(normalizedOffset)
      ? { mode: "offset", offsetMinutes: normalizedOffset }
      : null;
  }
  return null;
}

export function formatGmtOffset(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  return `GMT${sign}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function isValidOffset(offsetMinutes: number) {
  return (
    Number.isInteger(offsetMinutes) &&
    offsetMinutes >= -12 * 60 &&
    offsetMinutes <= 14 * 60 &&
    offsetMinutes % 60 === 0
  );
}
