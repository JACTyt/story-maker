import { z } from "zod";
import { places } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { listCreateHandlers } from "@/lib/apiRoute";

const placeInput = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
  chapterId: z.number().int().optional(),
});

const repo = createStoryScopedRepo(places);
export const { GET, POST } = listCreateHandlers(repo, placeInput);
