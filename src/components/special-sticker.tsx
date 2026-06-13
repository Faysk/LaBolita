"use client";

import type { CSSProperties } from "react";
import { TeamFlag } from "@/components/team-flag";
import type { SpecialOption } from "@/lib/special-markets";
import type { DemoTeam } from "@/lib/types";

type StickerVariant = "avatar" | "thumb" | "card" | "feature";

type StickerPalette = {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
};

const TEAM_PALETTES: Record<string, StickerPalette> = {
  ARG: { primary: "#75c9f3", secondary: "#ffffff", accent: "#f5c542", text: "#06283d" },
  BRA: { primary: "#f5d547", secondary: "#178848", accent: "#2852a3", text: "#062f1b" },
  CAN: { primary: "#e21d2f", secondary: "#ffffff", accent: "#d7f6e3", text: "#2a0710" },
  ENG: { primary: "#ffffff", secondary: "#d71920", accent: "#1c4f9c", text: "#0c1f35" },
  FRA: { primary: "#1d4ea3", secondary: "#ffffff", accent: "#e23d3d", text: "#ffffff" },
  GER: { primary: "#f7f1db", secondary: "#111111", accent: "#e7b900", text: "#171717" },
  MEX: { primary: "#0f8d54", secondary: "#ffffff", accent: "#c43a38", text: "#ffffff" },
  POR: { primary: "#c41e3a", secondary: "#0b7f45", accent: "#ffd85a", text: "#ffffff" },
  QAT: { primary: "#8a1538", secondary: "#ffffff", accent: "#f2d7df", text: "#ffffff" },
  RSA: { primary: "#007a4d", secondary: "#f7c600", accent: "#e03c31", text: "#ffffff" },
  USA: { primary: "#ffffff", secondary: "#b31942", accent: "#0a3161", text: "#0a3161" },
};

const SKIN_TONES = ["#f0c6a5", "#d79a72", "#b87551", "#8d593c", "#5f3b2f", "#f4d1b7"];
const HAIR_COLORS = ["#171717", "#2b1d16", "#3c2518", "#6e4326", "#c7a071", "#101827"];
const HAIR_STYLES = ["short", "curls", "locs", "fade", "topknot", "waves"] as const;

export function SpecialOptionSticker({
  option,
  variant = "card",
  selected = false,
}: {
  option: SpecialOption;
  variant?: StickerVariant;
  selected?: boolean;
}) {
  if (!option.position) {
    return <TeamSticker option={option} variant={variant} selected={selected} />;
  }

  return <PlayerSticker option={option} variant={variant} selected={selected} />;
}

