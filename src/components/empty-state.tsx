import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  href,
  actionLabel,
  className = "",
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-[1.5rem] border bg-surface p-6 text-center shadow-sm ${className}`}
    >
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 text-lg font-black tracking-tight">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-6 text-muted">
        {description}
      </p>
      {href && actionLabel ? (
        <Link
          href={href}
          className="interactive mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-black text-white"
        >
          {actionLabel}
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
