"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  createAcquisitionAction,
  type CreateAcquisitionInput,
} from "@/features/items/actions/create-acquisition";
import {
  createSaleAction,
  type CreateSaleInput,
} from "@/features/items/actions/create-sale";
import { deleteAcquisitionAction } from "@/features/items/actions/delete-acquisition";
import {
  updateAcquisitionAction,
  type UpdateAcquisitionInput,
} from "@/features/items/actions/update-acquisition";
import { updateListingPriceAction } from "@/features/items/actions/update-listing-price";
import {
  calculateListingTax,
  calculatePotentialProfitRate,
  calculatePotentialUnitProfit,
} from "@/features/items/acquisitions/calculations";
import type { ActiveAcquisition } from "@/features/items/acquisitions/types";
import type { EquipmentSearchResult } from "@/features/items/dofusdude/types";

type SearchResponse =
  | { success: true; items: EquipmentSearchResult[] }
  | { success: false; error: string; message: string };

const tableColumns = [
  "Mise en vente",
  "Équipement",
  "Acquisition",
  "Quantité",
  "Coût unitaire",
  "Prix affiché",
  "Taxe HDV",
  "Profit (%)",
  "Profit",
  "Statut",
];

const numberFormatter = new Intl.NumberFormat("fr-CA");
const dateFormatter = new Intl.DateTimeFormat("fr-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const professions = [
  "Bijoutier",
  "Cordonnier",
  "Tailleur",
  "Forgeron",
  "Sculpteur",
  "Façonneur",
  "Bricoleur",
] as const;

const profitColorStops = [
  { rate: 0, color: [248, 113, 113] },
  { rate: 30, color: [255, 159, 28] },
  { rate: 60, color: [250, 204, 21] },
  { rate: 95, color: [120, 217, 107] },
  { rate: 150, color: [168, 255, 90] },
] as const;

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

function PotentialProfitRate({ acquisition }: { acquisition: ActiveAcquisition }) {
  const rate = calculatePotentialProfitRate({
    acquisitionUnitCost: acquisition.unitCost,
    currentListingUnitPrice: acquisition.listingPrice,
    initialListingUnitPrice: acquisition.initialListingPrice,
    quantity: acquisition.quantity,
  });

  if (rate === null) {
    return <span className="text-[var(--color-muted)]">—</span>;
  }

  return (
    <span
      className="font-semibold whitespace-nowrap"
      style={{ color: getProfitColor(rate) }}
    >
      {rate.toLocaleString("fr-CA", { maximumFractionDigits: 1 })} %
    </span>
  );
}

function PotentialUnitProfit({ acquisition }: { acquisition: ActiveAcquisition }) {
  const profit = calculatePotentialUnitProfit({
    acquisitionUnitCost: acquisition.unitCost,
    currentListingUnitPrice: acquisition.listingPrice,
    initialListingUnitPrice: acquisition.initialListingPrice,
  });

  if (profit < 0) {
    return (
      <span className="font-semibold whitespace-nowrap text-red-400">
        {numberFormatter.format(profit)} K
      </span>
    );
  }

  return (
    <span className="whitespace-nowrap text-white">
      {numberFormatter.format(profit)} K
    </span>
  );
}

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

type AcquisitionWorkspaceProps = {
  acquisitions: ActiveAcquisition[];
};

type ActionsMenuState = {
  acquisition: ActiveAcquisition;
  top: number;
  left: number;
};

type SalePriceGroup = {
  id: number;
  quantity: string;
  unitPrice: string;
};

type AcquisitionSortKey = "date" | "equipment" | "status";
type SortDirection = "asc" | "desc";

function normalizeTableSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr");
}

