"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const saleGroupSchema = z.object({
  quantity: z.number().int().positive().max(2_147_483_647),
  unitPrice: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

const createSaleSchema = z.object({
  acquisitionId: z.string().uuid(),
  groups: z.array(saleGroupSchema).min(1).max(100),
});

export type CreateSaleInput = z.input<typeof createSaleSchema>;

export type CreateSaleResult =
  | { success: true }
  | {
      success: false;
      error:
        | "UNAUTHENTICATED"
        | "INVALID_INPUT"
        | "NOT_FOUND"
        | "QUANTITY_EXCEEDED"
        | "DATABASE_ERROR";
      message: string;
    };

export async function createSaleAction(
  input: CreateSaleInput,
): Promise<CreateSaleResult> {
  const parsedInput = createSaleSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      success: false,
      error: "INVALID_INPUT",
      message: "Les informations de la vente sont invalides.",
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
    .select("id, quantity_acquired, current_listing_unit_price")
    .eq("id", parsedInput.data.acquisitionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (acquisitionError) {
    console.error("Could not verify acquisition before sale", acquisitionError);
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

  const { data: previousSales, error: salesError } = await supabase
    .from("sales")
    .select("quantity_sold")
    .eq("acquisition_lot_id", acquisition.id)
    .eq("user_id", user.id);

  if (salesError) {
    console.error("Could not load previous sales", salesError);
    return {
      success: false,
      error: "DATABASE_ERROR",
      message: "Impossible de vérifier la quantité encore disponible.",
    };
  }

  const alreadySold = previousSales.reduce(
    (total, sale) => total + sale.quantity_sold,
    0,
  );
  const quantityToSell = parsedInput.data.groups.reduce(
    (total, group) => total + group.quantity,
    0,
  );
  const remainingQuantity = acquisition.quantity_acquired - alreadySold;

  if (quantityToSell > remainingQuantity) {
    return {
      success: false,
      error: "QUANTITY_EXCEEDED",
      message: `Il reste seulement ${remainingQuantity} unité${remainingQuantity === 1 ? "" : "s"} disponible${remainingQuantity === 1 ? "" : "s"}.`,
    };
  }

  const { error: insertError } = await supabase.from("sales").insert(
    parsedInput.data.groups.map((group) => ({
      user_id: user.id,
      acquisition_lot_id: acquisition.id,
      quantity_sold: group.quantity,
      sale_unit_price: group.unitPrice,
      listing_unit_price_snapshot: acquisition.current_listing_unit_price,
    })),
  );

  if (insertError) {
    console.error("Could not record sale", insertError);
    const quantityExceeded = insertError.message.includes(
      "The sold quantity exceeds the remaining quantity",
    );

    return {
      success: false,
      error: quantityExceeded ? "QUANTITY_EXCEEDED" : "DATABASE_ERROR",
      message: quantityExceeded
        ? "La quantité vendue dépasse la quantité encore disponible."
        : "La vente n’a pas pu être enregistrée.",
    };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
