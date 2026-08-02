"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const professionSchema = z.enum([
  "Bijoutier",
  "Cordonnier",
  "Tailleur",
  "Forgeron",
  "Sculpteur",
  "Façonneur",
  "Bricoleur",
]);

const safeIntegerSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

const createAcquisitionSchema = z.object({
  item: z.object({
    externalId: z.number().int().nonnegative(),
    name: z.string().trim().min(1).max(200),
    type: z.string().trim().min(1).max(100),
    level: z.number().int().min(0).max(200),
    imageUrl: z.string().url().max(2_000),
  }),
  acquisitionType: z.enum(["craft", "purchase"]),
  profession: professionSchema,
  quantity: z.number().int().positive().max(2_147_483_647),
  unitCost: safeIntegerSchema,
  listingPrice: safeIntegerSchema.min(1),
  isForgemaged: z.boolean(),
});

export type CreateAcquisitionInput = z.input<typeof createAcquisitionSchema>;

export type CreateAcquisitionResult =
  | { success: true }
  | {
      success: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "DATABASE_ERROR";
      message: string;
    };

export async function createAcquisitionAction(
  input: CreateAcquisitionInput,
): Promise<CreateAcquisitionResult> {
  const parsedInput = createAcquisitionSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      success: false,
      error: "INVALID_INPUT",
      message: "Certains champs sont invalides ou incomplets.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "UNAUTHENTICATED",
      message: "Ta session a expiré. Reconnecte-toi avant de continuer.",
    };
  }

  const { item, acquisitionType, profession, quantity, unitCost, listingPrice, isForgemaged } = parsedInput.data;

  const { data: professionRow, error: professionError } = await supabase
    .from("professions")
    .select("id")
    .eq("name", profession)
    .single();

  if (professionError || !professionRow) {
    console.error("Could not resolve acquisition profession", professionError);
    return {
      success: false,
      error: "DATABASE_ERROR",
      message: "Le métier sélectionné est introuvable.",
    };
  }

  const { data: existingItem, error: existingItemError } = await supabase
    .from("items")
    .select("id")
    .eq("user_id", user.id)
    .eq("source", "dofusdude")
    .eq("external_id", item.externalId)
    .maybeSingle();

  if (existingItemError) {
    console.error("Could not search for existing acquisition item", existingItemError);
    return {
      success: false,
      error: "DATABASE_ERROR",
      message: "Impossible de vérifier l’équipement sélectionné.",
    };
  }

  let itemId = existingItem?.id;

  if (!itemId) {
    const { data: createdItem, error: itemError } = await supabase
      .from("items")
      .insert({
        user_id: user.id,
        source: "dofusdude",
        external_id: item.externalId,
        name: item.name,
        image_url: item.imageUrl,
        item_type: item.type,
        level: item.level,
      })
      .select("id")
      .single();

    if (itemError || !createdItem) {
      console.error("Could not create acquisition item", itemError);
      return {
        success: false,
        error: "DATABASE_ERROR",
        message: "Impossible d’enregistrer l’équipement sélectionné.",
      };
    }

    itemId = createdItem.id;
  }

  const { error: acquisitionError } = await supabase
    .from("acquisition_lots")
    .insert({
      user_id: user.id,
      item_id: itemId,
      profession_id: professionRow.id,
      acquisition_type: acquisitionType,
      is_forgemaged: isForgemaged,
      quantity_acquired: quantity,
      acquisition_unit_cost: unitCost,
      initial_listing_unit_price: listingPrice,
      current_listing_unit_price: listingPrice,
    });

  if (acquisitionError) {
    console.error("Could not create acquisition lot", acquisitionError);
    return {
      success: false,
      error: "DATABASE_ERROR",
      message: "L’acquisition n’a pas pu être enregistrée.",
    };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
