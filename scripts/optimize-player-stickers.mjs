import { readdir, mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import squadData from "../src/data/world-cup-2026-squads.json" with { type: "json" };

const PROJECT_ROOT = process.cwd();
const SOURCE_DIR = path.join(PROJECT_ROOT, "output", "imagegen", "figurinha-anime");
const DEST_DIR = path.join(PROJECT_ROOT, "public", "stickers", "players");
const MANIFEST_PATH = path.join(PROJECT_ROOT, "src", "lib", "player-sticker-assets.ts");
const TARGET_WIDTH = 512;
const WEBP_QUALITY = 80;

const MANUAL_ALIASES = new Map([
  ["aymen", { teamCode: "IRQ", number: 18 }],
  ["e-valencia", { teamCode: "ECU", number: 13 }],
  ["james", { teamCode: "COL", number: 10 }],
  ["j-david", { teamCode: "CAN", number: 10 }],
  ["larin", { teamCode: "CAN", number: 9 }],
  ["l-martinez", { teamCode: "ARG", number: 22 }],
  ["m-salah", { teamCode: "EGY", number: 10 }],
  ["mane", { teamCode: "SEN", number: 10 }],
  ["modric", { teamCode: "CRO", number: 10 }],
  ["pulisic", { teamCode: "USA", number: 10 }],
  ["raul", { teamCode: "MEX", number: 9 }],
  ["ryan", { teamCode: "CPV", number: 20 }],
  ["sarr", { teamCode: "SEN", number: 18 }],
  ["sorloth", { teamCode: "NOR", number: 7 }],
  ["thomas", { teamCode: "GHA", number: 5 }],
  ["wood", { teamCode: "NZL", number: 9 }],
]);

const players = squadData.teams.flatMap((team) =>
  team.players.map((player) => ({
    ...player,
    team,
    optionKey: playerOptionKey(team.code, player.number, player.fullName),
    nameSlug: slugify(player.name),
    fullNameSlug: slugify(player.fullName),
  })),
);

await mkdir(DEST_DIR, { recursive: true });
await cleanGeneratedWebp(DEST_DIR);

const files = (await readdir(SOURCE_DIR))
  .filter((file) => file.toLowerCase().endsWith(".png"))
  .sort((left, right) => left.localeCompare(right, "pt-BR"));

const assets = [];
const skipped = [];
let rawBytes = 0;
let optimizedBytes = 0;

for (const file of files) {
  const sourcePath = path.join(SOURCE_DIR, file);
  const raw = await stat(sourcePath);
  rawBytes += raw.size;

  const baseSlug = sourceSlugFromFile(file);
  const player = findPlayerForSlug(baseSlug);
  if (!player) {
    skipped.push(`${file} (sem jogador correspondente no elenco atual)`);
    continue;
  }

  const outputFile = `${player.team.code.toLowerCase()}-${String(player.number).padStart(
    2,
    "0",
  )}-${slugify(player.name)}.webp`;
  const outputPath = path.join(DEST_DIR, outputFile);

  await sharp(sourcePath)
    .rotate()
    .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true })
    .toFile(outputPath);

  const optimized = await stat(outputPath);
  const metadata = await sharp(outputPath).metadata();
  optimizedBytes += optimized.size;
  assets.push({
    key: player.optionKey,
    src: `/stickers/players/${outputFile}`,
    width: metadata.width ?? TARGET_WIDTH,
    height: metadata.height ?? Math.round(TARGET_WIDTH * 1.5),
  });
}

await writeManifest(assets);

console.log(
  `Optimized ${assets.length} sticker(s): ${formatBytes(rawBytes)} -> ${formatBytes(
    optimizedBytes,
  )}.`,
);
if (skipped.length > 0) {
  console.warn(`Skipped ${skipped.length} source image(s):`);
  for (const message of skipped) console.warn(`- ${message}`);
}

function sourceSlugFromFile(file) {
  return path
    .basename(file, path.extname(file))
    .replace(/-anime-card-v\d+$/i, "")
    .replace(/-figurinha-dados$/i, "");
}

function findPlayerForSlug(sourceSlug) {
  const manual = MANUAL_ALIASES.get(sourceSlug);
  if (manual) {
    return (
      players.find(
        (player) =>
          player.team.code === manual.teamCode && player.number === manual.number,
      ) ?? null
    );
  }

  const exact = players.filter(
    (player) => player.nameSlug === sourceSlug || player.fullNameSlug === sourceSlug,
  );
  if (exact.length === 1) return exact[0];

  const sourceTokens = sourceSlug.split("-").filter(Boolean);
  const tokenMatches = players.filter((player) => {
    const nameTokens = new Set(
      `${player.nameSlug}-${player.fullNameSlug}`.split("-").filter(Boolean),
    );
    return sourceTokens.every((token) => nameTokens.has(token));
  });

  if (tokenMatches.length === 1) return tokenMatches[0];
  return null;
}

async function cleanGeneratedWebp(directory) {
  const existing = await readdir(directory).catch(() => []);
  await Promise.all(
    existing
      .filter((file) => file.toLowerCase().endsWith(".webp"))
      .map((file) => rm(path.join(directory, file), { force: true })),
  );
}

async function writeManifest(rows) {
  const orderedRows = [...rows].sort((left, right) =>
    left.key.localeCompare(right.key, "pt-BR"),
  );
  const entries = orderedRows
    .map(
      (asset) =>
        `  ${JSON.stringify(asset.key)}: { src: ${JSON.stringify(
          asset.src,
        )}, width: ${asset.width}, height: ${asset.height} },`,
    )
    .join("\n");

  const content = `// Generated by scripts/optimize-player-stickers.mjs. Do not edit manually.

export type PlayerStickerAsset = {
  src: string;
  width: number;
  height: number;
};

export const PLAYER_STICKER_ASSETS: Record<string, PlayerStickerAsset> = {
${entries}
};

export function playerStickerAsset(optionKey: string) {
  return PLAYER_STICKER_ASSETS[optionKey] ?? null;
}
`;

  await writeFile(MANIFEST_PATH, content, "utf8");
}

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

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
