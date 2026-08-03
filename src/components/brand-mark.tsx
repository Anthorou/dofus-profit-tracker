import Link from "next/link";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
};

export function BrandMark({ compact = false, href = "/" }: BrandMarkProps) {
  return (
    <Link href={href} className="group inline-flex items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--color-ink)] ring-1 ring-white/10 transition duration-200 group-hover:-rotate-2 group-hover:ring-[var(--color-lime)]/50">
        <svg
          aria-hidden="true"
          viewBox="0 0 48 48"
          className="size-9"
          fill="none"
        >
          <path d="M8 5h9v14.2L30.5 5H42L17 31.2V43H8V5Z" fill="var(--color-lime)" />
          <path d="m26.4 24 15.8 19H31.1l-4.7-6H18l8.4-13Z" fill="#f4f4f2" />
        </svg>
      </span>
      {!compact ? (
        <span className="font-display text-xl font-bold uppercase tracking-wide text-white">
          Kamatelier
        </span>
      ) : null}
    </Link>
  );
}
