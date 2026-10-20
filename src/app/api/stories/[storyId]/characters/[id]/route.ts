import { characters } from "@/db/schema";
import { createStoryScopedRepo } from "@/db/repo";
import { itemHandlers } from "@/lib/apiRoute";
import { deleteImagesFor } from "@/db/images";
import { characterUpdate } from "@/lib/entitySchemas";

const repo = createStoryScopedRepo(characters);
export const { PATCH, DELETE } = itemHandlers(repo, characterUpdate, "id", { afterDelete: (id) => deleteImagesFor("character", id) });
