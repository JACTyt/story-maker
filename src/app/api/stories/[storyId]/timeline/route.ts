import { z } from "zod";
import { timelineEvents } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { listCreateHandlers } from "@/lib/apiRoute";

const timelineInput = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  sortOrder: z.number().int().optional().default(0),
  inStoryDateLabel: z.string().optional().default(""),
});

const repo = createStoryScopedRepo(timelineEvents);
export const { GET, POST } = listCreateHandlers(repo, timelineInput);
