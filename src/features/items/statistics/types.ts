export type StatisticsSummary = {
  itemsSold: number;
  invested: number;
  revenue: number;
  profit: number;
};

export type ProfessionStatistic = {
  profession: string;
  itemsSold: number;
  invested: number;
  revenue: number;
  profit: number;
  profitRate: number | null;
};

export type EquipmentStatistic = {
  itemId: string;
  itemName: string;
  imageUrl: string | null;
  itemType: string | null;
  itemLevel: number | null;
  profession: string;
  itemsSold: number;
  revenue: number;
  invested: number;
  profit: number;
  profitRate: number | null;
};
