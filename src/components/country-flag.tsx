import { countryName } from "@/lib/countries";

export function CountryFlag({
  code,
  size = "md",
}: {
  code?: string;
  size?: "sm" | "md" | "lg";
}) {
  const safeCode = /^[a-z]{2}$/i.test(code ?? "") ? (code ?? "br").toLowerCase() : "br";
  const sizeClass = size === "sm" ? "size-8" : size === "lg" ? "size-14" : "size-11";

  return (
    <span
      data-country-code={safeCode}
      className={`inline-flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-white shadow-sm`}
      role="img"
      aria-label={`Bandeira de ${countryName(safeCode)}`}
      title={countryName(safeCode)}
    >
      <span className={`fi fi-${safeCode} size-full bg-cover bg-center`} />
    </span>
  );
}
