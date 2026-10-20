import { themes } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { listCreateHandlers } from "@/lib/apiRoute";
import { themeCreate } from "@/lib/entitySchemas";

const repo = createStoryScopedRepo(themes);
export const { GET, POST } = listCreateHandlers(repo, themeCreate);
