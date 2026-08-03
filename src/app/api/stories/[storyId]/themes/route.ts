import { z } from "zod";
import { themes } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { listCreateHandlers } from "@/lib/apiRoute";

const themeInput = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
});

const repo = createStoryScopedRepo(themes);
export const { GET, POST } = listCreateHandlers(repo, themeInput);
