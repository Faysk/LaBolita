"use client";

import { useEffect, useRef, useState } from "react";
import type { DemoTeam } from "@/lib/types";

export function TeamFlag({
  team,
  size = "md",
}: {
  team: DemoTeam;
  size?: "sm" | "md" | "lg";
}) {
  const sources = flagSources(team);
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex];
  const loadedRef = useRef(false);
  const sizeClass =
    size === "sm" ? "size-6" : size === "lg" ? "size-11" : "size-8";

  useEffect(() => {
    loadedRef.current = false;
    if (!source) return;

    const fallbackTimeout = window.setTimeout(() => {
      if (!loadedRef.current) {
        setSourceIndex((current) => current + 1);
      }
    }, 1_500);

    return () => window.clearTimeout(fallbackTimeout);
  }, [source]);

  return (
    <span
      className={`inline-flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white shadow-sm`}
      title={team.name}
    >
      {source ? (
        // Small external SVG with an explicit fallback avoids image-optimizer quota.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={source}
          alt={`Bandeira de ${team.name}`}
          className="h-full w-full object-cover"
          loading="lazy"
          onLoad={() => {
            loadedRef.current = true;
          }}
          onError={() => setSourceIndex((current) => current + 1)}
        />
      ) : (
        <span className="px-1 text-center text-[10px] font-black leading-none text-brand">
          {team.flag !== "•" ? team.flag : team.code ?? "•"}
        </span>
      )}
    </span>
  );
}

function flagSources(team: DemoTeam) {
  const iso = isoCode(team);
  const twemoji = twemojiUrl(team.flag);
  return [
    iso ? `https://flagcdn.com/${iso}.svg` : null,
    twemoji,
  ].filter((source): source is string => Boolean(source));
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

function twemojiUrl(flag: string) {
  const codepoints = Array.from(flag)
    .map((character) => character.codePointAt(0)?.toString(16))
    .filter(Boolean);
  if (codepoints.length < 2) return null;
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints.join("-")}.svg`;
}
