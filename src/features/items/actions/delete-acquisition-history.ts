"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const acquisitionIdSchema = z.string().uuid();

export type DeleteAcquisitionHistoryResult =
  | { success: true }
  | {
      success: false;
      error:
        | "UNAUTHENTICATED"
        | "INVALID_INPUT"
        | "NOT_FOUND"
        | "DATABASE_ERROR";
      message: string;
    };

export async function deleteAcquisitionHistoryAction(
  acquisitionId: string,
): Promise<DeleteAcquisitionHistoryResult> {
  const parsedId = acquisitionIdSchema.safeParse(acquisitionId);

  if (!parsedId.success) {
    return {
      success: false,
      error: "INVALID_INPUT",
      message: "Ce lot est invalide.",
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
    console.error("Could not verify acquisition history before deletion", acquisitionError);
    return {
      success: false,
      error: "DATABASE_ERROR",
      message: "Impossible de vérifier ce lot.",
    };
  }

  if (!acquisition) {
    return {
      success: false,
      error: "NOT_FOUND",
      message: "Ce lot n’existe plus.",
    };
  }

  const { error: deletionError } = await supabase
    .from("acquisition_lots")
    .delete()
    .eq("id", acquisition.id)
    .eq("user_id", user.id);

  if (deletionError) {
    console.error("Could not delete acquisition history", deletionError);
    return {
      success: false,
      error: "DATABASE_ERROR",
      message:
        deletionError.code === "23503"
          ? "La migration de suppression en cascade doit être appliquée avant de supprimer ce lot."
          : "Le lot et son historique n’ont pas pu être supprimés.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/sales-history");
  return { success: true };
}
