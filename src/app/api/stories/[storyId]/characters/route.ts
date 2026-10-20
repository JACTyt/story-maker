import { characters } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { listCreateHandlers } from "@/lib/apiRoute";
import { characterCreate } from "@/lib/entitySchemas";

const repo = createStoryScopedRepo(characters);
export const { GET, POST } = listCreateHandlers(repo, characterCreate);
