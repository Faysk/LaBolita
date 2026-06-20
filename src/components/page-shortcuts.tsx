import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { appRouteList, type AppRoute, type AppRouteKey } from "@/lib/app-routes";

export function PageShortcuts({
  routeKeys,
  items,
  label = "Caminhos relacionados",
  className = "",
}: {
  routeKeys?: readonly AppRouteKey[];
  items?: readonly AppRoute[];
  label?: string;
  className?: string;
}) {
  const shortcuts = items ? [...items] : appRouteList(routeKeys ?? []);
  if (shortcuts.length === 0) return null;

  return (
    <nav aria-label={label} className={`min-w-0 ${className}`}>
      <div className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] md:overflow-visible md:pb-0">
        {shortcuts.map((item) => (
          <ShortcutCard key={item.href} item={item} />
        ))}
      </div>
    </nav>
  );
}

function ShortcutCard({ item }: { item: AppRoute }) {
  return (
    <Link
      href={item.href}
      className="interactive group flex min-w-[13rem] items-center gap-3 rounded-2xl border bg-surface px-3.5 py-3 shadow-sm hover:border-brand/60 hover:bg-surface-muted md:min-w-0"
    >
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-brand group-hover:bg-surface">
        <item.icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black">
          {item.label}
        </span>
        <span className="mt-0.5 block line-clamp-2 text-xs font-bold leading-4 text-muted">
          {item.description}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted group-hover:text-brand" />
    </Link>
  );
}
