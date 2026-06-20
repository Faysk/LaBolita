"use client";

import {
  CircleEllipsis,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  appRouteList,
  type AppRoute,
} from "@/lib/app-routes";

const desktopPrimaryNavigation = appRouteList([
  "home",
  "live",
  "dashboard",
  "predictions",
  "pools",
] as const);
const desktopMoreNavigation = appRouteList([
  "games",
  "specials",
  "players",
  "competition",
  "rules",
] as const);
const mobileQuickNavigation = appRouteList([
  "home",
  "live",
  "predictions",
  "pools",
] as const);
const mobileMenuNavigation = appRouteList([
  "dashboard",
  "games",
  "specials",
  "players",
  "competition",
  "rules",
] as const);

export function DesktopNavigation() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const supportActive = desktopMoreNavigation.some((item) =>
    isActivePath(pathname, item.href),
  );

  useEffect(() => {
    if (!moreOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }

    function closeOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [moreOpen]);

  return (
    <nav className="desktop-nav hidden items-center gap-1 lg:flex" aria-label="Menu principal">
      {desktopPrimaryNavigation.map((item) => (
        <DesktopNavigationLink
          key={item.href}
          item={item}
          active={isActivePath(pathname, item.href)}
        />
      ))}
      <div ref={containerRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          aria-controls="desktop-more-navigation"
          onClick={() => setMoreOpen((value) => !value)}
          className={`interactive inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold ${
            supportActive || moreOpen
              ? "bg-white text-brand shadow-sm"
              : "text-muted hover:bg-white hover:text-brand hover:shadow-sm"
          }`}
        >
          Mais
          <CircleEllipsis className="size-4" />
        </button>
        {moreOpen ? (
          <div
            id="desktop-more-navigation"
            role="menu"
            className="absolute right-0 top-12 z-50 grid w-80 gap-1 rounded-2xl border bg-surface p-2 shadow-2xl shadow-brand/15"
          >
            <MenuHeader title="Mais caminhos" description="Consulta, dados e regras." />
            {desktopMoreNavigation.map((item) => (
              <MoreNavigationLink
                key={item.href}
                item={item}
                active={isActivePath(pathname, item.href)}
                onClick={() => setMoreOpen(false)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}

export function MobileNavigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuActive = mobileMenuNavigation.some((item) =>
    isActivePath(pathname, item.href),
  );

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    function closeOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [menuOpen]);

  return (
    <div ref={containerRef} className="lg:hidden">
      {menuOpen ? (
        <div
          id="mobile-more-navigation"
          role="menu"
          className="fixed inset-x-2.5 bottom-[5.45rem] z-50 grid max-h-[calc(100dvh-7rem)] gap-1 overflow-y-auto rounded-2xl border bg-surface p-2 shadow-2xl shadow-brand/20 backdrop-blur-xl"
        >
          <MenuHeader title="Mais caminhos" description="Jogos, dados, especiais e regras." />
          {mobileMenuNavigation.map((item) => (
            <MoreNavigationLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              onClick={() => setMenuOpen(false)}
            />
          ))}
        </div>
      ) : null}
      <nav
        className="mobile-navigation fixed inset-x-2.5 bottom-2.5 z-50 grid grid-cols-5 rounded-2xl border p-1.5 shadow-2xl shadow-brand/15 backdrop-blur-xl"
        aria-label="Menu principal"
      >
        {mobileQuickNavigation.map((item) => (
          <MobileNavigationLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            onClick={() => setMenuOpen(false)}
          />
        ))}
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-more-navigation"
          onClick={() => setMenuOpen((value) => !value)}
          className={`interactive flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-[9px] font-bold sm:text-[10px] ${
            menuActive || menuOpen
              ? "bg-brand text-white shadow-md shadow-brand/20"
              : "text-muted hover:bg-surface-muted hover:text-brand"
          }`}
        >
          {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          Menu
        </button>
      </nav>
    </div>
  );
}

function DesktopNavigationLink({
  item,
  active,
}: {
  item: AppRoute;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`interactive rounded-xl px-3.5 py-2 text-sm font-bold ${
        active
          ? "bg-white text-brand shadow-sm"
          : "text-muted hover:bg-white hover:text-brand hover:shadow-sm"
      }`}
    >
      {item.label}
    </Link>
  );
}

function MobileNavigationLink({
  item,
  active,
  onClick,
}: {
  item: AppRoute;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`interactive flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-[9px] font-bold sm:text-[10px] ${
        active
          ? "bg-brand text-white shadow-md shadow-brand/20"
          : "text-muted hover:bg-surface-muted hover:text-brand"
      }`}
    >
      <item.icon className="size-4" />
      {item.mobileLabel ?? item.label}
    </Link>
  );
}

function MenuHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div role="presentation" className="px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand">
        {title}
      </p>
      <p className="mt-0.5 text-xs font-bold text-muted">{description}</p>
    </div>
  );
}

function MoreNavigationLink({
  item,
  active,
  onClick,
}: {
  item: AppRoute;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={item.href}
      role="menuitem"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`interactive flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 ${
        active
          ? "bg-brand text-white"
          : "text-muted hover:bg-surface-muted hover:text-brand"
      }`}
    >
      <span
        className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl border ${
          active ? "border-white/20 bg-white/10" : "bg-surface"
        }`}
      >
        <item.icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black">
          {item.label}
        </span>
        <span
          className={`mt-0.5 block line-clamp-2 text-xs font-bold ${
            active ? "text-white/65" : "text-muted"
          }`}
        >
          {item.description}
        </span>
      </span>
    </Link>
  );
}

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}
