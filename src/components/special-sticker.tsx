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
const JERSEY_PATTERNS = ["classic", "stripe", "sash", "keeper", "shoulder"] as const;

type HairStyle = (typeof HAIR_STYLES)[number];
type JerseyPattern = (typeof JERSEY_PATTERNS)[number];

type VisualProfile = {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  jerseyPattern: JerseyPattern;
};

const PLAYER_STYLE_OVERRIDES: Record<string, Partial<VisualProfile>> = {
  "ARG:10": { hairStyle: "short", skin: "#d79a72", hair: "#2b1d16" },
  "BRA:10": { hairStyle: "fade", skin: "#b87551", hair: "#2b1d16" },
  "ENG:9": { hairStyle: "short", skin: "#f0c6a5", hair: "#5b3a22" },
  "FRA:10": { hairStyle: "fade", skin: "#8d593c", hair: "#111111" },
  "POR:7": { hairStyle: "short", skin: "#d79a72", hair: "#2b1d16" },
};

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
  const flagSize = size === "lg" ? "sm" : "xs";

  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden border bg-surface-muted shadow-lg shadow-black/10 ${dimensions}`}
      title={option.fullName ?? option.label}
    >
      <MiniPlayerPortrait option={option} />
      <span className="absolute bottom-1 right-1 rounded-md bg-white shadow-sm">
        <TeamFlag team={teamFromSpecialOption(option)} size={flagSize} />
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
  const sizeClass = {
    avatar: "w-12 rounded-[0.9rem]",
    thumb: "w-24 rounded-[1.15rem]",
    card: "w-32 rounded-[1.25rem]",
    feature: "w-56 rounded-[1.8rem]",
  }[variant];
  const yearClass =
    variant === "feature"
      ? "text-6xl"
      : variant === "card"
        ? "text-4xl"
        : variant === "thumb"
          ? "text-3xl"
          : "text-xl";
  const flagSize =
    variant === "feature" ? "md" : variant === "card" ? "sm" : "xs";
  const style = {
    "--sticker-primary": palette.primary,
    "--sticker-secondary": palette.secondary,
    "--sticker-accent": palette.accent,
    "--sticker-text": palette.text,
  } as CSSProperties;

  return (
    <span
      className={`relative inline-flex aspect-[3/4] shrink-0 overflow-hidden border border-white/25 bg-[linear-gradient(145deg,var(--sticker-primary),var(--sticker-secondary))] shadow-xl shadow-black/15 ${sizeClass} ${
        selected ? "ring-2 ring-accent" : ""
      }`}
      style={style}
      title={option.fullName ?? option.label}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_25%_18%,rgba(255,255,255,0.48),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.18),transparent_45%)]" />
      <span className={`pointer-events-none absolute left-[8%] top-[7%] font-black leading-none tracking-[-0.1em] text-white/24 ${yearClass}`}>
        26
      </span>
      <span className="relative z-10 flex h-full w-full items-end justify-center px-[8%] pb-[8%] pt-[15%]">
        <PlayerPortrait option={option} compact={false} />
      </span>
      <span className="absolute bottom-[5%] right-[5%] z-20 rounded-md bg-white shadow-sm">
        <TeamFlag team={teamFromSpecialOption(option)} size={flagSize} />
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
    thumb: "h-28 w-24 rounded-[1.15rem]",
    card: "h-44 w-32 rounded-[1.25rem]",
    feature: "h-72 w-56 rounded-[1.8rem]",
  }[variant];
  const footerTextSize = variant === "feature" ? "text-base" : "text-xs";
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
      <span className="absolute left-2 top-2 rounded-full border border-white/25 bg-black/24 px-2 py-0.5 text-[10px] font-black leading-none text-white/90">
        26
      </span>
      <span className="relative flex flex-1 items-center justify-center px-3">
        <span className="rounded-[1.2rem] border border-white/45 bg-white/90 p-2 shadow-lg">
          <TeamFlag team={teamFromSpecialOption(option)} size={variant === "feature" ? "lg" : "md"} />
        </span>
      </span>
      {compact ? (
        <span className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-center rounded-xl border border-white/20 bg-black/35 px-1.5 py-1 text-white shadow-sm backdrop-blur">
          <span className="text-[10px] font-black leading-none">{option.teamCode}</span>
        </span>
      ) : (
        <span className="relative grid min-h-16 gap-1 border-t border-white/25 bg-black/32 px-2.5 py-2.5 text-white">
          <span className={`line-clamp-1 font-black leading-none ${footerTextSize}`}>
            {option.teamName}
          </span>
          <span className="line-clamp-1 text-[9px] font-bold text-white/75">
            {teamStatsLine(option)}
          </span>
        </span>
      )}
    </span>
  );
}

function PlayerPortrait({ option, compact }: { option: SpecialOption; compact: boolean }) {
  const profile = visualProfile(option);
  const palette = teamPalette(option.teamCode);
  const scale = compact ? 1.18 : 1.06;
  const trimColor = palette.accent;

  if (isNeymarOption(option)) {
    return <NeymarPortrait compact={compact} />;
  }

  return (
    <svg
      viewBox="0 0 160 190"
      aria-hidden="true"
      className="h-full w-full drop-shadow-xl"
      style={{ transform: `scale(${scale}) translateY(${compact ? -8 : -4}px)` }}
    >
      <ellipse cx="80" cy="183" rx="44" ry="8" fill="rgba(0,0,0,0.18)" />
      <path
        d="M31 184c4-45 24-70 49-70s45 25 49 70H31Z"
        fill={palette.primary}
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="4"
      />
      {jerseyPattern(profile.jerseyPattern, palette, trimColor)}
      <path d="M56 111h48v25c0 13-48 13-48 0v-25Z" fill={profile.skin} />
      <path
        d="M45 73c0-34 18-55 35-55s35 21 35 55c0 29-16 48-35 48S45 102 45 73Z"
        fill={profile.skin}
        stroke="rgba(25,20,18,0.24)"
        strokeWidth="3"
      />
      <ellipse cx="44" cy="78" rx="6" ry="12" fill={profile.skin} />
      <ellipse cx="116" cy="78" rx="6" ry="12" fill={profile.skin} />
      {hairShape(profile.hairStyle, profile.hair)}
      <g stroke="rgba(28,20,18,0.72)" strokeLinecap="round">
        <path d="M62 73h10" strokeWidth="4" />
        <path d="M88 73h10" strokeWidth="4" />
        <path d="M80 78v14" strokeWidth="2.5" opacity="0.45" />
        <path d="M69 100c7 5 15 5 22 0" strokeWidth="3" opacity="0.5" />
      </g>
      <path
        d="M56 123c12 11 36 11 48 0"
        fill="none"
        stroke={trimColor}
        strokeLinecap="round"
        strokeWidth="5"
      />
      <path
        d="M38 184c3-26 12-47 29-56"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M122 184c-3-26-12-47-29-56"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeLinecap="round"
        strokeWidth="4"
      />
      {option.position === "GK" && (
        <g>
          <circle cx="44" cy="161" r="9" fill={trimColor} stroke="white" strokeWidth="3" />
          <circle cx="116" cy="161" r="9" fill={trimColor} stroke="white" strokeWidth="3" />
        </g>
      )}
    </svg>
  );
}

function NeymarPortrait({ compact }: { compact: boolean }) {
  const scale = compact ? 1.08 : 1;

  return (
    <svg
      viewBox="0 0 160 190"
      aria-hidden="true"
      className="h-full w-full drop-shadow-xl"
      style={{ transform: `scale(${scale}) translateY(${compact ? -2 : 0}px)` }}
    >
      <ellipse cx="80" cy="184" rx="48" ry="8" fill="rgba(0,0,0,0.18)" />
      <g fill="none" stroke="#b36f47" strokeLinecap="round" strokeLinejoin="round">
        <path d="M56 108C39 93 27 71 21 45" strokeWidth="13" />
        <path d="M104 108c17-15 29-37 35-63" strokeWidth="13" />
        <path d="M30 42c-8-9-8-24-3-34" strokeWidth="6" />
        <path d="M24 40c-6-9-6-22-2-31" strokeWidth="5" />
        <path d="M36 42c-4-10-3-23 3-32" strokeWidth="5" />
        <path d="M130 42c8-9 8-24 3-34" strokeWidth="6" />
        <path d="M136 40c6-9 6-22 2-31" strokeWidth="5" />
        <path d="M124 42c4-10 3-23-3-32" strokeWidth="5" />
      </g>
      <path
        d="M43 184c4-47 17-78 37-78s33 31 37 78H43Z"
        fill="#f2d844"
        stroke="rgba(255,255,255,0.58)"
        strokeWidth="4"
      />
      <path d="M50 184h60l6 6H44l6-6Z" fill="#2852a3" />
      <path d="M55 121c11 8 39 8 50 0" fill="none" stroke="#0f8d54" strokeWidth="6" />
      <path d="M57 184c2-29 9-48 23-59 14 11 21 30 23 59" fill="none" stroke="#0f8d54" strokeWidth="3" opacity="0.55" />
      <text
        x="80"
        y="156"
        textAnchor="middle"
        fontSize="25"
        fontWeight="900"
        fill="#1d7d5a"
        opacity="0.55"
      >
        10
      </text>
      <path d="M58 105h44v22c0 12-44 12-44 0v-22Z" fill="#c77b50" />
      <path
        d="M46 66c0-30 17-49 34-49s34 19 34 49c0 29-15 49-34 49S46 95 46 66Z"
        fill="#c77b50"
        stroke="rgba(25,20,18,0.24)"
        strokeWidth="3"
      />
      <ellipse cx="45" cy="73" rx="6" ry="11" fill="#c77b50" />
      <ellipse cx="115" cy="73" rx="6" ry="11" fill="#c77b50" />
      <path d="M47 50c6-29 61-33 68-1-23-12-48-12-68 1Z" fill="#241714" />
      <path d="M63 104c11 12 24 12 34 0" fill="none" stroke="#241714" strokeLinecap="round" strokeWidth="5" opacity="0.62" />
      <path d="M60 83c3 17 10 26 20 26s17-9 20-26" fill="none" stroke="#241714" strokeLinecap="round" strokeWidth="5" opacity="0.48" />
      <g stroke="#241714" strokeLinecap="round">
        <path d="M62 67h10" strokeWidth="4" />
        <path d="M88 67h10" strokeWidth="4" />
        <path d="M80 74v15" strokeWidth="2.5" opacity="0.45" />
      </g>
      <ellipse cx="80" cy="93" rx="7" ry="5" fill="#241714" opacity="0.72" />
    </svg>
  );
}

function jerseyPattern(pattern: JerseyPattern, palette: StickerPalette, accent: string) {
  if (pattern === "stripe") {
    return (
      <g opacity="0.62">
        <path d="M56 184V121" stroke={palette.secondary} strokeWidth="11" />
        <path d="M80 184V116" stroke={accent} strokeWidth="7" />
        <path d="M104 184V121" stroke={palette.secondary} strokeWidth="11" />
      </g>
    );
  }
  if (pattern === "sash") {
    return (
      <path
        d="M39 184 112 119"
        fill={palette.secondary}
        opacity="0.55"
        stroke={accent}
        strokeWidth="10"
      />
    );
  }
  if (pattern === "keeper") {
    return (
      <g opacity="0.68">
        <path d="M37 139h86" stroke={palette.secondary} strokeWidth="8" />
        <path d="M48 157h64" stroke={accent} strokeWidth="6" />
        <path d="M60 176h40" stroke={palette.secondary} strokeWidth="6" />
      </g>
    );
  }
  if (pattern === "shoulder") {
    return (
      <g opacity="0.62">
        <path d="M32 184c5-34 18-56 37-66" fill={palette.secondary} />
        <path d="M128 184c-5-34-18-56-37-66" fill={palette.secondary} />
      </g>
    );
  }
  return (
    <path
      d="M55 184c5-23 13-39 25-48 12 9 20 25 25 48H55Z"
      fill={palette.secondary}
      opacity="0.38"
    />
  );
}

function MiniPlayerPortrait({ option }: { option: SpecialOption }) {
  const palette = teamPalette(option.teamCode);

  return (
    <span
      className="flex h-full w-full items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(145deg, ${palette.primary}, ${palette.secondary})`,
      }}
    >
      <PlayerPortrait option={option} compact />
    </span>
  );
}

