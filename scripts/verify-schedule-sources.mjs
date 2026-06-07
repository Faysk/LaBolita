import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const schedule = JSON.parse(await readFile("data/world-cup-2026.json", "utf8"));
const response = await fetch("https://wc.dcs.pm/", {
  signal: AbortSignal.timeout(15_000),
});
assert.equal(response.status, 200, "secondary schedule source must be available");
const html = await response.text();

const expectedTimes = schedule.matches.map((match) => normalizeIso(match.scheduledAt));
const sourceTimes = [
  ...html.matchAll(/<a class="match-row"[\s\S]*?<time datetime="([^"]+)"/g),
].map((match) => normalizeIso(match[1]));

const expectedCounts = countValues(expectedTimes);
const sourceCounts = countValues(sourceTimes);
const differences = [];
for (const [time, expected] of expectedCounts) {
  const actual = sourceCounts.get(time) ?? 0;
  if (actual !== expected) {
    differences.push(`arquivo ${time}: ${expected}; fonte secundária: ${actual}`);
  }
}
for (const [time, actual] of sourceCounts) {
  const expected = expectedCounts.get(time) ?? 0;
  if (!expected) {
    differences.push(`fonte secundária ${time}: ${actual}; arquivo: 0`);
  }
}

assert.equal(expectedTimes.length, 104);
assert.equal(sourceTimes.length, 104, "secondary source should list 104 matches");
assert.deepEqual(differences, [], `Diferenças de horário:\n${differences.join("\n")}`);
console.log("Independent schedule source verification passed");

function normalizeIso(value) {
  return new Date(value).toISOString();
}

function countValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}
