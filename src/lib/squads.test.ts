import { describe, expect, it } from "vitest";
import {
  allPlayers,
  allSquads,
  getSquadByCode,
  playerAge,
  positionLabel,
  squadSummary,
} from "@/lib/squads";

describe("world cup squads", () => {
  it("contains the official 48 squads with 26 players each", () => {
    const squads = allSquads();

    expect(squads).toHaveLength(48);
    expect(allPlayers()).toHaveLength(1248);
    expect(squads.every((team) => team.players.length === 26)).toBe(true);
  });

  it("maps app team codes to squad data", () => {
    const brazil = getSquadByCode("BRA");
    const mexico = getSquadByCode("mex");

    expect(brazil?.players).toHaveLength(26);
    expect(mexico?.players).toHaveLength(26);
    expect(squadSummary(brazil!).topScorer.goals).toBeGreaterThan(0);
  });

  it("labels positions and calculates tournament-start age", () => {
    const player = getSquadByCode("BRA")!.players.find((item) => item.name === "NEYMAR JR")!;

    expect(positionLabel("FW")).toBe("Atacante");
    expect(playerAge(player)).toBe(34);
  });
});
