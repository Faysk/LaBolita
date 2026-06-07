import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  accent = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <article className={`card p-4 md:p-5 ${accent ? "bg-accent/30" : ""}`}>
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
}
