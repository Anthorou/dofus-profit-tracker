import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { SaleHistoryTable } from "@/features/items/sales/sale-history-table";
import type { SaleHistoryEntry } from "@/features/items/sales/types";
import { createClient } from "@/lib/supabase/server";

export default async function SalesHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: saleRows, error: salesError } = await supabase
    .from("sales")
    .select(`
      id,
      acquisition_lot_id,
      quantity_sold,
      sale_unit_price,
      sold_at,
      created_at,
      acquisition_lots!inner(
        acquisition_unit_cost,
        initial_listing_unit_price,
        quantity_acquired,
        items!inner(name, image_url, item_type, level)
      )
    `)
    .eq("user_id", user.id)
    .order("sold_at", { ascending: true })
    .order("created_at", { ascending: true });

  if (salesError) {
    console.error("Could not load sales history", salesError);
  }

  const rows = saleRows ?? [];
  const eventQuantities = new Map<string, number>();

  for (const row of rows) {
    const eventKey = `${row.acquisition_lot_id}:${row.sold_at}`;
    eventQuantities.set(
      eventKey,
      (eventQuantities.get(eventKey) ?? 0) + row.quantity_sold,
    );
  }

  const soldByAcquisition = new Map<string, number>();
  const processedEvents = new Set<string>();
  const sales: SaleHistoryEntry[] = rows.map((row) => {
    const eventKey = `${row.acquisition_lot_id}:${row.sold_at}`;

    if (!processedEvents.has(eventKey)) {
      soldByAcquisition.set(
        row.acquisition_lot_id,
        (soldByAcquisition.get(row.acquisition_lot_id) ?? 0) +
          (eventQuantities.get(eventKey) ?? 0),
      );
      processedEvents.add(eventKey);
    }

    return {
      id: row.id,
      acquisitionId: row.acquisition_lot_id,
      soldAt: row.sold_at,
      itemName: row.acquisition_lots.items.name,
      itemType: row.acquisition_lots.items.item_type,
      itemLevel: row.acquisition_lots.items.level,
      imageUrl: row.acquisition_lots.items.image_url,
      quantitySold: row.quantity_sold,
      acquisitionUnitCost: row.acquisition_lots.acquisition_unit_cost,
      initialListingUnitPrice:
        row.acquisition_lots.initial_listing_unit_price,
      saleUnitPrice: row.sale_unit_price,
      completedAcquisition:
        (soldByAcquisition.get(row.acquisition_lot_id) ?? 0) >=
        row.acquisition_lots.quantity_acquired,
    };
  }).reverse();

  return (
    <main className="app-shell">
      <div className="mx-auto min-h-[calc(100vh-26px)] max-w-[1440px] px-5 py-5 sm:px-8 lg:px-12">
        <AppHeader activePage="sales-history" email={user.email ?? ""} />
        <div className="pt-8 pb-12 sm:pt-10">
          <SaleHistoryTable sales={sales} />
        </div>
      </div>
    </main>
  );
}
