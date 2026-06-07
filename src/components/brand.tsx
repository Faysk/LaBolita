import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-full bg-brand">
        <span className="size-3.5 rounded-full border-[3px] border-accent" />
        <span className="absolute bottom-0 h-1/2 w-full bg-accent/15" />
      </span>
      <span className="text-lg font-black tracking-[-0.06em]">
        La<span className="text-brand">Bolita</span>
      </span>
    </Link>
  );
}
