import { z } from "zod";
import { places } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { itemHandlers } from "@/lib/apiRoute";

const placeUpdateInput = z.object({
  name: z.string().min(1),
  description: z.string(),
  chapterId: z.number().int().nullable(),
});

const repo = createStoryScopedRepo(places);
export const { PATCH, DELETE } = itemHandlers(repo, placeUpdateInput);
