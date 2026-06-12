import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { chromium } from "playwright-core";

const BASE_URL = process.env.PRODUCTION_URL ?? "https://labolita.faysk.dev";
const allowPendingDeploy = process.argv.includes("--allow-pending-deploy");
const allowUnconfiguredSync = process.argv.includes("--allow-unconfigured-sync");
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

    const pagePaths = [
      "/",
      "/palpites",
      "/boloes",
      "/regras",
      "/entrar",
      ...(allowPendingDeploy ? [] : ["/privacidade", "/termos"]),
    ];
    for (const path of pagePaths) {
      const response = await gotoProductionPage(page, path);
      assert.equal(response?.status(), 200, `${path} must respond successfully`);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        ),
        false,
        `${path} must not overflow horizontally`,
      );
    }

    if (!allowPendingDeploy) {
      await gotoProductionPage(page, "/boloes");
      await page.getByRole("heading", { name: "Bolões públicos" }).waitFor();
      await gotoProductionPage(page, "/entrar");
      await page.getByText("Li e aceito os Termos de Serviço").waitFor();
    }

    if (!allowPendingDeploy) {
      for (const path of ["/robots.txt", "/sitemap.xml"]) {
        const response = await gotoProductionPage(page, path);
        assert.equal(response?.status(), 200, `${path} must respond successfully`);
      }
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
  if (!allowPendingDeploy) assert.equal(health.schedule.renderReady, true);
  if (!allowPendingDeploy) assert.equal(health.schedule.providerMappedMatches, 104);
  if (!allowUnconfiguredSync) assert.equal(health.resultsSyncConfigured, true);
  if (!allowPendingDeploy) {
    assert.equal(health.resultsSync.status, "ok");
    assert.equal(health.resultsSync.matched, 104);
  }

  const home = await fetch(BASE_URL);
  assert.equal(home.headers.get("x-frame-options"), "DENY");
  assert.equal(home.headers.get("x-content-type-options"), "nosniff");
  if (!allowPendingDeploy) {
    const homeHtml = await home.text();
    assert.match(homeHtml, /México/);
    assert.doesNotMatch(homeHtml, /A agenda ainda não foi importada/);
    assert.doesNotMatch(homeHtml, /O servidor recusou o palpite/);
  }

  const unauthorizedCron = await fetch(`${BASE_URL}/api/cron/results`);
  assert.equal(unauthorizedCron.status, 401);
  if (!allowPendingDeploy) {
    assert.match(unauthorizedCron.headers.get("cache-control") ?? "", /no-store/);
  }

  console.log("Production smoke test passed");
} finally {
  await browser.close();
}

async function gotoProductionPage(page, path) {
  try {
    return await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("net::ERR_ABORTED")) {
      throw error;
    }
    return page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
  }
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
