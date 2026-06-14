import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import squadData from "../src/data/world-cup-2026-squads.json" with { type: "json" };

const PROJECT_ROOT = process.cwd();
const MANIFEST_PATH = path.join(PROJECT_ROOT, "src", "lib", "player-sticker-assets.ts");
const ALBUM_PATH = path.join(PROJECT_ROOT, "docs", "STICKER_ALBUM.md");

const POSITION_LABELS = {
  GK: "Goleiro",
  DF: "Defensor",
  MF: "Meio-campista",
  FW: "Atacante",
};

const playersByKey = new Map();

for (const team of squadData.teams) {
  for (const player of team.players) {
    const key = playerOptionKey(team.code, player.number, player.fullName);
    playersByKey.set(key, { ...player, team });
  }
}

const manifest = await readFile(MANIFEST_PATH, "utf8");
const assetPattern = /"([^"]+)":\s+\{\s+src:\s+"([^"]+)",\s+width:\s+(\d+),\s+height:\s+(\d+)\s+\}/g;
const entries = [];

for (const match of manifest.matchAll(assetPattern)) {
  const [, optionKey, src, width, height] = match;
  const player = playersByKey.get(optionKey);

  if (!player) continue;

  const filePath = path.join(PROJECT_ROOT, "public", src.replace(/^\//, ""));
  const fileStat = await stat(filePath);

  entries.push({
    optionKey,
    src,
    width: Number(width),
    height: Number(height),
    bytes: fileStat.size,
    player,
  });
}

if (entries.length === 0) {
  throw new Error("No sticker assets found in player sticker manifest.");
}

entries.sort((left, right) => {
  const teamCompare = left.player.team.name.localeCompare(right.player.team.name, "pt-BR");
  if (teamCompare !== 0) return teamCompare;
  return left.player.number - right.player.number || left.player.name.localeCompare(right.player.name, "pt-BR");
});

const teams = new Map();
for (const entry of entries) {
  const teamCode = entry.player.team.code;
  if (!teams.has(teamCode)) teams.set(teamCode, []);
  teams.get(teamCode).push(entry);
}

const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);

const lines = [
  "# Album de Figurinhas LaBolita",
  "",
  "Catalogo das artes otimizadas usadas nos palpites especiais. As artes brutas ficam fora do repositorio para manter o projeto leve; o app consome as versoes WebP abaixo.",
  "",
  "Para atualizar este album, adicione as artes em `output/imagegen/figurinha-anime/`, rode `npm run stickers:optimize` e depois `npm run stickers:album`.",
  "",
  "## Resumo",
  "",
  `- Figurinhas publicadas: ${entries.length}`,
  `- Selecoes com artes: ${teams.size}`,
  `- Tamanho total otimizado: ${formatBytes(totalBytes)}`,
  "- Formato publicado: WebP otimizado para web",
  "",
];

for (const [teamCode, teamEntries] of teams) {
  const teamName = teamEntries[0]?.player.team.name ?? teamCode;
  lines.push(`## ${teamName} (${teamCode})`, "");
  lines.push("| Figurinha | Jogador | Posicao | Camisa | Clube |");
  lines.push("|---|---|---|---:|---|");

  for (const entry of teamEntries) {
    const player = entry.player;
    const imagePath = `../public${entry.src}`;
    lines.push(
      [
        `<img src="${imagePath}" width="120" alt="Figurinha ${escapeHtml(player.name)}">`,
        markdownCell(player.fullName),
        POSITION_LABELS[player.position] ?? player.position,
        String(player.number),
        markdownCell(player.club),
      ].join(" | "),
    );
  }

  lines.push("");
}

await writeFile(ALBUM_PATH, `${lines.join("\n")}\n`, "utf8");

console.log(`Sticker album generated: ${path.relative(PROJECT_ROOT, ALBUM_PATH)} (${entries.length} stickers)`);

function playerOptionKey(teamCode, number, fullName) {
  return `player:${teamCode.toUpperCase()}:${number}:${slugify(fullName)}`;
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

function markdownCell(value) {
  return String(value).replace(/\|/g, "\\|");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
