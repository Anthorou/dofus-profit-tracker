export type ActiveAcquisition = {
  id: string;
  itemName: string;
  itemType: string | null;
  itemLevel: number | null;
  imageUrl: string | null;
  profession: string;
  acquisitionType: "craft" | "purchase";
  isForgemaged: boolean;
  quantity: number;
  unitCost: number;
  listingPrice: number;
  listedAt: string;
};
