process.env.SMOKE_URL ??= "https://homolog.labolita.faysk.dev";
process.env.SMOKE_LABEL ??= "Homolog";

const strictSync = process.argv.includes("--strict-sync");
const requirePublic = process.argv.includes("--require-public");
process.argv = process.argv.filter(
  (arg) => arg !== "--strict-sync" && arg !== "--require-public",
);

if (!strictSync && !process.argv.includes("--allow-unconfigured-sync")) {
  process.argv.push("--allow-unconfigured-sync");
}

if (!requirePublic && !process.argv.includes("--allow-protected-preview")) {
  process.argv.push("--allow-protected-preview");
}

await import("./test-production.mjs");
