"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    function handleOutsideClick(event: PointerEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsAccountMenuOpen(false);
    }

    window.addEventListener("pointerdown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  return (
    <header className="grid grid-cols-[1fr_auto] items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
      <BrandMark href="/dashboard" />

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

      <div ref={accountMenuRef} className="relative justify-self-end">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isAccountMenuOpen}
          onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
          className={`flex items-center gap-3 rounded-full border bg-[var(--color-surface)] py-2 pr-3 pl-5 text-right transition ${isAccountMenuOpen ? "border-[var(--color-lime)]/50" : "border-transparent hover:border-white/12"}`}
        >
          <span className="min-w-0">
            <span className="block max-w-40 truncate text-xs font-semibold text-white sm:max-w-48">{email}</span>
            <span className="mt-0.5 flex items-center justify-end gap-1.5 text-[10px] text-[var(--color-muted)]">
              <span className="size-1.5 animate-pulse rounded-full bg-[var(--color-lime)]" />
              Compte connecté
            </span>
          </span>
          <span aria-hidden="true" className={`text-[10px] text-[var(--color-muted)] transition ${isAccountMenuOpen ? "rotate-180" : ""}`}>⌄</span>
        </button>

        {isAccountMenuOpen && (
          <div role="menu" className="absolute top-full right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#202020] p-1.5 shadow-2xl shadow-black/60">
            <form action={logout}>
              <button type="submit" role="menuitem" className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[var(--color-orange)] transition hover:bg-[var(--color-orange)]/10">
                Déconnexion
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
