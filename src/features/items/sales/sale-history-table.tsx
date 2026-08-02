"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  calculateListingTax,
  calculateRealizedProfitRate,
  calculateRealizedUnitProfit,
} from "@/features/items/acquisitions/calculations";
import { deleteAcquisitionHistoryAction } from "@/features/items/actions/delete-acquisition-history";
import type { SaleHistoryEntry } from "@/features/items/sales/types";

const numberFormatter = new Intl.NumberFormat("fr-CA");
const dateFormatter = new Intl.DateTimeFormat("fr-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const profitColorStops = [
  { rate: 0, color: [248, 113, 113] },
  { rate: 30, color: [255, 159, 28] },
  { rate: 60, color: [250, 204, 21] },
  { rate: 95, color: [120, 217, 107] },
  { rate: 150, color: [168, 255, 90] },
] as const;

type SaleSortKey = "date" | "equipment" | "status";
type SortDirection = "asc" | "desc";

function normalizeTableSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr");
}

function getProfitColor(rate: number) {
  const clampedRate = Math.min(Math.max(rate, 0), 150);
  const upperStopIndex = profitColorStops.findIndex(
    (stop) => stop.rate >= clampedRate,
  );

  if (upperStopIndex <= 0) {
    const [red, green, blue] = profitColorStops[0].color;
    return `rgb(${red} ${green} ${blue})`;
  }

  const lowerStop = profitColorStops[upperStopIndex - 1];
  const upperStop = profitColorStops[upperStopIndex];
  const progress =
    (clampedRate - lowerStop.rate) / (upperStop.rate - lowerStop.rate);
  const color = lowerStop.color.map((channel, index) =>
    Math.round(channel + (upperStop.color[index] - channel) * progress),
  );

  return `rgb(${color[0]} ${color[1]} ${color[2]})`;
}

