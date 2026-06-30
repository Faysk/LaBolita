import { spawnSync } from "node:child_process";
import { accessSync } from "node:fs";
import path from "node:path";

const buildDir = process.env.LABOLITA_BUILD_DIR ?? ".next-demo";
const nextBin = findNextBin();

const result = spawnSync(
  process.execPath,
  [nextBin, "build"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      LABOLITA_BUILD_DIR: buildDir,
      NEXT_PUBLIC_LABOLITA_DEMO_MODE: "1",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      RESULTS_FEED_URL: "",
      CRON_SECRET: "",
    },
    stdio: "inherit",
    windowsHide: true,
  },
);

process.exit(result.status ?? 1);

function findNextBin() {
  const candidates = [];
  let currentDir = process.cwd();

  while (true) {
    candidates.push(path.join(currentDir, "node_modules", "next", "dist", "bin", "next"));
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  for (const candidate of candidates) {
    try {
      accessSync(candidate);
      return candidate;
    } catch {
      // Tenta o próximo diretório de dependências.
    }
  }

  return candidates[0];
}
