import { z } from "zod";
import { characters } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { listCreateHandlers } from "@/lib/apiRoute";

const characterInput = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
});

const repo = createStoryScopedRepo(characters);
export const { GET, POST } = listCreateHandlers(repo, characterInput);
