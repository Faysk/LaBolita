import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type ScheduleTeam = {
  code: string;
  flag: string;
};

describe("local team flags", () => {
  it("includes a local SVG for every tournament team", () => {
    const schedule = JSON.parse(
      readFileSync("data/world-cup-2026.json", "utf8"),
    ) as { teams: ScheduleTeam[] };
    const missing = schedule.teams
      .map((team) => flagPath(team))
      .filter((path) => !existsSync(path));

    expect(schedule.teams).toHaveLength(48);
    expect(missing).toEqual([]);
  });
});

function flagPath(team: ScheduleTeam) {
  if (team.code === "ENG") return "public/flags/gb-eng.svg";
  if (team.code === "SCO") return "public/flags/gb-sct.svg";

  const points = Array.from(team.flag).map((character) =>
    character.codePointAt(0),
  );
  const iso = points
    .map((point) => String.fromCharCode((point ?? 0) - 0x1f1e6 + 97))
    .join("");
  return `public/flags/${iso}.svg`;
}
