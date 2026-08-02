import { redirect } from "next/navigation";

import { logout } from "@/app/(auth)/actions";
import { BrandMark } from "@/components/brand-mark";
import { AcquisitionWorkspace } from "@/features/items/components/acquisition-workspace";
import { createClient } from "@/lib/supabase/server";

const previewCards = [
  {
    label: "Profit total",
    value: "—",
    detail: "Disponible après vos premières ventes",
    accent: "lime",
  },
  {
    label: "Ventes actives",
    value: "—",
    detail: "Vos objets en HDV apparaîtront ici",
    accent: "orange",
  },
  {
    label: "Objets vendus",
    value: "—",
    detail: "Historique à venir",
    accent: "white",
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="app-shell">
      <div className="mx-auto min-h-[calc(100vh-26px)] max-w-[1440px] px-5 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-5">
          <BrandMark />

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full bg-[var(--color-surface)] px-5 py-2.5 text-right sm:block">
              <p className="max-w-48 truncate text-xs font-semibold text-white">
                {user.email}
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">
                Compte connecté
              </p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-full border border-white/12 px-4 py-2.5 text-xs font-semibold text-white transition hover:border-[var(--color-orange)] hover:text-[var(--color-orange)] sm:px-5"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </header>

        <section className="pt-14 pb-12 sm:pt-20">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="eyebrow text-sm text-[var(--color-lime)]">
                Espace personnel
              </p>
              <h1 className="font-display mt-3 text-6xl leading-none font-bold uppercase tracking-tight text-white sm:text-7xl">
                Tableau de bord
              </h1>
              <p className="mt-4 max-w-xl leading-7 text-[var(--color-muted)]">
                Votre compte est prêt. Les prochains modules viendront
                transformer cet espace en centre de contrôle de vos profits.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-3 rounded-full bg-[var(--color-lime)]/10 px-4 py-2.5 text-sm text-[var(--color-lime)]">
              <span className="size-2 animate-pulse rounded-full bg-[var(--color-lime)]" />
              Authentification active
            </div>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {previewCards.map((card) => (
              <article
                key={card.label}
                className="surface-card min-h-56 rounded-[28px] p-6"
              >
                <div className="flex items-center justify-between">
                  <p className="eyebrow text-xs text-[var(--color-muted)]">
                    {card.label}
                  </p>
                  <span
                    className={`size-3 rounded-full ${
                      card.accent === "lime"
                        ? "bg-[var(--color-lime)]"
                        : card.accent === "orange"
                          ? "bg-[var(--color-orange)]"
                          : "bg-white"
                    }`}
                  />
                </div>
                <p className="font-display mt-8 text-7xl leading-none font-bold text-white">
                  {card.value}
                </p>
                <p className="mt-8 text-sm leading-6 text-[var(--color-muted)]">
                  {card.detail}
                </p>
              </article>
            ))}
          </div>

          <AcquisitionWorkspace />
        </section>
      </div>
    </main>
  );
}
