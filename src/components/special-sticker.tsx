"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { TeamFlag } from "@/components/team-flag";
import { playerStickerAsset, type PlayerStickerAsset } from "@/lib/player-sticker-assets";
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
    return <TeamFlagAvatar option={option} size={size} />;
  }

  const asset = playerStickerAsset(option.key);
  const dimensions =
    size === "sm"
      ? "size-10 rounded-xl"
      : size === "md"
        ? "size-12 rounded-2xl"
        : "size-16 rounded-[1.25rem]";
  const flagSize = size === "lg" ? "sm" : "xs";

  if (asset) {
    return (
      <span
        className={`relative inline-flex shrink-0 overflow-hidden border border-white/20 bg-surface-muted shadow-lg shadow-black/10 ${dimensions}`}
        title={option.fullName ?? option.label}
      >
        <Image
          src={asset.src}
          width={asset.width}
          height={asset.height}
          alt={`Figurinha autoral de ${option.label}`}
          className="h-full w-full object-cover"
          sizes={size === "lg" ? "64px" : size === "md" ? "48px" : "40px"}
        />
      </span>
    );
  }

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
  const asset = playerStickerAsset(option.key);
  if (asset) {
    return (
      <PlayerImageSticker
        option={option}
        asset={asset}
        variant={variant}
        selected={selected}
      />
    );
  }

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

function PlayerImageSticker({
  option,
  asset,
  variant,
  selected,
}: {
  option: SpecialOption;
  asset: PlayerStickerAsset;
  variant: StickerVariant;
  selected: boolean;
}) {
  const sizeClass = {
    avatar: "w-12 rounded-[0.9rem]",
    thumb: "w-24 rounded-[1.15rem]",
    card: "w-32 rounded-[1.25rem]",
    feature: "w-56 rounded-[1.8rem]",
  }[variant];
  const sizes = {
    avatar: "48px",
    thumb: "96px",
    card: "128px",
    feature: "(max-width: 768px) 48vw, 224px",
  }[variant];

  return (
    <span
      className={`relative inline-flex aspect-[2/3] shrink-0 overflow-hidden border border-white/25 bg-surface-muted shadow-xl shadow-black/15 ${sizeClass} ${
        selected ? "ring-2 ring-accent" : ""
      }`}
      title={option.fullName ?? option.label}
    >
      <Image
        src={asset.src}
        width={asset.width}
        height={asset.height}
        alt={`Figurinha autoral de ${option.label}`}
        className="h-full w-full object-cover"
        sizes={sizes}
        priority={variant === "feature"}
      />
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
  const style = {
    "--sticker-primary": palette.primary,
    "--sticker-secondary": palette.secondary,
    "--sticker-accent": palette.accent,
    "--sticker-text": palette.text,
  } as CSSProperties;

  if (variant === "feature") {
    return <TeamFeatureSticker option={option} selected={selected} style={style} />;
  }

  const compact = variant === "avatar" || variant === "thumb";
  const sizeClass = {
    avatar: "h-16 w-14 rounded-[0.95rem]",
    thumb: "h-28 w-24 rounded-[1.15rem]",
    card: "h-44 w-32 rounded-[1.25rem]",
  }[variant];
  const flagSize = variant === "card" ? "xl" : variant === "thumb" ? "lg" : "sm";
  const flagFrameClass = {
    avatar: "rounded-xl p-1",
    thumb: "rounded-[1.15rem] p-1.5",
    card: "rounded-[1.35rem] p-1.5",
  }[variant];
  const bodyClass = compact
    ? "relative flex flex-1 items-center justify-center px-2 pb-7 pt-5"
    : "relative flex flex-1 items-center justify-center px-3 pb-2 pt-9";

  return (
    <span
      className={`relative inline-flex shrink-0 flex-col overflow-hidden border border-white/25 bg-[linear-gradient(145deg,var(--sticker-primary),var(--sticker-secondary))] shadow-xl shadow-black/15 ${sizeClass} ${
        selected ? "ring-2 ring-accent" : ""
      }`}
      style={style}
      title={option.teamName}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_22%_16%,rgba(255,255,255,0.42),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent_45%)]" />
      <span className="absolute left-2 top-2 z-10 rounded-full border border-white/25 bg-black/24 px-2 py-0.5 text-[10px] font-black leading-none text-white/90">
        26
      </span>
      <span className={bodyClass}>
        <span
          className={`relative z-10 inline-flex items-center justify-center border border-white/55 bg-white/92 shadow-xl shadow-black/20 ${flagFrameClass}`}
        >
          <span className="absolute inset-1 rounded-[inherit] bg-[linear-gradient(145deg,rgba(255,255,255,0.85),rgba(255,255,255,0.32))]" />
          <span className="relative">
            <TeamFlag team={teamFromSpecialOption(option)} size={flagSize} />
          </span>
        </span>
      </span>
      {compact ? (
        <span className="absolute bottom-1.5 left-1.5 right-1.5 z-20 flex items-center justify-center rounded-xl border border-white/20 bg-black/35 px-1.5 py-1 text-white shadow-sm backdrop-blur">
          <span className="text-[10px] font-black leading-none">{option.teamCode}</span>
        </span>
      ) : (
        <span className="relative z-20 grid min-h-16 gap-1 border-t border-white/25 bg-black/32 px-2.5 py-2.5 text-white">
          <span className="line-clamp-1 text-xs font-black leading-none">{option.teamName}</span>
          <span className="line-clamp-1 text-[9px] font-bold text-white/75">
            {teamStatsLine(option)}
          </span>
        </span>
      )}
    </span>
  );
}

