import { themes } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { itemHandlers } from "@/lib/apiRoute";
import { themeUpdate } from "@/lib/entitySchemas";

const repo = createStoryScopedRepo(themes);
export const { PATCH, DELETE } = itemHandlers(repo, themeUpdate);
