import { redirect } from "next/navigation";

import { logout } from "@/app/(auth)/actions";
import { BrandMark } from "@/components/brand-mark";
import { AcquisitionWorkspace } from "@/features/items/components/acquisition-workspace";
import type { ActiveAcquisition } from "@/features/items/acquisitions/types";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: acquisitionRows, error: acquisitionsError } = await supabase
    .from("acquisition_lots")
    .select(`
      id,
      acquisition_type,
      acquisition_unit_cost,
      current_listing_unit_price,
      is_forgemaged,
      quantity_acquired,
      listed_at,
      items!inner(name, image_url, item_type, level),
      professions!inner(name),
      sales(quantity_sold)
    `)
    .eq("user_id", user.id)
    .order("listed_at", { ascending: false });

  if (acquisitionsError) {
    console.error("Could not load active acquisitions", acquisitionsError);
  }

  const acquisitions: ActiveAcquisition[] = (acquisitionRows ?? [])
    .map((row) => {
      const quantitySold = row.sales.reduce(
        (total, sale) => total + sale.quantity_sold,
        0,
      );

      return {
        id: row.id,
        itemName: row.items.name,
        itemType: row.items.item_type,
        itemLevel: row.items.level,
        imageUrl: row.items.image_url,
        profession: row.professions.name,
        acquisitionType: row.acquisition_type,
        isForgemaged: row.is_forgemaged,
        quantity: row.quantity_acquired - quantitySold,
        unitCost: row.acquisition_unit_cost,
        listingPrice: row.current_listing_unit_price,
        listedAt: row.listed_at,
      };
    })
    .filter((acquisition) => acquisition.quantity > 0);

  const activeQuantity = acquisitions.reduce(
    (total, acquisition) => total + acquisition.quantity,
    0,
  );

  const previewCards = [
    {
      label: "Profit total",
      value: "—",
      detail: "Disponible après vos premières ventes",
      accent: "lime",
    },
    {
      label: "Ventes actives",
      value: activeQuantity.toLocaleString("fr-CA"),
      detail: `${acquisitions.length} lot${acquisitions.length === 1 ? "" : "s"} en cours`,
      accent: "orange",
    },
    {
      label: "Objets vendus",
      value: "—",
      detail: "Historique à venir",
      accent: "white",
    },
  ];

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

          <AcquisitionWorkspace acquisitions={acquisitions} />
        </section>
      </div>
    </main>
  );
}
