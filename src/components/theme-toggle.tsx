"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useThemePreference } from "@/lib/user-preferences";

export function ThemeToggle() {
  const { preference, effectiveTheme, setPreference } = useThemePreference();
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  function toggleTheme() {
    setPreference(effectiveTheme === "dark" ? "light" : "dark");
  }

  const nextLabel = !hydrated
    ? "Alternar tema"
    : effectiveTheme === "dark"
      ? "Usar tema claro"
      : "Usar tema escuro";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
      className="interactive rounded-xl p-2 text-muted hover:bg-surface-muted hover:text-brand"
    >
      {!hydrated ? (
        <Monitor className="size-4" />
      ) : preference === "system" ? (
        <Monitor className="size-4" />
      ) : effectiveTheme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  );
}

let hydratedSnapshot = false;
const hydrationListeners = new Set<() => void>();

function subscribeHydration(onStoreChange: () => void) {
  hydrationListeners.add(onStoreChange);
  if (!hydratedSnapshot) {
    queueMicrotask(() => {
      if (hydratedSnapshot) return;
      hydratedSnapshot = true;
      for (const listener of hydrationListeners) listener();
    });
  }
  return () => hydrationListeners.delete(onStoreChange);
}

function getHydrationSnapshot() {
  return hydratedSnapshot;
}

function getServerHydrationSnapshot() {
  return false;
}
