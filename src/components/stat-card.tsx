import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  accent = false,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
  href?: string;
}) {
  const content = (
    <article className={`card p-4 md:p-5 ${accent ? "bg-gradient-to-br from-accent/45 to-white" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-xl bg-surface-muted p-2 text-brand">
          <Icon className="size-4" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
          {detail}
        </span>
      </div>
      <p className="mt-5 text-2xl font-black tracking-tight md:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-bold text-muted md:text-sm">{label}</p>
    </article>
  );

  if (!href) return content;

  return (
    <Link href={href} className="interactive block rounded-[1.5rem]">
      {content}
    </Link>
  );
}
