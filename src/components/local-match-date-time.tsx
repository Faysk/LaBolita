"use client";

import { formatPreferredDateTime, useTimePreference } from "@/lib/user-preferences";

export function LocalMatchDateTime({
  scheduledAt,
  fallbackDate,
  fallbackTime,
  includeZone = false,
  className,
}: {
  scheduledAt?: string;
  fallbackDate: string;
  fallbackTime: string;
  includeZone?: boolean;
  className?: string;
}) {
  const { preference } = useTimePreference();
  const fallback = `${fallbackDate} · ${fallbackTime}${includeZone ? " · BRT" : ""}`;
  const label =
    typeof window === "undefined"
      ? fallback
      : formatPreferredDateTime(scheduledAt, includeZone, preference) ?? fallback;

  return (
    <span
      className={className}
      title={
        preference.mode === "auto"
          ? "Horário local do seu dispositivo"
          : "Horário ajustado nas suas preferências"
      }
      suppressHydrationWarning
    >
      {label}
    </span>
  );
}
