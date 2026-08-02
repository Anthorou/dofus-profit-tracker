import { redirect } from "next/navigation";

import { logout } from "@/app/(auth)/actions";
import { BrandMark } from "@/components/brand-mark";
import { AcquisitionWorkspace } from "@/features/items/components/acquisition-workspace";
import { calculatePotentialProfit } from "@/features/items/acquisitions/calculations";
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
      initial_listing_unit_price,
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
        quantitySold,
        unitCost: row.acquisition_unit_cost,
        initialListingPrice: row.initial_listing_unit_price,
        listingPrice: row.current_listing_unit_price,
        listedAt: row.listed_at,
      };
    })
    .filter((acquisition) => acquisition.quantity > 0);

  const activeQuantity = acquisitions.reduce(
    (total, acquisition) => total + acquisition.quantity,
    0,
  );
  const investedKamas = acquisitions.reduce(
    (total, acquisition) =>
      total + acquisition.quantity * acquisition.unitCost,
    0,
  );
  const potentialProfit = acquisitions.reduce((total, acquisition) => {
    return total + calculatePotentialProfit({
      acquisitionUnitCost: acquisition.unitCost,
      currentListingUnitPrice: acquisition.listingPrice,
      initialListingUnitPrice: acquisition.initialListingPrice,
      quantity: acquisition.quantity,
    });
  }, 0);

  const previewCards = [
    {
      label: "Ventes actives",
      value: activeQuantity.toLocaleString("fr-CA"),
      detail: `${acquisitions.length} lot${acquisitions.length === 1 ? "" : "s"} en cours`,
      accent: "lime",
    },
    {
      label: "Kamas immobilisés",
      value: `${investedKamas.toLocaleString("fr-CA")} K`,
      detail: "Capital dans les ventes en cours",
      accent: "orange",
    },
    {
      label: "Profit potentiel",
      value: `${potentialProfit.toLocaleString("fr-CA")} K`,
      detail: "Après les coûts et la taxe HDV de 2 %",
      accent: "white",
    },
  ];

  return (
    <main className="app-shell">
      <div className="mx-auto min-h-[calc(100vh-26px)] max-w-[1440px] px-5 py-5 sm:px-8 lg:px-12">
        <header className="grid grid-cols-[1fr_auto] items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <BrandMark />

          <nav aria-label="Navigation principale" className="order-3 col-span-2 flex items-center justify-self-center gap-3 lg:order-none lg:col-span-1">
            <span aria-current="page" className="inline-flex h-10 items-center rounded-full border border-[var(--color-lime)] bg-[var(--color-lime)]/10 px-5 text-sm font-semibold text-[var(--color-lime)]">
              Tableau de bord
            </span>
            <button type="button" disabled className="inline-flex h-10 cursor-not-allowed items-center rounded-full border border-transparent px-5 text-sm font-semibold text-[var(--color-muted)]">
              Statistiques
            </button>
          </nav>

          <div className="flex items-center justify-self-end gap-3">
            <div className="hidden rounded-full bg-[var(--color-surface)] px-5 py-2.5 text-right sm:block">
              <p className="max-w-48 truncate text-xs font-semibold text-white">
                {user.email}
              </p>
              <p className="mt-0.5 flex items-center justify-end gap-1.5 text-[10px] text-[var(--color-muted)]">
                <span className="size-1.5 animate-pulse rounded-full bg-[var(--color-lime)]" />
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

        <section className="pt-8 pb-12 sm:pt-10">
          <div className="grid gap-4 md:grid-cols-3">
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
