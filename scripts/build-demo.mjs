import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", "build"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      LABOLITA_BUILD_DIR: ".next-demo",
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
