import { countryName } from "@/lib/countries";
import { safeCountryCode } from "@/lib/country-theme";

export function PoolFlag({
  code,
  size = "md",
}: {
  code?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const safeCode = safeCountryCode(code);
  const sizeClass =
    size === "sm"
      ? "h-[2.625rem] w-14 rounded-xl"
      : size === "xl"
        ? "h-[5.25rem] w-28 rounded-[1.65rem]"
        : size === "lg"
          ? "h-[3.75rem] w-20 rounded-2xl"
          : "h-12 w-16 rounded-2xl";

  return (
    <span
      data-country-code={safeCode}
      className={`pool-flag relative inline-flex ${sizeClass} shrink-0 overflow-hidden border bg-white shadow-sm`}
      role="img"
      aria-label={`Bandeira de ${countryName(safeCode)}`}
      title={countryName(safeCode)}
    >
      <span
        aria-hidden
        className={`fi fi-${safeCode} block h-full bg-contain bg-center bg-no-repeat`}
        style={{ width: "100%" }}
      />
    </span>
  );
}
