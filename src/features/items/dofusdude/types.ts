export type EquipmentSearchResult = {
  externalId: number;
  name: string;
  type: string;
  level: number;
  imageUrl: string;
};

export type DofusdudeSearchErrorCode =
  | "INVALID_QUERY"
  | "UNAVAILABLE"
  | "INVALID_RESPONSE";

export class DofusdudeSearchError extends Error {
  constructor(
    public readonly code: DofusdudeSearchErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "DofusdudeSearchError";
  }
}
