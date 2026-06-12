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
      role="img"
      aria-label={`Bandeira de ${countryName(safeCode)}`}
      title={countryName(safeCode)}
    >
      <span aria-hidden className={`fi fi-${safeCode} absolute inset-0 scale-125 opacity-20 blur-[2px]`} />
      <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.78),transparent_30%),linear-gradient(135deg,var(--pool-primary),var(--pool-secondary))] opacity-75" />
      <span className={`fi fi-${safeCode} relative size-[58%] rounded-lg bg-cover bg-center shadow-[0_0_0_2px_rgba(255,255,255,0.86)]`} />
    </span>
  );
}
