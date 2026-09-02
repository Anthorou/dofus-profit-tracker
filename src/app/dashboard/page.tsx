import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { AcquisitionWorkspace } from "@/features/items/components/acquisition-workspace";
import { calculatePotentialProfit } from "@/features/items/acquisitions/calculations";
import type { ActiveAcquisition } from "@/features/items/acquisitions/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Tableau de bord",
  robots: { index: false, follow: false },
};

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
      <div className="mx-auto flex min-h-[calc(100vh-26px)] max-w-[1440px] flex-col px-5 py-5 sm:px-8 lg:px-12">
        <AppHeader activePage="dashboard" email={user.email ?? ""} />

        <section className="pt-6 pb-12 sm:pt-10">
          <div className="grid gap-2.5 md:grid-cols-3 md:gap-4">
            {previewCards.map((card) => (
              <article
                key={card.label}
                className="surface-card rounded-2xl p-4 md:min-h-56 md:rounded-[28px] md:p-6"
              >
                <div className="flex items-center justify-between">
                  <p className="eyebrow text-xs text-[var(--color-muted)]">
                    {card.label}
                  </p>
                  <span
                    className={`size-2.5 rounded-full md:size-3 ${
                      card.accent === "lime"
                        ? "bg-[var(--color-lime)]"
                        : card.accent === "orange"
                          ? "bg-[var(--color-orange)]"
                          : "bg-white"
                    }`}
                  />
                </div>
                <p className="font-display mt-2 text-4xl leading-none font-bold text-white md:mt-8 md:text-7xl">
                  {card.value}
                </p>
                <p className="mt-1.5 text-xs leading-5 text-[var(--color-muted)] md:mt-8 md:text-sm md:leading-6">
                  {card.detail}
                </p>
              </article>
            ))}
          </div>

          <AcquisitionWorkspace acquisitions={acquisitions} />
        </section>
        <SiteFooter />
      </div>
    </main>
  );
}
