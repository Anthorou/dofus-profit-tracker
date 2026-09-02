"use client";

import { useEffect, useRef, type ReactNode } from "react";

type FixedTableHeaderProps = {
  children: ReactNode;
  className?: string;
};

export function FixedTableHeader({ children, className = "" }: FixedTableHeaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayTableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const overlay = overlayRef.current;
    const overlayTable = overlayTableRef.current;
    const table = container?.querySelector("table");
    const tableHead = table?.querySelector("thead");

    if (!container || !overlay || !overlayTable || !table || !tableHead) return;

    const rebuildHeader = () => {
      const clonedHead = tableHead.cloneNode(true) as HTMLTableSectionElement;
      const colgroup = table.querySelector("colgroup")?.cloneNode(true);
      const sourceCells = tableHead.querySelectorAll("th");
      const clonedCells = clonedHead.querySelectorAll("th");

      clonedHead.querySelectorAll<HTMLElement>("button, [tabindex]").forEach((element) => {
        element.tabIndex = -1;
      });

      sourceCells.forEach((cell, index) => {
        const width = `${cell.getBoundingClientRect().width}px`;
        const clonedCell = clonedCells[index];

        if (clonedCell) {
          clonedCell.style.width = width;
          clonedCell.style.minWidth = width;
          clonedCell.style.maxWidth = width;
        }
      });

      overlayTable.replaceChildren();
      if (colgroup) overlayTable.append(colgroup);
      overlayTable.append(clonedHead);
      overlayTable.style.width = `${table.getBoundingClientRect().width}px`;
    };

    const updatePosition = () => {
      const containerRect = container.getBoundingClientRect();
      const headRect = tableHead.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();
      const shouldShow = headRect.bottom <= 0 && tableRect.bottom > headRect.height;

      overlay.hidden = !shouldShow;
      if (!shouldShow) return;

      overlay.style.left = `${containerRect.left}px`;
      overlay.style.width = `${containerRect.width}px`;
      overlayTable.style.transform = `translateX(${-container.scrollLeft}px)`;
    };

    const syncHeader = () => {
      rebuildHeader();
      updatePosition();
    };

    syncHeader();

    const resizeObserver = new ResizeObserver(syncHeader);
    const mutationObserver = new MutationObserver(syncHeader);
    resizeObserver.observe(container);
    resizeObserver.observe(table);
    mutationObserver.observe(tableHead, { attributes: true, childList: true, subtree: true });
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", syncHeader);
    container.addEventListener("scroll", updatePosition, { passive: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", syncHeader);
      container.removeEventListener("scroll", updatePosition);
    };
  }, [children]);

  return (
    <>
      <div ref={containerRef} className={`overflow-x-auto ${className}`}>{children}</div>
      <div ref={overlayRef} className="pointer-events-none fixed top-0 z-50 overflow-hidden" hidden aria-hidden="true">
        <table ref={overlayTableRef} className="border-collapse text-left" />
      </div>
    </>
  );
}
