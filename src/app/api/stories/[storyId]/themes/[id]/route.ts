import { z } from "zod";
import { themes } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { itemHandlers } from "@/lib/apiRoute";

const themeUpdateInput = z.object({
  name: z.string().min(1),
  description: z.string(),
});

const repo = createStoryScopedRepo(themes);
export const { PATCH, DELETE } = itemHandlers(repo, themeUpdateInput);
