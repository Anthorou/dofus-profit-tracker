import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
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
        <AppHeader activePage="dashboard" email={user.email ?? ""} />

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
