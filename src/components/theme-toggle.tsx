"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useThemePreference } from "@/lib/user-preferences";

export function ThemeToggle() {
  const { preference, effectiveTheme, setPreference } = useThemePreference();

  function toggleTheme() {
    setPreference(effectiveTheme === "dark" ? "light" : "dark");
  }

  const nextLabel = effectiveTheme === "dark" ? "Usar tema claro" : "Usar tema escuro";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
      className="interactive rounded-xl p-2 text-muted hover:bg-surface-muted hover:text-brand"
    >
      {preference === "system" ? (
        <Monitor className="size-4" />
      ) : effectiveTheme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  );
}
