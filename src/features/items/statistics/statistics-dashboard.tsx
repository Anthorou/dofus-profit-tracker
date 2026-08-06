import type {
  EquipmentStatistic,
  ProfessionStatistic,
  StatisticsSummary,
} from "@/features/items/statistics/types";

const numberFormatter = new Intl.NumberFormat("fr-CA");

function formatKamas(value: number) {
  return `${numberFormatter.format(value)} K`;
}

function formatRoundedKamas(value: number) {
  return `${numberFormatter.format(Math.round(value))} K`;
}

function formatSaleDuration(days: number) {
  if (days < 1) {
    return "< 1 jour";
  }

  return `${days.toLocaleString("fr-CA", { maximumFractionDigits: 1 })} ${days < 2 ? "jour" : "jours"}`;
}

function ProfitRate({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-[var(--color-muted)]">—</span>;
  }

  return (
    <span className={value < 0 ? "text-red-400" : "text-[var(--color-lime)]"}>
      {value.toLocaleString("fr-CA", { maximumFractionDigits: 1 })} %
    </span>
  );
}

type StatisticsDashboardProps = {
  summary: StatisticsSummary;
  professions: ProfessionStatistic[];
  equipment: EquipmentStatistic[];
};

export function StatisticsDashboard({
  summary,
  professions,
  equipment,
}: StatisticsDashboardProps) {
  const summaryCards = [
    {
      label: "Objets vendus",
      value: numberFormatter.format(summary.itemsSold),
      detail: "Unités réellement vendues",
      accent: "lime",
    },
    {
      label: "Kamas investis",
      value: formatKamas(summary.invested),
      detail: "Coût des unités vendues",
      accent: "orange",
    },
    {
      label: "Revenus",
      value: formatKamas(summary.revenue),
      detail: "Prix de vente réellement encaissé",
      accent: "white",
    },
    {
      label: "Profit réel",
      value: formatKamas(summary.profit),
      detail: "Après acquisition et taxe HDV",
      accent: summary.profit < 0 ? "red" : "lime",
    },
  ];
  const largestProfessionProfit = Math.max(
    ...professions.map((profession) => Math.abs(profession.profit)),
    1,
  );

  return (
    <div className="pt-8 pb-12 sm:pt-10">
      <div className="mb-6">
        <p className="eyebrow text-xs text-[var(--color-lime)]">Performance globale</p>
        <h1 className="font-display mt-2 text-5xl font-bold uppercase text-white">Statistiques</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">Résultats réels calculés à partir de toutes les ventes enregistrées.</p>
      </div>

      <section aria-label="Aperçu des statistiques" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article key={card.label} className="surface-card min-h-48 rounded-[28px] p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="eyebrow text-xs text-[var(--color-muted)]">{card.label}</p>
              <span className={`size-3 shrink-0 rounded-full ${card.accent === "lime" ? "bg-[var(--color-lime)]" : card.accent === "orange" ? "bg-[var(--color-orange)]" : card.accent === "red" ? "bg-red-400" : "bg-white"}`} />
            </div>
            <p className={`font-display mt-7 text-5xl leading-none font-bold break-words ${card.label === "Profit réel" ? (card.accent === "red" ? "text-red-400" : "text-[var(--color-lime)]") : "text-white"}`}>{card.value}</p>
            <p className="mt-7 text-xs leading-5 text-[var(--color-muted)]">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
        <article className="surface-card overflow-hidden rounded-[28px]">
          <div className="border-b border-white/6 px-6 py-6">
            <p className="eyebrow text-xs text-[var(--color-orange)]">Répartition</p>
            <h2 className="font-display mt-2 text-3xl font-bold uppercase text-white">Performance par métier</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/6">
                  {['#', 'Métier', 'Objets', 'Investis', 'Revenus', 'Profit', 'Profit (%)'].map((column) => (
                    <th key={column} className="eyebrow px-3 py-4 text-[10px] font-bold whitespace-nowrap text-[var(--color-muted)] first:pl-6 last:pr-6">{column}</th>
                  ))}
                </tr>
              </thead>
              {professions.length > 0 && (
                <tbody>
                  {professions.map((profession, index) => (
                    <tr key={profession.profession} className="border-b border-white/6 last:border-b-0 hover:bg-white/[0.025]">
                      <td className="py-4 pr-3 pl-6 text-xs font-semibold text-[var(--color-muted)]">{index + 1}</td>
                      <td className="px-3 py-4 text-xs font-semibold text-white">{profession.profession}</td>
                      <td className="px-3 py-4 text-xs text-white">{numberFormatter.format(profession.itemsSold)}</td>
                      <td className="px-3 py-4 text-xs whitespace-nowrap text-white">{formatKamas(profession.invested)}</td>
                      <td className="px-3 py-4 text-xs whitespace-nowrap text-white">{formatKamas(profession.revenue)}</td>
                      <td className={`px-3 py-4 text-xs font-semibold whitespace-nowrap ${profession.profit < 0 ? "text-red-400" : "text-white"}`}>{formatKamas(profession.profit)}</td>
                      <td className="py-4 pr-6 pl-3 text-xs font-semibold whitespace-nowrap"><ProfitRate value={profession.profitRate} /></td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
          {professions.length === 0 && (
            <div className="flex min-h-52 items-center justify-center px-6 text-center text-sm text-[var(--color-muted)]">Enregistre une vente pour voir la performance par métier.</div>
          )}
        </article>

        <article className="surface-card rounded-[28px] p-6">
          <p className="eyebrow text-xs text-[var(--color-lime)]">Comparaison</p>
          <h2 className="font-display mt-2 text-3xl font-bold uppercase text-white">Profit par métier</h2>
          {professions.length > 0 ? (
            <div className="mt-7 space-y-5">
              {professions.map((profession) => (
                <div key={profession.profession}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-xs">
                    <span className="font-semibold text-white">{profession.profession}</span>
                    <span className={profession.profit < 0 ? "font-semibold text-red-400" : "font-semibold text-[var(--color-lime)]"}>{formatKamas(profession.profit)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/6">
                    <div className={`h-full rounded-full ${profession.profit < 0 ? "bg-red-400" : "bg-gradient-to-r from-[var(--color-orange)] via-yellow-400 to-[var(--color-lime)]"}`} style={{ width: `${Math.max((Math.abs(profession.profit) / largestProfessionProfit) * 100, 2)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-72 items-center justify-center text-center text-sm text-[var(--color-muted)]">Le graphique apparaîtra après ta première vente.</div>
          )}
        </article>
      </section>

      <section className="surface-card mt-4 overflow-hidden rounded-[28px]">
        <div className="border-b border-white/6 px-6 py-6">
          <p className="eyebrow text-xs text-[var(--color-lime)]">Classement</p>
          <h2 className="font-display mt-2 text-3xl font-bold uppercase text-white">Top 10 des équipements</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Les équipements ayant généré le plus de profit réel.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/6">
                {['Rang', 'Équipement', 'Métier', 'Quantité', 'Revenus', 'Profit', 'Profit (%)', 'Profit moyen', 'Vente moyenne', 'Profit quotidien'].map((column) => (
                  <th key={column} className={`eyebrow px-3 py-4 text-[10px] font-bold whitespace-nowrap text-[var(--color-muted)] first:pl-6 last:pr-6 ${column === "Quantité" ? "text-center" : ""}`}>
                    {column === "Profit quotidien" ? (
                      <span className="inline-flex items-center gap-1.5">
                        Profit quotidien
                        <span tabIndex={0} className="group/daily-profit relative inline-flex cursor-help outline-none">
                          <span aria-hidden="true" className="flex size-4 items-center justify-center rounded-full border border-white/15 font-sans text-[9px] normal-case text-[var(--color-muted)]">?</span>
                          <span role="tooltip" className="pointer-events-none absolute top-full right-0 z-30 mt-2 hidden w-64 rounded-xl border border-white/10 bg-[#242424] p-3 text-left font-sans text-[11px] font-medium tracking-normal whitespace-normal normal-case shadow-2xl shadow-black/60 group-hover/daily-profit:block group-focus/daily-profit:block">
                            Profit réel moyen par unité, divisé par le temps de vente moyen. Un délai inférieur à 24 heures compte comme une journée.
                          </span>
                        </span>
                      </span>
                    ) : column}
                  </th>
                ))}
              </tr>
            </thead>
            {equipment.length > 0 && (
              <tbody>
                {equipment.map((item, index) => (
                  <tr key={item.itemId} className="border-b border-white/6 last:border-b-0 hover:bg-white/[0.025]">
                    <td className="py-4 pr-3 pl-6 text-sm font-bold text-[var(--color-lime)]">#{index + 1}</td>
                    <td className="px-3 py-4">
                      <div className="flex min-w-56 items-center gap-3">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt="" className="size-11 shrink-0 rounded-lg bg-white/5 object-contain p-1" />
                        ) : (
                          <span className="size-11 shrink-0 rounded-lg bg-white/5" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">{item.itemName}</p>
                          <p className="mt-1 text-[10px] text-[var(--color-muted)]">{item.itemType ?? "Équipement"}{item.itemLevel !== null ? ` · Niveau ${item.itemLevel}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-xs text-white">{item.profession}</td>
                    <td className="px-3 py-4 text-center text-xs font-semibold text-white">{numberFormatter.format(item.itemsSold)}</td>
                    <td className="px-3 py-4 text-xs whitespace-nowrap text-white">{formatKamas(item.revenue)}</td>
                    <td className={`px-3 py-4 text-xs font-semibold whitespace-nowrap ${item.profit < 0 ? "text-red-400" : "text-white"}`}>{formatKamas(item.profit)}</td>
                    <td className="px-3 py-4 text-xs font-semibold whitespace-nowrap"><ProfitRate value={item.profitRate} /></td>
                    <td className={`px-3 py-4 text-xs font-semibold whitespace-nowrap ${item.averageUnitProfit < 0 ? "text-red-400" : "text-white"}`}>{formatRoundedKamas(item.averageUnitProfit)}</td>
                    <td className="px-3 py-4 text-xs whitespace-nowrap text-white">{formatSaleDuration(item.averageDaysToSell)}</td>
                    <td className={`py-4 pr-6 pl-3 text-xs font-semibold whitespace-nowrap ${item.averageDailyProfit < 0 ? "text-red-400" : "text-[var(--color-lime)]"}`}>{formatRoundedKamas(item.averageDailyProfit)}</td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {equipment.length === 0 && (
          <div className="flex min-h-60 flex-col items-center justify-center px-6 py-12 text-center">
            <p className="font-semibold text-white">Aucun équipement à classer</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Les équipements vendus seront regroupés ici.</p>
          </div>
        )}
      </section>
    </div>
  );
}
