export function UserAvatar({
  name,
  initials,
  avatarUrl,
  className = "size-10",
}: {
  name: string;
  initials: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-xs font-black text-white ${className}`}
      aria-label={name}
    >
      {avatarUrl?.startsWith("https://") ? (
        // Google profile images are external and intentionally rendered without optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
