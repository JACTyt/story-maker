import { z } from "zod";
import { chapters } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { listCreateHandlers } from "@/lib/apiRoute";

const chapterInput = z.object({
  title: z.string().min(1, "Title is required"),
  orderIndex: z.number().int().optional().default(0),
});

const repo = createStoryScopedRepo(chapters);
export const { GET, POST } = listCreateHandlers(repo, chapterInput);
