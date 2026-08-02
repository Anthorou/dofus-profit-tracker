import "server-only";

import { dofusdudeEquipmentSearchResponseSchema } from "./schema";
import {
  DofusdudeSearchError,
  type EquipmentSearchResult,
} from "./types";

const DOFUSDUDE_API_URL = "https://api.dofusdu.de";
const SEARCH_RESULT_LIMIT = 8;
const SEARCH_CANDIDATE_LIMIT = 24;
const SEARCH_TIMEOUT_MS = 5_000;
const MINIMUM_QUERY_LENGTH = 2;
const MAXIMUM_QUERY_LENGTH = 80;
const EXCLUDED_EQUIPMENT_TYPES = ["familier", "montilier", "monture"];

function normalizeQuery(query: string) {
  return query.trim();
}

function validateQuery(query: string) {
  if (
    query.length < MINIMUM_QUERY_LENGTH ||
    query.length > MAXIMUM_QUERY_LENGTH
  ) {
    throw new DofusdudeSearchError(
      "INVALID_QUERY",
      `La recherche doit contenir entre ${MINIMUM_QUERY_LENGTH} et ${MAXIMUM_QUERY_LENGTH} caractères.`,
    );
  }
}

function isSupportedEquipmentType(itemType: string) {
  const normalizedType = itemType.toLocaleLowerCase("fr");

  return !EXCLUDED_EQUIPMENT_TYPES.some((excludedType) =>
    normalizedType.includes(excludedType),
  );
}

export async function searchDofusdudeEquipment(
  query: string,
): Promise<EquipmentSearchResult[]> {
  const normalizedQuery = normalizeQuery(query);
  validateQuery(normalizedQuery);

  const searchParams = new URLSearchParams({
    query: normalizedQuery,
    limit: String(SEARCH_CANDIDATE_LIMIT),
  });
  const url = `${DOFUSDUDE_API_URL}/dofus3/v1/fr/items/equipment/search?${searchParams}`;

  let response: Response;

  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 },
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
  } catch (error) {
    throw new DofusdudeSearchError(
      "UNAVAILABLE",
      "La recherche Dofusdude est temporairement indisponible.",
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new DofusdudeSearchError(
      "UNAVAILABLE",
      `Dofusdude a répondu avec le statut ${response.status}.`,
    );
  }

  try {
    const data: unknown = await response.json();
    const equipment = dofusdudeEquipmentSearchResponseSchema.parse(data);

    return equipment
      .filter((item) => isSupportedEquipmentType(item.type.name))
      .slice(0, SEARCH_RESULT_LIMIT)
      .map((item) => ({
        externalId: item.ankama_id,
        name: item.name,
        type: item.type.name,
        level: item.level,
        imageUrl: item.image_urls.icon,
      }));
  } catch (error) {
    if (error instanceof DofusdudeSearchError) {
      throw error;
    }

    throw new DofusdudeSearchError(
      "INVALID_RESPONSE",
      "Dofusdude a retourné une réponse dans un format inattendu.",
      { cause: error },
    );
  }
}
