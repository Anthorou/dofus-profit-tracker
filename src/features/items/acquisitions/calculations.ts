export const HDV_TAX_RATE = 0.02;

export function calculateListingTax(
  initialListingUnitPrice: number,
  quantity: number,
) {
  return Math.floor(initialListingUnitPrice * quantity * HDV_TAX_RATE);
}

type PotentialProfitInput = {
  acquisitionUnitCost: number;
  currentListingUnitPrice: number;
  initialListingUnitPrice: number;
  quantity: number;
};

export function calculatePotentialProfit({
  acquisitionUnitCost,
  currentListingUnitPrice,
  initialListingUnitPrice,
  quantity,
}: PotentialProfitInput) {
  return (
    currentListingUnitPrice * quantity -
    acquisitionUnitCost * quantity -
    calculateListingTax(initialListingUnitPrice, quantity)
  );
}

export function calculatePotentialUnitProfit(
  input: Omit<PotentialProfitInput, "quantity">,
) {
  return calculatePotentialProfit({ ...input, quantity: 1 });
}

export function calculatePotentialProfitRate(input: PotentialProfitInput) {
  const investedAmount = input.acquisitionUnitCost * input.quantity;

  if (investedAmount === 0) return null;

  return (calculatePotentialProfit(input) / investedAmount) * 100;
}
