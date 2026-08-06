import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { calculateListingTax } from "@/features/items/acquisitions/calculations";
import { StatisticsDashboard } from "@/features/items/statistics/statistics-dashboard";
import type {
  EquipmentStatistic,
  ProfessionStatistic,
  StatisticsSummary,
} from "@/features/items/statistics/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Statistiques",
  robots: { index: false, follow: false },
};

type StatisticAccumulator = {
  itemsSold: number;
  invested: number;
  revenue: number;
  profit: number;
};

type EquipmentAccumulator = StatisticAccumulator & {
  itemId: string;
  itemName: string;
  imageUrl: string | null;
  itemType: string | null;
  itemLevel: number | null;
  profession: string;
  weightedSaleDays: number;
};

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

function calculateProfitRate({ invested, profit }: StatisticAccumulator) {
  return invested === 0 ? null : (profit / invested) * 100;
}

export default async function StatisticsPage() {
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
      quantity_sold,
      sale_unit_price,
      sold_at,
      acquisition_lots!inner(
        item_id,
        acquisition_unit_cost,
        initial_listing_unit_price,
        listed_at,
        items!inner(name, image_url, item_type, level),
        professions!inner(name)
      )
    `)
    .eq("user_id", user.id);

  if (salesError) {
    console.error("Could not load statistics", salesError);
  }

  const summary: StatisticsSummary = {
    itemsSold: 0,
    invested: 0,
    revenue: 0,
    profit: 0,
  };
  const professionAccumulators = new Map<string, StatisticAccumulator>();
  const equipmentAccumulators = new Map<string, EquipmentAccumulator>();

  for (const sale of saleRows ?? []) {
    const acquisition = sale.acquisition_lots;
    const quantity = sale.quantity_sold;
    const invested = acquisition.acquisition_unit_cost * quantity;
    const revenue = sale.sale_unit_price * quantity;
    const tax =
      calculateListingTax(acquisition.initial_listing_unit_price, 1) * quantity;
    const profit = revenue - invested - tax;
    const professionName = acquisition.professions.name;
    const saleDays = Math.max(
      (new Date(sale.sold_at).getTime() -
        new Date(acquisition.listed_at).getTime()) /
        MILLISECONDS_PER_DAY,
      0,
    );

    summary.itemsSold += quantity;
    summary.invested += invested;
    summary.revenue += revenue;
    summary.profit += profit;

    const profession = professionAccumulators.get(professionName) ?? {
      itemsSold: 0,
      invested: 0,
      revenue: 0,
      profit: 0,
    };
    profession.itemsSold += quantity;
    profession.invested += invested;
    profession.revenue += revenue;
    profession.profit += profit;
    professionAccumulators.set(professionName, profession);

    const item = equipmentAccumulators.get(acquisition.item_id) ?? {
      itemId: acquisition.item_id,
      itemName: acquisition.items.name,
      imageUrl: acquisition.items.image_url,
      itemType: acquisition.items.item_type,
      itemLevel: acquisition.items.level,
      profession: professionName,
      itemsSold: 0,
      invested: 0,
      revenue: 0,
      profit: 0,
      weightedSaleDays: 0,
    };
    item.itemsSold += quantity;
    item.invested += invested;
    item.revenue += revenue;
    item.profit += profit;
    item.weightedSaleDays += saleDays * quantity;
    equipmentAccumulators.set(acquisition.item_id, item);
  }

  const professions: ProfessionStatistic[] = Array.from(
    professionAccumulators,
    ([profession, totals]) => ({
      profession,
      ...totals,
      profitRate: calculateProfitRate(totals),
    }),
  ).sort((first, second) => second.profit - first.profit);

  const equipment: EquipmentStatistic[] = Array.from(
    equipmentAccumulators.values(),
    (item) => {
      const averageUnitProfit = item.profit / item.itemsSold;
      const averageDaysToSell = item.weightedSaleDays / item.itemsSold;

      return {
        ...item,
        profitRate: calculateProfitRate(item),
        averageUnitProfit,
        averageDaysToSell,
        averageDailyProfit:
          averageUnitProfit / Math.max(averageDaysToSell, 1),
      };
    },
  )
    .sort((first, second) => second.profit - first.profit)
    .slice(0, 10);

  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-[calc(100vh-26px)] max-w-[1440px] flex-col px-5 py-5 sm:px-8 lg:px-12">
        <AppHeader activePage="statistics" email={user.email ?? ""} />
        <StatisticsDashboard
          summary={summary}
          professions={professions}
          equipment={equipment}
        />
        <SiteFooter />
      </div>
    </main>
  );
}
