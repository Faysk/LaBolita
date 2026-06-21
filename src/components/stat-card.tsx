import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { LinkPendingOverlay } from "@/components/link-pending-feedback";
import { UserAvatar } from "@/components/user-avatar";

export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  accent = false,
  href,
  person,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
  href?: string;
  person?: {
    name: string;
    initials: string;
    avatarUrl?: string | null;
  } | null;
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
      {person && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-muted/75 p-2">
          <UserAvatar
            name={person.name}
            initials={person.initials}
            avatarUrl={person.avatarUrl}
            className="size-11"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{person.name}</p>
            <p className="text-[11px] font-bold text-muted">Melhor marca</p>
          </div>
        </div>
      )}
    </article>
  );

  if (!href) return content;

  return (
    <Link href={href} prefetch={false} className="interactive relative block overflow-hidden rounded-[1.5rem]">
      {content}
      <LinkPendingOverlay label="Abrindo..." className="rounded-[1.5rem]" />
    </Link>
  );
}
