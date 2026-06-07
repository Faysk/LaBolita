import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { chromium } from "playwright-core";

const BASE_URL = process.env.PRODUCTION_URL ?? "https://labolita.faysk.dev";
const allowPendingDeploy = process.argv.includes("--allow-pending-deploy");
const executablePath = await findBrowser();
const browser = await chromium.launch({ executablePath, headless: true });

try {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));

    const paths = [
      "/",
      "/palpites",
      "/boloes",
      "/regras",
      "/entrar",
      ...(allowPendingDeploy
        ? []
        : ["/privacidade", "/termos", "/robots.txt", "/sitemap.xml"]),
    ];
    for (const path of paths) {
      const response = await page.goto(`${BASE_URL}${path}`, {
        waitUntil: "domcontentloaded",
      });
      assert.equal(response?.status(), 200, `${path} must respond successfully`);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        ),
        false,
        `${path} must not overflow horizontally`,
      );
    }

    assert.deepEqual(errors, []);
    await page.close();
  }

  const response = await fetch(`${BASE_URL}/api/health`);
  assert.equal(response.status, 200);
  const health = await response.json();
  assert.equal(health.database, "connected");
  assert.equal(health.launchReady, true);
  assert.equal(health.schedule.teams, 48);
  assert.equal(health.schedule.matches, 104);
  if (!allowPendingDeploy) assert.equal(health.schedule.providerMappedMatches, 104);

  const home = await fetch(BASE_URL);
  assert.equal(home.headers.get("x-frame-options"), "DENY");
  assert.equal(home.headers.get("x-content-type-options"), "nosniff");

  console.log("Production smoke test passed");
} finally {
  await browser.close();
}

async function findBrowser() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Tenta o próximo navegador do sistema.
    }
  }

  throw new Error(
    "Chrome/Chromium não encontrado. Defina PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.",
  );
}
