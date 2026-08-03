import { z } from "zod";
import { scenes } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { itemHandlers } from "@/lib/apiRoute";

const sceneUpdateInput = z.object({
  title: z.string().min(1),
  description: z.string(),
  chapterId: z.number().int().nullable(),
});

const repo = createStoryScopedRepo(scenes);
export const { PATCH, DELETE } = itemHandlers(repo, sceneUpdateInput);
