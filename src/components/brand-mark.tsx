import Link from "next/link";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
};

export function BrandMark({ compact = false, href = "/" }: BrandMarkProps) {
  return (
    <Link href={href} className="group inline-flex items-center gap-3">
      <span className="font-display flex size-11 items-center justify-center rounded-full bg-[var(--color-ink)] text-lg font-bold tracking-[-0.08em] text-[var(--color-lime)] ring-1 ring-white/10 transition group-hover:rotate-3 group-hover:bg-[var(--color-lime)] group-hover:text-black">
        DPT
      </span>
      {!compact ? (
        <span className="font-display text-xl font-bold uppercase tracking-wide text-white">
          Profit Tracker
        </span>
      ) : null}
    </Link>
  );
}
