import { z } from "zod";
import { characters } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { itemHandlers } from "@/lib/apiRoute";

const characterUpdateInput = z.object({
  name: z.string().min(1),
  appearance: z.string(),
  personality: z.string(),
});

const repo = createStoryScopedRepo(characters);
export const { PATCH, DELETE } = itemHandlers(repo, characterUpdateInput);
