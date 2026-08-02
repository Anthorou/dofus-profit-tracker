"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const updateListingPriceSchema = z.object({
  id: z.string().uuid(),
  listingPrice: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

export type UpdateListingPriceResult =
  | { success: true }
  | {
      success: false;
      error: "UNAUTHENTICATED" | "INVALID_INPUT" | "NOT_FOUND" | "DATABASE_ERROR";
      message: string;
    };

export async function updateListingPriceAction(
  input: z.input<typeof updateListingPriceSchema>,
): Promise<UpdateListingPriceResult> {
  const parsedInput = updateListingPriceSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      success: false,
      error: "INVALID_INPUT",
      message: "Le nouveau prix affiché est invalide.",
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
    console.error("Could not verify acquisition before listing price update", acquisitionError);
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

  const { error: updateError } = await supabase
    .from("acquisition_lots")
    .update({ current_listing_unit_price: parsedInput.data.listingPrice })
    .eq("id", acquisition.id)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Could not update current listing price", updateError);
    return {
      success: false,
      error: "DATABASE_ERROR",
      message: "Le prix affiché n’a pas pu être modifié.",
    };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
