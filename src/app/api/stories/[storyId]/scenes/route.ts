import { z } from "zod";
import { scenes } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { listCreateHandlers } from "@/lib/apiRoute";

const sceneInput = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  chapterId: z.number().int().optional(),
});

const repo = createStoryScopedRepo(scenes);
export const { GET, POST } = listCreateHandlers(repo, sceneInput);
