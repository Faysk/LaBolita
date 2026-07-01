import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { chromium } from "playwright-core";

const BASE_URL = process.env.SMOKE_URL ?? process.env.PRODUCTION_URL ?? "https://labolita.faysk.dev";
const smokeLabel = process.env.SMOKE_LABEL ?? "Production";
const allowPendingDeploy = process.argv.includes("--allow-pending-deploy");
const allowUnconfiguredSync = process.argv.includes("--allow-unconfigured-sync");
const allowProtectedPreview = process.argv.includes("--allow-protected-preview");
const expectedCommitSha = cleanEnvValue(process.env.EXPECTED_COMMIT_SHA);
const expectedCommitRef = cleanEnvValue(process.env.EXPECTED_COMMIT_REF);
const deploymentTimeoutMs = parseDurationSeconds(
  process.env.SMOKE_DEPLOYMENT_TIMEOUT_SECONDS,
  expectedCommitSha || expectedCommitRef ? 600 : 0,
) * 1000;
const deploymentPollMs = parseDurationSeconds(
  process.env.SMOKE_DEPLOYMENT_POLL_SECONDS,
  10,
) * 1000;
const executablePath = await findBrowser();
const browser = await chromium.launch({ executablePath, headless: true });
const bypassSecret =
  process.env.SMOKE_BYPASS_SECRET ?? process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const smokeHeaders = bypassSecret
  ? {
      "x-vercel-protection-bypass": bypassSecret,
    }
  : {};
const browserSmokeHeaders = bypassSecret
  ? {
      "x-vercel-protection-bypass": bypassSecret,
      "x-vercel-set-bypass-cookie": "true",
    }
  : {};

try {
  const preflight = await fetch(BASE_URL, { headers: smokeHeaders });
  if (preflight.status === 401 && allowProtectedPreview) {
    console.log(
      `${smokeLabel} smoke skipped: ${BASE_URL} is protected. Configure SMOKE_BYPASS_SECRET to test it from automation.`,
    );
  } else {
    const deploymentHealth = await waitForExpectedDeployment();
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      const page = await browser.newPage({ viewport });
      if (Object.keys(browserSmokeHeaders).length > 0) {
        await page.setExtraHTTPHeaders(browserSmokeHeaders);
      }
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));

      const pagePaths = [
        "/",
        "/palpites",
        "/boloes",
        "/competicao",
        "/regras",
        "/entrar",
        ...(allowPendingDeploy ? [] : ["/privacidade", "/termos"]),
      ];
      for (const path of pagePaths) {
        const httpResponse = await fetch(`${BASE_URL}${path}`, { headers: smokeHeaders });
        assert.equal(httpResponse.status, 200, `${path} must respond successfully`);
        const response = await gotoProductionPage(page, path);
        if (response) {
          assert.equal(response.status(), 200, `${path} must respond successfully in browser`);
        } else {
          assert.equal(
            new URL(page.url()).pathname,
            path,
            `${path} must complete browser navigation`,
          );
        }
        await assertNoHorizontalOverflow(page, path);
      }

      if (!allowPendingDeploy) {
        await gotoProductionPage(page, "/boloes");
        await page.getByRole("heading", { name: "Bolões públicos" }).waitFor();
        await gotoProductionPage(page, "/entrar");
        await page.getByRole("button", { name: "Continuar com Google" }).waitFor();
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

    const health = deploymentHealth ?? (await fetchHealth());
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

    const home = await fetch(BASE_URL, { headers: smokeHeaders });
    assert.equal(home.headers.get("x-frame-options"), "DENY");
    assert.equal(home.headers.get("x-content-type-options"), "nosniff");
    if (!allowPendingDeploy) {
      const homeHtml = await home.text();
      assert.match(homeHtml, /México/);
      assert.doesNotMatch(homeHtml, /A agenda ainda não foi importada/);
      assert.doesNotMatch(homeHtml, /O servidor recusou o palpite/);
    }

    const unauthorizedCron = await fetch(`${BASE_URL}/api/cron/results`, { headers: smokeHeaders });
    assert.equal(unauthorizedCron.status, 401);
    if (!allowPendingDeploy) {
      assert.match(unauthorizedCron.headers.get("cache-control") ?? "", /no-store/);
    }

    console.log(`${smokeLabel} smoke test passed`);
  }
} finally {
  await browser.close();
}

async function gotoProductionPage(page, path) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
    } catch (error) {
      if (!isRetriableNavigationError(error) || attempt === 1) {
        throw error;
      }
      await page.waitForLoadState("domcontentloaded", { timeout: 5_000 }).catch(() => {});
    }
  }
}

async function assertNoHorizontalOverflow(page, path) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        ),
        false,
        `${path} must not overflow horizontally`,
      );
      return;
    } catch (error) {
      if (!isRetriablePageStabilityError(error) || attempt === 1) {
        throw error;
      }
      await page.waitForLoadState("domcontentloaded", { timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(150);
    }
  }
}

async function waitForExpectedDeployment() {
  if (!expectedCommitSha && !expectedCommitRef) return null;

  const deadline = Date.now() + Math.max(deploymentTimeoutMs, 0);
  let lastHealth = null;
  let lastError = null;

  do {
    try {
      const health = await fetchHealth();
      lastHealth = health;
      if (isExpectedDeployment(health)) {
        return health;
      }
    } catch (error) {
      lastError = error;
    }

    if (Date.now() >= deadline) break;
    await delay(Math.max(deploymentPollMs, 1_000));
  } while (Date.now() <= deadline);

  const deployment = lastHealth?.deployment;
  const actual = deployment
    ? `${deployment.commitRef ?? "unknown"}@${deployment.commitSha ?? "unknown"}`
    : "missing deployment metadata";
  const expected = `${expectedCommitRef ?? "any-ref"}@${expectedCommitSha ?? "any-sha"}`;
  const reason = lastError instanceof Error ? ` Last error: ${lastError.message}` : "";

  throw new Error(
    `${smokeLabel} is not serving expected deployment ${expected}. Current: ${actual}.${reason}`,
  );
}

async function fetchHealth() {
  const response = await fetch(`${BASE_URL}/api/health`, { headers: smokeHeaders });
  assert.equal(response.status, 200);
  return response.json();
}

function isExpectedDeployment(health) {
  const deployment = health.deployment ?? {};
  const actualSha = cleanEnvValue(deployment.commitSha);
  const actualRef = cleanEnvValue(deployment.commitRef);

  const shaMatches =
    !expectedCommitSha ||
    actualSha === expectedCommitSha ||
    Boolean(actualSha && expectedCommitSha.startsWith(actualSha)) ||
    Boolean(actualSha && actualSha.startsWith(expectedCommitSha));
  const refMatches = !expectedCommitRef || actualRef === expectedCommitRef;

  return shaMatches && refMatches;
}

function cleanEnvValue(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDurationSeconds(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function isRetriableNavigationError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("net::ERR_ABORTED") ||
    message.includes("is interrupted by another navigation")
  );
}

function isRetriablePageStabilityError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Execution context was destroyed") ||
    message.includes("Cannot find context with specified id") ||
    isRetriableNavigationError(error)
  );
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
