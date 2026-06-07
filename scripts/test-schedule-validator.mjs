import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const examplePath = "data/schedule.example.json";
const completePath = "data/world-cup-2026.json";
const example = JSON.parse(await readFile(examplePath, "utf8"));
const temporaryDirectory = await mkdtemp(join(tmpdir(), "labolita-schedule-"));

try {
  assert.equal(runValidator(examplePath).status, 0);
  assert.equal(runValidator(completePath, "--require-complete").status, 0);

  const incomplete = runValidator(examplePath, "--require-complete");
  assert.notEqual(incomplete.status, 0);
  assert.match(incomplete.stderr, /Agenda incompleta/);

  const duplicatedPath = await writeFixture("duplicated.json", {
    ...example,
    matches: [...example.matches, { ...example.matches[0] }],
  });
  const duplicated = runValidator(duplicatedPath);
  assert.notEqual(duplicated.status, 0);
  assert.match(duplicated.stderr, /número de partida duplicado/);

  const invalidLockPath = await writeFixture("invalid-lock.json", {
    ...example,
    matches: [
      {
        ...example.matches[0],
        lockAt: "2026-06-11T20:00:00Z",
      },
    ],
  });
  const invalidLock = runValidator(invalidLockPath);
  assert.notEqual(invalidLock.status, 0);
  assert.match(invalidLock.stderr, /bloqueio da partida 1 ocorre após o início/);

  const invalidGroupPath = await writeFixture("invalid-group.json", {
    ...example,
    teams: example.teams.map((team) =>
      team.code === "RSA" ? { ...team, group: "B" } : team,
    ),
  });
  const invalidGroup = runValidator(invalidGroupPath);
  assert.notEqual(invalidGroup.status, 0);
  assert.match(invalidGroup.stderr, /seleção fora do Grupo A/);

  const invalidKnockoutPath = await writeFixture("invalid-knockout.json", {
    ...example,
    matches: [
      ...example.matches,
      {
        number: 73,
        stage: "round_of_32",
        scheduledAt: "2026-06-28T19:00:00Z",
        venue: "Los Angeles Stadium",
      },
    ],
  });
  const invalidKnockout = runValidator(invalidKnockoutPath);
  assert.notEqual(invalidKnockout.status, 0);
  assert.match(invalidKnockout.stderr, /precisa de seleções ou rótulos/);

  console.log("Schedule validator test passed");
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

function runValidator(path, extraArgument) {
  const args = ["scripts/import-schedule.mjs", "--validate-only"];
  if (extraArgument) args.push(extraArgument);
  args.push(path);
  return spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
  });
}

async function writeFixture(name, value) {
  const path = join(temporaryDirectory, name);
  await writeFile(path, JSON.stringify(value), "utf8");
  return path;
}
