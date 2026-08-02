import Link from "next/link";

import { logout } from "@/app/(auth)/actions";
import { BrandMark } from "@/components/brand-mark";

type AppHeaderProps = {
  activePage: "dashboard" | "statistics" | "sales-history";
  email: string;
};

const navigationItems = [
  { id: "dashboard", label: "Tableau de bord", href: "/dashboard" },
  { id: "statistics", label: "Statistiques", href: "/statistics" },
  { id: "sales-history", label: "Historique des ventes", href: "/sales-history" },
] as const;

export function AppHeader({ activePage, email }: AppHeaderProps) {
  return (
    <header className="grid grid-cols-[1fr_auto] items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
      <BrandMark />

      <nav aria-label="Navigation principale" className="order-3 col-span-2 flex flex-wrap items-center justify-center gap-2 lg:order-none lg:col-span-1 lg:flex-nowrap">
        {navigationItems.map((item) => {
          const isActive = item.id === activePage;
          const className = `inline-flex h-10 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition ${
            isActive
              ? "border-[var(--color-lime)] bg-[var(--color-lime)]/10 text-[var(--color-lime)]"
              : "border-transparent text-[var(--color-muted)]"
          }`;

          return (
            <Link key={item.id} href={item.href} aria-current={isActive ? "page" : undefined} className={`${className} hover:border-white/15 hover:text-white`}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-self-end gap-3">
        <div className="hidden rounded-full bg-[var(--color-surface)] px-5 py-2.5 text-right sm:block">
          <p className="max-w-48 truncate text-xs font-semibold text-white">{email}</p>
          <p className="mt-0.5 flex items-center justify-end gap-1.5 text-[10px] text-[var(--color-muted)]">
            <span className="size-1.5 animate-pulse rounded-full bg-[var(--color-lime)]" />
            Compte connecté
          </p>
        </div>
        <form action={logout}>
          <button type="submit" className="rounded-full border border-white/12 px-4 py-2.5 text-xs font-semibold text-white transition hover:border-[var(--color-orange)] hover:text-[var(--color-orange)] sm:px-5">
            Déconnexion
          </button>
        </form>
      </div>
    </header>
  );
}
