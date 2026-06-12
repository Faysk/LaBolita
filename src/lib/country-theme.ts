const COUNTRY_ACCENTS: Record<string, { primary: string; secondary: string }> = {
  ar: { primary: "#74acdf", secondary: "#f6c945" },
  au: { primary: "#012169", secondary: "#ffcd00" },
  br: { primary: "#009c3b", secondary: "#ffdf00" },
  ca: { primary: "#d80621", secondary: "#ffffff" },
  ch: { primary: "#d52b1e", secondary: "#ffffff" },
  de: { primary: "#dd0000", secondary: "#ffce00" },
  es: { primary: "#c60b1e", secondary: "#ffc400" },
  fr: { primary: "#0055a4", secondary: "#ef4135" },
  gb: { primary: "#012169", secondary: "#c8102e" },
  ht: { primary: "#00209f", secondary: "#d21034" },
  kr: { primary: "#003478", secondary: "#c60c30" },
  ma: { primary: "#c1272d", secondary: "#006233" },
  mx: { primary: "#006847", secondary: "#ce1126" },
  pt: { primary: "#006600", secondary: "#ff0000" },
  py: { primary: "#0038a8", secondary: "#d52b1e" },
  us: { primary: "#3c3b6e", secondary: "#b22234" },
  za: { primary: "#007a4d", secondary: "#ffb612" },
};

export function countryTheme(code?: string) {
  const safeCode = safeCountryCode(code);
  const explicit = COUNTRY_ACCENTS[safeCode];
  if (explicit) return explicit;

  const hue = Array.from(safeCode).reduce(
    (total, letter) => total + letter.charCodeAt(0),
    0,
  ) % 360;

  return {
    primary: `hsl(${hue} 68% 32%)`,
    secondary: `hsl(${(hue + 42) % 360} 82% 58%)`,
  };
}

export function safeCountryCode(code?: string) {
  return /^[a-z]{2}$/i.test(code ?? "") ? (code ?? "br").toLowerCase() : "br";
}
