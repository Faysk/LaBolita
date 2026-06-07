"use client";

import { useState } from "react";
import { countryFlagEmoji, countryName } from "@/lib/countries";

export function CountryFlag({
  code,
  size = "md",
}: {
  code?: string;
  size?: "sm" | "md" | "lg";
}) {
  const safeCode = /^[a-z]{2}$/i.test(code ?? "") ? (code ?? "br").toLowerCase() : "br";
  const source = `/flags/${safeCode}.svg`;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const sizeClass = size === "sm" ? "size-8 text-xl" : size === "lg" ? "size-14 text-4xl" : "size-11 text-3xl";

  return (
    <span
      className={`inline-flex ${sizeClass} shrink-0 items-center justify-center rounded-2xl border bg-white shadow-sm`}
      role="img"
      aria-label={`Bandeira de ${countryName(safeCode)}`}
      title={countryName(safeCode)}
    >
      {failedSource === source ? (
        countryFlagEmoji(safeCode)
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={source}
          alt=""
          className="h-full w-full rounded-2xl object-cover"
          onError={() => setFailedSource(source)}
        />
      )}
    </span>
  );
}
