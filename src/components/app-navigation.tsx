"use client";

import { BarChart3, CircleHelp, Home, Sparkles, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Início", icon: Home },
  { href: "/palpites", label: "Palpites", icon: Target },
  { href: "/especiais", label: "Extras", icon: Sparkles },
  { href: "/boloes", label: "Bolões", icon: BarChart3 },
  { href: "/competicao", label: "Copa", icon: Trophy },
  { href: "/regras", label: "Regras", icon: CircleHelp },
];

export function DesktopNavigation() {
  const pathname = usePathname();

  return (
    <nav className="desktop-nav hidden items-center gap-1 md:flex">
      {navigation.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
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
      })}
    </nav>
  );
}

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav className="mobile-navigation fixed inset-x-2.5 bottom-2.5 z-50 grid grid-cols-6 rounded-2xl border p-1.5 shadow-2xl shadow-brand/15 backdrop-blur-xl md:hidden">
      {navigation.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`interactive flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-[9px] font-bold sm:text-[10px] ${
              active
                ? "bg-brand text-white shadow-md shadow-brand/20"
                : "text-muted hover:bg-surface-muted hover:text-brand"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}
