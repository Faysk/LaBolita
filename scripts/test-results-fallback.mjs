import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

const PORT = 3201;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const secret = randomUUID();
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      RESULTS_FEED_URL: "http://127.0.0.1:1/unavailable",
      CRON_SECRET: secret,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);

let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk;
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk;
});

try {
  await waitForServer();

  const response = await fetch(`${BASE_URL}/api/cron/results`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "ok");
  assert.equal(body.source, "espn");
  assert.equal(body.fallbackUsed, true);
  assert.equal(body.observations, 104);
  assert.equal(body.matched, 104);

  console.log("Free results fallback smoke test passed");
} catch (error) {
  console.error(serverOutput);
  throw error;
} finally {
  server.kill();
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch {
      // O servidor ainda está subindo.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Next.js server did not become ready.");
}