function TeamFeatureSticker({
  option,
  selected,
  style,
}: {
  option: SpecialOption;
  selected: boolean;
  style: CSSProperties;
}) {
  return (
    <span
      className={`relative inline-grid w-full max-w-[34rem] overflow-hidden rounded-[1.8rem] border border-white/25 bg-[linear-gradient(145deg,var(--sticker-primary),var(--sticker-secondary))] shadow-xl shadow-black/15 ${
        selected ? "ring-2 ring-accent" : ""
      }`}
      style={style}
      title={option.teamName}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,0.32),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.14),transparent_48%)]" />
      <span className="absolute left-4 top-4 z-20 rounded-full border border-white/35 bg-black/25 px-2.5 py-1 text-xs font-black leading-none text-white/90 shadow-sm">
        26
      </span>
      <span className="relative z-10 block p-3 pb-0 sm:p-4 sm:pb-0">
        <span className="block overflow-hidden rounded-[1.35rem] border border-white/35 bg-white/10 shadow-xl shadow-black/20">
          <span className="block aspect-[16/10] w-full">
            <TeamFlag team={teamFromSpecialOption(option)} size="hero" />
          </span>
        </span>
      </span>
      <span className="relative z-20 flex min-h-20 flex-col justify-center gap-1 border-t border-white/25 bg-black/38 px-5 py-4 text-white sm:flex-row sm:items-end sm:justify-between">
        <span className="text-xl font-black leading-tight">{option.teamName}</span>
        <span className="text-sm font-bold text-white/80">{teamStatsLine(option)}</span>
      </span>
    </span>
  );
}

function TeamFlagAvatar({
  option,
  size,
}: {
  option: SpecialOption;
  size: "sm" | "md" | "lg";
}) {
  const palette = teamPalette(option.teamCode);
  const dimensions =
    size === "sm"
      ? "h-9 w-12 rounded-xl p-1"
      : size === "md"
        ? "h-11 w-16 rounded-2xl p-1.5"
        : "h-14 w-20 rounded-[1.1rem] p-1.5";
  const flagSize = size === "lg" ? "lg" : size === "md" ? "md" : "sm";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/25 shadow-lg shadow-black/10 ${dimensions}`}
      style={{
        background: `linear-gradient(145deg, ${palette.primary}, ${palette.secondary})`,
      }}
      title={option.teamName}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_25%_18%,rgba(255,255,255,0.36),transparent_34%)]" />
      <span className="relative rounded-xl border border-white/50 bg-white/90 p-1 shadow-md">
        <TeamFlag team={teamFromSpecialOption(option)} size={flagSize} />
      </span>
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
  const scale = compact ? 1.12 : 1.02;

  return (
    <svg
      viewBox="0 0 160 190"
      aria-hidden="true"
      className="h-full w-full drop-shadow-xl"
      style={{ transform: `scale(${scale}) translateY(${compact ? -5 : -2}px)` }}
    >
      <ellipse cx="80" cy="184" rx="47" ry="8" fill="rgba(0,0,0,0.18)" />
      <g fill="none" strokeLinecap="round" opacity="0.7">
        <path d="M41 71c-10-15-8-31 5-44" stroke="#f5d547" strokeWidth="4" />
        <path d="M119 71c10-15 8-31-5-44" stroke="#178848" strokeWidth="4" />
      </g>
      <path
        d="M35 184c5-42 21-68 45-68s40 26 45 68H35Z"
        fill="#f2d844"
        stroke="rgba(255,255,255,0.62)"
        strokeWidth="4"
      />
      <path d="M45 184h70l8 6H37l8-6Z" fill="#2852a3" />
      <path d="M53 123c13 12 41 12 54 0" fill="none" stroke="#178848" strokeWidth="6" />
      <path d="M43 184c4-27 13-47 28-59" fill="none" stroke="#178848" strokeWidth="4" opacity="0.6" />
      <path d="M117 184c-4-27-13-47-28-59" fill="none" stroke="#2852a3" strokeWidth="4" opacity="0.55" />
      <text
        x="80"
        y="160"
        textAnchor="middle"
        fontSize="28"
        fontWeight="900"
        fill="#1d7d5a"
        opacity="0.5"
      >
        10
      </text>
      <path d="M57 106h46v25c0 13-46 13-46 0v-25Z" fill="#c77b50" />
      <path
        d="M44 66c0-31 18-51 36-51s36 20 36 51c0 31-16 51-36 51S44 97 44 66Z"
        fill="#c77b50"
        stroke="rgba(25,20,18,0.24)"
        strokeWidth="3"
      />
      <ellipse cx="43" cy="73" rx="6" ry="12" fill="#c77b50" />
      <ellipse cx="117" cy="73" rx="6" ry="12" fill="#c77b50" />
      <path d="M45 49c8-32 62-37 70 0-23-12-49-12-70 0Z" fill="#241714" />
      <path d="M55 54c12-15 39-21 59-4-14-4-34-3-59 4Z" fill="#3b2419" opacity="0.52" />
      <g stroke="#241714" strokeLinecap="round">
        <path d="M62 67h10" strokeWidth="4" />
        <path d="M88 67h10" strokeWidth="4" />
        <path d="M80 74v14" strokeWidth="2.5" opacity="0.45" />
        <path d="M68 99c8 5 16 5 24 0" strokeWidth="3" opacity="0.48" />
      </g>
      <path
        d="M62 85c5 18 13 26 18 26s13-8 18-26"
        fill="none"
        stroke="#241714"
        strokeLinecap="round"
        strokeWidth="4"
        opacity="0.48"
      />
      <ellipse cx="80" cy="92" rx="7" ry="5" fill="#241714" opacity="0.68" />
      <path d="M57 126c12 10 34 10 46 0" fill="none" stroke="#2852a3" strokeLinecap="round" strokeWidth="5" />
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
