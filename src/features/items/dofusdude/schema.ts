import { z } from "zod";

const translatedIdSchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string().trim().min(1),
});

const imageUrlsSchema = z.object({
  icon: z.string().url(),
  sd: z.string().url().nullable().optional(),
  hq: z.string().url().nullable().optional(),
  hd: z.string().url().nullable().optional(),
});

export const dofusdudeEquipmentSchema = z.object({
  ankama_id: z.number().int().nonnegative(),
  name: z.string().trim().min(1),
  type: translatedIdSchema,
  level: z.number().int().min(0).max(200),
  image_urls: imageUrlsSchema,
});

export const dofusdudeEquipmentSearchResponseSchema = z.array(
  dofusdudeEquipmentSchema,
);