export function SpecialOptionAvatar({
  option,
  size = "lg",
}: {
  option: SpecialOption;
  size?: "sm" | "md" | "lg";
}) {
  if (!option.position) {
    return <TeamFlag team={teamFromSpecialOption(option)} size={size === "lg" ? "lg" : size} />;
  }

  const dimensions =
    size === "sm"
      ? "size-10 rounded-xl"
      : size === "md"
        ? "size-12 rounded-2xl"
        : "size-16 rounded-[1.25rem]";

  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden border bg-surface-muted shadow-lg shadow-black/10 ${dimensions}`}
      title={option.fullName ?? option.label}
    >
      <MiniPlayerPortrait option={option} />
      <span className="absolute -bottom-0.5 -right-0.5 rounded-lg border bg-white shadow-sm">
        <TeamFlag team={teamFromSpecialOption(option)} size="sm" />
      </span>
    </span>
  );
}

export function teamFromSpecialOption(option: SpecialOption): DemoTeam {
  return {
    id: option.teamId,
    code: option.teamCode,
    name: option.teamName,
    shortName: option.teamName,
    flag: option.teamFlag ?? "🏳️",
  };
}

function PlayerSticker({
  option,
  variant,
  selected,
}: {
  option: SpecialOption;
  variant: StickerVariant;
  selected: boolean;
}) {
  const palette = teamPalette(option.teamCode);
  const compact = variant === "avatar" || variant === "thumb";
  const sizeClass = {
    avatar: "h-16 w-12 rounded-[0.9rem]",
    thumb: "h-24 w-[4.75rem] rounded-[1.05rem]",
    card: "h-40 w-28 rounded-[1.2rem]",
    feature: "h-72 w-52 rounded-[1.8rem]",
  }[variant];
  const style = {
    "--sticker-primary": palette.primary,
    "--sticker-secondary": palette.secondary,
    "--sticker-accent": palette.accent,
    "--sticker-text": palette.text,
  } as CSSProperties;

  return (
    <span
      className={`relative inline-flex shrink-0 flex-col overflow-hidden border border-white/25 bg-[linear-gradient(145deg,var(--sticker-primary),var(--sticker-secondary))] shadow-xl shadow-black/15 ${sizeClass} ${
        selected ? "ring-2 ring-accent" : ""
      }`}
      style={style}
      title={option.fullName ?? option.label}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_25%_18%,rgba(255,255,255,0.42),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.18),transparent_45%)]" />
      <span className="absolute -right-4 top-0 select-none text-[5.4rem] font-black leading-none tracking-[-0.18em] text-white/22">
        26
      </span>
      {!compact && (
        <span className="absolute left-2 top-2 rounded-full bg-black/25 px-2 py-0.5 text-[9px] font-black text-white/90">
          #{option.number ?? "?"}
        </span>
      )}
      <span className="absolute right-2 top-2 rounded-full border border-white/35 bg-white/75 px-1.5 py-0.5 text-[8px] font-black text-brand-strong">
        {option.position}
      </span>
      <span className="relative mt-auto flex flex-1 items-end justify-center px-1 pt-5">
        <PlayerPortrait option={option} compact={compact} />
      </span>
      <span className="relative grid gap-1 border-t border-white/25 bg-black/30 px-2 py-2 text-white">
        <span className={`font-black leading-none ${variant === "feature" ? "text-base" : "text-[10px]"}`}>
          {option.label}
        </span>
        {!compact && (
          <span className="line-clamp-1 text-[9px] font-bold text-white/75">
            {option.club ?? option.teamName}
          </span>
        )}
      </span>
      <span className="absolute bottom-2 right-2 rounded-lg border bg-white shadow-sm">
        <TeamFlag team={teamFromSpecialOption(option)} size={variant === "feature" ? "md" : "sm"} />
      </span>
    </span>
  );
}

function TeamSticker({
  option,
  variant,
  selected,
}: {
  option: SpecialOption;
  variant: StickerVariant;
  selected: boolean;
}) {
  const palette = teamPalette(option.teamCode);
  const compact = variant === "avatar" || variant === "thumb";
  const sizeClass = {
    avatar: "h-14 w-12 rounded-[0.9rem]",
    thumb: "h-24 w-[4.75rem] rounded-[1.05rem]",
    card: "h-40 w-28 rounded-[1.2rem]",
    feature: "h-64 w-52 rounded-[1.8rem]",
  }[variant];
  const style = {
    "--sticker-primary": palette.primary,
    "--sticker-secondary": palette.secondary,
    "--sticker-accent": palette.accent,
    "--sticker-text": palette.text,
  } as CSSProperties;

  return (
    <span
      className={`relative inline-flex shrink-0 flex-col overflow-hidden border border-white/25 bg-[linear-gradient(145deg,var(--sticker-primary),var(--sticker-secondary))] shadow-xl shadow-black/15 ${sizeClass} ${
        selected ? "ring-2 ring-accent" : ""
      }`}
      style={style}
      title={option.teamName}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_22%_16%,rgba(255,255,255,0.42),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent_45%)]" />
      <span className="absolute -right-3 top-0 select-none text-[5rem] font-black leading-none tracking-[-0.2em] text-white/22">
        26
      </span>
      <span className="relative flex flex-1 items-center justify-center px-3">
        <span className="rounded-[1.2rem] border border-white/45 bg-white/90 p-2 shadow-lg">
          <TeamFlag team={teamFromSpecialOption(option)} size={variant === "feature" ? "lg" : "md"} />
        </span>
      </span>
      <span className="relative grid gap-1 border-t border-white/25 bg-black/30 px-2 py-2 text-white">
        <span className={`font-black leading-none ${variant === "feature" ? "text-base" : "text-[10px]"}`}>
          {option.teamName}
        </span>
        {!compact && (
          <span className="line-clamp-1 text-[9px] font-bold text-white/75">
            {teamStatsLine(option)}
          </span>
        )}
      </span>
    </span>
  );
}

function PlayerPortrait({ option, compact }: { option: SpecialOption; compact: boolean }) {
  const seed = hashSeed(option.key);
  const skin = SKIN_TONES[seed % SKIN_TONES.length];
  const hair = HAIR_COLORS[Math.floor(seed / 5) % HAIR_COLORS.length];
  const hairStyle = HAIR_STYLES[Math.floor(seed / 11) % HAIR_STYLES.length];
  const palette = teamPalette(option.teamCode);
  const scale = compact ? 0.82 : 1;

  return (
    <svg
      viewBox="0 0 120 132"
      aria-hidden="true"
      className="h-full w-full drop-shadow-lg"
      style={{ transform: `scale(${scale}) translateY(${compact ? 8 : 4}px)` }}
    >
      <path
        d="M20 132c4-35 21-52 40-52s36 17 40 52H20Z"
        fill={palette.primary}
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="3"
      />
      <path d="M42 83h36v19c0 10-36 10-36 0V83Z" fill={skin} />
      <circle cx="60" cy="55" r="29" fill={skin} />
      {hairShape(hairStyle, hair)}
      <path
        d="M23 132c2-19 9-33 19-42 11 12 25 12 36 0 10 9 17 23 19 42H23Z"
        fill={palette.secondary}
        opacity="0.48"
      />
      <path d="M48 101h24" stroke={palette.accent} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function MiniPlayerPortrait({ option }: { option: SpecialOption }) {
  const palette = teamPalette(option.teamCode);

  return (
    <span
      className="flex h-full w-full items-end justify-center"
      style={{
        background: `linear-gradient(145deg, ${palette.primary}, ${palette.secondary})`,
      }}
    >
      <PlayerPortrait option={option} compact />
    </span>
  );
}

function hairShape(style: (typeof HAIR_STYLES)[number], color: string) {
  if (style === "curls") {
    return (
      <g fill={color}>
        {Array.from({ length: 8 }, (_, index) => (
          <circle key={index} cx={32 + index * 8} cy={32 + (index % 2) * 3} r="8" />
        ))}
        <path d="M31 38c8-17 50-20 58 1-8-5-46-7-58-1Z" />
      </g>
    );
  }
  if (style === "locs") {
    return (
      <g fill={color}>
        <path d="M33 30c10-16 43-18 56 4-20-5-39-5-56-4Z" />
        {Array.from({ length: 7 }, (_, index) => (
          <rect key={index} x={31 + index * 8} y={30} width="5" height={30 + (index % 3) * 6} rx="3" />
        ))}
      </g>
    );
  }
  if (style === "topknot") {
    return (
      <g fill={color}>
        <circle cx="60" cy="23" r="11" />
        <path d="M31 34c8-18 48-21 58 2-15-5-43-5-58-2Z" />
      </g>
    );
  }
  if (style === "fade") {
    return <path d="M31 39c5-24 52-29 59 0-18-10-42-9-59 0Z" fill={color} />;
  }
  if (style === "waves") {
    return (
      <g fill="none" stroke={color} strokeLinecap="round" strokeWidth="7">
        <path d="M32 35c9-9 17-9 26 0s17 9 29 0" />
        <path d="M35 28c8-7 16-7 25 0s15 7 24 0" />
      </g>
    );
  }
  return <path d="M31 38c6-24 53-28 58 2-17-8-40-9-58-2Z" fill={color} />;
}

function teamPalette(code?: string): StickerPalette {
  const normalized = code?.toUpperCase();
  if (normalized && TEAM_PALETTES[normalized]) return TEAM_PALETTES[normalized];

  const seed = hashSeed(normalized ?? "TEAM");
  const hue = seed % 360;
  return {
    primary: `hsl(${hue} 58% 44%)`,
    secondary: `hsl(${(hue + 42) % 360} 62% 31%)`,
    accent: `hsl(${(hue + 86) % 360} 88% 68%)`,
    text: "#ffffff",
  };
}

function teamStatsLine(option: SpecialOption) {
  if (!option.teamStats || option.teamStats.played === 0) return "Campanha a construir";
  return `${option.teamStats.goalsFor} GP · ${option.teamStats.goalsAgainst} GC`;
}

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}