function visualProfile(option: SpecialOption): VisualProfile {
  const seed = hashSeed(`${option.teamCode}:${option.number ?? 0}:${option.position ?? "T"}`);
  const positionPattern: Record<string, JerseyPattern> = {
    GK: "keeper",
    DF: "shoulder",
    MF: "stripe",
    FW: "sash",
  };
  const base: VisualProfile = {
    skin: SKIN_TONES[(seed + (option.number ?? 0)) % SKIN_TONES.length],
    hair: HAIR_COLORS[(seed + Math.floor((option.heightCm ?? 170) / 7)) % HAIR_COLORS.length],
    hairStyle: HAIR_STYLES[(seed + (option.number ?? 0)) % HAIR_STYLES.length],
    jerseyPattern:
      option.position && positionPattern[option.position]
        ? positionPattern[option.position]
        : JERSEY_PATTERNS[seed % JERSEY_PATTERNS.length],
  };
  const override = PLAYER_STYLE_OVERRIDES[`${option.teamCode}:${option.number}`];
  return { ...base, ...override };
}

function isNeymarOption(option: SpecialOption) {
  return option.teamCode === "BRA" && option.number === 10 && option.position === "FW";
}

function hairShape(style: HairStyle, color: string) {
  if (style === "curls") {
    return (
      <g fill={color}>
        {Array.from({ length: 9 }, (_, index) => (
          <circle key={index} cx={45 + index * 9} cy={35 + (index % 2) * 3} r="8" />
        ))}
        <path d="M45 48c8-23 61-26 71 1-16-8-52-8-71-1Z" />
      </g>
    );
  }
  if (style === "locs") {
    return (
      <g fill={color}>
        <path d="M46 45c10-28 58-31 69 2-18-9-50-10-69-2Z" />
        {Array.from({ length: 8 }, (_, index) => (
          <rect
            key={index}
            x={46 + index * 8}
            y={38}
            width="5"
            height={18 + (index % 3) * 4}
            rx="3"
          />
        ))}
      </g>
    );
  }
  if (style === "topknot") {
    return (
      <g fill={color}>
        <circle cx="80" cy="18" r="12" />
        <path d="M45 47c9-27 60-30 70 2-18-8-51-8-70-2Z" />
      </g>
    );
  }
  if (style === "fade") {
    return <path d="M45 50c6-31 61-36 70 0-22-13-48-12-70 0Z" fill={color} />;
  }
  if (style === "waves") {
    return (
      <g fill="none" stroke={color} strokeLinecap="round" strokeWidth="8">
        <path d="M46 45c12-10 22-10 34 0s22 10 35 0" />
        <path d="M50 36c10-8 20-8 30 0s20 8 30 0" />
      </g>
    );
  }
  return <path d="M45 49c7-31 62-36 70 2-22-12-48-12-70-2Z" fill={color} />;
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
