"use client";

import { useEffect, useRef, useState } from "react";

import type { EquipmentSearchResult } from "@/features/items/dofusdude/types";

type SearchResponse =
  | { success: true; items: EquipmentSearchResult[] }
  | { success: false; error: string; message: string };

const tableColumns = [
  "Équipement",
  "Métier",
  "Quantité",
  "Coût unitaire",
  "Prix affiché",
  "Mise en vente",
  "Statut",
];

const professions = [
  "Bijoutier",
  "Cordonnier",
  "Tailleur",
  "Forgeron",
  "Sculpteur",
  "Façonneur",
  "Bricoleur",
] as const;

function suggestProfession(itemType: string) {
  const normalizedType = itemType.toLocaleLowerCase("fr");

  if (["anneau", "amulette"].some((type) => normalizedType.includes(type))) return "Bijoutier";
  if (["bottes", "ceinture"].some((type) => normalizedType.includes(type))) return "Cordonnier";
  if (["chapeau", "cape", "sac à dos"].some((type) => normalizedType.includes(type))) return "Tailleur";
  if (["épée", "dague", "marteau", "pelle", "hache", "faux", "pioche"].some((type) => normalizedType.includes(type))) return "Forgeron";
  if (["arc", "baguette", "bâton"].some((type) => normalizedType.includes(type))) return "Sculpteur";
  if (["bouclier", "trophée", "idole"].some((type) => normalizedType.includes(type))) return "Façonneur";

  return "";
}

