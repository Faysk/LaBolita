"use client";

import { CheckCircle2, Clock3, LoaderCircle, Monitor, Moon, Save, Sun, UserRoundCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { LocalMatchDateTime } from "@/components/local-match-date-time";
import { UserAvatar } from "@/components/user-avatar";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  detectCurrentOffsetMinutes,
  GMT_OFFSET_OPTIONS,
  TIME_ZONE_OPTIONS,
  type ThemePreference,
  type TimePreference,
  useThemePreference,
  useTimePreference,
} from "@/lib/user-preferences";
import type { DemoMatch } from "@/lib/types";
import { friendlyServerError } from "@/lib/user-errors";

type SaveState = "idle" | "saving" | "saved" | "error";

export function AccountSettingsPanel({
  displayName,
  email,
  avatarUrl,
  showAvatarPublicly,
  sampleMatch,
}: {
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  showAvatarPublicly: boolean;
  sampleMatch?: DemoMatch | null;
}) {
  const router = useRouter();
  const initials = useMemo(() => initialsFromName(displayName), [displayName]);
  const [name, setName] = useState(displayName);
  const [publicAvatar, setPublicAvatar] = useState(showAvatarPublicly);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const { preference: themePreference, effectiveTheme, setPreference: setThemePreference } =
    useThemePreference();
  const { preference: timePreference, setPreference: updateTimePreference } = useTimePreference();
  const [zoneValue, setZoneValue] = useState(
    timePreference.mode === "zone" ? timePreference.timeZone : "America/Sao_Paulo",
  );
  const [offsetValue, setOffsetValue] = useState(
    String(timePreference.mode === "offset" ? timePreference.offsetMinutes : detectCurrentOffsetMinutes()),
  );

  const dirty =
    name.trim() !== displayName ||
    publicAvatar !== showAvatarPublicly;
  const validName = name.trim().length >= 2 && name.trim().length <= 60;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || !validName || saveState === "saving") return;

    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    setSaveState("saving");
    setMessage(null);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setSaveState("error");
      setMessage("Entre novamente para alterar sua conta.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim(),
        show_avatar_publicly: publicAvatar,
      })
      .eq("id", authData.user.id);

    if (error) {
      setSaveState("error");
      setMessage(friendlyServerError(error, "Não foi possível salvar suas alterações."));
      return;
    }

    setSaveState("saved");
    setMessage("Preferências de perfil salvas.");
    router.refresh();
  }

  function updateTheme(nextPreference: ThemePreference) {
    setThemePreference(nextPreference);
  }

  function updateTime(nextPreference: TimePreference) {
    updateTimePreference(nextPreference);
  }

  function selectZone(nextZone: string) {
    setZoneValue(nextZone);
    updateTime({ mode: "zone", timeZone: nextZone });
  }

  function selectOffset(nextOffset: string) {
    setOffsetValue(nextOffset);
    updateTime({ mode: "offset", offsetMinutes: Number(nextOffset) });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <section className="card p-5 md:p-6">
        <div className="flex items-start gap-4">
          <UserAvatar
            name={displayName}
            initials={initials}
            avatarUrl={avatarUrl}
            className="size-16"
          />
          <div className="min-w-0">
            <p className="eyebrow">Perfil público</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">
              Sua identidade no bolão
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Nome e foto aparecem em rankings e bolões. A foto só fica pública se você permitir.
            </p>
          </div>
        </div>

        <form onSubmit={saveProfile} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">
            Nome exibido
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSaveState("idle");
                setMessage(null);
              }}
              minLength={2}
              maxLength={60}
              className="interactive min-h-12 rounded-2xl border bg-surface-muted px-4 text-sm font-bold outline-none focus:border-brand focus:bg-surface"
            />
            <span className="text-xs font-medium text-muted">
              Use de 2 a 60 caracteres.
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border bg-surface-muted p-4 text-sm">
            <input
              type="checkbox"
              checked={publicAvatar}
              disabled={!avatarUrl}
              onChange={(event) => {
                setPublicAvatar(event.target.checked);
                setSaveState("idle");
                setMessage(null);
              }}
              className="mt-1 size-4 accent-[var(--color-brand)]"
            />
            <span>
              <span className="block font-black">Exibir minha foto publicamente</span>
              <span className="mt-1 block text-xs leading-5 text-muted">
                Quando desligado, outras pessoas veem apenas suas iniciais. Você sempre vê sua própria foto.
              </span>
              {!avatarUrl && (
                <span className="mt-2 block text-xs font-bold text-muted">
                  Sua conta ainda não trouxe foto do provedor de login.
                </span>
              )}
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!dirty || !validName || saveState === "saving"}
              className="interactive inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-black text-white shadow-lg shadow-brand/15 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted disabled:shadow-none"
            >
              {saveState === "saving" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : saveState === "saved" ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Save className="size-4" />
              )}
              {saveState === "saving" ? "Salvando..." : "Salvar perfil"}
            </button>
            {message && (
              <p
                className={`text-sm font-bold ${
                  saveState === "error" ? "text-red-700" : "text-brand"
                }`}
                aria-live="polite"
              >
                {message}
              </p>
            )}
          </div>
        </form>
      </section>

      <section className="grid gap-5">
        <div className="card p-5 md:p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-brand/10 p-3 text-brand">
              <Monitor className="size-5" />
            </span>
            <div>
              <p className="eyebrow">Aparência</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Tema do app</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <PreferenceButton
              active={themePreference === "system"}
              icon={<Monitor className="size-4" />}
              label="Sistema"
              detail={`Agora: ${effectiveTheme === "dark" ? "escuro" : "claro"}`}
              onClick={() => updateTheme("system")}
            />
            <PreferenceButton
              active={themePreference === "light"}
              icon={<Sun className="size-4" />}
              label="Claro"
              detail="Força modo claro"
              onClick={() => updateTheme("light")}
            />
            <PreferenceButton
              active={themePreference === "dark"}
              icon={<Moon className="size-4" />}
              label="Escuro"
              detail="Força modo escuro"
              onClick={() => updateTheme("dark")}
            />
          </div>
        </div>

        <div className="card p-5 md:p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-brand/10 p-3 text-brand">
              <Clock3 className="size-5" />
            </span>
            <div>
              <p className="eyebrow">Horário</p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Fuso dos jogos</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-3">
            <PreferenceButton
              active={timePreference.mode === "auto"}
              icon={<Clock3 className="size-4" />}
              label="Automático"
              detail="Usa seu dispositivo"
              onClick={() => updateTime({ mode: "auto" })}
            />
            <PreferenceButton
              active={timePreference.mode === "zone"}
              icon={<UserRoundCog className="size-4" />}
              label="Fuso/cidade"
              detail="Ajusta horário de verão"
              onClick={() => updateTime({ mode: "zone", timeZone: zoneValue })}
            />
            <PreferenceButton
              active={timePreference.mode === "offset"}
              icon={<Clock3 className="size-4" />}
              label="GMT manual"
              detail="Offset fixo"
              onClick={() => updateTime({ mode: "offset", offsetMinutes: Number(offsetValue) })}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Fuso por cidade
              <select
                value={zoneValue}
                onChange={(event) => selectZone(event.target.value)}
                className="interactive min-h-12 rounded-2xl border bg-surface-muted px-4 text-sm font-bold outline-none focus:border-brand focus:bg-surface"
              >
                {TIME_ZONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold">
              GMT manual
              <select
                value={offsetValue}
                onChange={(event) => selectOffset(event.target.value)}
                className="interactive min-h-12 rounded-2xl border bg-surface-muted px-4 text-sm font-bold outline-none focus:border-brand focus:bg-surface"
              >
                {GMT_OFFSET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 rounded-2xl border bg-surface-muted p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-brand">
              Prévia
            </p>
            {sampleMatch ? (
              <p className="mt-2 text-sm font-bold">
                {sampleMatch.homeTeam.shortName} x {sampleMatch.awayTeam.shortName}:{" "}
                <LocalMatchDateTime
                  scheduledAt={sampleMatch.scheduledAt}
                  fallbackDate={sampleMatch.dateLabel}
                  fallbackTime={sampleMatch.timeLabel}
                  includeZone
                />
              </p>
            ) : (
              <p className="mt-2 text-sm font-bold text-muted">
                Sem próximos jogos para prévia.
              </p>
            )}
            <p className="mt-2 text-xs leading-5 text-muted">
              O modo automático não acessa sua localização real; ele usa apenas o fuso configurado no navegador.
            </p>
          </div>
        </div>

        <div className="card p-5 md:p-6">
          <p className="eyebrow">Conta</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Login e segurança</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="rounded-2xl border bg-surface-muted p-4">
              <dt className="text-xs font-black uppercase tracking-[0.12em] text-muted">E-mail</dt>
              <dd className="mt-1 font-bold">{email ?? "Não informado"}</dd>
            </div>
            <div className="rounded-2xl border bg-surface-muted p-4">
              <dt className="text-xs font-black uppercase tracking-[0.12em] text-muted">Foto</dt>
              <dd className="mt-1 text-sm font-bold">
                {avatarUrl ? "Sincronizada pelo login Google" : "Sem foto sincronizada"}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}

function PreferenceButton({
  active,
  icon,
  label,
  detail,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`interactive rounded-2xl border p-4 text-left transition ${
        active
          ? "border-brand bg-brand text-white shadow-lg shadow-brand/15"
          : "bg-surface-muted hover:border-brand/45"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-black">
        {icon}
        {label}
      </span>
      <span className={`mt-1 block text-xs font-bold ${active ? "text-white/75" : "text-muted"}`}>
        {detail}
      </span>
    </button>
  );
}

function initialsFromName(name: string) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials || "LB";
}
