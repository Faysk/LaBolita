import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

const PORT = 3200;
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
      RESULTS_FEED_URL: "https://worldcup26.ir/get/games",
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

  const home = await fetch(BASE_URL);
  const homeHtml = await home.text();
  assert.equal(home.status, 200);
  assert.match(homeHtml, /México/);
  assert.doesNotMatch(homeHtml, /A agenda ainda não foi importada/);
  assert.match(home.headers.get("content-security-policy") ?? "", /default-src 'self'/);
  assert.equal(home.headers.get("x-frame-options"), "DENY");
  assert.equal(home.headers.get("x-content-type-options"), "nosniff");

  for (const route of [
    "/entrar",
    "/palpites",
    "/boloes",
    "/regras",
    "/privacidade",
    "/termos",
  ]) {
    const response = await fetch(`${BASE_URL}${route}`);
    assert.equal(response.status, 200, `${route} must respond successfully`);
  }

  const health = await fetch(`${BASE_URL}/api/health`).then((response) => response.json());
  assert.equal(health.launchReady, true);
  assert.equal(health.schedule.renderReady, true);
  assert.equal(
    "error_message" in health.resultsSync,
    false,
    "the public health endpoint must not expose internal synchronization errors",
  );

  const unauthorized = await fetch(`${BASE_URL}/api/cron/results`);
  assert.equal(unauthorized.status, 401);
  assert.match(unauthorized.headers.get("cache-control") ?? "", /no-store/);

  const authorized = await fetch(`${BASE_URL}/api/cron/results`, {
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(30_000),
  });
  assert.equal(authorized.status, 200);
  const body = await authorized.json();
  assert.equal(body.status, "ok");
  assert.equal(body.observations, 104);
  assert.equal(body.matched, 104);
  assert.equal(body.source, "worldcup26");
  assert.equal(body.fallbackUsed, false);
  assert.equal(body.ignoredRegressions, 0);
  assert.match(authorized.headers.get("cache-control") ?? "", /no-store/);

  console.log("Remote results synchronization smoke test passed");
} catch (error) {
  console.error(serverOutput);
  throw error;
} finally {
  server.kill();
}

async function waitForServer() {
  let lastResponse = "no response";
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
      lastResponse = `${response.status}: ${await response.text()}`;
    } catch (error) {
      lastResponse = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Next.js server did not become ready. Last health response: ${lastResponse}`);
}