export function SaleHistoryTable({ sales }: { sales: SaleHistoryEntry[] }) {
  const router = useRouter();
  const [isDeleting, startDeletionTransition] = useTransition();
  const [tableSearch, setTableSearch] = useState("");
  const [sortKey, setSortKey] = useState<SaleSortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [actionsMenu, setActionsMenu] = useState<{
    sale: SaleHistoryEntry;
    top: number;
    left: number;
  } | null>(null);
  const [deletionCandidate, setDeletionCandidate] = useState<SaleHistoryEntry | null>(null);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const visibleSales = sales
    .filter((sale) =>
      normalizeTableSearch(sale.itemName).includes(
        normalizeTableSearch(tableSearch.trim()),
      ),
    )
    .sort((first, second) => {
      let comparison = 0;

      if (sortKey === "date") {
        comparison =
          new Date(first.soldAt).getTime() - new Date(second.soldAt).getTime();
      } else if (sortKey === "equipment") {
        comparison = first.itemName.localeCompare(second.itemName, "fr", {
          sensitivity: "base",
        });
      } else {
        comparison =
          Number(first.completedAcquisition) - Number(second.completedAcquisition);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  const candidateSalesCount = deletionCandidate
    ? sales.filter(
        (sale) => sale.acquisitionId === deletionCandidate.acquisitionId,
      ).length
    : 0;

  function toggleSort(nextSortKey: SaleSortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "date" ? "desc" : "asc");
  }

  function sortIndicator(column: SaleSortKey) {
    if (sortKey !== column) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  }

  function toggleActionsMenu(
    event: React.MouseEvent<HTMLButtonElement>,
    sale: SaleHistoryEntry,
  ) {
    if (actionsMenu?.sale.id === sale.id) {
      setActionsMenu(null);
      return;
    }

    const buttonBounds = event.currentTarget.getBoundingClientRect();
    const menuWidth = 248;
    const menuHeight = 60;
    const shouldOpenAbove =
      window.innerHeight - buttonBounds.bottom < menuHeight + 16;

    setActionsMenu({
      sale,
      top: shouldOpenAbove
        ? Math.max(16, buttonBounds.top - menuHeight - 8)
        : buttonBounds.bottom + 8,
      left: Math.max(16, buttonBounds.right - menuWidth),
    });
  }

  useEffect(() => {
    if (!actionsMenu) return;

    function closeActionsMenu(event: PointerEvent) {
      if (!actionsMenuRef.current?.contains(event.target as Node)) {
        setActionsMenu(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActionsMenu(null);
    }

    function handleViewportChange() {
      setActionsMenu(null);
    }

    window.addEventListener("pointerdown", closeActionsMenu);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("pointerdown", closeActionsMenu);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [actionsMenu]);

  function confirmDeletion() {
    if (!deletionCandidate) return;

    setDeletionError(null);
    startDeletionTransition(async () => {
      const result = await deleteAcquisitionHistoryAction(
        deletionCandidate.acquisitionId,
      );

      if (!result.success) {
        setDeletionError(result.message);
        return;
      }

      setDeletionCandidate(null);
      router.refresh();
    });
  }

  return (
    <>
      <section className="surface-card mt-8 overflow-hidden rounded-[28px]">
      <div className="flex flex-col gap-3 border-b border-white/6 px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-xs text-[var(--color-lime)]">Transactions terminées</p>
          <h1 className="font-display mt-2 text-4xl font-bold uppercase text-white">Historique des ventes</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Chaque ligne correspond à un prix de vente réellement enregistré.</p>
        </div>
        <p className="text-xs text-[var(--color-muted)]">{sales.length} vente{sales.length === 1 ? "" : "s"}</p>
      </div>

      <div className="flex items-center justify-end gap-3 border-b border-white/6 px-6 py-3 sm:px-8">
        {tableSearch && (
          <p className="hidden text-[11px] whitespace-nowrap text-[var(--color-muted)] sm:block">{visibleSales.length} résultat{visibleSales.length === 1 ? "" : "s"}</p>
        )}
        <label className="flex h-9 w-64 max-w-full items-center gap-2.5 rounded-xl border border-white/10 bg-black/25 px-3 transition focus-within:border-[var(--color-lime)]/60">
          <span aria-hidden="true" className="text-sm text-[var(--color-muted)]">⌕</span>
          <input type="search" value={tableSearch} onChange={(event) => setTableSearch(event.target.value)} placeholder="Rechercher un équipement" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-[10px] placeholder:text-[var(--color-muted)]" />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1220px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/6">
              {[
                "Date",
                "Équipement",
                "Quantité",
                "Coût unitaire",
                "Prix vendu",
                "Taxe HDV",
                "Profit unitaire",
                "Profit total",
                "Profit (%)",
                "Statut",
                "",
              ].map((column) => {
                const sortableKey =
                  column === "Date"
                    ? "date"
                    : column === "Équipement"
                      ? "equipment"
                      : column === "Statut"
                        ? "status"
                        : null;

                return (
                  <th key={column} className={`eyebrow px-3 py-4 text-[10px] font-bold whitespace-nowrap text-[var(--color-muted)] first:pl-6 last:pr-6 ${column === "Quantité" || column === "Statut" ? "text-center" : ""}`}>
                    {sortableKey ? (
                      <button type="button" onClick={() => toggleSort(sortableKey)} className="inline-flex items-center gap-1 transition hover:text-white">
                        {column}
                        <span aria-hidden="true" className={sortKey === sortableKey ? "text-[var(--color-lime)]" : "text-white/25"}>{sortIndicator(sortableKey)}</span>
                      </button>
                    ) : column}
                  </th>
                );
              })}
            </tr>
          </thead>
          {visibleSales.length > 0 && (
            <tbody>
              {visibleSales.map((sale) => {
                const tax = calculateListingTax(sale.initialListingUnitPrice, 1);
                const unitProfit = calculateRealizedUnitProfit({
                  acquisitionUnitCost: sale.acquisitionUnitCost,
                  saleUnitPrice: sale.saleUnitPrice,
                  initialListingUnitPrice: sale.initialListingUnitPrice,
                });
                const totalProfit = unitProfit * sale.quantitySold;
                const profitRate = calculateRealizedProfitRate({
                  acquisitionUnitCost: sale.acquisitionUnitCost,
                  saleUnitPrice: sale.saleUnitPrice,
                  initialListingUnitPrice: sale.initialListingUnitPrice,
                });

                return (
                  <tr key={sale.id} className="border-b border-white/6 last:border-b-0 hover:bg-white/[0.025]">
                    <td className="py-4 pr-3 pl-6 text-xs whitespace-nowrap text-[var(--color-muted)]">{dateFormatter.format(new Date(sale.soldAt))}</td>
                    <td className="px-3 py-4">
                      <div className="flex min-w-52 items-center gap-3">
                        {sale.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sale.imageUrl} alt="" className="size-10 shrink-0 rounded-lg bg-white/5 object-contain p-1" />
                        ) : (
                          <span className="size-10 shrink-0 rounded-lg bg-white/5" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">{sale.itemName}</p>
                          <p className="mt-1 truncate text-[10px] text-[var(--color-muted)]">
                            {sale.itemType ?? "Équipement"}{sale.itemLevel !== null ? ` · Niveau ${sale.itemLevel}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center text-xs font-semibold text-white">{sale.quantitySold}</td>
                    <td className="px-3 py-4 text-xs whitespace-nowrap text-white">{numberFormatter.format(sale.acquisitionUnitCost)} K</td>
                    <td className="px-3 py-4 text-xs font-semibold whitespace-nowrap text-white">{numberFormatter.format(sale.saleUnitPrice)} K</td>
                    <td className="px-3 py-4 text-xs whitespace-nowrap text-white">{numberFormatter.format(tax)} K</td>
                    <td className={`px-3 py-4 text-xs font-semibold whitespace-nowrap ${unitProfit < 0 ? "text-red-400" : "text-white"}`}>{numberFormatter.format(unitProfit)} K</td>
                    <td className={`px-3 py-4 text-xs font-semibold whitespace-nowrap ${totalProfit < 0 ? "text-red-400" : "text-white"}`}>{numberFormatter.format(totalProfit)} K</td>
                    <td className="px-3 py-4 text-xs font-semibold whitespace-nowrap" style={profitRate === null ? undefined : { color: getProfitColor(profitRate) }}>{profitRate === null ? "—" : `${profitRate.toLocaleString("fr-CA", { maximumFractionDigits: 1 })} %`}</td>
                    <td className="py-4 pr-6 pl-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap ${sale.completedAcquisition ? "bg-[var(--color-lime)]/10 text-[var(--color-lime)]" : "bg-[var(--color-orange)]/10 text-[var(--color-orange)]"}`}>
                        <span className={`size-1.5 rounded-full ${sale.completedAcquisition ? "bg-[var(--color-lime)]" : "bg-[var(--color-orange)]"}`} />
                        {sale.completedAcquisition ? "Vente complète" : "Vente partielle"}
                      </span>
                    </td>
                    <td className="py-4 pr-6 pl-1 text-right">
                      <button
                        type="button"
                        aria-label={`Actions pour la vente de ${sale.itemName}`}
                        aria-expanded={actionsMenu?.sale.id === sale.id}
                        onClick={(event) => toggleActionsMenu(event, sale)}
                        className="inline-flex h-8 w-7 items-center justify-center text-sm font-bold tracking-widest text-[var(--color-muted)] transition hover:text-white"
                      >
                        •••
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
      </div>

      {sales.length === 0 && (
        <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full border border-white/10 bg-white/4 text-2xl text-[var(--color-lime)]">✓</div>
          <p className="mt-5 font-semibold text-white">Aucune vente enregistrée</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--color-muted)]">Les ventes partielles et complètes apparaîtront ici dès leur enregistrement.</p>
        </div>
      )}
      {sales.length > 0 && visibleSales.length === 0 && (
        <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
          <p className="font-semibold text-white">Aucun équipement trouvé</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Essaie un autre nom d’équipement.</p>
        </div>
      )}
      </section>

      {actionsMenu && (
        <div
          ref={actionsMenuRef}
          role="menu"
          aria-label={`Actions pour la vente de ${actionsMenu.sale.itemName}`}
          className="fixed z-60 w-62 overflow-hidden rounded-2xl border border-white/10 bg-[#202020] p-1.5 shadow-2xl shadow-black/60"
          style={{ top: actionsMenu.top, left: actionsMenu.left }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setDeletionError(null);
              setDeletionCandidate(actionsMenu.sale);
              setActionsMenu(null);
            }}
            className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-400 transition hover:bg-red-400/10"
          >
            Supprimer le lot et son historique
          </button>
        </div>
      )}

      {deletionCandidate && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeleting) {
              setDeletionCandidate(null);
              setDeletionError(null);
            }
          }}
        >
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-history-title" className="surface-card w-full max-w-md rounded-[28px] p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-red-400/10 text-xl text-red-400">!</div>
              <p className="eyebrow text-xs text-red-400">Action irréversible</p>
            </div>

            <h2 id="delete-history-title" className="font-display mt-5 text-3xl font-bold uppercase text-white">Supprimer le lot et son historique?</h2>

            <div className="mt-4 flex items-center gap-4 rounded-2xl border border-white/8 bg-black/20 p-4">
              {deletionCandidate.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={deletionCandidate.imageUrl} alt="" className="size-14 shrink-0 rounded-xl bg-white/5 object-contain p-1" />
              ) : (
                <span className="size-14 shrink-0 rounded-xl bg-white/5" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{deletionCandidate.itemName}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{candidateSalesCount} vente{candidateSalesCount === 1 ? "" : "s"} supprimée{candidateSalesCount === 1 ? "" : "s"}</p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">Le lot complet, toutes ses ventes et leur contribution aux statistiques seront supprimés. Rien ne réapparaîtra dans le dashboard.</p>

            {deletionError && (
              <p role="alert" className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-400">{deletionError}</p>
            )}

            <div className="mt-7 flex justify-center gap-3">
              <button type="button" disabled={isDeleting} onClick={() => { setDeletionCandidate(null); setDeletionError(null); }} className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/25 disabled:opacity-50">Annuler</button>
              <button type="button" disabled={isDeleting} onClick={confirmDeletion} className="rounded-full bg-red-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-red-300 disabled:opacity-60">{isDeleting ? "Suppression…" : "Tout supprimer"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
