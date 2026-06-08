"use client";

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
  const fallback = `${fallbackDate} · ${fallbackTime}${includeZone ? " · BRT" : ""}`;
  const label =
    typeof window === "undefined"
      ? fallback
      : formatLocalDateTime(scheduledAt, includeZone) ?? fallback;

  return (
    <span
      className={className}
      title="Horário local do seu dispositivo"
      suppressHydrationWarning
    >
      {label}
    </span>
  );
}

function formatLocalDateTime(scheduledAt: string | undefined, includeZone: boolean) {
  if (!scheduledAt) return null;
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timeZoneName: includeZone ? "short" : undefined,
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value.replace(".", "") ?? "";
  const zone = includeZone ? value("timeZoneName") : "";
  return `${value("day")} ${value("month")} · ${value("hour")}:${value("minute")}${zone ? ` · ${zone}` : ""}`;
}