export function AcquisitionWorkspace({ acquisitions }: AcquisitionWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeletionTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();
  const [isUpdatingListingPrice, startListingPriceTransition] = useTransition();
  const [isRecordingSale, startSaleTransition] = useTransition();
  const [tableSearch, setTableSearch] = useState("");
  const [sortKey, setSortKey] = useState<AcquisitionSortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
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
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [actionsMenu, setActionsMenu] = useState<ActionsMenuState | null>(null);
  const [deletionCandidate, setDeletionCandidate] = useState<ActiveAcquisition | null>(null);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [editingAcquisition, setEditingAcquisition] = useState<ActiveAcquisition | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isPriceChangeConfirmationOpen, setIsPriceChangeConfirmationOpen] = useState(false);
  const [listingPriceCandidate, setListingPriceCandidate] = useState<ActiveAcquisition | null>(null);
  const [listingPriceError, setListingPriceError] = useState<string | null>(null);
  const [saleCandidate, setSaleCandidate] = useState<ActiveAcquisition | null>(null);
  const [salePricingMode, setSalePricingMode] = useState<"same" | "different">("same");
  const [saleQuantity, setSaleQuantity] = useState("1");
  const [saleUnitPrice, setSaleUnitPrice] = useState("");
  const [saleGroups, setSaleGroups] = useState<SalePriceGroup[]>([
    { id: 1, quantity: "1", unitPrice: "" },
  ]);
  const [saleError, setSaleError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const professionMenuRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const nextSaleGroupId = useRef(2);

  const visibleAcquisitions = acquisitions
    .filter((acquisition) =>
      normalizeTableSearch(acquisition.itemName).includes(
        normalizeTableSearch(tableSearch.trim()),
      ),
    )
    .sort((first, second) => {
      let comparison = 0;

      if (sortKey === "date") {
        comparison =
          new Date(first.listedAt).getTime() - new Date(second.listedAt).getTime();
      } else if (sortKey === "equipment") {
        comparison = first.itemName.localeCompare(second.itemName, "fr", {
          sensitivity: "base",
        });
      } else {
        comparison = Number(first.quantitySold > 0) - Number(second.quantitySold > 0);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

  function toggleSort(nextSortKey: AcquisitionSortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "date" ? "desc" : "asc");
  }

  function sortIndicator(column: AcquisitionSortKey) {
    if (sortKey !== column) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  }

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
    setSubmissionError(null);
  }

  function selectItem(item: EquipmentSearchResult) {
    setSelectedItem(item);
    setProfession(suggestProfession(item.type));
    setQuery("");
    setItems([]);
    setError(null);
    setSubmissionError(null);
  }

  function changeItem() {
    setSelectedItem(null);
    setProfession("");
    setIsProfessionMenuOpen(false);
    setSubmissionError(null);
  }

  const parsedQuantity = Number(quantity);
  const parsedUnitCost = Number(unitCost);
  const parsedListingPrice = Number(listingPrice);
  const isFormValid =
    selectedItem !== null &&
    profession !== "" &&
    quantity !== "" &&
    Number.isSafeInteger(parsedQuantity) &&
    parsedQuantity > 0 &&
    unitCost !== "" &&
    Number.isSafeInteger(parsedUnitCost) &&
    parsedUnitCost >= 0 &&
    listingPrice !== "" &&
    Number.isSafeInteger(parsedListingPrice) &&
    parsedListingPrice > 0;

  function submitAcquisition() {
    if (!selectedItem || !isFormValid) {
      setSubmissionError("Remplis tous les champs obligatoires correctement.");
      return;
    }

    const input: CreateAcquisitionInput = {
      item: selectedItem,
      acquisitionType,
      profession: profession as CreateAcquisitionInput["profession"],
      quantity: parsedQuantity,
      unitCost: parsedUnitCost,
      listingPrice: parsedListingPrice,
      isForgemaged,
    };

    setSubmissionError(null);
    startTransition(async () => {
      const result = await createAcquisitionAction(input);

      if (!result.success) {
        setSubmissionError(result.message);
        return;
      }

      closeModal();
      router.refresh();
    });
  }

  function updateQuery(value: string) {
    setQuery(value);

    if (value.trim().length < 2) {
      setItems([]);
      setError(null);
      setIsSearching(false);
    }
  }

  function toggleActionsMenu(
    event: React.MouseEvent<HTMLButtonElement>,
    acquisition: ActiveAcquisition,
  ) {
    if (actionsMenu?.acquisition.id === acquisition.id) {
      setActionsMenu(null);
      return;
    }

    const buttonBounds = event.currentTarget.getBoundingClientRect();
    const menuWidth = 224;
    const menuHeight = 196;
    const shouldOpenAbove =
      window.innerHeight - buttonBounds.bottom < menuHeight + 16;

    setActionsMenu({
      acquisition,
      top: shouldOpenAbove
        ? Math.max(16, buttonBounds.top - menuHeight - 8)
        : buttonBounds.bottom + 8,
      left: Math.max(16, buttonBounds.right - menuWidth),
    });
  }

  function confirmDeletion() {
    if (!deletionCandidate) return;

    setDeletionError(null);
    startDeletionTransition(async () => {
      const result = await deleteAcquisitionAction(deletionCandidate.id);

      if (!result.success) {
        setDeletionError(result.message);
        return;
      }

      setDeletionCandidate(null);
      router.refresh();
    });
  }

  function openEditModal(acquisition: ActiveAcquisition) {
    setEditingAcquisition(acquisition);
    setAcquisitionType(acquisition.acquisitionType);
    setIsForgemaged(acquisition.isForgemaged);
    setProfession(acquisition.profession);
    setQuantity(String(acquisition.quantity));
    setUnitCost(String(acquisition.unitCost));
    setListingPrice(String(acquisition.initialListingPrice));
    setEditError(null);
    setActionsMenu(null);
  }

  function closeEditModal() {
    setEditingAcquisition(null);
    setAcquisitionType("craft");
    setIsForgemaged(false);
    setProfession("");
    setIsProfessionMenuOpen(false);
    setQuantity("1");
    setUnitCost("");
    setListingPrice("");
    setIsPriceChangeConfirmationOpen(false);
    setEditError(null);
  }

  const isEditFormValid =
    editingAcquisition !== null &&
    profession !== "" &&
    quantity !== "" &&
    Number.isSafeInteger(parsedQuantity) &&
    parsedQuantity > 0 &&
    unitCost !== "" &&
    Number.isSafeInteger(parsedUnitCost) &&
    parsedUnitCost >= 0 &&
    listingPrice !== "" &&
    Number.isSafeInteger(parsedListingPrice) &&
    parsedListingPrice > 0;

  function saveEditedAcquisition() {
    if (!editingAcquisition || !isEditFormValid) {
      setEditError("Remplis tous les champs obligatoires correctement.");
      return;
    }

    const input: UpdateAcquisitionInput = {
      id: editingAcquisition.id,
      acquisitionType,
      profession: profession as UpdateAcquisitionInput["profession"],
      quantity: parsedQuantity,
      unitCost: parsedUnitCost,
      initialListingPrice: parsedListingPrice,
      isForgemaged,
    };

    setEditError(null);
    startUpdateTransition(async () => {
      const result = await updateAcquisitionAction(input);

      if (!result.success) {
        setIsPriceChangeConfirmationOpen(false);
        setEditError(result.message);
        return;
      }

      closeEditModal();
      router.refresh();
    });
  }

  function submitEditedAcquisition() {
    if (!editingAcquisition || !isEditFormValid) {
      setEditError("Remplis tous les champs obligatoires correctement.");
      return;
    }

    if (parsedListingPrice !== editingAcquisition.initialListingPrice) {
      setIsPriceChangeConfirmationOpen(true);
      return;
    }

    saveEditedAcquisition();
  }

  function openListingPriceModal(acquisition: ActiveAcquisition) {
    setListingPriceCandidate(acquisition);
    setListingPrice(String(acquisition.listingPrice));
    setListingPriceError(null);
    setActionsMenu(null);
  }

  function closeListingPriceModal() {
    setListingPriceCandidate(null);
    setListingPrice("");
    setListingPriceError(null);
  }

  function saveListingPrice() {
    if (
      !listingPriceCandidate ||
      listingPrice === "" ||
      !Number.isSafeInteger(parsedListingPrice) ||
      parsedListingPrice <= 0
    ) {
      setListingPriceError("Entre un prix affiché valide.");
      return;
    }

    setListingPriceError(null);
    startListingPriceTransition(async () => {
      const result = await updateListingPriceAction({
        id: listingPriceCandidate.id,
        listingPrice: parsedListingPrice,
      });

      if (!result.success) {
        setListingPriceError(result.message);
        return;
      }

      closeListingPriceModal();
      router.refresh();
    });
  }

  function openSaleModal(acquisition: ActiveAcquisition) {
    setSaleCandidate(acquisition);
    setSalePricingMode("same");
    setSaleQuantity("1");
    setSaleUnitPrice(String(acquisition.listingPrice));
    setSaleGroups([
      { id: 1, quantity: "1", unitPrice: String(acquisition.listingPrice) },
    ]);
    nextSaleGroupId.current = 2;
    setSaleError(null);
    setActionsMenu(null);
  }

  function closeSaleModal() {
    setSaleCandidate(null);
    setSalePricingMode("same");
    setSaleQuantity("1");
    setSaleUnitPrice("");
    setSaleGroups([{ id: 1, quantity: "1", unitPrice: "" }]);
    setSaleError(null);
  }

  function updateSaleGroup(
    id: number,
    field: "quantity" | "unitPrice",
    value: string,
  ) {
    const numericValue = value.replace(/\D/g, "");
    setSaleGroups((groups) =>
      groups.map((group) =>
        group.id === id ? { ...group, [field]: numericValue } : group,
      ),
    );
  }

  function addSaleGroup() {
    setSaleGroups((groups) => [
      ...groups,
      {
        id: nextSaleGroupId.current++,
        quantity: "1",
        unitPrice: saleCandidate ? String(saleCandidate.listingPrice) : "",
      },
    ]);
  }

  function removeSaleGroup(id: number) {
    setSaleGroups((groups) => groups.filter((group) => group.id !== id));
  }

  const parsedSaleGroups: CreateSaleInput["groups"] =
    salePricingMode === "same"
      ? [{ quantity: Number(saleQuantity), unitPrice: Number(saleUnitPrice) }]
      : saleGroups.map((group) => ({
          quantity: Number(group.quantity),
          unitPrice: Number(group.unitPrice),
        }));
  const totalSaleQuantity = parsedSaleGroups.reduce(
    (total, group) => total + group.quantity,
    0,
  );
  const isSaleFormValid =
    saleCandidate !== null &&
    parsedSaleGroups.length > 0 &&
    parsedSaleGroups.every(
      (group) =>
        Number.isSafeInteger(group.quantity) &&
        group.quantity > 0 &&
        Number.isSafeInteger(group.unitPrice) &&
        group.unitPrice > 0,
    ) &&
    totalSaleQuantity <= saleCandidate.quantity;

  function submitSale() {
    if (!saleCandidate || !isSaleFormValid) {
      setSaleError("Vérifie les quantités et les prix de vente.");
      return;
    }

    setSaleError(null);
    startSaleTransition(async () => {
      const result = await createSaleAction({
        acquisitionId: saleCandidate.id,
        groups: parsedSaleGroups,
      });

      if (!result.success) {
        setSaleError(result.message);
        return;
      }

      closeSaleModal();
      router.refresh();
    });
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

  useEffect(() => {
    if (!deletionCandidate) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDeletionCandidate(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deletionCandidate]);

  useEffect(() => {
    if (!editingAcquisition) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (isPriceChangeConfirmationOpen) {
        setIsPriceChangeConfirmationOpen(false);
      } else if (isProfessionMenuOpen) {
        setIsProfessionMenuOpen(false);
      } else {
        closeEditModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingAcquisition, isPriceChangeConfirmationOpen, isProfessionMenuOpen]);

  useEffect(() => {
    if (!listingPriceCandidate) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isUpdatingListingPrice) {
        closeListingPriceModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [listingPriceCandidate, isUpdatingListingPrice]);

  useEffect(() => {
    if (!saleCandidate) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isRecordingSale) closeSaleModal();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saleCandidate, isRecordingSale]);

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
            Ajouter une entrée
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 border-b border-white/6 px-6 py-3 sm:px-8">
          {tableSearch && (
            <p className="hidden text-[11px] whitespace-nowrap text-[var(--color-muted)] sm:block">{visibleAcquisitions.length} résultat{visibleAcquisitions.length === 1 ? "" : "s"}</p>
          )}
          <label className="flex h-9 w-64 max-w-full items-center gap-2.5 rounded-xl border border-white/10 bg-black/25 px-3 transition focus-within:border-[var(--color-lime)]/60">
            <span aria-hidden="true" className="text-sm text-[var(--color-muted)]">⌕</span>
            <input type="search" value={tableSearch} onChange={(event) => setTableSearch(event.target.value)} placeholder="Rechercher un équipement" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-[10px] placeholder:text-[var(--color-muted)]" />
          </label>
        </div>

        {visibleAcquisitions.length > 0 && (
          <div className="border-b border-white/6 px-4 py-3 md:hidden">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="eyebrow shrink-0 pr-1 text-[10px] text-[var(--color-muted)]">Trier</span>
              {([
                ["date", "Date"],
                ["equipment", "Équipement"],
                ["status", "Statut"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSort(key)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${sortKey === key ? "border-[var(--color-lime)]/40 bg-[var(--color-lime)]/10 text-[var(--color-lime)]" : "border-white/10 text-[var(--color-muted)]"}`}
                >
                  {label} <span aria-hidden="true">{sortIndicator(key)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {visibleAcquisitions.length > 0 && (
          <div className="space-y-3 p-4 md:hidden">
            {visibleAcquisitions.map((acquisition) => (
              <article key={acquisition.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex items-start gap-3">
                  {acquisition.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={acquisition.imageUrl} alt="" className="size-12 shrink-0 rounded-xl bg-white/5 object-contain p-1" />
                  ) : (
                    <span className="size-12 shrink-0 rounded-xl bg-white/5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-white">{acquisition.itemName}</h3>
                    <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
                      {acquisition.itemType ?? "Équipement"}
                      {acquisition.itemLevel !== null ? ` · Niveau ${acquisition.itemLevel}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Actions pour ${acquisition.itemName}`}
                    aria-expanded={actionsMenu?.acquisition.id === acquisition.id}
                    onClick={(event) => toggleActionsMenu(event, acquisition)}
                    className="-mt-1 -mr-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/8 text-sm font-bold tracking-widest text-[var(--color-muted)] transition hover:border-white/20 hover:text-white"
                  >
                    •••
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${acquisition.quantitySold > 0 ? "bg-[var(--color-orange)]/10 text-[var(--color-orange)]" : "bg-[var(--color-lime)]/10 text-[var(--color-lime)]"}`}>
                    <span className={`size-1.5 rounded-full ${acquisition.quantitySold > 0 ? "bg-[var(--color-orange)]" : "bg-[var(--color-lime)]"}`} />
                    {acquisition.quantitySold > 0 ? "Partiellement vendu" : "En vente"}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${acquisition.acquisitionType === "craft" ? "bg-[var(--color-lime)]/15 text-[var(--color-lime)]" : "bg-[var(--color-orange)]/15 text-[var(--color-orange)]"}`}>
                    {acquisition.acquisitionType === "craft" ? "Craft" : "Achat"}
                  </span>
                  {acquisition.isForgemaged && (
                    <span className="rounded-full bg-white/12 px-2 py-1 text-[11px] font-bold text-white">FM</span>
                  )}
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-white/6 py-4">
                  <div>
                    <dt className="eyebrow text-[9px] text-[var(--color-muted)]">Prix affiché</dt>
                    <dd className="mt-1 text-sm font-semibold text-white">{numberFormatter.format(acquisition.listingPrice)} K</dd>
                    {acquisition.listingPrice !== acquisition.initialListingPrice && (
                      <dd className="mt-0.5 text-[10px] text-[var(--color-muted)]">Initial : {numberFormatter.format(acquisition.initialListingPrice)} K</dd>
                    )}
                  </div>
                  <div>
                    <dt className="eyebrow text-[9px] text-[var(--color-muted)]">Profit par unité</dt>
                    <dd className="mt-1 text-sm"><PotentialUnitProfit acquisition={acquisition} /></dd>
                  </div>
                  <div>
                    <dt className="eyebrow text-[9px] text-[var(--color-muted)]">Coût unitaire</dt>
                    <dd className="mt-1 text-sm text-white">{numberFormatter.format(acquisition.unitCost)} K</dd>
                  </div>
                  <div>
                    <dt className="eyebrow text-[9px] text-[var(--color-muted)]">Rendement</dt>
                    <dd className="mt-1 text-sm"><PotentialProfitRate acquisition={acquisition} /></dd>
                  </div>
                  <div>
                    <dt className="eyebrow text-[9px] text-[var(--color-muted)]">Quantité restante</dt>
                    <dd className="mt-1 text-sm text-white">{numberFormatter.format(acquisition.quantity)}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow text-[9px] text-[var(--color-muted)]">Taxe HDV</dt>
                    <dd className="mt-1 text-sm text-white">{numberFormatter.format(calculateListingTax(acquisition.initialListingPrice, 1))} K</dd>
                  </div>
                </dl>

                <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-[var(--color-muted)]">
                  <span>{acquisition.profession}</span>
                  <span>Mise en vente le {dateFormatter.format(new Date(acquisition.listedAt))}</span>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1120px] table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[105px]" />
              <col />
              <col className="w-[105px]" />
              <col className="w-[70px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[90px]" />
              <col className="w-[100px]" />
              <col className="w-[85px]" />
              <col className="w-[180px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-white/6">
                {tableColumns.map((column) => (
                  <th key={column} className={`eyebrow px-2 py-4 text-[10px] font-bold whitespace-nowrap text-[var(--color-muted)] first:pl-6 last:pr-6 ${column === "Quantité" || column === "Statut" ? "text-center" : ""} ${column === "Quantité" || column === "Statut" ? "relative -left-1.5" : ""} ${column === "Équipement" ? "pl-4" : ""} ${column === "Acquisition" ? "pl-0" : ""}`}>
                    {column === "Statut" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <button type="button" onClick={() => toggleSort("status")} className="inline-flex items-center gap-1 transition hover:text-white" aria-label="Trier par statut">
                          Statut <span aria-hidden="true" className={sortKey === "status" ? "text-[var(--color-lime)]" : "text-white/25"}>{sortIndicator("status")}</span>
                        </button>
                        <span tabIndex={0} className="group/status relative inline-flex cursor-help outline-none">
                          <span aria-hidden="true" className="flex size-4 items-center justify-center rounded-full border border-white/15 font-sans text-[9px] normal-case text-[var(--color-muted)]">?</span>
                          <span role="tooltip" className="pointer-events-none absolute top-full left-1/2 z-30 mt-2 hidden w-44 -translate-x-1/2 rounded-xl border border-white/10 bg-[#242424] p-3 font-sans text-[11px] font-medium tracking-normal normal-case shadow-2xl shadow-black/60 group-hover/status:block group-focus/status:block">
                            <span className="flex items-center gap-2 text-white"><span className="size-2 rounded-full bg-[var(--color-lime)]" />En vente</span>
                            <span className="mt-2 flex items-center gap-2 text-white"><span className="size-2 rounded-full bg-[var(--color-orange)]" />Partiellement vendu</span>
                          </span>
                        </span>
                      </span>
                    ) : column === "Mise en vente" || column === "Équipement" ? (
                      <button type="button" onClick={() => toggleSort(column === "Mise en vente" ? "date" : "equipment")} className="inline-flex items-center gap-1 transition hover:text-white">
                        {column}
                        <span aria-hidden="true" className={sortKey === (column === "Mise en vente" ? "date" : "equipment") ? "text-[var(--color-lime)]" : "text-white/25"}>{sortIndicator(column === "Mise en vente" ? "date" : "equipment")}</span>
                      </button>
                    ) : column}
                  </th>
                ))}
              </tr>
            </thead>
            {visibleAcquisitions.length > 0 && (
              <tbody className="divide-y divide-white/6">
                {visibleAcquisitions.map((acquisition) => (
                  <tr key={acquisition.id} className="transition hover:bg-white/3">
                    <td className="py-4 pr-1 pl-6 text-[13px] whitespace-nowrap text-[var(--color-muted)]">{dateFormatter.format(new Date(acquisition.listedAt))}</td>
                    <td className="py-4 pr-2 pl-4">
                      <div className="flex items-center gap-2.5">
                        {acquisition.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={acquisition.imageUrl} alt="" className="size-9 shrink-0 rounded-lg bg-white/5 object-contain p-0.5" />
                        ) : (
                          <span className="size-9 shrink-0 rounded-lg bg-white/5" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold text-white">{acquisition.itemName}</span>
                          <span className="mt-1 block text-xs text-[var(--color-muted)]">
                            {acquisition.itemType ?? "Équipement"}
                            {acquisition.itemLevel !== null ? ` · Niveau ${acquisition.itemLevel}` : ""}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="py-4 pr-2 pl-0">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${acquisition.acquisitionType === "craft" ? "bg-[var(--color-lime)]/15 text-[var(--color-lime)]" : "bg-[var(--color-orange)]/15 text-[var(--color-orange)]"}`}>
                          {acquisition.acquisitionType === "craft" ? "Craft" : "Achat"}
                        </span>
                        {acquisition.isForgemaged && (
                          <span className="rounded-full bg-white/12 px-2 py-1 text-[11px] font-bold text-white">FM</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center text-[13px] text-white"><span className="inline-block -translate-x-1.5">{numberFormatter.format(acquisition.quantity)}</span></td>
                    <td className="px-3 py-4 text-[13px] whitespace-nowrap text-white">{numberFormatter.format(acquisition.unitCost)} K</td>
                    <td className="px-3 py-4 text-[13px] whitespace-nowrap text-white">
                      <span className="block">{numberFormatter.format(acquisition.listingPrice)} K</span>
                      {acquisition.listingPrice !== acquisition.initialListingPrice && (
                        <span className="mt-1 block text-[10px] text-[var(--color-muted)]">Initial : {numberFormatter.format(acquisition.initialListingPrice)} K</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-[13px] whitespace-nowrap text-white">{numberFormatter.format(calculateListingTax(acquisition.initialListingPrice, 1))} K</td>
                    <td className="px-3 py-4 text-[13px]"><PotentialProfitRate acquisition={acquisition} /></td>
                    <td className="px-3 py-4 text-[13px]"><PotentialUnitProfit acquisition={acquisition} /></td>
                    <td className="py-4 pr-6 pl-2">
                      <div className="relative flex items-center justify-center whitespace-nowrap">
                        <span className={`relative -left-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${acquisition.quantitySold > 0 ? "bg-[var(--color-orange)]/10 text-[var(--color-orange)]" : "bg-[var(--color-lime)]/10 text-[var(--color-lime)]"}`}>
                          <span className={`size-1.5 rounded-full ${acquisition.quantitySold > 0 ? "bg-[var(--color-orange)]" : "bg-[var(--color-lime)]"}`} />
                          En vente
                        </span>
                        <button type="button" aria-label={`Actions pour ${acquisition.itemName}`} aria-expanded={actionsMenu?.acquisition.id === acquisition.id} onClick={(event) => toggleActionsMenu(event, acquisition)} className="absolute right-0 inline-flex h-8 w-7 items-center justify-center text-sm font-bold tracking-widest text-[var(--color-muted)] transition hover:text-white">•••</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {acquisitions.length === 0 && (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full border border-white/10 bg-white/4 text-2xl text-[var(--color-lime)]">+</div>
            <p className="mt-5 font-semibold text-white">Aucune vente en cours</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--color-muted)]">Ajoutez votre première acquisition pour commencer à suivre sa mise en vente.</p>
          </div>
        )}
        {acquisitions.length > 0 && visibleAcquisitions.length === 0 && (
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
          aria-label={`Actions pour ${actionsMenu.acquisition.itemName}`}
          className="fixed z-60 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#202020] p-1.5 shadow-2xl shadow-black/60"
          style={{ top: actionsMenu.top, left: actionsMenu.left }}
        >
          <button type="button" role="menuitem" onClick={() => openSaleModal(actionsMenu.acquisition)} className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-white transition hover:bg-white/7">
            Enregistrer une vente
          </button>
          <button type="button" role="menuitem" onClick={() => openListingPriceModal(actionsMenu.acquisition)} className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-white transition hover:bg-white/7">
            Modifier le prix affiché
          </button>
          <div className="my-1 border-t border-white/8" />
          <button
            type="button"
            role="menuitem"
            disabled={actionsMenu.acquisition.quantitySold > 0}
            onClick={() => openEditModal(actionsMenu.acquisition)}
            className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-white transition hover:bg-white/7 disabled:cursor-not-allowed disabled:text-white/30 disabled:hover:bg-transparent"
          >
            Modifier l’entrée
          </button>
          <div className="my-1 border-t border-white/8" />
          <button
            type="button"
            role="menuitem"
            disabled={actionsMenu.acquisition.quantitySold > 0}
            onClick={() => {
              setDeletionError(null);
              setDeletionCandidate(actionsMenu.acquisition);
              setActionsMenu(null);
            }}
            className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-400 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:text-red-400/30 disabled:hover:bg-transparent"
          >
            Supprimer l’entrée
          </button>
        </div>
      )}

      {saleCandidate && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isRecordingSale) {
              closeSaleModal();
            }
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="record-sale-title" className="surface-card w-full max-w-xl overflow-hidden rounded-[28px]">
            <div className="max-h-[calc(100vh-32px)] overflow-y-auto p-6 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="eyebrow text-xs text-[var(--color-lime)]">Vente réelle</p>
                  <h2 id="record-sale-title" className="font-display mt-2 text-3xl font-bold uppercase text-white sm:text-4xl">Enregistrer une vente</h2>
                </div>
                <button type="button" disabled={isRecordingSale} onClick={closeSaleModal} aria-label="Fermer" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-xl text-[var(--color-muted)] transition hover:border-white/25 hover:text-white disabled:opacity-50">×</button>
              </div>

              <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                {saleCandidate.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={saleCandidate.imageUrl} alt="" className="size-14 shrink-0 rounded-xl bg-white/5 object-contain p-1" />
                ) : (
                  <span className="size-14 shrink-0 rounded-xl bg-white/5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{saleCandidate.itemName}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{saleCandidate.quantity} unité{saleCandidate.quantity === 1 ? "" : "s"} disponible{saleCandidate.quantity === 1 ? "" : "s"}</p>
                </div>
              </div>

              <fieldset className="mt-5">
                <legend className="eyebrow text-xs text-white">Prix de vente</legend>
                <div className="mt-2 grid h-14 grid-cols-2 rounded-2xl border border-white/10 bg-black/25 p-1">
                  <button type="button" onClick={() => { setSalePricingMode("same"); setSaleError(null); }} className={`h-full rounded-xl px-3 text-sm font-semibold transition ${salePricingMode === "same" ? "bg-[var(--color-lime)] text-black" : "text-[var(--color-muted)] hover:text-white"}`}>Même prix</button>
                  <button type="button" onClick={() => { setSalePricingMode("different"); setSaleError(null); }} className={`h-full rounded-xl px-3 text-sm font-semibold transition ${salePricingMode === "different" ? "bg-[var(--color-lime)] text-black" : "text-[var(--color-muted)] hover:text-white"}`}>Prix différents</button>
                </div>
              </fieldset>

              {salePricingMode === "same" ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="eyebrow text-xs text-white">Quantité vendue</span>
                    <input autoFocus type="text" inputMode="numeric" pattern="[0-9]*" value={saleQuantity} onChange={(event) => { setSaleQuantity(event.target.value.replace(/\D/g, "")); setSaleError(null); }} className="mt-2 h-14 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none transition focus:border-[var(--color-lime)]/70" />
                  </label>
                  <label>
                    <span className="eyebrow text-xs text-white">Prix vendu par unité</span>
                    <div className="mt-2 flex h-14 items-center rounded-2xl border border-white/10 bg-black/25 px-4 transition focus-within:border-[var(--color-lime)]/70">
                      <input type="text" inputMode="numeric" pattern="[0-9]*" value={saleUnitPrice} onChange={(event) => { setSaleUnitPrice(event.target.value.replace(/\D/g, "")); setSaleError(null); }} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none" />
                      <span className="text-xs font-semibold text-[var(--color-muted)]">K</span>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  <div className="grid grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)_2.5rem] gap-3 px-1">
                    <span className="eyebrow text-[10px] text-white">Quantité</span>
                    <span className="eyebrow text-[10px] text-white">Prix par unité</span>
                    <span />
                  </div>
                  {saleGroups.map((group, index) => (
                    <div key={group.id} className="grid grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)_2.5rem] gap-3">
                      <input autoFocus={index === 0} aria-label={`Quantité du groupe ${index + 1}`} type="text" inputMode="numeric" pattern="[0-9]*" value={group.quantity} onChange={(event) => { updateSaleGroup(group.id, "quantity", event.target.value); setSaleError(null); }} className="h-12 min-w-0 rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none transition focus:border-[var(--color-lime)]/70" />
                      <div className="flex h-12 min-w-0 items-center rounded-xl border border-white/10 bg-black/25 px-3 transition focus-within:border-[var(--color-lime)]/70">
                        <input aria-label={`Prix du groupe ${index + 1}`} type="text" inputMode="numeric" pattern="[0-9]*" value={group.unitPrice} onChange={(event) => { updateSaleGroup(group.id, "unitPrice", event.target.value); setSaleError(null); }} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none" />
                        <span className="text-xs font-semibold text-[var(--color-muted)]">K</span>
                      </div>
                      <button type="button" aria-label={`Retirer le groupe ${index + 1}`} disabled={saleGroups.length === 1} onClick={() => removeSaleGroup(group.id)} className="flex size-10 self-center items-center justify-center rounded-full border border-white/10 text-lg text-[var(--color-muted)] transition hover:border-red-400/40 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-25">×</button>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <button type="button" onClick={addSaleGroup} className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-[var(--color-lime)]/50 hover:text-[var(--color-lime)]">+ Ajouter un prix</button>
                    <p className={`text-xs ${totalSaleQuantity > saleCandidate.quantity ? "text-red-400" : "text-[var(--color-muted)]"}`}>Total vendu : <span className="font-semibold text-white">{Number.isFinite(totalSaleQuantity) ? totalSaleQuantity : 0}</span> / {saleCandidate.quantity}</p>
                  </div>
                </div>
              )}

              {salePricingMode === "same" && totalSaleQuantity > saleCandidate.quantity && (
                <p role="alert" className="mt-4 text-sm text-red-400">Il reste seulement {saleCandidate.quantity} unité{saleCandidate.quantity === 1 ? "" : "s"}.</p>
              )}
              {saleError && (
                <p role="alert" className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-400">{saleError}</p>
              )}

              <div className="mt-7 flex justify-center gap-3">
                <button type="button" disabled={isRecordingSale} onClick={closeSaleModal} className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/25 disabled:opacity-50">Annuler</button>
                <button type="button" disabled={!isSaleFormValid || isRecordingSale} onClick={submitSale} className="rounded-full bg-[var(--color-lime)] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[var(--color-lime-soft)] disabled:cursor-not-allowed disabled:bg-white/8 disabled:text-[var(--color-muted)]">{isRecordingSale ? "Enregistrement…" : "Enregistrer"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletionCandidate && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDeletionCandidate(null);
          }}
        >
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-acquisition-title" aria-describedby="delete-acquisition-item" className="surface-card w-full max-w-md rounded-[28px] p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-red-400/10 text-xl text-red-400">!</div>
              <p className="eyebrow text-xs text-red-400">Action irréversible</p>
            </div>
            <h2 id="delete-acquisition-title" className="font-display mt-5 text-3xl font-bold uppercase text-white">Supprimer l’entrée?</h2>
            <div id="delete-acquisition-item" className="mt-4 flex items-center gap-4 rounded-2xl border border-white/8 bg-black/20 p-4">
              {deletionCandidate.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={deletionCandidate.imageUrl} alt="" className="size-14 shrink-0 rounded-xl bg-white/5 object-contain p-1" />
              ) : (
                <span className="size-14 shrink-0 rounded-xl bg-white/5" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{deletionCandidate.itemName}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {deletionCandidate.itemType ?? "Équipement"}
                  {deletionCandidate.itemLevel !== null ? ` · Niveau ${deletionCandidate.itemLevel}` : ""}
                </p>
              </div>
            </div>
            {deletionError && (
              <p role="alert" className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-400">{deletionError}</p>
            )}
            <div className="mt-7 flex flex-col-reverse justify-center gap-3 sm:flex-row">
              <button type="button" disabled={isDeleting} onClick={() => { setDeletionCandidate(null); setDeletionError(null); }} className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50">Annuler</button>
              <button type="button" disabled={isDeleting} onClick={confirmDeletion} className="rounded-full bg-red-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60">{isDeleting ? "Suppression…" : "Supprimer"}</button>
            </div>
          </div>
        </div>
      )}

      {listingPriceCandidate && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isUpdatingListingPrice) {
              closeListingPriceModal();
            }
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="listing-price-title"
            className="surface-card w-full max-w-md rounded-[28px] p-6 sm:p-8"
            onSubmit={(event) => {
              event.preventDefault();
              saveListingPrice();
            }}
          >
            <p className="eyebrow text-xs text-[var(--color-lime)]">Prix actuel</p>
            <h2 id="listing-price-title" className="font-display mt-2 text-3xl font-bold uppercase text-white">Modifier le prix affiché</h2>

            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 p-3">
              {listingPriceCandidate.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listingPriceCandidate.imageUrl} alt="" className="size-11 shrink-0 rounded-lg bg-white/5 object-contain p-0.5" />
              ) : (
                <span className="size-11 shrink-0 rounded-lg bg-white/5" />
              )}
              <p className="min-w-0 truncate text-sm font-semibold text-white">{listingPriceCandidate.itemName}</p>
            </div>

            <label className="mt-5 block">
              <span className="eyebrow text-xs text-white">Nouveau prix affiché</span>
              <div className="mt-2 flex h-14 items-center rounded-2xl border border-white/10 bg-black/25 px-4 transition focus-within:border-[var(--color-lime)]/70">
                <input autoFocus type="text" inputMode="numeric" pattern="[0-9]*" required value={listingPrice} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setListingPrice(event.target.value.replace(/\D/g, ""))} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none" />
                <span className="text-xs font-semibold text-[var(--color-muted)]">K</span>
              </div>
            </label>

            {listingPriceError && (
              <p role="alert" className="mt-4 rounded-2xl border border-[var(--color-orange)]/20 bg-[var(--color-orange)]/8 px-4 py-3 text-sm text-[var(--color-orange)]">{listingPriceError}</p>
            )}

            <div className="mt-7 flex justify-center gap-3">
              <button type="button" disabled={isUpdatingListingPrice} onClick={closeListingPriceModal} className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50">Annuler</button>
              <button type="submit" disabled={isUpdatingListingPrice || listingPrice === "" || parsedListingPrice <= 0} className="rounded-full bg-[var(--color-lime)] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[var(--color-lime-soft)] disabled:cursor-not-allowed disabled:bg-white/8 disabled:text-[var(--color-muted)]">{isUpdatingListingPrice ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          </form>
        </div>
      )}

      {editingAcquisition && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isUpdating) closeEditModal();
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="edit-acquisition-title" className="surface-card w-full max-w-2xl overflow-hidden rounded-[28px]">
            <div className="max-h-[calc(100vh-32px)] overflow-y-auto">
              <div className="flex items-start justify-between gap-6 border-b border-white/6 px-6 py-5 sm:px-8">
                <div>
                  <p className="eyebrow text-xs text-[var(--color-orange)]">Correction</p>
                  <h2 id="edit-acquisition-title" className="font-display mt-2 text-4xl font-bold uppercase text-white">Modifier l’entrée</h2>
                </div>
                <button type="button" disabled={isUpdating} onClick={closeEditModal} aria-label="Fermer" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-xl text-[var(--color-muted)] transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50">×</button>
              </div>

              <form onSubmit={(event) => { event.preventDefault(); submitEditedAcquisition(); }} className="px-6 pt-5 pb-6 sm:px-8">
                <div className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                  {editingAcquisition.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editingAcquisition.imageUrl} alt="" className="size-16 shrink-0 rounded-xl bg-white/5 object-contain p-1" />
                  ) : (
                    <span className="size-16 shrink-0 rounded-xl bg-white/5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{editingAcquisition.itemName}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {editingAcquisition.itemType ?? "Équipement"}
                      {editingAcquisition.itemLevel !== null ? ` · Niveau ${editingAcquisition.itemLevel}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/8 px-3 py-1.5 text-[10px] font-semibold text-[var(--color-muted)]">Équipement verrouillé</span>
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
                    <button type="button" aria-haspopup="listbox" aria-expanded={isProfessionMenuOpen} onClick={() => setIsProfessionMenuOpen((isMenuOpen) => !isMenuOpen)} className={`mt-2 flex h-14 w-full items-center justify-between rounded-2xl border bg-black/25 px-4 text-left text-sm outline-none transition ${isProfessionMenuOpen ? "border-[var(--color-lime)]/70" : "border-white/10 hover:border-white/20"}`}>
                      <span className="text-white">{profession}</span>
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
                  </div>

                  <label className="block">
                    <span className="eyebrow text-xs text-white">Coût d’acquisition unitaire</span>
                    <div className="mt-2 flex h-14 items-center rounded-2xl border border-white/10 bg-black/25 px-4 transition focus-within:border-[var(--color-lime)]/70">
                      <input type="text" inputMode="numeric" pattern="[0-9]*" required value={unitCost} onChange={(event) => setUnitCost(event.target.value.replace(/\D/g, ""))} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none" />
                      <span className="text-xs font-semibold text-[var(--color-muted)]">K</span>
                    </div>
                  </label>

                  <label className="block">
                    <span className="eyebrow text-xs text-white">Prix initial affiché</span>
                    <div className="mt-2 flex h-14 items-center rounded-2xl border border-white/10 bg-black/25 px-4 transition focus-within:border-[var(--color-orange)]/70">
                      <input type="text" inputMode="numeric" pattern="[0-9]*" required value={listingPrice} onChange={(event) => setListingPrice(event.target.value.replace(/\D/g, ""))} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none" />
                      <span className="text-xs font-semibold text-[var(--color-muted)]">K</span>
                    </div>
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="eyebrow text-xs text-white">Quantité</span>
                    <input type="text" inputMode="numeric" pattern="[1-9][0-9]*" required value={quantity} onChange={(event) => setQuantity(event.target.value.replace(/\D/g, ""))} className="mt-2 h-14 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none transition focus:border-[var(--color-lime)]/70" />
                  </label>
                </div>

                {editError && (
                  <p role="alert" className="mt-5 rounded-2xl border border-[var(--color-orange)]/20 bg-[var(--color-orange)]/8 px-4 py-3 text-sm text-[var(--color-orange)]">{editError}</p>
                )}
                <button type="submit" disabled={!isEditFormValid || isUpdating} className="mt-5 w-full rounded-full bg-[var(--color-lime)] px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-[var(--color-lime-soft)] disabled:cursor-not-allowed disabled:bg-white/8 disabled:text-[var(--color-muted)]">
                  {isUpdating ? "Enregistrement…" : "Enregistrer les modifications"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {editingAcquisition && isPriceChangeConfirmationOpen && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div role="alertdialog" aria-modal="true" aria-labelledby="price-change-title" className="surface-card w-full max-w-md rounded-[28px] p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-orange)]/10 text-xl text-[var(--color-orange)]">!</div>
              <p className="eyebrow text-xs text-[var(--color-orange)]">Prix initial</p>
            </div>
            <h2 id="price-change-title" className="font-display mt-5 text-3xl font-bold uppercase text-white">Confirmer la correction?</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              Modifier le prix initial changera le calcul de la taxe HDV. Cette action représente une correction du prix de première mise en vente.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 text-sm">
              <div>
                <p className="text-xs text-[var(--color-muted)]">Ancien prix</p>
                <p className="mt-1 font-semibold text-white">{numberFormatter.format(editingAcquisition.initialListingPrice)} K</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-muted)]">Nouveau prix</p>
                <p className="mt-1 font-semibold text-[var(--color-orange)]">{numberFormatter.format(parsedListingPrice)} K</p>
              </div>
            </div>
            <div className="mt-7 flex justify-center gap-3">
              <button type="button" disabled={isUpdating} onClick={() => setIsPriceChangeConfirmationOpen(false)} className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/25 disabled:opacity-50">Annuler</button>
              <button type="button" disabled={isUpdating} onClick={saveEditedAcquisition} className="rounded-full bg-[var(--color-orange)] px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:opacity-60">{isUpdating ? "Enregistrement…" : "Confirmer"}</button>
            </div>
          </div>
        </div>
      )}

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
                <form onSubmit={(event) => { event.preventDefault(); submitAcquisition(); }}>
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
                      <input type="text" inputMode="numeric" pattern="[1-9][0-9]*" required value={quantity} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setQuantity(event.target.value.replace(/\D/g, ""))} className="mt-2 h-14 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none transition focus:border-[var(--color-lime)]/70" />
                    </label>
                  </div>

                  {submissionError && (
                    <p role="alert" className="mt-5 rounded-2xl border border-[var(--color-orange)]/20 bg-[var(--color-orange)]/8 px-4 py-3 text-sm text-[var(--color-orange)]">{submissionError}</p>
                  )}
                  <button type="submit" disabled={!isFormValid || isPending} className="mt-5 w-full rounded-full bg-[var(--color-lime)] px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-[var(--color-lime-soft)] disabled:cursor-not-allowed disabled:bg-white/8 disabled:text-[var(--color-muted)]">
                    {isPending ? "Enregistrement…" : "Ajouter l’acquisition"}
                  </button>
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
