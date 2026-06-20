import assert from "node:assert/strict";
import { access, rm } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright-core";

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DEMO_BUILD_DIR = ".next-demo-ui";
const executablePath = await findBrowser();
const nextBin = await findNextBin();

let serverOutput = "";
let server;
let browser;

try {
  await cleanupDemoBuild();
  buildDemo();
  server = spawn(
    process.execPath,
    [nextBin, "start", "-p", String(PORT)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(PORT),
        LABOLITA_BUILD_DIR: DEMO_BUILD_DIR,
        NEXT_PUBLIC_LABOLITA_DEMO_MODE: "1",
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  server.stdout.on("data", (chunk) => {
    serverOutput += chunk;
  });
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk;
  });

  await waitForServer();
  browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(BASE_URL);
  await page.getByRole("heading", { name: /Acompanhe a Copa sem se perder|Tem jogo rolando agora/ }).waitFor();
  await page.getByText("Modo demonstração: agenda parcial").waitFor();
  await page.getByRole("heading", { name: /Próximos jogos|Agora ao vivo/ }).waitFor();
  await page.getByRole("button", { name: /Ver mais .*jogos/ }).first().waitFor();
  await page.getByTestId(/^timeline-match-/).first().waitFor();
  await waitForFlagFallbacks(page);

  await page.goto(`${BASE_URL}/ao-vivo`);
  await page.getByRole("heading", { name: /Tudo pronto para acompanhar|O jogo está mexendo/ }).waitFor();
  await page.getByText(/Atualização automática|atualizar sozinha/).waitFor();
  await page.getByText("Seu palpite", { exact: true }).waitFor();
  await page.getByText("Distribuição dos palpites").waitFor();
  await page.getByText("Cravadas").first().waitFor();
  if (await page.getByText("Pontos do placar").count()) {
    await page.getByText("Pontos do placar").first().waitFor();
  }
  await page.getByRole("link", { name: "Abrir bolões" }).waitFor();
  await waitForFlagFallbacks(page);

  await page.goto(`${BASE_URL}/painel`);
  await page.getByRole("heading", { name: "Painel" }).waitFor();
  if (await page.getByTestId("dashboard-live-impact-toggle").count()) {
    await page.getByTestId("dashboard-live-impact-toggle").first().click();
    await page
      .getByTestId("dashboard-live-impact-details")
      .first()
      .getByText("Pontos do placar")
      .waitFor();
  } else {
    await page.getByText(/Próxima ação|Tudo encaminhado/).waitFor();
  }
  await waitForFlagFallbacks(page);

  await page.goto(`${BASE_URL}/jogos`);
  await page.getByRole("heading", { name: "Jogos da Copa" }).waitFor();
  await page.getByText("Trilha rápida").waitFor();
  await page.getByRole("heading", { name: "Próximos jogos" }).waitFor();
  await page.getByText("Meu palpite").first().waitFor();
  const quickSchedule = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Agora, próximos e últimos" }),
  });
  const quickScheduleHref = await quickSchedule.getByTestId(/^timeline-match-/).first().evaluate((element) =>
    element.closest("a")?.getAttribute("href") ?? "",
  );
  assert.match(
    quickScheduleHref,
    /^\/palpites\?jogo=[^#]+#lista-de-jogos$/,
    "quick schedule match cards must open the focused prediction",
  );
  await page.getByRole("heading", { name: "Palpites do bolão por partida" }).waitFor();
  await page.getByText("Agenda completa").waitFor();
  const completeSchedule = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Agenda completa" }),
  });
  const firstAgendaHref = await completeSchedule.getByTestId(/^timeline-match-/).first().evaluate((element) =>
    element.closest("a")?.getAttribute("href") ?? "",
  );
  assert.match(
    firstAgendaHref,
    /^\/palpites\?jogo=[^#]+#lista-de-jogos$/,
    "complete schedule match cards must open the predictions screen",
  );
  const focusedMatchId = new URL(firstAgendaHref, BASE_URL).searchParams.get("jogo");
  assert.ok(focusedMatchId, "complete schedule links must include the match id");
  await page.goto(`${BASE_URL}${firstAgendaHref}`);
  await page.getByTestId(`match-${focusedMatchId}`).waitFor();
  await page.getByText("Jogo aberto pela agenda").waitFor();
  await waitForFlagFallbacks(page);

  await page.goto(`${BASE_URL}/jogadores`);
  await page.getByRole("heading", { name: "Jogadores da Copa" }).waitFor();
  await page.getByText("Figurinhas em destaque").waitFor();
  await page.getByLabel("Ordenar").selectOption("goals");
  await page.getByText(/Mostrando .* Mais gols/).waitFor();
  await page.getByText("Dados do jogador").first().click();
  await page.getByText("Especiais relacionados").first().waitFor();
  await page.getByRole("link", { name: "Artilheiro" }).first().waitFor();
  await waitForFlagFallbacks(page);

  await page.goto(`${BASE_URL}/palpites`);
  await page.getByRole("heading", { name: "Seus palpites" }).waitFor();
  await waitForFlagFallbacks(page);
  await page.getByRole("button", { name: "Mata-mata" }).click();
  await page.getByTestId("match-match-9").waitFor();
  assert.equal(await page.getByTestId("match-match-1").count(), 0);
  await page.getByRole("button", { name: "Todos" }).click();
  await page.getByRole("button", { name: "Por data" }).click();
  assert.equal(await page.getByRole("button", { name: "Por data" }).getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "Por fase" }).click();
  assert.equal(
    await page.locator('[data-testid="team-flag"] img').evaluateAll((images) =>
      images.every((image) => new URL(image.src).origin === window.location.origin),
    ),
    true,
    "team flags must load from the application origin",
  );
  const openingMatch = page.getByTestId("match-match-1");
  await openingMatch.getByLabel("Gols de México").fill("2");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("prediction:match-1")),
    null,
    "a partial score must remain only as an unsaved draft",
  );
  await openingMatch.getByLabel("Gols de África do Sul").fill("1");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("prediction:match-1")),
    null,
    "a complete draft must wait for explicit confirmation",
  );
  await openingMatch.getByRole("button", { name: "Salvar palpite" }).click();
  assert.match(
    await page.evaluate(() => localStorage.getItem("prediction:match-1") ?? ""),
    /"homeScore":2/,
  );
  const finalMatch = page.getByTestId("match-match-9");
  await finalMatch.getByLabel("Gols de Brasil").fill("1");
  await finalMatch.getByLabel("Gols de Argentina").fill("1");
  await finalMatch.getByLabel("Quem avança?").selectOption("brazil");
  await finalMatch.getByRole("button", { name: "Salvar palpite" }).click();
  assert.match(
    await page.evaluate(() => localStorage.getItem("prediction:match-9") ?? ""),
    /"advancingTeamId":"brazil"/,
  );

  await page.goto(`${BASE_URL}/admin`);
  await page.getByRole("button", { name: "Usar tema escuro" }).click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
  await page.getByRole("button", { name: /^Todos ·/ }).click();
  await page.getByRole("button", { name: "Por data" }).click();
  assert.equal(await page.getByRole("button", { name: "Por data" }).getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "Por grupo/fase" }).click();
  await page.getByRole("button", { name: /^Divergências ·/ }).waitFor();
  const darkAdminHeaderIsNearlyWhite = await page.locator(".sticky").first().evaluate((element) => {
    const background = getComputedStyle(element).backgroundColor;
    if (background.includes("255, 255, 255") || background.includes("1 1 1")) return true;
    const channels = background.match(/[\d.]+/g)?.map(Number) ?? [];
    return channels.length >= 3 && channels[0] > 240 && channels[1] > 240 && channels[2] > 240;
  });
  assert.equal(
    darkAdminHeaderIsNearlyWhite,
    false,
    "admin group headers must not render as white bars in dark mode",
  );
  await page.getByRole("button", { name: "Usar tema claro" }).click();
  await page.goto(`${BASE_URL}/admin?master_tab=audit`);
  await page.getByLabel("Origem").selectOption("predictions");
  await page.getByLabel("Período").selectOption("30d");
  await page.getByPlaceholder("Ação, usuário, jogo, bolão...").fill("palpite");
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.waitForURL(/master_audit_source=predictions/);
  assert.match(page.url(), /master_audit_period=30d/);
  assert.match(page.url(), /master_audit_query=palpite/);
  await page.getByText("Nenhum evento encontrado com esses filtros.").waitFor();
  await page.getByRole("button", { name: "Limpar" }).click();
  await page.waitForURL(
    (url) => url.searchParams.get("master_tab") === "audit" && !url.searchParams.has("master_audit_query"),
  );
  assert.equal(page.url().includes("master_audit_query"), false);
  await page.goto(`${BASE_URL}/admin`);
  await page.getByRole("button", { name: /^Todos ·/ }).click();
  const adminOpeningMatch = page.getByTestId("admin-match-match-1");
  await adminOpeningMatch.getByRole("button", { name: /Informar resultado|Corrigir resultado/ }).click();
  await adminOpeningMatch.getByRole("spinbutton", { name: "México" }).fill("2");
  await adminOpeningMatch.getByRole("spinbutton", { name: "África do Sul" }).fill("1");
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
  await page.getByRole("button", { name: "Todos" }).click();
  await page.getByRole("heading", { name: "Comparar palpites do bolão" }).waitFor();
  await page.getByText("Mapa dos palpites").first().waitFor();
  await page.getByText("Iguais ao seu").first().waitFor();
  await page.getByTestId("comparison-current-user").first().click();
  await page
    .getByTestId("prediction-comparison-details")
    .first()
    .getByText("Pontos do placar")
    .waitFor();
  await page
    .getByTestId("match-match-1")
    .getByText("Seu palpite rendeu 10 pontos")
    .waitFor();
  await page
    .getByTestId("match-match-9")
    .getByText("Seu palpite rendeu 53 pontos")
    .waitFor();
  assert.equal(await page.getByTestId("match-match-1").getByLabel("Gols de México").isDisabled(), true);
  await page.goto(`${BASE_URL}/palpites?jogo=match-9#lista-de-jogos`);
  await page.getByTestId("finished-review-selected-match").getByText("Final · simulação").waitFor();
  await page.getByTestId("match-match-9").getByText("Jogo aberto pela agenda").waitFor();

  await page.goto(`${BASE_URL}/boloes`);
  await page.getByRole("heading", { name: "Bolões públicos" }).waitFor();
  await page.getByTestId("pools-command-center").getByText("Mapa dos bolões").waitFor();
  await page.getByTestId("pools-command-center").getByRole("link", { name: "Ranking" }).waitFor();
  await page.getByText("Seus rankings").waitFor();
  await page.getByRole("button", { name: "Usar tema escuro" }).click();
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.theme),
    "dark",
    "the manual theme toggle must update the document theme",
  );
  await page.getByRole("button", { name: "Usar tema claro" }).click();
  const selectedPoolCard = page.getByTestId("pool-family");
  assert.notEqual(
    await selectedPoolCard.evaluate((element) => getComputedStyle(element).backgroundColor),
    "rgb(255, 255, 255)",
    "the selected pool card must keep its contrasting background",
  );
  await selectedPoolCard.getByText("Família Faysk").waitFor();
  await page.getByTestId("ranking-current-user").getByText("131 pts").waitFor();
  await page.getByTestId("ranking-player-report").getByText("Palpites finalizados").waitFor();
  assert.equal(
    await page.getByTestId("ranking-current-user").evaluate((element) =>
      Boolean(element.parentElement?.querySelector('[data-testid="ranking-player-report"]')),
    ),
    true,
    "ranking player report must open directly below the selected participant",
  );
  await page.getByTestId("ranking-current-user").click();
  await page.getByTestId("ranking-player-report").waitFor({ state: "hidden" });
  await page.getByTestId("ranking-current-user").click();
  await page.getByTestId("ranking-player-finished-picks").getByText("2 x 1").first().waitFor();
  await page.getByTestId("finished-pick-toggle").first().click();
  await page
    .getByTestId("finished-pick-details")
    .first()
    .getByText("Pontos do placar")
    .waitFor();
  const finishedPickHref = await page
    .getByTestId("finished-pick-details")
    .first()
    .getByRole("link", { name: "Abrir comparação deste jogo" })
    .getAttribute("href");
  assert.match(
    finishedPickHref ?? "",
    /^\/palpites\?jogo=[^#]+#lista-de-jogos$/,
    "finished pick details must link to the focused prediction comparison",
  );
  await page.getByTestId("pool-friends").getByRole("button", { name: "Ver ranking" }).click();
  await page.getByTestId("pools-command-center").getByText("Resenha da Firma").waitFor();
  await page.getByTestId("pool-ranking").getByText("Resenha da Firma").waitFor();
  await page.getByRole("button", { name: "Criar bolão" }).click();
  const createForm = page.getByTestId("pool-form-create");
  await createForm.getByLabel("Bandeira do bolão").selectOption("in");
  assert.equal(
    await createForm.locator('[data-country-code="in"] .fi-in').count(),
    1,
    "non-tournament country flags must render from the bundled flag set",
  );
  await createForm.getByPlaceholder("Ex.: Família Faysk").fill("Bolão Automatizado");
  await createForm.getByRole("button", { name: "Criar agora" }).click();
  const createdPool = page.locator("article").filter({ hasText: "Bolão Automatizado" });
  await createdPool.getByRole("button", { name: "Ver ranking" }).click();
  await page.getByTestId("pool-ranking").getByText("Bolão Automatizado").waitFor();
  await page.getByTestId("ranking-current-user").getByText("0 pts").waitFor();
  await selectedPoolCard.getByRole("button", { name: "Gerenciar Família Faysk" }).click();
  const managementDialog = page.getByRole("dialog", { name: "Família Faysk" });
  await managementDialog.waitFor();
  assert.ok(
    Number.parseInt(await managementDialog.evaluate((element) => getComputedStyle(element.parentElement).zIndex), 10) > 50,
    "the mobile management dialog must stay above bottom navigation",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "Família Faysk" }).waitFor({ state: "hidden" });

  await page.goto(`${BASE_URL}/admin`);
  await page.getByRole("button", { name: /^Todos ·/ }).click();
  const correctionMatch = page.getByTestId("admin-match-match-1");
  await correctionMatch.getByRole("button", { name: "Corrigir resultado" }).click();
  await correctionMatch.getByRole("spinbutton", { name: "México" }).fill("3");
  await correctionMatch.getByRole("spinbutton", { name: "África do Sul" }).fill("0");
  await correctionMatch.getByLabel("Motivo ou fonte").fill("Correção oficial");
  await correctionMatch.getByRole("button", { name: "Finalizar e pontuar" }).click();
  await correctionMatch.getByText("Resultado informado: 3 x 0").waitFor();

  await page.goto(`${BASE_URL}/palpites`);
  await page.getByRole("button", { name: "Todos" }).click();
  await page.getByTestId("match-match-1").getByText("Seu palpite rendeu 5 pontos").waitFor();

  await page.goto(`${BASE_URL}/boloes`);
  await page.getByTestId("ranking-current-user").getByText("126 pts").waitFor();

  await page.goto(`${BASE_URL}/painel`);
  await page.getByRole("heading", { name: "Painel" }).waitFor();
  await page.getByText("Ranking em movimento").waitFor();
  await page.getByText("Bolões em movimento").waitFor();
  await page.getByText("mantém").first().waitFor();
  await page.getByRole("button", { name: /Faysk/ }).first().click();
  await page.getByText(/pts atrás de|na disputa pela ponta/).first().waitFor();
  await waitForFlagFallbacks(page);

  await page.goto(BASE_URL);
  await page.getByRole("navigation").getByRole("link", { name: "Ao vivo" }).waitFor();
  await page.getByRole("navigation").getByRole("link", { name: "Bolões" }).waitFor();
  await page.getByRole("navigation", { name: "Menu principal" }).getByRole("button", { name: "Menu" }).click();
  await page.getByRole("menuitem", { name: /Jogos/ }).waitFor();
  await page.getByRole("menuitem", { name: /Especiais/ }).waitFor();
  await page.getByRole("menuitem", { name: /Jogadores/ }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("menuitem", { name: /Jogos/ }).waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Abrir menu da conta" }).click();
  await page.getByText("Faysk · demonstração").waitFor();
  await page.keyboard.press("Escape");
  await page.getByText("Faysk · demonstração").waitFor({ state: "hidden" });

  const health = await page.request.get(`${BASE_URL}/api/health`);
  assert.equal(health.status(), 200);
  const healthBody = await health.json();
  assert.equal(healthBody.database, "demo");
  assert.equal(healthBody.launchReady, false);
  assert.equal(healthBody.schedule.requiredMatches, 104);
  assert.equal(healthBody.schedule.providerMappedMatches, 0);
  assert.equal(healthBody.schedule.renderReady, false);
  assert.equal(healthBody.resultsSyncConfigured, false);
  assert.equal(healthBody.resultsSync.status, "disabled");
  const disabledSync = await page.request.get(`${BASE_URL}/api/cron/results`);
  assert.equal(disabledSync.status(), 503);
  assert.match(disabledSync.headers()["cache-control"] ?? "", /no-store/);
  assert.deepEqual(pageErrors, []);

  const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const desktopErrors = [];
  desktopPage.on("pageerror", (error) => desktopErrors.push(error.message));
  for (const path of [
    "/",
    "/ao-vivo",
    "/jogos",
    "/jogadores",
    "/painel",
    "/palpites",
    "/especiais",
    "/boloes",
    "/regras",
    "/admin",
    "/entrar",
    "/privacidade",
    "/termos",
    "/robots.txt",
    "/sitemap.xml",
    "/icon",
    "/apple-icon",
    "/opengraph-image",
    "/twitter-image",
  ]) {
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
  assert.equal(
    await desktopPage.locator('link[rel="canonical"]').getAttribute("href"),
    "https://labolita.faysk.dev",
  );
  assert.match(
    await desktopPage.locator('meta[property="og:image"]').getAttribute("content"),
    /\/opengraph-image/,
  );
  assert.match(
    await desktopPage.locator('meta[name="twitter:image"]').getAttribute("content"),
    /\/twitter-image/,
  );
  assert.match(
    await desktopPage.locator('link[rel="icon"]').first().getAttribute("href"),
    /\/icon/,
  );
  assert.equal(
    await desktopPage.locator('link[rel="manifest"]').getAttribute("href"),
    "/manifest.webmanifest",
  );
  assert.equal(homeResponse?.headers()["x-frame-options"], "DENY");
  assert.equal(homeResponse?.headers()["x-content-type-options"], "nosniff");
  assert.equal(homeResponse?.headers()["cross-origin-resource-policy"], "same-origin");
  assert.match(homeResponse?.headers()["strict-transport-security"] ?? "", /max-age=/);
  assert.match(homeResponse?.headers()["content-security-policy"] ?? "", /object-src 'none'/);
  await desktopPage.goto(`${BASE_URL}/privacidade`);
  await desktopPage.getByRole("heading", { name: "Política de Privacidade" }).waitFor();
  await desktopPage.getByRole("link", { name: "contato@faysk.dev" }).waitFor();
  await desktopPage.goto(`${BASE_URL}/termos`);
  await desktopPage.getByRole("heading", { name: "Termos de Serviço" }).waitFor();
  await desktopPage.goto(BASE_URL);
  await desktopPage.getByRole("navigation", { name: "Menu principal" }).getByRole("button", { name: /Mais/ }).click();
  await desktopPage.getByRole("menuitem", { name: /Meu painel/ }).waitFor();
  await desktopPage.getByRole("menuitem", { name: /Regras/ }).waitFor();
  await desktopPage.keyboard.press("Escape");
  await desktopPage.getByRole("menuitem", { name: /Meu painel/ }).waitFor({ state: "hidden" });
  assert.deepEqual(desktopErrors, []);

  console.log("UI flow test passed");
} catch (error) {
  console.error(serverOutput);
  throw error;
} finally {
  await browser?.close();
  server?.kill();
  await cleanupDemoBuild();
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

function buildDemo() {
  const result = spawnSync(
    process.execPath,
    ["scripts/build-demo.mjs"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        LABOLITA_BUILD_DIR: DEMO_BUILD_DIR,
      },
      stdio: "inherit",
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    throw new Error("Não foi possível gerar o build de demonstração para o teste UI.");
  }
}

async function cleanupDemoBuild() {
  if (DEMO_BUILD_DIR !== ".next-demo-ui" && !DEMO_BUILD_DIR.startsWith(".next-demo-ui-")) return;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(DEMO_BUILD_DIR, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 4) {
        console.warn(`Não foi possível remover ${DEMO_BUILD_DIR}:`, error);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
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

async function findNextBin() {
  const candidates = [
    path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next"),
    path.join(process.cwd(), "..", "node_modules", "next", "dist", "bin", "next"),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Tenta o próximo diretório de dependências.
    }
  }

  return candidates[0];
}

async function waitForFlagFallbacks(page) {
  const flags = page.getByTestId("team-flag");
  assert.ok((await flags.count()) > 0, "team flags must be rendered");
  await page.waitForFunction(() =>
    [...document.querySelectorAll('[data-testid="team-flag"] img')].every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
  const invalidSizes = await flags.evaluateAll((elements) =>
    elements.filter((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.width < 20 || bounds.height < 16;
    }).length,
  );
  assert.equal(invalidSizes, 0, "team flags must keep a readable fixed size");
}
