export function safeRedirectPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;

  try {
    const parsed = new URL(value, "https://labolita.local");
    if (parsed.origin !== "https://labolita.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
