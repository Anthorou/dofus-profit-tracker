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

const updateAcquisitionSchema = z.object({
  id: z.string().uuid(),
  acquisitionType: z.enum(["craft", "purchase"]),
  profession: professionSchema,
  quantity: z.number().int().positive().max(2_147_483_647),
  unitCost: safeIntegerSchema,
  initialListingPrice: safeIntegerSchema.min(1),
  isForgemaged: z.boolean(),
});

export type UpdateAcquisitionInput = z.input<typeof updateAcquisitionSchema>;

export type UpdateAcquisitionResult =
  | { success: true }
  | {
      success: false;
      error:
        | "UNAUTHENTICATED"
        | "INVALID_INPUT"
        | "NOT_FOUND"
        | "LOCKED"
        | "DATABASE_ERROR";
      message: string;
    };

export async function updateAcquisitionAction(
  input: UpdateAcquisitionInput,
): Promise<UpdateAcquisitionResult> {
  const parsedInput = updateAcquisitionSchema.safeParse(input);

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

  const { data: acquisition, error: acquisitionError } = await supabase
    .from("acquisition_lots")
    .select("id")
    .eq("id", parsedInput.data.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (acquisitionError) {
    console.error("Could not verify acquisition before update", acquisitionError);
    return {
      success: false,
      error: "DATABASE_ERROR",
      message: "Impossible de vérifier cette entrée.",
    };
  }

  if (!acquisition) {
    return {
      success: false,
      error: "NOT_FOUND",
      message: "Cette entrée n’existe plus.",
    };
  }

  const { count: salesCount, error: salesError } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("acquisition_lot_id", acquisition.id)
    .eq("user_id", user.id);

  if (salesError) {
    console.error("Could not verify acquisition sales before update", salesError);
    return {
      success: false,
      error: "DATABASE_ERROR",
      message: "Impossible de vérifier les ventes de cette entrée.",
    };
  }

  if ((salesCount ?? 0) > 0) {
    return {
      success: false,
      error: "LOCKED",
      message: "Une entrée ayant déjà des ventes ne peut plus être modifiée.",
    };
  }

  const { data: profession, error: professionError } = await supabase
    .from("professions")
    .select("id")
    .eq("name", parsedInput.data.profession)
    .single();

  if (professionError || !profession) {
    console.error("Could not resolve profession before acquisition update", professionError);
    return {
      success: false,
      error: "DATABASE_ERROR",
      message: "Le métier sélectionné est introuvable.",
    };
  }

  const { error: updateError } = await supabase
    .from("acquisition_lots")
    .update({
      profession_id: profession.id,
      acquisition_type: parsedInput.data.acquisitionType,
      is_forgemaged: parsedInput.data.isForgemaged,
      quantity_acquired: parsedInput.data.quantity,
      acquisition_unit_cost: parsedInput.data.unitCost,
      initial_listing_unit_price: parsedInput.data.initialListingPrice,
      current_listing_unit_price: parsedInput.data.initialListingPrice,
    })
    .eq("id", acquisition.id)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Could not update acquisition", updateError);
    const isLocked = updateError.message.includes(
      "Original acquisition data cannot be changed after a sale",
    );

    return {
      success: false,
      error: isLocked ? "LOCKED" : "DATABASE_ERROR",
      message: isLocked
        ? "Une entrée ayant déjà des ventes ne peut plus être modifiée."
        : "Les modifications n’ont pas pu être enregistrées.",
    };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
