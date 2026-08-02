"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const acquisitionIdSchema = z.string().uuid();

export type DeleteAcquisitionResult =
  | { success: true }
  | {
      success: false;
      error:
        | "UNAUTHENTICATED"
        | "INVALID_INPUT"
        | "NOT_FOUND"
        | "HAS_SALES"
        | "DATABASE_ERROR";
      message: string;
    };

export async function deleteAcquisitionAction(
  acquisitionId: string,
): Promise<DeleteAcquisitionResult> {
  const parsedId = acquisitionIdSchema.safeParse(acquisitionId);

  if (!parsedId.success) {
    return {
      success: false,
      error: "INVALID_INPUT",
      message: "Cette acquisition est invalide.",
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
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .maybeSingle();

  if (acquisitionError) {
    console.error("Could not verify acquisition before deletion", acquisitionError);
    return {
      success: false,
      error: "DATABASE_ERROR",
      message: "Impossible de vérifier cette acquisition.",
    };
  }

  if (!acquisition) {
    return {
      success: false,
      error: "NOT_FOUND",
      message: "Cette acquisition n’existe plus.",
    };
  }

  const { count: salesCount, error: salesError } = await supabase
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("acquisition_lot_id", acquisition.id)
    .eq("user_id", user.id);

  if (salesError) {
    console.error("Could not verify acquisition sales before deletion", salesError);
    return {
      success: false,
      error: "DATABASE_ERROR",
      message: "Impossible de vérifier les ventes de cette acquisition.",
    };
  }

  if ((salesCount ?? 0) > 0) {
    return {
      success: false,
      error: "HAS_SALES",
      message: "Une acquisition ayant déjà des ventes ne peut pas être supprimée.",
    };
  }

  const { error: deletionError } = await supabase
    .from("acquisition_lots")
    .delete()
    .eq("id", acquisition.id)
    .eq("user_id", user.id);

  if (deletionError) {
    console.error("Could not delete acquisition", deletionError);
    return {
      success: false,
      error: deletionError.code === "23503" ? "HAS_SALES" : "DATABASE_ERROR",
      message:
        deletionError.code === "23503"
          ? "Une acquisition ayant déjà des ventes ne peut pas être supprimée."
          : "L’acquisition n’a pas pu être supprimée.",
    };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