export function AcquisitionWorkspace() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<EquipmentSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EquipmentSearchResult | null>(null);
  const [acquisitionType, setAcquisitionType] = useState<"craft" | "purchase">("craft");
  const [quantity, setQuantity] = useState("1");
  const [profession, setProfession] = useState("");
  const [isProfessionMenuOpen, setIsProfessionMenuOpen] = useState(false);
  const [unitCost, setUnitCost] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [isForgemaged, setIsForgemaged] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const professionMenuRef = useRef<HTMLDivElement>(null);

  function closeModal() {
    setIsOpen(false);
    setQuery("");
    setItems([]);
    setError(null);
    setSelectedItem(null);
    setAcquisitionType("craft");
    setQuantity("1");
    setProfession("");
    setIsProfessionMenuOpen(false);
    setUnitCost("");
    setListingPrice("");
    setIsForgemaged(false);
  }

  function selectItem(item: EquipmentSearchResult) {
    setSelectedItem(item);
    setProfession(suggestProfession(item.type));
    setQuery("");
    setItems([]);
    setError(null);
  }

  function changeItem() {
    setSelectedItem(null);
    setProfession("");
    setIsProfessionMenuOpen(false);
  }

  function updateQuery(value: string) {
    setQuery(value);

    if (value.trim().length < 2) {
      setItems([]);
      setError(null);
      setIsSearching(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    if (!selectedItem) searchInputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (isProfessionMenuOpen) {
        setIsProfessionMenuOpen(false);
        return;
      }

      closeModal();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedItem, isProfessionMenuOpen]);

  useEffect(() => {
    if (!isProfessionMenuOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (!professionMenuRef.current?.contains(event.target as Node)) {
        setIsProfessionMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isProfessionMenuOpen]);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (!isOpen || normalizedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/equipment/search?q=${encodeURIComponent(normalizedQuery)}`,
          { signal: controller.signal },
        );
        const result = (await response.json()) as SearchResponse;

        if (!result.success) {
          setItems([]);
          setError(result.message);
          return;
        }

        setItems(result.items);
      } catch (searchError) {
        if (searchError instanceof Error && searchError.name === "AbortError") {
          return;
        }

        setItems([]);
        setError("Impossible d’effectuer la recherche pour le moment.");
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [isOpen, query]);

  return (
    <>
      <section className="surface-card mt-4 overflow-hidden rounded-[28px]">
        <div className="flex flex-col gap-5 border-b border-white/6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="eyebrow text-xs text-[var(--color-lime)]">Inventaire actif</p>
            <h2 className="font-display mt-2 text-4xl font-bold uppercase text-white">Ventes en cours</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Les équipements actuellement placés en hôtel de vente.</p>
          </div>
          <button type="button" onClick={() => setIsOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-lime)] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[var(--color-lime-soft)]">
            <span className="text-xl leading-none">+</span>
            Ajouter une acquisition
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/6">
                {tableColumns.map((column) => (
                  <th key={column} className="eyebrow px-6 py-4 text-[11px] font-bold text-[var(--color-muted)] first:pl-8 last:pr-8">{column}</th>
                ))}
              </tr>
            </thead>
          </table>
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full border border-white/10 bg-white/4 text-2xl text-[var(--color-lime)]">+</div>
            <p className="mt-5 font-semibold text-white">Aucune vente en cours</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--color-muted)]">Ajoutez votre première acquisition pour commencer à suivre sa mise en vente.</p>
          </div>
        </div>
      </section>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="acquisition-modal-title" className="surface-card w-full max-w-2xl overflow-hidden rounded-[28px]">
            <div className="max-h-[calc(100vh-32px)] overflow-y-auto">
            <div className="flex items-start justify-between gap-6 border-b border-white/6 px-6 py-5 sm:px-8">
              <div>
                <p className="eyebrow text-xs text-[var(--color-orange)]">Nouvelle entrée</p>
                <h2 id="acquisition-modal-title" className="font-display mt-2 text-4xl font-bold uppercase text-white">Ajouter une acquisition</h2>
              </div>
              <button type="button" onClick={closeModal} aria-label="Fermer" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-xl text-[var(--color-muted)] transition hover:border-white/25 hover:text-white">×</button>
            </div>

            <div className="px-6 pt-5 pb-6 sm:px-8">
              {selectedItem ? (
                <form onSubmit={(event) => event.preventDefault()}>
                  <div className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedItem.imageUrl} alt="" className="size-16 shrink-0 rounded-xl bg-white/5 object-contain p-1" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{selectedItem.name}</p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">{selectedItem.type} · Niveau {selectedItem.level}</p>
                    </div>
                    <button type="button" onClick={changeItem} className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-[var(--color-lime)] hover:text-[var(--color-lime)]">Changer</button>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <fieldset>
                      <legend className="eyebrow text-xs text-white">Type d’acquisition</legend>
                      <div className="mt-2 grid h-14 grid-cols-2 rounded-2xl border border-white/10 bg-black/25 p-1">
                        {(["craft", "purchase"] as const).map((type) => (
                          <button key={type} type="button" onClick={() => setAcquisitionType(type)} className={`h-full rounded-xl px-4 text-sm font-semibold transition ${acquisitionType === type ? "bg-[var(--color-lime)] text-black" : "text-[var(--color-muted)] hover:text-white"}`}>
                            {type === "craft" ? "Craft" : "Achat"}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend className="eyebrow text-xs text-white">Équipement forgemagé</legend>
                      <div className="mt-2 grid h-14 grid-cols-2 rounded-2xl border border-white/10 bg-black/25 p-1">
                        {[false, true].map((value) => (
                          <button key={String(value)} type="button" onClick={() => setIsForgemaged(value)} className={`h-full rounded-xl px-4 text-sm font-semibold transition ${isForgemaged === value ? "bg-white text-black" : "text-[var(--color-muted)] hover:text-white"}`}>
                            {value ? "Oui" : "Non"}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <div ref={professionMenuRef} className="relative sm:col-span-2">
                      <span className="eyebrow text-xs text-white">Métier</span>
                      <button type="button" aria-haspopup="listbox" aria-expanded={isProfessionMenuOpen} onClick={() => setIsProfessionMenuOpen((isOpen) => !isOpen)} className={`mt-2 flex h-14 w-full items-center justify-between rounded-2xl border bg-black/25 px-4 text-left text-sm outline-none transition ${isProfessionMenuOpen ? "border-[var(--color-lime)]/70" : "border-white/10 hover:border-white/20"}`}>
                        <span className={profession ? "text-white" : "text-[var(--color-muted)]"}>{profession || "Choisir un métier"}</span>
                        <span aria-hidden="true" className={`text-xs text-[var(--color-muted)] transition ${isProfessionMenuOpen ? "rotate-180" : ""}`}>⌄</span>
                      </button>
                      {isProfessionMenuOpen && (
                        <div role="listbox" aria-label="Métier" className="absolute right-0 left-0 z-20 mt-2 grid grid-cols-2 gap-1 overflow-hidden rounded-2xl border border-white/10 bg-[#202020] p-1.5 shadow-2xl shadow-black/60">
                          {professions.map((professionName) => (
                            <button key={professionName} type="button" role="option" aria-selected={profession === professionName} onClick={() => { setProfession(professionName); setIsProfessionMenuOpen(false); }} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${profession === professionName ? "bg-[var(--color-lime)] text-black" : "text-white hover:bg-white/7"}`}>
                              {professionName}
                              {profession === professionName && <span aria-hidden="true">✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                      <span className="mt-2 block text-xs text-[var(--color-muted)]">Présélectionné automatiquement selon le type d’équipement.</span>
                    </div>

                    <label className="block">
                      <span className="eyebrow text-xs text-white">Coût d’acquisition unitaire</span>
                      <div className="mt-2 flex h-14 items-center rounded-2xl border border-white/10 bg-black/25 px-4 transition focus-within:border-[var(--color-lime)]/70">
                        <input type="text" inputMode="numeric" pattern="[0-9]*" required value={unitCost} onChange={(event) => setUnitCost(event.target.value.replace(/\D/g, ""))} placeholder="0" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[var(--color-muted)]" />
                        <span className="text-xs font-semibold text-[var(--color-muted)]">K</span>
                      </div>
                    </label>

                    <label className="block">
                      <span className="eyebrow text-xs text-white">Prix affiché par unité</span>
                      <div className="mt-2 flex h-14 items-center rounded-2xl border border-white/10 bg-black/25 px-4 transition focus-within:border-[var(--color-lime)]/70">
                        <input type="text" inputMode="numeric" pattern="[0-9]*" required value={listingPrice} onChange={(event) => setListingPrice(event.target.value.replace(/\D/g, ""))} placeholder="0" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[var(--color-muted)]" />
                        <span className="text-xs font-semibold text-[var(--color-muted)]">K</span>
                      </div>
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="eyebrow text-xs text-white">Quantité</span>
                      <input type="text" inputMode="numeric" pattern="[1-9][0-9]*" required value={quantity} onChange={(event) => setQuantity(event.target.value.replace(/\D/g, ""))} className="mt-2 h-14 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none transition focus:border-[var(--color-lime)]/70" />
                    </label>
                  </div>

                  <button type="button" disabled className="mt-5 w-full cursor-not-allowed rounded-full bg-white/8 px-5 py-3.5 text-sm font-semibold text-[var(--color-muted)]">Enregistrement à venir</button>
                </form>
              ) : (
                <>
                  <label htmlFor="equipment-search" className="eyebrow text-xs text-white">Rechercher un équipement</label>
                  <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 transition focus-within:border-[var(--color-lime)]/70">
                    <span aria-hidden="true" className="text-[var(--color-muted)]">⌕</span>
                    <input ref={searchInputRef} id="equipment-search" type="search" value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Ex. Anneau de Brouce" autoComplete="off" className="h-14 w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--color-muted)]" />
                    {isSearching && <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-[var(--color-lime)]" />}
                  </div>
                  <p className="mt-2 text-xs text-[var(--color-muted)]">Saisissez au moins deux caractères. Un maximum de huit équipements sera affiché.</p>

                  <div className="mt-3 overflow-hidden rounded-2xl border border-white/8 bg-black/20">
                    {error ? (
                      <p className="px-5 py-8 text-center text-sm text-[var(--color-orange)]">{error}</p>
                    ) : items.length > 0 ? (
                      <ul className="divide-y divide-white/6">
                        {items.map((item) => (
                          <li key={item.externalId}>
                            <button type="button" onClick={() => selectItem(item)} className="flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-white/5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.imageUrl} alt="" className="size-10 shrink-0 rounded-lg bg-white/5 object-contain p-0.5" />
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{item.name}</span>
                              <span className="shrink-0 text-right text-xs text-[var(--color-muted)]">{item.type} · Niveau {item.level}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="px-5 py-10 text-center text-sm text-[var(--color-muted)]">{query.trim().length >= 2 && isSearching ? "Recherche en cours…" : "Les résultats de recherche apparaîtront ici."}</p>
                    )}
                  </div>
                </>
              )}
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
