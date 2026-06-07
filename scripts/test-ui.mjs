import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const executablePath = await findBrowser();
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)],
  {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT) },
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

let browser;

try {
  await waitForServer();
  browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(BASE_URL);
  await page.getByRole("heading", { name: "Seu palpite. Sua resenha. Sua taça." }).waitFor();
  await page.getByText("Modo demonstração: agenda parcial").waitFor();

  await page.goto(`${BASE_URL}/palpites`);
  const openingMatch = page.getByTestId("match-match-1");
  await openingMatch.getByLabel("Gols de México").fill("2");
  await openingMatch.getByLabel("Gols de África do Sul").fill("1");
  assert.match(
    await page.evaluate(() => localStorage.getItem("prediction:match-1") ?? ""),
    /"homeScore":2/,
  );
  const finalMatch = page.getByTestId("match-match-9");
  await finalMatch.getByLabel("Gols de Brasil").fill("1");
  await finalMatch.getByLabel("Gols de Argentina").fill("1");
  await finalMatch.getByLabel("Quem avança?").selectOption("brazil");
  assert.match(
    await page.evaluate(() => localStorage.getItem("prediction:match-9") ?? ""),
    /"advancingTeamId":"brazil"/,
  );

  await page.goto(`${BASE_URL}/admin`);
  const adminOpeningMatch = page.getByTestId("admin-match-match-1");
  await adminOpeningMatch.getByRole("button", { name: "Informar resultado" }).click();
  await adminOpeningMatch.getByLabel("México").fill("2");
  await adminOpeningMatch.getByLabel("África do Sul").fill("1");
  await adminOpeningMatch.getByLabel("Motivo ou fonte").fill("Conferido na FIFA");
  await adminOpeningMatch.getByRole("button", { name: "Finalizar e pontuar" }).click();
  await adminOpeningMatch.getByText("Resultado informado: 2 x 1").waitFor();
  const adminFinalMatch = page.getByTestId("admin-match-match-9");
  await adminFinalMatch.getByRole("button", { name: "Informar resultado" }).click();
  await adminFinalMatch.getByRole("spinbutton", { name: "Brasil" }).fill("1");
  await adminFinalMatch.getByRole("spinbutton", { name: "Argentina" }).fill("1");
  await adminFinalMatch.getByLabel("Quem avançou").selectOption("brazil");
  await adminFinalMatch.getByLabel("Motivo ou fonte").fill("Conferido na FIFA");
  await adminFinalMatch.getByRole("button", { name: "Finalizar e pontuar" }).click();
  await adminFinalMatch.getByText("Resultado informado: 1 x 1").waitFor();

  await page.goto(`${BASE_URL}/palpites`);
  await page
    .getByTestId("match-match-1")
    .getByText("Seu palpite rendeu 10 pontos")
    .waitFor();
  await page
    .getByTestId("match-match-9")
    .getByText("Seu palpite rendeu 53 pontos")
    .waitFor();
  assert.equal(await page.getByTestId("match-match-1").getByLabel("Gols de México").isDisabled(), true);

  await page.goto(`${BASE_URL}/boloes`);
  await page.getByTestId("ranking-current-user").getByText("131 pts").waitFor();
  await page.getByTestId("pool-friends").getByRole("button", { name: "Ver ranking" }).click();
  await page.getByTestId("pool-ranking").getByText("Resenha da Firma").waitFor();
  await page.getByRole("button", { name: "Criar bolão" }).click();
  const createForm = page.getByTestId("pool-form-create");
  await createForm.getByPlaceholder("Ex.: Família Faysk").fill("Bolão Automatizado");
  await createForm.getByRole("button", { name: "Criar agora" }).click();
  const createdPool = page.locator("article").filter({ hasText: "Bolão Automatizado" });
  await createdPool.getByRole("button", { name: "Ver ranking" }).click();
  await page.getByTestId("pool-ranking").getByText("Bolão Automatizado").waitFor();
  await page.getByTestId("ranking-current-user").getByText("0 pts").waitFor();

  await page.goto(`${BASE_URL}/admin`);
  const correctionMatch = page.getByTestId("admin-match-match-1");
  await correctionMatch.getByRole("button", { name: "Corrigir resultado" }).click();
  await correctionMatch.getByLabel("México").fill("3");
  await correctionMatch.getByLabel("África do Sul").fill("0");
  await correctionMatch.getByLabel("Motivo ou fonte").fill("Correção oficial");
  await correctionMatch.getByRole("button", { name: "Finalizar e pontuar" }).click();
  await correctionMatch.getByText("Resultado informado: 3 x 0").waitFor();

  await page.goto(`${BASE_URL}/palpites`);
  await page.getByTestId("match-match-1").getByText("Seu palpite rendeu 5 pontos").waitFor();

  await page.goto(`${BASE_URL}/boloes`);
  await page.getByTestId("ranking-current-user").getByText("126 pts").waitFor();

  await page.goto(BASE_URL);
  await page.getByTestId("home-ranking-current-user").getByText("126 pts").waitFor();
  await page.getByRole("button", { name: "Abrir menu da conta" }).click();
  await page.getByText("Faysk · demonstração").waitFor();

  const health = await page.request.get(`${BASE_URL}/api/health`);
  assert.equal(health.status(), 200);
  const healthBody = await health.json();
  assert.equal(healthBody.database, "demo");
  assert.equal(healthBody.launchReady, false);
  assert.equal(healthBody.schedule.requiredMatches, 104);
  assert.deepEqual(pageErrors, []);

  const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const desktopErrors = [];
  desktopPage.on("pageerror", (error) => desktopErrors.push(error.message));
  for (const path of ["/", "/palpites", "/boloes", "/regras", "/admin", "/entrar"]) {
    const response = await desktopPage.goto(`${BASE_URL}${path}`);
    assert.equal(response?.status(), 200, `${path} must respond successfully`);
    assert.equal(
      await desktopPage.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      ),
      false,
      `${path} must not overflow horizontally on desktop`,
    );
  }
  const homeResponse = await desktopPage.goto(BASE_URL);
  assert.equal(homeResponse?.headers()["x-frame-options"], "DENY");
  assert.equal(homeResponse?.headers()["x-content-type-options"], "nosniff");
  assert.deepEqual(desktopErrors, []);

  console.log("UI flow test passed");
} catch (error) {
  console.error(serverOutput);
  throw error;
} finally {
  await browser?.close();
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
