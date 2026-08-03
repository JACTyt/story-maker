import { z } from "zod";
import { timelineEvents } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { itemHandlers } from "@/lib/apiRoute";

const timelineUpdateInput = z.object({
  title: z.string().min(1),
  description: z.string(),
  sortOrder: z.number().int(),
  inStoryDateLabel: z.string(),
});

const repo = createStoryScopedRepo(timelineEvents);
export const { PATCH, DELETE } = itemHandlers(repo, timelineUpdateInput);
