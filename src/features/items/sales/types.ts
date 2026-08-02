export type SaleHistoryEntry = {
  id: string;
  acquisitionId: string;
  soldAt: string;
  itemName: string;
  itemType: string | null;
  itemLevel: number | null;
  imageUrl: string | null;
  quantitySold: number;
  acquisitionUnitCost: number;
  initialListingUnitPrice: number;
  saleUnitPrice: number;
  completedAcquisition: boolean;
};
