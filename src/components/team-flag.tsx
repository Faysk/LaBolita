"use client";

import { useState } from "react";
import type { DemoTeam } from "@/lib/types";

export function TeamFlag({
  team,
  size = "md",
}: {
  team: DemoTeam;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
}) {
  const source = flagSource(team);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const imageAvailable = Boolean(source && source !== failedSource);
  const sizeClass =
    size === "xs"
      ? "h-3.5 w-5 rounded-[0.3rem]"
      : size === "sm"
      ? "h-5 w-7 rounded-md"
      : size === "lg"
        ? "h-10 w-14 rounded-xl"
        : size === "xl"
          ? "h-16 w-24 rounded-2xl"
          : size === "hero"
            ? "h-full w-full rounded-[1.35rem]"
        : "h-7 w-10 rounded-lg";
  const fallbackClass =
    size === "xs"
      ? "text-[6px]"
      : size === "sm"
        ? "text-[8px]"
        : size === "lg"
          ? "text-xs"
          : size === "xl"
            ? "text-base"
            : size === "hero"
              ? "text-4xl"
          : "text-[10px]";
  const chromeClass =
    size === "hero" ? "border-0 bg-transparent shadow-none" : "border bg-white shadow-sm";

  return (
    <span
      data-testid="team-flag"
      data-team={team.code ?? team.id}
      className={`team-flag inline-flex ${sizeClass} ${chromeClass} shrink-0 items-center justify-center overflow-hidden`}
      title={team.name}
      role="img"
      aria-label={`Bandeira de ${team.name}`}
    >
      {source && imageAvailable ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={source}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailedSource(source)}
        />
      ) : (
        <span
          className={`px-1 text-center font-black leading-none tracking-tight text-brand ${fallbackClass}`}
        >
          {team.code ?? isoCode(team)?.toUpperCase() ?? "TBD"}
        </span>
      )}
    </span>
  );
}

function flagSource(team: DemoTeam) {
  const iso = isoCode(team);
  return iso ? `/flags/${iso}.svg` : null;
}

function isoCode(team: DemoTeam) {
  if (team.code === "ENG") return "gb-eng";
  if (team.code === "SCO") return "gb-sct";

  const regional = Array.from(team.flag).map((character) => character.codePointAt(0));
  if (
    regional.length !== 2 ||
    regional.some((codepoint) => !codepoint || codepoint < 0x1f1e6 || codepoint > 0x1f1ff)
  ) {
    return null;
  }
  return regional
    .map((codepoint) => String.fromCharCode((codepoint ?? 0) - 0x1f1e6 + 97))
    .join("");
}
