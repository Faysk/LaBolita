import type { CSSProperties } from "react";
import { countryName } from "@/lib/countries";
import { countryTheme, safeCountryCode } from "@/lib/country-theme";

export function PoolFlag({
  code,
  size = "md",
}: {
  code?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const safeCode = safeCountryCode(code);
  const theme = countryTheme(safeCode);
  const sizeClass =
    size === "sm"
      ? "size-12 rounded-2xl"
      : size === "xl"
        ? "size-24 rounded-[2rem]"
        : size === "lg"
          ? "size-[4.5rem] rounded-[1.4rem]"
          : "size-14 rounded-2xl";
  const flagBoxClass =
    size === "sm"
      ? "h-7 w-9 rounded-lg"
      : size === "xl" || size === "lg"
        ? "h-12 w-16 rounded-xl"
        : "h-9 w-12 rounded-lg";

  return (
    <span
      data-country-code={safeCode}
      className={`pool-flag relative isolate inline-flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden border shadow-sm`}
      style={
        {
          "--pool-primary": theme.primary,
          "--pool-secondary": theme.secondary,
        } as CSSProperties
      }
      title={countryName(safeCode)}
    >
      <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.62),transparent_32%),linear-gradient(135deg,var(--pool-primary),var(--pool-secondary))] opacity-90" />
      <span aria-hidden className="absolute inset-x-3 bottom-2 h-5 rounded-full bg-black/20 blur-xl" />
      <span
        className={`relative block ${flagBoxClass} overflow-hidden border bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.78),0_10px_22px_rgba(0,0,0,0.18)]`}
        role="img"
        aria-label={`Bandeira de ${countryName(safeCode)}`}
      >
        <span
          className={`fi fi-${safeCode} absolute inset-0 h-full bg-cover bg-center`}
          style={{ width: "100%" }}
        />
      </span>
    </span>
  );
}
